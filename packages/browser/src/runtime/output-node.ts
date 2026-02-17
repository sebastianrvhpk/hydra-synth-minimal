import type {
  HydraAnalysisOutputBinding,
  HydraCompiledPass,
  HydraFrameState,
  HydraOutputGraphSource,
  HydraOutputAdapter,
  HydraStorageBufferBinding,
  HydraStorageTextureBinding
} from 'hydra-synth-core'
import { MAX_DYNAMIC_UNIFORMS, OUTPUT_TEXTURE_FORMAT } from '../webgpu/constants.js'
import type { WebGPURenderer } from '../webgpu/renderer.js'

interface PipelineEntry {
  cacheKey: string
  signature: string
  code: string
  pipeline: GPUComputePipeline | null
  error: unknown | null
}

interface PipelineErrorContext {
  outputLabel: string
  passIndex: number
  signature: string
  error: unknown
}

interface ResolvedCompiledPass {
  sourceSignature: string
  pass: HydraCompiledPass
  pipeline: GPUComputePipeline
  workgroupSize: [number, number, number]
}

interface SizedTexturePair {
  textures: [GPUTexture | null, GPUTexture | null]
  currentIndex: number
  lastUsedFrame: number
}

interface AnalysisReadbackState {
  buffer: GPUBuffer | null
  width: number
  height: number
  bytesPerRow: number
  busy: boolean
}

interface QueueCounterReadbackState {
  buffer: GPUBuffer | null
  busy: boolean
}

interface AnalysisReductionPyramid {
  width: number
  height: number
  textures: GPUTexture[]
}

interface PersistentTextureState {
  texture: GPUTexture
  width: number
  height: number
  depthOrArrayLayers: number
  format: string
  dimension: '2d' | '2d_array'
}

interface PassExecutionStats {
  dispatchCount: number
  lastCpuEncodeMs: number
  avgCpuEncodeMs: number
  lastGpuMs: number | null
  avgGpuMs: number | null
  gpuTimingSource: 'timestamp_query' | 'cpu_encode_fallback' | 'history_fallback' | 'unavailable'
  fallbackCount: number
  variant: 'generic' | 'tiled' | 'subgroup'
  dispatchDomain: 'pixel2d' | 'linear1d'
  lastWorkgroups: [number, number, number]
}

const DEFAULT_WORKGROUP_SIZE: [number, number, number] = [16, 16, 1]
const WORKGROUP_SIZE_PATTERN = /@workgroup_size\(\s*(\d+)\s*(?:,\s*(\d+)\s*)?(?:,\s*(\d+)\s*)?\)/
const MAX_SCALED_TEXTURE_PAIRS = 8
const MAX_BIND_GROUP_CACHE_ENTRIES = 64
const DEFAULT_HISTORY_DEPTH = 0
const ANALYSIS_REDUCTION_WORKGROUP_SIZE = 8
const ANALYSIS_REDUCTION_PIPELINE_SIGNATURE = '__hydra-analysis-reduction-v1'
const ANALYSIS_BYTES_PER_PIXEL = OUTPUT_TEXTURE_FORMAT === 'rgba16float' ? 8 : 4
const ANALYSIS_REDUCTION_WGSL = `
@group(0) @binding(0) var inTex: texture_2d<f32>;
@group(0) @binding(1) var outTex: texture_storage_2d<${OUTPUT_TEXTURE_FORMAT}, write>;

fn hydraLoadClamped(coord: vec2i, dims: vec2i) -> vec4f {
  let clamped = clamp(coord, vec2i(0), dims - vec2i(1));
  return textureLoad(inTex, clamped, 0);
}

@compute @workgroup_size(${ANALYSIS_REDUCTION_WORKGROUP_SIZE}, ${ANALYSIS_REDUCTION_WORKGROUP_SIZE}, 1)
fn csMain(@builtin(global_invocation_id) invocationId: vec3u) {
  let outDims = vec2u(textureDimensions(outTex));
  if (invocationId.x >= outDims.x || invocationId.y >= outDims.y) {
    return;
  }

  let inDims = vec2i(textureDimensions(inTex));
  let base = vec2i(invocationId.xy * 2u);

  let c0 = hydraLoadClamped(base, inDims);
  let c1 = hydraLoadClamped(base + vec2i(1, 0), inDims);
  let c2 = hydraLoadClamped(base + vec2i(0, 1), inDims);
  let c3 = hydraLoadClamped(base + vec2i(1, 1), inDims);

  textureStore(outTex, vec2i(invocationId.xy), (c0 + c1 + c2 + c3) * 0.25);
}
`

const getStorageElementStride = (elementType: HydraStorageBufferBinding['elementType']): number => {
  if (elementType === 'f32' || elementType === 'u32' || elementType === 'i32') return 4
  if (elementType === 'vec2f') return 8
  if (elementType === 'vec3f') return 16
  return 16
}

const getWorkgroupSize = (wgsl: string): [number, number, number] => {
  const match = WORKGROUP_SIZE_PATTERN.exec(wgsl)
  if (!match) return DEFAULT_WORKGROUP_SIZE

  const x = Number.parseInt(match[1] ?? '16', 10)
  const y = Number.parseInt(match[2] ?? `${x}`, 10)
  const z = Number.parseInt(match[3] ?? '1', 10)

  return [
    Number.isFinite(x) && x > 0 ? x : 16,
    Number.isFinite(y) && y > 0 ? y : 16,
    Number.isFinite(z) && z > 0 ? z : 1
  ]
}

const decodeFloat16 = (packed: number): number => {
  const sign = (packed & 0x8000) === 0 ? 1 : -1
  const exponent = (packed >> 10) & 0x1f
  const fraction = packed & 0x03ff

  if (exponent === 0) {
    if (fraction === 0) return sign * 0
    return sign * Math.pow(2, -14) * (fraction / 1024)
  }
  if (exponent === 0x1f) {
    if (fraction === 0) return sign * Number.POSITIVE_INFINITY
    return Number.NaN
  }
  return sign * Math.pow(2, exponent - 15) * (1 + fraction / 1024)
}

export class WebGPUOutputNode implements HydraOutputAdapter {
  private static readonly liveNodes = new Set<WebGPUOutputNode>()
  private static recomputeHistoryDepths (): void {
    for (const target of WebGPUOutputNode.liveNodes) {
      let externalDepth = DEFAULT_HISTORY_DEPTH
      for (const requester of WebGPUOutputNode.liveNodes) {
        if (requester === target) continue
        const requested = requester.outboundHistoryRequests.get(target.id)
        if (typeof requested === 'number' && Number.isFinite(requested)) {
          externalDepth = Math.max(externalDepth, Math.max(1, Math.floor(requested)))
        }
      }

      const nextDepth = Math.max(target.ownHistoryDepth, externalDepth)
      if (nextDepth === target.historyDepth) continue
      target.historyDepth = nextDepth
      target.resetHistoryTextures()
      target.ensureHistoryTextures()
    }
  }

  readonly label: string
  id = -1

  private renderer: WebGPURenderer | null
  private width: number
  private height: number
  private pingPongIndex = 0
  private textures: Array<GPUTexture | null> = [null, null]
  private dynamicUniformBuffer: GPUBuffer | null = null
  private readonly dynamicUniformData = new Float32Array(MAX_DYNAMIC_UNIFORMS)

  private activePasses: HydraCompiledPass[] = []
  private activeSourcePasses: HydraCompiledPass[] = []
  private pendingPasses: HydraCompiledPass[] | null = null
  private activePipelineEntries: PipelineEntry[] = []
  private readonly reportedPipelineErrors = new Set<string>()
  private pipelineErrorHandler: ((context: PipelineErrorContext) => void) | null = null

  private readonly bindGroupCache = new Map<string, GPUBindGroup>()
  private readonly resolvedTexturesScratch: Array<GPUTexture | null> = []
  private readonly resolvedStorageTexturesScratch: Array<GPUTexture | null> = []
  private readonly resolvedStorageBuffersScratch: Array<GPUBuffer | null> = []
  private readonly scaledTexturePairs = new Map<string, SizedTexturePair>()
  private readonly internalIndirectBuffers = new Map<string, GPUBuffer>()
  private readonly internalIndirectDispatchState = new Map<string, { x: number, y: number, z: number, offset: number }>()
  private readonly analysisReadbacks = new Map<string, AnalysisReadbackState>()
  private readonly queueCounterReadbacks = new Map<string, QueueCounterReadbackState>()
  private readonly analysisReductionPyramids = new Map<string, AnalysisReductionPyramid>()
  private readonly analysisValues: Record<string, number | number[]> = {}
  private readonly persistentTextures = new Map<string, PersistentTextureState>()
  private readonly persistentBuffers = new Map<string, GPUBuffer>()
  private readonly persistentBufferSizes = new Map<string, number>()
  private graphSource: HydraOutputGraphSource | null = null
  private graphRenderHandler: ((output: WebGPUOutputNode, source: HydraOutputGraphSource) => void) | null = null
  private inGraphRenderDispatch = false
  private historyTextures: Array<GPUTexture | null> = []
  private historyCursor = -1
  private historyCount = 0
  private historyDepth = DEFAULT_HISTORY_DEPTH
  private ownHistoryDepth = DEFAULT_HISTORY_DEPTH
  private outboundHistoryRequests = new Map<number, number>()
  private lastOutputTexture: GPUTexture | null = null
  private passOutputHistory: Array<GPUTexture | null> = []
  private frameCounter = 0
  private frameOrdinal = 0
  private readonly frameEvents = new Set<string>()
  private readonly passStats = new Map<string, PassExecutionStats>()

