class HydraSource {
  constructor ({ renderer, pb, label = '' }) {
    this.label = label
    this.renderer = renderer
    this.pb = pb

    this.src = null
    this.dynamic = true
    this.texture = null
    this.textureWidth = 0
    this.textureHeight = 0
    this.flipY = false
    this._needsUpload = false
    this._uploadedStatic = false

    this.canvases = {}
  }

  attachRenderer (renderer) {
    this.renderer = renderer
    this._ensureTexture(1, 1)
    this._needsUpload = true
  }

  init (opts = {}, params = {}) {
    if ('dynamic' in opts) this.dynamic = opts.dynamic
    if ('src' in opts) {
      this.src = opts.src
      this.flipY = Boolean(params.flipY)
      this._needsUpload = true
      this._uploadedStatic = false
    }
  }

  initVideo (url = '', params = {}) {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.autoplay = true
    video.loop = true
    video.muted = true
    video.playsInline = true
    video.src = url

    video.addEventListener('loadeddata', () => {
      this.src = video
      this.flipY = Boolean(params.flipY)
      this.dynamic = true
      this._needsUpload = true
      this._uploadedStatic = false
      video.play().catch(() => {})
    })
  }

  initImage (url = '', params = {}) {
    const image = document.createElement('img')
    image.crossOrigin = 'anonymous'
    image.src = url
    image.onload = () => {
      this.src = image
      this.flipY = Boolean(params.flipY)
      this.dynamic = false
      this._needsUpload = true
      this._uploadedStatic = false
    }
  }

  initStream (streamName, params = {}) {
    if (!streamName || !this.pb) return
    this.pb.initSource(streamName)

    this.pb.on('got video', (nick, video) => {
      if (nick !== streamName) return
      this.src = video
      this.flipY = Boolean(params.flipY)
      this.dynamic = true
      this._needsUpload = true
      this._uploadedStatic = false
    })
  }

  initCanvas (width = 1000, height = 1000) {
    if (!this.canvases[this.label]) {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) this.canvases[this.label] = ctx
    }

    const ctx = this.canvases[this.label]
    const canvas = ctx.canvas
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    } else {
      ctx.clearRect(0, 0, width, height)
    }

    this.init({ src: canvas, dynamic: true })
    return ctx
  }

  _getSourceSize () {
    if (!this.src) return { width: 1, height: 1 }

    if (this.src.videoWidth && this.src.videoHeight) {
      return { width: this.src.videoWidth, height: this.src.videoHeight }
    }

    if (this.src.naturalWidth && this.src.naturalHeight) {
      return { width: this.src.naturalWidth, height: this.src.naturalHeight }
    }

    if (this.src.width && this.src.height) {
      return { width: this.src.width, height: this.src.height }
    }

    return { width: 1, height: 1 }
  }

  _ensureTexture (width, height) {
    if (!this.renderer || !this.renderer.ready) return
    const w = Math.max(1, Math.floor(width))
    const h = Math.max(1, Math.floor(height))

    if (this.texture && this.textureWidth === w && this.textureHeight === h) {
      return
    }

    if (this.texture) this.texture.destroy()
    this.texture = this.renderer.createOutputTexture({
      width: w,
      height: h,
      label: `${this.label}-source-texture`
    })
    this.textureWidth = w
    this.textureHeight = h
  }

  clear () {
    if (this.src && this.src.srcObject && this.src.srcObject.getTracks) {
      this.src.srcObject.getTracks().forEach((track) => track.stop())
    }

    this.src = null
    this.dynamic = true
    this._needsUpload = false
    this._uploadedStatic = false
    this._ensureTexture(1, 1)
  }

  _uploadSource () {
    if (!this.renderer || !this.renderer.ready || !this.src) return

    const { width, height } = this._getSourceSize()
    if (width <= 0 || height <= 0) return

    this._ensureTexture(width, height)
    if (!this.texture) return

    this.renderer.device.queue.copyExternalImageToTexture(
      {
        source: this.src,
        flipY: this.flipY
      },
      {
        texture: this.texture
      },
      {
        width: Math.max(1, Math.floor(width)),
        height: Math.max(1, Math.floor(height))
      }
    )
  }

  tick () {
    if (!this.renderer || !this.renderer.ready) return

    if (!this.src) {
      this._ensureTexture(1, 1)
      return
    }

    if (this.dynamic) {
      this._uploadSource()
      this._needsUpload = false
      return
    }

    if (this._needsUpload || !this._uploadedStatic) {
      this._uploadSource()
      this._needsUpload = false
      this._uploadedStatic = true
    }
  }

  getTexture () {
    if (this.texture) return this.texture
    if (this.renderer && this.renderer.ready) return this.renderer.getFallbackTexture()
    return null
  }

  dispose () {
    if (this.src && this.src.srcObject && this.src.srcObject.getTracks) {
      this.src.srcObject.getTracks().forEach((track) => track.stop())
    }

    this.src = null
    this.dynamic = true
    this._needsUpload = false
    this._uploadedStatic = false

    if (this.texture) this.texture.destroy()
    this.texture = null
    this.textureWidth = 0
    this.textureHeight = 0

    this.canvases = {}
    this.renderer = null
  }
}

export default HydraSource
