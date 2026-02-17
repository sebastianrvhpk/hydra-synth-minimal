import { compileWgslPass } from '../transforms/compile-wgsl.js'
import { splitPasses } from '../transforms/split-passes.js'
import type {
  HydraCompiledPass,
  HydraPassUpdateRate,
  HydraTransformCall
} from '../types.js'
import {
  createEdgeId,
  throwOnKernelGraphErrors,
  validateKernelGraph
} from '../ir/validate.js'
import type {
  HydraDependencyEdge,
  HydraKernelGraph,
  HydraKernelNodeKind,
  HydraKernelNode,
  HydraKernelResourceSpec
} from '../ir/types.js'

const sanitizeResourceToken = (value: string): string => value.replace(/[^a-zA-Z0-9:_-]/g, '_')

const sourceRefToken = (sourceRef: unknown): string | null => {
  if (!sourceRef || typeof sourceRef !== 'object') return null
  const candidate = sourceRef as Record<string, unknown>

  const outputId = candidate.id
  if (typeof outputId === 'number' && Number.isFinite(outputId)) {
    return `output:${Math.max(0, Math.floor(outputId))}`
  }

  const historyOffset = candidate.historyOffset
  if (typeof historyOffset === 'number' && Number.isFinite(historyOffset)) {
    return `history:${Math.max(1, Math.floor(historyOffset))}`
  }

  const stateKey = candidate.stateKey
  if (typeof stateKey === 'string' && stateKey.length > 0) {
    return `state:${sanitizeResourceToken(stateKey)}`
  }

  const slot = candidate.slot
  if (typeof slot === 'string' && slot.length > 0) {
    return `slot:${sanitizeResourceToken(slot)}`
  }

  return null
}

const bindingToken = ({
  name,
  variableName,
  sourceRef
}: {
  name: string
  variableName: string
  sourceRef?: unknown
}): string => {
  const sourceToken = sourceRefToken(sourceRef)
  if (sourceToken) return sourceToken
  if (variableName) return `binding:${sanitizeResourceToken(variableName)}`
  return `name:${sanitizeResourceToken(name)}`
}

export const getTextureResourceId = (texture: {
  name: string
  variableName: string
  sourceRef?: unknown
}): string => `texture:${bindingToken(texture)}`

export const getStorageBufferResourceId = (buffer: {
  name: string
  variableName: string
  sourceRef?: unknown
  lifetime: string
  elementType: string
}): string => `buffer:${bindingToken(buffer)}:${sanitizeResourceToken(buffer.elementType)}:${sanitizeResourceToken(buffer.lifetime)}`

export const getStorageTextureResourceId = (texture: {
  name: string
  variableName: string
  sourceRef?: unknown
  lifetime: string
  format: string
  dimension: string
}): string =>
  `storageTexture:${bindingToken(texture)}:${sanitizeResourceToken(texture.format)}:${sanitizeResourceToken(texture.dimension)}:${sanitizeResourceToken(texture.lifetime)}`

const normalizeUpdateRate = (value: HydraPassUpdateRate | undefined): HydraPassUpdateRate => value ?? 'everyFrame'

const inferKernelKind = (transforms: HydraTransformCall[]): HydraKernelNodeKind => {
  if (transforms.some((transform) => transform.transform.type === 'analysis')) return 'ReductionKernel'
  if (transforms.some((transform) => transform.transform.type === 'simulation')) return 'DataKernel'
  if (transforms.some((transform) => transform.transform.type === 'kernel')) return 'DataKernel'
  return 'ImageKernel'
}

const inferDispatchDomain = (pass: HydraCompiledPass): HydraKernelNode['schedule']['dispatchDomain'] => {
  const domain = pass.dispatch?.domain
  if (domain === 'linear1d') {
    if (pass.schedule?.sparse) return 'queue1d'
    return 'linear1d'
  }
  if (pass.dispatch?.mode === 'indirect') return 'indirect2d'
  return 'pixel2d'
}

const isNodeUniformRef = (node: HydraKernelNode, resource: string): boolean =>
  node.uniforms.some((uniform) => uniform.name === resource)

