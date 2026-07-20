import { describe, expect, it } from 'vitest'
import type { HydraCompiledPass, HydraOutputAdapter } from '../../src/core/types.ts'
import { getDefaultTransforms } from '../../src/core/transforms/default-transforms.ts'
import { HydraTransformRegistry } from '../../src/core/transforms/registry.ts'

class CaptureOutput implements HydraOutputAdapter {
  passes: HydraCompiledPass[] = []

  render (passes: HydraCompiledPass[]): void {
    this.passes = passes
  }
}

const createRegistry = (): { registry: HydraTransformRegistry, output: CaptureOutput } => {
  const output = new CaptureOutput()
  return { registry: new HydraTransformRegistry({ defaultOutput: output }), output }
}

const source = (pass: HydraCompiledPass): string => [
  ...pass.program.functions.map((shaderFunction) => shaderFunction.source),
  pass.program.entryBody
].join('\n')

describe('built-in Hydra transform registry', () => {
  it('exposes source generators and installs chain methods', () => {
    const { registry, output } = createRegistry()

    expect(Object.keys(registry.generators)).toEqual(expect.arrayContaining(['osc', 'noise', 'shape', 'solid', 'src', 'prev', 'prevN']))
    registry.generators.osc(4, 0.1, 0.2).rotate(0.2).color(1, 0.5, 0.25).out()

    expect(output.passes).toHaveLength(1)
    expect(source(output.passes[0]!)).toContain('fn osc')
    expect(source(output.passes[0]!)).toContain('fn rotate')
    expect(source(output.passes[0]!)).toContain('fn color')
  })

  it('attaches only the built-in source generators to a synth scope', () => {
    const { registry } = createRegistry()
    const bindings: Record<string, unknown> = {}
    registry.attachToBindings(bindings)

    expect(typeof bindings.osc).toBe('function')
    expect(typeof bindings.src).toBe('function')
    expect(bindings.registerFunction).toBeUndefined()
  })

  it('keeps the built-in registry immutable', () => {
    const { registry } = createRegistry()
    const graph = registry.generators.osc(4, 0.1, 0)
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(graph), 'rotate')

    expect(descriptor?.configurable).toBe(false)
    expect(descriptor?.writable).toBe(false)
    expect((registry as unknown as { registerTransform?: unknown }).registerTransform).toBeUndefined()
  })

  it('splits renderpass transforms into strict compute passes', () => {
    const { registry, output } = createRegistry()
    registry.generators.osc(8, 0.1, 0).blurX(1).blurY(1).out()

    expect(output.passes).toHaveLength(3)
    expect(output.passes[0]?.variant).toBe('fragment')
    expect(output.passes[1]?.variant).toBe('compute')
    expect(output.passes[2]?.variant).toBe('compute')
    const blurX = output.passes[1]
    if (blurX?.variant !== 'compute') throw new Error('Expected compute blur pass.')
    expect(source(blurX)).toContain('fn blurX')
    expect(blurX.compute.workgroupSize).toEqual([8, 8])
  })

  it('stages nested renderpasses and tracks their internal texture references', () => {
    const { registry, output } = createRegistry()
    registry.generators
      .osc(5, 0.1, 0)
      .blend(registry.generators.noise(3, 0.2).blur(1), 0.5)
      .out()

    expect(output.passes.length).toBeGreaterThan(2)
    expect(output.passes.some((pass) => pass.textures.some((texture) => (
      typeof texture.sourceRef === 'object' && texture.sourceRef !== null && 'internalPassIndex' in texture.sourceRef
    )))).toBe(true)
  })

  it('preserves output dependencies and explicit history references', () => {
    const { registry, output } = createRegistry()
    const upstream = { id: 2, getTexture: () => null }

    registry.generators.src(upstream).out()
    expect(output.passes[0]?.textures[0]?.sourceRef).toBe(upstream)

    registry.generators.prevN(upstream, 4).out()
    expect(output.passes[0]?.textures[0]?.sourceRef).toEqual({ id: 2, historyOffset: 4, target: upstream })
  })

  it('compiles dynamic callbacks as packed uniforms', () => {
    const { registry, output } = createRegistry()
    registry.generators.osc(({ time }) => time + 2, ({ bpm }) => bpm / 600, 0).out()

    const frequency = output.passes[0]?.uniforms.find((uniform) => uniform.name.startsWith('frequency'))
    const sync = output.passes[0]?.uniforms.find((uniform) => uniform.name.startsWith('sync'))
    const frame = { time: 3, bpm: 120, resolution: [640, 360] as [number, number], deltaMs: 16 }
    expect(frequency?.value(frame)).toBe(5)
    expect(sync?.value(frame)).toBeCloseTo(0.2)
  })

  it('compiles static Hydra array sequences into shader helpers', () => {
    const { registry, output } = createRegistry()
    registry.generators.osc([2, 4, 8].fast(0.5), 0.1, 0).out()

    expect(source(output.passes[0]!)).toContain('fn hydraSeq_frequency_0_')
    expect(output.passes[0]?.uniforms.some((uniform) => uniform.name.startsWith('frequency'))).toBe(false)
  })

  it('keeps every declared source transform reachable', () => {
    const { registry } = createRegistry()
    const sourceNames = getDefaultTransforms()
      .filter((transform) => transform.type === 'src')
      .map((transform) => transform.name)

    for (const name of sourceNames) expect(typeof registry.generators[name]).toBe('function')
  })

  it('compiles every built-in transform through its intended pass variant', () => {
    for (const definition of getDefaultTransforms()) {
      const { registry, output } = createRegistry()
      const args = (definition.inputs ?? []).map((input) => (
        input.type === 'sampler2D' ? { id: 2, getTexture: () => null } : undefined
      ))
      if (definition.type === 'src') {
        expect(() => registry.generators[definition.name]?.(...args).out()).not.toThrow()
      } else {
        const graph = registry.generators.solid(0.25, 0.5, 0.75, 1) as unknown as Record<string, (...args: unknown[]) => unknown>
        const transform = graph[definition.name]
        expect(typeof transform).toBe('function')
        expect(() => {
          const transformed = transform?.call(graph, ...args) as { out: () => void }
          transformed.out()
        }).not.toThrow()
      }
      expect(output.passes.length).toBeGreaterThan(0)
      const finalPass = output.passes.at(-1)
      if (definition.preferredPassVariant === 'compute') {
        expect(finalPass?.variant).toBe('compute')
      }
    }
  })

  it('does not emit scheduling or diagnostic metadata', () => {
    const { registry, output } = createRegistry()
    registry.generators.osc(4, 0.1, 0).out()
    const pass = output.passes[0] as unknown as Record<string, unknown>

    expect(pass.schedule).toBeUndefined()
    expect(pass.wgsl).toBeUndefined()
    expect(pass.diagnostics).toBeUndefined()
    expect(pass.shader).toBeUndefined()
    expect(pass.program).toEqual(expect.objectContaining({
      entryBody: expect.any(String),
      functions: expect.any(Array)
    }))
  })
})
