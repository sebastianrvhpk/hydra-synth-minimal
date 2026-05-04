import type { HydraEngineBindingHost, ScriptPlugin } from './core/index.js'
import { findReferencedOutputIndices } from './runtime/output-reference.js'

export interface AttachLivecodingOptions {
  targetGlobal?: Record<string, unknown>
  allowedBindings?: string[]
  exposeHelpers?: boolean | Record<string, unknown>
  runCode?: HydraLivecodingCodeRunner
}

export type HydraLivecodingCodeRunner = (code: string, scope: Record<string, unknown>) => unknown

export interface LivecodingSession {
  run (code: string): unknown
  syncFromGlobal (): void
  syncFromEngine (): void
  dispose (): void
}

const resolveCodeRunner = (options: AttachLivecodingOptions): HydraLivecodingCodeRunner => {
  if (options.runCode) return options.runCode
  throw new Error('Hydra livecoding requires an explicit runCode(code, scope) callback.')
}

export const attachLivecoding = (
  engine: HydraEngineBindingHost,
  options: AttachLivecodingOptions = {}
): LivecodingSession => {
  const targetGlobal = options.targetGlobal ?? (globalThis as Record<string, unknown>)
  const initialBindings = engine.getBindings()
  const allowedBindings = new Set(options.allowedBindings ?? Object.keys(initialBindings))
  const runCode = resolveCodeRunner(options)

  const previousValues = new Map<string, { exists: boolean, value: unknown }>()
  const injectedBindings = new Set<string>()
  const disposeCallbacks = new Set<() => void>()
  let disposed = false

  const registerDisposeCallback = (callback: () => void): (() => void) => {
    disposeCallbacks.add(callback)
    return () => {
      disposeCallbacks.delete(callback)
    }
  }

  const listenWithDispose = (
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    optionsArg?: boolean | AddEventListenerOptions
  ): (() => void) => {
    target.addEventListener(type, listener, optionsArg)
    return registerDisposeCallback(() => {
      target.removeEventListener(type, listener, optionsArg)
    })
  }

  const helperBindings: Record<string, unknown> = {}
  if (options.exposeHelpers) {
    helperBindings.hydraOnDispose = registerDisposeCallback
    helperBindings.hydraListen = listenWithDispose
    if (typeof options.exposeHelpers === 'object') {
      for (const [name, value] of Object.entries(options.exposeHelpers)) {
        helperBindings[name] = value
      }
    }
  }

  const inject = (name: string, value: unknown): void => {
    if (!previousValues.has(name)) {
      previousValues.set(name, {
        exists: Object.prototype.hasOwnProperty.call(targetGlobal, name),
        value: targetGlobal[name]
      })
    }
    targetGlobal[name] = value
    injectedBindings.add(name)
  }

  const ensureReferencedOutputs = (code: string): void => {
    const outputIndices = findReferencedOutputIndices(code)
    if (outputIndices.length === 0) return

    const bindings = engine.getBindings()
    const ensureOutput = bindings.ensureOutput
    if (typeof ensureOutput !== 'function') return

    const maxOutputIndex = outputIndices[outputIndices.length - 1]
    if (typeof maxOutputIndex !== 'number') return

    ensureOutput(maxOutputIndex)
    for (let index = 0; index <= maxOutputIndex; index += 1) {
      allowedBindings.add(`o${index}`)
    }
  }

  const syncFromEngine = (): void => {
    if (disposed) return
    const bindings = engine.getBindings()
    for (const name of allowedBindings) {
      if (!(name in bindings)) continue
      inject(name, bindings[name])
    }
  }

  syncFromEngine()

  for (const [name, helper] of Object.entries(helperBindings)) {
    inject(name, helper)
  }

  const syncFromGlobal = (): void => {
    if (disposed) return
    for (const name of allowedBindings) {
      if (!injectedBindings.has(name)) continue
      engine.setBinding(name, targetGlobal[name])
    }
  }

  const run = (code: string): unknown => {
    if (disposed) {
      throw new Error('Livecoding session has been disposed.')
    }

    ensureReferencedOutputs(code)
    syncFromEngine()
    const result = runCode(code, targetGlobal)
    syncFromGlobal()
    return result
  }

  const dispose = (): void => {
    if (disposed) return
    disposed = true

    for (const callback of Array.from(disposeCallbacks).reverse()) {
      try {
        callback()
      } catch {
        // Plugin cleanup failures are non-fatal and isolated.
      }
    }
    disposeCallbacks.clear()

    for (const name of Array.from(injectedBindings).reverse()) {
      const previous = previousValues.get(name)
      if (!previous) continue

      if (previous.exists) targetGlobal[name] = previous.value
      else delete targetGlobal[name]
    }

    injectedBindings.clear()
    previousValues.clear()
  }

  return { run, syncFromGlobal, syncFromEngine, dispose }
}

export const createLivecodingPlugin = (options?: AttachLivecodingOptions): ScriptPlugin => {
  let session: LivecodingSession | null = null

  return {
    attach: (engine) => {
      session = attachLivecoding(engine, options)
    },
    run: (code) => {
      if (!session) throw new Error('Livecoding plugin has not been attached.')
      return session.run(code)
    },
    dispose: () => {
      if (!session) return
      session.dispose()
      session = null
    }
  }
}
