import type { HydraExecutionPlanV3 } from './types.js'

export interface HydraExecutionPlanValidationIssueV3 {
  type: 'error' | 'warning'
  code: string
  message: string
}

export const validateExecutionPlanV3 = (plan: HydraExecutionPlanV3): HydraExecutionPlanValidationIssueV3[] => {
  const issues: HydraExecutionPlanValidationIssueV3[] = []
  const nodeIds = new Set(plan.sourceGraph.nodes.map((node) => node.id))
  const stepIds = new Set<string>()
  const stepNodeIds = new Set<string>()
  const nodeOrderIndex = new Map<string, number>()
  const closedQueueGroups = new Set<string>()
  let activeQueueGroupId: string | null = null
  plan.steps.forEach((step, index) => {
    nodeOrderIndex.set(step.nodeId, index)
  })

  plan.steps.forEach((step) => {
    if (stepIds.has(step.id)) {
      issues.push({
        type: 'error',
        code: 'DUPLICATE_STEP_ID',
        message: `Execution step id "${step.id}" is duplicated.`
      })
    } else {
      stepIds.add(step.id)
    }

    if (!nodeIds.has(step.nodeId)) {
      issues.push({
        type: 'error',
        code: 'STEP_NODE_NOT_FOUND',
        message: `Execution step "${step.id}" references unknown node "${step.nodeId}".`
      })
    }
    stepNodeIds.add(step.nodeId)

    if (step.dispatchDomain === 'queue1d') {
      const groupId = step.queueControl?.groupId
      if (activeQueueGroupId && groupId && groupId !== activeQueueGroupId) {
        closedQueueGroups.add(activeQueueGroupId)
      }
      if (groupId && closedQueueGroups.has(groupId)) {
        issues.push({
          type: 'error',
          code: 'QUEUE_GROUP_NON_CONTIGUOUS',
          message: `Queue step "${step.id}" reuses group "${groupId}" after the segment was already closed.`
        })
      }
      activeQueueGroupId = groupId ?? null

      if (!step.maxIterations || step.maxIterations < 1) {
        issues.push({
          type: 'error',
          code: 'QUEUE_STEP_MAX_ITERATIONS_INVALID',
          message: `Queue step "${step.id}" requires maxIterations >= 1.`
        })
      }
      const passDomain = step.compiledPass.dispatch?.domain
      if (passDomain && passDomain !== 'linear1d') {
        issues.push({
          type: 'warning',
          code: 'QUEUE_STEP_PASS_DOMAIN_MISMATCH',
          message: `Queue step "${step.id}" uses dispatch domain "${passDomain}" instead of linear1d.`
        })
      }
      if (!step.queueControl?.groupId) {
        issues.push({
          type: 'error',
          code: 'QUEUE_STEP_GROUP_MISSING',
          message: `Queue step "${step.id}" is missing queueControl.groupId metadata.`
        })
      }
      if ((step.queueControl?.convergenceCheckInterval ?? 0) < 1) {
        issues.push({
          type: 'error',
          code: 'QUEUE_CONVERGENCE_INTERVAL_INVALID',
          message: `Queue step "${step.id}" must have convergenceCheckInterval >= 1.`
        })
      }
    } else {
      if (activeQueueGroupId) closedQueueGroups.add(activeQueueGroupId)
      activeQueueGroupId = null
      if (step.queueControl) {
        issues.push({
          type: 'warning',
          code: 'NON_QUEUE_STEP_HAS_QUEUE_CONTROL',
          message: `Non-queue step "${step.id}" should not carry queueControl metadata.`
        })
      }
    }
  })

  plan.barriers.forEach((barrier) => {
    if (!stepNodeIds.has(barrier.fromNodeId) || !stepNodeIds.has(barrier.toNodeId)) {
      issues.push({
        type: 'error',
        code: 'BARRIER_STEP_NOT_FOUND',
        message: `Barrier ${barrier.fromNodeId} -> ${barrier.toNodeId} references non-executable step nodes.`
      })
      return
    }
    const fromIndex = nodeOrderIndex.get(barrier.fromNodeId) ?? -1
    const toIndex = nodeOrderIndex.get(barrier.toNodeId) ?? -1
    if (fromIndex >= toIndex) {
      issues.push({
        type: 'error',
        code: 'BARRIER_ORDER_INVALID',
        message: `Barrier ${barrier.fromNodeId} -> ${barrier.toNodeId} violates execution order.`
      })
    }
  })

  const nonAliasableSlots = new Map<string, string>()
  const bySlot = new Map<string, Array<{ id: string, start: number, end: number, aliasable: boolean, aliasGroup: string }>>()
  plan.resources.forEach((allocation) => {
    if (allocation.interval.start > allocation.interval.end) {
      issues.push({
        type: 'error',
        code: 'RESOURCE_INTERVAL_INVALID',
        message: `Resource allocation "${allocation.resourceId}" has invalid interval ${allocation.interval.start}:${allocation.interval.end}.`
      })
    }
    if (!allocation.aliasable && allocation.slot.includes('transient')) {
      issues.push({
        type: 'warning',
        code: 'NON_ALIASABLE_TRANSIENT_SLOT',
        message: `Resource allocation "${allocation.resourceId}" is non-aliasable but uses transient slot "${allocation.slot}".`
      })
    }

    const items = bySlot.get(allocation.slot)
    const entry = {
      id: allocation.resourceId,
      start: allocation.interval.start,
      end: allocation.interval.end,
      aliasable: allocation.aliasable,
      aliasGroup: allocation.aliasGroup
    }
    if (items) items.push(entry)
    else bySlot.set(allocation.slot, [entry])

    if (!allocation.aliasable) {
      const existing = nonAliasableSlots.get(allocation.slot)
      if (existing && existing !== allocation.resourceId) {
        issues.push({
          type: 'error',
          code: 'NON_ALIASABLE_SLOT_COLLISION',
          message: `Non-aliasable resources "${existing}" and "${allocation.resourceId}" share slot "${allocation.slot}".`
        })
      } else {
        nonAliasableSlots.set(allocation.slot, allocation.resourceId)
      }
    }
  })

  bySlot.forEach((entries, slot) => {
    if (entries.length <= 1) return
    for (let index = 0; index < entries.length; index += 1) {
      const left = entries[index]
      if (!left) continue
      for (let next = index + 1; next < entries.length; next += 1) {
        const right = entries[next]
        if (!right) continue
        const overlap = left.start <= right.end && right.start <= left.end
        if (!overlap) continue
        if (left.aliasable && right.aliasable && left.aliasGroup === right.aliasGroup) continue
        issues.push({
          type: 'error',
          code: 'SLOT_INTERVAL_COLLISION',
          message: `Slot "${slot}" overlaps for "${left.id}" and "${right.id}" with incompatible aliasing.`
        })
      }
    }
  })

  const expectedNodeOrder = plan.steps.map((step) => step.nodeId)
  if (
    plan.diagnostics.nodeOrder.length !== expectedNodeOrder.length ||
    plan.diagnostics.nodeOrder.some((nodeId, index) => nodeId !== expectedNodeOrder[index])
  ) {
    issues.push({
      type: 'warning',
      code: 'DIAGNOSTIC_NODE_ORDER_MISMATCH',
      message: 'Plan diagnostics nodeOrder diverges from executable step order.'
    })
  }

  return issues
}

export const throwOnExecutionPlanV3Errors = (
  issues: HydraExecutionPlanValidationIssueV3[],
  label = 'HydraExecutionPlanV3'
): void => {
  const errors = issues.filter((issue) => issue.type === 'error')
  if (errors.length <= 0) return
  const detail = errors.map((issue) => `${issue.code}: ${issue.message}`).join('\n')
  throw new Error(`${label} validation failed:\n${detail}`)
}
