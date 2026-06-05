import { ComputePipelineCache, PipelineCache } from './pipeline-cache.js'
import { createOutputTextureUsage, MAX_DYNAMIC_UNIFORMS, OUTPUT_TEXTURE_FORMAT } from './constants.js'

export const WEBGPU_UNAVAILABLE_MESSAGE =
  'WebGPU is unavailable. Use a secure context (https:// or localhost) in a browser with WebGPU enabled, then retry.'

export interface WebGPURendererOptions {
  canvas: HTMLCanvasElement
  width?: number
  height?: number
}

export interface WebGPUFragmentCapabilities {
  targetFormat: GPUTextureFormat
  maxColorAttachments: number
}

export interface WebGPUComputeCapabilities {
  storageTextureFormat: GPUTextureFormat
  maxComputeInvocationsPerWorkgroup: number
  maxComputeWorkgroupSizeX: number
  maxComputeWorkgroupSizeY: number
}

export interface WebGPUTimingCapabilities {
  timestampQuery: boolean
}

export interface WebGPUCapabilities {
  fragment: WebGPUFragmentCapabilities
  compute: WebGPUComputeCapabilities
  timing: WebGPUTimingCapabilities
  features: string[]
}

export type WebGPUTextureFilterMode = 'nearest' | 'linear'

interface GpuTimingRecord {
  startIndex: number
  endIndex: number
  onResult: (gpuMs: number) => void
}

interface GpuTimingFrame {
  querySet: GPUQuerySet
  resolveBuffer: GPUBuffer
  readbackBuffer: GPUBuffer
  queryCount: number
  records: GpuTimingRecord[]
}

interface PassTimingAllocation {
  timestampWrites: GPUPassTimestampWrites
}

const MAX_TIMESTAMP_QUERIES_PER_FRAME = 512

export class WebGPURenderer {
  readonly canvas: HTMLCanvasElement
  width: number
  height: number
  ready = false
  initError: unknown = null

  adapter: GPUAdapter | null = null
  device: GPUDevice | null = null
  context: GPUCanvasContext | null = null
  canvasFormat: GPUTextureFormat | null = null
  globalUniformBuffer: GPUBuffer | null = null
  linearSampler: GPUSampler | null = null
  nearestSampler: GPUSampler | null = null
  fallbackTexture: GPUTexture | null = null
  capabilities: WebGPUCapabilities | null = null

  private outputPipelineCache: PipelineCache | null = null
  private outputComputePipelineCache: ComputePipelineCache | null = null
  private screenPipeline: GPURenderPipeline | null = null
  private screenAllPipeline: GPURenderPipeline | null = null

  private readonly globalUniformData = new Float32Array(4)
  private readonly lastGlobalUniformData = new Float32Array([Number.NaN, Number.NaN, Number.NaN, Number.NaN])
  private globalUniformDirty = true
  private textureViewCache = new WeakMap<GPUTexture, Map<string, GPUTextureView>>()
  private objectIds = new WeakMap<object, number>()
  private nextObjectId = 1

  private screenBindGroupCacheKey = ''
  private screenBindGroup: GPUBindGroup | null = null
  private screenAllBindGroupCacheKey = ''
  private screenAllBindGroup: GPUBindGroup | null = null
  private readonly screenResolvedTextures: Array<GPUTexture | null> = [null, null, null, null]
  private activeTimingFrame: GpuTimingFrame | null = null

  constructor ({ canvas, width = canvas.width || 1280, height = canvas.height || 720 }: WebGPURendererOptions) {
    this.canvas = canvas
    this.width = width
    this.height = height
  }

  static assertSupport (): void {
    if (typeof navigator === 'undefined' || !navigator.gpu) {
      throw new Error(WEBGPU_UNAVAILABLE_MESSAGE)
    }
  }

