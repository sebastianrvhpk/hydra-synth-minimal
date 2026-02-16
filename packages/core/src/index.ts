export { HydraEngine } from './engine.js'
export { createHydraEngineError, HydraEngineFailure } from './errors.js'

export { HydraTransformRegistry } from './transforms/registry.js'
export { HydraGraphNode } from './transforms/graph-node.js'
export { compileWgslPass, buildStructureSignature } from './transforms/compile-wgsl.js'
export { splitLegacyPasses } from './transforms/split-legacy-passes.js'
export {
  lowerDslToIrV3,
  getTextureResourceIdV3,
  getStorageBufferResourceIdV3,
  getStorageTextureResourceIdV3
} from './lowering/dsl-to-ir-v3.js'
export { dumpKernelGraphV3 } from './ir-v3/dump.js'
export { validateKernelGraphV3, throwOnKernelGraphV3Errors } from './ir-v3/validate.js'
export { compileGraphV3, createExecutionPlanDebugReportV3 } from './compiler-v3/compile-graph-v3.js'
export { validateExecutionPlanV3, throwOnExecutionPlanV3Errors } from './compiler-v3/validate-plan-v3.js'
export { PRIMITIVE_DESCRIPTORS_V3, getPrimitiveDescriptorByKindV3 } from './primitives-v3/descriptors.js'
export { PRIMITIVE_WGSL_MODULES_V3 } from './primitives-v3/wgsl/index.js'
export {
  reduceMeanLumaCpuV3,
  histogramLumaCpuV3,
  exclusiveScanU32CpuV3,
  compactByPredicateCpuV3,
  radixSortKeyValueU32CpuV3,
  queueAppendConsumeCountCpuV3,
  scatterToTexture2DCpuV3,
  gatherFromTexture2DCpuV3,
  pyramidDownsampleCpuV3,
  pyramidUpsampleCpuV3
} from './primitives-v3/cpu-reference.js'
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
  HydraKernelGraphV3,
  HydraKernelNodeV3,
  HydraKernelResourceSpecV3,
  HydraDependencyEdgeV3
} from './ir-v3/types.js'

export type {
  HydraExecutionPlanV3,
  HydraExecutionStepV3,
  HydraExecutionBarrierV3,
  HydraExecutionVariantCandidateV3,
  HydraExecutionPrimitiveSelectionV3,
  HydraResourceAllocationPlanV3,
  HydraExecutionPlanDiagnosticsV3
} from './compiler-v3/types.js'
export type { HydraExecutionPlanValidationIssueV3 } from './compiler-v3/validate-plan-v3.js'

export type {
  HydraPrimitiveKindV3,
  HydraPrimitiveDescriptorV3,
  HydraPrimitiveCapabilityConstraintV3
} from './primitives-v3/types.js'
