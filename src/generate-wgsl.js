import formatArguments from './format-arguments.js'

const coerceExpression = (expression, fromType, toType) => {
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

const containsTransform = (object, list) => {
  for (let i = 0; i < list.length; i++) {
    if (object.name === list[i].name) return true
  }
  return false
}

const structureSignatureForArg = (arg) => {
  if (arg && arg.transforms) return `graph(${buildStructureSignature(arg.transforms)})`
  if (typeof arg === 'function') return 'uniform'
  if (arg && typeof arg.getTexture === 'function') return 'texture'
  if (Array.isArray(arg)) return `vec${arg.length}`
  if (typeof arg === 'number') return 'number'
  if (typeof arg === 'string') return 'string'
  if (typeof arg === 'boolean') return 'boolean'
  if (typeof arg === 'undefined') return 'undefined'
  return 'value'
}

const buildStructureSignature = (transforms = []) => {
  return transforms.map((transform) => {
    const args = (transform.userArgs || []).map((arg) => structureSignatureForArg(arg)).join(',')
    return `${transform.name}(${args})`
  }).join('>')
}

const registerUniform = (shaderParams, arg) => {
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

const registerTexture = (shaderParams, arg) => {
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

const ensurePrevTexture = (shaderParams) => {
  const existing = shaderParams.textures.find((texture) => texture.isPrev)
  if (existing) return
  shaderParams.textures.push({
    name: 'prevBuffer',
    variableName: 'prevBuffer',
    getTexture: null,
    isPrev: true
  })
}

const generateInputName = (base, index) => `${base}_i${index}`

const resolveInputExpression = (arg, argIndex, contextVar, shaderParams) => {
  if (arg.value && arg.value.transforms) {
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

  if (typeof arg.literal !== 'undefined') {
    return arg.literal
  }

  if (arg.wgslType === 'f32') return '0.0'
  if (arg.wgslType === 'vec2f') return 'vec2f(0.0)'
  if (arg.wgslType === 'vec3f') return 'vec3f(0.0)'
  if (arg.wgslType === 'vec4f') return 'vec4f(0.0)'
  return '0.0'
}

const buildTransformCall = (method, callSeed, args, contextVar, shaderParams) => {
  const inputExpressions = args.map((arg, argIndex) =>
    resolveInputExpression(arg, argIndex, contextVar, shaderParams)
  )
  return `${method}(${[callSeed].concat(inputExpressions).join(', ')})`
}

const buildNestedInputs = (inputs, shaderParams) => {
  let generator = () => ''
  let previous = generator

  inputs.forEach((input, index) => {
    if (input.value && input.value.transforms) {
      previous = generator
      generator = (cVar, stVar) => {
        const nestedColorVar = generateInputName(cVar, index)
        const nestedUvVar = generateInputName(`${stVar}_${cVar}`, index)
        const nestedGenerator = generateWgslTransforms(input.value.transforms, shaderParams)
        return `var ${nestedUvVar}: vec2f = ${stVar};\n${previous(cVar, stVar)}\nvar ${nestedColorVar}: vec4f = vec4f(0.0);\n${nestedGenerator(nestedColorVar, nestedUvVar)}`
      }
    }
  })

  return generator
}

const generateWgslTransforms = (transforms, shaderParams) => {
  let generator = () => ''

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

export default function generateWgsl (transforms) {
  const shaderParams = {
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

export { buildStructureSignature }
