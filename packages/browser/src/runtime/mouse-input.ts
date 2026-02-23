export interface HydraMouseModifiers {
  shift: boolean
  alt: boolean
  control: boolean
  meta: boolean
}

export interface HydraMouseState {
  readonly element: EventTarget | null
  enabled: boolean

  // Primary channels: normalized 0..1
  readonly x: number
  readonly y: number
  readonly speed: number
  readonly acceleration: number
  readonly jerk: number
  readonly speedSmooth: number
  readonly accelerationSmooth: number
  readonly jerkSmooth: number
  readonly dragDistance: number
  readonly dragTravel: number
  readonly dragDuration: number
  readonly hold: number
  readonly pressure: number
  readonly inside: number

  // Distinct math channels
  readonly pixelX: number
  readonly pixelY: number
  readonly uvX: number
  readonly uvY: number
  readonly velocityX: number
  readonly velocityY: number
  readonly accelerationX: number
  readonly accelerationY: number
  readonly jerkX: number
  readonly jerkY: number

  // Pointer/button state
  readonly buttons: number
  readonly down: boolean
  readonly dragActive: boolean
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

const nowMs = (): number => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }
  return Date.now()
}

const normalizeSoft01 = (value: number, softness: number): number => {
  const positive = Math.max(0, value)
  const safeSoftness = Math.max(1e-6, softness)
  return positive / (positive + safeSoftness)
}

