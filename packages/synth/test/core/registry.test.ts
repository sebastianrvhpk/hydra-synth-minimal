import { describe, expect, it } from 'vitest'
import {
  HydraTransformRegistry,
  getDefaultTransforms,
  type HydraCompiledPass,
  type HydraOutputAdapter,
  type HydraTransformDefinition
} from '../../src/core/index.ts'

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
    expect(output.passes[0].wgsl).toContain('@vertex')
    expect(output.passes[0].wgsl).toContain('fn vsMain')
    expect(output.passes[0].wgsl).toContain('@fragment')
    expect(output.passes[0].wgsl).toContain('fn fsMain')
  })

  it('uses fragment position directly when reconstructing normalized coordinates', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })

    registry.generators.osc(4, 0.1, 0.2).out()

    expect(output.passes.length).toBe(1)
    const wgsl = output.passes[0].wgsl
    expect(wgsl).toContain('var st = vec2f(in.position.x / safeWidth, in.position.y / safeHeight);')
    expect(wgsl).not.toContain('(in.position.x + 0.5)')
    expect(wgsl).not.toContain('(in.position.y + 0.5)')
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

  it('compiles bloom() as a renderpass over prevBuffer', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })

    registry.generators.osc(8, 0.1, 0).bloom(0.9, 1.2, 0.55, 0.15).out()

    expect(output.passes.length).toBe(2)
    expect(output.passes[0].wgsl).toContain('fn osc')
    expect(output.passes[1].wgsl).toContain('fn bloom')
    expect(output.passes[1].wgsl).toContain('prevBuffer')
    expect(output.passes[1].wgsl).toContain('hydraLuminance')
  })

  it('compiles staged bloom chains with downsample scheduling metadata', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })

    registry.generators
      .osc(8, 0.1, 0)
      .bloomThreshold(0.6, 0.1)
      .bloomDownsample(1.0)
      .bloomUpsample(1.0, 1.2)
      .bloomMix(registry.generators.osc(8, 0.1, 0), 0.8)
      .out()

    expect(output.passes.length).toBe(5)
    expect(output.passes[1].wgsl).toContain('fn bloomThreshold')
    expect(output.passes[2].wgsl).toContain('fn bloomDownsample')
    expect(output.passes[2].schedule?.resolutionScale).toBe(0.5)
    expect(output.passes[3].wgsl).toContain('fn bloomUpsample')
    expect(output.passes[4].wgsl).toContain('fn bloomMix')
  })

  it('registers additional post-processing transforms on generators and chain methods', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })
    const expectedTransforms = [
      'blurFast',
      'blurBilateral',
      'sharpen',
      'chromaticAberration',
      'rgbSplit',
      'vignette',
      'filmGrain',
      'dither',
      'edgeDetect',
      'edgeLaplacian',
      'radialBlur',
      'zoomBlur',
      'dualKawaseBlur',
      'dualKawaseBloom',
      'bloomThreshold',
      'bloomDownsample',
      'bloomUpsample',
      'bloomMix',
      'toneMap',
      'exposure'
    ]

    const registered = new Set(registry.listTransforms())
    expectedTransforms.forEach((name) => {
      expect(registered.has(name)).toBe(true)
    })
  })

  it('registers noiseLoop/fbm/ridged/turbulence and extended blend modes', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })
    const registered = new Set(registry.listTransforms())
    const expected = [
      'noiseLoop',
      'fbm',
      'ridged',
      'turbulence',
      'screen',
      'overlay',
      'softLight',
      'hardLight',
      'colorDodge',
      'colorBurn'
    ]

    expected.forEach((name) => {
      expect(registered.has(name)).toBe(true)
    })
  })

  it('compiles noiseLoop/fbm chains with blend modes', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })

    registry.generators
      .fbm(4.0, 0.15, 4.0, 2.0, 0.5)
      .screen(registry.generators.ridged(5.0, 0.2, 4.0, 2.0, 0.55), 0.7)
      .softLight(registry.generators.turbulence(3.0, 0.1, 3.0, 2.0, 0.5), 0.45)
      .overlay(registry.generators.noiseLoop(6.0, 0.2, 0.8), 0.6)
      .out()

    expect(output.passes.length).toBe(1)
    const wgsl = output.passes[0].wgsl
    expect(wgsl).toContain('fn noiseLoop')
    expect(wgsl).toContain('fn fbm')
    expect(wgsl).toContain('fn ridged')
    expect(wgsl).toContain('fn turbulence')
    expect(wgsl).toContain('fn screen')
    expect(wgsl).toContain('fn softLight')
    expect(wgsl).toContain('fn overlay')
  })

  it('compiles a full chain with all new post-processing transforms', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })

    registry.generators
      .osc(8, 0.1, 0)
      .sharpen(1.1, 1.0)
      .chromaticAberration(1.3, 1.0)
      .rgbSplit(1.0, 0.2)
      .vignette(0.6, 0.9, 0.35)
      .filmGrain(0.05, 24.0, 0.5)
      .dither(0.8, 8.0)
      .edgeDetect(1.0, 0.6)
      .radialBlur(1.0, 0.8)
      .zoomBlur(0.8, 0.5, 0.5)
      .dualKawaseBlur(1.5, 1.0)
      .dualKawaseBloom(0.8, 1.0, 0.6, 0.1)
      .toneMap(1.0, 2.2)
      .exposure(0.1)
      .out()

    expect(output.passes.length).toBe(13)

    const wgsl = output.passes.map((pass) => pass.wgsl).join('\n')
    expect(wgsl).toContain('fn sharpen')
    expect(wgsl).toContain('fn chromaticAberration')
    expect(wgsl).toContain('fn rgbSplit')
    expect(wgsl).toContain('fn vignette')
    expect(wgsl).toContain('fn filmGrain')
    expect(wgsl).toContain('fn dither')
    expect(wgsl).toContain('fn fsMain')
    expect(wgsl).toContain('fn radialBlur')
    expect(wgsl).toContain('fn zoomBlur')
    expect(wgsl).toContain('fn dualKawaseBlur')
    expect(wgsl).toContain('fn dualKawaseBloom')
    expect(wgsl).toContain('fn toneMap')
    expect(wgsl).toContain('fn exposure')
    expect(wgsl).toContain('fn hydraNoise')
    expect(wgsl).toContain('fn hydraMod')
  })

  it('emits fragment entry points for directional blur kernels', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })

    registry.generators.osc(8, 0.1, 0).blurX(1).blurY(1).out()

    expect(output.passes.length).toBe(3)
    expect(output.passes[1].wgsl).toContain('fn blurX')
    expect(output.passes[2].wgsl).toContain('fn blurY')
    expect(output.passes[1].wgsl).toContain('@fragment')
    expect(output.passes[2].wgsl).toContain('@fragment')
  })

  it('compiles blurFast as a fragment pass', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })

    registry.generators.osc(8, 0.1, 0).blurFast(1).out()

    expect(output.passes.length).toBe(2)
    const blurPass = output.passes[1]

    expect(blurPass.wgsl).toContain('fn blurFast')
  })

  it('compiles edgeDetect/edgeLaplacian as fragment passes', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })

    registry.generators.osc(8, 0.1, 0).edgeDetect(1, 1).edgeLaplacian(1, 1).out()

    expect(output.passes.length).toBe(3)
    const edgeDetectPass = output.passes[1]
    const edgeLaplacianPass = output.passes[2]

    expect(edgeDetectPass.wgsl).toContain('fn edgeDetect')
    expect(edgeLaplacianPass.wgsl).toContain('fn edgeLaplacian')
  })

  it('injects prev() when chaining non-src transforms after renderpass boundaries', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })

    registry.generators.osc(8, 0.1, 0).renderpass().invert(1).out()

    expect(output.passes.length).toBe(2)
    expect(output.passes[1].wgsl).toContain('fn prev')
    expect(output.passes[1].wgsl).toContain('fn invert')
  })

  it('supports repeatX/repeatY coordinate transforms with Hydra defaults', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })

    registry.generators
      .osc(8, 0.1, 0)
      .repeatX(3, 0.25)
      .repeatY(2, 0.5)
      .out()

    expect(output.passes.length).toBe(1)
    const wgsl = output.passes[0].wgsl
    expect(wgsl).toContain('fn repeatX')
    expect(wgsl).toContain('fn repeatY')
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

  it('compiles prevN() sampler inputs into history-offset texture bindings', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })

    registry.generators.prevN(3).out()

    expect(output.passes.length).toBe(1)
    expect(output.passes[0].textures.length).toBe(1)
    expect(output.passes[0].textures[0].sourceRef).toEqual({ historyOffset: 3 })
  })

  it('compiles prevN(source, lag) into output-scoped history bindings', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })
    const sourceOutput = {
      id: 1,
      getTexture: () => null
    }

    registry.generators.prevN(sourceOutput, 5).out()

    expect(output.passes.length).toBe(1)
    expect(output.passes[0].textures.length).toBe(1)
    expect(output.passes[0].textures[0].sourceRef).toEqual({ id: 1, historyOffset: 5 })
  })

  it('prevents uniform name collisions when sequential transforms reuse argument names', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })

    registry.registerTransform({
      name: 'uniformA',
      type: 'color',
      inputs: [
        { type: 'float', name: 'foo', default: 0.1 },
        { type: 'float', name: 'amount', default: 0.2 }
      ],
      wgsl: `
  return _c0 + vec4f(foo + amount);
`
    })

    registry.registerTransform({
      name: 'uniformB',
      type: 'color',
      inputs: [
        { type: 'float', name: 'amount', default: 0.3 }
      ],
      wgsl: `
  return _c0 + vec4f(amount);
`
    })

    registry.generators
      .solid(0.1, 0.2, 0.3, 1.0)
      .uniformA(() => 0.4, () => 0.5)
      .uniformB(() => 0.6)
      .out()

    expect(output.passes.length).toBe(1)
    const uniforms = output.passes[0].uniforms
    expect(uniforms.length).toBe(3)
    expect(new Set(uniforms.map((uniform) => uniform.name)).size).toBe(3)
  })

  it('prevents sampler binding collisions when sequential transforms reuse sampler names', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })
    const sourceA = { id: 10, getTexture: () => null }
    const sourceB = { id: 11, getTexture: () => null }
    const sourceC = { id: 12, getTexture: () => null }

    registry.registerTransform({
      name: 'samplePair',
      type: 'color',
      inputs: [
        { type: 'sampler2D', name: 'texA', default: sourceA },
        { type: 'sampler2D', name: 'tex', default: sourceB }
      ],
      wgsl: `
  let a = hydraSampleTexture(texA, _st);
  let b = hydraSampleTexture(tex, _st);
  return (_c0 + a + b) / 3.0;
`
    })

    registry.registerTransform({
      name: 'sampleSingle',
      type: 'color',
      inputs: [
        { type: 'sampler2D', name: 'tex', default: sourceC }
      ],
      wgsl: `
  let c = hydraSampleTexture(tex, _st);
  return (_c0 + c) / 2.0;
`
    })

    registry.generators
      .solid(0.5, 0.4, 0.3, 1.0)
      .samplePair(sourceA, sourceB)
      .sampleSingle(sourceC)
      .out()

    expect(output.passes.length).toBe(1)
    const textures = output.passes[0].textures
    expect(textures.length).toBe(3)
    expect(new Set(textures.map((texture) => texture.name)).size).toBe(3)
    expect(new Set(textures.map((texture) => texture.binding)).size).toBe(3)
  })

  it('emits pass IR metadata and scheduling defaults for compiled passes', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })

    registry.generators.osc(8, 0.1, 0).out()

    expect(output.passes.length).toBe(1)
    const pass = output.passes[0]
    expect(pass.ir).toBeDefined()
    expect(pass.schedule).toEqual({
      resolutionScale: 1,
      updateRate: 'everyFrame',
      sparse: false
    })
    expect(pass.ir?.writes).toContain('outImage')
  })

  it('merges everyNFrames update rates deterministically across transform order', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })

    registry.registerTransform({
      name: 'slowTick',
      type: 'color',
      updateRate: { everyNFrames: 5 },
      wgsl: `
  return _c0;
`
    })
    registry.registerTransform({
      name: 'fastTick',
      type: 'color',
      updateRate: { everyNFrames: 2 },
      wgsl: `
  return _c0;
`
    })

    registry.generators.solid(0.1, 0.2, 0.3, 1).slowTick().fastTick().out()
    const forwardRate = output.passes[0].schedule?.updateRate

    registry.generators.solid(0.1, 0.2, 0.3, 1).fastTick().slowTick().out()
    const reverseRate = output.passes[0].schedule?.updateRate

    expect(forwardRate).toEqual({ everyNFrames: 5 })
    expect(reverseRate).toEqual({ everyNFrames: 5 })
  })

  it('accepts float array inputs as sequenced dynamic uniforms', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })
    const frequencySequence = [0.2, 0.8, 0.4]

    registry.generators
      .osc(frequencySequence, 0.1, 0)
      .out()

    expect(output.passes.length).toBe(1)
    const frequencyUniform = output.passes[0].uniforms.find((uniform) => uniform.name.startsWith('frequency'))
    if (!frequencyUniform) throw new Error('Expected frequency uniform to be present.')

    const probe = { time: 1.25, bpm: 120, resolution: [640, 360] as [number, number], deltaMs: 16 }
    expect(Number(frequencyUniform.value(probe))).toBeCloseTo(0.4, 5)
  })

  it('evaluates shared array sequences once per frame across uniforms', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })
    let easeCallCount = 0
    const sharedSequence = [0.2, 0.8, 0.4] as number[] & {
      _smooth?: number
      _ease?: (value: number) => number
    }
    sharedSequence._smooth = 1
    sharedSequence._ease = (value: number) => {
      easeCallCount += 1
      return value
    }

    registry.generators
      .osc(sharedSequence, 0.1, 0)
      .rotate(sharedSequence)
      .out()

    expect(output.passes.length).toBe(1)
    const frequencyUniform = output.passes[0].uniforms.find((uniform) => uniform.name.startsWith('frequency'))
    const angleUniform = output.passes[0].uniforms.find((uniform) => uniform.name.startsWith('angle'))
    if (!frequencyUniform || !angleUniform) throw new Error('Expected sequenced uniforms are missing.')

    const frameA = { time: 2.5, bpm: 120, resolution: [640, 360] as [number, number], deltaMs: 16 }
    Number(frequencyUniform.value(frameA))
    Number(angleUniform.value(frameA))
    expect(easeCallCount).toBe(1)

    const frameB = { time: 2.75, bpm: 120, resolution: [640, 360] as [number, number], deltaMs: 16 }
    Number(frequencyUniform.value(frameB))
    Number(angleUniform.value(frameB))
    expect(easeCallCount).toBe(2)
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

  it('applies declared offset parameters in modulateRepeat variants', () => {
    const definitions = new Map(getDefaultTransforms().map((definition) => [definition.name, definition]))
    const repeatX = definitions.get('repeatX')?.wgsl ?? ''
    const repeatY = definitions.get('repeatY')?.wgsl ?? ''
    const modulateRepeat = definitions.get('modulateRepeat')?.wgsl ?? ''
    const modulateRepeatX = definitions.get('modulateRepeatX')?.wgsl ?? ''
    const modulateRepeatY = definitions.get('modulateRepeatY')?.wgsl ?? ''

    expect(repeatX).toContain('st.y += step(1.0, hydraMod(st.x, 2.0)) * offset')
    expect(repeatY).toContain('st.x += step(1.0, hydraMod(st.y, 2.0)) * offset')
    expect(modulateRepeat).toContain('step(1.0, hydraMod(st.y, 2.0)) * offsetX + _c0.x * offsetX')
    expect(modulateRepeat).toContain('step(1.0, hydraMod(st.x, 2.0)) * offsetY + _c0.y * offsetY')
    expect(modulateRepeatX).toContain('step(1.0, hydraMod(st.x, 2.0)) * offset + _c0.x * offset')
    expect(modulateRepeatY).toContain('step(1.0, hydraMod(st.y, 2.0)) * offset + _c0.x * offset')
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
