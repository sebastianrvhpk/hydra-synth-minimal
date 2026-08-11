import type { HydraCompiledPass } from '../core/types.js'
import type {
  HydraBuffer,
  HydraFrame,
  HydraOutputTextureOptions,
  HydraPipeline,
  HydraRenderPassExecution,
  HydraRendererLossInfo,
  HydraTexture,
  HydraTextureReadback,
  HydraTextureSize
} from '../runtime/renderer.js'
import { MAX_DYNAMIC_UNIFORMS } from '../webgpu/constants.js'
import { serializeTypeGPUProgram } from '../webgpu/typegpu-functions.js'
import {
  resolveWebGLFragmentWGSL,
  translateWebGLFragment,
  type WebNagaModule
} from './shader-compiler.js'

export const WEBGL2_UNAVAILABLE_MESSAGE =
  'WebGL2 is unavailable in this browser or canvas. Enable hardware acceleration and retry.'

interface WebGLTextureResource {
  readonly kind: 'webgl2-texture'
  readonly texture: WebGLTexture
  readonly framebuffer: WebGLFramebuffer
  readonly width: number
  readonly height: number
  readonly format: 'rgba16float' | 'rgba8unorm'
}

interface WebGLBufferResource {
  readonly kind: 'webgl2-buffer'
  readonly buffer: WebGLBuffer
  readonly values: Float32Array
  readonly byteLength: number
}

interface WebGLFrameResource {
  readonly kind: 'webgl2-frame'
}

interface WebGLPipelineResource {
  readonly kind: 'webgl2-pipeline'
  readonly signature: string
  readonly programSource: string
  readonly wgsl: string
  readonly glsl: string
  readonly program: WebGLProgram
  readonly globalsBlockIndex: number
  readonly dynamicBlockIndex: number
  readonly textureLocations: Array<WebGLUniformLocation | null>
}

interface ScreenProgram {
  program: WebGLProgram
  resolution: WebGLUniformLocation | null
  textures: Array<WebGLUniformLocation | null>
}

const FULLSCREEN_VERTEX_GLSL = `#version 300 es
const vec2 positions[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2(3.0, -1.0),
  vec2(-1.0, 3.0)
);
void main() {
  gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
}`

const SCREEN_FRAGMENT_GLSL = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform sampler2D uTex0;
layout(location = 0) out vec4 outColor;
void main() {
  vec2 uv = vec2(gl_FragCoord.x / uResolution.x, 1.0 - gl_FragCoord.y / uResolution.y);
  outColor = texture(uTex0, uv);
}`

const SCREEN_ALL_FRAGMENT_GLSL = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform sampler2D uTex0;
uniform sampler2D uTex1;
uniform sampler2D uTex2;
uniform sampler2D uTex3;
layout(location = 0) out vec4 outColor;
void main() {
  vec2 uv = vec2(gl_FragCoord.x / uResolution.x, 1.0 - gl_FragCoord.y / uResolution.y);
  vec2 tiled = clamp(uv * 2.0, vec2(0.0), vec2(1.9999));
  vec2 localUv = fract(tiled);
  int quad = int(floor(tiled.x)) + int(floor(tiled.y)) * 2;
  if (quad == 0) outColor = texture(uTex0, localUv);
  else if (quad == 1) outColor = texture(uTex1, localUv);
  else if (quad == 2) outColor = texture(uTex2, localUv);
  else outColor = texture(uTex3, localUv);
}`

