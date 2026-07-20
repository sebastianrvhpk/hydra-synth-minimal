import type {
  HydraCompiledPass,
  HydraComputePass,
  HydraFrameState,
  HydraFragmentPass,
  HydraOutputAdapter
} from '../core/types.js'
import type { TgpuBindGroup } from 'typegpu'
import { MAX_DYNAMIC_UNIFORMS } from '../webgpu/constants.js'
import type { WebGPURenderer } from '../webgpu/renderer.js'
import type { ComputePipelineCacheEntry, PipelineCacheEntry } from '../webgpu/pipeline-cache.js'

type PipelineEntry = PipelineCacheEntry | ComputePipelineCacheEntry

type RuntimePipelineEntry =
  | { entry: PipelineCacheEntry, pass: HydraFragmentPass }
  | { entry: ComputePipelineCacheEntry, pass: HydraComputePass }

interface BindGroupCacheEntry {
  pipelineId: number
  globalBufferId: number
  dynamicBufferId: number
  samplerId: number
  outputTextureId: number
  textureIds: number[]
  bindGroup: TgpuBindGroup
  lastUsedFrame: number
}

type ResolvedCompiledPass = RuntimePipelineEntry

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

interface DynamicUniformWriteState {
  values: Float32Array
  floatCount: number
}

interface HistoryRequirements {
  ownDepth: number
  outboundRequests: Map<WebGPUOutputNode, number>
}

const MAX_SCALED_TEXTURE_PAIRS = 8
const MAX_BIND_GROUP_CACHE_ENTRIES = 64
const DEFAULT_HISTORY_DEPTH = 0

export class WebGPUOutputNode implements HydraOutputAdapter {
  readonly label: string
  id = -1

  private renderer: WebGPURenderer | null
  private width: number
  private height: number
  private pingPongIndex = 0
  private textures: Array<GPUTexture | null> = [null, null]
  private passGlobalUniformBuffers: Array<GPUBuffer | null> = []
  private passDynamicUniformBuffers: Array<GPUBuffer | null> = []
  private readonly ownedPassGlobalUniformBuffers = new WeakSet<GPUBuffer>()
  private readonly dynamicUniformData = new Float32Array(MAX_DYNAMIC_UNIFORMS)

  private activeSourcePasses: HydraCompiledPass[] = []
  private stagedPasses: HydraCompiledPass[] | null = null
  private activePipelineEntries: RuntimePipelineEntry[] = []
  private readonly bindGroupCache: BindGroupCacheEntry[] = []
  private readonly resolvedTexturesScratch: Array<GPUTexture | null> = []
  private readonly bindGroupTextureIdsScratch: number[] = []
  private readonly reportedTextureBindingFailures = new WeakSet<object>()
  private readonly scaledTexturePairs = new Map<string, SizedTexturePair>()
  private readonly transientWriteTexturePools = new Map<string, SizedTexturePool>()
  private historyTextures: Array<GPUTexture | null> = []
  private historyCursor = -1
  private historyCount = 0
  private historyWidth = 0
  private historyHeight = 0
  private historyDepth = DEFAULT_HISTORY_DEPTH
  private ownHistoryDepth = DEFAULT_HISTORY_DEPTH
  private readonly externalHistoryRequests = new Map<WebGPUOutputNode, number>()
  private requestedHistoryTargets = new Set<WebGPUOutputNode>()
  private frameInputTexture: GPUTexture | null = null
  private lastOutputTexture: GPUTexture | null = null
  private passOutputHistory: Array<GPUTexture | null> = []
  private frameOrdinal = 0
  private passDynamicUniformStates: Array<DynamicUniformWriteState | null> = []
  private activeInternalPassLastUseByIndex = new Map<number, number>()

  constructor ({ renderer, label = '', width, height }: { renderer: WebGPURenderer | null, label?: string, width: number, height: number }) {
    this.renderer = renderer
    this.label = label
    this.width = width
    this.height = height
  }

