# Hydra v3 Compute-Core Implementation Status (1->8)

This document tracks the concrete implementation of the compute-core hooks/plumbing plan.

## 1. Internal Contracts (Plan/Executor ABI)
- `HydraExecutionPlanV3` now carries `version: 'v3.0'`.
- Added strict validator:
  - `packages/core/src/compiler-v3/validate-plan-v3.ts`
  - checks step/node references, barrier order, queue invariants, slot/interval alias collisions.
- `compileGraphV3` runs plan validation by default (`validateExecutionPlan: true`).

## 2. Primitive Runtime Integration
- Added primitive substitution stage:
  - `packages/core/src/compiler-v3/primitive-substitution.ts`
- The compiler now links nodes to primitive descriptors/modules and can substitute known kernels.
- Substitution currently active for:
  - `pyramid.downsample` (`bloomDownsample`)
  - `pyramid.upsample` (`bloomUpsample`)

## 3. Pattern Matching + Substitution
- Pattern matching implemented at node-level transform analysis.
- Execution steps include primitive metadata:
  - kind, descriptor id, module id, entry point, substituted flag.
- Planner diagnostics now include primitive selection counts.

## 4. Queue-Native Execution Path
- Executor queue path upgraded to support indirect dispatch buffers when a resource manager is available.
- Contiguous queue steps in the same `queueControl.groupId` are executed in iteration-major segment order (`A1,B1,A2,B2`), not step-major batches (`A1,A2,B1,B2`).
- Queue iterations now populate:
  - indirect args buffers
  - queue counter buffers
- Runtime metrics include:
  - queue iterations
  - queue overflow count
  - queue indirect dispatch count
  - queue convergence check count

## 5. Slot-Backed Residency and Aliasing
- Resource manager now works by slot key, not only resource id.
- Added resource-to-slot registration and residency snapshot reporting.
- Executor materializes plan resources by `allocation.slot`.

## 6. Observability Upgrade
- Pass stats now include:
  - fallback count
  - variant
  - dispatch domain
  - last workgroup geometry
  - per-pass GPU ms placeholders (enabled when timestamp-query capability is available)
- Profiler snapshot now reports:
  - queue metrics
  - residency snapshot
  - dispatch geometry per pass

## 7. Autotuner Closed Loop
- Autotuner now accepts profiler data and runtime fingerprints:
  - adapter fingerprint
  - browser fingerprint
  - kernel signature
  - resolution class
- Candidate scoring now uses frame p95, fallback rate, and residency estimates.
- Profiles persist with a fingerprint key.

## 8. Hard Gates and Regression Coverage
- Compatibility matrix and v3 core tests expanded.
- Benchmark corpus gate tests include:
  - full-corpus pass path
  - regression-fail path
- Capability-loss fallback test added (subgroup unavailable path).
- Bench script enforces per-scene acceptance checks:
  - `scripts/bench-v3.mjs`

## Notes
- DSL compatibility contracts remain unchanged.
- Queue execution is indirect-buffer capable with segment-level ordering, but still host-orchestrated (not full GPU work-graph dispatch chaining yet).
