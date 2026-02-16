// Minimal WebGPU type definitions for capture readback
// (Full types are usually provided by @webgpu/types or similar, but adding this shim avoids dependency changes)

interface GPUBuffer {
    mapAsync(mode: GPUMapMode, offset?: number, size?: number): Promise<void>;
    getMappedRange(offset?: number, size?: number): ArrayBuffer;
    unmap(): void;
    destroy(): void;
}

interface GPUBufferDescriptor {
    label?: string;
    size: number;
    usage: number;
    mappedAtCreation?: boolean;
}

interface GPUDevice {
    createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer;
    createCommandEncoder(descriptor?: any): GPUCommandEncoder;
    queue: GPUQueue;
}

interface GPUCommandEncoder {
    copyTextureToBuffer(source: GPUImageCopyTexture, destination: GPUImageCopyBuffer, copySize: GPUExtent3D): void;
    finish(descriptor?: any): GPUCommandBuffer;
}

interface GPUQueue {
    submit(commandBuffers: GPUCommandBuffer[]): void;
    onSubmittedWorkDone(): Promise<void>;
}

interface GPUImageCopyTexture {
    texture: GPUTexture;
    mipLevel?: number;
    origin?: GPUOrigin3D;
    aspect?: any;
}

interface GPUImageCopyBuffer {
    buffer: GPUBuffer;
    offset?: number;
    bytesPerRow?: number;
    rowsPerImage?: number;
}

interface GPUTexture {
    destroy(): void;
}

interface GPUCommandBuffer { }
type GPUExtent3D = { width: number; height: number; depthOrArrayLayers?: number };
type GPUOrigin3D = { x?: number; y?: number; z?: number };
type GPUMapMode = number;

declare const GPUBufferUsage: {
    MAP_READ: number;
    COPY_DST: number;
    COPY_SRC: number;
};

declare const GPUMapMode: {
    READ: number;
    WRITE: number;
};

// File System Access API
interface FileSystemHandle {
    kind: 'file' | 'directory';
    name: string;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
}

interface FileSystemFileHandle extends FileSystemHandle {
    createWritable(options?: { keepExistingData?: boolean }): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream extends WritableStream {
    write(data: BufferSource | Blob | string): Promise<void>;
    seek(position: number): Promise<void>;
    truncate(size: number): Promise<void>;
    close(): Promise<void>;
}

interface Window {
    showDirectoryPicker(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>;
}
