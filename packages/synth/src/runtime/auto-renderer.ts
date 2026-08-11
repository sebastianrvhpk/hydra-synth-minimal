import type { HydraCompiledPass } from '../core/types.js'
import { WebGL2Renderer } from '../webgl2/renderer.js'
import { WebGPURenderer } from '../webgpu/renderer.js'
import type {
  HydraBuffer,
  HydraFrame,
  HydraOutputTextureOptions,
  HydraPipeline,
  HydraRenderPassExecution,
  HydraRenderer,
  HydraRendererBackend,
  HydraRendererLossInfo,
  HydraRendererPreference,
  HydraTexture,
  HydraTextureReadback,
  HydraTextureSize
} from './renderer.js'

type ConcreteRenderer = WebGPURenderer | WebGL2Renderer

export interface AutoRendererOptions {
  canvas: HTMLCanvasElement
  width?: number
  height?: number
  backend?: HydraRendererPreference
}

/** Selects WebGPU first and transparently falls back to WebGL2. */
export class AutoRenderer implements HydraRenderer {
  readonly canvas: HTMLCanvasElement
  width: number
  height: number
  readonly preference: HydraRendererPreference
  fallbackReason: Error | null = null

  private active: ConcreteRenderer | null = null
  private initPromise: Promise<this> | null = null
  private disposed = false
  private removeActiveLostListener: () => void = () => {}
  private readonly lostListeners = new Set<(info: HydraRendererLossInfo) => void>()

  constructor ({
    canvas,
    width = canvas.width || 1280,
    height = canvas.height || 720,
    backend = 'auto'
  }: AutoRendererOptions) {
    this.canvas = canvas
    this.width = width
    this.height = height
    this.preference = backend
  }

  get backend (): HydraRendererBackend {
    if (this.active) return this.active.backend
    return this.preference === 'webgl2' ? 'webgl2' : 'webgpu'
  }

  get ready (): boolean {
    return Boolean(this.active?.ready)
  }

  get precision (): 'rgba16float' | 'rgba8unorm' {
    return this.active instanceof WebGL2Renderer ? this.active.precision : 'rgba16float'
  }

  private requireActive (): ConcreteRenderer {
    if (!this.active || !this.active.ready) throw new Error('Hydra renderer is not initialized.')
    return this.active
  }

  private activate (renderer: ConcreteRenderer): void {
    this.active = renderer
    this.width = renderer.width
    this.height = renderer.height
    this.removeActiveLostListener()
    this.removeActiveLostListener = renderer.onDeviceLost((info) => {
      for (const listener of Array.from(this.lostListeners)) listener(info)
    })
  }

  init (): Promise<this> {
    if (this.ready) return Promise.resolve(this)
    if (this.disposed) return Promise.reject(new Error('Hydra renderer has been disposed.'))
    if (this.initPromise) return this.initPromise

    const pending = this.initialize().catch((error) => {
      if (this.initPromise === pending) this.initPromise = null
      throw error
    })
    this.initPromise = pending
    return pending
  }

  private async initialize (): Promise<this> {
    if (this.preference !== 'webgl2') {
      const webgpu = new WebGPURenderer({ canvas: this.canvas, width: this.width, height: this.height })
      try {
        await webgpu.init()
        this.activate(webgpu)
        return this
      } catch (cause) {
        webgpu.dispose()
        const error = cause instanceof Error ? cause : new Error(String(cause))
        if (this.preference === 'webgpu') throw error
        this.fallbackReason = error
        console.warn('Hydra: WebGPU initialization failed; using the WebGL2 fallback.', error)
      }
    }

    const webgl2 = new WebGL2Renderer({ canvas: this.canvas, width: this.width, height: this.height })
    await webgl2.init()
    this.activate(webgl2)
    return this
  }

  onDeviceLost (listener: (info: HydraRendererLossInfo) => void): () => void {
    this.lostListeners.add(listener)
    return () => this.lostListeners.delete(listener)
  }

  setResolution (width: number, height: number): void {
    this.width = Math.max(1, Math.floor(width))
    this.height = Math.max(1, Math.floor(height))
    this.active?.setResolution(this.width, this.height)
  }

  createGlobalUniformBuffer (label: string): HydraBuffer {
    return this.requireActive().createGlobalUniformBuffer(label)
  }

  writeGlobalUniformBuffer (
    buffer: HydraBuffer,
    values: { time: number, bpm: number, width: number, height: number }
  ): boolean {
    const renderer = this.requireActive()
    if (renderer instanceof WebGPURenderer) return renderer.writeGlobalUniformBuffer(buffer as GPUBuffer, values)
    return renderer.writeGlobalUniformBuffer(buffer, values)
  }

