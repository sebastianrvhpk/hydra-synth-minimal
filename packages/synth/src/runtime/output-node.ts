import type {
  HydraCompiledPass,
  HydraFrameState,
  HydraOutputGraphSource,
  HydraOutputAdapter,
  HydraPassVariant
} from '../core/index.js'
import { MAX_DYNAMIC_UNIFORMS } from '../webgpu/constants.js'
import type { WebGPURenderer, WebGPUTextureFilterMode } from '../webgpu/renderer.js'

interface PipelineEntry {
  cacheKey: string
  signature: string
  code: string
  pipeline: GPURenderPipeline | GPUComputePipeline | null
  error: unknown | null
}

interface RuntimePipelineEntry {
  entry: PipelineEntry
  pass: HydraCompiledPass
  requestedVariant: HydraPassVariant
  selectedVariant: HydraPassVariant
}

interface BindGroupCacheEntry {
  pipelineId: number
  globalBufferId: number
  dynamicBufferId: number
  samplerId: number
  outputTextureId: number
  textureIds: number[]
  bindGroup: GPUBindGroup
  lastUsedFrame: number
}

interface BindGroupResolution {
  bindGroup: GPUBindGroup
  cacheHit: boolean
  created: boolean
}

interface PipelineErrorContext {
  outputLabel: string
  passIndex: number
  signature: string
  error: unknown
}

interface ResolvedCompiledPass {
  pass: HydraCompiledPass
  pipeline: GPURenderPipeline | GPUComputePipeline
  requestedVariant: HydraPassVariant
  selectedVariant: HydraPassVariant
}

interface SizedTexturePair {
  textures: [GPUTexture | null, GPUTexture | null]
  currentIndex: number
  lastUsedFrame: number
}

interface SizedTexturePool {
  textures: GPUTexture[]
  cursor: number
  lastUsedFrame: number
}

interface PassExecutionStats {
  runCount: number
  lastCpuEncodeMs: number
  avgCpuEncodeMs: number
  lastDynamicUniformEvalMs: number
  avgDynamicUniformEvalMs: number
  lastDynamicUniformWriteMs: number
  avgDynamicUniformWriteMs: number
  lastTextureResolutionMs: number
  avgTextureResolutionMs: number
  lastBindGroupMs: number
  avgBindGroupMs: number
  lastRenderPassEncodeMs: number
  avgRenderPassEncodeMs: number
  lastComputePassEncodeMs: number
  avgComputePassEncodeMs: number
  lastGpuMs: number | null
  avgGpuMs: number | null
  gpuTimingSource: 'timestamp_query' | 'cpu_encode_fallback' | 'history_fallback' | 'unavailable'
  fallbackCount: number
  globalUniformWriteCount: number
  dynamicUniformWriteCount: number
  dynamicUniformSkipCount: number
  bindGroupCacheHits: number
  bindGroupCacheMisses: number
  bindGroupCreationCount: number
  pipelineCacheMissCount: number
  pipelineNotReadyCount: number
  pipelineErrorCount: number
  computeAttemptCount: number
  computeFallbackCount: number
  timestampQueryCount: number
  gpuTimingSampleCount: number
  variant: HydraPassVariant
}

interface DynamicUniformWriteState {
  values: Float32Array
  floatCount: number
}

interface DynamicUniformUpdateResult {
  evalMs: number
  writeMs: number
  wrote: boolean
  skippedWrite: boolean
  floatCount: number
}

interface PassRunProfile {
  dynamicUniformEvalMs: number
  dynamicUniformWriteMs: number
  textureResolutionMs: number
  bindGroupMs: number
  renderPassEncodeMs: number
  computePassEncodeMs: number
  globalUniformWrote: boolean
  dynamicUniformWrote: boolean
  dynamicUniformSkipped: boolean
  bindGroupCacheHit: boolean
  bindGroupCreated: boolean
}

const MAX_SCALED_TEXTURE_PAIRS = 8
const MAX_BIND_GROUP_CACHE_ENTRIES = 64
const DEFAULT_HISTORY_DEPTH = 0


export class WebGPUOutputNode implements HydraOutputAdapter {
  private static readonly liveNodes = new Set<WebGPUOutputNode>()
  private static refreshHistoryDepths (): void {
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
  private passDynamicUniformBuffers: Array<GPUBuffer | null> = []
  private readonly dynamicUniformData = new Float32Array(MAX_DYNAMIC_UNIFORMS)

  private activePasses: HydraCompiledPass[] = []
  private activeSourcePasses: HydraCompiledPass[] = []
  private pendingPasses: HydraCompiledPass[] | null = null
  private pendingPipelineEntries: RuntimePipelineEntry[] | null = null
  private activePipelineEntries: RuntimePipelineEntry[] = []
  private readonly reportedPipelineErrors = new Set<string>()
  private pipelineErrorHandler: ((context: PipelineErrorContext) => void) | null = null

  private readonly bindGroupCache: BindGroupCacheEntry[] = []
  private readonly resolvedTexturesScratch: Array<GPUTexture | null> = []
  private readonly bindGroupTextureIdsScratch: number[] = []
  private readonly scaledTexturePairs = new Map<string, SizedTexturePair>()
  private readonly transientWriteTexturePools = new Map<string, SizedTexturePool>()
  private graphSource: HydraOutputGraphSource | null = null
  private graphRenderHandler: ((output: WebGPUOutputNode, source: HydraOutputGraphSource) => void) | null = null
  private inGraphRenderCycle = false
  private samplerFilter: WebGPUTextureFilterMode = 'nearest'
  private historyTextures: Array<GPUTexture | null> = []
  private historyCursor = -1
  private historyCount = 0
  private historyDepth = DEFAULT_HISTORY_DEPTH
  private ownHistoryDepth = DEFAULT_HISTORY_DEPTH
  private outboundHistoryRequests = new Map<number, number>()
  private frameInputTexture: GPUTexture | null = null
  private lastOutputTexture: GPUTexture | null = null
  private passOutputHistory: Array<GPUTexture | null> = []
  private frameCounter = 0
  private frameOrdinal = 0
  private readonly frameEvents = new Set<string>()
  private readonly passStats = new Map<string, PassExecutionStats>()
  private readonly seenPipelineCacheKeys = new Set<string>()
  private passDynamicUniformStates: Array<DynamicUniformWriteState | null> = []
  private activeInternalPassLastUseByIndex = new Map<number, number>()

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

  setNearest (): this {
    this.samplerFilter = 'nearest'
    return this
  }

  setLinear (): this {
    this.samplerFilter = 'linear'
    return this
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
      this.inGraphRenderCycle = true
      try {
        this.render(source.compilePasses())
      } finally {
        this.inGraphRenderCycle = false
      }
      return
    }

    this.inGraphRenderCycle = true
    try {
      this.graphRenderHandler(this, source)
    } finally {
      this.inGraphRenderCycle = false
    }
  }

