import type { HydraCompiledPass } from '../types.js'
import type { HydraDependencyEdge, HydraKernelGraph, HydraKernelNode } from '../ir/types.js'
import type {
  HydraExecutionBarrier,
  HydraExecutionPlanDiagnostics,
  HydraQueuePolicy,
  HydraExecutionPrimitiveSelection,
  HydraExecutionStep,
  HydraExecutionVariantCandidate,
  HydraResourceAllocationPlan
} from './types.js'

interface ResourceInterval {
  start: number
  end: number
}

interface VariantPassCandidate extends HydraExecutionVariantCandidate {
  pass: HydraCompiledPass
}

interface PlannerSlotState {
  id: string
  aliasGroup: string
  end: number
  bytes: number
}

const DEFAULT_QUEUE_CONVERGENCE_INTERVAL = 4
const DEFAULT_QUEUE_MAX_ITERATIONS = 64
const DEFAULT_QUEUE_MAX_OVERFLOW = 2_147_483_647

export interface HydraPlannerCapabilityProfile {
  supportedFeatures: string[]
  hasSubgroups: boolean
  maxWorkgroupStorageBytes: number
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
  const length = Math.max(1, Math.floor(resource.shape?.minLength ?? 1))

  if (resource.kind === 'Buffer') {
    if (resource.elementType === 'f32' || resource.elementType === 'u32' || resource.elementType === 'i32') return length * 4
    if (resource.elementType === 'vec2f') return length * 8
    return length * 16
  }

  if (resource.format === 'rgba16float') return width * height * depth * 8
  if (resource.format === 'rgba32float') return width * height * depth * 16
  if (resource.format === 'r32float' || resource.format === 'r32uint') return width * height * depth * 4
  if (resource.format === 'rg32float') return width * height * depth * 8
  return width * height * depth * 4
}

const variantOfPass = (pass: HydraCompiledPass): HydraExecutionStep['variant'] => {
  const requiredFeatures = pass.dispatch?.requiredFeatures ?? []
  if (requiredFeatures.includes('subgroups')) return 'subgroup'
  if ((pass.dispatch?.requiredWorkgroupStorageBytes ?? 0) > 0) return 'tiled'
  return 'generic'
}

const resolveResourceRef = (resourceIds: Set<string>, reference: string): string | null => {
  if (resourceIds.has(reference)) return reference
  if (!reference.startsWith('virtual:')) {
    const virtual = `virtual:${reference}`
    if (resourceIds.has(virtual)) return virtual
  }
  return null
}

const flattenFallbackChain = (root: HydraCompiledPass): HydraCompiledPass[] => {
  const chain: HydraCompiledPass[] = []
  const visited = new Set<string>()
  let current: HydraCompiledPass | undefined = root
  while (current && !visited.has(current.signature)) {
    visited.add(current.signature)
    chain.push(current)
    current = current.fallbackPass
  }
  return chain
}

const countFallbackDepth = (pass: HydraCompiledPass): number => {
  return Math.max(0, flattenFallbackChain(pass).length - 1)
}

const evaluateCandidateLegality = (
  pass: HydraCompiledPass,
  capabilityProfile: HydraPlannerCapabilityProfile
): { legal: boolean, reason?: string } => {
  const requiredFeatures = pass.dispatch?.requiredFeatures ?? []
  if (requiredFeatures.length > 0) {
    const supported = new Set(capabilityProfile.supportedFeatures)
    for (const feature of requiredFeatures) {
      if (feature === 'subgroups' && !capabilityProfile.hasSubgroups) {
        return { legal: false, reason: 'missing-feature:subgroups' }
      }
      if (!supported.has(feature)) {
        return { legal: false, reason: `missing-feature:${feature}` }
      }
    }
  }

  const requiredStorage = pass.dispatch?.requiredWorkgroupStorageBytes ?? 0
  if (
    requiredStorage > 0 &&
    capabilityProfile.maxWorkgroupStorageBytes > 0 &&
    requiredStorage > capabilityProfile.maxWorkgroupStorageBytes
  ) {
    return {
      legal: false,
      reason: `workgroup-storage-exceeded:${requiredStorage}>${capabilityProfile.maxWorkgroupStorageBytes}`
    }
  }

  return { legal: true }
}