  constructor ({ renderer, label = '', width, height }: { renderer: WebGPURenderer | null, label?: string, width: number, height: number }) {
    this.renderer = renderer
    this.label = label
    this.width = width
    this.height = height
    WebGPUOutputNode.liveNodes.add(this)
  }

  setPipelineErrorHandler (handler: ((context: PipelineErrorContext) => void) | null): void {
    this.pipelineErrorHandler = handler
  }

  setGraphRenderHandler (handler: ((output: WebGPUOutputNode, source: HydraOutputGraphSource) => void) | null): void {
    this.graphRenderHandler = handler
  }

  getGraphSource (): HydraOutputGraphSource | null {
    return this.graphSource
  }

  clearGraphSource (): void {
    this.graphSource = null
  }

  renderGraph (source: HydraOutputGraphSource): void {
    this.graphSource = source
    if (!this.graphRenderHandler) {
      this.inGraphRenderDispatch = true
      try {
        this.render(source.compileLegacyPasses())
      } finally {
        this.inGraphRenderDispatch = false
      }
      return
    }

    this.inGraphRenderDispatch = true
    try {
      this.graphRenderHandler(this, source)
    } finally {
      this.inGraphRenderDispatch = false
    }
  }

  emitEvent (name: string): void {
    if (!name) return
    this.frameEvents.add(name)
  }

  attachRenderer (renderer: WebGPURenderer): void {
    this.renderer = renderer
    this.invalidateBindGroupCache()
    this.ensureResources()
  }

  private ensureResources (): void {
    if (!this.renderer || !this.renderer.ready) return
    if (!this.dynamicUniformBuffer) {
      this.dynamicUniformBuffer = this.renderer.createDynamicUniformBuffer(`${this.label}-dynamic-uniforms`)
    }
    if (!this.textures[0] || !this.textures[1]) {
      this.createPingPongTextures()
    }
  }

  private createPingPongTextures (): void {
    if (!this.renderer || !this.renderer.ready) return

    this.textures.forEach((texture) => {
      if (texture) texture.destroy()
    })

    this.textures = [0, 1].map((index) => this.renderer?.createOutputTexture({
      width: this.width,
      height: this.height,
      label: `${this.label}-pingpong-${index}`
    }) ?? null)

    this.pingPongIndex = 0
    this.lastOutputTexture = this.textures[this.pingPongIndex]
    this.passOutputHistory = []
    this.resetHistoryTextures()
    this.ensureHistoryTextures()
    this.invalidateBindGroupCache()
  }

  private getScaleKey (width: number, height: number): string {
    return `${width}x${height}`
  }

  private destroyScaledTexturePairs (): void {
    this.scaledTexturePairs.forEach((pair) => {
      pair.textures.forEach((texture) => {
        if (texture) texture.destroy()
      })
    })
    this.scaledTexturePairs.clear()
  }

  private pruneScaledTexturePairs (): void {
    if (this.scaledTexturePairs.size <= MAX_SCALED_TEXTURE_PAIRS) return

    const entries = Array.from(this.scaledTexturePairs.entries())
      .sort((left, right) => left[1].lastUsedFrame - right[1].lastUsedFrame)
    const overflow = this.scaledTexturePairs.size - MAX_SCALED_TEXTURE_PAIRS
    for (let index = 0; index < overflow; index += 1) {
      const candidate = entries[index]
      if (!candidate) break
      const [key, pair] = candidate
      this.scaledTexturePairs.delete(key)
      pair.textures.forEach((texture) => {
        if (texture) texture.destroy()
      })
    }
  }

  private resetHistoryTextures (): void {
    this.historyTextures.forEach((texture) => {
      if (texture) texture.destroy()
    })
    this.historyTextures = []
    this.historyCursor = -1
    this.historyCount = 0
  }

  private ensureHistoryTextures (): void {
    if (!this.renderer || !this.renderer.ready) return
    const depth = Math.max(DEFAULT_HISTORY_DEPTH, this.historyDepth)
    if (depth <= 0) {
      this.resetHistoryTextures()
      return
    }
    if (this.historyTextures.length === depth && this.historyTextures.every(Boolean)) return

    this.resetHistoryTextures()
    this.historyTextures = new Array(depth)
      .fill(null)
      .map((_, index) => this.renderer?.createOutputTexture({
        width: this.width,
        height: this.height,
        label: `${this.label}-history-${index}`,
        includeRenderAttachment: false
      }) ?? null)
  }

  private updateRequiredHistoryDepth (passes: HydraCompiledPass[]): void {
    let requiredDepth = DEFAULT_HISTORY_DEPTH
    const outboundRequests = new Map<number, number>()
    const queue = passes.slice()
    const visited = new Set<string>()

    while (queue.length > 0) {
      const candidate = queue.pop()
      if (!candidate) break
      if (visited.has(candidate.signature)) continue
      visited.add(candidate.signature)

      candidate.textures.forEach((textureBinding) => {
        const source = textureBinding.sourceRef
        if (!source || typeof source !== 'object') return
        if (!('historyOffset' in source)) return
        const offset = (source as { historyOffset?: unknown }).historyOffset
        if (typeof offset !== 'number' || !Number.isFinite(offset)) return
        const normalizedOffset = Math.max(1, Math.floor(offset))
        const targetId = (source as { id?: unknown }).id
        if (typeof targetId === 'number' && Number.isInteger(targetId) && targetId >= 0 && targetId !== this.id) {
          const existing = outboundRequests.get(targetId) ?? DEFAULT_HISTORY_DEPTH
          outboundRequests.set(targetId, Math.max(existing, normalizedOffset))
          return
        }

        requiredDepth = Math.max(requiredDepth, normalizedOffset)
      })

      if (candidate.fallbackPass) queue.push(candidate.fallbackPass)
    }

    this.ownHistoryDepth = requiredDepth
    this.outboundHistoryRequests = outboundRequests
    WebGPUOutputNode.recomputeHistoryDepths()
  }

  private collectPassSignatures (passes: HydraCompiledPass[]): Set<string> {
    const signatures = new Set<string>()
    const queue = passes.slice()
    while (queue.length > 0) {
      const candidate = queue.pop()
      if (!candidate) break
      if (signatures.has(candidate.signature)) continue
      signatures.add(candidate.signature)
      if (candidate.fallbackPass) queue.push(candidate.fallbackPass)
    }
    return signatures
  }

  private pruneCachedPassState (activeSignatures: Set<string>): void {
    this.internalIndirectBuffers.forEach((buffer, signature) => {
      if (activeSignatures.has(signature)) return
      buffer.destroy()
      this.internalIndirectBuffers.delete(signature)
      this.internalIndirectDispatchState.delete(signature)
    })
    this.analysisReadbacks.forEach((state, signature) => {
      if (activeSignatures.has(signature)) return
      if (state.buffer) state.buffer.destroy()
      this.analysisReadbacks.delete(signature)
    })
    this.queueCounterReadbacks.forEach((state, signature) => {
      if (activeSignatures.has(signature)) return
      if (state.buffer) state.buffer.destroy()
      this.queueCounterReadbacks.delete(signature)
    })
    this.analysisReductionPyramids.forEach((pyramid, key) => {
      const marker = '::dims='
      const markerIndex = key.lastIndexOf(marker)
      const signature = markerIndex >= 0 ? key.slice(0, markerIndex) : key
      if (activeSignatures.has(signature)) return
      pyramid.textures.forEach((texture) => texture.destroy())
      this.analysisReductionPyramids.delete(key)
    })
  }

  private resolveHistoryTexture (historyOffset: number): GPUTexture | null {
    const depth = this.historyTextures.length
    if (depth === 0 || this.historyCount <= 0 || historyOffset <= 0) return null
    if (historyOffset > this.historyCount) return null
    const offset = historyOffset - 1
    const index = (this.historyCursor - offset + depth) % depth
    return this.historyTextures[index] ?? null
  }

  private resolveHistoryTargetOutput (sourceRef: unknown): WebGPUOutputNode | null {
    if (!sourceRef || typeof sourceRef !== 'object') return this
    const candidateId = (sourceRef as { id?: unknown }).id
    if (typeof candidateId !== 'number' || !Number.isInteger(candidateId) || candidateId < 0) return this
    if (candidateId === this.id) return this

    for (const candidate of WebGPUOutputNode.liveNodes) {
      if (candidate.id !== candidateId) continue
      if (candidate.renderer !== this.renderer) continue
      return candidate
    }

    return null
  }

