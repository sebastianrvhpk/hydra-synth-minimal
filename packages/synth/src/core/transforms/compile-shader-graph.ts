import { formatArguments } from './format-arguments.js'
import { collectUtilityFunctions } from './shader-library.js'
import type {
  HydraCompiledPass,
  HydraFragmentPass,
  HydraFrameState,
  HydraShaderFunction,
  HydraTextureBinding,
  HydraTransformCall,
  HydraTypedArgument,
  HydraUniformBinding
} from '../types.js'

/**
 * Lowers Hydra transform chains into TypeGPU-linked shader-function graphs.
 *
 * Each chain is lowered into a full-screen fragment render pipeline.
 *
 * Dynamic uniforms, nested graph arguments, and texture bindings are lowered
 * once. A single fragment execution model keeps the graph portable to
 * fragment-only backends such as WebGL2.
 */
interface ShaderParams {
  uniforms: HydraUniformBinding[]
  textures: HydraTextureBinding[]
  shaderFunctions: HydraShaderFunction[]
  fragColor: string
  usesPrev: boolean
  uniformScalarCount: number
  argumentNamespaceSeed: number
  expressionFunctionSeed: number
  structureSignature: string
  resolutionScale: number
}

interface PreparedShaderResources {
  shaderInfo: ShaderParams
  textureBindings: HydraTextureBinding[]
  shaderFunctions: HydraShaderFunction[]
  signatureBase: string
}

type RenderpassMode = 'framebuffer' | 'expression'

interface GenerateShaderOptions {
  renderpassMode: RenderpassMode
}

const normalizeResolutionScale = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 1
  return value
}

const resolutionScaleForPass = (transforms: HydraTransformCall[]): number => transforms.reduce(
  (scale, transform) => Math.min(scale, normalizeResolutionScale(transform.transform.resolutionScale)),
  1
)

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

const registerShaderFunction = (
  shaderParams: ShaderParams,
  shaderFunction: HydraShaderFunction
): void => {
  const existing = shaderParams.shaderFunctions.find(({ name }) => name === shaderFunction.name)
  if (!existing) {
    shaderParams.shaderFunctions.push(shaderFunction)
    return
  }
  if (
    existing.source !== shaderFunction.source ||
    existing.returnType !== shaderFunction.returnType ||
    existing.parameterTypes.join(',') !== shaderFunction.parameterTypes.join(',')
  ) {
    throw new Error(`Shader function name collision: "${shaderFunction.name}" has multiple implementations.`)
  }
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
    return `${transform.transform.name}(${args})`
  })
  .join('>')

const uniformSlotCount = (shaderType: HydraTypedArgument['shaderType']): number => {
  if (shaderType === 'vec2f') return 2
  if (shaderType === 'vec3f') return 3
  if (shaderType === 'vec4f') return 4
  return 1
}

const registerUniform = (shaderParams: ShaderParams, arg: HydraTypedArgument): HydraUniformBinding | null => {
  if (!arg.uniformName || typeof arg.value !== 'function') return null
  const existing = shaderParams.uniforms.find((uniform) => uniform.name === arg.uniformName)
  if (existing) return existing

  const entry: HydraUniformBinding = {
    name: arg.uniformName,
    index: shaderParams.uniformScalarCount,
    size: uniformSlotCount(arg.shaderType),
    value: arg.value as (props: HydraFrameState) => number | number[]
  }
  shaderParams.uniforms.push(entry)
  shaderParams.uniformScalarCount += entry.size
  return entry
}