  async init (): Promise<this> {
    if (this.ready) return this

    WebGPURenderer.assertSupport()
    this.context = this.canvas.getContext('webgpu')
    if (!this.context) {
      throw new Error('WebGPU context creation failed. Ensure this canvas supports `webgpu` contexts and retry.')
    }

    this.adapter = await navigator.gpu.requestAdapter()
    if (!this.adapter) {
      throw new Error('No compatible GPU adapter was found. Verify WebGPU is enabled and GPU acceleration is available.')
    }

    const requiredFeatures: GPUFeatureName[] = []
    if (this.adapter.features.has('timestamp-query' as GPUFeatureName)) {
      requiredFeatures.push('timestamp-query' as GPUFeatureName)
    }
    this.device = await this.adapter.requestDevice(
      requiredFeatures.length > 0 ? { requiredFeatures } : undefined
    )
    this.canvasFormat = navigator.gpu.getPreferredCanvasFormat()
    this.capabilities = this.inspectCapabilities()

    this.configureCanvas()
    this.initGlobalResources()
    this.initScreenPipelines()

    this.outputPipelineCache = new PipelineCache({
      device: this.device,
      targetFormat: OUTPUT_TEXTURE_FORMAT,
      maxEntries: 256
    })
    this.outputComputePipelineCache = new ComputePipelineCache({
      device: this.device,
      maxEntries: 128
    })

    this.ready = true
    return this
  }

  private inspectCapabilities (): WebGPUCapabilities | null {
    if (!this.adapter || !this.device) return null

    const limits = this.device.limits as unknown as Record<string, number>
    const readLimit = (name: string, fallback = 0): number => {
      const value = limits[name]
      return typeof value === 'number' && Number.isFinite(value) ? value : fallback
    }

    const features = Array.from(this.device.features.values()).map((entry) => `${entry}`)
    const targetFormat = this.canvasFormat ?? navigator.gpu.getPreferredCanvasFormat()

    return {
      fragment: {
        targetFormat,
        maxColorAttachments: readLimit('maxColorAttachments')
      },
      compute: {
        storageTextureFormat: OUTPUT_TEXTURE_FORMAT,
        maxComputeInvocationsPerWorkgroup: readLimit('maxComputeInvocationsPerWorkgroup'),
        maxComputeWorkgroupSizeX: readLimit('maxComputeWorkgroupSizeX'),
        maxComputeWorkgroupSizeY: readLimit('maxComputeWorkgroupSizeY')
      },
      timing: {
        timestampQuery: this.device.features.has('timestamp-query' as GPUFeatureName)
      },
      features
    }
  }

  private configureCanvas (): void {
    if (!this.context || !this.device || !this.canvasFormat) return
    this.context.configure({
      device: this.device,
      format: this.canvasFormat,
      alphaMode: 'premultiplied',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
    })
  }

