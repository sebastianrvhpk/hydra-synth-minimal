import { formatArguments, formatResourceBindings } from './format-arguments.js'
import { buildPassIR, optimizePassIR } from './pass-ir.js'
import { collectUtilityDeclarations } from './utility-wgsl.js'
import type {
  HydraAnalysisOutputBinding,
  HydraCompiledPass,
  HydraDispatchConfig,
  HydraPassSchedule,
  HydraResourceElementType,
  HydraResourceFormat,
  HydraStorageBufferBinding,
  HydraStorageTextureBinding,
  HydraTextureBinding,
  HydraTransformCall,
  HydraTypedArgument,
  HydraTypedResource,
  HydraUniformBinding
} from '../types.js'

interface ShaderParams {
  uniforms: HydraUniformBinding[]
  textures: Array<Omit<HydraTextureBinding, 'binding'>>
  storageBuffers: Array<Omit<HydraStorageBufferBinding, 'binding'>>
  storageTextures: Array<Omit<HydraStorageTextureBinding, 'binding'>>
  wgslFunctions: HydraTransformCall[]
  fragColor: string
  usesPrev: boolean
  uniformScalarCount: number
  argumentNamespaceSeed: number
  structureSignature: string
  schedule: HydraPassSchedule
}

const DEFAULT_PASS_OUTPUT_FORMAT: HydraResourceFormat = 'rgba16float'

const resolveWorkgroupSize = (transforms: HydraTransformCall[]): [number, number, number] => {
  if (transforms.length === 1) {
    const only = transforms[0]
    if (only?.name === 'blurX') return [32, 8, 1]
    if (only?.name === 'blurY') return [8, 32, 1]
  }
  return [16, 16, 1]
}

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

interface PassExecutionConfig {
  domain: 'pixel2d' | 'linear1d'
  kernelSemantics: 'uv' | 'index_first'
  writesOutput: boolean
  dispatchItems?: number
}

