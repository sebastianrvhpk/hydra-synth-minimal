/**
 * GPU-native capture readback. Hydra renders rgba16float internally, then the
 * TypeGPU backend converts each captured frame to rgba8unorm before mapping it.
 */
import type { WebGPURenderer } from '../webgpu/renderer.js'

/** Result of creating a readback buffer with calculated row alignment. */
export interface ReadbackBufferInfo {
    buffer: GPUBuffer
    /** Actual bytes per row of pixel data (width * bytesPerPixel). */
    bytesPerRow: number
    /** Padded bytes per row aligned to 256 bytes (WebGPU requirement). */
    paddedBytesPerRow: number
    /** Total buffer size in bytes. */
    bufferSize: number
    width: number
    height: number
    format: 'rgba8unorm'
}

const BYTES_PER_ROW_ALIGNMENT = 256

const alignTo = (value: number, alignment: number): number =>
    Math.ceil(value / alignment) * alignment

/**
 * Create a GPU buffer suitable for reading back texture data.
 * The buffer is created with MAP_READ | COPY_DST usage and sized
 * to accommodate WebGPU's 256-byte row alignment requirement.
 */
export const createReadbackBuffer = (
    renderer: WebGPURenderer,
    width: number,
    height: number
): ReadbackBufferInfo => {
    const bytesPerRow = width * 4
    const paddedBytesPerRow = alignTo(bytesPerRow, BYTES_PER_ROW_ALIGNMENT)
    const bufferSize = paddedBytesPerRow * height

    const buffer = renderer.createReadbackBuffer('hydra-capture-readback-rgba8unorm', bufferSize)

    return { buffer, bytesPerRow, paddedBytesPerRow, bufferSize, width, height, format: 'rgba8unorm' }
}

/**
 * Perform GPU-side conversion from rgba16float -> rgba8unorm through TypeGPU.
 * Requires a temporary intermediate texture as a render attachment.
 */
export const encodeCaptureReadback = (
    renderer: WebGPURenderer,
    encoder: GPUCommandEncoder,
    sourceTexture: GPUTexture,
    activeInfo: ReadbackBufferInfo,
    intermediateTexture: GPUTexture
): void => {
    renderer.encodeCaptureConversion(encoder, sourceTexture, intermediateTexture)

    // Now copy from the intermediate rgba8unorm texture to the buffer
    renderer.copyTextureToBuffer(
        encoder,
        intermediateTexture,
        activeInfo.buffer,
        { bytesPerRow: activeInfo.paddedBytesPerRow, rowsPerImage: activeInfo.height },
        {
            width: activeInfo.width,
            height: activeInfo.height,
            depthOrArrayLayers: 1
        }
    )
}

/**
 * Helper to create the intermediate texture needed for conversion.
 */
export const createIntermediateConversionTexture = (
    renderer: WebGPURenderer,
    width: number,
    height: number
): GPUTexture => {
    return renderer.createCaptureIntermediateTexture(width, height)
}

// CPU readback utilities

/**
 * Map the readback buffer for CPU access. Returns the raw ArrayBuffer.
 */
export const mapReadbackBuffer = async (
    renderer: WebGPURenderer,
    buffer: GPUBuffer,
    timeoutMs = 5000
): Promise<{ data: ArrayBuffer, unmap: () => void }> => renderer.mapReadbackBuffer(buffer, timeoutMs)

/**
 * Strip row padding from readback data (rgba8unorm).
 * This is the only CPU step needed for the GPU-converted path.
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
        // Fastest way to copy rows in JS
        output.set(sourceBytes.subarray(srcOffset, srcOffset + bytesPerRow), dstOffset)
    }

    return output
}
