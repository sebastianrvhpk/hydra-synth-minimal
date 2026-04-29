# hydra-synth

Modern Hydra-compatible WebGPU engine package. This package contains the browser runtime plus the internal core/compiler modules that used to live in a separate workspace package.

## Includes

- `BrowserHost` (canvas + RAF lifecycle)
- `WebGPURenderer` (WebGPU device/context, output presentation)
- `HydraBrowserRuntime` (core engine + registry + host + renderer composition)
- `HydraSourceNode` and `WebGPUOutputNode` adapters
- `HydraAudioAnalyzer` (`a`, `a0..aN`, volume/RMS/peak/centroid/bands/waveform/beat metrics)
- `Hydra` default-export compatibility facade for old constructor-style embeds
- output dependency scheduling (topological when possible, stable order fallback on cycles)
- fragment-plan execution route (`compileGraph` + `HydraExecutor`)
- runtime profiler snapshots (`getProfilerSnapshot`) and autotune profile helpers
- benchmark utilities (`BENCHMARK_CORPUS`, report build/validation helpers)
- livecoding/session helpers (`attachLivecoding`, `createLivecodingPlugin`)

Use `createHydraBrowserRuntime()` for default composition, or wire `BrowserHost` + `WebGPURenderer` manually.

## Execution Modes

`HydraBrowserRuntime` supports:

- `auto` (default): fragment-plan routing with automatic policy selection
- `fragment`: force fragment-plan routing
- pointer-driven input via `runtime.synth.mouse` (`x/y/speed/acceleration/jerk` + smoothed channels in `0..1`, plus distinct pixel/uv/derivative channels)
- audio-reactive input via `runtime.synth.a` and `runtime.synth.a0..aN`; pass `audio: true` or `audio: { autostart: true }` to request microphone input, or connect a `MediaStream`, media element, or `AudioNode`
- screen sources via `s0.initScreen()` / `source.initScreen({ video: true, audio: false })`

## Compatibility Facade

```ts
import Hydra from 'hydra-synth'

const hydra = new Hydra({
  canvas,
  makeGlobal: true,
  detectAudio: true
})

osc(20, 0.1, () => a.fft[0]).out()
s0.initScreen()
```

The facade keeps old names such as `setFunction`, `screencap`, `getScreenImage`, `canvasToImage`, and `vidRecorder` while delegating to the typed runtime and capture APIs.

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

## Livecoding

Top-level import:

```ts
import { attachLivecoding, createLivecodingPlugin } from 'hydra-synth'
```

Optional subpath import:

```ts
import { attachLivecoding, createLivecodingPlugin } from 'hydra-synth/livecoding'
```

Livecoding requires a code runner supplied by the embedding app. Keep that runner at the trusted local UI boundary:

```ts
const plugin = createLivecodingPlugin({
  runCode: (code, scope) => {
    const compileTrustedCode = globalThis.Function
    return compileTrustedCode('scope', `with (scope) {\n${code}\n}`)(scope)
  }
})
```

Advanced compiler helpers are available from `hydra-synth/core` and `hydra-synth/core/compiler`.
