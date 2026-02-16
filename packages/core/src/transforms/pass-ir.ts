import type {
  HydraAnalysisOutputBinding,
  HydraCompiledPass,
  HydraDispatchConfig,
  HydraOutputTextureBinding,
  HydraPassIRNode,
  HydraPassIRResourceRef,
  HydraPassSchedule,
  HydraStorageBufferBinding,
  HydraStorageTextureBinding,
  HydraTextureBinding,
  HydraUniformBinding
} from '../types.js'

interface BuildPassIROptions {
  signature: string
  schedule: HydraPassSchedule
  dispatch: HydraDispatchConfig
  uniforms: HydraUniformBinding[]
  textures: HydraTextureBinding[]
  storageBuffers: HydraStorageBufferBinding[]
  storageTextures: HydraStorageTextureBinding[]
  output?: HydraOutputTextureBinding
  analysisOut?: HydraAnalysisOutputBinding[]
}

const readSetFrom = (values: HydraPassIRResourceRef[]): string[] => {
  const reads = new Set<string>()
  values.forEach((entry) => {
    if (entry.access === 'write') return
    if (entry.kind === 'outputTexture') return
    reads.add(entry.name)
  })
  return Array.from(reads)
}

const writeSetFrom = (values: HydraPassIRResourceRef[]): string[] => {
  const writes = new Set<string>()
  values.forEach((entry) => {
    if (entry.kind === 'outputTexture') {
      writes.add(entry.name)
      return
    }
    if (entry.access === 'write' || entry.access === 'read_write') writes.add(entry.name)
  })
  return Array.from(writes)
}

const normalizeSet = (values: string[]): string[] => Array.from(new Set(values)).sort()

const resourceKey = (resource: HydraPassIRResourceRef): string => {
  const access = resource.access ?? ''
  const format = resource.format ?? ''
  const lifetime = resource.lifetime ?? ''
  const stateKey = resource.stateKey ?? ''
  return `${resource.kind}|${resource.name}|${resource.binding}|${access}|${format}|${lifetime}|${stateKey}`
}

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
  dispatch,
  uniforms,
  textures,
  storageBuffers,
  storageTextures,
  output,
  analysisOut
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
      intent: 'input',
      access: 'read'
    })
  })

  storageBuffers.forEach((buffer) => {
    resources.push({
      name: buffer.name,
      kind: 'storageBuffer',
      binding: buffer.binding,
      intent: buffer.lifetime === 'persistent' ? 'state' : 'input',
      access: buffer.access,
      lifetime: buffer.lifetime,
      stateKey: buffer.stateKey
    })
  })

  storageTextures.forEach((texture) => {
    resources.push({
      name: texture.name,
      kind: 'storageTexture',
      binding: texture.binding,
      intent: texture.lifetime === 'persistent' ? 'state' : 'input',
      access: texture.access,
      format: texture.format,
      lifetime: texture.lifetime,
      stateKey: texture.stateKey
    })
  })

  if (output) {
    resources.push({
      name: output.name,
      kind: 'outputTexture',
      binding: output.binding,
      intent: 'output',
      access: 'write',
      format: output.format,
      lifetime: 'frame'
    })
  }

  const passKind: HydraPassIRNode['kind'] = analysisOut && analysisOut.length > 0
    ? 'reduction'
    : (dispatch.domain === 'linear1d' || !output ? 'data' : 'image')

  return {
    id: signature,
    signature,
    kind: passKind,
    schedule,
    workgroupSize: dispatch.workgroupSize,
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
