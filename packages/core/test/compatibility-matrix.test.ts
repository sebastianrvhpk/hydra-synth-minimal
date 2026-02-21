import { describe, expect, it } from 'vitest'
import {
  HydraTransformRegistry,
  compileGraph,
  lowerDslToIr,
  type HydraCompiledPass,
  type HydraOutputAdapter,
  type HydraOutputGraphSource,
  type HydraTransformDefinition
} from '../src/index.ts'

class CaptureOutput implements HydraOutputAdapter {
  passes: HydraCompiledPass[] = []

  render (passes: HydraCompiledPass[]): void {
    this.passes = passes
  }
}

class GraphAwareCaptureOutput extends CaptureOutput {
  graphSource: HydraOutputGraphSource | null = null

  renderGraph (source: HydraOutputGraphSource): void {
    this.graphSource = source
    this.render(source.compilePasses())
  }
}

const createRegistry = (): { registry: HydraTransformRegistry, output: CaptureOutput } => {
  const output = new CaptureOutput()
  const registry = new HydraTransformRegistry({ defaultOutput: output })
  return { registry, output }
}

describe('DSL compatibility matrix', () => {
  it('baseline unchanged DSL scripts compile and lower in compatibility mode', () => {
    const { registry, output } = createRegistry()
    const node = registry.generators
      .osc(12, 0.03, 0.2)
      .rotate(0.2)
      .modulate(registry.generators.noise(3, 0.2))
      .out()

    expect(node).toBeUndefined()
    expect(output.passes.length).toBeGreaterThan(0)

    const lowered = lowerDslToIr(
      registry.generators
        .osc(12, 0.03, 0.2)
        .rotate(0.2)
        .modulate(registry.generators.noise(3, 0.2))
        .transforms
    )
    expect(lowered.compatibilityMode).toBe('dsl-v2')
    expect(lowered.nodes.length).toBeGreaterThan(0)
  })

  it('preserves renderpass boundaries and prev/prevN history behavior', () => {
    const { registry, output } = createRegistry()
    registry.generators.osc(8, 0.1, 0).renderpass().invert(1).out()

    expect(output.passes.length).toBe(2)
    expect(output.passes[1].wgsl).toContain('fn prev')

    registry.generators.prevN(4).out()
    const prevNPass = output.passes[0]
    expect(prevNPass.textures[0].sourceRef).toEqual({ historyOffset: 4 })
  })

  it('supports nested combine/combineCoord graphs unchanged', () => {
    const { registry, output } = createRegistry()
    registry.generators
      .osc(6, 0.04, 0.1)
      .modulate(
        registry.generators
          .noise(4, 0.2)
          .rotate(0.3),
        0.25
      )
      .blend(
        registry.generators
          .shape(4, 0.3, 0.01)
          .rotate(0.1),
        0.4
      )
      .out()

    expect(output.passes.length).toBeGreaterThan(0)
    const wgsl = output.passes.map((pass) => pass.wgsl).join('\n')
    expect(wgsl).toContain('fn modulate')
    expect(wgsl).toContain('fn blend')
  })

  it('keeps dynamic uniform callbacks deterministic with tolerance checks', () => {
    const { registry, output } = createRegistry()
    registry.registerTransform({
      name: 'vecWave',
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
      .osc(
        ({ time }) => 5 + (time * 0.5),
        ({ bpm }) => bpm / 600,
        () => 0.1
      )
      .vecWave(({ time }) => [time * 0.1, 0.2, 0.3], () => 0.7)
      .out()

    expect(output.passes.length).toBe(1)
    const uniforms = output.passes[0].uniforms
    const freq = uniforms.find((uniform) => uniform.name.startsWith('frequency'))
    const sync = uniforms.find((uniform) => uniform.name.startsWith('sync'))
    const tint = uniforms.find((uniform) => uniform.name.startsWith('tint'))
    if (!freq || !sync || !tint) throw new Error('Expected dynamic uniforms are missing.')

    const probe = { time: 3.2, bpm: 120, resolution: [640, 360] as [number, number], deltaMs: 16 }
    expect(Number(freq.value(probe))).toBeCloseTo(6.6, 5)
    expect(Number(sync.value(probe))).toBeCloseTo(0.2, 5)
    const vec = tint.value(probe)
    if (!Array.isArray(vec)) throw new Error('Expected vec3 callback value.')
    expect(vec[0]).toBeCloseTo(0.32, 5)
  })

  it('preserves registerFunction extension flow for custom transforms', () => {
    const { registry, output } = createRegistry()
    const bindings: Record<string, unknown> = {}
    registry.attachToBindings(bindings)

    const registerFunction = bindings.registerFunction as (definition: HydraTransformDefinition) => void
    registerFunction({
      name: 'customBias',
      type: 'color',
      inputs: [{ type: 'float', name: 'amount', default: 0.15 }],
      wgsl: `
  return vec4f(clamp(_c0.xyz + vec3f(amount), vec3f(0.0), vec3f(1.0)), _c0.w);
`
    })

    ;(bindings.osc as (...args: unknown[]) => { customBias: (...args: unknown[]) => { out: () => void } })(6, 0.1, 0)
      .customBias(0.2)
      .out()

    expect(output.passes.length).toBe(1)
    expect(output.passes[0].wgsl).toContain('fn customBias')
  })

  it('keeps multi-output source references for downstream scheduling', () => {
    const { registry, output } = createRegistry()
    const upstreamOutput = { id: 2, getTexture: () => null }
    registry.generators.src(upstreamOutput).out()

    expect(output.passes.length).toBe(1)
    expect(output.passes[0].textures[0].sourceRef).toBe(upstreamOutput)
  })

  it('compiles deterministic plans across repeated unchanged DSL scripts', () => {
    const { registry } = createRegistry()
    const script = registry.generators
      .osc(9, 0.05, 0.1)
      .blurX(1)
      .blurY(1)
      .toneMap(1.1, 2.2)

    const planA = compileGraph(script.transforms, { graphId: 'compat-matrix' })
    const planB = compileGraph(script.transforms, { graphId: 'compat-matrix' })

    expect(planA.cacheKey).toBe(planB.cacheKey)
    expect(planA.sourceGraph.compatibilityMode).toBe('dsl-v2')
    expect(planA.steps.length).toBe(planB.steps.length)
  })

  it('uses graph-aware output hooks without breaking direct render adapters', () => {
    const output = new GraphAwareCaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })

    registry.generators.osc(4, 0.1, 0).out()

    expect(output.graphSource).not.toBeNull()
    expect(output.passes.length).toBeGreaterThan(0)
  })
})
