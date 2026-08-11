import type { HydraBrowserRuntime } from '../runtime/runtime.js'
import type { HydraOutputNode } from '../runtime/output-node.js'
import { normalizeEvenCanvasDimension } from '../runtime/browser-host.js'
import { stripRowPadding } from './gpu-readback.js'
import { VideoRecorder, type VideoRecorderOptions } from './video-recorder.js'

export type CaptureFrameSequenceExtension = 'png' | 'jpg' | 'jpeg' | 'webp'
type CaptureFrameSequenceNormalizedExtension = 'png' | 'jpg' | 'webp'
const DEFAULT_VIDEO_CAPTURE_FPS = 60

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

interface CaptureFrameSequenceBufferInfo {
  frame: number
  totalFrames: number
  data: ArrayBuffer
  width: number
  height: number
  format: 'rgba8unorm'
  bytesPerRow: number
}

export interface CaptureHydraFrameSequenceOptions extends Omit<CaptureFrameSequenceOptions, 'canvas' | 'step'> {
  runtime: HydraBrowserRuntime
  output?: HydraOutputNode
  step?: (info: CaptureHydraFrameSequenceFrameInfo) => void | Promise<void>
}

interface CaptureHydraFramesOptions extends CaptureHydraFrameSequenceOptions {
  gpuReadback?: boolean
  runtimeCaptureReserved?: boolean
  onFrameBuffer?: (info: CaptureFrameSequenceBufferInfo) => void | Promise<void>
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

const resolvePositiveNumber = (value: unknown, fallback: number, label: string, context = 'captureFrameSequence'): number => {
  if (typeof value === 'undefined' || value === null) return fallback
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${context}: ${label} must be a finite number greater than 0.`)
  }
  if (value <= 0) throw new Error(`${context}: ${label} must be greater than 0.`)
  return value
}

const resolveOptionalPositiveInteger = (
  value: unknown,
  fallback: number,
  label: string,
  context = 'captureFrameSequence'
): number => {
  if (typeof value === 'undefined' || value === null) return fallback
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${context}: ${label} must be a finite number greater than 0.`)
  }
  const parsed = Math.floor(value)
  if (parsed <= 0) throw new Error(`${context}: ${label} must be greater than 0.`)
  return parsed
}

