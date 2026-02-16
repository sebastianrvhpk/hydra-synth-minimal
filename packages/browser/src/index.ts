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
  type HydraQueuePolicyV3,
  type HydraQueueTerminationPolicyV3,
  type HydraQueueOverflowControlV3,
  type HydraQueueConvergencePolicyV3,
  type HydraQueueTerminationModeV3,
  type HydraQueueOverflowPolicyV3,
  type HydraQueueConvergenceStrategyV3,
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
import {
  HydraBrowserRuntime,
  normalizeRuntimeExecutionMode,
  type HydraBrowserRuntimeOptions,
  type HydraRuntimeExecutionMode
} from './runtime/runtime.js'
import {
  HydraAutotunerV3,
  type HydraAutotuneProfileV3,
  type HydraAutotuneProfilerInputV3,
  type HydraTuningPolicyV3
} from './runtime/autotune-v3.js'
import { HydraExecutorV3, type ExecutePlanV3Result, type HydraExecutePlanV3Options, type HydraExecutorQueueHooksV3 } from './runtime/executor-v3.js'
import { WebGPUOutputNode } from './runtime/output-node.js'
import { buildProfilerSnapshotV3, type HydraProfilerSnapshotV3 } from './runtime/profiler-v3.js'
import {
  createDefaultQueuePolicyV3,
  decideQueueDispatchV3,
  evaluateQueueTerminationReasonV3,
  normalizeQueuePolicyV3,
  shouldTerminateQueueLoopV3,
  toQueueIndirectArgsV3,
  type HydraQueueDispatchDecisionV3,
  type HydraQueueDispatchStateV3,
  type HydraQueueIndirectArgsV3,
  type HydraQueueTerminationReasonV3
} from './runtime/queue-v3.js'
import { HydraResourceManagerV3, type HydraResourceResidencySnapshotV3 } from './runtime/resource-manager-v3.js'
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
  BENCHMARK_CORPUS_V3,
  getBenchmarkSceneDefinitionV3
} from './benchmark/corpus.js'
import {
  buildBenchmarkReportV3,
  validateBenchmarkReportV3,
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
  FfmpegCommandSet,
  WebGPUCapabilities,
  WebGPUComputeCapabilities,
  WebGPUStorageCapabilities,
  WebGPUSubgroupCapabilities,
  HydraProfilerSnapshotV3,
  HydraTuningPolicyV3,
  HydraAutotuneProfileV3,
  HydraAutotuneProfilerInputV3,
  ExecutePlanV3Result,
  HydraExecutePlanV3Options,
  HydraExecutorQueueHooksV3,
  HydraResourceResidencySnapshotV3,
  HydraQueueDispatchStateV3,
  HydraQueueDispatchDecisionV3,
  HydraQueueIndirectArgsV3,
  HydraQueueTerminationReasonV3,
  HydraQueuePolicyV3,
  HydraQueueTerminationPolicyV3,
  HydraQueueOverflowControlV3,
  HydraQueueConvergencePolicyV3,
  HydraQueueTerminationModeV3,
  HydraQueueOverflowPolicyV3,
  HydraQueueConvergenceStrategyV3,
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
  HydraExecutorV3,
  HydraResourceManagerV3,
  HydraAutotunerV3,
  buildProfilerSnapshotV3,
  normalizeRuntimeExecutionMode,
  createDefaultQueuePolicyV3,
  decideQueueDispatchV3,
  normalizeQueuePolicyV3,
  evaluateQueueTerminationReasonV3,
  toQueueIndirectArgsV3,
  shouldTerminateQueueLoopV3,
  BENCHMARK_CORPUS_V3,
  getBenchmarkSceneDefinitionV3,
  buildBenchmarkReportV3,
  validateBenchmarkReportV3
}
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
