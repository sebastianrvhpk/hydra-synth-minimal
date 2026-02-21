import type { WebGPUCapabilities } from '../webgpu/renderer.js'

export type HydraWorkloadClass = 'image'

export interface HydraCapabilityMatrix {
  targetFormat: string
  maxColorAttachments: number
  timestampQuery: boolean
}

export interface HydraBenchmarkAcceptanceGate {
  maxAvgFrameMs?: number
  maxP95FrameMs?: number
  maxFallbackRate?: number
}

export interface HydraBenchmarkSceneDefinition {
  id: string
  workloadClass: HydraWorkloadClass
  description: string
  acceptance: HydraBenchmarkAcceptanceGate
}

export interface HydraBenchmarkSample {
  frameMs: number
  cpuEncodeMs?: number
  gpuMs?: number | null
  runCount?: number
  fallbackCount?: number
  residentBytes?: number
}

export interface HydraBenchmarkReport {
  sceneId: string
  workloadClass: HydraWorkloadClass
  frameCount: number
  avgFrameMs: number
  p95FrameMs: number
  p99FrameMs: number
  avgCpuEncodeMs: number
  avgGpuMs: number | null
  avgRunCount: number
  fallbackRate: number
  peakResidentBytes: number
  deltaFromBaseline?: HydraBenchmarkDelta | null
  capabilityMatrix: HydraCapabilityMatrix
}

export interface HydraBenchmarkDelta {
  avgFrameMs: number
  p95FrameMs: number
  p99FrameMs: number
  avgCpuEncodeMs: number
  avgGpuMs: number | null
  avgRunCount: number
  fallbackRate: number
  peakResidentBytes: number
}

export const buildCapabilityMatrix = (capabilities: WebGPUCapabilities | null | undefined): HydraCapabilityMatrix => {
  const features = new Set(capabilities?.features ?? [])
  return {
    targetFormat: capabilities?.fragment?.targetFormat ?? 'unknown',
    maxColorAttachments: capabilities?.fragment?.maxColorAttachments ?? 0,
    timestampQuery: features.has('timestamp-query')
  }
}
