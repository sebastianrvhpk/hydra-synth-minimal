import { HydraEngine } from './core/index.js'
import type {
  HydraAutotuneProfile,
  HydraTuningPolicy,
  HydraCompiledPass,
  HydraDebugEvent,
  HydraEngineBindingHost,
  HydraEngineError,
  HydraEngineErrorType,
  HydraEngineOptions,
  HydraErrorPolicy,
  HydraExecutionPlan,
  HydraFrameState,
  HydraOutputAdapter,
  HydraPassIRNode,
  HydraPassSchedule,
  HydraPassUpdateRate,
  HydraResourceFormat,
  HydraTextureProvider,
  HydraTransformCall,
  HydraTransformDefinition,
  RendererAdapter,
  ScriptPlugin,
  SourceAdapter
} from './core/index.js'

export { HydraEngine }
export type {
  HydraAutotuneProfile,
  HydraTuningPolicy,
  HydraCompiledPass,
  HydraDebugEvent,
  HydraEngineBindingHost,
  HydraEngineError,
  HydraEngineErrorType,
  HydraEngineOptions,
  HydraErrorPolicy,
  HydraExecutionPlan,
  HydraFrameState,
  HydraOutputAdapter,
  HydraPassIRNode,
  HydraPassSchedule,
  HydraPassUpdateRate,
  HydraResourceFormat,
  HydraTextureProvider,
  HydraTransformCall,
  HydraTransformDefinition,
  RendererAdapter,
  ScriptPlugin,
  SourceAdapter
}

export type HydraRuntimeExecutionMode = 'fragment' | 'auto'

export interface BrowserHostOptions {
  canvas?: HTMLCanvasElement
  width?: number
  height?: number
  parent?: HTMLElement
  autoAppend?: boolean
}

export interface CanvasDisplayOptions {
  nativeSize?: boolean
}

export interface AttachLivecodingOptions {
  targetGlobal?: Record<string, unknown>
  allowedBindings?: string[]
  exposeHelpers?: boolean | Record<string, unknown>
  runCode?: HydraLivecodingCodeRunner
}

export type HydraLivecodingCodeRunner = (code: string, scope: Record<string, unknown>) => unknown

export interface LivecodingSession {
  run (code: string): unknown
  syncFromGlobal (): void
  syncFromEngine (): void
  dispose (): void
}

export declare class BrowserHost {
  readonly canvas: HTMLCanvasElement
  readonly ownsCanvas: boolean
  constructor (options?: BrowserHostOptions)
  append (): void
  get isRunning (): boolean
  start (onFrame: (deltaMs: number) => void): void
  stop (): void
  setResolution (width: number, height: number): void
  dispose (): void
}

export const WEBGPU_UNAVAILABLE_MESSAGE: string

export interface WebGPURendererOptions {
  canvas: HTMLCanvasElement
  width?: number
  height?: number
}

export interface WebGPUFragmentCapabilities {
  targetFormat: GPUTextureFormat
  maxColorAttachments: number
}

export interface WebGPUCapabilities {
  fragment: WebGPUFragmentCapabilities
  features: string[]
}

