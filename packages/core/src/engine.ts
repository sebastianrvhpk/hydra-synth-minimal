import { createHydraEngineError, HydraEngineFailure } from './errors.js'
import type {
  Disposable,
  HydraEngineBindingHost,
  HydraEngineError,
  HydraEngineErrorType,
  HydraEngineOptions,
  HydraFrameState,
  ScriptPlugin,
  SourceAdapter
} from './types.js'

interface RuntimeContext {
  stage: string
}

export class HydraEngine implements HydraEngineBindingHost {
  private readonly renderer
  private readonly sources: SourceAdapter[]
  private updateCallback: (deltaMs: number) => void
  private afterUpdateCallback: (deltaMs: number) => void
  private readonly onErrorCallback
  private readonly onDebugCallback
  private readonly errorPolicy
  private readonly bindings: Record<string, unknown>
  private readonly errorListeners = new Set<(error: HydraEngineError) => void>()
  private readonly disposables = new Set<Disposable>()
  private readonly plugins = new Set<ScriptPlugin>()

  private readonly frameState: HydraFrameState
  private initPromise: Promise<void> | null = null
  private initError: HydraEngineError | null = null
  private initialized = false
  private disposed = false
  private timeSinceLastUpdate = 0
  private speed: number
  private fps: number | undefined

  constructor(options: HydraEngineOptions) {
    this.renderer = options.renderer
    this.sources = options.sources ?? []
    this.updateCallback = options.update ?? (() => { })
    this.afterUpdateCallback = options.afterUpdate ?? (() => { })
    this.afterUpdateCallback = options.afterUpdate ?? (() => { })
    this.onErrorCallback = options.onError
    this.onDebugCallback = options.onDebug
    this.errorPolicy = options.errorPolicy ?? 'emit'

    const width = options.width ?? 1280
    const height = options.height ?? 720
    const bpm = options.bpm ?? 30
    this.speed = options.speed ?? 1
    this.fps = options.fps

    this.frameState = {
      time: 0,
      bpm,
      resolution: [width, height],
      deltaMs: 0
    }

    this.bindings = {
      time: 0,
      bpm,
      width,
      height,
      speed: this.speed,
      fps: this.fps,
      update: this.updateCallback,
      afterUpdate: this.afterUpdateCallback,
      ...options.initialBindings
    }

    if (typeof this.bindings.update === 'function') {
      this.updateCallback = this.bindings.update as (deltaMs: number) => void
    }
    if (typeof this.bindings.afterUpdate === 'function') {
      this.afterUpdateCallback = this.bindings.afterUpdate as (deltaMs: number) => void
    }

    this.addDisposable(this.renderer)
    for (const source of this.sources) this.addDisposable(source)
  }

  get isDisposed(): boolean {
    return this.disposed
  }

  get isInitialized(): boolean {
    return this.initialized
  }

  async init(): Promise<void> {
    if (this.disposed) return
    if (this.initialized) return
    if (this.initPromise) return this.initPromise

    this.initPromise = this.renderer
      .init()
      .then(() => {
        this.initialized = true
      })
      .catch((error) => {
        try {
          const envelope = this.handleError('init', 'Renderer init failed', { stage: 'renderer.init' }, error)
          this.initError = envelope
          throw new HydraEngineFailure(envelope)
        } catch (raised) {
          if (raised instanceof HydraEngineFailure) this.initError = raised.envelope
          throw raised
        }
      })

    return this.initPromise
  }

  reportCompileError(transformName: string, cause: unknown): void {
    this.handleError(
      'compile',
      `Transform compile failed: ${transformName}`,
      { stage: 'transform.compile', transformName },
      cause
    )
  }

  tick(deltaMs = 16): void {
    if (this.disposed || !this.initialized || this.initError) return

    this.pullBindingOverrides()

    this.frameState.time += deltaMs * 0.001 * this.speed
    this.timeSinceLastUpdate += deltaMs

    const fps = this.fps
    if (fps && this.timeSinceLastUpdate < 1000 / fps) return

    const elapsed = this.timeSinceLastUpdate || deltaMs
    this.timeSinceLastUpdate = 0
    this.frameState.deltaMs = elapsed
    this.syncBindings()

    this.callRuntimeCallback('update', this.updateCallback, elapsed)

    for (let index = 0; index < this.sources.length; index += 1) {
      const source = this.sources[index]
      try {
        source.tick(this.frameState)
      } catch (error) {
        this.handleError('runtime', 'Source tick failed', { stage: 'source.tick', sourceIndex: index }, error)
      }
    }

    try {
      const frameHandle = this.renderer.beginFrame(this.frameState)
      this.renderer.renderFrame(frameHandle, this.frameState)
      this.renderer.submitFrame(frameHandle)
    } catch (error) {
      this.handleError('runtime', 'Renderer frame failed', { stage: 'renderer.frame' }, error)
    }

    this.callRuntimeCallback('afterUpdate', this.afterUpdateCallback, elapsed)
  }

