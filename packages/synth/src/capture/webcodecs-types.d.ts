// Minimal WebCodecs type definitions
// Reference: https://w3c.github.io/webcodecs/

interface VideoEncoderConfig {
    codec: string;
    width: number;
    height: number;
    bitrate?: number;
    framerate?: number;
    latencyMode?: 'quality' | 'realtime';
    avc?: {
        format: 'annexb' | 'avc';
    };
}

interface VideoEncoderInit {
    output: (chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata) => void;
    error: (error: DOMException) => void;
}

declare class VideoEncoder {
    constructor(init: VideoEncoderInit);
    readonly state: 'configured' | 'unconfigured' | 'closed';
    readonly encodeQueueSize: number;
    configure(config: VideoEncoderConfig): void;
    encode(frame: VideoFrame, options?: VideoEncoderEncodeOptions): void;
    flush(): Promise<void>;
    reset(): void;
    close(): void;

    static isConfigSupported(config: VideoEncoderConfig): Promise<VideoEncoderSupport>;
}

interface VideoEncoderSupport {
    supported: boolean;
    config?: VideoEncoderConfig;
}

interface VideoEncoderEncodeOptions {
    keyFrame?: boolean;
}

interface EncodedVideoChunk {
    readonly type: 'key' | 'delta';
    readonly timestamp: number; // microseconds
    readonly duration: number | null; // microseconds
    readonly byteLength: number;
    copyTo(destination: BufferSource): void;
}

interface EncodedVideoChunkMetadata {
    decoderConfig?: VideoDecoderConfig;
    svc?: any;
}

interface VideoDecoderConfig {
    codec: string;
    description?: BufferSource;
    codedWidth?: number;
    codedHeight?: number;
    displayAspectWidth?: number;
    displayAspectHeight?: number;
    colorSpace?: VideoColorSpace;
    hardwareAcceleration?: 'no-preference' | 'prefer-hardware' | 'prefer-software';
    optimizeForLatency?: boolean;
}

interface VideoColorSpace {
    primaries?: 'bt709' | 'bt470bg' | 'smpte170m' | string;
    transfer?: 'bt709' | 'smpte170m' | 'iec61966-2-1' | string;
    matrix?: 'rgb' | 'bt709' | 'bt470bg' | 'smpte170m' | string;
    fullRange?: boolean;
}

interface VideoFrameInit {
    timestamp?: number; // microseconds
    duration?: number; // microseconds
}

declare class VideoFrame {
    constructor(image: CanvasImageSource | BufferSource | VideoFrame, init?: VideoFrameInit);
    readonly format: string | null;
    readonly codedWidth: number;
    readonly codedHeight: number;
    readonly displayWidth: number;
    readonly displayHeight: number;
    readonly timestamp: number; // microseconds
    readonly duration: number | null; // microseconds

    allocationSize(options?: VideoFrameCopyToOptions): number;
    copyTo(destination: BufferSource, options?: VideoFrameCopyToOptions): Promise<VideoFrameLayout[]>;
    clone(): VideoFrame;
    close(): void;
}

interface VideoFrameCopyToOptions {
    rect?: DOMRectInit;
    layout?: VideoFrameLayout[];
}

interface VideoFrameLayout {
    offset: number;
    stride: number;
}
