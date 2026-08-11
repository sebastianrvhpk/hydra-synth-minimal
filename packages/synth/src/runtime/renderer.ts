import type { HydraCompiledPass } from '../core/types.js'

/** GPU resources are deliberately opaque outside their owning renderer. */
export type HydraTexture = object
export type HydraBuffer = object
export type HydraFrame = object
export type HydraPipeline = object

export type HydraRendererBackend = 'webgpu' | 'webgl2'
export type HydraRendererPreference = 'auto' | HydraRendererBackend

export interface HydraRendererLossInfo {
  reason?: unknown
  message?: string
}

export interface HydraTextureSize {
  width: number
  height: number
  depthOrArrayLayers?: number
}

export interface HydraOutputTextureOptions {
  width?: number
  height?: number
  depthOrArrayLayers?: number
  label?: string
  format?: 'rgba16float' | 'rgba8unorm'
  includeRenderAttachment?: boolean
}

export interface HydraRenderPassExecution {
  frame: HydraFrame
  pipeline: HydraPipeline
  pass: HydraCompiledPass
  target: HydraTexture
  textures: HydraTexture[]
  globalUniformBuffer: HydraBuffer
  dynamicUniformBuffer: HydraBuffer | null
}

export interface HydraTextureReadback {
  data: ArrayBuffer
  bytesPerRow: number
}

/**
 * Backend boundary shared by WebGPU and WebGL2. The Hydra graph, scheduling,
 * feedback and media layers only exchange opaque resources through this API.
 */
export interface HydraRenderer {
  readonly canvas: HTMLCanvasElement
  readonly backend: HydraRendererBackend
  width: number
  height: number
  readonly ready: boolean

  init(): Promise<HydraRenderer>
  onDeviceLost(listener: (info: HydraRendererLossInfo) => void): () => void
  setResolution(width: number, height: number): void

  createGlobalUniformBuffer(label: string): HydraBuffer
  writeGlobalUniformBuffer(
    buffer: HydraBuffer,
    values: { time: number, bpm: number, width: number, height: number }
  ): boolean
  updateGlobalUniforms(
    values: { time: number, bpm: number, width?: number, height?: number }
  ): boolean
  createDynamicUniformBuffer(label: string): HydraBuffer
  writeDynamicUniformBuffer(buffer: HydraBuffer, data: Float32Array, floatCount: number): boolean
  destroyBuffer(buffer: HydraBuffer | null | undefined): void

  createOutputTexture(options?: HydraOutputTextureOptions): HydraTexture
  createSourceTexture(options: { width: number, height: number, label?: string }): HydraTexture
  destroyTexture(texture: HydraTexture | null | undefined): void
  writeExternalImage(texture: HydraTexture, source: CanvasImageSource, flipY?: boolean): void
  getFallbackTexture(): HydraTexture

  getPipeline(pass: HydraCompiledPass): HydraPipeline
  executePass(execution: HydraRenderPassExecution): void

  beginFrame(): HydraFrame | null
  submitFrame(frame: HydraFrame | null): void
  copyTextureToTexture(
    frame: HydraFrame,
    source: HydraTexture,
    destination: HydraTexture,
    size: HydraTextureSize
  ): void
  renderTextureToScreen(frame: HydraFrame, texture: HydraTexture | null): void
  renderAllOutputsToScreen(frame: HydraFrame, textures?: Array<HydraTexture | null>): void
  waitForSubmittedWork(): Promise<void>
  readTexturePixels(texture: HydraTexture, width: number, height: number): Promise<HydraTextureReadback>

  dispose(): void
}
