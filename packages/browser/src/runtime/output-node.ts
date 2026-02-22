import type {
  HydraCompiledPass,
  HydraFrameState,
  HydraOutputGraphSource,
  HydraOutputAdapter
} from 'hydra-synth-core'
import { MAX_DYNAMIC_UNIFORMS } from '../webgpu/constants.js'
import type { WebGPURenderer } from '../webgpu/renderer.js'

interface PipelineEntry {
  cacheKey: string
  signature: string
  code: string
  pipeline: GPURenderPipeline | null
  error: unknown | null
}

interface PipelineErrorContext {
  outputLabel: string
  passIndex: number
  signature: string
  error: unknown
}

interface ResolvedCompiledPass {
  pass: HydraCompiledPass
  pipeline: GPURenderPipeline
}

interface SizedTexturePair {
  textures: [GPUTexture | null, GPUTexture | null]
  currentIndex: number
  lastUsedFrame: number
}

interface PassExecutionStats {
  runCount: number
  lastCpuEncodeMs: number
  avgCpuEncodeMs: number
  lastGpuMs: number | null
  avgGpuMs: number | null
  gpuTimingSource: 'timestamp_query' | 'cpu_encode_fallback' | 'history_fallback' | 'unavailable'
  fallbackCount: number
  variant: 'fragment'
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
  private readonly scaledTexturePairs = new Map<string, SizedTexturePair>()
  private graphSource: HydraOutputGraphSource | null = null
  private graphRenderHandler: ((output: WebGPUOutputNode, source: HydraOutputGraphSource) => void) | null = null
  private inGraphRenderCycle = false
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
    lastGpuMs: number | null
    avgGpuMs: number | null
    gpuTimingSource: 'timestamp_query' | 'cpu_encode_fallback' | 'history_fallback' | 'unavailable'
    fallbackCount: number
    variant: 'fragment'
  }> {
    const snapshot: Record<string, {
      runCount: number
      lastCpuEncodeMs: number
      avgCpuEncodeMs: number
      lastGpuMs: number | null
      avgGpuMs: number | null
      gpuTimingSource: 'timestamp_query' | 'cpu_encode_fallback' | 'history_fallback' | 'unavailable'
      fallbackCount: number
      variant: 'fragment'
    }> = {}
    this.passStats.forEach((value, signature) => {
      snapshot[signature] = {
        runCount: value.runCount,
        lastCpuEncodeMs: value.lastCpuEncodeMs,
        avgCpuEncodeMs: value.avgCpuEncodeMs,
        lastGpuMs: value.lastGpuMs,
        avgGpuMs: value.avgGpuMs,
        gpuTimingSource: value.gpuTimingSource,
        fallbackCount: value.fallbackCount,
        variant: value.variant
      }
    })
    return snapshot
  }

  render (passes: HydraCompiledPass[]): void {
    if (!this.inGraphRenderCycle) this.clearGraphSource()
    this.pendingPasses = passes.slice()
    this.reportedPipelineErrors.clear()
    this.updateRequiredHistoryDepth(this.pendingPasses)

    if (this.renderer && this.renderer.ready) {
      for (const pass of this.pendingPasses) {
        this.renderer.getOutputPipelineEntry(pass.signature, pass.wgsl)
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

  private recordPassStat (
    signature: string,
    cpuEncodeMs: number,
    fallbackUsed: boolean,
    variant: 'fragment'
  ): void {
    const safeMs = Number.isFinite(cpuEncodeMs) ? Math.max(0, cpuEncodeMs) : 0
    const existing = this.passStats.get(signature)
    const gpuEstimate = this.estimateGpuMs(safeMs, existing)
    const gpuMs = gpuEstimate.value
    const gpuTimingSource = gpuEstimate.source
    if (!existing) {
      this.passStats.set(signature, {
        runCount: 1,
        lastCpuEncodeMs: safeMs,
        avgCpuEncodeMs: safeMs,
        lastGpuMs: gpuMs,
        avgGpuMs: gpuMs,
        gpuTimingSource,
        fallbackCount: fallbackUsed ? 1 : 0,
        variant
      })
      return
    }

    const nextCount = existing.runCount + 1
    const avg = ((existing.avgCpuEncodeMs * existing.runCount) + safeMs) / nextCount
    const avgGpu = gpuMs == null || existing.avgGpuMs == null
      ? (gpuMs ?? existing.avgGpuMs)
      : ((existing.avgGpuMs * existing.runCount) + gpuMs) / nextCount
    existing.runCount = nextCount
    existing.lastCpuEncodeMs = safeMs
    existing.avgCpuEncodeMs = avg
    existing.lastGpuMs = gpuMs
    existing.avgGpuMs = avgGpu ?? null
    existing.gpuTimingSource = gpuTimingSource
    if (fallbackUsed) existing.fallbackCount += 1
    existing.variant = variant
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

  private resolvePassEntry (
    pass: HydraCompiledPass,
    passIndex: number
  ): PipelineEntry | null {
    if (!this.renderer || !this.renderer.ready) return null

    const entry = this.renderer.getOutputPipelineEntry(pass.signature, pass.wgsl) as PipelineEntry | null
    if (!entry) return null
    if (!entry.error && entry.pipeline) return entry
    if (!entry.error && !entry.pipeline) return null

    this.reportPipelineErrorOnce(entry.cacheKey || pass.signature, {
      outputLabel: this.label,
      passIndex,
      signature: pass.signature,
      error: entry.error
    })
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
        const entry = this.resolvePassEntry(sourcePass, index)
        if (!entry) return null
        nextSourcePasses.push(sourcePass)
        nextPasses.push(sourcePass)
        nextEntries.push(entry)
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
      const entry = this.resolvePassEntry(sourcePass, index)
      if (!entry) return null
      const pass = sourcePass
      this.activePasses[index] = pass
      this.activePipelineEntries[index] = entry
      if (!entry.pipeline) return null
      resolved.push({ pass, pipeline: entry.pipeline })
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

  private getOrCreateBindGroup (
    pipeline: GPURenderPipeline,
    pass: HydraCompiledPass,
    resolvedTextures: Array<GPUTexture | null>,
    _writeTexture: GPUTexture | null
  ): GPUBindGroup {
    if (
      !this.renderer ||
      !this.renderer.device ||
      !this.renderer.globalUniformBuffer
    ) {
      throw new Error('Renderer resources are unavailable.')
    }

    const sampledTextures = pass.textures
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

    this.frameCounter += 1
    this.frameOrdinal += 1
    let currentTexture = this.lastOutputTexture ?? this.textures[this.pingPongIndex] ?? this.renderer.getFallbackTexture()
    let currentTextureWidth = this.width
    let currentTextureHeight = this.height

    for (let passIndex = 0; passIndex < resolvedPasses.length; passIndex += 1) {
      const resolved = resolvedPasses[passIndex]
      const { pass, pipeline } = resolved
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

      const bindGroup = this.getOrCreateBindGroup(
        pipeline,
        pass,
        this.resolvedTexturesScratch,
        writeTexture
      )
      const encodeStartMs = this.nowMs()
      // Each pass is rendered as a fullscreen triangle into a ping-pong target.
      // The currently selected texture is then fed to the next pass as prevBuffer.
      if (producesOutput && writeTexture) {
        const renderPass = encoder.beginRenderPass({
          colorAttachments: [{
            view: this.renderer.getTextureView(writeTexture),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: 'clear',
            storeOp: 'store'
          }]
        })
        renderPass.setPipeline(pipeline)
        renderPass.setBindGroup(0, bindGroup)
        renderPass.draw(3, 1, 0, 0)
        renderPass.end()
      }
      this.recordPassStat(
        pass.signature,
        this.nowMs() - encodeStartMs,
        false,
        'fragment'
      )

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
    WebGPUOutputNode.refreshHistoryDepths()

    this.pendingPasses = null
    this.activePasses = []
    this.activeSourcePasses = []
    this.activePipelineEntries = []
    this.graphSource = null
    this.graphRenderHandler = null
    this.inGraphRenderCycle = false
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
    this.resetHistoryTextures()
    this.destroyScaledTexturePairs()
    this.resolvedTexturesScratch.length = 0

    if (this.dynamicUniformBuffer) this.dynamicUniformBuffer.destroy()
    this.dynamicUniformBuffer = null
    this.renderer = null
  }
}
