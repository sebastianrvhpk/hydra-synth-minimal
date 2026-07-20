export interface BrowserHostOptions {
  canvas?: HTMLCanvasElement
  width?: number
  height?: number
  parent?: HTMLElement
  autoAppend?: boolean
}

export const normalizeEvenCanvasDimension = (value: unknown, fallback: number): number => {
  const fallbackSource = typeof fallback === 'number' && Number.isFinite(fallback) && fallback > 0 ? fallback : 2
  const source = typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallbackSource
  const integer = Math.floor(source)
  const evenInteger = integer % 2 === 0 ? integer : integer - 1
  return Math.max(2, evenInteger)
}

export class BrowserHost {
  readonly canvas: HTMLCanvasElement
  readonly ownsCanvas: boolean

  private readonly requestFrame: typeof requestAnimationFrame
  private readonly cancelFrame: typeof cancelAnimationFrame
  private readonly parent: HTMLElement
  private rafHandle: number | null = null
  private lastFrameTime: number | null = null
  private disposed = false
  private attachedToDom = false

  constructor({
    canvas,
    width = canvas?.width ?? 1280,
    height = canvas?.height ?? 720,
    parent = document.body,
    autoAppend = true
  }: BrowserHostOptions = {}) {
    this.requestFrame = window.requestAnimationFrame.bind(window)
    this.cancelFrame = window.cancelAnimationFrame.bind(window)
    this.parent = parent

    if (canvas) {
      this.canvas = canvas
      this.canvas.width = normalizeEvenCanvasDimension(width, 1280)
      this.canvas.height = normalizeEvenCanvasDimension(height, 720)
      this.ownsCanvas = false
      this.attachedToDom = Boolean(canvas.parentElement)
    } else {
      this.canvas = document.createElement('canvas')
      this.canvas.width = normalizeEvenCanvasDimension(width, 1280)
      this.canvas.height = normalizeEvenCanvasDimension(height, 720)
      this.canvas.style.width = '100%'
      this.canvas.style.height = '100%'
      this.canvas.style.imageRendering = 'pixelated'
      this.ownsCanvas = true

      if (autoAppend) {
        this.parent.appendChild(this.canvas)
        this.attachedToDom = true
      }
    }
  }

  append(): void {
    if (this.attachedToDom || !this.ownsCanvas) return
    this.parent.appendChild(this.canvas)
    this.attachedToDom = true
  }

  get isRunning(): boolean {
    return this.rafHandle !== null
  }

  start(onFrame: (deltaMs: number) => void): void {
    if (this.disposed || this.rafHandle !== null) return

    const frame = (timestamp: number): void => {
      if (this.disposed) return
      if (this.lastFrameTime === null) this.lastFrameTime = timestamp
      const delta = timestamp - this.lastFrameTime
      this.lastFrameTime = timestamp
      onFrame(delta)
      this.rafHandle = this.requestFrame(frame)
    }

    this.rafHandle = this.requestFrame(frame)
  }

  stop(): void {
    if (this.rafHandle === null) return
    this.cancelFrame(this.rafHandle)
    this.rafHandle = null
    this.lastFrameTime = null
  }

  setResolution(width: number, height: number): void {
    this.canvas.width = normalizeEvenCanvasDimension(width, this.canvas.width)
    this.canvas.height = normalizeEvenCanvasDimension(height, this.canvas.height)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.stop()

    if (this.ownsCanvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas)
    }
    this.attachedToDom = false
  }
}