const collectVariantCandidates = (
  pass: HydraCompiledPass,
  capabilityProfile: HydraPlannerCapabilityProfile
): VariantPassCandidate[] => {
  return flattenFallbackChain(pass).map((candidate) => {
    const legality = evaluateCandidateLegality(candidate, capabilityProfile)
    return {
      pass: candidate,
      variant: variantOfPass(candidate),
      signature: candidate.signature,
      legal: legality.legal,
      reason: legality.reason
    }
  })
}

const selectVariantCandidate = (
  candidates: VariantPassCandidate[],
  policy: HydraExecutionPlanDiagnostics['selectedVariantPolicy']
): VariantPassCandidate => {
  const preferenceOrder: Record<
  HydraExecutionPlanDiagnostics['selectedVariantPolicy'],
  Array<HydraExecutionStep['variant']>
  > = {
    compat: ['generic', 'tiled', 'subgroup'],
    balanced: ['tiled', 'generic', 'subgroup'],
    aggressive: ['subgroup', 'tiled', 'generic']
  }

  const legal = candidates.filter((candidate) => candidate.legal)
  const pool = legal.length > 0 ? legal : candidates
  const preference = preferenceOrder[policy]

  for (const variant of preference) {
    const match = pool.find((candidate) => candidate.variant === variant)
    if (match) return match
  }

  const fallback = pool[0] ?? candidates[0]
  if (!fallback) {
    throw new Error('Missing compiled pass variants while selecting execution candidate.')
  }
  return fallback
}

const aliasKeyForResource = (resource: HydraKernelGraph['resources'][number]): string =>
  resource.aliasClass ?? `${resource.kind}:${resource.format ?? resource.elementType ?? 'default'}`

const createQueuePolicy = ({
  modeHint,
  maxIterations,
  convergenceCheckInterval = DEFAULT_QUEUE_CONVERGENCE_INTERVAL
}: {
  modeHint: 'cpu' | 'gpu_hybrid'
  maxIterations: number
  convergenceCheckInterval?: number
}): HydraQueuePolicy => {
  const safeMaxIterations = Math.max(1, Math.floor(maxIterations || DEFAULT_QUEUE_MAX_ITERATIONS))
  const safeCheckInterval = Math.max(1, Math.floor(convergenceCheckInterval || DEFAULT_QUEUE_CONVERGENCE_INTERVAL))
  return {
    termination: {
      mode: 'until_empty',
      maxIterations: safeMaxIterations,
      minIterations: 1
    },
    overflow: {
      policy: 'ignore',
      maxOverflow: DEFAULT_QUEUE_MAX_OVERFLOW
    },
    convergence: {
      strategy: modeHint === 'gpu_hybrid' ? 'hook_or_queue_counter' : 'hooks',
      checkInterval: safeCheckInterval,
      maxNoProgressChecks: 2
    }
  }
}

