import { formatArguments } from './format-arguments.js'
import { buildPassIR, optimizePassIR } from './pass-ir.js'
import { collectUtilityDeclarations } from './utility-wgsl.js'
import type {
  HydraCompiledPass,
  HydraPassSchedule,
  HydraResourceFormat,
  HydraTextureBinding,
  HydraTransformCall,
  HydraTypedArgument,
  HydraUniformBinding
} from '../types.js'

/**
 * Fragment-pass compiler for Hydra transform chains.
 *
 * Each chain is lowered into a full-screen render pipeline:
 * - vertex stage: fullscreen triangle
 * - fragment stage: executes the transformed Hydra DSL expression tree
 *
 * The compiler keeps the same high-level transform semantics used by previous
 * backends (dynamic uniforms, nested graph args, texture bindings, pass
 * schedules), but emits fragment WGSL only.
 */
interface ShaderParams {
  uniforms: HydraUniformBinding[]
  textures: Array<Omit<HydraTextureBinding, 'binding'>>
  wgslFunctions: HydraTransformCall[]
  fragColor: string
  usesPrev: boolean
  uniformScalarCount: number
  argumentNamespaceSeed: number
  structureSignature: string
  schedule: HydraPassSchedule
}

const DEFAULT_PASS_OUTPUT_FORMAT: HydraResourceFormat = 'rgba16float'

const normalizeResolutionScale = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 1
  return value
}

const updateRatePriority = (value: HydraPassSchedule['updateRate']): number => {
  if (value === 'everyFrame') return 0
  if ('everyNFrames' in value) return 1
  return 2
}

const mergeUpdateRates = (values: HydraPassSchedule['updateRate'][]): HydraPassSchedule['updateRate'] => {
  if (values.length === 0) return 'everyFrame'

  let selected: HydraPassSchedule['updateRate'] = 'everyFrame'
  let selectedPriority = -1

  for (const candidate of values) {
    const priority = updateRatePriority(candidate)
    if (priority > selectedPriority) {
      selected = candidate
      selectedPriority = priority
      continue
    }

    if (priority < selectedPriority) continue

    if (candidate !== 'everyFrame' && 'everyNFrames' in candidate && selected !== 'everyFrame' && 'everyNFrames' in selected) {
      const next = Math.max(1, Math.floor(candidate.everyNFrames || 1))
      const current = Math.max(1, Math.floor(selected.everyNFrames || 1))
      if (next > current) selected = { everyNFrames: next }
      continue
    }

    if (
      candidate !== 'everyFrame' &&
      'onEvent' in candidate &&
      selected !== 'everyFrame' &&
      'onEvent' in selected
    ) {
      const next = `${candidate.onEvent}`
      const current = `${selected.onEvent}`
      if (next.localeCompare(current) < 0) selected = { onEvent: next }
    }
  }

  return selected
}

