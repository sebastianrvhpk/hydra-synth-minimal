import type { HydraCompiledPass } from '../types.js'
import type {
  HydraDependencyEdge,
  HydraKernelGraph,
  HydraKernelNode,
  HydraKernelResourceSpec
} from '../ir/types.js'
import type { HydraPrimitiveKind } from '../primitives/types.js'

export interface HydraExecutionVariantCandidate {
  variant: 'generic' | 'tiled' | 'subgroup'
  signature: string
  legal: boolean
  reason?: string
}

export interface HydraExecutionBarrier {
  fromNodeId: string
  toNodeId: string
  reason: HydraDependencyEdge['kind']
  resource?: string
}

export interface HydraExecutionPrimitiveSelection {
  kind: HydraPrimitiveKind
  descriptorId: string
  wgslModuleId: string
  entryPoint: string
  substituted: boolean
  note?: string
}

export interface HydraExecutionStep {
  id: string
  nodeId: string
  signature: string
  dispatchDomain: HydraKernelNode['schedule']['dispatchDomain']
  variant: 'generic' | 'tiled' | 'subgroup'
  variantCandidates: HydraExecutionVariantCandidate[]
  fallbackDepth: number
  primitive?: HydraExecutionPrimitiveSelection
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
    dispatchCost: number
    memoryCost: number
    fallbackRiskCost: number
  }
  selectedVariantPolicy: HydraKernelNode['schedule']['variantPolicy']
  peakTransientBytes: number
  totalPlannedBytes: number
  fallbackRiskRate: number
  selectedVariantCounts: Record<'generic' | 'tiled' | 'subgroup', number>
  primitiveSelectionCounts: Record<string, number>
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
