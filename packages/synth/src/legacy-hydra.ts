import type { HydraTransformDefinition } from './core/index.js'
import { captureHydraVideo } from './capture/frame-sequence.js'
import { BrowserHost, type BrowserHostOptions } from './runtime/browser-host.js'
import { HydraBrowserRuntime, type HydraBrowserRuntimeOptions } from './runtime/runtime.js'
import { type HydraAudioAnalyzerOptions } from './runtime/audio-input.js'
import { WebGPURenderer, type WebGPURendererOptions } from './webgpu/renderer.js'
import type { PatchBayAdapter } from './runtime/source-node.js'
import type { HydraLivecodingCodeRunner } from './livecoding.js'
import { findReferencedOutputIndices } from './runtime/output-reference.js'

export interface HydraLegacyOptions {
  pb?: PatchBayAdapter | null
  width?: number
  height?: number
  numSources?: number
  numOutputs?: number
  maxOutputs?: number
  makeGlobal?: boolean
  autoLoop?: boolean
  detectAudio?: boolean
  audio?: boolean | HydraAudioAnalyzerOptions
  enableStreamCapture?: boolean
  canvas?: HTMLCanvasElement
  parent?: HTMLElement
  precision?: 'lowp' | 'mediump' | 'highp' | string | null
  extendTransforms?: HydraTransformDefinition[] | HydraTransformDefinition
  executionMode?: HydraBrowserRuntimeOptions['executionMode']
  hostOptions?: Omit<BrowserHostOptions, 'canvas' | 'width' | 'height' | 'parent'>
  rendererOptions?: Omit<WebGPURendererOptions, 'canvas'>
  targetGlobal?: Record<string, unknown>
  runCode?: HydraLivecodingCodeRunner
}

export interface LegacyVideoRecorderStartOptions {
  mimeType?: string
  fps?: number
}

export interface LegacyVideoRecorderStopOptions {
  duration?: number
  fps?: number
  bitrate?: number
  download?: boolean
  fileName?: string
}

export interface LegacyVideoRecorderCompat {
  readonly output: HTMLVideoElement | null
  start(options?: LegacyVideoRecorderStartOptions): void
  stop(options?: LegacyVideoRecorderStopOptions): Promise<Blob | null>
}

const defaultHydraFileBaseName = (): string => {
  const date = new Date()
  return `hydra-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}.${date.getMinutes()}.${date.getSeconds()}`
}

const downloadBlob = (blob: Blob, fileName: string): void => {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  setTimeout(() => {
    URL.revokeObjectURL(url)
    anchor.remove()
  }, 300)
}

const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Hydra screenshot failed.'))
    }, 'image/png')
  })

class LegacyVideoRecorder implements LegacyVideoRecorderCompat {
  readonly output: HTMLVideoElement | null

  private readonly runtime: HydraBrowserRuntime
  private readonly stream: MediaStream | null
  private mediaRecorder: MediaRecorder | null = null
  private recordedBlobs: Blob[] = []
  private startedAtMs = 0

  constructor(runtime: HydraBrowserRuntime, stream: MediaStream | null) {
    this.runtime = runtime
    this.stream = stream
    this.output = typeof document !== 'undefined' ? document.createElement('video') : null
    if (this.output) {
      this.output.autoplay = true
      this.output.loop = true
    }
  }

  start(options: LegacyVideoRecorderStartOptions = {}): void {
    this.startedAtMs = typeof performance !== 'undefined' ? performance.now() : Date.now()
    this.recordedBlobs = []

    if (!this.stream || typeof MediaRecorder === 'undefined') return

    const mimeCandidates = [
      options.mimeType,
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ].filter((entry): entry is string => Boolean(entry))

    let recorder: MediaRecorder | null = null
    for (const mimeType of mimeCandidates) {
      try {
        recorder = new MediaRecorder(this.stream, { mimeType })
        break
      } catch {
        // Try the next browser-supported MIME option.
      }
    }
    if (!recorder) recorder = new MediaRecorder(this.stream)

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) this.recordedBlobs.push(event.data)
    }
    this.mediaRecorder = recorder
    recorder.start(100)
  }

  async stop(options: LegacyVideoRecorderStopOptions = {}): Promise<Blob | null> {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      const recorder = this.mediaRecorder
      const blob = await new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          const mimeType = recorder.mimeType || 'video/webm'
          resolve(new Blob(this.recordedBlobs, { type: mimeType }))
        }
        recorder.stop()
      })
      if (this.output && typeof URL !== 'undefined') this.output.src = URL.createObjectURL(blob)
      if (options.download !== false) downloadBlob(blob, options.fileName ?? `${defaultHydraFileBaseName()}.webm`)
      return blob
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const elapsedSeconds = Math.max(0.1, (now - this.startedAtMs) / 1000)
    const duration = options.duration ?? elapsedSeconds
    const blob = await captureHydraVideo({
      runtime: this.runtime,
      duration,
      fps: options.fps ?? 60,
      ...(options.bitrate != null ? { bitrate: options.bitrate } : {})
    })
    if (options.download !== false) downloadBlob(blob, options.fileName ?? `${defaultHydraFileBaseName()}.mp4`)
    return blob
  }
}

