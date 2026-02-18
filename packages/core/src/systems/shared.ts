import type { HydraFrameState, HydraGraphNode as HydraGraphNodeShape } from '../types.js'

export type HydraBindings = Record<string, unknown>

export const isGraphNode = (value: unknown): value is HydraGraphNodeShape => (
  Boolean(value) &&
  typeof value === 'object' &&
  'transforms' in (value as Record<string, unknown>)
)

export const requireBindingFunction = <T = (...args: unknown[]) => unknown>(
  bindings: HydraBindings,
  name: string
): T => {
  const fn = bindings[name]
  if (typeof fn !== 'function') {
    throw new Error(`Hydra system requires binding "${name}" to be a function.`)
  }
  return fn as T
}

export const callNodeMethod = (
  node: HydraGraphNodeShape,
  name: string,
  args: unknown[]
): HydraGraphNodeShape => {
  const method = (node as Record<string, unknown>)[name]
  if (typeof method !== 'function') {
    throw new Error(`Hydra system requires graph method "${name}" to exist.`)
  }
  return (method as (...callArgs: unknown[]) => HydraGraphNodeShape).apply(node, args)
}

export const createHeadlessNode = (
  bindings: HydraBindings,
  name: string,
  args: unknown[]
): HydraGraphNodeShape => {
  const factory = requireBindingFunction<(...callArgs: unknown[]) => HydraGraphNodeShape>(bindings, name)
  const node = factory(...args)
  if (node && Array.isArray(node.transforms) && node.transforms.length > 0) {
    const first = node.transforms[0]
    if (first && first.name === 'solid') {
      node.transforms.shift()
    }
  }
  return node
}

export const createEmitOnce = (emitEvent?: (name: string) => void) => {
  const emitted = new Set<string>()
  return (name: string): void => {
    if (!emitEvent || emitted.has(name)) return
    emitted.add(name)
    emitEvent(name)
  }
}

export const resolveNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return fallback
}

export const resolveBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value
  return fallback
}

export const resolvePulse = (
  amount: number | ((props: HydraFrameState) => number) | undefined,
  duration: number
): number | ((props: HydraFrameState) => number) => {
  if (typeof amount === 'function') return amount
  const strength = resolveNumber(amount, 0)
  if (!Number.isFinite(duration) || duration <= 0) return strength
  return (props: HydraFrameState) => (props.time < duration ? strength : 0)
}

export const resolveTint = (
  value: [number, number, number] | [number, number, number, number] | undefined
): [number, number, number] => {
  if (Array.isArray(value) && value.length >= 3) {
    return [
      Number(value[0]) || 0,
      Number(value[1]) || 0,
      Number(value[2]) || 0
    ]
  }
  return [1, 1, 1]
}

export const resolveGraphNode = (
  bindings: HydraBindings,
  value: unknown,
  fallback: () => HydraGraphNodeShape
): HydraGraphNodeShape => {
  if (isGraphNode(value)) return value
  if (Array.isArray(value) || typeof value === 'number') {
    const solid = bindings.solid
    if (typeof solid === 'function') {
      const values = Array.isArray(value) ? value.map((entry) => Number(entry)) : [Number(value)]
      const rgba: number[] = []
      for (let index = 0; index < 4; index += 1) {
        const fallbackValue = index === 3 ? 1 : 0
        const next = values[index] ?? (values.length === 1 ? values[0] : fallbackValue)
        rgba.push(Number.isFinite(next) ? Number(next) : fallbackValue)
      }
      return (solid as (...args: number[]) => HydraGraphNodeShape)(rgba[0], rgba[1], rgba[2], rgba[3])
    }
  }
  return fallback()
}
