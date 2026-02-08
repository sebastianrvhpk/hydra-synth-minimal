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

  private getScheduledOutputs (): WebGPUOutputNode[] {
    if (this.outputs.length <= 1) return this.outputs

    const byId = new Map<number, WebGPUOutputNode>()
    this.outputs.forEach((output) => {
      if (Number.isInteger(output.id) && output.id >= 0) byId.set(output.id, output)
    })

    const indegree = new Map<WebGPUOutputNode, number>()
    const dependents = new Map<WebGPUOutputNode, WebGPUOutputNode[]>()
    this.outputs.forEach((output) => {
      indegree.set(output, 0)
      dependents.set(output, [])
    })

    for (const output of this.outputs) {
      const dependencies = output.getDependencyOutputIds()
      const dedupedDeps = new Set<WebGPUOutputNode>()
      for (const dependencyId of dependencies) {
        const dependency = byId.get(dependencyId)
        if (!dependency || dependency === output || dedupedDeps.has(dependency)) continue
        dedupedDeps.add(dependency)
        indegree.set(output, (indegree.get(output) ?? 0) + 1)
        const next = dependents.get(dependency)
        if (next) next.push(output)
      }
    }

    const queue: WebGPUOutputNode[] = []
    for (const output of this.outputs) {
      if ((indegree.get(output) ?? 0) === 0) queue.push(output)
    }

    const scheduled: WebGPUOutputNode[] = []
    while (queue.length > 0) {
      const current = queue.shift()
      if (!current) break

      scheduled.push(current)
      const downstream = dependents.get(current) ?? []
      for (const candidate of downstream) {
        const nextIndegree = (indegree.get(candidate) ?? 0) - 1
        indegree.set(candidate, nextIndegree)
        if (nextIndegree === 0) queue.push(candidate)
      }
    }

    if (scheduled.length === this.outputs.length) return scheduled

    // Dependency cycles fall back to stable output order for unresolved nodes.
    const scheduledSet = new Set<WebGPUOutputNode>(scheduled)
    for (const output of this.outputs) {
      if (!scheduledSet.has(output)) scheduled.push(output)
    }
    return scheduled
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

    const scheduledOutputs = this.getScheduledOutputs()
    for (const output of scheduledOutputs) {
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