  updateGlobalUniforms (values: { time: number, bpm: number, width?: number, height?: number }): boolean {
    return this.requireActive().updateGlobalUniforms(values)
  }

  createDynamicUniformBuffer (label: string): HydraBuffer {
    return this.requireActive().createDynamicUniformBuffer(label)
  }

  writeDynamicUniformBuffer (buffer: HydraBuffer, data: Float32Array, floatCount: number): boolean {
    const renderer = this.requireActive()
    if (renderer instanceof WebGPURenderer) {
      return renderer.writeDynamicUniformBuffer(buffer as GPUBuffer, data, floatCount)
    }
    return renderer.writeDynamicUniformBuffer(buffer, data, floatCount)
  }

  destroyBuffer (buffer: HydraBuffer | null | undefined): void {
    if (!buffer || !this.active) return
    if (this.active instanceof WebGPURenderer) this.active.destroyBuffer(buffer as GPUBuffer)
    else this.active.destroyBuffer(buffer)
  }

  createOutputTexture (options: HydraOutputTextureOptions = {}): HydraTexture {
    const renderer = this.requireActive()
    if (renderer instanceof WebGPURenderer) {
      return renderer.createOutputTexture(options as Parameters<WebGPURenderer['createOutputTexture']>[0])
    }
    return renderer.createOutputTexture(options)
  }

  createSourceTexture (options: { width: number, height: number, label?: string }): HydraTexture {
    return this.requireActive().createSourceTexture(options)
  }

  destroyTexture (texture: HydraTexture | null | undefined): void {
    if (!texture || !this.active) return
    if (this.active instanceof WebGPURenderer) this.active.destroyTexture(texture as GPUTexture)
    else this.active.destroyTexture(texture)
  }

  writeExternalImage (texture: HydraTexture, source: CanvasImageSource, flipY = false): void {
    const renderer = this.requireActive()
    if (renderer instanceof WebGPURenderer) renderer.writeExternalImage(texture as GPUTexture, source, flipY)
    else renderer.writeExternalImage(texture, source, flipY)
  }

  getFallbackTexture (): HydraTexture {
    return this.requireActive().getFallbackTexture()
  }

  getPipeline (pass: HydraCompiledPass): HydraPipeline {
    return this.requireActive().getPipeline(pass)
  }

  executePass (execution: HydraRenderPassExecution): void {
    this.requireActive().executePass(execution)
  }

  beginFrame (): HydraFrame | null {
    return this.requireActive().beginFrame()
  }

  submitFrame (frame: HydraFrame | null): void {
    const renderer = this.requireActive()
    if (renderer instanceof WebGPURenderer) renderer.submitFrame(frame as GPUCommandEncoder | null)
    else renderer.submitFrame(frame)
  }

  copyTextureToTexture (
    frame: HydraFrame,
    source: HydraTexture,
    destination: HydraTexture,
    size: HydraTextureSize
  ): void {
    const renderer = this.requireActive()
    if (renderer instanceof WebGPURenderer) {
      renderer.copyTextureToTexture(
        frame as GPUCommandEncoder,
        source as GPUTexture,
        destination as GPUTexture,
        size as GPUExtent3D
      )
    } else {
      renderer.copyTextureToTexture(frame, source, destination, size)
    }
  }

  renderTextureToScreen (frame: HydraFrame, texture: HydraTexture | null): void {
    const renderer = this.requireActive()
    if (renderer instanceof WebGPURenderer) {
      renderer.renderTextureToScreen(frame as GPUCommandEncoder, texture as GPUTexture | null)
    } else {
      renderer.renderTextureToScreen(frame, texture)
    }
  }

  renderAllOutputsToScreen (frame: HydraFrame, textures: Array<HydraTexture | null> = []): void {
    const renderer = this.requireActive()
    if (renderer instanceof WebGPURenderer) {
      renderer.renderAllOutputsToScreen(frame as GPUCommandEncoder, textures as Array<GPUTexture | null>)
    } else {
      renderer.renderAllOutputsToScreen(frame, textures)
    }
  }

  waitForSubmittedWork (): Promise<void> {
    return this.requireActive().waitForSubmittedWork()
  }

  readTexturePixels (texture: HydraTexture, width: number, height: number): Promise<HydraTextureReadback> {
    return this.requireActive().readTexturePixels(texture, width, height)
  }

  dispose (): void {
    if (this.disposed) return
    this.disposed = true
    this.removeActiveLostListener()
    this.removeActiveLostListener = () => {}
    this.active?.dispose()
    this.active = null
    this.lostListeners.clear()
    this.initPromise = null
  }
}
