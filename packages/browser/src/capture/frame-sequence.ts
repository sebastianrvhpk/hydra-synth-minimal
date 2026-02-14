import type { HydraBrowserRuntime } from '../runtime/runtime.js'
import type { WebGPUOutputNode } from '../runtime/output-node.js'

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

export interface CaptureHydraFrameSequenceOptions extends Omit<CaptureFrameSequenceOptions, 'canvas' | 'step'> {
  runtime: HydraBrowserRuntime
  output?: WebGPUOutputNode
  step?: (info: CaptureHydraFrameSequenceFrameInfo) => void | Promise<void>
  waitForGPU?: boolean
  resumeAfterCapture?: boolean
  restoreResolution?: boolean
  ignoreEngineFpsGate?: boolean
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
  const waitForRAF = options.waitForRAF !== false
  const downloadFallback = options.downloadFallback !== false
  const onFrameBlob = options.onFrameBlob
  const hasFrameBlobListener = typeof onFrameBlob === 'function'

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  let directoryHandle = options.directoryHandle ?? null
  if (!directoryHandle && options.pickDirectory) {
    if (typeof window === 'undefined' || typeof window.showDirectoryPicker !== 'function') {
      throw new Error('captureFrameSequence: showDirectoryPicker() is not available in this browser.')
    }
    directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
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
  const nextWidth = Number.isFinite(width) ? Math.max(1, Math.floor(width)) : previousWidth
  const nextHeight = Number.isFinite(height) ? Math.max(1, Math.floor(height)) : previousHeight

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

  try {
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

  return {
    mp4: `ffmpeg -framerate ${safeFps} -start_number 0 -i ${pattern} -vf "pad=ceil(iw/2)*2:ceil(ih/2)*2" -c:v libx264 -preset slow -crf 12 -pix_fmt yuv420p -movflags +faststart ${mp4Name}`,
    gif: `ffmpeg -framerate ${safeFps} -start_number 0 -i ${pattern} -vf "fps=${safeFps},split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=sierra2_4a" ${gifName}`,
    webm: `ffmpeg -framerate ${safeFps} -start_number 0 -i ${pattern} -vf "pad=ceil(iw/2)*2:ceil(ih/2)*2" -c:v libvpx-vp9 -pix_fmt yuva420p -crf 18 -b:v 0 ${webmName}`
  }
}
