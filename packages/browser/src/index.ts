import {
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
  type HydraResourceFormat,
  type ScriptPlugin,
  type SourceAdapter
} from 'hydra-synth-core'
import {
  buildFfmpegCommands,
  captureHydraVideo,
  captureFrameSequence,
  captureHydraFrameSequence,
  captureVideo,
  type BuildFfmpegCommandsOptions,
  type CaptureFrameSequenceBlobInfo,
  type CaptureFrameSequenceExtension,
  type CaptureFrameSequenceFrameInfo,
  type CaptureFrameSequenceOptions,
  type CaptureFrameSequenceProgressInfo,
  type CaptureFrameSequenceResult,
  type CaptureHydraFrameSequenceFrameInfo,
  type CaptureHydraFrameSequenceOptions,
  type CaptureHydraVideoOptions,
  type CaptureVideoOptions,
  type FfmpegCommandSet
} from './capture/frame-sequence.js'
import { BrowserHost, type BrowserHostOptions, type CanvasDisplayOptions } from './runtime/browser-host.js'
import {
  HydraBrowserRuntime,
  normalizeRuntimeExecutionMode,
  type HydraBrowserRuntimeOptions,
  type HydraRuntimeExecutionMode
} from './runtime/runtime.js'
import {
  buildCandidateSignature,
  HydraAutotuner,
  type HydraAutotuneProfile,
  type HydraAutotuneProfilerInput,
  type HydraTuningPolicy
} from './runtime/autotune.js'
import { HydraExecutor, type ExecutePlanResult, type HydraExecutePlanOptions } from './runtime/executor.js'
import { WebGPUOutputNode } from './runtime/output-node.js'
import { buildProfilerSnapshot, type HydraProfilerSnapshot } from './runtime/profiler.js'
import { HydraSourceNode, type PatchBayAdapter } from './runtime/source-node.js'
import {
  WEBGPU_UNAVAILABLE_MESSAGE,
  WebGPURenderer,
  type WebGPUCapabilities,
  type WebGPUFragmentCapabilities,
  type WebGPURendererOptions
} from './webgpu/renderer.js'
import {
  BENCHMARK_CORPUS,
  getBenchmarkSceneDefinition
} from './benchmark/corpus.js'
import {
  buildBenchmarkReport,
  validateBenchmarkReport,
  type BuildBenchmarkReportOptions,
  type ValidateBenchmarkReportResult
} from './benchmark/runner.js'
import type {
  HydraBenchmarkAcceptanceGate,
  HydraBenchmarkDelta,
  HydraBenchmarkReport,
  HydraBenchmarkSample,
  HydraBenchmarkSceneDefinition,
  HydraCapabilityMatrix,
  HydraWorkloadClass
} from './benchmark/types.js'

export { HydraEngine }
export type {
  HydraEngineBindingHost,
  HydraEngineError,
  HydraEngineErrorType,
  HydraEngineOptions,
  HydraErrorPolicy,
  HydraFrameState,
  HydraPassIRNode,
  HydraPassSchedule,
  HydraPassUpdateRate,
  HydraResourceFormat,
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
  CaptureHydraVideoOptions,
  CaptureVideoOptions,
  FfmpegCommandSet,
  WebGPUCapabilities,
  WebGPUFragmentCapabilities,
  HydraProfilerSnapshot,
  HydraTuningPolicy,
  HydraAutotuneProfile,
  HydraAutotuneProfilerInput,
  ExecutePlanResult,
  HydraExecutePlanOptions,
  HydraBenchmarkAcceptanceGate,
  HydraBenchmarkDelta,
  HydraBenchmarkReport,
  HydraBenchmarkSample,
  HydraBenchmarkSceneDefinition,
  HydraCapabilityMatrix,
  HydraWorkloadClass,
  BuildBenchmarkReportOptions,
  ValidateBenchmarkReportResult,
  HydraRuntimeExecutionMode
}

export {
  WEBGPU_UNAVAILABLE_MESSAGE,
  WebGPURenderer,
  BrowserHost,
  HydraBrowserRuntime,
  HydraSourceNode,
  WebGPUOutputNode,
  HydraExecutor,
  HydraAutotuner,
  buildCandidateSignature,
  buildProfilerSnapshot,
  normalizeRuntimeExecutionMode,
  BENCHMARK_CORPUS,
  getBenchmarkSceneDefinition,
  buildBenchmarkReport,
  validateBenchmarkReport
}
export type { BrowserHostOptions, CanvasDisplayOptions, HydraBrowserRuntimeOptions, PatchBayAdapter, WebGPURendererOptions }
export { captureFrameSequence, captureHydraFrameSequence, captureVideo, captureHydraVideo, buildFfmpegCommands }

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
