import type { HydraFrameState } from '../types.js'

interface HydraSequenceMetadata {
  _speed?: number
  _smooth?: number
  _offset?: number
  _ease?: ((value: number) => number) | string
}

type HydraSequenceSource = ArrayLike<number> & HydraSequenceMetadata
interface HydraSequenceFrameCacheEntry {
  lastTime: number
  lastBpm: number
  mode: 'empty' | 'step' | 'smooth'
  position: number
  currentIndex: number
  nextIndex: number
  amount: number
  length: number
}

const EASING_FUNCTIONS: Record<string, (value: number) => number> = {
  linear: (value) => value,
  easeInQuad: (value) => value * value,
  easeOutQuad: (value) => value * (2 - value),
  easeInOutQuad: (value) => (value < 0.5 ? 2 * value * value : -1 + (4 - 2 * value) * value),
  easeInCubic: (value) => value * value * value,
  easeOutCubic: (value) => {
    const t = value - 1
    return t * t * t + 1
  },
  easeInOutCubic: (value) => (
    value < 0.5
      ? 4 * value * value * value
      : (value - 1) * (2 * value - 2) * (2 * value - 2) + 1
  ),
  easeInQuart: (value) => value * value * value * value,
  easeOutQuart: (value) => {
    const t = value - 1
    return 1 - t * t * t * t
  },
  easeInOutQuart: (value) => (
    value < 0.5
      ? 8 * value * value * value * value
      : 1 - 8 * Math.pow(value - 1, 4)
  ),
  easeInQuint: (value) => value * value * value * value * value,
  easeOutQuint: (value) => {
    const t = value - 1
    return 1 + t * t * t * t * t
  },
  easeInOutQuint: (value) => (
    value < 0.5
      ? 16 * Math.pow(value, 5)
      : 1 + 16 * Math.pow(value - 1, 5)
  ),
  sin: (value) => (1 + Math.sin(Math.PI * value - Math.PI / 2)) * 0.5
}

const modulo = (value: number, divisor: number): number => {
  if (!Number.isFinite(divisor) || divisor === 0) return 0
  return (value % divisor + divisor) % divisor
}

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return fallback
}

const getSequenceLength = (value: ArrayLike<number>): number => {
  const length = Number((value as { length?: unknown }).length)
  if (!Number.isFinite(length) || length <= 0) return 0
  return Math.floor(length)
}

const readSequenceValue = (
  sequence: ArrayLike<number>,
  index: number,
  fallback: number
): number => {
  const candidate = sequence[index]
  return toFiniteNumber(candidate, fallback)
}

const resolveEase = (value: HydraSequenceMetadata['_ease']): ((value: number) => number) => {
  if (typeof value === 'function') return value
  if (typeof value === 'string' && value in EASING_FUNCTIONS) return EASING_FUNCTIONS[value]
  return EASING_FUNCTIONS.linear
}

const sequenceFrameCache = new WeakMap<object, HydraSequenceFrameCacheEntry>()

const refreshSequenceFrameCache = (
  cacheEntry: HydraSequenceFrameCacheEntry,
  sequence: HydraSequenceSource,
  time: number,
  bpm: number
): void => {
  cacheEntry.lastTime = time
  cacheEntry.lastBpm = bpm

  const length = getSequenceLength(sequence)
  cacheEntry.length = length
  if (length <= 0) {
    cacheEntry.mode = 'empty'
    cacheEntry.position = 0
    cacheEntry.currentIndex = 0
    cacheEntry.nextIndex = 0
    cacheEntry.amount = 0
    return
  }

  const speed = toFiniteNumber(sequence._speed, 1)
  const smooth = Math.max(0, toFiniteNumber(sequence._smooth, 0))
  const offset = toFiniteNumber(sequence._offset, 0)
  const index = time * speed * (bpm / 60) + offset

  if (smooth > 0) {
    const eased = resolveEase(sequence._ease)
    const shifted = index - smooth * 0.5
    const currentIndex = Math.floor(modulo(shifted, length))
    const nextIndex = Math.floor(modulo(shifted + 1, length))
    const interpolation = Math.min(modulo(shifted, 1) / smooth, 1)
    cacheEntry.mode = 'smooth'
    cacheEntry.currentIndex = currentIndex
    cacheEntry.nextIndex = nextIndex
    cacheEntry.amount = eased(Math.max(0, Math.min(1, interpolation)))
    return
  }

  cacheEntry.mode = 'step'
  cacheEntry.position = Math.floor(modulo(index, length))
}

export const isArrayLikeSequenceInput = (value: unknown): value is ArrayLike<number> => (
  Array.isArray(value) || ArrayBuffer.isView(value)
)

export const createArraySequenceUniformEvaluator = (
  sequenceValue: unknown,
  fallback: unknown
): ((props: HydraFrameState) => number) => {
  const fallbackNumber = toFiniteNumber(fallback, 0)
  if (!isArrayLikeSequenceInput(sequenceValue)) {
    return () => fallbackNumber
  }

  const sequence = sequenceValue as HydraSequenceSource

  return (props: HydraFrameState): number => {
    const sequenceObject = sequence as object
    let cacheEntry = sequenceFrameCache.get(sequenceObject)
    if (!cacheEntry) {
      cacheEntry = {
        lastTime: Number.NaN,
        lastBpm: Number.NaN,
        mode: 'empty',
        position: 0,
        currentIndex: 0,
        nextIndex: 0,
        amount: 0,
        length: 0
      }
      sequenceFrameCache.set(sequenceObject, cacheEntry)
    }

    const time = toFiniteNumber(props.time, 0)
    const bpm = toFiniteNumber(props.bpm, 30)
    if (time !== cacheEntry.lastTime || bpm !== cacheEntry.lastBpm) {
      refreshSequenceFrameCache(cacheEntry, sequence, time, bpm)
    }

    if (cacheEntry.mode === 'empty') return fallbackNumber
    if (cacheEntry.mode === 'step') {
      return readSequenceValue(sequence, cacheEntry.position, fallbackNumber)
    }

    const currentValue = readSequenceValue(sequence, cacheEntry.currentIndex, fallbackNumber)
    const nextValue = readSequenceValue(sequence, cacheEntry.nextIndex, fallbackNumber)
    return currentValue + (nextValue - currentValue) * cacheEntry.amount
  }
}
