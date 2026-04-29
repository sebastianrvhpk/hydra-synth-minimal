import type { HydraFrameState, HydraTextureProvider, SourceAdapter } from '../core/index.js'
import type { WebGPURenderer } from '../webgpu/renderer.js'

interface StreamInitParams {
  flipY?: boolean
}

interface SourceInitOptions {
  src?: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement
  dynamic?: boolean
}

export type HydraVideoSourceInput = string | Blob | MediaSource
export type HydraImageSourceInput = string | Blob
export type HydraScreenSourceInput = DisplayMediaStreamOptions | number

export interface PatchBayAdapter {
  initSource(name: string): void
  on(event: string, callback: (nick: string, video: HTMLVideoElement) => void): (() => void) | void
  off?: (event: string, callback: (nick: string, video: HTMLVideoElement) => void) => void
}

type Cleanup = () => void

const isBlob = (value: unknown): value is Blob =>
  typeof Blob !== 'undefined' && value instanceof Blob

const isMediaSource = (value: unknown): value is MediaSource =>
  typeof MediaSource !== 'undefined' && value instanceof MediaSource

const createObjectUrl = (source: Blob | MediaSource): string => {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('Hydra: local File/Blob media sources require URL.createObjectURL support.')
  }

  return URL.createObjectURL(source)
}

