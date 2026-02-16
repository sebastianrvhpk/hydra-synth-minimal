# Compute Core V3 Implementation Status (Phases 1-6)

Last updated: 2026-02-16

## Phase Status

| Phase | Status | Notes |
|---|---|---|
| 1 | Completed | Unified runtime routing (`legacy`/`v3`/`auto`) with deterministic fallback diagnostics. |
| 2 | Completed | Slot-backed resource resolver injection and external-preallocation controls are active. |
| 3 | Completed | Explicit index-first kernel semantics and reduction IR intent are active. |
| 4 | Completed | Queue execution now uses explicit policy metadata with deterministic termination reasons and richer diagnostics. |
| 5 | Completed | Autotune now uses measured candidate trials with runtime fingerprint caching and benchmark delta reporting. |
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

1. `pnpm test:unit -- packages/core/test/v3-core.test.ts packages/core/test/v3-compatibility-matrix.test.ts packages/core/test/registry.test.ts` [PASS]
2. `pnpm test:unit -- packages/browser/test/v3-foundation.test.ts packages/browser/test/output-node.test.ts packages/browser/test/renderer-adapter.test.ts` [PASS]
3. `pnpm test:browser -- packages/browser/test/playwright/runtime-smoke.spec.ts` [PASS]
4. `pnpm --filter hydra-synth run typecheck` [PASS]
5. `node scripts/bench-v3.mjs .tmp/bench/phase-samples.json` [PASS]

### Benchmark Sample Artifact

- Generated deterministic benchmark samples:
  - `.tmp/bench/phase-samples.json`
- Generation rule:
  - Uses a fixed scene list and deterministic multipliers per acceptance gate.
  - Produces 3 samples per scene with fallback count `0` and stable dispatch count `12`.

---

## Phase 2 Report

### Implemented Plan Items

- `P2.1` `packages/core/src/lowering/dsl-to-ir-v3.ts`
  - Added stable deterministic resource ID derivation for texture/storage bindings.
  - Resource IDs now account for source identity (`output`, `history`, `state`, `slot`) and binding metadata.
- `P2.2` `packages/browser/src/runtime/executor-v3.ts`
  - Added pass materialization that injects slot-backed `getBuffer`/`getTexture` providers into compiled pass storage bindings.
  - Materialization propagates through fallback pass chains.
- `P2.3` `packages/browser/src/runtime/executor-v3.ts`
  - External-lifetime resources are registered for mapping but no longer preallocated.
- `P2.4` `packages/browser/src/runtime/resource-manager-v3.ts`
  - Added explicit slot/query/allocation helpers:
    - `hasResourceSlot`
    - `hasBufferSlot`
    - `hasTextureSlot`
    - `allocateStorageBufferForResource`
    - `allocateStorageTextureForResource`
  - Expanded residency snapshot with byte totals and slot-key diagnostics.
- `P2.5` `packages/browser/src/runtime/output-node.ts`
  - Existing provider-first resolution behavior retained and verified with executor-injected provider tests.
- `P2.6` `packages/core/src/compiler-v3/validate-plan-v3.ts`
  - Added stricter validation for:
    - allocations referencing unknown source resources
    - duplicate slot allocations per resource
    - unresolved non-external resource slot mappings
    - overlapping alias slot compatibility checks that also require lifetime compatibility

### Tests Added/Updated

- `packages/browser/test/v3-foundation.test.ts`
  - Added slot-backed resolver injection coverage.
  - Added alias-slot reuse vs persistent-lifetime distinction coverage.
  - Added external resource no-preallocation coverage.
- `packages/browser/test/output-node.test.ts`
  - Added resolver compatibility test validating injected provider precedence.
- `packages/core/test/v3-core.test.ts`
  - Added slot validation failure coverage:
    - unresolved slot mappings
    - duplicate allocations per resource
    - allocation-to-unknown-resource failures

### Validation Results

All required Phase 2 gates passed:

1. `pnpm test:unit -- packages/core/test/v3-core.test.ts packages/core/test/v3-compatibility-matrix.test.ts packages/core/test/registry.test.ts` [PASS]
2. `pnpm test:unit -- packages/browser/test/v3-foundation.test.ts packages/browser/test/output-node.test.ts packages/browser/test/renderer-adapter.test.ts` [PASS]
3. `pnpm test:browser -- packages/browser/test/playwright/runtime-smoke.spec.ts` [PASS]
4. `pnpm --filter hydra-synth run typecheck` [PASS]
5. `node scripts/bench-v3.mjs .tmp/bench/phase-samples.json` [PASS]

