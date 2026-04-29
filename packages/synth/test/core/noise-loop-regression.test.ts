import { describe, expect, it } from 'vitest'
import { HydraTransformRegistry, type HydraCompiledPass, type HydraOutputAdapter } from '../../src/core/index.ts'

class CaptureOutput implements HydraOutputAdapter {
  passes: HydraCompiledPass[] = []

  render (passes: HydraCompiledPass[]): void {
    this.passes = passes
  }
}

const LOOP_RADIUS_EPSILON = 0.0001
const TAU = Math.PI * 2
const f32 = Math.fround
const RANK_BIAS = [f32(1.0e-7), f32(2.0e-7), f32(3.0e-7), f32(4.0e-7)] as const

const dot4 = (
  left: [number, number, number, number],
  right: [number, number, number, number]
): number => f32(
  f32(
    f32(
      f32(left[0] * right[0]) + f32(left[1] * right[1])
    ) + f32(left[2] * right[2])
  ) + f32(left[3] * right[3])
)

const hydraNoise4RankInput = (
  value: [number, number, number, number]
): [number, number, number, number] => {
  const skew = f32(0.30901699437494745)
  const corner = f32(0.138196601125011)
  const skewDot = dot4(value, [skew, skew, skew, skew])
  const i = [
    Math.floor(f32(value[0] + skewDot)),
    Math.floor(f32(value[1] + skewDot)),
    Math.floor(f32(value[2] + skewDot)),
    Math.floor(f32(value[3] + skewDot))
  ] as const
  const cornerDot = f32((i[0] + i[1] + i[2] + i[3]) * corner)
  return [
    f32(value[0] - i[0] + cornerDot),
    f32(value[1] - i[1] + cornerDot),
    f32(value[2] - i[2] + cornerDot),
    f32(value[3] - i[3] + cornerDot)
  ]
}

const hasRankTie = (
  rankInput: [number, number, number, number]
): boolean => (
  rankInput[0] === rankInput[1] ||
  rankInput[0] === rankInput[2] ||
  rankInput[0] === rankInput[3] ||
  rankInput[1] === rankInput[2] ||
  rankInput[1] === rankInput[3] ||
  rankInput[2] === rankInput[3]
)

const longestDiagonalRun = (grid: boolean[][]): number => {
  const height = grid.length
  if (height === 0) return 0
  const width = grid[0]?.length ?? 0
  let maxRun = 0

  const scan = (startX: number, startY: number): void => {
    let run = 0
    let x = startX
    let y = startY
    while (x < width && y < height) {
      if (grid[y]?.[x]) {
        run += 1
        if (run > maxRun) maxRun = run
      } else {
        run = 0
      }
      x += 1
      y += 1
    }
  }

  for (let x = 0; x < width; x += 1) scan(x, 0)
  for (let y = 1; y < height; y += 1) scan(0, y)

  return maxRun
}

const seamTieStats = (
  {
    width,
    height,
    scale,
    speed,
    radius,
    time
  }: {
    width: number
    height: number
    scale: number
    speed: number
    radius: number
    time: number
  },
  withBias: boolean
): { tieCount: number, longestRun: number } => {
  const phase = f32(time * speed * TAU)
  const loopRadius = f32(Math.max(radius, LOOP_RADIUS_EPSILON))
  const z = f32(Math.cos(phase) * loopRadius)
  const w = f32(Math.sin(phase) * loopRadius)
  const tieGrid = Array.from({ length: height }, () => new Array<boolean>(width).fill(false))
  let tieCount = 0

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const stX = f32(((x + 0.5) / width) * scale)
      const stY = f32(((y + 0.5) / height) * scale)
      const x0 = hydraNoise4RankInput([stX, stY, z, w])
      const rankInput = withBias
        ? ([
            f32(x0[0] + RANK_BIAS[0]),
            f32(x0[1] + RANK_BIAS[1]),
            f32(x0[2] + RANK_BIAS[2]),
            f32(x0[3] + RANK_BIAS[3])
          ] as [number, number, number, number])
        : x0

      const tied = hasRankTie(rankInput)
      tieGrid[y][x] = tied
      if (tied) tieCount += 1
    }
  }

  return {
    tieCount,
    longestRun: longestDiagonalRun(tieGrid)
  }
}

const phaseAt = (time: number, speed: number): number => time * speed * TAU

const loopOrbit = (
  time: number,
  speed: number,
  radius: number
): { x: number, y: number, effectiveRadius: number } => {
  const effectiveRadius = Math.max(radius, LOOP_RADIUS_EPSILON)
  const phase = phaseAt(time, speed)
  return {
    x: Math.cos(phase) * effectiveRadius,
    y: Math.sin(phase) * effectiveRadius,
    effectiveRadius
  }
}

describe('noiseLoop regression coverage', () => {
  it('preserves speed-as-period semantics and loop closure', () => {
    const speed = 0.37
    const radius = 0.8
    const periodSeconds = 1 / speed

    const start = loopOrbit(0, speed, radius)
    const quarter = loopOrbit(periodSeconds * 0.25, speed, radius)
    const full = loopOrbit(periodSeconds, speed, radius)

    expect(start.effectiveRadius).toBeCloseTo(radius, 7)
    expect(Math.hypot(start.x, start.y)).toBeCloseTo(radius, 6)
    expect(Math.hypot(quarter.x, quarter.y)).toBeCloseTo(radius, 6)
    expect(quarter.x).toBeCloseTo(0, 6)
    expect(quarter.y).toBeCloseTo(radius, 6)
    expect(full.x).toBeCloseTo(start.x, 6)
    expect(full.y).toBeCloseTo(start.y, 6)
  })

  it('clamps non-positive loop radius to a stable epsilon', () => {
    const zero = loopOrbit(0.25, 0.2, 0)
    const negative = loopOrbit(0.25, 0.2, -10)

    expect(zero.effectiveRadius).toBeCloseTo(LOOP_RADIUS_EPSILON, 9)
    expect(negative.effectiveRadius).toBeCloseTo(LOOP_RADIUS_EPSILON, 9)
  })

  it('uses deterministic rank bias to remove diagonal tie seams in hydraNoise4 ranking', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })
    registry.generators.noiseLoop(6.0, 0.2, 0.8).out()
    const wgsl = output.passes[0]?.wgsl ?? ''

    expect(wgsl).toContain('let rankInput = x0 + vec4f(1.0e-7, 2.0e-7, 3.0e-7, 4.0e-7);')

    const oldStats = seamTieStats({
      width: 96,
      height: 96,
      scale: 6,
      speed: 0.2,
      radius: 0.8,
      time: 0.37
    }, false)
    const fixedStats = seamTieStats({
      width: 96,
      height: 96,
      scale: 6,
      speed: 0.2,
      radius: 0.8,
      time: 0.37
    }, true)

    expect(oldStats.tieCount).toBeGreaterThan(0)
    expect(oldStats.longestRun).toBeGreaterThan(32)
    expect(fixedStats.tieCount).toBe(0)
    expect(fixedStats.longestRun).toBe(0)
  })
})