const uniformExpressionForArg = (arg: HydraTypedArgument, uniform: HydraUniformBinding): string => {
  if (arg.shaderType === 'vec2f') return `hydraDynamicUniformVec2(${uniform.index}u)`
  if (arg.shaderType === 'vec3f') return `hydraDynamicUniformVec3(${uniform.index}u)`
  if (arg.shaderType === 'vec4f') return `hydraDynamicUniformVec4(${uniform.index}u)`
  return `hydraDynamicUniform(${uniform.index}u)`
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
    getTexture: arg.value as () => unknown,
    isPrev: false,
    sourceRef: arg.textureSource
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
  if (arg.shaderFunctions) {
    arg.shaderFunctions.forEach((shaderFunction) => {
      registerShaderFunction(shaderParams, shaderFunction)
    })
  }

  if (arg.value && typeof arg.value === 'object' && 'transforms' in arg.value) {
    return coerceExpression(generateInputName(contextVar, argIndex), 'vec4f', arg.shaderType)
  }

  if (arg.isUniform) {
    const uniform = registerUniform(shaderParams, arg)
    if (!uniform) return '0.0'
    return uniformExpressionForArg(arg, uniform)
  }

  if (arg.isTexture) {
    return registerTexture(shaderParams, arg)
  }

  if (typeof arg.literal !== 'undefined') return arg.literal

  if (arg.shaderType === 'f32') return '0.0'
  if (arg.shaderType === 'vec2f') return 'vec2f(0.0)'
  if (arg.shaderType === 'vec3f') return 'vec3f(0.0)'
  if (arg.shaderType === 'vec4f') return 'vec4f(0.0)'
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

const buildNestedInputs = (
  inputs: HydraTypedArgument[],
  shaderParams: ShaderParams
): ((cVar: string, stVar: string) => string) => {
  let generator = (_cVar: string, _stVar: string): string => ''

  inputs.forEach((input, index) => {
    if (input.value && typeof input.value === 'object' && 'transforms' in input.value) {
      const currentPrevious = generator
      generator = (cVar, stVar) => {
        const nestedColorVar = generateInputName(cVar, index)
        const nestedUvVar = generateInputName(`${stVar}_${cVar}`, index)
        const nestedGenerator = generateShaderTransforms(
          (input.value as { transforms: HydraTransformCall[] }).transforms,
          shaderParams,
          { renderpassMode: 'expression' }
        )
        return `var ${nestedUvVar}: vec2f = ${stVar};\nvar ${nestedColorVar}: vec4f = vec4f(0.0);\n${currentPrevious(cVar, stVar)}\n${nestedGenerator(nestedColorVar, nestedUvVar)}`
      }
    }
  })

  return generator
}

const sanitizeShaderIdentifier = (value: string): string =>
  value.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[^a-zA-Z_]/, '_')

const shaderForTransform = (transform: HydraTransformCall): HydraShaderFunction => {
  const shader = transform.transform.shader
  if (!shader) {
    throw new Error(`Pass boundary "${transform.transform.name}" reached shader compilation.`)
  }
  return shader
}

const registerExpressionEvaluator = (
  shaderParams: ShaderParams,
  previousGenerator: (cVar: string, stVar: string) => string
): string => {
  const name = `hydraExprInput_${shaderParams.expressionFunctionSeed}`
  shaderParams.expressionFunctionSeed += 1
  const source = `
fn ${name}(hydraExprSt: vec2f) -> vec4f {
  var st = hydraExprSt;
  var c = vec4f(0.0);
  ${previousGenerator('c', 'st')}
  return c;
}
`
  registerShaderFunction(shaderParams, {
    name,
    parameterTypes: ['vec2f'],
    returnType: 'vec4f',
    source
  })
  return name
}

