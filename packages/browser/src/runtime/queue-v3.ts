export interface HydraQueueDispatchStateV3 {
  activeCount: number
  capacity: number
  overflowCount: number
  iteration: number
}

export interface HydraQueueDispatchDecisionV3 {
  dispatchX: number
  dispatchY: number
  dispatchZ: number
  shouldContinue: boolean
  diagnostics: HydraQueueDispatchStateV3
}

export const decideQueueDispatchV3 = ({
  activeCount,
  capacity,
  iteration,
  maxIterations,
  workgroupSizeX
}: {
  activeCount: number
  capacity: number
  iteration: number
  maxIterations: number
  workgroupSizeX: number
}): HydraQueueDispatchDecisionV3 => {
  const safeActive = Math.max(0, Math.floor(activeCount))
  const safeCapacity = Math.max(1, Math.floor(capacity))
  const safeIteration = Math.max(0, Math.floor(iteration))
  const safeMaxIterations = Math.max(1, Math.floor(maxIterations))
  const safeWorkgroup = Math.max(1, Math.floor(workgroupSizeX))
  const clamped = Math.min(safeActive, safeCapacity)
  const overflow = Math.max(0, safeActive - safeCapacity)
  const shouldContinue = clamped > 0 && safeIteration < safeMaxIterations

  return {
    dispatchX: shouldContinue ? Math.max(1, Math.ceil(clamped / safeWorkgroup)) : 1,
    dispatchY: 1,
    dispatchZ: 1,
    shouldContinue,
    diagnostics: {
      activeCount: clamped,
      capacity: safeCapacity,
      overflowCount: overflow,
      iteration: safeIteration
    }
  }
}

export interface HydraQueueIndirectArgsV3 {
  x: number
  y: number
  z: number
}

export const toQueueIndirectArgsV3 = (decision: HydraQueueDispatchDecisionV3): HydraQueueIndirectArgsV3 => ({
  x: Math.max(0, Math.floor(decision.dispatchX)),
  y: Math.max(0, Math.floor(decision.dispatchY)),
  z: Math.max(0, Math.floor(decision.dispatchZ))
})

export const shouldTerminateQueueLoopV3 = (
  decision: HydraQueueDispatchDecisionV3,
  {
    maxOverflow = Number.POSITIVE_INFINITY
  }: {
    maxOverflow?: number
  } = {}
): boolean => {
  if (!decision.shouldContinue) return true
  if (decision.diagnostics.overflowCount > Math.max(0, Math.floor(maxOverflow))) return true
  return false
}
