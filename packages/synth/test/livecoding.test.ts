import { describe, expect, it } from 'vitest'
import type { HydraEngineBindingHost } from '../src/core/index.ts'
import { attachLivecoding, createLivecodingPlugin } from '../src/index.ts'

class MockBindingHost implements HydraEngineBindingHost {
  private readonly bindings: Record<string, unknown>

  constructor (initial: Record<string, unknown>) {
    this.bindings = { ...initial }
  }

  getBindings (): Readonly<Record<string, unknown>> {
    return this.bindings
  }

  setBinding (name: string, value: unknown): void {
    this.bindings[name] = value
  }
}

const testRunCode = (code: string, scope: Record<string, unknown>): unknown => {
  if (code.includes('hydraListen')) {
    const listen = scope.hydraListen as (
      target: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject
    ) => void
    const onDispose = scope.hydraOnDispose as (callback: () => void) => void
    const markDisposed = scope.markDisposed as () => void
    const eventTarget = scope.eventTarget as EventTarget

    listen(eventTarget, 'pulse', () => {
      scope.speed = Number(scope.speed) + 1
    })
    onDispose(markDisposed)
    return undefined
  }

  const speedAssignment = code.match(/\bspeed\s*=\s*(\d+(?:\.\d+)?)/)
  if (speedAssignment) scope.speed = Number(speedAssignment[1])
  return undefined
}

describe('attachLivecoding', () => {
  it('injects only allowed bindings and syncs mutations back to the host', () => {
    const host = new MockBindingHost({ speed: 1, bpm: 30, hidden: 99 })
    const targetGlobal: Record<string, unknown> = { speed: 0, keep: 'safe' }

    const session = attachLivecoding(host, {
      targetGlobal,
      allowedBindings: ['speed'],
      runCode: testRunCode
    })

    expect(targetGlobal.speed).toBe(1)
    expect('bpm' in targetGlobal).toBe(false)
    expect('hidden' in targetGlobal).toBe(false)

    session.run('speed = 4')
    expect(host.getBindings().speed).toBe(4)

    session.dispose()
    expect(targetGlobal.speed).toBe(0)
    expect(targetGlobal.keep).toBe('safe')
  })

  it('cleans up helper-registered listeners and callbacks on dispose', () => {
    const host = new MockBindingHost({ speed: 1 })
    const eventTarget = new EventTarget()
    let disposedCallbackRuns = 0
    const targetGlobal: Record<string, unknown> = { eventTarget }

    const session = attachLivecoding(host, {
      targetGlobal,
      allowedBindings: ['speed'],
      runCode: testRunCode,
      exposeHelpers: {
        markDisposed: () => {
          disposedCallbackRuns += 1
        },
        eventTarget
      }
    })

    session.run(`
      hydraListen(eventTarget, 'pulse', () => {
        speed = speed + 1
      })
      hydraOnDispose(markDisposed)
    `)

    eventTarget.dispatchEvent(new Event('pulse'))
    session.syncFromGlobal()
    expect(host.getBindings().speed).toBe(2)

    session.dispose()
    eventTarget.dispatchEvent(new Event('pulse'))
    session.syncFromGlobal()

    expect(host.getBindings().speed).toBe(2)
    expect(disposedCallbackRuns).toBe(1)
    expect('hydraListen' in targetGlobal).toBe(false)
    expect('hydraOnDispose' in targetGlobal).toBe(false)
  })

  it('requires an explicit code runner', () => {
    const host = new MockBindingHost({ speed: 1 })
    const targetGlobal: Record<string, unknown> = {}

    expect(() => attachLivecoding(host, {
      targetGlobal,
      allowedBindings: ['speed']
    })).toThrow(/explicit runCode/)
  })
})

describe('createLivecodingPlugin', () => {
  it('enforces attach-before-run and disposes cleanly', () => {
    const host = new MockBindingHost({ speed: 1 })
    const targetGlobal: Record<string, unknown> = {}
    const plugin = createLivecodingPlugin({
      targetGlobal,
      allowedBindings: ['speed'],
      runCode: testRunCode
    })

    expect(() => plugin.run?.('speed = 2')).toThrow()

    plugin.attach(host)
    plugin.run?.('speed = 2')
    expect(host.getBindings().speed).toBe(2)

    plugin.dispose()
    expect('speed' in targetGlobal).toBe(false)
  })
})
