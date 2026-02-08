import { describe, expect, it } from 'vitest'
import { HydraTransformRegistry, type HydraCompiledPass, type HydraOutputAdapter, type HydraTransformDefinition } from '../src/index.ts'

class CaptureOutput implements HydraOutputAdapter {
  passes: HydraCompiledPass[] = []

  render (passes: HydraCompiledPass[]): void {
    this.passes = passes
  }
}

describe('HydraTransformRegistry', () => {
  it('registers default transforms and compiles a pass', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })

    expect(typeof registry.generators.osc).toBe('function')
    registry.generators.osc(4, 0.1, 0.2).rotate(0.2).out()

    expect(output.passes.length).toBe(1)
    expect(output.passes[0].wgsl).toContain('fn osc')
    expect(output.passes[0].wgsl).toContain('fn rotate')
  })

  it('supports custom transform registration and synth binding attachment', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })
    const bindings: Record<string, unknown> = {}
    registry.attachToBindings(bindings)

    const custom: HydraTransformDefinition = {
      name: 'myTint',
      type: 'color',
      inputs: [{ type: 'float', name: 'amount', default: 0.5 }],
      wgsl: `
  return vec4f(_c0.xyz * vec3f(amount), _c0.w);
`
    }

    const registerFunction = bindings.registerFunction as (definition: HydraTransformDefinition) => void
    registerFunction(custom)

    expect(typeof bindings.myTint).toBe('function')
    ;(bindings.solid as (...args: unknown[]) => { myTint: (...args: unknown[]) => { out: () => void } })(1, 1, 1, 1)
      .myTint(0.2)
      .out()

    expect(output.passes.length).toBe(1)
    expect(output.passes[0].wgsl).toContain('fn myTint')
  })

  it('reports compile errors through registry callback', () => {
    const output = new CaptureOutput()
    let compileError: unknown = null

    const registry = new HydraTransformRegistry({
      defaultOutput: output,
      onCompileError: (_transformName, error) => {
        compileError = error
      }
    })

    expect(() => {
      registry.generators.src({}).out()
    }).toThrow()

    expect(compileError).not.toBeNull()
  })
})
