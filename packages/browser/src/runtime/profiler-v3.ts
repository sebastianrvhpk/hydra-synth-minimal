import type { HydraResourceResidencySnapshotV3 } from './resource-manager-v3.js'
import type { WebGPUOutputNode } from './output-node.js'
import type { WebGPUCapabilities } from '../webgpu/renderer.js'

export interface HydraProfilerSnapshotV3 {
  frameWindow: {
    avgFrameMs: number
    p95FrameMs: number
    p99FrameMs: number
    frameCount: number
  }
  passes: Record<string, {
    dispatchCount: number
    fallbackCount: number
    cpuEncodeMsAvg: number
    cpuEncodeMsLast: number
    gpuMsLast: number | null
    gpuMsAvg: number | null
    variant: 'generic' | 'tiled' | 'subgroup'
    dispatchDomain: 'pixel2d' | 'linear1d'
    lastWorkgroups: [number, number, number]
  }>
  resources: {
    residentBytesEstimate: number
    residency?: HydraResourceResidencySnapshotV3 | null
  }
  scheduler: {
    fallbackRate: number
    queueIterations: number
    queueOverflowCount: number
    queueIndirectDispatches: number
    queueConvergenceChecks: number
    routingConfiguredMode: 'legacy' | 'v3' | 'auto'
    routingActiveMode: 'legacy' | 'v3'
    routingCompileFailures: number
    routingFallbackCount: number
  }
  capability: {
    features: string[]
    compute: WebGPUCapabilities['compute'] | null
    subgroups: WebGPUCapabilities['subgroups'] | null
  }
}

const percentile = (values: number[], ratio: number): number => {
  if (values.length === 0) return 0
  const sorted = values.slice().sort((left, right) => left - right)
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio)))
  return sorted[index] ?? 0
}

export const buildProfilerSnapshotV3 = ({
  frameTimesMs,
  outputs,
  capabilities,
  residentBytesEstimate = 0,
  residency = null,
  queueMetrics = null,
  routingMetrics = null
}: {
  frameTimesMs: number[]
  outputs: WebGPUOutputNode[]
  capabilities: WebGPUCapabilities | null
  residentBytesEstimate?: number
  residency?: HydraResourceResidencySnapshotV3 | null
  queueMetrics?: {
    iterations: number
    overflowCount: number
    indirectDispatches: number
    convergenceChecks: number
  } | null
  routingMetrics?: {
    configuredMode: 'legacy' | 'v3' | 'auto'
    activeMode: 'legacy' | 'v3'
    compileFailures: number
    fallbackCount: number
  } | null
}): HydraProfilerSnapshotV3 => {
  const avgFrameMs = frameTimesMs.length > 0
    ? frameTimesMs.reduce((sum, value) => sum + value, 0) / frameTimesMs.length
    : 0

  const passes: HydraProfilerSnapshotV3['passes'] = {}
  let totalDispatchCount = 0
  let totalFallbackCount = 0
  outputs.forEach((output, index) => {
    const stats = output.getPassStats()
    Object.entries(stats).forEach(([signature, value]) => {
      const key = `o${index}:${signature}`
      const dispatchCount = Math.max(0, Number(value.dispatchCount ?? 0))
      const fallbackCount = Math.max(0, Number(value.fallbackCount ?? 0))
      const variant = value.variant ?? 'generic'
      totalDispatchCount += dispatchCount
      totalFallbackCount += fallbackCount
      passes[key] = {
        dispatchCount,
        fallbackCount,
        cpuEncodeMsAvg: value.avgCpuEncodeMs,
        cpuEncodeMsLast: value.lastCpuEncodeMs,
        gpuMsLast: value.lastGpuMs ?? null,
        gpuMsAvg: value.avgGpuMs ?? null,
        variant,
        dispatchDomain: value.dispatchDomain ?? 'pixel2d',
        lastWorkgroups: value.lastWorkgroups ?? [0, 0, 0]
      }
    })
  })

  return {
    frameWindow: {
      avgFrameMs,
      p95FrameMs: percentile(frameTimesMs, 0.95),
      p99FrameMs: percentile(frameTimesMs, 0.99),
      frameCount: frameTimesMs.length
    },
    passes,
    resources: {
      residentBytesEstimate: Math.max(0, Math.floor(residentBytesEstimate)),
      residency
    },
    scheduler: {
      fallbackRate: totalDispatchCount > 0 ? totalFallbackCount / totalDispatchCount : 0,
      queueIterations: Math.max(0, Math.floor(queueMetrics?.iterations ?? 0)),
      queueOverflowCount: Math.max(0, Math.floor(queueMetrics?.overflowCount ?? 0)),
      queueIndirectDispatches: Math.max(0, Math.floor(queueMetrics?.indirectDispatches ?? 0)),
      queueConvergenceChecks: Math.max(0, Math.floor(queueMetrics?.convergenceChecks ?? 0)),
      routingConfiguredMode: routingMetrics?.configuredMode ?? 'legacy',
      routingActiveMode: routingMetrics?.activeMode ?? 'legacy',
      routingCompileFailures: Math.max(0, Math.floor(routingMetrics?.compileFailures ?? 0)),
      routingFallbackCount: Math.max(0, Math.floor(routingMetrics?.fallbackCount ?? 0))
    },
    capability: {
      features: capabilities?.features ?? [],
      compute: capabilities?.compute ?? null,
      subgroups: capabilities?.subgroups ?? null
    }
  }
}
