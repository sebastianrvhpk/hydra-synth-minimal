/**
 * GPU-native readback utilities for capturing rgba16float output textures
 * directly from WebGPU, bypassing the lossy canvas.toBlob() path.
 *
 * Key design decisions:
 * - Supports double-buffered readback for pipelined capture
 * - Handles WebGPU 256-byte row alignment requirement
 * - Provides float16→uint8 conversion with linear→sRGB gamma
 */

/** Result of creating a readback buffer with computed row alignment. */
export interface ReadbackBufferInfo {
    buffer: GPUBuffer
    /** Actual bytes per row of pixel data (width × bytesPerPixel). */
    bytesPerRow: number
    /** Padded bytes per row aligned to 256 bytes (WebGPU requirement). */
    paddedBytesPerRow: number
    /** Total buffer size in bytes. */
    bufferSize: number
    width: number
    height: number
    format: 'rgba16float' | 'rgba8unorm'
}

const BYTES_PER_ROW_ALIGNMENT = 256

const bytesPerPixel = (format: 'rgba16float' | 'rgba8unorm'): number =>
    format === 'rgba16float' ? 8 : 4

const alignTo = (value: number, alignment: number): number =>
    Math.ceil(value / alignment) * alignment

/**
 * Create a GPU buffer suitable for reading back texture data.
 * The buffer is created with MAP_READ | COPY_DST usage and sized
 * to accommodate WebGPU's 256-byte row alignment requirement.
 */
export const createReadbackBuffer = (
    device: GPUDevice,
    width: number,
    height: number,
    format: 'rgba16float' | 'rgba8unorm' = 'rgba16float'
): ReadbackBufferInfo => {
    const bpp = bytesPerPixel(format)
    const bytesPerRow = width * bpp
    const paddedBytesPerRow = alignTo(bytesPerRow, BYTES_PER_ROW_ALIGNMENT)
    const bufferSize = paddedBytesPerRow * height

    const buffer = device.createBuffer({
        label: 'hydra-capture-readback',
        size: bufferSize,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    })

    return { buffer, bytesPerRow, paddedBytesPerRow, bufferSize, width, height, format }
}

/**
 * Encode a copyTextureToBuffer command from an output texture to a readback buffer.
 * This must be called before the command encoder is submitted.
 */
export const readbackTexture = (
    encoder: GPUCommandEncoder,
    texture: GPUTexture,
    info: ReadbackBufferInfo
): void => {
    encoder.copyTextureToBuffer(
        { texture },
        {
            buffer: info.buffer,
            bytesPerRow: info.paddedBytesPerRow,
            rowsPerImage: info.height
        },
        {
            width: info.width,
            height: info.height,
            depthOrArrayLayers: 1
        }
    )
}

/**
 * Map the readback buffer for CPU access. Returns the raw ArrayBuffer
 * containing the texture data. The caller must call `unmap()` when done.
 *
 * Includes a configurable timeout to prevent indefinite GPU hangs.
 */
export const mapReadbackBuffer = async (
    buffer: GPUBuffer,
    timeoutMs = 5000
): Promise<{ data: ArrayBuffer, unmap: () => void }> => {
    const mapPromise = buffer.mapAsync(GPUMapMode.READ)

    if (timeoutMs > 0 && timeoutMs < Infinity) {
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`GPU readback timeout after ${timeoutMs}ms`)), timeoutMs)
        })
        await Promise.race([mapPromise, timeoutPromise])
    } else {
        await mapPromise
    }

    const data = buffer.getMappedRange().slice(0)

    return {
        data,
        unmap: () => {
            try { buffer.unmap() } catch { /* already unmapped */ }
        }
    }
}

/**
 * Convert rgba16float readback data to RGBA 8-bit with sRGB gamma.
 *
 * The input is raw GPU buffer data containing IEEE 754 half-precision
 * floats (4 channels × 2 bytes = 8 bytes per pixel), potentially with
 * row padding from WebGPU's 256-byte alignment.
 *
 * Values are clamped to [0, 1] and converted from linear to sRGB.
 */
export const float16ToUint8 = (
    source: ArrayBuffer,
    width: number,
    height: number,
    paddedBytesPerRow: number
): Uint8ClampedArray => {
    const output = new Uint8ClampedArray(width * height * 4)
    const sourceView = new DataView(source)

    for (let y = 0; y < height; y += 1) {
        const rowOffset = y * paddedBytesPerRow
        for (let x = 0; x < width; x += 1) {
            const pixelOffset = rowOffset + x * 8 // 8 bytes per rgba16float pixel
            const outIndex = (y * width + x) * 4

            const r = decodeFloat16(sourceView.getUint16(pixelOffset, true))
            const g = decodeFloat16(sourceView.getUint16(pixelOffset + 2, true))
            const b = decodeFloat16(sourceView.getUint16(pixelOffset + 4, true))
            const a = decodeFloat16(sourceView.getUint16(pixelOffset + 6, true))

            output[outIndex] = linearToSrgb8(r)
            output[outIndex + 1] = linearToSrgb8(g)
            output[outIndex + 2] = linearToSrgb8(b)
            output[outIndex + 3] = Math.round(clamp01(a) * 255)
        }
    }

    return output
}

/**
 * Strip row padding from readback data when the format is rgba8unorm.
 * If no padding exists, returns a view of the original data.
 */
export const stripRowPadding = (
    source: ArrayBuffer,
    width: number,
    height: number,
    paddedBytesPerRow: number
): Uint8ClampedArray => {
    const bytesPerRow = width * 4
    if (paddedBytesPerRow === bytesPerRow) {
        return new Uint8ClampedArray(source, 0, width * height * 4)
    }

    const output = new Uint8ClampedArray(width * height * 4)
    const sourceBytes = new Uint8Array(source)

    for (let y = 0; y < height; y += 1) {
        const srcOffset = y * paddedBytesPerRow
        const dstOffset = y * bytesPerRow
        output.set(sourceBytes.subarray(srcOffset, srcOffset + bytesPerRow), dstOffset)
    }

    return output
}

// ─── Internal helpers ────────────────────────────────────────────────

/** Decode an IEEE 754 half-precision (binary16) float from a 16-bit unsigned integer. */
const decodeFloat16 = (packed: number): number => {
    const sign = (packed & 0x8000) === 0 ? 1 : -1
    const exponent = (packed >> 10) & 0x1f
    const fraction = packed & 0x03ff

    if (exponent === 0) {
        if (fraction === 0) return sign * 0
        return sign * Math.pow(2, -14) * (fraction / 1024)
    }
    if (exponent === 0x1f) {
        if (fraction === 0) return sign * Infinity
        return NaN
    }
    return sign * Math.pow(2, exponent - 15) * (1 + fraction / 1024)
}

/** Clamp a value to [0, 1]. */
const clamp01 = (value: number): number => {
    if (!Number.isFinite(value) || value < 0) return 0
    if (value > 1) return 1
    return value
}

/**
 * Convert a linear-light value to sRGB 8-bit.
 * Uses the standard IEC 61966-2-1 transfer function.
 */
const linearToSrgb8 = (linear: number): number => {
    const clamped = clamp01(linear)
    const srgb = clamped <= 0.0031308
        ? clamped * 12.92
        : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055
    return Math.round(srgb * 255)
}
