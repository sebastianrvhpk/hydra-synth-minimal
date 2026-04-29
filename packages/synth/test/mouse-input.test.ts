import { describe, expect, it } from 'vitest'
import { createHydraMouseInput } from '../src/runtime/mouse-input.ts'

type Listener = EventListenerOrEventListenerObject

class FakeEventTarget {
  private readonly listeners = new Map<string, Set<Listener>>()

  addEventListener(type: string, listener: Listener | null): void {
    if (!listener) return
    const entries = this.listeners.get(type) ?? new Set<Listener>()
    entries.add(listener)
    this.listeners.set(type, entries)
  }

  removeEventListener(type: string, listener: Listener | null): void {
    if (!listener) return
    const entries = this.listeners.get(type)
    if (!entries) return
    entries.delete(listener)
    if (entries.size === 0) this.listeners.delete(type)
  }

  emit(type: string, payload: Record<string, unknown> = {}): void {
    const entries = this.listeners.get(type)
    if (!entries) return
    const event = payload as Event
    for (const listener of entries) {
      if (typeof listener === 'function') listener(event)
      else listener.handleEvent(event)
    }
  }
}

class FakeCanvasTarget extends FakeEventTarget {
  width = 800
  height = 400

  getBoundingClientRect(): { left: number, top: number, width: number, height: number } {
    return {
      left: 10,
      top: 20,
      width: 400,
      height: 200
    }
  }
}

