# hydra-synth

Browser host/runtime package for Hydra v2.

## Includes

- `BrowserHost` (canvas + RAF lifecycle)
- `WebGPURenderer` (WebGPU device/context, output presentation)
- `HydraBrowserRuntime` (core engine + registry + host + renderer composition)
- `HydraSourceNode` and `WebGPUOutputNode` adapters
- output dependency scheduling (topological when possible, stable order fallback on cycles)
- compute-plan execution route (`compileGraph` + `HydraExecutor`) with deterministic legacy fallback
- runtime profiler snapshots (`getProfilerSnapshot`) and autotune profile helpers
- queue execution utilities and resource residency tracking helpers
- benchmark utilities (`BENCHMARK_CORPUS`, report build/validation helpers)

Use `createHydraBrowserRuntime()` for default composition, or wire `BrowserHost` + `WebGPURenderer` manually.

## Execution Modes

`HydraBrowserRuntime` supports:

- `auto` (default): prefer compute-plan routing, fallback to legacy pass rendering on route failures
- `compute`: force compute-plan routing first, same deterministic fallback behavior
- `legacy`: always render legacy pass chains

## Capture APIs

```ts
import {
  buildFfmpegCommands,
  captureHydraFrameSequence,
  captureHydraVideo,
  createHydraBrowserRuntime
} from 'hydra-synth'

const runtime = createHydraBrowserRuntime({ autoLoop: false })
await runtime.init()

const sequence = await captureHydraFrameSequence({
  runtime,
  fps: 60,
  duration: 2,
  extension: 'png',
  gpuReadback: 'auto'
})

const videoBlob = await captureHydraVideo({
  runtime,
  fps: 60,
  duration: 2
})

const ffmpeg = buildFfmpegCommands(sequence)
console.log(ffmpeg.mp4)
console.log(videoBlob.type)
```

`captureHydraFrameSequence` and `captureHydraVideo` stop the runtime loop, step deterministically, optionally wait for GPU work completion, and restore runtime state after capture.
