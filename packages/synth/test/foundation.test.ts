import { describe, expect, it, vi } from 'vitest'
import { HydraBrowserRuntime } from '../src/runtime/runtime.ts'

const createRuntimeHarness = () => {
  const canvas = { width: 640, height: 360, parentElement: null } as HTMLCanvasElement
  let frameCallback: ((deltaMs: number) => void) | null = null
  let deviceLostCallback: ((info: GPUDeviceLostInfo) => void) | null = null
  const host = {
    canvas,
    isRunning: false,
    start: vi.fn((callback: (deltaMs: number) => void) => {
      host.isRunning = true
      frameCallback = callback
    }),
    stop: vi.fn(() => { host.isRunning = false }),
    setResolution: vi.fn((width: number, height: number) => {
      canvas.width = width
      canvas.height = height
    }),
    dispose: vi.fn()
  }
  const renderer = {
    ready: false,
    init: vi.fn(async () => renderer),
    onDeviceLost: vi.fn((callback: (info: GPUDeviceLostInfo) => void) => {
      deviceLostCallback = callback
      return () => { deviceLostCallback = null }
    }),
    beginFrame: vi.fn(() => null),
    setResolution: vi.fn(),
    dispose: vi.fn()
  }
  const runtime = new HydraBrowserRuntime({
    host: host as never,
    renderer: renderer as never,
    autoLoop: false,
    mouse: false
  })
  return { runtime, host, renderer, getFrameCallback: () => frameCallback, loseDevice: () => deviceLostCallback?.({ reason: 'unknown', message: 'test loss' } as GPUDeviceLostInfo) }
}

describe('Hydra browser runtime', () => {
  it('has one fixed four-source/four-output topology', () => {
    const { runtime } = createRuntimeHarness()

    expect(runtime.outputs).toHaveLength(4)
    expect(runtime.sources).toHaveLength(4)
    expect(runtime.synth.o0).toBe(runtime.outputs[0])
    expect(runtime.synth.o3).toBe(runtime.outputs[3])
    expect(runtime.synth.o4).toBeUndefined()
    expect((runtime as unknown as { createOutput?: unknown }).createOutput).toBeUndefined()
    expect((runtime as unknown as { createSource?: unknown }).createSource).toBeUndefined()

    runtime.dispose()
  })

  it('exposes only useful runtime controls and built-in language bindings', () => {
    const { runtime } = createRuntimeHarness()

    expect(typeof runtime.synth.osc).toBe('function')
    expect(typeof runtime.synth.render).toBe('function')
    expect(typeof runtime.synth.setResolution).toBe('function')
    expect(typeof runtime.synth.hush).toBe('function')
    expect(runtime.synth.mouse).toBe(runtime.mouse)
    expect(runtime.synth.stats).toBeUndefined()
    expect(runtime.synth.capabilities).toBeUndefined()
    expect(runtime.synth.registerFunction).toBeUndefined()

    runtime.dispose()
  })

  it('advances clock state synchronously and honors the fps gate', async () => {
    const { runtime } = createRuntimeHarness()
    const update = vi.fn()
    const afterUpdate = vi.fn()
    runtime.synth.update = update
    runtime.synth.afterUpdate = afterUpdate
    runtime.synth.speed = 2
    runtime.synth.fps = 20

    await runtime.init()
    runtime.tick(25)
    expect(update).not.toHaveBeenCalled()
    runtime.tick(25)

    expect(runtime.synth.time).toBeCloseTo(0.1)
    expect(update).toHaveBeenCalledWith(50)
    expect(afterUpdate).toHaveBeenCalledWith(50)
    runtime.dispose()
  })

  it('compiles graph structure immediately when out() is called', () => {
    const { runtime } = createRuntimeHarness()
    const output = runtime.outputs[1]!
    const render = vi.spyOn(output, 'render')

    ;(runtime.synth.osc as (...args: unknown[]) => { rotate: (...args: unknown[]) => { out: (target: unknown) => void } })(8, 0.1, 0)
      .rotate(0.2)
      .out(output)

    expect(render).toHaveBeenCalledOnce()
    expect(render.mock.calls[0]?.[0]).toHaveLength(1)
    runtime.dispose()
  })

  it('restricts presentation to its four outputs', () => {
    const { runtime } = createRuntimeHarness()

    runtime.render(runtime.outputs[2])
    expect(runtime.getActiveOutput()).toBe(runtime.outputs[2])
    expect(runtime.getPresentationState()).toEqual({ mode: 'single', output: runtime.outputs[2] })
    runtime.render()
    const allState = runtime.getPresentationState()
    runtime.render(runtime.outputs[0])
    runtime.setPresentationState(allState)
    expect(runtime.getPresentationState()).toEqual(allState)
    expect(() => runtime.render({} as never)).toThrow(/o0, o1, o2, or o3/)
    runtime.dispose()
  })

  it('disposes the full runtime when its WebGPU device is lost', async () => {
    const { runtime, host, renderer, loseDevice } = createRuntimeHarness()
    await runtime.init()

    loseDevice()

    expect(host.stop).toHaveBeenCalled()
    expect(renderer.dispose).toHaveBeenCalled()
    await expect(runtime.init()).rejects.toThrow(/disposed/)
  })

  it('normalizes resolution changes through runtime, renderer, and outputs', () => {
    const { runtime, host, renderer } = createRuntimeHarness()
    const resize = runtime.outputs.map((output) => vi.spyOn(output, 'resize'))

    runtime.setResolution(641, 361)

    expect(host.setResolution).toHaveBeenCalledWith(640, 360)
    expect(renderer.setResolution).toHaveBeenCalledWith(640, 360)
    for (const spy of resize) expect(spy).toHaveBeenCalledWith(640, 360)
    expect(runtime.synth.width).toBe(640)
    expect(runtime.synth.height).toBe(360)
    runtime.dispose()
  })
})