  emitEvent (name: string): void {
    if (!name) return
    this.frameEvents.add(name)
  }

  attachRenderer (renderer: WebGPURenderer): void {
    this.destroyPassDynamicUniformBuffers()
    this.renderer = renderer
    this.pendingPipelineEntries = null
    this.activePipelineEntries = []
    this.seenPipelineCacheKeys.clear()
    this.invalidateBindGroupCache()
    this.ensureResources()
  }

  private ensureResources (): void {
    if (!this.renderer || !this.renderer.ready) return
    if (!this.textures[0] || !this.textures[1]) {
      this.createPingPongTextures()
    }
  }

  private createPingPongTextures (): void {
    if (!this.renderer || !this.renderer.ready) return

    this.textures.forEach((texture) => {
      if (texture) texture.destroy()
    })
    this.destroyTransientWriteTexturePools()

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

  private destroyPassDynamicUniformBuffers (): void {
    this.passDynamicUniformBuffers.forEach((buffer) => {
      if (buffer) buffer.destroy()
    })
    this.passDynamicUniformBuffers = []
    this.passDynamicUniformStates = []
  }

  private restorePassDynamicUniformBuffers (
    previousSourcePasses: HydraCompiledPass[],
    previousBuffers: Array<GPUBuffer | null>,
    nextSourcePasses: HydraCompiledPass[]
  ): Array<GPUBuffer | null> {
    const restored: Array<GPUBuffer | null> = new Array(nextSourcePasses.length).fill(null)
    const bufferBucketsBySignature = new Map<string, GPUBuffer[]>()

    for (let index = 0; index < previousSourcePasses.length; index += 1) {
      const previousPass = previousSourcePasses[index]
      const previousBuffer = previousBuffers[index]
      if (!previousPass || !previousBuffer) continue
      const bucket = bufferBucketsBySignature.get(previousPass.signature)
      if (bucket) bucket.push(previousBuffer)
      else bufferBucketsBySignature.set(previousPass.signature, [previousBuffer])
    }

    for (let index = 0; index < nextSourcePasses.length; index += 1) {
      const nextPass = nextSourcePasses[index]
      if (!nextPass || nextPass.uniforms.length === 0) continue

      const reusableBucket = bufferBucketsBySignature.get(nextPass.signature)
      const reusableBuffer = reusableBucket?.shift() ?? null
      if (reusableBuffer) {
        restored[index] = reusableBuffer
        continue
      }

      if (!this.renderer || !this.renderer.ready) continue
      restored[index] = this.renderer.createDynamicUniformBuffer(`${this.label}-dynamic-uniforms-pass-${index}`)
    }

    for (const bucket of bufferBucketsBySignature.values()) {
      for (const staleBuffer of bucket) {
        staleBuffer.destroy()
      }
    }

    return restored
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

  private destroyTransientWriteTexturePools (): void {
    this.transientWriteTexturePools.forEach((pool) => {
      pool.textures.forEach((texture) => texture.destroy())
    })
    this.transientWriteTexturePools.clear()
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

        if ('id' in source) {
          const targetId = (source as { id?: unknown }).id
          if (
            typeof targetId === 'number' &&
            Number.isInteger(targetId) &&
            targetId >= 0 &&
            targetId === this.id
          ) {
            requiredDepth = Math.max(requiredDepth, 1)
          }
        }

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
    }

    this.ownHistoryDepth = requiredDepth
    this.outboundHistoryRequests = outboundRequests
    WebGPUOutputNode.refreshHistoryDepths()
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

  private getOrCreateTransientWriteTexture (
    width: number,
    height: number,
    avoidTextures: Array<GPUTexture | null> = []
  ): GPUTexture | null {
    if (!this.renderer || !this.renderer.ready) return null
    const key = this.getScaleKey(width, height)
    const avoid = new Set(avoidTextures.filter((texture): texture is GPUTexture => Boolean(texture)))
    const cached = this.transientWriteTexturePools.get(key)
    if (cached && cached.textures.length > 0) {
      cached.lastUsedFrame = this.frameOrdinal
      for (let offset = 0; offset < cached.textures.length; offset += 1) {
        const index = (cached.cursor + offset) % cached.textures.length
        const candidate = cached.textures[index]
        if (avoid.has(candidate)) continue
        cached.cursor = (index + 1) % cached.textures.length
        return candidate
      }

      const created = this.renderer.createOutputTexture({
        width,
        height,
        label: `${this.label}-transient-write-${width}x${height}-${cached.textures.length}`
      })
      cached.textures.push(created)
      cached.cursor = cached.textures.length % cached.textures.length
      return created
    }

    const created = this.renderer.createOutputTexture({
      width,
      height,
      label: `${this.label}-transient-write-${width}x${height}-0`
    })
    this.transientWriteTexturePools.set(key, {
      textures: [created],
      cursor: 0,
      lastUsedFrame: this.frameOrdinal
    })
    return created
  }

  private getInternalPassLastUseByIndex (passes: HydraCompiledPass[]): Map<number, number> {
    const lastUseByIndex = new Map<number, number>()

    passes.forEach((pass, passIndex) => {
      pass.textures.forEach((textureBinding) => {
        const source = textureBinding.sourceRef
        if (!source || typeof source !== 'object' || !('internalPassIndex' in source)) return
        const internalPassIndex = (source as { internalPassIndex?: unknown }).internalPassIndex
        if (typeof internalPassIndex !== 'number' || !Number.isInteger(internalPassIndex) || internalPassIndex < 0) return
        const current = lastUseByIndex.get(internalPassIndex) ?? -1
        if (passIndex > current) lastUseByIndex.set(internalPassIndex, passIndex)
      })
    })

    return lastUseByIndex
  }

  private getProtectedPassOutputTextures (
    passIndex: number,
    lastUseByIndex: Map<number, number>
  ): Array<GPUTexture | null> {
    const protectedTextures: Array<GPUTexture | null> = []

    lastUseByIndex.forEach((lastUse, sourcePassIndex) => {
      if (sourcePassIndex >= passIndex || lastUse < passIndex) return
      protectedTextures.push(this.passOutputHistory[sourcePassIndex] ?? null)
    })

    return protectedTextures
  }

  private isTextureBeingSampled (
    texture: GPUTexture | null,
    sampledTextures: Array<GPUTexture | null>
  ): boolean {
    return Boolean(texture) && sampledTextures.some((sampled) => sampled === texture)
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
    this.destroyTransientWriteTexturePools()
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
    runCount: number
    lastCpuEncodeMs: number
    avgCpuEncodeMs: number
    lastDynamicUniformEvalMs: number
    avgDynamicUniformEvalMs: number
    lastDynamicUniformWriteMs: number
    avgDynamicUniformWriteMs: number
    lastTextureResolutionMs: number
    avgTextureResolutionMs: number
    lastBindGroupMs: number
    avgBindGroupMs: number
    lastRenderPassEncodeMs: number
    avgRenderPassEncodeMs: number
    lastComputePassEncodeMs: number
    avgComputePassEncodeMs: number
    lastGpuMs: number | null
    avgGpuMs: number | null
    gpuTimingSource: 'timestamp_query' | 'cpu_encode_fallback' | 'history_fallback' | 'unavailable'
    fallbackCount: number
    globalUniformWriteCount: number
    dynamicUniformWriteCount: number
    dynamicUniformSkipCount: number
    bindGroupCacheHits: number
    bindGroupCacheMisses: number
    bindGroupCreationCount: number
    pipelineCacheMissCount: number
    pipelineNotReadyCount: number
    pipelineErrorCount: number
    computeAttemptCount: number
    computeFallbackCount: number
    timestampQueryCount: number
    gpuTimingSampleCount: number
    variant: HydraPassVariant
  }> {
    const snapshot: Record<string, {
      runCount: number
      lastCpuEncodeMs: number
      avgCpuEncodeMs: number
      lastDynamicUniformEvalMs: number
      avgDynamicUniformEvalMs: number
      lastDynamicUniformWriteMs: number
      avgDynamicUniformWriteMs: number
      lastTextureResolutionMs: number
      avgTextureResolutionMs: number
      lastBindGroupMs: number
      avgBindGroupMs: number
      lastRenderPassEncodeMs: number
      avgRenderPassEncodeMs: number
      lastComputePassEncodeMs: number
      avgComputePassEncodeMs: number
      lastGpuMs: number | null
      avgGpuMs: number | null
      gpuTimingSource: 'timestamp_query' | 'cpu_encode_fallback' | 'history_fallback' | 'unavailable'
      fallbackCount: number
      globalUniformWriteCount: number
      dynamicUniformWriteCount: number
      dynamicUniformSkipCount: number
      bindGroupCacheHits: number
      bindGroupCacheMisses: number
      bindGroupCreationCount: number
      pipelineCacheMissCount: number
      pipelineNotReadyCount: number
      pipelineErrorCount: number
      computeAttemptCount: number
      computeFallbackCount: number
      timestampQueryCount: number
      gpuTimingSampleCount: number
      variant: HydraPassVariant
    }> = {}
    this.passStats.forEach((value, signature) => {
      snapshot[signature] = {
        runCount: value.runCount,
        lastCpuEncodeMs: value.lastCpuEncodeMs,
        avgCpuEncodeMs: value.avgCpuEncodeMs,
        lastDynamicUniformEvalMs: value.lastDynamicUniformEvalMs,
        avgDynamicUniformEvalMs: value.avgDynamicUniformEvalMs,
        lastDynamicUniformWriteMs: value.lastDynamicUniformWriteMs,
        avgDynamicUniformWriteMs: value.avgDynamicUniformWriteMs,
        lastTextureResolutionMs: value.lastTextureResolutionMs,
        avgTextureResolutionMs: value.avgTextureResolutionMs,
        lastBindGroupMs: value.lastBindGroupMs,
        avgBindGroupMs: value.avgBindGroupMs,
        lastRenderPassEncodeMs: value.lastRenderPassEncodeMs,
        avgRenderPassEncodeMs: value.avgRenderPassEncodeMs,
        lastComputePassEncodeMs: value.lastComputePassEncodeMs,
        avgComputePassEncodeMs: value.avgComputePassEncodeMs,
        lastGpuMs: value.lastGpuMs,
        avgGpuMs: value.avgGpuMs,
        gpuTimingSource: value.gpuTimingSource,
        fallbackCount: value.fallbackCount,
        globalUniformWriteCount: value.globalUniformWriteCount,
        dynamicUniformWriteCount: value.dynamicUniformWriteCount,
        dynamicUniformSkipCount: value.dynamicUniformSkipCount,
        bindGroupCacheHits: value.bindGroupCacheHits,
        bindGroupCacheMisses: value.bindGroupCacheMisses,
        bindGroupCreationCount: value.bindGroupCreationCount,
        pipelineCacheMissCount: value.pipelineCacheMissCount,
        pipelineNotReadyCount: value.pipelineNotReadyCount,
        pipelineErrorCount: value.pipelineErrorCount,
        computeAttemptCount: value.computeAttemptCount,
        computeFallbackCount: value.computeFallbackCount,
        timestampQueryCount: value.timestampQueryCount,
        gpuTimingSampleCount: value.gpuTimingSampleCount,
        variant: value.variant
      }
    })
    return snapshot
  }

  render (passes: HydraCompiledPass[]): void {
    if (!this.inGraphRenderCycle) this.clearGraphSource()
    this.pendingPasses = passes.slice()
    this.pendingPipelineEntries = null
    this.reportedPipelineErrors.clear()
    this.updateRequiredHistoryDepth(this.pendingPasses)

    if (this.renderer && this.renderer.ready) {
      const entries: RuntimePipelineEntry[] = []
      for (const pass of this.pendingPasses) {
        const entry = this.requestPipelineEntry(pass)
        if (entry) entries.push(entry)
      }
      this.pendingPipelineEntries = entries.length === this.pendingPasses.length ? entries : null
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
    }

    return Array.from(dependencies)
  }

  private reportPipelineErrorOnce (errorKey: string, context: PipelineErrorContext): void {
    if (this.reportedPipelineErrors.has(errorKey)) return
    this.reportedPipelineErrors.add(errorKey)
    if (this.pipelineErrorHandler) this.pipelineErrorHandler(context)
  }

  private invalidateBindGroupCache (): void {
    this.bindGroupCache.length = 0
  }

  private nowMs (): number {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now()
    return Date.now()
  }

  private estimateGpuMs (
    _cpuEncodeMs: number,
    existing: PassExecutionStats | undefined
  ): {
    value: number | null
    source: 'timestamp_query' | 'cpu_encode_fallback' | 'history_fallback' | 'unavailable'
  } {
    if (
      existing?.gpuTimingSource === 'timestamp_query' &&
      existing.lastGpuMs != null &&
      Number.isFinite(existing.lastGpuMs)
    ) {
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

  private createPassStats (signature: string): PassExecutionStats {
    const stats: PassExecutionStats = {
      runCount: 0,
      lastCpuEncodeMs: 0,
      avgCpuEncodeMs: 0,
      lastDynamicUniformEvalMs: 0,
      avgDynamicUniformEvalMs: 0,
      lastDynamicUniformWriteMs: 0,
      avgDynamicUniformWriteMs: 0,
      lastTextureResolutionMs: 0,
      avgTextureResolutionMs: 0,
      lastBindGroupMs: 0,
      avgBindGroupMs: 0,
      lastRenderPassEncodeMs: 0,
      avgRenderPassEncodeMs: 0,
      lastComputePassEncodeMs: 0,
      avgComputePassEncodeMs: 0,
      lastGpuMs: null,
      avgGpuMs: null,
      gpuTimingSource: 'unavailable',
      fallbackCount: 0,
      globalUniformWriteCount: 0,
      dynamicUniformWriteCount: 0,
      dynamicUniformSkipCount: 0,
      bindGroupCacheHits: 0,
      bindGroupCacheMisses: 0,
      bindGroupCreationCount: 0,
      pipelineCacheMissCount: 0,
      pipelineNotReadyCount: 0,
      pipelineErrorCount: 0,
      computeAttemptCount: 0,
      computeFallbackCount: 0,
      timestampQueryCount: 0,
      gpuTimingSampleCount: 0,
      variant: 'fragment'
    }
    this.passStats.set(signature, stats)
    return stats
  }

  private getOrCreatePassStats (signature: string): PassExecutionStats {
    return this.passStats.get(signature) ?? this.createPassStats(signature)
  }

  private averageStat (previousAverage: number, previousCount: number, nextValue: number): number {
    if (previousCount <= 0) return nextValue
    return ((previousAverage * previousCount) + nextValue) / (previousCount + 1)
  }

  private recordPassStat (
    signature: string,
    cpuEncodeMs: number,
    fallbackUsed: boolean,
    variant: HydraPassVariant,
    profile: PassRunProfile
  ): void {
    const safeMs = Number.isFinite(cpuEncodeMs) ? Math.max(0, cpuEncodeMs) : 0
    const existing = this.getOrCreatePassStats(signature)
    const gpuEstimate = this.estimateGpuMs(safeMs, existing)
    const gpuMs = gpuEstimate.value
    const gpuTimingSource = gpuEstimate.source

    const previousCount = existing.runCount
    const nextCount = previousCount + 1
    const avg = this.averageStat(existing.avgCpuEncodeMs, previousCount, safeMs)
    const avgGpu = gpuMs == null || existing.avgGpuMs == null
      ? (gpuMs ?? existing.avgGpuMs)
      : ((existing.avgGpuMs * previousCount) + gpuMs) / nextCount
    existing.runCount = nextCount
    existing.lastCpuEncodeMs = safeMs
    existing.avgCpuEncodeMs = avg
    existing.lastDynamicUniformEvalMs = profile.dynamicUniformEvalMs
    existing.avgDynamicUniformEvalMs = this.averageStat(existing.avgDynamicUniformEvalMs, previousCount, profile.dynamicUniformEvalMs)
    existing.lastDynamicUniformWriteMs = profile.dynamicUniformWriteMs
    existing.avgDynamicUniformWriteMs = this.averageStat(existing.avgDynamicUniformWriteMs, previousCount, profile.dynamicUniformWriteMs)
    existing.lastTextureResolutionMs = profile.textureResolutionMs
    existing.avgTextureResolutionMs = this.averageStat(existing.avgTextureResolutionMs, previousCount, profile.textureResolutionMs)
    existing.lastBindGroupMs = profile.bindGroupMs
    existing.avgBindGroupMs = this.averageStat(existing.avgBindGroupMs, previousCount, profile.bindGroupMs)
    existing.lastRenderPassEncodeMs = profile.renderPassEncodeMs
    existing.avgRenderPassEncodeMs = this.averageStat(existing.avgRenderPassEncodeMs, previousCount, profile.renderPassEncodeMs)
    existing.lastComputePassEncodeMs = profile.computePassEncodeMs
    existing.avgComputePassEncodeMs = this.averageStat(existing.avgComputePassEncodeMs, previousCount, profile.computePassEncodeMs)
    existing.lastGpuMs = gpuMs
    existing.avgGpuMs = avgGpu ?? null
    existing.gpuTimingSource = gpuTimingSource
    if (fallbackUsed) existing.fallbackCount += 1
    if (profile.globalUniformWrote) existing.globalUniformWriteCount += 1
    if (profile.dynamicUniformWrote) existing.dynamicUniformWriteCount += 1
    if (profile.dynamicUniformSkipped) existing.dynamicUniformSkipCount += 1
    if (profile.bindGroupCacheHit) existing.bindGroupCacheHits += 1
    else existing.bindGroupCacheMisses += 1
    if (profile.bindGroupCreated) existing.bindGroupCreationCount += 1
    existing.variant = variant
  }

  private recordPipelineCacheMiss (signature: string): void {
    this.getOrCreatePassStats(signature).pipelineCacheMissCount += 1
  }

  private recordPipelineNotReady (signature: string): void {
    this.getOrCreatePassStats(signature).pipelineNotReadyCount += 1
  }

  private recordPipelineError (signature: string): void {
    this.getOrCreatePassStats(signature).pipelineErrorCount += 1
  }

  private recordComputeAttempt (signature: string): void {
    this.getOrCreatePassStats(signature).computeAttemptCount += 1
  }

  private recordComputeFallback (signature: string): void {
    this.getOrCreatePassStats(signature).computeFallbackCount += 1
  }

  private recordTimestampQuery (signature: string): void {
    this.getOrCreatePassStats(signature).timestampQueryCount += 1
  }

  private recordGpuTimingSample (signature: string, gpuMs: number): void {
    if (!Number.isFinite(gpuMs) || gpuMs < 0) return
    const stats = this.getOrCreatePassStats(signature)
    const previousCount = stats.gpuTimingSampleCount
    stats.gpuTimingSampleCount = previousCount + 1
    stats.lastGpuMs = gpuMs
    stats.avgGpuMs = this.averageStat(stats.avgGpuMs ?? 0, previousCount, gpuMs)
    stats.gpuTimingSource = 'timestamp_query'
  }

  private doesPassProduceOutput (pass: HydraCompiledPass): boolean {
    return Boolean(pass.output)
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

  private requestPipelineForSelectedPass (pass: HydraCompiledPass): PipelineEntry | null {
    if (!this.renderer || !this.renderer.ready) return null

    const entry = (pass.variant ?? 'fragment') === 'compute'
      ? this.renderer.getOutputComputePipelineEntry(pass.signature, pass.wgsl) as PipelineEntry | null
      : this.renderer.getOutputPipelineEntry(pass.signature, pass.wgsl) as PipelineEntry | null
    if (!entry) return null
    if (entry.cacheKey && !this.seenPipelineCacheKeys.has(entry.cacheKey)) {
      this.seenPipelineCacheKeys.add(entry.cacheKey)
      this.recordPipelineCacheMiss(pass.signature)
    }
    return entry
  }

  private requestPipelineEntry (pass: HydraCompiledPass): RuntimePipelineEntry | null {
    if (!this.renderer || !this.renderer.ready) return null

    const requestedVariant = pass.variant ?? 'fragment'
    let selectedPass = pass
    let selectedVariant = requestedVariant

    if (requestedVariant === 'compute') {
      this.recordComputeAttempt(pass.signature)
      const supportsCompute = typeof this.renderer.supportsComputePasses === 'function'
        ? this.renderer.supportsComputePasses()
        : typeof this.renderer.getOutputComputePipelineEntry === 'function'
      if (!supportsCompute) {
        const fallbackPass = pass.fallback
        if (!fallbackPass) return null
        selectedPass = fallbackPass
        selectedVariant = 'fragment'
        this.recordComputeFallback(pass.signature)
      }
    }

    const entry = this.requestPipelineForSelectedPass(selectedPass)
    if (!entry) return null

    return {
      entry,
      pass: selectedPass,
      requestedVariant,
      selectedVariant
    }
  }

  private validatePassEntry (
    sourcePass: HydraCompiledPass,
    passIndex: number,
    runtimeEntry: RuntimePipelineEntry | null
  ): RuntimePipelineEntry | null {
    if (!runtimeEntry) return null
    const { entry, pass } = runtimeEntry
    if (!entry.error && entry.pipeline) return runtimeEntry
    if (!entry.error && !entry.pipeline) {
      this.recordPipelineNotReady(sourcePass.signature)
      return null
    }

    this.recordPipelineError(sourcePass.signature)
    if ((sourcePass.variant ?? 'fragment') === 'compute' && sourcePass.fallback && this.renderer) {
      const fallbackEntry = this.requestPipelineForSelectedPass(sourcePass.fallback)
      if (fallbackEntry && !fallbackEntry.error && fallbackEntry.pipeline) {
        this.recordComputeFallback(sourcePass.signature)
        return {
          entry: fallbackEntry,
          pass: sourcePass.fallback,
          requestedVariant: 'compute',
          selectedVariant: 'fragment'
        }
      }
      if (fallbackEntry && !fallbackEntry.error && !fallbackEntry.pipeline) {
        this.recordPipelineNotReady(sourcePass.signature)
        return null
      }
    }

    this.reportPipelineErrorOnce(entry.cacheKey || sourcePass.signature, {
      outputLabel: this.label,
      passIndex,
      signature: sourcePass.signature,
      error: entry.error
    })
    return null
  }

  private resolvePassEntry (
    pass: HydraCompiledPass,
    passIndex: number,
    existingEntry: RuntimePipelineEntry | null = null
  ): RuntimePipelineEntry | null {
    const entry = existingEntry ?? this.requestPipelineEntry(pass)
    return this.validatePassEntry(pass, passIndex, entry)
  }

  private resolveActivePipelineEntries (): ResolvedCompiledPass[] | null {
    if (this.activeSourcePasses.length === 0) return null

    const resolved: ResolvedCompiledPass[] = []
    for (let index = 0; index < this.activeSourcePasses.length; index += 1) {
      const runtimeEntry = this.activePipelineEntries[index] ?? null
      if (!runtimeEntry?.entry.pipeline) return null
      resolved.push({
        pass: runtimeEntry.pass,
        pipeline: runtimeEntry.entry.pipeline,
        requestedVariant: runtimeEntry.requestedVariant,
        selectedVariant: runtimeEntry.selectedVariant
      })
    }
    return resolved.length > 0 ? resolved : null
  }

  private resolvePasses (): ResolvedCompiledPass[] | null {
    if (!this.renderer || !this.renderer.ready) return null

    if (this.pendingPasses) {
      const previousSourcePasses = this.activeSourcePasses.slice()
      const previousHistory = this.passOutputHistory.slice()
      const previousDynamicUniformBuffers = this.passDynamicUniformBuffers.slice()
      const nextPasses: HydraCompiledPass[] = []
      const nextSourcePasses: HydraCompiledPass[] = []
      const nextEntries: RuntimePipelineEntry[] = []

      for (let index = 0; index < this.pendingPasses.length; index += 1) {
        const sourcePass = this.pendingPasses[index]
        const pendingEntry = this.pendingPipelineEntries?.[index] ?? null
        const entry = this.resolvePassEntry(sourcePass, index, pendingEntry)
        if (!entry) return this.resolveActivePipelineEntries()
        nextSourcePasses.push(sourcePass)
        nextPasses.push(entry.pass)
        nextEntries.push(entry)
      }

      this.activeSourcePasses = nextSourcePasses
      this.activePasses = nextPasses
      this.activePipelineEntries = nextEntries
      this.passOutputHistory = this.restorePassOutputHistory(previousSourcePasses, previousHistory, nextSourcePasses)
      this.passDynamicUniformBuffers = this.restorePassDynamicUniformBuffers(
        previousSourcePasses,
        previousDynamicUniformBuffers,
        nextSourcePasses
      )
      this.passDynamicUniformStates = new Array(nextSourcePasses.length).fill(null)
      this.activeInternalPassLastUseByIndex = this.getInternalPassLastUseByIndex(nextSourcePasses)
      this.pendingPasses = null
      this.pendingPipelineEntries = null
      this.invalidateBindGroupCache()
    }

    if (this.activeSourcePasses.length === 0) return null

    const resolved: ResolvedCompiledPass[] = []
    for (let index = 0; index < this.activeSourcePasses.length; index += 1) {
      const sourcePass = this.activeSourcePasses[index]
      const entry = this.resolvePassEntry(sourcePass, index, this.activePipelineEntries[index] ?? null)
      if (!entry) return null
      const pass = entry.pass
      this.activePasses[index] = pass
      this.activePipelineEntries[index] = entry
      if (!entry.entry.pipeline) return null
      resolved.push({
        pass,
        pipeline: entry.entry.pipeline,
        requestedVariant: entry.requestedVariant,
        selectedVariant: entry.selectedVariant
      })
    }

    return resolved
  }

  private updateDynamicUniforms (
    uniforms: HydraCompiledPass['uniforms'],
    props: HydraFrameState,
    dynamicUniformBuffer: GPUBuffer | null,
    passIndex: number
  ): DynamicUniformUpdateResult {
    if (!this.renderer || !this.renderer.device || !dynamicUniformBuffer || uniforms.length === 0) {
      return { evalMs: 0, writeMs: 0, wrote: false, skippedWrite: false, floatCount: 0 }
    }

    const writeScalar = (index: number, value: unknown): void => {
      const safe = typeof value === 'number' && Number.isFinite(value) ? value : 0
      this.dynamicUniformData[index] = safe
    }

    const evalStartMs = this.nowMs()
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
    const evalMs = this.nowMs() - evalStartMs
    if (maxIndex < 0) return { evalMs, writeMs: 0, wrote: false, skippedWrite: false, floatCount: 0 }

    const floatCount = maxIndex + 1
    let state = this.passDynamicUniformStates[passIndex] ?? null
    let changed = !state || state.floatCount !== floatCount
    if (!changed && state) {
      for (let index = 0; index < floatCount; index += 1) {
        if (state.values[index] !== this.dynamicUniformData[index]) {
          changed = true
          break
        }
      }
    }

    if (!changed) {
      return { evalMs, writeMs: 0, wrote: false, skippedWrite: true, floatCount }
    }

    const writeStartMs = this.nowMs()
    this.renderer.device.queue.writeBuffer(dynamicUniformBuffer, 0, this.dynamicUniformData, 0, floatCount)
    const writeMs = this.nowMs() - writeStartMs

    if (!state || state.values.length < floatCount) {
      state = {
        values: new Float32Array(floatCount),
        floatCount
      }
      this.passDynamicUniformStates[passIndex] = state
    }
    state.floatCount = floatCount
    state.values.set(this.dynamicUniformData.subarray(0, floatCount))
    return { evalMs, writeMs, wrote: true, skippedWrite: false, floatCount }
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
    if (source && typeof source === 'object' && 'internalPassIndex' in source) {
      const passIndex = (source as { internalPassIndex?: unknown }).internalPassIndex
      if (typeof passIndex === 'number' && Number.isInteger(passIndex) && passIndex >= 0) {
        return this.passOutputHistory[passIndex] ?? readTexture
      }
    }

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

    if (source && typeof source === 'object' && 'id' in source) {
      const targetId = (source as { id?: unknown }).id
      if (
        typeof targetId === 'number' &&
        Number.isInteger(targetId) &&
        targetId >= 0 &&
        targetId === this.id
      ) {
        const historyTexture = this.resolveHistoryTexture(1)
        if (historyTexture) return historyTexture
        return this.frameInputTexture ?? this.lastOutputTexture ?? this.textures[this.pingPongIndex] ?? readTexture
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

  private getOrCreateBindGroup (
    pipeline: GPURenderPipeline | GPUComputePipeline,
    pass: HydraCompiledPass,
    resolvedTextures: Array<GPUTexture | null>,
    writeTexture: GPUTexture | null,
    dynamicUniformBuffer: GPUBuffer | null
  ): BindGroupResolution {
    if (
      !this.renderer ||
      !this.renderer.device ||
      !this.renderer.globalUniformBuffer
    ) {
      throw new Error('Renderer resources are unavailable.')
    }

    const sampledTextures = pass.textures
    const sampler = sampledTextures.length > 0 ? this.renderer.getSampler(this.samplerFilter) : null
    const pipelineId = this.renderer.getObjectId(pipeline)
    const globalBufferId = this.renderer.getObjectId(this.renderer.globalUniformBuffer)
    const dynamicBufferId = pass.uniforms.length > 0 && dynamicUniformBuffer
      ? this.renderer.getObjectId(dynamicUniformBuffer)
      : 0
    const samplerId = sampledTextures.length > 0 && sampler
      ? this.renderer.getObjectId(sampler)
      : 0
    const outputTextureId = (pass.variant ?? 'fragment') === 'compute'
      ? this.renderer.getObjectId(writeTexture)
      : 0
    const textureIds = this.bindGroupTextureIdsScratch
    textureIds.length = sampledTextures.length
    for (let index = 0; index < sampledTextures.length; index += 1) {
      textureIds[index] = this.renderer.getObjectId(resolvedTextures[index])
    }

    for (const cached of this.bindGroupCache) {
      if (
        cached.pipelineId !== pipelineId ||
        cached.globalBufferId !== globalBufferId ||
        cached.dynamicBufferId !== dynamicBufferId ||
        cached.samplerId !== samplerId ||
        cached.outputTextureId !== outputTextureId ||
        cached.textureIds.length !== textureIds.length
      ) {
        continue
      }

      let textureMatch = true
      for (let index = 0; index < textureIds.length; index += 1) {
        if (cached.textureIds[index] !== textureIds[index]) {
          textureMatch = false
          break
        }
      }
      if (!textureMatch) continue

      cached.lastUsedFrame = this.frameOrdinal
      return {
        bindGroup: cached.bindGroup,
        cacheHit: true,
        created: false
      }
    }

    const entries: GPUBindGroupEntry[] = [
      { binding: 0, resource: { buffer: this.renderer.globalUniformBuffer } }
    ]

    if (pass.uniforms.length > 0) {
      if (!dynamicUniformBuffer) {
        throw new Error('Dynamic uniform buffer is unavailable for pass uniforms.')
      }
      entries.push({ binding: 1, resource: { buffer: dynamicUniformBuffer } })
    }

    if (sampledTextures.length > 0) {
      if (!sampler) {
        throw new Error('Sampler resource is unavailable for textured pass.')
      }
      entries.push({ binding: 2, resource: sampler })
    }

    for (let index = 0; index < sampledTextures.length; index += 1) {
      const textureBinding = sampledTextures[index]
      const texture = resolvedTextures[index] ?? this.renderer.getFallbackTexture()
      entries.push({
        binding: textureBinding.binding,
        resource: this.renderer.getTextureView(texture)
      })
    }

    if ((pass.variant ?? 'fragment') === 'compute') {
      if (!pass.output || !writeTexture) {
        throw new Error('Compute pass output texture is unavailable.')
      }
      entries.push({
        binding: pass.output.binding,
        resource: this.renderer.getTextureView(writeTexture)
      })
    }

    const created = this.renderer.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries
    })
    this.bindGroupCache.push({
      pipelineId,
      globalBufferId,
      dynamicBufferId,
      samplerId,
      outputTextureId,
      textureIds: textureIds.slice(),
      bindGroup: created,
      lastUsedFrame: this.frameOrdinal
    })
    while (this.bindGroupCache.length > MAX_BIND_GROUP_CACHE_ENTRIES) {
      let oldestIndex = 0
      for (let index = 1; index < this.bindGroupCache.length; index += 1) {
        if (this.bindGroupCache[index].lastUsedFrame < this.bindGroupCache[oldestIndex].lastUsedFrame) {
          oldestIndex = index
        }
      }
      this.bindGroupCache.splice(oldestIndex, 1)
    }
    return {
      bindGroup: created,
      cacheHit: false,
      created: true
    }
  }

  tick (props: HydraFrameState, encoder: GPUCommandEncoder | null): void {
    this.ensureResources()
    if (!this.renderer || !this.renderer.ready || !encoder) return

    const resolvedPasses = this.resolvePasses()
    if (!resolvedPasses) return

    this.frameInputTexture = this.lastOutputTexture ?? this.textures[this.pingPongIndex] ?? this.renderer.getFallbackTexture()
    this.frameCounter += 1
    this.frameOrdinal += 1
    let currentTexture = this.frameInputTexture
    let currentTextureWidth = this.width
    let currentTextureHeight = this.height
    const internalPassLastUseByIndex = this.activeInternalPassLastUseByIndex

    for (let passIndex = 0; passIndex < resolvedPasses.length; passIndex += 1) {
      const resolved = resolvedPasses[passIndex]
      const { pass, pipeline } = resolved
      const variant = resolved.selectedVariant
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
      const requiresWriteTexture = producesOutput

      let writeTexture: GPUTexture | null = null
      let writeIndex = 0
      let scaledPair: SizedTexturePair | null = null
      let usingTransientWriteTexture = false

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

      const globalUniformWrote = this.renderer.updateGlobalUniforms({
        time: props.time,
        bpm: props.bpm,
        width: passWidth,
        height: passHeight
      })

      const dynamicUniformBuffer = this.passDynamicUniformBuffers[passIndex] ?? null
      const dynamicUniformUpdate = this.updateDynamicUniforms(pass.uniforms, props, dynamicUniformBuffer, passIndex)

      const textureResolutionStartMs = this.nowMs()
      for (let index = 0; index < pass.textures.length; index += 1) {
        const textureBinding = pass.textures[index]
        this.resolvedTexturesScratch[index] = this.resolveTextureBinding(textureBinding, readTexture) ?? this.renderer.getFallbackTexture()
      }
      this.resolvedTexturesScratch.length = pass.textures.length
      const protectedPassOutputTextures = this.getProtectedPassOutputTextures(passIndex, internalPassLastUseByIndex)
      const writeAvoidTextures = this.resolvedTexturesScratch.concat(protectedPassOutputTextures)

      if (
        producesOutput &&
        writeTexture &&
        this.isTextureBeingSampled(writeTexture, writeAvoidTextures)
      ) {
        const transientWriteTexture = this.getOrCreateTransientWriteTexture(passWidth, passHeight, writeAvoidTextures)
        if (transientWriteTexture) {
          writeTexture = transientWriteTexture
          usingTransientWriteTexture = true
        }
      }
      const textureResolutionMs = this.nowMs() - textureResolutionStartMs

      const bindGroupStartMs = this.nowMs()
      const bindGroupResolution = this.getOrCreateBindGroup(
        pipeline,
        pass,
        this.resolvedTexturesScratch,
        writeTexture,
        dynamicUniformBuffer
      )
      const bindGroupMs = this.nowMs() - bindGroupStartMs
      const encodeStartMs = this.nowMs()
      // The active pass writes into a ping-pong/scaled target, then that texture
      // becomes prevBuffer for the next pass regardless of fragment/compute mode.
      let renderPassEncodeMs = 0
      let computePassEncodeMs = 0
      if (producesOutput && writeTexture) {
        const timingAllocation = typeof this.renderer.allocatePassTiming === 'function'
          ? this.renderer.allocatePassTiming((gpuMs) => {
              this.recordGpuTimingSample(pass.signature, gpuMs)
            })
          : null
        if (timingAllocation) this.recordTimestampQuery(pass.signature)
        if (variant === 'compute') {
          const workgroup = pass.compute?.workgroupSize ?? [8, 8]
          const dispatchWidth = Math.ceil(passWidth / Math.max(1, workgroup[0]))
          const dispatchHeight = Math.ceil(passHeight / Math.max(1, workgroup[1]))
          const computePass = encoder.beginComputePass({
            ...(timingAllocation ? { timestampWrites: timingAllocation.timestampWrites } : {})
          })
          computePass.setPipeline(pipeline as GPUComputePipeline)
          computePass.setBindGroup(0, bindGroupResolution.bindGroup)
          computePass.dispatchWorkgroups(dispatchWidth, dispatchHeight, 1)
          computePass.end()
        } else {
          const renderPass = encoder.beginRenderPass({
            colorAttachments: [{
              view: this.renderer.getTextureView(writeTexture),
              clearValue: { r: 0, g: 0, b: 0, a: 0 },
              loadOp: 'clear',
              storeOp: 'store'
            }],
            ...(timingAllocation ? { timestampWrites: timingAllocation.timestampWrites } : {})
          })
          renderPass.setPipeline(pipeline as GPURenderPipeline)
          renderPass.setBindGroup(0, bindGroupResolution.bindGroup)
          renderPass.draw(3, 1, 0, 0)
          renderPass.end()
        }
      }
      const encodeMs = this.nowMs() - encodeStartMs
      if (variant === 'compute') {
        computePassEncodeMs = encodeMs
      } else {
        renderPassEncodeMs = encodeMs
      }
      this.recordPassStat(
        pass.signature,
        dynamicUniformUpdate.evalMs +
          dynamicUniformUpdate.writeMs +
          textureResolutionMs +
          bindGroupMs +
          renderPassEncodeMs +
          computePassEncodeMs,
        resolved.requestedVariant !== resolved.selectedVariant,
        variant,
        {
          dynamicUniformEvalMs: dynamicUniformUpdate.evalMs,
          dynamicUniformWriteMs: dynamicUniformUpdate.writeMs,
          textureResolutionMs,
          bindGroupMs,
          renderPassEncodeMs,
          computePassEncodeMs,
          globalUniformWrote,
          dynamicUniformWrote: dynamicUniformUpdate.wrote,
          dynamicUniformSkipped: dynamicUniformUpdate.skippedWrite,
          bindGroupCacheHit: bindGroupResolution.cacheHit,
          bindGroupCreated: bindGroupResolution.created
        }
      )

      if (producesOutput && writeTexture) {
        if (fullResolutionTarget && !usingTransientWriteTexture) {
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
    this.frameInputTexture = null
  }

  dispose (): void {
    WebGPUOutputNode.liveNodes.delete(this)
    WebGPUOutputNode.refreshHistoryDepths()

    this.pendingPasses = null
    this.pendingPipelineEntries = null
    this.activePasses = []
    this.activeSourcePasses = []
    this.activePipelineEntries = []
    this.activeInternalPassLastUseByIndex = new Map()
    this.graphSource = null
    this.graphRenderHandler = null
    this.inGraphRenderCycle = false
    this.reportedPipelineErrors.clear()
    this.pipelineErrorHandler = null
    this.passStats.clear()
    this.seenPipelineCacheKeys.clear()
    this.passDynamicUniformStates = []

    this.invalidateBindGroupCache()
    this.frameEvents.clear()

    this.textures.forEach((texture) => {
      if (texture) texture.destroy()
    })
    this.textures = [null, null]
    this.frameInputTexture = null
    this.lastOutputTexture = null
    this.passOutputHistory = []
    this.resetHistoryTextures()
    this.destroyScaledTexturePairs()
    this.destroyTransientWriteTexturePools()
    this.resolvedTexturesScratch.length = 0

    this.destroyPassDynamicUniformBuffers()
    this.renderer = null
  }
}
