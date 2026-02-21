import type {
  HydraCompiledPass,
  HydraOutputTextureBinding,
  HydraPassIRNode,
  HydraPassIRResourceRef,
  HydraPassSchedule,
  HydraTextureBinding,
  HydraUniformBinding
} from '../types.js'

interface BuildPassIROptions {
  signature: string
  schedule: HydraPassSchedule
  uniforms: HydraUniformBinding[]
  textures: HydraTextureBinding[]
  output?: HydraOutputTextureBinding
}

const readSetFrom = (values: HydraPassIRResourceRef[]): string[] => {
  const reads = new Set<string>()
  values.forEach((entry) => {
    if (entry.kind === 'outputTexture') return
    reads.add(entry.name)
  })
  return Array.from(reads)
}

const writeSetFrom = (values: HydraPassIRResourceRef[]): string[] => {
  const writes = new Set<string>()
  values.forEach((entry) => {
    if (entry.kind === 'outputTexture') writes.add(entry.name)
  })
  return Array.from(writes)
}

const normalizeSet = (values: string[]): string[] => Array.from(new Set(values)).sort()

const resourceKey = (resource: HydraPassIRResourceRef): string =>
  `${resource.kind}|${resource.name}|${resource.binding}|${resource.intent ?? ''}|${resource.format ?? ''}`

const normalizeResources = (resources: HydraPassIRResourceRef[]): HydraPassIRResourceRef[] => {
  const deduped = new Map<string, HydraPassIRResourceRef>()
  resources.forEach((resource) => {
    deduped.set(resourceKey(resource), resource)
  })
  return Array.from(deduped.values()).sort((left, right) => {
    if (left.binding !== right.binding) return left.binding - right.binding
    if (left.kind !== right.kind) return left.kind.localeCompare(right.kind)
    return left.name.localeCompare(right.name)
  })
}

export const buildPassIR = ({
  signature,
  schedule,
  uniforms,
  textures,
  output
}: BuildPassIROptions): HydraPassIRNode => {
  const resources: HydraPassIRResourceRef[] = []

  uniforms.forEach((uniform) => {
    resources.push({
      name: uniform.name,
      kind: 'uniform',
      binding: -1,
      intent: 'input'
    })
  })

  textures.forEach((texture) => {
    resources.push({
      name: texture.name,
      kind: 'texture',
      binding: texture.binding,
      intent: 'input'
    })
  })

  if (output) {
    resources.push({
      name: output.name,
      kind: 'outputTexture',
      binding: output.binding,
      intent: 'output',
      format: output.format
    })
  }

  return {
    id: signature,
    signature,
    kind: 'image',
    schedule,
    resources,
    reads: readSetFrom(resources),
    writes: writeSetFrom(resources)
  }
}

export const optimizePassIR = (pass: HydraCompiledPass): HydraCompiledPass => {
  if (!pass.ir) return pass

  const resources = normalizeResources(pass.ir.resources)
  const reads = normalizeSet(readSetFrom(resources))
  const writes = normalizeSet(writeSetFrom(resources))

  return {
    ...pass,
    ir: {
      ...pass.ir,
      resources,
      reads,
      writes
    }
  }
}
