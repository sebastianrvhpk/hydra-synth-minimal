import type {
  HydraCompiledPass,
  HydraFrameState,
  HydraOutputAdapter,
  HydraStorageBufferBinding,
  HydraStorageTextureBinding
} from 'hydra-synth-core'
import { MAX_DYNAMIC_UNIFORMS } from '../webgpu/constants.js'
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
  pass: HydraCompiledPass
  pipeline: GPUComputePipeline
}

interface SizedTexturePair {
  textures: [GPUTexture | null, GPUTexture | null]
  currentIndex: number
}

const DEFAULT_WORKGROUP_SIZE: [number, number, number] = [16, 16, 1]
const WORKGROUP_SIZE_PATTERN = /@workgroup_size\(\s*(\d+)\s*(?:,\s*(\d+)\s*)?(?:,\s*(\d+)\s*)?\)/

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

export class WebGPUOutputNode implements HydraOutputAdapter {
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
  private pendingPasses: HydraCompiledPass[] | null = null
  private activePipelineEntries: PipelineEntry[] = []
  private readonly reportedPipelineErrors = new Set<string>()
  private pipelineErrorHandler: ((context: PipelineErrorContext) => void) | null = null

  private bindGroupCacheKey = ''
  private bindGroupCache: GPUBindGroup | null = null
  private readonly resolvedTexturesScratch: Array<GPUTexture | null> = []
  private readonly resolvedStorageTexturesScratch: Array<GPUTexture | null> = []
  private readonly resolvedStorageBuffersScratch: Array<GPUBuffer | null> = []
  private readonly scaledTexturePairs = new Map<string, SizedTexturePair>()
  private readonly persistentTextures = new Map<string, GPUTexture>()
  private readonly persistentBuffers = new Map<string, GPUBuffer>()
  private lastOutputTexture: GPUTexture | null = null
  private passOutputHistory: Array<GPUTexture | null> = []
  private frameCounter = 0
  private readonly frameEvents = new Set<string>()

  constructor ({ renderer, label = '', width, height }: { renderer: WebGPURenderer | null, label?: string, width: number, height: number }) {
    this.renderer = renderer
    this.label = label
    this.width = width
    this.height = height
  }

