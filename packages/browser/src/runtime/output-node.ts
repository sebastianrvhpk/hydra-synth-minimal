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

  private activePass: HydraCompiledPass | null = null
  private pendingPass: HydraCompiledPass | null = null
  private activePipelineEntry: PipelineEntry | null = null
  private lastPipelineErrorKey = ''

  private bindGroupCacheKey = ''
  private bindGroupCache: GPUBindGroup | null = null
  private readonly resolvedTexturesScratch: Array<GPUTexture | null> = []
  private readonly resolvedPass = {
    pass: null as HydraCompiledPass | null,
    pipeline: null as GPURenderPipeline | null
  }

  constructor ({ renderer, label = '', width, height }: { renderer: WebGPURenderer | null, label?: string, width: number, height: number }) {
    this.renderer = renderer
    this.label = label
    this.width = width
    this.height = height
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
    const pass = passes[0]
    if (!pass) return

    this.pendingPass = pass
    if (this.renderer && this.renderer.ready) {
      this.renderer.getOutputPipelineEntry(pass.signature, pass.wgsl)
    }
  }

  private warnPipelineErrorOnce (errorKey: string, error: unknown): void {
    if (this.lastPipelineErrorKey === errorKey) return
    this.lastPipelineErrorKey = errorKey
  }

  private invalidateBindGroupCache (): void {
    this.bindGroupCacheKey = ''
    this.bindGroupCache = null
  }

  private resolvePass (): { pass: HydraCompiledPass, pipeline: GPURenderPipeline } | null {
    if (!this.renderer || !this.renderer.ready) return null

    if (this.pendingPass) {
      const entry = this.renderer.getOutputPipelineEntry(this.pendingPass.signature, this.pendingPass.wgsl) as PipelineEntry | null
      if (!entry) return null
      if (entry.error) {
        this.warnPipelineErrorOnce(entry.cacheKey || this.pendingPass.signature, entry.error)
        this.pendingPass = null
      } else if (entry.pipeline) {
        this.activePass = this.pendingPass
        this.activePipelineEntry = entry
        this.pendingPass = null
        this.lastPipelineErrorKey = ''
        this.invalidateBindGroupCache()
      }
    }

    if (!this.activePass) return null

    if (
      !this.activePipelineEntry ||
      this.activePipelineEntry.signature !== this.activePass.signature ||
      this.activePipelineEntry.code !== this.activePass.wgsl
    ) {
      this.activePipelineEntry = this.renderer.getOutputPipelineEntry(this.activePass.signature, this.activePass.wgsl) as PipelineEntry | null
      if (!this.activePipelineEntry) return null
    }

    if (this.activePipelineEntry.error) {
      this.warnPipelineErrorOnce(this.activePipelineEntry.cacheKey || this.activePass.signature, this.activePipelineEntry.error)
      return null
    }
    if (!this.activePipelineEntry.pipeline) return null

    this.resolvedPass.pass = this.activePass
    this.resolvedPass.pipeline = this.activePipelineEntry.pipeline
    return this.resolvedPass as { pass: HydraCompiledPass, pipeline: GPURenderPipeline }
  }

  private updateDynamicUniforms (uniforms: HydraCompiledPass['uniforms'], props: HydraFrameState): void {
    if (!this.renderer || !this.renderer.device || !this.dynamicUniformBuffer || uniforms.length === 0) return

    let maxIndex = -1
    uniforms.forEach((uniform) => {
      const value = typeof uniform.value === 'function' ? uniform.value(props) : 0
      const safe = Number.isFinite(value) ? value : 0
      this.dynamicUniformData[uniform.index] = safe
      if (uniform.index > maxIndex) maxIndex = uniform.index
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

    const resolved = this.resolvePass()
    if (!resolved) return

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

  dispose (): void {
    this.pendingPass = null
    this.activePass = null
    this.activePipelineEntry = null
    this.lastPipelineErrorKey = ''

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
