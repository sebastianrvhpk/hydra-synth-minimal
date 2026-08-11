# hydra-synth

The TypeGPU shader graph and dual-backend browser runtime for the Hydra videosynth.

The runtime has one shader path:

```text
Hydra chain
  → synchronous typed shader-function graph
  → strict fragment pass
  → canonical WGSL linked by TypeGPU
  → WebGPU pipeline or WGSL-to-GLSL WebGL2 pipeline
  → output texture
  → backend presentation
```

It provides four sources, four outputs, feedback/history, renderpass effects,
mouse and audio bindings, media sources, deterministic frame capture, and
WebCodecs MP4 recording. It does not expose dynamic engine construction,
transform registration, renderer adapters, plugins, scheduling policies,
profilers, shader dumps, or device-capability mirrors.

## Runtime

```ts
import { createHydraBrowserRuntime } from 'hydra-synth'

const hydra = createHydraBrowserRuntime({ autoLoop: true, backend: 'auto' })
await hydra.init()
hydra.synth.osc(20, 0.1, 0).rotate(0.2).out()
```

Optional construction fields are limited to canvas placement, clock values,
mouse input, audio input, and backend preference (`auto`, `webgpu`, or
`webgl2`). `auto` tries WebGPU first and falls back to WebGL2. The Hydra
bindings include `s0`–`s3`, `o0`–`o3`,
the built-in transform generators, `render`, `setResolution`, `hush`, clock
values, mouse values, and audio values.

## Capture

```ts
import {
  captureHydraFrameSequence,
  captureHydraVideo,
  createHydraBrowserRuntime
} from 'hydra-synth'

const hydra = createHydraBrowserRuntime({ autoLoop: false })
await hydra.init()

await captureHydraFrameSequence({
  runtime: hydra,
  fps: 60,
  duration: 2,
  extension: 'png'
})

const mp4 = await captureHydraVideo({ runtime: hydra, fps: 60, duration: 2 })
```

Frame capture has one public blob/file behavior. Backend-specific texture
readback is private to MP4 capture, where it is required to obtain reliable
rendered pixels.

## Trusted livecoding session

```ts
import { createLivecodingSession } from 'hydra-synth/livecoding'
```

The embedding app supplies both the execution function and any helper values.
The session does not attach to an engine or add runtime extension hooks.
