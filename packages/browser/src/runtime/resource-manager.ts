import type { WebGPURenderer } from '../webgpu/renderer.js'

interface ManagedBufferEntry {
  buffer: GPUBuffer
  bytes: number
  usage: 'storage' | 'indirect' | 'queueCounter'
}

interface ManagedTextureEntry {
  texture: GPUTexture
  width: number
  height: number
  depthOrArrayLayers: number
  format: GPUTextureFormat
}

export interface HydraResourceResidencySnapshot {
  storageBufferSlots: number
  textureSlots: number
  indirectSlots: number
  queueCounterSlots: number
  resourceBindings: number
  storageBufferBytes: number
  textureBytes: number
  indirectBytes: number
  queueCounterBytes: number
  totalResidentBytes: number
  bufferSlotKeys: string[]
  textureSlotKeys: string[]
}

export class HydraResourceManager {
  private readonly renderer: WebGPURenderer
  private readonly buffers = new Map<string, ManagedBufferEntry>()
  private readonly textures = new Map<string, ManagedTextureEntry>()
  private readonly resourceToSlot = new Map<string, string>()
  private readonly queueCounters = new Map<string, { active: number, overflow: number }>()

  constructor (renderer: WebGPURenderer) {
    this.renderer = renderer
  }

  registerResourceSlot (resourceId: string, slot: string): void {
    if (!resourceId || !slot) return
    this.resourceToSlot.set(resourceId, slot)
  }

  getSlotForResource (resourceId: string): string | null {
    return this.resourceToSlot.get(resourceId) ?? null
  }

  hasResourceSlot (resourceId: string): boolean {
    return this.resourceToSlot.has(resourceId)
  }

  hasBufferSlot (slot: string): boolean {
    return this.buffers.has(slot)
  }

  hasTextureSlot (slot: string): boolean {
    return this.textures.has(slot)
  }

  allocateStorageBufferForResource (resourceId: string, requiredBytes: number): GPUBuffer | null {
    const slot = this.getSlotForResource(resourceId)
    if (!slot) return null
    return this.getOrCreateStorageBuffer(slot, requiredBytes)
  }

  allocateStorageTextureForResource (
    resourceId: string,
    descriptor: {
      width: number
      height: number
      depthOrArrayLayers?: number
      format?: GPUTextureFormat
    }
  ): GPUTexture | null {
    const slot = this.getSlotForResource(resourceId)
    if (!slot) return null
    return this.getOrCreateStorageTexture(slot, descriptor)
  }

  getOrCreateStorageBuffer (slot: string, requiredBytes: number): GPUBuffer {
    const minBytes = Math.max(16, Math.floor(requiredBytes))
    const existing = this.buffers.get(slot)
    if (existing && existing.bytes >= minBytes) return existing.buffer
    if (existing) existing.buffer.destroy()

    const created = this.renderer.createStorageBuffer(`hydra-buffer-${slot}`, minBytes)
    this.buffers.set(slot, { buffer: created, bytes: minBytes, usage: 'storage' })
    return created
  }

  getOrCreateIndirectArgsBuffer (slot: string, offset = 0): GPUBuffer {
    const bytes = Math.max(16, Math.floor(offset) + 12)
    const existing = this.buffers.get(slot)
    if (existing && existing.bytes >= bytes && existing.usage === 'indirect') return existing.buffer
    if (existing) existing.buffer.destroy()
    const created = this.renderer.createStorageBuffer(`hydra-indirect-${slot}`, bytes)
    this.buffers.set(slot, { buffer: created, bytes, usage: 'indirect' })
    return created
  }

  getOrCreateQueueCounterBuffer (slot: string): GPUBuffer {
    const bytes = 16
    const existing = this.buffers.get(slot)
    if (existing && existing.bytes >= bytes && existing.usage === 'queueCounter') return existing.buffer
    if (existing) existing.buffer.destroy()
    const created = this.renderer.createStorageBuffer(`hydra-queue-counter-${slot}`, bytes)
    this.buffers.set(slot, { buffer: created, bytes, usage: 'queueCounter' })
    return created
  }

  writeIndirectArgs (slot: string, x: number, y = 1, z = 1, offset = 0): void {
    const buffer = this.getOrCreateIndirectArgsBuffer(slot, offset)
    this.renderer.device?.queue.writeBuffer(
      buffer,
      Math.max(0, Math.floor(offset)),
      new Uint32Array([
        Math.max(0, Math.floor(x)),
        Math.max(0, Math.floor(y)),
        Math.max(0, Math.floor(z))
      ])
    )
  }