export declare class WebGPURenderer {
  readonly canvas: HTMLCanvasElement
  width: number
  height: number
  ready: boolean
  initError: unknown
  adapter: GPUAdapter | null
  device: GPUDevice | null
  context: GPUCanvasContext | null
  canvasFormat: GPUTextureFormat | null
  globalUniformBuffer: GPUBuffer | null
  linearSampler: GPUSampler | null
  fallbackTexture: GPUTexture | null
  capabilities: WebGPUCapabilities | null
  constructor (options: WebGPURendererOptions)
  static assertSupport (): void
  init (): Promise<this>
  setResolution (width: number, height: number): void
  updateGlobalUniforms (state: { time: number, bpm: number, width?: number, height?: number }): void
  createOutputTexture (
    options?: {
      width?: number,
      height?: number,
      depthOrArrayLayers?: number,
      label?: string,
      format?: GPUTextureFormat,
      includeRenderAttachment?: boolean
    }
  ): GPUTexture
  createDynamicUniformBuffer (label: string): GPUBuffer
  createReadbackBuffer (label: string, byteLength: number): GPUBuffer
  getCapabilities (): WebGPUCapabilities | null
  getFallbackTexture (): GPUTexture
  getOutputPipelineEntry (signature: string, code: string): unknown
  getObjectId (value: object | null | undefined): number
  getTextureView (texture: GPUTexture, dimension?: GPUTextureViewDimension): GPUTextureView
  beginFrame (): GPUCommandEncoder | null
  submitFrame (encoder: GPUCommandEncoder | null): void
  renderTextureToScreen (encoder: GPUCommandEncoder, texture: GPUTexture | null): void
  renderAllOutputsToScreen (encoder: GPUCommandEncoder, textures?: GPUTexture[]): void
  dispose (): void
}

export interface PatchBayAdapter {
  initSource (name: string): void
  on (event: string, callback: (nick: string, video: HTMLVideoElement) => void): (() => void) | void
  off?: (event: string, callback: (nick: string, video: HTMLVideoElement) => void) => void
}

export type HydraVideoSourceInput = string | Blob | MediaSource
export type HydraImageSourceInput = string | Blob
export type HydraScreenSourceInput = DisplayMediaStreamOptions | number

export interface HydraMouseModifiers {
  shift: boolean
  alt: boolean
  control: boolean
  meta: boolean
}

export interface HydraMouseState {
  readonly element: EventTarget | null
  enabled: boolean
  readonly x: number
  readonly y: number
  readonly speed: number
  readonly acceleration: number
  readonly jerk: number
  readonly speedSmooth: number
  readonly accelerationSmooth: number
  readonly jerkSmooth: number
  readonly dragDistance: number
  readonly dragTravel: number
  readonly dragDuration: number
  readonly hold: number
  readonly pressure: number
  readonly inside: number
  readonly pixelX: number
  readonly pixelY: number
  readonly uvX: number
  readonly uvY: number
  readonly velocityX: number
  readonly velocityY: number
  readonly accelerationX: number
  readonly accelerationY: number
  readonly jerkX: number
  readonly jerkY: number
  readonly buttons: number
  readonly down: boolean
  readonly dragActive: boolean
  readonly pointerType: string
  readonly mods: HydraMouseModifiers
  reset: () => void
}

export interface HydraMouseInputOptions {
  element?: EventTarget | null
  rootTarget?: EventTarget | null
  enabled?: boolean
}

export interface HydraMouseController {
  readonly state: HydraMouseState
  dispose: () => void
}

export interface HydraAudioBandSettings {
  cutoff: number
  scale: number
  smooth: number
}

export interface HydraAudioBeatState {
  holdFrames: number
  threshold: number
  _cutoff: number
  decay: number
  _framesSinceBeat: number
}

export type HydraAudioSource = MediaStream | HTMLMediaElement | AudioNode

export interface HydraAudioAnalyzerOptions {
  numBins?: number
  cutoff?: number
  smooth?: number
  max?: number
  scale?: number
  fftSize?: number
  minDecibels?: number
  maxDecibels?: number
  smoothingTimeConstant?: number
  context?: AudioContext
  source?: HydraAudioSource
  isDrawing?: boolean
  parentEl?: HTMLElement
  autostart?: boolean
}

