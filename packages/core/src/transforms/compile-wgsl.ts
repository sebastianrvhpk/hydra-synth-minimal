import { formatArguments } from './format-arguments.js'
import { collectUtilityDeclarations } from './utility-wgsl.js'
import type {
  HydraCompiledPass,
  HydraTextureBinding,
  HydraTransformCall,
  HydraTypedArgument,
  HydraUniformBinding
} from '../types.js'

interface ShaderParams {
  uniforms: HydraUniformBinding[]
  textures: Array<Omit<HydraTextureBinding, 'binding'>>
  wgslFunctions: HydraTransformCall[]
  fragColor: string
  usesPrev: boolean
  structureSignature: string
}

const hashString = (value = ''): string => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

const coerceExpression = (expression: string, fromType: string, toType: string): string => {
  if (fromType === toType) return expression

  if (toType === 'f32') {
    if (fromType === 'vec2f' || fromType === 'vec3f' || fromType === 'vec4f') return `${expression}.x`
  }

  if (toType === 'vec2f') {
    if (fromType === 'f32') return `vec2f(${expression})`
    if (fromType === 'vec3f' || fromType === 'vec4f') return `${expression}.xy`
  }

  if (toType === 'vec3f') {
    if (fromType === 'f32') return `vec3f(${expression})`
    if (fromType === 'vec2f') return `vec3f(${expression}, 0.0)`
    if (fromType === 'vec4f') return `${expression}.xyz`
  }

  if (toType === 'vec4f') {
    if (fromType === 'f32') return `vec4f(${expression})`
    if (fromType === 'vec2f') return `vec4f(${expression}, 0.0, 1.0)`
    if (fromType === 'vec3f') return `vec4f(${expression}, 1.0)`
  }

  return expression
}

const containsTransform = (transform: HydraTransformCall, list: HydraTransformCall[]): boolean => {
  for (let index = 0; index < list.length; index += 1) {
    if (transform.name === list[index].name) return true
  }
  return false
}

const structureSignatureForArg = (arg: unknown): string => {
  if (arg && typeof arg === 'object' && 'transforms' in arg) {
    return `graph(${buildStructureSignature((arg as { transforms: HydraTransformCall[] }).transforms)})`
  }
  if (typeof arg === 'function') return 'uniform'
  if (arg && typeof arg === 'object' && 'getTexture' in arg && typeof arg.getTexture === 'function') return 'texture'
  if (Array.isArray(arg)) return `vec${arg.length}`
  if (typeof arg === 'number') return 'number'
  if (typeof arg === 'string') return 'string'
  if (typeof arg === 'boolean') return 'boolean'
  if (typeof arg === 'undefined') return 'undefined'
  return 'value'
}

export const buildStructureSignature = (transforms: HydraTransformCall[] = []): string => transforms
  .map((transform) => {
    const args = (transform.userArgs ?? []).map((arg) => structureSignatureForArg(arg)).join(',')
    return `${transform.name}(${args})`
  })
  .join('>')

const registerUniform = (shaderParams: ShaderParams, arg: HydraTypedArgument): number => {
  if (!arg.uniformName || typeof arg.value !== 'function') return -1
  const existing = shaderParams.uniforms.find((uniform) => uniform.name === arg.uniformName)
  if (existing) return existing.index

  const index = shaderParams.uniforms.length
  shaderParams.uniforms.push({
    name: arg.uniformName,
    index,
    value: arg.value,
    type: arg.type
  })
  return index
}

const registerTexture = (shaderParams: ShaderParams, arg: HydraTypedArgument): string => {
  if (!arg.textureName || typeof arg.value !== 'function') return 'hydraTexture0'
  const existing = shaderParams.textures.find((texture) => texture.name === arg.textureName)
  if (existing) return existing.variableName

  const index = shaderParams.textures.length
  const variableName = `hydraTexture${index}`
  shaderParams.textures.push({
    name: arg.textureName,
    variableName,
    getTexture: arg.value,
    isPrev: false
  })
  return variableName
}

