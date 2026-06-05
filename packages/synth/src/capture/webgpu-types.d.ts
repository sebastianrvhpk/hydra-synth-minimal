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
    createTexture(descriptor: GPUTextureDescriptor): GPUTexture;
    createQuerySet(descriptor: GPUQuerySetDescriptor): GPUQuerySet;
    createCommandEncoder(descriptor?: any): GPUCommandEncoder;
    createShaderModule(descriptor: GPUShaderModuleDescriptor): GPUShaderModule;
    createBindGroupLayout(descriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout;
    createPipelineLayout(descriptor: GPUPipelineLayoutDescriptor): GPUPipelineLayout;
    createRenderPipeline(descriptor: GPURenderPipelineDescriptor): GPURenderPipeline;
    createRenderPipelineAsync(descriptor: GPURenderPipelineDescriptor): Promise<GPURenderPipeline>;
    createComputePipelineAsync(descriptor: GPUComputePipelineDescriptor): Promise<GPUComputePipeline>;
    createBindGroup(descriptor: GPUBindGroupDescriptor): GPUBindGroup;
    queue: GPUQueue;
}

interface GPUCommandEncoder {
    copyTextureToBuffer(source: GPUImageCopyTexture, destination: GPUImageCopyBuffer, copySize: GPUExtent3D): void;
    copyBufferToBuffer(source: GPUBuffer, sourceOffset: number, destination: GPUBuffer, destinationOffset: number, size: number): void;
    resolveQuerySet(querySet: GPUQuerySet, firstQuery: number, queryCount: number, destination: GPUBuffer, destinationOffset: number): void;
    beginRenderPass(descriptor: GPURenderPassDescriptor): GPURenderPassEncoder;
    beginComputePass(descriptor?: GPUComputePassDescriptor): GPUComputePassEncoder;
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
    createView(descriptor?: GPUTextureViewDescriptor): GPUTextureView;
    destroy(): void;
}

interface GPUTextureDescriptor {
    label?: string;
    size: GPUExtent3D;
    format: GPUTextureFormat;
    usage: number;
    dimension?: '1d' | '2d' | '3d';
}

interface GPUTextureViewDescriptor {
    format?: GPUTextureFormat;
    dimension?: '1d' | '2d' | '2d-array' | 'cube' | 'cube-array' | '3d';
    aspect?: 'all' | 'stencil-only' | 'depth-only';
    baseMipLevel?: number;
    mipLevelCount?: number;
    baseArrayLayer?: number;
    arrayLayerCount?: number;
}

interface GPUShaderModuleDescriptor {
    label?: string;
    code: string;
}

interface GPUBindGroupLayoutDescriptor {
    label?: string;
    entries: GPUBindGroupLayoutEntry[];
}

interface GPUBindGroupLayoutEntry {
    binding: number;
    visibility: number;
    buffer?: GPUBufferBindingLayout;
    sampler?: GPUSamplerBindingLayout;
    texture?: GPUTextureBindingLayout;
    externalTexture?: any;
}

interface GPUBufferBindingLayout {
    type?: 'uniform';
    hasDynamicOffset?: boolean;
    minBindingSize?: number;
}

interface GPUSamplerBindingLayout {
    type?: 'filtering' | 'non-filtering' | 'comparison';
}

interface GPUTextureBindingLayout {
    sampleType?: 'float' | 'unfilterable-float' | 'depth' | 'sint' | 'uint';
    viewDimension?: '1d' | '2d' | '2d-array' | 'cube' | 'cube-array' | '3d';
    multisampled?: boolean;
}

interface GPUPipelineLayoutDescriptor {
    label?: string;
    bindGroupLayouts: GPUBindGroupLayout[];
}

interface GPUVertexState {
    module: GPUShaderModule;
    entryPoint: string;
    constants?: Record<string, number>;
}

interface GPUFragmentState {
    module: GPUShaderModule;
    entryPoint: string;
    constants?: Record<string, number>;
    targets: GPUColorTargetState[];
}

