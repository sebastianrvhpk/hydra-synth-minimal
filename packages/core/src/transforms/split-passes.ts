import type { HydraTransformCall } from '../types.js'

const STANDALONE_PASS_TYPES = new Set(['renderpass', 'simulation', 'analysis', 'kernel'])

const createPrevTransform = (anchor: HydraTransformCall): HydraTransformCall | null => {
  const prevGenerator = anchor.synth.generators.prev
  if (typeof prevGenerator !== 'function') return null

  try {
    const prevNode = prevGenerator()
    if (!prevNode || !Array.isArray(prevNode.transforms) || prevNode.transforms.length === 0) return null
    return prevNode.transforms[0]
  } catch {
    return null
  }
}

export const splitPasses = (transforms: HydraTransformCall[]): HydraTransformCall[][] => {
  const passes: HydraTransformCall[][] = []
  let currentPass: HydraTransformCall[] = []
  let shouldInjectPrev = false

  const pushCurrentPass = (): void => {
    if (currentPass.length === 0) return
    passes.push(currentPass)
    currentPass = []
  }

  for (const transform of transforms) {
    if (STANDALONE_PASS_TYPES.has(transform.transform.type)) {
      pushCurrentPass()
      const isIdentityRenderpass =
        transform.transform.type === 'renderpass' && transform.name === 'renderpass'
      if (!isIdentityRenderpass) passes.push([transform])
      shouldInjectPrev = true
      continue
    }

    if (currentPass.length === 0 && shouldInjectPrev && transform.transform.type !== 'src') {
      const prevTransform = createPrevTransform(transform)
      if (prevTransform) currentPass.push(prevTransform)
    }

    currentPass.push(transform)
    shouldInjectPrev = false
  }

  pushCurrentPass()
  return passes
}
