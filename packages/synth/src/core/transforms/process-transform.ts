import type {
  HydraTransformDefinition,
  HydraTransformInput,
  HydraTransformType,
  HydraShaderValueType,
  ProcessedHydraTransform
} from '../types.js'

const typeLookup: Partial<Record<HydraTransformType, { returnType: HydraShaderValueType, args: HydraTransformInput[] }>> = {
  src: {
    returnType: 'vec4f',
    args: [{ type: 'vec2', name: '_st', default: undefined }]
  },
  coord: {
    returnType: 'vec2f',
    args: [{ type: 'vec2', name: '_st', default: undefined }]
  },
  color: {
    returnType: 'vec4f',
    args: [{ type: 'vec4', name: '_c0', default: undefined }]
  },
  combine: {
    returnType: 'vec4f',
    args: [
      { type: 'vec4', name: '_c0', default: undefined },
      { type: 'vec4', name: '_c1', default: undefined }
    ]
  },
  combineCoord: {
    returnType: 'vec2f',
    args: [
      { type: 'vec2', name: '_st', default: undefined },
      { type: 'vec4', name: '_c0', default: undefined }
    ]
  },
  renderpass: {
    returnType: 'vec4f',
    args: [{ type: 'vec2', name: '_st', default: undefined }]
  }
}

const typeToShaderValue = (type: HydraTransformInput['type']): HydraShaderValueType => {
  switch (type) {
    case 'float': return 'f32'
    case 'vec2': return 'vec2f'
    case 'vec3': return 'vec3f'
    case 'vec4': return 'vec4f'
    case 'sampler2D': return 'texture_2d<f32>'
    default: return 'f32'
  }
}

const normalizeResolutionScale = (definition: HydraTransformDefinition): number => {
  const scale = Number(definition.resolutionScale ?? 1)
  return Number.isFinite(scale) && scale > 0 ? scale : 1
}

export const processTransformDefinition = (definition: HydraTransformDefinition): ProcessedHydraTransform => {
  if (definition.type === 'passBoundary') {
    return {
      ...definition,
      inputs: [],
      shader: null,
      resolutionScale: normalizeResolutionScale(definition)
    }
  }

  const typeConfig = typeLookup[definition.type]
  if (!typeConfig) {
    throw new Error(`Unsupported transform type: ${definition.type}`)
  }

  if (typeof definition.shader !== 'string' || definition.shader.trim() === '') {
    throw new Error(`Transform "${definition.name}" must define a non-empty shader body.`)
  }

  const inputs = typeConfig.args.concat(definition.inputs ?? [])
  const parameterTypes = inputs.map((input) => typeToShaderValue(input.type))
  const args = inputs.map((input, index) => `${input.name}: ${parameterTypes[index]}`).join(', ')
  const source = `
fn ${definition.name}(${args}) -> ${typeConfig.returnType} {
${definition.shader}
}
`

  return {
    ...definition,
    inputs: inputs.slice(1),
    shader: {
      name: definition.name,
      parameterTypes,
      returnType: typeConfig.returnType,
      source
    },
    resolutionScale: normalizeResolutionScale(definition)
  }
}