const resolvePassExecutionConfig = (transforms: HydraTransformCall[]): PassExecutionConfig => {
  const domains = new Set<'pixel2d' | 'linear1d'>()
  const semantics = new Set<'uv' | 'index_first'>()
  let writesOutput = false
  let dispatchItems = 0
  let largestResourceLength = 0

  transforms.forEach((call) => {
    const domain = call.transform.executionDomain === 'linear1d' ? 'linear1d' : 'pixel2d'
    domains.add(domain)
    semantics.add(call.transform.kernelSemantics === 'index_first' ? 'index_first' : 'uv')
    writesOutput = writesOutput || Boolean(call.transform.writesOutput)
    dispatchItems = Math.max(dispatchItems, Math.max(0, Math.floor(Number(call.transform.dispatchItems) || 0)))
    const resources = call.transform.resources ?? []
    resources.forEach((resource) => {
      if (resource.type !== 'storageBuffer') return
      const minLength = Math.max(0, Math.floor(Number(resource.minLength) || 0))
      if (minLength > largestResourceLength) largestResourceLength = minLength
    })
  })

  if (domains.size > 1) {
    throw new Error('Mixed execution domains in a single pass are unsupported. Split transforms into separate passes.')
  }

  const domain = domains.has('linear1d') ? 'linear1d' : 'pixel2d'
  const outputEnabled = writesOutput || domain === 'pixel2d'
  const resolvedItems = Math.max(dispatchItems, largestResourceLength)
  const kernelSemantics = domain === 'linear1d' && semantics.has('index_first')
    ? 'index_first'
    : 'uv'

  return {
    domain,
    kernelSemantics,
    writesOutput: outputEnabled,
    dispatchItems: resolvedItems > 0 ? resolvedItems : undefined
  }
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

const collectAnalysisOutputs = (transforms: HydraTransformCall[]): HydraAnalysisOutputBinding[] => {
  const outputs: HydraAnalysisOutputBinding[] = []
  const seen = new Set<string>()

  transforms.forEach((transform) => {
    const bindings = transform.transform.analysisOut ?? []
    bindings.forEach((binding) => {
      if (seen.has(binding.uniformName)) return
      seen.add(binding.uniformName)
      outputs.push(binding)
    })
  })

  return outputs
}

const sanitizeStorageVariable = (name: string): string => name.replace(/[^a-zA-Z0-9_]/g, '_')

const toStorageElementType = (value: HydraResourceElementType): string => {
  if (value === 'f32') return 'f32'
  if (value === 'vec2f') return 'vec2f'
  if (value === 'vec3f') return 'vec3f'
  if (value === 'u32') return 'u32'
  if (value === 'i32') return 'i32'
  return 'vec4f'
}

const toStorageTextureFormat = (value?: HydraResourceFormat): string => {
  if (!value) return DEFAULT_PASS_OUTPUT_FORMAT
  return value
}

const toStorageTextureType = (
  format: string,
  access: 'read' | 'write' | 'read_write',
  dimension: '2d' | '2d_array'
): string => {
  if (dimension === '2d_array') return `texture_storage_2d_array<${format}, ${access}>`
  return `texture_storage_2d<${format}, ${access}>`
}

const hashString = (value = ''): string => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

const toFloatLiteral = (value: number): string => {
  if (!Number.isFinite(value)) return '0.0'
  const asString = value.toString()
  if (asString.includes('.') || asString.includes('e') || asString.includes('E')) return asString
  return `${asString}.0`
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
  if (arg && typeof arg === 'object' && 'getBuffer' in arg && typeof arg.getBuffer === 'function') return 'buffer'
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

const registerStorageBuffer = (shaderParams: ShaderParams, resource: HydraTypedResource): void => {
  const candidate = sanitizeStorageVariable(resource.variableName)
  const existing = shaderParams.storageBuffers.find((entry) => entry.variableName === candidate)
  if (existing) return

  shaderParams.storageBuffers.push({
    name: resource.name,
    variableName: candidate,
    getBuffer: resource.getBuffer,
    access: resource.access,
    lifetime: resource.lifetime,
    stateKey: resource.stateKey,
    sourceRef: resource.sourceRef,
    elementType: resource.elementType,
    minLength: Math.max(1, resource.minLength ?? 1)
  })
}

const registerStorageTexture = (shaderParams: ShaderParams, resource: HydraTypedResource): void => {
  const candidate = sanitizeStorageVariable(resource.variableName)
  const existing = shaderParams.storageTextures.find((entry) => entry.variableName === candidate)
  if (existing) return

  shaderParams.storageTextures.push({
    name: resource.name,
    variableName: candidate,
    getTexture: resource.getTexture,
    access: resource.access,
    format: resource.format ?? DEFAULT_PASS_OUTPUT_FORMAT,
    dimension: resource.type === 'storageTexture2DArray' ? '2d_array' : '2d',
    widthScale: resource.widthScale,
    heightScale: resource.heightScale,
    depthOrArrayLayers: resource.depthOrArrayLayers,
    lifetime: resource.lifetime,
    stateKey: resource.stateKey,
    sourceRef: resource.sourceRef
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
    const namespaceSeed = shaderParams.argumentNamespaceSeed
    const slotCount = (transform.transform.inputs?.length ?? 0) + (transform.transform.resources?.length ?? 0)
    shaderParams.argumentNamespaceSeed += Math.max(1, slotCount)
    const args = formatArguments(transform, namespaceSeed)
    const resources = formatResourceBindings(transform, namespaceSeed)
    const previous = generator

    if (!containsTransform(transform, shaderParams.wgslFunctions)) {
      shaderParams.wgslFunctions.push(transform)
    }

    resources.forEach((resource) => {
      if (resource.type === 'storageBuffer') registerStorageBuffer(shaderParams, resource)
      else registerStorageTexture(shaderParams, resource)
    })

    if (
      transform.name === 'prev' ||
      transform.transform.type === 'renderpass' ||
      /\bprevBuffer\b/.test(transform.transform.wgsl)
    ) {
      shaderParams.usesPrev = true
    }

    if (
      transform.transform.type === 'src' ||
      transform.transform.type === 'renderpass' ||
      transform.transform.type === 'simulation' ||
      transform.transform.type === 'analysis' ||
      transform.transform.type === 'kernel'
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
    storageBuffers: [],
    storageTextures: [],
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

const compileGenericWgslPass = (
  transforms: HydraTransformCall[],
  maxDynamicUniforms = 256
): HydraCompiledPass => {
  const execution = resolvePassExecutionConfig(transforms)
  if (execution.domain !== 'pixel2d') {
    throw new Error('Linear compute domains must use compileLinearWgslPass().')
  }

  const shaderInfo = generateWgsl(transforms)
  const analysisOut = collectAnalysisOutputs(transforms)
  const [workgroupSizeX, workgroupSizeY, workgroupSizeZ] = resolveWorkgroupSize(transforms)
  const dynamicUniformVec4Count = Math.ceil(maxDynamicUniforms / 4)

  if (shaderInfo.uniformScalarCount > maxDynamicUniforms) {
    throw new Error(`Shader uses ${shaderInfo.uniformScalarCount} dynamic uniform scalars, but max is ${maxDynamicUniforms}.`)
  }

  const textureBindings: HydraTextureBinding[] = shaderInfo.textures.map((texture, index) => ({
    ...texture,
    binding: 3 + index
  }))

  const storageBufferOffset = 3 + textureBindings.length
  const storageBufferBindings: HydraStorageBufferBinding[] = shaderInfo.storageBuffers.map((buffer, index) => ({
    ...buffer,
    binding: storageBufferOffset + index
  }))

  const storageTextureOffset = storageBufferOffset + storageBufferBindings.length
  const storageTextureBindings: HydraStorageTextureBinding[] = shaderInfo.storageTextures.map((texture, index) => ({
    ...texture,
    binding: storageTextureOffset + index
  }))

  const textureDeclarations = textureBindings.map((texture) =>
    `@group(0) @binding(${texture.binding}) var ${texture.variableName}: texture_2d<f32>;`
  ).join('\n')
  const storageBufferDeclarations = storageBufferBindings.map((buffer) => {
    const elementType = toStorageElementType(buffer.elementType)
    const access = buffer.access === 'write' ? 'read_write' : buffer.access
    return `@group(0) @binding(${buffer.binding}) var<storage, ${access}> ${buffer.variableName}: array<${elementType}>;`
  }).join('\n')

  const storageTextureDeclarations = storageTextureBindings.map((texture) => {
    const format = toStorageTextureFormat(texture.format)
    const textureType = toStorageTextureType(format, texture.access, texture.dimension)
    return `@group(0) @binding(${texture.binding}) var ${texture.variableName}: ${textureType};`
  }).join('\n')

  const outputTextureBinding = storageTextureOffset + storageTextureBindings.length

  const functionDeclarations = shaderInfo.wgslFunctions.map((transform) => transform.transform.wgsl).join('\n')
  const utilityDeclarations = collectUtilityDeclarations(shaderInfo.wgslFunctions)
  const functionSignature = shaderInfo.wgslFunctions
    .map((transform) => `${transform.name}:${transform.transform.wgsl.length}`)
    .join(',')

  const signatureBase =
    `${shaderInfo.structureSignature}|u${shaderInfo.uniforms.length}|us${shaderInfo.uniformScalarCount}` +
    `|t${textureBindings.length}|sb${storageBufferBindings.length}|st${storageTextureBindings.length}` +
    `|rs${shaderInfo.schedule.resolutionScale}|sp${shaderInfo.schedule.sparse ? 1 : 0}|f${functionSignature}`

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
${storageBufferDeclarations}
${storageTextureDeclarations}
@group(0) @binding(${outputTextureBinding}) var outImage: texture_storage_2d<${DEFAULT_PASS_OUTPUT_FORMAT}, write>;

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

${utilityDeclarations}
${functionDeclarations}

@compute @workgroup_size(${workgroupSizeX}, ${workgroupSizeY}, ${workgroupSizeZ})
fn csMain(@builtin(global_invocation_id) invocationId: vec3u) {
  let width = max(1u, u32(globals.width));
  let height = max(1u, u32(globals.height));
  if (invocationId.x >= width || invocationId.y >= height) {
    return;
  }

  var st = vec2f(f32(invocationId.x) + 0.5, f32(invocationId.y) + 0.5) / vec2f(globals.width, globals.height);
  var c = vec4f(0.0);
  ${shaderInfo.fragColor}
  textureStore(outImage, vec2i(i32(invocationId.x), i32(invocationId.y)), c);
}
`

  const pipelineSignature = `${signatureBase}|cs${workgroupSizeX}x${workgroupSizeY}x${workgroupSizeZ}|h${hashString(wgsl)}`

  const dispatch: HydraDispatchConfig = {
    mode: 'direct',
    domain: 'pixel2d',
    workgroupSize: [workgroupSizeX, workgroupSizeY, workgroupSizeZ]
  }

  const compiled: HydraCompiledPass = {
    signature: pipelineSignature,
    wgsl,
    uniforms: shaderInfo.uniforms,
    textures: textureBindings,
    storageBuffers: storageBufferBindings,
    storageTextures: storageTextureBindings,
    output: {
      name: 'outImage',
      variableName: 'outImage',
      format: DEFAULT_PASS_OUTPUT_FORMAT,
      binding: outputTextureBinding
    },
    schedule: shaderInfo.schedule,
    dispatch,
    ir: buildPassIR({
      signature: pipelineSignature,
      schedule: shaderInfo.schedule,
      dispatch,
      uniforms: shaderInfo.uniforms,
      textures: textureBindings,
      storageBuffers: storageBufferBindings,
      storageTextures: storageTextureBindings,
      analysisOut,
      output: {
        name: 'outImage',
        variableName: 'outImage',
        format: DEFAULT_PASS_OUTPUT_FORMAT,
        binding: outputTextureBinding
      }
    })
  }
  if (analysisOut.length > 0) compiled.analysisOut = analysisOut

  return optimizePassIR(compiled)
}

const resolveLinearWorkgroupSize = (_transforms: HydraTransformCall[]): [number, number, number] => [64, 1, 1]

const compileLinearWgslPass = (
  transforms: HydraTransformCall[],
  maxDynamicUniforms = 256
): HydraCompiledPass => {
  const execution = resolvePassExecutionConfig(transforms)
  if (execution.domain !== 'linear1d') {
    throw new Error('compileLinearWgslPass() requires transforms in the linear1d execution domain.')
  }

  const itemCount = execution.dispatchItems
  if (!itemCount || itemCount <= 0) {
    throw new Error('Linear compute pass requires dispatchItems or a storageBuffer resource minLength > 0.')
  }

  const shaderInfo = generateWgsl(transforms)
  const analysisOut = collectAnalysisOutputs(transforms)
  const dynamicUniformVec4Count = Math.ceil(maxDynamicUniforms / 4)
  const [workgroupSizeX, workgroupSizeY, workgroupSizeZ] = resolveLinearWorkgroupSize(transforms)

  if (shaderInfo.uniformScalarCount > maxDynamicUniforms) {
    throw new Error(`Shader uses ${shaderInfo.uniformScalarCount} dynamic uniform scalars, but max is ${maxDynamicUniforms}.`)
  }

  const textureBindings: HydraTextureBinding[] = shaderInfo.textures.map((texture, index) => ({
    ...texture,
    binding: 3 + index
  }))

  const storageBufferOffset = 3 + textureBindings.length
  const storageBufferBindings: HydraStorageBufferBinding[] = shaderInfo.storageBuffers.map((buffer, index) => ({
    ...buffer,
    binding: storageBufferOffset + index
  }))

  const storageTextureOffset = storageBufferOffset + storageBufferBindings.length
  const storageTextureBindings: HydraStorageTextureBinding[] = shaderInfo.storageTextures.map((texture, index) => ({
    ...texture,
    binding: storageTextureOffset + index
  }))

  const outputTextureBinding = storageTextureOffset + storageTextureBindings.length

  const textureDeclarations = textureBindings.map((texture) =>
    `@group(0) @binding(${texture.binding}) var ${texture.variableName}: texture_2d<f32>;`
  ).join('\n')
  const storageBufferDeclarations = storageBufferBindings.map((buffer) => {
    const elementType = toStorageElementType(buffer.elementType)
    const access = buffer.access === 'write' ? 'read_write' : buffer.access
    return `@group(0) @binding(${buffer.binding}) var<storage, ${access}> ${buffer.variableName}: array<${elementType}>;`
  }).join('\n')
  const storageTextureDeclarations = storageTextureBindings.map((texture) => {
    const format = toStorageTextureFormat(texture.format)
    const textureType = toStorageTextureType(format, texture.access, texture.dimension)
    return `@group(0) @binding(${texture.binding}) var ${texture.variableName}: ${textureType};`
  }).join('\n')
  const outputDeclaration = execution.writesOutput
    ? `@group(0) @binding(${outputTextureBinding}) var outImage: texture_storage_2d<${DEFAULT_PASS_OUTPUT_FORMAT}, write>;`
    : ''

  const functionDeclarations = shaderInfo.wgslFunctions.map((transform) => transform.transform.wgsl).join('\n')
  const utilityDeclarations = collectUtilityDeclarations(shaderInfo.wgslFunctions)
  const functionSignature = shaderInfo.wgslFunctions
    .map((transform) => `${transform.name}:${transform.transform.wgsl.length}`)
    .join(',')

  const signatureBase =
    `${shaderInfo.structureSignature}|u${shaderInfo.uniforms.length}|us${shaderInfo.uniformScalarCount}` +
    `|t${textureBindings.length}|sb${storageBufferBindings.length}|st${storageTextureBindings.length}` +
    `|rs${shaderInfo.schedule.resolutionScale}|sp${shaderInfo.schedule.sparse ? 1 : 0}|f${functionSignature}` +
    `|dlinear|ks${execution.kernelSemantics}|n${itemCount}|o${execution.writesOutput ? 1 : 0}`

  const stAssignment = execution.kernelSemantics === 'index_first'
    ? 'var st = hydraLinearUv();'
    : `var st = vec2f((f32(linearIndex) + 0.5) / max(f32(${itemCount}), 1.0), 0.5);`

  const outputStoreSnippet = execution.writesOutput
    ? `
  let width = max(1u, u32(globals.width));
  let height = max(1u, u32(globals.height));
  let pixelCount = width * height;
  if (linearIndex < pixelCount) {
    let x = linearIndex % width;
    let y = linearIndex / width;
    textureStore(outImage, vec2i(i32(x), i32(y)), c);
  }
`
    : ''

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
${storageBufferDeclarations}
${storageTextureDeclarations}
${outputDeclaration}

var<private> hydraLinearIndexValue: u32;

fn hydraLinearIndex() -> u32 {
  return hydraLinearIndexValue;
}

fn hydraLinearCoord() -> vec2u {
  let width = max(1u, u32(globals.width));
  let x = hydraLinearIndexValue % width;
  let y = hydraLinearIndexValue / width;
  return vec2u(x, y);
}

fn hydraLinearUv() -> vec2f {
  let coord = hydraLinearCoord();
  let width = max(1.0, globals.width);
  let height = max(1.0, globals.height);
  return (vec2f(f32(coord.x), f32(coord.y)) + vec2f(0.5, 0.5)) / vec2f(width, height);
}

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

${utilityDeclarations}
${functionDeclarations}

@compute @workgroup_size(${workgroupSizeX}, ${workgroupSizeY}, ${workgroupSizeZ})
fn csMain(@builtin(global_invocation_id) invocationId: vec3u) {
  let linearIndex = invocationId.x;
  if (linearIndex >= ${itemCount}u) {
    return;
  }

  hydraLinearIndexValue = linearIndex;
  ${stAssignment}
  var c = vec4f(0.0);
  ${shaderInfo.fragColor}
${outputStoreSnippet}
}
`

  const pipelineSignature = `${signatureBase}|cs${workgroupSizeX}x${workgroupSizeY}x${workgroupSizeZ}|h${hashString(wgsl)}`

  const dispatch: HydraDispatchConfig = {
    mode: 'direct',
    domain: 'linear1d',
    workgroupSize: [workgroupSizeX, workgroupSizeY, workgroupSizeZ],
    itemCount
  }

  const output = execution.writesOutput
    ? {
      name: 'outImage',
      variableName: 'outImage',
      format: DEFAULT_PASS_OUTPUT_FORMAT,
      binding: outputTextureBinding
    }
    : undefined

  const compiled: HydraCompiledPass = {
    signature: pipelineSignature,
    wgsl,
    uniforms: shaderInfo.uniforms,
    textures: textureBindings,
    storageBuffers: storageBufferBindings,
    storageTextures: storageTextureBindings,
    schedule: shaderInfo.schedule,
    dispatch,
    ir: buildPassIR({
      signature: pipelineSignature,
      schedule: shaderInfo.schedule,
      dispatch,
      uniforms: shaderInfo.uniforms,
      textures: textureBindings,
      storageBuffers: storageBufferBindings,
      storageTextures: storageTextureBindings,
      analysisOut,
      ...(output ? { output } : {})
    })
  }
  if (output) compiled.output = output
  if (analysisOut.length > 0) compiled.analysisOut = analysisOut

  return optimizePassIR(compiled)
}

type TiledBlurAxis = 'x' | 'y'
type SeparableBlurVariant = 'generic' | 'tiled' | 'subgroup'

interface SeparableBlurConfig {
  axis: TiledBlurAxis
  preferredVariant: SeparableBlurVariant | 'auto'
  allowSubgroups: boolean
}

const TILED_BLUR_MAX_STRIDE = 4
const TILED_BLUR_TILE_SIZES = [128, 64, 32]

interface TiledBlurConfig {
  workgroupSize: number
  halo: number
  tileLength: number
  requiredBytes: number
}

const resolveTiledBlurConfig = (workgroupSize: number): TiledBlurConfig => {
  const halo = TILED_BLUR_MAX_STRIDE * 4
  const tileLength = workgroupSize + halo * 2
  return {
    workgroupSize,
    halo,
    tileLength,
    requiredBytes: tileLength * 16
  }
}

const resolveSeparableBlurConfig = (transforms: HydraTransformCall[]): SeparableBlurConfig | null => {
  if (transforms.length !== 1) return null
  const only = transforms[0]?.transform
  const kernel = only?.computeKernel
  if (!kernel || kernel.kind !== 'separableBlur') return null
  return {
    axis: kernel.axis,
    preferredVariant: kernel.preferredVariant ?? 'auto',
    allowSubgroups: Boolean(kernel.allowSubgroups)
  }
}

const buildTiledBlurBody = (
  axis: TiledBlurAxis,
  amountExpression: string,
  config: TiledBlurConfig,
  subgroupNoopExpression = '0.0'
): string => {
  const { workgroupSize, halo } = config
  const edgeStart = Math.max(1, workgroupSize - halo)
  if (axis === 'x') {
    return `
  if (invocationId.y >= height) {
    return;
  }

  let localX = i32(localId.x);
  let groupBaseX = i32(workgroupId.x) * ${workgroupSize};
  let sourceX = groupBaseX + localX;
  let sourceY = i32(invocationId.y);
  let baseIndex = localX + ${halo};

  tile[baseIndex] = hydraSamplePixelClamp(sourceX, sourceY);
  if (localX < ${halo}) {
    tile[localX] = hydraSamplePixelClamp(sourceX - ${halo}, sourceY);
  }
  if (localX >= ${edgeStart}) {
    tile[localX + ${halo * 2}] = hydraSamplePixelClamp(sourceX + ${halo}, sourceY);
  }

  workgroupBarrier();

  if (invocationId.x >= width) {
    return;
  }

  let stride = clamp(i32(round(max(${amountExpression}, 1.0))), 1, ${TILED_BLUR_MAX_STRIDE});
  let c =
    tile[baseIndex] * 0.227027027 +
    (tile[baseIndex + stride] + tile[baseIndex - stride]) * 0.194594595 +
    (tile[baseIndex + stride * 2] + tile[baseIndex - stride * 2]) * 0.121621622 +
    (tile[baseIndex + stride * 3] + tile[baseIndex - stride * 3]) * 0.054054054 +
    (tile[baseIndex + stride * 4] + tile[baseIndex - stride * 4]) * 0.016216216 +
    vec4f(${subgroupNoopExpression});

  textureStore(outImage, vec2i(i32(invocationId.x), sourceY), c);
`
  }

  return `
  if (invocationId.x >= width) {
    return;
  }

  let localY = i32(localId.y);
  let groupBaseY = i32(workgroupId.y) * ${workgroupSize};
  let sourceY = groupBaseY + localY;
  let sourceX = i32(invocationId.x);
  let baseIndex = localY + ${halo};

  tile[baseIndex] = hydraSamplePixelClamp(sourceX, sourceY);
  if (localY < ${halo}) {
    tile[localY] = hydraSamplePixelClamp(sourceX, sourceY - ${halo});
  }
  if (localY >= ${edgeStart}) {
    tile[localY + ${halo * 2}] = hydraSamplePixelClamp(sourceX, sourceY + ${halo});
  }

  workgroupBarrier();

  if (invocationId.y >= height) {
    return;
  }

  let stride = clamp(i32(round(max(${amountExpression}, 1.0))), 1, ${TILED_BLUR_MAX_STRIDE});
  let c =
    tile[baseIndex] * 0.227027027 +
    (tile[baseIndex + stride] + tile[baseIndex - stride]) * 0.194594595 +
    (tile[baseIndex + stride * 2] + tile[baseIndex - stride * 2]) * 0.121621622 +
    (tile[baseIndex + stride * 3] + tile[baseIndex - stride * 3]) * 0.054054054 +
    (tile[baseIndex + stride * 4] + tile[baseIndex - stride * 4]) * 0.016216216 +
    vec4f(${subgroupNoopExpression});

  textureStore(outImage, vec2i(sourceX, i32(invocationId.y)), c);
`
}

const compileSeparableBlurVariantPass = (
  transforms: HydraTransformCall[],
  maxDynamicUniforms: number,
  config: SeparableBlurConfig,
  variant: Exclude<SeparableBlurVariant, 'generic'>,
  fallbackPass: HydraCompiledPass,
  tileConfig: TiledBlurConfig
): HydraCompiledPass => {
  const axis = config.axis
  const isSubgroupVariant = variant === 'subgroup'

  const transform = transforms[0]
  const args = formatArguments(transform, 0)
  const amountArg = args[0]
  const uniforms: HydraUniformBinding[] = []
  let uniformScalarCount = 0
  let amountExpression = '1.0'

  if (amountArg?.isUniform && amountArg.uniformName && typeof amountArg.value === 'function') {
    uniforms.push({
      name: amountArg.uniformName,
      index: 0,
      size: 1,
      value: amountArg.value,
      type: amountArg.type
    })
    uniformScalarCount = 1
    amountExpression = 'hydraDynamicUniform(0u)'
  } else if (typeof amountArg?.literal !== 'undefined') {
    amountExpression = amountArg.literal
  }

  if (uniformScalarCount > maxDynamicUniforms) {
    throw new Error(`Shader uses ${uniformScalarCount} dynamic uniform scalars, but max is ${maxDynamicUniforms}.`)
  }

  const schedule = mergePassSchedule(transforms)
  const dynamicUniformVec4Count = Math.ceil(maxDynamicUniforms / 4)
  const includeDynamicUniforms = uniforms.length > 0
  const [workgroupSizeX, workgroupSizeY, workgroupSizeZ] = axis === 'x'
    ? [tileConfig.workgroupSize, 1, 1]
    : [1, tileConfig.workgroupSize, 1]
  const subgroupNoopExpression = isSubgroupVariant ? 'subgroupNorm * 0.0' : '0.0'
  const tiledBody = buildTiledBlurBody(axis, amountExpression, tileConfig, subgroupNoopExpression)
  const structureSignature = buildStructureSignature(transforms)
  const analysisOut = collectAnalysisOutputs(transforms)
  const textureBindings: HydraTextureBinding[] = [{
    name: 'prevBuffer',
    variableName: 'prevBuffer',
    getTexture: null,
    isPrev: true,
    binding: 3
  }]
  const outputBinding = 4
  const dynamicUniformDeclarations = includeDynamicUniforms
    ? `
struct DynamicUniforms {
  values: array<vec4f, ${dynamicUniformVec4Count}>,
};

@group(0) @binding(1) var<uniform> dynamicUniforms: DynamicUniforms;

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
    : ''
  const subgroupBuiltins = isSubgroupVariant
    ? `,
  @builtin(subgroup_invocation_id) subgroupInvocationId: u32,
  @builtin(subgroup_size) subgroupSize: u32`
    : ''
  const subgroupPrelude = isSubgroupVariant
    ? `  let subgroupNorm = (f32(subgroupInvocationId) + 1.0) / max(f32(subgroupSize), 1.0);\n`
    : ''

  const wgsl = `
struct GlobalUniforms {
  time: f32,
  bpm: f32,
  width: f32,
  height: f32,
};

@group(0) @binding(0) var<uniform> globals: GlobalUniforms;
${dynamicUniformDeclarations}
@group(0) @binding(2) var hydraSampler: sampler;
@group(0) @binding(3) var prevBuffer: texture_2d<f32>;
@group(0) @binding(${outputBinding}) var outImage: texture_storage_2d<${DEFAULT_PASS_OUTPUT_FORMAT}, write>;

fn hydraSampleTexture(tex: texture_2d<f32>, uv: vec2f) -> vec4f {
  return textureSampleLevel(tex, hydraSampler, fract(uv), 0.0);
}

fn hydraSamplePixelClamp(x: i32, y: i32) -> vec4f {
  let maxX = i32(max(1.0, globals.width)) - 1;
  let maxY = i32(max(1.0, globals.height)) - 1;
  let clampedX = clamp(x, 0, maxX);
  let clampedY = clamp(y, 0, maxY);
  let uv = vec2f(f32(clampedX) + 0.5, f32(clampedY) + 0.5) / vec2f(globals.width, globals.height);
  return hydraSampleTexture(prevBuffer, uv);
}

var<workgroup> tile: array<vec4f, ${tileConfig.tileLength}>;

@compute @workgroup_size(${workgroupSizeX}, ${workgroupSizeY}, ${workgroupSizeZ})
fn csMain(
  @builtin(global_invocation_id) invocationId: vec3u,
  @builtin(local_invocation_id) localId: vec3u,
  @builtin(workgroup_id) workgroupId: vec3u${subgroupBuiltins}
) {
  let width = max(1u, u32(globals.width));
  let height = max(1u, u32(globals.height));
${subgroupPrelude}${tiledBody}
}
`

  const signatureBase =
    `${structureSignature}|separableBlur${axis}|variant${variant}|tile${tileConfig.workgroupSize}` +
    `|u${uniforms.length}|us${uniformScalarCount}|t1|sb0|st0|rs${schedule.resolutionScale}|sp${schedule.sparse ? 1 : 0}`
  const pipelineSignature = `${signatureBase}|cs${workgroupSizeX}x${workgroupSizeY}x${workgroupSizeZ}|h${hashString(wgsl)}`
  const dispatch: HydraDispatchConfig = {
    mode: 'indirect',
    domain: 'pixel2d',
    workgroupSize: [workgroupSizeX, workgroupSizeY, workgroupSizeZ],
    requiredWorkgroupStorageBytes: tileConfig.requiredBytes
  }
  if (isSubgroupVariant) dispatch.requiredFeatures = ['subgroups']
  const output = {
    name: 'outImage',
    variableName: 'outImage',
    format: DEFAULT_PASS_OUTPUT_FORMAT,
    binding: outputBinding
  }
  const compiled: HydraCompiledPass = {
    signature: pipelineSignature,
    wgsl,
    uniforms,
    textures: textureBindings,
    storageBuffers: [],
    storageTextures: [],
    output,
    schedule,
    dispatch,
    ir: buildPassIR({
      signature: pipelineSignature,
      schedule,
      dispatch,
      uniforms,
      textures: textureBindings,
      storageBuffers: [],
      storageTextures: [],
      analysisOut,
      output
    }),
    fallbackPass
  }
  if (analysisOut.length > 0) compiled.analysisOut = analysisOut

  return optimizePassIR(compiled)
}

const compileSeparableBlurPass = (
  transforms: HydraTransformCall[],
  maxDynamicUniforms: number
): HydraCompiledPass | null => {
  const config = resolveSeparableBlurConfig(transforms)
  if (!config) return null

  const genericPass = compileGenericWgslPass(transforms, maxDynamicUniforms)
  if (config.preferredVariant === 'generic') return genericPass
  const buildVariantChain = (
    variant: Exclude<SeparableBlurVariant, 'generic'>,
    fallback: HydraCompiledPass
  ): HydraCompiledPass => {
    let chain = fallback
    for (let index = TILED_BLUR_TILE_SIZES.length - 1; index >= 0; index -= 1) {
      const tileConfig = resolveTiledBlurConfig(TILED_BLUR_TILE_SIZES[index])
      chain = compileSeparableBlurVariantPass(
        transforms,
        maxDynamicUniforms,
        config,
        variant,
        chain,
        tileConfig
      )
    }
    return chain
  }

  const tiledPass = buildVariantChain('tiled', genericPass)
  if (!config.allowSubgroups || config.preferredVariant === 'tiled') return tiledPass

  const subgroupPass = buildVariantChain('subgroup', tiledPass)
  return subgroupPass
}

type Stencil3x3Variant = 'generic' | 'tiled' | 'subgroup'

interface Stencil3x3Config {
  operator: 'edgeDetect' | 'edgeLaplacian'
  preferredVariant: Stencil3x3Variant | 'auto'
  allowSubgroups: boolean
}

const STENCIL_HALO = 1
const STENCIL_TILE_SIZES = [16, 8]

interface StencilTileConfig {
  workgroupSizeX: number
  workgroupSizeY: number
  tileWidth: number
  tileHeight: number
  tileLength: number
  requiredBytes: number
}

const resolveStencilTileConfig = (size: number): StencilTileConfig => {
  const workgroupSizeX = Math.max(1, Math.floor(size))
  const workgroupSizeY = Math.max(1, Math.floor(size))
  const tileWidth = workgroupSizeX + STENCIL_HALO * 2
  const tileHeight = workgroupSizeY + STENCIL_HALO * 2
  const tileLength = tileWidth * tileHeight
  return {
    workgroupSizeX,
    workgroupSizeY,
    tileWidth,
    tileHeight,
    tileLength,
    requiredBytes: tileLength * 16
  }
}

const CONVOLUTION_MAX_STRIDE = 4
const CONVOLUTION_TILE_SIZES = [16, 8]

interface Convolution3x3Config {
  weights: number[]
  radiusInputIndex: number
  preferredVariant: Stencil3x3Variant | 'auto'
  allowSubgroups: boolean
}

interface ConvolutionTileConfig {
  workgroupSizeX: number
  workgroupSizeY: number
  halo: number
  tileWidth: number
  tileHeight: number
  tileLength: number
  requiredBytes: number
}

const resolveConvolutionTileConfig = (size: number): ConvolutionTileConfig => {
  const workgroupSizeX = Math.max(1, Math.floor(size))
  const workgroupSizeY = Math.max(1, Math.floor(size))
  const halo = CONVOLUTION_MAX_STRIDE
  const tileWidth = workgroupSizeX + halo * 2
  const tileHeight = workgroupSizeY + halo * 2
  const tileLength = tileWidth * tileHeight
  return {
    workgroupSizeX,
    workgroupSizeY,
    halo,
    tileWidth,
    tileHeight,
    tileLength,
    requiredBytes: tileLength * 16
  }
}

const resolveConvolution3x3Config = (transforms: HydraTransformCall[]): Convolution3x3Config | null => {
  if (transforms.length !== 1) return null
  const only = transforms[0]?.transform
  const kernel = only?.computeKernel
  if (!kernel || kernel.kind !== 'convolution3x3') return null
  const rawWeights = Array.isArray(kernel.weights) ? kernel.weights : []
  const weights: number[] = []
  for (let index = 0; index < 9; index += 1) {
    const value = rawWeights[index]
    weights.push(typeof value === 'number' && Number.isFinite(value) ? value : 0)
  }
  return {
    weights,
    radiusInputIndex: Math.max(0, Math.floor(kernel.radiusInputIndex ?? 0)),
    preferredVariant: kernel.preferredVariant ?? 'auto',
    allowSubgroups: Boolean(kernel.allowSubgroups)
  }
}

const resolveStencil3x3Config = (transforms: HydraTransformCall[]): Stencil3x3Config | null => {
  if (transforms.length !== 1) return null
  const only = transforms[0]?.transform
  const kernel = only?.computeKernel
  if (!kernel || kernel.kind !== 'stencil3x3') return null
  return {
    operator: kernel.operator,
    preferredVariant: kernel.preferredVariant ?? 'auto',
    allowSubgroups: Boolean(kernel.allowSubgroups)
  }
}

const buildStencil3x3Body = (
  operator: Stencil3x3Config['operator'],
  amountExpression: string,
  mixAmountExpression: string,
  tileConfig: StencilTileConfig,
  subgroupNoopExpression = '0.0'
): string => {
  const edgeX = Math.max(0, tileConfig.workgroupSizeX - 1)
  const edgeY = Math.max(0, tileConfig.workgroupSizeY - 1)
  const sharedLoad = `
  let localX = i32(localId.x);
  let localY = i32(localId.y);
  let sourceX = i32(invocationId.x);
  let sourceY = i32(invocationId.y);
  let tileX = localX + ${STENCIL_HALO};
  let tileY = localY + ${STENCIL_HALO};
  let centerIndex = hydraTileIndex(tileX, tileY);

  tile[centerIndex] = hydraSamplePixelClamp(sourceX, sourceY);

  if (localX == 0) {
    tile[hydraTileIndex(tileX - 1, tileY)] = hydraSamplePixelClamp(sourceX - 1, sourceY);
  }
  if (localX == ${edgeX}) {
    tile[hydraTileIndex(tileX + 1, tileY)] = hydraSamplePixelClamp(sourceX + 1, sourceY);
  }
  if (localY == 0) {
    tile[hydraTileIndex(tileX, tileY - 1)] = hydraSamplePixelClamp(sourceX, sourceY - 1);
  }
  if (localY == ${edgeY}) {
    tile[hydraTileIndex(tileX, tileY + 1)] = hydraSamplePixelClamp(sourceX, sourceY + 1);
  }

  if (localX == 0 && localY == 0) {
    tile[hydraTileIndex(tileX - 1, tileY - 1)] = hydraSamplePixelClamp(sourceX - 1, sourceY - 1);
  }
  if (localX == ${edgeX} && localY == 0) {
    tile[hydraTileIndex(tileX + 1, tileY - 1)] = hydraSamplePixelClamp(sourceX + 1, sourceY - 1);
  }
  if (localX == 0 && localY == ${edgeY}) {
    tile[hydraTileIndex(tileX - 1, tileY + 1)] = hydraSamplePixelClamp(sourceX - 1, sourceY + 1);
  }
  if (localX == ${edgeX} && localY == ${edgeY}) {
    tile[hydraTileIndex(tileX + 1, tileY + 1)] = hydraSamplePixelClamp(sourceX + 1, sourceY + 1);
  }

  workgroupBarrier();

  if (invocationId.x >= width || invocationId.y >= height) {
    return;
  }

  let c00 = tile[hydraTileIndex(tileX - 1, tileY - 1)];
  let c10 = tile[hydraTileIndex(tileX, tileY - 1)];
  let c20 = tile[hydraTileIndex(tileX + 1, tileY - 1)];
  let c01 = tile[hydraTileIndex(tileX - 1, tileY)];
  let c11 = tile[hydraTileIndex(tileX, tileY)];
  let c21 = tile[hydraTileIndex(tileX + 1, tileY)];
  let c02 = tile[hydraTileIndex(tileX - 1, tileY + 1)];
  let c12 = tile[hydraTileIndex(tileX, tileY + 1)];
  let c22 = tile[hydraTileIndex(tileX + 1, tileY + 1)];
`

  if (operator === 'edgeDetect') {
    return `
${sharedLoad}
  let l00 = hydraLuminance(c00.xyz);
  let l10 = hydraLuminance(c10.xyz);
  let l20 = hydraLuminance(c20.xyz);
  let l01 = hydraLuminance(c01.xyz);
  let l21 = hydraLuminance(c21.xyz);
  let l02 = hydraLuminance(c02.xyz);
  let l12 = hydraLuminance(c12.xyz);
  let l22 = hydraLuminance(c22.xyz);

  let gx = (3.0 * (l20 + l22 - l00 - l02) + 10.0 * (l21 - l01)) / 16.0;
  let gy = (3.0 * (l02 + l22 - l00 - l20) + 10.0 * (l12 - l10)) / 16.0;
  let edge = clamp(length(vec2f(gx, gy)) * ${amountExpression} * 1.25, 0.0, 1.0);
  let blend = clamp(${mixAmountExpression}, 0.0, 1.0);
  let edgeColor = vec3f(edge);
  let outColor = vec4f(c11.xyz * (1.0 - blend) + edgeColor * blend, c11.w) + vec4f(${subgroupNoopExpression});
  textureStore(outImage, vec2i(sourceX, sourceY), outColor);
`
  }

  return `
${sharedLoad}
  let lap = abs((c12.xyz + c10.xyz + c21.xyz + c01.xyz) - c11.xyz * vec3f(4.0));
  let edge = clamp(lap * vec3f(${amountExpression}), vec3f(0.0), vec3f(1.0));
  let blend = clamp(${mixAmountExpression}, 0.0, 1.0);
  let outColor = vec4f(mix(c11.xyz, edge, vec3f(blend)), c11.w) + vec4f(${subgroupNoopExpression});
  textureStore(outImage, vec2i(sourceX, sourceY), outColor);
`
}

const compileStencil3x3VariantPass = (
  transforms: HydraTransformCall[],
  maxDynamicUniforms: number,
  config: Stencil3x3Config,
  variant: Exclude<Stencil3x3Variant, 'generic'>,
  fallbackPass: HydraCompiledPass,
  tileConfig: StencilTileConfig
): HydraCompiledPass => {
  const isSubgroupVariant = variant === 'subgroup'

  const transform = transforms[0]
  const args = formatArguments(transform, 0)
  const amountArg = args[0]
  const mixAmountArg = args[1]
  const uniforms: HydraUniformBinding[] = []
  let uniformScalarCount = 0

  const resolveScalarExpression = (
    arg: HydraTypedArgument | undefined,
    fallback: string
  ): string => {
    if (arg?.isUniform && arg.uniformName && typeof arg.value === 'function') {
      const index = uniformScalarCount
      uniforms.push({
        name: arg.uniformName,
        index,
        size: 1,
        value: arg.value,
        type: arg.type
      })
      uniformScalarCount += 1
      return `hydraDynamicUniform(${index}u)`
    }
    if (typeof arg?.literal !== 'undefined') return arg.literal
    return fallback
  }

  const amountExpression = resolveScalarExpression(amountArg, '1.0')
  const mixAmountExpression = resolveScalarExpression(mixAmountArg, '1.0')

  if (uniformScalarCount > maxDynamicUniforms) {
    throw new Error(`Shader uses ${uniformScalarCount} dynamic uniform scalars, but max is ${maxDynamicUniforms}.`)
  }

  const schedule = mergePassSchedule(transforms)
  const dynamicUniformVec4Count = Math.ceil(maxDynamicUniforms / 4)
  const includeDynamicUniforms = uniforms.length > 0
  const [workgroupSizeX, workgroupSizeY, workgroupSizeZ] = [
    tileConfig.workgroupSizeX,
    tileConfig.workgroupSizeY,
    1
  ]
  const subgroupNoopExpression = isSubgroupVariant ? 'subgroupNorm * 0.0' : '0.0'
  const tiledBody = buildStencil3x3Body(
    config.operator,
    amountExpression,
    mixAmountExpression,
    tileConfig,
    subgroupNoopExpression
  )
  const structureSignature = buildStructureSignature(transforms)
  const analysisOut = collectAnalysisOutputs(transforms)
  const textureBindings: HydraTextureBinding[] = [{
    name: 'prevBuffer',
    variableName: 'prevBuffer',
    getTexture: null,
    isPrev: true,
    binding: 3
  }]
  const outputBinding = 4
  const dynamicUniformDeclarations = includeDynamicUniforms
    ? `
struct DynamicUniforms {
  values: array<vec4f, ${dynamicUniformVec4Count}>,
};

@group(0) @binding(1) var<uniform> dynamicUniforms: DynamicUniforms;

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
    : ''
  const subgroupBuiltins = isSubgroupVariant
    ? `,
  @builtin(subgroup_invocation_id) subgroupInvocationId: u32,
  @builtin(subgroup_size) subgroupSize: u32`
    : ''
  const subgroupPrelude = isSubgroupVariant
    ? `  let subgroupNorm = (f32(subgroupInvocationId) + 1.0) / max(f32(subgroupSize), 1.0);\n`
    : ''

  const wgsl = `
struct GlobalUniforms {
  time: f32,
  bpm: f32,
  width: f32,
  height: f32,
};

@group(0) @binding(0) var<uniform> globals: GlobalUniforms;
${dynamicUniformDeclarations}
@group(0) @binding(2) var hydraSampler: sampler;
@group(0) @binding(3) var prevBuffer: texture_2d<f32>;
@group(0) @binding(${outputBinding}) var outImage: texture_storage_2d<${DEFAULT_PASS_OUTPUT_FORMAT}, write>;

fn hydraSampleTexture(tex: texture_2d<f32>, uv: vec2f) -> vec4f {
  return textureSampleLevel(tex, hydraSampler, fract(uv), 0.0);
}

fn hydraSamplePixelClamp(x: i32, y: i32) -> vec4f {
  let maxX = i32(max(1.0, globals.width)) - 1;
  let maxY = i32(max(1.0, globals.height)) - 1;
  let clampedX = clamp(x, 0, maxX);
  let clampedY = clamp(y, 0, maxY);
  let uv = vec2f(f32(clampedX) + 0.5, f32(clampedY) + 0.5) / vec2f(globals.width, globals.height);
  return hydraSampleTexture(prevBuffer, uv);
}

fn hydraLuminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.299, 0.587, 0.114));
}

fn hydraTileIndex(x: i32, y: i32) -> i32 {
  return y * ${tileConfig.tileWidth} + x;
}

var<workgroup> tile: array<vec4f, ${tileConfig.tileLength}>;

@compute @workgroup_size(${workgroupSizeX}, ${workgroupSizeY}, ${workgroupSizeZ})
fn csMain(
  @builtin(global_invocation_id) invocationId: vec3u,
  @builtin(local_invocation_id) localId: vec3u,
  @builtin(workgroup_id) workgroupId: vec3u${subgroupBuiltins}
) {
  let width = max(1u, u32(globals.width));
  let height = max(1u, u32(globals.height));
${subgroupPrelude}${tiledBody}
}
`

  const signatureBase =
    `${structureSignature}|stencil3x3${config.operator}|variant${variant}|tile${workgroupSizeX}x${workgroupSizeY}` +
    `|u${uniforms.length}|us${uniformScalarCount}|t1|sb0|st0|rs${schedule.resolutionScale}|sp${schedule.sparse ? 1 : 0}`
  const pipelineSignature = `${signatureBase}|cs${workgroupSizeX}x${workgroupSizeY}x${workgroupSizeZ}|h${hashString(wgsl)}`
  const dispatch: HydraDispatchConfig = {
    mode: 'indirect',
    domain: 'pixel2d',
    workgroupSize: [workgroupSizeX, workgroupSizeY, workgroupSizeZ],
    requiredWorkgroupStorageBytes: tileConfig.requiredBytes
  }
  if (isSubgroupVariant) dispatch.requiredFeatures = ['subgroups']
  const output = {
    name: 'outImage',
    variableName: 'outImage',
    format: DEFAULT_PASS_OUTPUT_FORMAT,
    binding: outputBinding
  }
  const compiled: HydraCompiledPass = {
    signature: pipelineSignature,
    wgsl,
    uniforms,
    textures: textureBindings,
    storageBuffers: [],
    storageTextures: [],
    output,
    schedule,
    dispatch,
    ir: buildPassIR({
      signature: pipelineSignature,
      schedule,
      dispatch,
      uniforms,
      textures: textureBindings,
      storageBuffers: [],
      storageTextures: [],
      analysisOut,
      output
    }),
    fallbackPass
  }
  if (analysisOut.length > 0) compiled.analysisOut = analysisOut

  return optimizePassIR(compiled)
}

const compileStencil3x3Pass = (
  transforms: HydraTransformCall[],
  maxDynamicUniforms: number
): HydraCompiledPass | null => {
  const config = resolveStencil3x3Config(transforms)
  if (!config) return null

  const genericPass = compileGenericWgslPass(transforms, maxDynamicUniforms)
  if (config.preferredVariant === 'generic') return genericPass
  const buildVariantChain = (
    variant: Exclude<Stencil3x3Variant, 'generic'>,
    fallback: HydraCompiledPass
  ): HydraCompiledPass => {
    let chain = fallback
    for (let index = STENCIL_TILE_SIZES.length - 1; index >= 0; index -= 1) {
      const tileConfig = resolveStencilTileConfig(STENCIL_TILE_SIZES[index])
      chain = compileStencil3x3VariantPass(
        transforms,
        maxDynamicUniforms,
        config,
        variant,
        chain,
        tileConfig
      )
    }
    return chain
  }

  const tiledPass = buildVariantChain('tiled', genericPass)
  if (!config.allowSubgroups || config.preferredVariant === 'tiled') return tiledPass

  const subgroupPass = buildVariantChain('subgroup', tiledPass)
  return subgroupPass
}

const buildConvolution3x3Body = (
  weights: number[],
  radiusExpression: string,
  tileConfig: ConvolutionTileConfig,
  subgroupNoopExpression = '0.0'
): string => {
  const w = weights.map((value) => toFloatLiteral(value))
  return `
  let localX = i32(localId.x);
  let localY = i32(localId.y);
  let groupBaseX = i32(workgroupId.x) * ${tileConfig.workgroupSizeX} - ${tileConfig.halo};
  let groupBaseY = i32(workgroupId.y) * ${tileConfig.workgroupSizeY} - ${tileConfig.halo};

  for (var loadY = localY; loadY < ${tileConfig.tileHeight}; loadY += ${tileConfig.workgroupSizeY}) {
    let sourceY = groupBaseY + loadY;
    for (var loadX = localX; loadX < ${tileConfig.tileWidth}; loadX += ${tileConfig.workgroupSizeX}) {
      let sourceX = groupBaseX + loadX;
      tile[hydraTileIndex(loadX, loadY)] = hydraSamplePixelClamp(sourceX, sourceY);
    }
  }

  workgroupBarrier();

  if (invocationId.x >= width || invocationId.y >= height) {
    return;
  }

  let sourceX = i32(invocationId.x);
  let sourceY = i32(invocationId.y);
  let tileX = localX + ${tileConfig.halo};
  let tileY = localY + ${tileConfig.halo};
  let stride = clamp(i32(round(max(${radiusExpression}, 1.0))), 1, ${CONVOLUTION_MAX_STRIDE});
  let c00 = tile[hydraTileIndex(tileX - stride, tileY - stride)];
  let c10 = tile[hydraTileIndex(tileX, tileY - stride)];
  let c20 = tile[hydraTileIndex(tileX + stride, tileY - stride)];
  let c01 = tile[hydraTileIndex(tileX - stride, tileY)];
  let c11 = tile[hydraTileIndex(tileX, tileY)];
  let c21 = tile[hydraTileIndex(tileX + stride, tileY)];
  let c02 = tile[hydraTileIndex(tileX - stride, tileY + stride)];
  let c12 = tile[hydraTileIndex(tileX, tileY + stride)];
  let c22 = tile[hydraTileIndex(tileX + stride, tileY + stride)];

  let outColor =
    c00 * ${w[0]} +
    c10 * ${w[1]} +
    c20 * ${w[2]} +
    c01 * ${w[3]} +
    c11 * ${w[4]} +
    c21 * ${w[5]} +
    c02 * ${w[6]} +
    c12 * ${w[7]} +
    c22 * ${w[8]} +
    vec4f(${subgroupNoopExpression});

  textureStore(outImage, vec2i(sourceX, sourceY), outColor);
`
}

const compileConvolution3x3VariantPass = (
  transforms: HydraTransformCall[],
  maxDynamicUniforms: number,
  config: Convolution3x3Config,
  variant: Exclude<Stencil3x3Variant, 'generic'>,
  fallbackPass: HydraCompiledPass,
  tileConfig: ConvolutionTileConfig
): HydraCompiledPass => {
  const isSubgroupVariant = variant === 'subgroup'
  const transform = transforms[0]
  const args = formatArguments(transform, 0)
  const radiusArg = args[config.radiusInputIndex]
  const uniforms: HydraUniformBinding[] = []
  let uniformScalarCount = 0

  const resolveScalarExpression = (
    arg: HydraTypedArgument | undefined,
    fallback: string
  ): string => {
    if (arg?.isUniform && arg.uniformName && typeof arg.value === 'function') {
      const index = uniformScalarCount
      uniforms.push({
        name: arg.uniformName,
        index,
        size: 1,
        value: arg.value,
        type: arg.type
      })
      uniformScalarCount += 1
      return `hydraDynamicUniform(${index}u)`
    }
    if (typeof arg?.literal !== 'undefined') return arg.literal
    return fallback
  }

  const radiusExpression = resolveScalarExpression(radiusArg, '1.0')
  if (uniformScalarCount > maxDynamicUniforms) {
    throw new Error(`Shader uses ${uniformScalarCount} dynamic uniform scalars, but max is ${maxDynamicUniforms}.`)
  }

  const schedule = mergePassSchedule(transforms)
  const dynamicUniformVec4Count = Math.ceil(maxDynamicUniforms / 4)
  const includeDynamicUniforms = uniforms.length > 0
  const [workgroupSizeX, workgroupSizeY, workgroupSizeZ] = [
    tileConfig.workgroupSizeX,
    tileConfig.workgroupSizeY,
    1
  ]
  const subgroupNoopExpression = isSubgroupVariant ? 'subgroupNorm * 0.0' : '0.0'
  const tiledBody = buildConvolution3x3Body(config.weights, radiusExpression, tileConfig, subgroupNoopExpression)
  const structureSignature = buildStructureSignature(transforms)
  const analysisOut = collectAnalysisOutputs(transforms)
  const textureBindings: HydraTextureBinding[] = [{
    name: 'prevBuffer',
    variableName: 'prevBuffer',
    getTexture: null,
    isPrev: true,
    binding: 3
  }]
  const outputBinding = 4
  const dynamicUniformDeclarations = includeDynamicUniforms
    ? `
struct DynamicUniforms {
  values: array<vec4f, ${dynamicUniformVec4Count}>,
};

@group(0) @binding(1) var<uniform> dynamicUniforms: DynamicUniforms;

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
    : ''
  const subgroupBuiltins = isSubgroupVariant
    ? `,
  @builtin(subgroup_invocation_id) subgroupInvocationId: u32,
  @builtin(subgroup_size) subgroupSize: u32`
    : ''
  const subgroupPrelude = isSubgroupVariant
    ? `  let subgroupNorm = (f32(subgroupInvocationId) + 1.0) / max(f32(subgroupSize), 1.0);\n`
    : ''

  const wgsl = `
struct GlobalUniforms {
  time: f32,
  bpm: f32,
  width: f32,
  height: f32,
};

@group(0) @binding(0) var<uniform> globals: GlobalUniforms;
${dynamicUniformDeclarations}
@group(0) @binding(2) var hydraSampler: sampler;
@group(0) @binding(3) var prevBuffer: texture_2d<f32>;
@group(0) @binding(${outputBinding}) var outImage: texture_storage_2d<${DEFAULT_PASS_OUTPUT_FORMAT}, write>;

fn hydraSampleTexture(tex: texture_2d<f32>, uv: vec2f) -> vec4f {
  return textureSampleLevel(tex, hydraSampler, fract(uv), 0.0);
}

fn hydraSamplePixelClamp(x: i32, y: i32) -> vec4f {
  let maxX = i32(max(1.0, globals.width)) - 1;
  let maxY = i32(max(1.0, globals.height)) - 1;
  let clampedX = clamp(x, 0, maxX);
  let clampedY = clamp(y, 0, maxY);
  let uv = vec2f(f32(clampedX) + 0.5, f32(clampedY) + 0.5) / vec2f(globals.width, globals.height);
  return hydraSampleTexture(prevBuffer, uv);
}

fn hydraTileIndex(x: i32, y: i32) -> i32 {
  return y * ${tileConfig.tileWidth} + x;
}

var<workgroup> tile: array<vec4f, ${tileConfig.tileLength}>;

@compute @workgroup_size(${workgroupSizeX}, ${workgroupSizeY}, ${workgroupSizeZ})
fn csMain(
  @builtin(global_invocation_id) invocationId: vec3u,
  @builtin(local_invocation_id) localId: vec3u${subgroupBuiltins}
) {
  let width = max(1u, u32(globals.width));
  let height = max(1u, u32(globals.height));
${subgroupPrelude}${tiledBody}
}
`

  const weightSignature = hashString(config.weights.map((value) => toFloatLiteral(value)).join(','))
  const signatureBase =
    `${structureSignature}|convolution3x3${weightSignature}|variant${variant}` +
    `|tile${workgroupSizeX}x${workgroupSizeY}|u${uniforms.length}|us${uniformScalarCount}` +
    `|t1|sb0|st0|rs${schedule.resolutionScale}|sp${schedule.sparse ? 1 : 0}`
  const pipelineSignature = `${signatureBase}|cs${workgroupSizeX}x${workgroupSizeY}x${workgroupSizeZ}|h${hashString(wgsl)}`
  const dispatch: HydraDispatchConfig = {
    mode: 'indirect',
    domain: 'pixel2d',
    workgroupSize: [workgroupSizeX, workgroupSizeY, workgroupSizeZ],
    requiredWorkgroupStorageBytes: tileConfig.requiredBytes
  }
  if (isSubgroupVariant) dispatch.requiredFeatures = ['subgroups']
  const output = {
    name: 'outImage',
    variableName: 'outImage',
    format: DEFAULT_PASS_OUTPUT_FORMAT,
    binding: outputBinding
  }
  const compiled: HydraCompiledPass = {
    signature: pipelineSignature,
    wgsl,
    uniforms,
    textures: textureBindings,
    storageBuffers: [],
    storageTextures: [],
    output,
    schedule,
    dispatch,
    ir: buildPassIR({
      signature: pipelineSignature,
      schedule,
      dispatch,
      uniforms,
      textures: textureBindings,
      storageBuffers: [],
      storageTextures: [],
      analysisOut,
      output
    }),
    fallbackPass
  }
  if (analysisOut.length > 0) compiled.analysisOut = analysisOut

  return optimizePassIR(compiled)
}

const compileConvolution3x3Pass = (
  transforms: HydraTransformCall[],
  maxDynamicUniforms: number
): HydraCompiledPass | null => {
  const config = resolveConvolution3x3Config(transforms)
  if (!config) return null

  const genericPass = compileGenericWgslPass(transforms, maxDynamicUniforms)
  if (config.preferredVariant === 'generic') return genericPass

  const buildVariantChain = (
    variant: Exclude<Stencil3x3Variant, 'generic'>,
    fallback: HydraCompiledPass
  ): HydraCompiledPass => {
    let chain = fallback
    for (let index = CONVOLUTION_TILE_SIZES.length - 1; index >= 0; index -= 1) {
      const tileConfig = resolveConvolutionTileConfig(CONVOLUTION_TILE_SIZES[index])
      chain = compileConvolution3x3VariantPass(
        transforms,
        maxDynamicUniforms,
        config,
        variant,
        chain,
        tileConfig
      )
    }
    return chain
  }

  const tiledPass = buildVariantChain('tiled', genericPass)
  if (!config.allowSubgroups || config.preferredVariant === 'tiled') return tiledPass

  const subgroupPass = buildVariantChain('subgroup', tiledPass)
  return subgroupPass
}

export const compileWgslPass = (
  transforms: HydraTransformCall[],
  maxDynamicUniforms = 256
): HydraCompiledPass => {
  const execution = resolvePassExecutionConfig(transforms)
  if (execution.domain === 'linear1d') {
    return compileLinearWgslPass(transforms, maxDynamicUniforms)
  }

  const separable = compileSeparableBlurPass(transforms, maxDynamicUniforms)
  if (separable) return separable
  const stencil = compileStencil3x3Pass(transforms, maxDynamicUniforms)
  if (stencil) return stencil
  const convolution = compileConvolution3x3Pass(transforms, maxDynamicUniforms)
  if (convolution) return convolution
  return compileGenericWgslPass(transforms, maxDynamicUniforms)
}
