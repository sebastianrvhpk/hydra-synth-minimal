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
} from '../core/index.js'
import { normalizeEvenCanvasDimension, type BrowserHost, type CanvasDisplayOptions } from './browser-host.js'
import { WebGPUOutputNode } from './output-node.js'
import { WebGPUFrameRendererAdapter } from './renderer-adapter.js'
import { HydraSourceNode, type PatchBayAdapter } from './source-node.js'
import {
  HydraAutotuner,
  buildCandidateSignature,
  type HydraAutotuneProfile,
  type HydraTuningPolicy
} from './autotune.js'
import {
  createHydraMouseInput,
  type HydraMouseController,
  type HydraMouseInputOptions,
  type HydraMouseState
} from './mouse-input.js'
import { HydraAudioAnalyzer, type HydraAudioAnalyzerOptions } from './audio-input.js'
import { buildProfilerSnapshot, type HydraProfilerSnapshot } from './profiler.js'
import { HydraExecutor, type HydraExecutePlanOptions, type ExecutePlanResult } from './executor.js'
import type { WebGPUCapabilities, WebGPURenderer } from '../webgpu/renderer.js'
import { installArraySequenceExtensions } from './array-sequence.js'
export type HydraRuntimeExecutionMode = 'fragment' | 'auto'

export const normalizeRuntimeExecutionMode = (
  value: unknown,
  fallback: HydraRuntimeExecutionMode = 'auto'
): HydraRuntimeExecutionMode => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().toLowerCase()
  if (normalized === 'fragment' || normalized === 'auto') return normalized
  return fallback
}

const DEFAULT_RUNTIME_DELTA_MS = 16
const MAX_FRAME_HISTORY = 240
const DEFAULT_MAX_OUTPUTS = 64

const coerceCount = (value: unknown, fallback: number, minimum: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(minimum, Math.floor(value))
}

const coerceOutputIndex = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error('HydraBrowserRuntime: output index must be a finite non-negative number.')
  }
  return Math.floor(numeric)
}

const coerceNonNegativeFinite = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return fallback
  return value
}

interface HydraRuntimeRoutingDiagnostics {
  configuredMode: HydraRuntimeExecutionMode
  activeMode: 'fragment'
  compileFailures: number
  routeFailureCount: number
  routeCount: number
  graphCompileCount: number
  executePlanCount: number
}

export interface HydraBrowserRuntimeOptions {
  host: BrowserHost
  renderer: WebGPURenderer
  patchbay?: PatchBayAdapter | null
  numSources?: number
  numOutputs?: number
  maxOutputs?: number
  extendTransforms?: HydraTransformDefinition[] | HydraTransformDefinition
  autoLoop?: boolean
  audio?: boolean | HydraAudioAnalyzerOptions
  detectAudio?: boolean
  fps?: number
  speed?: number
  bpm?: number
  mouse?: boolean | HydraMouseInputOptions
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
  readonly mouse: HydraMouseState
  readonly audio: HydraAudioAnalyzer
  capabilities: WebGPUCapabilities | null = null

  private readonly onDebugCallback?: (event: HydraDebugEvent) => void
  private readonly registry: HydraTransformRegistry
  private readonly patchbay: PatchBayAdapter | null
  private readonly mouseInput: HydraMouseController
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
  private readonly maxOutputs: number
  private readonly routingDiagnostics: HydraRuntimeRoutingDiagnostics