export declare class HydraAudioAnalyzer {
  vol: number
  rms: number
  peak: number
  centroid: number
  low: number
  mid: number
  high: number
  fft: number[]
  bins: number[]
  prevBins: number[]
  waveform: number[]
  settings: HydraAudioBandSettings[]
  beat: HydraAudioBeatState
  onBeat: () => void
  isDrawing: boolean
  canvas: HTMLCanvasElement | null
  constructor (options?: HydraAudioAnalyzerOptions)
  get ready (): boolean
  start (source?: HydraAudioSource): Promise<void>
  connect (source: HydraAudioSource): Promise<void>
  stop (): void
  tick (): void
  updateFromFrequencyData (frequencyData: ArrayLike<number>, timeDomainData?: ArrayLike<number>): void
  detectBeat (level: number): void
  setCutoff (cutoff: number): void
  setSmooth (smooth: number): void
  setScale (scale: number): void
  setMax (max: number): void
  setBins (numBins: number): void
  getBand (index: number, scale?: number, offset?: number): () => number
  attachBindings (bindings: Record<string, unknown>): void
  detachBindings (bindings: Record<string, unknown>): void
  show (): void
  hide (): void
  dispose (): void
}

export declare class HydraSourceNode implements SourceAdapter, HydraTextureProvider {
  readonly label: string
  constructor (options: { renderer: WebGPURenderer | null, pb: PatchBayAdapter | null, label?: string })
  attachRenderer (renderer: WebGPURenderer): void
  init (
    opts?: { src?: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement, dynamic?: boolean },
    params?: { flipY?: boolean }
  ): void
  initVideo (source?: HydraVideoSourceInput, params?: { flipY?: boolean }): void
  initImage (source?: HydraImageSourceInput, params?: { flipY?: boolean }): void
  initStream (streamName: string, params?: { flipY?: boolean }): void
  initScreen (optionsOrIndex?: DisplayMediaStreamOptions | number, params?: { flipY?: boolean }): Promise<void>
  initCanvas (width?: number, height?: number): CanvasRenderingContext2D
  clear (): void
  tick (frame: HydraFrameState): void
  getTexture (): GPUTexture | null
  dispose (): void
}

export declare class WebGPUOutputNode implements HydraOutputAdapter {
  readonly label: string
  id: number
  constructor (options: { renderer: WebGPURenderer | null, label?: string, width: number, height: number })
  setPipelineErrorHandler (
    handler: ((context: { outputLabel: string, passIndex: number, signature: string, error: unknown }) => void) | null
  ): void
  emitEvent (name: string): void
  attachRenderer (renderer: WebGPURenderer): void
  resize (width: number, height: number): void
  getCurrent (): GPUTexture | null
  getTexture (): GPUTexture | null
  getDependencyOutputIds (): number[]
  render (passes: HydraCompiledPass[]): void
  tick (props: HydraFrameState, encoder: GPUCommandEncoder | null): void
  dispose (): void
}

export interface HydraBrowserRuntimeOptions {
  host: BrowserHost
  renderer: WebGPURenderer
  patchbay?: PatchBayAdapter | null
  numSources?: number
  numOutputs?: number
  extendTransforms?: HydraTransformDefinition[] | HydraTransformDefinition
  autoLoop?: boolean
  audio?: boolean | HydraAudioAnalyzerOptions
  detectAudio?: boolean
  fps?: number
  speed?: number
  bpm?: number
  mouse?: boolean | HydraMouseInputOptions
  executionMode?: HydraRuntimeExecutionMode
  errorPolicy?: HydraErrorPolicy
  onError?: (error: HydraEngineError) => void
  onDebug?: (event: HydraDebugEvent) => void
}

