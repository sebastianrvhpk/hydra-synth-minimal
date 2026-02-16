# Hydra v3 Compute-Core Specification (Phase F Baseline)

## Scope
Hydra v3 introduces a compute-core-first architecture where the DSL is a frontend boundary and all execution is planned through a canonical compute graph.

## Runtime Defaults (Phase 6)
1. Runtime execution mode default is `auto`.
2. `auto` is v3-preferred and routes through plan compile + executor first.
3. Deterministic fallback to legacy pass execution remains enabled.
4. Explicit `legacy` override remains supported for compatibility rollback.

## Queue Execution Policy
Queue-domain execution metadata is explicit and validated:
1. `termination` policy (`until_empty` or `fixed_iterations`).
2. `overflow` policy (`ignore` or `terminate_segment`) with bounded overflow thresholds.
3. `convergence` policy (`hooks`, `queue_counter`, `hook_or_queue_counter`, `none`, `legacy_decay`) with explicit check intervals.

Profiler queue diagnostics include:
1. total iterations
2. overflow count
3. overflow event count
4. termination reason
5. convergence checks and checks-per-segment

## Autotune Model
Autotune candidate selection is measured:
1. warmup trial window
2. sampled trial window
3. deterministic tie-break ordering

Profiles are cached by:
1. profile key
2. adapter/browser fingerprint
3. kernel signature
4. resolution class
5. candidate signature

## Workload Classes
1. `image`: dense pixel-domain processing.
2. `data`: linear buffer-domain processing.
3. `reduction`: aggregate/statistical kernels.
4. `sparse_queue`: queue-driven sparse workloads.
5. `mixed`: image + data + reduction composition.

## KPI Schema
Per benchmark run, capture:
1. `avgFrameMs`
2. `p95FrameMs`
3. `p99FrameMs`
4. `avgCpuEncodeMs`
5. `avgGpuMs` (nullable if unsupported)
6. `avgDispatchCount`
7. `fallbackRate`
8. `peakResidentBytes`

## Capability Matrix
1. `subgroups`
2. `maxWorkgroupStorageBytes`
3. `indirectDispatch`
4. `timestampQuery`

## Baseline Corpus
See `packages/browser/src/benchmark/corpus.ts` for the initial benchmark scene list and acceptance gates.

## Acceptance Gates
Each corpus scene defines:
1. `maxAvgFrameMs`
2. `maxP95FrameMs`
3. `maxFallbackRate`

Benchmark reports are validated by `validateBenchmarkReportV3`.
