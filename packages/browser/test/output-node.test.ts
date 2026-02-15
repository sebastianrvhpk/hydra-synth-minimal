import { describe, expect, it } from 'vitest'
import type { HydraCompiledPass } from 'hydra-synth-core'
import { WebGPUOutputNode } from '../src/runtime/output-node.ts'

const createTestEncoder = (dispatches: Array<{ pipelineId: string, bindGroup: unknown }>): GPUCommandEncoder => ({
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
          bindGroup: currentBindGroup
        })
      },
      dispatchWorkgroupsIndirect: () => {
        dispatches.push({
          pipelineId: currentPipeline?.id ?? 'unknown',
          bindGroup: currentBindGroup
        })
      },
      end: () => {}
    }
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
      createBindGroup: ({ entries }: { entries: unknown[] }) => ({ entries })
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
    updateGlobalUniforms: () => {},
    getOutputPipelineEntry: (signature: string) => ({
      cacheKey: signature,
      pipeline: {
        id: signature,
        getBindGroupLayout: () => ({})
      },
      error: null
    }),
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
    const dispatches: Array<{ pipelineId: string, bindGroup: unknown }> = []
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
    const dispatches: Array<{ pipelineId: string, bindGroup: unknown }> = []
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
})
