import {
  HydraEngine,
  HydraTransformRegistry,
  compileGraph,
  type HydraExecutionPlan,
  type HydraEngineError,
  type HydraErrorPolicy,
  type HydraOutputGraphSource,
  type HydraOutputAdapter,
  type HydraTransformCall,
  type HydraTransformDefinition,
  type ScriptPlugin,
  type HydraDebugEvent
} from 'hydra-synth-core'
import type { BrowserHost } from './browser-host.js'
import { WebGPUOutputNode } from './output-node.js'
import { WebGPUFrameRendererAdapter } from './renderer-adapter.js'
import { HydraSourceNode, type PatchBayAdapter } from './source-node.js'
import {
  HydraAutotuner,
  buildWorkgroupCandidateSignature,
  type HydraAutotuneProfile,
  type HydraTuningPolicy
} from './autotune.js'
import { buildProfilerSnapshot, type HydraProfilerSnapshot } from './profiler.js'
import { HydraExecutor, type HydraExecutePlanOptions, type ExecutePlanResult } from './executor.js'
import { HydraResourceManager } from './resource-manager.js'
import type { WebGPUCapabilities, WebGPURenderer } from '../webgpu/renderer.js'

const mapTuningPolicyToVariantPolicy = (
  policy: HydraTuningPolicy
): 'compat' | 'balanced' | 'aggressive' => {
  if (policy === 'throughput') return 'aggressive'
  if (policy === 'balanced_research') return 'balanced'
  return 'compat'
}

export type HydraRuntimeExecutionMode = 'legacy' | 'compute' | 'auto'

export const normalizeRuntimeExecutionMode = (
  value: unknown,
  fallback: HydraRuntimeExecutionMode = 'auto'
): HydraRuntimeExecutionMode => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().toLowerCase()
  if (normalized === 'legacy' || normalized === 'compute' || normalized === 'auto') return normalized
  return fallback
}

const prefersComputePath = (mode: HydraRuntimeExecutionMode): boolean => mode !== 'legacy'

interface HydraRuntimeRoutingDiagnostics {
  configuredMode: HydraRuntimeExecutionMode
  activeMode: 'legacy' | 'compute'
  compileFailures: number
  fallbackCount: number
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
  executionMode?: HydraRuntimeExecutionMode
  errorPolicy?: HydraErrorPolicy
  onError?: (error: HydraEngineError) => void
  onDebug?: (event: HydraDebugEvent) => void
}

export class HydraBrowserRuntime {
  readonly host: BrowserHost
  readonly renderer: WebGPURenderer
  readonly engine: HydraEngine
  readonly outputs: WebGPUOutputNode[]
  readonly sources: HydraSourceNode[]
  readonly synth: Record<string, unknown>
  capabilities: WebGPUCapabilities | null = null

  private readonly onDebugCallback?: (event: HydraDebugEvent) => void
  private readonly registry: HydraTransformRegistry
  private readonly patchbay: PatchBayAdapter | null
  private activeOutput: WebGPUOutputNode
  private renderAll = false
  private initPromise: Promise<void> | null = null
  private disposed = false
  private readonly frameTimesMs: number[] = []
  private readonly autotuner = new HydraAutotuner()
  private executionMode: HydraRuntimeExecutionMode
  private executor: HydraExecutor | null = null
  private lastExecuteResult: ExecutePlanResult | null = null
  private lastPlan: HydraExecutionPlan | null = null
  private readonly routingDiagnostics: HydraRuntimeRoutingDiagnostics

