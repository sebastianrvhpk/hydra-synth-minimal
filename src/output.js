import { MAX_DYNAMIC_UNIFORMS } from './webgpu/constants.js'

class Output {
  constructor ({ renderer, label = '', width, height }) {
    this.renderer = renderer
    this.label = label
    this.width = width
    this.height = height

    this.pingPongIndex = 0
    this.textures = [null, null]
    this.dynamicUniformBuffer = null
    this.dynamicUniformData = new Float32Array(MAX_DYNAMIC_UNIFORMS)

    this.activePass = null
    this.pendingPass = null
    this.activePipelineEntry = null
    this.lastPipelineErrorKey = ''

    this.bindGroupCacheKey = ''
    this.bindGroupCache = null
    this.resolvedTexturesScratch = []
    this.resolvedPass = {
      pass: null,
      pipeline: null
    }
  }

  attachRenderer (renderer) {
    this.renderer = renderer
    this._invalidateBindGroupCache()
    this._ensureResources()
  }

  _ensureResources () {
    if (!this.renderer || !this.renderer.ready) return

    if (!this.dynamicUniformBuffer) {
      this.dynamicUniformBuffer = this.renderer.createDynamicUniformBuffer(`${this.label}-dynamic-uniforms`)
    }

    if (!this.textures[0] || !this.textures[1]) {
      this._createPingPongTextures()
    }
  }

  _createPingPongTextures () {
    if (!this.renderer || !this.renderer.ready) return

    this.textures.forEach((texture) => {
      if (texture) texture.destroy()
    })

    this.textures = [0, 1].map((index) => this.renderer.createOutputTexture({
      width: this.width,
      height: this.height,
      label: `${this.label}-pingpong-${index}`
    }))
    this.pingPongIndex = 0
    this._invalidateBindGroupCache()
  }

  resize (width, height) {
    this.width = width
    this.height = height
    if (this.renderer && this.renderer.ready) this._createPingPongTextures()
  }

  getCurrent () {
    return this.textures[this.pingPongIndex]
  }

  getTexture () {
    return this.textures[this.pingPongIndex ? 0 : 1]
  }

  render (passes) {
    const pass = passes && passes[0]
    if (!pass) return

    this.pendingPass = pass
    if (this.renderer && this.renderer.ready) {
      this.renderer.getOutputPipelineEntry(pass.signature, pass.wgsl)
    }
  }

  _warnPipelineErrorOnce (errorKey, error) {
    if (this.lastPipelineErrorKey === errorKey) return
    this.lastPipelineErrorKey = errorKey
    console.warn(`[hydra] failed to compile output pipeline "${this.label}"`, error)
  }

  _invalidateBindGroupCache () {
    this.bindGroupCacheKey = ''
    this.bindGroupCache = null
  }

  _resolvePass () {
    if (!this.renderer || !this.renderer.ready) return null

    if (this.pendingPass) {
      const entry = this.renderer.getOutputPipelineEntry(this.pendingPass.signature, this.pendingPass.wgsl)
      if (!entry) return null
      if (entry.error) {
        this._warnPipelineErrorOnce(entry.cacheKey || this.pendingPass.signature, entry.error)
        this.pendingPass = null
      } else if (entry.pipeline) {
        this.activePass = this.pendingPass
        this.activePipelineEntry = entry
        this.pendingPass = null
        this.lastPipelineErrorKey = ''
        this._invalidateBindGroupCache()
      }
    }

    if (!this.activePass) return null

    if (
      !this.activePipelineEntry ||
      this.activePipelineEntry.signature !== this.activePass.signature ||
      this.activePipelineEntry.code !== this.activePass.wgsl
    ) {
      this.activePipelineEntry = this.renderer.getOutputPipelineEntry(this.activePass.signature, this.activePass.wgsl)
      if (!this.activePipelineEntry) return null
    }

    if (this.activePipelineEntry.error) {
      this._warnPipelineErrorOnce(this.activePipelineEntry.cacheKey || this.activePass.signature, this.activePipelineEntry.error)
      return null
    }
    if (!this.activePipelineEntry.pipeline) return null

    this.resolvedPass.pass = this.activePass
    this.resolvedPass.pipeline = this.activePipelineEntry.pipeline
    return this.resolvedPass
  }

