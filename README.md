# Hydra v2 Workspace

Hydra v2 is a workspace-split rewrite with strict package boundaries and ESM-only publish artifacts.

## Packages

- `hydra-synth-core`: runtime orchestration, transform graph, compute WGSL pass generation, lifecycle, typed errors.
- `hydra-synth`: browser host + WebGPU renderer + media source/output adapters.
- `hydra-synth-livecoding`: optional plugin for explicit eval/global livecoding behavior.

## Architecture

```text
hydra-synth-livecoding (optional)
            |
            v
hydra-synth (browser host + WebGPU + media adapters)
            |
            v
hydra-synth-core (runtime + graph + pass generation)
```

Core never references DOM globals or WebGPU APIs directly.

## Breaking Changes in v2

- Removed `makeGlobal` from core runtime behavior.
- Removed core `eval()` and implicit global mutation.
- Removed core `loadScript()`.
- Removed deep `src/*` export surface.
- Replaced monolithic constructor with explicit host/renderer/runtime wiring in browser package.
- Livecoding globals/eval moved to `hydra-synth-livecoding` plugin.

## Browser Usage

```ts
import { createHydraBrowserRuntime } from 'hydra-synth'

const runtime = createHydraBrowserRuntime({
  autoLoop: false,
  numSources: 4,
  numOutputs: 4,
  // executionMode defaults to 'auto' (v3-preferred with deterministic legacy fallback)
})

await runtime.init()
runtime.synth.osc(8, 0.1, 0).out()
runtime.tick(16)
runtime.dispose()
```

Execution mode controls:

- `auto` (default): v3-preferred routing with deterministic legacy fallback.
- `v3`: force v3 routing first with deterministic legacy fallback.
- `legacy`: force legacy pass execution path.

### Multipass Signal Flow (`renderpass`)

Hydra v2 now compiles transform chains into multiple GPU compute passes when `renderpass` transforms are present.

```ts
runtime.synth
  .osc(12, 0.05, 0)
  .blurX(2.0) // renderpass: horizontal blur over previous pass
  .blurY(2.0) // renderpass: vertical blur over previous pass
  .out()
```

Built-in renderpass transforms:

- `renderpass()` identity pass boundary marker (`prevBuffer` handoff, no extra standalone dispatch)
- `blurX(amount = 1)`
- `blurY(amount = 1)`
- `blurTiledX(amount = 1)` (workgroup-tiled horizontal blur with runtime fallback)
- `blurTiledY(amount = 1)` (workgroup-tiled vertical blur with runtime fallback)
- `blur(amount = 1)` (single-pass 3x3 Gaussian-like kernel)
- `bloom(amount = 0.8, radius = 1, threshold = 0.6, softness = 0.1)` (single-pass bright-knee bloom over `prevBuffer`)
- `blurFast(amount = 1)` (low-cost cross blur)
- `blurBilateral(radius = 1, sigmaColor = 18)` (edge-aware blur)
- `edgeDetect(amount = 1, mixAmount = 1)` (Scharr-style edge response)
- `edgeLaplacian(amount = 1, mixAmount = 1)`
- staged bloom helpers:
  `bloomThreshold(threshold = 0.6, softness = 0.1)`,
  `bloomDownsample(radius = 1)`,
  `bloomUpsample(radius = 1, boost = 1)`,
  `bloomMix(base, amount = 0.8)`

### Explicit Host Wiring

```ts
import {
  BrowserHost,
  HydraBrowserRuntime,
  WebGPURenderer
} from 'hydra-synth'

const host = new BrowserHost({ width: 1280, height: 720 })
const renderer = new WebGPURenderer({ canvas: host.canvas })
const runtime = new HydraBrowserRuntime({
  host,
  renderer,
  autoLoop: true
})
```

## Optional Livecoding Plugin

```ts
import { createHydraBrowserRuntime } from 'hydra-synth'
import { createLivecodingPlugin } from 'hydra-synth-livecoding'

const runtime = createHydraBrowserRuntime({ autoLoop: true })
await runtime.init()

const plugin = createLivecodingPlugin({
  allowedBindings: ['speed', 'bpm', 'update', 'afterUpdate'],
  exposeHelpers: true
})

const detach = runtime.attachPlugin(plugin)
plugin.run?.('speed = 2')

detach()
runtime.dispose()
```

Playground shortcut: open `playground/index.html?livecoding=1` to enable the on-page live editor panel (no devtools console required).

When `livecoding=1` is enabled in the playground, capture helpers are exposed in the live scope:

- `captureFrames(options)` (wrapper over `captureHydraFrameSequence`)
- `buildFfmpegCommands({ fps, ffmpegPattern, outputBaseName? })`
- `captureAndSaveGif(options?)` (2-second GIF by default, temp frames on dev server, downloads final file)
- `captureAndSaveVideo(options?)` (uses the selected video profile in the UI by default)
- `captureAndSaveMp4(options?)`
- `captureAndSaveWebm(options?)`

Playground capture button:

- `Capture and Save GIF (2s)` and `Capture and Save <Video Profile> (2s)` both toggle start/stop capture.
- Capture duration and video profile are configurable from the controls beside those buttons.
- If you stop early, uploaded frames are still encoded and downloaded as a shorter output.
- Frames are written to an OS temp folder on the dev server, encoded with `ffmpeg`, then only the final media file is downloaded to your browser downloads folder.
- Video profiles include: `mp4` (H.264 high quality) and `webm` (VP9 high quality).
- Delivery MP4 and VP9 WebM encoding auto-pad odd frame dimensions to even values where needed by 4:2:0 pixel formats.
- Requires `ffmpeg` installed and available on PATH for `scripts/dev-server.mjs`.

## Development

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
pnpm verify:pack
pnpm bench:v3:ci
```

Browser smoke tests (Playwright):

```bash
pnpm test:browser
```

## Publish Contract

Each published package tarball includes only:

- `dist/`
- `README.md`
- `LICENSE`
- `package.json`

`pnpm verify:pack` enforces this contract.
