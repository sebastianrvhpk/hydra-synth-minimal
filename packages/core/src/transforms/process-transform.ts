import type {
  HydraDispatchDomain,
  HydraKernelSemantics,
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
  },
  simulation: {
    returnType: 'vec4f',
    args: [{ type: 'vec2', name: '_st', default: undefined }]
  },
  analysis: {
    returnType: 'vec4f',
    args: [{ type: 'vec2', name: '_st', default: undefined }]
  },
  kernel: {
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
    case 'storageTexture2D': return 'texture_storage_2d<rgba8unorm, read_write>'
    case 'storageTexture2DArray': return 'texture_storage_2d_array<rgba8unorm, read_write>'
    case 'storageBuffer': return 'ptr<storage, array<vec4f>, read_write>'
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

const normalizeExecutionDomain = (definition: HydraTransformDefinition): HydraDispatchDomain => {
  if (definition.executionDomain === 'linear1d') return 'linear1d'
  return 'pixel2d'
}

const normalizeDispatchItems = (definition: HydraTransformDefinition): number | undefined => {
  const count = Number(definition.dispatchItems)
  if (!Number.isFinite(count) || count <= 0) return undefined
  return Math.max(1, Math.floor(count))
}

const normalizeKernelSemantics = (definition: HydraTransformDefinition): HydraKernelSemantics => {
  if (definition.kernelSemantics === 'index_first') return 'index_first'
  return 'compat_uv'
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

  const executionDomain = normalizeExecutionDomain(definition)
  const writesOutput = typeof definition.writesOutput === 'boolean'
    ? definition.writesOutput
    : executionDomain !== 'linear1d'
  const kernelSemantics = normalizeKernelSemantics(definition)

  return {
    ...definition,
    resources: definition.resources ?? [],
    inputs: inputs.slice(1),
    wgsl: wgslFunction,
    wgsl_return_type: typeConfig.returnType,
    schedule: normalizeSchedule(definition),
    executionDomain,
    kernelSemantics,
    writesOutput,
    dispatchItems: normalizeDispatchItems(definition)
  }
}