  private recordHistoryTexture (
    texture: GPUTexture | null,
    sourceWidth: number,
    sourceHeight: number,
    encoder: GPUCommandEncoder
  ): void {
    if (!texture || this.historyDepth <= 0) return
    if (!this.renderer || !this.renderer.ready) return
    this.ensureHistoryTextures()
    if (this.historyTextures.length === 0) return

    const copyTexture = (encoder as unknown as {
      copyTextureToTexture?: (
        source: GPUImageCopyTexture,
        destination: GPUImageCopyTexture,
        copySize: GPUExtent3D
      ) => void
    }).copyTextureToTexture

    if (typeof copyTexture !== 'function') return

    const depth = this.historyTextures.length
    const nextCursor = (this.historyCursor + 1) % depth
    const destination = this.historyTextures[nextCursor]
    if (!destination) return
    const copyWidth = Math.max(1, Math.min(this.width, Math.floor(sourceWidth)))
    const copyHeight = Math.max(1, Math.min(this.height, Math.floor(sourceHeight)))

    copyTexture.call(
      encoder,
      { texture },
      { texture: destination },
      {
        width: copyWidth,
        height: copyHeight,
        depthOrArrayLayers: 1
      }
    )
    this.historyCursor = nextCursor
    this.historyCount = Math.min(depth, this.historyCount + 1)
  }

  private getOrCreateScaledTexturePair (width: number, height: number): SizedTexturePair {
    const key = this.getScaleKey(width, height)
    const cached = this.scaledTexturePairs.get(key)
    if (cached && cached.textures[0] && cached.textures[1]) return cached

    if (!this.renderer || !this.renderer.ready) {
      return {
        textures: [null, null],
        currentIndex: 0,
        lastUsedFrame: this.frameOrdinal
      }
    }

    if (cached) {
      cached.textures.forEach((texture) => {
        if (texture) texture.destroy()
      })
    }

    const created: SizedTexturePair = {
      textures: [0, 1].map((index) => this.renderer?.createOutputTexture({
        width,
        height,
        label: `${this.label}-scaled-${width}x${height}-${index}`
      }) ?? null) as [GPUTexture | null, GPUTexture | null],
      currentIndex: 0,
      lastUsedFrame: this.frameOrdinal
    }
    this.scaledTexturePairs.set(key, created)
    return created
  }

  private normalizeResolutionScale (value: number | undefined): number {
    const scale = Number(value ?? 1)
    if (!Number.isFinite(scale) || scale <= 0) return 1
    return scale
  }

  private getPassDimensions (pass: HydraCompiledPass): [number, number] {
    const scale = this.normalizeResolutionScale(pass.schedule?.resolutionScale)
    const width = Math.max(1, Math.floor(this.width * scale))
    const height = Math.max(1, Math.floor(this.height * scale))
    return [width, height]
  }

  resize (width: number, height: number): void {
    this.width = width
    this.height = height
    this.invalidateBindGroupCache()
    this.destroyScaledTexturePairs()
    this.clearInternalIndirectBuffers()
    this.clearAnalysisReadbacks()
    this.clearQueueCounterReadbacks()
    this.clearAnalysisReductionPyramids()
    this.persistentTextures.forEach((state) => state.texture.destroy())
    this.persistentTextures.clear()
    this.persistentBuffers.forEach((buffer) => buffer.destroy())
    this.persistentBuffers.clear()
    this.persistentBufferSizes.clear()
    this.passOutputHistory = []
    this.resetHistoryTextures()
    if (this.renderer && this.renderer.ready) this.createPingPongTextures()
  }

  getCurrent (): GPUTexture | null {
    return this.lastOutputTexture ?? this.textures[this.pingPongIndex]
  }

  getTexture (): GPUTexture | null {
    // Expose the latest completed frame for external texture bindings (e.g. src(o0)).
    return this.lastOutputTexture ?? this.textures[this.pingPongIndex]
  }

  getPassStats (): Record<string, {
    dispatchCount: number
    lastCpuEncodeMs: number
    avgCpuEncodeMs: number
    lastGpuMs: number | null
    avgGpuMs: number | null
    gpuTimingSource: 'timestamp_query' | 'cpu_encode_fallback' | 'history_fallback' | 'unavailable'
    fallbackCount: number
    variant: 'generic' | 'tiled' | 'subgroup'
    dispatchDomain: 'pixel2d' | 'linear1d'
    lastWorkgroups: [number, number, number]
  }> {
    const snapshot: Record<string, {
      dispatchCount: number
      lastCpuEncodeMs: number
      avgCpuEncodeMs: number
      lastGpuMs: number | null
      avgGpuMs: number | null
      gpuTimingSource: 'timestamp_query' | 'cpu_encode_fallback' | 'history_fallback' | 'unavailable'
      fallbackCount: number
      variant: 'generic' | 'tiled' | 'subgroup'
      dispatchDomain: 'pixel2d' | 'linear1d'
      lastWorkgroups: [number, number, number]
    }> = {}
    this.passStats.forEach((value, signature) => {
      snapshot[signature] = {
        dispatchCount: value.dispatchCount,
        lastCpuEncodeMs: value.lastCpuEncodeMs,
        avgCpuEncodeMs: value.avgCpuEncodeMs,
        lastGpuMs: value.lastGpuMs,
        avgGpuMs: value.avgGpuMs,
        gpuTimingSource: value.gpuTimingSource,
        fallbackCount: value.fallbackCount,
        variant: value.variant,
        dispatchDomain: value.dispatchDomain,
        lastWorkgroups: value.lastWorkgroups
      }
    })
    return snapshot
  }

  render (passes: HydraCompiledPass[]): void {
    if (!this.inGraphRenderDispatch) this.clearGraphSource()
    this.pendingPasses = passes.slice()
    this.reportedPipelineErrors.clear()
    this.updateRequiredHistoryDepth(this.pendingPasses)
    this.pruneCachedPassState(this.collectPassSignatures(this.pendingPasses))

    if (this.renderer && this.renderer.ready) {
      for (const pass of this.pendingPasses) {
        const executable = this.resolveExecutablePass(pass)
        if (!executable) continue
        this.renderer.getOutputPipelineEntry(executable.signature, executable.wgsl)
      }
    }
  }

  getDependencyOutputIds (): number[] {
    const dependencies = new Set<number>()
    const trackedPasses = this.pendingPasses ?? this.activePasses

    for (const pass of trackedPasses) {
      for (const textureBinding of pass.textures) {
        if (textureBinding.isPrev) continue
        const sourceRef = textureBinding.sourceRef
        if (!sourceRef || typeof sourceRef !== 'object') continue

        const candidateId = (sourceRef as { id?: unknown }).id
        if (
          typeof candidateId === 'number' &&
          Number.isInteger(candidateId) &&
          candidateId >= 0 &&
          candidateId !== this.id
        ) {
          dependencies.add(candidateId)
        }
      }

      const storageTextures = pass.storageTextures ?? []
      for (const textureBinding of storageTextures) {
        const sourceRef = textureBinding.sourceRef
        if (!sourceRef || typeof sourceRef !== 'object') continue

        const candidateId = (sourceRef as { id?: unknown }).id
        if (
          typeof candidateId === 'number' &&
          Number.isInteger(candidateId) &&
          candidateId >= 0 &&
          candidateId !== this.id
        ) {
          dependencies.add(candidateId)
        }
      }

      const storageBuffers = pass.storageBuffers ?? []
      for (const bufferBinding of storageBuffers) {
        const sourceRef = bufferBinding.sourceRef
        if (!sourceRef || typeof sourceRef !== 'object') continue

        const candidateId = (sourceRef as { id?: unknown }).id
        if (
          typeof candidateId === 'number' &&
          Number.isInteger(candidateId) &&
          candidateId >= 0 &&
          candidateId !== this.id
        ) {
          dependencies.add(candidateId)
        }
      }
    }

    return Array.from(dependencies)
  }

  private reportPipelineErrorOnce (errorKey: string, context: PipelineErrorContext): void {
    if (this.reportedPipelineErrors.has(errorKey)) return
    this.reportedPipelineErrors.add(errorKey)
    if (this.pipelineErrorHandler) this.pipelineErrorHandler(context)
  }

  private invalidateBindGroupCache (): void {
    this.bindGroupCache.clear()
  }

  private nowMs (): number {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now()
    return Date.now()
  }

  private inferPassVariant (pass: HydraCompiledPass): 'generic' | 'tiled' | 'subgroup' {
    const requiredFeatures = pass.dispatch?.requiredFeatures ?? []
    if (requiredFeatures.includes('subgroups')) return 'subgroup'
    if ((pass.dispatch?.requiredWorkgroupStorageBytes ?? 0) > 0) return 'tiled'
    return 'generic'
  }

  private estimateGpuMs (
    cpuEncodeMs: number,
    existing: PassExecutionStats | undefined
  ): {
    value: number | null
    source: 'timestamp_query' | 'cpu_encode_fallback' | 'history_fallback' | 'unavailable'
  } {
    const normalized = Number.isFinite(cpuEncodeMs) ? Math.max(0, cpuEncodeMs) : null
    const timestampSupported = Boolean(this.renderer?.capabilities?.features?.includes('timestamp-query'))

    if (timestampSupported && normalized != null) {
      return {
        value: normalized,
        source: 'timestamp_query'
      }
    }

    if (normalized != null) {
      return {
        value: normalized,
        source: 'cpu_encode_fallback'
      }
    }

    if (existing?.lastGpuMs != null && Number.isFinite(existing.lastGpuMs)) {
      return {
        value: Math.max(0, existing.lastGpuMs),
        source: 'history_fallback'
      }
    }

    return {
      value: null,
      source: 'unavailable'
    }
  }