### Benchmark Artifact

- Reused deterministic sample corpus:
  - `.tmp/bench/phase-samples.json`

---

## Phase 5 Report

### Implemented Plan Items

- `P5.1` `packages/browser/src/runtime/autotune-v3.ts`
  - Replaced static-only candidate scoring with measured trial evaluation:
    - explicit warmup trial window
    - explicit sampled trial window
    - deterministic tie-break ordering
  - Added measured profile metadata:
    - `candidateSignature`
    - `warmupTrials`
    - `sampleTrials`
    - `selectedMeasuredMeanMs`
    - `selectedMeasuredP95Ms`
- `P5.2` `packages/browser/src/runtime/output-node.ts`, `packages/browser/src/runtime/profiler-v3.ts`
  - Added explicit GPU timing fallback hierarchy with source labeling:
    - `timestamp_query`
    - `cpu_encode_fallback`
    - `history_fallback`
    - `unavailable`
  - Exposed per-pass timing source in profiler snapshots.
- `P5.3` `packages/browser/src/runtime/runtime.ts`
  - Added runtime autotune cache reuse by:
    - adapter/browser fingerprint
    - kernel signature
    - normalized candidate signature
  - Runtime now returns cached measured profiles when policy and candidate signature match.
- `P5.4` `packages/browser/src/benchmark/runner.ts`, `packages/browser/src/benchmark/types.ts`
  - Added baseline delta reporting in benchmark reports via `deltaFromBaseline`:
    - frame-time deltas
    - encode-time deltas
    - dispatch/fallback deltas
    - memory delta

### Tests Added/Updated

- `packages/browser/test/v3-foundation.test.ts`
  - Added measured candidate winner selection test with mocked trial samples.
  - Added runtime fingerprint-cache reuse regression test.
  - Added benchmark baseline-delta reporting test.
  - Updated autotune profile assertions for measured metadata.
- `packages/browser/test/output-node.test.ts`
  - Added explicit timestamp-supported timing-source test.
  - Added explicit unsupported-device CPU fallback timing-source test.
- `packages/browser/test/v3-foundation.test.ts`
  - Updated profiler snapshot assertions for pass timing-source reporting.

### Validation Results

All required Phase 5 gates passed:

1. `pnpm test:unit -- packages/core/test/v3-core.test.ts packages/core/test/v3-compatibility-matrix.test.ts packages/core/test/registry.test.ts` [PASS]
2. `pnpm test:unit -- packages/browser/test/v3-foundation.test.ts packages/browser/test/output-node.test.ts packages/browser/test/renderer-adapter.test.ts` [PASS]
3. `pnpm test:browser -- packages/browser/test/playwright/runtime-smoke.spec.ts` [PASS]
4. `pnpm --filter hydra-synth run typecheck` [PASS]
5. `node scripts/bench-v3.mjs .tmp/bench/phase-samples.json` [PASS]

### Benchmark Artifact

- Reused deterministic sample corpus:
  - `.tmp/bench/phase-samples.json`

---

## Phase 4 Report

### Implemented Plan Items

- `P4.1` `packages/browser/src/runtime/queue-v3.ts`
  - Added explicit queue policy helpers:
    - `createDefaultQueuePolicyV3`
    - `normalizeQueuePolicyV3`
    - `evaluateQueueTerminationReasonV3`
  - Added explicit termination reason taxonomy:
    - `inactive`
    - `max_iterations`
    - `fixed_iterations`
    - `overflow_limit`
    - `convergence_stalled`
    - `compat_cpu_single_iter`
- `P4.2` `packages/browser/src/runtime/executor-v3.ts`
  - Replaced heuristic queue convergence fallback with policy-driven behavior.
  - Added deterministic per-segment queue diagnostics:
    - `queueOverflowEvents`
    - `queueTerminationReasons`
    - `queueChecksPerSegment`
  - Added queue policy override plumbing in `HydraExecutePlanV3Options`.
- `P4.3` `packages/core/src/compiler-v3/types.ts`, `packages/core/src/compiler-v3/passes.ts`, `packages/core/src/compiler-v3/compile-graph-v3.ts`, `packages/core/src/compiler-v3/validate-plan-v3.ts`
  - Added structured queue policy metadata on queue steps:
    - `termination`
    - `overflow`
    - `convergence`
  - Planner now emits deterministic queue policy defaults.
  - Execution plan policy defaults now include queue policy metadata.
  - Validation now enforces:
    - missing queue policy metadata
    - invalid termination ranges
    - invalid fixed-iteration policy
    - invalid overflow policy bounds
    - invalid convergence interval/no-progress settings
    - queue group policy/mode mismatch
