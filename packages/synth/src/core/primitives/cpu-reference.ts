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

  const sample = (x: number, y: number, lane: number): number => {
    const sx = Math.max(0, Math.min(srcW - 1, x))
    const sy = Math.max(0, Math.min(srcH - 1, y))
    return Number(texture[((sy * srcW) + sx) * 4 + lane] ?? 0)
  }

  for (let y = 0; y < dstH; y += 1) {
    for (let x = 0; x < dstW; x += 1) {
      const dstOffset = ((y * dstW) + x) * 4
      const sx = Math.floor((x / dstW) * srcW)
      const sy = Math.floor((y / dstH) * srcH)
      for (let lane = 0; lane < 4; lane += 1) {
        out[dstOffset + lane] = sample(sx, sy, lane)
      }
    }
  }

  return out
}
