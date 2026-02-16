export const reduceMeanLumaCpu = (rgba: ArrayLike<number>): number => {
  const len = Math.floor(rgba.length / 4)
  if (len <= 0) return 0
  let sum = 0
  for (let index = 0; index < len; index += 1) {
    const offset = index * 4
    const r = Number(rgba[offset] ?? 0)
    const g = Number(rgba[offset + 1] ?? 0)
    const b = Number(rgba[offset + 2] ?? 0)
    sum += (r * 0.2126) + (g * 0.7152) + (b * 0.0722)
  }
  return sum / len
}

export const histogramLumaCpu = (rgba: ArrayLike<number>, bins = 256): Uint32Array => {
  const safeBins = Math.max(1, Math.floor(bins))
  const histogram = new Uint32Array(safeBins)
  const len = Math.floor(rgba.length / 4)
  for (let index = 0; index < len; index += 1) {
    const offset = index * 4
    const r = Number(rgba[offset] ?? 0)
    const g = Number(rgba[offset + 1] ?? 0)
    const b = Number(rgba[offset + 2] ?? 0)
    const luma = (r * 0.2126) + (g * 0.7152) + (b * 0.0722)
    const quantized = Math.max(0, Math.min(safeBins - 1, Math.floor(luma * (safeBins - 1))))
    histogram[quantized] += 1
  }
  return histogram
}

export const exclusiveScanU32Cpu = (input: ArrayLike<number>): Uint32Array => {
  const out = new Uint32Array(input.length)
  let running = 0
  for (let index = 0; index < input.length; index += 1) {
    out[index] = running >>> 0
    running = (running + (Number(input[index] ?? 0) >>> 0)) >>> 0
  }
  return out
}

export interface CompactionResultCpu {
  values: Uint32Array
  indices: Uint32Array
  count: number
}

export const compactByPredicateCpu = (
  input: ArrayLike<number>,
  predicate: (value: number, index: number) => boolean
): CompactionResultCpu => {
  const values: number[] = []
  const indices: number[] = []
  for (let index = 0; index < input.length; index += 1) {
    const value = Number(input[index] ?? 0)
    if (!predicate(value, index)) continue
    values.push(value >>> 0)
    indices.push(index >>> 0)
  }
  return {
    values: Uint32Array.from(values),
    indices: Uint32Array.from(indices),
    count: values.length
  }
}

export interface RadixSortPairCpu {
  key: number
  value: number
}

export const radixSortKeyValueU32Cpu = (pairs: RadixSortPairCpu[]): RadixSortPairCpu[] => pairs
  .map((pair, index) => ({
    key: pair.key >>> 0,
    value: pair.value >>> 0,
    _stableIndex: index
  }))
  .sort((left, right) => {
    if (left.key !== right.key) return left.key - right.key
    return left._stableIndex - right._stableIndex
  })
  .map(({ key, value }) => ({ key, value }))

export interface QueueStateCpu {
  active: Uint32Array
  count: number
  overflow: number
}

export const queueAppendConsumeCountCpu = (
  queue: QueueStateCpu,
  appended: ArrayLike<number>,
  capacity: number
): QueueStateCpu => {
  const safeCapacity = Math.max(0, Math.floor(capacity))
  const out: number[] = Array.from(queue.active.slice(0, Math.max(0, queue.count)))
  let overflow = queue.overflow
  for (let index = 0; index < appended.length; index += 1) {
    if (out.length >= safeCapacity) {
      overflow += 1
      continue
    }
    out.push(Number(appended[index] ?? 0) >>> 0)
  }
  return {
    active: Uint32Array.from(out),
    count: out.length,
    overflow
  }
}