  constructor({
    host,
    renderer,
    patchbay = null,
    numSources = 4,
    numOutputs = 4,
    maxOutputs = DEFAULT_MAX_OUTPUTS,
    extendTransforms,
    autoLoop = true,
    audio = false,
    detectAudio = false,
    fps,
    speed = 1,
    bpm = 30,
    mouse = true,
    executionMode = 'auto',
    errorPolicy = 'emit',
    onError,
    onDebug
  }: HydraBrowserRuntimeOptions) {
    installArraySequenceExtensions()

    this.host = host
    const normalizedHostWidth = normalizeEvenCanvasDimension(this.host.canvas.width, 1280)
    const normalizedHostHeight = normalizeEvenCanvasDimension(this.host.canvas.height, 720)
    if (this.host.canvas.width !== normalizedHostWidth || this.host.canvas.height !== normalizedHostHeight) {
      this.host.setResolution(normalizedHostWidth, normalizedHostHeight)
    }
    this.renderer = renderer
    this.patchbay = patchbay
    this.executionMode = normalizeRuntimeExecutionMode(executionMode, 'auto')
    this.onDebugCallback = onDebug
    const normalizedMouseOptions = (
      mouse === false
        ? { enabled: false }
        : mouse === true
          ? {}
          : (mouse ?? {})
    )
    this.mouseInput = createHydraMouseInput({
      element: this.host.canvas,
      ...normalizedMouseOptions
    })
    this.mouse = this.mouseInput.state
    this.routingDiagnostics = {
      configuredMode: this.executionMode,
      activeMode: 'fragment',
      compileFailures: 0,
      routeFailureCount: 0,
      routeCount: 0,
      graphCompileCount: 0,
      executePlanCount: 0
    }

    const sourceCount = coerceCount(numSources, 4, 0)
    const outputCount = coerceCount(numOutputs, 4, 1)
    this.maxOutputs = Math.max(outputCount, coerceCount(maxOutputs, DEFAULT_MAX_OUTPUTS, outputCount))

    this.outputs = Array(outputCount).fill(null).map((_, index) => this.createOutputNode(index))

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
      this.configureOutputNode(output)
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
    this.synth.createOutput = this.createOutput.bind(this)
    this.synth.ensureOutput = this.ensureOutput.bind(this)
    this.synth.ensureOutputBuffer = this.ensureOutput.bind(this)
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
    this.synth.setCanvasDisplay = this.setCanvasDisplay.bind(this)
    this.synth.resetCanvasDisplay = this.resetCanvasDisplay.bind(this)
    this.synth.mouse = this.mouse

    const audioOptions = typeof audio === 'object' ? audio : {}
    this.audio = new HydraAudioAnalyzer({
      parentEl: this.host.canvas.parentElement ?? (typeof document !== 'undefined' ? document.body : undefined),
      ...audioOptions
    })
    this.audio.attachBindings(this.synth)
    if (audio === true || detectAudio === true || audioOptions.autostart === true) {
      void this.audio.start(audioOptions.source).catch((error) => {
        this.engine.reportCompileError('audio.init', error)
      })
    }

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

  init(): Promise<void> {
    if (this.disposed) return
    if (this.initPromise) return this.initPromise
    this.initPromise = this.engine.init().then(() => {
      this.capabilities = this.renderer.getCapabilities()
      this.synth.capabilities = this.capabilities
      if (!this.executor) {
        this.executor = new HydraExecutor()
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

  tick(deltaMs = DEFAULT_RUNTIME_DELTA_MS): void {
    if (this.disposed) return
    const safeDeltaMs = coerceNonNegativeFinite(deltaMs, DEFAULT_RUNTIME_DELTA_MS)
    this.audio.tick()
    const renderedDeltaMs = this.engine.tick(safeDeltaMs)
    if (!(renderedDeltaMs > 0)) return

    this.frameTimesMs.push(renderedDeltaMs)
    while (this.frameTimesMs.length > MAX_FRAME_HISTORY) this.frameTimesMs.shift()
    const stats = this.synth.stats as { fps: number }
    stats.fps = Math.ceil(1000 / renderedDeltaMs)
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

  getActiveOutput(): WebGPUOutputNode {
    return this.activeOutput
  }

  isRenderAllEnabled(): boolean {
    return this.renderAll
  }

  setResolution(width: number, height: number): void {
    const nextWidth = normalizeEvenCanvasDimension(width, this.host.canvas.width)
    const nextHeight = normalizeEvenCanvasDimension(height, this.host.canvas.height)
    this.host.setResolution(nextWidth, nextHeight)
    this.engine.setResolution(nextWidth, nextHeight)
    this.outputs.forEach((output) => output.resize(nextWidth, nextHeight))
  }

  setCanvasDisplay(width: number, height: number, options?: CanvasDisplayOptions): void {
    const nextWidth = normalizeEvenCanvasDimension(width, this.host.canvas.width)
    const nextHeight = normalizeEvenCanvasDimension(height, this.host.canvas.height)
    this.host.setCanvasDisplay(nextWidth, nextHeight, options)
    this.engine.setResolution(nextWidth, nextHeight)
    this.outputs.forEach((output) => output.resize(nextWidth, nextHeight))
    this.renderer.setResolution(nextWidth, nextHeight)
  }

  resetCanvasDisplay(): void {
    this.host.resetCanvasDisplay()
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

  createOutput(): WebGPUOutputNode {
    return this.ensureOutput(this.outputs.length)
  }

  ensureOutput(index: number): WebGPUOutputNode {
    if (this.disposed) {
      throw new Error('HydraBrowserRuntime: cannot create outputs after dispose.')
    }

    const outputIndex = coerceOutputIndex(index)
    if (outputIndex >= this.maxOutputs) {
      throw new Error(`HydraBrowserRuntime: output index o${outputIndex} exceeds maxOutputs (${this.maxOutputs}).`)
    }

    while (this.outputs.length <= outputIndex) {
      const nextIndex = this.outputs.length
      const output = this.createOutputNode(nextIndex)
      this.configureOutputNode(output)
      this.outputs.push(output)
      this.synth[`o${nextIndex}`] = output
      if (this.renderer.ready) output.attachRenderer(this.renderer)
    }

    const output = this.outputs[outputIndex]
    if (!output) throw new Error(`HydraBrowserRuntime: failed to create output o${outputIndex}.`)
    return output
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
      this.executor = new HydraExecutor()
    }
    return this.executor
  }

  private createOutputNode(index: number): WebGPUOutputNode {
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
  }

  private configureOutputNode(output: WebGPUOutputNode): void {
    output.setPipelineErrorHandler(({ outputLabel, passIndex, signature, error }) => {
      this.engine.reportCompileError(`${outputLabel}:pass${passIndex}`, { signature, cause: error })
    })
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
      deltaMs: this.frameTimesMs[this.frameTimesMs.length - 1] ?? DEFAULT_RUNTIME_DELTA_MS
    }
  }

  private routeGraphRender(output: WebGPUOutputNode, graphSource: HydraOutputGraphSource): void {
    this.routingDiagnostics.configuredMode = this.executionMode
    this.routingDiagnostics.activeMode = 'fragment'
    this.routingDiagnostics.routeCount += 1

    let plan: HydraExecutionPlan | null = null
    try {
      const transforms = Array.isArray(graphSource.transforms) ? graphSource.transforms : []
      if (transforms.length > 0) {
        // Prefer compiling from active transforms so routing always matches the
        // current fragment compiler behavior.
        plan = this.compilePlan({ transforms })
      } else if (typeof graphSource.compilePlan === 'function') {
        // Compatibility path for callers that provide precompiled plans.
        this.routingDiagnostics.graphCompileCount += 1
        plan = (graphSource.compilePlan() as HydraExecutionPlan | null) ?? null
      }
    } catch (error) {
      this.routingDiagnostics.compileFailures += 1
      this.routingDiagnostics.routeFailureCount += 1
      this.engine.reportCompileError(`${output.label}:fragment-route`, error)
      return
    }

    if (!plan) {
      this.routingDiagnostics.compileFailures += 1
      this.routingDiagnostics.routeFailureCount += 1
      this.engine.reportCompileError(
        `${output.label}:fragment-route`,
        new Error('Plan compilation produced no plan for the current graph output.')
      )
      return
    }

    try {
      this.routingDiagnostics.executePlanCount += 1
      this.lastExecuteResult = this.ensureExecutor().executePlan(
        output,
        plan,
        this.getCurrentFrameState(),
        {}
      )
      this.lastPlan = plan
      this.routingDiagnostics.activeMode = 'fragment'
    } catch (error) {
      this.routingDiagnostics.routeFailureCount += 1
      this.engine.reportCompileError(`${output.label}:fragment-route`, error)
    }
  }

  compilePlan(graphNode: { transforms?: HydraTransformCall[] } | null | undefined): HydraExecutionPlan | null {
    const transforms = Array.isArray(graphNode?.transforms) ? graphNode?.transforms : null
    if (!transforms || transforms.length === 0) return null
    this.routingDiagnostics.graphCompileCount += 1
    return compileGraph(transforms, {
      graphId: 'runtime-plan',
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
    this.routingDiagnostics.executePlanCount += 1
    this.lastExecuteResult = this.ensureExecutor().executePlan(output, plan, this.getCurrentFrameState(), {
      ...options
    })
    this.routingDiagnostics.activeMode = 'fragment'
    this.lastPlan = plan
    return plan
  }

  getProfilerSnapshot(): HydraProfilerSnapshot {
    const residentBytesEstimate = this.executor?.getResidentByteEstimate() ?? this.outputs
      .map((output) => output.getPassStats())
      .reduce((sum, outputStats) => {
        const outputBytes = Object.values(outputStats).reduce((local, stats) => local + (stats.runCount * 16), 0)
        return sum + outputBytes
      }, 0)

    return buildProfilerSnapshot({
      frameTimesMs: this.frameTimesMs,
      outputs: this.outputs,
      capabilities: this.capabilities,
      residentBytesEstimate,
      routingMetrics: {
        configuredMode: this.routingDiagnostics.configuredMode,
        activeMode: this.routingDiagnostics.activeMode,
        compileFailures: this.routingDiagnostics.compileFailures,
        routeFailureCount: this.routingDiagnostics.routeFailureCount,
        routeCount: this.routingDiagnostics.routeCount,
        graphCompileCount: this.routingDiagnostics.graphCompileCount,
        executePlanCount: this.routingDiagnostics.executePlanCount
      }
    })
  }

  autotune({
    profileKey = 'default',
    policy,
    candidateProfiles,
    kernelSignature = 'runtime-default'
  }: {
    profileKey?: string
    policy?: HydraTuningPolicy
    candidateProfiles?: string[]
    kernelSignature?: string
  } = {}): HydraAutotuneProfile {
    const snapshot = this.getProfilerSnapshot()
    const activePolicy = policy ?? this.autotuner.getPolicy()
    const adapterFingerprint = this.capabilities
      ? [
        `features:${(this.capabilities.features ?? []).join(',')}`,
        `target:${this.capabilities.fragment.targetFormat}`,
        `attachments:${this.capabilities.fragment.maxColorAttachments}`
      ].join('|')
      : 'unknown-adapter'
    const browserFingerprint = typeof navigator !== 'undefined'
      ? `${navigator.userAgent}`
      : 'non-browser'
    const resolutionClass = `${this.host.canvas.width}x${this.host.canvas.height}`
    const normalizedCandidates = (candidateProfiles && candidateProfiles.length > 0
      ? candidateProfiles
      : ['conservative', 'balanced', 'aggressive']
    ).map((candidate) => `${candidate}`.trim().toLowerCase()).filter((candidate) => candidate.length > 0)
    const fingerprintKey = [adapterFingerprint, browserFingerprint, kernelSignature, resolutionClass].join('|')
    const candidateSignature = buildCandidateSignature(normalizedCandidates)
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
      candidateProfiles: normalizedCandidates,
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
    this.audio.dispose()
    this.mouseInput.dispose()
    this.engine.dispose()
    this.host.dispose()
  }
}