export declare class HydraBrowserRuntime {
  readonly host: BrowserHost
  readonly renderer: WebGPURenderer
  readonly engine: HydraEngine
  readonly outputs: WebGPUOutputNode[]
  readonly sources: HydraSourceNode[]
  readonly synth: Record<string, unknown>
  readonly mouse: HydraMouseState
  readonly audio: HydraAudioAnalyzer
  capabilities: WebGPUCapabilities | null
  constructor (options: HydraBrowserRuntimeOptions)
  get bindings (): Readonly<Record<string, unknown>>
  init (): Promise<void>
  start (): Promise<void>
  stop (): void
  tick (deltaMs?: number): void
  emitEvent (name: string): void
  render (output?: WebGPUOutputNode): void
  getActiveOutput (): WebGPUOutputNode
  isRenderAllEnabled (): boolean
  setResolution (width: number, height: number): void
  setCanvasDisplay (width: number, height: number, options?: CanvasDisplayOptions): void
  resetCanvasDisplay (): void
  createSource (): HydraSourceNode
  getExecutionMode (): HydraRuntimeExecutionMode
  setExecutionMode (mode: HydraRuntimeExecutionMode | string): HydraRuntimeExecutionMode
  compilePlan (graphNode: { transforms?: HydraTransformCall[] } | null | undefined): HydraExecutionPlan | null
  executePlan (
    graphNode: { transforms?: HydraTransformCall[] } | null | undefined,
    output?: WebGPUOutputNode,
    options?: Record<string, unknown>
  ): HydraExecutionPlan | null
  getProfilerSnapshot (): unknown
  autotune (options?: {
    profileKey?: string,
    policy?: HydraTuningPolicy,
    candidateProfiles?: string[],
    kernelSignature?: string
  }): HydraAutotuneProfile
  getAutotuneProfile (profileKey?: string): HydraAutotuneProfile | null
  setTuningPolicy (policy: HydraTuningPolicy): void
  clearAutotuneProfiles (profileKey?: string): void
  dumpShaders (): string[]
  hush (): void
  attachPlugin (plugin: ScriptPlugin): () => void
  dispose (): void
}

export type CaptureFrameSequenceExtension = 'png' | 'jpg' | 'jpeg' | 'webp'

export interface CaptureFrameSequenceFrameInfo {
  frame: number
  totalFrames: number
  fps: number
  time: number
  deltaTime: number
  playhead: number
  duration: number
  width: number
  height: number
  canvas: HTMLCanvasElement
}

export interface CaptureFrameSequenceBlobInfo {
  frame: number
  frameNumber: number
  totalFrames: number
  fileName: string
  blob: Blob
}

export interface CaptureFrameSequenceProgressInfo {
  frame: number
  frameNumber: number
  totalFrames: number
  fileName: string
  percent: number
}

export interface CaptureFrameSequenceResult {
  fps: number
  width: number
  height: number
  totalFrames: number
  duration: number
  prefix: string
  extension: 'png' | 'jpg' | 'webp'
  ffmpegPattern: string
}

export interface CaptureFrameSequenceOptions {
  canvas: HTMLCanvasElement
  step: (info: CaptureFrameSequenceFrameInfo) => void | Promise<void>
  fps?: number
  duration?: number
  totalFrames?: number
  width?: number
  height?: number
  prefix?: string
  extension?: CaptureFrameSequenceExtension
  quality?: number
  directoryHandle?: FileSystemDirectoryHandle | null
  pickDirectory?: boolean
  downloadFallback?: boolean
  waitForRAF?: boolean
  signal?: AbortSignal
  onFrameBlob?: (info: CaptureFrameSequenceBlobInfo) => void | Promise<void>
  onProgress?: (info: CaptureFrameSequenceProgressInfo) => void
}

export interface CaptureHydraFrameSequenceFrameInfo extends CaptureFrameSequenceFrameInfo {
  runtime: HydraBrowserRuntime
  synth: Record<string, unknown>
}

export interface CaptureFrameSequenceBufferInfo {
  frame: number
  totalFrames: number
  data: ArrayBuffer
  width: number
  height: number
  format: 'rgba16float' | 'rgba8unorm'
  bytesPerRow: number
}

export interface CaptureHydraFrameSequenceOptions extends Omit<CaptureFrameSequenceOptions, 'canvas' | 'step'> {
  runtime: HydraBrowserRuntime
  output?: WebGPUOutputNode
  step?: (info: CaptureHydraFrameSequenceFrameInfo) => void | Promise<void>
  waitForGPU?: boolean
  resumeAfterCapture?: boolean
  restoreResolution?: boolean
  ignoreEngineFpsGate?: boolean
  gpuReadback?: boolean | 'auto'
  readbackFormat?: 'rgba16float' | 'rgba8unorm'
  onFrameBuffer?: (info: CaptureFrameSequenceBufferInfo) => void | Promise<void>
}