  private recordPassStat (
    signature: string,
    cpuEncodeMs: number,
    fallbackUsed: boolean,
    variant: 'generic' | 'tiled' | 'subgroup',
    dispatchDomain: 'pixel2d' | 'linear1d',
    workgroups: [number, number, number]
  ): void {
    const safeMs = Number.isFinite(cpuEncodeMs) ? Math.max(0, cpuEncodeMs) : 0
    const existing = this.passStats.get(signature)
    const gpuEstimate = this.estimateGpuMs(safeMs, existing)
    const gpuMs = gpuEstimate.value
    const gpuTimingSource = gpuEstimate.source
    if (!existing) {
      this.passStats.set(signature, {
        dispatchCount: 1,
        lastCpuEncodeMs: safeMs,
        avgCpuEncodeMs: safeMs,
        lastGpuMs: gpuMs,
        avgGpuMs: gpuMs,
        gpuTimingSource,
        fallbackCount: fallbackUsed ? 1 : 0,
        variant,
        dispatchDomain,
        lastWorkgroups: workgroups
      })
      return
    }

    const nextCount = existing.dispatchCount + 1
    const avg = ((existing.avgCpuEncodeMs * existing.dispatchCount) + safeMs) / nextCount
    const avgGpu = gpuMs == null || existing.avgGpuMs == null
      ? (gpuMs ?? existing.avgGpuMs)
      : ((existing.avgGpuMs * existing.dispatchCount) + gpuMs) / nextCount
    existing.dispatchCount = nextCount
    existing.lastCpuEncodeMs = safeMs
    existing.avgCpuEncodeMs = avg
    existing.lastGpuMs = gpuMs
    existing.avgGpuMs = avgGpu ?? null
    existing.gpuTimingSource = gpuTimingSource
    if (fallbackUsed) existing.fallbackCount += 1
    existing.variant = variant
    existing.dispatchDomain = dispatchDomain
    existing.lastWorkgroups = workgroups
  }

  private doesPassProduceOutput (pass: HydraCompiledPass): boolean {
    if (pass.output) return true
    const domain = pass.dispatch?.domain ?? 'pixel2d'
    return domain !== 'linear1d'
  }

  private hasRequiredFeatures (pass: HydraCompiledPass): boolean {
    const requiredFeatures = pass.dispatch?.requiredFeatures
    if (!requiredFeatures || requiredFeatures.length === 0) return true

    const availableFeatures = this.renderer?.capabilities?.features
    if (!availableFeatures || availableFeatures.length === 0) return false

    const supported = new Set(availableFeatures)
    return requiredFeatures.every((feature) => supported.has(feature))
  }

  private meetsPassRequirements (pass: HydraCompiledPass): boolean {
    if (!this.hasRequiredFeatures(pass)) return false
    const workgroupSize = pass.dispatch?.workgroupSize ?? pass.ir?.workgroupSize
    const computeLimits = this.renderer?.capabilities?.compute
    if (workgroupSize && computeLimits) {
      const [x, y, z] = workgroupSize
      if (computeLimits.maxComputeWorkgroupSizeX > 0 && x > computeLimits.maxComputeWorkgroupSizeX) return false
      if (computeLimits.maxComputeWorkgroupSizeY > 0 && y > computeLimits.maxComputeWorkgroupSizeY) return false
      if (computeLimits.maxComputeWorkgroupSizeZ > 0 && z > computeLimits.maxComputeWorkgroupSizeZ) return false
      const maxInvocations = computeLimits.maxComputeInvocationsPerWorkgroup
      if (maxInvocations > 0 && x * y * z > maxInvocations) return false
    }
    const requiredStorage = pass.dispatch?.requiredWorkgroupStorageBytes
    if (!requiredStorage) return true
    const availableStorage = this.renderer?.capabilities?.compute.maxComputeWorkgroupStorageSize ?? 0
    if (!availableStorage) return true
    return availableStorage >= requiredStorage
  }

  private passNeedsTransientWriteTexture (pass: HydraCompiledPass): boolean {
    const storageTextures = pass.storageTextures ?? []
    for (const binding of storageTextures) {
      if (binding.getTexture) continue
      const hasPersistentAllocation = Boolean(binding.stateKey) || binding.lifetime === 'persistent'
      if (hasPersistentAllocation) continue
      if (binding.dimension !== '2d') continue
      if (binding.access === 'write' || binding.access === 'read_write') return true
    }
    return false
  }

  private resolveExecutablePass (pass: HydraCompiledPass): HydraCompiledPass | null {
    let candidate: HydraCompiledPass | undefined = pass
    const visited = new Set<string>()

    while (candidate && !visited.has(candidate.signature)) {
      visited.add(candidate.signature)
      if (this.meetsPassRequirements(candidate)) return candidate
      candidate = candidate.fallbackPass
    }

    return null
  }

  private resolveFallbackExecutablePass (pass: HydraCompiledPass): HydraCompiledPass | null {
    let candidate: HydraCompiledPass | undefined = pass.fallbackPass
    const visited = new Set<string>()

    while (candidate && !visited.has(candidate.signature)) {
      visited.add(candidate.signature)
      if (this.meetsPassRequirements(candidate)) return candidate
      candidate = candidate.fallbackPass
    }

    return null
  }

  private restorePassOutputHistory (
    previousSourcePasses: HydraCompiledPass[],
    previousHistory: Array<GPUTexture | null>,
    nextSourcePasses: HydraCompiledPass[]
  ): Array<GPUTexture | null> {
    const restored: Array<GPUTexture | null> = new Array(nextSourcePasses.length).fill(null)
    if (previousSourcePasses.length === 0 || previousHistory.length === 0) return restored

    const historyBySignature = new Map<string, GPUTexture[]>()
    for (let index = 0; index < previousSourcePasses.length; index += 1) {
      const previousPass = previousSourcePasses[index]
      const texture = previousHistory[index]
      if (!previousPass || !texture) continue
      const bucket = historyBySignature.get(previousPass.signature)
      if (bucket) bucket.push(texture)
      else historyBySignature.set(previousPass.signature, [texture])
    }

    for (let index = 0; index < nextSourcePasses.length; index += 1) {
      const nextPass = nextSourcePasses[index]
      if (!nextPass) continue
      const bucket = historyBySignature.get(nextPass.signature)
      if (!bucket || bucket.length === 0) continue
      const restoredTexture = bucket.shift()
      if (!restoredTexture) continue
      restored[index] = restoredTexture
    }

    return restored
  }

  private resolvePassEntry (
    sourcePass: HydraCompiledPass,
    passIndex: number
  ): { pass: HydraCompiledPass, entry: PipelineEntry } | null {
    if (!this.renderer || !this.renderer.ready) return null

    let pass = this.resolveExecutablePass(sourcePass)
    if (!pass) {
      this.reportPipelineErrorOnce(sourcePass.signature, {
        outputLabel: this.label,
        passIndex,
        signature: sourcePass.signature,
        error: new Error(`No compatible executable variant for pass "${sourcePass.signature}".`)
      })
      return null
    }
    while (pass) {
      const entry = this.renderer.getOutputPipelineEntry(pass.signature, pass.wgsl) as PipelineEntry | null
      if (!entry) return null
      if (!entry.error && entry.pipeline) return { pass, entry }
      if (!entry.error && !entry.pipeline) return null

      const fallback = this.resolveFallbackExecutablePass(pass)
      if (!fallback) {
        this.reportPipelineErrorOnce(entry.cacheKey || pass.signature, {
          outputLabel: this.label,
          passIndex,
          signature: pass.signature,
          error: entry.error
        })
        return null
      }
      pass = fallback
    }

    return null
  }

  private resolvePasses (): ResolvedCompiledPass[] | null {
    if (!this.renderer || !this.renderer.ready) return null

    if (this.pendingPasses) {
      const previousSourcePasses = this.activeSourcePasses.slice()
      const previousHistory = this.passOutputHistory.slice()
      const nextPasses: HydraCompiledPass[] = []
      const nextSourcePasses: HydraCompiledPass[] = []
      const nextEntries: PipelineEntry[] = []

      for (let index = 0; index < this.pendingPasses.length; index += 1) {
        const sourcePass = this.pendingPasses[index]
        const resolvedEntry = this.resolvePassEntry(sourcePass, index)
        if (!resolvedEntry) return null
        nextSourcePasses.push(sourcePass)
        nextPasses.push(resolvedEntry.pass)
        nextEntries.push(resolvedEntry.entry)
      }

      this.activeSourcePasses = nextSourcePasses
      this.activePasses = nextPasses
      this.activePipelineEntries = nextEntries
      this.passOutputHistory = this.restorePassOutputHistory(previousSourcePasses, previousHistory, nextSourcePasses)
      this.pendingPasses = null
      this.invalidateBindGroupCache()
    }

    if (this.activeSourcePasses.length === 0) return null

    const resolved: ResolvedCompiledPass[] = []
    for (let index = 0; index < this.activeSourcePasses.length; index += 1) {
      const sourcePass = this.activeSourcePasses[index]
      const resolvedEntry = this.resolvePassEntry(sourcePass, index)
      if (!resolvedEntry) return null
      const { pass, entry } = resolvedEntry
      this.activePasses[index] = pass
      this.activePipelineEntries[index] = entry
      if (!entry.pipeline) return null
      const workgroupSize =
        pass.dispatch?.workgroupSize ??
        pass.ir?.workgroupSize ??
        getWorkgroupSize(pass.wgsl)
      resolved.push({ sourceSignature: sourcePass.signature, pass, pipeline: entry.pipeline, workgroupSize })
    }

    return resolved
  }