const resolveOptionalPositiveEvenInteger = (
  value: unknown,
  fallback: number,
  label: string,
  context = 'captureFrameSequence'
): number => {
  if (typeof value === 'undefined' || value === null) return normalizeEvenCanvasDimension(fallback, 2)
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${context}: ${label} must be a finite number greater than 0.`)
  }
  const parsed = Math.floor(value)
  if (parsed <= 0) throw new Error(`${context}: ${label} must be greater than 0.`)
  return normalizeEvenCanvasDimension(parsed, fallback)
}

const FRAME_COUNT_EPSILON = 1e-9

const resolveFrameCountFromDuration = (duration: number, fps: number, context: string): number => {
  const rawFrameCount = duration * fps
  if (!Number.isFinite(rawFrameCount) || rawFrameCount <= 0) {
    throw new Error(`${context}: duration * fps must be a finite number greater than 0.`)
  }
  return Math.max(1, Math.ceil(rawFrameCount - FRAME_COUNT_EPSILON))
}

const resolveTotalFrames = ({
  totalFrames,
  duration,
  fps,
  context
}: {
  totalFrames: unknown
  duration: unknown
  fps: number
  context: string
}): number => {
  if (typeof totalFrames !== 'undefined' && totalFrames !== null) {
    return resolveOptionalPositiveInteger(totalFrames, 1, 'totalFrames', context)
  }
  const safeDuration = resolvePositiveNumber(duration, 1, 'duration', context)
  return resolveFrameCountFromDuration(safeDuration, fps, context)
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

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
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
  await runtime.renderer.waitForSubmittedWork()
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
  const fallbackCanvasWidth = Number.isFinite(canvas.width) ? normalizeEvenCanvasDimension(canvas.width, 2) : 2
  const fallbackCanvasHeight = Number.isFinite(canvas.height) ? normalizeEvenCanvasDimension(canvas.height, 2) : 2
  const totalFrames = resolveTotalFrames({
    totalFrames: options.totalFrames,
    duration: options.duration,
    fps,
    context: 'captureFrameSequence'
  })
  const duration = totalFrames / fps
  const width = resolveOptionalPositiveEvenInteger(options.width, fallbackCanvasWidth, 'width')
  const height = resolveOptionalPositiveEvenInteger(options.height, fallbackCanvasHeight, 'height')
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

const captureHydraFrames = async (options: CaptureHydraFramesOptions): Promise<CaptureFrameSequenceResult> => {
  const runtime = options.runtime
  if (!runtime) {
    throw new Error('captureHydraFrameSequence: options.runtime is required.')
  }
  const runtimeCaptureReserved = options.runtimeCaptureReserved === true
  if (activeRuntimeCaptures.has(runtime) && !runtimeCaptureReserved) {
    throw new Error('captureHydraFrameSequence: a capture is already in progress for this runtime.')
  }
  if (runtimeCaptureReserved && !activeRuntimeCaptures.has(runtime)) {
    throw new Error('Hydra internal invariant failed: capture reservation is missing.')
  }

  const {
    output,
    step,
    gpuReadback = false,
    runtimeCaptureReserved: _runtimeCaptureReserved,
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
  const restoreWidth = normalizeEvenCanvasDimension(previousWidth, 1280)
  const restoreHeight = normalizeEvenCanvasDimension(previousHeight, 720)
  const hasFpsBinding = Object.prototype.hasOwnProperty.call(synth, 'fps')
  const previousFpsBinding = synth.fps
  const previousPresentation = runtime.getPresentationState()
  const shouldResize = Number.isFinite(width) || Number.isFinite(height) || previousWidth !== restoreWidth || previousHeight !== restoreHeight
  const nextWidth = Number.isFinite(width)
    ? resolveOptionalPositiveEvenInteger(width, previousWidth, 'width', 'captureHydraFrameSequence')
    : restoreWidth
  const nextHeight = Number.isFinite(height)
    ? resolveOptionalPositiveEvenInteger(height, previousHeight, 'height', 'captureHydraFrameSequence')
    : restoreHeight

  // Resolve GPU readback availability
  const renderer = runtime.renderer
  const canUseGpuReadback = renderer.ready
  const useGpuReadback = gpuReadback

  if (gpuReadback === true && !canUseGpuReadback) {
    throw new Error('captureHydraFrameSequence: GPU readback is enabled but no renderer is available.')
  }

  if (!runtimeCaptureReserved) activeRuntimeCaptures.add(runtime)
  runtime.stop()
  if (output) {
    runtime.render(output)
  }
  if (shouldResize) {
    runtime.setResolution(nextWidth, nextHeight)
  }
  synth.fps = undefined

  let captureFailed = false
  let restoreError: unknown = null

  const resolveActiveOutput = (): HydraOutputNode | null => {
    if (output) return output

    return runtime.getActiveOutput()
  }

  try {
    if (useGpuReadback) {
      const fps = resolvePositiveNumber(captureOptions.fps, 30, 'fps')
      const extension = normalizeExtension(captureOptions.extension)
      const deltaTime = 1 / fps
      const totalFrames = resolveTotalFrames({
        totalFrames: captureOptions.totalFrames,
        duration: captureOptions.duration,
        fps,
        context: 'captureHydraFrameSequence'
      })
      const duration = totalFrames / fps
      const captureWidth = runtime.host.canvas.width
      const captureHeight = runtime.host.canvas.height
      const prefix = String(captureOptions.prefix ?? 'frame')
      if (!onFrameBuffer) throw new Error('GPU frame readback requires a frame consumer.')

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

        const activeOutput = resolveActiveOutput()
        const outputTexture = activeOutput?.getCurrent?.() ?? null
        if (outputTexture) {
          const { data, bytesPerRow } = await renderer.readTexturePixels(outputTexture, captureWidth, captureHeight)
          await onFrameBuffer({
            frame,
            totalFrames,
            data,
            width: captureWidth,
            height: captureHeight,
            format: 'rgba8unorm',
            bytesPerRow
          })
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

      const digits = frameDigits(totalFrames)
      return {
        fps,
        width: captureWidth,
        height: captureHeight,
        totalFrames,
        duration,
        prefix,
        extension,
        ffmpegPattern: `${prefix}-%0${digits}d.${extension}`
      }
    }

    // Fallback: original canvas.toBlob() path
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

        await waitForGPUQueue(runtime)
      }
    })
  } catch (error) {
    captureFailed = true
    throw error
  } finally {
    try {
      if (hasFpsBinding) synth.fps = previousFpsBinding
      else delete synth.fps

      if (runtime.host.canvas.width !== restoreWidth || runtime.host.canvas.height !== restoreHeight) {
        runtime.setResolution(restoreWidth, restoreHeight)
      }

      runtime.setPresentationState(previousPresentation)

      if (wasRunning) {
        await runtime.start()
      }
    } catch (error) {
      restoreError = error
    } finally {
      if (!runtimeCaptureReserved) activeRuntimeCaptures.delete(runtime)
    }

    if (!captureFailed && restoreError) {
      throw restoreError
    }
  }
}

export const captureHydraFrameSequence = async (
  options: CaptureHydraFrameSequenceOptions
): Promise<CaptureFrameSequenceResult> => captureHydraFrames({
  ...options,
  gpuReadback: false
})

export interface CaptureHydraVideoOptions extends Omit<VideoRecorderOptions, 'width' | 'height' | 'fps'> {
  runtime: HydraBrowserRuntime
  duration: number
  fps?: number
  output?: HydraOutputNode
  step?: (info: CaptureHydraFrameSequenceFrameInfo) => void | Promise<void>
  width?: number
  height?: number
  signal?: AbortSignal
  onProgress?: (percent: number) => void
  realtime?: boolean
}

const captureReservedHydraVideo = async (options: CaptureHydraVideoOptions): Promise<Blob> => {
  const runtime = options.runtime
  if (!runtime) throw new Error('captureHydraVideo: runtime is required')

  const {
    output,
    step,
    width,
    height,
    duration,
    fps,
    bitrate,
    maxEncodeQueue,
    signal,
    onProgress,
    realtime = false
  } = options

  const safeFps = resolvePositiveNumber(fps, DEFAULT_VIDEO_CAPTURE_FPS, 'fps', 'captureHydraVideo')
  const safeDuration = resolvePositiveNumber(duration, 1, 'duration', 'captureHydraVideo')

  await runtime.init()
  if (!runtime.renderer.ready) {
    throw new Error('captureHydraVideo: the GPU renderer is unavailable.')
  }

  const recorder = new VideoRecorder({
    width: Number.isFinite(width)
      ? resolveOptionalPositiveEvenInteger(width, runtime.host.canvas.width, 'width', 'captureHydraVideo')
      : normalizeEvenCanvasDimension(runtime.host.canvas.width, 1280),
    height: Number.isFinite(height)
      ? resolveOptionalPositiveEvenInteger(height, runtime.host.canvas.height, 'height', 'captureHydraVideo')
      : normalizeEvenCanvasDimension(runtime.host.canvas.height, 720),
    fps: safeFps,
    ...(bitrate != null ? { bitrate } : {}),
    ...(maxEncodeQueue != null ? { maxEncodeQueue } : {})
  })
  await recorder.start()

  let finalized = false
  let stagingCanvas: HTMLCanvasElement | null = null
  let stagingContext: CanvasRenderingContext2D | null = null
  let stagingImageData: ImageData | null = null
  const frameIntervalMs = (1 / safeFps) * 1000
  const captureStartMs = realtime && typeof performance !== 'undefined' ? performance.now() : 0

  try {
    await captureHydraFrames({
      runtime,
      ...(output ? { output } : {}),
      ...(width != null ? { width } : {}),
      ...(height != null ? { height } : {}),
      fps: safeFps,
      duration: safeDuration,
      ...(signal ? { signal } : {}),
      gpuReadback: true,
      runtimeCaptureReserved: true,
      step: async (frameInfo) => {
        if (realtime && frameInfo.frame > 0) {
          const targetElapsedMs = frameInfo.frame * frameIntervalMs
          while (true) {
            if (signal?.aborted) throw new Error('Capture aborted.')
            const elapsedMs = performance.now() - captureStartMs
            const remainingMs = targetElapsedMs - elapsedMs
            if (remainingMs <= 0.5) break
            await wait(Math.min(remainingMs, 8))
          }
        }

        if (step) {
          await step(frameInfo)
        } else {
          runtime.tick(frameInfo.deltaTime * 1000)
        }
      },
      onFrameBuffer: async ({ frame, totalFrames, data, width: frameWidth, height: frameHeight, bytesPerRow }) => {
        if (signal?.aborted) throw new Error('Capture aborted.')

        if (!stagingCanvas) {
          stagingCanvas = document.createElement('canvas')
          stagingCanvas.width = frameWidth
          stagingCanvas.height = frameHeight
          stagingContext = stagingCanvas.getContext('2d', { willReadFrequently: true })
          if (!stagingContext) {
            throw new Error('captureHydraVideo: unable to acquire 2D context for staging canvas.')
          }
          stagingImageData = stagingContext.createImageData(frameWidth, frameHeight)
        }

        const pixels = stripRowPadding(data, frameWidth, frameHeight, bytesPerRow)
        stagingImageData!.data.set(pixels)
        stagingContext!.putImageData(stagingImageData!, 0, 0)

        await recorder.appendFrame(stagingCanvas!)
        if (onProgress) {
          onProgress(((frame + 1) / totalFrames) * 100)
        }
      }
    })

    const blob = await recorder.stop()
    finalized = true
    return blob
  } catch (error) {
    if (!finalized) {
      try {
        await recorder.stop()
      } catch {
        // Ignore recorder cleanup failures when surfacing the original error.
      }
    }
    throw error
  }
}

export const captureHydraVideo = async (options: CaptureHydraVideoOptions): Promise<Blob> => {
  const runtime = options.runtime
  if (!runtime) throw new Error('captureHydraVideo: runtime is required')
  if (activeRuntimeCaptures.has(runtime)) {
    throw new Error('captureHydraVideo: a capture is already in progress')
  }

  activeRuntimeCaptures.add(runtime)
  try {
    return await captureReservedHydraVideo(options)
  } finally {
    activeRuntimeCaptures.delete(runtime)
  }
}