const revokeObjectUrl = (url: string): void => {
  if (typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') return
  URL.revokeObjectURL(url)
}

const warnIfLocalDiskPath = (source: string, mediaType: 'image' | 'video'): void => {
  const trimmed = source.trim()
  const looksLikeLocalPath = (
    /^file:/iu.test(trimmed) ||
    /^[A-Za-z]:(?:[\\/]|[^/\\])/u.test(trimmed) ||
    /^\\\\/u.test(trimmed)
  )

  if (!looksLikeLocalPath) return
  console.warn(
    `Hydra: browsers cannot load local disk ${mediaType} paths directly. ` +
    'Use a URL served by the dev server or pass a File/Blob from a file picker.'
  )
}

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

  constructor({ renderer, pb, label = '' }: { renderer: WebGPURenderer | null, pb: PatchBayAdapter | null, label?: string }) {
    this.renderer = renderer
    this.pb = pb
    this.label = label
  }

  attachRenderer(renderer: WebGPURenderer): void {
    this.renderer = renderer
    this.ensureTexture(1, 1)
    this.needsUpload = true
  }

  init(opts: SourceInitOptions = {}, params: StreamInitParams = {}): void {
    if (this.disposed) return
    this.clearRegisteredCleanups()
    if ('dynamic' in opts && typeof opts.dynamic === 'boolean') this.dynamic = opts.dynamic
    if ('src' in opts && opts.src) {
      this.src = opts.src
      this.flipY = Boolean(params.flipY)
      this.needsUpload = true
      this.uploadedStatic = false
    }
  }

  initVideo(source: HydraVideoSourceInput = '', params: StreamInitParams = {}): void {
    if (this.disposed) return
    this.clearRegisteredCleanups()
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.autoplay = true
    video.loop = true
    video.muted = true
    video.playsInline = true

    let objectUrl: string | null = null
    if (isBlob(source) || isMediaSource(source)) {
      objectUrl = createObjectUrl(source)
      video.src = objectUrl
    } else {
      const url = typeof source === 'string' ? source : ''
      warnIfLocalDiskPath(url, 'video')
      video.src = url
    }

    const loaded = (): void => {
      if (this.disposed) return
      this.src = video
      this.flipY = Boolean(params.flipY)
      this.dynamic = true
      this.needsUpload = true
      this.uploadedStatic = false
      void video.play().catch(() => { })
    }

    this.listen(video, 'loadeddata', loaded)
    this.registerCleanup(() => {
      video.pause()
      video.src = ''
      video.load()
      if (objectUrl) revokeObjectUrl(objectUrl)
    })
  }

  initImage(source: HydraImageSourceInput = '', params: StreamInitParams = {}): void {
    if (this.disposed) return
    this.clearRegisteredCleanups()
    const image = document.createElement('img')
    image.crossOrigin = 'anonymous'
    let objectUrl: string | null = null
    if (isBlob(source)) {
      objectUrl = createObjectUrl(source)
      image.src = objectUrl
    } else {
      const url = typeof source === 'string' ? source : ''
      warnIfLocalDiskPath(url, 'image')
      image.src = url
    }
    const loaded = (): void => {
      if (this.disposed) return
      this.src = image
      this.flipY = Boolean(params.flipY)
      this.dynamic = false
      this.needsUpload = true
      this.uploadedStatic = false
    }
    this.listen(image, 'load', loaded)
    if (objectUrl) this.registerCleanup(() => revokeObjectUrl(objectUrl))
  }

  initStream(streamName: string, params: StreamInitParams = {}): void {
    if (!streamName || !this.pb || this.disposed) return
    this.clearRegisteredCleanups()
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

  async initScreen(
    optionsOrIndex?: HydraScreenSourceInput,
    params: StreamInitParams = {}
  ): Promise<void> {
    if (this.disposed) return
    this.clearRegisteredCleanups()

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('Hydra: screen capture requires navigator.mediaDevices.getDisplayMedia support.')
    }

    const displayOptions: DisplayMediaStreamOptions = (
      optionsOrIndex &&
      typeof optionsOrIndex === 'object' &&
      Object.keys(optionsOrIndex).length > 0
    )
      ? optionsOrIndex
      : {
          video: true,
          audio: false
        }

    const stream = await navigator.mediaDevices.getDisplayMedia(displayOptions)
    if (this.disposed) {
      stream.getTracks().forEach((track) => track.stop())
      return
    }

    const video = document.createElement('video')
    video.autoplay = true
    video.muted = true
    video.playsInline = true
    video.srcObject = stream

    const ready = new Promise<void>((resolve, reject) => {
      const cleanup = (): void => {
        video.removeEventListener('loadedmetadata', onReady)
        video.removeEventListener('loadeddata', onReady)
        video.removeEventListener('error', onError)
      }
      const onReady = (): void => {
        cleanup()
        resolve()
      }
      const onError = (): void => {
        cleanup()
        reject(new Error('Hydra: screen source video failed to load.'))
      }
      video.addEventListener('loadedmetadata', onReady, { once: true })
      video.addEventListener('loadeddata', onReady, { once: true })
      video.addEventListener('error', onError, { once: true })
    })

    this.registerCleanup(() => {
      stream.getTracks().forEach((track) => track.stop())
      video.pause()
      video.srcObject = null
    })

    await ready
    await video.play()

    this.src = video
    this.flipY = Boolean(params.flipY)
    this.dynamic = true
    this.needsUpload = true
    this.uploadedStatic = false
  }

  async initCam(
    constraintsOrId?: MediaStreamConstraints | number | string
  ): Promise<void> {
    if (this.disposed) return
    this.clearRegisteredCleanups()

    let constraints: MediaStreamConstraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: false
    }

    if (typeof constraintsOrId === 'number') {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter((d) => d.kind === 'videoinput')
        const device = videoDevices[constraintsOrId]
        if (device && device.deviceId) {
          constraints = {
            video: {
              deviceId: { exact: device.deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          }
        }
      } catch (err) {
        console.warn('Hydra: failed to enumerate devices for initCam index', err)
      }
    } else if (typeof constraintsOrId === 'object') {
      // If the user passed a MediaStreamConstraints object (e.g. { video: { ... } }), use it.
      // If they passed a simple object with { facingMode: ... }, wrap it.
      if ('video' in constraintsOrId || 'audio' in constraintsOrId) {
        constraints = constraintsOrId
      } else {
        constraints = {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            ...(constraintsOrId as MediaTrackConstraints)
          },
          audio: false
        }
      }
    } else if (typeof constraintsOrId === 'string') {
      constraints = {
        video: {
          deviceId: { exact: constraintsOrId },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      if (this.disposed) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      const video = document.createElement('video')
      video.autoplay = true
      video.muted = true
      video.playsInline = true
      video.srcObject = stream

      // Keep track of the stream to stop it later
      this.registerCleanup(() => {
        stream.getTracks().forEach((t) => t.stop())
        video.srcObject = null
      })

      await video.play()

      this.src = video
      this.dynamic = true
      this.needsUpload = true
      this.uploadedStatic = false
      this.flipY = false // Webcams are usually mirrored in user-facing mode, but Hydra conventionally flips texture coords? 
      // Actually, let's default to typical webcam behavior. simpler to flip geometry if needed. 
    } catch (err) {
      console.error('Hydra: initCam failed', err)
    }
  }

  initCanvas(width = 1000, height = 1000): CanvasRenderingContext2D {
    if (!this.canvases[this.label]) {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Failed to create 2D canvas context for Hydra source.')
      this.canvases[this.label] = context
    }

    const context = this.canvases[this.label]
    if (!context) throw new Error('Failed to retrieve 2D canvas context.')

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

  private registerCleanup(cleanup: Cleanup): void {
    this.cleanups.push(cleanup)
  }

  private clearRegisteredCleanups(): void {
    while (this.cleanups.length > 0) {
      const cleanup = this.cleanups.pop()
      if (!cleanup) continue
      try {
        cleanup()
      } catch {
        // Cleanup should not block source reconfiguration.
      }
    }
  }

  private listen(
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

  private getSourceSize(): { width: number, height: number } {
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

  private ensureTexture(width: number, height: number): void {
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

  clear(): void {
    if (this.src && 'srcObject' in this.src && this.src.srcObject && 'getTracks' in this.src.srcObject) {
      this.src.srcObject.getTracks().forEach((track) => track.stop())
    }

    this.clearRegisteredCleanups()
    this.src = null
    this.dynamic = true
    this.needsUpload = false
    this.uploadedStatic = false
    this.ensureTexture(1, 1)
  }

  private uploadSource(): void {
    if (!this.renderer || !this.renderer.ready || !this.renderer.device || !this.src) return

    const { width, height } = this.getSourceSize()
    if (width <= 0 || height <= 0) return

    this.ensureTexture(width, height)
    if (!this.texture) return

    const queue = this.renderer.device.queue as unknown as { copyExternalImageToTexture: (source: object, dest: object, size: object) => void }
    queue.copyExternalImageToTexture(
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

  tick(_frame: HydraFrameState): void {
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

  getTexture(): GPUTexture | null {
    if (this.texture) return this.texture
    if (this.renderer && this.renderer.ready) return this.renderer.getFallbackTexture()
    return null
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true

    this.clear()

    if (this.texture) this.texture.destroy()
    this.texture = null
    this.textureWidth = 0
    this.textureHeight = 0
    this.renderer = null
  }
}
