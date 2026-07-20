import { describe, expect, it } from 'vitest'
import { HydraAudioAnalyzer } from '../src/runtime/audio-input.ts'

describe('HydraAudioAnalyzer', () => {
  it('exposes Hydra a/a0 band helpers and audio metrics', () => {
    const audio = new HydraAudioAnalyzer({
      numBins: 4,
      cutoff: 2,
      scale: 10,
      smooth: 0
    })
    const bindings: Record<string, unknown> = {}
    audio.attachBindings(bindings)

    audio.updateFromFrequencyData(
      Uint8Array.from([0, 64, 128, 255, 255, 128, 64, 0]),
      Float32Array.from([-1, -0.5, 0, 0.5, 1])
    )

    expect(bindings.a).toBe(audio)
    expect(typeof bindings.a0).toBe('function')
    expect(typeof bindings.a3).toBe('function')
    expect(audio.fft).toHaveLength(4)
    expect(audio.vol).toBeGreaterThan(0)
    expect(audio.rms).toBeGreaterThan(0)
    expect(audio.peak).toBe(1)
    expect(audio.centroid).toBeGreaterThan(0)
    expect(audio.low + audio.mid + audio.high).toBeGreaterThan(0)

    const band0 = (bindings.a0 as (scale?: number, offset?: number) => () => number)(2, 0.5)
    expect(band0()).toBeCloseTo((audio.fft[0] ?? 0) * 2 + 0.5, 5)

    audio.setBins(2)
    expect(typeof bindings.a0).toBe('function')
    expect(typeof bindings.a1).toBe('function')
    expect('a2' in bindings).toBe(false)
  })
})
