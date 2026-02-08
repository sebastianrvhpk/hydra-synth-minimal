# Hydra v2 Workspace

Hydra v2 is a workspace-split rewrite with strict package boundaries and ESM-only publish artifacts.

## Packages

- `hydra-synth-core`: runtime orchestration, transform graph, WGSL pass generation, lifecycle, typed errors.
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
  numOutputs: 4
})

await runtime.init()
runtime.synth.osc(8, 0.1, 0).out()
runtime.tick(16)
runtime.dispose()
```

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

## Development

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
pnpm verify:pack
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