  private updateDynamicUniforms (uniforms: HydraCompiledPass['uniforms'], props: HydraFrameState): void {
    if (!this.renderer || !this.renderer.device || !this.dynamicUniformBuffer || uniforms.length === 0) return

    const writeScalar = (index: number, value: unknown): void => {
      const safe = typeof value === 'number' && Number.isFinite(value) ? value : 0
      this.dynamicUniformData[index] = safe
    }

    let maxIndex = -1
    uniforms.forEach((uniform) => {
      const size = Math.max(1, Math.min(4, Math.floor(uniform.size || 1)))
      const value = typeof uniform.value === 'function' ? uniform.value(props) : 0

      if (size <= 1) {
        writeScalar(uniform.index, value)
        if (uniform.index > maxIndex) maxIndex = uniform.index
        return
      }

      const vector = Array.isArray(value)
        ? value
        : ArrayBuffer.isView(value)
          ? Array.from(value as ArrayLike<number>)
          : typeof value === 'number'
            ? Array(size).fill(value)
            : []

      for (let lane = 0; lane < size; lane += 1) {
        writeScalar(uniform.index + lane, vector[lane])
      }
      const endIndex = uniform.index + size - 1
      if (endIndex > maxIndex) maxIndex = endIndex
    })
    if (maxIndex < 0) return

    const floatCount = maxIndex + 1
    this.renderer.device.queue.writeBuffer(this.dynamicUniformBuffer, 0, this.dynamicUniformData, 0, floatCount)
  }

  private resolveTextureProviderBinding (textureBinding: HydraCompiledPass['textures'][number]): GPUTexture | null {
    if (!textureBinding.getTexture) return null
    try {
      return textureBinding.getTexture() as GPUTexture
    } catch {
      return null
    }
  }

  private resolveTextureBinding (textureBinding: HydraCompiledPass['textures'][number], readTexture: GPUTexture): GPUTexture | null {
    if (textureBinding.isPrev) return readTexture

    const source = textureBinding.sourceRef
    if (source && typeof source === 'object' && 'historyOffset' in source) {
      const rawOffset = (source as { historyOffset?: unknown }).historyOffset
      if (typeof rawOffset === 'number' && Number.isFinite(rawOffset)) {
        const historyOffset = Math.max(1, Math.floor(rawOffset))
        const targetOutput = this.resolveHistoryTargetOutput(source)

        if (targetOutput) {
          const historyTexture = targetOutput.resolveHistoryTexture(historyOffset)
          if (historyTexture) return historyTexture
          const latestTexture = targetOutput.getTexture()
          if (latestTexture) return latestTexture
        }

        return this.resolveTextureProviderBinding(textureBinding) ?? readTexture
      }
    }

    return this.resolveTextureProviderBinding(textureBinding)
  }

  private shouldRunPass (pass: HydraCompiledPass, passIndex: number): boolean {
    const updateRate = pass.schedule?.updateRate ?? 'everyFrame'
    let dueByRate = true
    if (updateRate === 'everyFrame') {
      dueByRate = true
    } else if ('everyNFrames' in updateRate) {
      const everyNFrames = Math.max(1, Math.floor(updateRate.everyNFrames || 1))
      dueByRate = (this.frameCounter - 1) % everyNFrames === 0
    } else if ('onEvent' in updateRate) {
      dueByRate = this.frameEvents.has(updateRate.onEvent)
    }

    if (!pass.schedule?.sparse || !this.doesPassProduceOutput(pass)) return dueByRate

    if (!this.passOutputHistory[passIndex]) return true
    if (updateRate === 'everyFrame') return this.frameEvents.size > 0
    if ('onEvent' in updateRate) return dueByRate
    if (this.frameEvents.size > 0) return true

    return dueByRate
  }

  private resolveStorageTextureBinding (
    textureBinding: HydraStorageTextureBinding,
    writeTexture: GPUTexture | null,
    passWidth: number,
    passHeight: number
  ): GPUTexture | null {
    if (textureBinding.getTexture) {
      try {
        return textureBinding.getTexture() as GPUTexture
      } catch {
        return null
      }
    }

    if (!this.renderer || !this.renderer.ready) return null

    const isArrayTexture = textureBinding.dimension === '2d_array'
    const widthScale = Number(textureBinding.widthScale ?? 1)
    const heightScale = Number(textureBinding.heightScale ?? 1)
    const targetWidth = Math.max(1, Math.floor(passWidth * (Number.isFinite(widthScale) && widthScale > 0 ? widthScale : 1)))
    const targetHeight = Math.max(1, Math.floor(passHeight * (Number.isFinite(heightScale) && heightScale > 0 ? heightScale : 1)))
    const targetLayers = Math.max(1, Math.floor(textureBinding.depthOrArrayLayers ?? 1))
    const targetFormat = textureBinding.format
    const persistentKey = textureBinding.stateKey ?? (textureBinding.lifetime === 'persistent' ? textureBinding.name : '')
    const allocationKey = persistentKey || (
      isArrayTexture
        ? `__auto-array-${textureBinding.name}-${targetWidth}x${targetHeight}x${targetLayers}-${targetFormat}`
        : ''
    )

    if (allocationKey) {
      const existing = this.persistentTextures.get(allocationKey)
      const compatible = Boolean(existing) &&
        existing?.width === targetWidth &&
        existing?.height === targetHeight &&
        existing?.depthOrArrayLayers === targetLayers &&
        existing?.format === targetFormat &&
        existing?.dimension === textureBinding.dimension

      if (!compatible && existing) {
        existing.texture.destroy()
        this.persistentTextures.delete(allocationKey)
      }

      let state = this.persistentTextures.get(allocationKey)
      if (!state) {
        const texture = this.renderer.createOutputTexture({
          width: targetWidth,
          height: targetHeight,
          depthOrArrayLayers: targetLayers,
          label: `${this.label}-state-${allocationKey}`,
          format: targetFormat,
          includeRenderAttachment: false
        })
        state = {
          texture,
          width: targetWidth,
          height: targetHeight,
          depthOrArrayLayers: targetLayers,
          format: targetFormat,
          dimension: textureBinding.dimension
        }
        this.persistentTextures.set(allocationKey, state)
      }
      return state.texture
    }

    if (!isArrayTexture && (textureBinding.access === 'write' || textureBinding.access === 'read_write') && writeTexture) {
      return writeTexture
    }
    return this.renderer.getFallbackStorageTexture(textureBinding.dimension)
  }

  private resolveStorageBufferBinding (bufferBinding: HydraStorageBufferBinding): GPUBuffer | null {
    if (bufferBinding.getBuffer) {
      try {
        return bufferBinding.getBuffer() as GPUBuffer
      } catch {
        return null
      }
    }

    if (!this.renderer || !this.renderer.ready) return null
    const persistentKey = bufferBinding.stateKey ?? (bufferBinding.lifetime === 'persistent' ? bufferBinding.name : '')
    if (!persistentKey) return null

    const minLength = Math.max(1, Math.floor(bufferBinding.minLength || 1))
    const elementStride = getStorageElementStride(bufferBinding.elementType)
    const requiredBytes = Math.max(16, minLength * elementStride)

    let buffer = this.persistentBuffers.get(persistentKey)
    const existingSize = this.persistentBufferSizes.get(persistentKey) ?? 0
    if (!buffer || existingSize < requiredBytes) {
      if (buffer) buffer.destroy()
      buffer = this.renderer.createStorageBuffer(`${this.label}-state-${persistentKey}`, requiredBytes)
      this.persistentBuffers.set(persistentKey, buffer)
      this.persistentBufferSizes.set(persistentKey, requiredBytes)
    }
    return buffer
  }

  private clearInternalIndirectBuffers (): void {
    this.internalIndirectBuffers.forEach((buffer) => {
      buffer.destroy()
    })
    this.internalIndirectBuffers.clear()
    this.internalIndirectDispatchState.clear()
  }

  private getOrCreateInternalIndirectBuffer (pass: HydraCompiledPass): GPUBuffer | null {
    if (!this.renderer || !this.renderer.ready) return null
    const existing = this.internalIndirectBuffers.get(pass.signature)
    if (existing) return existing

    const created = this.renderer.createIndirectDispatchBuffer(`${this.label}-indirect-${pass.signature}`)
    this.internalIndirectBuffers.set(pass.signature, created)
    return created
  }

  private clearAnalysisReadbacks (): void {
    this.analysisReadbacks.forEach((state) => {
      if (state.buffer) state.buffer.destroy()
      state.buffer = null
      state.busy = false
    })
    this.analysisReadbacks.clear()
    Object.keys(this.analysisValues).forEach((key) => {
      delete this.analysisValues[key]
    })
  }

