import tgpu, {
  d,
  type TgpuRenderPipeline,
  type TgpuRoot
} from 'typegpu'
import type { HydraCompiledPass, HydraFragmentPass } from '../core/types.js'
import {
  createPassBindGroupLayout,
  type HydraTypeGPUBindGroupLayout
} from './typegpu-schemas.js'
import {
  createTypeGPUShaderExternals,
  serializeTypeGPUProgram
} from './typegpu-functions.js'

interface PipelineCacheEntryBase {
  cacheKey: string
  signature: string
  programSource: string
  layout: HydraTypeGPUBindGroupLayout
}

export interface PipelineCacheEntry extends PipelineCacheEntryBase {
  typegpuPipeline: TgpuRenderPipeline<any>
}

type AnyPipelineCacheEntry = PipelineCacheEntry

const hashString = (value = ''): string => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export const fullscreenVertex = tgpu.vertexFn({
  in: { vertexIndex: d.builtin.vertexIndex },
  out: { position: d.builtin.position }
})(`{
  let positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  let p = positions[in.vertexIndex];
  return Out(vec4f(p, 0.0, 1.0));
}`).$name('hydraFullscreenVertex')

abstract class TypeGPUPipelineCache<TPass extends HydraCompiledPass, TEntry extends AnyPipelineCacheEntry> {
  protected readonly root: TgpuRoot
  private readonly maxEntries: number
  private readonly entries = new Map<string, TEntry>()

  constructor ({ root, maxEntries }: { root: TgpuRoot, maxEntries: number }) {
    this.root = root
    this.maxEntries = Math.max(1, Math.floor(maxEntries))
  }

  protected abstract createEntry(pass: TPass, cacheKey: string, programSource: string): TEntry

  requestPipeline (pass: TPass): TEntry {
    const programSource = serializeTypeGPUProgram(pass.program)
    const cacheKey = pass.signature
    const existing = this.entries.get(cacheKey)
    if (existing?.programSource === programSource) {
      this.entries.delete(cacheKey)
      this.entries.set(cacheKey, existing)
      return existing
    }

    const entry = this.createEntry(pass, cacheKey, programSource)
    this.entries.set(cacheKey, entry)
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value
      if (typeof oldestKey !== 'string') break
      this.entries.delete(oldestKey)
    }
    return entry
  }

  clear (): void {
    this.entries.clear()
  }
}

const createResourceExternals = (layout: HydraTypeGPUBindGroupLayout): Record<string, unknown> => {
  const externals: Record<string, unknown> = {}
  for (const key of Object.keys(layout.entries)) {
    const resource = layout.bound[key]
    if (resource) externals[key] = resource
  }
  return externals
}

export class PipelineCache extends TypeGPUPipelineCache<HydraFragmentPass, PipelineCacheEntry> {
  private readonly targetFormat: GPUTextureFormat

  constructor ({ root, targetFormat, maxEntries = 256 }: { root: TgpuRoot, targetFormat: GPUTextureFormat, maxEntries?: number }) {
    super({ root, maxEntries })
    this.targetFormat = targetFormat
  }

  protected createEntry (pass: HydraFragmentPass, cacheKey: string, programSource: string): PipelineCacheEntry {
    try {
      const layout = createPassBindGroupLayout(pass)
      const externals = createTypeGPUShaderExternals(
        pass.program,
        createResourceExternals(layout)
      )
      const fragment = tgpu.fragmentFn({
        in: { position: d.builtin.position },
        out: d.vec4f
      })(pass.program.entryBody)
        .$uses(externals)
        .$name(`hydraFragment_${hashString(pass.signature)}`)
      const typegpuPipeline = this.root.createRenderPipeline({
        vertex: fullscreenVertex,
        fragment,
        targets: { format: this.targetFormat },
        primitive: { topology: 'triangle-list' }
      }).$name(`hydraRenderPipeline_${hashString(cacheKey)}`)

      this.root.unwrap(typegpuPipeline)
      return { cacheKey, signature: pass.signature, programSource, layout, typegpuPipeline }
    } catch (cause) {
      throw new Error(`TypeGPU fragment pipeline creation failed for ${pass.signature}.`, { cause })
    }
  }
}
