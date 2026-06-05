import type { HydraCompiledPass, HydraDependencyEdgeKind, HydraKernelGraph, HydraKernelResourceSpec, HydraPassVariant, HydraTransformCall } from '../index.js'

export interface HydraExecutionBarrier {
  fromNodeId: string
  toNodeId: string
  reason: HydraDependencyEdgeKind
  resource?: string
}

export interface HydraExecutionStep {
  id: string
  nodeId: string
  signature: string
  variant: HydraPassVariant
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

export interface HydraExecutionPlanValidationIssue {
  type: 'error' | 'warning'
  code: string
  message: string
}

export declare const compileGraph: (
  transforms: HydraTransformCall[],
  options?: {
    maxDynamicUniforms?: number
    graphId?: string
    validate?: boolean
  }
) => HydraExecutionPlan
export declare const createExecutionPlanDebugReport: (plan: HydraExecutionPlan) => string
export declare const validateExecutionPlan: (plan: HydraExecutionPlan) => HydraExecutionPlanValidationIssue[]
export declare const throwOnExecutionPlanErrors: (
  plan: HydraExecutionPlan,
  label?: string
) => void
