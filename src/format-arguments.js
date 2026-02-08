const WGSL_TYPES = {
  float: 'f32',
  vec2: 'vec2f',
  vec3: 'vec3f',
  vec4: 'vec4f',
  sampler2D: 'texture_2d<f32>'
}

const ensureFloatLiteral = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0.0'
  const asString = value.toString()
  if (asString.includes('.') || asString.includes('e') || asString.includes('E')) return asString
  return `${asString}.0`
}

const vecLiteral = (value, len) => {
  const vector = Array.isArray(value)
    ? value.slice(0, len)
    : Array(len).fill(value)
  while (vector.length < len) {
    vector.push(vector.length === 3 ? 1 : 0)
  }
  return `vec${len}f(${vector.map(ensureFloatLiteral).join(', ')})`
}

const sanitizeName = (name) => name.replace(/[^a-zA-Z0-9_]/g, '_')

export default function formatArguments (transform, startIndex = 0) {
  const defaultArgs = transform.transform.inputs || []
  const userArgs = transform.userArgs || []
  const srcGenerator = transform.synth?.generators?.src

  return defaultArgs.map((input, index) => {
    const typedArg = {
      name: input.name,
      type: input.type,
      wgslType: WGSL_TYPES[input.type] || 'f32',
      default: input.default,
      value: input.default,
      isUniform: false,
      isTexture: false
    }

    if (userArgs.length > index) {
      typedArg.value = userArgs[index]
    }

    if (typedArg.value && typedArg.value.transforms) {
      return typedArg
    }

    if (input.type === 'sampler2D') {
      if (!typedArg.value || typeof typedArg.value.getTexture !== 'function') {
        throw new Error(`Expected texture-like argument for sampler input "${input.name}" in "${transform.name}"`)
      }

      const x = typedArg.value
      typedArg.isTexture = true
      typedArg.textureName = `${sanitizeName(input.name)}_${startIndex + index}`
      typedArg.value = () => x.getTexture()
      return typedArg
    }

    if (typedArg.type === 'vec4' && typedArg.value && typeof typedArg.value.getTexture === 'function') {
      if (!srcGenerator) {
        throw new Error('Texture-to-vec4 conversion requires `src()` to be registered.')
      }
      typedArg.value = srcGenerator(typedArg.value)
      return typedArg
    }

    if (typeof typedArg.value === 'function') {
      typedArg.isUniform = true
      const fn = typedArg.value
      typedArg.uniformName = `${sanitizeName(input.name)}_${startIndex + index}`
      typedArg.value = (props) => {
        try {
          const result = fn(props)
          if (typeof result === 'number' && Number.isFinite(result)) return result
        } catch (error) {
          console.warn('Hydra uniform function failed', error)
        }
        return typeof input.default === 'number' ? input.default : 0
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

    typedArg.literal = typedArg.value
    return typedArg
  })
}

