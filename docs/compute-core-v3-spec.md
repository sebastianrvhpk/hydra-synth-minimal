# Hydra v3 Compute-Core Specification (Phase F Baseline)

## Scope
Hydra v3 introduces a compute-core-first architecture where the DSL is a frontend boundary and all execution is planned through a canonical compute graph.

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

