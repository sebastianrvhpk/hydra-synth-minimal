import { describe, expect, it } from 'vitest'
import {
  HydraTransformRegistry,
  compileGraph,
  validateExecutionPlan,
  lowerDslToIr,
  pyramidDownsampleCpu,
  pyramidUpsampleCpu,
  type HydraCompiledPass,
  type HydraOutputAdapter,
  type HydraExecutionPlan
} from '../src/index.ts'

class NullOutput implements HydraOutputAdapter {
  render (_passes: HydraCompiledPass[]): void {}
}

describe('core foundation', () => {
  it('lowers unchanged DSL chains into deterministic IR graphs', () => {
    const registry = new HydraTransformRegistry({ defaultOutput: new NullOutput() })
    const node = registry.generators.osc(8, 0.1, 0).rotate(0.2).modulate(registry.generators.noise(3, 0.1))

    const graphA = lowerDslToIr(node.transforms, { graphId: 'dsl-chain' })
    const graphB = lowerDslToIr(node.transforms, { graphId: 'dsl-chain' })

    expect(graphA.nodes.length).toBeGreaterThan(0)
    expect(graphA.edges.length).toBeGreaterThanOrEqual(0)
    expect(graphA.compatibilityMode).toBe('dsl-v2')
    expect(graphA).toEqual(graphB)
  })

  it('compiles IR to execution plans with stable cache keys', () => {
    const registry = new HydraTransformRegistry({ defaultOutput: new NullOutput() })
    const node = registry.generators
      .osc(10, 0.05, 0.1)
      .blurX(1.0)
      .blurY(1.0)
      .toneMap(1.0, 2.2)

    const planA = compileGraph(node.transforms, { graphId: 'plan-cache' })
    const planB = compileGraph(node.transforms, { graphId: 'plan-cache' })

    expect(planA.steps.length).toBeGreaterThan(1)
    expect(planA.cacheKey).toBe(planB.cacheKey)
    expect(planA.diagnostics.nodeOrder.length).toBe(planA.steps.length)
    expect(planA.steps.every((step) => step.variantCandidates.length > 0)).toBe(true)
    expect(planA.resources.every((resource) => resource.slot.length > 0)).toBe(true)
    expect(planA.diagnostics.totalPlannedBytes).toBeGreaterThanOrEqual(planA.diagnostics.peakTransientBytes)
    expect(planA.version).toBe('1.0')
    expect(validateExecutionPlan(planA).some((issue) => issue.type === 'error')).toBe(false)
  })

  it('substitutes known primitive patterns and preserves fallback chains', () => {
    const registry = new HydraTransformRegistry({ defaultOutput: new NullOutput() })
    const node = registry.generators
      .osc(8, 0.1, 0)
      .bloomThreshold(0.6, 0.1)
      .bloomDownsample(1.0)
      .bloomUpsample(1.0, 1.2)

    const plan = compileGraph(node.transforms, { graphId: 'primitive-substitute' })
    const primitiveSteps = plan.steps.filter((step) => step.primitive?.substituted)

    expect(primitiveSteps.length).toBeGreaterThanOrEqual(2)
    expect(primitiveSteps.some((step) => step.primitive?.kind === 'pyramid.downsample')).toBe(true)
    expect(primitiveSteps.some((step) => step.primitive?.kind === 'pyramid.upsample')).toBe(true)
    primitiveSteps.forEach((step) => {
      expect(step.compiledPass.fallbackPass).toBeDefined()
    })
    expect((plan.diagnostics.primitiveSelectionCounts['pyramid.downsample'] ?? 0) >= 1).toBe(true)
  })

  it('selects legal fallback variants when capability profile blocks subgroup execution', () => {
    const registry = new HydraTransformRegistry({ defaultOutput: new NullOutput() })
    const node = registry.generators.osc(8, 0.1, 0).blurSubgroupX(1.0)
    const plan = compileGraph(node.transforms, {
      graphId: 'capability-fallback',
      selectedVariantPolicy: 'aggressive',
      capabilityProfile: {
        supportedFeatures: [],
        hasSubgroups: false,
        maxWorkgroupStorageBytes: 16384
      }
    })

    const step = plan.steps[1]
    if (!step) throw new Error('Expected blur step missing.')
    expect(step.variant).not.toBe('subgroup')
    expect(step.variantCandidates.some((candidate) => candidate.variant === 'subgroup' && candidate.legal === false)).toBe(true)
  })

  it('reports validation errors for malformed execution plans', () => {
    const malformedPlan: HydraExecutionPlan = {
      version: '1.0',
      id: 'bad-plan',
      sourceGraph: {
        id: 'g',
        source: 'hydra-dsl',
        compatibilityMode: 'dsl-v2',
        nodes: [],
        resources: [],
        edges: []
      },
      steps: [{
        id: 's0',
        nodeId: 'missing',
        signature: 'sig',
        dispatchDomain: 'pixel2d',
        variant: 'generic',
        variantCandidates: [{ variant: 'generic', signature: 'sig', legal: true }],
        fallbackDepth: 0,
        compiledPass: {
          signature: 'sig',
          wgsl: '@compute @workgroup_size(1, 1, 1) fn csMain() {}',
          uniforms: [],
          textures: []
        },
        barriersBefore: []
      }],
      barriers: [],
      resources: [{
        resourceId: 'r0',
        lifetime: 'transient',
        aliasGroup: 'a',
        slot: 'slot:a',
        interval: { start: 2, end: 1 },
        aliasable: true,
        plannedBytes: 64
      }],
      diagnostics: {
        score: 0,
        scoreBreakdown: { dispatchCost: 0, memoryCost: 0, fallbackRiskCost: 0 },
        selectedVariantPolicy: 'compat',
        peakTransientBytes: 0,
        totalPlannedBytes: 0,
        fallbackRiskRate: 0,
        selectedVariantCounts: { generic: 1, tiled: 0, subgroup: 0 },
        primitiveSelectionCounts: {},
        barrierCount: 0,
        nodeOrder: ['other']
      },
      cacheKey: 'bad'
    }

    const issues = validateExecutionPlan(malformedPlan)
    expect(issues.some((issue) => issue.type === 'error')).toBe(true)
  })

  it('computes pyramid downsample/upsample on CPU helpers', () => {
    const source = new Float32Array([
      1, 0, 0, 1, 0, 1, 0, 1,
      0, 0, 1, 1, 1, 1, 1, 1
    ])
    const downsampled = pyramidDownsampleCpu(2, 2, source)
    expect(downsampled.width).toBe(1)
    expect(downsampled.height).toBe(1)
    const upsampled = pyramidUpsampleCpu(1, 1, downsampled.data, 2, 2)
    expect(upsampled.length).toBe(16)
  })
})