  _updateDynamicUniforms (uniforms, props) {
    if (!uniforms || uniforms.length === 0) return

    let maxIndex = -1
    uniforms.forEach((uniform) => {
      const value = typeof uniform.value === 'function' ? uniform.value(props) : uniform.value
      const safe = Number.isFinite(value) ? value : 0
      this.dynamicUniformData[uniform.index] = safe
      if (uniform.index > maxIndex) maxIndex = uniform.index
    })
    if (maxIndex < 0) return
    const floatCount = maxIndex + 1
    this.renderer.device.queue.writeBuffer(this.dynamicUniformBuffer, 0, this.dynamicUniformData, 0, floatCount)
  }

  _resolveTextureBinding (textureBinding, readTexture) {
    if (textureBinding.isPrev) return readTexture
    if (!textureBinding.getTexture) return null
    try {
      return textureBinding.getTexture()
    } catch (error) {
      console.warn(`failed to resolve texture binding "${textureBinding.name}"`, error)
      return null
    }
  }

  _getOrCreateBindGroup (pipeline, pass, resolvedTextures) {
    let cacheKey = `p${this.renderer.getObjectId(pipeline)}|g${this.renderer.getObjectId(this.renderer.globalUniformBuffer)}`

    if (pass.uniforms.length > 0) {
      cacheKey += `|d${this.renderer.getObjectId(this.dynamicUniformBuffer)}`
    }

    if (pass.textures.length > 0) {
      cacheKey += `|s${this.renderer.getObjectId(this.renderer.linearSampler)}`
    }

    for (let i = 0; i < pass.textures.length; i++) {
      const textureBinding = pass.textures[i]
      cacheKey += `|t${textureBinding.binding}:${this.renderer.getObjectId(resolvedTextures[i])}`
    }

    if (this.bindGroupCache && this.bindGroupCacheKey === cacheKey) {
      return this.bindGroupCache
    }

    const entries = [
      { binding: 0, resource: { buffer: this.renderer.globalUniformBuffer } }
    ]

    if (pass.uniforms.length > 0) {
      entries.push({ binding: 1, resource: { buffer: this.dynamicUniformBuffer } })
    }

    if (pass.textures.length > 0) {
      entries.push({ binding: 2, resource: this.renderer.linearSampler })
    }

    for (let i = 0; i < pass.textures.length; i++) {
      const textureBinding = pass.textures[i]
      entries.push({
        binding: textureBinding.binding,
        resource: this.renderer.getTextureView(resolvedTextures[i])
      })
    }

    this.bindGroupCache = this.renderer.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries
    })
    this.bindGroupCacheKey = cacheKey
    return this.bindGroupCache
  }

  tick (props, encoder) {
    this._ensureResources()
    if (!this.renderer || !this.renderer.ready) return
    if (!encoder) return

    const resolved = this._resolvePass()
    if (!resolved) return

    const { pass, pipeline } = resolved

    const readIndex = this.pingPongIndex
    const writeIndex = this.pingPongIndex ? 0 : 1
    const readTexture = this.textures[readIndex] || this.renderer.getFallbackTexture()
    const writeTexture = this.textures[writeIndex] || this.renderer.getFallbackTexture()

    this._updateDynamicUniforms(pass.uniforms, props)

    for (let i = 0; i < pass.textures.length; i++) {
      const textureBinding = pass.textures[i]
      this.resolvedTexturesScratch[i] = this._resolveTextureBinding(textureBinding, readTexture) || this.renderer.getFallbackTexture()
    }

    const bindGroup = this._getOrCreateBindGroup(pipeline, pass, this.resolvedTexturesScratch)

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

  dispose () {
    this.pendingPass = null
    this.activePass = null
    this.activePipelineEntry = null
    this.lastPipelineErrorKey = ''

    this._invalidateBindGroupCache()

    this.textures.forEach((texture) => {
      if (texture) texture.destroy()
    })
    this.textures = [null, null]

    if (this.dynamicUniformBuffer) this.dynamicUniformBuffer.destroy()
    this.dynamicUniformBuffer = null
    this.renderer = null
  }
}

export default Output
