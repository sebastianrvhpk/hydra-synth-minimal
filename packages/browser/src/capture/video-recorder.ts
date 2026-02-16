/// <reference path="./webcodecs-types.d.ts" />
// @ts-ignore — bare specifier replaced with relative path for the unbundled static dev server
import { createFile, type ISOFile } from '../../../../node_modules/mp4box/dist/mp4box.all.js'

export interface VideoRecorderOptions {
    width: number
    height: number
    fps: number
    bitrate?: number
}

/**
 * A recorder that uses WebCodecs VideoEncoder to produce MP4 files.
 * Feeds VideoFrames directly from a canvas to the encoder (zero-copy path),
 * then muxes the encoded H.264 chunks into an MP4 container via mp4box.
 */
export class VideoRecorder {
    private encoder: VideoEncoder | null = null
    private mp4File: ISOFile | null = null
    private trackId: number | null = null
    private readonly width: number
    private readonly height: number
    private readonly fps: number
    private readonly bitrate: number
    private frameCounter = 0
    private recording = false

    constructor(options: VideoRecorderOptions) {
        this.width = options.width
        this.height = options.height
        this.fps = options.fps
        this.bitrate = options.bitrate ?? 25_000_000 // 25 Mbps default (visually lossless)
    }

    async start(): Promise<void> {
        if (this.recording) return
        this.recording = true
        this.frameCounter = 0

        // Initialize MP4Box in-memory file
        this.mp4File = createFile()
        this.trackId = null // Track is created on first encoded chunk (needs SPS/PPS)

        // Initialize VideoEncoder
        this.encoder = new VideoEncoder({
            output: (chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata) =>
                this.handleEncodedChunk(chunk, metadata),
            error: (error: DOMException) => {
                console.error('[VideoRecorder] encoder error:', error)
                this.recording = false
            }
        })

        const config: VideoEncoderConfig = {
            codec: 'avc1.4d002a', // H.264 High Profile Level 4.2
            width: this.width,
            height: this.height,
            bitrate: this.bitrate,
            framerate: this.fps,
            latencyMode: 'quality'
        }

        try {
            const support = await VideoEncoder.isConfigSupported(config)
            if (!support.supported) {
                console.warn('[VideoRecorder] High profile H.264 not supported, falling back to baseline')
                config.codec = 'avc1.42001f'
            }
            this.encoder.configure(config)
        } catch (e) {
            console.error('[VideoRecorder] configuration failed:', e)
            this.recording = false
            throw e
        }
    }

    /**
     * Encode one frame from a canvas or existing VideoFrame.
     *
     * The VideoFrame is created internally and closed after encoding,
     * so the caller does not need to manage frame lifetimes.
     */
    async appendFrame(source: CanvasImageSource | VideoFrame): Promise<void> {
        if (!this.recording || !this.encoder || this.encoder.state === 'closed') return

        const duration = 1_000_000 / this.fps // microseconds
        const timestamp = this.frameCounter * duration

        const frame = source instanceof VideoFrame
            ? new VideoFrame(source, { timestamp, duration })
            : new VideoFrame(source as CanvasImageSource, { timestamp, duration })

        try {
            // Force a key-frame every 2 seconds for seekability
            const keyFrame = this.frameCounter % (this.fps * 2) === 0
            this.encoder.encode(frame, { keyFrame })
        } finally {
            frame.close()
        }

        this.frameCounter++
    }

    /**
     * Finish encoding, flush the encoder, finalize the MP4 container,
     * and return the result as a Blob.
     */
    async stop(): Promise<Blob> {
        if (!this.recording || !this.encoder) {
            throw new Error('[VideoRecorder] not running')
        }
        this.recording = false

        // Drain all pending frames
        await this.encoder.flush()
        this.encoder.close()
        this.encoder = null

        // Serialize the MP4s
        if (!this.mp4File) return new Blob([], { type: 'video/mp4' })

        // MP4Box's save() returns a Blob directly
        const blob = this.mp4File.save('output.mp4')
        this.mp4File = null
        return blob
    }

    // ── private ──────────────────────────────────────────────────────

    private handleEncodedChunk(
        chunk: EncodedVideoChunk,
        metadata?: EncodedVideoChunkMetadata
    ): void {
        if (!this.mp4File) return

        // Copy the encoded data into a Uint8Array (required by mp4box addSample)
        const data = new Uint8Array(chunk.byteLength)
        chunk.copyTo(data.buffer)

        // On the very first key-frame the encoder provides a decoderConfig with
        // an avcDecoderConfigRecord (SPS/PPS). We use that to create the track.
        if (
            this.trackId === null &&
            metadata?.decoderConfig?.description
        ) {
            const description = metadata.decoderConfig.description
            const descBuf = description instanceof ArrayBuffer
                ? description
                : (description as Uint8Array).buffer as ArrayBuffer

            this.trackId = this.mp4File.addTrack({
                timescale: 90_000, // standard video timescale
                width: this.width,
                height: this.height,
                type: 'avc1',
                avcDecoderConfigRecord: descBuf
            })
        }

        if (this.trackId === null) {
            // We haven't received the config yet; drop this chunk.
            // (should not happen because the first chunk is always a key-frame)
            console.warn('[VideoRecorder] dropping chunk: no track yet')
            return
        }

        // Convert timestamps from microseconds → track timescale ticks
        const timescale = 90_000
        const durationTicks = Math.round(((chunk.duration ?? 0) / 1_000_000) * timescale)
        const dtsTicks = Math.round((chunk.timestamp / 1_000_000) * timescale)

        this.mp4File.addSample(this.trackId, data, {
            duration: durationTicks,
            dts: dtsTicks,
            cts: dtsTicks,
            is_sync: chunk.type === 'key'
        })
    }
}