const ensurePrevTexture = (shaderParams: ShaderParams): void => {
  const existing = shaderParams.textures.find((texture) => texture.isPrev)
  if (existing) return
  shaderParams.textures.push({
    name: 'prevBuffer',
    variableName: 'prevBuffer',
    getTexture: null,
    isPrev: true
  })
}

const generateInputName = (base: string, index: number): string => `${base}_i${index}`

const resolveInputExpression = (
  arg: HydraTypedArgument,
  argIndex: number,
  contextVar: string,
  shaderParams: ShaderParams
): string => {
  if (arg.value && typeof arg.value === 'object' && 'transforms' in arg.value) {
    return coerceExpression(generateInputName(contextVar, argIndex), 'vec4f', arg.wgslType)
  }

  if (arg.isUniform) {
    const uniformIndex = registerUniform(shaderParams, arg)
    const expression = `hydraDynamicUniform(${uniformIndex}u)`
    return coerceExpression(expression, 'f32', arg.wgslType)
  }

  if (arg.isTexture) {
    return registerTexture(shaderParams, arg)
  }

  if (typeof arg.literal !== 'undefined') return arg.literal

  if (arg.wgslType === 'f32') return '0.0'
  if (arg.wgslType === 'vec2f') return 'vec2f(0.0)'
  if (arg.wgslType === 'vec3f') return 'vec3f(0.0)'
  if (arg.wgslType === 'vec4f') return 'vec4f(0.0)'
  return '0.0'
}

const buildTransformCall = (
  method: string,
  callSeed: string,
  args: HydraTypedArgument[],
  contextVar: string,
  shaderParams: ShaderParams
): string => {
  const inputExpressions = args.map((arg, argIndex) => resolveInputExpression(arg, argIndex, contextVar, shaderParams))
  return `${method}(${[callSeed].concat(inputExpressions).join(', ')})`
}

const buildNestedInputs = (inputs: HydraTypedArgument[], shaderParams: ShaderParams): ((cVar: string, stVar: string) => string) => {
  let generator = (): string => ''
  let previous = generator

  inputs.forEach((input, index) => {
    if (input.value && typeof input.value === 'object' && 'transforms' in input.value) {
      previous = generator
      generator = (cVar, stVar) => {
        const nestedColorVar = generateInputName(cVar, index)
        const nestedUvVar = generateInputName(`${stVar}_${cVar}`, index)
        const nestedGenerator = generateWgslTransforms(
          (input.value as { transforms: HydraTransformCall[] }).transforms,
          shaderParams
        )
        return `var ${nestedUvVar}: vec2f = ${stVar};\n${previous(cVar, stVar)}\nvar ${nestedColorVar}: vec4f = vec4f(0.0);\n${nestedGenerator(nestedColorVar, nestedUvVar)}`
      }
    }
  })

  return generator
}

const generateWgslTransforms = (transforms: HydraTransformCall[], shaderParams: ShaderParams): ((cVar: string, stVar: string) => string) => {
  let generator = (): string => ''

  transforms.forEach((transform, index) => {
    const args = formatArguments(transform, shaderParams.uniforms.length + shaderParams.textures.length)
    const previous = generator

    if (!containsTransform(transform, shaderParams.wgslFunctions)) {
      shaderParams.wgslFunctions.push(transform)
    }

    if (transform.name === 'prev') shaderParams.usesPrev = true

    if (transform.transform.type === 'src') {
      generator = (cVar, stVar) => {
        const contextVar = `${cVar}${index}`
        const nested = buildNestedInputs(args, shaderParams)(contextVar, stVar)
        const call = buildTransformCall(transform.name, stVar, args, contextVar, shaderParams)
        return `${nested}\n${cVar} = ${call};`
      }
      return
    }

    if (transform.transform.type === 'color' || transform.transform.type === 'combine') {
      generator = (cVar, stVar) => {
        const contextVar = `${cVar}${index}`
        const nested = buildNestedInputs(args, shaderParams)(contextVar, stVar)
        const call = buildTransformCall(transform.name, cVar, args, contextVar, shaderParams)
        return `${nested}\n${previous(cVar, stVar)}\n${cVar} = ${call};`
      }
      return
    }

    if (transform.transform.type === 'coord' || transform.transform.type === 'combineCoord') {
      generator = (cVar, stVar) => {
        const contextVar = `${cVar}${index}`
        const nested = buildNestedInputs(args, shaderParams)(contextVar, stVar)
        const call = buildTransformCall(transform.name, stVar, args, contextVar, shaderParams)
        return `${nested}\n${stVar} = ${call};\n${previous(cVar, stVar)}`
      }
    }
  })

  return generator
}