  constructor({
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
    executionMode = 'auto',
    errorPolicy = 'emit',
    onError,
    onDebug
  }: HydraBrowserRuntimeOptions) {
    this.host = host
    this.renderer = renderer
    this.patchbay = patchbay
    this.executionMode = normalizeRuntimeExecutionMode(executionMode, 'auto')
    this.onDebugCallback = onDebug
    this.routingDiagnostics = {
      configuredMode: this.executionMode,
      activeMode: 'legacy',
      compileFailures: 0,
      fallbackCount: 0
    }

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
      output.setGraphRenderHandler((targetOutput, graphSource) => {
        this.routeGraphRender(targetOutput, graphSource)
      })
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
    this.synth.getExecutionMode = this.getExecutionMode.bind(this)
    this.synth.setExecutionMode = this.setExecutionMode.bind(this)
    this.synth.compilePlan = this.compilePlan.bind(this)
    this.synth.executePlan = this.executePlan.bind(this)
    this.synth.getProfilerSnapshot = this.getProfilerSnapshot.bind(this)
    this.synth.autotune = this.autotune.bind(this)
    this.synth.getAutotuneProfile = this.getAutotuneProfile.bind(this)
    this.synth.setTuningPolicy = this.setTuningPolicy.bind(this)
    this.synth.clearAutotuneProfiles = this.clearAutotuneProfiles.bind(this)
    this.synth.dumpShaders = this.dumpShaders.bind(this)

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
      void this.start().catch(() => { })
    }
  }

  get bindings(): Readonly<Record<string, unknown>> {
    return this.engine.getBindings()
  }

  async init(): Promise<void> {
    if (this.disposed) return
    if (this.initPromise) return this.initPromise
    this.initPromise = this.engine.init().then(() => {
      this.capabilities = this.renderer.getCapabilities()
      this.synth.capabilities = this.capabilities
      if (!this.executor) {
        this.executor = new HydraExecutor({
          resourceManager: new HydraResourceManager(this.renderer)
        })
      }
    })
    return this.initPromise
  }

  async start(): Promise<void> {
    if (this.disposed) return
    await this.init()
    this.host.start((deltaMs) => {
      this.tick(deltaMs)
    })
  }

  stop(): void {
    this.host.stop()
  }

  tick(deltaMs = 16): void {
    if (this.disposed) return
    this.engine.tick(deltaMs)
    this.frameTimesMs.push(deltaMs)
    while (this.frameTimesMs.length > 240) this.frameTimesMs.shift()
    const stats = this.synth.stats as { fps: number }
    stats.fps = deltaMs > 0 ? Math.ceil(1000 / deltaMs) : 0
  }

  emitEvent(name: string): void {
    if (!name) return
    this.outputs.forEach((output) => output.emitEvent(name))
  }

  render(output?: WebGPUOutputNode): void {
    if (output) {
      this.activeOutput = output
      this.renderAll = false
      return
    }
    this.renderAll = true
  }

  setResolution(width: number, height: number): void {
    this.host.setResolution(width, height)
    this.engine.setResolution(width, height)
    this.outputs.forEach((output) => output.resize(width, height))
  }

  createSource(): HydraSourceNode {
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

  getPassStats(): Record<string, ReturnType<WebGPUOutputNode['getPassStats']>> {
    const stats: Record<string, ReturnType<WebGPUOutputNode['getPassStats']>> = {}
    this.outputs.forEach((output, index) => {
      stats[`o${index}`] = output.getPassStats()
    })
    return stats
  }

  getExecutionMode(): HydraRuntimeExecutionMode {
    return this.executionMode
  }

  setExecutionMode(mode: HydraRuntimeExecutionMode | string): HydraRuntimeExecutionMode {
    this.executionMode = normalizeRuntimeExecutionMode(mode, this.executionMode)
    this.routingDiagnostics.configuredMode = this.executionMode
    return this.executionMode
  }

  private ensureExecutor(): HydraExecutor {
    if (!this.executor) {
      this.executor = new HydraExecutor({
        resourceManager: new HydraResourceManager(this.renderer)
      })
    }
    return this.executor
  }

  private getCurrentFrameState(): {
    time: number
    bpm: number
    resolution: [number, number]
    deltaMs: number
  } {
    return {
      time: Number(this.synth.time ?? 0),
      bpm: Number(this.synth.bpm ?? 30),
      resolution: [this.host.canvas.width, this.host.canvas.height],
      deltaMs: this.frameTimesMs[this.frameTimesMs.length - 1] ?? 16
    }
  }

  private routeGraphFallback(
    output: WebGPUOutputNode,
    graphSource: HydraOutputGraphSource,
    error: unknown,
    isCompileFailure = false
  ): void {
    if (isCompileFailure) this.routingDiagnostics.compileFailures += 1
    this.routingDiagnostics.fallbackCount += 1
    this.routingDiagnostics.activeMode = 'legacy'
    try {
      this.engine.reportCompileError(`${output.label}:compute-route`, error)
    } catch {
      // Fallback routing must remain deterministic even under throw-on-error policies.
    }
    output.render(graphSource.compileLegacyPasses())
  }

  private routeGraphRender(output: WebGPUOutputNode, graphSource: HydraOutputGraphSource): void {
    this.routingDiagnostics.configuredMode = this.executionMode
    if (!prefersComputePath(this.executionMode)) {
      this.routingDiagnostics.activeMode = 'legacy'
      output.render(graphSource.compileLegacyPasses())
      return
    }

    let plan: HydraExecutionPlan | null = null
    try {
      plan = graphSource.compilePlan
        ? (graphSource.compilePlan() as HydraExecutionPlan | null)
        : this.compilePlan({ transforms: graphSource.transforms })
    } catch (error) {
      this.routeGraphFallback(output, graphSource, error, true)
      return
    }

    if (!plan) {
      this.routeGraphFallback(
        output,
        graphSource,
        new Error('Plan compilation produced no plan for the current graph output.'),
        true
      )
      return
    }

    try {
      this.lastExecuteResult = this.ensureExecutor().executePlan(
        output,
        plan,
        this.getCurrentFrameState(),
        {
          queueMode: plan.executionPolicy?.queueModeDefault,
          queuePolicy: plan.executionPolicy?.queuePolicyDefault
        }
      )
      this.lastPlan = plan
      this.routingDiagnostics.activeMode = 'compute'
    } catch (error) {
      this.routeGraphFallback(output, graphSource, error)
    }
  }

  compilePlan(graphNode: { transforms?: HydraTransformCall[] } | null | undefined): HydraExecutionPlan | null {
    const transforms = Array.isArray(graphNode?.transforms) ? graphNode?.transforms : null
    if (!transforms || transforms.length === 0) return null
    const capabilities = this.capabilities
    return compileGraph(transforms, {
      graphId: 'runtime-plan',
      selectedVariantPolicy: mapTuningPolicyToVariantPolicy(this.autotuner.getPolicy()),
      capabilityProfile: {
        supportedFeatures: capabilities?.features ?? [],
        hasSubgroups: Boolean(capabilities?.subgroups?.supported),
        maxWorkgroupStorageBytes: capabilities?.compute?.maxComputeWorkgroupStorageSize ?? 0
      },
      onDebug: this.onDebugCallback
    })
  }

  executePlan(
    graphNode: { transforms?: HydraTransformCall[] } | null | undefined,
    output: WebGPUOutputNode = this.activeOutput,
    options: HydraExecutePlanOptions = {}
  ): HydraExecutionPlan | null {
    const plan = this.compilePlan(graphNode)
    if (!plan) return null
    this.lastExecuteResult = this.ensureExecutor().executePlan(output, plan, this.getCurrentFrameState(), {
      queueMode: options.queueMode ?? plan.executionPolicy?.queueModeDefault,
      queueConvergenceCheckInterval: options.queueConvergenceCheckInterval,
      queueHooks: options.queueHooks,
      forceQueueIndirect: options.forceQueueIndirect,
      queuePolicy: options.queuePolicy ?? plan.executionPolicy?.queuePolicyDefault
    })
    this.routingDiagnostics.activeMode = 'compute'
    this.lastPlan = plan
    return plan
  }

  getProfilerSnapshot(): HydraProfilerSnapshot {
    const residentBytesEstimate = this.executor?.getResidentByteEstimate() ?? this.outputs
      .map((output) => output.getPassStats())
      .reduce((sum, outputStats) => {
        const outputBytes = Object.values(outputStats).reduce((local, stats) => local + (stats.dispatchCount * 16), 0)
        return sum + outputBytes
      }, 0)

    return buildProfilerSnapshot({
      frameTimesMs: this.frameTimesMs,
      outputs: this.outputs,
      capabilities: this.capabilities,
      residentBytesEstimate,
      residency: this.executor?.getResidencySnapshot() ?? null,
      queueMetrics: this.lastExecuteResult
        ? {
          iterations: this.lastExecuteResult.queueIterations,
          overflowCount: this.lastExecuteResult.queueOverflowCount,
          overflowEvents: this.lastExecuteResult.queueOverflowEvents,
          indirectDispatches: this.lastExecuteResult.queueIndirectDispatches,
          convergenceChecks: this.lastExecuteResult.queueConvergenceChecks,
          terminationReasons: this.lastExecuteResult.queueTerminationReasons,
          checksPerSegment: this.lastExecuteResult.queueChecksPerSegment
        }
        : null,
      routingMetrics: {
        configuredMode: this.routingDiagnostics.configuredMode,
        activeMode: this.routingDiagnostics.activeMode,
        compileFailures: this.routingDiagnostics.compileFailures,
        fallbackCount: this.routingDiagnostics.fallbackCount
      }
    })
  }

  autotune({
    profileKey = 'default',
    policy,
    candidateWorkgroups,
    kernelSignature = 'runtime-default'
  }: {
    profileKey?: string
    policy?: HydraTuningPolicy
    candidateWorkgroups?: Array<[number, number, number]>
    kernelSignature?: string
  } = {}): HydraAutotuneProfile {
    const snapshot = this.getProfilerSnapshot()
    const activePolicy = policy ?? this.autotuner.getPolicy()
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
    const normalizedCandidates = (candidateWorkgroups && candidateWorkgroups.length > 0
      ? candidateWorkgroups
      : [[16, 16, 1], [8, 8, 1], [32, 8, 1]]
    ).map((candidate) => [
      Math.max(1, Math.floor(candidate[0] ?? 16)),
      Math.max(1, Math.floor(candidate[1] ?? 16)),
      Math.max(1, Math.floor(candidate[2] ?? 1))
    ] as [number, number, number])
    const fingerprintKey = [adapterFingerprint, browserFingerprint, kernelSignature, resolutionClass].join('|')
    const candidateSignature = buildWorkgroupCandidateSignature(normalizedCandidates)
    const cached = this.autotuner.getProfileByFingerprint(profileKey, fingerprintKey)
    if (
      cached &&
      cached.policy === activePolicy &&
      cached.candidateSignature === candidateSignature
    ) {
      return cached
    }

    return this.autotuner.run({
      profileKey,
      policy: activePolicy,
      candidateWorkgroups: normalizedCandidates,
      profilerSnapshot: snapshot,
      adapterFingerprint,
      browserFingerprint,
      kernelSignature,
      resolutionClass
    })
  }

  getAutotuneProfile(profileKey = 'default'): HydraAutotuneProfile | null {
    return this.autotuner.getProfile(profileKey)
  }

  setTuningPolicy(policy: HydraTuningPolicy): void {
    this.autotuner.setPolicy(policy)
  }

  clearAutotuneProfiles(profileKey?: string): void {
    this.autotuner.clear(profileKey)
  }

  dumpShaders(): string[] {
    if (this.lastPlan) {
      return this.lastPlan.steps.map((step) => `// Signature: ${step.signature}\n${step.compiledPass.wgsl}`)
    }
    return []
  }

  hush(): void {
    this.sources.forEach((source) => source.clear())

    const solid = this.registry.generators.solid
    if (solid) {
      this.outputs.forEach((output) => {
        solid(0, 0, 0, 0).out(output)
      })
    }

    this.render(this.outputs[0])
    this.synth.update = () => { }
    this.synth.afterUpdate = () => { }
  }

  attachPlugin(plugin: ScriptPlugin): () => void {
    return this.engine.attachPlugin(plugin)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.stop()
    this.outputs.forEach((output) => output.setGraphRenderHandler(null))
    this.executor?.dispose()
    this.executor = null
    this.lastExecuteResult = null
    this.engine.dispose()
    this.host.dispose()
  }
}
