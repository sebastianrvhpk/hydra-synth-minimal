export type HydraEngineErrorType = 'init' | 'compile' | 'runtime'

export interface HydraEngineError<TContext extends Record<string, unknown> = Record<string, unknown>> {
  type: HydraEngineErrorType
  message: string
  context: TContext
  cause?: unknown
  timestamp: number
}

export interface HydraFrameState {
  time: number
  bpm: number
  resolution: [number, number]
  deltaMs: number
}

export interface RendererAdapter {
  init (): Promise<void>
  beginFrame (frame: HydraFrameState): unknown
  renderFrame (frameHandle: unknown, frame: HydraFrameState): void
  submitFrame (frameHandle: unknown): void
  setResolution? (width: number, height: number): void
  dispose (): void
}

export interface SourceAdapter {
  tick (frame: HydraFrameState): void
  dispose (): void
}

export interface HydraEngineBindingHost {
  getBindings (): Readonly<Record<string, unknown>>
  setBinding (name: string, value: unknown): void
}

export interface ScriptPlugin {
  attach (host: HydraEngineBindingHost): void
  run? (code: string): unknown
  dispose (): void
}

export type HydraErrorPolicy = 'emit' | 'throw'

export interface HydraEngineOptions {
  renderer: RendererAdapter
  sources?: SourceAdapter[]
  update?: (deltaMs: number) => void
  afterUpdate?: (deltaMs: number) => void
  speed?: number
  fps?: number
  bpm?: number
  width?: number
  height?: number
  initialBindings?: Record<string, unknown>
  errorPolicy?: HydraErrorPolicy
  onError?: (error: HydraEngineError) => void
}

export interface Disposable {
  dispose (): void
}

export type HydraTransformType =
  | 'src'
  | 'coord'
  | 'color'
  | 'combine'
  | 'combineCoord'
  | 'renderpass'
export type HydraTransformInputType =
  | 'float'
  | 'vec2'
  | 'vec3'
  | 'vec4'
  | 'sampler2D'
export type HydraWgslType =
  | 'f32'
  | 'vec2f'
  | 'vec3f'
  | 'vec4f'
  | 'texture_2d<f32>'
export type HydraResourceFormat = 'rgba8unorm' | 'rgba16float' | 'rgba32float' | 'r32float' | 'rg32float' | 'r32uint'

export type HydraComputeKernelVariant = 'generic' | 'tiled' | 'subgroup'

export interface HydraSeparableBlurKernelDescriptor {
  kind: 'separableBlur'
  axis: 'x' | 'y'
  preferredVariant?: HydraComputeKernelVariant | 'auto'
  allowSubgroups?: boolean
}

export interface HydraStencil3x3KernelDescriptor {
  kind: 'stencil3x3'
  operator: 'edgeDetect' | 'edgeLaplacian'
  preferredVariant?: HydraComputeKernelVariant | 'auto'
  allowSubgroups?: boolean
}

export interface HydraConvolution3x3KernelDescriptor {
  kind: 'convolution3x3'
  weights: number[]
  radiusInputIndex?: number
  preferredVariant?: HydraComputeKernelVariant | 'auto'
  allowSubgroups?: boolean
}

export type HydraComputeKernelDescriptor =
  | HydraSeparableBlurKernelDescriptor
  | HydraStencil3x3KernelDescriptor
  | HydraConvolution3x3KernelDescriptor
export type HydraPassUpdateRate = 'everyFrame' | { everyNFrames: number } | { onEvent: string }
export type HydraDispatchDomain = 'pixel2d'

export interface HydraTransformInput {
  type: HydraTransformInputType
  name: string
  default: unknown
}

export interface HydraTransformDefinition {
  name: string
  type: HydraTransformType
  inputs?: HydraTransformInput[]
  wgsl: string
  computeKernel?: HydraComputeKernelDescriptor
  resolutionScale?: 1 | 0.5 | 0.25 | number
  updateRate?: HydraPassUpdateRate
  sparse?: boolean
}

export interface ProcessedHydraTransform extends HydraTransformDefinition {
  inputs: HydraTransformInput[]
  wgsl_return_type: HydraWgslType
  schedule: HydraPassSchedule
}

export interface HydraTypedArgument {
  name: string
  type: HydraTransformInputType
  wgslType: HydraWgslType
  default: unknown
  value: unknown
  literal?: string
  isUniform: boolean
  isTexture: boolean
  uniformName?: string
  textureName?: string
  textureSource?: unknown
}

export interface HydraUniformBinding {
  name: string
  index: number
  size: number
  value: (props: HydraFrameState) => number | number[]
  type: HydraTransformInputType
}

export interface HydraTextureBinding {
  name: string
  variableName: string
  getTexture: (() => unknown) | null
  isPrev: boolean
  sourceRef?: unknown
  binding: number
}

export interface HydraOutputTextureBinding {
  name: string
  variableName: string
  format: HydraResourceFormat
  binding: number
}

export interface HydraPassSchedule {
  resolutionScale: number
  updateRate: HydraPassUpdateRate
  sparse: boolean
}

export interface HydraDispatchConfig {
  mode: 'direct' | 'indirect'
  domain?: HydraDispatchDomain
  workgroupSize: [number, number, number]
  getIndirectBuffer?: (() => unknown) | null
  indirectOffset?: number
  requiredWorkgroupStorageBytes?: number
  requiredFeatures?: string[]
}

