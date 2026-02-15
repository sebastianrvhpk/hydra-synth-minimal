import type { WebGPUCapabilities } from '../webgpu/renderer.js'

export type HydraWorkloadClass = 'image' | 'data' | 'reduction' | 'sparse_queue' | 'mixed'

export interface HydraCapabilityMatrix {
  subgroups: boolean
  maxWorkgroupStorageBytes: number
  indirectDispatch: boolean
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
  dispatchCount?: number
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
  avgDispatchCount: number
  fallbackRate: number
  peakResidentBytes: number
  capabilityMatrix: HydraCapabilityMatrix
}

export const buildCapabilityMatrix = (capabilities: WebGPUCapabilities | null | undefined): HydraCapabilityMatrix => {
  const features = new Set(capabilities?.features ?? [])
  return {
    subgroups: Boolean(capabilities?.subgroups?.supported),
    maxWorkgroupStorageBytes: capabilities?.compute?.maxComputeWorkgroupStorageSize ?? 0,
    indirectDispatch: true,
    timestampQuery: features.has('timestamp-query')
  }
}

