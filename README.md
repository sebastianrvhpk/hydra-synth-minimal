# Hydra TypeGPU Workspace

A Hydra-style live video synthesizer with one GPU architecture:

```text
Hydra built-ins → synchronous shader-function graph → TypeGPU linker/pipelines → WebGPU
```

`packages/synth` contains the language, runtime, TypeGPU backend, media inputs,
and capture implementation. `packages/hydra` is the browser instrument and
editor. `packages/workshop` is the guided presentation **La imagen como señal**,
which uses the same runtime to turn the conceptual sequence into executable
experiments.

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

The guided presentation is available at `/workshop/`. It keeps the instrument at
`/hydra/` intact, exposes runnable code for every scene, and can open the current
example directly in the full editor.

Images and videos can be dragged anywhere onto the app. Hydra gives each file a
tab-local object URL and lists it under **Options → media**, so no separate media
server is needed. The selected media buffer defaults to `s0`; dropping or
choosing another file replaces that buffer, clears its previous decoder, and
revokes the previous object URL. Select a different `s0`–`s3` buffer before
loading when more than one media source must stay active:

```js
src(s0).out()

// The hosted URL also remains available for an explicit reload.
s0.initVideo(media('loop.mp4'))
```

Use `media()` for the most recently loaded file, `media.list()` to inspect the
library, `mediaBuffers.release('s0')` to empty a buffer, or
`await loadMediaFiles()` to choose a file without dragging it. The URLs live only
for the current tab and are released when replaced, removed, cleared, or when
the page closes.

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