const smoothingAlpha = (deltaMs: number, timeConstantMs = 90): number => {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 1
  const tau = Math.max(1, timeConstantMs)
  return 1 - Math.exp(-deltaMs / tau)
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
  let pixelX = 0
  let pixelY = 0

  let velocityX = 0
  let velocityY = 0
  let accelerationX = 0
  let accelerationY = 0
  let jerkX = 0
  let jerkY = 0

  let speed = 0
  let acceleration = 0
  let jerk = 0
  let speedSmooth = 0
  let accelerationSmooth = 0
  let jerkSmooth = 0

  let inside = false
  let buttons = 0
  let pressure = 0
  let pointerType = 'unknown'

  let dragActive = false
  let dragStartPixelX = 0
  let dragStartPixelY = 0
  let dragStartTimeMs = 0
  let dragDistancePx = 0
  let dragTravelPx = 0
  let dragDurationMs = 0
  let resolutionDiagonalPx = 1

  let lastSampleTimeMs: number | null = null

  const mods: HydraMouseModifiers = {
    shift: false,
    alt: false,
    control: false,
    meta: false
  }
  const disposers = new Set<() => void>()

  const resetMotionState = (): void => {
    velocityX = 0
    velocityY = 0
    accelerationX = 0
    accelerationY = 0
    jerkX = 0
    jerkY = 0

    speed = 0
    acceleration = 0
    jerk = 0
    speedSmooth = 0
    accelerationSmooth = 0
    jerkSmooth = 0

    lastSampleTimeMs = null
  }

  const resetDragState = (): void => {
    dragActive = false
    dragStartPixelX = pixelX
    dragStartPixelY = pixelY
    dragStartTimeMs = 0
    dragDistancePx = 0
    dragTravelPx = 0
    dragDurationMs = 0
  }

  const resolveEventTimeMs = (event: PointerEventLike): number => {
    const candidate = toFiniteNumber((event as { timeStamp?: unknown }).timeStamp, Number.NaN)
    if (Number.isFinite(candidate) && candidate >= 0) return candidate
    return nowMs()
  }

  const beginDrag = (eventTimeMs: number): void => {
    dragActive = true
    dragStartPixelX = pixelX
    dragStartPixelY = pixelY
    dragStartTimeMs = eventTimeMs
    dragDistancePx = 0
    dragTravelPx = 0
    dragDurationMs = 0
  }

  const updateDrag = (segmentDistancePx: number, eventTimeMs: number): void => {
    if (!dragActive) return
    dragTravelPx += Math.max(0, segmentDistancePx)
    dragDistancePx = Math.hypot(pixelX - dragStartPixelX, pixelY - dragStartPixelY)
    dragDurationMs = Math.max(0, eventTimeMs - dragStartTimeMs)
  }

  const endDrag = (): void => {
    resetDragState()
  }

  const updatePointerPosition = (
    event: PointerEventLike
  ): { eventTimeMs: number, segmentDistancePx: number } | null => {
    if (!surface) return null

    const clientX = toFiniteNumber(event.clientX, Number.NaN)
    const clientY = toFiniteNumber(event.clientY, Number.NaN)
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null

    const rect = readRect(surface)
    const resolution = readResolution(surface)
    resolutionDiagonalPx = Math.max(1, Math.hypot(resolution.width, resolution.height))

    const previousX = x
    const previousY = y
    const previousPixelX = pixelX
    const previousPixelY = pixelY
    const previousVelocityX = velocityX
    const previousVelocityY = velocityY
    const previousAccelerationX = accelerationX
    const previousAccelerationY = accelerationY

    const localCssX = clamp(clientX - rect.left, 0, rect.width)
    const localCssY = clamp(clientY - rect.top, 0, rect.height)
    const normalizedX = rect.width > 0 ? localCssX / rect.width : 0
    const normalizedY = rect.height > 0 ? localCssY / rect.height : 0

    pixelX = clamp(normalizedX * resolution.width, 0, resolution.width)
    pixelY = clamp(normalizedY * resolution.height, 0, resolution.height)
    x = resolution.width > 0 ? pixelX / resolution.width : 0
    y = resolution.height > 0 ? pixelY / resolution.height : 0

    const eventTimeMs = resolveEventTimeMs(event)
    const segmentDistancePx = Math.hypot(pixelX - previousPixelX, pixelY - previousPixelY)
    let deltaMs = 0

    if (lastSampleTimeMs !== null) {
      deltaMs = eventTimeMs - lastSampleTimeMs
      if (Number.isFinite(deltaMs) && deltaMs > 0) {
        const deltaSeconds = deltaMs * 0.001
        const nextVelocityX = (x - previousX) / deltaSeconds
        const nextVelocityY = (y - previousY) / deltaSeconds
        const nextAccelerationX = (nextVelocityX - previousVelocityX) / deltaSeconds
        const nextAccelerationY = (nextVelocityY - previousVelocityY) / deltaSeconds
        const nextJerkX = (nextAccelerationX - previousAccelerationX) / deltaSeconds
        const nextJerkY = (nextAccelerationY - previousAccelerationY) / deltaSeconds

        velocityX = nextVelocityX
        velocityY = nextVelocityY
        accelerationX = nextAccelerationX
        accelerationY = nextAccelerationY
        jerkX = nextJerkX
        jerkY = nextJerkY
      } else {
        resetMotionState()
      }
    } else {
      velocityX = 0
      velocityY = 0
      accelerationX = 0
      accelerationY = 0
      jerkX = 0
      jerkY = 0
    }

    const speedRaw = Math.hypot(velocityX, velocityY)
    const accelerationRaw = Math.hypot(accelerationX, accelerationY)
    const jerkRaw = Math.hypot(jerkX, jerkY)
    speed = normalizeSoft01(speedRaw, 1)
    acceleration = normalizeSoft01(accelerationRaw, 20)
    jerk = normalizeSoft01(jerkRaw, 500)

    const alpha = smoothingAlpha(deltaMs)
    speedSmooth += (speed - speedSmooth) * alpha
    accelerationSmooth += (acceleration - accelerationSmooth) * alpha
    jerkSmooth += (jerk - jerkSmooth) * alpha

    lastSampleTimeMs = eventTimeMs
    return {
      eventTimeMs,
      segmentDistancePx
    }
  }

  const updatePointerState = (event: PointerEventLike, nextButtons?: number): void => {
    if (event.isPrimary === false) return

    const wasDown = buttons !== 0
    const positionSample = updatePointerPosition(event)

    if (typeof nextButtons === 'number' && Number.isFinite(nextButtons)) {
      buttons = Math.max(0, nextButtons | 0)
    } else if (typeof event.buttons === 'number' && Number.isFinite(event.buttons)) {
      buttons = Math.max(0, event.buttons | 0)
    }

    const isDown = buttons !== 0
    const eventTimeMs = positionSample?.eventTimeMs ?? resolveEventTimeMs(event)
    if (!wasDown && isDown) {
      beginDrag(eventTimeMs)
    } else if (wasDown && isDown && positionSample) {
      updateDrag(positionSample.segmentDistancePx, eventTimeMs)
    } else if (wasDown && !isDown) {
      endDrag()
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
    pixelX = 0
    pixelY = 0
    resolutionDiagonalPx = 1
    resetMotionState()
    resetDragState()
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

  if (surface) {
    const resolution = readResolution(surface)
    resolutionDiagonalPx = Math.max(1, Math.hypot(resolution.width, resolution.height))
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
      else {
        detachAll()
        resetMotionState()
        resetDragState()
      }
    },

    get x() {
      return x
    },
    get y() {
      return y
    },
    get speed() {
      return speed
    },
    get acceleration() {
      return acceleration
    },
    get jerk() {
      return jerk
    },
    get speedSmooth() {
      return speedSmooth
    },
    get accelerationSmooth() {
      return accelerationSmooth
    },
    get jerkSmooth() {
      return jerkSmooth
    },
    get dragDistance() {
      return clamp(dragDistancePx / resolutionDiagonalPx, 0, 1)
    },
    get dragTravel() {
      return clamp(dragTravelPx / resolutionDiagonalPx, 0, 1)
    },
    get dragDuration() {
      return clamp(dragDurationMs / 1000, 0, 1)
    },
    get hold() {
      return buttons !== 0 ? 1 : 0
    },
    get pressure() {
      return pressure
    },
    get inside() {
      return inside ? 1 : 0
    },

    get pixelX() {
      return pixelX
    },
    get pixelY() {
      return pixelY
    },
    get uvX() {
      return x
    },
    get uvY() {
      return 1 - y
    },
    get velocityX() {
      return velocityX
    },
    get velocityY() {
      return velocityY
    },
    get accelerationX() {
      return accelerationX
    },
    get accelerationY() {
      return accelerationY
    },
    get jerkX() {
      return jerkX
    },
    get jerkY() {
      return jerkY
    },

    get buttons() {
      return buttons
    },
    get down() {
      return buttons !== 0
    },
    get dragActive() {
      return dragActive
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
