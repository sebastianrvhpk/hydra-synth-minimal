export interface HydraFrameState {
  time: number
  bpm: number
  resolution: [number, number]
  deltaMs: number
}

export type HydraTransformType =
  | 'src'
  | 'coord'
  | 'color'
  | 'combine'
  | 'combineCoord'
  | 'passBoundary'
  | 'renderpass'

export type HydraTransformInputType =
  | 'float'
  | 'vec2'
  | 'vec3'
  | 'vec4'
  | 'sampler2D'

export type HydraShaderValueType =
  | 'f32'
  | 'u32'
  | 'vec2f'
  | 'vec3f'
  | 'vec4f'
  | 'texture_2d<f32>'

export interface HydraTransformInput {
  type: HydraTransformInputType
  name: string
  default: unknown
}

export interface HydraTransformDescriptor {
  name: string
  type: HydraTransformType
  inputs: HydraTransformInput[]
}

interface HydraTransformDefinitionBase {
  name: string
  resolutionScale?: number
}

export type HydraTransformDefinition = HydraTransformDefinitionBase & (
  | {
      type: 'passBoundary'
      inputs?: never
      shader?: never
    }
  | {
      type: Exclude<HydraTransformType, 'passBoundary'>
      inputs?: HydraTransformInput[]
      shader: string
    }
)

export interface HydraShaderFunction {
  name: string
  parameterTypes: HydraShaderValueType[]
  returnType: HydraShaderValueType
  source: string
}

export interface ProcessedHydraTransform {
  name: string
  type: HydraTransformType
  inputs: HydraTransformInput[]
  shader: HydraShaderFunction | null
  resolutionScale: number
}

export interface HydraTypedArgument {
  name: string
  type: HydraTransformInputType
  shaderType: HydraShaderValueType
  default: unknown
  value: unknown
  literal?: string
  shaderFunctions?: HydraShaderFunction[]
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
}

export interface HydraTextureBinding {
  name: string
  variableName: string
  getTexture: (() => unknown) | null
  isPrev: boolean
  sourceRef?: unknown
}

export interface HydraTypeGPUProgram {
  entryBody: string
  functions: HydraShaderFunction[]
}

interface HydraCompiledPassBase {
  signature: string
  program: HydraTypeGPUProgram
  uniforms: HydraUniformBinding[]
  textures: HydraTextureBinding[]
  resolutionScale: number
}

export interface HydraFragmentPass extends HydraCompiledPassBase {
  variant: 'fragment'
}

export type HydraCompiledPass = HydraFragmentPass

export interface HydraOutputAdapter {
  render(passes: HydraCompiledPass[]): void
}

export interface HydraPortableClock {
  width: number
  height: number
  frameCount: number
  fps: number
  startTime: number
  bpm: number
  seed: number
}

export type HydraPortableTextureSource =
  | { kind: 'input', index: number }
  | { kind: 'previous', output: number, offset: number }
  | { kind: 'output', output: number }
  | { kind: 'internal-pass', index: number }

export interface HydraPortableTextureBinding {
  variableName: string
  source: HydraPortableTextureSource
}

export interface HydraPortablePass {
  signature: string
  glsl: string
  resolutionScale: number
  uniformFrames: number[][]
  textures: HydraPortableTextureBinding[]
}

export interface HydraPortableOutput {
  index: number
  passes: HydraPortablePass[]
}

export interface HydraPortableRenderPlan {
  schema: 'hydra.portable-render-plan/1'
  compiler: {
    name: 'hydra-synth'
    version: string
  }
  source: {
    code: string
    hash: string
  }
  clock: HydraPortableClock
  outputs: HydraPortableOutput[]
}

export interface HydraTextureProvider {
  getTexture(): unknown
}

export interface HydraTransformCall {
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
}

export interface HydraTransformRegistryOptions {
  defaultOutput: HydraOutputAdapter
}
