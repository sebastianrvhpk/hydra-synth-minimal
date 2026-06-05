interface BasePipelineCacheEntry<TPipeline> {
  cacheKey: string
  signature: string
  code: string
  module: GPUShaderModule
  pipeline: TPipeline | null
  error: unknown | null
  promise: Promise<TPipeline> | null
}

export type PipelineCacheEntry = BasePipelineCacheEntry<GPURenderPipeline>
export type ComputePipelineCacheEntry = BasePipelineCacheEntry<GPUComputePipeline>

class PipelineCacheStore<TPipeline> {
  private readonly device: GPUDevice
  private readonly maxEntries: number
  private readonly entries = new Map<string, BasePipelineCacheEntry<TPipeline>>()

  constructor ({ device, maxEntries = 256 }: { device: GPUDevice, maxEntries?: number }) {
    this.device = device
    this.maxEntries = Math.max(1, Math.floor(maxEntries))
  }

  private hashString (value = ''): string {
    let hash = 2166136261
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index)
      hash = Math.imul(hash, 16777619)
    }
    return (hash >>> 0).toString(16).padStart(8, '0')
  }

  private buildEntryKey (signature: string, code: string, collisionIndex = 0): string {
    const base = `${signature}|h${this.hashString(code)}|l${code.length}`
    if (collisionIndex <= 0) return base
    return `${base}|c${collisionIndex}`
  }

  private findEntry (signature: string, code: string): { cacheKey: string, entry: BasePipelineCacheEntry<TPipeline> | null } {
    let collisionIndex = 0
    while (true) {
      const cacheKey = this.buildEntryKey(signature, code, collisionIndex)
      const existing = this.entries.get(cacheKey)
      if (!existing) return { cacheKey, entry: null }
      if (existing.code === code) return { cacheKey, entry: existing }
      collisionIndex += 1
    }
  }

  private touch (cacheKey: string, entry: BasePipelineCacheEntry<TPipeline>): void {
    this.entries.delete(cacheKey)
    this.entries.set(cacheKey, entry)
  }

  private evictIfNeeded (): void {
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value
      if (!oldestKey) return
      this.entries.delete(oldestKey)
    }
  }

  requestPipeline (
    signature: string,
    code: string,
    createPipeline: (module: GPUShaderModule, labelSuffix: string) => Promise<TPipeline>
  ): BasePipelineCacheEntry<TPipeline> {
    const { cacheKey, entry: cachedEntry } = this.findEntry(signature, code)
    if (cachedEntry) {
      this.touch(cacheKey, cachedEntry)
      return cachedEntry
    }

    const labelSuffix = this.hashString(cacheKey)
    const module = this.device.createShaderModule({
      label: `hydra-shader-${labelSuffix}`,
      code
    })

    const entry: BasePipelineCacheEntry<TPipeline> = {
      cacheKey,
      signature,
      code,
      module,
      pipeline: null,
      error: null,
      promise: null
    }

    entry.promise = createPipeline(module, labelSuffix).then((pipeline) => {
      entry.pipeline = pipeline
      return pipeline
    }).catch((error) => {
      entry.error = error
      throw error
    })

    this.entries.set(cacheKey, entry)
    this.evictIfNeeded()
    return entry
  }

  clear (): void {
    this.entries.clear()
  }
}

export class PipelineCache {
  private readonly device: GPUDevice
  private readonly targetFormat: GPUTextureFormat
  private readonly store: PipelineCacheStore<GPURenderPipeline>

  constructor ({ device, targetFormat, maxEntries = 256 }: { device: GPUDevice, targetFormat: GPUTextureFormat, maxEntries?: number }) {
    this.device = device
    this.targetFormat = targetFormat
    this.store = new PipelineCacheStore({ device, maxEntries })
  }

  requestPipeline (signature: string, code: string): PipelineCacheEntry {
    return this.store.requestPipeline(signature, code, (module, labelSuffix) =>
      this.device.createRenderPipelineAsync({
        label: `hydra-pipeline-${labelSuffix}`,
        layout: 'auto',
        vertex: {
          module,
          entryPoint: 'vsMain'
        },
        fragment: {
          module,
          entryPoint: 'fsMain',
          targets: [{ format: this.targetFormat }]
        },
        primitive: {
          topology: 'triangle-list'
        }
      })
    ) as PipelineCacheEntry
  }

  clear (): void {
    this.store.clear()
  }
}

export class ComputePipelineCache {
  private readonly device: GPUDevice
  private readonly store: PipelineCacheStore<GPUComputePipeline>

  constructor ({ device, maxEntries = 256 }: { device: GPUDevice, maxEntries?: number }) {
    this.device = device
    this.store = new PipelineCacheStore({ device, maxEntries })
  }

  requestPipeline (signature: string, code: string): ComputePipelineCacheEntry {
    return this.store.requestPipeline(signature, code, (module, labelSuffix) =>
      this.device.createComputePipelineAsync({
        label: `hydra-compute-pipeline-${labelSuffix}`,
        layout: 'auto',
        compute: {
          module,
          entryPoint: 'csMain'
        }
      })
    ) as ComputePipelineCacheEntry
  }

  clear (): void {
    this.store.clear()
  }
}