export class Hydra {
  readonly runtime: HydraBrowserRuntime
  readonly synth: Record<string, unknown>
  readonly canvas: HTMLCanvasElement
  readonly vidRecorder: LegacyVideoRecorderCompat | null
  readonly captureStream: MediaStream | null

  s: HydraBrowserRuntime['sources']
  o: HydraBrowserRuntime['outputs']
  output: HydraBrowserRuntime['outputs'][number]
  pb: PatchBayAdapter | null
  width: number
  height: number

  private readonly targetGlobal: Record<string, unknown> | null
  private readonly runTrustedCode: HydraLivecodingCodeRunner | null
  private readonly installedGlobalNames = new Set<string>()

  constructor ({
    pb = null,
    width = 1280,
    height = 720,
    numSources = 4,
    numOutputs = 4,
    maxOutputs,
    makeGlobal = true,
    autoLoop = true,
    detectAudio = false,
    audio = detectAudio,
    enableStreamCapture = true,
    canvas,
    parent,
    extendTransforms,
    executionMode,
    hostOptions,
    rendererOptions,
    targetGlobal = globalThis as Record<string, unknown>,
    runCode
  }: HydraLegacyOptions = {}) {
    this.pb = pb
    const host = new BrowserHost({
      canvas,
      width,
      height,
      parent,
      ...hostOptions
    })
    const renderer = new WebGPURenderer({
      canvas: host.canvas,
      ...rendererOptions
    })
    this.runtime = new HydraBrowserRuntime({
      host,
      renderer,
      patchbay: pb,
      numSources,
      numOutputs,
      ...(maxOutputs != null ? { maxOutputs } : {}),
      extendTransforms,
      autoLoop,
      audio,
      detectAudio,
      ...(executionMode ? { executionMode } : {})
    })
    this.synth = this.runtime.synth
    this.canvas = host.canvas
    this.s = this.runtime.sources
    this.o = this.runtime.outputs
    this.output = this.runtime.getActiveOutput()
    this.width = this.canvas.width
    this.height = this.canvas.height
    this.targetGlobal = makeGlobal ? targetGlobal : null
    this.runTrustedCode = runCode ?? null

    this.captureStream = this.createCaptureStream(enableStreamCapture)
    this.vidRecorder = enableStreamCapture ? new LegacyVideoRecorder(this.runtime, this.captureStream) : null
    this.installCompatibilityAliases()
    if (this.targetGlobal) this.installGlobalBindings()
  }

  init(): Promise<void> {
    return this.runtime.init()
  }

  start(): Promise<void> {
    return this.runtime.start()
  }

  stop(): void {
    this.runtime.stop()
  }

  tick(dt?: number): void {
    this.runtime.tick(dt)
  }

  render(output?: HydraBrowserRuntime['outputs'][number]): void {
    this.runtime.render(output)
    this.output = this.runtime.getActiveOutput()
  }

  setResolution(width: number, height: number): void {
    this.runtime.setResolution(width, height)
    this.width = this.canvas.width
    this.height = this.canvas.height
  }

  hush(): void {
    this.runtime.hush()
  }

  createSource(): HydraBrowserRuntime['sources'][number] {
    const source = this.runtime.createSource()
    this.s = this.runtime.sources
    this.installGlobalBinding(source.label)
    return source
  }

