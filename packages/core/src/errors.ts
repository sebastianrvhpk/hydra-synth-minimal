import type { HydraEngineError, HydraEngineErrorType } from './types.js'

export const createHydraEngineError = <TContext extends Record<string, unknown>>(
  type: HydraEngineErrorType,
  message: string,
  context: TContext,
  cause?: unknown
): HydraEngineError<TContext> => ({
  type,
  message,
  context,
  cause,
  timestamp: Date.now()
})

export class HydraEngineFailure extends Error {
  readonly envelope: HydraEngineError

  constructor (envelope: HydraEngineError) {
    super(envelope.message)
    this.name = 'HydraEngineFailure'
    this.envelope = envelope
  }
}
