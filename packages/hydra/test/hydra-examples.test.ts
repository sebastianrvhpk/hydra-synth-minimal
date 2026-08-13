import { describe, expect, it, vi } from 'vitest'
import {
  createHydraExamplePicker,
  decodeHydraExampleCode,
  hydraExamples,
  hydraExamplesSource,
  materializeHydraExample
} from '../hydra-examples.js'

describe('canonical Hydra examples', () => {
  it('vendors the complete canonical collection at a traceable commit', () => {
    expect(hydraExamples).toHaveLength(58)
    expect(hydraExamplesSource).toEqual({
      repository: 'https://github.com/hydra-synth/hydra',
      commit: '1fab4f65d5797d3f9cf2c83286cbad1d51cdd47a',
      path: 'src/stores/examples.json',
      license: 'CC BY-NC-SA 4.0'
    })
    expect(hydraExamples.map(({ sketch_id }) => sketch_id)).toContain('example_3')
    expect(hydraExamples.map(({ sketch_id }) => sketch_id)).toContain('eerie_ear_3')
  })

  it('decodes the same percent-encoded base64 format as Hydra gallery', () => {
    const example = hydraExamples.find(({ sketch_id }) => sketch_id === 'example_3')
    const code = decodeHydraExampleCode(example?.code)

    expect(code).toContain('// by Olivia Jack')
    expect(code).toContain('osc(20, 0.03, 1.7)')
  })

  it('preserves attribution and adds the canonical gallery license', () => {
    const sketch = materializeHydraExample(hydraExamples[0])

    expect(sketch?.id).toBe('example_0')
    expect(sketch?.name).toBe('Flor de Fuego')
    expect(sketch?.code).toMatch(/^\/\/ licensed with CC BY-NC-SA 4\.0/u)
    expect(sketch?.code).toContain('//Flor de Fuego')
  })

  it('never picks the same sketch twice in succession', () => {
    const random = vi.fn(() => 0)
    const pick = createHydraExamplePicker({
      examples: hydraExamples.slice(0, 3),
      random
    })

    const ids = [pick()?.id, pick()?.id, pick()?.id, pick()?.id]
    expect(ids).toEqual(['example_0', 'example_3', 'example_0', 'example_3'])
  })

  it('contains syntactically valid JavaScript sketches', () => {
    for (const example of hydraExamples) {
      const sketch = materializeHydraExample(example)
      expect(() => Function(sketch?.code ?? '')).not.toThrow()
    }
  })
})
