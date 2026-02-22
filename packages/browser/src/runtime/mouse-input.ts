export interface HydraMouseModifiers {
  shift: boolean
  alt: boolean
  control: boolean
  meta: boolean
}

export interface HydraMouseState {
  readonly element: EventTarget | null
  enabled: boolean
  readonly x: number
  readonly y: number
  readonly pixelX: number
  readonly pixelY: number
  readonly normX: number
  readonly normY: number
  readonly uvX: number
  readonly uvY: number
  readonly buttons: number
  readonly down: boolean
  readonly inside: boolean
  readonly pressure: number
  readonly pointerType: string
  readonly mods: HydraMouseModifiers
  reset: () => void
}

export interface HydraMouseInputOptions {
  element?: EventTarget | null
  rootTarget?: EventTarget | null
  enabled?: boolean
}

export interface HydraMouseController {
  readonly state: HydraMouseState
  dispose: () => void
}

interface RectLike {
  left: number
  top: number
  width: number
  height: number
}

interface PointerEventLike extends Event {
  clientX?: number
  clientY?: number
  buttons?: number
  pressure?: number
  pointerType?: string
  isPrimary?: boolean
  altKey?: boolean
  shiftKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
}

interface KeyboardEventLike extends Event {
  altKey?: boolean
  shiftKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
}

interface PointerSurface extends EventTarget {
  width?: number
  height?: number
  getBoundingClientRect?: () => RectLike
}

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return fallback
}

const isEventTarget = (value: unknown): value is EventTarget => (
  typeof value === 'object' &&
  value !== null &&
  'addEventListener' in value &&
  typeof (value as EventTarget).addEventListener === 'function' &&
  'removeEventListener' in value &&
  typeof (value as EventTarget).removeEventListener === 'function'
)

const isPointerSurface = (value: unknown): value is PointerSurface => isEventTarget(value)

const readRect = (element: PointerSurface): RectLike => {
  if (typeof element.getBoundingClientRect === 'function') {
    const rect = element.getBoundingClientRect()
    if (rect && Number.isFinite(rect.width) && Number.isFinite(rect.height)) {
      return {
        left: toFiniteNumber(rect.left, 0),
        top: toFiniteNumber(rect.top, 0),
        width: Math.max(1, toFiniteNumber(rect.width, 1)),
        height: Math.max(1, toFiniteNumber(rect.height, 1))
      }
    }
  }

  return {
    left: 0,
    top: 0,
    width: Math.max(1, toFiniteNumber((element as { width?: number }).width, 1)),
    height: Math.max(1, toFiniteNumber((element as { height?: number }).height, 1))
  }
}

const readResolution = (element: PointerSurface): { width: number, height: number } => ({
  width: Math.max(1, toFiniteNumber((element as { width?: number }).width, 1)),
  height: Math.max(1, toFiniteNumber((element as { height?: number }).height, 1))
})

const asPointerEvent = (event: Event): PointerEventLike => event as PointerEventLike
const asKeyboardEvent = (event: Event): KeyboardEventLike => event as KeyboardEventLike

const updateModifiersFromEvent = (
  target: HydraMouseModifiers,
  event: PointerEventLike | KeyboardEventLike
): boolean => {
  let changed = false

  if ('altKey' in event && typeof event.altKey === 'boolean') {
    changed = changed || target.alt !== event.altKey
    target.alt = event.altKey
  }

  if ('shiftKey' in event && typeof event.shiftKey === 'boolean') {
    changed = changed || target.shift !== event.shiftKey
    target.shift = event.shiftKey
  }

  if ('ctrlKey' in event && typeof event.ctrlKey === 'boolean') {
    changed = changed || target.control !== event.ctrlKey
    target.control = event.ctrlKey
  }

  if ('metaKey' in event && typeof event.metaKey === 'boolean') {
    changed = changed || target.meta !== event.metaKey
    target.meta = event.metaKey
  }

  return changed
}

