import type { HydraBrowserRuntime } from '../runtime/runtime.js'
import type { WebGPUOutputNode } from '../runtime/output-node.js'
import {
  createReadbackBuffer,
  readbackTexture,
  readbackTextureWithConversion,
  createintermediateConversionTexture,
  mapReadbackBuffer,
  float16ToUint8,
  stripRowPadding,
  type ReadbackBufferInfo
} from './gpu-readback.js'
import { VideoRecorder, type VideoRecorderOptions } from './video-recorder.js'
/// <reference path="./webgpu-types.d.ts" />

export type CaptureFrameSequenceExtension = 'png' | 'jpg' | 'jpeg' | 'webp'
type CaptureFrameSequenceNormalizedExtension = 'png' | 'jpg' | 'webp'

export interface CaptureFrameSequenceFrameInfo {
  frame: number
  totalFrames: number
  fps: number
  time: number
  deltaTime: number
  playhead: number
  duration: number
  width: number
  height: number
  canvas: HTMLCanvasElement
}

export interface CaptureFrameSequenceBlobInfo {
  frame: number
  frameNumber: number
  totalFrames: number
  fileName: string
  blob: Blob
}

export interface CaptureFrameSequenceProgressInfo {
  frame: number
  frameNumber: number
  totalFrames: number
  fileName: string
  percent: number
}

export interface CaptureFrameSequenceResult {
  fps: number
  width: number
  height: number
  totalFrames: number
  duration: number
  prefix: string
  extension: CaptureFrameSequenceNormalizedExtension
  ffmpegPattern: string
}

export interface CaptureFrameSequenceOptions {
  canvas: HTMLCanvasElement
  step: (info: CaptureFrameSequenceFrameInfo) => void | Promise<void>
  fps?: number
  duration?: number
  totalFrames?: number
  width?: number
  height?: number
  prefix?: string
  extension?: CaptureFrameSequenceExtension
  quality?: number
  directoryHandle?: FileSystemDirectoryHandle | null
  pickDirectory?: boolean
  downloadFallback?: boolean
  waitForRAF?: boolean
  signal?: AbortSignal
  onFrameBlob?: (info: CaptureFrameSequenceBlobInfo) => void | Promise<void>
  onProgress?: (info: CaptureFrameSequenceProgressInfo) => void
}

export interface CaptureHydraFrameSequenceFrameInfo extends CaptureFrameSequenceFrameInfo {
  runtime: HydraBrowserRuntime
  synth: Record<string, unknown>
}

export interface CaptureFrameSequenceBufferInfo {
  frame: number
  totalFrames: number
  data: ArrayBuffer
  width: number
  height: number
  format: 'rgba16float' | 'rgba8unorm'
  bytesPerRow: number
}

export interface CaptureHydraFrameSequenceOptions extends Omit<CaptureFrameSequenceOptions, 'canvas' | 'step'> {
  runtime: HydraBrowserRuntime
  output?: WebGPUOutputNode
  step?: (info: CaptureHydraFrameSequenceFrameInfo) => void | Promise<void>
  waitForGPU?: boolean
  resumeAfterCapture?: boolean
  restoreResolution?: boolean
  ignoreEngineFpsGate?: boolean
  /** Enable GPU-native readback. 'auto' (default) activates when a WebGPU device is available. */
  gpuReadback?: boolean | 'auto'
  /** Format for GPU readback data. Default: 'rgba16float' (preserves HDR). */
  readbackFormat?: 'rgba16float' | 'rgba8unorm'
  /** Callback to receive raw GPU readback data per frame (alternative to onFrameBlob). */
  onFrameBuffer?: (info: CaptureFrameSequenceBufferInfo) => void | Promise<void>
}

export interface BuildFfmpegCommandsOptions {
  fps: number
  ffmpegPattern: string
  outputBaseName?: string
}

export interface FfmpegCommandSet {
  mp4: string
  gif: string
  webm: string
  mp4_10bit: string
  prores: string
}