export const scatterToTexture2DCpu = (
  width: number,
  height: number,
  points: Array<{ x: number, y: number, value: [number, number, number, number] }>
): Float32Array => {
  const w = Math.max(1, Math.floor(width))
  const h = Math.max(1, Math.floor(height))
  const out = new Float32Array(w * h * 4)
  points.forEach((point) => {
    const x = Math.max(0, Math.min(w - 1, Math.floor(point.x)))
    const y = Math.max(0, Math.min(h - 1, Math.floor(point.y)))
    const offset = ((y * w) + x) * 4
    out[offset] = point.value[0]
    out[offset + 1] = point.value[1]
    out[offset + 2] = point.value[2]
    out[offset + 3] = point.value[3]
  })
  return out
}

export const gatherFromTexture2DCpu = (
  width: number,
  height: number,
  texture: ArrayLike<number>,
  points: Array<{ x: number, y: number }>
): Array<[number, number, number, number]> => {
  const w = Math.max(1, Math.floor(width))
  const h = Math.max(1, Math.floor(height))
  return points.map((point) => {
    const x = Math.max(0, Math.min(w - 1, Math.floor(point.x)))
    const y = Math.max(0, Math.min(h - 1, Math.floor(point.y)))
    const offset = ((y * w) + x) * 4
    return [
      Number(texture[offset] ?? 0),
      Number(texture[offset + 1] ?? 0),
      Number(texture[offset + 2] ?? 0),
      Number(texture[offset + 3] ?? 0)
    ]
  })
}

export const pyramidDownsampleCpu = (
  width: number,
  height: number,
  texture: ArrayLike<number>
): { width: number, height: number, data: Float32Array } => {
  const srcW = Math.max(1, Math.floor(width))
  const srcH = Math.max(1, Math.floor(height))
  const dstW = Math.max(1, Math.ceil(srcW / 2))
  const dstH = Math.max(1, Math.ceil(srcH / 2))
  const out = new Float32Array(dstW * dstH * 4)

  const sample = (x: number, y: number, lane: number): number => {
    const sx = Math.max(0, Math.min(srcW - 1, x))
    const sy = Math.max(0, Math.min(srcH - 1, y))
    return Number(texture[((sy * srcW) + sx) * 4 + lane] ?? 0)
  }

  for (let y = 0; y < dstH; y += 1) {
    for (let x = 0; x < dstW; x += 1) {
      const dstOffset = ((y * dstW) + x) * 4
      const sx = x * 2
      const sy = y * 2
      for (let lane = 0; lane < 4; lane += 1) {
        out[dstOffset + lane] = (
          sample(sx, sy, lane) +
          sample(sx + 1, sy, lane) +
          sample(sx, sy + 1, lane) +
          sample(sx + 1, sy + 1, lane)
        ) * 0.25
      }
    }
  }

  return { width: dstW, height: dstH, data: out }
}

export const pyramidUpsampleCpu = (
  width: number,
  height: number,
  texture: ArrayLike<number>,
  targetWidth: number,
  targetHeight: number
): Float32Array => {
  const srcW = Math.max(1, Math.floor(width))
  const srcH = Math.max(1, Math.floor(height))
  const dstW = Math.max(1, Math.floor(targetWidth))
  const dstH = Math.max(1, Math.floor(targetHeight))
  const out = new Float32Array(dstW * dstH * 4)

  for (let y = 0; y < dstH; y += 1) {
    for (let x = 0; x < dstW; x += 1) {
      const sx = Math.max(0, Math.min(srcW - 1, Math.floor((x / Math.max(dstW - 1, 1)) * Math.max(srcW - 1, 1))))
      const sy = Math.max(0, Math.min(srcH - 1, Math.floor((y / Math.max(dstH - 1, 1)) * Math.max(srcH - 1, 1))))
      const srcOffset = ((sy * srcW) + sx) * 4
      const dstOffset = ((y * dstW) + x) * 4
      out[dstOffset] = Number(texture[srcOffset] ?? 0)
      out[dstOffset + 1] = Number(texture[srcOffset + 1] ?? 0)
      out[dstOffset + 2] = Number(texture[srcOffset + 2] ?? 0)
      out[dstOffset + 3] = Number(texture[srcOffset + 3] ?? 0)
    }
  }

  return out
}