export interface VideoRecorderOptions {
  width: number
  height: number
  fps: number
  bitrate?: number
  maxEncodeQueue?: number
}

export interface CaptureVideoOptions extends Omit<VideoRecorderOptions, 'width' | 'height' | 'fps'> {
  canvas: HTMLCanvasElement
  step: (info: CaptureFrameSequenceFrameInfo) => void | Promise<void>
  duration: number
  fps?: number
  width?: number
  height?: number
  signal?: AbortSignal
  onProgress?: (percent: number) => void
  realtime?: boolean
}

export interface CaptureHydraVideoOptions extends Omit<CaptureVideoOptions, 'canvas' | 'step' | 'width' | 'height'> {
  runtime: HydraBrowserRuntime
  output?: WebGPUOutputNode
  step?: (info: CaptureHydraFrameSequenceFrameInfo) => void | Promise<void>
  waitForGPU?: boolean
  resumeAfterCapture?: boolean
  restoreResolution?: boolean
  ignoreEngineFpsGate?: boolean
  width?: number
  height?: number
}

export declare const captureFrameSequence: (options: CaptureFrameSequenceOptions) => Promise<CaptureFrameSequenceResult>
export declare const captureHydraFrameSequence: (
  options: CaptureHydraFrameSequenceOptions
) => Promise<CaptureFrameSequenceResult>
export declare const captureVideo: (options: CaptureVideoOptions) => Promise<Blob>
export declare const captureHydraVideo: (options: CaptureHydraVideoOptions) => Promise<Blob>

export interface HydraLegacyOptions {
  pb?: PatchBayAdapter | null
  width?: number
  height?: number
  numSources?: number
  numOutputs?: number
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

export declare class Hydra {
  readonly runtime: HydraBrowserRuntime
  readonly synth: Record<string, unknown>
  readonly canvas: HTMLCanvasElement
  readonly vidRecorder: LegacyVideoRecorderCompat | null
  readonly captureStream: MediaStream | null
  s: HydraSourceNode[]
  o: WebGPUOutputNode[]
  output: WebGPUOutputNode
  pb: PatchBayAdapter | null
  width: number
  height: number
  constructor (options?: HydraLegacyOptions)
  init (): Promise<void>
  start (): Promise<void>
  stop (): void
  tick (dt?: number): void
  render (output?: WebGPUOutputNode): void
  setResolution (width: number, height: number): void
  hush (): void
  createSource (): HydraSourceNode
  eval (code: string): unknown
  loadScript (url?: string): Promise<void>
  getScreenImage (callback?: (blob: Blob) => void): Promise<Blob>
  screencap (fileName?: string): Promise<Blob>
  canvasToImage (callback?: (blob: Blob) => void): Promise<Blob>
  dispose (): void
}

export interface CreateHydraBrowserRuntimeOptions extends Omit<HydraBrowserRuntimeOptions, 'host' | 'renderer'> {
  host?: BrowserHost
  hostOptions?: BrowserHostOptions
  renderer?: WebGPURenderer
  rendererOptions?: Omit<WebGPURendererOptions, 'canvas'>
}

export declare const createBrowserHost: (options?: BrowserHostOptions) => BrowserHost
export declare const createWebGPURenderer: (
  host: BrowserHost,
  options?: Omit<WebGPURendererOptions, 'canvas'>
) => WebGPURenderer
export declare const createHydraBrowserRuntime: (options?: CreateHydraBrowserRuntimeOptions) => HydraBrowserRuntime
export declare const attachLivecoding: (
  engine: HydraEngineBindingHost,
  options?: AttachLivecodingOptions
) => LivecodingSession
export declare const createLivecodingPlugin: (options?: AttachLivecodingOptions) => ScriptPlugin
export default Hydra
