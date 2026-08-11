import {
  captureHydraFrameSequence,
  captureHydraVideo,
  type CaptureFrameSequenceResult,
  type CaptureHydraFrameSequenceOptions,
  type CaptureHydraVideoOptions
} from './capture/frame-sequence.js'
import { BrowserHost, type BrowserHostOptions } from './runtime/browser-host.js'
import { AutoRenderer } from './runtime/auto-renderer.js'
import type { HydraRendererBackend, HydraRendererPreference } from './runtime/renderer.js'
import { HydraBrowserRuntime, type HydraBrowserRuntimeOptions } from './runtime/runtime.js'

export { captureHydraFrameSequence, captureHydraVideo }

export type {
  CaptureFrameSequenceResult,
  CaptureHydraFrameSequenceOptions,
  CaptureHydraVideoOptions
}

export interface CreateHydraBrowserRuntimeOptions extends Omit<HydraBrowserRuntimeOptions, 'host' | 'renderer'> {
  canvas?: HTMLCanvasElement
  width?: number
  height?: number
  parent?: HTMLElement
  autoAppend?: boolean
  backend?: HydraRendererPreference
}

export type { HydraRendererBackend, HydraRendererPreference }

export const createHydraBrowserRuntime = (options: CreateHydraBrowserRuntimeOptions = {}): HydraBrowserRuntime => {
  const { canvas, width, height, parent, autoAppend, backend, ...runtimeOptions } = options
  const hostOptions: BrowserHostOptions = {
    ...(canvas ? { canvas } : {}),
    ...(width != null ? { width } : {}),
    ...(height != null ? { height } : {}),
    ...(parent ? { parent } : {}),
    ...(autoAppend != null ? { autoAppend } : {})
  }
  const host = new BrowserHost(hostOptions)
  const renderer = new AutoRenderer({
    canvas: host.canvas,
    ...(width != null ? { width } : {}),
    ...(height != null ? { height } : {}),
    ...(backend ? { backend } : {})
  })
  return new HydraBrowserRuntime({ ...runtimeOptions, host, renderer })
}