  attachRenderer (renderer: WebGPURenderer): void {
    this.destroyPassGlobalUniformBuffers()
    this.destroyPassDynamicUniformBuffers()
    this.renderer = renderer
    this.stagedPasses = this.activeSourcePasses.slice()
    this.activePipelineEntries = []
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
      this.destroyTexture(texture)
    })
    this.destroyTransientWriteTexturePools()

    this.textures = [0, 1].map((index) => this.renderer?.createOutputTexture({
      width: this.width,
      height: this.height,
      label: `${this.label}-pingpong-${index}`
    }) ?? null)

    this.pingPongIndex = 0
    this.lastOutputTexture = this.textures[this.pingPongIndex] ?? null
    this.passOutputHistory = []
    this.resetHistoryTextures()
    this.invalidateBindGroupCache()
  }

  private destroyTexture (texture: GPUTexture | null | undefined): void {
    if (texture && this.renderer) this.renderer.destroyTexture(texture)
  }

  private destroyBuffer (buffer: GPUBuffer | null | undefined): void {
    if (buffer && this.renderer) this.renderer.destroyBuffer(buffer)
  }

  private destroyPassGlobalUniformBuffers (): void {
    for (const buffer of this.passGlobalUniformBuffers) {
      if (buffer && this.ownedPassGlobalUniformBuffers.has(buffer)) this.destroyBuffer(buffer)
    }
    this.passGlobalUniformBuffers = []
  }

  private createPassGlobalUniformBuffers (passCount: number): Array<GPUBuffer | null> {
    const buffers: Array<GPUBuffer | null> = new Array(passCount).fill(null)
    if (!this.renderer || !this.renderer.ready) return buffers
    try {
      for (let index = 0; index < passCount; index += 1) {
        const buffer = this.renderer.createGlobalUniformBuffer(`${this.label}-globals-pass-${index}`)
        this.ownedPassGlobalUniformBuffers.add(buffer)
        buffers[index] = buffer
      }
      return buffers
    } catch (error) {
      buffers.forEach((buffer) => {
        if (buffer && this.ownedPassGlobalUniformBuffers.has(buffer)) this.destroyBuffer(buffer)
      })
      throw error
    }
  }

  private destroyPassDynamicUniformBuffers (): void {
    this.passDynamicUniformBuffers.forEach((buffer) => {
      this.destroyBuffer(buffer)
    })
    this.passDynamicUniformBuffers = []
    this.passDynamicUniformStates = []
  }

  private createPassDynamicUniformBuffers (passes: HydraCompiledPass[]): Array<GPUBuffer | null> {
    const buffers: Array<GPUBuffer | null> = new Array(passes.length).fill(null)
    if (!this.renderer || !this.renderer.ready) return buffers
    try {
      for (let index = 0; index < passes.length; index += 1) {
        const pass = passes[index]
        if (!pass || pass.uniforms.length === 0) continue
        buffers[index] = this.renderer.createDynamicUniformBuffer(`${this.label}-dynamic-uniforms-pass-${index}`)
      }
      return buffers
    } catch (error) {
      buffers.forEach((buffer) => this.destroyBuffer(buffer))
      throw error
    }
  }

  private getScaleKey (width: number, height: number): string {
    return `${width}x${height}`
  }

  private destroyScaledTexturePairs (): void {
    this.scaledTexturePairs.forEach((pair) => {
      pair.textures.forEach((texture) => {
        this.destroyTexture(texture)
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
        this.destroyTexture(texture)
      })
    }
  }

  private destroyTransientWriteTexturePools (): void {
    this.transientWriteTexturePools.forEach((pool) => {
      pool.textures.forEach((texture) => this.destroyTexture(texture))
    })
    this.transientWriteTexturePools.clear()
  }

  private resetHistoryTextures (): void {
    this.historyTextures.forEach((texture) => {
      this.destroyTexture(texture)
    })
    this.historyTextures = []
    this.historyCursor = -1
    this.historyCount = 0
    this.historyWidth = 0
    this.historyHeight = 0
  }

  private ensureHistoryTextures (width = this.width, height = this.height): void {
    if (!this.renderer || !this.renderer.ready) return
    const depth = Math.max(DEFAULT_HISTORY_DEPTH, this.historyDepth)
    if (depth <= 0) {
      this.resetHistoryTextures()
      return
    }
    const normalizedWidth = Math.max(1, Math.floor(width))
    const normalizedHeight = Math.max(1, Math.floor(height))
    if (
      this.historyTextures.length === depth &&
      this.historyTextures.every(Boolean) &&
      this.historyWidth === normalizedWidth &&
      this.historyHeight === normalizedHeight
    ) return

    this.resetHistoryTextures()
    this.historyWidth = normalizedWidth
    this.historyHeight = normalizedHeight
    this.historyTextures = new Array(depth)
      .fill(null)
      .map((_, index) => this.renderer?.createOutputTexture({
        width: normalizedWidth,
        height: normalizedHeight,
        label: `${this.label}-history-${index}`,
        includeRenderAttachment: false
      }) ?? null)
  }

  private collectHistoryRequirements (passes: HydraCompiledPass[]): HistoryRequirements {
    let requiredDepth = DEFAULT_HISTORY_DEPTH
    const outboundRequests = new Map<WebGPUOutputNode, number>()
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
        const target = this.resolveHistoryTargetOutput(source)
        if (target && target !== this) {
          const existing = outboundRequests.get(target) ?? DEFAULT_HISTORY_DEPTH
          outboundRequests.set(target, Math.max(existing, normalizedOffset))
          return
        }

        requiredDepth = Math.max(requiredDepth, normalizedOffset)
      })
    }

    return { ownDepth: requiredDepth, outboundRequests }
  }

  private applyHistoryRequirements ({ ownDepth, outboundRequests }: HistoryRequirements): void {
    this.ownHistoryDepth = ownDepth
    for (const target of this.requestedHistoryTargets) {
      if (!outboundRequests.has(target)) target.setExternalHistoryRequest(this, DEFAULT_HISTORY_DEPTH)
    }
    for (const [target, depth] of outboundRequests) target.setExternalHistoryRequest(this, depth)
    this.requestedHistoryTargets = new Set(outboundRequests.keys())
    this.refreshHistoryDepth()
  }

  private setExternalHistoryRequest (requester: WebGPUOutputNode, depth: number): void {
    if (depth > DEFAULT_HISTORY_DEPTH) this.externalHistoryRequests.set(requester, depth)
    else this.externalHistoryRequests.delete(requester)
    this.refreshHistoryDepth()
  }

  private refreshHistoryDepth (): void {
    let externalDepth = DEFAULT_HISTORY_DEPTH
    for (const depth of this.externalHistoryRequests.values()) externalDepth = Math.max(externalDepth, depth)
    const nextDepth = Math.max(this.ownHistoryDepth, externalDepth)
    if (nextDepth === this.historyDepth) return
    this.historyDepth = nextDepth
    this.resetHistoryTextures()
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
    if (sourceRef instanceof WebGPUOutputNode) return sourceRef
    const directTarget = (sourceRef as { target?: unknown }).target
    if (directTarget instanceof WebGPUOutputNode) return directTarget
    const candidateId = (sourceRef as { id?: unknown }).id
    if (typeof candidateId !== 'number' || !Number.isInteger(candidateId) || candidateId < 0) return this
    if (candidateId === this.id) return this
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
    this.ensureHistoryTextures(sourceWidth, sourceHeight)
    if (this.historyTextures.length === 0) return

    const depth = this.historyTextures.length
    const nextCursor = (this.historyCursor + 1) % depth
    const destination = this.historyTextures[nextCursor]
    if (!destination) return
    const copyWidth = Math.max(1, Math.min(this.width, Math.floor(sourceWidth)))
    const copyHeight = Math.max(1, Math.min(this.height, Math.floor(sourceHeight)))

    this.renderer.copyTextureToTexture(
      encoder,
      texture,
      destination,
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
        this.destroyTexture(texture)
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
        if (!candidate) continue
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
      cached.cursor = 0
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
    const scale = this.normalizeResolutionScale(pass.resolutionScale)
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
    return this.lastOutputTexture ?? this.textures[this.pingPongIndex] ?? null
  }

  getTexture (): GPUTexture | null {
    // Expose the latest completed frame for external texture bindings (e.g. src(o0)).
    return this.lastOutputTexture ?? this.textures[this.pingPongIndex] ?? null
  }

  render (passes: HydraCompiledPass[]): void {
    this.stagedPasses = passes.slice()
    if (this.renderer?.ready) {
      try {
        this.activateStagedPasses()
      } catch (error) {
        this.stagedPasses = null
        throw error
      }
    }
  }

  getDependencyOutputIds (): number[] {
    const dependencies = new Set<number>()
    const trackedPasses = this.stagedPasses ?? this.activeSourcePasses

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

  private invalidateBindGroupCache (): void {
    this.bindGroupCache.length = 0
  }

  private requestPipelineForPass (pass: HydraFragmentPass): PipelineCacheEntry
  private requestPipelineForPass (pass: HydraComputePass): ComputePipelineCacheEntry
  private requestPipelineForPass (pass: HydraCompiledPass): PipelineEntry
  private requestPipelineForPass (pass: HydraCompiledPass): PipelineEntry {
    if (!this.renderer || !this.renderer.ready) {
      throw new Error("TypeGPU renderer is unavailable.")
    }
    return this.renderer.getPipeline(pass)
  }

  private compilePassEntry (sourcePass: HydraCompiledPass): RuntimePipelineEntry {
    try {
      if (sourcePass.variant === 'compute') {
        return { entry: this.requestPipelineForPass(sourcePass), pass: sourcePass }
      }
      return { entry: this.requestPipelineForPass(sourcePass), pass: sourcePass }
    } catch (cause) {
      throw new Error(`Unable to create TypeGPU ${sourcePass.variant} pipeline for ${sourcePass.signature}.`, { cause })
    }
  }

  private activateStagedPasses (): boolean {
    if (!this.renderer?.ready || !this.stagedPasses) return false

    const nextSourcePasses = this.stagedPasses
    const nextEntries: RuntimePipelineEntry[] = []
    for (let index = 0; index < nextSourcePasses.length; index += 1) {
      const sourcePass = nextSourcePasses[index]
      if (!sourcePass) continue
      nextEntries.push(this.compilePassEntry(sourcePass))
    }

    if (nextEntries.length !== nextSourcePasses.length) {
      throw new Error('Hydra internal invariant failed: compiled pass set is sparse.')
    }

    const requirements = this.collectHistoryRequirements(nextSourcePasses)
    const nextGlobalUniformBuffers = this.createPassGlobalUniformBuffers(nextSourcePasses.length)
    let nextDynamicUniformBuffers: Array<GPUBuffer | null>
    try {
      nextDynamicUniformBuffers = this.createPassDynamicUniformBuffers(nextSourcePasses)
    } catch (error) {
      nextGlobalUniformBuffers.forEach((buffer) => {
        if (buffer && this.ownedPassGlobalUniformBuffers.has(buffer)) this.destroyBuffer(buffer)
      })
      throw error
    }

    const previousGlobalUniformBuffers = this.passGlobalUniformBuffers
    const previousDynamicUniformBuffers = this.passDynamicUniformBuffers
    this.stagedPasses = null
    this.activeSourcePasses = nextSourcePasses
    this.activePipelineEntries = nextEntries
    this.passOutputHistory = new Array(nextSourcePasses.length).fill(null)
    this.passGlobalUniformBuffers = nextGlobalUniformBuffers
    this.passDynamicUniformBuffers = nextDynamicUniformBuffers
    this.passDynamicUniformStates = new Array(nextSourcePasses.length).fill(null)
    this.activeInternalPassLastUseByIndex = this.getInternalPassLastUseByIndex(nextSourcePasses)
    this.applyHistoryRequirements(requirements)
    this.invalidateBindGroupCache()

    previousGlobalUniformBuffers.forEach((buffer) => {
      if (buffer && this.ownedPassGlobalUniformBuffers.has(buffer)) this.destroyBuffer(buffer)
    })
    previousDynamicUniformBuffers.forEach((buffer) => this.destroyBuffer(buffer))
    return true
  }

  private resolvePasses (): ResolvedCompiledPass[] | null {
    if (!this.renderer?.ready) return null
    if (this.stagedPasses) {
      try {
        this.activateStagedPasses()
      } catch (error) {
        this.stagedPasses = null
        throw error
      }
    }
    if (this.activePipelineEntries.length === 0) return null

    return this.activePipelineEntries.slice()
  }

  private updateDynamicUniforms (
    uniforms: HydraCompiledPass['uniforms'],
    props: HydraFrameState,
    dynamicUniformBuffer: GPUBuffer | null,
    passIndex: number
  ): void {
    if (!this.renderer || !this.renderer.root || !dynamicUniformBuffer || uniforms.length === 0) {
      return
    }

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
          ? Array.from(value as unknown as ArrayLike<number>)
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
      return
    }

    this.renderer.writeDynamicUniformBuffer(dynamicUniformBuffer, this.dynamicUniformData, floatCount)

    if (!state || state.values.length < floatCount) {
      state = {
        values: new Float32Array(floatCount),
        floatCount
      }
      this.passDynamicUniformStates[passIndex] = state
    }
    state.floatCount = floatCount
    state.values.set(this.dynamicUniformData.subarray(0, floatCount))
  }

  private resolveTextureProviderBinding (textureBinding: HydraCompiledPass['textures'][number]): GPUTexture | null {
    if (!textureBinding.getTexture) return null
    try {
      return textureBinding.getTexture() as GPUTexture
    } catch (error) {
      if (!this.reportedTextureBindingFailures.has(textureBinding)) {
        this.reportedTextureBindingFailures.add(textureBinding)
        console.error(`Hydra texture provider failed for ${textureBinding.variableName}; using the fallback texture.`, error)
      }
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

  private getOrCreateBindGroup (
    pipelineEntry: PipelineEntry,
    pass: HydraCompiledPass,
    resolvedTextures: Array<GPUTexture | null>,
    writeTexture: GPUTexture | null,
    globalUniformBuffer: GPUBuffer,
    dynamicUniformBuffer: GPUBuffer | null
  ): TgpuBindGroup {
    if (
      !this.renderer ||
      !this.renderer.root
    ) {
      throw new Error('Renderer resources are unavailable.')
    }

    const sampledTextures = pass.textures
    const sampler = sampledTextures.length > 0 ? this.renderer.getSampler() : null
    const pipeline = pipelineEntry.typegpuPipeline
    const pipelineId = this.renderer.getObjectId(pipeline)
    const globalBufferId = this.renderer.getObjectId(globalUniformBuffer)
    const dynamicBufferId = pass.uniforms.length > 0 && dynamicUniformBuffer
      ? this.renderer.getObjectId(dynamicUniformBuffer)
      : 0
    const samplerId = sampledTextures.length > 0 && sampler
      ? this.renderer.getObjectId(sampler)
      : 0
    const outputTextureId = pass.variant === 'compute'
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
      return cached.bindGroup
    }

    const created = this.renderer.createPassBindGroup(pipelineEntry.layout, pass, {
      globals: globalUniformBuffer,
      dynamicUniforms: dynamicUniformBuffer,
      sampler,
      textures: resolvedTextures.map((texture) => texture ?? this.renderer?.getFallbackTexture()).filter((texture): texture is GPUTexture => Boolean(texture)),
      output: writeTexture
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
    this.pruneBindGroupCache()
    return created
  }

  private pruneBindGroupCache (): void {
    while (this.bindGroupCache.length > MAX_BIND_GROUP_CACHE_ENTRIES) {
      let oldestIndex = 0
      for (let index = 1; index < this.bindGroupCache.length; index += 1) {
        const candidate = this.bindGroupCache[index]
        const oldest = this.bindGroupCache[oldestIndex]
        if (candidate && oldest && candidate.lastUsedFrame < oldest.lastUsedFrame) {
          oldestIndex = index
        }
      }
      this.bindGroupCache.splice(oldestIndex, 1)
    }
  }

  tick (props: HydraFrameState, encoder: GPUCommandEncoder | null): void {
    this.ensureResources()
    if (!this.renderer || !this.renderer.ready || !encoder) return

    const resolvedPasses = this.resolvePasses()
    if (!resolvedPasses) return

    this.frameInputTexture = this.lastOutputTexture ?? this.textures[this.pingPongIndex] ?? this.renderer.getFallbackTexture()
    this.frameOrdinal += 1
    let currentTexture = this.frameInputTexture
    let currentTextureWidth = this.width
    let currentTextureHeight = this.height
    const internalPassLastUseByIndex = this.activeInternalPassLastUseByIndex

    for (let passIndex = 0; passIndex < resolvedPasses.length; passIndex += 1) {
      const resolved = resolvedPasses[passIndex]
      if (!resolved) continue
      const pass = resolved.pass
      const pipelineEntry = resolved.entry

      const [passWidth, passHeight] = this.getPassDimensions(pass)
      const fullResolutionTarget = passWidth === this.width && passHeight === this.height
      const readTexture = currentTexture

      let writeTexture: GPUTexture | null = null
      let writeIndex = 0
      let scaledPair: SizedTexturePair | null = null
      let usingTransientWriteTexture = false

      if (fullResolutionTarget) {
        writeIndex = this.pingPongIndex ? 0 : 1
        writeTexture = this.textures[writeIndex] ?? this.renderer.getFallbackTexture()
      } else {
        scaledPair = this.getOrCreateScaledTexturePair(passWidth, passHeight)
        scaledPair.lastUsedFrame = this.frameOrdinal
        writeIndex = scaledPair.currentIndex ? 0 : 1
        writeTexture = scaledPair.textures[writeIndex] ?? this.renderer.getFallbackTexture()
      }

      const globalUniformBuffer = this.passGlobalUniformBuffers[passIndex] ?? null
      if (!globalUniformBuffer) throw new Error('Global uniform buffer is unavailable for pass execution.')
      this.renderer.writeGlobalUniformBuffer(globalUniformBuffer, {
        time: props.time,
        bpm: props.bpm,
        width: passWidth,
        height: passHeight
      })

      const dynamicUniformBuffer = this.passDynamicUniformBuffers[passIndex] ?? null
      this.updateDynamicUniforms(pass.uniforms, props, dynamicUniformBuffer, passIndex)

      for (let index = 0; index < pass.textures.length; index += 1) {
        const textureBinding = pass.textures[index]
        if (!textureBinding) continue
        this.resolvedTexturesScratch[index] = this.resolveTextureBinding(textureBinding, readTexture) ?? this.renderer.getFallbackTexture()
      }
      this.resolvedTexturesScratch.length = pass.textures.length
      const protectedPassOutputTextures = this.getProtectedPassOutputTextures(passIndex, internalPassLastUseByIndex)
      const writeAvoidTextures = this.resolvedTexturesScratch.concat(protectedPassOutputTextures)

      if (
        writeTexture &&
        this.isTextureBeingSampled(writeTexture, writeAvoidTextures)
      ) {
        const transientWriteTexture = this.getOrCreateTransientWriteTexture(passWidth, passHeight, writeAvoidTextures)
        if (transientWriteTexture) {
          writeTexture = transientWriteTexture
          usingTransientWriteTexture = true
        }
      }

      const bindGroup = this.getOrCreateBindGroup(
        pipelineEntry,
        pass,
        this.resolvedTexturesScratch,
        writeTexture,
        globalUniformBuffer,
        dynamicUniformBuffer
      )
      // The active pass writes into a ping-pong/scaled target, then that texture
      // becomes prevBuffer for the next pass regardless of fragment/compute mode.
      if (pass.variant === 'compute') {
          const typegpuPipeline = (pipelineEntry as ComputePipelineCacheEntry).typegpuPipeline
          const workgroup = pass.compute.workgroupSize
          const dispatchWidth = Math.ceil(passWidth / Math.max(1, workgroup[0]))
          const dispatchHeight = Math.ceil(passHeight / Math.max(1, workgroup[1]))
          typegpuPipeline.with(bindGroup).with(encoder).dispatchWorkgroups(dispatchWidth, dispatchHeight, 1)
      } else {
          const typegpuPipeline = (pipelineEntry as PipelineCacheEntry).typegpuPipeline
          typegpuPipeline
            .with(bindGroup)
            .withColorAttachment({
              view: this.renderer.getTextureResource(writeTexture) as never,
              clearValue: { r: 0, g: 0, b: 0, a: 0 },
              loadOp: 'clear',
              storeOp: 'store'
            })
            .with(encoder)
            .draw(3, 1, 0, 0)
      }

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
    }

    this.recordHistoryTexture(currentTexture, currentTextureWidth, currentTextureHeight, encoder)
    this.pruneScaledTexturePairs()

    this.renderer.updateGlobalUniforms({
      time: props.time,
      bpm: props.bpm,
      width: this.width,
      height: this.height
    })
    this.frameInputTexture = null
  }

  dispose (): void {
    for (const target of this.requestedHistoryTargets) {
      target.setExternalHistoryRequest(this, DEFAULT_HISTORY_DEPTH)
    }
    this.requestedHistoryTargets.clear()
    this.externalHistoryRequests.clear()

    this.stagedPasses = null
    this.activeSourcePasses = []
    this.activePipelineEntries = []
    this.activeInternalPassLastUseByIndex = new Map()
    this.passDynamicUniformStates = []

    this.invalidateBindGroupCache()

    this.textures.forEach((texture) => {
      this.destroyTexture(texture)
    })
    this.textures = [null, null]
    this.frameInputTexture = null
    this.lastOutputTexture = null
    this.passOutputHistory = []
    this.resetHistoryTextures()
    this.destroyScaledTexturePairs()
    this.destroyTransientWriteTexturePools()
    this.resolvedTexturesScratch.length = 0

    this.destroyPassGlobalUniformBuffers()
    this.destroyPassDynamicUniformBuffers()
    this.renderer = null
  }
}