const normalizeExtension = (extension: CaptureFrameSequenceExtension | undefined): CaptureFrameSequenceNormalizedExtension => {
  const normalized = String(extension ?? 'png').toLowerCase()
  if (normalized === 'png') return 'png'
  if (normalized === 'jpg' || normalized === 'jpeg') return 'jpg'
  if (normalized === 'webp') return 'webp'
  throw new Error(`Unsupported extension "${extension}". Use png, jpg, or webp.`)
}

const resolveMimeType = (extension: CaptureFrameSequenceNormalizedExtension): string => {
  if (extension === 'png') return 'image/png'
  if (extension === 'jpg') return 'image/jpeg'
  return 'image/webp'
}

const resolvePositiveNumber = (value: unknown, fallback: number, label: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  if (value <= 0) throw new Error(`captureFrameSequence: ${label} must be greater than 0.`)
  return value
}

const resolveOptionalPositiveInteger = (value: unknown, fallback: number, label: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const parsed = Math.floor(value)
  if (parsed <= 0) throw new Error(`captureFrameSequence: ${label} must be greater than 0.`)
  return parsed
}

const resolveQuality = (extension: CaptureFrameSequenceNormalizedExtension, quality: unknown): number | undefined => {
  if (extension === 'png') return undefined
  if (quality === undefined || quality === null) return undefined
  if (typeof quality !== 'number' || !Number.isFinite(quality) || quality < 0 || quality > 1) {
    throw new Error('captureFrameSequence: quality must be a finite number between 0 and 1.')
  }
  return quality
}

const nextAnimationFrame = (): Promise<number> =>
  new Promise((resolve) => {
    requestAnimationFrame(resolve)
  })

const toBlob = (canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob() returned null.'))
          return
        }
        resolve(blob)
      },
      mimeType,
      quality
    )
  })

const frameDigits = (totalFrames: number): number => Math.max(3, String(Math.max(0, totalFrames - 1)).length)

const frameFileName = (
  prefix: string,
  frame: number,
  totalFrames: number,
  extension: CaptureFrameSequenceNormalizedExtension
): string => {
  const digits = frameDigits(totalFrames)
  const index = String(frame).padStart(digits, '0')
  return `${prefix}-${index}.${extension}`
}

const saveBlobToDirectory = async (directoryHandle: FileSystemDirectoryHandle, fileName: string, blob: Blob): Promise<void> => {
  const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(blob)
  await writable.close()
}

