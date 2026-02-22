# Changelog

## [Unreleased]

### Precision and Numerical Stability Audit

- [x] Preserve FPS gate accumulator remainder in `HydraEngine.tick()` to avoid cadence drift from dropped sub-frame time.
- [x] Stop synthesizing `gpuMs` pass metrics from CPU encode timings when GPU timestamp data is unavailable.
- [x] Scope capture conversion pipeline caching per `GPUDevice` to prevent cross-device pipeline reuse.
- [x] Add regression coverage for:
  - FPS gate remainder behavior (`packages/core/test/engine.test.ts`)
  - CPU/GPU timing source integrity (`packages/browser/test/foundation.test.ts`)
  - Per-device readback conversion caching (`packages/browser/test/gpu-readback.test.ts`)
- [ ] Align browser declaration surface with runtime capture/profiler APIs (`packages/browser/src/index.d.ts`).
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
