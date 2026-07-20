import { afterEach, describe, expect, it, vi } from 'vitest'
import { VideoRecorder } from '../src/capture/video-recorder.ts'

describe('VideoRecorder lifecycle', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('closes the encoder when no supported H.264 profile exists', async () => {
    const close = vi.fn()
    class UnsupportedVideoEncoder {
      static isConfigSupported = vi.fn(async () => ({ supported: false }))
      state: CodecState = 'unconfigured'
      encodeQueueSize = 0
      configure = vi.fn()
      close = close
    }
    vi.stubGlobal('VideoEncoder', UnsupportedVideoEncoder)

    const recorder = new VideoRecorder({ width: 640, height: 360, fps: 30 })
    await expect(recorder.start()).rejects.toThrow(/no supported H\.264/)

    expect(UnsupportedVideoEncoder.isConfigSupported).toHaveBeenCalledTimes(4)
    expect(close).toHaveBeenCalledOnce()
  })
})
