/// <reference path="./webcodecs-types.d.ts" />
// @ts-ignore - bare specifier replaced with relative path for the unbundled static dev server
import { createFile, type ISOFile } from '../../../../node_modules/mp4box/dist/mp4box.all.js'

export interface VideoRecorderOptions {
  width: number
  height: number
  fps: number
  bitrate?: number
  maxEncodeQueue?: number
}

const MICROS_PER_SECOND = 1_000_000
const MP4_TIMESCALE = 90_000

const resolvePositiveInteger = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`[VideoRecorder] ${label} must be a finite number greater than 0.`)
  }
  return Math.max(1, Math.floor(value))
}

const resolvePositiveFiniteNumber = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`[VideoRecorder] ${label} must be a finite number greater than 0.`)
  }
  return value
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const toErrorMessage = (error: unknown): string => {
  if (error instanceof DOMException || error instanceof Error) {
    return error.message
  }
  return String(error)
}

/**
 * A recorder that uses WebCodecs VideoEncoder to produce MP4 files.
 * Frames are encoded with H.264 and muxed with mp4box.
 */
export class VideoRecorder {
  private encoder: VideoEncoder | null = null
  private mp4File: ISOFile | null = null
  private trackId: number | null = null
  private readonly width: number
  private readonly height: number
  private readonly fps: number
  private readonly bitrate: number
  private readonly maxEncodeQueue: number
  private readonly frameDurationMicros: number
  private readonly keyFrameIntervalFrames: number
  private frameCounter = 0
  private recording = false
  private encoderError: DOMException | null = null
  private sampleCount = 0
  private droppedChunkCountWithoutTrack = 0

  constructor (options: VideoRecorderOptions) {
    this.width = resolvePositiveInteger(options.width, 'width')
    this.height = resolvePositiveInteger(options.height, 'height')
    this.fps = resolvePositiveFiniteNumber(options.fps, 'fps')
    if (typeof options.bitrate === 'number' && (!Number.isFinite(options.bitrate) || options.bitrate <= 0)) {
      throw new Error('[VideoRecorder] bitrate must be a finite number greater than 0.')
    }
    this.bitrate = options.bitrate != null ? Math.max(1, Math.floor(options.bitrate)) : 25_000_000 // 25 Mbps default (visually lossless)
    this.maxEncodeQueue = Number.isFinite(options.maxEncodeQueue)
      ? Math.max(0, Math.floor(options.maxEncodeQueue!))
      : 8
    this.frameDurationMicros = Math.max(1, Math.round(MICROS_PER_SECOND / this.fps))
    this.keyFrameIntervalFrames = Math.max(1, Math.round(this.fps * 2))
  }

  async start (): Promise<void> {
    if (this.recording) return
    this.recording = true
    this.frameCounter = 0
    this.encoderError = null
    this.sampleCount = 0
    this.droppedChunkCountWithoutTrack = 0

    this.mp4File = createFile()
    this.trackId = null

    this.encoder = new VideoEncoder({
      output: (chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata) =>
        this.handleEncodedChunk(chunk, metadata),
      error: (error: DOMException) => {
        this.encoderError = error
        this.recording = false
        console.error('[VideoRecorder] encoder error:', error)
      }
    })

    const baseConfig: Omit<VideoEncoderConfig, 'codec'> = {
      width: this.width,
      height: this.height,
      bitrate: this.bitrate,
      framerate: this.fps,
      latencyMode: 'quality'
    }

    const codecCandidates = ['avc1.640033', 'avc1.640032', 'avc1.4d002a', 'avc1.42001f']
    let configuredCodec: string | null = null

    for (const codec of codecCandidates) {
      const configVariants: VideoEncoderConfig[] = [
        { ...baseConfig, codec, avc: { format: 'avc' } },
        { ...baseConfig, codec }
      ]

      for (const config of configVariants) {
        try {
          const support = await VideoEncoder.isConfigSupported(config)
          if (!support.supported) continue
          this.encoder.configure(config)
          configuredCodec = codec
          break
        } catch {
          // Keep trying lower capability profiles and config variants.
        }
      }
      if (configuredCodec) break
    }

    if (!configuredCodec) {
      this.recording = false
      throw new Error('[VideoRecorder] no supported H.264 codec configuration found for this capture.')
    }
  }

  private throwIfEncoderErrored (): void {
    if (!this.encoderError) return
    throw new Error(`[VideoRecorder] encoder error: ${toErrorMessage(this.encoderError)}`)
  }