  createOutput(): HydraBrowserRuntime['outputs'][number] {
    const output = this.runtime.createOutput()
    this.o = this.runtime.outputs
    this.installGlobalBinding(output.label)
    return output
  }

  ensureOutput(index: number): HydraBrowserRuntime['outputs'][number] {
    const output = this.runtime.ensureOutput(index)
    this.o = this.runtime.outputs
    this.runtime.outputs.forEach((candidate) => this.installGlobalBinding(candidate.label))
    return output
  }

  eval(code: string): unknown {
    if (!this.runTrustedCode) {
      throw new Error('Hydra legacy code execution requires an explicit runCode(code, scope) callback.')
    }
    this.ensureReferencedOutputs(code)
    const scope = this.targetGlobal ?? this.synth
    return this.runTrustedCode(code, scope)
  }

  loadScript(url = ''): Promise<void> {
    if (typeof document === 'undefined') return Promise.resolve()
    return new Promise((resolve) => {
      const script = document.createElement('script')
      script.onload = () => resolve()
      script.onerror = () => resolve()
      script.src = url
      document.head.appendChild(script)
    })
  }

  async getScreenImage(callback?: (blob: Blob) => void): Promise<Blob> {
    const blob = await canvasToBlob(this.canvas)
    if (callback) callback(blob)
    return blob
  }

  async screencap(fileName = `${defaultHydraFileBaseName()}.png`): Promise<Blob> {
    const blob = await this.getScreenImage()
    downloadBlob(blob, fileName)
    return blob
  }

  canvasToImage(callback?: (blob: Blob) => void): Promise<Blob> {
    return this.getScreenImage(callback)
  }

  dispose(): void {
    for (const name of Array.from(this.installedGlobalNames).reverse()) {
      if (this.targetGlobal) delete this.targetGlobal[name]
    }
    this.installedGlobalNames.clear()
    this.runtime.dispose()
  }

  private createCaptureStream(enableStreamCapture: boolean): MediaStream | null {
    if (!enableStreamCapture) return null
    const canvasWithCapture = this.canvas as HTMLCanvasElement & {
      captureStream?: (fps?: number) => MediaStream
    }
    if (typeof canvasWithCapture.captureStream !== 'function') return null
    try {
      return canvasWithCapture.captureStream(60)
    } catch {
      return null
    }
  }

  private installCompatibilityAliases(): void {
    this.synth.createOutput = this.createOutput.bind(this)
    this.synth.ensureOutput = this.ensureOutput.bind(this)
    this.synth.ensureOutputBuffer = this.ensureOutput.bind(this)
    this.synth.setFunction = (definition: HydraTransformDefinition) => {
      const registerFunction = this.synth.registerFunction
      if (typeof registerFunction !== 'function') {
        throw new Error('Hydra transform registration is unavailable.')
      }
      const result = registerFunction(definition)
      this.installGlobalBinding(definition.name)
      return result
    }
    this.synth.screencap = this.screencap.bind(this)
    this.synth.getScreenImage = this.getScreenImage.bind(this)
    this.synth.canvasToImage = this.canvasToImage.bind(this)
    this.synth.loadScript = this.loadScript.bind(this)
    this.synth.vidRecorder = this.vidRecorder
    this.synth.hydra = this.runtime
  }

  private installGlobalBindings(): void {
    if (!this.targetGlobal) return
    for (const name of Object.keys(this.synth)) this.installGlobalBinding(name)
    this.targetGlobal.hydra = this
    this.targetGlobal.hydraSynth = this
    this.installedGlobalNames.add('hydra')
    this.installedGlobalNames.add('hydraSynth')
  }

  private installGlobalBinding(name: string): void {
    if (!this.targetGlobal || !name || this.installedGlobalNames.has(name)) return
    Object.defineProperty(this.targetGlobal, name, {
      configurable: true,
      enumerable: true,
      get: () => this.synth[name],
      set: (value) => {
        this.synth[name] = value
      }
    })
    this.installedGlobalNames.add(name)
  }

  private ensureReferencedOutputs(code: string): void {
    const outputIndices = findReferencedOutputIndices(code)
    if (outputIndices.length === 0) return
    const maxOutputIndex = outputIndices[outputIndices.length - 1]
    if (typeof maxOutputIndex === 'number') this.ensureOutput(maxOutputIndex)
  }
}
