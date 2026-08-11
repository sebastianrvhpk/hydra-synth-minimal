# Hydra GPU Workspace

A Hydra-style live video synthesizer with one fragment architecture and two GPU backends:

```text
Hydra built-ins → synchronous TypeGPU shader graph → fragment passes
                                                    ↙              ↘
                                              WebGPU              WebGL2
```

`packages/synth` contains the language, runtime, WebGPU/WebGL2 backends, media
inputs, and capture implementation. `packages/hydra` is the browser instrument and
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

Graph construction and pipeline selection are synchronous after runtime
initialization. WebGPU is selected first; WebGL2 is used automatically when it
is unavailable. The unavoidable browser boundaries remain asynchronous: GPU
initialization, camera/screen/audio permission, GPU readback, and WebCodecs
finalization.

## App

```bash
pnpm install
pnpm dev
```

The app includes CodeMirror livecoding, URL sketches, random patch generation,
image/video/camera/screen sources, audio analysis, frame capture, and MP4 capture.

The guided presentation is available at `/workshop/`. Its two-hour route contains
33 cumulative states organized as **entrar → seguir → relacionar → temporalizar →
volver**. A single visual patch family changes incrementally so value, order,
branch, role, time, and feedback can be compared without replacing the visual
material at every step. Code is co-present when it carries pedagogical work, each
practice has an explicit recovery point, and the current state can be retained in
the URL or opened in the full editor. Add `?facilitator=1` to expose delivery cues
without placing them in the participant view.

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

## Grammar utilities

The browser instrument adds six small utilities, organized by the kind of value
they produce:

| Regime | Utilities | Meaning |
| --- | --- | --- |
| Constant | `rn(max = 1)`, `btw(min = 0, max = 1)` | Uniform random values chosen once when the code runs |
| Signal | `A`, `B` | Live aspect callbacks for `.scale(1, A, B)` |
| Texture | `ns(scale = 10, speed = .1)`, `nsloop(scale = 10, speed = .1, radius = 1)` | Aspect-correct noise fields with a fresh spatial seed per call |

`A` is `() => Math.min(1, height / width)` and `B` is
`() => Math.min(1, width / height)`, so both continue to respond after a
resolution change. `ns` and `nsloop` also accept explicit `seedX` and `seedY`
arguments after their native source parameters when a field must be reproduced.

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
