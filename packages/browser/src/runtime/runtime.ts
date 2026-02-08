import {
  HydraEngine,
  HydraTransformRegistry,
  type HydraEngineError,
  type HydraErrorPolicy,
  type HydraOutputAdapter,
  type HydraTransformDefinition,
  type ScriptPlugin
} from 'hydra-synth-core'
import type { BrowserHost } from './browser-host.js'
import { WebGPUOutputNode } from './output-node.js'
import { WebGPUFrameRendererAdapter } from './renderer-adapter.js'
import { HydraSourceNode, type PatchBayAdapter } from './source-node.js'
import type { WebGPURenderer } from '../webgpu/renderer.js'

export interface HydraBrowserRuntimeOptions {
  host: BrowserHost
  renderer: WebGPURenderer
  patchbay?: PatchBayAdapter | null
  numSources?: number
  numOutputs?: number
  extendTransforms?: HydraTransformDefinition[] | HydraTransformDefinition
  autoLoop?: boolean
  fps?: number
  speed?: number
  bpm?: number
  errorPolicy?: HydraErrorPolicy
  onError?: (error: HydraEngineError) => void
}

export class HydraBrowserRuntime {
  readonly host: BrowserHost
  readonly renderer: WebGPURenderer
  readonly engine: HydraEngine
  readonly outputs: WebGPUOutputNode[]
  readonly sources: HydraSourceNode[]
  readonly synth: Record<string, unknown>

  private readonly registry: HydraTransformRegistry
  private readonly patchbay: PatchBayAdapter | null
  private activeOutput: WebGPUOutputNode
  private renderAll = false
  private initPromise: Promise<void> | null = null
  private disposed = false

  constructor ({
    host,
    renderer,
    patchbay = null,
    numSources = 4,
    numOutputs = 4,
    extendTransforms,
    autoLoop = true,
    fps,
    speed = 1,
    bpm = 30,
    errorPolicy = 'emit',
    onError
  }: HydraBrowserRuntimeOptions) {
    this.host = host
    this.renderer = renderer
    this.patchbay = patchbay

    const sourceCount = Math.max(0, Math.floor(numSources))
    const outputCount = Math.max(1, Math.floor(numOutputs))

    this.outputs = Array(outputCount).fill(null).map((_, index) => {
      const output = new WebGPUOutputNode({
        renderer: null,
        width: this.host.canvas.width,
        height: this.host.canvas.height,
        label: `o${index}`
      })
      output.id = index
      return output
    })

    this.sources = []
    for (let index = 0; index < sourceCount; index += 1) {
      this.sources.push(new HydraSourceNode({
        renderer: null,
        pb: this.patchbay,
        label: `s${index}`
      }))
    }

    this.activeOutput = this.outputs[0]

    const rendererAdapter = new WebGPUFrameRendererAdapter({
      renderer: this.renderer,
      outputs: this.outputs,
      sources: this.sources,
      getRenderAll: () => this.renderAll,
      getActiveOutput: () => this.activeOutput
    })

    this.engine = new HydraEngine({
      renderer: rendererAdapter,
      sources: this.sources,
      width: this.host.canvas.width,
      height: this.host.canvas.height,
      fps,
      speed,
      bpm,
      errorPolicy,
      onError
    })

    this.synth = this.engine.getBindings() as Record<string, unknown>
    this.synth.stats = { fps: 0 }
    this.synth.render = this.render.bind(this)
    this.synth.setResolution = this.setResolution.bind(this)
    this.synth.hush = this.hush.bind(this)
    this.synth.tick = this.tick.bind(this)
    this.synth.createSource = this.createSource.bind(this)

    this.outputs.forEach((output, index) => {
      this.synth[`o${index}`] = output
    })
    this.sources.forEach((source, index) => {
      this.synth[`s${index}`] = source
    })

    let registryRef: HydraTransformRegistry | null = null

    this.registry = new HydraTransformRegistry({
      defaultOutput: this.outputs[0] as HydraOutputAdapter,
      extendTransforms,
      onCompileError: (transformName, error) => {
        this.engine.reportCompileError(transformName, error)
      },
      onChange: ({ method }) => {
        if (!registryRef) return
        this.synth[method] = registryRef.generators[method]
      }
    })
    registryRef = this.registry
    this.registry.attachToBindings(this.synth)

    if (autoLoop) {
      void this.start()
    }
  }

  get bindings (): Readonly<Record<string, unknown>> {
    return this.engine.getBindings()
  }

  async init (): Promise<void> {
    if (this.disposed) return
    if (this.initPromise) return this.initPromise
    this.initPromise = this.engine.init()
    return this.initPromise
  }

  async start (): Promise<void> {
    if (this.disposed) return
    await this.init()
    this.host.start((deltaMs) => {
      this.tick(deltaMs)
    })
  }

  stop (): void {
    this.host.stop()
  }

  tick (deltaMs = 16): void {
    if (this.disposed) return
    this.engine.tick(deltaMs)
    const stats = this.synth.stats as { fps: number }
    stats.fps = deltaMs > 0 ? Math.ceil(1000 / deltaMs) : 0
  }

  render (output?: WebGPUOutputNode): void {
    if (output) {
      this.activeOutput = output
      this.renderAll = false
      return
    }
    this.renderAll = true
  }

  setResolution (width: number, height: number): void {
    this.host.setResolution(width, height)
    this.engine.setResolution(width, height)
    this.outputs.forEach((output) => output.resize(width, height))
  }

  createSource (): HydraSourceNode {
    const sourceIndex = this.sources.length
    const source = new HydraSourceNode({
      renderer: this.renderer.ready ? this.renderer : null,
      pb: this.patchbay,
      label: `s${sourceIndex}`
    })
    this.engine.addSource(source)
    if (this.renderer.ready) source.attachRenderer(this.renderer)
    this.synth[`s${sourceIndex}`] = source
    return source
  }

  hush (): void {
    this.sources.forEach((source) => source.clear())

    const solid = this.registry.generators.solid
    if (solid) {
      this.outputs.forEach((output) => {
        solid(0, 0, 0, 0).out(output)
      })
    }

    this.render(this.outputs[0])
    this.synth.update = () => {}
    this.synth.afterUpdate = () => {}
  }

  attachPlugin (plugin: ScriptPlugin): () => void {
    return this.engine.attachPlugin(plugin)
  }

  dispose (): void {
    if (this.disposed) return
    this.disposed = true
    this.stop()
    this.engine.dispose()
    this.host.dispose()
  }
}
