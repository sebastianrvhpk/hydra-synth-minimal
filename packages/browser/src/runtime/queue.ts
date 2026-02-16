import type { HydraQueuePolicy } from 'hydra-synth-core'

export interface HydraQueueDispatchState {
  activeCount: number
  capacity: number
  overflowCount: number
  iteration: number
}

export interface HydraQueueDispatchDecision {
  dispatchX: number
  dispatchY: number
  dispatchZ: number
  shouldContinue: boolean
  diagnostics: HydraQueueDispatchState
}

export const decideQueueDispatch = ({
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
}): HydraQueueDispatchDecision => {
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

export interface HydraQueueIndirectArgs {
  x: number
  y: number
  z: number
}

export const toQueueIndirectArgs = (decision: HydraQueueDispatchDecision): HydraQueueIndirectArgs => ({
  x: Math.max(0, Math.floor(decision.dispatchX)),
  y: Math.max(0, Math.floor(decision.dispatchY)),
  z: Math.max(0, Math.floor(decision.dispatchZ))
})

export const DEFAULT_QUEUE_MAX_OVERFLOW = 2_147_483_647

export type HydraQueueTerminationReason =
  | 'none'
  | 'inactive'
  | 'max_iterations'
  | 'fixed_iterations'
  | 'overflow_limit'
  | 'convergence_stalled'
  | 'compat_cpu_single_iter'

export const createDefaultQueuePolicy = ({
  modeHint = 'gpu_hybrid',
  maxIterations = 64,
  convergenceCheckInterval = 4
}: {
  modeHint?: 'cpu' | 'gpu_hybrid'
  maxIterations?: number
  convergenceCheckInterval?: number
} = {}): HydraQueuePolicy => ({
  termination: {
    mode: 'until_empty',
    maxIterations: Math.max(1, Math.floor(maxIterations || 64)),
    minIterations: 1
  },
  overflow: {
    policy: 'ignore',
    maxOverflow: DEFAULT_QUEUE_MAX_OVERFLOW
  },
  convergence: {
    strategy: modeHint === 'gpu_hybrid' ? 'hook_or_queue_counter' : 'hooks',
    checkInterval: Math.max(1, Math.floor(convergenceCheckInterval || 4)),
    maxNoProgressChecks: 2
  }
})

export const normalizeQueuePolicy = (
  policy: HydraQueuePolicy | null | undefined,
  {
    modeHint = 'gpu_hybrid',
    maxIterations = 64,
    convergenceCheckInterval = 4
  }: {
    modeHint?: 'cpu' | 'gpu_hybrid'
    maxIterations?: number
    convergenceCheckInterval?: number
  } = {}
): HydraQueuePolicy => {
  const fallback = createDefaultQueuePolicy({ modeHint, maxIterations, convergenceCheckInterval })
  if (!policy) return fallback

  const terminationMax = Math.max(1, Math.floor(policy.termination?.maxIterations ?? fallback.termination.maxIterations))
  const terminationMin = Math.max(1, Math.floor(policy.termination?.minIterations ?? fallback.termination.minIterations))
  const fixedIterationsRaw = policy.termination?.fixedIterations
  const fixedIterations = typeof fixedIterationsRaw === 'number' && Number.isFinite(fixedIterationsRaw)
    ? Math.max(1, Math.floor(fixedIterationsRaw))
    : undefined
  const overflowMaxRaw = Number(policy.overflow?.maxOverflow)
  const overflowMax = Number.isFinite(overflowMaxRaw) ? Math.max(0, Math.floor(overflowMaxRaw)) : fallback.overflow.maxOverflow

  return {
    termination: {
      mode: policy.termination?.mode === 'fixed_iterations' ? 'fixed_iterations' : 'until_empty',
      maxIterations: terminationMax,
      minIterations: Math.min(terminationMin, terminationMax),
      ...(fixedIterations ? { fixedIterations } : {})
    },
    overflow: {
      policy: policy.overflow?.policy === 'terminate_segment' ? 'terminate_segment' : 'ignore',
      maxOverflow: overflowMax
    },
    convergence: {
      strategy: policy.convergence?.strategy ?? fallback.convergence.strategy,
      checkInterval: Math.max(1, Math.floor(policy.convergence?.checkInterval ?? fallback.convergence.checkInterval)),
      maxNoProgressChecks: Math.max(
        1,
        Math.floor(policy.convergence?.maxNoProgressChecks ?? fallback.convergence.maxNoProgressChecks)
      )
    }
  }
}

export const evaluateQueueTerminationReason = ({
  policy,
  decision,
  iteration,
  totalOverflow,
  noProgressChecks,
  forceCpuSingleIteration = false
}: {
  policy: HydraQueuePolicy
  decision: HydraQueueDispatchDecision
  iteration: number
  totalOverflow: number
  noProgressChecks: number
  forceCpuSingleIteration?: boolean
}): HydraQueueTerminationReason | null => {
  const completedIterations = Math.max(0, Math.floor(iteration))
  const totalOverflowSafe = Math.max(0, Math.floor(totalOverflow))
  const noProgressSafe = Math.max(0, Math.floor(noProgressChecks))

  if (forceCpuSingleIteration && completedIterations >= 1) return 'compat_cpu_single_iter'
  if (
    policy.overflow.policy === 'terminate_segment' &&
    totalOverflowSafe > Math.max(0, Math.floor(policy.overflow.maxOverflow))
  ) {
    return 'overflow_limit'
  }
  if (
    noProgressSafe >= Math.max(1, Math.floor(policy.convergence.maxNoProgressChecks))
  ) {
    return 'convergence_stalled'
  }
  if (policy.termination.mode === 'fixed_iterations') {
    const fixedIterations = Math.max(1, Math.floor(policy.termination.fixedIterations ?? policy.termination.maxIterations))
    if (completedIterations >= fixedIterations) return 'fixed_iterations'
  }
  if (completedIterations >= Math.max(1, Math.floor(policy.termination.maxIterations))) return 'max_iterations'
  if (!decision.shouldContinue && completedIterations >= Math.max(1, Math.floor(policy.termination.minIterations))) return 'inactive'
  return null
}

export const shouldTerminateQueueLoop = (
  decision: HydraQueueDispatchDecision,
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
