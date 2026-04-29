interface HydraSequenceArray extends Array<number> {
  _speed?: number
  _smooth?: number
  _offset?: number
  _ease?: (value: number) => number
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

let installed = false

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return fallback
}

const modulo = (value: number, divisor: number): number => {
  if (!Number.isFinite(divisor) || divisor === 0) return 0
  return (value % divisor + divisor) % divisor
}

const defineArrayMethod = (name: string, value: (...args: any[]) => unknown): void => {
  if (Object.prototype.hasOwnProperty.call(Array.prototype, name)) return
  Object.defineProperty(Array.prototype, name, {
    configurable: true,
    enumerable: false,
    writable: true,
    value
  })
}

const copySequenceMetadata = (from: HydraSequenceArray, to: HydraSequenceArray): void => {
  if (typeof from._speed === 'number') to._speed = from._speed
  if (typeof from._smooth === 'number') to._smooth = from._smooth
  if (typeof from._ease === 'function') to._ease = from._ease
}

export const installArraySequenceExtensions = (): void => {
  if (installed) return
  installed = true

  defineArrayMethod('fast', function (this: HydraSequenceArray, speed = 1): HydraSequenceArray {
    this._speed = toFiniteNumber(speed, 1)
    return this
  })

  defineArrayMethod('smooth', function (this: HydraSequenceArray, smooth = 1): HydraSequenceArray {
    this._smooth = toFiniteNumber(smooth, 1)
    return this
  })

  defineArrayMethod('ease', function (
    this: HydraSequenceArray,
    ease: string | ((value: number) => number) = 'linear'
  ): HydraSequenceArray {
    if (typeof ease === 'function') {
      this._smooth = 1
      this._ease = ease
      return this
    }

    const easing = EASING_FUNCTIONS[ease]
    if (easing) {
      this._smooth = 1
      this._ease = easing
    }
    return this
  })

  defineArrayMethod('offset', function (this: HydraSequenceArray, offset = 0.5): HydraSequenceArray {
    this._offset = modulo(toFiniteNumber(offset, 0.5), 1)
    return this
  })

  defineArrayMethod('fit', function (
    this: HydraSequenceArray,
    low = 0,
    high = 1
  ): HydraSequenceArray {
    const source = this
    if (source.length === 0) return source

    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY
    for (let index = 0; index < source.length; index += 1) {
      const value = toFiniteNumber(source[index], 0)
      if (value < min) min = value
      if (value > max) max = value
    }

    const from = min
    const range = max - min
    const toLow = toFiniteNumber(low, 0)
    const toHigh = toFiniteNumber(high, 1)
    const targetRange = toHigh - toLow
    const fitted = source.map((entry) => {
      const value = toFiniteNumber(entry, from)
      if (!Number.isFinite(range) || range === 0) return toLow
      return ((value - from) * targetRange) / range + toLow
    }) as HydraSequenceArray

    copySequenceMetadata(source, fitted)
    return fitted
  })
}
