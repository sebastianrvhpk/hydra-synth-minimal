import { getBenchmarkSceneDefinition } from './corpus.js'
import { buildCapabilityMatrix, type HydraBenchmarkReport, type HydraBenchmarkSample } from './types.js'
import type { WebGPUCapabilities } from '../webgpu/renderer.js'

const toFinite = (value: unknown): number => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return numeric
}

const average = (values: number[]): number => {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

const percentile = (values: number[], ratio: number): number => {
  if (values.length === 0) return 0
  const sorted = values.slice().sort((left, right) => left - right)
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio)))
  return sorted[index] ?? 0
}

export interface BuildBenchmarkReportOptions {
  sceneId: string
  samples: HydraBenchmarkSample[]
  capabilities?: WebGPUCapabilities | null
  baseline?: HydraBenchmarkReport | null
}

export const buildBenchmarkReport = ({
  sceneId,
  samples,
  capabilities = null,
  baseline = null
}: BuildBenchmarkReportOptions): HydraBenchmarkReport => {
  const scene = getBenchmarkSceneDefinition(sceneId)
  if (!scene) throw new Error(`Unknown benchmark scene "${sceneId}".`)
  if (baseline && baseline.sceneId !== scene.id) {
    throw new Error(`Baseline scene "${baseline.sceneId}" does not match "${scene.id}".`)
  }

  const frameTimes = samples.map((sample) => toFinite(sample.frameMs))
  const cpuTimes = samples.map((sample) => toFinite(sample.cpuEncodeMs))
  const gpuTimes = samples
    .map((sample) => sample.gpuMs)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  const dispatchCounts = samples.map((sample) => toFinite(sample.dispatchCount))
  const fallbackCounts = samples.map((sample) => toFinite(sample.fallbackCount))
  const residentBytes = samples.map((sample) => Math.max(0, Math.floor(toFinite(sample.residentBytes))))

  const totalFallbackCount = fallbackCounts.reduce((sum, value) => sum + value, 0)
  const totalDispatchCount = dispatchCounts.reduce((sum, value) => sum + value, 0)
  const fallbackRate = totalDispatchCount > 0 ? totalFallbackCount / totalDispatchCount : 0

  const report: HydraBenchmarkReport = {
    sceneId: scene.id,
    workloadClass: scene.workloadClass,
    frameCount: samples.length,
    avgFrameMs: average(frameTimes),
    p95FrameMs: percentile(frameTimes, 0.95),
    p99FrameMs: percentile(frameTimes, 0.99),
    avgCpuEncodeMs: average(cpuTimes),
    avgGpuMs: gpuTimes.length > 0 ? average(gpuTimes) : null,
    avgDispatchCount: average(dispatchCounts),
    fallbackRate,
    peakResidentBytes: residentBytes.length > 0 ? Math.max(...residentBytes) : 0,
    capabilityMatrix: buildCapabilityMatrix(capabilities)
  }
  if (baseline) {
    report.deltaFromBaseline = {
      avgFrameMs: report.avgFrameMs - baseline.avgFrameMs,
      p95FrameMs: report.p95FrameMs - baseline.p95FrameMs,
      p99FrameMs: report.p99FrameMs - baseline.p99FrameMs,
      avgCpuEncodeMs: report.avgCpuEncodeMs - baseline.avgCpuEncodeMs,
      avgGpuMs: (
        typeof report.avgGpuMs === 'number' &&
        Number.isFinite(report.avgGpuMs) &&
        typeof baseline.avgGpuMs === 'number' &&
        Number.isFinite(baseline.avgGpuMs)
      )
        ? report.avgGpuMs - baseline.avgGpuMs
        : null,
      avgDispatchCount: report.avgDispatchCount - baseline.avgDispatchCount,
      fallbackRate: report.fallbackRate - baseline.fallbackRate,
      peakResidentBytes: report.peakResidentBytes - baseline.peakResidentBytes
    }
  } else {
    report.deltaFromBaseline = null
  }
  return report
}

export interface ValidateBenchmarkReportResult {
  ok: boolean
  failures: string[]
}

export const validateBenchmarkReport = (report: HydraBenchmarkReport): ValidateBenchmarkReportResult => {
  const scene = getBenchmarkSceneDefinition(report.sceneId)
  if (!scene) {
    return { ok: false, failures: [`Unknown benchmark scene "${report.sceneId}".`] }
  }

  const failures: string[] = []
  if (typeof scene.acceptance.maxAvgFrameMs === 'number' && report.avgFrameMs > scene.acceptance.maxAvgFrameMs) {
    failures.push(`avgFrameMs ${report.avgFrameMs.toFixed(3)} exceeded ${scene.acceptance.maxAvgFrameMs.toFixed(3)}`)
  }
  if (typeof scene.acceptance.maxP95FrameMs === 'number' && report.p95FrameMs > scene.acceptance.maxP95FrameMs) {
    failures.push(`p95FrameMs ${report.p95FrameMs.toFixed(3)} exceeded ${scene.acceptance.maxP95FrameMs.toFixed(3)}`)
  }
  if (typeof scene.acceptance.maxFallbackRate === 'number' && report.fallbackRate > scene.acceptance.maxFallbackRate) {
    failures.push(`fallbackRate ${report.fallbackRate.toFixed(3)} exceeded ${scene.acceptance.maxFallbackRate.toFixed(3)}`)
  }

  return {
    ok: failures.length === 0,
    failures
  }
}