const saveBlobAsDownload = (fileName: string, blob: Blob): void => {
  if (typeof document === 'undefined') {
    throw new Error('captureFrameSequence: downloadFallback requires a browser document context.')
  }
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

const waitForGPUQueue = async (runtime: HydraBrowserRuntime): Promise<void> => {
  const queue = runtime.renderer.device?.queue
  if (!queue || typeof queue.onSubmittedWorkDone !== 'function') return
  await queue.onSubmittedWorkDone()
}

export const captureFrameSequence = async (options: CaptureFrameSequenceOptions): Promise<CaptureFrameSequenceResult> => {
  const canvas = options.canvas
  if (!canvas || typeof canvas.toBlob !== 'function') {
    throw new Error('captureFrameSequence: options.canvas must be an HTMLCanvasElement.')
  }
  if (typeof options.step !== 'function') {
    throw new Error('captureFrameSequence: options.step(frameInfo) is required.')
  }

  const fps = resolvePositiveNumber(options.fps, 30, 'fps')
  const extension = normalizeExtension(options.extension)
  const mimeType = resolveMimeType(extension)
  const quality = resolveQuality(extension, options.quality)
  const deltaTime = 1 / fps
  const totalFrames = Number.isFinite(options.totalFrames)
    ? resolveOptionalPositiveInteger(options.totalFrames, 1, 'totalFrames')
    : resolveOptionalPositiveInteger(Math.round(resolvePositiveNumber(options.duration, 1, 'duration') * fps), 1, 'duration * fps')
  const duration = totalFrames / fps
  const width = resolveOptionalPositiveInteger(options.width, canvas.width, 'width')
  const height = resolveOptionalPositiveInteger(options.height, canvas.height, 'height')
  const prefix = String(options.prefix ?? 'frame')
  const waitForRAF = options.waitForRAF === true
  const downloadFallback = options.downloadFallback !== false
  const onFrameBlob = options.onFrameBlob
  const hasFrameBlobListener = typeof onFrameBlob === 'function'

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  let directoryHandle = options.directoryHandle ?? null
  if (!directoryHandle && options.pickDirectory) {
    if (typeof window === 'undefined' || typeof (window as any).showDirectoryPicker !== 'function') {
      throw new Error('captureFrameSequence: showDirectoryPicker() is not available in this browser.')
    }
    directoryHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
  }

  const shouldDownload = !directoryHandle && !hasFrameBlobListener && downloadFallback
  if (!directoryHandle && !hasFrameBlobListener && !shouldDownload) {
    throw new Error(
      'captureFrameSequence: no output target. Pass directoryHandle, set pickDirectory, provide onFrameBlob, or enable downloadFallback.'
    )
  }

  for (let frame = 0; frame < totalFrames; frame += 1) {
    if (options.signal?.aborted) {
      throw new Error('Capture aborted.')
    }

    const time = frame * deltaTime
    const playhead = totalFrames <= 1 ? 0 : frame / (totalFrames - 1)
    await options.step({
      frame,
      totalFrames,
      fps,
      time,
      deltaTime,
      playhead,
      duration,
      width: canvas.width,
      height: canvas.height,
      canvas
    })

    if (waitForRAF) {
      await nextAnimationFrame()
    }

    const blob = await toBlob(canvas, mimeType, quality)
    const fileName = frameFileName(prefix, frame, totalFrames, extension)

    if (directoryHandle) {
      await saveBlobToDirectory(directoryHandle, fileName, blob)
    }
    if (hasFrameBlobListener) {
      await onFrameBlob({
        frame,
        frameNumber: frame + 1,
        totalFrames,
        fileName,
        blob
      })
    }
    if (shouldDownload) {
      saveBlobAsDownload(fileName, blob)
    }

    if (typeof options.onProgress === 'function') {
      options.onProgress({
        frame,
        frameNumber: frame + 1,
        totalFrames,
        fileName,
        percent: ((frame + 1) / totalFrames) * 100
      })
    }
  }

  const digits = frameDigits(totalFrames)
  return {
    fps,
    width: canvas.width,
    height: canvas.height,
    totalFrames,
    duration,
    prefix,
    extension,
    ffmpegPattern: `${prefix}-%0${digits}d.${extension}`
  }
}

const activeRuntimeCaptures = new WeakSet<HydraBrowserRuntime>()

export const captureHydraFrameSequence = async (options: CaptureHydraFrameSequenceOptions): Promise<CaptureFrameSequenceResult> => {
  const runtime = options.runtime
  if (!runtime) {
    throw new Error('captureHydraFrameSequence: options.runtime is required.')
  }
  if (activeRuntimeCaptures.has(runtime)) {
    throw new Error('captureHydraFrameSequence: a capture is already in progress for this runtime.')
  }

  const {
    output,
    step,
    waitForGPU = true,
    resumeAfterCapture = true,
    restoreResolution = true,
    ignoreEngineFpsGate = true,
    gpuReadback = 'auto',
    readbackFormat = 'rgba16float',
    onFrameBuffer,
    width,
    height,
    ...captureOptions
  } = options

  await runtime.init()
  const synth = runtime.synth as Record<string, unknown>
  const wasRunning = runtime.host.isRunning
  const previousWidth = runtime.host.canvas.width
  const previousHeight = runtime.host.canvas.height
  const hasFpsBinding = Object.prototype.hasOwnProperty.call(synth, 'fps')
  const previousFpsBinding = synth.fps
  const shouldResize = Number.isFinite(width) || Number.isFinite(height)
  const nextWidth = Number.isFinite(width) ? Math.max(1, Math.floor(width!)) : previousWidth
  const nextHeight = Number.isFinite(height) ? Math.max(1, Math.floor(height!)) : previousHeight

  // Resolve GPU readback availability
  const device = runtime.renderer?.device ?? null
  const useGpuReadback = gpuReadback === true
    ? true
    : gpuReadback === 'auto'
      ? device !== null
      : false

  if (gpuReadback === true && !device) {
    throw new Error('captureHydraFrameSequence: gpuReadback is enabled but no WebGPU device is available.')
  }

  activeRuntimeCaptures.add(runtime)
  runtime.stop()
  if (output) {
    runtime.render(output)
  }
  if (shouldResize) {
    runtime.setResolution(nextWidth, nextHeight)
  }
  if (ignoreEngineFpsGate) {
    synth.fps = undefined
  }

  let captureFailed = false
  let restoreError: unknown = null

  // GPU readback state for double-buffered pipelining
  const readbackBuffers: ReadbackBufferInfo[] = []
  let pendingReadback: {
    bufferInfo: ReadbackBufferInfo
    frame: number
    totalFrames: number
    width: number
    height: number
  } | null = null

  const resolveActiveOutput = (): WebGPUOutputNode | null => {
    if (output) return output
    return runtime.outputs?.[0] ?? null
  }

  const flushPendingReadback = async (): Promise<void> => {
    if (!pendingReadback) return
    const pending = pendingReadback
    pendingReadback = null

    const { data, unmap } = await mapReadbackBuffer(pending.bufferInfo.buffer)
    try {
      if (typeof onFrameBuffer === 'function') {
        await onFrameBuffer({
          frame: pending.frame,
          totalFrames: pending.totalFrames,
          data,
          width: pending.width,
          height: pending.height,
          format: readbackFormat,
          bytesPerRow: pending.bufferInfo.paddedBytesPerRow
        })
      }
    } finally {
      unmap()
    }
  }

  let intermediateTexture: GPUTexture | null = null

  const cleanupReadbackBuffers = (): void => {
    for (const info of readbackBuffers) {
      try { info.buffer.destroy() } catch { /* ignore */ }
    }
    readbackBuffers.length = 0
    if (intermediateTexture) {
      try { intermediateTexture.destroy() } catch { /* ignore */ }
      intermediateTexture = null
    }
  }

  try {
    if (useGpuReadback && device) {
      // ─── GPU readback capture path (double-buffered pipelining) ───
      const fps = resolvePositiveNumber(captureOptions.fps, 30, 'fps')
      const extension = normalizeExtension(captureOptions.extension)
      const mimeType = resolveMimeType(extension)
      const quality = resolveQuality(extension, captureOptions.quality)
      const deltaTime = 1 / fps
      const totalFrames = Number.isFinite(captureOptions.totalFrames)
        ? resolveOptionalPositiveInteger(captureOptions.totalFrames, 1, 'totalFrames')
        : resolveOptionalPositiveInteger(
          Math.round(resolvePositiveNumber(captureOptions.duration, 1, 'duration') * fps),
          1,
          'duration * fps'
        )
      const duration = totalFrames / fps
      const captureWidth = runtime.host.canvas.width
      const captureHeight = runtime.host.canvas.height
      const prefix = String(captureOptions.prefix ?? 'frame')
      const hasFrameBlobListener = typeof captureOptions.onFrameBlob === 'function'
      const hasFrameBufferListener = typeof onFrameBuffer === 'function'
      const waitForRAFLocal = captureOptions.waitForRAF === true

      let directoryHandle = captureOptions.directoryHandle ?? null
      if (!directoryHandle && captureOptions.pickDirectory) {
        if (typeof window === 'undefined' || typeof (window as any).showDirectoryPicker !== 'function') {
          throw new Error('captureFrameSequence: showDirectoryPicker() is not available in this browser.')
        }
        directoryHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
      }

      const downloadFallback = captureOptions.downloadFallback !== false
      const shouldDownload = !directoryHandle && !hasFrameBlobListener && !hasFrameBufferListener && downloadFallback
      const needsBlob = Boolean(directoryHandle) || hasFrameBlobListener || shouldDownload

      // Create double readback buffers
      readbackBuffers.push(
        createReadbackBuffer(device, captureWidth, captureHeight, readbackFormat),
        createReadbackBuffer(device, captureWidth, captureHeight, readbackFormat)
      )

      if (readbackFormat === 'rgba8unorm') {
        intermediateTexture = createintermediateConversionTexture(device, captureWidth, captureHeight)
      }

      for (let frame = 0; frame < totalFrames; frame += 1) {
        if (captureOptions.signal?.aborted) {
          throw new Error('Capture aborted.')
        }

        const time = frame * deltaTime
        const playhead = totalFrames <= 1 ? 0 : frame / (totalFrames - 1)

        // Advance the runtime by one frame
        if (step) {
          await step({
            frame,
            totalFrames,
            fps,
            time,
            deltaTime,
            playhead,
            duration,
            width: captureWidth,
            height: captureHeight,
            canvas: runtime.host.canvas,
            runtime,
            synth
          })
        } else {
          runtime.tick(deltaTime * 1000)
        }

        if (waitForGPU) {
          await waitForGPUQueue(runtime)
        }

        // Flush the previous frame's readback (pipelining: map buffer A while GPU fills buffer B)
        await flushPendingReadback()

        // Readback current frame's output texture
        const activeOutput = resolveActiveOutput()
        const outputTexture = activeOutput?.getCurrent?.() ?? null
        if (outputTexture) {
          const bufferIndex = frame % 2
          const bufferInfo = readbackBuffers[bufferIndex]!
          const encoder = device.createCommandEncoder({ label: `hydra-capture-readback-${frame}` })

          if (readbackFormat === 'rgba8unorm' && intermediateTexture) {
            readbackTextureWithConversion(device, encoder, outputTexture, bufferInfo, intermediateTexture)
          } else {
            readbackTexture(encoder, outputTexture, bufferInfo)
          }

          device.queue.submit([encoder.finish()])

          pendingReadback = {
            bufferInfo,
            frame,
            totalFrames,
            width: captureWidth,
            height: captureHeight
          }
        }

        // If we also need blobs (for file saving / blob listeners), produce them
        if (needsBlob) {
          if (waitForRAFLocal) {
            await nextAnimationFrame()
          }
          const blob = await toBlob(runtime.host.canvas, mimeType, quality)
          const fileName = frameFileName(prefix, frame, totalFrames, extension)

          if (directoryHandle) {
            await saveBlobToDirectory(directoryHandle, fileName, blob)
          }
          if (hasFrameBlobListener) {
            await captureOptions.onFrameBlob!({
              frame,
              frameNumber: frame + 1,
              totalFrames,
              fileName,
              blob
            })
          }
          if (shouldDownload) {
            saveBlobAsDownload(fileName, blob)
          }
        }

        if (typeof captureOptions.onProgress === 'function') {
          captureOptions.onProgress({
            frame,
            frameNumber: frame + 1,
            totalFrames,
            fileName: frameFileName(prefix, frame, totalFrames, extension),
            percent: ((frame + 1) / totalFrames) * 100
          })
        }
      }

      // Flush the final pending readback
      await flushPendingReadback()
      cleanupReadbackBuffers()

      const digits = frameDigits(totalFrames)
      return {
        fps,
        width: captureWidth,
        height: captureHeight,
        totalFrames,
        duration,
        prefix,
        extension: normalizeExtension(captureOptions.extension),
        ffmpegPattern: `${prefix}-%0${digits}d.${normalizeExtension(captureOptions.extension)}`
      }
    }

    // ─── Fallback: original canvas.toBlob() path ───
    return await captureFrameSequence({
      ...captureOptions,
      canvas: runtime.host.canvas,
      step: async (frameInfo) => {
        if (step) {
          await step({
            ...frameInfo,
            runtime,
            synth
          })
        } else {
          runtime.tick(frameInfo.deltaTime * 1000)
        }

        if (waitForGPU) {
          await waitForGPUQueue(runtime)
        }
      }
    })
  } catch (error) {
    captureFailed = true
    cleanupReadbackBuffers()
    throw error
  } finally {
    try {
      if (ignoreEngineFpsGate) {
        if (hasFpsBinding) synth.fps = previousFpsBinding
        else delete synth.fps
      }

      if (restoreResolution && (runtime.host.canvas.width !== previousWidth || runtime.host.canvas.height !== previousHeight)) {
        runtime.setResolution(previousWidth, previousHeight)
      }

      if (resumeAfterCapture && wasRunning) {
        await runtime.start()
      }
    } catch (error) {
      restoreError = error
    } finally {
      activeRuntimeCaptures.delete(runtime)
    }

    if (!captureFailed && restoreError) {
      throw restoreError
    }
  }
}

export interface CaptureVideoOptions extends VideoRecorderOptions {
  canvas: HTMLCanvasElement
  step: (info: CaptureFrameSequenceFrameInfo) => void | Promise<void>
  duration: number
  signal?: AbortSignal
  onProgress?: (percent: number) => void
}

export const captureVideo = async (options: CaptureVideoOptions): Promise<Blob> => {
  const { canvas, step, duration, fps, width, height, bitrate, signal, onProgress } = options
  const totalFrames = Math.ceil(duration * fps)
  const deltaTime = 1 / fps

  const recorder = new VideoRecorder({ width, height, fps, ...(bitrate != null ? { bitrate } : {}) })
  await recorder.start()

  try {
    for (let frame = 0; frame < totalFrames; frame += 1) {
      if (signal?.aborted) throw new Error('Capture aborted.')

      const time = frame * deltaTime
      const playhead = totalFrames <= 1 ? 0 : frame / (totalFrames - 1)

      await step({
        frame,
        totalFrames,
        fps,
        time,
        deltaTime,
        playhead,
        duration,
        width,
        height,
        canvas
      })

      // Wait for rendering to complete (e.g. via RAF or GPU queue if handled in step)
      // For generic canvas, we assume 'step' draws the frame.

      // We pass the canvas directly to the recorder.
      // Note: This relies on the canvas context being preserved.
      await recorder.appendFrame(canvas)

      if (onProgress) onProgress(((frame + 1) / totalFrames) * 100)
    }
  } catch (err) {
    await recorder.stop() // cleanup
    throw err
  }

  return await recorder.stop()
}

export interface CaptureHydraVideoOptions extends Omit<CaptureVideoOptions, 'canvas' | 'step' | 'width' | 'height'> {
  runtime: HydraBrowserRuntime
  output?: WebGPUOutputNode
  step?: (info: CaptureHydraFrameSequenceFrameInfo) => void | Promise<void>
  waitForGPU?: boolean
  resumeAfterCapture?: boolean
  restoreResolution?: boolean
  ignoreEngineFpsGate?: boolean
  width?: number
  height?: number
}

export const captureHydraVideo = async (options: CaptureHydraVideoOptions): Promise<Blob> => {
  const runtime = options.runtime
  if (!runtime) throw new Error('captureHydraVideo: runtime is required')
  if (activeRuntimeCaptures.has(runtime)) {
    throw new Error('captureHydraVideo: a capture is already in progress')
  }

  const {
    output,
    step,
    waitForGPU = true,
    resumeAfterCapture = true,
    restoreResolution = true,
    ignoreEngineFpsGate = true,
    width,
    height,
    ...videoOptions
  } = options

  await runtime.init()
  const synth = runtime.synth as Record<string, unknown>
  const wasRunning = runtime.host.isRunning
  const previousWidth = runtime.host.canvas.width
  const previousHeight = runtime.host.canvas.height
  const hasFpsBinding = Object.prototype.hasOwnProperty.call(synth, 'fps')
  const previousFpsBinding = synth.fps
  const shouldResize = Number.isFinite(width) || Number.isFinite(height)
  const nextWidth = Number.isFinite(width) ? Math.max(1, Math.floor(width!)) : previousWidth
  const nextHeight = Number.isFinite(height) ? Math.max(1, Math.floor(height!)) : previousHeight

  activeRuntimeCaptures.add(runtime)
  runtime.stop()
  if (output) runtime.render(output)
  if (shouldResize) runtime.setResolution(nextWidth, nextHeight)
  if (ignoreEngineFpsGate) synth.fps = undefined

  let captureFailed = false
  let restoreError: unknown = null

  try {
    return await captureVideo({
      ...videoOptions,
      canvas: runtime.host.canvas,
      width: nextWidth,
      height: nextHeight,
      step: async (frameInfo) => {
        if (step) {
          await step({ ...frameInfo, runtime, synth })
        } else {
          runtime.tick(frameInfo.deltaTime * 1000)
        }

        if (waitForGPU) {
          await waitForGPUQueue(runtime)
        }
      }
    })
  } catch (error) {
    captureFailed = true
    throw error
  } finally {
    try {
      if (ignoreEngineFpsGate) {
        if (hasFpsBinding) synth.fps = previousFpsBinding
        else delete synth.fps
      }
      if (restoreResolution && shouldResize) {
        runtime.setResolution(previousWidth, previousHeight)
      }
      if (resumeAfterCapture && wasRunning) {
        await runtime.start()
      }
    } catch (e) {
      restoreError = e
    } finally {
      activeRuntimeCaptures.delete(runtime)
    }
    if (!captureFailed && restoreError) throw restoreError
  }
}

const resolveFfmpegFps = (fps: number): number => {
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new Error('buildFfmpegCommands: fps must be a finite number greater than 0.')
  }
  return fps
}

