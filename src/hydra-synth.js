import Output from './output.js'
import Source from './hydra-source.js'
import Sandbox from './eval-sandbox.js'
import Generator from './generator-factory.js'
import WebGPURenderer, { WEBGPU_UNAVAILABLE_MESSAGE } from './webgpu/renderer.js'

class HydraRenderer {
  constructor ({
    pb = null,
    width = 1280,
    height = 720,
    numSources = 4,
    numOutputs = 4,
    makeGlobal = true,
    autoLoop = true,
    canvas,
    extendTransforms = {}
  } = {}) {
    this.pb = pb
    this.width = width
    this.height = height

    this._initCanvas(canvas)
    this.renderer = null
    this.initError = null
    this.webgpuReady = null

    this.synth = {
      time: 0,
      bpm: 30,
      width: this.width,
      height: this.height,
      fps: undefined,
      stats: { fps: 0 },
      speed: 1,
      render: this._render.bind(this),
      setResolution: this.setResolution.bind(this),
      update: (dt) => {},
      afterUpdate: (dt) => {},
      hush: this.hush.bind(this),
      tick: this.tick.bind(this)
    }

    if (makeGlobal) window.loadScript = this.loadScript

    this.timeSinceLastUpdate = 0
    this._frameProps = {
      time: 0,
      bpm: 0,
      resolution: [this.width, this.height]
    }
    this._globalUniformState = {
      time: 0,
      bpm: 0
    }
    this._outputTexturesScratch = []

    this.extendTransforms = extendTransforms
    this.saveFrame = false
    this.generator = undefined

    this._loopHandle = null
    this._lastFrameTime = null
    this._disposed = false

    this._initWebGPU()
    this._initOutputs(numOutputs)
    this._initSources(numSources)
    this._generateWgslTransforms()

    this.synth.screencap = () => {
      this.saveFrame = true
    }

    if (autoLoop) this._startLoop()

    this.sandbox = new Sandbox(this.synth, makeGlobal, ['speed', 'update', 'afterUpdate', 'bpm', 'fps'])
  }

  _initWebGPU () {
    try {
      WebGPURenderer.assertSupport()
      this.renderer = new WebGPURenderer({
        canvas: this.canvas,
        width: this.width,
        height: this.height
      })

      this.webgpuReady = this.renderer.init().then(() => {
        if (this._disposed) return
        this.o.forEach((output) => output.attachRenderer(this.renderer))
        this.s.forEach((source) => source.attachRenderer(this.renderer))
      }).catch((error) => {
        this.initError = error
        console.error('[hydra-synth] WebGPU initialization failed:', error.message)
        this._stopLoop()
        throw error
      })
      this.ready = this.webgpuReady
    } catch (error) {
      this.initError = error
      throw new Error(WEBGPU_UNAVAILABLE_MESSAGE)
    }
  }

  _startLoop () {
    const frame = (timestamp) => {
      if (this._disposed) return
      if (this._lastFrameTime === null) this._lastFrameTime = timestamp
      const dt = timestamp - this._lastFrameTime
      this._lastFrameTime = timestamp
      this.tick(dt)
      this._loopHandle = requestAnimationFrame(frame)
    }
    this._loopHandle = requestAnimationFrame(frame)
  }

  _stopLoop () {
    if (this._loopHandle !== null) {
      cancelAnimationFrame(this._loopHandle)
      this._loopHandle = null
      this._lastFrameTime = null
    }
  }

  eval (code) {
    this.sandbox.eval(code)
  }

  getScreenImage (callback) {
    this.imageCallback = callback
    this.saveFrame = true
  }

  hush () {
    this.s.forEach((source) => {
      source.clear()
    })

    this.o.forEach((output) => {
      this.synth.solid(0, 0, 0, 0).out(output)
    })

    this.synth.render(this.o[0])
    this.sandbox.set('update', (dt) => {})
    this.sandbox.set('afterUpdate', (dt) => {})
  }

  loadScript (url = '') {
    const promise = new Promise((resolve) => {
      const script = document.createElement('script')
      script.onload = () => resolve()
      script.onerror = () => resolve()
      script.src = url
      document.head.appendChild(script)
    })
    return promise
  }

  setResolution (width, height) {
    this.canvas.width = width
    this.canvas.height = height
    this.width = width
    this.height = height
    this._frameProps.resolution[0] = width
    this._frameProps.resolution[1] = height
    this.sandbox.set('width', width)
    this.sandbox.set('height', height)

    if (this.renderer) this.renderer.setResolution(width, height)

    this.o.forEach((output) => output.resize(width, height))
  }

