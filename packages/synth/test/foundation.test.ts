import { describe, expect, it } from 'vitest'
import type { HydraExecutionPlan } from '../src/core/index.ts'
import { BENCHMARK_CORPUS } from '../src/benchmark/corpus.ts'
import { buildBenchmarkReport, validateBenchmarkReport } from '../src/benchmark/runner.ts'
import { HydraAutotuner } from '../src/runtime/autotune.ts'
import { WebGPUOutputNode } from '../src/runtime/output-node.ts'
import { buildProfilerSnapshot } from '../src/runtime/profiler.ts'
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
    scoreBreakdown: { runCost: 0, memoryCost: 0, barrierCost: 0 },
    peakTransientBytes: 0,
    totalPlannedBytes: 0,
    barrierCount: 0,
    nodeOrder: []
  },
  cacheKey: 'minimal'
})

const createRuntimeHarness = (executionMode?: 'fragment' | 'auto'): HydraBrowserRuntime => {
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

describe('browser foundation', () => {
  it('builds and validates benchmark reports from sample streams', () => {
    const scene = BENCHMARK_CORPUS[0]
    if (!scene) throw new Error('Benchmark corpus is empty.')
    const report = buildBenchmarkReport({
      sceneId: scene.id,
      samples: [
        { frameMs: 10, cpuEncodeMs: 1.2, runCount: 12, fallbackCount: 0, residentBytes: 1024 },
        { frameMs: 11, cpuEncodeMs: 1.1, runCount: 12, fallbackCount: 0, residentBytes: 2048 },
        { frameMs: 9, cpuEncodeMs: 1.0, runCount: 12, fallbackCount: 1, residentBytes: 3072 }
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
          { frameMs: Math.max(1, (scene.acceptance.maxAvgFrameMs ?? 16) * 0.75), cpuEncodeMs: 1.0, runCount: 10, fallbackCount: 0, residentBytes: 2048 },
          { frameMs: Math.max(1, (scene.acceptance.maxAvgFrameMs ?? 16) * 0.85), cpuEncodeMs: 1.2, runCount: 10, fallbackCount: 0, residentBytes: 4096 },
          { frameMs: Math.max(1, (scene.acceptance.maxAvgFrameMs ?? 16) * 0.95), cpuEncodeMs: 1.1, runCount: 10, fallbackCount: 0, residentBytes: 8192 }
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
        { frameMs: (scene.acceptance.maxP95FrameMs ?? 20) * 1.5, runCount: 10, fallbackCount: 2, residentBytes: 1024 }
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
        { frameMs: 14, cpuEncodeMs: 1.5, runCount: 12, fallbackCount: 1, residentBytes: 4096 },
        { frameMs: 13.5, cpuEncodeMs: 1.4, runCount: 12, fallbackCount: 1, residentBytes: 4096 }
      ],
      capabilities: null
    })
    const tuned = buildBenchmarkReport({
      sceneId: scene.id,
      baseline,
      samples: [
        { frameMs: 10, cpuEncodeMs: 1.0, runCount: 12, fallbackCount: 0, residentBytes: 4096 },
        { frameMs: 9.8, cpuEncodeMs: 0.9, runCount: 12, fallbackCount: 0, residentBytes: 4096 }
      ],
      capabilities: null
    })

    expect(tuned.deltaFromBaseline).not.toBeNull()
    expect((tuned.deltaFromBaseline?.avgFrameMs ?? 1)).toBeLessThan(0)
    expect((tuned.deltaFromBaseline?.fallbackRate ?? 1)).toBeLessThanOrEqual(0)
  })

  it('captures profiler snapshots from output pass stats', () => {
    const outputA = {
      getPassStats: () => ({
        passA: { runCount: 4, avgCpuEncodeMs: 1.5, lastCpuEncodeMs: 2.0, fallbackCount: 1, variant: 'fragment' as const }
      })
    }
    const outputB = {
      getPassStats: () => ({
        passB: { runCount: 2, avgCpuEncodeMs: 0.8, lastCpuEncodeMs: 1.1, fallbackCount: 0, variant: 'fragment' as const }
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
    expect(snapshot.scheduler.routingConfiguredMode).toBe('fragment')
    expect(snapshot.scheduler.routingActiveMode).toBe('fragment')
    expect(snapshot.scheduler.routingCompileFailures).toBe(0)
    expect(snapshot.scheduler.routingRouteFailureCount).toBe(0)
    expect(snapshot.passes['o0:passA']?.gpuTimingSource).toBe('unavailable')
  })

  it('does not infer gpu timing from cpu encode durations', () => {
    const output = new WebGPUOutputNode({ renderer: null, width: 4, height: 4, label: 'timing-audit' })
    ;(output as unknown as {
      recordPassStat: (signature: string, cpuEncodeMs: number, fallbackUsed: boolean, variant: 'fragment') => void
    }).recordPassStat('pass-a', 3.75, false, 'fragment')

    const stats = output.getPassStats()
    expect(stats['pass-a']?.lastGpuMs).toBeNull()
    expect(stats['pass-a']?.avgGpuMs).toBeNull()
    expect(stats['pass-a']?.gpuTimingSource).toBe('unavailable')
    output.dispose()
  })

  it('allocates distinct dynamic uniform buffers for each pass slot', () => {
    const createFakeBuffer = (label: string): GPUBuffer => {
      const fakeBuffer = {
        label,
        destroy: () => {}
      }
      return fakeBuffer as unknown as GPUBuffer
    }

    const createdLabels: string[] = []
    const renderer = {
      ready: true,
      createDynamicUniformBuffer: (label: string) => {
        createdLabels.push(label)
        return createFakeBuffer(label)
      }
    }

    const makeUniformPass = (signature: string) => ({
      signature,
      wgsl: '',
      uniforms: [{
        name: 'amount_0',
        index: 0,
        size: 1,
        type: 'float' as const,
        value: () => 0
      }],
      textures: []
    })

    const output = new WebGPUOutputNode({
      renderer: renderer as unknown as never,
      width: 4,
      height: 4,
      label: 'dynamic-uniform-regression'
    })

    const nextSourcePasses = [makeUniformPass('shared-signature'), makeUniformPass('shared-signature')]
    const restored = (output as unknown as {
      restorePassDynamicUniformBuffers: (
        previousSourcePasses: Array<{ signature: string }>,
        previousBuffers: Array<GPUBuffer | null>,
        nextSourcePasses: Array<{ signature: string, uniforms: unknown[] }>
      ) => Array<GPUBuffer | null>
    }).restorePassDynamicUniformBuffers([], [], nextSourcePasses)

    expect(restored).toHaveLength(2)
    expect(restored[0]).not.toBeNull()
    expect(restored[1]).not.toBeNull()
    expect(restored[0]).not.toBe(restored[1])
    expect(createdLabels).toEqual([
      'dynamic-uniform-regression-dynamic-uniforms-pass-0',
      'dynamic-uniform-regression-dynamic-uniforms-pass-1'
    ])

    output.dispose()
  })

  it('resolves self output texture bindings against the frame input snapshot', () => {
    const output = new WebGPUOutputNode({
      renderer: null,
      width: 4,
      height: 4,
      label: 'self-feedback-snapshot'
    })
    output.id = 0

    const frameInputTexture = {} as GPUTexture
    const currentFrameTexture = {} as GPUTexture
    ;(output as unknown as {
      frameInputTexture: GPUTexture | null
      lastOutputTexture: GPUTexture | null
    }).frameInputTexture = frameInputTexture
    ;(output as unknown as {
      frameInputTexture: GPUTexture | null
      lastOutputTexture: GPUTexture | null
    }).lastOutputTexture = currentFrameTexture

    const textureBinding = {
      name: 'tex_0',
      variableName: 'hydraTexture0',
      getTexture: () => currentFrameTexture,
      isPrev: false,
      sourceRef: { id: 0 },
      binding: 3
    }

    const resolvedTexture = (output as unknown as {
      resolveTextureBinding: (
        textureBinding: {
          name: string
          variableName: string
          getTexture: (() => GPUTexture | null) | null
          isPrev: boolean
          sourceRef?: unknown
          binding: number
        },
        readTexture: GPUTexture
      ) => GPUTexture | null
    }).resolveTextureBinding(textureBinding, currentFrameTexture)

    expect(resolvedTexture).toBe(frameInputTexture)
    output.dispose()
  })

  it('prefers self history texture bindings over mutable frame texture pointers', () => {
    const output = new WebGPUOutputNode({
      renderer: null,
      width: 4,
      height: 4,
      label: 'self-feedback-history'
    })
    output.id = 0

    const historyTexture = {
      destroy: () => {}
    } as unknown as GPUTexture
    const frameInputTexture = {} as GPUTexture
    const currentFrameTexture = {} as GPUTexture

    ;(output as unknown as {
      historyTextures: Array<GPUTexture | null>
      historyCursor: number
      historyCount: number
      frameInputTexture: GPUTexture | null
      lastOutputTexture: GPUTexture | null
    }).historyTextures = [historyTexture]
    ;(output as unknown as {
      historyTextures: Array<GPUTexture | null>
      historyCursor: number
      historyCount: number
      frameInputTexture: GPUTexture | null
      lastOutputTexture: GPUTexture | null
    }).historyCursor = 0
    ;(output as unknown as {
      historyTextures: Array<GPUTexture | null>
      historyCursor: number
      historyCount: number
      frameInputTexture: GPUTexture | null
      lastOutputTexture: GPUTexture | null
    }).historyCount = 1
    ;(output as unknown as {
      historyTextures: Array<GPUTexture | null>
      historyCursor: number
      historyCount: number
      frameInputTexture: GPUTexture | null
      lastOutputTexture: GPUTexture | null
    }).frameInputTexture = frameInputTexture
    ;(output as unknown as {
      historyTextures: Array<GPUTexture | null>
      historyCursor: number
      historyCount: number
      frameInputTexture: GPUTexture | null
      lastOutputTexture: GPUTexture | null
    }).lastOutputTexture = currentFrameTexture

    const textureBinding = {
      name: 'tex_0',
      variableName: 'hydraTexture0',
      getTexture: () => currentFrameTexture,
      isPrev: false,
      sourceRef: { id: 0 },
      binding: 3
    }

    const resolvedTexture = (output as unknown as {
      resolveTextureBinding: (
        textureBinding: {
          name: string
          variableName: string
          getTexture: (() => GPUTexture | null) | null
          isPrev: boolean
          sourceRef?: unknown
          binding: number
        },
        readTexture: GPUTexture
      ) => GPUTexture | null
    }).resolveTextureBinding(textureBinding, currentFrameTexture)

    expect(resolvedTexture).toBe(historyTexture)
    output.dispose()
  })

  it('requests history depth when passes sample the same output id', () => {
    const output = new WebGPUOutputNode({
      renderer: null,
      width: 4,
      height: 4,
      label: 'self-feedback-history-depth'
    })
    output.id = 2

    const passes = [{
      signature: 'self-feedback-pass',
      wgsl: '',
      uniforms: [],
      textures: [{
        name: 'tex_0',
        variableName: 'hydraTexture0',
        getTexture: () => null,
        isPrev: false,
        sourceRef: { id: 2 },
        binding: 3
      }]
    }]

    ;(output as unknown as {
      updateRequiredHistoryDepth: (
        passes: Array<{
          signature: string
          textures: Array<{
            name: string
            variableName: string
            getTexture: (() => GPUTexture | null) | null
            isPrev: boolean
            sourceRef?: unknown
            binding: number
          }>
        }>
      ) => void
      ownHistoryDepth: number
    }).updateRequiredHistoryDepth(passes)

    expect((output as unknown as { ownHistoryDepth: number }).ownHistoryDepth).toBe(1)
    output.dispose()
  })

  it('normalizes runtime execution mode values and defaults', () => {
    expect(normalizeRuntimeExecutionMode('deprecated-mode')).toBe('auto')
    expect(normalizeRuntimeExecutionMode('fragment')).toBe('fragment')
    expect(normalizeRuntimeExecutionMode(' auto ')).toBe('auto')
    expect(normalizeRuntimeExecutionMode('invalid')).toBe('auto')
    expect(normalizeRuntimeExecutionMode('invalid', 'fragment')).toBe('fragment')
  })

  it('defaults browser runtime execution mode to auto', () => {
    const runtime = createRuntimeHarness()
    expect(runtime.getExecutionMode()).toBe('auto')
    runtime.dispose()
  })

  it('exposes a mouse binding on the synth object for pointer-driven patches', () => {
    const runtime = createRuntimeHarness()
    const mouse = runtime.synth.mouse as {
      x: number
      y: number
      speed: number
      acceleration: number
      jerk: number
      speedSmooth: number
      buttons: number
      enabled: boolean
      mods: { shift: boolean, alt: boolean, control: boolean, meta: boolean }
    }

    expect(mouse).toBeDefined()
    expect(mouse.x).toBe(0)
    expect(mouse.y).toBe(0)
    expect(mouse.speed).toBe(0)
    expect(mouse.acceleration).toBe(0)
    expect(mouse.jerk).toBe(0)
    expect(mouse.speedSmooth).toBe(0)
    expect(mouse.buttons).toBe(0)
    expect(typeof mouse.enabled).toBe('boolean')
    expect(mouse.mods).toEqual({
      shift: false,
      alt: false,
      control: false,
      meta: false
    })
    runtime.dispose()
  })

  it('installs array sequence helpers for legacy DSL compatibility', () => {
    const runtime = createRuntimeHarness()
    const sequence = [0, 1, 2] as number[] & {
      _speed?: number
      _smooth?: number
      _offset?: number
      fast: (speed?: number) => number[]
      smooth: (value?: number) => number[]
      offset: (value?: number) => number[]
    }

    expect(typeof sequence.fast).toBe('function')
    sequence.fast(2).smooth(0.5).offset(0.25)
    expect(sequence._speed).toBe(2)
    expect(sequence._smooth).toBe(0.5)
    expect(sequence._offset).toBe(0.25)
    runtime.dispose()
  })

  it('routes graph rendering through fragment mode and reports active mode diagnostics', () => {
    const runtime = createRuntimeHarness('fragment')
    const executeCalls: HydraExecutionPlan[] = []
    ;(runtime as unknown as {
      executor: {
        executePlan: (output: unknown, plan: HydraExecutionPlan) => {
          submittedPasses: number
          scheduledBarriers: number
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
    expect(snapshot.scheduler.routingConfiguredMode).toBe('fragment')
    expect(snapshot.scheduler.routingActiveMode).toBe('fragment')
    expect(snapshot.scheduler.routingCompileFailures).toBe(0)
    expect(snapshot.scheduler.routingRouteFailureCount).toBe(0)
    runtime.dispose()
  })

  it('records deterministic route failures when plan compilation fails', () => {
    const runtime = createRuntimeHarness('fragment')
    const output = runtime.outputs[0]
    if (!output) throw new Error('Missing runtime output.')
    output.renderGraph({
      transforms: [],
      compilePasses: () => [{
        signature: 'route-failure-pass',
        wgsl: '@vertex fn vsMain(@builtin(vertex_index) i: u32)->@builtin(position) vec4f { return vec4f(0.0); } @fragment fn fsMain()->@location(0) vec4f { return vec4f(0.0); }',
        uniforms: [],
        textures: []
      }],
      compilePlan: () => {
        throw new Error('compile failed')
      }
    })

    const snapshot = runtime.getProfilerSnapshot()
    expect(snapshot.scheduler.routingConfiguredMode).toBe('fragment')
    expect(snapshot.scheduler.routingActiveMode).toBe('fragment')
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
      ['slow', [8.5, 8.4, 8.6]],
      ['best', [4.2, 4.1, 4.0]],
      ['fast', [6.7, 6.6, 6.8]]
    ])

    const profile = tuner.run({
      profileKey: 'gpu-measured',
      policy: 'throughput',
      candidateProfiles: ['slow', 'best', 'fast'],
      warmupTrials: 1,
      sampleTrials: 3,
      measureCandidate: ({ profile, phase, trialIndex }) => {
        if (phase === 'warmup') return 100
        const key = profile
        const samples = measuredByCandidate.get(key) ?? [10]
        return samples[trialIndex] ?? samples[samples.length - 1]
      }
    })

    expect(profile.selectedProfile).toBe('best')
    expect(profile.selectedMeasuredP95Ms).toBeCloseTo(4.1, 5)
  })

  it('reuses fingerprint-scoped autotune profiles in runtime', () => {
    const runtime = createRuntimeHarness('fragment')
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
})
