# hydra-synth

Browser host package for Hydra v2.

Includes:

- `BrowserHost` (canvas + RAF ownership)
- `WebGPURenderer` (WebGPU backend)
- `HydraBrowserRuntime` (core + host + renderer composition)
- `HydraSourceNode` / `WebGPUOutputNode` adapters
- sequential multipass compute dispatch for compiled chains (`.out()` remains screen render/present)
- dependency-aware output scheduling (topological when possible, stable fallback on cycles)
- deterministic frame-sequence capture utilities for offline rendering (`captureFrameSequence`, `captureHydraFrameSequence`)

Use `createHydraBrowserRuntime()` for default composition, or wire `BrowserHost` + `WebGPURenderer` explicitly.

## Frame Sequence Capture

```ts
import { captureHydraFrameSequence, buildFfmpegCommands, createHydraBrowserRuntime } from 'hydra-synth'

const runtime = createHydraBrowserRuntime({ autoLoop: true })
await runtime.init()

const capture = await captureHydraFrameSequence({
  runtime,
  fps: 60,
  duration: 4,
  width: 1920,
  height: 1080,
  extension: 'png',
  pickDirectory: true
})

const ffmpeg = buildFfmpegCommands(capture)
console.log(ffmpeg.mp4)
console.log(ffmpeg.webm)
```

`captureHydraFrameSequence` pauses the runtime loop, steps frames deterministically, waits for submitted GPU work, and restores previous runtime state after capture.
