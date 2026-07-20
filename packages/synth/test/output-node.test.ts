import { describe, expect, it, vi } from 'vitest'
import type { HydraFragmentPass } from '../src/core/types.ts'
import { WebGPUOutputNode } from '../src/runtime/output-node.ts'

describe('WebGPUOutputNode resource state', () => {
  it('allocates feedback history at the final pass dimensions', () => {
    const createdTextures: Array<{ width: number, height: number }> = []
    const copyTextureToTexture = vi.fn()
    const renderer = {
      ready: true,
      createOutputTexture: ({ width, height }: { width: number, height: number }) => {
        createdTextures.push({ width, height })
        return {} as GPUTexture
      },
      copyTextureToTexture,
      destroyTexture: vi.fn()
    }
    const output = new WebGPUOutputNode({ renderer: renderer as never, width: 640, height: 360, label: 'o-test' })
    const internals = output as unknown as {
      historyDepth: number
      recordHistoryTexture: (texture: GPUTexture, width: number, height: number, encoder: GPUCommandEncoder) => void
    }
    internals.historyDepth = 1

    const source = {} as GPUTexture
    const encoder = {} as GPUCommandEncoder
    internals.recordHistoryTexture(source, 320, 180, encoder)

    expect(createdTextures).toEqual([{ width: 320, height: 180 }])
    expect(copyTextureToTexture).toHaveBeenCalledWith(
      encoder,
      source,
      expect.anything(),
      { width: 320, height: 180, depthOrArrayLayers: 1 }
    )
  })

  it('keeps the active graph untouched when pipeline preparation fails', () => {
    const renderer = {
      ready: true,
      getPipeline: () => { throw new Error('invalid shader') }
    }
    const output = new WebGPUOutputNode({ renderer: renderer as never, width: 640, height: 360, label: 'o-test' })
    const pass: HydraFragmentPass = {
      signature: 'broken',
      shader: { declarations: '', body: '{}' },
      variant: 'fragment',
      uniforms: [],
      textures: [],
      resolutionScale: 1
    }

    expect(() => output.render([pass])).toThrow(/fragment pipeline/)
    expect(output.getDependencyOutputIds()).toEqual([])
  })
})
