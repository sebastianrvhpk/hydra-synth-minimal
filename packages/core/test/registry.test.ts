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
    expect(output.passes[0].wgsl).toContain('@compute')
    expect(output.passes[0].wgsl).toContain('fn csMain')
  })

  it('splits renderpass transforms into sequential GPU passes', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })

    registry.generators.osc(8, 0.1, 0).blurX(1).blurY(1).out()

    expect(output.passes.length).toBe(3)
    expect(output.passes[0].wgsl).toContain('fn osc')
    expect(output.passes[1].wgsl).toContain('fn blurX')
    expect(output.passes[2].wgsl).toContain('fn blurY')
    expect(output.passes[1].wgsl).toContain('prevBuffer')
    expect(output.passes[2].wgsl).toContain('prevBuffer')
  })

  it('emits specialized compute workgroup sizes for directional blur kernels', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })

    registry.generators.osc(8, 0.1, 0).blurX(1).blurY(1).out()

    expect(output.passes.length).toBe(3)
    expect(output.passes[1].wgsl).toContain('@workgroup_size(32, 8, 1)')
    expect(output.passes[2].wgsl).toContain('@workgroup_size(8, 32, 1)')
  })

  it('injects prev() when chaining non-src transforms after renderpass boundaries', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })

    registry.generators.osc(8, 0.1, 0).renderpass().invert(1).out()

    expect(output.passes.length).toBe(2)
    expect(output.passes[1].wgsl).toContain('fn prev')
    expect(output.passes[1].wgsl).toContain('fn invert')
  })

  it('tracks texture source references for downstream output dependency scheduling', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })
    const provider = {
      id: 2,
      getTexture: () => null
    }

    registry.generators.src(provider).out()

    expect(output.passes.length).toBe(1)
    expect(output.passes[0].textures.length).toBe(1)
    expect(output.passes[0].textures[0].sourceRef).toBe(provider)
  })

  it('supports vector dynamic uniforms and packs scalar lanes deterministically', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })

    registry.registerTransform({
      name: 'vecTint',
      type: 'color',
      inputs: [
        { type: 'vec3', name: 'tint', default: [0, 0, 0] },
        { type: 'float', name: 'mixAmount', default: 1 }
      ],
      wgsl: `
  let tinted = _c0.xyz + tint * mixAmount;
  return vec4f(tinted, _c0.w);
`
    })

    registry.generators
      .solid(0.2, 0.3, 0.4, 1)
      .vecTint(
        ({ time }) => [time, 0.5, 1.0],
        () => 0.75
      )
      .out()

    expect(output.passes.length).toBe(1)
    expect(output.passes[0].wgsl).toContain('hydraDynamicUniformVec3')
    expect(output.passes[0].uniforms.length).toBe(2)
    expect(output.passes[0].uniforms[0].size).toBe(3)
    expect(output.passes[0].uniforms[0].index).toBe(0)
    expect(output.passes[0].uniforms[1].size).toBe(1)
    expect(output.passes[0].uniforms[1].index).toBe(3)
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
