import { describe, expect, it } from 'vitest'
import {
  HydraTransformRegistry,
  compileGraph,
  validateExecutionPlan,
  lowerDslToIr,
  dumpKernelGraph,
  validateKernelGraph,
  PRIMITIVE_DESCRIPTORS,
  reduceMeanLumaCpu,
  histogramLumaCpu,
  exclusiveScanU32Cpu,
  compactByPredicateCpu,
  radixSortKeyValueU32Cpu,
  queueAppendConsumeCountCpu,
  scatterToTexture2DCpu,
  gatherFromTexture2DCpu,
  pyramidDownsampleCpu,
  pyramidUpsampleCpu,
  type HydraCompiledPass,
  type HydraOutputAdapter,
  type HydraExecutionPlan
} from '../src/index.ts'

class NullOutput implements HydraOutputAdapter {
  render (_passes: HydraCompiledPass[]): void {}
}

describe('compute core foundation', () => {
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
    const plan = compileGraph(node.transforms, { graphId: 'queue-step-annotation' })
    const queueStep = plan.steps.find((step) => step.dispatchDomain === 'queue1d')
    if (!queueStep) throw new Error('Expected queue step missing.')
    expect(queueStep.queueControl?.modeHint).toBe('gpu_hybrid')
    expect(queueStep.queueControl?.groupId.length).toBeGreaterThan(0)
    expect(queueStep.maxIterations).toBeGreaterThan(0)
    expect(queueStep.queueControl?.policy.termination.maxIterations).toBe(queueStep.maxIterations)
    expect(queueStep.queueControl?.policy.convergence.checkInterval).toBe(queueStep.queueControl?.convergenceCheckInterval)
    expect(plan.diagnostics.queueStepCount).toBeGreaterThanOrEqual(1)
    expect(plan.diagnostics.queueSegmentCount).toBeGreaterThanOrEqual(1)
  })

  it('supports resolution-independent index-first linear kernels', () => {
    const registry = new HydraTransformRegistry({ defaultOutput: new NullOutput() })
    registry.registerTransform({
      name: 'indexFirstKernel',
      type: 'kernel',
      executionDomain: 'linear1d',
      kernelSemantics: 'index_first',
      dispatchItems: 32,
      writesOutput: false,
      resources: [{
        type: 'storageBuffer',
        name: 'dataBuffer',
        access: 'read_write',
        elementType: 'vec4f',
        minLength: 32,
        lifetime: 'persistent',
        stateKey: 'index-first-kernel'
      }],
      wgsl: `
  let index = hydraLinearIndex();
  let coord = hydraLinearCoord();
  dataBuffer[index] = vec4f(f32(coord.x), f32(coord.y), 0.0, 1.0);
  return vec4f(0.0);
`
    })

    const node = registry.generators.solid(0, 0, 0, 1).indexFirstKernel()
    const pass = node.wgsl()[1]
    if (!pass) throw new Error('Expected linear pass missing.')

    expect(pass.dispatch?.domain).toBe('linear1d')
    expect(pass.wgsl).toContain('fn hydraLinearCoord() -> vec2u')
    expect(pass.wgsl).toContain('var st = hydraLinearUv();')
    expect(pass.wgsl.includes('/ max(f32(32), 1.0)')).toBe(false)
  })

  it('preserves compat UV kernels while allowing index-first semantics', () => {
    const registry = new HydraTransformRegistry({ defaultOutput: new NullOutput() })
    const compatPass = registry.generators.solid(0, 0, 0, 1).bufferFill([0, 0, 0, 0]).wgsl()[1]
    const indexPass = registry.generators.solid(0, 0, 0, 1).bufferIndexProbe().wgsl()[1]
    if (!compatPass || !indexPass) throw new Error('Expected linear passes are missing.')

    expect(compatPass.wgsl).toContain('var st = vec2f((f32(linearIndex) + 0.5) / max(f32(4096), 1.0), 0.5);')
    expect(indexPass.wgsl).toContain('var st = hydraLinearUv();')
    expect(indexPass.wgsl).toContain('hydraUvFromLinearCoord')
  })

  it('marks analysis passes as reduction IR with explicit resource intent', () => {
    const registry = new HydraTransformRegistry({ defaultOutput: new NullOutput() })
    const passes = registry.generators.solid(1, 0, 0, 1).lumaProbe(1.0).wgsl()
    const probePass = passes[passes.length - 1]
    if (!probePass?.ir) throw new Error('Expected analysis pass IR missing.')

    expect(probePass.ir.kind).toBe('reduction')
    const outputIntent = probePass.ir.resources.find((resource) => resource.kind === 'outputTexture')?.intent
    expect(outputIntent).toBe('output')
    const uniformIntents = probePass.ir.resources
      .filter((resource) => resource.kind === 'uniform')
      .map((resource) => resource.intent)
    expect(uniformIntents.every((intent) => intent === 'input')).toBe(true)
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

    const issues = validateExecutionPlan(malformedPlan)
    expect(issues.some((issue) => issue.type === 'error')).toBe(true)
    expect(issues.some((issue) => issue.code === 'QUEUE_STEP_MAX_ITERATIONS_INVALID')).toBe(true)
  })

  it('rejects unresolved and duplicate resource slot mappings', () => {
    const unresolvedPlan: HydraExecutionPlan = {
      version: '1.0',
      id: 'unresolved-slot-plan',
      sourceGraph: {
        id: 'g',
        source: 'hydra-dsl',
        compatibilityMode: 'dsl-v2',
        nodes: [],
        resources: [{
          id: 'virtual:missing',
          kind: 'Buffer',
          access: 'read_write',
          lifetime: 'transient',
          shape: { minLength: 64 }
        }],
        edges: []
      },
      steps: [],
      barriers: [],
      resources: [],
      diagnostics: {
        score: 0,
        scoreBreakdown: { dispatchCost: 0, memoryCost: 0, fallbackRiskCost: 0 },
        selectedVariantPolicy: 'compat',
        peakTransientBytes: 0,
        totalPlannedBytes: 0,
        fallbackRiskRate: 0,
        selectedVariantCounts: { generic: 0, tiled: 0, subgroup: 0 },
        primitiveSelectionCounts: {},
        queueStepCount: 0,
        queueSegmentCount: 0,
        barrierCount: 0,
        nodeOrder: []
      },
      cacheKey: 'unresolved'
    }
    const unresolvedIssues = validateExecutionPlan(unresolvedPlan)
    expect(unresolvedIssues.some((issue) => issue.code === 'RESOURCE_SLOT_UNRESOLVED')).toBe(true)

    const duplicatePlan: HydraExecutionPlan = {
      ...unresolvedPlan,
      id: 'duplicate-slot-plan',
      sourceGraph: {
        ...unresolvedPlan.sourceGraph,
        resources: [{
          id: 'virtual:known',
          kind: 'Buffer',
          access: 'read_write',
          lifetime: 'transient',
          shape: { minLength: 64 }
        }]
      },
      resources: [
        {
          resourceId: 'virtual:known',
          lifetime: 'transient',
          aliasGroup: 'buffer',
          slot: 'slot:a',
          interval: { start: 0, end: 0 },
          aliasable: true,
          plannedBytes: 64
        },
        {
          resourceId: 'virtual:known',
          lifetime: 'transient',
          aliasGroup: 'buffer',
          slot: 'slot:b',
          interval: { start: 1, end: 1 },
          aliasable: true,
          plannedBytes: 64
        },
        {
          resourceId: 'virtual:unknown',
          lifetime: 'transient',
          aliasGroup: 'buffer',
          slot: 'slot:unknown',
          interval: { start: 0, end: 0 },
          aliasable: true,
          plannedBytes: 64
        }
      ],
      cacheKey: 'duplicate'
    }
    const duplicateIssues = validateExecutionPlan(duplicatePlan)
    expect(duplicateIssues.some((issue) => issue.code === 'RESOURCE_SLOT_DUPLICATE')).toBe(true)
    expect(duplicateIssues.some((issue) => issue.code === 'ALLOCATION_RESOURCE_NOT_FOUND')).toBe(true)
  })

  it('rejects non-contiguous queue segment groups in execution plans', () => {
    const queuePolicy = {
      termination: {
        mode: 'until_empty' as const,
        maxIterations: 8,
        minIterations: 1
      },
      overflow: {
        policy: 'ignore' as const,
        maxOverflow: 1024
      },
      convergence: {
        strategy: 'hook_or_queue_counter' as const,
        checkInterval: 1,
        maxNoProgressChecks: 2
      }
    }
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
    const plan: HydraExecutionPlan = {
      version: '1.0',
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
          queueControl: { modeHint: 'gpu_hybrid', convergenceCheckInterval: 1, groupId: 'group-0', policy: queuePolicy },
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
          queueControl: { modeHint: 'gpu_hybrid', convergenceCheckInterval: 1, groupId: 'group-0', policy: queuePolicy },
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

    const issues = validateExecutionPlan(plan)
    expect(issues.some((issue) => issue.code === 'QUEUE_GROUP_NON_CONTIGUOUS')).toBe(true)
  })

  it('rejects invalid queue policy metadata in execution plans', () => {
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
    const plan: HydraExecutionPlan = {
      version: '1.0',
      id: 'queue-policy-invalid',
      sourceGraph: {
        id: 'graph',
        source: 'hydra-dsl',
        compatibilityMode: 'dsl-v2',
        nodes: [{
          id: 'k0',
          kind: 'QueueProducer',
          signature: 'q',
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
            variantPolicy: 'compat',
            maxIterations: 4
          },
          resources: [],
          reads: [],
          writes: [],
          debug: {
            sourceTransformNames: [],
            loweringNotes: [],
            compatibilityFlags: ['dsl-v2-compat']
          }
        }],
        resources: [],
        edges: []
      },
      steps: [{
        id: 's0',
        nodeId: 'k0',
        signature: 'queue-pass',
        dispatchDomain: 'queue1d',
        variant: 'generic',
        variantCandidates: [{ variant: 'generic', signature: 'queue-pass', legal: true }],
        fallbackDepth: 0,
        maxIterations: 4,
        queueControl: {
          modeHint: 'gpu_hybrid',
          convergenceCheckInterval: 1,
          groupId: 'g0',
          policy: {
            termination: { mode: 'fixed_iterations', maxIterations: 2, minIterations: 1, fixedIterations: 5 },
            overflow: { policy: 'terminate_segment', maxOverflow: -1 },
            convergence: { strategy: 'hook_or_queue_counter', checkInterval: 0, maxNoProgressChecks: 0 }
          }
        },
        compiledPass: pass,
        barriersBefore: []
      }],
      barriers: [],
      resources: [],
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
        queueSegmentCount: 1,
        barrierCount: 0,
        nodeOrder: ['k0']
      },
      cacheKey: 'qpi'
    }

    const issues = validateExecutionPlan(plan)
    expect(issues.some((issue) => issue.code === 'QUEUE_POLICY_MAX_ITERATIONS_MISMATCH')).toBe(true)
    expect(issues.some((issue) => issue.code === 'QUEUE_POLICY_FIXED_ITERATIONS_RANGE_INVALID')).toBe(true)
    expect(issues.some((issue) => issue.code === 'QUEUE_POLICY_OVERFLOW_INVALID')).toBe(true)
    expect(issues.some((issue) => issue.code === 'QUEUE_POLICY_CONVERGENCE_INTERVAL_INVALID')).toBe(true)
    expect(issues.some((issue) => issue.code === 'QUEUE_POLICY_NO_PROGRESS_INVALID')).toBe(true)
  })

  it('dumps and validates IR graphs for diagnostics', () => {
    const registry = new HydraTransformRegistry({ defaultOutput: new NullOutput() })
    const node = registry.generators.osc(6, 0.2, 0)
    const graph = lowerDslToIr(node.transforms, { graphId: 'diag-graph' })
    const json = dumpKernelGraph(graph)
    const issues = validateKernelGraph(graph)

    expect(json).toContain('"id": "diag-graph"')
    expect(issues.some((issue) => issue.type === 'error')).toBe(false)
  })

  it('provides primitive registry coverage for core algorithms', () => {
    expect(PRIMITIVE_DESCRIPTORS.length).toBe(10)
    expect(PRIMITIVE_DESCRIPTORS.some((descriptor) => descriptor.kind === 'scan.exclusiveU32')).toBe(true)
    expect(PRIMITIVE_DESCRIPTORS.some((descriptor) => descriptor.kind === 'sort.radixKeyValueU32')).toBe(true)
  })

  it('matches CPU primitive references for baseline operations', () => {
    const pixels = new Float32Array([
      1, 0, 0, 1,
      0, 1, 0, 1
    ])
    const mean = reduceMeanLumaCpu(pixels)
    expect(mean).toBeGreaterThan(0.3)
    expect(mean).toBeLessThan(0.5)

    const hist = histogramLumaCpu(pixels, 256)
    expect(hist.reduce((sum, value) => sum + value, 0)).toBe(2)

    expect(Array.from(exclusiveScanU32Cpu(Uint32Array.from([3, 1, 2])))).toEqual([0, 3, 4])

    const compact = compactByPredicateCpu(Uint32Array.from([0, 5, 0, 8]), (value) => value > 0)
    expect(Array.from(compact.values)).toEqual([5, 8])
    expect(Array.from(compact.indices)).toEqual([1, 3])
    expect(compact.count).toBe(2)

    const sorted = radixSortKeyValueU32Cpu([
      { key: 3, value: 30 },
      { key: 1, value: 10 },
      { key: 3, value: 31 }
    ])
    expect(sorted.map((pair) => pair.key)).toEqual([1, 3, 3])

    const queue = queueAppendConsumeCountCpu(
      { active: Uint32Array.from([1, 2]), count: 2, overflow: 0 },
      Uint32Array.from([3, 4, 5]),
      4
    )
    expect(queue.count).toBe(4)
    expect(queue.overflow).toBe(1)

    const scattered = scatterToTexture2DCpu(2, 2, [{ x: 1, y: 1, value: [0.1, 0.2, 0.3, 1] }])
    const gathered = gatherFromTexture2DCpu(2, 2, scattered, [{ x: 1, y: 1 }])
    const first = gathered[0]
    if (!first) throw new Error('Gather result is empty.')
    expect(first[0]).toBeCloseTo(0.1, 5)
    expect(first[3]).toBeCloseTo(1, 5)

    const downsampled = pyramidDownsampleCpu(2, 2, Float32Array.from([
      1, 0, 0, 1,
      1, 0, 0, 1,
      1, 0, 0, 1,
      1, 0, 0, 1
    ]))
    expect(downsampled.width).toBe(1)
    expect(downsampled.height).toBe(1)
    const upsampled = pyramidUpsampleCpu(1, 1, downsampled.data, 2, 2)
    expect(upsampled.length).toBe(16)
  })
})
