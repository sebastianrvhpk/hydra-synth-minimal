import { describe, expect, it } from 'vitest'
import type { HydraCompiledPass } from 'hydra-synth-core'
import { WebGPUOutputNode } from '../src/runtime/output-node.ts'

interface DispatchLogEntry {
  pipelineId: string
  bindGroup: unknown
  mode: 'direct' | 'indirect'
  indirectBuffer?: unknown
}

const createTestEncoder = (
  dispatches: DispatchLogEntry[],
  options: {
    onCopyTextureToTexture?: () => void
    onCopyTextureToBuffer?: (copySize: GPUExtent3D) => void
  } = {}
): GPUCommandEncoder => ({
  beginComputePass: () => {
    let currentPipeline: { id: string } | null = null
    let currentBindGroup: unknown = null
    return {
      setPipeline: (pipeline: { id: string }) => {
        currentPipeline = pipeline
      },
      setBindGroup: (_index: number, bindGroup: unknown) => {
        currentBindGroup = bindGroup
      },
      dispatchWorkgroups: () => {
        dispatches.push({
          pipelineId: currentPipeline?.id ?? 'unknown',
          bindGroup: currentBindGroup,
          mode: 'direct'
        })
      },
      dispatchWorkgroupsIndirect: (indirectBuffer: unknown) => {
        dispatches.push({
          pipelineId: currentPipeline?.id ?? 'unknown',
          bindGroup: currentBindGroup,
          mode: 'indirect',
          indirectBuffer
        })
      },
      end: () => {}
    }
  },
  copyTextureToTexture: () => {
    options.onCopyTextureToTexture?.()
  },
  copyTextureToBuffer: (
    _source: GPUImageCopyTexture,
    _destination: GPUImageCopyBuffer,
    copySize: GPUExtent3D
  ) => {
    options.onCopyTextureToBuffer?.(copySize)
  }
}) as unknown as GPUCommandEncoder

const createRendererMock = (options: {
  onCreateOutputTexture?: (args: {
    width?: number
    height?: number
    depthOrArrayLayers?: number
    label?: string
    format?: string
    includeRenderAttachment?: boolean
  }) => void
  onTextureView?: (dimension: GPUTextureViewDimension) => void
  onCreateBindGroup?: () => void
  onCreateReadbackBuffer?: (byteLength: number) => void
  getOutputPipelineEntry?: (signature: string, code: string) => {
    cacheKey: string
    pipeline: { id: string, getBindGroupLayout: () => unknown } | null
    error: unknown
  }
} = {}): unknown => {
  let textureCounter = 0
  const fallbackTexture = { id: 'fallback', destroy: () => {} } as unknown as GPUTexture
  const objectIds = new WeakMap<object, number>()
  let nextObjectId = 1

  const getObjectId = (value: object | null | undefined): number => {
    if (!value) return 0
    const existing = objectIds.get(value)
    if (existing) return existing
    objectIds.set(value, nextObjectId)
    nextObjectId += 1
    return nextObjectId - 1
  }

  return {
    ready: true,
    capabilities: {
      compute: {
        maxComputeInvocationsPerWorkgroup: 256,
        maxComputeWorkgroupStorageSize: 65536,
        maxComputeWorkgroupSizeX: 256,
        maxComputeWorkgroupSizeY: 256,
        maxComputeWorkgroupSizeZ: 64
      }
    },
    globalUniformBuffer: { id: 'globals' },
    linearSampler: { id: 'sampler' },
    device: {
      queue: {
        writeBuffer: () => {}
      },
      createBindGroup: ({ entries }: { entries: unknown[] }) => {
        options.onCreateBindGroup?.()
        return { entries }
      }
    },
    createOutputTexture: (args: {
      width?: number
      height?: number
      depthOrArrayLayers?: number
      label?: string
      format?: string
      includeRenderAttachment?: boolean
    }) => {
      options.onCreateOutputTexture?.(args)
      const id = `tex-${textureCounter}`
      textureCounter += 1
      return { id, destroy: () => {} } as unknown as GPUTexture
    },
    createDynamicUniformBuffer: () => ({ destroy: () => {} } as unknown as GPUBuffer),
    createStorageBuffer: () => ({ destroy: () => {} } as unknown as GPUBuffer),
    createIndirectDispatchBuffer: () => ({ destroy: () => {} } as unknown as GPUBuffer),
    createReadbackBuffer: (_label: string, byteLength: number) => {
      options.onCreateReadbackBuffer?.(byteLength)
      return ({
      destroy: () => {},
      mapAsync: async () => {},
      getMappedRange: () => new Uint8Array(256).buffer,
      unmap: () => {}
      } as unknown as GPUBuffer)
    },
    updateGlobalUniforms: () => {},
    getOutputPipelineEntry: (signature: string, code: string) => {
      if (options.getOutputPipelineEntry) return options.getOutputPipelineEntry(signature, code)
      return ({
        cacheKey: signature,
        pipeline: {
          id: signature,
          getBindGroupLayout: () => ({})
        },
        error: null
      })
    },
    getFallbackTexture: () => fallbackTexture,
    getFallbackStorageTexture: () => fallbackTexture,
    getTextureView: (_texture: GPUTexture, dimension: GPUTextureViewDimension = '2d') => {
      options.onTextureView?.(dimension)
      return { texture: _texture, dimension }
    },
    getObjectId
  }
}

