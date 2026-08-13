import { describe, expect, it } from 'vitest'
import { getDefaultTransforms, getHydraTransformDescriptors } from '../../src/core/transforms/default-transforms.ts'

describe('Hydra transform descriptors', () => {
  it('describes every built-in transform without exposing shader implementation', () => {
    const definitions = getDefaultTransforms()
    const descriptors = getHydraTransformDescriptors()

    expect(descriptors.map(({ name }) => name)).toEqual(definitions.map(({ name }) => name))
    expect(descriptors.map(({ type }) => type)).toEqual(definitions.map(({ type }) => type))
    expect(descriptors.every((descriptor) => !Object.hasOwn(descriptor, 'shader'))).toBe(true)
    expect(descriptors.every((descriptor) => !Object.hasOwn(descriptor, 'resolutionScale'))).toBe(true)
  })

  it('returns fresh input descriptors for consumers such as autocomplete', () => {
    const first = getHydraTransformDescriptors()
    const osc = first.find(({ name }) => name === 'osc')
    if (!osc?.inputs[0]) throw new Error('Missing osc descriptor input.')
    osc.inputs[0].name = 'changed'

    const secondOsc = getHydraTransformDescriptors().find(({ name }) => name === 'osc')
    expect(secondOsc?.inputs[0]?.name).toBe('frequency')
  })
})