const computeResourceIntervals = (
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
  const intervals = computeResourceIntervals(graph, orderedNodes)
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
  barriers: HydraExecutionBarrier[],
  selectedVariantPolicy: HydraExecutionPlanDiagnostics['selectedVariantPolicy'],
  capabilityProfile: HydraPlannerCapabilityProfile,
  primitiveByNodeId: Map<string, HydraExecutionPrimitiveSelection> = new Map()
): HydraExecutionStep[] => {
  const barriersByNode = new Map<string, HydraExecutionBarrier[]>()
  barriers.forEach((barrier) => {
    const bucket = barriersByNode.get(barrier.toNodeId)
    if (bucket) bucket.push(barrier)
    else barriersByNode.set(barrier.toNodeId, [barrier])
  })

  const steps: HydraExecutionStep[] = []
  let queueSegmentIndex = -1
  let previousWasQueue = false

  orderedNodes.forEach((node, index) => {
    const compiledPass = compiledPassByNodeId.get(node.id)
    if (!compiledPass) {
      throw new Error(`Missing compiled pass for node "${node.id}".`)
    }

    const candidates = collectVariantCandidates(compiledPass, capabilityProfile)
    const selected = selectVariantCandidate(candidates, selectedVariantPolicy)

    const isQueue = node.schedule.dispatchDomain === 'queue1d'
    if (isQueue && !previousWasQueue) queueSegmentIndex += 1
    const queueMaxIterations = Math.max(1, Math.floor(node.schedule.maxIterations ?? DEFAULT_QUEUE_MAX_ITERATIONS))
    const queueControl = isQueue
      ? {
          modeHint: 'gpu_hybrid' as const,
          convergenceCheckInterval: DEFAULT_QUEUE_CONVERGENCE_INTERVAL,
          groupId: `queue-segment-${Math.max(0, queueSegmentIndex)}`,
          policy: createQueuePolicy({
            modeHint: 'gpu_hybrid',
            maxIterations: queueMaxIterations,
            convergenceCheckInterval: DEFAULT_QUEUE_CONVERGENCE_INTERVAL
          })
        }
      : undefined
    previousWasQueue = isQueue

    steps.push({
      id: `step${index}`,
      nodeId: node.id,
      signature: selected.pass.signature,
      dispatchDomain: node.schedule.dispatchDomain,
      variant: selected.variant,
      variantCandidates: candidates.map((candidate) => ({
        variant: candidate.variant,
        signature: candidate.signature,
        legal: candidate.legal,
        reason: candidate.reason
      })),
      fallbackDepth: countFallbackDepth(selected.pass),
      maxIterations: isQueue ? queueMaxIterations : node.schedule.maxIterations,
      queueControl,
      primitive: primitiveByNodeId.get(node.id),
      compiledPass: selected.pass,
      barriersBefore: barriersByNode.get(node.id) ?? []
    })
  })

  return steps
}

export const scoreExecutionPlan = (
  steps: HydraExecutionStep[],
  _allocations: HydraResourceAllocationPlan[],
  selectedVariantPolicy: HydraExecutionPlanDiagnostics['selectedVariantPolicy'],
  peakTransientBytes: number,
  totalPlannedBytes: number,
  barrierCount: number
): HydraExecutionPlanDiagnostics => {
  const dispatchCost = steps.reduce((sum, step) => sum + (step.dispatchDomain.includes('indirect') ? 1.25 : 1), 0)
  const memoryCost = totalPlannedBytes / 1_000_000
  const fallbackRiskCost = steps.reduce((sum, step) => {
    if (step.variant === 'subgroup') return sum + 0.6
    if (step.variant === 'tiled') return sum + 0.3
    return sum + 0.05
  }, 0)
  const fallbackRiskRate = steps.length > 0 ? fallbackRiskCost / steps.length : 0
  const selectedVariantCounts: Record<'generic' | 'tiled' | 'subgroup', number> = {
    generic: 0,
    tiled: 0,
    subgroup: 0
  }
  const primitiveSelectionCounts: Record<string, number> = {}
  const queueGroups = new Set<string>()
  let queueStepCount = 0
  steps.forEach((step) => {
    selectedVariantCounts[step.variant] += 1
    const key = step.primitive?.kind
    if (!key) return
    primitiveSelectionCounts[key] = (primitiveSelectionCounts[key] ?? 0) + 1
  })
  steps.forEach((step) => {
    if (step.dispatchDomain !== 'queue1d') return
    queueStepCount += 1
    if (step.queueControl?.groupId) queueGroups.add(step.queueControl.groupId)
  })

  const score =
    (dispatchCost * 0.45) +
    (memoryCost * 0.25) +
    (fallbackRiskCost * 0.2) +
    ((barrierCount / Math.max(steps.length, 1)) * 0.1)

  return {
    score,
    scoreBreakdown: {
      dispatchCost,
      memoryCost,
      fallbackRiskCost
    },
    selectedVariantPolicy,
    peakTransientBytes,
    totalPlannedBytes,
    fallbackRiskRate,
    selectedVariantCounts,
    primitiveSelectionCounts,
    queueStepCount,
    queueSegmentCount: queueGroups.size,
    barrierCount,
    nodeOrder: steps.map((step) => step.nodeId)
  }
}
