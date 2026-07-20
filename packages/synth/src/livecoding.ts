export type HydraLivecodingCodeRunner = (code: string, scope: Record<string, unknown>) => unknown

export interface HydraLivecodingSessionOptions {
  scope?: Record<string, unknown>
  helpers?: Record<string, unknown>
  runCode: HydraLivecodingCodeRunner
}

export interface HydraLivecodingSession {
  run(code: string): unknown
  dispose(): void
}

/**
 * A small execution boundary for the editor. Hydra bindings already live on the
 * app scope, so this only installs editor helpers and delegates code execution
 * to the explicitly supplied runner.
 */
export const createLivecodingSession = ({
  scope = globalThis as Record<string, unknown>,
  helpers = {},
  runCode
}: HydraLivecodingSessionOptions): HydraLivecodingSession => {
  const previous = new Map<string, { exists: boolean, value: unknown }>()
  let disposed = false

  for (const [name, value] of Object.entries(helpers)) {
    previous.set(name, {
      exists: Object.prototype.hasOwnProperty.call(scope, name),
      value: scope[name]
    })
    scope[name] = value
  }

  return {
    run: (code) => {
      if (disposed) throw new Error('Livecoding session has been disposed.')
      return runCode(code, scope)
    },
    dispose: () => {
      if (disposed) return
      disposed = true
      for (const [name, state] of previous) {
        if (state.exists) scope[name] = state.value
        else delete scope[name]
      }
      previous.clear()
    }
  }
}