  getBindings(): Readonly<Record<string, unknown>> {
    return this.bindings
  }

  setBinding(name: string, value: unknown): void {
    if (this.disposed) return

    this.bindings[name] = value
    if (name === 'speed' && typeof value === 'number') this.speed = value
    if (name === 'fps') {
      this.fps = typeof value === 'number' ? value : undefined
      this.bindings.fps = this.fps
    }
    if (name === 'update') {
      this.updateCallback = typeof value === 'function' ? value as (deltaMs: number) => void : () => { }
      this.bindings.update = this.updateCallback
    }
    if (name === 'afterUpdate') {
      this.afterUpdateCallback = typeof value === 'function' ? value as (deltaMs: number) => void : () => { }
      this.bindings.afterUpdate = this.afterUpdateCallback
    }
    if (name === 'bpm' && typeof value === 'number') this.frameState.bpm = value
    if (name === 'width' && typeof value === 'number') this.frameState.resolution[0] = value
    if (name === 'height' && typeof value === 'number') this.frameState.resolution[1] = value
  }

  setResolution(width: number, height: number): void {
    if (this.disposed) return
    this.frameState.resolution[0] = width
    this.frameState.resolution[1] = height
    this.bindings.width = width
    this.bindings.height = height
    this.renderer.setResolution?.(width, height)
  }

  addSource(source: SourceAdapter): () => void {
    if (this.disposed) return () => { }

    this.sources.push(source)
    const removeDisposable = this.addDisposable(source)
    let removed = false

    return () => {
      if (removed) return
      removed = true

      const index = this.sources.indexOf(source)
      if (index >= 0) this.sources.splice(index, 1)

      removeDisposable()
    }
  }

  attachPlugin(plugin: ScriptPlugin): () => void {
    if (this.disposed) return () => { }

    this.plugins.add(plugin)
    plugin.attach(this)

    let detached = false
    const detach = () => {
      if (detached) return
      detached = true
      if (this.plugins.delete(plugin)) {
        plugin.dispose()
      }
    }

    this.disposables.add({ dispose: detach })
    return detach
  }

  onError(listener: (error: HydraEngineError) => void): () => void {
    this.errorListeners.add(listener)
    return () => {
      this.errorListeners.delete(listener)
    }
  }

  addDisposable(candidate: Disposable | (() => void)): () => void {
    if (this.disposed) return () => { }

    let done = false
    const disposable: Disposable = {
      dispose: () => {
        if (done) return
        done = true
        if (typeof candidate === 'function') candidate()
        else candidate.dispose()
      }
    }

    this.disposables.add(disposable)

    return () => {
      if (!this.disposables.has(disposable)) return
      this.disposables.delete(disposable)
      disposable.dispose()
    }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true

    const disposables = Array.from(this.disposables)
    this.disposables.clear()

    for (const disposable of disposables.reverse()) {
      try {
        disposable.dispose()
      } catch (error) {
        this.handleError('runtime', 'Dispose failed', { stage: 'dispose' }, error)
      }
    }
  }

  private callRuntimeCallback(stage: string, callback: (deltaMs: number) => void, elapsed: number): void {
    try {
      callback(elapsed)
    } catch (error) {
      this.handleError('runtime', `Runtime callback failed: ${stage}`, { stage }, error)
    }
  }

  private syncBindings(): void {
    this.bindings.time = this.frameState.time
    this.bindings.bpm = this.frameState.bpm
    this.bindings.width = this.frameState.resolution[0]
    this.bindings.height = this.frameState.resolution[1]
    this.bindings.speed = this.speed
    this.bindings.fps = this.fps
  }

  private pullBindingOverrides(): void {
    if (typeof this.bindings.speed === 'number') this.speed = this.bindings.speed
    if (typeof this.bindings.fps === 'number') this.fps = this.bindings.fps
    else if (typeof this.bindings.fps === 'undefined' || this.bindings.fps === null) this.fps = undefined

    if (typeof this.bindings.bpm === 'number') this.frameState.bpm = this.bindings.bpm

    if (typeof this.bindings.update === 'function') {
      this.updateCallback = this.bindings.update as (deltaMs: number) => void
    }
    if (typeof this.bindings.afterUpdate === 'function') {
      this.afterUpdateCallback = this.bindings.afterUpdate as (deltaMs: number) => void
    }
  }

  private handleError<TContext extends RuntimeContext | Record<string, unknown>>(
    type: HydraEngineErrorType,
    message: string,
    context: TContext,
    cause?: unknown
  ): HydraEngineError<TContext> {
    const envelope = createHydraEngineError(type, message, context, cause)

    if (this.onErrorCallback) this.onErrorCallback(envelope)
    for (const listener of this.errorListeners) listener(envelope)
    if (this.errorPolicy === 'throw') throw new HydraEngineFailure(envelope)

    return envelope
  }
}
