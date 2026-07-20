import type { HydraFrameState, HydraOutputAdapter } from '../core/types.js'
import { HydraTransformRegistry } from '../core/transforms/registry.js'
import type { WebGPURenderer } from '../webgpu/renderer.js'
import { HydraAudioAnalyzer, type HydraAudioAnalyzerOptions } from './audio-input.js'
import { normalizeEvenCanvasDimension, type BrowserHost } from './browser-host.js'
import {
  createHydraMouseInput,
  type HydraMouseController,
  type HydraMouseInputOptions,
  type HydraMouseState
} from './mouse-input.js'
import { WebGPUOutputNode } from './output-node.js'
import { HydraSourceNode } from './source-node.js'

const OUTPUT_COUNT = 4
const SOURCE_COUNT = 4
const DEFAULT_DELTA_MS = 16

const finite = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const positive = (value: unknown, fallback: number): number => {
  const number = finite(value, fallback)
  return number > 0 ? number : fallback
}

const optionalPositive = (value: unknown, fallback: number | undefined): number | undefined => {
  if (value == null) return undefined
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
}

export interface HydraBrowserRuntimeOptions {
  host: BrowserHost
  renderer: WebGPURenderer
  autoLoop?: boolean
  audio?: boolean | HydraAudioAnalyzerOptions
  fps?: number
  speed?: number
  bpm?: number
  mouse?: boolean | HydraMouseInputOptions
}

export interface HydraPresentationState {
  mode: 'single' | 'all'
  output: WebGPUOutputNode
}

/**
 * The browser runtime is deliberately the single owner of Hydra's clock and GPU
 * frame. Graph compilation stays synchronous; only GPU initialization and media
 * acquisition cross an async boundary.
 */
export class HydraBrowserRuntime {
  readonly host: BrowserHost
  readonly renderer: WebGPURenderer
  readonly outputs: readonly WebGPUOutputNode[]
  readonly sources: readonly HydraSourceNode[]
  readonly synth: Record<string, unknown>
  readonly mouse: HydraMouseState
  readonly audio: HydraAudioAnalyzer

  private readonly registry: HydraTransformRegistry
  private readonly mouseInput: HydraMouseController
  private activeOutput: WebGPUOutputNode
  private renderAll = false
  private initPromise: Promise<void> | null = null
  private initialized = false
  private disposed = false
  private removeDeviceLostListener: () => void = () => {}
  private timeSinceLastFrame = 0
  private frame: HydraFrameState

  constructor ({
    host,
    renderer,
    autoLoop = true,
    audio = false,
    fps,
    speed = 1,
    bpm = 30,
    mouse = true
  }: HydraBrowserRuntimeOptions) {
    this.host = host
    this.renderer = renderer
    if (typeof renderer.onDeviceLost === 'function') {
      this.removeDeviceLostListener = renderer.onDeviceLost(() => {
        if (!this.disposed) this.dispose()
      })
    }

    const width = normalizeEvenCanvasDimension(host.canvas.width, 1280)
    const height = normalizeEvenCanvasDimension(host.canvas.height, 720)
    if (host.canvas.width !== width || host.canvas.height !== height) host.setResolution(width, height)

    const outputs = Array.from({ length: OUTPUT_COUNT }, (_, index) => {
      const output = new WebGPUOutputNode({ renderer: null, width, height, label: `o${index}` })
      output.id = index
      return output
    })
    this.outputs = outputs
    this.sources = Array.from(
      { length: SOURCE_COUNT },
      (_, index) => new HydraSourceNode({ renderer: null, label: `s${index}` })
    )
    this.activeOutput = outputs[0]!

    this.frame = {
      time: 0,
      bpm: positive(bpm, 30),
      resolution: [width, height],
      deltaMs: 0
    }

    const normalizedMouseOptions = mouse === false
      ? { enabled: false }
      : mouse === true
        ? {}
        : (mouse ?? {})
    this.mouseInput = createHydraMouseInput({ element: host.canvas, ...normalizedMouseOptions })
    this.mouse = this.mouseInput.state

    this.synth = {
      time: 0,
      bpm: this.frame.bpm,
      width,
      height,
      speed: finite(speed, 1),
      fps: optionalPositive(fps, undefined),
      update: () => {},
      afterUpdate: () => {},
      render: this.render.bind(this),
      setResolution: this.setResolution.bind(this),
      hush: this.hush.bind(this),
      mouse: this.mouse
    }

    outputs.forEach((output, index) => { this.synth[`o${index}`] = output })
    this.sources.forEach((source, index) => { this.synth[`s${index}`] = source })

    this.registry = new HydraTransformRegistry({ defaultOutput: outputs[0] as HydraOutputAdapter })
    this.registry.attachToBindings(this.synth)

    const audioOptions = typeof audio === 'object' ? audio : {}
    const audioParent = host.canvas.parentElement ?? (typeof document !== 'undefined' ? document.body : null)
    this.audio = new HydraAudioAnalyzer({
      ...audioOptions,
      ...(audioParent ? { parentEl: audioParent } : {})
    })
    this.audio.attachBindings(this.synth)
    if (audio === true || audioOptions.autostart === true) {
      void this.audio.start(audioOptions.source).catch((error) => console.error('Hydra audio initialization failed.', error))
    }

    if (autoLoop) void this.start().catch((error) => console.error('Hydra runtime failed to start.', error))
  }

