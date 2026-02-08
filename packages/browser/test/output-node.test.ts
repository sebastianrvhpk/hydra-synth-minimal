import { describe, expect, it } from 'vitest'
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
})
