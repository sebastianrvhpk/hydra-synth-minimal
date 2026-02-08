import type { HydraEngineBindingHost, ScriptPlugin } from 'hydra-synth-core'

export interface AttachLivecodingOptions {
  targetGlobal?: Record<string, unknown>
  allowedBindings?: string[]
  exposeHelpers?: boolean | Record<string, unknown>
  evaluate?: (code: string, scope: Record<string, unknown>) => unknown
}

export interface LivecodingSession {
  run (code: string): unknown
  syncFromGlobal (): void
  syncFromEngine (): void
  dispose (): void
}

export declare const attachLivecoding: (
  engine: HydraEngineBindingHost,
  options?: AttachLivecodingOptions
) => LivecodingSession

export declare const createLivecodingPlugin: (options?: AttachLivecodingOptions) => ScriptPlugin
