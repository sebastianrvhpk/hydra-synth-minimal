import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
    createReadbackBuffer,
    float16ToUint8,
    stripRowPadding
} from '../src/capture/gpu-readback.js'

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

// Mock WebGPU types using any to avoid type errors in test file
const createMockDevice = () => ({
    createBuffer: vi.fn(({ size }) => ({
        size,
        mapAsync: vi.fn(),
        getMappedRange: vi.fn(() => new ArrayBuffer(size)),
        unmap: vi.fn(),
        destroy: vi.fn()
    }))
}) as any

describe('gpu-readback', () => {
    describe('createReadbackBuffer', () => {
        it('creates a buffer with correct generic size (no padding needed)', () => {
            const device = createMockDevice()
            const width = 64 // 64 * 4 bytes = 256 bytes (aligned)
            const height = 10
            const { buffer, bytesPerRow, paddedBytesPerRow, bufferSize } = createReadbackBuffer(device, width, height, 'rgba8unorm')

            expect(bytesPerRow).toBe(256)
            expect(paddedBytesPerRow).toBe(256)
            expect(bufferSize).toBe(256 * 10)

            // Access usage via the stubbed global or just the literal expected value
            expect(device.createBuffer).toHaveBeenCalledWith(expect.objectContaining({
                size: 2560,
                usage: 3 // MAP_READ (1) | COPY_DST (2)
            }))
        })

        it('creates a buffer with correct padded size (padding needed)', () => {
            const device = createMockDevice()
            const width = 10 // 10 * 8 bytes = 80 bytes (not aligned)
            const height = 10
            // 80 bytes aligned onto 256 = 256

            const { bytesPerRow, paddedBytesPerRow, bufferSize } = createReadbackBuffer(device, width, height, 'rgba16float')

            expect(bytesPerRow).toBe(80)
            expect(paddedBytesPerRow).toBe(256)
            expect(bufferSize).toBe(256 * 10)
        })
    })

    describe('float16ToUint8', () => {
        it('converts float16 values to sRGB uint8', () => {
            // 2x1 image, rgba16float
            // Pixel 1: (0.0, 0.0, 0.0, 1.0) -> Black
            // Pixel 2: (1.0, 0.5, 0.25, 0.5) -> Color

            const bytesPerRow = 256 // assume padded
            const buffer = new ArrayBuffer(bytesPerRow)
            const view = new DataView(buffer)

            // Helper to encode float16 (very approximate for 0, 0.5, 1)
            const encodeF16 = (val: number) => {
                if (val === 0) return 0x0000
                if (val === 1) return 0x3C00
                if (val === 0.5) return 0x3800
                if (val === 0.25) return 0x3400
                return 0
            }

            // Pixel 0: 0, 0, 0, 1
            view.setUint16(0, encodeF16(0), true)
            view.setUint16(2, encodeF16(0), true)
            view.setUint16(4, encodeF16(0), true)
            view.setUint16(6, encodeF16(1), true)

            // Pixel 1: 1, 0.5, 0.25, 0.5
            view.setUint16(8, encodeF16(1), true)
            view.setUint16(10, encodeF16(0.5), true)
            view.setUint16(12, encodeF16(0.25), true)
            view.setUint16(14, encodeF16(0.5), true)

            const result = float16ToUint8(buffer, 2, 1, bytesPerRow)

            expect(result.length).toBe(2 * 4) // 8 bytes total

            // Pixel 0: Black, Alpha 255
            expect(result[0]).toBe(0)
            expect(result[1]).toBe(0)
            expect(result[2]).toBe(0)
            expect(result[3]).toBe(255)

            // Pixel 1: Gamma corrected values
            // 1.0 -> 255
            // 0.5 linear -> ~0.735 sRGB -> ~188
            // 0.25 linear -> ~0.537 sRGB -> ~137
            // 0.5 alpha -> 128 (linear)
            expect(result[4]).toBe(255)
            expect(result[5]).toBeCloseTo(188, -1)
            expect(result[6]).toBeCloseTo(137, -1)
            expect(result[7]).toBe(128)
        })
    })

    describe('stripRowPadding', () => {
        it('removes padding from rgba8unorm data', () => {
            // 2x2 image, 4 bytes/pixel = 8 bytes/row payload
            // 256 bytes/row padded
            const width = 2
            const height = 2
            const paddedBytesPerRow = 256
            const buffer = new Uint8Array(paddedBytesPerRow * height)

            // Row 0 data
            buffer[0] = 1; buffer[1] = 2; buffer[2] = 3; buffer[3] = 4
            buffer[4] = 5; buffer[5] = 6; buffer[6] = 7; buffer[7] = 8

            // Row 1 data (at offset 256)
            buffer[256] = 9; buffer[257] = 10; buffer[258] = 11; buffer[259] = 12
            buffer[260] = 13; buffer[261] = 14; buffer[262] = 15; buffer[263] = 16

            result = stripRowPadding(buffer.buffer, width, height, paddedBytesPerRow)

            expect(result.length).toBe(16) // 4 pixels * 4 bytes
            // Row 0
            expect(result[0]).toBe(1)
            expect(result[7]).toBe(8)
            // Row 1 (should be contiguous now)
            expect(result[8]).toBe(9)
            expect(result[15]).toBe(16)
        })
    })
})

let result: Uint8ClampedArray // Declare variable to fix lint error in last test
