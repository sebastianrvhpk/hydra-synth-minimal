# Hydra TypeGPU Workspace

A Hydra-style live video synthesizer with one GPU architecture:

```text
Hydra built-ins → synchronous shader-function graph → TypeGPU linker/pipelines → WebGPU
```

`packages/synth` contains the language, runtime, TypeGPU backend, media inputs,
and capture implementation. `packages/hydra` is the browser instrument and
editor.

## Runtime

```ts
import { createHydraBrowserRuntime } from 'hydra-synth'

const hydra = createHydraBrowserRuntime({ autoLoop: false })
await hydra.init()

hydra.synth.osc(8, 0.1, 0).rotate(0.2).out()
hydra.tick(16)
hydra.dispose()
```

The topology is intentionally fixed at `s0`–`s3` and `o0`–`o3`. Transforms are
the built-in language; there is no dynamic transform, source, output, extension,
plugin, profiler, or capability-metadata layer.

Graph construction and pipeline selection are synchronous. The unavoidable
browser boundaries remain asynchronous: WebGPU device creation, camera/screen/
audio permission, GPU readback, and WebCodecs finalization.

## App

```bash
pnpm install
pnpm dev
```

The app includes CodeMirror livecoding, URL sketches, random patch generation,
image/video/camera/screen sources, audio analysis, frame capture, and MP4 capture.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build:vercel
pnpm verify:pack
```

See [the TypeGPU backend boundary](docs/typegpu-backend.md) and [the livecoding
trust boundary](docs/livecoding-trust-boundary.md).
