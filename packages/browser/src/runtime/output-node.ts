import type { HydraCompiledPass, HydraFrameState, HydraOutputAdapter } from 'hydra-synth-core'
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

  constructor ({ renderer, label = '', width, height }: { renderer: WebGPURenderer | null, label?: string, width: number, height: number }) {
    this.renderer = renderer
    this.label = label
    this.width = width
    this.height = height
  }

  setPipelineErrorHandler (handler: ((context: PipelineErrorContext) => void) | null): void {
    this.pipelineErrorHandler = handler
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
    this.invalidateBindGroupCache()
  }

  resize (width: number, height: number): void {
    this.width = width
    this.height = height
    if (this.renderer && this.renderer.ready) this.createPingPongTextures()
  }

  getCurrent (): GPUTexture | null {
    return this.textures[this.pingPongIndex]
  }

  getTexture (): GPUTexture | null {
    // Expose the latest completed frame for external texture bindings (e.g. src(o0)).
    return this.textures[this.pingPongIndex]
  }

  render (passes: HydraCompiledPass[]): void {
    this.pendingPasses = passes.slice()
    this.reportedPipelineErrors.clear()

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
    this.bindGroupCacheKey = ''
    this.bindGroupCache = null
  }

  private resolvePasses (): ResolvedCompiledPass[] | null {
    if (!this.renderer || !this.renderer.ready) return null

    if (this.pendingPasses) {
      const nextEntries: PipelineEntry[] = []

      for (let index = 0; index < this.pendingPasses.length; index += 1) {
        const pass = this.pendingPasses[index]
        const entry = this.renderer.getOutputPipelineEntry(pass.signature, pass.wgsl) as PipelineEntry | null
        if (!entry) return null

        if (entry.error) {
          this.reportPipelineErrorOnce(entry.cacheKey || pass.signature, {
            outputLabel: this.label,
            passIndex: index,
            signature: pass.signature,
            error: entry.error
          })
          this.pendingPasses = null
          return null
        }

        if (!entry.pipeline) return null
        nextEntries.push(entry)
      }

      this.activePasses = this.pendingPasses
      this.activePipelineEntries = nextEntries
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

  private getOrCreateBindGroup (
    pipeline: GPURenderPipeline,
    pass: HydraCompiledPass,
    resolvedTextures: Array<GPUTexture | null>
  ): GPUBindGroup {
    if (!this.renderer || !this.renderer.device || !this.renderer.globalUniformBuffer || !this.renderer.linearSampler) {
      throw new Error('Renderer resources are unavailable.')
    }

    let cacheKey = `p${this.renderer.getObjectId(pipeline)}|g${this.renderer.getObjectId(this.renderer.globalUniformBuffer)}`

    if (pass.uniforms.length > 0 && this.dynamicUniformBuffer) {
      cacheKey += `|d${this.renderer.getObjectId(this.dynamicUniformBuffer)}`
    }

    if (pass.textures.length > 0) {
      cacheKey += `|s${this.renderer.getObjectId(this.renderer.linearSampler)}`
    }

    for (let index = 0; index < pass.textures.length; index += 1) {
      const textureBinding = pass.textures[index]
      cacheKey += `|t${textureBinding.binding}:${this.renderer.getObjectId(resolvedTextures[index])}`
    }

    if (this.bindGroupCache && this.bindGroupCacheKey === cacheKey) {
      return this.bindGroupCache
    }

    const entries: GPUBindGroupEntry[] = [
      { binding: 0, resource: { buffer: this.renderer.globalUniformBuffer } }
    ]

    if (pass.uniforms.length > 0 && this.dynamicUniformBuffer) {
      entries.push({ binding: 1, resource: { buffer: this.dynamicUniformBuffer } })
    }

    if (pass.textures.length > 0) {
      entries.push({ binding: 2, resource: this.renderer.linearSampler })
    }

    for (let index = 0; index < pass.textures.length; index += 1) {
      const textureBinding = pass.textures[index]
      const texture = resolvedTextures[index] ?? this.renderer.getFallbackTexture()
      entries.push({
        binding: textureBinding.binding,
        resource: this.renderer.getTextureView(texture)
      })
    }

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

    for (const resolved of resolvedPasses) {
      const { pass, pipeline } = resolved

      const readIndex = this.pingPongIndex
      const writeIndex = this.pingPongIndex ? 0 : 1
      const readTexture = this.textures[readIndex] ?? this.renderer.getFallbackTexture()
      const writeTexture = this.textures[writeIndex] ?? this.renderer.getFallbackTexture()

      this.updateDynamicUniforms(pass.uniforms, props)

      for (let index = 0; index < pass.textures.length; index += 1) {
        const textureBinding = pass.textures[index]
        this.resolvedTexturesScratch[index] = this.resolveTextureBinding(textureBinding, readTexture) ?? this.renderer.getFallbackTexture()
      }
      this.resolvedTexturesScratch.length = pass.textures.length

      const bindGroup = this.getOrCreateBindGroup(pipeline, pass, this.resolvedTexturesScratch)

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

      this.pingPongIndex = writeIndex
    }
  }

  dispose (): void {
    this.pendingPasses = null
    this.activePasses = []
    this.activePipelineEntries = []
    this.reportedPipelineErrors.clear()
    this.pipelineErrorHandler = null

    this.invalidateBindGroupCache()

    this.textures.forEach((texture) => {
      if (texture) texture.destroy()
    })
    this.textures = [null, null]

    if (this.dynamicUniformBuffer) this.dynamicUniformBuffer.destroy()
    this.dynamicUniformBuffer = null
    this.renderer = null
  }
}