const resolveNodeResourceRef = (node: HydraKernelNode, resource: string): string | null => {
  if (isNodeUniformRef(node, resource)) return null
  if (resource === 'outImage') return 'virtual:outImage'

  const texture = node.textures.find((entry) => entry.name === resource)
  if (texture) return getTextureResourceId(texture)

  const buffer = node.storageBuffers.find((entry) => entry.name === resource)
  if (buffer) return getStorageBufferResourceId(buffer)

  const storageTexture = node.storageTextures.find((entry) => entry.name === resource)
  if (storageTexture) return getStorageTextureResourceId(storageTexture)

  return `virtual:${resource}`
}

const collectResourceSpecs = (nodes: HydraKernelNode[]): HydraKernelResourceSpec[] => {
  const resources = new Map<string, HydraKernelResourceSpec>()

  const ensure = (resource: HydraKernelResourceSpec): void => {
    if (resources.has(resource.id)) return
    resources.set(resource.id, resource)
  }

  nodes.forEach((node) => {
    node.textures.forEach((texture) => {
      ensure({
        id: getTextureResourceId(texture),
        kind: 'Texture2D',
        access: 'read',
        lifetime: 'external',
        aliasClass: 'texture-read',
        externalBinding: texture.variableName
      })
    })

    node.storageBuffers.forEach((buffer) => {
      ensure({
        id: getStorageBufferResourceId(buffer),
        kind: 'Buffer',
        access: buffer.access,
        elementType: buffer.elementType,
        lifetime: buffer.lifetime,
        shape: { minLength: buffer.minLength },
        aliasClass: `buffer:${buffer.elementType}`,
        externalBinding: buffer.variableName
      })
    })

    node.storageTextures.forEach((texture) => {
      ensure({
        id: getStorageTextureResourceId(texture),
        kind: texture.dimension === '2d_array' ? 'Texture2DArray' : 'Texture2D',
        access: texture.access,
        format: texture.format,
        lifetime: texture.lifetime,
        shape: {
          depthOrArrayLayers: texture.depthOrArrayLayers
        },
        aliasClass: `storageTexture:${texture.format}:${texture.dimension}`,
        externalBinding: texture.variableName
      })
    })

    node.reads.forEach((read) => {
      const key = resolveNodeResourceRef(node, read)
      if (!key || key === 'virtual:outImage' || !key.startsWith('virtual:')) return
      ensure({
        id: key,
        kind: 'Buffer',
        access: 'read',
        lifetime: 'transient'
      })
    })

    node.writes.forEach((write) => {
      const key = resolveNodeResourceRef(node, write)
      if (!key) return
      if (key === 'virtual:outImage') {
        ensure({
          id: 'virtual:outImage',
          kind: 'Texture2D',
          access: 'write',
          lifetime: 'transient',
          format: passOutputFormat(node)
        })
        return
      }
      if (!key.startsWith('virtual:')) return
      ensure({
        id: key,
        kind: 'Buffer',
        access: 'write',
        lifetime: 'transient'
      })
    })
  })

  return Array.from(resources.values()).sort((left, right) => left.id.localeCompare(right.id))
}

const passOutputFormat = (node: HydraKernelNode): HydraKernelResourceSpec['format'] => {
  const outputWrite = node.writes.find((entry) => entry === 'outImage')
  if (!outputWrite) return undefined
  return 'rgba16float'
}

