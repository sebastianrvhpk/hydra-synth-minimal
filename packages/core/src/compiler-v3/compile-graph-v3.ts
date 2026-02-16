import { compileWgslPass } from '../transforms/compile-wgsl.js'
import { lowerDslToIrV3, type LowerDslToIrV3Options } from '../lowering/dsl-to-ir-v3.js'
import type { HydraTransformCall } from '../types.js'
import {
  buildExecutionBarriersV3,
  buildExecutionStepsV3,
  inferAndOrderNodesV3,
  planResourceAllocationsV3,
  scoreExecutionPlanV3,
  type HydraPlannerCapabilityProfileV3
} from './passes.js'
import type { HydraExecutionPlanV3, HydraQueuePolicyV3 } from './types.js'
import { applyPrimitiveSubstitutionsV3 } from './primitive-substitution.js'
import { throwOnExecutionPlanV3Errors, validateExecutionPlanV3 } from './validate-plan-v3.js'

export interface CompileGraphV3Options extends LowerDslToIrV3Options {
  capabilityProfileKey?: string
  selectedVariantPolicy?: 'compat' | 'balanced' | 'aggressive'
  capabilityProfile?: Partial<HydraPlannerCapabilityProfileV3>
  primitiveSubstitution?: boolean
  validateExecutionPlan?: boolean
}

const hashString = (value = ''): string => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

const serializePlanShape = (input: {
  nodeSignatures: string[]
  resources: Array<{ id: string, slot: string, aliasGroup: string, bytes: number }>
  variants: Array<'generic' | 'tiled' | 'subgroup'>
  profile: string
  policy: 'compat' | 'balanced' | 'aggressive'
}): string => {
  const data = {
    nodeSignatures: input.nodeSignatures,
    resources: input.resources,
    variants: input.variants,
    profile: input.profile,
    policy: input.policy
  }
  return JSON.stringify(data)
}

const DEFAULT_QUEUE_POLICY_V3: HydraQueuePolicyV3 = {
  termination: {
    mode: 'until_empty',
    maxIterations: 64,
    minIterations: 1
  },
  overflow: {
    policy: 'ignore',
    maxOverflow: 2_147_483_647
  },
  convergence: {
    strategy: 'hook_or_queue_counter',
    checkInterval: 4,
    maxNoProgressChecks: 2
  }
}

export const compileGraphV3 = (
  transforms: HydraTransformCall[],
  {
    maxDynamicUniforms = 256,
    graphId = 'hydra-dsl-graph',
    validate = true,
    capabilityProfileKey = 'default-profile',
    selectedVariantPolicy = 'compat',
    capabilityProfile = {},
    primitiveSubstitution = true,
    validateExecutionPlan = true
  }: CompileGraphV3Options = {}
): HydraExecutionPlanV3 => {
  const graph = lowerDslToIrV3(transforms, { maxDynamicUniforms, graphId, validate })
  const orderedNodes = inferAndOrderNodesV3(graph)
  const barriers = buildExecutionBarriersV3(graph.edges, orderedNodes.map((node) => node.id))
  const resolvedCapabilityProfile: HydraPlannerCapabilityProfileV3 = {
    supportedFeatures: capabilityProfile.supportedFeatures ?? [],
    hasSubgroups: capabilityProfile.hasSubgroups ?? false,
    maxWorkgroupStorageBytes: capabilityProfile.maxWorkgroupStorageBytes ?? 0
  }

  const compiledPassByNodeId = new Map<string, ReturnType<typeof compileWgslPass>>()
  orderedNodes.forEach((node) => {
    compiledPassByNodeId.set(node.id, compileWgslPass(node.transforms, maxDynamicUniforms))
  })
  const primitiveByNodeId = primitiveSubstitution
    ? applyPrimitiveSubstitutionsV3(
      orderedNodes,
      compiledPassByNodeId,
      maxDynamicUniforms
    )
    : new Map()

  const steps = buildExecutionStepsV3(
    orderedNodes,
    compiledPassByNodeId,
    barriers,
    selectedVariantPolicy,
    resolvedCapabilityProfile,
    primitiveByNodeId
  )
  const resourcePlan = planResourceAllocationsV3(graph, orderedNodes)
  const resources = resourcePlan.allocations
  const diagnostics = scoreExecutionPlanV3(
    steps,
    resources,
    selectedVariantPolicy,
    resourcePlan.peakTransientBytes,
    resourcePlan.totalPlannedBytes,
    barriers.length
  )
  const serializedShape = serializePlanShape({
    nodeSignatures: steps.map((step) => step.signature),
    resources: resources.map((resource) => ({
      id: resource.resourceId,
      slot: resource.slot,
      aliasGroup: resource.aliasGroup,
      bytes: resource.plannedBytes
    })),
    variants: steps.map((step) => step.variant),
    profile: capabilityProfileKey,
    policy: selectedVariantPolicy
  })
  const cacheKey = `v3|${hashString(serializedShape)}`
  const queuePolicyDefault = steps.find((step) => step.dispatchDomain === 'queue1d')?.queueControl?.policy ?? DEFAULT_QUEUE_POLICY_V3

  const plan: HydraExecutionPlanV3 = {
    version: 'v3.0',
    executionPolicy: {
      queueModeDefault: 'gpu_hybrid',
      deterministic: true,
      queuePolicyDefault
    },
    id: `plan-${hashString(`${graph.id}:${cacheKey}`)}`,
    sourceGraph: graph,
    steps,
    barriers,
    resources,
    diagnostics,
    cacheKey
  }
  if (validateExecutionPlan) {
    const planIssues = validateExecutionPlanV3(plan)
    throwOnExecutionPlanV3Errors(planIssues)
  }
  return plan
}

export const createExecutionPlanDebugReportV3 = (plan: HydraExecutionPlanV3): string => {
  const report = {
    id: plan.id,
    cacheKey: plan.cacheKey,
    steps: plan.steps.map((step) => ({
      id: step.id,
      nodeId: step.nodeId,
      signature: step.signature,
      dispatchDomain: step.dispatchDomain,
      variant: step.variant,
      fallbackDepth: step.fallbackDepth,
      queueControl: step.queueControl,
      primitive: step.primitive,
      variantCandidates: step.variantCandidates,
      barriersBefore: step.barriersBefore.length
    })),
    resources: plan.resources.map((resource) => ({
      ...resource,
      interval: `${resource.interval.start}:${resource.interval.end}`
    })),
    diagnostics: plan.diagnostics
  }
  return JSON.stringify(report, null, 2)
}
