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
  type HydraQueuePolicy,
  type HydraQueueTerminationPolicy,
  type HydraQueueOverflowControl,
  type HydraQueueConvergencePolicy,
  type HydraQueueTerminationMode,
  type HydraQueueOverflowPolicy,
  type HydraQueueConvergenceStrategy,
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
  buildWorkgroupCandidateSignature,
  HydraAutotuner,
  type HydraAutotuneProfile,
  type HydraAutotuneProfilerInput,
  type HydraTuningPolicy
} from './runtime/autotune.js'
import { HydraExecutor, type ExecutePlanResult, type HydraExecutePlanOptions, type HydraExecutorQueueHooks } from './runtime/executor.js'
import { WebGPUOutputNode } from './runtime/output-node.js'
import { buildProfilerSnapshot, type HydraProfilerSnapshot } from './runtime/profiler.js'
import {
  createDefaultQueuePolicy,
  decideQueueDispatch,
  evaluateQueueTerminationReason,
  normalizeQueuePolicy,
  shouldTerminateQueueLoop,
  toQueueIndirectArgs,
  type HydraQueueDispatchDecision,
  type HydraQueueDispatchState,
  type HydraQueueIndirectArgs,
  type HydraQueueTerminationReason
} from './runtime/queue.js'
import { HydraResourceManager, type HydraResourceResidencySnapshot } from './runtime/resource-manager.js'
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
  CaptureHydraVideoOptions,
  CaptureVideoOptions,
  FfmpegCommandSet,
  WebGPUCapabilities,
  WebGPUComputeCapabilities,
  WebGPUStorageCapabilities,
  WebGPUSubgroupCapabilities,
  HydraProfilerSnapshot,
  HydraTuningPolicy,
  HydraAutotuneProfile,
  HydraAutotuneProfilerInput,
  ExecutePlanResult,
  HydraExecutePlanOptions,
  HydraExecutorQueueHooks,
  HydraResourceResidencySnapshot,
  HydraQueueDispatchState,
  HydraQueueDispatchDecision,
  HydraQueueIndirectArgs,
  HydraQueueTerminationReason,
  HydraQueuePolicy,
  HydraQueueTerminationPolicy,
  HydraQueueOverflowControl,
  HydraQueueConvergencePolicy,
  HydraQueueTerminationMode,
  HydraQueueOverflowPolicy,
  HydraQueueConvergenceStrategy,
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
  HydraResourceManager,
  HydraAutotuner,
  buildWorkgroupCandidateSignature,
  buildProfilerSnapshot,
  normalizeRuntimeExecutionMode,
  createDefaultQueuePolicy,
  decideQueueDispatch,
  normalizeQueuePolicy,
  evaluateQueueTerminationReason,
  toQueueIndirectArgs,
  shouldTerminateQueueLoop,
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
