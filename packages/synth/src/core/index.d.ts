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
}

export interface RendererAdapter {
  init (): Promise<void>
  beginFrame (frame: HydraFrameState): unknown
  renderFrame (frameHandle: unknown, frame: HydraFrameState): void
  submitFrame (frameHandle: unknown): void
  dumpShaders? (): string[]
  getPassStats? (): Record<string, unknown>
  autotune? (options?: HydraAutotuneRunOptions): HydraAutotuneProfile
  getProfilerSnapshot? (): unknown
  checkCompatibility? (): boolean
  setResolution? (width: number, height: number): void
  dispose (): void
}

export interface SourceAdapter {
  tick (frame: HydraFrameState): void
  initCam? (constraintsOrId?: unknown): Promise<void>
  initVideo? (url: string, params?: unknown): void
  initImage? (url: string, params?: unknown): void
  initScreen? (optionsOrIndex?: unknown, params?: unknown): Promise<void>
  dispose (): void
}

export type HydraTuningPolicy = 'compat_stable' | 'throughput' | 'balanced_research'

export interface HydraAutotuneProfilerInput {
  frameWindow?: {
    p95FrameMs?: number
  }
  scheduler?: {
    fallbackRate?: number
  }
  resources?: {
    residentBytesEstimate?: number
  }
}

export interface HydraAutotuneProfile {
  profileKey: string
  policy: HydraTuningPolicy
  selectedProfile: string
  score: number
  candidateSignature: string
  fingerprintKey: string
  adapterFingerprint: string
  browserFingerprint: string
  kernelSignature: string
  resolutionClass: string
  candidateCount: number
  warmupTrials: number
  sampleTrials: number
  selectedMeasuredMeanMs: number
  selectedMeasuredP95Ms: number
  baselineP95FrameMs: number
  baselineFallbackRate: number
  evaluatedAt: string
}

export interface HydraAutotuneRunOptions {
  profileKey: string
  policy?: HydraTuningPolicy
  candidateProfiles?: string[]
  profilerSnapshot?: HydraAutotuneProfilerInput | null
  adapterFingerprint?: string
  browserFingerprint?: string
  kernelSignature?: string
  resolutionClass?: string
  correctnessEquivalent?: boolean
  warmupTrials?: number
  sampleTrials?: number
  measureCandidate?: (context: {
    profile: string
    phase: 'warmup' | 'sample'
    trialIndex: number
    baselineP95FrameMs: number
  }) => number | null | undefined
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
  onDebug?: (event: HydraDebugEvent) => void
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

export type HydraPassUpdateRate = 'everyFrame' | { everyNFrames: number } | { onEvent: string }

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
  resources: HydraPassIRResourceRef[]
  reads: string[]
  writes: string[]
}

export type HydraKernelNodeKind = 'ImageKernel'
export type HydraResourceKind = 'Texture2D' | 'HistoryRing'
export type HydraDependencyEdgeKind = 'RAW' | 'WAR' | 'WAW' | 'Event'

export interface HydraKernelSchedule {
  resolutionScale: number
  updateRate: HydraPassUpdateRate
  sparse: boolean
}

export interface HydraKernelResourceShape {
  width?: number
  height?: number
  depthOrArrayLayers?: number
  minLength?: number
}

export interface HydraKernelResourceSpec {
  id: string
  kind: HydraResourceKind
  format?: HydraResourceFormat
  lifetime: 'history' | 'external' | 'transient'
  shape?: HydraKernelResourceShape
  aliasClass?: string
  externalBinding?: string
}

export interface HydraKernelDebugMetadata {
  sourceTransformNames: string[]
  loweringNotes: string[]
  compatibilityFlags: string[]
}

export interface HydraKernelNode {
  id: string
  kind: HydraKernelNodeKind
  signature: string
  transforms: HydraTransformCall[]
  uniforms: HydraUniformBinding[]
  textures: HydraTextureBinding[]
  schedule: HydraKernelSchedule
  resources: string[]
  reads: string[]
  writes: string[]
  debug: HydraKernelDebugMetadata
}

export interface HydraDependencyEdge {
  id: string
  from: string
  to: string
  kind: HydraDependencyEdgeKind
  resource?: string
}

export interface HydraKernelGraph {
  id: string
  source: 'hydra-dsl'
  compatibilityMode: 'dsl-v2'
  nodes: HydraKernelNode[]
  resources: HydraKernelResourceSpec[]
  edges: HydraDependencyEdge[]
}

export interface HydraExecutionBarrier {
  fromNodeId: string
  toNodeId: string
  reason: HydraDependencyEdgeKind
  resource?: string
}

export interface HydraExecutionStep {
  id: string
  nodeId: string
  signature: string
  variant: 'fragment'
  compiledPass: HydraCompiledPass
  barriersBefore: HydraExecutionBarrier[]
}

export interface HydraResourceAllocationPlan {
  resourceId: string
  lifetime: HydraKernelResourceSpec['lifetime']
  aliasGroup: string
  slot: string
  interval: {
    start: number
    end: number
  }
  aliasable: boolean
  plannedBytes: number
}

export interface HydraExecutionPlanDiagnostics {
  score: number
  scoreBreakdown: {
    runCost: number
    memoryCost: number
    barrierCost: number
  }
  peakTransientBytes: number
  totalPlannedBytes: number
  barrierCount: number
  nodeOrder: string[]
}

export interface HydraExecutionPlan {
  version?: '1.0'
  executionPolicy?: {
    deterministic: boolean
  }
  id: string
  sourceGraph: HydraKernelGraph
  steps: HydraExecutionStep[]
  barriers: HydraExecutionBarrier[]
  resources: HydraResourceAllocationPlan[]
  diagnostics: HydraExecutionPlanDiagnostics
  cacheKey: string
}

export interface HydraKernelGraphValidationIssue {
  type: 'error' | 'warning'
  code: string
  message: string
}

export interface HydraExecutionPlanValidationIssue {
  type: 'error' | 'warning'
  code: string
  message: string
}

export interface HydraCompiledPass {
  signature: string
  wgsl: string
  uniforms: HydraUniformBinding[]
  textures: HydraTextureBinding[]
  output?: HydraOutputTextureBinding
  schedule?: HydraPassSchedule
  ir?: HydraPassIRNode
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
  tick (deltaMs?: number): number
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
  uniforms: HydraUniformBinding[]
  textures: HydraTextureBinding[]
  output?: HydraOutputTextureBinding
}) => HydraPassIRNode
export declare const optimizePassIR: (pass: HydraCompiledPass) => HydraCompiledPass
export declare const compileWgslPass: (transforms: HydraTransformCall[], maxDynamicUniforms?: number) => HydraCompiledPass
export declare const getDefaultTransforms: () => HydraTransformDefinition[]
export declare const collectUtilityDeclarations: (wgslFunctions?: Array<{ transform: { wgsl: string } }>) => string
export declare const compileGraph: (
  transforms: HydraTransformCall[],
  options?: {
    maxDynamicUniforms?: number
    graphId?: string
    validate?: boolean
  }
) => HydraExecutionPlan
export declare const createExecutionPlanDebugReport: (plan: HydraExecutionPlan) => string
export declare const validateKernelGraph: (graph: HydraKernelGraph) => HydraKernelGraphValidationIssue[]
export declare const throwOnKernelGraphErrors: (
  issues: HydraKernelGraphValidationIssue[],
  label?: string
) => void
export declare const validateExecutionPlan: (plan: HydraExecutionPlan) => HydraExecutionPlanValidationIssue[]
export declare const throwOnExecutionPlanErrors: (
  plan: HydraExecutionPlan,
  label?: string
) => void
