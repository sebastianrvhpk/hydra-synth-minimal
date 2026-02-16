import type { HydraResourceResidencySnapshot } from './resource-manager.js'
import type { WebGPUOutputNode } from './output-node.js'
import type { WebGPUCapabilities } from '../webgpu/renderer.js'
import type { HydraQueueTerminationReason } from './queue.js'

export interface HydraProfilerSnapshot {
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
    gpuTimingSource: 'timestamp_query' | 'cpu_encode_fallback' | 'history_fallback' | 'unavailable'
    variant: 'generic' | 'tiled' | 'subgroup'
    dispatchDomain: 'pixel2d' | 'linear1d'
    lastWorkgroups: [number, number, number]
  }>
  resources: {
    residentBytesEstimate: number
    residency?: HydraResourceResidencySnapshot | null
  }
  scheduler: {
    fallbackRate: number
    queueIterations: number
    queueOverflowCount: number
    queueOverflowEvents: number
    queueIndirectDispatches: number
    queueConvergenceChecks: number
    queueTerminationReason: HydraQueueTerminationReason | 'none' | 'mixed'
    queueChecksPerSegment: number[]
    routingConfiguredMode: 'legacy' | 'compute' | 'auto'
    routingActiveMode: 'legacy' | 'compute'
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

const summarizeQueueTermination = (
  reasons: HydraQueueTerminationReason[] | null | undefined
): HydraProfilerSnapshot['scheduler']['queueTerminationReason'] => {
  if (!Array.isArray(reasons) || reasons.length <= 0) return 'none'
  const normalized = reasons.filter((value): value is HydraQueueTerminationReason => typeof value === 'string')
  if (normalized.length <= 0) return 'none'
  const unique = Array.from(new Set(normalized))
  if (unique.length === 1) return unique[0] as HydraQueueTerminationReason
  return 'mixed'
}

export const buildProfilerSnapshot = ({
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
  residency?: HydraResourceResidencySnapshot | null
  queueMetrics?: {
    iterations: number
    overflowCount: number
    overflowEvents: number
    indirectDispatches: number
    convergenceChecks: number
    terminationReasons: HydraQueueTerminationReason[]
    checksPerSegment: number[]
  } | null
  routingMetrics?: {
    configuredMode: 'legacy' | 'compute' | 'auto'
    activeMode: 'legacy' | 'compute'
    compileFailures: number
    fallbackCount: number
  } | null
}): HydraProfilerSnapshot => {
  const avgFrameMs = frameTimesMs.length > 0
    ? frameTimesMs.reduce((sum, value) => sum + value, 0) / frameTimesMs.length
    : 0

  const passes: HydraProfilerSnapshot['passes'] = {}
  let totalDispatchCount = 0
  let totalFallbackCount = 0
  const queueChecksPerSegment = Array.isArray(queueMetrics?.checksPerSegment)
    ? queueMetrics.checksPerSegment
    : []
  outputs.forEach((output, index) => {
    const stats = output.getPassStats()
    Object.entries(stats).forEach(([signature, value]) => {
      const key = `o${index}:${signature}`
      const dispatchCount = Math.max(0, Number(value.dispatchCount ?? 0))
      const fallbackCount = Math.max(0, Number(value.fallbackCount ?? 0))
      const variant = value.variant ?? 'generic'
      const gpuTimingSource = value.gpuTimingSource ?? (value.lastGpuMs != null ? 'cpu_encode_fallback' : 'unavailable')
      totalDispatchCount += dispatchCount
      totalFallbackCount += fallbackCount
      passes[key] = {
        dispatchCount,
        fallbackCount,
        cpuEncodeMsAvg: value.avgCpuEncodeMs,
        cpuEncodeMsLast: value.lastCpuEncodeMs,
        gpuMsLast: value.lastGpuMs ?? null,
        gpuMsAvg: value.avgGpuMs ?? null,
        gpuTimingSource,
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
      queueOverflowEvents: Math.max(0, Math.floor(queueMetrics?.overflowEvents ?? 0)),
      queueIndirectDispatches: Math.max(0, Math.floor(queueMetrics?.indirectDispatches ?? 0)),
      queueConvergenceChecks: Math.max(0, Math.floor(queueMetrics?.convergenceChecks ?? 0)),
      queueTerminationReason: summarizeQueueTermination(queueMetrics?.terminationReasons ?? null),
      queueChecksPerSegment: queueChecksPerSegment.map((value) => Math.max(0, Math.floor(Number(value) || 0))),
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
