import type { HydraFrameState, RendererAdapter } from 'hydra-synth-core'
import type { WebGPURenderer } from '../webgpu/renderer.js'
import type { WebGPUOutputNode } from './output-node.js'
import type { HydraSourceNode } from './source-node.js'

interface FrameRendererAdapterOptions {
  renderer: WebGPURenderer
  outputs: WebGPUOutputNode[]
  sources: HydraSourceNode[]
  getRenderAll: () => boolean
  getActiveOutput: () => WebGPUOutputNode
}

export class WebGPUFrameRendererAdapter implements RendererAdapter {
  private readonly renderer: WebGPURenderer
  private readonly outputs: WebGPUOutputNode[]
  private readonly sources: HydraSourceNode[]
  private readonly getRenderAll: () => boolean
  private readonly getActiveOutput: () => WebGPUOutputNode

  constructor ({ renderer, outputs, sources, getRenderAll, getActiveOutput }: FrameRendererAdapterOptions) {
    this.renderer = renderer
    this.outputs = outputs
    this.sources = sources
    this.getRenderAll = getRenderAll
    this.getActiveOutput = getActiveOutput
  }

  async init (): Promise<void> {
    await this.renderer.init()
    for (const output of this.outputs) output.attachRenderer(this.renderer)
    for (const source of this.sources) source.attachRenderer(this.renderer)
  }

  beginFrame (_frame: HydraFrameState): unknown {
    return this.renderer.beginFrame()
  }

  renderFrame (frameHandle: unknown, frame: HydraFrameState): void {
    const encoder = frameHandle as GPUCommandEncoder | null
    if (!encoder || !this.renderer.ready) return

    this.renderer.updateGlobalUniforms({
      time: frame.time,
      bpm: frame.bpm,
      width: frame.resolution[0],
      height: frame.resolution[1]
    })

    for (const output of this.outputs) {
      output.tick(frame, encoder)
    }

    if (this.getRenderAll()) {
      const textures: GPUTexture[] = []
      for (const output of this.outputs) {
        const texture = output.getCurrent()
        if (texture) textures.push(texture)
      }
      this.renderer.renderAllOutputsToScreen(encoder, textures)
      return
    }

    this.renderer.renderTextureToScreen(encoder, this.getActiveOutput().getCurrent())
  }

  submitFrame (frameHandle: unknown): void {
    this.renderer.submitFrame(frameHandle as GPUCommandEncoder | null)
  }

  setResolution (width: number, height: number): void {
    this.renderer.setResolution(width, height)
    for (const output of this.outputs) output.resize(width, height)
  }

  dispose (): void {
    for (const output of this.outputs) output.dispose()
    this.renderer.dispose()
  }
}
