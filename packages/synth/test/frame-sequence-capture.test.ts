import { beforeAll, describe, expect, it, vi } from 'vitest'
import { captureFrameSequence, captureHydraFrameSequence } from '../src/capture/frame-sequence.ts'

const createMockCanvas = (width = 320, height = 240): HTMLCanvasElement => {
  const canvas = {
    width,
    height,
    toBlob: (callback: BlobCallback, mimeType?: string) => {
      const type = mimeType ?? 'image/png'
      callback(new Blob([type], { type }))
    }
  }
  return canvas as unknown as HTMLCanvasElement
}

// Stub WebGPU globals for Node.js environment
beforeAll(() => {
  vi.stubGlobal('GPUBufferUsage', {
    MAP_READ: 1,
    COPY_DST: 2,
    COPY_SRC: 4
  })
  vi.stubGlobal('GPUMapMode', {
    READ: 1,
    WRITE: 2
  })
})

describe('captureFrameSequence', () => {
  it('captures deterministic frame metadata and blob output', async () => {
    const canvas = createMockCanvas()
    const steps: Array<{ frame: number, time: number, deltaTime: number }> = []
    const files: string[] = []

    const result = await captureFrameSequence({
      canvas,
      fps: 24,
      totalFrames: 3,
      waitForRAF: false,
      downloadFallback: false,
      step: ({ frame, time, deltaTime }) => {
        steps.push({ frame, time, deltaTime })
      },
      onFrameBlob: ({ fileName }) => {
        files.push(fileName)
      }
    })

    expect(steps).toEqual([
      { frame: 0, time: 0, deltaTime: 1 / 24 },
      { frame: 1, time: 1 / 24, deltaTime: 1 / 24 },
      { frame: 2, time: 2 / 24, deltaTime: 1 / 24 }
    ])
    expect(files).toEqual(['frame-000.png', 'frame-001.png', 'frame-002.png'])
    expect(result.ffmpegPattern).toBe('frame-%03d.png')
  })

  it('uses ceil-based frame counting for duration * fps', async () => {
    const canvas = createMockCanvas()
    const frames: number[] = []

    const result = await captureFrameSequence({
      canvas,
      fps: 2.5,
      duration: 1,
      waitForRAF: false,
      downloadFallback: false,
      step: ({ frame }) => {
        frames.push(frame)
      },
      onFrameBlob: () => {}
    })

    expect(frames).toEqual([0, 1, 2])
    expect(result.totalFrames).toBe(3)
    expect(result.duration).toBeCloseTo(1.2, 6)
  })

  it('floors odd capture dimensions to even canvas sizes', async () => {
    const canvas = createMockCanvas(321, 241)
    const seenDimensions: Array<[number, number]> = []

    const result = await captureFrameSequence({
      canvas,
      width: 641,
      height: 361,
      totalFrames: 1,
      waitForRAF: false,
      downloadFallback: false,
      step: ({ width, height }) => {
        seenDimensions.push([width, height])
      },
      onFrameBlob: () => { }
    })

    expect(seenDimensions).toEqual([[640, 360]])
    expect(result.width).toBe(640)
    expect(result.height).toBe(360)
    expect(canvas.width).toBe(640)
    expect(canvas.height).toBe(360)
  })
})

describe('captureHydraFrameSequence', () => {
  it('ticks runtime deterministically and restores state after capture', async () => {
    const canvas = createMockCanvas()
    const tickCalls: number[] = []
    const setResolutionCalls: Array<[number, number]> = []
    let stopCalls = 0
    let startCalls = 0
    let queueWaitCalls = 0
    const presentationState = { mode: 'all', output: {} }
    const setPresentationState = vi.fn()
    const render = vi.fn()
    const captureOutput = {}

    const runtime = {
      host: {
        canvas,
        isRunning: true
      },
      renderer: {
        waitForSubmittedWork: async () => {
          queueWaitCalls += 1
        }
      },
      synth: {
        fps: 120
      },
      init: async () => { },
      start: async () => {
        startCalls += 1
      },
      stop: () => {
        stopCalls += 1
      },
      tick: (deltaMs: number) => {
        tickCalls.push(deltaMs)
      },
      setResolution: (width: number, height: number) => {
        setResolutionCalls.push([width, height])
        canvas.width = width
        canvas.height = height
      },
      getPresentationState: () => presentationState,
      setPresentationState,
      render
    }

    await captureHydraFrameSequence({
      runtime: runtime as never,
      output: captureOutput as never,
      fps: 12,
      totalFrames: 2,
      width: 641,
      height: 361,
      waitForRAF: false,
      downloadFallback: false,
      onFrameBlob: () => { }
    })

    expect(stopCalls).toBe(1)
    expect(startCalls).toBe(1)
    expect(tickCalls).toEqual([1000 / 12, 1000 / 12])
    expect(queueWaitCalls).toBe(2)
    expect(setResolutionCalls).toEqual([[640, 360], [320, 240]])
    expect(runtime.synth.fps).toBe(120)
    expect(render).toHaveBeenCalledWith(captureOutput)
    expect(setPresentationState).toHaveBeenCalledWith(presentationState)
  })

  it('does not resume the runtime loop when it was not already running', async () => {
    const canvas = createMockCanvas()
    let startCalls = 0
    const presentationState = { mode: 'single', output: {} }

    const runtime = {
      host: {
        canvas,
        isRunning: false
      },
      renderer: {
        waitForSubmittedWork: async () => {}
      },
      synth: {},
      init: async () => { },
      start: async () => {
        startCalls += 1
      },
      stop: () => { },
      tick: () => { },
      setResolution: (width: number, height: number) => {
        canvas.width = width
        canvas.height = height
      },
      getPresentationState: () => presentationState,
      setPresentationState: vi.fn(),
      render: () => { }
    }

    await captureHydraFrameSequence({
      runtime: runtime as never,
      fps: 24,
      totalFrames: 1,
      waitForRAF: false,
      downloadFallback: false,
      onFrameBlob: () => { }
    })

    expect(startCalls).toBe(0)
  })

})
