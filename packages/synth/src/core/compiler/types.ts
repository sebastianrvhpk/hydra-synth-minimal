import type { HydraCompiledPass } from '../types.js'
import type {
  HydraDependencyEdge,
  HydraKernelGraph,
  HydraKernelResourceSpec
} from '../ir/types.js'

export interface HydraExecutionBarrier {
  fromNodeId: string
  toNodeId: string
  reason: HydraDependencyEdge['kind']
  resource?: string
}

export interface HydraExecutionStep {
  id: string
  nodeId: string
  signature: string
  variant: 'fragment'
  compiledPass: HydraCompiledPass
  barriersBefore: HydraExecutionBarrier[]
}

export interface HydraResourceAllocationPlan {
  resourceId: string
  lifetime: HydraKernelResourceSpec['lifetime']
  aliasGroup: string
  slot: string
  interval: {
    start: number
    end: number
  }
  aliasable: boolean
  plannedBytes: number
}

export interface HydraExecutionPlanDiagnostics {
  score: number
  scoreBreakdown: {
    runCost: number
    memoryCost: number
    barrierCost: number
  }
  peakTransientBytes: number
  totalPlannedBytes: number
  barrierCount: number
  nodeOrder: string[]
}

export interface HydraExecutionPlan {
  version?: '1.0'
  executionPolicy?: {
    deterministic: boolean
  }
  id: string
  sourceGraph: HydraKernelGraph
  steps: HydraExecutionStep[]
  barriers: HydraExecutionBarrier[]
  resources: HydraResourceAllocationPlan[]
  diagnostics: HydraExecutionPlanDiagnostics
  cacheKey: string
}
