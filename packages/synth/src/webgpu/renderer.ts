import tgpu, {
  d,
  type TgpuBindGroup,
  type TgpuBindGroupLayout,
  type TgpuBuffer,
  type TgpuFixedSampler,
  type TgpuRenderPipeline,
  type TgpuRoot,
  type TgpuTexture
} from 'typegpu'
import type { HydraCompiledPass, HydraComputePass, HydraFragmentPass } from '../core/types.js'
import {
  ComputePipelineCache,
  PipelineCache,
  fullscreenVertex,
  type ComputePipelineCacheEntry,
  type PipelineCacheEntry
} from './pipeline-cache.js'
import { MAX_DYNAMIC_UNIFORMS, OUTPUT_TEXTURE_FORMAT } from './constants.js'
import {
  DynamicUniformsSchema,
  GlobalUniformsSchema,
  type HydraTypeGPUBindGroupLayout
} from './typegpu-schemas.js'

export const WEBGPU_UNAVAILABLE_MESSAGE =
  'WebGPU is unavailable. Use a secure context (https:// or localhost) in a browser with WebGPU enabled, then retry.'

export interface WebGPURendererOptions {
  canvas: HTMLCanvasElement
  width?: number
  height?: number
}

interface UniformSnapshot {
  values: Float32Array
}

type AnyTypeGPUBuffer = TgpuBuffer<any>
type AnyTypeGPUTexture = TgpuTexture<any>
type DeviceLostListener = (info: GPUDeviceLostInfo) => void

export class WebGPURenderer {
  readonly canvas: HTMLCanvasElement
  width: number
  height: number
  ready = false

  /** The production backend and owner of the renderer's GPU resources. */
  private context: GPUCanvasContext | null = null
  private canvasFormat: GPUTextureFormat | null = null
  root: TgpuRoot | null = null

  private outputPipelineCache: PipelineCache | null = null
  private outputComputePipelineCache: ComputePipelineCache | null = null
  private screenPipeline: TgpuRenderPipeline<any> | null = null
  private screenAllPipeline: TgpuRenderPipeline<any> | null = null
  private captureConversionPipeline: TgpuRenderPipeline<any> | null = null
  private screenLayout: HydraTypeGPUBindGroupLayout | null = null
  private screenAllLayout: HydraTypeGPUBindGroupLayout | null = null
  private captureConversionLayout: HydraTypeGPUBindGroupLayout | null = null

  private globalUniformOwner: AnyTypeGPUBuffer | null = null
  private nearestSamplerOwner: TgpuFixedSampler | null = null
  private fallbackTextureOwner: AnyTypeGPUTexture | null = null
  private readonly bufferOwners = new WeakMap<GPUBuffer, AnyTypeGPUBuffer>()
  private readonly textureOwners = new WeakMap<GPUTexture, AnyTypeGPUTexture>()
  private readonly uniformSnapshots = new WeakMap<GPUBuffer, UniformSnapshot>()
  private objectIds = new WeakMap<object, number>()
  private nextObjectId = 1

  private screenBindGroupCacheKey = ''
  private screenBindGroup: TgpuBindGroup | null = null
  private screenAllBindGroupCacheKey = ''
  private screenAllBindGroup: TgpuBindGroup | null = null
  private readonly screenResolvedTextures: Array<GPUTexture | null> = [null, null, null, null]
  private readonly deviceLostListeners = new Set<DeviceLostListener>()
  private disposed = false

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
    if (this.disposed) throw new Error('WebGPU renderer has been disposed.')
    WebGPURenderer.assertSupport()