  get bindings (): Readonly<Record<string, unknown>> {
    return this.synth
  }

  init (): Promise<void> {
    if (this.disposed) return Promise.reject(new Error('Hydra runtime has been disposed.'))
    if (this.initialized) return Promise.resolve()
    if (this.initPromise) return this.initPromise

    const pendingInit = this.renderer.init().then(() => {
      if (this.disposed) {
        this.renderer.dispose()
        return
      }
      for (const output of this.outputs) output.attachRenderer(this.renderer)
      for (const source of this.sources) source.attachRenderer(this.renderer)
      this.initialized = true
    }).catch((error) => {
      if (this.initPromise === pendingInit) this.initPromise = null
      throw error
    })
    this.initPromise = pendingInit
    return pendingInit
  }

  async start (): Promise<void> {
    if (this.disposed) return
    await this.init()
    this.host.start((deltaMs) => this.tick(deltaMs))
  }

  stop (): void {
    this.host.stop()
  }

  tick (deltaMs = DEFAULT_DELTA_MS): void {
    if (this.disposed || !this.initialized) return

    const elapsedInput = Math.max(0, finite(deltaMs, DEFAULT_DELTA_MS))
    const speed = finite(this.synth.speed, 1)
    const fps = optionalPositive(this.synth.fps, undefined)
    this.frame.bpm = positive(this.synth.bpm, this.frame.bpm)
    this.frame.time += elapsedInput * 0.001 * speed
    this.timeSinceLastFrame += elapsedInput

    const period = fps ? 1000 / fps : 0
    if (fps && this.timeSinceLastFrame < period) return

    const elapsed = this.timeSinceLastFrame || elapsedInput
    this.timeSinceLastFrame = fps ? this.timeSinceLastFrame % period : 0
    this.frame.deltaMs = elapsed
    this.synth.time = this.frame.time
    this.synth.bpm = this.frame.bpm
    this.synth.speed = speed
    this.synth.fps = fps

    this.callFrameHook('update', elapsed)
    this.audio.tick()
    for (const source of this.sources) source.tick(this.frame)

    const encoder = this.renderer.beginFrame()
    if (encoder) {
      this.renderer.updateGlobalUniforms({
        time: this.frame.time,
        bpm: this.frame.bpm,
        width: this.frame.resolution[0],
        height: this.frame.resolution[1]
      })
      for (const output of this.scheduleOutputs()) output.tick(this.frame, encoder)

      if (this.renderAll) {
        const textures = this.outputs.map((output) => output.getCurrent())
        this.renderer.renderAllOutputsToScreen(encoder, textures)
      } else {
        this.renderer.renderTextureToScreen(encoder, this.activeOutput.getCurrent())
      }
      this.renderer.submitFrame(encoder)
    }

    this.callFrameHook('afterUpdate', elapsed)
  }