const createKernelNode = (
  transforms: HydraTransformCall[],
  index: number,
  pass: HydraCompiledPass
): HydraKernelNode => {
  const schedule = pass.schedule
  const dispatchDomain = inferDispatchDomain(pass)
  const reads = pass.ir?.reads ? pass.ir.reads.slice() : []
  const writes = pass.ir?.writes ? pass.ir.writes.slice() : []
  const textureResources = pass.textures.map((texture) => getTextureResourceId(texture))
  const bufferResources = (pass.storageBuffers ?? []).map((buffer) => getStorageBufferResourceId(buffer))
  const storageTextureResources = (pass.storageTextures ?? []).map((texture) => getStorageTextureResourceId(texture))
  const resources = Array.from(new Set(textureResources.concat(bufferResources, storageTextureResources)))

  const loweringNotes: string[] = []
  if (transforms.some((transform) => transform.name === 'prev')) loweringNotes.push('contains-prev-transform')
  if (transforms.some((transform) => transform.name === 'prevN')) loweringNotes.push('contains-prevN-transform')

  return {
    id: `k${index}`,
    kind: inferKernelKind(transforms),
    signature: pass.signature,
    transforms,
    uniforms: pass.uniforms,
    textures: pass.textures,
    storageBuffers: pass.storageBuffers ?? [],
    storageTextures: pass.storageTextures ?? [],
    schedule: {
      resolutionScale: schedule?.resolutionScale ?? 1,
      updateRate: normalizeUpdateRate(schedule?.updateRate),
      sparse: Boolean(schedule?.sparse),
      dispatchDomain,
      variantPolicy: 'compat',
      maxIterations: dispatchDomain === 'queue1d' ? 64 : undefined
    },
    resources,
    reads,
    writes,
    debug: {
      sourceTransformNames: transforms.map((transform) => transform.name),
      loweringNotes,
      compatibilityFlags: ['dsl-v2-compat']
    }
  }
}

const buildEdges = (nodes: HydraKernelNode[]): HydraDependencyEdge[] => {
  const edges = new Map<string, HydraDependencyEdge>()

  const add = (edge: HydraDependencyEdge): void => {
    if (edges.has(edge.id)) return
    edges.set(edge.id, edge)
  }

  for (let index = 1; index < nodes.length; index += 1) {
    const previous = nodes[index - 1]
    const current = nodes[index]
    const seqId = createEdgeId(previous.id, current.id, 'RAW', 'virtual:outImage')
    add({
      id: seqId,
      from: previous.id,
      to: current.id,
      kind: 'RAW',
      resource: 'virtual:outImage'
    })
  }

  const lastWriterByResource = new Map<string, string>()
  nodes.forEach((node) => {
    node.reads.forEach((resource) => {
      const resolved = resolveNodeResourceRef(node, resource)
      if (!resolved) return
      const writer = lastWriterByResource.get(resolved)
      if (!writer || writer === node.id) return
      add({
        id: createEdgeId(writer, node.id, 'RAW', resolved),
        from: writer,
        to: node.id,
        kind: 'RAW',
        resource: resolved
      })
    })

    node.writes.forEach((resource) => {
      const resolved = resolveNodeResourceRef(node, resource)
      if (!resolved) return
      const priorWriter = lastWriterByResource.get(resolved)
      if (priorWriter && priorWriter !== node.id) {
        add({
          id: createEdgeId(priorWriter, node.id, 'WAW', resolved),
          from: priorWriter,
          to: node.id,
          kind: 'WAW',
          resource: resolved
        })
      }
      lastWriterByResource.set(resolved, node.id)
    })
  })

  return Array.from(edges.values())
}

export interface LowerDslToIrOptions {
  maxDynamicUniforms?: number
  graphId?: string
  validate?: boolean
}

export const lowerDslToIr = (
  transforms: HydraTransformCall[],
  { maxDynamicUniforms = 256, graphId = 'hydra-dsl-graph', validate = true }: LowerDslToIrOptions = {}
): HydraKernelGraph => {
  const passGroups = splitPasses(transforms)
  const nodes = passGroups.map((group, index) => {
    const pass = compileWgslPass(group, maxDynamicUniforms)
    return createKernelNode(group, index, pass)
  })
  const resources = collectResourceSpecs(nodes)
  const edges = buildEdges(nodes)
  const graph: HydraKernelGraph = {
    id: graphId,
    source: 'hydra-dsl',
    compatibilityMode: 'dsl-v2',
    nodes,
    resources,
    edges
  }

  if (validate) {
    const issues = validateKernelGraph(graph)
    throwOnKernelGraphErrors(issues)
  }

  return graph
}