const generateWgsl = (transforms: HydraTransformCall[]): ShaderParams => {
  const shaderParams: ShaderParams = {
    uniforms: [],
    textures: [],
    wgslFunctions: [],
    fragColor: '',
    usesPrev: false,
    structureSignature: buildStructureSignature(transforms)
  }

  const generator = generateWgslTransforms(transforms, shaderParams)
  shaderParams.fragColor = generator('c', 'st')

  if (shaderParams.usesPrev) ensurePrevTexture(shaderParams)

  return shaderParams
}

export const compileWgslPass = (
  transforms: HydraTransformCall[],
  maxDynamicUniforms = 256
): HydraCompiledPass => {
  const shaderInfo = generateWgsl(transforms)
  const dynamicUniformVec4Count = Math.ceil(maxDynamicUniforms / 4)

  if (shaderInfo.uniforms.length > maxDynamicUniforms) {
    throw new Error(`Shader uses ${shaderInfo.uniforms.length} dynamic uniforms, but max is ${maxDynamicUniforms}.`)
  }

  const textureBindings: HydraTextureBinding[] = shaderInfo.textures.map((texture, index) => ({
    ...texture,
    binding: 3 + index
  }))

  const textureDeclarations = textureBindings.map((texture) =>
    `@group(0) @binding(${texture.binding}) var ${texture.variableName}: texture_2d<f32>;`
  ).join('\n')

  const functionDeclarations = shaderInfo.wgslFunctions.map((transform) => transform.transform.wgsl).join('\n')
  const utilityDeclarations = collectUtilityDeclarations(shaderInfo.wgslFunctions)
  const functionSignature = shaderInfo.wgslFunctions
    .map((transform) => `${transform.name}:${transform.transform.wgsl.length}`)
    .join(',')

  const signatureBase = `${shaderInfo.structureSignature}|u${shaderInfo.uniforms.length}|t${textureBindings.length}|f${functionSignature}`

  const wgsl = `
struct GlobalUniforms {
  time: f32,
  bpm: f32,
  width: f32,
  height: f32,
};

struct DynamicUniforms {
  values: array<vec4f, ${dynamicUniformVec4Count}>,
};

@group(0) @binding(0) var<uniform> globals: GlobalUniforms;
@group(0) @binding(1) var<uniform> dynamicUniforms: DynamicUniforms;
@group(0) @binding(2) var hydraSampler: sampler;
${textureDeclarations}

fn hydraDynamicUniform(index: u32) -> f32 {
  let vecIndex = index / 4u;
  let lane = index % 4u;
  let packed = dynamicUniforms.values[vecIndex];
  if (lane == 0u) { return packed.x; }
  if (lane == 1u) { return packed.y; }
  if (lane == 2u) { return packed.z; }
  return packed.w;
}

${utilityDeclarations}
${functionDeclarations}

@vertex
fn vsMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  let positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  let p = positions[vertexIndex];
  return vec4f(p, 0.0, 1.0);
}

@fragment
fn fsMain(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  var st = fragCoord.xy / vec2f(globals.width, globals.height);
  var c = vec4f(0.0);
  ${shaderInfo.fragColor}
  return c;
}
`

  const pipelineSignature = `${signatureBase}|h${hashString(wgsl)}`

  return {
    signature: pipelineSignature,
    wgsl,
    uniforms: shaderInfo.uniforms,
    textures: textureBindings
  }
}
