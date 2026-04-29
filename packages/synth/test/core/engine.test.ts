import { describe, expect, it } from 'vitest'
import { HydraEngine, type HydraEngineError, type HydraFrameState, type RendererAdapter, type SourceAdapter } from '../../src/core/index.ts'

class MockRenderer implements RendererAdapter {
  readonly frames: HydraFrameState[] = []
  initShouldFail = false
  initialized = false
  disposed = false

  async init (): Promise<void> {
    this.initialized = true
    if (this.initShouldFail) throw new Error('init-failed')
  }

  beginFrame (frame: HydraFrameState): unknown {
    return { frame }
  }

  renderFrame (_frameHandle: unknown, frame: HydraFrameState): void {
    this.frames.push({
      time: frame.time,
      bpm: frame.bpm,
      resolution: [frame.resolution[0], frame.resolution[1]],
      deltaMs: frame.deltaMs
    })
  }

  submitFrame (_frameHandle: unknown): void {}

  dispose (): void {
    this.disposed = true
  }
}

class MockSource implements SourceAdapter {
  tickCount = 0
  shouldThrow = false
  disposed = false

  tick (_frame: HydraFrameState): void {
    this.tickCount += 1
    if (this.shouldThrow) throw new Error('source-failed')
  }

  dispose (): void {
    this.disposed = true
  }
}

describe('HydraEngine lifecycle', () => {
  it('tick() advances time deterministically', async () => {
    const renderer = new MockRenderer()
    const engine = new HydraEngine({ renderer })
    await engine.init()

    engine.tick(16)
    engine.tick(16)

    expect(renderer.frames.length).toBe(2)
    expect(engine.getBindings().time).toBeCloseTo(0.032, 5)
  })

  it('fps throttling remains deterministic', async () => {
    const renderer = new MockRenderer()
    const engine = new HydraEngine({ renderer, fps: 30 })
    await engine.init()

    engine.tick(10)
    engine.tick(10)
    expect(renderer.frames.length).toBe(0)

    engine.tick(20)
    expect(renderer.frames.length).toBe(1)
    expect(renderer.frames[0].deltaMs).toBe(40)
  })

  it('fps throttling preserves sub-frame remainder across ticks', async () => {
    const renderer = new MockRenderer()
    const engine = new HydraEngine({ renderer, fps: 30 })
    await engine.init()

    for (let index = 0; index < 120; index += 1) {
      engine.tick(16)
    }

    expect(renderer.frames.length).toBe(57)
  })

  it('dispose() is idempotent and prevents further work', async () => {
    const renderer = new MockRenderer()
    const source = new MockSource()
    const engine = new HydraEngine({ renderer, sources: [source] })
    await engine.init()

    engine.tick(16)
    expect(renderer.frames.length).toBe(1)

    engine.dispose()
    engine.dispose()
    engine.tick(16)

    expect(renderer.frames.length).toBe(1)
    expect(renderer.disposed).toBe(true)
    expect(source.disposed).toBe(true)
  })

  it('addSource disposer removes source from the tick loop', async () => {
    const renderer = new MockRenderer()
    const engine = new HydraEngine({ renderer })
    const source = new MockSource()

    await engine.init()
    const removeSource = engine.addSource(source)

    engine.tick(16)
    expect(source.tickCount).toBe(1)

    removeSource()
    engine.tick(16)

    expect(source.tickCount).toBe(1)
    expect(source.disposed).toBe(true)
  })

  it('sanitizes non-finite numeric bindings and resolution updates', async () => {
    const renderer = new MockRenderer()
    const engine = new HydraEngine({ renderer, fps: 30, speed: 1, bpm: 30, width: 1280, height: 720 })
    await engine.init()

    engine.setBinding('fps', Number.POSITIVE_INFINITY)
    engine.setBinding('speed', Number.NaN)
    engine.setBinding('bpm', Number.NEGATIVE_INFINITY)
    engine.setResolution(Number.NaN, -200)

    const bindings = engine.getBindings()
    expect(bindings.fps).toBe(30)
    expect(bindings.speed).toBe(1)
    expect(bindings.bpm).toBe(30)
    expect(bindings.width).toBe(1280)
    expect(bindings.height).toBe(720)
  })
})

describe('HydraEngine errors', () => {
  it('renderer init failure emits a typed init error', async () => {
    const renderer = new MockRenderer()
    renderer.initShouldFail = true
    const errors: HydraEngineError[] = []

    const engine = new HydraEngine({
      renderer,
      onError: (error) => errors.push(error)
    })

    await expect(engine.init()).rejects.toThrow('Renderer init failed')

    expect(errors.length).toBe(1)
    expect(errors[0].type).toBe('init')
    expect(errors[0].context.stage).toBe('renderer.init')
  })

  it('compile failure emits typed compile error with transform context', async () => {
    const renderer = new MockRenderer()
    const errors: HydraEngineError[] = []
    const engine = new HydraEngine({
      renderer,
      onError: (error) => errors.push(error)
    })
    await engine.init()

    engine.reportCompileError('osc', new Error('compile-failed'))

    expect(errors.length).toBe(1)
    expect(errors[0].type).toBe('compile')
    expect(errors[0].context.transformName).toBe('osc')
  })

  it('runtime callback and source failures emit structured runtime errors', async () => {
    const renderer = new MockRenderer()
    const source = new MockSource()
    source.shouldThrow = true
    const errors: HydraEngineError[] = []

    const engine = new HydraEngine({
      renderer,
      sources: [source],
      update: () => {
        throw new Error('update-failed')
      },
      afterUpdate: () => {
        throw new Error('after-failed')
      },
      onError: (error) => errors.push(error)
    })
    await engine.init()

    engine.tick(16)

    const runtimeErrors = errors.filter((error) => error.type === 'runtime')
    expect(runtimeErrors.length).toBeGreaterThanOrEqual(3)
    expect(runtimeErrors.some((error) => error.context.stage === 'update')).toBe(true)
    expect(runtimeErrors.some((error) => error.context.stage === 'afterUpdate')).toBe(true)
    expect(runtimeErrors.some((error) => error.context.stage === 'source.tick')).toBe(true)
  })
})
