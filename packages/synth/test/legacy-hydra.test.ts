import { afterEach, describe, expect, it, vi } from 'vitest'
import Hydra from '../src/index.ts'

class FakeCanvas extends EventTarget {
  width = 8
  height = 8
  style: Record<string, string> = {}
  parentElement: unknown = null

  getContext(): null {
    return null
  }

  toBlob(callback: (blob: Blob | null) => void): void {
    callback(new Blob(['png'], { type: 'image/png' }))
  }
}

describe('legacy Hydra facade', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('wraps the typed runtime with old constructor, globals, eval, and capture aliases', () => {
    const body = {
      appendChild: (node: { parentElement?: unknown }) => {
        node.parentElement = body
      },
      removeChild: () => {}
    }
    const head = { appendChild: () => {} }

    vi.stubGlobal('window', {
      requestAnimationFrame: () => 1,
      cancelAnimationFrame: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      setTimeout
    })
    vi.stubGlobal('document', {
      body,
      head,
      createElement: (tagName: string) => {
        if (tagName === 'canvas') return new FakeCanvas()
        if (tagName === 'a') {
          return {
            style: {},
            click: () => {},
            remove: () => {}
          }
        }
        if (tagName === 'script') return {}
        if (tagName === 'video') return { autoplay: false, loop: false }
        throw new Error(`Unexpected element: ${tagName}`)
      }
    })

    const targetGlobal: Record<string, unknown> = {}
    const canvas = new FakeCanvas() as unknown as HTMLCanvasElement
    let sawDynamicOutput = false
    const hydra = new Hydra({
      canvas,
      autoLoop: false,
      makeGlobal: true,
      targetGlobal,
      enableStreamCapture: false,
      runCode: (code, scope) => {
        const speedAssignment = code.match(/\bspeed\s*=\s*(\d+(?:\.\d+)?)/)
        if (speedAssignment) scope.speed = Number(speedAssignment[1])
        if (code.includes('o5')) {
          sawDynamicOutput = (scope.o5 as { label?: string } | undefined)?.label === 'o5'
        }
      }
    })

    expect(hydra.synth).toBe(hydra.runtime.synth)
    expect(typeof hydra.synth.screencap).toBe('function')
    expect(typeof hydra.synth.getScreenImage).toBe('function')
    expect(typeof hydra.synth.setFunction).toBe('function')
    expect(targetGlobal.hydra).toBe(hydra)
    expect(typeof targetGlobal.osc).toBe('function')

    hydra.eval('speed = 2')
    expect(hydra.synth.speed).toBe(2)

    hydra.eval('src(o5).out(o5)')
    expect(sawDynamicOutput).toBe(true)
    expect(hydra.runtime.outputs).toHaveLength(6)
    expect((targetGlobal.o5 as { label?: string }).label).toBe('o5')

    hydra.dispose()
    expect('hydra' in targetGlobal).toBe(false)
    expect('o5' in targetGlobal).toBe(false)
  })
})
