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
  init(): Promise<void>
  beginFrame(frame: HydraFrameState): unknown
  renderFrame(frameHandle: unknown, frame: HydraFrameState): void
  // Developer / Debugging Tools
  dumpShaders?(): string[]
  getPassStats?(): Record<string, unknown>
  autotune?(options?: HydraAutotuneRunOptions): HydraAutotuneProfile
  getProfilerSnapshot?(): unknown
  checkCompatibility?(): boolean
  setResolution?(width: number, height: number): void
  dispose(): void
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

export interface SourceAdapter {
  tick(frame: HydraFrameState): void
  initCam?(constraintsOrId?: unknown): Promise<void>
  initVideo?(url: string, params?: unknown): void
  initImage?(url: string, params?: unknown): void
  initScreen?(optionsOrIndex?: unknown, params?: unknown): Promise<void>
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

export type HydraResourceFormat =
  | 'rgba8unorm'
  | 'rgba16float'
  | 'rgba32float'
  | 'r32float'
  | 'rg32float'
  | 'r32uint'

export type HydraPassVariant = 'fragment' | 'compute'

export type HydraPassUpdateRate =
  | 'everyFrame'
  | { everyNFrames: number }
  | { onEvent: string }

export interface HydraTransformInput {
  type: HydraTransformInputType
  name: string
  /**
   * Default value.
   * NOTE: If a function is passed as a value for this input at runtime,
   * it will be automatically converted to a dynamic uniform.
   */
  default: unknown
}

export interface HydraTransformDefinition {
  name: string
  type: HydraTransformType
  inputs?: HydraTransformInput[]
  wgsl: string
  preferredPassVariant?: HydraPassVariant
  computeWorkgroupSize?: [number, number]
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
  wgslDeclarations?: Array<{
    name: string
    wgsl: string
  }>
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

export interface HydraCompiledPass {
  signature: string
  wgsl: string
  variant?: HydraPassVariant
  compute?: {
    workgroupSize: [number, number]
  }
  fallback?: HydraCompiledPass
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
  clone(): HydraGraphNode
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