const mergePassSchedule = (transforms: HydraTransformCall[]): HydraPassSchedule => {
  const schedule: HydraPassSchedule = {
    resolutionScale: 1,
    updateRate: 'everyFrame',
    sparse: false
  }

  transforms.forEach((transform) => {
    const transformSchedule = transform.transform.schedule
    if (!transformSchedule) return
    schedule.resolutionScale = Math.min(
      schedule.resolutionScale,
      normalizeResolutionScale(transformSchedule.resolutionScale)
    )
    if (transformSchedule.sparse) schedule.sparse = true
  })
  schedule.updateRate = mergeUpdateRates(transforms.map((transform) => transform.transform.schedule?.updateRate ?? 'everyFrame'))

  return schedule
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

const uniformSlotCount = (wgslType: HydraTypedArgument['wgslType']): number => {
  if (wgslType === 'vec2f') return 2
  if (wgslType === 'vec3f') return 3
  if (wgslType === 'vec4f') return 4
  return 1
}

const registerUniform = (shaderParams: ShaderParams, arg: HydraTypedArgument): HydraUniformBinding | null => {
  if (!arg.uniformName || typeof arg.value !== 'function') return null
  const existing = shaderParams.uniforms.find((uniform) => uniform.name === arg.uniformName)
  if (existing) return existing

  const entry: HydraUniformBinding = {
    name: arg.uniformName,
    index: shaderParams.uniformScalarCount,
    size: uniformSlotCount(arg.wgslType),
    value: arg.value,
    type: arg.type
  }
  shaderParams.uniforms.push(entry)
  shaderParams.uniformScalarCount += entry.size
  return entry
}

const uniformExpressionForArg = (arg: HydraTypedArgument, uniform: HydraUniformBinding): string => {
  if (arg.wgslType === 'vec2f') return `hydraDynamicUniformVec2(${uniform.index}u)`
  if (arg.wgslType === 'vec3f') return `hydraDynamicUniformVec3(${uniform.index}u)`
  if (arg.wgslType === 'vec4f') return `hydraDynamicUniformVec4(${uniform.index}u)`
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
    getTexture: arg.value,
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
  if (arg.value && typeof arg.value === 'object' && 'transforms' in arg.value) {
    return coerceExpression(generateInputName(contextVar, argIndex), 'vec4f', arg.wgslType)
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
  let generator = (_cVar: string, _stVar: string): string => ''

  inputs.forEach((input, index) => {
    if (input.value && typeof input.value === 'object' && 'transforms' in input.value) {
      const currentPrevious = generator
      generator = (cVar, stVar) => {
        const nestedColorVar = generateInputName(cVar, index)
        const nestedUvVar = generateInputName(`${stVar}_${cVar}`, index)
        const nestedGenerator = generateWgslTransforms(
          (input.value as { transforms: HydraTransformCall[] }).transforms,
          shaderParams
        )
        return `var ${nestedUvVar}: vec2f = ${stVar};\nvar ${nestedColorVar}: vec4f = vec4f(0.0);\n${currentPrevious(cVar, stVar)}\n${nestedGenerator(nestedColorVar, nestedUvVar)}`
      }
    }
  })

  return generator
}

const generateWgslTransforms = (transforms: HydraTransformCall[], shaderParams: ShaderParams): ((cVar: string, stVar: string) => string) => {
  let generator = (_cVar: string, _stVar: string): string => ''

  transforms.forEach((transform, index) => {
    const namespaceSeed = shaderParams.argumentNamespaceSeed
    const slotCount = transform.transform.inputs?.length ?? 0
    shaderParams.argumentNamespaceSeed += Math.max(1, slotCount)
    const args = formatArguments(transform, namespaceSeed)
    const previous = generator

    if (!containsTransform(transform, shaderParams.wgslFunctions)) {
      shaderParams.wgslFunctions.push(transform)
    }

    if (
      transform.name === 'prev' ||
      /\bprevBuffer\b/.test(transform.transform.wgsl)
    ) {
      shaderParams.usesPrev = true
    }

    if (
      transform.transform.type === 'src' ||
      transform.transform.type === 'renderpass'
    ) {
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
    uniformScalarCount: 0,
    argumentNamespaceSeed: 0,
    structureSignature: buildStructureSignature(transforms),
    schedule: mergePassSchedule(transforms)
  }

  const generator = generateWgslTransforms(transforms, shaderParams)
  shaderParams.fragColor = generator('c', 'st')

  if (shaderParams.usesPrev) ensurePrevTexture(shaderParams)

  return shaderParams
}

const compileFragmentWgslPass = (
  transforms: HydraTransformCall[],
  maxDynamicUniforms = 256
): HydraCompiledPass => {
  const shaderInfo = generateWgsl(transforms)
  const dynamicUniformVec4Count = Math.ceil(maxDynamicUniforms / 4)
  const includeDynamicUniforms = shaderInfo.uniforms.length > 0

  if (shaderInfo.uniformScalarCount > maxDynamicUniforms) {
    throw new Error(`Shader uses ${shaderInfo.uniformScalarCount} dynamic uniform scalars, but max is ${maxDynamicUniforms}.`)
  }

  const textureBindings: HydraTextureBinding[] = shaderInfo.textures.map((texture, index) => ({
    ...texture,
    binding: 3 + index
  }))

  const textureDeclarations = textureBindings.map((texture) =>
    `@group(0) @binding(${texture.binding}) var ${texture.variableName}: texture_2d<f32>;`
  ).join('\n')
  const samplerDeclaration = textureBindings.length > 0
    ? '@group(0) @binding(2) var hydraSampler: sampler;'
    : ''
  const dynamicUniformDeclarations = includeDynamicUniforms
    ? `
struct DynamicUniforms {
  values: array<vec4f, ${dynamicUniformVec4Count}>,
};

@group(0) @binding(1) var<uniform> dynamicUniforms: DynamicUniforms;
`
    : ''
  const dynamicUniformHelpers = includeDynamicUniforms
    ? `
fn hydraDynamicUniform(index: u32) -> f32 {
  let vecIndex = index / 4u;
  let lane = index % 4u;
  let packed = dynamicUniforms.values[vecIndex];
  if (lane == 0u) { return packed.x; }
  if (lane == 1u) { return packed.y; }
  if (lane == 2u) { return packed.z; }
  return packed.w;
}

fn hydraDynamicUniformVec2(index: u32) -> vec2f {
  return vec2f(
    hydraDynamicUniform(index),
    hydraDynamicUniform(index + 1u)
  );
}

fn hydraDynamicUniformVec3(index: u32) -> vec3f {
  return vec3f(
    hydraDynamicUniform(index),
    hydraDynamicUniform(index + 1u),
    hydraDynamicUniform(index + 2u)
  );
}

fn hydraDynamicUniformVec4(index: u32) -> vec4f {
  return vec4f(
    hydraDynamicUniform(index),
    hydraDynamicUniform(index + 1u),
    hydraDynamicUniform(index + 2u),
    hydraDynamicUniform(index + 3u)
  );
}
`
    : ''

  const functionDeclarations = shaderInfo.wgslFunctions.map((transform) => transform.transform.wgsl).join('\n')
  const utilityDeclarations = collectUtilityDeclarations(shaderInfo.wgslFunctions)
  const functionSignature = shaderInfo.wgslFunctions
    .map((transform) => `${transform.name}:${transform.transform.wgsl.length}`)
    .join(',')

  const signatureBase =
    `${shaderInfo.structureSignature}|u${shaderInfo.uniforms.length}|us${shaderInfo.uniformScalarCount}` +
    `|t${textureBindings.length}` +
    `|rs${shaderInfo.schedule.resolutionScale}|sp${shaderInfo.schedule.sparse ? 1 : 0}|f${functionSignature}`

  // NOTE:
  // @builtin(position) in fragment stage is already at pixel centers
  // (x + 0.5, y + 0.5). Do not add another 0.5 offset here.
  const wgsl = `
struct GlobalUniforms {
  time: f32,
  bpm: f32,
  width: f32,
  height: f32,
};

struct FragmentInput {
  @builtin(position) position: vec4f,
};

@group(0) @binding(0) var<uniform> globals: GlobalUniforms;
${dynamicUniformDeclarations}
${samplerDeclaration}
${textureDeclarations}
${dynamicUniformHelpers}

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
fn fsMain(in: FragmentInput) -> @location(0) vec4f {
  let safeWidth = max(globals.width, 1.0);
  let safeHeight = max(globals.height, 1.0);
  var st = vec2f(in.position.x / safeWidth, in.position.y / safeHeight);
  var c = vec4f(0.0);
  ${shaderInfo.fragColor}
  return c;
}
`

  const pipelineSignature = `${signatureBase}|fs|h${hashString(wgsl)}`

  const output = {
    name: 'outImage',
    variableName: 'outImage',
    format: DEFAULT_PASS_OUTPUT_FORMAT,
    binding: 0
  }

  const compiled: HydraCompiledPass = {
    signature: pipelineSignature,
    wgsl,
    uniforms: shaderInfo.uniforms,
    textures: textureBindings,
    output,
    schedule: shaderInfo.schedule,
    ir: buildPassIR({
      signature: pipelineSignature,
      schedule: shaderInfo.schedule,
      uniforms: shaderInfo.uniforms,
      textures: textureBindings,
      output
    })
  }

  return optimizePassIR(compiled)
}

export const compileWgslPass = (
  transforms: HydraTransformCall[],
  maxDynamicUniforms = 256
): HydraCompiledPass => {
  // Single backend entry point: fragment pipeline compilation.
  return compileFragmentWgslPass(transforms, maxDynamicUniforms)
}
