# Changelog

## [Unreleased]

### Package Shape

- [x] Collapse the publishable engine surface into `hydra-synth`; former core/compiler code now lives internally under `packages/synth/src/core`.
- [x] Replace the standalone `hydra-synth-livecoding` package with the `hydra-synth/livecoding` subpath.
- [x] Add `packages/hydra` as the livecoding interface package and redirect the old playground entry to it.
- [x] Replace the textarea live editor with CodeMirror 6, Hydra completions, and evaluated-range flashing.
- [x] Add a fullscreen Hydra-style editor overlay with compact icon dock, first-run welcome panel, record/options popovers, optional floating geometry, URL sketch snapshots, random sketch loading, dice-style numeric mutation helpers, and editor-as-texture `src(s3)` material to the `hydra` app.
- [x] Add a public compatibility matrix and livecoding trust-boundary document.
- [x] Require explicit `allowEval: true` for the default livecoding evaluator.
- [x] Add modern audio analysis with legacy `a`/`a0..aN` helpers, Web Audio source connection, beat/volume/band/waveform metrics, and deterministic injected frequency-data updates.
- [x] Add `HydraSourceNode.initScreen()` for browser display capture sources.
- [x] Add a default-export `Hydra` compatibility facade with old constructor options plus `setFunction`, `screencap`, `getScreenImage`, `canvasToImage`, and `vidRecorder` aliases.

### Precision and Numerical Stability Audit

- [x] Preserve FPS gate accumulator remainder in `HydraEngine.tick()` to avoid cadence drift from dropped sub-frame time.
- [x] Stop synthesizing `gpuMs` pass metrics from CPU encode timings when GPU timestamp data is unavailable.
- [x] Scope capture conversion pipeline caching per `GPUDevice` to prevent cross-device pipeline reuse.
- [x] Add regression coverage for:
  - FPS gate remainder behavior (`packages/synth/test/core/engine.test.ts`)
  - CPU/GPU timing source integrity (`packages/synth/test/foundation.test.ts`)
  - Per-device readback conversion caching (`packages/synth/test/gpu-readback.test.ts`)
- [ ] Align browser declaration surface with runtime capture/profiler APIs (`packages/synth/src/index.d.ts`).
- [ ] Enforce a shared dynamic-uniform scalar ceiling between compile and runtime paths.
- [ ] Add explicit alpha-preservation mode for GPU readback conversion (`rgba16float` -> `rgba8unorm`).
- [ ] Tighten benchmark scripts to reject/flag invalid numeric samples instead of coercing to `0`.

## [2.0.0-alpha.0] - 2026-02-08

### Breaking

- Rewrote project into a workspace split:
  - `hydra-synth-core`
  - `hydra-synth`
  - `hydra-synth-livecoding`
- Removed core `makeGlobal` option.
- Removed core `eval()` behavior and implicit global mutation.
- Removed core `loadScript()` API.
- Removed deep `src/*` export surface.
- Replaced monolithic runtime construction with explicit browser host + renderer wiring.
- Moved all opt-in global/eval behavior into `hydra-synth-livecoding`.

### Added

- Typed core runtime interfaces:
  - `RendererAdapter`
  - `SourceAdapter`
  - `ScriptPlugin`
  - `HydraEngineOptions`
  - `HydraEngineError`
- Typed transform registry + WGSL pass generation in core.
- Browser runtime composition with deterministic host/source/output cleanup.
- Livecoding plugin lifecycle with explicit attach/run/dispose boundaries.
- Workspace package contract verification (`pnpm verify:pack`).
- Unit test scaffolding (Vitest) and browser smoke scaffolding (Playwright).
- CI workflow enforcing lint, typecheck, tests, build, and packaging checks.
- Release workflow using changesets.
- Multipass `renderpass` compilation and execution path.
- Built-in renderpass transforms: `renderpass`, `blurX`, `blurY`, `blur`, `bloom`.
- Pipeline compile-error surfacing through runtime error reporting.
- Fragment-first internal execution path for compiled Hydra passes (`vsMain` + `fsMain`).
- Fragment pipeline cache and output-node render-pass orchestration.
- Renderpass boundary optimization: identity `renderpass()` no longer emits a standalone internal pass.

### Removed

- Previous monolithic `src/` runtime tree.
- Previous `dev/` examples and old static asset paths tied to pre-workspace layout.
