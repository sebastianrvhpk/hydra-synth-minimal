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
    if (transformSchedule.updateRate !== 'everyFrame') schedule.updateRate = transformSchedule.updateRate
    if (transformSchedule.sparse) schedule.sparse = true
  })

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
  if (!value) return 'rgba8unorm'
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
    minLength: 1
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
    format: resource.format ?? 'rgba8unorm',
    dimension: resource.type === 'storageTexture2DArray' ? '2d_array' : '2d',
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
@group(0) @binding(${outputTextureBinding}) var outImage: texture_storage_2d<rgba8unorm, write>;

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
      format: 'rgba8unorm',
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
      output: {
        name: 'outImage',
        variableName: 'outImage',
        format: 'rgba8unorm',
        binding: outputTextureBinding
      }
    })
  }
  if (analysisOut.length > 0) compiled.analysisOut = analysisOut

  return optimizePassIR(compiled)
}

type TiledBlurAxis = 'x' | 'y'

const TILED_BLUR_WORKGROUP = 128
const TILED_BLUR_MAX_STRIDE = 4
const TILED_BLUR_HALO = TILED_BLUR_MAX_STRIDE * 4
const TILED_BLUR_TILE_LENGTH = TILED_BLUR_WORKGROUP + TILED_BLUR_HALO * 2
const TILED_BLUR_REQUIRED_WORKGROUP_STORAGE_BYTES = TILED_BLUR_TILE_LENGTH * 16

const resolveTiledBlurAxis = (transforms: HydraTransformCall[]): TiledBlurAxis | null => {
  if (transforms.length !== 1) return null
  const only = transforms[0]
  if (only?.name === 'blurTiledX') return 'x'
  if (only?.name === 'blurTiledY') return 'y'
  return null
}

const buildTiledBlurBody = (axis: TiledBlurAxis, amountExpression: string): string => {
  if (axis === 'x') {
    return `
  if (invocationId.y >= height) {
    return;
  }

  let localX = i32(localId.x);
  let groupBaseX = i32(workgroupId.x) * ${TILED_BLUR_WORKGROUP};
  let sourceX = groupBaseX + localX;
  let sourceY = i32(invocationId.y);
  let baseIndex = localX + ${TILED_BLUR_HALO};

  tile[baseIndex] = hydraSamplePixelClamp(sourceX, sourceY);
  if (localX < ${TILED_BLUR_HALO}) {
    tile[localX] = hydraSamplePixelClamp(sourceX - ${TILED_BLUR_HALO}, sourceY);
  }
  if (localX >= ${TILED_BLUR_WORKGROUP - TILED_BLUR_HALO}) {
    tile[localX + ${TILED_BLUR_HALO * 2}] = hydraSamplePixelClamp(sourceX + ${TILED_BLUR_HALO}, sourceY);
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
    (tile[baseIndex + stride * 4] + tile[baseIndex - stride * 4]) * 0.016216216;

  textureStore(outImage, vec2i(i32(invocationId.x), sourceY), c);
`
  }

  return `
  if (invocationId.x >= width) {
    return;
  }

  let localY = i32(localId.y);
  let groupBaseY = i32(workgroupId.y) * ${TILED_BLUR_WORKGROUP};
  let sourceY = groupBaseY + localY;
  let sourceX = i32(invocationId.x);
  let baseIndex = localY + ${TILED_BLUR_HALO};

  tile[baseIndex] = hydraSamplePixelClamp(sourceX, sourceY);
  if (localY < ${TILED_BLUR_HALO}) {
    tile[localY] = hydraSamplePixelClamp(sourceX, sourceY - ${TILED_BLUR_HALO});
  }
  if (localY >= ${TILED_BLUR_WORKGROUP - TILED_BLUR_HALO}) {
    tile[localY + ${TILED_BLUR_HALO * 2}] = hydraSamplePixelClamp(sourceX, sourceY + ${TILED_BLUR_HALO});
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
    (tile[baseIndex + stride * 4] + tile[baseIndex - stride * 4]) * 0.016216216;

  textureStore(outImage, vec2i(sourceX, i32(invocationId.y)), c);
`
}

const compileTiledBlurPass = (
  transforms: HydraTransformCall[],
  maxDynamicUniforms: number
): HydraCompiledPass | null => {
  const axis = resolveTiledBlurAxis(transforms)
  if (!axis) return null

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
    ? [TILED_BLUR_WORKGROUP, 1, 1]
    : [1, TILED_BLUR_WORKGROUP, 1]
  const tiledBody = buildTiledBlurBody(axis, amountExpression)
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
@group(0) @binding(${outputBinding}) var outImage: texture_storage_2d<rgba8unorm, write>;

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

var<workgroup> tile: array<vec4f, ${TILED_BLUR_TILE_LENGTH}>;

@compute @workgroup_size(${workgroupSizeX}, ${workgroupSizeY}, ${workgroupSizeZ})
fn csMain(
  @builtin(global_invocation_id) invocationId: vec3u,
  @builtin(local_invocation_id) localId: vec3u,
  @builtin(workgroup_id) workgroupId: vec3u
) {
  let width = max(1u, u32(globals.width));
  let height = max(1u, u32(globals.height));
${tiledBody}
}
`

  const signatureBase =
    `${structureSignature}|tiledBlur${axis}|u${uniforms.length}|us${uniformScalarCount}` +
    `|t1|sb0|st0|rs${schedule.resolutionScale}|sp${schedule.sparse ? 1 : 0}`
  const pipelineSignature = `${signatureBase}|cs${workgroupSizeX}x${workgroupSizeY}x${workgroupSizeZ}|h${hashString(wgsl)}`
  const dispatch: HydraDispatchConfig = {
    mode: 'direct',
    workgroupSize: [workgroupSizeX, workgroupSizeY, workgroupSizeZ],
    requiredWorkgroupStorageBytes: TILED_BLUR_REQUIRED_WORKGROUP_STORAGE_BYTES
  }
  const output = {
    name: 'outImage',
    variableName: 'outImage',
    format: 'rgba8unorm' as HydraResourceFormat,
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
      output
    }),
    fallbackPass: compileGenericWgslPass(transforms, maxDynamicUniforms)
  }
  if (analysisOut.length > 0) compiled.analysisOut = analysisOut

  return optimizePassIR(compiled)
}

export const compileWgslPass = (
  transforms: HydraTransformCall[],
  maxDynamicUniforms = 256
): HydraCompiledPass => {
  const tiled = compileTiledBlurPass(transforms, maxDynamicUniforms)
  if (tiled) return tiled
  return compileGenericWgslPass(transforms, maxDynamicUniforms)
}
