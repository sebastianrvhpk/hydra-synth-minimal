import { describe, expect, it } from 'vitest'
import {
  HydraTransformRegistry,
  compileGraphV3,
  validateExecutionPlanV3,
  lowerDslToIrV3,
  dumpKernelGraphV3,
  validateKernelGraphV3,
  PRIMITIVE_DESCRIPTORS_V3,
  reduceMeanLumaCpuV3,
  histogramLumaCpuV3,
  exclusiveScanU32CpuV3,
  compactByPredicateCpuV3,
  radixSortKeyValueU32CpuV3,
  queueAppendConsumeCountCpuV3,
  scatterToTexture2DCpuV3,
  gatherFromTexture2DCpuV3,
  pyramidDownsampleCpuV3,
  pyramidUpsampleCpuV3,
  type HydraCompiledPass,
  type HydraOutputAdapter,
  type HydraExecutionPlanV3
} from '../src/index.ts'

class NullOutput implements HydraOutputAdapter {
  render (_passes: HydraCompiledPass[]): void {}
}

describe('v3 compute core foundation', () => {
  it('lowers unchanged DSL chains into deterministic IR v3 graphs', () => {
    const registry = new HydraTransformRegistry({ defaultOutput: new NullOutput() })
    const node = registry.generators.osc(8, 0.1, 0).rotate(0.2).modulate(registry.generators.noise(3, 0.1))

    const graphA = lowerDslToIrV3(node.transforms, { graphId: 'dsl-chain' })
    const graphB = lowerDslToIrV3(node.transforms, { graphId: 'dsl-chain' })

    expect(graphA.nodes.length).toBeGreaterThan(0)
    expect(graphA.edges.length).toBeGreaterThanOrEqual(0)
    expect(graphA.compatibilityMode).toBe('dsl-v2')
    expect(graphA).toEqual(graphB)
  })

  it('compiles IR v3 to execution plans with stable cache keys', () => {
    const registry = new HydraTransformRegistry({ defaultOutput: new NullOutput() })
    const node = registry.generators
      .osc(10, 0.05, 0.1)
      .blurX(1.0)
      .blurY(1.0)
      .toneMap(1.0, 2.2)

    const planA = compileGraphV3(node.transforms, { graphId: 'plan-cache' })
    const planB = compileGraphV3(node.transforms, { graphId: 'plan-cache' })

    expect(planA.steps.length).toBeGreaterThan(1)
    expect(planA.cacheKey).toBe(planB.cacheKey)
    expect(planA.diagnostics.nodeOrder.length).toBe(planA.steps.length)
    expect(planA.steps.every((step) => step.variantCandidates.length > 0)).toBe(true)
    expect(planA.resources.every((resource) => resource.slot.length > 0)).toBe(true)
    expect(planA.diagnostics.totalPlannedBytes).toBeGreaterThanOrEqual(planA.diagnostics.peakTransientBytes)
    expect(planA.version).toBe('v3.0')
    expect(validateExecutionPlanV3(planA).some((issue) => issue.type === 'error')).toBe(false)
  })

  it('substitutes known primitive patterns and preserves fallback chains', () => {
    const registry = new HydraTransformRegistry({ defaultOutput: new NullOutput() })
    const node = registry.generators
      .osc(8, 0.1, 0)
      .bloomThreshold(0.6, 0.1)
      .bloomDownsample(1.0)
      .bloomUpsample(1.0, 1.2)

    const plan = compileGraphV3(node.transforms, { graphId: 'primitive-substitute' })
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
    const plan = compileGraphV3(node.transforms, {
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

  it('annotates sparse linear kernels as queue work-graph steps', () => {
    const registry = new HydraTransformRegistry({ defaultOutput: new NullOutput() })
    registry.registerTransform({
      name: 'queueStepTest',
      type: 'kernel',
      executionDomain: 'linear1d',
      dispatchItems: 512,
      writesOutput: false,
      sparse: true,
      resources: [{
        type: 'storageBuffer',
        name: 'queueData',
        access: 'read_write',
        elementType: 'u32',
        minLength: 512,
        lifetime: 'persistent',
        stateKey: 'queue-data'
      }],
      wgsl: `
  let index = hydraLinearIndex();
  queueData[index] = queueData[index];
  return vec4f(0.0);
`
    })
    const node = registry.generators.solid(0, 0, 0, 1).queueStepTest()
    const plan = compileGraphV3(node.transforms, { graphId: 'queue-step-annotation' })
    const queueStep = plan.steps.find((step) => step.dispatchDomain === 'queue1d')
    if (!queueStep) throw new Error('Expected queue step missing.')
    expect(queueStep.queueControl?.modeHint).toBe('gpu_hybrid')
    expect(queueStep.queueControl?.groupId.length).toBeGreaterThan(0)
    expect(queueStep.maxIterations).toBeGreaterThan(0)
    expect(plan.diagnostics.queueStepCount).toBeGreaterThanOrEqual(1)
    expect(plan.diagnostics.queueSegmentCount).toBeGreaterThanOrEqual(1)
  })

  it('reports validation errors for malformed execution plans', () => {
    const malformedPlan: HydraExecutionPlanV3 = {
      version: 'v3.0',
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
        dispatchDomain: 'queue1d',
        variant: 'generic',
        variantCandidates: [{ variant: 'generic', signature: 'sig', legal: true }],
        fallbackDepth: 0,
        maxIterations: 0,
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
        queueStepCount: 1,
        queueSegmentCount: 0,
        barrierCount: 0,
        nodeOrder: ['other']
      },
      cacheKey: 'bad'
    }

    const issues = validateExecutionPlanV3(malformedPlan)
    expect(issues.some((issue) => issue.type === 'error')).toBe(true)
    expect(issues.some((issue) => issue.code === 'QUEUE_STEP_MAX_ITERATIONS_INVALID')).toBe(true)
  })

  it('rejects non-contiguous queue segment groups in execution plans', () => {
    const pass: HydraCompiledPass = {
      signature: 'queue-pass',
      wgsl: '@compute @workgroup_size(1, 1, 1) fn csMain() {}',
      uniforms: [],
      textures: [],
      dispatch: {
        mode: 'direct',
        domain: 'linear1d',
        workgroupSize: [64, 1, 1],
        itemCount: 64
      }
    }
    const plan: HydraExecutionPlanV3 = {
      version: 'v3.0',
      id: 'queue-groups',
      sourceGraph: {
        id: 'graph',
        source: 'hydra-dsl',
        compatibilityMode: 'dsl-v2',
        nodes: [
          {
            id: 'k0',
            kind: 'QueueProducer',
            signature: 'a',
            transforms: [],
            uniforms: [],
            textures: [],
            storageBuffers: [],
            storageTextures: [],
            schedule: {
              resolutionScale: 1,
              updateRate: 'everyFrame',
              sparse: true,
              dispatchDomain: 'queue1d',
              variantPolicy: 'compat'
            },
            resources: [],
            reads: [],
            writes: [],
            debug: {
              sourceTransformNames: [],
              loweringNotes: [],
              compatibilityFlags: ['dsl-v2-compat']
            }
          },
          {
            id: 'k1',
            kind: 'ImageKernel',
            signature: 'b',
            transforms: [],
            uniforms: [],
            textures: [],
            storageBuffers: [],
            storageTextures: [],
            schedule: {
              resolutionScale: 1,
              updateRate: 'everyFrame',
              sparse: false,
              dispatchDomain: 'pixel2d',
              variantPolicy: 'compat'
            },
            resources: [],
            reads: [],
            writes: [],
            debug: {
              sourceTransformNames: [],
              loweringNotes: [],
              compatibilityFlags: ['dsl-v2-compat']
            }
          },
          {
            id: 'k2',
            kind: 'QueueConsumer',
            signature: 'c',
            transforms: [],
            uniforms: [],
            textures: [],
            storageBuffers: [],
            storageTextures: [],
            schedule: {
              resolutionScale: 1,
              updateRate: 'everyFrame',
              sparse: true,
              dispatchDomain: 'queue1d',
              variantPolicy: 'compat'
            },
            resources: [],
            reads: [],
            writes: [],
            debug: {
              sourceTransformNames: [],
              loweringNotes: [],
              compatibilityFlags: ['dsl-v2-compat']
            }
          }
        ],
        resources: [],
        edges: []
      },
      steps: [
        {
          id: 's0',
          nodeId: 'k0',
          signature: 'queue-a',
          dispatchDomain: 'queue1d',
          variant: 'generic',
          variantCandidates: [{ variant: 'generic', signature: 'queue-a', legal: true }],
          fallbackDepth: 0,
          maxIterations: 8,
          queueControl: { modeHint: 'gpu_hybrid', convergenceCheckInterval: 1, groupId: 'group-0' },
          compiledPass: pass,
          barriersBefore: []
        },
        {
          id: 's1',
          nodeId: 'k1',
          signature: 'pixel',
          dispatchDomain: 'pixel2d',
          variant: 'generic',
          variantCandidates: [{ variant: 'generic', signature: 'pixel', legal: true }],
          fallbackDepth: 0,
          compiledPass: {
            signature: 'pixel',
            wgsl: '@compute @workgroup_size(1, 1, 1) fn csMain() {}',
            uniforms: [],
            textures: []
          },
          barriersBefore: []
        },
        {
          id: 's2',
          nodeId: 'k2',
          signature: 'queue-b',
          dispatchDomain: 'queue1d',
          variant: 'generic',
          variantCandidates: [{ variant: 'generic', signature: 'queue-b', legal: true }],
          fallbackDepth: 0,
          maxIterations: 8,
          queueControl: { modeHint: 'gpu_hybrid', convergenceCheckInterval: 1, groupId: 'group-0' },
          compiledPass: pass,
          barriersBefore: []
        }
      ],
      barriers: [],
      resources: [],
      diagnostics: {
        score: 0,
        scoreBreakdown: { dispatchCost: 0, memoryCost: 0, fallbackRiskCost: 0 },
        selectedVariantPolicy: 'compat',
        peakTransientBytes: 0,
        totalPlannedBytes: 0,
        fallbackRiskRate: 0,
        selectedVariantCounts: { generic: 3, tiled: 0, subgroup: 0 },
        primitiveSelectionCounts: {},
        queueStepCount: 2,
        queueSegmentCount: 1,
        barrierCount: 0,
        nodeOrder: ['k0', 'k1', 'k2']
      },
      cacheKey: 'queue-groups'
    }

    const issues = validateExecutionPlanV3(plan)
    expect(issues.some((issue) => issue.code === 'QUEUE_GROUP_NON_CONTIGUOUS')).toBe(true)
  })

  it('dumps and validates IR graphs for diagnostics', () => {
    const registry = new HydraTransformRegistry({ defaultOutput: new NullOutput() })
    const node = registry.generators.osc(6, 0.2, 0)
    const graph = lowerDslToIrV3(node.transforms, { graphId: 'diag-graph' })
    const json = dumpKernelGraphV3(graph)
    const issues = validateKernelGraphV3(graph)

    expect(json).toContain('"id": "diag-graph"')
    expect(issues.some((issue) => issue.type === 'error')).toBe(false)
  })

  it('provides primitive registry coverage for v3 core algorithms', () => {
    expect(PRIMITIVE_DESCRIPTORS_V3.length).toBe(10)
    expect(PRIMITIVE_DESCRIPTORS_V3.some((descriptor) => descriptor.kind === 'scan.exclusiveU32')).toBe(true)
    expect(PRIMITIVE_DESCRIPTORS_V3.some((descriptor) => descriptor.kind === 'sort.radixKeyValueU32')).toBe(true)
  })

  it('matches CPU primitive references for baseline operations', () => {
    const pixels = new Float32Array([
      1, 0, 0, 1,
      0, 1, 0, 1
    ])
    const mean = reduceMeanLumaCpuV3(pixels)
    expect(mean).toBeGreaterThan(0.3)
    expect(mean).toBeLessThan(0.5)

    const hist = histogramLumaCpuV3(pixels, 256)
    expect(hist.reduce((sum, value) => sum + value, 0)).toBe(2)

    expect(Array.from(exclusiveScanU32CpuV3(Uint32Array.from([3, 1, 2])))).toEqual([0, 3, 4])

    const compact = compactByPredicateCpuV3(Uint32Array.from([0, 5, 0, 8]), (value) => value > 0)
    expect(Array.from(compact.values)).toEqual([5, 8])
    expect(Array.from(compact.indices)).toEqual([1, 3])
    expect(compact.count).toBe(2)

    const sorted = radixSortKeyValueU32CpuV3([
      { key: 3, value: 30 },
      { key: 1, value: 10 },
      { key: 3, value: 31 }
    ])
    expect(sorted.map((pair) => pair.key)).toEqual([1, 3, 3])

    const queue = queueAppendConsumeCountCpuV3(
      { active: Uint32Array.from([1, 2]), count: 2, overflow: 0 },
      Uint32Array.from([3, 4, 5]),
      4
    )
    expect(queue.count).toBe(4)
    expect(queue.overflow).toBe(1)

    const scattered = scatterToTexture2DCpuV3(2, 2, [{ x: 1, y: 1, value: [0.1, 0.2, 0.3, 1] }])
    const gathered = gatherFromTexture2DCpuV3(2, 2, scattered, [{ x: 1, y: 1 }])
    const first = gathered[0]
    if (!first) throw new Error('Gather result is empty.')
    expect(first[0]).toBeCloseTo(0.1, 5)
    expect(first[3]).toBeCloseTo(1, 5)

    const downsampled = pyramidDownsampleCpuV3(2, 2, Float32Array.from([
      1, 0, 0, 1,
      1, 0, 0, 1,
      1, 0, 0, 1,
      1, 0, 0, 1
    ]))
    expect(downsampled.width).toBe(1)
    expect(downsampled.height).toBe(1)
    const upsampled = pyramidUpsampleCpuV3(1, 1, downsampled.data, 2, 2)
    expect(upsampled.length).toBe(16)
  })
})
