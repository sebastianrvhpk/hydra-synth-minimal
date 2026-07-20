import { describe, expect, it, vi } from 'vitest'
import { createLivecodingSession } from '../src/livecoding.ts'

describe('createLivecodingSession', () => {
  it('runs code against the supplied scope', () => {
    const scope: Record<string, unknown> = { speed: 1 }
    const runCode = vi.fn((_code: string, target: Record<string, unknown>) => {
      target.speed = 2
      return 'done'
    })
    const session = createLivecodingSession({ scope, runCode })

    expect(session.run('speed = 2')).toBe('done')
    expect(scope.speed).toBe(2)
    expect(runCode).toHaveBeenCalledWith('speed = 2', scope)
  })

  it('installs helpers and restores the previous scope on dispose', () => {
    const original = () => 'original'
    const replacement = () => 'replacement'
    const scope: Record<string, unknown> = { save: original, keep: true }
    const session = createLivecodingSession({
      scope,
      helpers: { save: replacement, randomize: () => 0.5 },
      runCode: () => undefined
    })

    expect(scope.save).toBe(replacement)
    expect(typeof scope.randomize).toBe('function')
    session.dispose()
    expect(scope.save).toBe(original)
    expect(scope.randomize).toBeUndefined()
    expect(scope.keep).toBe(true)
  })

  it('rejects execution after disposal', () => {
    const session = createLivecodingSession({ runCode: () => undefined })
    session.dispose()
    expect(() => session.run('osc().out()')).toThrow(/disposed/)
  })
})
