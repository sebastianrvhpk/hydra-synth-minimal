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

export type HydraTransformType = 'src' | 'coord' | 'color' | 'combine' | 'combineCoord' | 'renderpass'
export type HydraTransformInputType = 'float' | 'vec2' | 'vec3' | 'vec4' | 'sampler2D'
export type HydraWgslType = 'f32' | 'vec2f' | 'vec3f' | 'vec4f' | 'texture_2d<f32>'

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
}

export interface ProcessedHydraTransform extends HydraTransformDefinition {
  inputs: HydraTransformInput[]
  wgsl_return_type: HydraWgslType
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
}

export interface HydraUniformBinding {
  name: string
  index: number
  value: (props: HydraFrameState) => number
  type: HydraTransformInputType
}

export interface HydraTextureBinding {
  name: string
  variableName: string
  getTexture: (() => unknown) | null
  isPrev: boolean
  binding: number
}

export interface HydraCompiledPass {
  signature: string
  wgsl: string
  uniforms: HydraUniformBinding[]
  textures: HydraTextureBinding[]
}

export interface HydraOutputAdapter {
  render (passes: HydraCompiledPass[]): void
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
  generators: Record<string, (...args: unknown[]) => HydraGraphNode>
}

export interface HydraGraphNode {
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
