import {
  HydraEngine,
  HydraTransformRegistry,
  compileGraphV3,
  type HydraExecutionPlanV3,
  type HydraEngineError,
  type HydraErrorPolicy,
  type HydraOutputAdapter,
  type HydraTransformCall,
  type HydraTransformDefinition,
  type ScriptPlugin
} from 'hydra-synth-core'
import type { BrowserHost } from './browser-host.js'
import { WebGPUOutputNode } from './output-node.js'
import { WebGPUFrameRendererAdapter } from './renderer-adapter.js'
import { HydraSourceNode, type PatchBayAdapter } from './source-node.js'
import { HydraAutotunerV3, type HydraAutotuneProfileV3, type HydraTuningPolicyV3 } from './autotune-v3.js'
import { buildProfilerSnapshotV3, type HydraProfilerSnapshotV3 } from './profiler-v3.js'
import { HydraExecutorV3, type HydraExecutePlanV3Options, type ExecutePlanV3Result } from './executor-v3.js'
import { HydraResourceManagerV3 } from './resource-manager-v3.js'
import type { WebGPUCapabilities, WebGPURenderer } from '../webgpu/renderer.js'

const mapTuningPolicyToVariantPolicy = (
  policy: HydraTuningPolicyV3
): 'compat' | 'balanced' | 'aggressive' => {
  if (policy === 'throughput') return 'aggressive'
  if (policy === 'balanced_research') return 'balanced'
  return 'compat'
}

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
  capabilities: WebGPUCapabilities | null = null

  private readonly registry: HydraTransformRegistry
  private readonly patchbay: PatchBayAdapter | null
  private activeOutput: WebGPUOutputNode
  private renderAll = false
  private initPromise: Promise<void> | null = null
  private disposed = false
  private readonly frameTimesMs: number[] = []
  private readonly autotuner = new HydraAutotunerV3()
  private executorV3: HydraExecutorV3 | null = null
  private lastExecuteResultV3: ExecutePlanV3Result | null = null

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

    this.outputs.forEach((output) => {
      output.setPipelineErrorHandler(({ outputLabel, passIndex, signature, error }) => {
        this.engine.reportCompileError(`${outputLabel}:pass${passIndex}`, { signature, cause: error })
      })
    })

    this.synth = this.engine.getBindings() as Record<string, unknown>
    this.synth.stats = { fps: 0 }
    this.synth.capabilities = this.capabilities
    this.synth.render = this.render.bind(this)
    this.synth.setResolution = this.setResolution.bind(this)
    this.synth.hush = this.hush.bind(this)
    this.synth.tick = this.tick.bind(this)
    this.synth.emitEvent = this.emitEvent.bind(this)
    this.synth.createSource = this.createSource.bind(this)
    this.synth.getPassStats = this.getPassStats.bind(this)
    this.synth.compilePlanV3 = this.compilePlanV3.bind(this)
    this.synth.executePlanV3 = this.executePlanV3.bind(this)
    this.synth.getProfilerSnapshot = this.getProfilerSnapshot.bind(this)
    this.synth.autotune = this.autotune.bind(this)
    this.synth.getAutotuneProfile = this.getAutotuneProfile.bind(this)
    this.synth.setTuningPolicy = this.setTuningPolicy.bind(this)
    this.synth.clearAutotuneProfiles = this.clearAutotuneProfiles.bind(this)

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
      void this.start().catch(() => {})
    }
  }

  get bindings (): Readonly<Record<string, unknown>> {
    return this.engine.getBindings()
  }

  async init (): Promise<void> {
    if (this.disposed) return
    if (this.initPromise) return this.initPromise
    this.initPromise = this.engine.init().then(() => {
      this.capabilities = this.renderer.getCapabilities()
      this.synth.capabilities = this.capabilities
      if (!this.executorV3) {
        this.executorV3 = new HydraExecutorV3({
          resourceManager: new HydraResourceManagerV3(this.renderer)
        })
      }
    })
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
    this.frameTimesMs.push(deltaMs)
    while (this.frameTimesMs.length > 240) this.frameTimesMs.shift()
    const stats = this.synth.stats as { fps: number }
    stats.fps = deltaMs > 0 ? Math.ceil(1000 / deltaMs) : 0
  }

  emitEvent (name: string): void {
    if (!name) return
    this.outputs.forEach((output) => output.emitEvent(name))
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

  getPassStats (): Record<string, ReturnType<WebGPUOutputNode['getPassStats']>> {
    const stats: Record<string, ReturnType<WebGPUOutputNode['getPassStats']>> = {}
    this.outputs.forEach((output, index) => {
      stats[`o${index}`] = output.getPassStats()
    })
    return stats
  }

  compilePlanV3 (graphNode: { transforms?: HydraTransformCall[] } | null | undefined): HydraExecutionPlanV3 | null {
    const transforms = Array.isArray(graphNode?.transforms) ? graphNode?.transforms : null
    if (!transforms || transforms.length === 0) return null
    const capabilities = this.capabilities
    return compileGraphV3(transforms, {
      graphId: 'runtime-v3-plan',
      selectedVariantPolicy: mapTuningPolicyToVariantPolicy(this.autotuner.getPolicy()),
      capabilityProfile: {
        supportedFeatures: capabilities?.features ?? [],
        hasSubgroups: Boolean(capabilities?.subgroups?.supported),
        maxWorkgroupStorageBytes: capabilities?.compute?.maxComputeWorkgroupStorageSize ?? 0
      }
    })
  }

  executePlanV3 (
    graphNode: { transforms?: HydraTransformCall[] } | null | undefined,
    output: WebGPUOutputNode = this.activeOutput,
    options: HydraExecutePlanV3Options = {}
  ): HydraExecutionPlanV3 | null {
    const plan = this.compilePlanV3(graphNode)
    if (!plan) return null
    if (!this.executorV3) {
      this.executorV3 = new HydraExecutorV3({
        resourceManager: new HydraResourceManagerV3(this.renderer)
      })
    }
    this.lastExecuteResultV3 = this.executorV3.executePlan(output, plan, {
      time: Number(this.synth.time ?? 0),
      bpm: Number(this.synth.bpm ?? 30),
      resolution: [this.host.canvas.width, this.host.canvas.height],
      deltaMs: this.frameTimesMs[this.frameTimesMs.length - 1] ?? 16
    }, {
      queueMode: options.queueMode ?? plan.executionPolicy?.queueModeDefault,
      queueConvergenceCheckInterval: options.queueConvergenceCheckInterval,
      queueHooks: options.queueHooks,
      forceQueueIndirect: options.forceQueueIndirect
    })
    return plan
  }

  getProfilerSnapshot (): HydraProfilerSnapshotV3 {
    const residentBytesEstimate = this.executorV3?.getResidentByteEstimate() ?? this.outputs
      .map((output) => output.getPassStats())
      .reduce((sum, outputStats) => {
        const outputBytes = Object.values(outputStats).reduce((local, stats) => local + (stats.dispatchCount * 16), 0)
        return sum + outputBytes
      }, 0)

    return buildProfilerSnapshotV3({
      frameTimesMs: this.frameTimesMs,
      outputs: this.outputs,
      capabilities: this.capabilities,
      residentBytesEstimate,
      residency: this.executorV3?.getResidencySnapshot() ?? null,
      queueMetrics: this.lastExecuteResultV3
        ? {
            iterations: this.lastExecuteResultV3.queueIterations,
            overflowCount: this.lastExecuteResultV3.queueOverflowCount,
            indirectDispatches: this.lastExecuteResultV3.queueIndirectDispatches,
            convergenceChecks: this.lastExecuteResultV3.queueConvergenceChecks
          }
        : null
    })
  }

  autotune ({
    profileKey = 'default',
    policy,
    candidateWorkgroups,
    kernelSignature = 'runtime-default'
  }: {
    profileKey?: string
    policy?: HydraTuningPolicyV3
    candidateWorkgroups?: Array<[number, number, number]>
    kernelSignature?: string
  } = {}): HydraAutotuneProfileV3 {
    const snapshot = this.getProfilerSnapshot()
    const compute = this.capabilities?.compute
    const adapterFingerprint = this.capabilities
      ? [
          `features:${(this.capabilities.features ?? []).join(',')}`,
          `invocations:${compute?.maxComputeInvocationsPerWorkgroup ?? 0}`,
          `storage:${compute?.maxComputeWorkgroupStorageSize ?? 0}`
        ].join('|')
      : 'unknown-adapter'
    const browserFingerprint = typeof navigator !== 'undefined'
      ? `${navigator.userAgent}`
      : 'non-browser'
    const resolutionClass = `${this.host.canvas.width}x${this.host.canvas.height}`

    return this.autotuner.run({
      profileKey,
      policy,
      candidateWorkgroups,
      profilerSnapshot: snapshot,
      adapterFingerprint,
      browserFingerprint,
      kernelSignature,
      resolutionClass
    })
  }

  getAutotuneProfile (profileKey = 'default'): HydraAutotuneProfileV3 | null {
    return this.autotuner.getProfile(profileKey)
  }

  setTuningPolicy (policy: HydraTuningPolicyV3): void {
    this.autotuner.setPolicy(policy)
  }

  clearAutotuneProfiles (profileKey?: string): void {
    this.autotuner.clear(profileKey)
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
    this.executorV3?.dispose()
    this.executorV3 = null
    this.lastExecuteResultV3 = null
    this.engine.dispose()
    this.host.dispose()
  }
}