interface GPUColorTargetState {
    format: GPUTextureFormat;
}

interface GPUPrimitiveState {
    topology?: 'point-list' | 'line-list' | 'line-strip' | 'triangle-list' | 'triangle-strip';
}

interface GPURenderPipelineDescriptor {
    label?: string;
    layout: GPUPipelineLayout | 'auto';
    vertex: GPUVertexState;
    fragment?: GPUFragmentState;
    primitive?: GPUPrimitiveState;
}

interface GPUComputePipelineDescriptor {
    label?: string;
    layout: GPUPipelineLayout | 'auto';
    compute: GPUProgrammableStage;
}

interface GPUProgrammableStage {
    module: GPUShaderModule;
    entryPoint: string;
    constants?: Record<string, number>;
}

interface GPURenderPassColorAttachment {
    view: GPUTextureView;
    loadOp: 'load' | 'clear';
    storeOp: 'store' | 'discard';
    clearValue?: { r: number; g: number; b: number; a: number };
}

interface GPURenderPassDescriptor {
    label?: string;
    colorAttachments: GPURenderPassColorAttachment[];
    timestampWrites?: GPUPassTimestampWrites;
}

interface GPURenderPassEncoder {
    setPipeline(pipeline: GPURenderPipeline): void;
    setBindGroup(index: number, bindGroup: GPUBindGroup, dynamicOffsets?: number[]): void;
    draw(vertexCount: number, instanceCount?: number, firstVertex?: number, firstInstance?: number): void;
    end(): void;
}

interface GPUComputePassDescriptor {
    label?: string;
    timestampWrites?: GPUPassTimestampWrites;
}

interface GPUPassTimestampWrites {
    querySet: GPUQuerySet;
    beginningOfPassWriteIndex?: number;
    endOfPassWriteIndex?: number;
}

interface GPUQuerySetDescriptor {
    label?: string;
    type: 'timestamp';
    count: number;
}

interface GPUComputePassEncoder {
    setPipeline(pipeline: GPUComputePipeline): void;
    setBindGroup(index: number, bindGroup: GPUBindGroup, dynamicOffsets?: number[]): void;
    dispatchWorkgroups(workgroupCountX: number, workgroupCountY?: number, workgroupCountZ?: number): void;
    end(): void;
}

interface GPUBindGroupDescriptor {
    label?: string;
    layout: GPUBindGroupLayout;
    entries: GPUBindGroupEntry[];
}

interface GPUBindGroupEntry {
    binding: number;
    resource: GPUBindingResource;
}

type GPUBindingResource = GPUBufferBinding | GPUTextureView | GPUSampler;

interface GPUBufferBinding {
    buffer: GPUBuffer;
    offset?: number;
    size?: number;
}

interface GPUCommandBuffer { }
interface GPUShaderModule { }
interface GPUBindGroupLayout { }
interface GPUPipelineLayout { }
interface GPURenderPipeline { }
interface GPUComputePipeline { }
interface GPUQuerySet { destroy(): void; }
interface GPUBindGroup { }
interface GPUTextureView { }
interface GPUSampler { }

type GPUExtent3D = { width: number; height: number; depthOrArrayLayers?: number } | [number, number, number] | [number, number];
type GPUOrigin3D = { x?: number; y?: number; z?: number } | [number, number, number] | [number, number];
type GPUMapMode = number;
type GPUTextureFormat = 'rgba8unorm' | 'rgba16float' | 'bgra8unorm' | string;

declare const GPUBufferUsage: {
    MAP_READ: number;
    COPY_DST: number;
    COPY_SRC: number;
    QUERY_RESOLVE: number;
};

declare const GPUMapMode: {
    READ: number;
    WRITE: number;
};

declare const GPUTextureUsage: {
    COPY_SRC: number;
    COPY_DST: number;
    TEXTURE_BINDING: number;
    RENDER_ATTACHMENT: number;
    STORAGE_BINDING: number;
};

declare const GPUShaderStage: {
    VERTEX: number;
    FRAGMENT: number;
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
