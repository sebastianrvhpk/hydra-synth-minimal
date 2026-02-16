import { describe, expect, it } from 'vitest'
import type { HydraExecutionPlanV3, HydraFrameState } from 'hydra-synth-core'
import { BENCHMARK_CORPUS_V3 } from '../src/benchmark/corpus.ts'
import { buildBenchmarkReportV3, validateBenchmarkReportV3 } from '../src/benchmark/runner.ts'
import { HydraAutotunerV3 } from '../src/runtime/autotune-v3.ts'
import { HydraExecutorV3 } from '../src/runtime/executor-v3.ts'
import { buildProfilerSnapshotV3 } from '../src/runtime/profiler-v3.ts'
import { decideQueueDispatchV3 } from '../src/runtime/queue-v3.ts'
import { HydraBrowserRuntime, normalizeRuntimeExecutionMode } from '../src/runtime/runtime.ts'

const createMinimalExecutionPlan = (): HydraExecutionPlanV3 => ({
  version: 'v3.0',
  id: 'plan-minimal',
  sourceGraph: {
    id: 'graph-minimal',
    source: 'hydra-dsl',
    compatibilityMode: 'dsl-v2',
    nodes: [],
    resources: [],
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
  cacheKey: 'minimal'
})

const createRuntimeHarness = (executionMode?: 'legacy' | 'v3' | 'auto'): HydraBrowserRuntime => {
  const canvas = { width: 4, height: 4 } as HTMLCanvasElement
  const host = {
    canvas,
    start: () => {},
    stop: () => {},
    setResolution: (width: number, height: number) => {
      canvas.width = width
      canvas.height = height
    },
    dispose: () => {}
  }
  const renderer = {
    ready: false,
    init: async () => {},
    beginFrame: () => null,
    renderFrame: () => {},
    submitFrame: () => {},
    setResolution: () => {},
    dispose: () => {},
    getCapabilities: () => null
  }

  return new HydraBrowserRuntime({
    host: host as never,
    renderer: renderer as never,
    autoLoop: false,
    ...(executionMode ? { executionMode } : {})
  })
}

describe('v3 browser foundation', () => {
  it('builds and validates benchmark reports from sample streams', () => {
    const scene = BENCHMARK_CORPUS_V3[0]
    if (!scene) throw new Error('Benchmark corpus is empty.')
    const report = buildBenchmarkReportV3({
      sceneId: scene.id,
      samples: [
        { frameMs: 10, cpuEncodeMs: 1.2, dispatchCount: 12, fallbackCount: 0, residentBytes: 1024 },
        { frameMs: 11, cpuEncodeMs: 1.1, dispatchCount: 12, fallbackCount: 0, residentBytes: 2048 },
        { frameMs: 9, cpuEncodeMs: 1.0, dispatchCount: 12, fallbackCount: 1, residentBytes: 3072 }
      ],
      capabilities: null
    })

    expect(report.frameCount).toBe(3)
    expect(report.p95FrameMs).toBeGreaterThan(0)
    const validation = validateBenchmarkReportV3(report)
    expect(validation.ok).toBe(true)
  })

  it('validates acceptance gates across the full benchmark corpus', () => {
    BENCHMARK_CORPUS_V3.forEach((scene) => {
      const report = buildBenchmarkReportV3({
        sceneId: scene.id,
        samples: [
          { frameMs: Math.max(1, (scene.acceptance.maxAvgFrameMs ?? 16) * 0.75), cpuEncodeMs: 1.0, dispatchCount: 10, fallbackCount: 0, residentBytes: 2048 },
          { frameMs: Math.max(1, (scene.acceptance.maxAvgFrameMs ?? 16) * 0.85), cpuEncodeMs: 1.2, dispatchCount: 10, fallbackCount: 0, residentBytes: 4096 },
          { frameMs: Math.max(1, (scene.acceptance.maxAvgFrameMs ?? 16) * 0.95), cpuEncodeMs: 1.1, dispatchCount: 10, fallbackCount: 0, residentBytes: 8192 }
        ],
        capabilities: null
      })
      const validation = validateBenchmarkReportV3(report)
      expect(validation.ok).toBe(true)
    })
  })

  it('reports benchmark gate regressions when thresholds are exceeded', () => {
    const scene = BENCHMARK_CORPUS_V3[0]
    if (!scene) throw new Error('Benchmark corpus is empty.')
    const report = buildBenchmarkReportV3({
      sceneId: scene.id,
      samples: [
        { frameMs: (scene.acceptance.maxP95FrameMs ?? 20) * 1.5, dispatchCount: 10, fallbackCount: 2, residentBytes: 1024 }
      ],
      capabilities: null
    })
    const validation = validateBenchmarkReportV3(report)
    expect(validation.ok).toBe(false)
    expect(validation.failures.length).toBeGreaterThan(0)
  })

  it('provides queue dispatch decisions with overflow diagnostics', () => {
    const decision = decideQueueDispatchV3({
      activeCount: 130,
      capacity: 100,
      iteration: 1,
      maxIterations: 8,
      workgroupSizeX: 64
    })
    expect(decision.shouldContinue).toBe(true)
    expect(decision.dispatchX).toBe(2)
    expect(decision.diagnostics.overflowCount).toBe(30)
  })

  it('captures profiler snapshots from output pass stats', () => {
    const outputA = {
      getPassStats: () => ({
        passA: { dispatchCount: 4, avgCpuEncodeMs: 1.5, lastCpuEncodeMs: 2.0, fallbackCount: 1, variant: 'subgroup' as const }
      })
    }
    const outputB = {
      getPassStats: () => ({
        passB: { dispatchCount: 2, avgCpuEncodeMs: 0.8, lastCpuEncodeMs: 1.1, fallbackCount: 0, variant: 'generic' as const }
      })
    }
    const snapshot = buildProfilerSnapshotV3({
      frameTimesMs: [16, 17, 15],
      outputs: [outputA, outputB] as never,
      capabilities: null,
      residentBytesEstimate: 4096
    })
    expect(snapshot.frameWindow.frameCount).toBe(3)
    expect(Object.keys(snapshot.passes).length).toBe(2)
    expect(snapshot.resources.residentBytesEstimate).toBe(4096)
    expect(snapshot.scheduler.fallbackRate).toBeCloseTo(1 / 6, 5)
    expect(snapshot.scheduler.queueIterations).toBe(0)
    expect(snapshot.scheduler.queueConvergenceChecks).toBe(0)
    expect(snapshot.scheduler.routingConfiguredMode).toBe('legacy')
    expect(snapshot.scheduler.routingActiveMode).toBe('legacy')
    expect(snapshot.scheduler.routingCompileFailures).toBe(0)
    expect(snapshot.scheduler.routingFallbackCount).toBe(0)
    expect(snapshot.passes['o0:passA']?.dispatchDomain).toBe('pixel2d')
  })

  it('normalizes runtime execution mode values and defaults', () => {
    expect(normalizeRuntimeExecutionMode('legacy')).toBe('legacy')
    expect(normalizeRuntimeExecutionMode('V3')).toBe('v3')
    expect(normalizeRuntimeExecutionMode(' auto ')).toBe('auto')
    expect(normalizeRuntimeExecutionMode('invalid')).toBe('legacy')
    expect(normalizeRuntimeExecutionMode('invalid', 'auto')).toBe('auto')
  })

  it('defaults browser runtime execution mode to legacy', () => {
    const runtime = createRuntimeHarness()
    expect(runtime.getExecutionMode()).toBe('legacy')
    runtime.dispose()
  })

  it('routes graph rendering through v3 mode and reports active mode diagnostics', () => {
    const runtime = createRuntimeHarness('v3')
    const executeCalls: HydraExecutionPlanV3[] = []
    ;(runtime as unknown as {
      executorV3: {
        executePlan: (output: unknown, plan: HydraExecutionPlanV3) => {
          submittedPasses: number
          scheduledBarriers: number
          queueIterations: number
          queueOverflowCount: number
          queueIndirectDispatches: number
          queueConvergenceChecks: number
          allocatedResourceCount: number
        }
        getResidentByteEstimate: () => number
        getResidencySnapshot: () => null
        dispose: () => void
      }
    }).executorV3 = {
      executePlan: (_output, plan) => {
        executeCalls.push(plan)
        return {
          submittedPasses: 0,
          scheduledBarriers: 0,
          queueIterations: 0,
          queueOverflowCount: 0,
          queueIndirectDispatches: 0,
          queueConvergenceChecks: 0,
          allocatedResourceCount: 0
        }
      },
      getResidentByteEstimate: () => 0,
      getResidencySnapshot: () => null,
      dispose: () => {}
    }

    const output = runtime.outputs[0]
    if (!output) throw new Error('Missing runtime output.')
    output.renderGraph({
      transforms: [],
      compileLegacyPasses: () => [],
      compilePlanV3: () => createMinimalExecutionPlan()
    })

    const snapshot = runtime.getProfilerSnapshot()
    expect(executeCalls).toHaveLength(1)
    expect(snapshot.scheduler.routingConfiguredMode).toBe('v3')
    expect(snapshot.scheduler.routingActiveMode).toBe('v3')
    expect(snapshot.scheduler.routingCompileFailures).toBe(0)
    expect(snapshot.scheduler.routingFallbackCount).toBe(0)
    runtime.dispose()
  })

  it('falls back to legacy deterministically when v3 plan compilation fails', () => {
    const runtime = createRuntimeHarness('v3')
    const output = runtime.outputs[0]
    if (!output) throw new Error('Missing runtime output.')
    output.renderGraph({
      transforms: [],
      compileLegacyPasses: () => [{
        signature: 'legacy-fallback',
        wgsl: '@compute @workgroup_size(1, 1, 1) fn csMain() {}',
        uniforms: [],
        textures: []
      }],
      compilePlanV3: () => {
        throw new Error('compile failed')
      }
    })

    const snapshot = runtime.getProfilerSnapshot()
    expect(snapshot.scheduler.routingConfiguredMode).toBe('v3')
    expect(snapshot.scheduler.routingActiveMode).toBe('legacy')
    expect(snapshot.scheduler.routingCompileFailures).toBe(1)
    expect(snapshot.scheduler.routingFallbackCount).toBe(1)
    runtime.dispose()
  })

  it('stores autotune profiles and exposes policy controls', () => {
    const tuner = new HydraAutotunerV3()
    tuner.setPolicy('balanced_research')
    const profile = tuner.run({
      profileKey: 'gpu-a',
      profilerSnapshot: {
        frameWindow: { p95FrameMs: 12 },
        scheduler: { fallbackRate: 0.1 },
        resources: { residentBytesEstimate: 8_000_000 }
      },
      adapterFingerprint: 'adapter-a',
      browserFingerprint: 'browser-a',
      kernelSignature: 'kernel-a',
      resolutionClass: '1920x1080'
    })
    expect(profile.policy).toBe('balanced_research')
    expect(profile.fingerprintKey).toContain('adapter-a')
    expect(profile.candidateCount).toBeGreaterThan(0)
    expect(tuner.getProfile('gpu-a')).not.toBeNull()
    tuner.clear('gpu-a')
    expect(tuner.getProfile('gpu-a')).toBeNull()
  })

  it('injects slot-backed storage resolvers into compiled passes', () => {
    const rendered: Array<{ storageBuffers?: Array<{ getBuffer: (() => unknown) | null }> }> = []
    const output = {
      render: (passes: Array<{ storageBuffers?: Array<{ getBuffer: (() => unknown) | null }> }>) => {
        rendered.push(...passes)
      }
    }
    const createdSlots: string[] = []
    const resourceManager = {
      registerResourceSlot: () => {},
      getOrCreateStorageBuffer: (slot: string) => {
        createdSlots.push(slot)
        return ({ slot } as unknown) as GPUBuffer
      },
      getOrCreateStorageTexture: () => ({}) as GPUTexture,
      getOrCreateIndirectArgsBuffer: () => ({}) as GPUBuffer,
      getOrCreateQueueCounterBuffer: () => ({}) as GPUBuffer,
      writeIndirectArgs: () => {},
      writeQueueCount: () => {},
      getResidentByteEstimate: () => 1024,
      getResidencySnapshot: () => null,
      dispose: () => {}
    }
    const executor = new HydraExecutorV3({ resourceManager: resourceManager as never })

    const storageBinding = {
      name: 'scratch',
      variableName: 'scratchBuffer',
      getBuffer: null,
      access: 'read_write' as const,
      lifetime: 'transient' as const,
      elementType: 'vec4f' as const,
      minLength: 64,
      binding: 3
    }
    const resourceId = 'buffer:binding:scratchBuffer:vec4f:transient'
    const plan: HydraExecutionPlanV3 = {
      version: 'v3.0',
      id: 'slot-resolver-plan',
      sourceGraph: {
        id: 'graph',
        source: 'hydra-dsl',
        compatibilityMode: 'dsl-v2',
        nodes: [],
        resources: [{
          id: resourceId,
          kind: 'Buffer',
          access: 'read_write',
          elementType: 'vec4f',
          lifetime: 'transient',
          shape: { minLength: 64 },
          aliasClass: 'buffer:vec4f',
          externalBinding: 'scratchBuffer'
        }],
        edges: []
      },
      steps: [{
        id: 'step0',
        nodeId: 'k0',
        signature: 'resolver-pass',
        dispatchDomain: 'pixel2d',
        variant: 'generic',
        variantCandidates: [{ variant: 'generic', signature: 'resolver-pass', legal: true }],
        fallbackDepth: 0,
        compiledPass: {
          signature: 'resolver-pass',
          wgsl: '@compute @workgroup_size(1, 1, 1) fn csMain() {}',
          uniforms: [],
          textures: [],
          storageBuffers: [storageBinding]
        },
        barriersBefore: []
      }],
      barriers: [],
      resources: [{
        resourceId,
        lifetime: 'transient',
        aliasGroup: 'buffer:vec4f',
        slot: 'slot:scratch',
        interval: { start: 0, end: 0 },
        aliasable: true,
        plannedBytes: 1024
      }],
      diagnostics: {
        score: 0,
        scoreBreakdown: { dispatchCost: 0, memoryCost: 0, fallbackRiskCost: 0 },
        selectedVariantPolicy: 'compat',
        peakTransientBytes: 1024,
        totalPlannedBytes: 1024,
        fallbackRiskRate: 0,
        selectedVariantCounts: { generic: 1, tiled: 0, subgroup: 0 },
        primitiveSelectionCounts: {},
        queueStepCount: 0,
        queueSegmentCount: 0,
        barrierCount: 0,
        nodeOrder: ['k0']
      },
      cacheKey: 'slot-resolver'
    }

    executor.executePlan(output as never, plan, {
      time: 0,
      bpm: 120,
      resolution: [64, 1],
      deltaMs: 16
    })

    const renderedPass = rendered[0]
    if (!renderedPass) throw new Error('Expected rendered pass.')
    const getBuffer = renderedPass.storageBuffers?.[0]?.getBuffer
    if (!getBuffer) throw new Error('Expected injected getBuffer provider.')
    const resolved = getBuffer() as { slot?: string }
    expect(resolved?.slot).toBe('slot:scratch')
    expect(createdSlots).toContain('slot:scratch')
  })

  it('reuses alias slots while keeping persistent lifetimes distinct', () => {
    const output = { render: (_passes: unknown[]) => {} }
    const allocatedSlots: string[] = []
    const resourceManager = {
      registerResourceSlot: () => {},
      getOrCreateStorageBuffer: (slot: string) => {
        allocatedSlots.push(slot)
        return ({ slot } as unknown) as GPUBuffer
      },
      getOrCreateStorageTexture: () => ({}) as GPUTexture,
      getOrCreateIndirectArgsBuffer: () => ({}) as GPUBuffer,
      getOrCreateQueueCounterBuffer: () => ({}) as GPUBuffer,
      writeIndirectArgs: () => {},
      writeQueueCount: () => {},
      getResidentByteEstimate: () => 0,
      getResidencySnapshot: () => null,
      dispose: () => {}
    }
    const executor = new HydraExecutorV3({ resourceManager: resourceManager as never })
    const plan: HydraExecutionPlanV3 = {
      version: 'v3.0',
      id: 'slot-alias-plan',
      sourceGraph: {
        id: 'graph',
        source: 'hydra-dsl',
        compatibilityMode: 'dsl-v2',
        nodes: [],
        resources: [
          { id: 'virtual:a', kind: 'Buffer', access: 'read_write', lifetime: 'transient', shape: { minLength: 64 } },
          { id: 'virtual:b', kind: 'Buffer', access: 'read_write', lifetime: 'transient', shape: { minLength: 64 } },
          { id: 'virtual:p', kind: 'Buffer', access: 'read_write', lifetime: 'persistent', shape: { minLength: 64 } }
        ],
        edges: []
      },
      steps: [],
      barriers: [],
      resources: [
        {
          resourceId: 'virtual:a',
          lifetime: 'transient',
          aliasGroup: 'buffer:vec4f',
          slot: 'slot:transient:0',
          interval: { start: 0, end: 0 },
          aliasable: true,
          plannedBytes: 256
        },
        {
          resourceId: 'virtual:b',
          lifetime: 'transient',
          aliasGroup: 'buffer:vec4f',
          slot: 'slot:transient:0',
          interval: { start: 1, end: 1 },
          aliasable: true,
          plannedBytes: 256
        },
        {
          resourceId: 'virtual:p',
          lifetime: 'persistent',
          aliasGroup: 'buffer:vec4f',
          slot: 'slot:persistent:0',
          interval: { start: 0, end: 1 },
          aliasable: false,
          plannedBytes: 256
        }
      ],
      diagnostics: {
        score: 0,
        scoreBreakdown: { dispatchCost: 0, memoryCost: 0, fallbackRiskCost: 0 },
        selectedVariantPolicy: 'compat',
        peakTransientBytes: 256,
        totalPlannedBytes: 512,
        fallbackRiskRate: 0,
        selectedVariantCounts: { generic: 0, tiled: 0, subgroup: 0 },
        primitiveSelectionCounts: {},
        queueStepCount: 0,
        queueSegmentCount: 0,
        barrierCount: 0,
        nodeOrder: []
      },
      cacheKey: 'slot-alias'
    }

    const result = executor.executePlan(output as never, plan, {
      time: 0,
      bpm: 120,
      resolution: [64, 1],
      deltaMs: 16
    })

    expect(result.allocatedResourceCount).toBe(2)
    expect(new Set(allocatedSlots)).toEqual(new Set(['slot:transient:0', 'slot:persistent:0']))
  })

  it('does not preallocate external lifetime resources', () => {
    const output = { render: (_passes: unknown[]) => {} }
    let preallocations = 0
    const resourceManager = {
      registerResourceSlot: () => {},
      getOrCreateStorageBuffer: () => {
        preallocations += 1
        return ({}) as GPUBuffer
      },
      getOrCreateStorageTexture: () => ({}) as GPUTexture,
      getOrCreateIndirectArgsBuffer: () => ({}) as GPUBuffer,
      getOrCreateQueueCounterBuffer: () => ({}) as GPUBuffer,
      writeIndirectArgs: () => {},
      writeQueueCount: () => {},
      getResidentByteEstimate: () => 0,
      getResidencySnapshot: () => null,
      dispose: () => {}
    }
    const executor = new HydraExecutorV3({ resourceManager: resourceManager as never })
    const plan: HydraExecutionPlanV3 = {
      version: 'v3.0',
      id: 'external-no-prealloc',
      sourceGraph: {
        id: 'graph',
        source: 'hydra-dsl',
        compatibilityMode: 'dsl-v2',
        nodes: [],
        resources: [{
          id: 'buffer:external-source',
          kind: 'Buffer',
          access: 'read',
          lifetime: 'external',
          shape: { minLength: 64 }
        }],
        edges: []
      },
      steps: [],
      barriers: [],
      resources: [{
        resourceId: 'buffer:external-source',
        lifetime: 'external',
        aliasGroup: 'external',
        slot: 'slot:external:0',
        interval: { start: 0, end: 0 },
        aliasable: false,
        plannedBytes: 256
      }],
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
      cacheKey: 'external-prealloc'
    }

    const result = executor.executePlan(output as never, plan, {
      time: 0,
      bpm: 120,
      resolution: [64, 1],
      deltaMs: 16
    })

    expect(result.allocatedResourceCount).toBe(0)
    expect(preallocations).toBe(0)
  })

  it('routes execution plans through executor v3 output integration', () => {
    const rendered: unknown[] = []
    const output = {
      render: (passes: unknown[]) => {
        rendered.push(...passes)
      }
    }
    const plan: HydraExecutionPlanV3 = {
      id: 'plan',
      sourceGraph: {
        id: 'graph',
        source: 'hydra-dsl',
        compatibilityMode: 'dsl-v2',
        nodes: [],
        resources: [],
        edges: []
      },
      steps: [
        {
          id: 'step0',
          nodeId: 'k0',
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
        }
      ],
      barriers: [],
      resources: [],
      diagnostics: {
        score: 0.5,
        scoreBreakdown: { dispatchCost: 1, memoryCost: 0, fallbackRiskCost: 0 },
        selectedVariantPolicy: 'compat',
        peakTransientBytes: 0,
        totalPlannedBytes: 0,
        fallbackRiskRate: 0,
        selectedVariantCounts: { generic: 1, tiled: 0, subgroup: 0 },
        primitiveSelectionCounts: {},
        queueStepCount: 0,
        queueSegmentCount: 0,
        barrierCount: 0,
        nodeOrder: ['k0']
      },
      cacheKey: 'k'
    }
    const executor = new HydraExecutorV3()
    const frame: HydraFrameState = {
      time: 0,
      bpm: 120,
      resolution: [1, 1],
      deltaMs: 16
    }
    const result = executor.executePlan(output as never, plan, frame)
    expect(result.submittedPasses).toBe(1)
    expect(rendered).toHaveLength(1)
    expect(result.queueIterations).toBe(0)
  })

  it('expands queue-domain steps into iterative queue passes with overflow diagnostics', () => {
    const rendered: unknown[] = []
    const output = {
      render: (passes: unknown[]) => {
        rendered.push(...passes)
      }
    }
    const queuePass = {
      signature: 'queue-pass',
      wgsl: '@compute @workgroup_size(64, 1, 1) fn csMain() {}',
      uniforms: [],
      textures: [],
      dispatch: {
        mode: 'direct' as const,
        domain: 'linear1d' as const,
        workgroupSize: [64, 1, 1] as [number, number, number],
        itemCount: 128
      }
    }
    const plan: HydraExecutionPlanV3 = {
      id: 'queue-plan',
      sourceGraph: {
        id: 'graph',
        source: 'hydra-dsl',
        compatibilityMode: 'dsl-v2',
        nodes: [],
        resources: [],
        edges: []
      },
      steps: [
        {
          id: 'step0',
          nodeId: 'k0',
          signature: 'queue-pass',
          dispatchDomain: 'queue1d',
          variant: 'generic',
          variantCandidates: [{ variant: 'generic', signature: 'queue-pass', legal: true }],
          fallbackDepth: 0,
          maxIterations: 4,
          compiledPass: queuePass,
          barriersBefore: []
        }
      ],
      barriers: [],
      resources: [],
      diagnostics: {
        score: 0.5,
        scoreBreakdown: { dispatchCost: 1, memoryCost: 0, fallbackRiskCost: 0 },
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
      cacheKey: 'queue'
    }

    const executor = new HydraExecutorV3()
    const frame: HydraFrameState = {
      time: 0,
      bpm: 120,
      resolution: [128, 1],
      deltaMs: 16
    }
    const result = executor.executePlan(output as never, plan, frame, {
      queueHooks: {
        getQueueState: (_step, iteration) => {
          if (iteration === 0) return { activeCount: 180, capacity: 128 }
          if (iteration === 1) return { activeCount: 64, capacity: 128 }
          return { activeCount: 0, capacity: 128 }
        }
      }
    })

    expect(result.queueIterations).toBe(2)
    expect(result.queueOverflowCount).toBe(52)
    expect(result.queueIndirectDispatches).toBe(0)
    expect(result.submittedPasses).toBe(2)
    expect(rendered).toHaveLength(2)
  })

  it('executes grouped queue segments in iteration-major order', () => {
    const rendered: Array<{ signature: string }> = []
    const output = {
      render: (passes: Array<{ signature: string }>) => {
        rendered.push(...passes)
      }
    }
    const plan: HydraExecutionPlanV3 = {
      id: 'queue-segment-plan',
      sourceGraph: {
        id: 'graph',
        source: 'hydra-dsl',
        compatibilityMode: 'dsl-v2',
        nodes: [],
        resources: [],
        edges: []
      },
      steps: [
        {
          id: 'step0',
          nodeId: 'k0',
          signature: 'queue-pass-a',
          dispatchDomain: 'queue1d',
          variant: 'generic',
          variantCandidates: [{ variant: 'generic', signature: 'queue-pass-a', legal: true }],
          fallbackDepth: 0,
          maxIterations: 3,
          queueControl: { modeHint: 'cpu', convergenceCheckInterval: 1, groupId: 'queue-segment-0' },
          compiledPass: {
            signature: 'queue-pass-a',
            wgsl: '@compute @workgroup_size(64, 1, 1) fn csMain() {}',
            uniforms: [],
            textures: [],
            dispatch: {
              mode: 'direct',
              domain: 'linear1d',
              workgroupSize: [64, 1, 1],
              itemCount: 64
            }
          },
          barriersBefore: []
        },
        {
          id: 'step1',
          nodeId: 'k1',
          signature: 'queue-pass-b',
          dispatchDomain: 'queue1d',
          variant: 'generic',
          variantCandidates: [{ variant: 'generic', signature: 'queue-pass-b', legal: true }],
          fallbackDepth: 0,
          maxIterations: 3,
          queueControl: { modeHint: 'cpu', convergenceCheckInterval: 1, groupId: 'queue-segment-0' },
          compiledPass: {
            signature: 'queue-pass-b',
            wgsl: '@compute @workgroup_size(64, 1, 1) fn csMain() {}',
            uniforms: [],
            textures: [],
            dispatch: {
              mode: 'direct',
              domain: 'linear1d',
              workgroupSize: [64, 1, 1],
              itemCount: 64
            }
          },
          barriersBefore: []
        }
      ],
      barriers: [],
      resources: [],
      diagnostics: {
        score: 0.2,
        scoreBreakdown: { dispatchCost: 2, memoryCost: 0, fallbackRiskCost: 0 },
        selectedVariantPolicy: 'compat',
        peakTransientBytes: 0,
        totalPlannedBytes: 0,
        fallbackRiskRate: 0,
        selectedVariantCounts: { generic: 2, tiled: 0, subgroup: 0 },
        primitiveSelectionCounts: {},
        queueStepCount: 2,
        queueSegmentCount: 1,
        barrierCount: 0,
        nodeOrder: ['k0', 'k1']
      },
      cacheKey: 'queue-segment'
    }

    const executor = new HydraExecutorV3()
    const result = executor.executePlan(output as never, plan, {
      time: 0,
      bpm: 120,
      resolution: [64, 1],
      deltaMs: 16
    }, {
      queueHooks: {
        getQueueState: (_step, iteration) => (iteration < 2 ? { activeCount: 64, capacity: 64 } : { activeCount: 0, capacity: 64 })
      }
    })

    expect(result.queueIterations).toBe(2)
    expect(result.submittedPasses).toBe(4)
    expect(rendered.map((pass) => pass.signature)).toEqual([
      'queue-pass-a',
      'queue-pass-b',
      'queue-pass-a',
      'queue-pass-b'
    ])
  })

  it('uses slot-backed resource manager and indirect queue dispatch when available', () => {
    const rendered: unknown[] = []
    const output = {
      render: (passes: unknown[]) => rendered.push(...passes)
    }
    const createdBuffers = new Map<string, { writes: Uint32Array[] }>()
    const resourceManager = {
      registerResourceSlot: () => {},
      getOrCreateStorageBuffer: () => ({}) as GPUBuffer,
      getOrCreateStorageTexture: () => ({}) as GPUTexture,
      getOrCreateIndirectArgsBuffer: (slot: string) => {
        if (!createdBuffers.has(slot)) createdBuffers.set(slot, { writes: [] })
        return ({ slot } as unknown) as GPUBuffer
      },
      getOrCreateQueueCounterBuffer: () => ({}) as GPUBuffer,
      writeIndirectArgs: (slot: string, x: number, y: number, z: number) => {
        const entry = createdBuffers.get(slot) ?? { writes: [] }
        entry.writes.push(Uint32Array.from([x, y, z]))
        createdBuffers.set(slot, entry)
      },
      writeQueueCount: () => {},
      getResidentByteEstimate: () => 1024,
      getResidencySnapshot: () => ({
        storageBufferSlots: 1,
        textureSlots: 0,
        indirectSlots: createdBuffers.size,
        queueCounterSlots: 1,
        resourceBindings: 1
      }),
      dispose: () => {}
    }
    const executor = new HydraExecutorV3({ resourceManager: resourceManager as never })
    const plan: HydraExecutionPlanV3 = {
      version: 'v3.0',
      id: 'queue-indirect-plan',
      sourceGraph: {
        id: 'graph',
        source: 'hydra-dsl',
        compatibilityMode: 'dsl-v2',
        nodes: [],
        resources: [{
          id: 'virtual:queueBuffer',
          kind: 'QueueBuffer',
          access: 'read_write',
          lifetime: 'transient',
          aliasClass: 'queue',
          shape: { minLength: 256 }
        }],
        edges: []
      },
      steps: [{
        id: 'step0',
        nodeId: 'k0',
        signature: 'queue',
        dispatchDomain: 'queue1d',
        variant: 'generic',
        variantCandidates: [{ variant: 'generic', signature: 'queue', legal: true }],
        fallbackDepth: 0,
        maxIterations: 2,
        compiledPass: {
          signature: 'queue-pass',
          wgsl: '@compute @workgroup_size(64, 1, 1) fn csMain() {}',
          uniforms: [],
          textures: [],
          dispatch: {
            mode: 'direct',
            domain: 'linear1d',
            workgroupSize: [64, 1, 1],
            itemCount: 64
          }
        },
        barriersBefore: []
      }],
      barriers: [],
      resources: [{
        resourceId: 'virtual:queueBuffer',
        lifetime: 'transient',
        aliasGroup: 'queue',
        slot: 'slot:queue',
        interval: { start: 0, end: 0 },
        aliasable: true,
        plannedBytes: 1024
      }],
      diagnostics: {
        score: 0.2,
        scoreBreakdown: { dispatchCost: 1, memoryCost: 1, fallbackRiskCost: 0 },
        selectedVariantPolicy: 'balanced',
        peakTransientBytes: 1024,
        totalPlannedBytes: 1024,
        fallbackRiskRate: 0,
        selectedVariantCounts: { generic: 1, tiled: 0, subgroup: 0 },
        primitiveSelectionCounts: {},
        queueStepCount: 1,
        queueSegmentCount: 1,
        barrierCount: 0,
        nodeOrder: ['k0']
      },
      cacheKey: 'q'
    }
    const result = executor.executePlan(output as never, plan, {
      time: 0,
      bpm: 120,
      resolution: [64, 1],
      deltaMs: 16
    }, {
      queueMode: 'gpu_hybrid',
      queueHooks: {
        getQueueState: (_step, iteration) => (iteration === 0 ? { activeCount: 80, capacity: 64 } : { activeCount: 0, capacity: 64 })
      }
    })

    expect(result.queueIterations).toBe(1)
    expect(result.queueIndirectDispatches).toBe(1)
    expect(result.queueConvergenceChecks).toBe(0)
    expect(result.allocatedResourceCount).toBe(1)
    expect(rendered).toHaveLength(1)
    expect(createdBuffers.size).toBe(1)
  })

  it('performs convergence checks in gpu_hybrid mode without host queue hooks', () => {
    const rendered: unknown[] = []
    const output = { render: (passes: unknown[]) => rendered.push(...passes) }
    const resourceManager = {
      registerResourceSlot: () => {},
      getOrCreateStorageBuffer: () => ({}) as GPUBuffer,
      getOrCreateStorageTexture: () => ({}) as GPUTexture,
      getOrCreateIndirectArgsBuffer: () => ({}) as GPUBuffer,
      getOrCreateQueueCounterBuffer: () => ({}) as GPUBuffer,
      writeIndirectArgs: () => {},
      writeQueueCount: () => {},
      readQueueCount: () => 0,
      getResidentByteEstimate: () => 512,
      getResidencySnapshot: () => null,
      dispose: () => {}
    }
    const executor = new HydraExecutorV3({ resourceManager: resourceManager as never })
    const plan: HydraExecutionPlanV3 = {
      version: 'v3.0',
      id: 'queue-convergence-plan',
      sourceGraph: {
        id: 'graph',
        source: 'hydra-dsl',
        compatibilityMode: 'dsl-v2',
        nodes: [],
        resources: [],
        edges: []
      },
      steps: [{
        id: 'step0',
        nodeId: 'k0',
        signature: 'queue',
        dispatchDomain: 'queue1d',
        variant: 'generic',
        variantCandidates: [{ variant: 'generic', signature: 'queue', legal: true }],
        fallbackDepth: 0,
        maxIterations: 2,
        queueControl: { modeHint: 'gpu_hybrid', convergenceCheckInterval: 1, groupId: 'q0' },
        compiledPass: {
          signature: 'queue-pass',
          wgsl: '@compute @workgroup_size(64, 1, 1) fn csMain() {}',
          uniforms: [],
          textures: [],
          dispatch: {
            mode: 'direct',
            domain: 'linear1d',
            workgroupSize: [64, 1, 1],
            itemCount: 64
          }
        },
        barriersBefore: []
      }],
      barriers: [],
      resources: [],
      diagnostics: {
        score: 0.2,
        scoreBreakdown: { dispatchCost: 1, memoryCost: 1, fallbackRiskCost: 0 },
        selectedVariantPolicy: 'balanced',
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
      cacheKey: 'qc'
    }
    const result = executor.executePlan(output as never, plan, {
      time: 0,
      bpm: 120,
      resolution: [64, 1],
      deltaMs: 16
    }, {
      queueMode: 'gpu_hybrid',
      queueConvergenceCheckInterval: 1
    })

    expect(result.queueIterations).toBe(1)
    expect(result.queueIndirectDispatches).toBe(1)
    expect(result.queueConvergenceChecks).toBeGreaterThanOrEqual(1)
    expect(rendered).toHaveLength(1)
  })
})
