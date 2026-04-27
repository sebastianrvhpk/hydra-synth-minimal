# Hydra v2 Workspace

Hydra v2 centers on a single canonical engine package with ESM-only publish artifacts.

## Packages

- `hydra-synth-core`: internal engine/compiler substrate and lower-level utilities.
- `hydra-synth`: canonical engine package with browser runtime, WebGPU, capture/recording, profiler/autotune, benchmark helpers, and livecoding exports.
- `hydra-synth-livecoding`: compatibility wrapper for projects that still import the old standalone livecoding package.

## Architecture

```text
hydra-synth (canonical engine package)
      |      |      |
      |      |      +-- livecoding mode / session helpers
      |      +--------- browser runtime + WebGPU + capture
      +---------------- internal core/compiler substrate via hydra-synth-core
```

`hydra-synth-core` does not reference DOM globals or WebGPU APIs directly.

## Browser Runtime Usage

```ts
import { createHydraBrowserRuntime } from 'hydra-synth'

const runtime = createHydraBrowserRuntime({
  autoLoop: false,
  numSources: 4,
  numOutputs: 4,
  executionMode: 'auto' // default
})

await runtime.init()
runtime.synth.osc(8, 0.1, 0).out()
runtime.tick(16)
runtime.dispose()
```

Pointer input is exposed as `runtime.synth.mouse`:

- default `0..1` channels: `x`, `y`, `speed`, `acceleration`, `jerk`, `speedSmooth`, `accelerationSmooth`, `jerkSmooth`, `dragDistance`, `dragTravel`, `dragDuration`, `hold`, `pressure`, `inside`
- additional channels with different math: `pixelX`, `pixelY`, `uvX`, `uvY`, `velocityX`, `velocityY`, `accelerationX`, `accelerationY`, `jerkX`, `jerkY`
- pointer state: `buttons`, `down`, `dragActive`, `pointerType`, `mods`, `enabled`

Example with only `0..1` channels:

```ts
osc(12, 0.08, 0)
  .rotate(() => (mouse.x - 0.5) * 0.8)
  .scale(() => 1 + mouse.speedSmooth * 4)
  .color(() => 0.3 + mouse.dragDistance, 0.5, 1.0)
  .out()
```

`executionMode` values:

- `auto` (default): fragment-plan routing with automatic policy selection.
- `fragment`: force fragment-plan routing.

You can also wire components explicitly:

```ts
import { BrowserHost, HydraBrowserRuntime, WebGPURenderer } from 'hydra-synth'

const host = new BrowserHost({ width: 1280, height: 720 })
const renderer = new WebGPURenderer({ canvas: host.canvas })
const runtime = new HydraBrowserRuntime({ host, renderer, autoLoop: true })
```

## Multipass And Renderpass Features

Transform chains are split into sequential fragment passes when standalone renderpass transforms are present, with `prevBuffer` handoff where needed.

Built-in coverage includes:

- classic Hydra transforms (`osc`, `noise`, `shape`, coord/color/combine ops, `prev`, `prevN`)
- low-level synthesis/operator extensions (`noiseLoop(scale, speed, radius)`, `fbm`, `ridged`, `turbulence`, `screen`, `overlay`, `softLight`, `hardLight`, `colorDodge`, `colorBurn`)
- multipass/post-processing transforms (for example `blurX`, `blurY`, `blurFast`, `edgeDetect`, `edgeLaplacian`, `radialBlur`, `zoomBlur`, `dualKawaseBlur`, `dualKawaseBloom`, `toneMap`, `exposure`)

For full built-in transform definitions, see `packages/core/src/transforms/default-transforms.ts`.

Detailed runtime/compiler notes for the fragment backend:

- `docs/fragment-pipeline.md`

## Livecoding Mode

```ts
import { createHydraBrowserRuntime } from 'hydra-synth'
import { createLivecodingPlugin } from 'hydra-synth/livecoding'

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

For backward compatibility, the same helpers are still published from `hydra-synth-livecoding`, but `hydra-synth` is now the canonical package boundary.

## Capture And Playground

`hydra-synth` capture APIs:

- `captureFrameSequence(...)`
- `captureHydraFrameSequence(...)`
- `captureVideo(...)`
- `captureHydraVideo(...)`

Playground shortcut: `playground/index.html`

VS Code shortcut:

- open the workspace in VS Code
- click `Go Live`
- Live Server opens the repo root, which now redirects into the livecoding playground by default
- add `?livecoding=0` if you want the plain non-livecoding playground view

When livecoding is enabled, helpers are exposed in the live scope:

- `captureFrames(options)` (wrapper over `captureHydraFrameSequence`)
- `captureAndSaveVideo(options?)`
- `captureAndSaveMp4(options?)`

Current playground capture behavior:

- MP4 capture uses WebCodecs (`VideoEncoder`) directly in-browser via `captureHydraVideo`.
- The playground no longer supports WebM capture (`captureAndSaveWebm` intentionally throws).

`ffmpeg` is only required for benchmark parity tooling.

## Development

```bash
pnpm install
pnpm build
```

For the default local playground loop in VS Code:

```bash
# after source edits that should be reflected in the browser
pnpm build
```

Then click `Go Live` in VS Code.

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:browser
pnpm verify:pack
pnpm bench:v3
pnpm bench:v3:ci
pnpm bench:capture:parity
```

## Publish Contract

Each published package tarball includes only:

- `dist/`
- `README.md`
- `LICENSE`
- `package.json`

`pnpm verify:pack` enforces this contract.
