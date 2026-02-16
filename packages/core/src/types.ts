export type HydraEngineErrorType = 'init' | 'compile' | 'runtime'


export interface HydraEngineError<TContext extends Record<string, unknown> = Record<string, unknown>> {
  type: HydraEngineErrorType
  message: string
  context: TContext
  cause?: unknown
  timestamp: number
}

export interface HydraDebugEvent {
  type: 'shader-generated'
  nodeId: string
  signature: string
  wgsl: string
  timestamp: number
}

export interface HydraFrameState {
  time: number
  bpm: number
  resolution: [number, number]
  deltaMs: number
  analysis?: Record<string, number | number[]>
}

export interface RendererAdapter {
  init(): Promise<void>
  beginFrame(frame: HydraFrameState): unknown
  renderFrame(frameHandle: unknown, frame: HydraFrameState): void
  submitFrame(frameHandle: unknown): void
  setResolution?(width: number, height: number): void
  dispose(): void
}

export interface SourceAdapter {
  tick(frame: HydraFrameState): void
  dispose(): void
}

export interface HydraEngineBindingHost {
  getBindings(): Readonly<Record<string, unknown>>
  setBinding(name: string, value: unknown): void
}

export interface ScriptPlugin {
  attach(host: HydraEngineBindingHost): void
  run?(code: string): unknown
  dispose(): void
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
  onDebug?: (event: HydraDebugEvent) => void
}

export interface Disposable {
  dispose(): void
}

export type HydraTransformType =
  | 'src'
  | 'coord'
  | 'color'
  | 'combine'
  | 'combineCoord'
  | 'renderpass'
  | 'simulation'
  | 'analysis'
  | 'kernel'

export type HydraTransformInputType =
  | 'float'
  | 'vec2'
  | 'vec3'
  | 'vec4'
  | 'sampler2D'
  | 'storageBuffer'
  | 'storageTexture2D'
  | 'storageTexture2DArray'

export type HydraWgslType =
  | 'f32'
  | 'vec2f'
  | 'vec3f'
  | 'vec4f'
  | 'texture_2d<f32>'
  | 'texture_storage_2d<rgba8unorm, read>'
  | 'texture_storage_2d<rgba8unorm, write>'
  | 'texture_storage_2d<rgba8unorm, read_write>'
  | 'texture_storage_2d_array<rgba8unorm, read>'
  | 'texture_storage_2d_array<rgba8unorm, write>'
  | 'texture_storage_2d_array<rgba8unorm, read_write>'
  | 'ptr<storage, array<vec4f>, read>'
  | 'ptr<storage, array<vec4f>, read_write>'
  | 'ptr<storage, array<vec4f>, write>'

export type HydraResourceAccess = 'read' | 'write' | 'read_write'
export type HydraResourceLifetime = 'frame' | 'persistent'
export type HydraResourceFormat =
  | 'rgba8unorm'
  | 'rgba16float'
  | 'rgba32float'
  | 'r32float'
  | 'rg32float'
  | 'r32uint'

export type HydraResourceElementType = 'f32' | 'vec2f' | 'vec3f' | 'vec4f' | 'u32' | 'i32'

export type HydraComputeKernelVariant = 'generic' | 'tiled' | 'subgroup'
export type HydraKernelSemantics = 'compat_uv' | 'index_first'

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

export type HydraPassUpdateRate =
  | 'everyFrame'
  | { everyNFrames: number }
  | { onEvent: string }

export type HydraDispatchDomain = 'pixel2d' | 'linear1d'

export interface HydraAnalysisOutputBinding {
  uniformName: string
  type: 'float' | 'vec2' | 'vec3' | 'vec4'
}

export interface HydraTransformInput {
  type: HydraTransformInputType
  name: string
  default: unknown
}

export interface HydraTransformResource {
  type: 'storageBuffer' | 'storageTexture2D' | 'storageTexture2DArray'
  name: string
  access?: HydraResourceAccess
  format?: HydraResourceFormat
  elementType?: HydraResourceElementType
  minLength?: number
  widthScale?: number
  heightScale?: number
  depthOrArrayLayers?: number
  lifetime?: HydraResourceLifetime
  stateKey?: string
  default?: unknown
}