describe('WebGPUOutputNode texture exposure', () => {
  it('returns the latest completed frame texture from getTexture()', () => {
    const node = new WebGPUOutputNode({
      renderer: null,
      width: 1,
      height: 1,
      label: 'o0'
    })

    const textureA = { id: 'a' } as unknown as GPUTexture
    const textureB = { id: 'b' } as unknown as GPUTexture
    ;(node as unknown as { textures: Array<GPUTexture | null> }).textures = [textureA, textureB]

    ;(node as unknown as { pingPongIndex: number }).pingPongIndex = 0
    expect(node.getCurrent()).toBe(textureA)
    expect(node.getTexture()).toBe(textureA)

    ;(node as unknown as { pingPongIndex: number }).pingPongIndex = 1
    expect(node.getCurrent()).toBe(textureB)
    expect(node.getTexture()).toBe(textureB)
  })

  it('stores full pass arrays for multipass rendering', () => {
    const node = new WebGPUOutputNode({
      renderer: null,
      width: 1,
      height: 1,
      label: 'o0'
    })

    const passA: HydraCompiledPass = {
      signature: 'a',
      wgsl: 'A',
      uniforms: [],
      textures: []
    }
    const passB: HydraCompiledPass = {
      signature: 'b',
      wgsl: 'B',
      uniforms: [],
      textures: []
    }

    node.render([passA, passB])

    expect((node as unknown as { pendingPasses: HydraCompiledPass[] | null }).pendingPasses).toEqual([passA, passB])
  })

  it('extracts output dependencies from pass texture source references', () => {
    const node = new WebGPUOutputNode({
      renderer: null,
      width: 1,
      height: 1,
      label: 'o1'
    })
    node.id = 1

    const pass: HydraCompiledPass = {
      signature: 'deps',
      wgsl: 'deps',
      uniforms: [],
      textures: [
        {
          name: 'texA',
          variableName: 'hydraTexture0',
          getTexture: () => null,
          isPrev: false,
          sourceRef: { id: 0 },
          binding: 3
        },
        {
          name: 'texB',
          variableName: 'hydraTexture1',
          getTexture: () => null,
          isPrev: false,
          sourceRef: { id: 2 },
          binding: 4
        }
      ]
    }

    node.render([pass])

    expect(node.getDependencyOutputIds()).toEqual([0, 2])
  })

  it('extracts output dependencies from storage texture source references', () => {
    const node = new WebGPUOutputNode({
      renderer: null,
      width: 1,
      height: 1,
      label: 'o3'
    })
    node.id = 3

    const pass: HydraCompiledPass = {
      signature: 'deps-storage',
      wgsl: 'deps-storage',
      uniforms: [],
      textures: [],
      storageTextures: [
        {
          name: 'trailBuffer',
          variableName: 'trailBuffer',
          getTexture: () => null,
          access: 'read_write',
          format: 'rgba8unorm',
          dimension: '2d',
          lifetime: 'persistent',
          stateKey: 'trail-buffer',
          sourceRef: { id: 1 },
          binding: 3
        }
      ]
    }

    node.render([pass])

    expect(node.getDependencyOutputIds()).toEqual([1])
  })

  it('uses fallback pass when workgroup storage requirements exceed capabilities', () => {
    const fallbackPass: HydraCompiledPass = {
      signature: 'fallback',
      wgsl: 'fallback',
      uniforms: [],
      textures: []
    }

    const pass: HydraCompiledPass = {
      signature: 'primary',
      wgsl: 'primary',
      uniforms: [],
      textures: [],
      dispatch: {
        mode: 'direct',
        workgroupSize: [128, 1, 1],
        requiredWorkgroupStorageBytes: 4096
      },
      fallbackPass
    }

    const renderer = {
      ready: true,
      capabilities: {
        compute: {
          maxComputeInvocationsPerWorkgroup: 256,
          maxComputeWorkgroupStorageSize: 2048,
          maxComputeWorkgroupSizeX: 256,
          maxComputeWorkgroupSizeY: 256,
          maxComputeWorkgroupSizeZ: 64
        }
      },
      getOutputPipelineEntry: (signature: string, code: string) => ({
        cacheKey: signature,
        signature,
        code,
        pipeline: { id: signature },
        error: null
      })
    } as unknown as {
      ready: boolean
      capabilities: { compute: { maxComputeWorkgroupStorageSize: number } }
      getOutputPipelineEntry: (signature: string, code: string) => unknown
    }

    const node = new WebGPUOutputNode({
      renderer: renderer as never,
      width: 1,
      height: 1,
      label: 'o4'
    })

    node.render([pass])
    const resolved = (node as unknown as { resolvePasses: () => Array<{ pass: HydraCompiledPass }> | null }).resolvePasses()
    expect(resolved?.[0]?.pass.signature).toBe('fallback')
  })

  it('uses fallback pass when primary pipeline compilation fails', () => {
    const fallbackPass: HydraCompiledPass = {
      signature: 'fallback',
      wgsl: 'fallback',
      uniforms: [],
      textures: []
    }

    const pass: HydraCompiledPass = {
      signature: 'primary',
      wgsl: 'primary',
      uniforms: [],
      textures: [],
      fallbackPass
    }

    const renderer = {
      ready: true,
      capabilities: {
        compute: {
          maxComputeInvocationsPerWorkgroup: 256,
          maxComputeWorkgroupStorageSize: 65536,
          maxComputeWorkgroupSizeX: 256,
          maxComputeWorkgroupSizeY: 256,
          maxComputeWorkgroupSizeZ: 64
        }
      },
      getOutputPipelineEntry: (signature: string, code: string) => {
        if (signature === 'primary') {
          return {
            cacheKey: signature,
            signature,
            code,
            pipeline: null,
            error: new Error('compile failed')
          }
        }
        return {
          cacheKey: signature,
          signature,
          code,
          pipeline: { id: signature },
          error: null
        }
      }
    } as unknown as {
      ready: boolean
      capabilities: { compute: { maxComputeWorkgroupStorageSize: number } }
      getOutputPipelineEntry: (signature: string, code: string) => unknown
    }

    const node = new WebGPUOutputNode({
      renderer: renderer as never,
      width: 1,
      height: 1,
      label: 'o5'
    })

    node.render([pass])
    const resolved = (node as unknown as { resolvePasses: () => Array<{ pass: HydraCompiledPass }> | null }).resolvePasses()
    expect(resolved?.[0]?.pass.signature).toBe('fallback')
  })

  it('reuses pass history textures when sparse passes are skipped', () => {
    const renderer = createRendererMock()
    const node = new WebGPUOutputNode({
      renderer: renderer as never,
      width: 2,
      height: 2,
      label: 'o6'
    })

    const passA: HydraCompiledPass = {
      signature: 'A',
      wgsl: '@compute @workgroup_size(1, 1, 1) fn csMain() {}',
      uniforms: [],
      textures: [],
      dispatch: {
        mode: 'direct',
        workgroupSize: [1, 1, 1]
      },
      schedule: {
        resolutionScale: 1,
        updateRate: { everyNFrames: 2 },
        sparse: false
      }
    }

    const passB: HydraCompiledPass = {
      signature: 'B',
      wgsl: '@compute @workgroup_size(1, 1, 1) fn csMain() {}',
      uniforms: [],
      textures: [
        {
          name: 'prevBuffer',
          variableName: 'prevBuffer',
          getTexture: null,
          isPrev: true,
          binding: 3
        }
      ],
      dispatch: {
        mode: 'direct',
        workgroupSize: [1, 1, 1]
      },
      schedule: {
        resolutionScale: 1,
        updateRate: 'everyFrame',
        sparse: false
      }
    }

    node.render([passA, passB])
    const dispatches: DispatchLogEntry[] = []
    const encoder = createTestEncoder(dispatches)
    const frame = { time: 0, bpm: 120, resolution: [2, 2], deltaMs: 16 } as unknown as Parameters<WebGPUOutputNode['tick']>[0]

    node.tick(frame, encoder)
    node.tick({ ...frame, time: 0.016 }, encoder)

    expect(dispatches.map((entry) => entry.pipelineId)).toEqual(['A', 'B', 'B'])

    const historyTexture = (node as unknown as { passOutputHistory: Array<GPUTexture | null> }).passOutputHistory[0]
    const secondPassSecondFrame = dispatches[2].bindGroup as { entries: Array<{ binding: number, resource: { texture: GPUTexture } }> }
    const sampledEntry = secondPassSecondFrame.entries.find((entry) => entry.binding === 3)
    expect(sampledEntry?.resource.texture).toBe(historyTexture)
  })

  it('binds storageTexture2DArray resources with 2d-array views', () => {
    const createdTextureArgs: Array<{ depthOrArrayLayers?: number, includeRenderAttachment?: boolean }> = []
    const textureViewDimensions: GPUTextureViewDimension[] = []
    const renderer = createRendererMock({
      onCreateOutputTexture: (args) => {
        createdTextureArgs.push({
          depthOrArrayLayers: args.depthOrArrayLayers,
          includeRenderAttachment: args.includeRenderAttachment
        })
      },
      onTextureView: (dimension) => {
        textureViewDimensions.push(dimension)
      }
    })

    const node = new WebGPUOutputNode({
      renderer: renderer as never,
      width: 2,
      height: 2,
      label: 'o7'
    })

    const pass: HydraCompiledPass = {
      signature: 'array-storage',
      wgsl: '@compute @workgroup_size(1, 1, 1) fn csMain() {}',
      uniforms: [],
      textures: [],
      storageTextures: [
        {
          name: 'trailArray',
          variableName: 'trailArray',
          getTexture: null,
          access: 'read_write',
          format: 'rgba8unorm',
          dimension: '2d_array',
          lifetime: 'frame',
          binding: 3
        }
      ],
      output: {
        name: 'outImage',
        variableName: 'outImage',
        format: 'rgba8unorm',
        binding: 4
      },
      dispatch: {
        mode: 'direct',
        workgroupSize: [1, 1, 1]
      }
    }

    node.render([pass])
    const dispatches: DispatchLogEntry[] = []
    node.tick(
      { time: 0, bpm: 120, resolution: [2, 2], deltaMs: 16 } as unknown as Parameters<WebGPUOutputNode['tick']>[0],
      createTestEncoder(dispatches)
    )

    expect(dispatches.length).toBe(1)
    expect(createdTextureArgs.some((entry) =>
      entry.depthOrArrayLayers === 1 && entry.includeRenderAttachment === false
    )).toBe(true)
    expect(textureViewDimensions.includes('2d-array')).toBe(true)
  })

  it('reuses cached bind groups across ping-pong output textures', () => {
    let bindGroupCreations = 0
    const pipelines = new Map<string, { id: string, getBindGroupLayout: () => unknown }>()
    const renderer = createRendererMock({
      onCreateBindGroup: () => {
        bindGroupCreations += 1
      },
      getOutputPipelineEntry: (signature) => {
        let pipeline = pipelines.get(signature)
        if (!pipeline) {
          pipeline = {
            id: signature,
            getBindGroupLayout: () => ({})
          }
          pipelines.set(signature, pipeline)
        }
        return {
          cacheKey: signature,
          pipeline,
          error: null
        }
      }
    })

    const node = new WebGPUOutputNode({
      renderer: renderer as never,
      width: 2,
      height: 2,
      label: 'o-cache'
    })

    const pass: HydraCompiledPass = {
      signature: 'bind-group-cache-pass',
      wgsl: '@compute @workgroup_size(1, 1, 1) fn csMain() {}',
      uniforms: [],
      textures: [],
      dispatch: {
        mode: 'direct',
        workgroupSize: [1, 1, 1]
      }
    }

    node.render([pass])
    const dispatches: DispatchLogEntry[] = []
    const frame = { time: 0, bpm: 120, resolution: [2, 2], deltaMs: 16 } as unknown as Parameters<WebGPUOutputNode['tick']>[0]
    node.tick(frame, createTestEncoder(dispatches))
    node.tick({ ...frame, time: 0.016 }, createTestEncoder(dispatches))
    node.tick({ ...frame, time: 0.032 }, createTestEncoder(dispatches))

    expect(dispatches).toHaveLength(3)
    expect(bindGroupCreations).toBe(2)
  })

  it('falls back when required GPU features are unavailable', () => {
    const fallbackPass: HydraCompiledPass = {
      signature: 'fallback-feature',
      wgsl: 'fallback',
      uniforms: [],
      textures: []
    }

    const primaryPass: HydraCompiledPass = {
      signature: 'primary-feature',
      wgsl: 'primary',
      uniforms: [],
      textures: [],
      dispatch: {
        mode: 'direct',
        workgroupSize: [16, 16, 1],
        requiredFeatures: ['subgroups']
      },
      fallbackPass
    }

    const renderer = {
      ready: true,
      capabilities: {
        compute: {
          maxComputeInvocationsPerWorkgroup: 256,
          maxComputeWorkgroupStorageSize: 65536,
          maxComputeWorkgroupSizeX: 256,
          maxComputeWorkgroupSizeY: 256,
          maxComputeWorkgroupSizeZ: 64
        },
        features: []
      },
      getOutputPipelineEntry: (signature: string, code: string) => ({
        cacheKey: signature,
        signature,
        code,
        pipeline: { id: signature },
        error: null
      })
    } as unknown as {
      ready: boolean
      capabilities: {
        compute: { maxComputeWorkgroupStorageSize: number }
        features: string[]
      }
      getOutputPipelineEntry: (signature: string, code: string) => unknown
    }

    const node = new WebGPUOutputNode({
      renderer: renderer as never,
      width: 1,
      height: 1,
      label: 'o8'
    })

    node.render([primaryPass])
    const resolved = (node as unknown as { resolvePasses: () => Array<{ pass: HydraCompiledPass }> | null }).resolvePasses()
    expect(resolved?.[0]?.pass.signature).toBe('fallback-feature')
  })

  it('allocates and reuses internal indirect dispatch buffers when dimensions are stable', () => {
    const renderer = createRendererMock() as unknown as {
      device: { queue: { writeBuffer: (buffer: GPUBuffer, offset: number, data: Uint32Array) => void } }
      createIndirectDispatchBuffer: (label: string) => GPUBuffer
    } & ReturnType<typeof createRendererMock>

    const indirectBuffer = { id: 'internal-indirect', destroy: () => {} } as unknown as GPUBuffer
    const writes: number[][] = []
    renderer.createIndirectDispatchBuffer = () => indirectBuffer
    renderer.device.queue.writeBuffer = (_buffer: GPUBuffer, _offset: number, data: Uint32Array) => {
      writes.push(Array.from(data))
    }

    const node = new WebGPUOutputNode({
      renderer: renderer as never,
      width: 2,
      height: 2,
      label: 'o9'
    })

    const pass: HydraCompiledPass = {
      signature: 'indirect-pass',
      wgsl: '@compute @workgroup_size(1, 1, 1) fn csMain() {}',
      uniforms: [],
      textures: [],
      dispatch: {
        mode: 'indirect',
        workgroupSize: [1, 1, 1]
      }
    }

    node.render([pass])
    const dispatches: DispatchLogEntry[] = []
    node.tick(
      { time: 0, bpm: 120, resolution: [2, 2], deltaMs: 16 } as unknown as Parameters<WebGPUOutputNode['tick']>[0],
      createTestEncoder(dispatches)
    )
    node.tick(
      { time: 0.016, bpm: 120, resolution: [2, 2], deltaMs: 16 } as unknown as Parameters<WebGPUOutputNode['tick']>[0],
      createTestEncoder(dispatches)
    )
    node.resize(4, 2)
    node.tick(
      { time: 0.032, bpm: 120, resolution: [4, 2], deltaMs: 16 } as unknown as Parameters<WebGPUOutputNode['tick']>[0],
      createTestEncoder(dispatches)
    )

    expect(dispatches).toHaveLength(3)
    expect(dispatches[0].mode).toBe('indirect')
    expect(dispatches[0].indirectBuffer).toBe(indirectBuffer)
    expect(writes[0]).toEqual([2, 2, 1])
    expect(writes).toHaveLength(2)
    expect(writes[1]).toEqual([4, 2, 1])
  })

  it('resolves prevN-style history texture bindings from frame history', () => {
    const renderer = createRendererMock()
    const node = new WebGPUOutputNode({
      renderer: renderer as never,
      width: 2,
      height: 2,
      label: 'o10'
    })

    const passA: HydraCompiledPass = {
      signature: 'base-history',
      wgsl: '@compute @workgroup_size(1, 1, 1) fn csMain() {}',
      uniforms: [],
      textures: [],
      dispatch: {
        mode: 'direct',
        workgroupSize: [1, 1, 1]
      }
    }

    const passB: HydraCompiledPass = {
      signature: 'sample-history',
      wgsl: '@compute @workgroup_size(1, 1, 1) fn csMain() {}',
      uniforms: [],
      textures: [
        {
          name: 'historyTex',
          variableName: 'historyTex',
          getTexture: () => null,
          isPrev: false,
          sourceRef: { historyOffset: 1 },
          binding: 3
        }
      ],
      dispatch: {
        mode: 'direct',
        workgroupSize: [1, 1, 1]
      }
    }

    node.render([passA, passB])
    const dispatches: DispatchLogEntry[] = []
    let historyCopies = 0
    const encoder = createTestEncoder(dispatches, {
      onCopyTextureToTexture: () => {
        historyCopies += 1
      }
    })
    const frame = { time: 0, bpm: 120, resolution: [2, 2], deltaMs: 16 } as unknown as Parameters<WebGPUOutputNode['tick']>[0]

    node.tick(frame, encoder)
    node.tick({ ...frame, time: 0.016 }, encoder)

    expect(dispatches.map((entry) => entry.pipelineId)).toEqual([
      'base-history',
      'sample-history',
      'base-history',
      'sample-history'
    ])
    expect(historyCopies).toBeGreaterThan(0)

    const sampledBindGroup = dispatches[3].bindGroup as { entries: Array<{ binding: number, resource: { texture: GPUTexture } }> }
    const sampledEntry = sampledBindGroup.entries.find((entry) => entry.binding === 3)
    const historyTexture = (node as unknown as { historyTextures: Array<GPUTexture | null> }).historyTextures[0]
    expect(sampledEntry?.resource.texture).toBe(historyTexture)
  })

  it('reduces analysis readback textures to 1x1 on-GPU before CPU mapping', () => {
    const readbackSizes: number[] = []
    const copySizes: Array<{ width: number, height: number }> = []
    const renderer = createRendererMock({
      onCreateReadbackBuffer: (size) => {
        readbackSizes.push(size)
      }
    })
    const node = new WebGPUOutputNode({
      renderer: renderer as never,
      width: 4,
      height: 4,
      label: 'o12'
    })

    const analysisPass: HydraCompiledPass = {
      signature: 'analysis-reduce-pass',
      wgsl: '@compute @workgroup_size(1, 1, 1) fn csMain() {}',
      uniforms: [],
      textures: [],
      analysisOut: [{ uniformName: 'analysis_luma', type: 'float' }],
      dispatch: {
        mode: 'direct',
        workgroupSize: [1, 1, 1]
      }
    }

    node.render([analysisPass])
    const dispatches: DispatchLogEntry[] = []
    node.tick(
      { time: 0, bpm: 120, resolution: [4, 4], deltaMs: 16 } as unknown as Parameters<WebGPUOutputNode['tick']>[0],
      createTestEncoder(dispatches, {
        onCopyTextureToBuffer: (copySize) => {
          copySizes.push({ width: Number(copySize.width), height: Number(copySize.height) })
        }
      })
    )

    expect(dispatches.map((entry) => entry.pipelineId)).toContain('__hydra-analysis-reduction-v1')
    expect(copySizes[0]).toEqual({ width: 1, height: 1 })
    expect(readbackSizes[0]).toBe(256)
  })

  it('feeds analysis readback averages into subsequent frame analysis state', async () => {
    const renderer = createRendererMock() as unknown as ReturnType<typeof createRendererMock> & {
      createReadbackBuffer: (label: string, byteLength: number) => GPUBuffer
    }
    const packed = new Uint8Array(256)
    packed[0] = 255
    packed[1] = 0
    packed[2] = 0
    packed[3] = 255
    renderer.createReadbackBuffer = () => ({
      destroy: () => {},
      mapAsync: async () => {},
      getMappedRange: () => packed.buffer,
      unmap: () => {}
    } as unknown as GPUBuffer)

    const node = new WebGPUOutputNode({
      renderer: renderer as never,
      width: 1,
      height: 1,
      label: 'o11'
    })

    const analysisPass: HydraCompiledPass = {
      signature: 'analysis-pass',
      wgsl: '@compute @workgroup_size(1, 1, 1) fn csMain() {}',
      uniforms: [],
      textures: [],
      analysisOut: [{ uniformName: 'analysis_luma', type: 'float' }],
      dispatch: {
        mode: 'direct',
        workgroupSize: [1, 1, 1]
      }
    }

    node.render([analysisPass])
    const dispatches: DispatchLogEntry[] = []
    node.tick(
      { time: 0, bpm: 120, resolution: [1, 1], deltaMs: 16 } as unknown as Parameters<WebGPUOutputNode['tick']>[0],
      createTestEncoder(dispatches)
    )

    await Promise.resolve()
    await Promise.resolve()

    const frame = { time: 0.016, bpm: 120, resolution: [1, 1], deltaMs: 16, analysis: {} } as unknown as Parameters<WebGPUOutputNode['tick']>[0]
    node.tick(frame, createTestEncoder(dispatches))

    const luma = (frame.analysis as Record<string, number | number[]>)?.analysis_luma
    expect(typeof luma).toBe('number')
    expect(luma as number).toBeGreaterThan(0.2)
    expect(luma as number).toBeLessThan(0.23)
  })
})
