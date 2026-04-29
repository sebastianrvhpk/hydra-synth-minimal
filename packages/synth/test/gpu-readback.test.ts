import { describe, expect, it, vi } from 'vitest'
import { readbackTextureWithConversion, type ReadbackBufferInfo } from '../src/capture/gpu-readback.ts'

const createMockEncoder = () => {
  const pass = {
    setPipeline: vi.fn(),
    setBindGroup: vi.fn(),
    draw: vi.fn(),
    end: vi.fn()
  }

  return {
    pass,
    encoder: {
      beginRenderPass: vi.fn(() => pass),
      copyTextureToBuffer: vi.fn()
    }
  }
}

const createMockDevice = () => ({
  createShaderModule: vi.fn(() => ({})),
  createBindGroupLayout: vi.fn(() => ({})),
  createPipelineLayout: vi.fn(() => ({})),
  createRenderPipeline: vi.fn(() => ({})),
  createBindGroup: vi.fn(() => ({}))
})

describe('gpu readback conversion cache', () => {
  it('creates conversion pipelines per GPUDevice', () => {
    const globals = globalThis as typeof globalThis & { GPUShaderStage?: { FRAGMENT: number } }
    const previous = globals.GPUShaderStage
    globals.GPUShaderStage = { FRAGMENT: 0x2 }
    try {
      const deviceA = createMockDevice()
      const deviceB = createMockDevice()
      const { encoder: encoderA } = createMockEncoder()
      const { encoder: encoderB } = createMockEncoder()
      const sourceTexture = { createView: vi.fn(() => ({})) }
      const intermediateTexture = { createView: vi.fn(() => ({})) }
      const info: ReadbackBufferInfo = {
        buffer: {} as GPUBuffer,
        bytesPerRow: 8,
        paddedBytesPerRow: 256,
        bufferSize: 512,
        width: 2,
        height: 2,
        format: 'rgba8unorm'
      }

      readbackTextureWithConversion(
        deviceA as unknown as GPUDevice,
        encoderA as unknown as GPUCommandEncoder,
        sourceTexture as unknown as GPUTexture,
        info,
        intermediateTexture as unknown as GPUTexture
      )
      readbackTextureWithConversion(
        deviceA as unknown as GPUDevice,
        encoderA as unknown as GPUCommandEncoder,
        sourceTexture as unknown as GPUTexture,
        info,
        intermediateTexture as unknown as GPUTexture
      )
      readbackTextureWithConversion(
        deviceB as unknown as GPUDevice,
        encoderB as unknown as GPUCommandEncoder,
        sourceTexture as unknown as GPUTexture,
        info,
        intermediateTexture as unknown as GPUTexture
      )

      expect(deviceA.createRenderPipeline).toHaveBeenCalledTimes(1)
      expect(deviceB.createRenderPipeline).toHaveBeenCalledTimes(1)
    } finally {
      globals.GPUShaderStage = previous
    }
  })
})