  canvasToImage (callback) {
    const anchor = document.createElement('a')
    anchor.style.display = 'none'

    const date = new Date()
    anchor.download = `hydra-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}.${date.getMinutes()}.${date.getSeconds()}.png`
    document.body.appendChild(anchor)

    this.canvas.toBlob((blob) => {
      if (!blob) return

      if (this.imageCallback) {
        this.imageCallback(blob)
        delete this.imageCallback
      } else {
        anchor.href = URL.createObjectURL(blob)
        anchor.click()
      }
    }, 'image/png')

    setTimeout(() => {
      document.body.removeChild(anchor)
      if (anchor.href) window.URL.revokeObjectURL(anchor.href)
    }, 300)
  }

  _initCanvas (canvas) {
    if (canvas) {
      this.canvas = canvas
      this.width = canvas.width
      this.height = canvas.height
      return
    }

    this.canvas = document.createElement('canvas')
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    this.canvas.style.imageRendering = 'pixelated'
    document.body.appendChild(this.canvas)
  }

  _initOutputs (numOutputs) {
    this.o = Array(numOutputs).fill().map((_, index) => {
      const output = new Output({
        renderer: this.renderer,
        width: this.width,
        height: this.height,
        label: `o${index}`
      })
      output.id = index
      this.synth[`o${index}`] = output
      return output
    })

    this.output = this.o[0]
  }

  _initSources (numSources) {
    this.s = []
    for (let i = 0; i < numSources; i++) {
      this.createSource()
    }
  }

  createSource () {
    const source = new Source({
      renderer: this.renderer,
      pb: this.pb,
      label: `s${this.s.length}`
    })
    this.synth[`s${this.s.length}`] = source
    this.s.push(source)
    return source
  }

  _generateWgslTransforms () {
    this.generator = new Generator({
      defaultOutput: this.o[0],
      extendTransforms: this.extendTransforms,
      changeListener: ({ type, method, synth }) => {
        if (type === 'add') {
          this.synth[method] = synth.generators[method]
          if (this.sandbox) this.sandbox.add(method)
        }
      }
    })
    this.synth.registerFunction = this.generator.registerFunction.bind(this.generator)
  }

  _render (output) {
    if (output) {
      this.output = output
      this.isRenderingAll = false
      return
    }

    this.isRenderingAll = true
  }

  tick (dt = 16) {
    if (this._disposed) return
    try {
      if (this.initError) throw this.initError

      this.sandbox.tick()
      this.sandbox.set('time', this.synth.time += dt * 0.001 * this.synth.speed)
      this.timeSinceLastUpdate += dt

      if (!this.synth.fps || this.timeSinceLastUpdate >= 1000 / this.synth.fps) {
        this.synth.stats.fps = Math.ceil(1000 / this.timeSinceLastUpdate)

        if (this.synth.update) {
          try {
            this.synth.update(this.timeSinceLastUpdate)
          } catch (error) {
            console.error('[hydra-synth] update() failed:', error)
          }
        }

        for (let i = 0; i < this.s.length; i++) {
          this.s[i].tick(this.synth.time)
        }

        const currentTime = this.synth.time
        this._frameProps.time = currentTime
        this._frameProps.bpm = this.synth.bpm
        this._frameProps.resolution[0] = this.canvas.width
        this._frameProps.resolution[1] = this.canvas.height

        const encoder = this.renderer ? this.renderer.beginFrame() : null
        if (this.renderer && this.renderer.ready) {
          this._globalUniformState.time = currentTime
          this._globalUniformState.bpm = this.synth.bpm
          this.renderer.updateGlobalUniforms(this._globalUniformState)
        }

        for (let i = 0; i < this.o.length; i++) {
          this.o[i].tick(this._frameProps, encoder)
        }

        if (encoder && this.renderer && this.renderer.ready) {
          if (this.isRenderingAll) {
            for (let i = 0; i < this.o.length; i++) {
              this._outputTexturesScratch[i] = this.o[i].getCurrent()
            }
            this.renderer.renderAllOutputsToScreen(encoder, this._outputTexturesScratch)
          } else {
            this.renderer.renderTextureToScreen(encoder, this.output.getCurrent())
          }
          this.renderer.submitFrame(encoder)
        }

        if (this.synth.afterUpdate) {
          try {
            this.synth.afterUpdate(this.timeSinceLastUpdate)
          } catch (error) {
            console.error('[hydra-synth] afterUpdate() failed:', error)
          }
        }

        this.timeSinceLastUpdate = 0
      }

      if (this.saveFrame === true) {
        this.canvasToImage()
        this.saveFrame = false
      }
    } catch (error) {
      console.warn('Error during tick():', error)
    }
  }

  dispose () {
    this._disposed = true
    this._stopLoop()

    this.o.forEach((output) => {
      if (output && typeof output.dispose === 'function') output.dispose()
    })

    this.s.forEach((source) => {
      if (source && typeof source.dispose === 'function') source.dispose()
    })

    if (this.renderer && typeof this.renderer.dispose === 'function') {
      this.renderer.dispose()
    }
    this.renderer = null
  }
}

export default HydraRenderer
