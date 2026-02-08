# Changelog

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
- Built-in renderpass transforms: `renderpass`, `blurX`, `blurY`, `blur`.
- Pipeline compile-error surfacing through runtime error reporting.

### Removed

- Legacy monolithic `src/` runtime tree.
- Legacy `dev/` examples and old static asset paths tied to pre-workspace layout.
