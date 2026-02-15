import type {
  HydraFrameState,
  HydraResourceAccess,
  HydraResourceElementType,
  HydraResourceFormat,
  HydraResourceLifetime,
  HydraTransformCall,
  HydraTypedArgument,
  HydraTypedResource,
  HydraWgslType
} from '../types.js'

const WGSL_TYPES: Record<string, HydraWgslType> = {
  float: 'f32',
  vec2: 'vec2f',
  vec3: 'vec3f',
  vec4: 'vec4f',
  sampler2D: 'texture_2d<f32>',
  storageTexture2D: 'texture_storage_2d<rgba8unorm, read_write>',
  storageTexture2DArray: 'texture_storage_2d_array<rgba8unorm, read_write>',
  storageBuffer: 'ptr<storage, array<vec4f>, read_write>'
}

const ensureFloatLiteral = (value: unknown): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0.0'
  const asString = value.toString()
  if (asString.includes('.') || asString.includes('e') || asString.includes('E')) return asString
  return `${asString}.0`
}

const vecLiteral = (value: unknown, len: number): string => {
  const vector = Array.isArray(value)
    ? value.slice(0, len)
    : Array(len).fill(value)

  while (vector.length < len) {
    vector.push(vector.length === 3 ? 1 : 0)
  }

  return `vec${len}f(${vector.map(ensureFloatLiteral).join(', ')})`
}

const sanitizeName = (name: string): string => name.replace(/[^a-zA-Z0-9_]/g, '_')

const isResourceBindingMap = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  if ('transforms' in value || 'getTexture' in value || 'getBuffer' in value) return false
  return true
}

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return fallback
}

const toNumberArray = (value: unknown): number[] | null => {
  if (Array.isArray(value)) return value.map((entry) => Number(entry))
  if (ArrayBuffer.isView(value)) return Array.from(value as ArrayLike<number>).map((entry) => Number(entry))
  return null
}

const buildDefaultVector = (value: unknown, len: number): number[] => {
  const fallback = toNumberArray(value)
  const defaults = fallback ? fallback.slice(0, len) : []
  while (defaults.length < len) {
    defaults.push(defaults.length === 3 ? 1 : 0)
  }
  return defaults.map((entry, index) => toFiniteNumber(entry, index === 3 ? 1 : 0))
}

const normalizeUniformValue = (
  value: unknown,
  type: HydraTypedArgument['type'],
  fallback: unknown
): number | number[] => {
  if (type === 'float') return toFiniteNumber(value, toFiniteNumber(fallback, 0))

  if (type === 'vec2' || type === 'vec3' || type === 'vec4') {
    const len = Number.parseInt(type.slice(3), 10)
    const fallbackVector = buildDefaultVector(fallback, len)
    const maybeVector = toNumberArray(value)
    const source = maybeVector ?? (typeof value === 'number' ? Array(len).fill(value) : fallbackVector)
    const normalized: number[] = []

    for (let index = 0; index < len; index += 1) {
      normalized.push(toFiniteNumber(source[index], fallbackVector[index]))
    }
    return normalized
  }

  return 0
}

export const formatArguments = (
  transform: HydraTransformCall,
  startIndex = 0
): HydraTypedArgument[] => {
  const defaultArgs = transform.transform.inputs ?? []
  const userArgs = transform.userArgs ?? []
  const srcGenerator = transform.synth.generators.src

  return defaultArgs.map((input, index) => {
    const typedArg: HydraTypedArgument = {
      name: input.name,
      type: input.type,
      wgslType: WGSL_TYPES[input.type] ?? 'f32',
      default: input.default,
      value: input.default,
      isUniform: false,
      isTexture: false
    }

    if (userArgs.length > index) typedArg.value = userArgs[index]
    if (typedArg.value && typeof typedArg.value === 'object' && 'transforms' in typedArg.value) {
      return typedArg
    }

    if (input.type === 'sampler2D') {
      if (transform.name === 'prevN') {
        let historyOffset = 1
        if (typeof typedArg.value === 'number' && Number.isFinite(typedArg.value)) {
          historyOffset = Math.max(1, Math.floor(typedArg.value))
        } else if (
          typedArg.value &&
          typeof typedArg.value === 'object' &&
          'historyOffset' in typedArg.value &&
          typeof (typedArg.value as { historyOffset?: unknown }).historyOffset === 'number' &&
          Number.isFinite((typedArg.value as { historyOffset?: number }).historyOffset)
        ) {
          historyOffset = Math.max(1, Math.floor((typedArg.value as { historyOffset: number }).historyOffset))
        }

        typedArg.isTexture = true
        typedArg.textureName = `${sanitizeName(input.name)}_${startIndex + index}`
        typedArg.value = () => null
        typedArg.textureSource = { historyOffset }
        return typedArg
      }

      if (
        !typedArg.value ||
        typeof typedArg.value !== 'object' ||
        !('getTexture' in typedArg.value) ||
        typeof typedArg.value.getTexture !== 'function'
      ) {
        throw new Error(`Expected texture-like argument for sampler input "${input.name}" in "${transform.name}"`)
      }

      const textureLike = typedArg.value
      typedArg.isTexture = true
      typedArg.textureName = `${sanitizeName(input.name)}_${startIndex + index}`
      typedArg.value = () => textureLike.getTexture()
      typedArg.textureSource = textureLike
      return typedArg
    }

    if (input.type === 'storageBuffer' || input.type === 'storageTexture2D' || input.type === 'storageTexture2DArray') {
      throw new Error(
        `Resource input "${input.name}" in "${transform.name}" must be declared under "resources", not "inputs".`
      )
    }

    if (
      typedArg.type === 'vec4' &&
      typedArg.value &&
      typeof typedArg.value === 'object' &&
      'getTexture' in typedArg.value &&
      typeof typedArg.value.getTexture === 'function'
    ) {
      if (!srcGenerator) {
        throw new Error('Texture-to-vec4 conversion requires `src()` to be registered.')
      }
      typedArg.value = srcGenerator(typedArg.value)
      return typedArg
    }

    if (typeof typedArg.value === 'function') {
      typedArg.isUniform = true
      const fn = typedArg.value as (props: HydraFrameState) => unknown
      typedArg.uniformName = `${sanitizeName(input.name)}_${startIndex + index}`
      typedArg.value = (props: HydraFrameState) => {
        try {
          return normalizeUniformValue(fn(props), typedArg.type, input.default)
        } catch {
          // Uniform callbacks are isolated from runtime errors and fall back to defaults.
        }
        return normalizeUniformValue(undefined, typedArg.type, input.default)
      }
      return typedArg
    }

    if (typedArg.type === 'float') {
      if (Array.isArray(typedArg.value)) {
        throw new Error(`Array input is not valid for float argument "${input.name}"`)
      }
      typedArg.literal = ensureFloatLiteral(Number(typedArg.value))
      return typedArg
    }

    if (typedArg.type.startsWith('vec')) {
      const len = Number.parseInt(typedArg.type.slice(3), 10)
      typedArg.literal = vecLiteral(typedArg.value, len)
      return typedArg
    }

    typedArg.literal = `${typedArg.value ?? 0}`
    return typedArg
  })
}