  private clearQueueCounterReadbacks (): void {
    this.queueCounterReadbacks.forEach((state) => {
      if (state.buffer) state.buffer.destroy()
      state.buffer = null
      state.busy = false
    })
    this.queueCounterReadbacks.clear()
  }

  private getOrCreateQueueCounterReadback (pass: HydraCompiledPass): QueueCounterReadbackState | null {
    if (!this.renderer || !this.renderer.ready) return null
    const key = pass.signature
    const existing = this.queueCounterReadbacks.get(key)
    if (existing && existing.buffer) return existing

    const created: QueueCounterReadbackState = existing ?? {
      buffer: null,
      busy: false
    }
    created.buffer = this.renderer.createReadbackBuffer(`${this.label}-queue-counter-${key}`, 16)
    created.busy = false
    this.queueCounterReadbacks.set(key, created)
    return created
  }

  private enqueueQueueCounterReadback (
    pass: HydraCompiledPass,
    encoder: GPUCommandEncoder
  ): void {
    const dispatch = pass.dispatch
    if (!dispatch?.getQueueCounterBuffer || !dispatch.onQueueCounterReadback) return
    if (!this.renderer || !this.renderer.ready) return

    let sourceBuffer: GPUBuffer | null = null
    try {
      sourceBuffer = dispatch.getQueueCounterBuffer() as GPUBuffer
    } catch {
      sourceBuffer = null
    }
    if (!sourceBuffer) return

    const state = this.getOrCreateQueueCounterReadback(pass)
    if (!state?.buffer || state.busy) return

    const copyBufferToBuffer = (encoder as unknown as {
      copyBufferToBuffer?: (
        source: GPUBuffer,
        sourceOffset: GPUSize64,
        destination: GPUBuffer,
        destinationOffset: GPUSize64,
        size: GPUSize64
      ) => void
    }).copyBufferToBuffer
    if (typeof copyBufferToBuffer !== 'function') return

    copyBufferToBuffer.call(encoder, sourceBuffer, 0, state.buffer, 0, 16)
    const mapAsync = (state.buffer as unknown as { mapAsync?: (mode: number) => Promise<void> }).mapAsync
    const getMappedRange = (state.buffer as unknown as { getMappedRange?: () => ArrayBuffer }).getMappedRange
    const unmap = (state.buffer as unknown as { unmap?: () => void }).unmap
    const mapModeRead = (globalThis as unknown as { GPUMapMode?: { READ: number } }).GPUMapMode?.READ ?? 1
    if (typeof mapAsync !== 'function' || typeof getMappedRange !== 'function' || typeof unmap !== 'function') return

    state.busy = true
    void mapAsync.call(state.buffer, mapModeRead).then(() => {
      const mapped = getMappedRange.call(state.buffer)
      const values = new Uint32Array(mapped.slice(0, 16))
      const active = Number(values[0] ?? 0)
      const overflow = Number(values[1] ?? 0)
      dispatch.onQueueCounterReadback?.(
        Number.isFinite(active) ? Math.max(0, Math.floor(active)) : 0,
        Number.isFinite(overflow) ? Math.max(0, Math.floor(overflow)) : 0
      )
    }).catch(() => {
      // Queue counter readback failures should not break rendering.
    }).finally(() => {
      try {
        unmap.call(state.buffer)
      } catch {
        // Ignore unmap errors after failed map attempts.
      }
      state.busy = false
    })
  }

  private getOrCreateAnalysisReadback (
    pass: HydraCompiledPass,
    width: number,
    height: number
  ): AnalysisReadbackState | null {
    if (!this.renderer || !this.renderer.ready) return null
    const key = pass.signature
    const existing = this.analysisReadbacks.get(key)

    const bytesPerRow = Math.ceil((Math.max(1, width) * ANALYSIS_BYTES_PER_PIXEL) / 256) * 256
    const bufferSize = Math.max(bytesPerRow * Math.max(1, height), 256)

    if (existing) {
      if (
        existing.buffer &&
        existing.width === width &&
        existing.height === height &&
        existing.bytesPerRow === bytesPerRow
      ) {
        return existing
      }
      if (existing.buffer) existing.buffer.destroy()
      existing.buffer = this.renderer.createReadbackBuffer(`${this.label}-analysis-${key}`, bufferSize)
      existing.width = width
      existing.height = height
      existing.bytesPerRow = bytesPerRow
      existing.busy = false
      return existing
    }

    const created: AnalysisReadbackState = {
      buffer: this.renderer.createReadbackBuffer(`${this.label}-analysis-${key}`, bufferSize),
      width,
      height,
      bytesPerRow,
      busy: false
    }
    this.analysisReadbacks.set(key, created)
    return created
  }

  private getAnalysisReductionPyramidKey (signature: string, width: number, height: number): string {
    return `${signature}::dims=${Math.max(1, width)}x${Math.max(1, height)}`
  }

  private getOrCreateAnalysisReductionPyramid (
    signature: string,
    width: number,
    height: number
  ): AnalysisReductionPyramid | null {
    if (!this.renderer || !this.renderer.ready) return null
    const key = this.getAnalysisReductionPyramidKey(signature, width, height)
    const existing = this.analysisReductionPyramids.get(key)
    if (existing) return existing

    let nextWidth = Math.max(1, width)
    let nextHeight = Math.max(1, height)
    const textures: GPUTexture[] = []

    while (nextWidth > 1 || nextHeight > 1) {
      nextWidth = Math.max(1, Math.ceil(nextWidth / 2))
      nextHeight = Math.max(1, Math.ceil(nextHeight / 2))
      textures.push(this.renderer.createOutputTexture({
        width: nextWidth,
        height: nextHeight,
        label: `${this.label}-analysis-reduce-${signature}-${nextWidth}x${nextHeight}`,
        includeRenderAttachment: false
      }))
    }

    const created: AnalysisReductionPyramid = {
      width: Math.max(1, width),
      height: Math.max(1, height),
      textures
    }
    this.analysisReductionPyramids.set(key, created)
    return created
  }

  private clearAnalysisReductionPyramids (): void {
    this.analysisReductionPyramids.forEach((pyramid) => {
      pyramid.textures.forEach((texture) => texture.destroy())
    })
    this.analysisReductionPyramids.clear()
  }

  private getAnalysisReductionPipeline (): GPUComputePipeline | null {
    if (!this.renderer || !this.renderer.ready) return null
    const entry = this.renderer.getOutputPipelineEntry(
      ANALYSIS_REDUCTION_PIPELINE_SIGNATURE,
      ANALYSIS_REDUCTION_WGSL
    ) as PipelineEntry | null
    if (!entry || entry.error || !entry.pipeline) return null
    return entry.pipeline
  }

