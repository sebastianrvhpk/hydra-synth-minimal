import { HydraEngine } from 'hydra-synth-core'
import type {
  HydraCompiledPass,
  HydraEngineBindingHost,
  HydraEngineError,
  HydraEngineErrorType,
  HydraEngineOptions,
  HydraErrorPolicy,
  HydraFrameState,
  HydraOutputAdapter,
  HydraPassIRNode,
  HydraPassSchedule,
  HydraPassUpdateRate,
  HydraResourceFormat,
  HydraTextureProvider,
  HydraTransformDefinition,
  RendererAdapter,
  ScriptPlugin,
  SourceAdapter
} from 'hydra-synth-core'

export { HydraEngine }
export type {
  HydraCompiledPass,
  HydraEngineBindingHost,
  HydraEngineError,
  HydraEngineErrorType,
  HydraEngineOptions,
  HydraErrorPolicy,
  HydraFrameState,
  HydraOutputAdapter,
  HydraPassIRNode,
  HydraPassSchedule,
  HydraPassUpdateRate,
  HydraResourceFormat,
  HydraTextureProvider,
  HydraTransformDefinition,
  RendererAdapter,
  ScriptPlugin,
  SourceAdapter
}

export interface BrowserHostOptions {
  canvas?: HTMLCanvasElement
  width?: number
  height?: number
  parent?: HTMLElement
  autoAppend?: boolean
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
  readonly pixelX: number
  readonly pixelY: number
  readonly normX: number
  readonly normY: number
  readonly uvX: number
  readonly uvY: number
  readonly buttons: number
  readonly down: boolean
  readonly inside: boolean
  readonly pressure: number
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

export declare class HydraSourceNode implements SourceAdapter, HydraTextureProvider {
  readonly label: string
  constructor (options: { renderer: WebGPURenderer | null, pb: PatchBayAdapter | null, label?: string })
  attachRenderer (renderer: WebGPURenderer): void
  init (
    opts?: { src?: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement, dynamic?: boolean },
    params?: { flipY?: boolean }
  ): void
  initVideo (url?: string, params?: { flipY?: boolean }): void
  initImage (url?: string, params?: { flipY?: boolean }): void
  initStream (streamName: string, params?: { flipY?: boolean }): void
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
  fps?: number
  speed?: number
  bpm?: number
  mouse?: boolean | HydraMouseInputOptions
  errorPolicy?: HydraErrorPolicy
  onError?: (error: HydraEngineError) => void
}

export declare class HydraBrowserRuntime {
  readonly host: BrowserHost
  readonly renderer: WebGPURenderer
  readonly engine: HydraEngine
  readonly outputs: WebGPUOutputNode[]
  readonly sources: HydraSourceNode[]
  readonly synth: Record<string, unknown>
  readonly mouse: HydraMouseState
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
  createSource (): HydraSourceNode
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

export interface CaptureHydraFrameSequenceOptions extends Omit<CaptureFrameSequenceOptions, 'canvas' | 'step'> {
  runtime: HydraBrowserRuntime
  output?: WebGPUOutputNode
  step?: (info: CaptureHydraFrameSequenceFrameInfo) => void | Promise<void>
  waitForGPU?: boolean
  resumeAfterCapture?: boolean
  restoreResolution?: boolean
  ignoreEngineFpsGate?: boolean
}

export interface VideoRecorderOptions {
  width: number
  height: number
  fps: number
  bitrate?: number
  maxEncodeQueue?: number
}

export interface CaptureVideoOptions extends VideoRecorderOptions {
  canvas: HTMLCanvasElement
  step: (info: CaptureFrameSequenceFrameInfo) => void | Promise<void>
  duration: number
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

export interface BuildFfmpegCommandsOptions {
  fps: number
  ffmpegPattern: string
  outputBaseName?: string
}

export interface FfmpegCommandSet {
  mp4: string
}

export declare const captureFrameSequence: (options: CaptureFrameSequenceOptions) => Promise<CaptureFrameSequenceResult>
export declare const captureHydraFrameSequence: (
  options: CaptureHydraFrameSequenceOptions
) => Promise<CaptureFrameSequenceResult>
export declare const captureVideo: (options: CaptureVideoOptions) => Promise<Blob>
export declare const captureHydraVideo: (options: CaptureHydraVideoOptions) => Promise<Blob>
export declare const buildFfmpegCommands: (options: BuildFfmpegCommandsOptions) => FfmpegCommandSet

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
