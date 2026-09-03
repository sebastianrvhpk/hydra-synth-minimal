import { readFileSync } from 'node:fs'
import * as naga from 'web-naga'
import { beforeAll, describe, expect, it } from 'vitest'
import { compileTrustedHydraProgram } from '../../src/portable-plan.ts'

beforeAll(() => {
  const wasm = readFileSync(new URL('../../node_modules/web-naga/web_naga_bg.wasm', import.meta.url))
  naga.initSync({ module: wasm })
})

describe('portable Hydra render plans', () => {
  it('serializes GLSL and samples dynamic uniforms for each frame', async () => {
    const plan = await compileTrustedHydraProgram({
      code: 'osc(({ time }) => 4 + time, 0.1, 0).out()',
      width: 320,
      height: 180,
      frameCount: 3,
      fps: 2,
      startTime: 1,
      bpm: 90,
      naga
    })

    expect(plan.schema).toBe('hydra.portable-render-plan/1')
    expect(plan.clock).toMatchObject({ width: 320, height: 180, frameCount: 3, fps: 2 })
    expect(plan.outputs).toHaveLength(1)
    expect(plan.outputs[0]?.passes[0]?.glsl).toContain('#version 300 es')
    expect(plan.outputs[0]?.passes[0]?.uniformFrames.map((frame) => frame[0])).toEqual([5, 5.5, 6])
    expect(() => JSON.stringify(plan)).not.toThrow()
  })

  it('normalizes input, output, internal-pass, and history texture references', async () => {
    const plan = await compileTrustedHydraProgram({
      code: `
        src(s0).blend(noise(2).blur(1), 0.25).out(o0)
        src(o0).blend(prevN(o0, 3), 0.5).out(o1)
      `,
      frameCount: 2,
      naga
    })
    const sources = plan.outputs.flatMap((output) => output.passes.flatMap((pass) => pass.textures.map(({ source }) => source)))

    expect(sources).toContainEqual({ kind: 'input', index: 0 })
    expect(sources).toContainEqual({ kind: 'output', output: 0 })
    expect(sources).toContainEqual({ kind: 'previous', output: 0, offset: 3 })
    expect(sources.some((source) => source.kind === 'internal-pass')).toBe(true)
  })

  it('provides deterministic portable grammar helpers', async () => {
    const first = await compileTrustedHydraProgram({
      code: 'ns(3, 0.2, rn(), btw(-1, 1)).out(); render(o0)',
      width: 640,
      height: 360,
      frameCount: 2,
      seed: 42,
      naga
    })
    const second = await compileTrustedHydraProgram({
      code: 'ns(3, 0.2, rn(), btw(-1, 1)).out(); render(o0)',
      width: 640,
      height: 360,
      frameCount: 2,
      seed: 42,
      naga
    })

    expect(first.outputs[0]?.passes[0]?.glsl).toBe(second.outputs[0]?.passes[0]?.glsl)
    expect(first.outputs[0]?.passes[0]?.signature).toBe(second.outputs[0]?.passes[0]?.signature)
  })

  it('rejects patches that do not render an output', async () => {
    await expect(compileTrustedHydraProgram({ code: 'osc(10)', naga })).rejects.toThrow(/did not render an output/u)
  })
})
