# Compute Core V3 Implementation Status (Phases 1-6)

Last updated: 2026-02-16

## Phase Status

| Phase | Status | Notes |
|---|---|---|
| 1 | Completed | Unified runtime routing (`legacy`/`v3`/`auto`) with deterministic fallback diagnostics. |
| 2 | Not started | Slot-backed execution refinements pending. |
| 3 | Not started | Data-first kernel semantics pending. |
| 4 | Not started | Queue policy hardening pending. |
| 5 | Not started | Measured autotune loop pending. |
| 6 | Not started | Default flip + CI hard gates pending. |

---

## Phase 1 Report

### Implemented Plan Items

- `P1.1` `packages/browser/src/runtime/runtime.ts`, `packages/browser/src/index.ts`
  - Added runtime execution mode support: `legacy`, `v3`, `auto`.
  - Added mode normalization helper and runtime mode getter/setter bindings.
  - Kept default behavior on `legacy`.
- `P1.2` `packages/core/src/types.ts`, `packages/core/src/index.d.ts`
  - Extended `HydraOutputAdapter` with optional graph-aware hook:
    - `renderGraph?(source: HydraOutputGraphSource): void`
  - Preserved existing `render(passes)` API path.
- `P1.3` `packages/core/src/transforms/graph-node.ts`
  - Updated `.out()` routing:
    - Uses `renderGraph` when available.
    - Falls back to existing legacy pass render path.
- `P1.4` `packages/browser/src/runtime/output-node.ts`
  - Added graph source lifecycle support:
    - `setGraphRenderHandler`
    - `renderGraph`
    - `getGraphSource`
    - `clearGraphSource`
  - Direct `render(passes)` clears graph source unless called from graph routing.
- `P1.5` `packages/browser/src/runtime/runtime.ts`
  - Added mode-based graph routing:
    - `legacy`: legacy pass path only.
    - `v3`/`auto`: attempt v3 compile+execute, fallback to legacy on failure.
  - Fallback is deterministic and explicit in diagnostics.
- `P1.6` `packages/browser/src/runtime/profiler-v3.ts`, `packages/browser/src/runtime/runtime.ts`
  - Added routing diagnostics to profiler snapshot:
    - `routingConfiguredMode`
    - `routingActiveMode`
    - `routingCompileFailures`
    - `routingFallbackCount`
- `P1.7` `packages/browser/test/playwright/runtime-smoke.spec.ts`, `packages/browser/test/playwright/fixtures/runtime-smoke.html`
  - Added smoke scenarios for `legacy`, `v3`, and `auto` modes.
  - Kept explicit unavailable-path smoke check.

### Tests Added/Updated

- `packages/browser/test/v3-foundation.test.ts`
  - Added mode normalization/default tests.
  - Added runtime graph-route diagnostics tests for v3 success and fallback.
  - Updated profiler assertions for new routing fields.
- `packages/browser/test/output-node.test.ts`
  - Added graph source set/update and clear lifecycle tests.
- `packages/core/test/v3-compatibility-matrix.test.ts`
  - Added graph-aware output hook compatibility test.
- `packages/browser/test/playwright/runtime-smoke.spec.ts`
  - Added mode matrix smoke tests (`legacy`, `v3`, `auto`).

### Validation Results

All required Phase 1 gates passed:

1. `pnpm test:unit -- packages/core/test/v3-core.test.ts packages/core/test/v3-compatibility-matrix.test.ts packages/core/test/registry.test.ts` ✅
2. `pnpm test:unit -- packages/browser/test/v3-foundation.test.ts packages/browser/test/output-node.test.ts packages/browser/test/renderer-adapter.test.ts` ✅
3. `pnpm test:browser -- packages/browser/test/playwright/runtime-smoke.spec.ts` ✅
4. `pnpm --filter hydra-synth run typecheck` ✅
5. `node scripts/bench-v3.mjs .tmp/bench/phase-samples.json` ✅

### Benchmark Sample Artifact

- Generated deterministic benchmark samples:
  - `.tmp/bench/phase-samples.json`
- Generation rule:
  - Uses a fixed scene list and deterministic multipliers per acceptance gate.
  - Produces 3 samples per scene with fallback count `0` and stable dispatch count `12`.

