import type { HydraTransformCall } from '../types.js'

const STANDALONE_PASS_TYPES = new Set(['passBoundary', 'renderpass'])

type InternalHydraTransformCall = HydraTransformCall & {
  __hydraInjectedPrev?: boolean
}

interface InternalPassTextureProvider {
  internalPassIndex: number
  getTexture: () => null
}

const isGraphNodeLike = (value: unknown): value is { transforms: HydraTransformCall[] } => (
  value !== null &&
  typeof value === 'object' &&
  'transforms' in value &&
  Array.isArray((value as { transforms?: unknown }).transforms)
)

const containsRenderpassDeep = (transforms: HydraTransformCall[]): boolean =>
  transforms.some((transform) => (
    STANDALONE_PASS_TYPES.has(transform.transform.type) ||
    (transform.userArgs ?? []).some((arg) => isGraphNodeLike(arg) && containsRenderpassDeep(arg.transforms))
  ))

const isSafePostRenderpassFusion = (transform: HydraTransformCall): boolean => (
  transform.transform.type === 'color' &&
  !(transform.userArgs ?? []).some((arg) => isGraphNodeLike(arg) && containsRenderpassDeep(arg.transforms))
)

const createInternalPassTextureProvider = (internalPassIndex: number): InternalPassTextureProvider => ({
  internalPassIndex,
  getTexture: () => null
})

const cloneTransformWithArgs = (
  transform: HydraTransformCall,
  userArgs: unknown[]
): HydraTransformCall => ({
  ...transform,
  userArgs
})

const createPrevTransform = (anchor: HydraTransformCall): HydraTransformCall => {
  const prevGenerator = anchor.synth.generators.prev
  if (typeof prevGenerator !== 'function') throw new Error('Hydra internal invariant failed: prev() is not registered.')

  const prevNode = prevGenerator()
  if (!prevNode || !Array.isArray(prevNode.transforms) || prevNode.transforms.length === 0) {
    throw new Error('Hydra internal invariant failed: prev() did not produce a transform.')
  }
  const transform = prevNode.transforms[0] as InternalHydraTransformCall
  transform.__hydraInjectedPrev = true
  return transform
}

const createInternalSrcTransform = (
  anchor: HydraTransformCall,
  internalPassIndex: number
): HydraTransformCall => {
  const srcGenerator = anchor.synth.generators.src
  if (typeof srcGenerator !== 'function') throw new Error('Hydra internal invariant failed: src() is not registered.')

  const srcNode = srcGenerator(createInternalPassTextureProvider(internalPassIndex))
  if (!srcNode || !Array.isArray(srcNode.transforms) || srcNode.transforms.length === 0) {
    throw new Error('Hydra internal invariant failed: src() did not produce a transform.')
  }
  return srcNode.transforms[0] as HydraTransformCall
}

const splitLinearPasses = (transforms: HydraTransformCall[]): HydraTransformCall[][] => {
  const passes: HydraTransformCall[][] = []
  let currentPass: HydraTransformCall[] = []
  let shouldInjectPrev = false

  const pushCurrentPass = (): void => {
    if (currentPass.length === 0) return
    passes.push(currentPass)
    currentPass = []
  }

  for (let transformIndex = 0; transformIndex < transforms.length; transformIndex += 1) {
    const transform = transforms[transformIndex]
    if (!transform) continue
    if (STANDALONE_PASS_TYPES.has(transform.transform.type)) {
      pushCurrentPass()
      const isPassBoundary = transform.transform.type === 'passBoundary'
      if (!isPassBoundary) {
        const fusedPass = [transform]
        while (
          transformIndex + 1 < transforms.length &&
          Boolean(transforms[transformIndex + 1]) &&
          isSafePostRenderpassFusion(transforms[transformIndex + 1] as HydraTransformCall)
        ) {
          transformIndex += 1
          const nextTransform = transforms[transformIndex]
          if (nextTransform) fusedPass.push(nextTransform)
        }
        passes.push(fusedPass)
      }
      shouldInjectPrev = true
      continue
    }

    if (currentPass.length === 0 && shouldInjectPrev && transform.transform.type !== 'src') {
      currentPass.push(createPrevTransform(transform))
    }

    currentPass.push(transform)
    shouldInjectPrev = false
  }

  pushCurrentPass()
  return passes
}

const stageNestedRenderpassArgs = (
  transforms: HydraTransformCall[],
  startPassIndex: number
): HydraTransformCall[][] => {
  const linearPasses = splitLinearPasses(transforms)
  const stagedPasses: HydraTransformCall[][] = []

  const stageArg = (arg: unknown): unknown => {
    if (!isGraphNodeLike(arg) || !containsRenderpassDeep(arg.transforms)) return arg

    const nestedPasses = stageNestedRenderpassArgs(
      arg.transforms,
      startPassIndex + stagedPasses.length
    )
    stagedPasses.push(...nestedPasses)
    return createInternalPassTextureProvider(startPassIndex + stagedPasses.length - 1)
  }

  for (const pass of linearPasses) {
    const previousPassIndex = stagedPasses.length > 0
      ? startPassIndex + stagedPasses.length - 1
      : null
    let insertedNestedPass = false

    const processedPass = pass.map((transform) => {
      const beforeCount = stagedPasses.length
      const userArgs = (transform.userArgs ?? []).map(stageArg)
      if (stagedPasses.length > beforeCount) insertedNestedPass = true
      return cloneTransformWithArgs(transform, userArgs)
    })

    const firstTransform = processedPass[0] as InternalHydraTransformCall | undefined
    if (
      insertedNestedPass &&
      previousPassIndex !== null &&
      firstTransform?.__hydraInjectedPrev
    ) {
      processedPass[0] = createInternalSrcTransform(firstTransform, previousPassIndex)
    }

    stagedPasses.push(processedPass)
  }

  return stagedPasses
}

export const splitPasses = (transforms: HydraTransformCall[]): HydraTransformCall[][] =>
  stageNestedRenderpassArgs(transforms, 0)
