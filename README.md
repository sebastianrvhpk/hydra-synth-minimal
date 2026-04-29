# Hydra WebGPU Workspace

This is a modern WebGPU/TypeScript Hydra engine and livecoding environment. It keeps the Hydra patching workflow and DSL shape while rebuilding the renderer, compiler, capture path, and editor surface for current browsers.

## Packages

- `hydra-synth`: the graphics brain. It owns the Hydra-compatible DSL, WebGPU renderer, WGSL compiler, source/output buffers, capture APIs, profiler/autotune helpers, and the optional livecoding runtime bridge.
- `hydra`: the livecoding interface. It owns the fullscreen canvas experience, editor overlay, local session helpers, source/capture controls, and user-facing workflow around a `hydra-synth` runtime.

Internal compiler/engine code lives inside `packages/synth/src/core`; it is not a separate npm package.

```text
hydra
  -> hydra-synth
       -> internal core/compiler/runtime modules
```

## Engine Usage

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

Livecoding helpers are available from the engine package:

```ts
import { createHydraBrowserRuntime } from 'hydra-synth'
import { createLivecodingPlugin } from 'hydra-synth/livecoding'

const runtime = createHydraBrowserRuntime({ autoLoop: true })
await runtime.init()

const plugin = createLivecodingPlugin({
  runCode: (code, scope) => {
    const compileTrustedCode = globalThis.Function
    return compileTrustedCode('scope', `with (scope) {\n${code}\n}`)(scope)
  },
  allowedBindings: ['speed', 'bpm', 'update', 'afterUpdate'],
  exposeHelpers: true
})

const detach = runtime.attachPlugin(plugin)
plugin.run?.('speed = 2')
detach()
runtime.dispose()
```

## Compatibility Direction

The goal is Hydra patch compatibility, not exact legacy WebGL output parity. Existing patches should keep the familiar global livecoding shape: `osc`, `noise`, `shape`, `src`, `s0..s3`, `o0..o3`, `mouse`, `time`, `speed`, `bpm`, `update`, `afterUpdate`, and `out`.

See the detailed compatibility matrix in `docs/hydra-compatibility.md`.

Livecoding evaluates trusted local patch code. See `docs/livecoding-trust-boundary.md` before wiring remote gallery, URL, or collaboration inputs into `livecoding.run(...)`.

Modern additions include:

- WebGPU/WGSL fragment pipeline
- multipass/renderpass transforms
- fullscreen Hydra-style CodeMirror code layer with compact icon dock
- first-run welcome panel, record popover, and editor/runtime options
- URL-encoded local sketch sharing
- random sketch and dice-mutation helpers
- modern audio analysis with legacy `a`/`a0..aN` helpers plus volume, RMS, peak, centroid, low/mid/high, waveform, and injectable frequency data
- screen capture sources through `s0.initScreen()`
- deterministic frame capture
- WebCodecs MP4 capture with a 60fps default and 24-240fps recorder range
- profiler snapshots and autotune helpers
- typed ESM package surface

## Compatibility Facade

The preferred API is the typed factory surface above. For old sketches, tutorials, and non-livecoding embeds that expect a constructor, `hydra-synth` also exports a thin Hydra facade:

```ts
import Hydra from 'hydra-synth'

const hydra = new Hydra({
  canvas: document.querySelector('canvas'),
  makeGlobal: true,
  autoLoop: true,
  detectAudio: true
})

osc(10, 0.1, () => a.fft[0]).out()
s0.initScreen()
```

The facade wraps `createHydraBrowserRuntime()` and installs legacy names where they map cleanly:

- `setFunction(...)` -> typed `registerFunction(...)`
- `screencap()`, `getScreenImage(...)`, and `canvasToImage(...)` -> PNG capture helpers
- `vidRecorder.start()` / `vidRecorder.stop()` -> stream recording when available, WebCodecs capture fallback otherwise
- `makeGlobal: true` -> live getters/setters for the synth bindings on the target global

The facade is for compatibility. New integrations should prefer `createHydraBrowserRuntime()` and call through `runtime.synth`.

## Local App

```bash
pnpm install
pnpm build
pnpm dev
```

The dev server opens `packages/hydra/index.html`. The legacy `playground/index.html` path redirects there.

The app exposes helper globals for livecoding and console use:

- `saveSketchToUrl()` / `copySketchUrl()` for URL snapshots
- `loadRandomSketch()` / `randomize()` for generated example patches
- `mutateEditorCode()` for one-value dice mutations
- `codeCanvas`, `attachCodeMaterial()`, and `syncCodeMaterial()` for sampling the editor as a live source texture, defaulting to `src(s3)`
- `showCode()`, `hideCode()`, `toggleCode()`, and `fitEditorPanel()` for the fullscreen editor surface
- `toggleRecordPanel()` and `toggleOptionsPanel()` for app controls
- `saveCanvasFrame()`, `captureAndSaveMp4()`, and `captureFrames()` for output capture
- `a`, `a0..aN`, and `s0.initScreen()` when audio/screen permissions are granted by the browser

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:browser
pnpm verify:pack
```

`pnpm verify:pack` checks publishable package contents for `hydra-synth`. The `hydra` interface is currently a private static app package.

## Package Contract

`hydra-synth` publishes:

- `hydra-synth`
- `hydra-synth/livecoding`
- `hydra-synth/core`
- `hydra-synth/core/compiler`

Each published tarball should include only `dist/`, `README.md`, `LICENSE`, and `package.json`.