describe('hydra mouse input', () => {
  it('maps pointer coordinates into normalized defaults and pixel channels', () => {
    const canvas = new FakeCanvasTarget()
    const root = new FakeEventTarget()
    const controller = createHydraMouseInput({
      element: canvas as unknown as EventTarget,
      rootTarget: root as unknown as EventTarget
    })
    const mouse = controller.state

    canvas.emit('pointermove', {
      clientX: 210,
      clientY: 120,
      buttons: 0,
      pointerType: 'mouse',
      isPrimary: true
    })

    expect(mouse.x).toBeCloseTo(0.5, 5)
    expect(mouse.y).toBeCloseTo(0.5, 5)
    expect(mouse.pixelX).toBeCloseTo(400, 5)
    expect(mouse.pixelY).toBeCloseTo(200, 5)
    expect(mouse.uvX).toBeCloseTo(0.5, 5)
    expect(mouse.uvY).toBeCloseTo(0.5, 5)

    expect(mouse.speed).toBe(0)
    expect(mouse.acceleration).toBe(0)
    expect(mouse.jerk).toBe(0)
    expect(mouse.speedSmooth).toBe(0)
    expect(mouse.accelerationSmooth).toBe(0)
    expect(mouse.jerkSmooth).toBe(0)
    expect(mouse.dragDistance).toBe(0)
    expect(mouse.dragTravel).toBe(0)
    expect(mouse.dragDuration).toBe(0)
    expect(mouse.hold).toBe(0)
    expect(mouse.pressure).toBe(0)
    expect(mouse.inside).toBe(0)
    expect(mouse.pointerType).toBe('mouse')
    expect(mouse.down).toBe(false)

    controller.dispose()
  })

  it('derives velocity, acceleration, and jerk from timestamped pointer movement', () => {
    const canvas = new FakeCanvasTarget()
    const root = new FakeEventTarget()
    const controller = createHydraMouseInput({
      element: canvas as unknown as EventTarget,
      rootTarget: root as unknown as EventTarget
    })
    const mouse = controller.state

    canvas.emit('pointermove', {
      clientX: 110,
      clientY: 70,
      buttons: 0,
      pointerType: 'mouse',
      isPrimary: true,
      timeStamp: 100
    })

    expect(mouse.speed).toBe(0)
    expect(mouse.acceleration).toBe(0)
    expect(mouse.jerk).toBe(0)

    canvas.emit('pointermove', {
      clientX: 210,
      clientY: 120,
      buttons: 0,
      pointerType: 'mouse',
      isPrimary: true,
      timeStamp: 200
    })

    expect(mouse.velocityX).toBeCloseTo(2.5, 5)
    expect(mouse.velocityY).toBeCloseTo(2.5, 5)
    expect(mouse.accelerationX).toBeCloseTo(25, 5)
    expect(mouse.accelerationY).toBeCloseTo(25, 5)
    expect(mouse.jerkX).toBeCloseTo(250, 5)
    expect(mouse.jerkY).toBeCloseTo(250, 5)
    expect(mouse.speed).toBeGreaterThan(0)
    expect(mouse.speed).toBeLessThan(1)
    expect(mouse.acceleration).toBeGreaterThan(0)
    expect(mouse.acceleration).toBeLessThan(1)
    expect(mouse.jerk).toBeGreaterThan(0)
    expect(mouse.jerk).toBeLessThan(1)
    expect(mouse.speedSmooth).toBeGreaterThan(0)
    expect(mouse.speedSmooth).toBeLessThan(1)

    canvas.emit('pointermove', {
      clientX: 210,
      clientY: 120,
      buttons: 0,
      pointerType: 'mouse',
      isPrimary: true,
      timeStamp: 300
    })

    expect(mouse.velocityX).toBeCloseTo(0, 5)
    expect(mouse.velocityY).toBeCloseTo(0, 5)
    expect(mouse.accelerationX).toBeCloseTo(-25, 5)
    expect(mouse.accelerationY).toBeCloseTo(-25, 5)
    expect(mouse.jerkX).toBeCloseTo(-500, 5)
    expect(mouse.jerkY).toBeCloseTo(-500, 5)
    expect(mouse.speed).toBe(0)
    expect(mouse.speedSmooth).toBeGreaterThan(0)
    expect(mouse.speedSmooth).toBeLessThan(1)

    controller.dispose()
  })

  it('tracks button state, pressure, modifiers, and drag accumulators', () => {
    const canvas = new FakeCanvasTarget()
    const root = new FakeEventTarget()
    const controller = createHydraMouseInput({
      element: canvas as unknown as EventTarget,
      rootTarget: root as unknown as EventTarget
    })
    const mouse = controller.state

    canvas.emit('pointerdown', {
      clientX: 110,
      clientY: 70,
      buttons: 1,
      pressure: 0.6,
      pointerType: 'pen',
      isPrimary: true,
      timeStamp: 100,
      shiftKey: true,
      ctrlKey: true
    })

    expect(mouse.buttons).toBe(1)
    expect(mouse.down).toBe(true)
    expect(mouse.hold).toBe(1)
    expect(mouse.pressure).toBeCloseTo(0.6, 5)
    expect(mouse.pointerType).toBe('pen')
    expect(mouse.mods.shift).toBe(true)
    expect(mouse.mods.control).toBe(true)
    expect(mouse.dragActive).toBe(true)
    expect(mouse.dragDistance).toBe(0)
    expect(mouse.dragTravel).toBe(0)
    expect(mouse.dragDuration).toBe(0)

    canvas.emit('pointermove', {
      clientX: 210,
      clientY: 120,
      buttons: 1,
      pointerType: 'pen',
      isPrimary: true,
      timeStamp: 200
    })

    expect(mouse.dragDistance).toBeCloseTo(0.25, 5)
    expect(mouse.dragTravel).toBeCloseTo(0.25, 5)
    expect(mouse.dragDuration).toBeCloseTo(0.1, 5)

    root.emit('pointerup', {
      clientX: 110,
      clientY: 70,
      buttons: 0,
      isPrimary: true,
      timeStamp: 250
    })

    expect(mouse.buttons).toBe(0)
    expect(mouse.down).toBe(false)
    expect(mouse.hold).toBe(0)
    expect(mouse.pressure).toBe(0)
    expect(mouse.dragActive).toBe(false)
    expect(mouse.dragDistance).toBe(0)
    expect(mouse.dragTravel).toBe(0)
    expect(mouse.dragDuration).toBe(0)

    root.emit('blur')
    expect(mouse.x).toBe(0)
    expect(mouse.y).toBe(0)
    expect(mouse.speed).toBe(0)
    expect(mouse.acceleration).toBe(0)
    expect(mouse.jerk).toBe(0)
    expect(mouse.mods.shift).toBe(false)
    expect(mouse.mods.control).toBe(false)

    controller.dispose()
  })

  it('supports runtime enable/disable and disposal', () => {
    const canvas = new FakeCanvasTarget()
    const root = new FakeEventTarget()
    const controller = createHydraMouseInput({
      element: canvas as unknown as EventTarget,
      rootTarget: root as unknown as EventTarget
    })
    const mouse = controller.state

    canvas.emit('pointermove', {
      clientX: 50,
      clientY: 40,
      buttons: 0,
      isPrimary: true
    })
    const initialX = mouse.x

    mouse.enabled = false
    expect(mouse.enabled).toBe(false)
    expect(mouse.speed).toBe(0)
    expect(mouse.acceleration).toBe(0)
    expect(mouse.jerk).toBe(0)
    canvas.emit('pointermove', {
      clientX: 380,
      clientY: 200,
      buttons: 0,
      isPrimary: true
    })
    expect(mouse.x).toBe(initialX)

    mouse.enabled = true
    expect(mouse.enabled).toBe(true)
    canvas.emit('pointermove', {
      clientX: 380,
      clientY: 200,
      buttons: 0,
      isPrimary: true
    })
    expect(mouse.x).toBeGreaterThan(initialX)

    controller.dispose()
    expect(mouse.enabled).toBe(false)
    expect(mouse.x).toBe(0)
    expect(mouse.y).toBe(0)
    expect(mouse.speed).toBe(0)
    expect(mouse.acceleration).toBe(0)
    expect(mouse.jerk).toBe(0)

    canvas.emit('pointermove', {
      clientX: 200,
      clientY: 100,
      buttons: 0,
      isPrimary: true
    })
    expect(mouse.x).toBe(0)
    expect(mouse.y).toBe(0)
  })
})
