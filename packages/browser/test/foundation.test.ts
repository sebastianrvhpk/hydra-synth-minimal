import { describe, expect, it } from 'vitest'
import type { HydraExecutionPlan, HydraFrameState } from 'hydra-synth-core'
import { BENCHMARK_CORPUS } from '../src/benchmark/corpus.ts'
import { buildBenchmarkReport, validateBenchmarkReport } from '../src/benchmark/runner.ts'
import { HydraAutotuner } from '../src/runtime/autotune.ts'
import { HydraExecutor } from '../src/runtime/executor.ts'
import { buildProfilerSnapshot } from '../src/runtime/profiler.ts'
import { decideQueueDispatch } from '../src/runtime/queue.ts'
import { HydraBrowserRuntime, normalizeRuntimeExecutionMode } from '../src/runtime/runtime.ts'

const createMinimalExecutionPlan = (): HydraExecutionPlan => ({
  version: '1.0',
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

const createRuntimeHarness = (executionMode?: 'compute' | 'auto'): HydraBrowserRuntime => {
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

const createQueueControl = ({
  modeHint = 'cpu',
  groupId = 'queue-segment-0',
  convergenceCheckInterval = 1,
  maxIterations = 4,
  overflowPolicy = 'ignore',
  maxOverflow = 1024,
  strategy
}: {
  modeHint?: 'cpu' | 'gpu_hybrid'
  groupId?: string
  convergenceCheckInterval?: number
  maxIterations?: number
  overflowPolicy?: 'ignore' | 'terminate_segment'
  maxOverflow?: number
  strategy?: 'hooks' | 'queue_counter' | 'hook_or_queue_counter' | 'none'
} = {}) => ({
  modeHint,
  convergenceCheckInterval,
  groupId,
  policy: {
    termination: {
      mode: 'until_empty' as const,
      maxIterations: Math.max(1, Math.floor(maxIterations)),
      minIterations: 1
    },
    overflow: {
      policy: overflowPolicy,
      maxOverflow: Math.max(0, Math.floor(maxOverflow))
    },
    convergence: {
      strategy: strategy ?? (modeHint === 'gpu_hybrid' ? 'hook_or_queue_counter' : 'hooks'),
      checkInterval: Math.max(1, Math.floor(convergenceCheckInterval)),
      maxNoProgressChecks: 2
    }
  }
})

describe('browser foundation', () => {
  it('builds and validates benchmark reports from sample streams', () => {
    const scene = BENCHMARK_CORPUS[0]
    if (!scene) throw new Error('Benchmark corpus is empty.')
    const report = buildBenchmarkReport({
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
    const validation = validateBenchmarkReport(report)
    expect(validation.ok).toBe(true)
  })

  it('validates acceptance gates across the full benchmark corpus', () => {
    BENCHMARK_CORPUS.forEach((scene) => {
      const report = buildBenchmarkReport({
        sceneId: scene.id,
        samples: [
          { frameMs: Math.max(1, (scene.acceptance.maxAvgFrameMs ?? 16) * 0.75), cpuEncodeMs: 1.0, dispatchCount: 10, fallbackCount: 0, residentBytes: 2048 },
          { frameMs: Math.max(1, (scene.acceptance.maxAvgFrameMs ?? 16) * 0.85), cpuEncodeMs: 1.2, dispatchCount: 10, fallbackCount: 0, residentBytes: 4096 },
          { frameMs: Math.max(1, (scene.acceptance.maxAvgFrameMs ?? 16) * 0.95), cpuEncodeMs: 1.1, dispatchCount: 10, fallbackCount: 0, residentBytes: 8192 }
        ],
        capabilities: null
      })
      const validation = validateBenchmarkReport(report)
      expect(validation.ok).toBe(true)
    })
  })

  it('reports benchmark gate regressions when thresholds are exceeded', () => {
    const scene = BENCHMARK_CORPUS[0]
    if (!scene) throw new Error('Benchmark corpus is empty.')
    const report = buildBenchmarkReport({
      sceneId: scene.id,
      samples: [
        { frameMs: (scene.acceptance.maxP95FrameMs ?? 20) * 1.5, dispatchCount: 10, fallbackCount: 2, residentBytes: 1024 }
      ],
      capabilities: null
    })
    const validation = validateBenchmarkReport(report)
    expect(validation.ok).toBe(false)
    expect(validation.failures.length).toBeGreaterThan(0)
  })

  it('reports benchmark deltas against a baseline report', () => {
    const scene = BENCHMARK_CORPUS[0]
    if (!scene) throw new Error('Benchmark corpus is empty.')
    const baseline = buildBenchmarkReport({
      sceneId: scene.id,
      samples: [
        { frameMs: 14, cpuEncodeMs: 1.5, dispatchCount: 12, fallbackCount: 1, residentBytes: 4096 },
        { frameMs: 13.5, cpuEncodeMs: 1.4, dispatchCount: 12, fallbackCount: 1, residentBytes: 4096 }
      ],
      capabilities: null
    })
    const tuned = buildBenchmarkReport({
      sceneId: scene.id,
      baseline,
      samples: [
        { frameMs: 10, cpuEncodeMs: 1.0, dispatchCount: 12, fallbackCount: 0, residentBytes: 4096 },
        { frameMs: 9.8, cpuEncodeMs: 0.9, dispatchCount: 12, fallbackCount: 0, residentBytes: 4096 }
      ],
      capabilities: null
    })

    expect(tuned.deltaFromBaseline).not.toBeNull()
    expect((tuned.deltaFromBaseline?.avgFrameMs ?? 1)).toBeLessThan(0)
    expect((tuned.deltaFromBaseline?.fallbackRate ?? 1)).toBeLessThanOrEqual(0)
  })

  it('provides queue dispatch decisions with overflow diagnostics', () => {
    const decision = decideQueueDispatch({
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
    const snapshot = buildProfilerSnapshot({
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
    expect(snapshot.scheduler.queueOverflowEvents).toBe(0)
    expect(snapshot.scheduler.queueConvergenceChecks).toBe(0)
    expect(snapshot.scheduler.queueTerminationReason).toBe('none')
    expect(snapshot.scheduler.queueChecksPerSegment).toEqual([])
    expect(snapshot.scheduler.routingConfiguredMode).toBe('compute')
    expect(snapshot.scheduler.routingActiveMode).toBe('compute')
    expect(snapshot.scheduler.routingCompileFailures).toBe(0)
    expect(snapshot.scheduler.routingRouteFailureCount).toBe(0)
    expect(snapshot.passes['o0:passA']?.dispatchDomain).toBe('pixel2d')
    expect(snapshot.passes['o0:passA']?.gpuTimingSource).toBe('unavailable')
  })

  it('normalizes runtime execution mode values and defaults', () => {
    expect(normalizeRuntimeExecutionMode('deprecated-mode')).toBe('auto')
    expect(normalizeRuntimeExecutionMode('compute')).toBe('compute')
    expect(normalizeRuntimeExecutionMode(' auto ')).toBe('auto')
    expect(normalizeRuntimeExecutionMode('invalid')).toBe('auto')
    expect(normalizeRuntimeExecutionMode('invalid', 'compute')).toBe('compute')
  })

  it('defaults browser runtime execution mode to auto', () => {
    const runtime = createRuntimeHarness()
    expect(runtime.getExecutionMode()).toBe('auto')
    runtime.dispose()
  })

  it('routes graph rendering through compute mode and reports active mode diagnostics', () => {
    const runtime = createRuntimeHarness('compute')
    const executeCalls: HydraExecutionPlan[] = []
    ;(runtime as unknown as {
      executor: {
        executePlan: (output: unknown, plan: HydraExecutionPlan) => {
          submittedPasses: number
          scheduledBarriers: number
          queueIterations: number
          queueOverflowCount: number
          queueOverflowEvents: number
          queueIndirectDispatches: number
          queueConvergenceChecks: number
          queueTerminationReasons: string[]
          queueChecksPerSegment: number[]
          allocatedResourceCount: number
        }
        getResidentByteEstimate: () => number
        getResidencySnapshot: () => null
        dispose: () => void
      }
    }).executor = {
      executePlan: (_output, plan) => {
        executeCalls.push(plan)
        return {
          submittedPasses: 0,
          scheduledBarriers: 0,
          queueIterations: 0,
          queueOverflowCount: 0,
          queueOverflowEvents: 0,
          queueIndirectDispatches: 0,
          queueConvergenceChecks: 0,
          queueTerminationReasons: [],
          queueChecksPerSegment: [],
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
      compilePasses: () => [],
      compilePlan: () => createMinimalExecutionPlan()
    })

    const snapshot = runtime.getProfilerSnapshot()
    expect(executeCalls).toHaveLength(1)
    expect(snapshot.scheduler.routingConfiguredMode).toBe('compute')
    expect(snapshot.scheduler.routingActiveMode).toBe('compute')
    expect(snapshot.scheduler.routingCompileFailures).toBe(0)
    expect(snapshot.scheduler.routingRouteFailureCount).toBe(0)
    runtime.dispose()
  })

  it('records deterministic route failures when plan compilation fails', () => {
    const runtime = createRuntimeHarness('compute')
    const output = runtime.outputs[0]
    if (!output) throw new Error('Missing runtime output.')
    output.renderGraph({
      transforms: [],
      compilePasses: () => [{
        signature: 'route-failure-pass',
        wgsl: '@compute @workgroup_size(1, 1, 1) fn csMain() {}',
        uniforms: [],
        textures: []
      }],
      compilePlan: () => {
        throw new Error('compile failed')
      }
    })

    const snapshot = runtime.getProfilerSnapshot()
    expect(snapshot.scheduler.routingConfiguredMode).toBe('compute')
    expect(snapshot.scheduler.routingActiveMode).toBe('compute')
    expect(snapshot.scheduler.routingCompileFailures).toBe(1)
    expect(snapshot.scheduler.routingRouteFailureCount).toBe(1)
    runtime.dispose()
  })

  it('stores autotune profiles and exposes policy controls', () => {
    const tuner = new HydraAutotuner()
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
    expect(profile.candidateSignature.length).toBeGreaterThan(0)
    expect(profile.warmupTrials).toBeGreaterThanOrEqual(0)
    expect(profile.sampleTrials).toBeGreaterThan(0)
    expect(profile.selectedMeasuredP95Ms).toBeGreaterThan(0)
    expect(tuner.getProfile('gpu-a')).not.toBeNull()
    expect(tuner.getProfileByFingerprint('gpu-a', profile.fingerprintKey)?.profileKey).toBe('gpu-a')
    tuner.clear('gpu-a')
    expect(tuner.getProfile('gpu-a')).toBeNull()
  })

  it('selects measured candidate winners from sampled autotune trials', () => {
    const tuner = new HydraAutotuner()
    const measuredByCandidate = new Map<string, number[]>([
      ['16x16x1', [8.5, 8.4, 8.6]],
      ['8x8x1', [4.2, 4.1, 4.0]],
      ['32x8x1', [6.7, 6.6, 6.8]]
    ])

    const profile = tuner.run({
      profileKey: 'gpu-measured',
      policy: 'throughput',
      candidateWorkgroups: [[16, 16, 1], [8, 8, 1], [32, 8, 1]],
      warmupTrials: 1,
      sampleTrials: 3,
      measureCandidate: ({ workgroup, phase, trialIndex }) => {
        if (phase === 'warmup') return 100
        const key = `${workgroup[0]}x${workgroup[1]}x${workgroup[2]}`
        const samples = measuredByCandidate.get(key) ?? [10]
        return samples[trialIndex] ?? samples[samples.length - 1]
      }
    })

    expect(profile.selectedWorkgroupSize).toEqual([8, 8, 1])
    expect(profile.selectedMeasuredP95Ms).toBeCloseTo(4.1, 5)
  })

  it('reuses fingerprint-scoped autotune profiles in runtime', () => {
    const runtime = createRuntimeHarness('compute')
    const autotuner = (runtime as unknown as {
      autotuner: HydraAutotuner & {
        run: HydraAutotuner['run']
      }
    }).autotuner

    let runCalls = 0
    const originalRun = autotuner.run.bind(autotuner) as HydraAutotuner['run']
    autotuner.run = ((options) => {
      runCalls += 1
      return originalRun(options)
    }) as typeof autotuner.run

    const first = runtime.autotune({ profileKey: 'runtime-persist', kernelSignature: 'kernel-a' })
    const second = runtime.autotune({ profileKey: 'runtime-persist', kernelSignature: 'kernel-a' })
    const third = runtime.autotune({ profileKey: 'runtime-persist', kernelSignature: 'kernel-b' })

    expect(runCalls).toBe(2)
    expect(second.evaluatedAt).toBe(first.evaluatedAt)
    expect(third.fingerprintKey).not.toBe(first.fingerprintKey)
    runtime.dispose()
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
    const executor = new HydraExecutor({ resourceManager: resourceManager as never })

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
    const plan: HydraExecutionPlan = {
      version: '1.0',
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
    const executor = new HydraExecutor({ resourceManager: resourceManager as never })
    const plan: HydraExecutionPlan = {
      version: '1.0',
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
    const executor = new HydraExecutor({ resourceManager: resourceManager as never })
    const plan: HydraExecutionPlan = {
      version: '1.0',
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

  it('routes execution plans through executor output integration', () => {
    const rendered: unknown[] = []
    const output = {
      render: (passes: unknown[]) => {
        rendered.push(...passes)
      }
    }
    const plan: HydraExecutionPlan = {
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
    const executor = new HydraExecutor()
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
    const plan: HydraExecutionPlan = {
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

    const executor = new HydraExecutor()
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
    expect(result.queueOverflowEvents).toBe(1)
    expect(result.queueIndirectDispatches).toBe(0)
    expect(result.queueTerminationReasons).toEqual(['inactive'])
    expect(result.queueChecksPerSegment).toEqual([0])
    expect(result.submittedPasses).toBe(2)
    expect(rendered).toHaveLength(2)
  })

  it('applies queue overflow termination policy deterministically', () => {
    const rendered: unknown[] = []
    const output = {
      render: (passes: unknown[]) => rendered.push(...passes)
    }
    const queuePass = {
      signature: 'queue-overflow-pass',
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
    const plan: HydraExecutionPlan = {
      id: 'queue-overflow-policy-plan',
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
        signature: 'queue-overflow-pass',
        dispatchDomain: 'queue1d',
        variant: 'generic',
        variantCandidates: [{ variant: 'generic', signature: 'queue-overflow-pass', legal: true }],
        fallbackDepth: 0,
        maxIterations: 4,
        queueControl: createQueueControl({
          modeHint: 'cpu',
          convergenceCheckInterval: 1,
          groupId: 'queue-overflow',
          maxIterations: 4,
          overflowPolicy: 'terminate_segment',
          maxOverflow: 10,
          strategy: 'hooks'
        }),
        compiledPass: queuePass,
        barriersBefore: []
      }],
      barriers: [],
      resources: [],
      diagnostics: {
        score: 0.3,
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
      cacheKey: 'q-overflow'
    }

    const executor = new HydraExecutor()
    const result = executor.executePlan(output as never, plan, {
      time: 0,
      bpm: 120,
      resolution: [128, 1],
      deltaMs: 16
    }, {
      queueHooks: {
        getQueueState: (_step, iteration) => (iteration === 0
          ? { activeCount: 96, capacity: 32 }
          : { activeCount: 0, capacity: 32 })
      }
    })

    expect(result.queueIterations).toBe(1)
    expect(result.queueOverflowCount).toBeGreaterThan(10)
    expect(result.queueOverflowEvents).toBe(1)
    expect(result.queueTerminationReasons).toEqual(['overflow_limit'])
    expect(result.submittedPasses).toBe(1)
    expect(rendered).toHaveLength(1)
  })

  it('distinguishes hook-fed queue iteration from policy-only queue convergence checks', () => {
    const output = { render: () => {} }
    const plan: HydraExecutionPlan = {
      id: 'queue-policy-vs-hooks-plan',
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
        signature: 'queue-policy-vs-hooks',
        dispatchDomain: 'queue1d',
        variant: 'generic',
        variantCandidates: [{ variant: 'generic', signature: 'queue-policy-vs-hooks', legal: true }],
        fallbackDepth: 0,
        maxIterations: 3,
        queueControl: createQueueControl({
          modeHint: 'gpu_hybrid',
          convergenceCheckInterval: 1,
          groupId: 'queue-policy-vs-hooks',
          maxIterations: 3,
          strategy: 'hook_or_queue_counter'
        }),
        compiledPass: {
          signature: 'queue-policy-vs-hooks',
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
      cacheKey: 'q-hooks-vs-policy'
    }

    const executor = new HydraExecutor()
    const frame: HydraFrameState = {
      time: 0,
      bpm: 120,
      resolution: [64, 1],
      deltaMs: 16
    }
    const hookFed = executor.executePlan(output as never, plan, frame, {
      queueHooks: {
        getQueueState: (_step, iteration) => {
          if (iteration === 0) return { activeCount: 64, capacity: 64 }
          if (iteration === 1) return { activeCount: 32, capacity: 64 }
          return { activeCount: 0, capacity: 64 }
        }
      }
    })
    const policyOnly = executor.executePlan(output as never, plan, frame, {
      queueHooks: {
        readQueueCount: ((_step, iteration) => (iteration === 1 ? 32 : 0))
      },
      queueMode: 'gpu_hybrid'
    })

    expect(hookFed.queueIterations).toBe(2)
    expect(hookFed.queueConvergenceChecks).toBe(0)
    expect(hookFed.queueTerminationReasons).toEqual(['inactive'])
    expect(policyOnly.queueIterations).toBe(2)
    expect(policyOnly.queueConvergenceChecks).toBeGreaterThanOrEqual(1)
    expect(policyOnly.queueChecksPerSegment[0]).toBe(policyOnly.queueConvergenceChecks)
  })

  it('executes grouped queue segments in iteration-major order', () => {
    const rendered: Array<{ signature: string }> = []
    const output = {
      render: (passes: Array<{ signature: string }>) => {
        rendered.push(...passes)
      }
    }
    const plan: HydraExecutionPlan = {
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
          queueControl: createQueueControl({
            modeHint: 'cpu',
            convergenceCheckInterval: 1,
            groupId: 'queue-segment-0',
            maxIterations: 3
          }),
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
          queueControl: createQueueControl({
            modeHint: 'cpu',
            convergenceCheckInterval: 1,
            groupId: 'queue-segment-0',
            maxIterations: 3
          }),
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

    const executor = new HydraExecutor()
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
    expect(result.queueTerminationReasons).toEqual(['inactive'])
    expect(result.queueChecksPerSegment).toEqual([0])
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
    const executor = new HydraExecutor({ resourceManager: resourceManager as never })
    const plan: HydraExecutionPlan = {
      version: '1.0',
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
    expect(result.queueTerminationReasons).toEqual(['inactive'])
    expect(result.queueChecksPerSegment).toEqual([0])
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
    const executor = new HydraExecutor({ resourceManager: resourceManager as never })
    const plan: HydraExecutionPlan = {
      version: '1.0',
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
        queueControl: createQueueControl({
          modeHint: 'gpu_hybrid',
          convergenceCheckInterval: 1,
          groupId: 'q0',
          maxIterations: 2
        }),
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
    expect(result.queueTerminationReasons).toEqual(['inactive'])
    expect(result.queueChecksPerSegment).toEqual([result.queueConvergenceChecks])
    expect(rendered).toHaveLength(1)
  })
})
