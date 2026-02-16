# hydra-synth-core

Core runtime and compiler package for Hydra v2.

## Includes

- engine lifecycle orchestration (`HydraEngine`)
- typed error envelope and failure wrapper (`HydraEngineError`, `HydraEngineFailure`)
- transform registry and chain generation (`HydraTransformRegistry`, `HydraGraphNode`)
- WGSL pass compilation (`compileWgslPass`) with:
  - multipass splitting for standalone transform types (`renderpass`, `simulation`, `analysis`, `kernel`)
  - dynamic uniform packing for scalar/vector callback inputs
  - storage buffer/texture resource bindings
  - pass scheduling metadata (`resolutionScale`, `updateRate`, `sparse`)
  - dispatch metadata (direct/indirect, pixel2d and linear1d domains)
  - fallback pass chains for capability-sensitive kernels
- DSL-to-IR lowering (`lowerDslToIr`) and IR diagnostics (`dumpKernelGraph`, `validateKernelGraph`)
- execution-plan compilation/validation (`compileGraph`, `validateExecutionPlan`), including:
  - variant candidate selection metadata (`generic`, `tiled`, `subgroup`)
  - queue-domain policy metadata for sparse linear kernels
  - resource allocation/alias planning diagnostics
- primitive registries and references:
  - primitive descriptors and WGSL module registry
  - CPU reference implementations for baseline correctness checks

## Environment Contract

This package is platform-neutral by design:

- no DOM globals (`window`, `document`, `navigator`)
- no direct WebGPU API usage
- no browser-only host assumptions
