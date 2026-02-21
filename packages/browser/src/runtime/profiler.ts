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
    runCount: number
    fallbackCount: number
    cpuEncodeMsAvg: number
    cpuEncodeMsLast: number
    gpuMsLast: number | null
    gpuMsAvg: number | null
    gpuTimingSource: 'timestamp_query' | 'cpu_encode_fallback' | 'history_fallback' | 'unavailable'
    variant: 'fragment'
  }>
  resources: {
    residentBytesEstimate: number
    residency?: null
  }
  scheduler: {
    fallbackRate: number
    routingConfiguredMode: 'fragment' | 'auto'
    routingActiveMode: 'fragment'
    routingCompileFailures: number
    routingRouteFailureCount: number
  }
  capability: {
    features: string[]
    fragment: {
      targetFormat: string
      maxColorAttachments: number
    } | null
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
    configuredMode: 'fragment' | 'auto'
    activeMode: 'fragment'
    compileFailures: number
    routeFailureCount: number
  } | null
}): HydraProfilerSnapshot => {
  const avgFrameMs = frameTimesMs.length > 0
    ? frameTimesMs.reduce((sum, value) => sum + value, 0) / frameTimesMs.length
    : 0

  const passes: HydraProfilerSnapshot['passes'] = {}
  let totalRunCount = 0
  let totalFallbackCount = 0
  outputs.forEach((output, index) => {
    const stats = output.getPassStats()
    Object.entries(stats).forEach(([signature, value]) => {
      const key = `o${index}:${signature}`
      const runCount = Math.max(0, Number(value.runCount ?? 0))
      const fallbackCount = Math.max(0, Number(value.fallbackCount ?? 0))
      const variant = value.variant ?? 'fragment'
      const gpuTimingSource = value.gpuTimingSource ?? (value.lastGpuMs != null ? 'cpu_encode_fallback' : 'unavailable')
      totalRunCount += runCount
      totalFallbackCount += fallbackCount
      passes[key] = {
        runCount,
        fallbackCount,
        cpuEncodeMsAvg: value.avgCpuEncodeMs,
        cpuEncodeMsLast: value.lastCpuEncodeMs,
        gpuMsLast: value.lastGpuMs ?? null,
        gpuMsAvg: value.avgGpuMs ?? null,
        gpuTimingSource,
        variant
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
      fallbackRate: totalRunCount > 0 ? totalFallbackCount / totalRunCount : 0,
      routingConfiguredMode: routingMetrics?.configuredMode ?? 'fragment',
      routingActiveMode: routingMetrics?.activeMode ?? 'fragment',
      routingCompileFailures: Math.max(0, Math.floor(routingMetrics?.compileFailures ?? 0)),
      routingRouteFailureCount: Math.max(0, Math.floor(routingMetrics?.routeFailureCount ?? 0))
    },
    capability: {
      features: capabilities?.features ?? [],
      fragment: capabilities
        ? {
            targetFormat: capabilities.fragment.targetFormat,
            maxColorAttachments: capabilities.fragment.maxColorAttachments
          }
        : null
    }
  }
}
