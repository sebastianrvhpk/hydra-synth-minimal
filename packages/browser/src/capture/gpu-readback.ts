/**
 * GPU-native readback utilities for capturing rgba16float output textures.
 *
 * This module provides two paths:
 * 1. `readbackTexture` (original): Reads raw rgba16float data.
 * 2. `readbackTextureWithConversion` (new): Uses a compute shader to convert
 *    rgba16float -> rgba8unorm on the GPU (composite-over-black + clamped).
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
        label: `hydra-capture-readback-${format}`,
        size: bufferSize,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    })

    return { buffer, bytesPerRow, paddedBytesPerRow, bufferSize, width, height, format }
}

/**
 * Encode a copyTextureToBuffer command from an output texture to a readback buffer.
 * This handles raw data copy without conversion.
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

// ─── GPU-Side Color Conversion ────────────────────────────────────────

const CONVERSION_WGSL = `
@group(0) @binding(0) var splitInput: texture_2d<f32>;
@group(0) @binding(1) var splitOutput: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let dims = textureDimensions(splitInput);
  if (id.x >= dims.x || id.y >= dims.y) {
    return;
  }
  
  let color = textureLoad(splitInput, vec2i(id.xy), 0);
  
  // Direct clamp to 0-1.
  // We do NOT multiply by alpha here because Hydra's rendering pipeline
  // produces "pre-associated" (premultiplied) colors where RGB can exceed Alpha
  // (e.g. valid glow/bloom/additive blending).
  // If we multiplied by alpha again, we would double-darken those effects.
  let outputColor = clamp(color.rgb, vec3f(0.0), vec3f(1.0));
  
  // Output alpha as 1.0 (opaque) for the video file
  textureStore(splitOutput, vec2i(id.xy), vec4f(outputColor, 1.0));
}
`

// Cache for compute pipeline / bind group layouts to avoid recreation
interface ConversionContext {
    pipeline: GPUComputePipeline
    bindGroupLayout: GPUBindGroupLayout
}

let conversionContext: ConversionContext | null = null

const getConversionContext = (device: GPUDevice): ConversionContext => {
    if (conversionContext) return conversionContext

    const module = device.createShaderModule({
        label: 'hydra-capture-conversion',
        code: CONVERSION_WGSL
    })

    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'float' } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: 'write-only', format: 'rgba8unorm' } }
        ]
    })

    const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout]
    })

    const pipeline = device.createComputePipeline({
        label: 'hydra-capture-conversion-pipeline',
        layout: pipelineLayout,
        compute: {
            module,
            entryPoint: 'main'
        }
    })

    conversionContext = { pipeline, bindGroupLayout }
    return conversionContext
}

/**
 * Perform GPU-side conversion from rgba16float -> rgba8unorm sRGB, then copy to buffer.
 * Requires a temporary intermediate texture for the compute shader output.
 */
export const readbackTextureWithConversion = (
    device: GPUDevice,
    encoder: GPUCommandEncoder,
    sourceTexture: GPUTexture,
    activeInfo: ReadbackBufferInfo,
    intermediateTexture: GPUTexture
): void => {
    const ctx = getConversionContext(device)

    const bindGroup = device.createBindGroup({
        layout: ctx.bindGroupLayout,
        entries: [
            { binding: 0, resource: sourceTexture.createView() },
            { binding: 1, resource: intermediateTexture.createView() }
        ]
    })

    const pass = encoder.beginComputePass({ label: 'hydra-capture-conversion-pass' })
    pass.setPipeline(ctx.pipeline)
    pass.setBindGroup(0, bindGroup)
    pass.dispatchWorkgroups(
        Math.ceil(activeInfo.width / 16),
        Math.ceil(activeInfo.height / 16)
    )
    pass.end()

    // Now copy from the intermediate rgba8unorm texture to the buffer
    encoder.copyTextureToBuffer(
        { texture: intermediateTexture },
        {
            buffer: activeInfo.buffer,
            bytesPerRow: activeInfo.paddedBytesPerRow,
            rowsPerImage: activeInfo.height
        },
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
export const createintermediateConversionTexture = (
    device: GPUDevice,
    width: number,
    height: number
): GPUTexture => {
    return device.createTexture({
        label: 'hydra-capture-intermediate-rgba8',
        size: [width, height],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING
    })
}

// ─── CPU Readback Utilities ──────────────────────────────────────────

/**
 * Map the readback buffer for CPU access. Returns the raw ArrayBuffer.
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
 * Legacy/Testing: CPU-side float16 -> uint8 conversion.
 * Kept for specific raw data capture needs, but generally superseded by GPU path.
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
            const pixelOffset = rowOffset + x * 8
            const outIndex = (y * width + x) * 4

            const rSource = decodeFloat16(sourceView.getUint16(pixelOffset, true))
            const gSource = decodeFloat16(sourceView.getUint16(pixelOffset + 2, true))
            const bSource = decodeFloat16(sourceView.getUint16(pixelOffset + 4, true))
            const aSource = decodeFloat16(sourceView.getUint16(pixelOffset + 6, true))

            // Clamp directly causing "pre-associated" alpha behavior (glows remain bright)
            // We force alpha to 1.0 (255) for the video output.
            output[outIndex] = Math.round(clamp01(rSource) * 255)
            output[outIndex + 1] = Math.round(clamp01(gSource) * 255)
            output[outIndex + 2] = Math.round(clamp01(bSource) * 255)
            output[outIndex + 3] = 255 // Opaque alpha
        }
    }
    return output
}

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

// ─── Internal helpers ────────────────────────────────────────────────

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

const clamp01 = (value: number): number => {
    if (!Number.isFinite(value) || value < 0) return 0
    if (value > 1) return 1
    return value
}