interface ResolvedResourceOptions {
  access: HydraResourceAccess
  format: HydraResourceFormat | undefined
  lifetime: HydraResourceLifetime
  stateKey: string | undefined
  elementType: HydraResourceElementType
  minLength: number
}

const resolveResourceOptions = (
  input: {
    type: string
    access?: HydraResourceAccess
    format?: HydraResourceFormat
    lifetime?: HydraResourceLifetime
    stateKey?: string
    elementType?: HydraResourceElementType
    minLength?: number
  }
): ResolvedResourceOptions => ({
  access: input.access ?? (input.type === 'storageBuffer' ? 'read_write' : 'read_write'),
  format: input.format,
  lifetime: input.lifetime ?? 'frame',
  stateKey: input.stateKey,
  elementType: input.elementType ?? 'vec4f',
  minLength: Math.max(1, Number.isFinite(input.minLength) ? Math.floor(input.minLength ?? 1) : 1)
})

const resolveResourceValue = (
  userArgs: unknown[],
  inputCount: number,
  index: number,
  name: string,
  fallback: unknown
): unknown => {
  const maybeMap = userArgs.length > 0 ? userArgs[userArgs.length - 1] : undefined
  if (isResourceBindingMap(maybeMap) && Object.prototype.hasOwnProperty.call(maybeMap, name)) {
    return maybeMap[name]
  }

  const byPosition = userArgs[inputCount + index]
  if (typeof byPosition !== 'undefined') return byPosition
  return fallback
}

export const formatResourceBindings = (
  transform: HydraTransformCall,
  startIndex = 0
): HydraTypedResource[] => {
  const resources = transform.transform.resources ?? []
  const inputCount = (transform.transform.inputs ?? []).length
  const userArgs = transform.userArgs ?? []

  return resources.map((resource, index) => {
    const value = resolveResourceValue(userArgs, inputCount, index, resource.name, resource.default)
    const options = resolveResourceOptions(resource)
    const variableName = sanitizeName(resource.name)
    const resourceEntry: HydraTypedResource = {
      name: resource.name,
      type: resource.type,
      access: options.access,
      lifetime: options.lifetime,
      stateKey: options.stateKey,
      format: options.format,
      elementType: options.elementType,
      minLength: options.minLength,
      variableName,
      value,
      getTexture: null,
      getBuffer: null
    }

    if (value && typeof value === 'object' && 'getTexture' in value && typeof value.getTexture === 'function') {
      resourceEntry.getTexture = () => value.getTexture()
      resourceEntry.sourceRef = value
      return resourceEntry
    }

    if (value && typeof value === 'object' && 'getBuffer' in value && typeof value.getBuffer === 'function') {
      resourceEntry.getBuffer = () => value.getBuffer()
      resourceEntry.sourceRef = value
      return resourceEntry
    }

    if (typeof value === 'function') {
      if (resource.type === 'storageBuffer') {
        resourceEntry.getBuffer = value as () => unknown
      } else {
        resourceEntry.getTexture = value as () => unknown
      }
      return resourceEntry
    }

    const canAutoAllocate = Boolean(resourceEntry.stateKey) || resourceEntry.lifetime === 'persistent'
    if (canAutoAllocate) return resourceEntry

    if (resource.type === 'storageBuffer') {
      throw new Error(`Expected a storage buffer provider for resource "${resource.name}" in "${transform.name}"`)
    }

    if (resource.type === 'storageTexture2D' || resource.type === 'storageTexture2DArray') {
      throw new Error(`Expected a storage texture provider for resource "${resource.name}" in "${transform.name}"`)
    }

    return resourceEntry
  })
}
