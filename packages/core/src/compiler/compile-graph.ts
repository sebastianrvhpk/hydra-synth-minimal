import { compileWgslPass } from '../transforms/compile-wgsl.js'
import { lowerDslToIr, type LowerDslToIrOptions } from '../lowering/dsl-to-ir.js'
import type { HydraTransformCall } from '../types.js'
import {
  buildExecutionBarriers,
  buildExecutionSteps,
  inferAndOrderNodes,
  planResourceAllocations,
  scoreExecutionPlan,
  type HydraPlannerCapabilityProfile
} from './passes.js'
import type { HydraDebugEvent, HydraExecutionPlan } from './types.js'
import { applyPrimitiveSubstitutions } from './primitive-substitution.js'
import { throwOnExecutionPlanErrors, validateExecutionPlan } from './validate-plan.js'

export interface CompileGraphOptions extends LowerDslToIrOptions {
  capabilityProfileKey?: string
  selectedVariantPolicy?: 'compat' | 'balanced' | 'aggressive'
  primitiveSubstitution?: boolean
  shouldValidatePlan?: boolean
  onDebug?: (event: HydraDebugEvent) => void
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

export const compileGraph = (
  transforms: HydraTransformCall[],
  {
    maxDynamicUniforms = 256,
    graphId = 'hydra-dsl-graph',
    validate = true,
    capabilityProfileKey = 'default-profile',
    selectedVariantPolicy = 'compat',
    capabilityProfile = {},
    primitiveSubstitution = true,
    shouldValidatePlan = true,
    onDebug
  }: CompileGraphOptions = {}
): HydraExecutionPlan => {
  const graph = lowerDslToIr(transforms, { maxDynamicUniforms, graphId, validate })
  const orderedNodes = inferAndOrderNodes(graph)
  const barriers = buildExecutionBarriers(graph.edges, orderedNodes.map((node) => node.id))
  const resolvedCapabilityProfile: HydraPlannerCapabilityProfile = {
    supportedFeatures: capabilityProfile.supportedFeatures ?? [],
    hasSubgroups: capabilityProfile.hasSubgroups ?? false,
    maxWorkgroupStorageBytes: capabilityProfile.maxWorkgroupStorageBytes ?? 0
  }

  const compiledPassByNodeId = new Map<string, ReturnType<typeof compileWgslPass>>()
  orderedNodes.forEach((node) => {
    const compiled = compileWgslPass(node.transforms, maxDynamicUniforms)
    compiledPassByNodeId.set(node.id, compiled)

    if (onDebug) {
      onDebug({
        type: 'shader-generated',
        nodeId: node.id,
        signature: compiled.signature,
        wgsl: compiled.wgsl,
        timestamp: Date.now()
      })
    }
  })
  const primitiveByNodeId = primitiveSubstitution
    ? applyPrimitiveSubstitutions(
      orderedNodes,
      compiledPassByNodeId,
      maxDynamicUniforms
    )
    : new Map()

  const steps = buildExecutionSteps(
    orderedNodes,
    compiledPassByNodeId,
    barriers,
    selectedVariantPolicy,
    resolvedCapabilityProfile,
    primitiveByNodeId
  )
  const resourcePlan = planResourceAllocations(graph, orderedNodes)
  const resources = resourcePlan.allocations
  const diagnostics = scoreExecutionPlan(
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
  const cacheKey = `plan|${hashString(serializedShape)}`

  const plan: HydraExecutionPlan = {
    version: '1.0',
    executionPolicy: {
      deterministic: true
    },
    id: `plan-${hashString(`${graph.id}:${cacheKey}`)}`,
    sourceGraph: graph,
    steps,
    barriers,
    resources,
    diagnostics,
    cacheKey
  }
  if (shouldValidatePlan) {
    const planIssues = validateExecutionPlan(plan)
    throwOnExecutionPlanErrors(planIssues)
  }
  return plan
}

export const createExecutionPlanDebugReport = (plan: HydraExecutionPlan): string => {
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