export interface HydraPassIRResourceRef {
  name: string
  kind: 'uniform' | 'texture' | 'outputTexture'
  binding: number
  intent?: 'input' | 'output'
  format?: HydraResourceFormat
}

export interface HydraPassIRNode {
  id: string
  signature: string
  kind: 'image'
  schedule: HydraPassSchedule
  workgroupSize: [number, number, number]
  resources: HydraPassIRResourceRef[]
  reads: string[]
  writes: string[]
}

export interface HydraCompiledPass {
  signature: string
  wgsl: string
  uniforms: HydraUniformBinding[]
  textures: HydraTextureBinding[]
  output?: HydraOutputTextureBinding
  schedule?: HydraPassSchedule
  dispatch?: HydraDispatchConfig
  ir?: HydraPassIRNode
  fallbackPass?: HydraCompiledPass
}

export interface HydraOutputGraphSource {
  transforms: HydraTransformCall[]
  compilePasses: () => HydraCompiledPass[]
  compilePlan?: () => unknown
}

export interface HydraOutputAdapter {
  render (passes: HydraCompiledPass[]): void
  renderGraph? (source: HydraOutputGraphSource): void
}

export interface HydraTextureProvider {
  getTexture (): unknown
}

export interface HydraTransformCall {
  name: string
  transform: ProcessedHydraTransform
  userArgs: unknown[]
  synth: HydraTransformRegistryHost
}

export interface HydraTransformRegistryHost {
  generators: Record<string, (...args: unknown[]) => HydraGraphNodeShape>
}

export interface HydraGraphNodeShape {
  transforms: HydraTransformCall[]
  out (output?: HydraOutputAdapter): void
  wgsl (): HydraCompiledPass[]
}

export interface HydraTransformRegistryChangeEvent {
  type: 'add' | 'remove'
  method: string
}

export interface HydraTransformRegistryOptions {
  defaultOutput: HydraOutputAdapter
  extendTransforms?: HydraTransformDefinition[] | HydraTransformDefinition
  onChange?: (event: HydraTransformRegistryChangeEvent) => void
  onCompileError?: (transformName: string, error: unknown) => void
}

export interface HydraGraphNodeOptions {
  initialTransform: HydraTransformCall
  defaultOutput: HydraOutputAdapter
  maxDynamicUniforms?: number
  onCompileError?: (transformName: string, error: unknown) => void
}

export declare const createHydraEngineError: <TContext extends Record<string, unknown>>(
  type: HydraEngineErrorType,
  message: string,
  context: TContext,
  cause?: unknown
) => HydraEngineError<TContext>

export declare class HydraEngineFailure extends Error {
  readonly envelope: HydraEngineError
  constructor (envelope: HydraEngineError)
}

export declare class HydraEngine implements HydraEngineBindingHost {
  constructor (options: HydraEngineOptions)
  get isDisposed (): boolean
  get isInitialized (): boolean
  init (): Promise<void>
  reportCompileError (transformName: string, cause: unknown): void
  tick (deltaMs?: number): void
  getBindings (): Readonly<Record<string, unknown>>
  setBinding (name: string, value: unknown): void
  setResolution (width: number, height: number): void
  addSource (source: SourceAdapter): () => void
  attachPlugin (plugin: ScriptPlugin): () => void
  onError (listener: (error: HydraEngineError) => void): () => void
  addDisposable (candidate: Disposable | (() => void)): () => void
  dispose (): void
}

export declare class HydraGraphNode implements HydraGraphNodeShape {
  readonly transforms: HydraTransformCall[]
  readonly type: 'HydraGraphNode'
  constructor (options: HydraGraphNodeOptions)
  out (output?: HydraOutputAdapter): void
  wgsl (): HydraCompiledPass[]
}

export declare class HydraTransformRegistry implements HydraTransformRegistryHost {
  readonly generators: Record<string, (...args: unknown[]) => HydraGraphNodeShape>
  constructor (options: HydraTransformRegistryOptions)
  registerTransforms (definitions: HydraTransformDefinition[]): void
  registerTransform (definition: HydraTransformDefinition): void
  getTransform (name: string): ProcessedHydraTransform | undefined
  listTransforms (): string[]
  attachToBindings (bindings: Record<string, unknown>): void
}

export declare const lowerDslToIr: (
  transforms: HydraTransformCall[],
  options?: {
    maxDynamicUniforms?: number
    graphId?: string
    validate?: boolean
  }
) => HydraKernelGraph
export declare const getTextureResourceId: (texture: {
  name: string
  variableName: string
  sourceRef?: unknown
}) => string
export declare const buildStructureSignature: (transforms?: HydraTransformCall[]) => string
export declare const buildPassIR: (options: {
  signature: string
  schedule: HydraPassSchedule
  dispatch: HydraDispatchConfig
  uniforms: HydraUniformBinding[]
  textures: HydraTextureBinding[]
  output?: HydraOutputTextureBinding
}) => HydraPassIRNode
export declare const optimizePassIR: (pass: HydraCompiledPass) => HydraCompiledPass
export declare const compileWgslPass: (transforms: HydraTransformCall[], maxDynamicUniforms?: number) => HydraCompiledPass
export declare const getDefaultTransforms: () => HydraTransformDefinition[]
export declare const collectUtilityDeclarations: (wgslFunctions?: Array<{ transform: { wgsl: string } }>) => string
