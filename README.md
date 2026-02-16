# Hydra v2 Workspace

Hydra v2 is a workspace-split rewrite with strict package boundaries and ESM-only publish artifacts.

## Packages

- `hydra-synth-core`: engine lifecycle, transform registry, WGSL pass compilation, DSL-to-IR lowering, execution-plan compilation/validation, primitive descriptors and CPU references.
- `hydra-synth`: browser host, WebGPU renderer, runtime routing (`legacy` and compute-plan execution), capture helpers, queue execution utilities, profiler/autotune helpers, benchmark corpus/report utilities.
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

`executionMode` values:

- `auto` (default): compute-plan route first, deterministic fallback to legacy pass rendering on compile/execute failures.
- `compute`: force compute-plan route first, with the same deterministic legacy fallback behavior.
- `legacy`: always render legacy pass chains (no plan executor route).

You can also wire components explicitly:

```ts
import { BrowserHost, HydraBrowserRuntime, WebGPURenderer } from 'hydra-synth'

const host = new BrowserHost({ width: 1280, height: 720 })
const renderer = new WebGPURenderer({ canvas: host.canvas })
const runtime = new HydraBrowserRuntime({ host, renderer, autoLoop: true })
```

## Multipass And Compute Features

Transform chains are split into sequential compute passes when standalone transform types are present (`renderpass`, `simulation`, `analysis`, `kernel`), with `prevBuffer` handoff where needed.

Built-in post/fx and compute-native coverage includes:

- classic Hydra transforms (`osc`, `noise`, `shape`, coord/color/combine ops, `prev`, `prevN`)
- multipass/post-processing transforms (for example `blurX`, `blurY`, `blurTiledX`, `blurSubgroupX`, `blurFast`, `edgeDetect`, `edgeLaplacian`, `radialBlur`, `zoomBlur`, `dualKawaseBlur`, `dualKawaseBloom`, `toneMap`, `exposure`)
- simulation/analysis/data transforms (`rdStep`, `trailScatter`, `lumaProbe`, `bufferFill`, `bufferDecay`, `bufferIndexProbe`)

For full built-in transform definitions, see `packages/core/src/transforms/default-transforms.ts`.

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
- `buildFfmpegCommands(...)`

Playground shortcut: `playground/index.html?livecoding=1`

When `livecoding=1` is enabled, helpers are exposed in the live scope:

- `captureFrames(options)` (wrapper over `captureHydraFrameSequence`)
- `buildFfmpegCommands({ fps, ffmpegPattern, outputBaseName? })`
- `captureAndSaveGif(options?)`
- `captureAndSaveVideo(options?)`
- `captureAndSaveMp4(options?)`

Current playground capture behavior:

- GIF capture uploads frame images to the dev server, then encodes with `ffmpeg`.
- MP4 capture uses WebCodecs (`VideoEncoder`) directly in-browser via `captureHydraVideo`.
- The playground no longer supports WebM capture (`captureAndSaveWebm` intentionally throws).

`ffmpeg` is required for dev-server GIF encoding and benchmark parity tooling.

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
