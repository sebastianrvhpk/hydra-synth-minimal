import { describe, expect, it } from 'vitest'
import type { HydraExecutionPlan } from '../src/core/index.ts'
import { BENCHMARK_CORPUS } from '../src/benchmark/corpus.ts'
import { buildBenchmarkReport, validateBenchmarkReport } from '../src/benchmark/runner.ts'
import { HydraAutotuner } from '../src/runtime/autotune.ts'
import { WebGPUOutputNode } from '../src/runtime/output-node.ts'
import { buildProfilerSnapshot } from '../src/runtime/profiler.ts'
import { HydraBrowserRuntime, normalizeRuntimeExecutionMode } from '../src/runtime/runtime.ts'
import { WebGPURenderer } from '../src/webgpu/renderer.ts'

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
    expect(snapshot.scheduler.routingRouteCount).toBe(0)
    expect(snapshot.scheduler.graphCompileCount).toBe(0)
    expect(snapshot.scheduler.executePlanCount).toBe(0)
    expect(snapshot.passes['o0:passA']?.gpuTimingSource).toBe('unavailable')
    expect(snapshot.passes['o0:passA']?.cpuBreakdown.dynamicUniformEvalMsAvg).toBe(0)
    expect(snapshot.passes['o0:passA']?.counters.bindGroupCacheHits).toBe(0)
  })

  it('coalesces unchanged global uniform writes', () => {
    let writeCount = 0
    const renderer = new WebGPURenderer({
      canvas: { width: 4, height: 4 } as HTMLCanvasElement
    })
    ;(renderer as unknown as {
      ready: boolean
      device: { queue: { writeBuffer: () => void } }
      globalUniformBuffer: GPUBuffer
    }).ready = true
    ;(renderer as unknown as {
      ready: boolean
      device: { queue: { writeBuffer: () => void } }
      globalUniformBuffer: GPUBuffer
    }).device = {
      queue: {
        writeBuffer: () => {
          writeCount += 1
        }
      }
    }
    ;(renderer as unknown as {
      ready: boolean
      device: { queue: { writeBuffer: () => void } }
      globalUniformBuffer: GPUBuffer
    }).globalUniformBuffer = { destroy: () => {} } as unknown as GPUBuffer

    expect(renderer.updateGlobalUniforms({ time: 1, bpm: 120, width: 4, height: 4 })).toBe(true)
    expect(renderer.updateGlobalUniforms({ time: 1, bpm: 120, width: 4, height: 4 })).toBe(false)
    expect(renderer.updateGlobalUniforms({ time: 2, bpm: 120, width: 4, height: 4 })).toBe(true)
    expect(writeCount).toBe(2)

    renderer.setResolution(8, 4)
    expect(renderer.updateGlobalUniforms({ time: 2, bpm: 120, width: 8, height: 4 })).toBe(true)
    expect(writeCount).toBe(3)
    renderer.dispose()
  })

  it('does not infer gpu timing from cpu encode durations', () => {
    const output = new WebGPUOutputNode({ renderer: null, width: 4, height: 4, label: 'timing-audit' })
    ;(output as unknown as {
      recordPassStat: (
        signature: string,
        cpuEncodeMs: number,
        fallbackUsed: boolean,
        variant: 'fragment' | 'compute',
        profile: {
          dynamicUniformEvalMs: number
          dynamicUniformWriteMs: number
          textureResolutionMs: number
          bindGroupMs: number
          renderPassEncodeMs: number
          computePassEncodeMs: number
          globalUniformWrote: boolean
          dynamicUniformWrote: boolean
          dynamicUniformSkipped: boolean
          bindGroupCacheHit: boolean
          bindGroupCreated: boolean
        }
      ) => void
    }).recordPassStat('pass-a', 3.75, false, 'fragment', {
      dynamicUniformEvalMs: 0,
      dynamicUniformWriteMs: 0,
      textureResolutionMs: 0,
      bindGroupMs: 0,
      renderPassEncodeMs: 3.75,
      computePassEncodeMs: 0,
      globalUniformWrote: false,
      dynamicUniformWrote: false,
      dynamicUniformSkipped: false,
      bindGroupCacheHit: false,
      bindGroupCreated: false
    })

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

  it('reuses active pipeline entries and bind groups across stable ticks', () => {
    let pipelineRequests = 0
    let bindGroupCreations = 0
    let dynamicUniformWrites = 0
    const ids = new WeakMap<object, number>()
    let nextId = 1
    const getObjectId = (value: object | null | undefined): number => {
      if (!value) return 0
      const current = ids.get(value)
      if (current) return current
      ids.set(value, nextId)
      nextId += 1
      return nextId - 1
    }
    const texture = () => ({ destroy: () => {} }) as unknown as GPUTexture
    const fallbackTexture = texture()
    const pipeline = {
      getBindGroupLayout: () => ({})
    } as unknown as GPURenderPipeline
    const renderer = {
      ready: true,
      globalUniformBuffer: {} as GPUBuffer,
      device: {
        queue: {
          writeBuffer: () => {
            dynamicUniformWrites += 1
          }
        },
        createBindGroup: () => {
          bindGroupCreations += 1
          return {}
        }
      },
      createDynamicUniformBuffer: () => ({ destroy: () => {} }),
      createOutputTexture: () => texture(),
      getFallbackTexture: () => fallbackTexture,
      getTextureView: () => ({}),
      getSampler: () => null,
      getObjectId,
      updateGlobalUniforms: () => true,
      getOutputPipelineEntry: (signature: string, code: string) => {
        pipelineRequests += 1
        return {
          cacheKey: `${signature}|${code}`,
          signature,
          code,
          pipeline,
          error: null
        }
      }
    }
    const renderPass = {
      setPipeline: () => {},
      setBindGroup: () => {},
      draw: () => {},
      end: () => {}
    }
    const encoder = {
      beginRenderPass: () => renderPass
    }
    const output = new WebGPUOutputNode({
      renderer: renderer as unknown as never,
      width: 4,
      height: 4,
      label: 'stable-hot-path'
    })
    output.render([{
      signature: 'stable-pass',
      wgsl: 'stable-code',
      uniforms: [{
        name: 'amount_0',
        index: 0,
        size: 1,
        type: 'float' as const,
        value: () => 0.5
      }],
      textures: [],
      output: {
        name: 'outImage',
        variableName: 'outImage',
        format: 'rgba16float',
        binding: 0
      }
    }])

    output.tick({ time: 0, bpm: 30, resolution: [4, 4], deltaMs: 16 }, encoder as unknown as GPUCommandEncoder)
    output.tick({ time: 0, bpm: 30, resolution: [4, 4], deltaMs: 16 }, encoder as unknown as GPUCommandEncoder)

    const stats = Object.values(output.getPassStats())[0]
    expect(pipelineRequests).toBe(1)
    expect(bindGroupCreations).toBe(1)
    expect(stats?.bindGroupCacheHits).toBe(1)
    expect(stats?.bindGroupCacheMisses).toBe(1)
    expect(stats?.bindGroupCreationCount).toBe(1)
    expect(stats?.pipelineCacheMissCount).toBe(1)
    expect(dynamicUniformWrites).toBe(1)
    expect(stats?.dynamicUniformWriteCount).toBe(1)
    expect(stats?.dynamicUniformSkipCount).toBe(1)
    output.dispose()
  })

  it('dispatches compute passes with storage output bind groups', () => {
    let computePipelineRequests = 0
    let renderPipelineRequests = 0
    let bindGroupCreations = 0
    let renderPassBegins = 0
    let computePassBegins = 0
    let dispatchArgs: number[] | null = null
    let createdBindGroupEntries: Array<{ binding: number, resource: unknown }> = []
    const ids = new WeakMap<object, number>()
    let nextId = 1
    const getObjectId = (value: object | null | undefined): number => {
      if (!value) return 0
      const current = ids.get(value)
      if (current) return current
      ids.set(value, nextId)
      nextId += 1
      return nextId - 1
    }
    const texture = (label = '') => ({ label, destroy: () => {} }) as unknown as GPUTexture
    const fallbackTexture = texture('fallback')
    const sampler = {} as GPUSampler
    const pipeline = {
      getBindGroupLayout: () => ({})
    } as unknown as GPUComputePipeline
    const renderer = {
      ready: true,
      globalUniformBuffer: {} as GPUBuffer,
      device: {
        queue: {
          writeBuffer: () => {}
        },
        createBindGroup: ({ entries }: { entries: Array<{ binding: number, resource: unknown }> }) => {
          bindGroupCreations += 1
          createdBindGroupEntries = entries
          return {}
        }
      },
      createDynamicUniformBuffer: () => ({ destroy: () => {} }),
      createOutputTexture: ({ label = '' }: { label?: string } = {}) => texture(label),
      getFallbackTexture: () => fallbackTexture,
      getTextureView: (target: GPUTexture) => ({ target }),
      getSampler: () => sampler,
      getObjectId,
      updateGlobalUniforms: () => true,
      getOutputPipelineEntry: () => {
        renderPipelineRequests += 1
        return null
      },
      getOutputComputePipelineEntry: (signature: string, code: string) => {
        computePipelineRequests += 1
        return {
          cacheKey: `${signature}|${code}|compute`,
          signature,
          code,
          pipeline,
          error: null
        }
      }
    }
    const computePass = {
      setPipeline: () => {},
      setBindGroup: () => {},
      dispatchWorkgroups: (x: number, y?: number, z?: number) => {
        dispatchArgs = [x, y ?? 1, z ?? 1]
      },
      end: () => {}
    }
    const encoder = {
      beginRenderPass: () => {
        renderPassBegins += 1
        return {
          setPipeline: () => {},
          setBindGroup: () => {},
          draw: () => {},
          end: () => {}
        }
      },
      beginComputePass: () => {
        computePassBegins += 1
        return computePass
      }
    }
    const output = new WebGPUOutputNode({
      renderer: renderer as unknown as never,
      width: 10,
      height: 9,
      label: 'compute-pass'
    })
    output.render([{
      signature: 'compute-threshold',
      wgsl: 'compute-code',
      variant: 'compute',
      compute: {
        workgroupSize: [8, 8]
      },
      uniforms: [],
      textures: [{
        name: 'prevBuffer',
        variableName: 'prevBuffer',
        getTexture: null,
        isPrev: true,
        binding: 3
      }],
      output: {
        name: 'outImage',
        variableName: 'outImage',
        format: 'rgba16float',
        binding: 4
      }
    }])

    output.tick({ time: 0, bpm: 30, resolution: [10, 9], deltaMs: 16 }, encoder as unknown as GPUCommandEncoder)

    const stats = Object.values(output.getPassStats())[0]
    expect(computePipelineRequests).toBe(1)
    expect(renderPipelineRequests).toBe(0)
    expect(renderPassBegins).toBe(0)
    expect(computePassBegins).toBe(1)
    expect(dispatchArgs).toEqual([2, 2, 1])
    expect(bindGroupCreations).toBe(1)
    expect(createdBindGroupEntries.map((entry) => entry.binding)).toEqual([0, 2, 3, 4])
    expect(stats?.variant).toBe('compute')
    expect(stats?.lastRenderPassEncodeMs).toBe(0)
    expect(stats?.lastComputePassEncodeMs).toBeGreaterThanOrEqual(0)
    output.dispose()
  })

  it('falls back to fragment when a compute-preferred pass cannot use compute', () => {
    let renderPipelineRequests = 0
    let renderPassBegins = 0
    let computePassBegins = 0
    const texture = () => ({ destroy: () => {} }) as unknown as GPUTexture
    const fallbackTexture = texture()
    const pipeline = {
      getBindGroupLayout: () => ({})
    } as unknown as GPURenderPipeline
    const renderer = {
      ready: true,
      globalUniformBuffer: {} as GPUBuffer,
      device: {
        queue: { writeBuffer: () => {} },
        createBindGroup: () => ({})
      },
      createDynamicUniformBuffer: () => ({ destroy: () => {} }),
      createOutputTexture: () => texture(),
      getFallbackTexture: () => fallbackTexture,
      getTextureView: () => ({}),
      getSampler: () => null,
      getObjectId: () => 1,
      updateGlobalUniforms: () => true,
      supportsComputePasses: () => false,
      getOutputPipelineEntry: (signature: string, code: string) => {
        renderPipelineRequests += 1
        return {
          cacheKey: `${signature}|${code}|fragment`,
          signature,
          code,
          pipeline,
          error: null
        }
      }
    }
    const encoder = {
      beginRenderPass: () => {
        renderPassBegins += 1
        return {
          setPipeline: () => {},
          setBindGroup: () => {},
          draw: () => {},
          end: () => {}
        }
      },
      beginComputePass: () => {
        computePassBegins += 1
        return {
          setPipeline: () => {},
          setBindGroup: () => {},
          dispatchWorkgroups: () => {},
          end: () => {}
        }
      }
    }
    const output = new WebGPUOutputNode({
      renderer: renderer as unknown as never,
      width: 4,
      height: 4,
      label: 'compute-fallback'
    })
    output.render([{
      signature: 'compute-pass',
      wgsl: 'compute-code',
      variant: 'compute',
      compute: { workgroupSize: [8, 8] },
      uniforms: [],
      textures: [],
      output: {
        name: 'outImage',
        variableName: 'outImage',
        format: 'rgba16float',
        binding: 3
      },
      fallback: {
        signature: 'fragment-pass',
        wgsl: 'fragment-code',
        variant: 'fragment',
        uniforms: [],
        textures: [],
        output: {
          name: 'outImage',
          variableName: 'outImage',
          format: 'rgba16float',
          binding: 0
        }
      }
    }])

    output.tick({ time: 0, bpm: 30, resolution: [4, 4], deltaMs: 16 }, encoder as unknown as GPUCommandEncoder)

    const stats = output.getPassStats()
    expect(renderPipelineRequests).toBe(1)
    expect(renderPassBegins).toBe(1)
    expect(computePassBegins).toBe(0)
    expect(stats['compute-pass']?.computeAttemptCount).toBe(1)
    expect(stats['compute-pass']?.computeFallbackCount).toBe(1)
    expect(stats['fragment-pass']?.fallbackCount).toBe(1)
    expect(stats['fragment-pass']?.variant).toBe('fragment')
    output.dispose()
  })

  it('attaches timestamp writes when renderer timing is available', () => {
    let renderPassDescriptor: { timestampWrites?: unknown } | null = null
    let timingCallback: ((gpuMs: number) => void) | null = null
    const texture = () => ({ destroy: () => {} }) as unknown as GPUTexture
    const fallbackTexture = texture()
    const pipeline = {
      getBindGroupLayout: () => ({})
    } as unknown as GPURenderPipeline
    const renderer = {
      ready: true,
      globalUniformBuffer: {} as GPUBuffer,
      device: {
        queue: { writeBuffer: () => {} },
        createBindGroup: () => ({})
      },
      createDynamicUniformBuffer: () => ({ destroy: () => {} }),
      createOutputTexture: () => texture(),
      getFallbackTexture: () => fallbackTexture,
      getTextureView: () => ({}),
      getSampler: () => null,
      getObjectId: () => 1,
      updateGlobalUniforms: () => true,
      allocatePassTiming: (callback: (gpuMs: number) => void) => {
        timingCallback = callback
        return {
          timestampWrites: {
            querySet: {},
            beginningOfPassWriteIndex: 0,
            endOfPassWriteIndex: 1
          }
        }
      },
      getOutputPipelineEntry: (signature: string, code: string) => ({
        cacheKey: `${signature}|${code}`,
        signature,
        code,
        pipeline,
        error: null
      })
    }
    const encoder = {
      beginRenderPass: (descriptor: { timestampWrites?: unknown }) => {
        renderPassDescriptor = descriptor
        return {
          setPipeline: () => {},
          setBindGroup: () => {},
          draw: () => {},
          end: () => {}
        }
      }
    }
    const output = new WebGPUOutputNode({
      renderer: renderer as unknown as never,
      width: 4,
      height: 4,
      label: 'timed-pass'
    })
    output.render([{
      signature: 'timed-fragment',
      wgsl: 'fragment-code',
      variant: 'fragment',
      uniforms: [],
      textures: [],
      output: {
        name: 'outImage',
        variableName: 'outImage',
        format: 'rgba16float',
        binding: 0
      }
    }])

    output.tick({ time: 0, bpm: 30, resolution: [4, 4], deltaMs: 16 }, encoder as unknown as GPUCommandEncoder)
    if (!timingCallback) throw new Error('Expected timing callback to be captured.')
    timingCallback(0.42)

    const stats = output.getPassStats()['timed-fragment']
    expect(renderPassDescriptor?.timestampWrites).toBeTruthy()
    expect(stats?.timestampQueryCount).toBe(1)
    expect(stats?.gpuTimingSampleCount).toBe(1)
    expect(stats?.lastGpuMs).toBeCloseTo(0.42, 5)
    expect(stats?.gpuTimingSource).toBe('timestamp_query')
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

  it('allocates a transient write texture when all ping-pong targets are sampled', () => {
    const createdTextures: Array<{ label?: string, destroy: () => void }> = []
    const renderer = {
      ready: true,
      createOutputTexture: ({ label = '' }: { label?: string } = {}) => {
        const texture = { label, destroy: () => {} }
        createdTextures.push(texture)
        return texture
      }
    }
    const output = new WebGPUOutputNode({
      renderer: renderer as unknown as never,
      width: 4,
      height: 4,
      label: 'sample-write-conflict'
    })
    const candidateWrite = {} as GPUTexture
    const sampledTextures = [candidateWrite, {} as GPUTexture]

    const conflicts = (output as unknown as {
      isTextureBeingSampled: (texture: GPUTexture | null, sampledTextures: Array<GPUTexture | null>) => boolean
    }).isTextureBeingSampled(candidateWrite, sampledTextures)
    const transient = (output as unknown as {
      getOrCreateTransientWriteTexture: (
        width: number,
        height: number,
        avoidTextures?: Array<GPUTexture | null>
      ) => GPUTexture | null
    }).getOrCreateTransientWriteTexture(4, 4)

    expect(conflicts).toBe(true)
    expect(transient).not.toBe(candidateWrite)
    expect(createdTextures[0]?.label).toBe('sample-write-conflict-transient-write-4x4-0')
    output.dispose()
  })

  it('protects internally referenced pass outputs from later writes', () => {
    const output = new WebGPUOutputNode({
      renderer: null,
      width: 4,
      height: 4,
      label: 'internal-pass-lifetime'
    })
    const blurredColorTexture = {} as GPUTexture
    const laterFieldTexture = {} as GPUTexture

    ;(output as unknown as {
      passOutputHistory: Array<GPUTexture | null>
    }).passOutputHistory = [
      null,
      blurredColorTexture,
      null,
      laterFieldTexture
    ]

    const makePass = (internalPassIndex?: number) => ({
      signature: `pass-${internalPassIndex ?? 'none'}`,
      wgsl: '',
      uniforms: [],
      textures: typeof internalPassIndex === 'number'
        ? [{
            name: 'tex',
            variableName: 'hydraTexture0',
            getTexture: null,
            isPrev: false,
            sourceRef: { internalPassIndex },
            binding: 3
          }]
        : []
    })

    const passes = [
      makePass(),
      makePass(),
      makePass(),
      makePass(),
      makePass(3),
      makePass(1)
    ]

    const lastUse = (output as unknown as {
      getInternalPassLastUseByIndex: (passes: typeof passes) => Map<number, number>
    }).getInternalPassLastUseByIndex(passes)
    const protectedAtPass3 = (output as unknown as {
      getProtectedPassOutputTextures: (
        passIndex: number,
        lastUseByIndex: Map<number, number>
      ) => Array<GPUTexture | null>
    }).getProtectedPassOutputTextures(3, lastUse)

    expect(lastUse.get(1)).toBe(5)
    expect(lastUse.get(3)).toBe(4)
    expect(protectedAtPass3).toContain(blurredColorTexture)
    expect(protectedAtPass3).not.toContain(laterFieldTexture)
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

  it('grows output buffers on demand without changing the default four outputs', () => {
    const runtime = createRuntimeHarness()

    expect(runtime.outputs).toHaveLength(4)
    expect(runtime.synth.o4).toBeUndefined()

    const output = runtime.ensureOutput(6)

    expect(runtime.outputs).toHaveLength(7)
    expect(output).toBe(runtime.outputs[6])
    expect(output.id).toBe(6)
    expect(output.label).toBe('o6')
    expect(runtime.synth.o6).toBe(output)
    expect(runtime.ensureOutput(2)).toBe(runtime.outputs[2])
    expect(runtime.outputs).toHaveLength(7)

    const nextOutput = runtime.createOutput()
    expect(nextOutput.label).toBe('o7')
    expect(runtime.synth.o7).toBe(nextOutput)
    expect(runtime.outputs).toHaveLength(8)

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
    expect(snapshot.scheduler.routingRouteCount).toBe(1)
    expect(snapshot.scheduler.graphCompileCount).toBe(1)
    expect(snapshot.scheduler.executePlanCount).toBe(1)
    runtime.dispose()
  })

  it('does not reroute or compile stable graph structure during frame ticks', async () => {
    const runtime = createRuntimeHarness('fragment')
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
      executePlan: () => ({
        submittedPasses: 0,
        scheduledBarriers: 0,
        allocatedResourceCount: 0
      }),
      getResidentByteEstimate: () => 0,
      getResidencySnapshot: () => null,
      dispose: () => {}
    }
    await runtime.init()

    const output = runtime.outputs[0]
    if (!output) throw new Error('Missing runtime output.')
    output.renderGraph({
      transforms: [],
      compilePasses: () => [],
      compilePlan: () => createMinimalExecutionPlan()
    })

    const beforeTicks = runtime.getProfilerSnapshot().scheduler
    runtime.tick(16)
    runtime.tick(16)
    runtime.tick(16)
    const afterTicks = runtime.getProfilerSnapshot().scheduler

    expect(afterTicks.routingRouteCount).toBe(beforeTicks.routingRouteCount)
    expect(afterTicks.graphCompileCount).toBe(beforeTicks.graphCompileCount)
    expect(afterTicks.executePlanCount).toBe(beforeTicks.executePlanCount)
    expect(afterTicks.routingCompileFailures).toBe(0)
    expect(afterTicks.routingRouteFailureCount).toBe(0)
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
