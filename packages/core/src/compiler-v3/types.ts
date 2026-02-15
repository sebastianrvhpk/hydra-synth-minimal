import type { HydraCompiledPass } from '../types.js'
import type {
  HydraDependencyEdgeV3,
  HydraKernelGraphV3,
  HydraKernelNodeV3,
  HydraKernelResourceSpecV3
} from '../ir-v3/types.js'
import type { HydraPrimitiveKindV3 } from '../primitives-v3/types.js'

export interface HydraExecutionVariantCandidateV3 {
  variant: 'generic' | 'tiled' | 'subgroup'
  signature: string
  legal: boolean
  reason?: string
}

export interface HydraExecutionBarrierV3 {
  fromNodeId: string
  toNodeId: string
  reason: HydraDependencyEdgeV3['kind']
  resource?: string
}

export interface HydraExecutionPrimitiveSelectionV3 {
  kind: HydraPrimitiveKindV3
  descriptorId: string
  wgslModuleId: string
  entryPoint: string
  substituted: boolean
  note?: string
}

export interface HydraExecutionStepV3 {
  id: string
  nodeId: string
  signature: string
  dispatchDomain: HydraKernelNodeV3['schedule']['dispatchDomain']
  variant: 'generic' | 'tiled' | 'subgroup'
  variantCandidates: HydraExecutionVariantCandidateV3[]
  fallbackDepth: number
  maxIterations?: number
  queueControl?: {
    modeHint: 'cpu' | 'gpu_hybrid'
    convergenceCheckInterval: number
    groupId: string
  }
  primitive?: HydraExecutionPrimitiveSelectionV3
  compiledPass: HydraCompiledPass
  barriersBefore: HydraExecutionBarrierV3[]
}

export interface HydraResourceAllocationPlanV3 {
  resourceId: string
  lifetime: HydraKernelResourceSpecV3['lifetime']
  aliasGroup: string
  slot: string
  interval: {
    start: number
    end: number
  }
  aliasable: boolean
  plannedBytes: number
}

export interface HydraExecutionPlanDiagnosticsV3 {
  score: number
  scoreBreakdown: {
    dispatchCost: number
    memoryCost: number
    fallbackRiskCost: number
  }
  selectedVariantPolicy: HydraKernelNodeV3['schedule']['variantPolicy']
  peakTransientBytes: number
  totalPlannedBytes: number
  fallbackRiskRate: number
  selectedVariantCounts: Record<'generic' | 'tiled' | 'subgroup', number>
  primitiveSelectionCounts: Record<string, number>
  queueStepCount: number
  queueSegmentCount: number
  barrierCount: number
  nodeOrder: string[]
}

export interface HydraExecutionPlanV3 {
  version?: 'v3.0'
  executionPolicy?: {
    queueModeDefault: 'cpu' | 'gpu_hybrid'
    deterministic: boolean
  }
  id: string
  sourceGraph: HydraKernelGraphV3
  steps: HydraExecutionStepV3[]
  barriers: HydraExecutionBarrierV3[]
  resources: HydraResourceAllocationPlanV3[]
  diagnostics: HydraExecutionPlanDiagnosticsV3
  cacheKey: string
}
