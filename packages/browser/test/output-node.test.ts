import { describe, expect, it } from 'vitest'
import type { HydraCompiledPass } from 'hydra-synth-core'
import { WebGPUOutputNode } from '../src/runtime/output-node.ts'

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
})