const quote = (value: string): string => `"${value}"`

export const buildFfmpegCommands = ({ fps, ffmpegPattern, outputBaseName = 'out' }: BuildFfmpegCommandsOptions): FfmpegCommandSet => {
  const safeFps = resolveFfmpegFps(fps)
  const pattern = quote(ffmpegPattern)
  const mp4Name = quote(`${outputBaseName}.mp4`)
  const gifName = quote(`${outputBaseName}.gif`)
  const webmName = quote(`${outputBaseName}.webm`)
  const mp4_10bitName = quote(`${outputBaseName}_10bit.mp4`)
  const proresName = quote(`${outputBaseName}.mov`)

  return {
    mp4: `ffmpeg -framerate ${safeFps} -start_number 0 -i ${pattern} -vf "pad=ceil(iw/2)*2:ceil(ih/2)*2" -c:v libx264 -preset slow -crf 12 -pix_fmt yuv420p -movflags +faststart ${mp4Name}`,
    gif: `ffmpeg -framerate ${safeFps} -start_number 0 -i ${pattern} -vf "fps=${safeFps},split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=sierra2_4a" ${gifName}`,
    webm: `ffmpeg -framerate ${safeFps} -start_number 0 -i ${pattern} -vf "pad=ceil(iw/2)*2:ceil(ih/2)*2" -c:v libvpx-vp9 -pix_fmt yuva420p -crf 18 -b:v 0 ${webmName}`,
    mp4_10bit: `ffmpeg -framerate ${safeFps} -start_number 0 -i ${pattern} -vf "pad=ceil(iw/2)*2:ceil(ih/2)*2" -c:v libx264 -preset slow -crf 12 -pix_fmt yuv420p10le -profile:v high10 -movflags +faststart ${mp4_10bitName}`,
    prores: `ffmpeg -framerate ${safeFps} -start_number 0 -i ${pattern} -c:v prores_ks -profile:v 4 -pix_fmt yuva444p10le ${proresName}`
  }
}
