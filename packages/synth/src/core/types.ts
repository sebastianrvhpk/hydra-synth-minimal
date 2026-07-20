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

interface HydraTransformDefinitionBase {
  name: string
  resolutionScale?: number
}

export type HydraTransformDefinition = HydraTransformDefinitionBase & (
  | {
      type: 'passBoundary'
      inputs?: never
      shader?: never
      preferredPassVariant?: never
      computeWorkgroupSize?: never
    }
  | {
      type: Exclude<HydraTransformType, 'passBoundary'>
      inputs?: HydraTransformInput[]
      shader: string
      preferredPassVariant?: 'fragment' | 'compute'
      computeWorkgroupSize?: [number, number]
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
  preferredPassVariant?: 'fragment' | 'compute'
  computeWorkgroupSize?: [number, number]
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

export interface HydraComputeOutputBinding {
  variableName: string
  format: 'rgba16float'
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

export interface HydraComputePass extends HydraCompiledPassBase {
  variant: 'compute'
  compute: {
    workgroupSize: [number, number]
  }
  output: HydraComputeOutputBinding
}

export type HydraCompiledPass = HydraFragmentPass | HydraComputePass

export interface HydraOutputAdapter {
  render(passes: HydraCompiledPass[]): void
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
