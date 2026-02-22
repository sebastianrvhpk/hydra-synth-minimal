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
  it('maps pointer coordinates into canvas space and normalized space', () => {
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

    expect(mouse.x).toBeCloseTo(400, 5)
    expect(mouse.y).toBeCloseTo(200, 5)
    expect(mouse.pixelX).toBeCloseTo(400, 5)
    expect(mouse.pixelY).toBeCloseTo(200, 5)
    expect(mouse.normX).toBeCloseTo(0.5, 5)
    expect(mouse.normY).toBeCloseTo(0.5, 5)
    expect(mouse.uvX).toBeCloseTo(0.5, 5)
    expect(mouse.uvY).toBeCloseTo(0.5, 5)
    expect(mouse.pointerType).toBe('mouse')
    expect(mouse.down).toBe(false)

    controller.dispose()
  })

  it('tracks button state and modifier keys from pointer/root events', () => {
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
      shiftKey: true,
      ctrlKey: true
    })

    expect(mouse.buttons).toBe(1)
    expect(mouse.down).toBe(true)
    expect(mouse.pressure).toBeCloseTo(0.6, 5)
    expect(mouse.pointerType).toBe('pen')
    expect(mouse.mods.shift).toBe(true)
    expect(mouse.mods.control).toBe(true)

    root.emit('pointerup', {
      clientX: 110,
      clientY: 70,
      buttons: 0,
      isPrimary: true
    })

    expect(mouse.buttons).toBe(0)
    expect(mouse.down).toBe(false)
    expect(mouse.pressure).toBe(0)

    root.emit('blur')
    expect(mouse.x).toBe(0)
    expect(mouse.y).toBe(0)
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
