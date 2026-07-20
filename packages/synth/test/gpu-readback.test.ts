import { describe, expect, it, vi } from 'vitest'
import { encodeCaptureReadback, type ReadbackBufferInfo } from '../src/capture/gpu-readback.ts'

describe('gpu readback conversion', () => {
  it('routes conversion through the TypeGPU renderer before copying to the readback buffer', () => {
      const renderer = {
        encodeCaptureConversion: vi.fn(),
        copyTextureToBuffer: vi.fn()
      }
      const encoder = {}
      const sourceTexture = {}
      const intermediateTexture = {}
      const info: ReadbackBufferInfo = {
        buffer: {} as GPUBuffer,
        bytesPerRow: 8,
        paddedBytesPerRow: 256,
        bufferSize: 512,
        width: 2,
        height: 2,
        format: 'rgba8unorm'
      }

      encodeCaptureReadback(
        renderer as never,
        encoder as unknown as GPUCommandEncoder,
        sourceTexture as unknown as GPUTexture,
        info,
        intermediateTexture as unknown as GPUTexture
      )

      expect(renderer.encodeCaptureConversion).toHaveBeenCalledWith(encoder, sourceTexture, intermediateTexture)
      expect(renderer.copyTextureToBuffer).toHaveBeenCalledTimes(1)
  })
})
