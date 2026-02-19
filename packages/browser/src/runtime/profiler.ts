import type { WebGPUOutputNode } from './output-node.js'
import type { WebGPUCapabilities } from '../webgpu/renderer.js'

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
    dispatchDomain: 'pixel2d'
    lastWorkgroups: [number, number, number]
  }>
  resources: {
    residentBytesEstimate: number
    residency?: null
  }
  scheduler: {
    fallbackRate: number
    routingConfiguredMode: 'compute' | 'auto'
    routingActiveMode: 'compute'
    routingCompileFailures: number
    routingRouteFailureCount: number
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

export const buildProfilerSnapshot = ({
  frameTimesMs,
  outputs,
  capabilities,
  residentBytesEstimate = 0,
  routingMetrics = null
}: {
  frameTimesMs: number[]
  outputs: WebGPUOutputNode[]
  capabilities: WebGPUCapabilities | null
  residentBytesEstimate?: number
  routingMetrics?: {
    configuredMode: 'compute' | 'auto'
    activeMode: 'compute'
    compileFailures: number
    routeFailureCount: number
  } | null
}): HydraProfilerSnapshot => {
  const avgFrameMs = frameTimesMs.length > 0
    ? frameTimesMs.reduce((sum, value) => sum + value, 0) / frameTimesMs.length
    : 0

  const passes: HydraProfilerSnapshot['passes'] = {}
  let totalDispatchCount = 0
  let totalFallbackCount = 0
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
        dispatchDomain: 'pixel2d',
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
      residency: null
    },
    scheduler: {
      fallbackRate: totalDispatchCount > 0 ? totalFallbackCount / totalDispatchCount : 0,
      routingConfiguredMode: routingMetrics?.configuredMode ?? 'compute',
      routingActiveMode: routingMetrics?.activeMode ?? 'compute',
      routingCompileFailures: Math.max(0, Math.floor(routingMetrics?.compileFailures ?? 0)),
      routingRouteFailureCount: Math.max(0, Math.floor(routingMetrics?.routeFailureCount ?? 0))
    },
    capability: {
      features: capabilities?.features ?? [],
      compute: capabilities?.compute ?? null,
      subgroups: capabilities?.subgroups ?? null
    }
  }
}
