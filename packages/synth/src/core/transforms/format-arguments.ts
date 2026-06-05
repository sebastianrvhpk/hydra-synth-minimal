import type {
  HydraFrameState,
  HydraTransformCall,
  HydraTypedArgument,
  HydraWgslType
} from '../types.js'
import { createArraySequenceUniformEvaluator, isArrayLikeSequenceInput } from './array-sequence.js'

const WGSL_TYPES: Record<string, HydraWgslType> = {
  float: 'f32',
  vec2: 'vec2f',
  vec3: 'vec3f',
  vec4: 'vec4f',
  sampler2D: 'texture_2d<f32>'
}

const ensureFloatLiteral = (value: unknown): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0.0'
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

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return fallback
}

const toNumberArray = (value: unknown): number[] | null => {
  if (Array.isArray(value)) return value.map((entry) => Number(entry))
  if (ArrayBuffer.isView(value)) return Array.from(value as ArrayLike<number>).map((entry) => Number(entry))
  return null
}

const hashString = (value = ''): string => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
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

const isTextureLike = (value: unknown): value is { getTexture: () => unknown, id?: unknown } => (
  Boolean(value) &&
  typeof value === 'object' &&
  'getTexture' in value &&
  typeof (value as { getTexture?: unknown }).getTexture === 'function'
)

interface StaticSequenceMetadata {
  _speed?: unknown
  _smooth?: unknown
  _offset?: unknown
  _ease?: unknown
}

const sequenceEaseExpression = (ease: unknown, valueExpression: string): string | null => {
  if (typeof ease === 'undefined' || ease === null || ease === 'linear') return valueExpression
  if (ease === 'sin') return `((1.0 + sin(3.141592653589793 * ${valueExpression} - 1.5707963267948966)) * 0.5)`
  return null
}

const createStaticSequenceWgsl = (
  value: unknown,
  fallback: unknown,
  inputName: string,
  inputIndex: number
): { literal: string, declaration: { name: string, wgsl: string } } | null => {
  if (!isArrayLikeSequenceInput(value)) return null

  const metadata = value as StaticSequenceMetadata
  if (typeof metadata._ease === 'function') return null

  const source = toNumberArray(value)
  if (!source || source.length === 0) return null

  const fallbackNumber = toFiniteNumber(fallback, 0)
  const values = source.map((entry) => toFiniteNumber(entry, fallbackNumber))
  const speed = toFiniteNumber(metadata._speed, 1)
  const smooth = Math.max(0, toFiniteNumber(metadata._smooth, 0))
  const offset = toFiniteNumber(metadata._offset, 0)
  const easeAmount = sequenceEaseExpression(metadata._ease, 'interpolation')
  if (!easeAmount) return null

  const serialized = JSON.stringify({ values, speed, smooth, offset, ease: metadata._ease ?? 'linear' })
  const fnName = `hydraSeq_${sanitizeName(inputName)}_${inputIndex}_${hashString(serialized)}`
  const lengthLiteral = ensureFloatLiteral(values.length)
  const speedLiteral = ensureFloatLiteral(speed)
  const smoothLiteral = ensureFloatLiteral(smooth)
  const offsetLiteral = ensureFloatLiteral(offset)
  const valueLiterals = values.map(ensureFloatLiteral).join(', ')

  const wgsl = `
fn ${fnName}() -> f32 {
  let values = array<f32, ${values.length}>(${valueLiterals});
  let sequenceLength = ${lengthLiteral};
  let sequenceSpeed = ${speedLiteral};
  let sequenceSmooth = ${smoothLiteral};
  let sequenceOffset = ${offsetLiteral};
  let index = globals.time * sequenceSpeed * (globals.bpm / 60.0) + sequenceOffset;

  if (sequenceSmooth > 0.0) {
    let shifted = index - sequenceSmooth * 0.5;
    let currentWrapped = shifted - floor(shifted / sequenceLength) * sequenceLength;
    let nextWrapped = (shifted + 1.0) - floor((shifted + 1.0) / sequenceLength) * sequenceLength;
    let currentIndex = u32(floor(currentWrapped));
    let nextIndex = u32(floor(nextWrapped));
    let cycle = shifted - floor(shifted);
    let interpolation = clamp(min(cycle / sequenceSmooth, 1.0), 0.0, 1.0);
    let amount = ${easeAmount};
    return values[currentIndex] + (values[nextIndex] - values[currentIndex]) * amount;
  }

  let wrapped = index - floor(index / sequenceLength) * sequenceLength;
  return values[u32(floor(wrapped))];
}
`

  return {
    literal: `${fnName}()`,
    declaration: {
      name: fnName,
      wgsl
    }
  }
}

const normalizeHistoryOffset = (value: unknown, fallback = 1): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return Math.max(1, Math.floor(fallback))
  return Math.max(1, Math.floor(value))
}

const normalizeOutputId = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return null
  return value
}

const parsePrevNBinding = (
  userArgs: unknown[],
  fallbackValue: unknown
): { historyOffset: number, targetId: number | null, getTexture: (() => unknown) | null } => {
  const first = userArgs.length > 0 ? userArgs[0] : fallbackValue
  const second = userArgs.length > 1 ? userArgs[1] : undefined

  let historyOffset = 1
  let targetId: number | null = null
  let getTexture: (() => unknown) | null = null

  if (typeof first === 'number' && Number.isFinite(first)) {
    historyOffset = normalizeHistoryOffset(first)
    return { historyOffset, targetId, getTexture }
  }

  if (first && typeof first === 'object') {
    const candidate = first as Record<string, unknown>

    if (isTextureLike(first)) {
      getTexture = () => first.getTexture()
      targetId = normalizeOutputId(first.id)
    }

    if ('source' in candidate && isTextureLike(candidate.source)) {
      const source = candidate.source
      getTexture = () => source.getTexture()
      targetId = normalizeOutputId(source.id)
    }

    if ('id' in candidate && targetId === null) {
      targetId = normalizeOutputId(candidate.id)
    }

    if ('historyOffset' in candidate) {
      historyOffset = normalizeHistoryOffset(candidate.historyOffset, historyOffset)
      return { historyOffset, targetId, getTexture }
    }
  }

  if (typeof second !== 'undefined') {
    historyOffset = normalizeHistoryOffset(second, historyOffset)
  }

  return { historyOffset, targetId, getTexture }
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
        const parsed = parsePrevNBinding(userArgs, typedArg.value)

        typedArg.isTexture = true
        typedArg.textureName = `${sanitizeName(input.name)}_${startIndex + index}`
        typedArg.value = parsed.getTexture ?? (() => null)
        typedArg.textureSource = parsed.targetId === null
          ? { historyOffset: parsed.historyOffset }
          : { id: parsed.targetId, historyOffset: parsed.historyOffset }
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
      if (isArrayLikeSequenceInput(typedArg.value)) {
        const staticSequence = createStaticSequenceWgsl(
          typedArg.value,
          input.default,
          input.name,
          startIndex + index
        )
        if (staticSequence) {
          typedArg.literal = staticSequence.literal
          typedArg.wgslDeclarations = [staticSequence.declaration]
          return typedArg
        }
        typedArg.isUniform = true
        typedArg.uniformName = `${sanitizeName(input.name)}_${startIndex + index}`
        typedArg.value = createArraySequenceUniformEvaluator(typedArg.value, input.default)
        return typedArg
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
