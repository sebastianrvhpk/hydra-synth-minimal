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
  constructor (options: WebGPURendererOptions)
  static assertSupport (): void
  init (): Promise<this>
  setResolution (width: number, height: number): void
  updateGlobalUniforms (state: { time: number, bpm: number, width?: number, height?: number }): void
  createOutputTexture (options?: { width?: number, height?: number, label?: string }): GPUTexture
  createDynamicUniformBuffer (label: string): GPUBuffer
  getFallbackTexture (): GPUTexture
  getOutputPipelineEntry (signature: string, code: string): unknown
  getObjectId (value: object | null | undefined): number
  getTextureView (texture: GPUTexture): GPUTextureView
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
  constructor (options: HydraBrowserRuntimeOptions)
  get bindings (): Readonly<Record<string, unknown>>
  init (): Promise<void>
  start (): Promise<void>
  stop (): void
  tick (deltaMs?: number): void
  render (output?: WebGPUOutputNode): void
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

export interface BuildFfmpegCommandsOptions {
  fps: number
  ffmpegPattern: string
  outputBaseName?: string
}

export interface FfmpegCommandSet {
  mp4: string
  gif: string
  webm: string
}

export declare const captureFrameSequence: (options: CaptureFrameSequenceOptions) => Promise<CaptureFrameSequenceResult>
export declare const captureHydraFrameSequence: (
  options: CaptureHydraFrameSequenceOptions
) => Promise<CaptureFrameSequenceResult>
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
