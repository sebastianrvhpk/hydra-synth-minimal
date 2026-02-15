import { compileWgslPass } from '../transforms/compile-wgsl.js'
import { splitLegacyPasses } from '../transforms/split-legacy-passes.js'
import type {
  HydraCompiledPass,
  HydraPassUpdateRate,
  HydraTransformCall
} from '../types.js'
import {
  createEdgeId,
  throwOnKernelGraphV3Errors,
  validateKernelGraphV3
} from '../ir-v3/validate.js'
import type {
  HydraDependencyEdgeV3,
  HydraKernelGraphV3,
  HydraKernelNodeKindV3,
  HydraKernelNodeV3,
  HydraKernelResourceSpecV3
} from '../ir-v3/types.js'

const normalizeUpdateRate = (value: HydraPassUpdateRate | undefined): HydraPassUpdateRate => value ?? 'everyFrame'

const inferKernelKind = (transforms: HydraTransformCall[]): HydraKernelNodeKindV3 => {
  if (transforms.some((transform) => transform.transform.type === 'analysis')) return 'ReductionKernel'
  if (transforms.some((transform) => transform.transform.type === 'simulation')) return 'DataKernel'
  if (transforms.some((transform) => transform.transform.type === 'kernel')) return 'DataKernel'
  return 'ImageKernel'
}

const inferDispatchDomain = (pass: HydraCompiledPass): HydraKernelNodeV3['schedule']['dispatchDomain'] => {
  const domain = pass.dispatch?.domain
  if (domain === 'linear1d') {
    if (pass.schedule?.sparse) return 'queue1d'
    return 'linear1d'
  }
  if (pass.dispatch?.mode === 'indirect') return 'indirect2d'
  return 'pixel2d'
}

const collectResourceSpecs = (nodes: HydraKernelNodeV3[]): HydraKernelResourceSpecV3[] => {
  const resources = new Map<string, HydraKernelResourceSpecV3>()

  const ensure = (resource: HydraKernelResourceSpecV3): void => {
    if (resources.has(resource.id)) return
    resources.set(resource.id, resource)
  }

  nodes.forEach((node) => {
    node.textures.forEach((texture) => {
      ensure({
        id: `texture:${texture.name}`,
        kind: 'Texture2D',
        access: 'read',
        lifetime: 'external',
        aliasClass: 'texture-read',
        externalBinding: texture.variableName
      })
    })

    node.storageBuffers.forEach((buffer) => {
      ensure({
        id: `buffer:${buffer.name}`,
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
        id: `storageTexture:${texture.name}`,
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
      if (read === 'outImage') return
      const key = `virtual:${read}`
      ensure({
        id: key,
        kind: 'Buffer',
        access: 'read',
        lifetime: 'transient'
      })
    })

    node.writes.forEach((write) => {
      if (write === 'outImage') {
        ensure({
          id: 'virtual:outImage',
          kind: 'Texture2D',
          access: 'write',
          lifetime: 'transient',
          format: passOutputFormat(node)
        })
        return
      }
      const key = `virtual:${write}`
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

const passOutputFormat = (node: HydraKernelNodeV3): HydraKernelResourceSpecV3['format'] => {
  const outputWrite = node.writes.find((entry) => entry === 'outImage')
  if (!outputWrite) return undefined
  return 'rgba16float'
}

const createKernelNode = (
  transforms: HydraTransformCall[],
  index: number,
  pass: HydraCompiledPass
): HydraKernelNodeV3 => {
  const schedule = pass.schedule
  const dispatchDomain = inferDispatchDomain(pass)
  const reads = pass.ir?.reads ? pass.ir.reads.slice() : []
  const writes = pass.ir?.writes ? pass.ir.writes.slice() : []
  const textureResources = pass.textures.map((texture) => `texture:${texture.name}`)
  const bufferResources = (pass.storageBuffers ?? []).map((buffer) => `buffer:${buffer.name}`)
  const storageTextureResources = (pass.storageTextures ?? []).map((texture) => `storageTexture:${texture.name}`)
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

const buildEdges = (nodes: HydraKernelNodeV3[]): HydraDependencyEdgeV3[] => {
  const edges = new Map<string, HydraDependencyEdgeV3>()

  const add = (edge: HydraDependencyEdgeV3): void => {
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
      const writer = lastWriterByResource.get(resource)
      if (!writer || writer === node.id) return
      add({
        id: createEdgeId(writer, node.id, 'RAW', `virtual:${resource}`),
        from: writer,
        to: node.id,
        kind: 'RAW',
        resource: `virtual:${resource}`
      })
    })

    node.writes.forEach((resource) => {
      const priorWriter = lastWriterByResource.get(resource)
      if (priorWriter && priorWriter !== node.id) {
        add({
          id: createEdgeId(priorWriter, node.id, 'WAW', `virtual:${resource}`),
          from: priorWriter,
          to: node.id,
          kind: 'WAW',
          resource: `virtual:${resource}`
        })
      }
      lastWriterByResource.set(resource, node.id)
    })
  })

  return Array.from(edges.values())
}

export interface LowerDslToIrV3Options {
  maxDynamicUniforms?: number
  graphId?: string
  validate?: boolean
}

export const lowerDslToIrV3 = (
  transforms: HydraTransformCall[],
  { maxDynamicUniforms = 256, graphId = 'hydra-dsl-graph', validate = true }: LowerDslToIrV3Options = {}
): HydraKernelGraphV3 => {
  const passGroups = splitLegacyPasses(transforms)
  const nodes = passGroups.map((group, index) => {
    const pass = compileWgslPass(group, maxDynamicUniforms)
    return createKernelNode(group, index, pass)
  })
  const resources = collectResourceSpecs(nodes)
  const edges = buildEdges(nodes)
  const graph: HydraKernelGraphV3 = {
    id: graphId,
    source: 'hydra-dsl',
    compatibilityMode: 'dsl-v2',
    nodes,
    resources,
    edges
  }

  if (validate) {
    const issues = validateKernelGraphV3(graph)
    throwOnKernelGraphV3Errors(issues)
  }

  return graph
}
