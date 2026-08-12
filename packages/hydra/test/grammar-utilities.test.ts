import { describe, expect, it, vi } from 'vitest'
import { createGrammarUtilities } from '../grammar-utilities.js'

const createTexture = (kind: string, args: unknown[]) => {
  const texture = {
    kind,
    args,
    scale: vi.fn(),
    modulate: vi.fn()
  }
  texture.scale.mockReturnValue(texture)
  texture.modulate.mockReturnValue(texture)
  return texture
}

const createSynth = () => {
  const textures: ReturnType<typeof createTexture>[] = []
  const synth = {
    noise: vi.fn((...args: unknown[]) => {
      const texture = createTexture('noise', args)
      textures.push(texture)
      return texture
    }),
    noiseLoop: vi.fn((...args: unknown[]) => {
      const texture = createTexture('noiseLoop', args)
      textures.push(texture)
      return texture
    }),
    solid: vi.fn((...args: unknown[]) => ({ kind: 'solid', args }))
  }
  return { synth, textures }
}

describe('Hydra grammar utilities', () => {
  it('exposes only the six constant, signal, and texture primitives', () => {
    const { synth } = createSynth()
    const utilities = createGrammarUtilities({
      synth,
      readWidth: () => 1920,
      readHeight: () => 1080
    })

    expect(Object.keys(utilities)).toEqual(['A', 'B', 'rn', 'btw', 'ns', 'nsloop'])
    expect(Object.isFrozen(utilities)).toBe(true)
  })

  it('captures A and B as numeric constants for the current render dimensions', () => {
    const { synth } = createSynth()
    const dimensions = { width: 1920, height: 1080 }
    const landscape = createGrammarUtilities({
      synth,
      readWidth: () => dimensions.width,
      readHeight: () => dimensions.height
    })

    expect(landscape.A).toBeCloseTo(1080 / 1920)
    expect(landscape.B).toBe(1)
    expect(typeof landscape.A).toBe('number')
    expect(typeof landscape.B).toBe('number')

    dimensions.width = 720
    dimensions.height = 1280

    expect(landscape.A).toBeCloseTo(1080 / 1920)
    expect(landscape.B).toBe(1)

    const portrait = createGrammarUtilities({
      synth,
      readWidth: () => dimensions.width,
      readHeight: () => dimensions.height
    })

    expect(portrait.A).toBe(1)
    expect(portrait.B).toBeCloseTo(720 / 1280)
  })

  it('evaluates rn and btw once with an unbiased uniform random value', () => {
    const { synth } = createSynth()
    const randomValues = [0.25, 0.75]
    const utilities = createGrammarUtilities({
      synth,
      readWidth: () => 1,
      readHeight: () => 1,
      random: () => randomValues.shift() ?? 0
    })

    expect(utilities.rn(8)).toBe(2)
    expect(utilities.btw(-2, 2)).toBe(1)
  })

  it('gives each ns call a new seed and passes numeric aspect constants to scale', () => {
    const { synth, textures } = createSynth()
    const randomValues = [0.1, 0.2, 0.3, 0.4]
    const utilities = createGrammarUtilities({
      synth,
      readWidth: () => 1280,
      readHeight: () => 720,
      random: () => randomValues.shift() ?? 0
    })

    utilities.ns()
    utilities.ns()

    expect(synth.noise).toHaveBeenNthCalledWith(1, 10, 0.1)
    expect(synth.noise).toHaveBeenNthCalledWith(2, 10, 0.1)
    expect(synth.solid).toHaveBeenNthCalledWith(1, 0.1, 0.2)
    expect(synth.solid).toHaveBeenNthCalledWith(2, 0.3, 0.4)
    expect(textures[0]?.scale).toHaveBeenCalledWith(1, 720 / 1280, 1)
    expect(textures[1]?.scale).toHaveBeenCalledWith(1, 720 / 1280, 1)
  })

  it('makes explicit nsloop seeds reproducible without consuming randomness', () => {
    const { synth, textures } = createSynth()
    const random = vi.fn(() => 0.9)
    const utilities = createGrammarUtilities({
      synth,
      readWidth: () => 1280,
      readHeight: () => 720,
      random
    })

    utilities.nsloop(4, 0.2, 0.5, 0.25, 0.75)
    utilities.nsloop(4, 0.2, 0.5, 0.25, 0.75)

    expect(random).not.toHaveBeenCalled()
    expect(synth.noiseLoop).toHaveBeenNthCalledWith(1, 4, 0.2, 0.5)
    expect(synth.noiseLoop).toHaveBeenNthCalledWith(2, 4, 0.2, 0.5)
    expect(synth.solid).toHaveBeenNthCalledWith(1, 0.25, 0.75)
    expect(synth.solid).toHaveBeenNthCalledWith(2, 0.25, 0.75)
    expect(textures[0]?.modulate.mock.calls[0]?.[0]).toEqual(textures[1]?.modulate.mock.calls[0]?.[0])
  })
})