export interface HydraTransformDefinition {
  name: string
  type: HydraTransformType
  inputs?: HydraTransformInput[]
  resources?: HydraTransformResource[]
  wgsl: string
  computeKernel?: HydraComputeKernelDescriptor
  resolutionScale?: 1 | 0.5 | 0.25 | number
  updateRate?: HydraPassUpdateRate
  sparse?: boolean
  stateKey?: string
  lifetime?: HydraResourceLifetime
  analysisOut?: HydraAnalysisOutputBinding[]
  executionDomain?: HydraDispatchDomain
  kernelSemantics?: HydraKernelSemantics
  writesOutput?: boolean
  dispatchItems?: number
}

export interface ProcessedHydraTransform extends HydraTransformDefinition {
  inputs: HydraTransformInput[]
  resources: HydraTransformResource[]
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

export interface HydraTypedResource {
  name: string
  type: HydraTransformResource['type']
  access: HydraResourceAccess
  lifetime: HydraResourceLifetime
  stateKey?: string
  format?: HydraResourceFormat
  elementType: HydraResourceElementType
  minLength?: number
  widthScale?: number
  heightScale?: number
  depthOrArrayLayers?: number
  variableName: string
  value: unknown
  getTexture: (() => unknown) | null
  getBuffer: (() => unknown) | null
  sourceRef?: unknown
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

export interface HydraStorageBufferBinding {
  name: string
  variableName: string
  getBuffer: (() => unknown) | null
  access: HydraResourceAccess
  lifetime: HydraResourceLifetime
  stateKey?: string
  sourceRef?: unknown
  elementType: HydraResourceElementType
  minLength: number
  binding: number
}

export interface HydraStorageTextureBinding {
  name: string
  variableName: string
  getTexture: (() => unknown) | null
  access: HydraResourceAccess
  format: HydraResourceFormat
  dimension: '2d' | '2d_array'
  widthScale?: number
  heightScale?: number
  depthOrArrayLayers?: number
  lifetime: HydraResourceLifetime
  stateKey?: string
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
  itemCount?: number
  getIndirectBuffer?: (() => unknown) | null
  indirectOffset?: number
  getQueueCounterBuffer?: (() => unknown) | null
  onQueueCounterReadback?: ((activeCount: number, overflowCount: number) => void) | null
  requiredWorkgroupStorageBytes?: number
  requiredFeatures?: string[]
}

export interface HydraPassIRResourceRef {
  name: string
  kind: 'uniform' | 'texture' | 'storageBuffer' | 'storageTexture' | 'outputTexture'
  binding: number
  intent?: 'input' | 'state' | 'analysis' | 'output'
  access?: HydraResourceAccess
  format?: HydraResourceFormat
  lifetime?: HydraResourceLifetime
  stateKey?: string
}

export interface HydraPassIRNode {
  id: string
  signature: string
  kind: 'image' | 'data' | 'reduction'
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
  storageBuffers?: HydraStorageBufferBinding[]
  storageTextures?: HydraStorageTextureBinding[]
  analysisOut?: HydraAnalysisOutputBinding[]
  output?: HydraOutputTextureBinding
  schedule?: HydraPassSchedule
  dispatch?: HydraDispatchConfig
  ir?: HydraPassIRNode
  fallbackPass?: HydraCompiledPass
}

export interface HydraOutputGraphSource {
  transforms: HydraTransformCall[]
  compileLegacyPasses: () => HydraCompiledPass[]
  compilePlan?: () => unknown
}

export interface HydraOutputAdapter {
  render(passes: HydraCompiledPass[]): void
  renderGraph?(source: HydraOutputGraphSource): void
}

export interface HydraTextureProvider {
  getTexture(): unknown
}

export interface HydraTransformCall {
  name: string
  transform: ProcessedHydraTransform
  userArgs: unknown[]
  synth: HydraTransformRegistryHost
}

export interface HydraTransformRegistryHost {
  generators: Record<string, (...args: unknown[]) => HydraGraphNode>
}

export interface HydraGraphNode {
  transforms: HydraTransformCall[]
  out(output?: HydraOutputAdapter): void
  wgsl(): HydraCompiledPass[]
  plan?(): unknown
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
