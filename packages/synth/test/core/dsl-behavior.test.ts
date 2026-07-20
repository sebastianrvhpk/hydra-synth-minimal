import { describe, expect, it } from 'vitest'
import type { HydraCompiledPass, HydraOutputAdapter } from '../../src/core/types.ts'
import { HydraTransformRegistry } from '../../src/core/transforms/registry.ts'

class CaptureOutput implements HydraOutputAdapter {
  passes: HydraCompiledPass[] = []
  render (passes: HydraCompiledPass[]): void { this.passes = passes }
}

const compile = (build: (generators: HydraTransformRegistry['generators']) => { out: () => void }): HydraCompiledPass[] => {
  const output = new CaptureOutput()
  const registry = new HydraTransformRegistry({ defaultOutput: output })
  build(registry.generators).out()
  return output.passes
}

const source = (pass: HydraCompiledPass): string => [
  ...pass.program.functions.map((shaderFunction) => shaderFunction.source),
  pass.program.entryBody
].join('\n')

describe('Hydra DSL behavior', () => {
  it('compiles a representative oscillator chain synchronously', () => {
    const passes = compile((g) => g.osc(12, 0.03, 0.2).rotate(0.2).pixelate(20, 20))

    expect(passes).toHaveLength(1)
    expect(source(passes[0]!)).toContain('fn osc')
    expect(source(passes[0]!)).toContain('fn pixelate')
  })

  it('supports nested combine and coordinate graphs', () => {
    const passes = compile((g) => g
      .osc(6, 0.04, 0.1)
      .modulate(g.noise(4, 0.2).rotate(0.3), 0.25)
      .blend(g.shape(4, 0.3, 0.01).rotate(0.1), 0.4))
    const wgsl = passes.map(source).join('\n')

    expect(wgsl).toContain('fn modulate')
    expect(wgsl).toContain('fn blend')
  })

  it('supports graph-valued scalar parameters', () => {
    const passes = compile((g) => g.noise(
      g.osc(3, 0.04, 0).mult(3).add(1),
      g.shape(4, 0.2, 0.01).mult(0.2).add(0.02)
    ))
    const wgsl = source(passes[0]!)

    expect(wgsl).toContain('fn noise')
    expect(wgsl).toContain('fn osc')
    expect(wgsl).toContain('fn shape')
  })

  it('preserves renderpass boundaries and previous-frame semantics', () => {
    const passes = compile((g) => g.osc(8, 0.1, 0).renderpass().invert(1))

    expect(passes).toHaveLength(2)
    expect(passes.map(source).join('\n')).not.toContain('fn renderpass')
    expect(source(passes[1]!)).toContain('fn prev')
    expect(passes[1]?.textures.some((texture) => texture.isPrev)).toBe(true)
  })

  it('keeps signed posterization behavior in the built-in transform', () => {
    const passes = compile((g) => g.noise(2, 0).posterize(8, 1))
    const wgsl = source(passes[0]!)

    expect(wgsl).toContain('signalSign = sign(_c0.xyz)')
    expect(wgsl).toContain('signalSign * pow(magnitude')
  })
})