  private async waitForEncodeQueue (): Promise<void> {
    while (this.encoder && this.encoder.encodeQueueSize > this.maxEncodeQueue) {
      this.throwIfEncoderErrored()
      await wait(0)
    }
    this.throwIfEncoderErrored()
  }

  /**
   * Encode one frame from a canvas or existing VideoFrame.
   */
  async appendFrame (source: CanvasImageSource | VideoFrame): Promise<void> {
    this.throwIfEncoderErrored()
    if (!this.recording || !this.encoder || this.encoder.state === 'closed') {
      throw new Error('[VideoRecorder] not running')
    }

    const timestamp = Math.round((this.frameCounter * MICROS_PER_SECOND) / this.fps)
    const nextTimestamp = Math.round(((this.frameCounter + 1) * MICROS_PER_SECOND) / this.fps)
    const duration = Math.max(1, nextTimestamp - timestamp)

    const frame = source instanceof VideoFrame
      ? new VideoFrame(source, { timestamp, duration })
      : new VideoFrame(source as CanvasImageSource, { timestamp, duration })

    try {
      // Force a key-frame every 2 seconds for seekability.
      const keyFrame = this.frameCounter % this.keyFrameIntervalFrames === 0
      this.encoder.encode(frame, { keyFrame })
    } finally {
      frame.close()
    }

    this.frameCounter += 1
    await this.waitForEncodeQueue()
  }

  /**
   * Finish encoding, mux MP4 container, and return video blob.
   */
  async stop (): Promise<Blob> {
    const encoder = this.encoder
    this.recording = false

    try {
      if (!encoder) {
        this.throwIfEncoderErrored()
        throw new Error('[VideoRecorder] not running')
      }

      this.throwIfEncoderErrored()
      if (encoder.state !== 'closed') {
        await encoder.flush()
        encoder.close()
      }
      this.throwIfEncoderErrored()

      if (!this.mp4File) {
        return new Blob([], { type: 'video/mp4' })
      }

      if (this.sampleCount <= 0) {
        throw new Error(
          `[VideoRecorder] no encoded samples were muxed into MP4 (droppedWithoutTrack=${this.droppedChunkCountWithoutTrack}).`
        )
      }

      // Use the non-downloading serialization path; the caller owns download behavior.
      const stream = this.mp4File.getBuffer()
      return new Blob([stream.buffer], { type: 'video/mp4' })
    } finally {
      this.encoder = null
      this.mp4File = null
      this.trackId = null
    }
  }

  private handleEncodedChunk (
    chunk: EncodedVideoChunk,
    metadata?: EncodedVideoChunkMetadata
  ): void {
    if (!this.mp4File) return

    const data = new Uint8Array(chunk.byteLength)
    chunk.copyTo(data)

    if (this.trackId === null && metadata?.decoderConfig?.description) {
      const description = metadata.decoderConfig.description
      const descriptionBytes = description instanceof ArrayBuffer
        ? new Uint8Array(description)
        : new Uint8Array(description.buffer, description.byteOffset, description.byteLength)
      const avcDecoderConfigRecord = descriptionBytes.slice().buffer

      this.trackId = this.mp4File.addTrack({
        timescale: 90_000,
        width: this.width,
        height: this.height,
        type: 'avc1',
        avcDecoderConfigRecord
      })
    }

    if (this.trackId === null) {
      this.droppedChunkCountWithoutTrack += 1
      console.warn('[VideoRecorder] dropping chunk: no track yet')
      return
    }

    const durationMicros = (
      typeof chunk.duration === 'number' &&
      Number.isFinite(chunk.duration) &&
      chunk.duration > 0
    )
      ? Math.max(1, Math.round(chunk.duration))
      : this.frameDurationMicros
    const timestampMicros = (
      Number.isFinite(chunk.timestamp) &&
      chunk.timestamp >= 0
    )
      ? Math.round(chunk.timestamp)
      : this.sampleCount * this.frameDurationMicros
    const durationTicks = Math.max(1, Math.round((durationMicros * MP4_TIMESCALE) / MICROS_PER_SECOND))
    const dtsTicks = Math.max(0, Math.round((timestampMicros * MP4_TIMESCALE) / MICROS_PER_SECOND))

    this.mp4File.addSample(this.trackId, data, {
      duration: durationTicks,
      dts: dtsTicks,
      cts: dtsTicks,
      is_sync: chunk.type === 'key'
    })
    this.sampleCount += 1
  }
}
