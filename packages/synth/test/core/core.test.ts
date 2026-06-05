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
} from '../../src/core/index.ts'

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
    expect(planA.resources.every((resource) => resource.slot.length > 0)).toBe(true)
    expect(planA.diagnostics.totalPlannedBytes).toBeGreaterThanOrEqual(planA.diagnostics.peakTransientBytes)
    expect(planA.version).toBe('1.0')
    expect(validateExecutionPlan(planA).some((issue) => issue.type === 'error')).toBe(false)
  })

  it('keeps compute-preferred variant metadata stable across recompiles', () => {
    const registry = new HydraTransformRegistry({ defaultOutput: new NullOutput() })
    const node = registry.generators.osc(8, 0.1, 0).blurX(1.0)
    const plan = compileGraph(node.transforms, {
      graphId: 'variant-stability'
    })

    const step = plan.steps[1]
    if (!step) throw new Error('Expected blur step missing.')
    expect(step.variant).toBe('compute')
    expect(step.compiledPass.fallback?.variant).toBe('fragment')
  })

  it('surfaces compute variant metadata for compute-preferred render passes', () => {
    const registry = new HydraTransformRegistry({ defaultOutput: new NullOutput() })
    const node = registry.generators.osc(8, 0.1, 0).bloomThreshold(0.6, 0.1)
    const plan = compileGraph(node.transforms, {
      graphId: 'compute-variant'
    })

    const step = plan.steps[1]
    if (!step) throw new Error('Expected bloomThreshold step missing.')
    expect(step.variant).toBe('compute')
    expect(step.compiledPass.variant).toBe('compute')
    expect(step.compiledPass.compute?.workgroupSize).toEqual([8, 8])
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
        variant: 'fragment',
        compiledPass: {
          signature: 'sig',
          wgsl: `
@vertex
fn vsMain(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let positions = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(positions[i], 0.0, 1.0);
}

@fragment
fn fsMain() -> @location(0) vec4f {
  return vec4f(0.0);
}
`,
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
        scoreBreakdown: { runCost: 0, memoryCost: 0, barrierCost: 0 },
        peakTransientBytes: 0,
        totalPlannedBytes: 0,
        barrierCount: 0,
        nodeOrder: ['other']
      },
      cacheKey: 'bad'
    }

    const issues = validateExecutionPlan(malformedPlan)
    expect(issues.some((issue) => issue.type === 'error')).toBe(true)
  })

  it('runs pyramid downsample/upsample on CPU helpers', () => {
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