  private reduceAnalysisTextureToSinglePixel (
    pass: HydraCompiledPass,
    texture: GPUTexture,
    width: number,
    height: number,
    encoder: GPUCommandEncoder
  ): { texture: GPUTexture, width: number, height: number } | null {
    if (!this.renderer || !this.renderer.ready || !this.renderer.device) return null
    if (width <= 1 && height <= 1) return { texture, width, height }

    const pipeline = this.getAnalysisReductionPipeline()
    if (!pipeline) return null
    const pyramid = this.getOrCreateAnalysisReductionPyramid(pass.signature, width, height)
    if (!pyramid || pyramid.textures.length === 0) return null

    let readTexture = texture
    let readWidth = Math.max(1, width)
    let readHeight = Math.max(1, height)

    for (let index = 0; index < pyramid.textures.length; index += 1) {
      const targetTexture = pyramid.textures[index]
      readWidth = Math.max(1, Math.ceil(readWidth / 2))
      readHeight = Math.max(1, Math.ceil(readHeight / 2))
      const bindGroup = this.renderer.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: this.renderer.getTextureView(readTexture) },
          { binding: 1, resource: this.renderer.getTextureView(targetTexture) }
        ]
      })
      const computePass = encoder.beginComputePass()
      computePass.setPipeline(pipeline)
      computePass.setBindGroup(0, bindGroup)
      computePass.dispatchWorkgroups(
        Math.max(1, Math.ceil(readWidth / ANALYSIS_REDUCTION_WORKGROUP_SIZE)),
        Math.max(1, Math.ceil(readHeight / ANALYSIS_REDUCTION_WORKGROUP_SIZE)),
        1
      )
      computePass.end()
      readTexture = targetTexture
    }

    return { texture: readTexture, width: readWidth, height: readHeight }
  }

  private applyAnalysisBindings (
    analysisOut: HydraAnalysisOutputBinding[],
    rgba: [number, number, number, number]
  ): void {
    const [r, g, b, a] = rgba
    const luma = r * 0.2126 + g * 0.7152 + b * 0.0722
    analysisOut.forEach((binding) => {
      if (binding.type === 'float') {
        this.analysisValues[binding.uniformName] = luma
        return
      }
      if (binding.type === 'vec2') {
        this.analysisValues[binding.uniformName] = [r, g]
        return
      }
      if (binding.type === 'vec3') {
        this.analysisValues[binding.uniformName] = [r, g, b]
        return
      }
      this.analysisValues[binding.uniformName] = [r, g, b, a]
    })
  }

  private decodeAnalysisAverages (
    state: AnalysisReadbackState,
    mapped: ArrayBuffer
  ): [number, number, number, number] | null {
    let sumR = 0
    let sumG = 0
    let sumB = 0
    let sumA = 0
    let count = 0

    if (OUTPUT_TEXTURE_FORMAT === 'rgba16float') {
      const view = new DataView(mapped)
      for (let y = 0; y < state.height; y += 1) {
        const rowOffset = y * state.bytesPerRow
        for (let x = 0; x < state.width; x += 1) {
          const pixelOffset = rowOffset + (x * 8)
          const r = decodeFloat16(view.getUint16(pixelOffset, true))
          const g = decodeFloat16(view.getUint16(pixelOffset + 2, true))
          const b = decodeFloat16(view.getUint16(pixelOffset + 4, true))
          const a = decodeFloat16(view.getUint16(pixelOffset + 6, true))
          sumR += Number.isFinite(r) ? r : 0
          sumG += Number.isFinite(g) ? g : 0
          sumB += Number.isFinite(b) ? b : 0
          sumA += Number.isFinite(a) ? a : 0
          count += 1
        }
      }
    } else {
      const bytes = new Uint8Array(mapped)
      for (let y = 0; y < state.height; y += 1) {
        const rowOffset = y * state.bytesPerRow
        for (let x = 0; x < state.width; x += 1) {
          const pixelOffset = rowOffset + (x * 4)
          sumR += bytes[pixelOffset] / 255
          sumG += bytes[pixelOffset + 1] / 255
          sumB += bytes[pixelOffset + 2] / 255
          sumA += bytes[pixelOffset + 3] / 255
          count += 1
        }
      }
    }

    if (count <= 0) return null
    return [
      sumR / count,
      sumG / count,
      sumB / count,
      sumA / count
    ]
  }

  private enqueueAnalysisReadback (
    pass: HydraCompiledPass,
    texture: GPUTexture,
    width: number,
    height: number,
    encoder: GPUCommandEncoder
  ): void {
    const analysisOut = pass.analysisOut
    if (!analysisOut || analysisOut.length === 0) return
    if (!this.renderer || !this.renderer.ready || !this.renderer.device) return

    let readTexture = texture
    let readWidth = Math.max(1, width)
    let readHeight = Math.max(1, height)
    const reduced = this.reduceAnalysisTextureToSinglePixel(pass, texture, readWidth, readHeight, encoder)
    if (reduced) {
      readTexture = reduced.texture
      readWidth = reduced.width
      readHeight = reduced.height
    }

    const state = this.getOrCreateAnalysisReadback(pass, readWidth, readHeight)
    if (!state || !state.buffer || state.busy) return

    const copyTextureToBuffer = (encoder as unknown as {
      copyTextureToBuffer?: (
        source: GPUImageCopyTexture,
        destination: GPUImageCopyBuffer,
        copySize: GPUExtent3D
      ) => void
    }).copyTextureToBuffer
    if (typeof copyTextureToBuffer !== 'function') return

    copyTextureToBuffer.call(
      encoder,
      { texture: readTexture },
      {
        buffer: state.buffer,
        bytesPerRow: state.bytesPerRow,
        rowsPerImage: state.height
      },
      {
        width: state.width,
        height: state.height,
        depthOrArrayLayers: 1
      }
    )

    const mapAsync = (state.buffer as unknown as { mapAsync?: (mode: number) => Promise<void> }).mapAsync
    const getMappedRange = (state.buffer as unknown as { getMappedRange?: () => ArrayBuffer }).getMappedRange
    const unmap = (state.buffer as unknown as { unmap?: () => void }).unmap
    const mapModeRead = (globalThis as unknown as { GPUMapMode?: { READ: number } }).GPUMapMode?.READ ?? 1

    if (typeof mapAsync !== 'function' || typeof getMappedRange !== 'function' || typeof unmap !== 'function') return

    state.busy = true
    void mapAsync.call(state.buffer, mapModeRead).then(() => {
      const mapped = getMappedRange.call(state.buffer)
      const averages = this.decodeAnalysisAverages(state, mapped)
      if (averages) this.applyAnalysisBindings(analysisOut, averages)
    }).catch(() => {
      // Analysis readback failures should not break frame rendering.
    }).finally(() => {
      try {
        unmap.call(state.buffer)
      } catch {
        // Ignore unmap errors after failed map attempts.
      }
      state.busy = false
    })
  }

  private getOrCreateBindGroup (
    pipeline: GPUComputePipeline,
    pass: HydraCompiledPass,
    resolvedTextures: Array<GPUTexture | null>,
    resolvedStorageTextures: Array<GPUTexture | null>,
    resolvedStorageBuffers: Array<GPUBuffer | null>,
    writeTexture: GPUTexture | null
  ): GPUBindGroup {
    if (
      !this.renderer ||
      !this.renderer.device ||
      !this.renderer.globalUniformBuffer
    ) {
      throw new Error('Renderer resources are unavailable.')
    }

    const sampledTextures = pass.textures
    const storageTextures = pass.storageTextures ?? []
    const storageBuffers = pass.storageBuffers ?? []
    const outputTextureBinding = this.doesPassProduceOutput(pass)
      ? (pass.output?.binding ?? (3 + sampledTextures.length))
      : undefined
    let cacheKey = `p${this.renderer.getObjectId(pipeline)}|g${this.renderer.getObjectId(this.renderer.globalUniformBuffer)}`

    if (pass.uniforms.length > 0 && this.dynamicUniformBuffer) {
      cacheKey += `|d${this.renderer.getObjectId(this.dynamicUniformBuffer)}`
    }
    if (sampledTextures.length > 0 && this.renderer.linearSampler) {
      cacheKey += `|s${this.renderer.getObjectId(this.renderer.linearSampler)}`
    }

    for (let index = 0; index < sampledTextures.length; index += 1) {
      const textureBinding = sampledTextures[index]
      cacheKey += `|t${textureBinding.binding}:${this.renderer.getObjectId(resolvedTextures[index])}`
    }
    for (let index = 0; index < storageTextures.length; index += 1) {
      const textureBinding = storageTextures[index]
      cacheKey += `|st${textureBinding.binding}:${this.renderer.getObjectId(resolvedStorageTextures[index])}`
    }
    for (let index = 0; index < storageBuffers.length; index += 1) {
      const bufferBinding = storageBuffers[index]
      cacheKey += `|sb${bufferBinding.binding}:${this.renderer.getObjectId(resolvedStorageBuffers[index])}`
    }
    if (typeof outputTextureBinding === 'number') {
      cacheKey += `|o${outputTextureBinding}:${this.renderer.getObjectId(writeTexture)}`
    }

    const cached = this.bindGroupCache.get(cacheKey)
    if (cached) {
      this.bindGroupCache.delete(cacheKey)
      this.bindGroupCache.set(cacheKey, cached)
      return cached
    }

    const entries: GPUBindGroupEntry[] = [
      { binding: 0, resource: { buffer: this.renderer.globalUniformBuffer } }
    ]

    if (pass.uniforms.length > 0) {
      if (!this.dynamicUniformBuffer) {
        throw new Error('Dynamic uniform buffer is unavailable for pass uniforms.')
      }
      entries.push({ binding: 1, resource: { buffer: this.dynamicUniformBuffer } })
    }

    if (sampledTextures.length > 0) {
      if (!this.renderer.linearSampler) {
        throw new Error('Sampler resource is unavailable for textured pass.')
      }
      entries.push({ binding: 2, resource: this.renderer.linearSampler })
    }

    for (let index = 0; index < sampledTextures.length; index += 1) {
      const textureBinding = sampledTextures[index]
      const texture = resolvedTextures[index] ?? this.renderer.getFallbackTexture()
      entries.push({
        binding: textureBinding.binding,
        resource: this.renderer.getTextureView(texture)
      })
    }

    for (let index = 0; index < storageBuffers.length; index += 1) {
      const bufferBinding = storageBuffers[index]
      const resolved = resolvedStorageBuffers[index]
      if (!resolved) {
        throw new Error(`Storage buffer binding "${bufferBinding.name}" is unresolved.`)
      }
      entries.push({
        binding: bufferBinding.binding,
        resource: { buffer: resolved }
      })
    }

    for (let index = 0; index < storageTextures.length; index += 1) {
      const textureBinding = storageTextures[index]
      const texture = resolvedStorageTextures[index] ?? this.renderer.getFallbackStorageTexture(textureBinding.dimension)
      entries.push({
        binding: textureBinding.binding,
        resource: this.renderer.getTextureView(
          texture,
          textureBinding.dimension === '2d_array' ? '2d-array' : '2d'
        )
      })
    }

    if (typeof outputTextureBinding === 'number') {
      if (!writeTexture) {
        throw new Error(`Output texture binding "${outputTextureBinding}" is unresolved.`)
      }
      entries.push({
        binding: outputTextureBinding,
        resource: this.renderer.getTextureView(writeTexture)
      })
    }

    const created = this.renderer.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries
    })
    this.bindGroupCache.set(cacheKey, created)
    while (this.bindGroupCache.size > MAX_BIND_GROUP_CACHE_ENTRIES) {
      const oldest = this.bindGroupCache.keys().next().value
      if (!oldest) break
      this.bindGroupCache.delete(oldest)
    }
    return created
  }

  tick (props: HydraFrameState, encoder: GPUCommandEncoder | null): void {
    this.ensureResources()
    if (!this.renderer || !this.renderer.ready || !encoder) return

    const resolvedPasses = this.resolvePasses()
    if (!resolvedPasses) return

    if (Object.keys(this.analysisValues).length > 0) {
      if (!props.analysis) props.analysis = {}
      Object.assign(props.analysis, this.analysisValues)
    }

    this.frameCounter += 1
    this.frameOrdinal += 1
    let currentTexture = this.lastOutputTexture ?? this.textures[this.pingPongIndex] ?? this.renderer.getFallbackTexture()
    let currentTextureWidth = this.width
    let currentTextureHeight = this.height

    for (let passIndex = 0; passIndex < resolvedPasses.length; passIndex += 1) {
      const resolved = resolvedPasses[passIndex]
      const { sourceSignature, pass, pipeline, workgroupSize } = resolved
      if (!this.shouldRunPass(pass, passIndex)) {
        const historyTexture = this.passOutputHistory[passIndex]
        if (historyTexture && this.doesPassProduceOutput(pass)) {
          const [historyWidth, historyHeight] = this.getPassDimensions(pass)
          currentTexture = historyTexture
          currentTextureWidth = historyWidth
          currentTextureHeight = historyHeight
        }
        continue
      }

      const [passWidth, passHeight] = this.getPassDimensions(pass)
      const fullResolutionTarget = passWidth === this.width && passHeight === this.height
      const readTexture = currentTexture
      const producesOutput = this.doesPassProduceOutput(pass)
      const requiresWriteTexture = producesOutput || this.passNeedsTransientWriteTexture(pass)

      let writeTexture: GPUTexture | null = null
      let writeIndex = 0
      let scaledPair: SizedTexturePair | null = null

      if (requiresWriteTexture) {
        if (fullResolutionTarget) {
          writeIndex = this.pingPongIndex ? 0 : 1
          writeTexture = this.textures[writeIndex] ?? this.renderer.getFallbackTexture()
        } else {
          scaledPair = this.getOrCreateScaledTexturePair(passWidth, passHeight)
          scaledPair.lastUsedFrame = this.frameOrdinal
          writeIndex = scaledPair.currentIndex ? 0 : 1
          writeTexture = scaledPair.textures[writeIndex] ?? this.renderer.getFallbackTexture()
        }
      }

      this.renderer.updateGlobalUniforms({
        time: props.time,
        bpm: props.bpm,
        width: passWidth,
        height: passHeight
      })

      this.updateDynamicUniforms(pass.uniforms, props)

      for (let index = 0; index < pass.textures.length; index += 1) {
        const textureBinding = pass.textures[index]
        this.resolvedTexturesScratch[index] = this.resolveTextureBinding(textureBinding, readTexture) ?? this.renderer.getFallbackTexture()
      }
      this.resolvedTexturesScratch.length = pass.textures.length

      const storageTextures = pass.storageTextures ?? []
      for (let index = 0; index < storageTextures.length; index += 1) {
        this.resolvedStorageTexturesScratch[index] =
          this.resolveStorageTextureBinding(storageTextures[index], writeTexture, passWidth, passHeight) ??
          this.renderer.getFallbackTexture()
      }
      this.resolvedStorageTexturesScratch.length = storageTextures.length

      const storageBuffers = pass.storageBuffers ?? []
      for (let index = 0; index < storageBuffers.length; index += 1) {
        this.resolvedStorageBuffersScratch[index] = this.resolveStorageBufferBinding(storageBuffers[index])
      }
      this.resolvedStorageBuffersScratch.length = storageBuffers.length

      const bindGroup = this.getOrCreateBindGroup(
        pipeline,
        pass,
        this.resolvedTexturesScratch,
        this.resolvedStorageTexturesScratch,
        this.resolvedStorageBuffersScratch,
        writeTexture
      )
      const dispatchConfig = pass.dispatch
      const dispatchDomain = dispatchConfig?.domain ?? 'pixel2d'
      const [workgroupSizeX, workgroupSizeY] = workgroupSize
      const linearItemCount = Math.max(1, Math.floor(dispatchConfig?.itemCount ?? (passWidth * passHeight)))
      const workgroupsX = dispatchDomain === 'linear1d'
        ? Math.max(1, Math.ceil(linearItemCount / workgroupSizeX))
        : Math.max(1, Math.ceil(passWidth / workgroupSizeX))
      const workgroupsY = dispatchDomain === 'linear1d'
        ? 1
        : Math.max(1, Math.ceil(passHeight / workgroupSizeY))
      const workgroupsZ = 1

      const encodeStartMs = this.nowMs()
      const computePass = encoder.beginComputePass()
      computePass.setPipeline(pipeline)
      computePass.setBindGroup(0, bindGroup)
      if (dispatchConfig?.mode === 'indirect') {
        let indirectBuffer: GPUBuffer | null = null
        if (dispatchConfig.getIndirectBuffer) {
          try {
            indirectBuffer = dispatchConfig.getIndirectBuffer() as GPUBuffer
          } catch {
            indirectBuffer = null
          }
        }

        if (!indirectBuffer) {
          indirectBuffer = this.getOrCreateInternalIndirectBuffer(pass)
          if (indirectBuffer) {
            const offset = dispatchConfig.indirectOffset ?? 0
            const previous = this.internalIndirectDispatchState.get(pass.signature)
            if (
              !previous ||
              previous.x !== workgroupsX ||
              previous.y !== workgroupsY ||
              previous.z !== workgroupsZ ||
              previous.offset !== offset
            ) {
              this.renderer.device?.queue.writeBuffer(
                indirectBuffer,
                offset,
                new Uint32Array([workgroupsX, workgroupsY, workgroupsZ])
              )
              this.internalIndirectDispatchState.set(pass.signature, {
                x: workgroupsX,
                y: workgroupsY,
                z: workgroupsZ,
                offset
              })
            }
          }
        }

        if (indirectBuffer) {
          computePass.dispatchWorkgroupsIndirect(indirectBuffer, dispatchConfig.indirectOffset ?? 0)
        } else {
          computePass.dispatchWorkgroups(workgroupsX, workgroupsY, workgroupsZ)
        }
      } else {
        computePass.dispatchWorkgroups(workgroupsX, workgroupsY, workgroupsZ)
      }
      computePass.end()
      this.enqueueQueueCounterReadback(pass, encoder)
      this.recordPassStat(
        sourceSignature,
        this.nowMs() - encodeStartMs,
        sourceSignature !== pass.signature,
        this.inferPassVariant(pass),
        dispatchDomain,
        [workgroupsX, workgroupsY, workgroupsZ]
      )

      if (producesOutput && writeTexture) {
        this.enqueueAnalysisReadback(pass, writeTexture, passWidth, passHeight, encoder)
      }

      if (producesOutput && writeTexture) {
        if (fullResolutionTarget) {
          this.pingPongIndex = writeIndex
        } else if (scaledPair) {
          scaledPair.currentIndex = writeIndex
        }
        currentTexture = writeTexture
        currentTextureWidth = passWidth
        currentTextureHeight = passHeight
        this.passOutputHistory[passIndex] = writeTexture
        this.lastOutputTexture = writeTexture
      } else {
        this.passOutputHistory[passIndex] = currentTexture
      }
    }

    this.recordHistoryTexture(currentTexture, currentTextureWidth, currentTextureHeight, encoder)
    this.pruneScaledTexturePairs()

    this.renderer.updateGlobalUniforms({
      time: props.time,
      bpm: props.bpm,
      width: this.width,
      height: this.height
    })
    this.frameEvents.clear()
  }

  dispose (): void {
    WebGPUOutputNode.liveNodes.delete(this)
    WebGPUOutputNode.recomputeHistoryDepths()

    this.pendingPasses = null
    this.activePasses = []
    this.activeSourcePasses = []
    this.activePipelineEntries = []
    this.graphSource = null
    this.graphRenderHandler = null
    this.inGraphRenderDispatch = false
    this.reportedPipelineErrors.clear()
    this.pipelineErrorHandler = null
    this.passStats.clear()

    this.invalidateBindGroupCache()
    this.frameEvents.clear()

    this.textures.forEach((texture) => {
      if (texture) texture.destroy()
    })
    this.textures = [null, null]
    this.lastOutputTexture = null
    this.passOutputHistory = []
    this.clearInternalIndirectBuffers()
    this.clearAnalysisReadbacks()
    this.clearQueueCounterReadbacks()
    this.clearAnalysisReductionPyramids()
    this.resetHistoryTextures()
    this.destroyScaledTexturePairs()
    this.resolvedTexturesScratch.length = 0
    this.resolvedStorageTexturesScratch.length = 0
    this.resolvedStorageBuffersScratch.length = 0

    this.persistentTextures.forEach((state) => state.texture.destroy())
    this.persistentTextures.clear()
    this.persistentBuffers.forEach((buffer) => buffer.destroy())
    this.persistentBuffers.clear()
    this.persistentBufferSizes.clear()

    if (this.dynamicUniformBuffer) this.dynamicUniformBuffer.destroy()
    this.dynamicUniformBuffer = null
    this.renderer = null
  }
}
