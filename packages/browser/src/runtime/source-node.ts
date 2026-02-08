import type { HydraFrameState, HydraTextureProvider, SourceAdapter } from 'hydra-synth-core'
import type { WebGPURenderer } from '../webgpu/renderer.js'

interface StreamInitParams {
  flipY?: boolean
}

interface SourceInitOptions {
  src?: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement
  dynamic?: boolean
}

export interface PatchBayAdapter {
  initSource (name: string): void
  on (event: string, callback: (nick: string, video: HTMLVideoElement) => void): (() => void) | void
  off?: (event: string, callback: (nick: string, video: HTMLVideoElement) => void) => void
}

type Cleanup = () => void

export class HydraSourceNode implements SourceAdapter, HydraTextureProvider {
  readonly label: string

  private renderer: WebGPURenderer | null
  private readonly pb: PatchBayAdapter | null
  private src: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement | null = null
  private dynamic = true
  private texture: GPUTexture | null = null
  private textureWidth = 0
  private textureHeight = 0
  private flipY = false
  private needsUpload = false
  private uploadedStatic = false
  private disposed = false
  private readonly canvases: Record<string, CanvasRenderingContext2D> = {}
  private readonly cleanups: Cleanup[] = []

  constructor ({ renderer, pb, label = '' }: { renderer: WebGPURenderer | null, pb: PatchBayAdapter | null, label?: string }) {
    this.renderer = renderer
    this.pb = pb
    this.label = label
  }

  attachRenderer (renderer: WebGPURenderer): void {
    this.renderer = renderer
    this.ensureTexture(1, 1)
    this.needsUpload = true
  }

  init (opts: SourceInitOptions = {}, params: StreamInitParams = {}): void {
    if ('dynamic' in opts && typeof opts.dynamic === 'boolean') this.dynamic = opts.dynamic
    if ('src' in opts && opts.src) {
      this.src = opts.src
      this.flipY = Boolean(params.flipY)
      this.needsUpload = true
      this.uploadedStatic = false
    }
  }

  initVideo (url = '', params: StreamInitParams = {}): void {
    if (this.disposed) return
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.autoplay = true
    video.loop = true
    video.muted = true
    video.playsInline = true
    video.src = url

    const loaded = (): void => {
      if (this.disposed) return
      this.src = video
      this.flipY = Boolean(params.flipY)
      this.dynamic = true
      this.needsUpload = true
      this.uploadedStatic = false
      void video.play().catch(() => {})
    }

    this.listen(video, 'loadeddata', loaded)
    this.registerCleanup(() => {
      video.pause()
      video.src = ''
    })
  }

  initImage (url = '', params: StreamInitParams = {}): void {
    if (this.disposed) return
    const image = document.createElement('img')
    image.crossOrigin = 'anonymous'
    image.src = url
    const loaded = (): void => {
      if (this.disposed) return
      this.src = image
      this.flipY = Boolean(params.flipY)
      this.dynamic = false
      this.needsUpload = true
      this.uploadedStatic = false
    }
    this.listen(image, 'load', loaded)
  }

  initStream (streamName: string, params: StreamInitParams = {}): void {
    if (!streamName || !this.pb || this.disposed) return
    this.pb.initSource(streamName)

    const onVideo = (nick: string, video: HTMLVideoElement): void => {
      if (nick !== streamName || this.disposed) return
      this.src = video
      this.flipY = Boolean(params.flipY)
      this.dynamic = true
      this.needsUpload = true
      this.uploadedStatic = false
    }

    const maybeUnsubscribe = this.pb.on('got video', onVideo)
    if (typeof maybeUnsubscribe === 'function') {
      this.registerCleanup(maybeUnsubscribe)
    } else if (this.pb.off) {
      this.registerCleanup(() => {
        this.pb?.off?.('got video', onVideo)
      })
    }
  }

  initCanvas (width = 1000, height = 1000): CanvasRenderingContext2D {
    if (!this.canvases[this.label]) {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Failed to create 2D canvas context for Hydra source.')
      this.canvases[this.label] = context
    }

    const context = this.canvases[this.label]
    const canvas = context.canvas
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    } else {
      context.clearRect(0, 0, width, height)
    }

    this.init({ src: canvas, dynamic: true })
    return context
  }

  private registerCleanup (cleanup: Cleanup): void {
    this.cleanups.push(cleanup)
  }

  private listen (
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    target.addEventListener(type, listener, options)
    this.registerCleanup(() => {
      target.removeEventListener(type, listener, options)
    })
  }

  private getSourceSize (): { width: number, height: number } {
    if (!this.src) return { width: 1, height: 1 }

    if ('videoWidth' in this.src && this.src.videoWidth && this.src.videoHeight) {
      return { width: this.src.videoWidth, height: this.src.videoHeight }
    }

    if ('naturalWidth' in this.src && this.src.naturalWidth && this.src.naturalHeight) {
      return { width: this.src.naturalWidth, height: this.src.naturalHeight }
    }

    if ('width' in this.src && 'height' in this.src) {
      return { width: this.src.width, height: this.src.height }
    }

    return { width: 1, height: 1 }
  }

  private ensureTexture (width: number, height: number): void {
    if (!this.renderer || !this.renderer.ready) return

    const w = Math.max(1, Math.floor(width))
    const h = Math.max(1, Math.floor(height))

    if (this.texture && this.textureWidth === w && this.textureHeight === h) return

    if (this.texture) this.texture.destroy()
    this.texture = this.renderer.createOutputTexture({
      width: w,
      height: h,
      label: `${this.label}-source-texture`
    })
    this.textureWidth = w
    this.textureHeight = h
  }

  clear (): void {
    if (this.src && 'srcObject' in this.src && this.src.srcObject && 'getTracks' in this.src.srcObject) {
      this.src.srcObject.getTracks().forEach((track) => track.stop())
    }

    this.src = null
    this.dynamic = true
    this.needsUpload = false
    this.uploadedStatic = false
    this.ensureTexture(1, 1)
  }

  private uploadSource (): void {
    if (!this.renderer || !this.renderer.ready || !this.renderer.device || !this.src) return

    const { width, height } = this.getSourceSize()
    if (width <= 0 || height <= 0) return

    this.ensureTexture(width, height)
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

  tick (_frame: HydraFrameState): void {
    if (this.disposed || !this.renderer || !this.renderer.ready) return

    if (!this.src) {
      this.ensureTexture(1, 1)
      return
    }

    if (this.dynamic) {
      this.uploadSource()
      this.needsUpload = false
      return
    }

    if (this.needsUpload || !this.uploadedStatic) {
      this.uploadSource()
      this.needsUpload = false
      this.uploadedStatic = true
    }
  }

  getTexture (): GPUTexture | null {
    if (this.texture) return this.texture
    if (this.renderer && this.renderer.ready) return this.renderer.getFallbackTexture()
    return null
  }

  dispose (): void {
    if (this.disposed) return
    this.disposed = true

    this.clear()

    while (this.cleanups.length > 0) {
      const cleanup = this.cleanups.pop()
      if (cleanup) {
        try {
          cleanup()
        } catch {
          // Cleanup should not block disposal flow.
        }
      }
    }

    if (this.texture) this.texture.destroy()
    this.texture = null
    this.textureWidth = 0
    this.textureHeight = 0
    this.renderer = null
  }
}
