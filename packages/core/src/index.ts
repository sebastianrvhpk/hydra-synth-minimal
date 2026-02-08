export { HydraEngine } from './engine.js'
export { createHydraEngineError, HydraEngineFailure } from './errors.js'

export { HydraTransformRegistry } from './transforms/registry.js'
export { HydraGraphNode } from './transforms/graph-node.js'
export { compileWgslPass, buildStructureSignature } from './transforms/compile-wgsl.js'
export { getDefaultTransforms } from './transforms/default-transforms.js'
export { collectUtilityDeclarations } from './transforms/utility-wgsl.js'

export type {
  Disposable,
  HydraCompiledPass,
  HydraEngineBindingHost,
  HydraEngineError,
  HydraEngineErrorType,
  HydraEngineOptions,
  HydraErrorPolicy,
  HydraFrameState,
  HydraGraphNode as HydraGraphNodeShape,
  HydraOutputAdapter,
  HydraTextureBinding,
  HydraTextureProvider,
  HydraTransformCall,
  HydraTransformDefinition,
  HydraTransformInput,
  HydraTransformInputType,
  HydraTransformRegistryChangeEvent,
  HydraTransformRegistryHost,
  HydraTransformRegistryOptions,
  HydraTransformType,
  HydraTypedArgument,
  HydraUniformBinding,
  HydraWgslType,
  ProcessedHydraTransform,
  RendererAdapter,
  ScriptPlugin,
  SourceAdapter
} from './types.js'
