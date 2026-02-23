# hydra-synth

Browser host/runtime package for Hydra v2.

## Includes

- `BrowserHost` (canvas + RAF lifecycle)
- `WebGPURenderer` (WebGPU device/context, output presentation)
- `HydraBrowserRuntime` (core engine + registry + host + renderer composition)
- `HydraSourceNode` and `WebGPUOutputNode` adapters
- output dependency scheduling (topological when possible, stable order fallback on cycles)
- fragment-plan execution route (`compileGraph` + `HydraExecutor`)
- runtime profiler snapshots (`getProfilerSnapshot`) and autotune profile helpers
- benchmark utilities (`BENCHMARK_CORPUS`, report build/validation helpers)

Use `createHydraBrowserRuntime()` for default composition, or wire `BrowserHost` + `WebGPURenderer` manually.

## Execution Modes

`HydraBrowserRuntime` supports:

- `auto` (default): fragment-plan routing with automatic policy selection
- `fragment`: force fragment-plan routing
- pointer-driven input via `runtime.synth.mouse` (`x/y/speed/acceleration/jerk` + smoothed channels in `0..1`, plus distinct pixel/uv/derivative channels)

## Capture APIs

```ts
import {
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

console.log(videoBlob.type)
```

`captureHydraFrameSequence` and `captureHydraVideo` stop the runtime loop, step deterministically, optionally wait for GPU work completion, and restore runtime state after capture.