const registerExpressionRenderpass = (
  shaderParams: ShaderParams,
  transform: HydraTransformCall,
  sampleFunctionName: string
): string => {
  const transformName = transform.transform.name
  const name = `hydraExpr_${sanitizeShaderIdentifier(transformName)}_${shaderParams.expressionFunctionSeed}`
  shaderParams.expressionFunctionSeed += 1
  const transformShader = shaderForTransform(transform)
  const renamed = transformShader.source.replace(
    new RegExp(`fn\\s+${sanitizeShaderIdentifier(transformName)}\\s*\\(`),
    `fn ${name}(`
  )
  const source = renamed.replace(/\bhydraSampleTexture\s*\(\s*prevBuffer\s*,\s*/g, `${sampleFunctionName}(`)
  registerShaderFunction(shaderParams, {
    ...transformShader,
    name,
    source
  })
  return name
}

const transformUsesPrevBuffer = (
  transform: HydraTransformCall,
  mode: RenderpassMode
): boolean => {
  if (transform.transform.name === 'prev') return true
  if (transform.transform.type === 'renderpass' && mode === 'expression') return false
  return /\bprevBuffer\b/.test(shaderForTransform(transform).source)
}

const generateShaderTransforms = (
  transforms: HydraTransformCall[],
  shaderParams: ShaderParams,
  options: GenerateShaderOptions = { renderpassMode: 'framebuffer' }
): ((cVar: string, stVar: string) => string) => {
  let generator = (_cVar: string, _stVar: string): string => ''

  transforms.forEach((transform, index) => {
    const namespaceSeed = shaderParams.argumentNamespaceSeed
    const slotCount = transform.transform.inputs?.length ?? 0
    shaderParams.argumentNamespaceSeed += Math.max(1, slotCount)
    const args = formatArguments(transform, namespaceSeed)
    const previous = generator

    if (transformUsesPrevBuffer(transform, options.renderpassMode)) {
      shaderParams.usesPrev = true
    }

    if (
      transform.transform.type === 'renderpass' &&
      options.renderpassMode === 'expression'
    ) {
      const sampleFunctionName = registerExpressionEvaluator(shaderParams, previous)
      const renderpassFunctionName = registerExpressionRenderpass(shaderParams, transform, sampleFunctionName)
      generator = (cVar, stVar) => {
        const contextVar = `${cVar}${index}`
        const nested = buildNestedInputs(args, shaderParams)(contextVar, stVar)
        const call = buildTransformCall(renderpassFunctionName, stVar, args, contextVar, shaderParams)
        return `${nested}\n${cVar} = ${call};`
      }
      return
    }

    const transformName = transform.transform.name
    registerShaderFunction(shaderParams, shaderForTransform(transform))

    if (
      transform.transform.type === 'src' ||
      transform.transform.type === 'renderpass'
    ) {
      generator = (cVar, stVar) => {
        const contextVar = `${cVar}${index}`
        const nested = buildNestedInputs(args, shaderParams)(contextVar, stVar)
        const call = buildTransformCall(transformName, stVar, args, contextVar, shaderParams)
        return `${nested}\n${cVar} = ${call};`
      }
      return
    }

    if (transform.transform.type === 'color' || transform.transform.type === 'combine') {
      generator = (cVar, stVar) => {
        const contextVar = `${cVar}${index}`
        const nested = buildNestedInputs(args, shaderParams)(contextVar, stVar)
        const call = buildTransformCall(transformName, cVar, args, contextVar, shaderParams)
        return `${nested}\n${previous(cVar, stVar)}\n${cVar} = ${call};`
      }
      return
    }

    if (transform.transform.type === 'coord' || transform.transform.type === 'combineCoord') {
      generator = (cVar, stVar) => {
        const contextVar = `${cVar}${index}`
        const nested = buildNestedInputs(args, shaderParams)(contextVar, stVar)
        const call = buildTransformCall(transformName, stVar, args, contextVar, shaderParams)
        return `${nested}\n${stVar} = ${call};\n${previous(cVar, stVar)}`
      }
    }
  })

  return generator
}

const buildShaderGraph = (transforms: HydraTransformCall[]): ShaderParams => {
  const shaderParams: ShaderParams = {
    uniforms: [],
    textures: [],
    shaderFunctions: [],
    fragColor: '',
    usesPrev: false,
    uniformScalarCount: 0,
    argumentNamespaceSeed: 0,
    expressionFunctionSeed: 0,
    structureSignature: buildStructureSignature(transforms),
    resolutionScale: resolutionScaleForPass(transforms)
  }

  const generator = generateShaderTransforms(transforms, shaderParams, { renderpassMode: 'framebuffer' })
  shaderParams.fragColor = generator('c', 'st')

  if (shaderParams.usesPrev) ensurePrevTexture(shaderParams)

  return shaderParams
}

const dynamicUniformFunctions = (): HydraShaderFunction[] => [
  {
    name: 'hydraDynamicUniform',
    parameterTypes: ['u32'],
    returnType: 'f32',
    source: `
fn hydraDynamicUniform(index: u32) -> f32 {
  let vecIndex = index / 4u;
  let lane = index % 4u;
  let packed = dynamicUniforms.values[vecIndex];
  if (lane == 0u) { return packed.x; }
  if (lane == 1u) { return packed.y; }
  if (lane == 2u) { return packed.z; }
  return packed.w;
}
`
  },
  {
    name: 'hydraDynamicUniformVec2',
    parameterTypes: ['u32'],
    returnType: 'vec2f',
    source: `
fn hydraDynamicUniformVec2(index: u32) -> vec2f {
  return vec2f(
    hydraDynamicUniform(index),
    hydraDynamicUniform(index + 1u)
  );
}
`
  },
  {
    name: 'hydraDynamicUniformVec3',
    parameterTypes: ['u32'],
    returnType: 'vec3f',
    source: `
fn hydraDynamicUniformVec3(index: u32) -> vec3f {
  return vec3f(
    hydraDynamicUniform(index),
    hydraDynamicUniform(index + 1u),
    hydraDynamicUniform(index + 2u)
  );
}
`
  },
  {
    name: 'hydraDynamicUniformVec4',
    parameterTypes: ['u32'],
    returnType: 'vec4f',
    source: `
fn hydraDynamicUniformVec4(index: u32) -> vec4f {
  return vec4f(
    hydraDynamicUniform(index),
    hydraDynamicUniform(index + 1u),
    hydraDynamicUniform(index + 2u),
    hydraDynamicUniform(index + 3u)
  );
}
`
  }
]

const serializeProgram = (entryBody: string, functions: HydraShaderFunction[]): string => [
  ...functions.map((shaderFunction) => shaderFunction.source),
  entryBody
].join('\n')

const referencesFunction = (source: string, name: string): boolean => (
  new RegExp(`\\b${name}\\s*\\(`, 'u').test(source)
)

const collectReferencedFunctions = (
  candidates: HydraShaderFunction[],
  roots: Array<Pick<HydraShaderFunction, 'source'>>
): HydraShaderFunction[] => {
  const selected = new Set<string>()
  const select = (shaderFunction: HydraShaderFunction): void => {
    if (selected.has(shaderFunction.name)) return
    selected.add(shaderFunction.name)
    for (const dependency of candidates) {
      if (referencesFunction(shaderFunction.source, dependency.name)) select(dependency)
    }
  }

  for (const root of roots) {
    for (const candidate of candidates) {
      if (referencesFunction(root.source, candidate.name)) select(candidate)
    }
  }
  return candidates.filter(({ name }) => selected.has(name))
}

const prepareShaderResources = (
  transforms: HydraTransformCall[],
  maxDynamicUniforms: number
): PreparedShaderResources => {
  const shaderInfo = buildShaderGraph(transforms)
  const includeDynamicUniforms = shaderInfo.uniforms.length > 0

  if (shaderInfo.uniformScalarCount > maxDynamicUniforms) {
    throw new Error(`Shader uses ${shaderInfo.uniformScalarCount} dynamic uniform scalars, but max is ${maxDynamicUniforms}.`)
  }

  const textureBindings = shaderInfo.textures
  const uniformFunctions = includeDynamicUniforms
    ? collectReferencedFunctions(dynamicUniformFunctions(), [{ source: shaderInfo.fragColor }])
    : []
  const authoredFunctions = uniformFunctions.concat(shaderInfo.shaderFunctions)
  const shaderFunctions = collectUtilityFunctions(authoredFunctions).concat(authoredFunctions)
  const signatureBase =
    `${shaderInfo.structureSignature}|u${shaderInfo.uniforms.length}|us${shaderInfo.uniformScalarCount}` +
    `|t${textureBindings.length}` +
    `|rs${shaderInfo.resolutionScale}`

  return {
    shaderInfo,
    textureBindings,
    shaderFunctions,
    signatureBase
  }
}

const compileFragmentPass = (
  transforms: HydraTransformCall[],
  maxDynamicUniforms = 256
): HydraFragmentPass => {
  const {
    shaderInfo,
    textureBindings,
    shaderFunctions,
    signatureBase
  } = prepareShaderResources(transforms, maxDynamicUniforms)

  // NOTE:
  // @builtin(position) in fragment stage is already at pixel centers
  // (x + 0.5, y + 0.5). Do not add another 0.5 offset here.
  const entryBody = `{
  let safeWidth = max(globals.width, 1.0);
  let safeHeight = max(globals.height, 1.0);
  var st = vec2f(in.position.x / safeWidth, in.position.y / safeHeight);
  var c = vec4f(0.0);
  ${shaderInfo.fragColor}
  return c;
}`

  const programSource = serializeProgram(entryBody, shaderFunctions)

  return {
    signature: `${signatureBase}|fs|h${hashString(programSource)}`,
    program: { entryBody, functions: shaderFunctions },
    variant: 'fragment',
    uniforms: shaderInfo.uniforms,
    textures: textureBindings,
    resolutionScale: shaderInfo.resolutionScale
  }
}

export const compileTypeGPUPass = (
  transforms: HydraTransformCall[],
  maxDynamicUniforms = 256
): HydraCompiledPass => compileFragmentPass(transforms, maxDynamicUniforms)