  writeQueueCount (slot: string, activeCount: number, overflowCount = 0): void {
    const buffer = this.getOrCreateQueueCounterBuffer(slot)
    this.queueCounters.set(slot, {
      active: Math.max(0, Math.floor(activeCount)),
      overflow: Math.max(0, Math.floor(overflowCount))
    })
    this.renderer.device?.queue.writeBuffer(
      buffer,
      0,
      new Uint32Array([
        Math.max(0, Math.floor(activeCount)),
        Math.max(0, Math.floor(overflowCount)),
        0,
        0
      ])
    )
  }

  readQueueCount (slot: string): number | null {
    const counter = this.queueCounters.get(slot)
    if (!counter) return null
    return counter.active
  }

  readQueueOverflow (slot: string): number | null {
    const counter = this.queueCounters.get(slot)
    if (!counter) return null
    return counter.overflow
  }

  getOrCreateStorageTexture (
    slot: string,
    {
      width,
      height,
      depthOrArrayLayers = 1,
      format = 'rgba16float'
    }: {
      width: number
      height: number
      depthOrArrayLayers?: number
      format?: GPUTextureFormat
    }
  ): GPUTexture {
    const safeWidth = Math.max(1, Math.floor(width))
    const safeHeight = Math.max(1, Math.floor(height))
    const safeLayers = Math.max(1, Math.floor(depthOrArrayLayers))
    const existing = this.textures.get(slot)
    if (
      existing &&
      existing.width === safeWidth &&
      existing.height === safeHeight &&
      existing.depthOrArrayLayers === safeLayers &&
      existing.format === format
    ) {
      return existing.texture
    }
    if (existing) existing.texture.destroy()

    const created = this.renderer.createOutputTexture({
      width: safeWidth,
      height: safeHeight,
      depthOrArrayLayers: safeLayers,
      includeRenderAttachment: false,
      label: `hydra-texture-${slot}`,
      format
    })
    this.textures.set(slot, {
      texture: created,
      width: safeWidth,
      height: safeHeight,
      depthOrArrayLayers: safeLayers,
      format
    })
    return created
  }

  getResidentByteEstimate (): number {
    let bytes = 0
    this.buffers.forEach((entry) => {
      bytes += entry.bytes
    })
    this.textures.forEach((entry) => {
      const bytesPerPixel = entry.format === 'rgba16float' ? 8 : 4
      bytes += entry.width * entry.height * entry.depthOrArrayLayers * bytesPerPixel
    })
    return bytes
  }

  getResidencySnapshot (): HydraResourceResidencySnapshot {
    let storageBufferSlots = 0
    let indirectSlots = 0
    let queueCounterSlots = 0
    let storageBufferBytes = 0
    let indirectBytes = 0
    let queueCounterBytes = 0
    const bufferSlotKeys: string[] = []
    this.buffers.forEach((entry) => {
      if (entry.usage === 'storage') {
        storageBufferSlots += 1
        storageBufferBytes += entry.bytes
      } else if (entry.usage === 'indirect') {
        indirectSlots += 1
        indirectBytes += entry.bytes
      } else {
        queueCounterSlots += 1
        queueCounterBytes += entry.bytes
      }
    })
    this.buffers.forEach((_entry, slot) => {
      bufferSlotKeys.push(slot)
    })

    let textureBytes = 0
    const textureSlotKeys: string[] = []
    this.textures.forEach((entry, slot) => {
      const bytesPerPixel = entry.format === 'rgba16float' ? 8 : 4
      textureBytes += entry.width * entry.height * entry.depthOrArrayLayers * bytesPerPixel
      textureSlotKeys.push(slot)
    })

    return {
      storageBufferSlots,
      textureSlots: this.textures.size,
      indirectSlots,
      queueCounterSlots,
      resourceBindings: this.resourceToSlot.size,
      storageBufferBytes,
      textureBytes,
      indirectBytes,
      queueCounterBytes,
      totalResidentBytes: storageBufferBytes + textureBytes + indirectBytes + queueCounterBytes,
      bufferSlotKeys: bufferSlotKeys.sort((left, right) => left.localeCompare(right)),
      textureSlotKeys: textureSlotKeys.sort((left, right) => left.localeCompare(right))
    }
  }

  dispose (): void {
    this.buffers.forEach((entry) => entry.buffer.destroy())
    this.textures.forEach((entry) => entry.texture.destroy())
    this.buffers.clear()
    this.textures.clear()
    this.resourceToSlot.clear()
    this.queueCounters.clear()
  }
}