    try {
      this.root = await tgpu.init({ unstable_names: 'strict' })
      this.canvasFormat = navigator.gpu.getPreferredCanvasFormat()
      try {
        this.context = this.root.configureContext({
          canvas: this.canvas,
          format: this.canvasFormat,
          alphaMode: 'premultiplied',
          usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
        })
      } catch (error) {
        throw new Error('WebGPU context creation failed.', { cause: error })
      }
      this.initGlobalResources()
      this.initScreenPipelines()
      this.outputPipelineCache = new PipelineCache({
        root: this.root,
        targetFormat: OUTPUT_TEXTURE_FORMAT,
        maxEntries: 256
      })
      this.outputComputePipelineCache = new ComputePipelineCache({
        root: this.root,
        maxEntries: 128
      })

      const activeDevice = this.root.device
      void activeDevice.lost.then((info) => {
        if (this.disposed || this.root?.device !== activeDevice) return
        console.error(`WebGPU device lost: ${info.message || info.reason}`)
        const listeners = Array.from(this.deviceLostListeners)
        this.deviceLostListeners.clear()
        this.disposed = true
        this.resetDeviceState()
        for (const listener of listeners) listener(info)
      })

      this.ready = true
      return this
    } catch (error) {
      this.resetDeviceState()
      throw error
    }
  }

  onDeviceLost (listener: DeviceLostListener): () => void {
    this.deviceLostListeners.add(listener)
    return () => this.deviceLostListeners.delete(listener)
  }

  private initGlobalResources (): void {
    if (!this.root) return

    this.globalUniformOwner = this.root.createBuffer(GlobalUniformsSchema).$usage('uniform')
      .$name('hydra-global-uniforms')
    this.registerBuffer(this.globalUniformOwner)

    this.nearestSamplerOwner = this.root.createSampler({
      magFilter: 'nearest',
      minFilter: 'nearest',
      mipmapFilter: 'nearest',
      addressModeU: 'repeat',
      addressModeV: 'repeat'
    }).$name('hydra-nearest-sampler')
    const fallbackTexture = this.createOutputTexture({
      width: 1,
      height: 1,
      label: 'hydra-fallback-texture'
    })
    this.fallbackTextureOwner = this.textureOwners.get(fallbackTexture) ?? null
    this.fallbackTextureOwner?.clear()
    this.updateGlobalUniforms({ time: 0, bpm: 60, width: this.width, height: this.height })
  }

  private initScreenPipelines (): void {
    if (!this.root || !this.canvasFormat) return

    this.screenLayout = tgpu.bindGroupLayout({
      globals: { uniform: GlobalUniformsSchema, visibility: ['fragment'] },
      hydraSampler: { sampler: 'filtering', visibility: ['fragment'] },
      tex0: { texture: d.texture2d(d.f32), visibility: ['fragment'] }
    }).$idx(0)
    const singleExternals = this.getLayoutExternals(this.screenLayout)
    const singleFragment = tgpu.fragmentFn({
      in: { fragCoord: d.builtin.position },
      out: d.vec4f
    })(`{
      let uv = vec2f(in.fragCoord.x / globals.width, in.fragCoord.y / globals.height);
      return textureSample(tex0, hydraSampler, fract(uv));
    }`).$uses(singleExternals).$name('hydraScreenFragment')
    this.screenPipeline = this.root.createRenderPipeline({
      vertex: fullscreenVertex,
      fragment: singleFragment,
      targets: { format: this.canvasFormat },
      primitive: { topology: 'triangle-list' }
    }).$name('hydraScreenPipeline')
    this.root.unwrap(this.screenPipeline)

    this.screenAllLayout = tgpu.bindGroupLayout({
      globals: { uniform: GlobalUniformsSchema, visibility: ['fragment'] },
      hydraSampler: { sampler: 'filtering', visibility: ['fragment'] },
      tex0: { texture: d.texture2d(d.f32), visibility: ['fragment'] },
      tex1: { texture: d.texture2d(d.f32), visibility: ['fragment'] },
      tex2: { texture: d.texture2d(d.f32), visibility: ['fragment'] },
      tex3: { texture: d.texture2d(d.f32), visibility: ['fragment'] }
    }).$idx(0)
    const allExternals = this.getLayoutExternals(this.screenAllLayout)
    const allFragment = tgpu.fragmentFn({
      in: { fragCoord: d.builtin.position },
      out: d.vec4f
    })(`{
      let uv = vec2f(in.fragCoord.x / globals.width, in.fragCoord.y / globals.height);
      let tiled = clamp(uv * 2.0, vec2f(0.0), vec2f(1.9999));
      let localUv = fract(tiled);
      let cellX = i32(floor(tiled.x));
      let cellY = i32(floor(tiled.y));
      let quad = cellX + (cellY * 2);
      if (quad == 0) { return textureSampleLevel(tex0, hydraSampler, localUv, 0.0); }
      if (quad == 1) { return textureSampleLevel(tex1, hydraSampler, localUv, 0.0); }
      if (quad == 2) { return textureSampleLevel(tex2, hydraSampler, localUv, 0.0); }
      return textureSampleLevel(tex3, hydraSampler, localUv, 0.0);
    }`).$uses(allExternals).$name('hydraScreenAllFragment')
    this.screenAllPipeline = this.root.createRenderPipeline({
      vertex: fullscreenVertex,
      fragment: allFragment,
      targets: { format: this.canvasFormat },
      primitive: { topology: 'triangle-list' }
    }).$name('hydraScreenAllPipeline')
    this.root.unwrap(this.screenAllPipeline)
  }

  private getLayoutExternals (layout: TgpuBindGroupLayout): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(layout.entries)) {
      const value = layout.bound[key]
      if (value) result[key] = value
    }
    return result
  }

  private registerBuffer (owner: AnyTypeGPUBuffer): GPUBuffer {
    const raw = owner.buffer
    this.bufferOwners.set(raw, owner)
    return raw
  }

  private registerTexture (owner: AnyTypeGPUTexture): GPUTexture {
    if (!this.root) throw new Error('Renderer not initialized.')
    const raw = this.root.unwrap(owner)
    this.textureOwners.set(raw, owner)
    return raw
  }

  setResolution (width: number, height: number): void {
    this.width = Math.max(1, Math.floor(width))
    this.height = Math.max(1, Math.floor(height))
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.invalidateScreenBindGroupCaches()
  }

  createGlobalUniformBuffer (label: string): GPUBuffer {
    if (!this.root) throw new Error('Renderer not initialized.')
    return this.registerBuffer(
      this.root.createBuffer(GlobalUniformsSchema).$usage('uniform').$name(label)
    )
  }

  writeGlobalUniformBuffer (
    buffer: GPUBuffer,
    { time, bpm, width, height }: { time: number, bpm: number, width: number, height: number }
  ): boolean {
    let owner = this.bufferOwners.get(buffer)
    const next = new Float32Array([time, bpm, width, height])
    const previous = this.uniformSnapshots.get(buffer)?.values
    if (previous && previous.every((value, index) => value === next[index])) return false
    if (!owner) {
      if (!this.root) return false
      owner = this.root.createBuffer(GlobalUniformsSchema, buffer)
      this.bufferOwners.set(buffer, owner)
    }
    owner.write({ time, bpm, width, height } as never)
    this.uniformSnapshots.set(buffer, { values: next })
    return true
  }

  updateGlobalUniforms ({ time, bpm, width = this.width, height = this.height }: { time: number, bpm: number, width?: number, height?: number }): boolean {
    if (!this.globalUniformOwner) return false
    return this.writeGlobalUniformBuffer(this.globalUniformOwner.buffer, { time, bpm, width, height })
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
    width?: number
    height?: number
    depthOrArrayLayers?: number
    label?: string
    format?: GPUTextureFormat
    includeRenderAttachment?: boolean
    includeStorageBinding?: boolean
  } = {}): GPUTexture {
    if (!this.root) throw new Error('Renderer not initialized.')
    const size = depthOrArrayLayers > 1
      ? [Math.max(1, Math.floor(width)), Math.max(1, Math.floor(height)), Math.max(1, Math.floor(depthOrArrayLayers))] as const
      : [Math.max(1, Math.floor(width)), Math.max(1, Math.floor(height))] as const
    let owner = this.root.createTexture({ size, format }).$usage('sampled') as AnyTypeGPUTexture
    if (includeRenderAttachment) owner = owner.$usage('render') as AnyTypeGPUTexture
    if (includeStorageBinding) owner = owner.$usage('storage' as never) as AnyTypeGPUTexture
    owner.$name(label || 'hydra-output-texture')
    return this.registerTexture(owner)
  }

  createSourceTexture ({ width, height, label = '' }: { width: number, height: number, label?: string }): GPUTexture {
    if (!this.root) throw new Error('Renderer not initialized.')
    const owner = this.root.createTexture({
      size: [Math.max(1, Math.floor(width)), Math.max(1, Math.floor(height))],
      format: 'rgba8unorm'
    }).$usage('sampled', 'render').$name(label || 'hydra-source-texture')
    return this.registerTexture(owner)
  }

  createDynamicUniformBuffer (label: string): GPUBuffer {
    if (!this.root) throw new Error('Renderer not initialized.')
    return this.registerBuffer(
      this.root.createBuffer(DynamicUniformsSchema).$usage('uniform').$name(label)
    )
  }

  writeDynamicUniformBuffer (buffer: GPUBuffer, data: Float32Array, floatCount: number): boolean {
    const owner = this.bufferOwners.get(buffer)
    if (!owner) return false
    const count = Math.max(0, Math.min(MAX_DYNAMIC_UNIFORMS, floatCount))
    const values = new Array(Math.ceil(MAX_DYNAMIC_UNIFORMS / 4))
    for (let index = 0; index < values.length; index += 1) {
      const offset = index * 4
      values[index] = d.vec4f(
        offset < count ? data[offset] ?? 0 : 0,
        offset + 1 < count ? data[offset + 1] ?? 0 : 0,
        offset + 2 < count ? data[offset + 2] ?? 0 : 0,
        offset + 3 < count ? data[offset + 3] ?? 0 : 0
      )
    }
    owner.write({ values } as never)
    return true
  }

  createReadbackBuffer (label: string, byteLength: number): GPUBuffer {
    if (!this.root) throw new Error('Renderer not initialized.')
    const aligned = Math.max(256, Math.ceil(Math.max(1, byteLength) / 256) * 256)
    const owner = this.root.createBuffer(d.arrayOf(d.u32, Math.ceil(aligned / 4)))
      .$addFlags(GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ)
      .$name(label)
    return this.registerBuffer(owner)
  }

  createCaptureIntermediateTexture (width: number, height: number): GPUTexture {
    return this.createOutputTexture({
      width,
      height,
      format: 'rgba8unorm',
      label: 'hydra-capture-intermediate-rgba8',
      includeStorageBinding: false
    })
  }

  encodeCaptureConversion (
    encoder: GPUCommandEncoder,
    sourceTexture: GPUTexture,
    intermediateTexture: GPUTexture
  ): void {
    if (!this.root) throw new Error('Renderer not initialized.')
    if (!this.captureConversionLayout || !this.captureConversionPipeline) {
      this.captureConversionLayout = tgpu.bindGroupLayout({
        sourceTexture: { texture: d.texture2d(d.f32), visibility: ['fragment'] }
      }).$idx(0)
      const externals = this.getLayoutExternals(this.captureConversionLayout)
      const fragment = tgpu.fragmentFn({
        in: { fragCoord: d.builtin.position },
        out: d.vec4f
      })(`{
        let color = textureLoad(sourceTexture, vec2i(in.fragCoord.xy), 0);
        return vec4f(color.rgb, 1.0);
      }`).$uses(externals).$name('hydraCaptureConversionFragment')
      this.captureConversionPipeline = this.root.createRenderPipeline({
        vertex: fullscreenVertex,
        fragment,
        targets: { format: 'rgba8unorm' },
        primitive: { topology: 'triangle-list' }
      }).$name('hydraCaptureConversionPipeline')
      this.root.unwrap(this.captureConversionPipeline)
    }

    const bindGroup = this.root.createBindGroup(this.captureConversionLayout as TgpuBindGroupLayout<any>, {
      sourceTexture: this.getTextureResource(sourceTexture)
    } as never)
    this.captureConversionPipeline
      .with(bindGroup)
      .withColorAttachment({
        view: this.getTextureResource(intermediateTexture) as never,
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 1 }
      })
      .with(encoder)
      .draw(3, 1, 0, 0)
  }

  destroyTexture (texture: GPUTexture | null | undefined): void {
    if (!texture || !this.root) return
    const owner = this.textureOwners.get(texture)
    if (!owner) throw new Error('Texture is not owned by this TypeGPU renderer.')
    owner.destroy()
  }

  destroyBuffer (buffer: GPUBuffer | null | undefined): void {
    if (!buffer || !this.root) return
    const owner = this.bufferOwners.get(buffer)
    if (!owner) throw new Error('Buffer is not owned by this TypeGPU renderer.')
    owner.destroy()
  }

  writeExternalImage (texture: GPUTexture, source: CanvasImageSource, flipY = false): void {
    if (!this.root) return
    const owner = this.textureOwners.get(texture)
    if (owner && !flipY) {
      owner.write(source as never)
      return
    }
    const width = Math.max(1, Math.floor(owner?.props.size[0] ?? 1))
    const height = Math.max(1, Math.floor(owner?.props.size[1] ?? 1))
    this.root.device.queue.copyExternalImageToTexture(
      { source: source as GPUCopyExternalImageSource, flipY },
      { texture },
      { width, height, depthOrArrayLayers: 1 }
    )
  }

  createCommandEncoder (label: string): GPUCommandEncoder {
    if (!this.root) throw new Error('Renderer not initialized.')
    return this.root.device.createCommandEncoder({ label })
  }

  submitCommandEncoder (encoder: GPUCommandEncoder): void {
    if (!this.root) throw new Error('Renderer not initialized.')
    this.root.device.queue.submit([encoder.finish()])
  }

  async waitForSubmittedWork (): Promise<void> {
    if (this.root) await this.root.device.queue.onSubmittedWorkDone()
  }

  copyTextureToTexture (
    encoder: GPUCommandEncoder,
    source: GPUTexture,
    destination: GPUTexture,
    size: GPUExtent3D
  ): void {
    encoder.copyTextureToTexture({ texture: source }, { texture: destination }, size)
  }

  copyTextureToBuffer (
    encoder: GPUCommandEncoder,
    texture: GPUTexture,
    buffer: GPUBuffer,
    layout: { bytesPerRow: number, rowsPerImage: number },
    size: GPUExtent3D
  ): void {
    encoder.copyTextureToBuffer({ texture }, { buffer, ...layout }, size)
  }

  mapReadbackBuffer (
    buffer: GPUBuffer,
    timeoutMs = 5000
  ): Promise<{ data: ArrayBuffer, unmap: () => void }> {
    const map = buffer.mapAsync(GPUMapMode.READ)
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null
    const timeout = timeoutMs > 0 && timeoutMs < Infinity
      ? new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(
            () => reject(new Error(`GPU readback timeout after ${timeoutMs}ms`)),
            timeoutMs
          )
        })
      : null

    return (timeout ? Promise.race([map, timeout]) : map).then(() => {
      if (timeoutHandle !== null) clearTimeout(timeoutHandle)
      const data = buffer.getMappedRange().slice(0)
      return {
        data,
        unmap: () => {
          try { buffer.unmap() } catch { /* already unmapped */ }
        }
      }
    }, (error) => {
      if (timeoutHandle !== null) clearTimeout(timeoutHandle)
      throw error
    })
  }

  getFallbackTexture (): GPUTexture {
    if (!this.root || !this.fallbackTextureOwner) throw new Error('Renderer fallback texture is not initialized.')
    return this.root.unwrap(this.fallbackTextureOwner)
  }

  getPipeline (pass: HydraFragmentPass): PipelineCacheEntry
  getPipeline (pass: HydraComputePass): ComputePipelineCacheEntry
  getPipeline (pass: HydraCompiledPass): PipelineCacheEntry | ComputePipelineCacheEntry
  getPipeline (pass: HydraCompiledPass): PipelineCacheEntry | ComputePipelineCacheEntry {
    if (pass.variant === 'compute') {
      if (!this.outputComputePipelineCache) throw new Error('TypeGPU compute pipeline cache is unavailable.')
      return this.outputComputePipelineCache.requestPipeline(pass)
    }
    if (!this.outputPipelineCache) throw new Error('TypeGPU fragment pipeline cache is unavailable.')
    return this.outputPipelineCache.requestPipeline(pass)
  }

  createPassBindGroup (
    layout: TgpuBindGroupLayout,
    pass: HydraCompiledPass,
    resources: {
      globals: GPUBuffer
      dynamicUniforms: GPUBuffer | null
      sampler: TgpuFixedSampler | null
      textures: GPUTexture[]
      output: GPUTexture | null
    }
  ): TgpuBindGroup {
    if (!this.root) throw new Error('Renderer not initialized.')
    const globals = this.bufferOwners.get(resources.globals)
    if (!globals) throw new Error('Global buffer is not owned by this TypeGPU renderer.')
    const entries: Record<string, AnyTypeGPUBuffer | AnyTypeGPUTexture | TgpuFixedSampler> = { globals }
    if (pass.uniforms.length > 0 && resources.dynamicUniforms) {
      const dynamicUniforms = this.bufferOwners.get(resources.dynamicUniforms)
      if (!dynamicUniforms) throw new Error('Dynamic uniform buffer is not owned by this TypeGPU renderer.')
      entries.dynamicUniforms = dynamicUniforms
    }
    if (pass.textures.length > 0 && resources.sampler) {
      entries.hydraSampler = resources.sampler
    }
    pass.textures.forEach((texture, index) => {
      const resolved = resources.textures[index] ?? this.getFallbackTexture()
      entries[texture.variableName] = this.getTextureResource(resolved)
    })
    if (pass.variant === 'compute' && pass.output && resources.output) {
      entries[pass.output.variableName] = this.getTextureResource(resources.output)
    }
    return this.root.createBindGroup(layout as TgpuBindGroupLayout<any>, entries as never)
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

  getTextureResource (texture: GPUTexture): TgpuTexture<any> {
    const owner = this.textureOwners.get(texture)
    if (!owner) throw new Error('Texture is not owned by this TypeGPU renderer.')
    return owner
  }

  private invalidateScreenBindGroupCaches (): void {
    this.screenBindGroupCacheKey = ''
    this.screenBindGroup = null
    this.screenAllBindGroupCacheKey = ''
    this.screenAllBindGroup = null
  }

  beginFrame (): GPUCommandEncoder | null {
    if (!this.ready || !this.root) return null
    return this.createCommandEncoder('hydra-frame-encoder')
  }

  getSampler (): TgpuFixedSampler | null {
    return this.nearestSamplerOwner
  }

  submitFrame (encoder: GPUCommandEncoder | null): void {
    if (!this.ready || !this.root || !encoder) return
    this.submitCommandEncoder(encoder)
  }

  renderTextureToScreen (encoder: GPUCommandEncoder, texture: GPUTexture | null): void {
    if (!this.ready || !this.root || !this.context || !this.screenPipeline || !this.screenLayout || !this.globalUniformOwner || !this.nearestSamplerOwner) return
    const source = texture ?? this.getFallbackTexture()
    const key = [
      this.getObjectId(this.globalUniformOwner),
      this.getObjectId(this.nearestSamplerOwner),
      this.getObjectId(source)
    ].join('|')
    if (!this.screenBindGroup || this.screenBindGroupCacheKey !== key) {
      this.screenBindGroup = this.root.createBindGroup(this.screenLayout as TgpuBindGroupLayout<any>, {
        globals: this.globalUniformOwner,
        hydraSampler: this.nearestSamplerOwner,
        tex0: this.getTextureResource(source)
      } as never)
      this.screenBindGroupCacheKey = key
    }
    this.screenPipeline
      .with(this.screenBindGroup)
      .withColorAttachment({
        view: this.context,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store'
      })
      .with(encoder)
      .draw(3, 1, 0, 0)
  }

  renderAllOutputsToScreen (encoder: GPUCommandEncoder, textures: Array<GPUTexture | null> = []): void {
    if (!this.ready || !this.root || !this.context || !this.screenAllPipeline || !this.screenAllLayout || !this.globalUniformOwner || !this.nearestSamplerOwner) return
    const fallback = this.getFallbackTexture()
    for (let index = 0; index < 4; index += 1) {
      this.screenResolvedTextures[index] = textures[index] ?? fallback
    }
    const resolved = this.screenResolvedTextures.map((value) => value ?? fallback)
    const key = [this.getObjectId(this.globalUniformOwner), this.getObjectId(this.nearestSamplerOwner), ...resolved.map((value) => this.getObjectId(value))].join('|')
    if (!this.screenAllBindGroup || this.screenAllBindGroupCacheKey !== key) {
      this.screenAllBindGroup = this.root.createBindGroup(this.screenAllLayout as TgpuBindGroupLayout<any>, {
        globals: this.globalUniformOwner,
        hydraSampler: this.nearestSamplerOwner,
        tex0: this.getTextureResource(resolved[0] ?? fallback),
        tex1: this.getTextureResource(resolved[1] ?? fallback),
        tex2: this.getTextureResource(resolved[2] ?? fallback),
        tex3: this.getTextureResource(resolved[3] ?? fallback)
      } as never)
      this.screenAllBindGroupCacheKey = key
    }
    this.screenAllPipeline
      .with(this.screenAllBindGroup)
      .withColorAttachment({
        view: this.context,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store'
      })
      .with(encoder)
      .draw(3, 1, 0, 0)
  }

  private clearDeviceCaches (): void {
    this.outputPipelineCache?.clear()
    this.outputComputePipelineCache?.clear()
    this.outputPipelineCache = null
    this.outputComputePipelineCache = null
    this.invalidateScreenBindGroupCaches()
    this.screenPipeline = null
    this.screenAllPipeline = null
    this.captureConversionPipeline = null
    this.screenLayout = null
    this.screenAllLayout = null
    this.captureConversionLayout = null
    this.objectIds = new WeakMap()
    this.nextObjectId = 1
  }

  private resetDeviceState (): void {
    this.ready = false
    this.clearDeviceCaches()
    this.globalUniformOwner = null
    this.fallbackTextureOwner = null
    this.nearestSamplerOwner = null
    this.screenResolvedTextures.fill(null)
    const context = this.context
    this.context = null
    try { context?.unconfigure() } catch { /* context may already be invalid */ }
    const root = this.root
    this.root = null
    this.canvasFormat = null
    root?.destroy()
  }

  dispose (): void {
    if (this.disposed && !this.root) return
    this.disposed = true
    this.resetDeviceState()
    this.deviceLostListeners.clear()
  }
}