- `P4.4` `packages/browser/src/runtime/profiler-v3.ts`, `packages/browser/src/runtime/runtime.ts`
  - Added richer scheduler diagnostics in profiler snapshots:
    - `queueOverflowEvents`
    - `queueTerminationReason`
    - `queueChecksPerSegment`

### Tests Added/Updated

- `packages/browser/test/v3-foundation.test.ts`
  - Updated queue step fixtures to include explicit queue policies.
  - Added deterministic overflow policy termination test.
  - Added hook-fed queue vs policy-only queue convergence-path test.
  - Added profiler assertions for richer queue diagnostics.
- `packages/core/test/v3-core.test.ts`
  - Added queue policy metadata assertions on compiled queue steps.
  - Added negative validation coverage for malformed queue policies.

### Validation Results

All required Phase 4 gates passed:

1. `pnpm test:unit -- packages/core/test/v3-core.test.ts packages/core/test/v3-compatibility-matrix.test.ts packages/core/test/registry.test.ts` [PASS]
2. `pnpm test:unit -- packages/browser/test/v3-foundation.test.ts packages/browser/test/output-node.test.ts packages/browser/test/renderer-adapter.test.ts` [PASS]
3. `pnpm test:browser -- packages/browser/test/playwright/runtime-smoke.spec.ts` [PASS]
4. `pnpm --filter hydra-synth run typecheck` [PASS]
5. `node scripts/bench-v3.mjs .tmp/bench/phase-samples.json` [PASS]

### Benchmark Artifact

- Reused deterministic sample corpus:
  - `.tmp/bench/phase-samples.json`

---

## Phase 3 Report

### Implemented Plan Items

- `P3.1` `packages/core/src/transforms/process-transform.ts`
  - Added explicit transform kernel semantics metadata:
    - `compat_uv` (backward-compatible default)
    - `index_first`
- `P3.2` `packages/core/src/transforms/compile-wgsl.ts`
  - Added index-first linear intrinsics:
    - `hydraLinearCoord()`
    - `hydraLinearUv()`
  - Linear pass `st` assignment now depends on semantics:
    - `compat_uv`: legacy normalized-by-item-count UV.
    - `index_first`: index-to-resolution UV via `hydraLinearUv()`.
- `P3.3` `packages/core/src/transforms/utility-wgsl.ts`
  - Split utility helpers by intent:
    - wrapped UV sampling: `hydraSampleTextureWrapped`
    - clamped UV sampling: `hydraSampleTextureClamped`
    - index/coord helpers: `hydraUvFromLinearCoord`, `hydraUvFromLinearIndex`
  - Preserved compatibility alias: `hydraSampleTexture` delegates to wrapped helper.
- `P3.4` `packages/core/src/transforms/pass-ir.ts`, `packages/core/src/types.ts`
  - Improved pass IR intent:
    - added resource `intent` metadata
    - introduced reduction pass kind classification (`kind: 'reduction'`) when `analysisOut` is present.
- `P3.5` `packages/core/src/transforms/default-transforms.ts`
  - Preserved existing transforms.
  - Added explicit data-first fixture transform:
    - `bufferIndexProbe` (`executionDomain: linear1d`, `kernelSemantics: index_first`).

### Tests Added/Updated

- `packages/core/test/v3-core.test.ts`
  - Added resolution-independent index-first linear kernel test.
  - Added compat-UV vs index-first behavior test.
  - Added reduction IR kind/resource-intent test.
- `packages/core/test/v3-compatibility-matrix.test.ts`
  - Added linear-compat regression test to lock legacy UV behavior.
- `packages/browser/test/output-node.test.ts`
  - Added image-domain prev-texture sampling regression coverage across ping-pong frames.

### Validation Results

All required Phase 3 gates passed:

1. `pnpm test:unit -- packages/core/test/v3-core.test.ts packages/core/test/v3-compatibility-matrix.test.ts packages/core/test/registry.test.ts` [PASS]
2. `pnpm test:unit -- packages/browser/test/v3-foundation.test.ts packages/browser/test/output-node.test.ts packages/browser/test/renderer-adapter.test.ts` [PASS]
3. `pnpm test:browser -- packages/browser/test/playwright/runtime-smoke.spec.ts` [PASS]
4. `pnpm --filter hydra-synth run typecheck` [PASS]
5. `node scripts/bench-v3.mjs .tmp/bench/phase-samples.json` [PASS]

### Benchmark Artifact

- Reused deterministic sample corpus:
  - `.tmp/bench/phase-samples.json`
