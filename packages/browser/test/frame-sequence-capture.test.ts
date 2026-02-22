import { beforeAll, describe, expect, it, vi } from 'vitest'
import { buildFfmpegCommands, captureFrameSequence, captureHydraFrameSequence } from '../src/capture/frame-sequence.ts'

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
})

describe('captureHydraFrameSequence', () => {
  it('ticks runtime deterministically and restores state after capture', async () => {
    const canvas = createMockCanvas()
    const tickCalls: number[] = []
    const setResolutionCalls: Array<[number, number]> = []
    let stopCalls = 0
    let startCalls = 0
    let queueWaitCalls = 0

    const runtime = {
      host: {
        canvas,
        isRunning: true
      },
      renderer: {
        device: {
          queue: {
            onSubmittedWorkDone: async () => {
              queueWaitCalls += 1
            }
          }
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
      render: () => { }
    }

    await captureHydraFrameSequence({
      runtime: runtime as never,
      fps: 12,
      totalFrames: 2,
      width: 640,
      height: 360,
      waitForRAF: false,
      downloadFallback: false,
      gpuReadback: false,
      onFrameBlob: () => { }
    })

    expect(stopCalls).toBe(1)
    expect(startCalls).toBe(1)
    expect(tickCalls).toEqual([1000 / 12, 1000 / 12])
    expect(queueWaitCalls).toBe(2)
    expect(setResolutionCalls).toEqual([[640, 360], [320, 240]])
    expect(runtime.synth.fps).toBe(120)
  })

  it('does not resume the runtime loop when it was not already running', async () => {
    const canvas = createMockCanvas()
    let startCalls = 0

    const runtime = {
      host: {
        canvas,
        isRunning: false
      },
      renderer: {
        device: null
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
      render: () => { }
    }

    await captureHydraFrameSequence({
      runtime: runtime as never,
      fps: 24,
      totalFrames: 1,
      waitForRAF: false,
      downloadFallback: false,
      gpuReadback: false,
      onFrameBlob: () => { }
    })

    expect(startCalls).toBe(0)
  })

  it('uses GPU readback path when enabled', async () => {
    const canvas = createMockCanvas()
    const readbackData: any[] = []

    // Mock WebGPU device
    const mockBuffer = {
      mapAsync: vi.fn(),
      getMappedRange: vi.fn(() => new ArrayBuffer(1024)),
      unmap: vi.fn(),
      destroy: vi.fn()
    }

    const mockEncoder = {
      copyTextureToBuffer: vi.fn(),
      finish: vi.fn()
    }

    const mockDevice = {
      createBuffer: vi.fn(() => mockBuffer),
      createCommandEncoder: vi.fn(() => mockEncoder),
      queue: {
        submit: vi.fn(),
        onSubmittedWorkDone: vi.fn()
      }
    }

    const runtime = {
      host: {
        canvas,
        isRunning: true
      },
      renderer: {
        device: mockDevice
      },
      synth: { fps: 60 },
      outputs: [
        {
          getCurrent: () => ({ label: 'mock-texture' })
        }
      ],
      init: async () => { },
      start: async () => { },
      stop: () => { },
      tick: () => { },
      setResolution: () => { },
      render: () => { }
    }

    await captureHydraFrameSequence({
      runtime: runtime as any,
      fps: 30,
      totalFrames: 2,
      gpuReadback: true,
      waitForRAF: false,
      downloadFallback: false,
      onFrameBuffer: (info) => {
        readbackData.push(info)
      }
    })

    expect(mockDevice.createBuffer).toHaveBeenCalledTimes(2) // Double buffered
    expect(mockEncoder.copyTextureToBuffer).toHaveBeenCalledTimes(2) // 2 frames
    expect(readbackData.length).toBe(2)
    expect(readbackData[0].frame).toBe(0)
    expect(readbackData[1].frame).toBe(1)
  })
})

describe('buildFfmpegCommands', () => {
  it('builds ffmpeg commands from capture metadata', () => {
    const commands = buildFfmpegCommands({
      fps: 60,
      ffmpegPattern: 'frame-%04d.png',
      outputBaseName: 'shot-a'
    })

    expect(commands.mp4).toContain('-framerate 60')
    expect(commands.mp4).toContain('"frame-%04d.png"')
    expect(commands.mp4).toContain('"shot-a.mp4"')
    expect(commands.mp4).toContain('-movflags +faststart')
    expect(Object.keys(commands)).toEqual(['mp4'])
  })
})
