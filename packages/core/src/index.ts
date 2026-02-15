export { HydraEngine } from './engine.js'
export { createHydraEngineError, HydraEngineFailure } from './errors.js'

export { HydraTransformRegistry } from './transforms/registry.js'
export { HydraGraphNode } from './transforms/graph-node.js'
export { compileWgslPass, buildStructureSignature } from './transforms/compile-wgsl.js'
export { buildPassIR, optimizePassIR } from './transforms/pass-ir.js'
export { getDefaultTransforms } from './transforms/default-transforms.js'
export { collectUtilityDeclarations } from './transforms/utility-wgsl.js'

export type {
  Disposable,
  HydraAnalysisOutputBinding,
  HydraCompiledPass,
  HydraDispatchConfig,
  HydraEngineBindingHost,
  HydraEngineError,
  HydraEngineErrorType,
  HydraEngineOptions,
  HydraErrorPolicy,
  HydraFrameState,
  HydraGraphNode as HydraGraphNodeShape,
  HydraOutputAdapter,
  HydraOutputTextureBinding,
  HydraPassIRNode,
  HydraPassIRResourceRef,
  HydraPassSchedule,
  HydraPassUpdateRate,
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