  private initGlobalResources (): void {
    if (!this.device) return

    this.globalUniformBuffer = this.device.createBuffer({
      label: 'hydra-global-uniforms',
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })
    this.globalUniformDirty = true

    this.nearestSampler = this.device.createSampler({
      magFilter: 'nearest',
      minFilter: 'nearest',
      mipmapFilter: 'nearest',
      addressModeU: 'repeat',
      addressModeV: 'repeat'
    })
    this.linearSampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      mipmapFilter: 'linear',
      addressModeU: 'repeat',
      addressModeV: 'repeat'
    })

    this.fallbackTexture = this.createOutputTexture({
      width: 1,
      height: 1,
      label: 'hydra-fallback-texture'
    })

    const encoder = this.device.createCommandEncoder({ label: 'hydra-fallback-clear' })
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.getTextureView(this.fallbackTexture),
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear',
        storeOp: 'store'
      }]
    })
    pass.end()
    this.device.queue.submit([encoder.finish()])
  }

  private initScreenPipelines (): void {
    if (!this.device || !this.canvasFormat) return

    const baseVertex = `
fn hydraFullscreenVertex(vertexIndex: u32) -> vec4f {
  let positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  let p = positions[vertexIndex];
  return vec4f(p, 0.0, 1.0);
}
`

    const singleShader = `
struct GlobalUniforms {
  time: f32,
  bpm: f32,
  width: f32,
  height: f32,
};

@group(0) @binding(0) var<uniform> globals: GlobalUniforms;
@group(0) @binding(1) var hydraSampler: sampler;
@group(0) @binding(2) var tex0: texture_2d<f32>;

${baseVertex}

@vertex
fn vsMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  return hydraFullscreenVertex(vertexIndex);
}

@fragment
fn fsMain(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let uv = vec2f(fragCoord.x / globals.width, fragCoord.y / globals.height);
  return textureSample(tex0, hydraSampler, fract(uv));
}
`

    const allShader = `
struct GlobalUniforms {
  time: f32,
  bpm: f32,
  width: f32,
  height: f32,
};

@group(0) @binding(0) var<uniform> globals: GlobalUniforms;
@group(0) @binding(1) var hydraSampler: sampler;
@group(0) @binding(2) var tex0: texture_2d<f32>;
@group(0) @binding(3) var tex1: texture_2d<f32>;
@group(0) @binding(4) var tex2: texture_2d<f32>;
@group(0) @binding(5) var tex3: texture_2d<f32>;

${baseVertex}

@vertex
fn vsMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  return hydraFullscreenVertex(vertexIndex);
}

@fragment
fn fsMain(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let uv = vec2f(fragCoord.x / globals.width, fragCoord.y / globals.height);
  let tiled = clamp(uv * 2.0, vec2f(0.0), vec2f(1.9999));
  let localUv = fract(tiled);
  let cellX = i32(floor(tiled.x));
  let cellY = i32(floor(tiled.y));
  let quad = cellX + (cellY * 2);

  if (quad == 0) {
    return textureSampleLevel(tex0, hydraSampler, localUv, 0.0);
  }
  if (quad == 1) {
    return textureSampleLevel(tex1, hydraSampler, localUv, 0.0);
  }
  if (quad == 2) {
    return textureSampleLevel(tex2, hydraSampler, localUv, 0.0);
  }
  return textureSampleLevel(tex3, hydraSampler, localUv, 0.0);
}
`

    const singleModule = this.device.createShaderModule({
      label: 'hydra-screen-single-module',
      code: singleShader
    })

    const allModule = this.device.createShaderModule({
      label: 'hydra-screen-all-module',
      code: allShader
    })

    this.screenPipeline = this.device.createRenderPipeline({
      label: 'hydra-screen-single-pipeline',
      layout: 'auto',
      vertex: {
        module: singleModule,
        entryPoint: 'vsMain'
      },
      fragment: {
        module: singleModule,
        entryPoint: 'fsMain',
        targets: [{ format: this.canvasFormat }]
      },
      primitive: {
        topology: 'triangle-list'
      }
    })

    this.screenAllPipeline = this.device.createRenderPipeline({
      label: 'hydra-screen-all-pipeline',
      layout: 'auto',
      vertex: {
        module: allModule,
        entryPoint: 'vsMain'
      },
      fragment: {
        module: allModule,
        entryPoint: 'fsMain',
        targets: [{ format: this.canvasFormat }]
      },
      primitive: {
        topology: 'triangle-list'
      }
    })
  }

  setResolution (width: number, height: number): void {
    this.width = width
    this.height = height
    this.canvas.width = width
    this.canvas.height = height
    this.globalUniformDirty = true
    if (this.ready) this.configureCanvas()
  }

  updateGlobalUniforms ({ time, bpm, width, height }: { time: number, bpm: number, width?: number, height?: number }): boolean {
    if (!this.ready || !this.device || !this.globalUniformBuffer) return false
    if (typeof width === 'number') this.width = width
    if (typeof height === 'number') this.height = height
    this.globalUniformData[0] = time
    this.globalUniformData[1] = bpm
    this.globalUniformData[2] = this.width
    this.globalUniformData[3] = this.height
    if (
      !this.globalUniformDirty &&
      this.globalUniformData[0] === this.lastGlobalUniformData[0] &&
      this.globalUniformData[1] === this.lastGlobalUniformData[1] &&
      this.globalUniformData[2] === this.lastGlobalUniformData[2] &&
      this.globalUniformData[3] === this.lastGlobalUniformData[3]
    ) {
      return false
    }
    this.device.queue.writeBuffer(this.globalUniformBuffer, 0, this.globalUniformData)
    this.lastGlobalUniformData.set(this.globalUniformData)
    this.globalUniformDirty = false
    return true
  }

  createOutputTexture ({
    width = this.width,
    height = this.height,
    depthOrArrayLayers = 1,
    label = '',
    format = OUTPUT_TEXTURE_FORMAT,
    includeRenderAttachment = true,
    includeStorageBinding = true
  }: {
    width?: number,
    height?: number,
    depthOrArrayLayers?: number,
    label?: string,
    format?: GPUTextureFormat,
    includeRenderAttachment?: boolean
    includeStorageBinding?: boolean
  } = {}): GPUTexture {
    if (!this.device) throw new Error('Renderer not initialized.')
    return this.device.createTexture({
      label: label || 'hydra-output-texture',
      size: {
        width: Math.max(1, Math.floor(width)),
        height: Math.max(1, Math.floor(height)),
        depthOrArrayLayers: Math.max(1, Math.floor(depthOrArrayLayers))
      },
      format,
      usage: createOutputTextureUsage({ includeRenderAttachment, includeStorageBinding })
    })
  }

  createDynamicUniformBuffer (label: string): GPUBuffer {
    if (!this.device) throw new Error('Renderer not initialized.')
    return this.device.createBuffer({
      label,
      size: MAX_DYNAMIC_UNIFORMS * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })
  }

  createReadbackBuffer (label: string, byteLength: number): GPUBuffer {
    if (!this.device) throw new Error('Renderer not initialized.')
    const aligned = Math.max(256, Math.ceil(Math.max(1, byteLength) / 256) * 256)
    return this.device.createBuffer({
      label,
      size: aligned,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    })
  }

  getCapabilities (): WebGPUCapabilities | null {
    return this.capabilities
  }

  getFallbackTexture (): GPUTexture {
    if (!this.fallbackTexture) throw new Error('Renderer fallback texture is not initialized.')
    return this.fallbackTexture
  }

  getOutputPipelineEntry (signature: string, code: string) {
    if (!this.outputPipelineCache) return null
    return this.outputPipelineCache.requestPipeline(signature, code)
  }

  getOutputComputePipelineEntry (signature: string, code: string) {
    if (!this.outputComputePipelineCache) return null
    return this.outputComputePipelineCache.requestPipeline(signature, code)
  }

  getObjectId (value: object | null | undefined): number {
    if (!value) return 0
    let id = this.objectIds.get(value)
    if (!id) {
      id = this.nextObjectId++
      this.objectIds.set(value, id)
    }
    return id
  }

  getTextureView (texture: GPUTexture, dimension: GPUTextureViewDimension = '2d'): GPUTextureView {
    let viewCache = this.textureViewCache.get(texture)
    if (!viewCache) {
      viewCache = new Map<string, GPUTextureView>()
      this.textureViewCache.set(texture, viewCache)
    }

    const cacheKey = dimension
    let view = viewCache.get(cacheKey)
    if (!view) {
      view = texture.createView({ dimension })
      viewCache.set(cacheKey, view)
    }
    return view
  }

  private invalidateScreenBindGroupCaches (): void {
    this.screenBindGroupCacheKey = ''
    this.screenBindGroup = null
    this.screenAllBindGroupCacheKey = ''
    this.screenAllBindGroup = null
  }

  beginFrame (): GPUCommandEncoder | null {
    if (!this.ready || !this.device) return null
    this.beginGpuTimingFrame()
    return this.device.createCommandEncoder({ label: 'hydra-frame-encoder' })
  }

  private supportsTimestampQueries (): boolean {
    return Boolean(this.device?.features.has('timestamp-query' as GPUFeatureName))
  }

  supportsComputePasses (): boolean {
    return Boolean(this.ready && this.device && this.outputComputePipelineCache)
  }

  private beginGpuTimingFrame (): void {
    this.activeTimingFrame = null
    if (!this.device || !this.supportsTimestampQueries()) return

    const byteLength = MAX_TIMESTAMP_QUERIES_PER_FRAME * 8
    this.activeTimingFrame = {
      querySet: this.device.createQuerySet({
        label: 'hydra-pass-timestamps',
        type: 'timestamp',
        count: MAX_TIMESTAMP_QUERIES_PER_FRAME
      }),
      resolveBuffer: this.device.createBuffer({
        label: 'hydra-pass-timestamps-resolve',
        size: byteLength,
        usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC
      }),
      readbackBuffer: this.device.createBuffer({
        label: 'hydra-pass-timestamps-readback',
        size: byteLength,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
      }),
      queryCount: 0,
      records: []
    }
  }

  allocatePassTiming (onResult: (gpuMs: number) => void): PassTimingAllocation | null {
    const timingFrame = this.activeTimingFrame
    if (!timingFrame || timingFrame.queryCount + 2 > MAX_TIMESTAMP_QUERIES_PER_FRAME) return null

    const startIndex = timingFrame.queryCount
    const endIndex = startIndex + 1
    timingFrame.queryCount += 2
    timingFrame.records.push({ startIndex, endIndex, onResult })
    return {
      timestampWrites: {
        querySet: timingFrame.querySet,
        beginningOfPassWriteIndex: startIndex,
        endOfPassWriteIndex: endIndex
      }
    }
  }

  private readGpuTimingFrame (timingFrame: GpuTimingFrame): void {
    if (!this.device || timingFrame.queryCount <= 0 || timingFrame.records.length === 0) {
      timingFrame.querySet.destroy()
      timingFrame.resolveBuffer.destroy()
      timingFrame.readbackBuffer.destroy()
      return
    }

    void this.device.queue.onSubmittedWorkDone()
      .then(() => timingFrame.readbackBuffer.mapAsync(GPUMapMode.READ))
      .then(() => {
        const mapped = timingFrame.readbackBuffer.getMappedRange(0, timingFrame.queryCount * 8)
        const timestamps = new BigUint64Array(mapped.slice(0))
        for (const record of timingFrame.records) {
          const start = timestamps[record.startIndex]
          const end = timestamps[record.endIndex]
          if (typeof start !== 'bigint' || typeof end !== 'bigint' || end <= start) continue
          const gpuMs = Number(end - start) / 1_000_000
          if (Number.isFinite(gpuMs) && gpuMs >= 0) record.onResult(gpuMs)
        }
      })
      .catch(() => {})
      .finally(() => {
        try {
          timingFrame.readbackBuffer.unmap()
        } catch {}
        timingFrame.querySet.destroy()
        timingFrame.resolveBuffer.destroy()
        timingFrame.readbackBuffer.destroy()
      })
  }

  getSampler (filter: WebGPUTextureFilterMode = 'nearest'): GPUSampler | null {
    return filter === 'linear' ? this.linearSampler : this.nearestSampler
  }

  submitFrame (encoder: GPUCommandEncoder | null): void {
    if (!this.ready || !this.device || !encoder) return
    const timingFrame = this.activeTimingFrame
    this.activeTimingFrame = null
    if (timingFrame && timingFrame.queryCount > 0) {
      encoder.resolveQuerySet(timingFrame.querySet, 0, timingFrame.queryCount, timingFrame.resolveBuffer, 0)
      encoder.copyBufferToBuffer(timingFrame.resolveBuffer, 0, timingFrame.readbackBuffer, 0, timingFrame.queryCount * 8)
    }
    this.device.queue.submit([encoder.finish()])
    if (timingFrame) this.readGpuTimingFrame(timingFrame)
  }

  renderTextureToScreen (encoder: GPUCommandEncoder, texture: GPUTexture | null): void {
    const screenSampler = this.getSampler('nearest')
    if (!this.ready || !this.context || !this.screenPipeline || !this.globalUniformBuffer || !screenSampler || !this.device) return

    const targetView = this.context.getCurrentTexture().createView()
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: targetView,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store'
      }]
    })

    const sourceTexture = texture ?? this.getFallbackTexture()
    const bindGroupCacheKey = [
      `p${this.getObjectId(this.screenPipeline)}`,
      `g${this.getObjectId(this.globalUniformBuffer)}`,
      `s${this.getObjectId(screenSampler)}`,
      `t${this.getObjectId(sourceTexture)}`
    ].join('|')

    if (!this.screenBindGroup || this.screenBindGroupCacheKey !== bindGroupCacheKey) {
      this.screenBindGroup = this.device.createBindGroup({
        layout: this.screenPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.globalUniformBuffer } },
          { binding: 1, resource: screenSampler },
          { binding: 2, resource: this.getTextureView(sourceTexture) }
        ]
      })
      this.screenBindGroupCacheKey = bindGroupCacheKey
    }

    renderPass.setPipeline(this.screenPipeline)
    renderPass.setBindGroup(0, this.screenBindGroup)
    renderPass.draw(3, 1, 0, 0)
    renderPass.end()
  }

  renderAllOutputsToScreen (encoder: GPUCommandEncoder, textures: GPUTexture[] = []): void {
    const screenSampler = this.getSampler('nearest')
    if (!this.ready || !this.context || !this.screenAllPipeline || !this.globalUniformBuffer || !screenSampler || !this.device) return

    const fallback = this.getFallbackTexture()
    const resolved = this.screenResolvedTextures
    resolved[0] = fallback
    resolved[1] = fallback
    resolved[2] = fallback
    resolved[3] = fallback
    for (let index = 0; index < 4; index += 1) {
      if (textures[index]) resolved[index] = textures[index]
    }

    const targetView = this.context.getCurrentTexture().createView()
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: targetView,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store'
      }]
    })

    const bindGroupCacheKey = [
      `p${this.getObjectId(this.screenAllPipeline)}`,
      `g${this.getObjectId(this.globalUniformBuffer)}`,
      `s${this.getObjectId(screenSampler)}`,
      `t0${this.getObjectId(resolved[0])}`,
      `t1${this.getObjectId(resolved[1])}`,
      `t2${this.getObjectId(resolved[2])}`,
      `t3${this.getObjectId(resolved[3])}`
    ].join('|')

    if (!this.screenAllBindGroup || this.screenAllBindGroupCacheKey !== bindGroupCacheKey) {
      this.screenAllBindGroup = this.device.createBindGroup({
        layout: this.screenAllPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.globalUniformBuffer } },
          { binding: 1, resource: screenSampler },
          { binding: 2, resource: this.getTextureView(resolved[0] ?? fallback) },
          { binding: 3, resource: this.getTextureView(resolved[1] ?? fallback) },
          { binding: 4, resource: this.getTextureView(resolved[2] ?? fallback) },
          { binding: 5, resource: this.getTextureView(resolved[3] ?? fallback) }
        ]
      })
      this.screenAllBindGroupCacheKey = bindGroupCacheKey
    }

    renderPass.setPipeline(this.screenAllPipeline)
    renderPass.setBindGroup(0, this.screenAllBindGroup)
    renderPass.draw(3, 1, 0, 0)
    renderPass.end()
  }

  dispose (): void {
    this.ready = false
    this.invalidateScreenBindGroupCaches()

    if (this.outputPipelineCache) this.outputPipelineCache.clear()
    this.outputPipelineCache = null
    if (this.outputComputePipelineCache) this.outputComputePipelineCache.clear()
    this.outputComputePipelineCache = null

    if (this.globalUniformBuffer) this.globalUniformBuffer.destroy()
    this.globalUniformBuffer = null
    this.globalUniformDirty = true
    this.lastGlobalUniformData.fill(Number.NaN)

    if (this.fallbackTexture) this.fallbackTexture.destroy()
    this.fallbackTexture = null

    this.textureViewCache = new WeakMap()
    this.objectIds = new WeakMap()
    this.nextObjectId = 1

    this.screenPipeline = null
    this.screenAllPipeline = null
    this.linearSampler = null
    this.nearestSampler = null
    this.capabilities = null
    this.context = null
    this.device = null
    this.adapter = null
    this.canvasFormat = null
  }
}