  setPipelineErrorHandler (handler: ((context: PipelineErrorContext) => void) | null): void {
    this.pipelineErrorHandler = handler
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

  private getOrCreateScaledTexturePair (width: number, height: number): SizedTexturePair {
    const key = this.getScaleKey(width, height)
    const cached = this.scaledTexturePairs.get(key)
    if (cached && cached.textures[0] && cached.textures[1]) return cached

    if (!this.renderer || !this.renderer.ready) {
      return {
        textures: [null, null],
        currentIndex: 0
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
      currentIndex: 0
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
    this.destroyScaledTexturePairs()
    this.persistentTextures.forEach((texture) => texture.destroy())
    this.persistentTextures.clear()
    this.persistentBuffers.forEach((buffer) => buffer.destroy())
    this.persistentBuffers.clear()
    this.passOutputHistory = []
    if (this.renderer && this.renderer.ready) this.createPingPongTextures()
  }

  getCurrent (): GPUTexture | null {
    return this.lastOutputTexture ?? this.textures[this.pingPongIndex]
  }

  getTexture (): GPUTexture | null {
    // Expose the latest completed frame for external texture bindings (e.g. src(o0)).
    return this.lastOutputTexture ?? this.textures[this.pingPongIndex]
  }

  render (passes: HydraCompiledPass[]): void {
    this.pendingPasses = passes.slice()
    this.reportedPipelineErrors.clear()

    if (this.renderer && this.renderer.ready) {
      for (const pass of this.pendingPasses) {
        const executable = this.resolveExecutablePass(pass)
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
    }

    return Array.from(dependencies)
  }

  private reportPipelineErrorOnce (errorKey: string, context: PipelineErrorContext): void {
    if (this.reportedPipelineErrors.has(errorKey)) return
    this.reportedPipelineErrors.add(errorKey)
    if (this.pipelineErrorHandler) this.pipelineErrorHandler(context)
  }

  private invalidateBindGroupCache (): void {
    this.bindGroupCacheKey = ''
    this.bindGroupCache = null
  }

  private meetsPassRequirements (pass: HydraCompiledPass): boolean {
    const requiredStorage = pass.dispatch?.requiredWorkgroupStorageBytes
    if (!requiredStorage) return true
    const availableStorage = this.renderer?.capabilities?.compute.maxComputeWorkgroupStorageSize ?? 0
    if (!availableStorage) return true
    return availableStorage >= requiredStorage
  }

  private resolveExecutablePass (pass: HydraCompiledPass): HydraCompiledPass {
    if (this.meetsPassRequirements(pass)) return pass
    if (pass.fallbackPass) return pass.fallbackPass
    return pass
  }

  private resolvePasses (): ResolvedCompiledPass[] | null {
    if (!this.renderer || !this.renderer.ready) return null

    if (this.pendingPasses) {
      const nextPasses: HydraCompiledPass[] = []
      const nextEntries: PipelineEntry[] = []

      for (let index = 0; index < this.pendingPasses.length; index += 1) {
        const sourcePass = this.pendingPasses[index]
        let pass = this.resolveExecutablePass(sourcePass)
        let entry = this.renderer.getOutputPipelineEntry(pass.signature, pass.wgsl) as PipelineEntry | null
        if (!entry) return null

        if (entry.error && sourcePass.fallbackPass && pass.signature !== sourcePass.fallbackPass.signature) {
          const fallback = sourcePass.fallbackPass
          const fallbackEntry = this.renderer.getOutputPipelineEntry(fallback.signature, fallback.wgsl) as PipelineEntry | null
          if (fallbackEntry && !fallbackEntry.error && fallbackEntry.pipeline) {
            pass = fallback
            entry = fallbackEntry
          } else if (fallbackEntry && !fallbackEntry.error && !fallbackEntry.pipeline) {
            return null
          }
        }

        if (entry.error) {
          this.reportPipelineErrorOnce(entry.cacheKey || pass.signature, {
            outputLabel: this.label,
            passIndex: index,
            signature: pass.signature,
            error: entry.error
          })
          return null
        }

        if (!entry.pipeline) return null
        nextPasses.push(pass)
        nextEntries.push(entry)
      }

      this.activePasses = nextPasses
      this.activePipelineEntries = nextEntries
      this.passOutputHistory = new Array(nextPasses.length).fill(null)
      this.pendingPasses = null
      this.invalidateBindGroupCache()
    }

    if (this.activePasses.length === 0) return null

    const resolved: ResolvedCompiledPass[] = []
    for (let index = 0; index < this.activePasses.length; index += 1) {
      const pass = this.activePasses[index]
      let entry = this.activePipelineEntries[index]

      if (!entry || entry.signature !== pass.signature || entry.code !== pass.wgsl) {
        entry = this.renderer.getOutputPipelineEntry(pass.signature, pass.wgsl) as PipelineEntry | null
        if (!entry) return null
        this.activePipelineEntries[index] = entry
      }

      if (entry.error) {
        if (pass.fallbackPass && pass.fallbackPass.signature !== pass.signature) {
          const fallback = pass.fallbackPass
          const fallbackEntry = this.renderer.getOutputPipelineEntry(fallback.signature, fallback.wgsl) as PipelineEntry | null
          if (fallbackEntry && !fallbackEntry.error && fallbackEntry.pipeline) {
            this.activePasses[index] = fallback
            this.activePipelineEntries[index] = fallbackEntry
            resolved.push({ pass: fallback, pipeline: fallbackEntry.pipeline })
            continue
          }
        }
        this.reportPipelineErrorOnce(entry.cacheKey || pass.signature, {
          outputLabel: this.label,
          passIndex: index,
          signature: pass.signature,
          error: entry.error
        })
        return null
      }
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

  private resolveTextureBinding (textureBinding: HydraCompiledPass['textures'][number], readTexture: GPUTexture): GPUTexture | null {
    if (textureBinding.isPrev) return readTexture
    if (!textureBinding.getTexture) return null
    try {
      return textureBinding.getTexture() as GPUTexture
    } catch {
      return null
    }
  }

  private shouldRunPass (pass: HydraCompiledPass, passIndex: number): boolean {
    if (pass.schedule?.sparse && this.frameEvents.size === 0 && this.passOutputHistory[passIndex]) return false

    const updateRate = pass.schedule?.updateRate ?? 'everyFrame'
    if (updateRate === 'everyFrame') return true

    if ('everyNFrames' in updateRate) {
      const everyNFrames = Math.max(1, Math.floor(updateRate.everyNFrames || 1))
      return (this.frameCounter - 1) % everyNFrames === 0
    }

    if ('onEvent' in updateRate) {
      return this.frameEvents.has(updateRate.onEvent)
    }

    return true
  }

  private resolveStorageTextureBinding (
    textureBinding: HydraStorageTextureBinding,
    writeTexture: GPUTexture
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
    const persistentKey = textureBinding.stateKey ?? (textureBinding.lifetime === 'persistent' ? textureBinding.name : '')
    const allocationKey = persistentKey || (isArrayTexture ? `__auto-array-${textureBinding.name}` : '')

    if (allocationKey) {
      let texture = this.persistentTextures.get(allocationKey)
      if (!texture) {
        texture = this.renderer.createOutputTexture({
          width: this.width,
          height: this.height,
          depthOrArrayLayers: isArrayTexture ? 1 : 1,
          label: `${this.label}-state-${allocationKey}`,
          format: textureBinding.format,
          includeRenderAttachment: false
        })
        this.persistentTextures.set(allocationKey, texture)
      }
      return texture
    }

    if (!isArrayTexture && (textureBinding.access === 'write' || textureBinding.access === 'read_write')) return writeTexture
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

    let buffer = this.persistentBuffers.get(persistentKey)
    if (!buffer) {
      buffer = this.renderer.createStorageBuffer(
        `${this.label}-state-${persistentKey}`,
        Math.max(16, bufferBinding.minLength * 16)
      )
      this.persistentBuffers.set(persistentKey, buffer)
    }
    return buffer
  }

  private getOrCreateBindGroup (
    pipeline: GPUComputePipeline,
    pass: HydraCompiledPass,
    resolvedTextures: Array<GPUTexture | null>,
    resolvedStorageTextures: Array<GPUTexture | null>,
    resolvedStorageBuffers: Array<GPUBuffer | null>,
    writeTexture: GPUTexture
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
    const outputTextureBinding = pass.output?.binding ?? (3 + sampledTextures.length)
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
    cacheKey += `|o${outputTextureBinding}:${this.renderer.getObjectId(writeTexture)}`

    if (this.bindGroupCache && this.bindGroupCacheKey === cacheKey) {
      return this.bindGroupCache
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

    entries.push({
      binding: outputTextureBinding,
      resource: this.renderer.getTextureView(writeTexture)
    })

    this.bindGroupCache = this.renderer.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries
    })
    this.bindGroupCacheKey = cacheKey
    return this.bindGroupCache
  }

  tick (props: HydraFrameState, encoder: GPUCommandEncoder | null): void {
    this.ensureResources()
    if (!this.renderer || !this.renderer.ready || !encoder) return

    const resolvedPasses = this.resolvePasses()
    if (!resolvedPasses) return

    this.frameCounter += 1
    let currentTexture = this.lastOutputTexture ?? this.textures[this.pingPongIndex] ?? this.renderer.getFallbackTexture()

    for (let passIndex = 0; passIndex < resolvedPasses.length; passIndex += 1) {
      const resolved = resolvedPasses[passIndex]
      const { pass, pipeline } = resolved
      if (!this.shouldRunPass(pass, passIndex)) {
        const historyTexture = this.passOutputHistory[passIndex]
        if (historyTexture) currentTexture = historyTexture
        continue
      }

      const [passWidth, passHeight] = this.getPassDimensions(pass)
      const fullResolutionTarget = passWidth === this.width && passHeight === this.height
      const readTexture = currentTexture

      let writeTexture: GPUTexture
      let writeIndex = 0
      let scaledPair: SizedTexturePair | null = null

      if (fullResolutionTarget) {
        writeIndex = this.pingPongIndex ? 0 : 1
        writeTexture = this.textures[writeIndex] ?? this.renderer.getFallbackTexture()
      } else {
        scaledPair = this.getOrCreateScaledTexturePair(passWidth, passHeight)
        writeIndex = scaledPair.currentIndex ? 0 : 1
        writeTexture = scaledPair.textures[writeIndex] ?? this.renderer.getFallbackTexture()
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
          this.resolveStorageTextureBinding(storageTextures[index], writeTexture) ?? this.renderer.getFallbackTexture()
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
      const [workgroupSizeX, workgroupSizeY] = dispatchConfig?.workgroupSize ?? getWorkgroupSize(pass.wgsl)
      const workgroupsX = Math.max(1, Math.ceil(passWidth / workgroupSizeX))
      const workgroupsY = Math.max(1, Math.ceil(passHeight / workgroupSizeY))

      const computePass = encoder.beginComputePass()
      computePass.setPipeline(pipeline)
      computePass.setBindGroup(0, bindGroup)
      if (dispatchConfig?.mode === 'indirect' && dispatchConfig.getIndirectBuffer) {
        const indirectBuffer = dispatchConfig.getIndirectBuffer() as GPUBuffer
        if (indirectBuffer) {
          computePass.dispatchWorkgroupsIndirect(indirectBuffer, dispatchConfig.indirectOffset ?? 0)
        } else {
          computePass.dispatchWorkgroups(workgroupsX, workgroupsY, 1)
        }
      } else {
        computePass.dispatchWorkgroups(workgroupsX, workgroupsY, 1)
      }
      computePass.end()

      if (fullResolutionTarget) {
        this.pingPongIndex = writeIndex
      } else if (scaledPair) {
        scaledPair.currentIndex = writeIndex
      }
      currentTexture = writeTexture
      this.passOutputHistory[passIndex] = writeTexture
      this.lastOutputTexture = writeTexture
    }

    this.renderer.updateGlobalUniforms({
      time: props.time,
      bpm: props.bpm,
      width: this.width,
      height: this.height
    })
    this.frameEvents.clear()
  }

  dispose (): void {
    this.pendingPasses = null
    this.activePasses = []
    this.activePipelineEntries = []
    this.reportedPipelineErrors.clear()
    this.pipelineErrorHandler = null

    this.invalidateBindGroupCache()
    this.frameEvents.clear()

    this.textures.forEach((texture) => {
      if (texture) texture.destroy()
    })
    this.textures = [null, null]
    this.lastOutputTexture = null
    this.passOutputHistory = []
    this.destroyScaledTexturePairs()
    this.resolvedTexturesScratch.length = 0
    this.resolvedStorageTexturesScratch.length = 0
    this.resolvedStorageBuffersScratch.length = 0

    this.persistentTextures.forEach((texture) => texture.destroy())
    this.persistentTextures.clear()
    this.persistentBuffers.forEach((buffer) => buffer.destroy())
    this.persistentBuffers.clear()

    if (this.dynamicUniformBuffer) this.dynamicUniformBuffer.destroy()
    this.dynamicUniformBuffer = null
    this.renderer = null
  }
}
