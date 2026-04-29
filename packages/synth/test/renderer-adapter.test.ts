import { describe, expect, it } from 'vitest'
import { WebGPUFrameRendererAdapter } from '../src/runtime/renderer-adapter.ts'

describe('WebGPUFrameRendererAdapter output scheduling', () => {
  it('renders outputs in topological dependency order', () => {
    const tickOrder: number[] = []

    const outputs = [
      {
        id: 0,
        attachRenderer: () => {},
        resize: () => {},
        dispose: () => {},
        getCurrent: () => null,
        getDependencyOutputIds: () => [1],
        tick: () => tickOrder.push(0)
      },
      {
        id: 1,
        attachRenderer: () => {},
        resize: () => {},
        dispose: () => {},
        getCurrent: () => null,
        getDependencyOutputIds: () => [2],
        tick: () => tickOrder.push(1)
      },
      {
        id: 2,
        attachRenderer: () => {},
        resize: () => {},
        dispose: () => {},
        getCurrent: () => null,
        getDependencyOutputIds: () => [],
        tick: () => tickOrder.push(2)
      }
    ]

    const renderer = {
      ready: true,
      init: async () => {},
      beginFrame: () => ({}),
      submitFrame: () => {},
      setResolution: () => {},
      dispose: () => {},
      updateGlobalUniforms: () => {},
      renderTextureToScreen: () => {},
      renderAllOutputsToScreen: () => {}
    }

    const adapter = new WebGPUFrameRendererAdapter({
      renderer: renderer as never,
      outputs: outputs as never,
      sources: [] as never,
      getRenderAll: () => false,
      getActiveOutput: () => outputs[0] as never
    })

    adapter.renderFrame({}, {
      time: 0,
      bpm: 30,
      resolution: [1280, 720],
      deltaMs: 16
    })

    expect(tickOrder).toEqual([2, 1, 0])
  })

  it('falls back to stable order for cyclic dependencies', () => {
    const tickOrder: number[] = []

    const outputs = [
      {
        id: 0,
        attachRenderer: () => {},
        resize: () => {},
        dispose: () => {},
        getCurrent: () => null,
        getDependencyOutputIds: () => [1],
        tick: () => tickOrder.push(0)
      },
      {
        id: 1,
        attachRenderer: () => {},
        resize: () => {},
        dispose: () => {},
        getCurrent: () => null,
        getDependencyOutputIds: () => [0],
        tick: () => tickOrder.push(1)
      },
      {
        id: 2,
        attachRenderer: () => {},
        resize: () => {},
        dispose: () => {},
        getCurrent: () => null,
        getDependencyOutputIds: () => [],
        tick: () => tickOrder.push(2)
      }
    ]

    const renderer = {
      ready: true,
      init: async () => {},
      beginFrame: () => ({}),
      submitFrame: () => {},
      setResolution: () => {},
      dispose: () => {},
      updateGlobalUniforms: () => {},
      renderTextureToScreen: () => {},
      renderAllOutputsToScreen: () => {}
    }

    const adapter = new WebGPUFrameRendererAdapter({
      renderer: renderer as never,
      outputs: outputs as never,
      sources: [] as never,
      getRenderAll: () => false,
      getActiveOutput: () => outputs[0] as never
    })

    adapter.renderFrame({}, {
      time: 0,
      bpm: 30,
      resolution: [1280, 720],
      deltaMs: 16
    })

    expect(tickOrder).toEqual([2, 0, 1])
  })
})