export const createHydraMouseInput = (
  {
    element = null,
    rootTarget = typeof window !== 'undefined' ? window : null,
    enabled = true
  }: HydraMouseInputOptions = {}
): HydraMouseController => {
  const surface = isPointerSurface(element) ? element : null
  const root = isEventTarget(rootTarget) ? rootTarget : null

  let active = false
  let x = 0
  let y = 0
  let normX = 0
  let normY = 0
  let inside = false
  let buttons = 0
  let pressure = 0
  let pointerType = 'unknown'
  const mods: HydraMouseModifiers = {
    shift: false,
    alt: false,
    control: false,
    meta: false
  }
  const disposers = new Set<() => void>()

  const updatePointerPosition = (event: PointerEventLike): void => {
    if (!surface) return

    const clientX = toFiniteNumber(event.clientX, Number.NaN)
    const clientY = toFiniteNumber(event.clientY, Number.NaN)
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return

    const rect = readRect(surface)
    const resolution = readResolution(surface)

    const localCssX = clamp(clientX - rect.left, 0, rect.width)
    const localCssY = clamp(clientY - rect.top, 0, rect.height)
    const normalizedX = rect.width > 0 ? localCssX / rect.width : 0
    const normalizedY = rect.height > 0 ? localCssY / rect.height : 0

    x = clamp(normalizedX * resolution.width, 0, resolution.width)
    y = clamp(normalizedY * resolution.height, 0, resolution.height)
    normX = resolution.width > 0 ? x / resolution.width : 0
    normY = resolution.height > 0 ? y / resolution.height : 0
  }

  const updatePointerState = (event: PointerEventLike, nextButtons?: number): void => {
    if (event.isPrimary === false) return
    updatePointerPosition(event)
    if (typeof nextButtons === 'number' && Number.isFinite(nextButtons)) {
      buttons = Math.max(0, nextButtons | 0)
    } else if (typeof event.buttons === 'number' && Number.isFinite(event.buttons)) {
      buttons = Math.max(0, event.buttons | 0)
    }
    pressure = clamp(toFiniteNumber(event.pressure, buttons > 0 ? 1 : 0), 0, 1)
    pointerType = typeof event.pointerType === 'string' && event.pointerType.length > 0
      ? event.pointerType
      : pointerType
    updateModifiersFromEvent(mods, event)
  }

  const resetState = (): void => {
    x = 0
    y = 0
    normX = 0
    normY = 0
    inside = false
    buttons = 0
    pressure = 0
    pointerType = 'unknown'
    mods.shift = false
    mods.alt = false
    mods.control = false
    mods.meta = false
  }

  const addListener = (
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    optionsArg?: boolean | AddEventListenerOptions
  ): void => {
    target.addEventListener(type, listener, optionsArg)
    disposers.add(() => {
      target.removeEventListener(type, listener, optionsArg)
    })
  }

  const detachAll = (): void => {
    if (!active) return
    active = false

    for (const dispose of Array.from(disposers).reverse()) {
      try {
        dispose()
      } catch {
        // Input listener disposal should never affect render loop teardown.
      }
    }
    disposers.clear()
  }

  const attachAll = (): void => {
    if (active || !surface) return
    active = true

    addListener(surface, 'pointermove', (event) => {
      updatePointerState(asPointerEvent(event))
    })
    addListener(surface, 'pointerdown', (event) => {
      inside = true
      updatePointerState(asPointerEvent(event))
    })
    addListener(surface, 'pointerenter', (event) => {
      inside = true
      updatePointerState(asPointerEvent(event))
    })
    addListener(surface, 'pointerleave', (event) => {
      inside = false
      updatePointerState(asPointerEvent(event), 0)
    })
    addListener(surface, 'pointercancel', (event) => {
      inside = false
      updatePointerState(asPointerEvent(event), 0)
    })

    if (root && root !== surface) {
      addListener(root, 'pointerup', (event) => {
        updatePointerState(asPointerEvent(event), 0)
      })
      addListener(root, 'pointercancel', (event) => {
        updatePointerState(asPointerEvent(event), 0)
      })
      addListener(root, 'blur', () => {
        resetState()
      })
      addListener(root, 'keydown', (event) => {
        updateModifiersFromEvent(mods, asKeyboardEvent(event))
      })
      addListener(root, 'keyup', (event) => {
        updateModifiersFromEvent(mods, asKeyboardEvent(event))
      })
    }
  }

  if (enabled) attachAll()

  const state: HydraMouseState = {
    get element() {
      return surface
    },
    get enabled() {
      return active
    },
    set enabled(value: boolean) {
      if (value) attachAll()
      else detachAll()
    },
    get x() {
      return x
    },
    get y() {
      return y
    },
    get pixelX() {
      return x
    },
    get pixelY() {
      return y
    },
    get normX() {
      return normX
    },
    get normY() {
      return normY
    },
    get uvX() {
      return normX
    },
    get uvY() {
      return 1 - normY
    },
    get buttons() {
      return buttons
    },
    get down() {
      return buttons !== 0
    },
    get inside() {
      return inside
    },
    get pressure() {
      return pressure
    },
    get pointerType() {
      return pointerType
    },
    get mods() {
      return mods
    },
    reset: resetState
  }

  return {
    state,
    dispose: () => {
      detachAll()
      resetState()
    }
  }
}
