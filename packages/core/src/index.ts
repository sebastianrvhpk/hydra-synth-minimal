export { HydraEngine } from './engine.js'
export { createHydraEngineError, HydraEngineFailure } from './errors.js'

export { HydraTransformRegistry } from './transforms/registry.js'
export { HydraGraphNode } from './transforms/graph-node.js'
export { compileWgslPass, buildStructureSignature } from './transforms/compile-wgsl.js'
export { splitPasses } from './transforms/split-passes.js'
export {
  lowerDslToIr,
  getTextureResourceId,
  getStorageBufferResourceId,
  getStorageTextureResourceId
} from './lowering/dsl-to-ir.js'
export { dumpKernelGraph } from './ir/dump.js'
export { validateKernelGraph, throwOnKernelGraphErrors } from './ir/validate.js'
export { compileGraph, createExecutionPlanDebugReport } from './compiler/compile-graph.js'
export { validateExecutionPlan, throwOnExecutionPlanErrors } from './compiler/validate-plan.js'
export { PRIMITIVE_DESCRIPTORS, getPrimitiveDescriptorByKind } from './primitives/descriptors.js'
export { PRIMITIVE_WGSL_MODULES } from './primitives/wgsl/index.js'
export {
  reduceMeanLumaCpu,
  histogramLumaCpu,
  exclusiveScanU32Cpu,
  compactByPredicateCpu,
  radixSortKeyValueU32Cpu,
  queueAppendConsumeCountCpu,
  scatterToTexture2DCpu,
  gatherFromTexture2DCpu,
  pyramidDownsampleCpu,
  pyramidUpsampleCpu
} from './primitives/cpu-reference.js'
export { buildPassIR, optimizePassIR } from './transforms/pass-ir.js'
export { getDefaultTransforms } from './transforms/default-transforms.js'
export { collectUtilityDeclarations } from './transforms/utility-wgsl.js'

export type {
  Disposable,
  HydraAnalysisOutputBinding,
  HydraCompiledPass,
  HydraDispatchDomain,
  HydraDispatchConfig,
  HydraEngineBindingHost,
  HydraEngineError,
  HydraEngineErrorType,
  HydraEngineOptions,
  HydraErrorPolicy,
  HydraFrameState,
  HydraGraphNode as HydraGraphNodeShape,
  HydraOutputAdapter,
  HydraOutputGraphSource,
  HydraOutputTextureBinding,
  HydraPassIRNode,
  HydraPassIRResourceRef,
  HydraPassSchedule,
  HydraPassUpdateRate,
  HydraComputeKernelDescriptor,
  HydraComputeKernelVariant,
  HydraKernelSemantics,
  HydraResourceAccess,
  HydraResourceElementType,
  HydraResourceFormat,
  HydraResourceLifetime,
  HydraStorageBufferBinding,
  HydraStorageTextureBinding,
  HydraTextureBinding,
  HydraTextureProvider,
  HydraTransformCall,
  HydraTransformDefinition,
  HydraTransformInput,
  HydraTransformInputType,
  HydraTransformResource,
  HydraTransformRegistryChangeEvent,
  HydraTransformRegistryHost,
  HydraTransformRegistryOptions,
  HydraTransformType,
  HydraTypedArgument,
  HydraTypedResource,
  HydraUniformBinding,
  HydraWgslType,
  ProcessedHydraTransform,
  RendererAdapter,
  ScriptPlugin,
  SourceAdapter
} from './types.js'

export type {
  HydraKernelGraph,
  HydraKernelNode,
  HydraKernelResourceSpec,
  HydraDependencyEdge
} from './ir/types.js'

export type {
  HydraExecutionPlan,
  HydraExecutionStep,
  HydraExecutionBarrier,
  HydraExecutionVariantCandidate,
  HydraExecutionPrimitiveSelection,
  HydraResourceAllocationPlan,
  HydraExecutionPlanDiagnostics,
  HydraQueuePolicy,
  HydraQueueTerminationPolicy,
  HydraQueueOverflowControl,
  HydraQueueConvergencePolicy,
  HydraQueueTerminationMode,
  HydraQueueOverflowPolicy,
  HydraQueueConvergenceStrategy
} from './compiler/types.js'
export type { HydraExecutionPlanValidationIssue } from './compiler/validate-plan.js'

export type {
  HydraPrimitiveKind,
  HydraPrimitiveDescriptor,
  HydraPrimitiveCapabilityConstraint
} from './primitives/types.js'
