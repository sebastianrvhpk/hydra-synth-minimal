import type {
  HydraTransformDefinition,
  HydraTransformInput,
  HydraPassSchedule,
  HydraTransformType,
  HydraWgslType,
  ProcessedHydraTransform
} from '../types.js'

const typeLookup: Record<HydraTransformType, { returnType: HydraWgslType, args: HydraTransformInput[] }> = {
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

const typeToWgsl = (type: HydraTransformInput['type']): HydraWgslType => {
  switch (type) {
    case 'float': return 'f32'
    case 'vec2': return 'vec2f'
    case 'vec3': return 'vec3f'
    case 'vec4': return 'vec4f'
    case 'sampler2D': return 'texture_2d<f32>'
    default: return 'f32'
  }
}

const normalizeSchedule = (definition: HydraTransformDefinition): HydraPassSchedule => {
  const scale = Number(definition.resolutionScale ?? 1)
  const resolutionScale = Number.isFinite(scale) && scale > 0 ? scale : 1
  return {
    resolutionScale,
    updateRate: definition.updateRate ?? 'everyFrame',
    sparse: Boolean(definition.sparse)
  }
}

export const processTransformDefinition = (definition: HydraTransformDefinition): ProcessedHydraTransform => {
  const typeConfig = typeLookup[definition.type]
  if (!typeConfig) {
    throw new Error(`Unsupported transform type: ${definition.type}`)
  }

  if (typeof definition.wgsl !== 'string' || definition.wgsl.trim() === '') {
    throw new Error(`Transform "${definition.name}" must define a non-empty wgsl body.`)
  }

  const inputs = typeConfig.args.concat(definition.inputs ?? [])
  const args = inputs.map((input) => `${input.name}: ${typeToWgsl(input.type)}`).join(', ')
  const wgslFunction = `
fn ${definition.name}(${args}) -> ${typeConfig.returnType} {
${definition.wgsl}
}
`

  return {
    ...definition,
    inputs: inputs.slice(1),
    wgsl: wgslFunction,
    wgsl_return_type: typeConfig.returnType,
    schedule: normalizeSchedule(definition)
  }
}
