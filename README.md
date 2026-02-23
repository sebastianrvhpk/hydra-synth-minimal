# Hydra v2 Workspace

Hydra v2 is a workspace-split rewrite with strict package boundaries and ESM-only publish artifacts.

## Packages

- `hydra-synth-core`: engine lifecycle, transform registry, WGSL pass compilation, DSL-to-IR lowering, execution-plan compilation/validation, and CPU reference utilities.
- `hydra-synth`: browser host, WebGPU renderer, fragment-plan runtime execution, capture helpers, profiler/autotune helpers, benchmark corpus/report utilities.
- `hydra-synth-livecoding`: optional plugin for explicit livecoding attach/run/dispose behavior and controlled global binding injection.

## Architecture

```text
hydra-synth-livecoding (optional)
            |
            v
hydra-synth (browser host + WebGPU runtime + capture/benchmark tooling)
            |
            v
hydra-synth-core (engine + transform graph + WGSL + plan compiler)
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

## Capture And Playground

`hydra-synth` capture APIs:

- `captureFrameSequence(...)`
- `captureHydraFrameSequence(...)`
- `captureVideo(...)`
- `captureHydraVideo(...)`

Playground shortcut: `playground/index.html?livecoding=1`

When `livecoding=1` is enabled, helpers are exposed in the live scope:

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
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:browser
pnpm build
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
