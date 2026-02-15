import {
  type HydraAnalysisOutputBinding,
  type HydraDispatchDomain,
  type HydraDispatchConfig,
  HydraEngine,
  type HydraEngineBindingHost,
  type HydraEngineError,
  type HydraEngineErrorType,
  type HydraEngineOptions,
  type HydraErrorPolicy,
  type HydraFrameState,
  type HydraPassIRNode,
  type HydraPassSchedule,
  type HydraPassUpdateRate,
  type RendererAdapter,
  type HydraResourceAccess,
  type HydraResourceElementType,
  type HydraResourceFormat,
  type HydraResourceLifetime,
  type HydraStorageBufferBinding,
  type HydraStorageTextureBinding,
  type HydraTransformResource,
  type ScriptPlugin,
  type SourceAdapter
} from 'hydra-synth-core'
import {
  buildFfmpegCommands,
  captureFrameSequence,
  captureHydraFrameSequence,
  type BuildFfmpegCommandsOptions,
  type CaptureFrameSequenceBlobInfo,
  type CaptureFrameSequenceExtension,
  type CaptureFrameSequenceFrameInfo,
  type CaptureFrameSequenceOptions,
  type CaptureFrameSequenceProgressInfo,
  type CaptureFrameSequenceResult,
  type CaptureHydraFrameSequenceFrameInfo,
  type CaptureHydraFrameSequenceOptions,
  type FfmpegCommandSet
} from './capture/frame-sequence.js'
import { BrowserHost, type BrowserHostOptions } from './runtime/browser-host.js'
import { HydraBrowserRuntime, type HydraBrowserRuntimeOptions } from './runtime/runtime.js'
import { WebGPUOutputNode } from './runtime/output-node.js'
import { HydraSourceNode, type PatchBayAdapter } from './runtime/source-node.js'
import {
  WEBGPU_UNAVAILABLE_MESSAGE,
  WebGPURenderer,
  type WebGPUCapabilities,
  type WebGPUComputeCapabilities,
  type WebGPUStorageCapabilities,
  type WebGPURendererOptions,
  type WebGPUSubgroupCapabilities
} from './webgpu/renderer.js'

export { HydraEngine }
export type {
  HydraAnalysisOutputBinding,
  HydraDispatchDomain,
  HydraDispatchConfig,
  HydraEngineBindingHost,
  HydraEngineError,
  HydraEngineErrorType,
  HydraEngineOptions,
  HydraErrorPolicy,
  HydraFrameState,
  HydraPassIRNode,
  HydraPassSchedule,
  HydraPassUpdateRate,
  HydraResourceAccess,
  HydraResourceElementType,
  HydraResourceFormat,
  HydraResourceLifetime,
  HydraStorageBufferBinding,
  HydraStorageTextureBinding,
  HydraTransformResource,
  RendererAdapter,
  ScriptPlugin,
  SourceAdapter,
  BuildFfmpegCommandsOptions,
  CaptureFrameSequenceBlobInfo,
  CaptureFrameSequenceExtension,
  CaptureFrameSequenceFrameInfo,
  CaptureFrameSequenceOptions,
  CaptureFrameSequenceProgressInfo,
  CaptureFrameSequenceResult,
  CaptureHydraFrameSequenceFrameInfo,
  CaptureHydraFrameSequenceOptions,
  FfmpegCommandSet,
  WebGPUCapabilities,
  WebGPUComputeCapabilities,
  WebGPUStorageCapabilities,
  WebGPUSubgroupCapabilities
}

export { WEBGPU_UNAVAILABLE_MESSAGE, WebGPURenderer, BrowserHost, HydraBrowserRuntime, HydraSourceNode, WebGPUOutputNode }
export type { BrowserHostOptions, HydraBrowserRuntimeOptions, PatchBayAdapter, WebGPURendererOptions }
export { captureFrameSequence, captureHydraFrameSequence, buildFfmpegCommands }

export interface CreateHydraBrowserRuntimeOptions extends Omit<HydraBrowserRuntimeOptions, 'host' | 'renderer'> {
  host?: BrowserHost
  hostOptions?: BrowserHostOptions
  renderer?: WebGPURenderer
  rendererOptions?: Omit<WebGPURendererOptions, 'canvas'>
}

export const createBrowserHost = (options?: BrowserHostOptions): BrowserHost => new BrowserHost(options)

export const createWebGPURenderer = (
  host: BrowserHost,
  options?: Omit<WebGPURendererOptions, 'canvas'>
): WebGPURenderer => new WebGPURenderer({ canvas: host.canvas, ...options })

export const createHydraBrowserRuntime = (options: CreateHydraBrowserRuntimeOptions = {}): HydraBrowserRuntime => {
  const host = options.host ?? createBrowserHost(options.hostOptions)
  const renderer = options.renderer ?? createWebGPURenderer(host, options.rendererOptions)
  return new HydraBrowserRuntime({
    ...options,
    host,
    renderer
  })
}
