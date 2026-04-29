import type { HydraCompiledPass } from '../types.js'
import type { HydraDependencyEdge, HydraKernelGraph, HydraKernelNode } from '../ir/types.js'
import type {
  HydraExecutionBarrier,
  HydraExecutionPlanDiagnostics,
  HydraExecutionStep,
  HydraResourceAllocationPlan
} from './types.js'

interface ResourceInterval {
  start: number
  end: number
}

interface PlannerSlotState {
  id: string
  aliasGroup: string
  end: number
  bytes: number
}

export interface HydraResourcePlanningResult {
  allocations: HydraResourceAllocationPlan[]
  peakTransientBytes: number
  totalPlannedBytes: number
}

const resourceByteEstimate = (resource: HydraKernelGraph['resources'][number]): number => {
  const width = Math.max(1, Math.floor(resource.shape?.width ?? 1))
  const height = Math.max(1, Math.floor(resource.shape?.height ?? 1))
  const depth = Math.max(1, Math.floor(resource.shape?.depthOrArrayLayers ?? 1))

  if (resource.format === 'rgba16float') return width * height * depth * 8
  if (resource.format === 'rgba32float') return width * height * depth * 16
  if (resource.format === 'r32float' || resource.format === 'r32uint') return width * height * depth * 4
  if (resource.format === 'rg32float') return width * height * depth * 8
  return width * height * depth * 4
}

const variantOfPass = (_pass: HydraCompiledPass): HydraExecutionStep['variant'] => 'fragment'

const resolveResourceRef = (resourceIds: Set<string>, reference: string): string | null => {
  if (resourceIds.has(reference)) return reference
  if (!reference.startsWith('virtual:')) {
    const virtual = `virtual:${reference}`
    if (resourceIds.has(virtual)) return virtual
  }
  return null
}

const aliasKeyForResource = (resource: HydraKernelGraph['resources'][number]): string =>
  resource.aliasClass ?? `${resource.kind}:${resource.format ?? 'default'}`

const deriveResourceIntervals = (
  graph: HydraKernelGraph,
  orderedNodes: HydraKernelNode[]
): Map<string, ResourceInterval> => {
  const resourceIds = new Set(graph.resources.map((resource) => resource.id))
  const intervals = new Map<string, ResourceInterval>()

  orderedNodes.forEach((node, index) => {
    const refs = new Set<string>()
    node.resources.forEach((id) => refs.add(id))
    node.reads.forEach((name) => refs.add(name))
    node.writes.forEach((name) => refs.add(name))

    refs.forEach((ref) => {
      const resourceId = resolveResourceRef(resourceIds, ref)
      if (!resourceId) return
      const current = intervals.get(resourceId)
      if (!current) {
        intervals.set(resourceId, { start: index, end: index })
        return
      }
      current.start = Math.min(current.start, index)
      current.end = Math.max(current.end, index)
    })
  })

  graph.resources.forEach((resource) => {
    if (intervals.has(resource.id)) return
    intervals.set(resource.id, { start: 0, end: 0 })
  })

  return intervals
}

export const inferAndOrderNodes = (graph: HydraKernelGraph): HydraKernelNode[] => {
  const indegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()
  graph.nodes.forEach((node) => {
    indegree.set(node.id, 0)
    adjacency.set(node.id, [])
  })

  graph.edges.forEach((edge) => {
    const next = adjacency.get(edge.from)
    if (next) next.push(edge.to)
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1)
  })

  const queue = graph.nodes
    .filter((node) => (indegree.get(node.id) ?? 0) === 0)
    .map((node) => node.id)
    .sort((left, right) => left.localeCompare(right))
  const ordered: string[] = []

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) break
    ordered.push(current)
    const next = adjacency.get(current) ?? []
    next.sort((left, right) => left.localeCompare(right)).forEach((candidate) => {
      const degree = (indegree.get(candidate) ?? 0) - 1
      indegree.set(candidate, degree)
      if (degree === 0) queue.push(candidate)
    })
    queue.sort((left, right) => left.localeCompare(right))
  }

  if (ordered.length === graph.nodes.length) {
    const byId = new Map(graph.nodes.map((node) => [node.id, node]))
    return ordered.map((id) => byId.get(id)).filter((entry): entry is HydraKernelNode => Boolean(entry))
  }

  return graph.nodes.slice()
}

export const buildExecutionBarriers = (
  edges: HydraDependencyEdge[],
  orderedNodeIds: string[]
): HydraExecutionBarrier[] => {
  const orderLookup = new Map<string, number>()
  orderedNodeIds.forEach((id, index) => orderLookup.set(id, index))
  return edges
    .filter((edge) => (orderLookup.get(edge.from) ?? -1) < (orderLookup.get(edge.to) ?? Number.MAX_SAFE_INTEGER))
    .map((edge) => ({
      fromNodeId: edge.from,
      toNodeId: edge.to,
      reason: edge.kind,
      resource: edge.resource
    }))
}

