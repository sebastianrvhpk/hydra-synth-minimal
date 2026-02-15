import { describe, expect, it } from 'vitest'
import type { HydraExecutionPlanV3, HydraFrameState } from 'hydra-synth-core'
import { BENCHMARK_CORPUS_V3 } from '../src/benchmark/corpus.ts'
import { buildBenchmarkReportV3, validateBenchmarkReportV3 } from '../src/benchmark/runner.ts'
import { HydraAutotunerV3 } from '../src/runtime/autotune-v3.ts'
import { HydraExecutorV3 } from '../src/runtime/executor-v3.ts'
import { buildProfilerSnapshotV3 } from '../src/runtime/profiler-v3.ts'
import { decideQueueDispatchV3 } from '../src/runtime/queue-v3.ts'

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
    expect(snapshot.passes['o0:passA']?.dispatchDomain).toBe('pixel2d')
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