  render (output?: WebGPUOutputNode): void {
    if (output) {
      if (!this.outputs.includes(output)) throw new Error('render() accepts one of o0, o1, o2, or o3.')
      this.activeOutput = output
      this.renderAll = false
      return
    }
    this.renderAll = true
  }

  getActiveOutput (): WebGPUOutputNode {
    return this.activeOutput
  }

  getPresentationState (): HydraPresentationState {
    return {
      mode: this.renderAll ? 'all' : 'single',
      output: this.activeOutput
    }
  }

  setPresentationState (state: HydraPresentationState): void {
    if (!this.outputs.includes(state.output)) {
      throw new Error('Presentation state output must be one of o0, o1, o2, or o3.')
    }
    this.activeOutput = state.output
    this.renderAll = state.mode === 'all'
  }

  setResolution (width: number, height: number): void {
    const nextWidth = normalizeEvenCanvasDimension(width, this.frame.resolution[0])
    const nextHeight = normalizeEvenCanvasDimension(height, this.frame.resolution[1])
    this.frame.resolution = [nextWidth, nextHeight]
    this.synth.width = nextWidth
    this.synth.height = nextHeight
    this.host.setResolution(nextWidth, nextHeight)
    this.renderer.setResolution(nextWidth, nextHeight)
    for (const output of this.outputs) output.resize(nextWidth, nextHeight)
  }

  hush (): void {
    for (const source of this.sources) source.clear()
    const solid = this.registry.generators.solid
    if (solid) {
      for (const output of this.outputs) solid(0, 0, 0, 0).out(output)
    }
    this.render(this.outputs[0])
    this.synth.update = () => {}
    this.synth.afterUpdate = () => {}
  }

  dispose (): void {
    if (this.disposed) return
    this.disposed = true
    this.initialized = false
    this.initPromise = null
    this.removeDeviceLostListener()
    this.removeDeviceLostListener = () => {}
    this.stop()
    this.audio.dispose()
    this.mouseInput.dispose()
    for (const source of this.sources) source.dispose()
    for (const output of this.outputs) output.dispose()
    this.renderer.dispose()
    this.host.dispose()
  }

  private callFrameHook (name: 'update' | 'afterUpdate', elapsedMs: number): void {
    const callback = this.synth[name]
    if (typeof callback !== 'function') return
    try {
      callback(elapsedMs)
    } catch (error) {
      console.error(`Hydra ${name} callback failed.`, error)
    }
  }

  private scheduleOutputs (): WebGPUOutputNode[] {
    const byId = new Map(this.outputs.map((output) => [output.id, output]))
    const indegree = new Map(this.outputs.map((output) => [output, 0]))
    const dependents = new Map(this.outputs.map((output) => [output, [] as WebGPUOutputNode[]]))

    for (const output of this.outputs) {
      for (const dependencyId of new Set(output.getDependencyOutputIds())) {
        const dependency = byId.get(dependencyId)
        if (!dependency || dependency === output) continue
        indegree.set(output, (indegree.get(output) ?? 0) + 1)
        dependents.get(dependency)?.push(output)
      }
    }

    const queue = this.outputs.filter((output) => indegree.get(output) === 0)
    const scheduled: WebGPUOutputNode[] = []
    while (queue.length > 0) {
      const output = queue.shift()!
      scheduled.push(output)
      for (const dependent of dependents.get(output) ?? []) {
        const next = (indegree.get(dependent) ?? 0) - 1
        indegree.set(dependent, next)
        if (next === 0) queue.push(dependent)
      }
    }

    for (const output of this.outputs) {
      if (!scheduled.includes(output)) scheduled.push(output)
    }
    return scheduled
  }
}