export const planResourceAllocations = (
  graph: HydraKernelGraph,
  orderedNodes: HydraKernelNode[]
): HydraResourcePlanningResult => {
  const intervals = deriveResourceIntervals(graph, orderedNodes)
  const slotState = new Map<string, PlannerSlotState>()
  const slotsByAlias = new Map<string, PlannerSlotState[]>()
  let transientSlotCounter = 0

  const resources = graph.resources
    .slice()
    .sort((left, right) => {
      const intervalLeft = intervals.get(left.id)
      const intervalRight = intervals.get(right.id)
      const startDiff = (intervalLeft?.start ?? 0) - (intervalRight?.start ?? 0)
      if (startDiff !== 0) return startDiff
      return left.id.localeCompare(right.id)
    })

  const allocations: HydraResourceAllocationPlan[] = resources.map((resource) => {
    const aliasGroup = aliasKeyForResource(resource)
    const interval = intervals.get(resource.id) ?? { start: 0, end: 0 }
    const plannedBytes = resourceByteEstimate(resource)
    const aliasable = resource.lifetime === 'transient'

    let slotId = `slot:${resource.id}`
    if (aliasable) {
      const candidates = (slotsByAlias.get(aliasGroup) ?? [])
        .filter((slot) => slot.end < interval.start)
        .sort((left, right) => left.bytes - right.bytes)
      const selected = candidates[0]
      if (selected) {
        slotId = selected.id
        selected.end = interval.end
        selected.bytes = Math.max(selected.bytes, plannedBytes)
      } else {
        slotId = `slot:transient:${aliasGroup}:${transientSlotCounter}`
        transientSlotCounter += 1
        const created: PlannerSlotState = {
          id: slotId,
          aliasGroup,
          end: interval.end,
          bytes: plannedBytes
        }
        const bucket = slotsByAlias.get(aliasGroup)
        if (bucket) bucket.push(created)
        else slotsByAlias.set(aliasGroup, [created])
        slotState.set(slotId, created)
      }
    }

    if (!slotState.has(slotId)) {
      slotState.set(slotId, {
        id: slotId,
        aliasGroup,
        end: interval.end,
        bytes: plannedBytes
      })
    } else {
      const state = slotState.get(slotId)
      if (state) {
        state.end = Math.max(state.end, interval.end)
        state.bytes = Math.max(state.bytes, plannedBytes)
      }
    }

    return {
      resourceId: resource.id,
      lifetime: resource.lifetime,
      aliasGroup,
      slot: slotId,
      interval,
      aliasable,
      plannedBytes
    }
  })

  const maxNodeIndex = Math.max(0, orderedNodes.length - 1)
  let peakTransientBytes = 0
  for (let index = 0; index <= maxNodeIndex; index += 1) {
    const activeTransientSlots = new Set<string>()
    allocations.forEach((allocation) => {
      if (!allocation.aliasable) return
      if (index < allocation.interval.start || index > allocation.interval.end) return
      activeTransientSlots.add(allocation.slot)
    })
    let frameBytes = 0
    activeTransientSlots.forEach((slotId) => {
      frameBytes += slotState.get(slotId)?.bytes ?? 0
    })
    peakTransientBytes = Math.max(peakTransientBytes, frameBytes)
  }

  const totalPlannedBytes = Array.from(slotState.values())
    .reduce((sum, slot) => sum + slot.bytes, 0)

  return {
    allocations: allocations.sort((left, right) => left.resourceId.localeCompare(right.resourceId)),
    peakTransientBytes,
    totalPlannedBytes
  }
}

export const buildExecutionSteps = (
  orderedNodes: HydraKernelNode[],
  compiledPassByNodeId: Map<string, HydraCompiledPass>,
  barriers: HydraExecutionBarrier[]
): HydraExecutionStep[] => {
  const barriersByNode = new Map<string, HydraExecutionBarrier[]>()
  barriers.forEach((barrier) => {
    const bucket = barriersByNode.get(barrier.toNodeId)
    if (bucket) bucket.push(barrier)
    else barriersByNode.set(barrier.toNodeId, [barrier])
  })

  const steps: HydraExecutionStep[] = []

  orderedNodes.forEach((node, index) => {
    const compiledPass = compiledPassByNodeId.get(node.id)
    if (!compiledPass) {
      throw new Error(`Missing compiled pass for node "${node.id}".`)
    }

    steps.push({
      id: `step${index}`,
      nodeId: node.id,
      signature: compiledPass.signature,
      variant: variantOfPass(compiledPass),
      compiledPass,
      barriersBefore: barriersByNode.get(node.id) ?? []
    })
  })

  return steps
}

export const scoreExecutionPlan = (
  steps: HydraExecutionStep[],
  _allocations: HydraResourceAllocationPlan[],
  peakTransientBytes: number,
  totalPlannedBytes: number,
  barrierCount: number
): HydraExecutionPlanDiagnostics => {
  const runCost = steps.length
  const memoryCost = totalPlannedBytes / 1_000_000
  const barrierCost = barrierCount / Math.max(steps.length, 1)

  const score =
    (runCost * 0.55) +
    (memoryCost * 0.35) +
    (barrierCost * 0.1)

  return {
    score,
    scoreBreakdown: {
      runCost,
      memoryCost,
      barrierCost
    },
    peakTransientBytes,
    totalPlannedBytes,
    barrierCount,
    nodeOrder: steps.map((step) => step.nodeId)
  }
}