const COPY_FRAGMENT_GLSL = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform sampler2D uTex0;
layout(location = 0) out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  outColor = texture(uTex0, uv);
}`

const MAX_PIPELINE_CACHE_ENTRIES = 256

let nagaPromise: Promise<WebNagaModule> | null = null

const loadNaga = async (): Promise<WebNagaModule> => {
  if (!nagaPromise) {
    nagaPromise = import('web-naga').then(async (naga) => {
      await naga.default()
      return naga
    }).catch((error) => {
      nagaPromise = null
      throw error
    })
  }
  return nagaPromise
}

const asTexture = (texture: HydraTexture): WebGLTextureResource => texture as WebGLTextureResource
const asBuffer = (buffer: HydraBuffer): WebGLBufferResource => buffer as WebGLBufferResource
const asPipeline = (pipeline: HydraPipeline): WebGLPipelineResource => pipeline as WebGLPipelineResource

const shaderInfo = (gl: WebGL2RenderingContext, shader: WebGLShader): string =>
  gl.getShaderInfoLog(shader)?.trim() || 'Unknown shader compilation error.'

const programInfo = (gl: WebGL2RenderingContext, program: WebGLProgram): string =>
  gl.getProgramInfoLog(program)?.trim() || 'Unknown shader link error.'

export interface WebGL2RendererOptions {
  canvas: HTMLCanvasElement
  width?: number
  height?: number
}

export class WebGL2Renderer {
  readonly canvas: HTMLCanvasElement
  readonly backend = 'webgl2' as const
  width: number
  height: number
  ready = false
  precision: 'rgba16float' | 'rgba8unorm' = 'rgba8unorm'

  private gl: WebGL2RenderingContext | null = null
  private naga: WebNagaModule | null = null
  private readonly pipelines = new Map<string, WebGLPipelineResource>()
  private readonly textures = new Set<WebGLTextureResource>()
  private readonly buffers = new Set<WebGLBufferResource>()
  private readonly deviceLostListeners = new Set<(info: HydraRendererLossInfo) => void>()
  private globalUniformBuffer: WebGLBufferResource | null = null
  private fallbackTexture: WebGLTextureResource | null = null
  private screenProgram: ScreenProgram | null = null
  private screenAllProgram: ScreenProgram | null = null
  private copyProgram: ScreenProgram | null = null
  private supportsFloatTargets = false
  private disposed = false

  private readonly onContextLost = (event: Event): void => {
    event.preventDefault()
    if (this.disposed) return
    this.ready = false
    const info = { reason: 'context-lost', message: 'WebGL2 context lost.' }
    const listeners = Array.from(this.deviceLostListeners)
    this.deviceLostListeners.clear()
    for (const listener of listeners) listener(info)
  }

  constructor ({ canvas, width = canvas.width || 1280, height = canvas.height || 720 }: WebGL2RendererOptions) {
    this.canvas = canvas
    this.width = width
    this.height = height
  }

  static assertSupport (): void {
    if (typeof WebGL2RenderingContext === 'undefined') throw new Error(WEBGL2_UNAVAILABLE_MESSAGE)
  }

  async init (): Promise<this> {
    if (this.ready) return this
    if (this.disposed) throw new Error('WebGL2 renderer has been disposed.')

    const gl = this.canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance'
    })
    if (!gl) throw new Error(WEBGL2_UNAVAILABLE_MESSAGE)

    try {
      this.gl = gl
      this.naga = await loadNaga()
      this.supportsFloatTargets = Boolean(gl.getExtension('EXT_color_buffer_float'))
      this.precision = this.supportsFloatTargets ? 'rgba16float' : 'rgba8unorm'
      gl.disable(gl.DEPTH_TEST)
      gl.disable(gl.CULL_FACE)
      gl.disable(gl.BLEND)
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
      this.globalUniformBuffer = this.createUniformBuffer(16)
      this.fallbackTexture = this.createTexture(1, 1, 'rgba8unorm')
      this.clearTexture(this.fallbackTexture)
      this.screenProgram = this.createScreenProgram(SCREEN_FRAGMENT_GLSL, 1)
      this.screenAllProgram = this.createScreenProgram(SCREEN_ALL_FRAGMENT_GLSL, 4)
      this.copyProgram = this.createScreenProgram(COPY_FRAGMENT_GLSL, 1)
      this.canvas.addEventListener('webglcontextlost', this.onContextLost)
      this.updateGlobalUniforms({ time: 0, bpm: 60, width: this.width, height: this.height })
      this.ready = true
      return this
    } catch (error) {
      this.releaseResources()
      throw error
    }
  }

  onDeviceLost (listener: (info: HydraRendererLossInfo) => void): () => void {
    this.deviceLostListeners.add(listener)
    return () => this.deviceLostListeners.delete(listener)
  }

  setResolution (width: number, height: number): void {
    this.width = Math.max(1, Math.floor(width))
    this.height = Math.max(1, Math.floor(height))
    this.canvas.width = this.width
    this.canvas.height = this.height
  }

  private requireGL (): WebGL2RenderingContext {
    if (!this.gl) throw new Error('WebGL2 renderer is not initialized.')
    return this.gl
  }

  private compileShader (type: number, source: string): WebGLShader {
    const gl = this.requireGL()
    const shader = gl.createShader(type)
    if (!shader) throw new Error('WebGL2 failed to allocate a shader.')
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const detail = shaderInfo(gl, shader)
      gl.deleteShader(shader)
      throw new Error(detail)
    }
    return shader
  }

  private createProgram (fragmentSource: string): WebGLProgram {
    const gl = this.requireGL()
    const vertex = this.compileShader(gl.VERTEX_SHADER, FULLSCREEN_VERTEX_GLSL)
    const fragment = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource)
    const program = gl.createProgram()
    if (!program) {
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
      throw new Error('WebGL2 failed to allocate a program.')
    }
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const detail = programInfo(gl, program)
      gl.deleteProgram(program)
      throw new Error(detail)
    }
    return program
  }

  private createScreenProgram (fragmentSource: string, textureCount: number): ScreenProgram {
    const gl = this.requireGL()
    const program = this.createProgram(fragmentSource)
    return {
      program,
      resolution: gl.getUniformLocation(program, 'uResolution'),
      textures: Array.from({ length: textureCount }, (_, index) => gl.getUniformLocation(program, `uTex${index}`))
    }
  }

  private createUniformBuffer (byteLength: number): WebGLBufferResource {
    const gl = this.requireGL()
    const buffer = gl.createBuffer()
    if (!buffer) throw new Error('WebGL2 failed to allocate a uniform buffer.')
    const normalizedLength = Math.max(16, Math.ceil(byteLength / 16) * 16)
    gl.bindBuffer(gl.UNIFORM_BUFFER, buffer)
    gl.bufferData(gl.UNIFORM_BUFFER, normalizedLength, gl.DYNAMIC_DRAW)
    gl.bindBuffer(gl.UNIFORM_BUFFER, null)
    const resource: WebGLBufferResource = {
      kind: 'webgl2-buffer',
      buffer,
      values: new Float32Array(normalizedLength / 4),
      byteLength: normalizedLength
    }
    this.buffers.add(resource)
    return resource
  }

  createGlobalUniformBuffer (_label: string): HydraBuffer {
    return this.createUniformBuffer(16)
  }

  writeGlobalUniformBuffer (
    buffer: HydraBuffer,
    { time, bpm, width, height }: { time: number, bpm: number, width: number, height: number }
  ): boolean {
    const resource = asBuffer(buffer)
    const next = [time, bpm, width, height]
    if (next.every((value, index) => resource.values[index] === value)) return false
    resource.values.set(next)
    const gl = this.requireGL()
    gl.bindBuffer(gl.UNIFORM_BUFFER, resource.buffer)
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, resource.values)
    gl.bindBuffer(gl.UNIFORM_BUFFER, null)
    return true
  }

  updateGlobalUniforms ({ time, bpm, width = this.width, height = this.height }: { time: number, bpm: number, width?: number, height?: number }): boolean {
    if (!this.globalUniformBuffer) return false
    return this.writeGlobalUniformBuffer(this.globalUniformBuffer, { time, bpm, width, height })
  }

  createDynamicUniformBuffer (_label: string): HydraBuffer {
    return this.createUniformBuffer(Math.ceil(MAX_DYNAMIC_UNIFORMS / 4) * 16)
  }

  writeDynamicUniformBuffer (buffer: HydraBuffer, data: Float32Array, floatCount: number): boolean {
    const resource = asBuffer(buffer)
    const count = Math.max(0, Math.min(MAX_DYNAMIC_UNIFORMS, floatCount))
    resource.values.fill(0)
    resource.values.set(data.subarray(0, count))
    const gl = this.requireGL()
    gl.bindBuffer(gl.UNIFORM_BUFFER, resource.buffer)
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, resource.values)
    gl.bindBuffer(gl.UNIFORM_BUFFER, null)
    return true
  }

  destroyBuffer (buffer: HydraBuffer | null | undefined): void {
    if (!buffer || !this.gl) return
    const resource = asBuffer(buffer)
    if (!this.buffers.delete(resource)) return
    this.gl.deleteBuffer(resource.buffer)
  }

  private createTexture (width: number, height: number, requestedFormat: 'rgba16float' | 'rgba8unorm'): WebGLTextureResource {
    const gl = this.requireGL()
    const texture = gl.createTexture()
    const framebuffer = gl.createFramebuffer()
    if (!texture || !framebuffer) {
      if (texture) gl.deleteTexture(texture)
      if (framebuffer) gl.deleteFramebuffer(framebuffer)
      throw new Error('WebGL2 failed to allocate a texture target.')
    }
    const format = requestedFormat === 'rgba16float' && this.supportsFloatTargets ? 'rgba16float' : 'rgba8unorm'
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      format === 'rgba16float' ? gl.RGBA16F : gl.RGBA8,
      width,
      height,
      0,
      gl.RGBA,
      format === 'rgba16float' ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
      null
    )
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, null)
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      gl.deleteFramebuffer(framebuffer)
      gl.deleteTexture(texture)
      throw new Error(`WebGL2 framebuffer is incomplete (0x${status.toString(16)}).`)
    }
    const resource: WebGLTextureResource = {
      kind: 'webgl2-texture',
      texture,
      framebuffer,
      width,
      height,
      format
    }
    this.textures.add(resource)
    return resource
  }

  createOutputTexture ({
    width = this.width,
    height = this.height,
    depthOrArrayLayers = 1,
    format = 'rgba16float'
  }: HydraOutputTextureOptions = {}): HydraTexture {
    if (depthOrArrayLayers !== 1) throw new Error('WebGL2 fallback supports only 2D texture targets.')
    return this.createTexture(Math.max(1, Math.floor(width)), Math.max(1, Math.floor(height)), format)
  }

  createSourceTexture ({ width, height }: { width: number, height: number, label?: string }): HydraTexture {
    return this.createTexture(Math.max(1, Math.floor(width)), Math.max(1, Math.floor(height)), 'rgba8unorm')
  }

  destroyTexture (texture: HydraTexture | null | undefined): void {
    if (!texture || !this.gl) return
    const resource = asTexture(texture)
    if (!this.textures.delete(resource)) return
    this.gl.deleteFramebuffer(resource.framebuffer)
    this.gl.deleteTexture(resource.texture)
  }

  private clearTexture (texture: WebGLTextureResource): void {
    const gl = this.requireGL()
    gl.bindFramebuffer(gl.FRAMEBUFFER, texture.framebuffer)
    gl.viewport(0, 0, texture.width, texture.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  writeExternalImage (texture: HydraTexture, source: CanvasImageSource, flipY = false): void {
    const gl = this.requireGL()
    const resource = asTexture(texture)
    gl.bindTexture(gl.TEXTURE_2D, resource.texture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source as TexImageSource)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.bindTexture(gl.TEXTURE_2D, null)
  }

  getFallbackTexture (): HydraTexture {
    if (!this.fallbackTexture) throw new Error('WebGL2 fallback texture is unavailable.')
    return this.fallbackTexture
  }

  private uniformBlockIndexForBinding (program: WebGLProgram, glsl: string, binding: number): number {
    const gl = this.requireGL()
    const blocks = /layout\(std140\)\s+uniform\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{([\s\S]*?)\};/gu
    for (const match of glsl.matchAll(blocks)) {
      const blockName = match[1]
      const body = match[2] ?? ''
      if (!blockName || !body.includes(`_group_0_binding_${binding}_fs`)) continue
      return gl.getUniformBlockIndex(program, blockName)
    }
    return gl.INVALID_INDEX
  }

  getPipeline (pass: HydraCompiledPass): HydraPipeline {
    const programSource = serializeTypeGPUProgram(pass.program)
    const cached = this.pipelines.get(pass.signature)
    if (cached?.programSource === programSource) {
      this.pipelines.delete(pass.signature)
      this.pipelines.set(pass.signature, cached)
      return cached
    }
    const gl = this.requireGL()

    try {
      const wgsl = resolveWebGLFragmentWGSL(pass)
      if (!this.naga) throw new Error('WebGL2 shader translator is unavailable.')
      const glsl = translateWebGLFragment(this.naga, wgsl)
      const program = this.createProgram(glsl)
      const globalsBlockIndex = this.uniformBlockIndexForBinding(program, glsl, 0)
      const dynamicBlockIndex = this.uniformBlockIndexForBinding(program, glsl, 1)
      if (globalsBlockIndex !== gl.INVALID_INDEX) gl.uniformBlockBinding(program, globalsBlockIndex, 0)
      if (dynamicBlockIndex !== gl.INVALID_INDEX) gl.uniformBlockBinding(program, dynamicBlockIndex, 1)
      const textureLocations = pass.textures.map((_, index) => (
        gl.getUniformLocation(program, `_group_0_binding_${index + 3}_fs`)
      ))
      const created: WebGLPipelineResource = {
        kind: 'webgl2-pipeline',
        signature: pass.signature,
        programSource,
        wgsl,
        glsl,
        program,
        globalsBlockIndex,
        dynamicBlockIndex,
        textureLocations
      }
      if (cached) gl.deleteProgram(cached.program)
      this.pipelines.set(pass.signature, created)
      while (this.pipelines.size > MAX_PIPELINE_CACHE_ENTRIES) {
        const oldestKey = this.pipelines.keys().next().value
        if (typeof oldestKey !== 'string') break
        const oldest = this.pipelines.get(oldestKey)
        if (oldest) gl.deleteProgram(oldest.program)
        this.pipelines.delete(oldestKey)
      }
      return created
    } catch (cause) {
      throw new Error(`WebGL2 fragment pipeline creation failed for ${pass.signature}.`, { cause })
    }
  }

  executePass ({
    pipeline,
    target,
    textures,
    globalUniformBuffer,
    dynamicUniformBuffer
  }: HydraRenderPassExecution): void {
    const gl = this.requireGL()
    const entry = asPipeline(pipeline)
    const output = asTexture(target)
    gl.bindFramebuffer(gl.FRAMEBUFFER, output.framebuffer)
    gl.viewport(0, 0, output.width, output.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(entry.program)
    if (entry.globalsBlockIndex !== gl.INVALID_INDEX) {
      gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, asBuffer(globalUniformBuffer).buffer)
    }
    if (entry.dynamicBlockIndex !== gl.INVALID_INDEX && dynamicUniformBuffer) {
      gl.bindBufferBase(gl.UNIFORM_BUFFER, 1, asBuffer(dynamicUniformBuffer).buffer)
    }
    entry.textureLocations.forEach((location, index) => {
      const texture = asTexture(textures[index] ?? this.getFallbackTexture())
      gl.activeTexture(gl.TEXTURE0 + index)
      gl.bindTexture(gl.TEXTURE_2D, texture.texture)
      if (location) gl.uniform1i(location, index)
    })
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  beginFrame (): HydraFrame | null {
    if (!this.ready) return null
    return { kind: 'webgl2-frame' } satisfies WebGLFrameResource
  }

  submitFrame (_frame: HydraFrame | null): void {
    if (this.ready) this.gl?.flush()
  }

  copyTextureToTexture (
    _frame: HydraFrame,
    source: HydraTexture,
    destination: HydraTexture,
    size: HydraTextureSize
  ): void {
    const gl = this.requireGL()
    const from = asTexture(source)
    const to = asTexture(destination)
    const width = Math.max(1, Math.min(Math.floor(size.width), from.width, to.width))
    const height = Math.max(1, Math.min(Math.floor(size.height), from.height, to.height))
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, from.framebuffer)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, to.framebuffer)
    gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.NEAREST)
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
  }

  private drawScreenProgram (
    screen: ScreenProgram,
    target: WebGLTextureResource | null,
    textures: Array<HydraTexture | null>,
    width: number,
    height: number
  ): void {
    const gl = this.requireGL()
    gl.bindFramebuffer(gl.FRAMEBUFFER, target?.framebuffer ?? null)
    gl.viewport(0, 0, width, height)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(screen.program)
    gl.uniform2f(screen.resolution, width, height)
    screen.textures.forEach((location, index) => {
      const resource = asTexture(textures[index] ?? this.getFallbackTexture())
      gl.activeTexture(gl.TEXTURE0 + index)
      gl.bindTexture(gl.TEXTURE_2D, resource.texture)
      if (location) gl.uniform1i(location, index)
    })
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  renderTextureToScreen (_frame: HydraFrame, texture: HydraTexture | null): void {
    if (!this.ready || !this.screenProgram) return
    this.drawScreenProgram(this.screenProgram, null, [texture], this.width, this.height)
  }

  renderAllOutputsToScreen (_frame: HydraFrame, textures: Array<HydraTexture | null> = []): void {
    if (!this.ready || !this.screenAllProgram) return
    this.drawScreenProgram(this.screenAllProgram, null, textures, this.width, this.height)
  }

  async waitForSubmittedWork (): Promise<void> {
    this.gl?.finish()
  }

  async readTexturePixels (texture: HydraTexture, width: number, height: number): Promise<HydraTextureReadback> {
    const gl = this.requireGL()
    const source = asTexture(texture)
    const normalizedWidth = Math.max(1, Math.floor(width))
    const normalizedHeight = Math.max(1, Math.floor(height))
    let readable = source
    let intermediate: WebGLTextureResource | null = null
    if (
      source.format !== 'rgba8unorm' ||
      source.width !== normalizedWidth ||
      source.height !== normalizedHeight
    ) {
      if (!this.copyProgram) throw new Error('WebGL2 capture conversion program is unavailable.')
      intermediate = this.createTexture(normalizedWidth, normalizedHeight, 'rgba8unorm')
      this.drawScreenProgram(this.copyProgram, intermediate, [source], normalizedWidth, normalizedHeight)
      readable = intermediate
    }
    try {
      const pixels = new Uint8Array(normalizedWidth * normalizedHeight * 4)
      gl.bindFramebuffer(gl.FRAMEBUFFER, readable.framebuffer)
      gl.readPixels(0, 0, normalizedWidth, normalizedHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      return { data: pixels.buffer, bytesPerRow: normalizedWidth * 4 }
    } finally {
      if (intermediate) this.destroyTexture(intermediate)
    }
  }

  private releaseResources (): void {
    const gl = this.gl
    if (gl) {
      for (const pipeline of this.pipelines.values()) gl.deleteProgram(pipeline.program)
      for (const screen of [this.screenProgram, this.screenAllProgram, this.copyProgram]) {
        if (screen) gl.deleteProgram(screen.program)
      }
      for (const texture of this.textures) {
        gl.deleteFramebuffer(texture.framebuffer)
        gl.deleteTexture(texture.texture)
      }
      for (const buffer of this.buffers) gl.deleteBuffer(buffer.buffer)
    }
    this.pipelines.clear()
    this.textures.clear()
    this.buffers.clear()
    this.globalUniformBuffer = null
    this.fallbackTexture = null
    this.screenProgram = null
    this.screenAllProgram = null
    this.copyProgram = null
    this.ready = false
  }

  dispose (): void {
    if (this.disposed) return
    this.disposed = true
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost)
    this.releaseResources()
    this.deviceLostListeners.clear()
    this.naga = null
    this.gl = null
  }
}
