# hydra-synth-core

Core runtime and compiler package for Hydra v2.

## Includes

- engine lifecycle orchestration (`HydraEngine`)
- typed error envelope and failure wrapper (`HydraEngineError`, `HydraEngineFailure`)
- transform registry and chain generation (`HydraTransformRegistry`, `HydraGraphNode`)
- default transform surface for generators, coordinates, color, combineCoord, and renderpass post-processing (including `noiseLoop`, `fbm`, `ridged`, `turbulence`, and extended blend modes like `screen`, `overlay`, `softLight`, `hardLight`, `colorDodge`, `colorBurn`)
- WGSL pass compilation (`compileWgslPass`) with:
  - multipass splitting for standalone renderpass transforms
  - dynamic uniform packing for scalar/vector callback inputs
  - pass scheduling metadata (`resolutionScale`, `updateRate`, `sparse`)
  - fragment-stage metadata for pixel2d execution
- DSL-to-IR lowering (`lowerDslToIr`) and IR diagnostics (`dumpKernelGraph`, `validateKernelGraph`)
- execution-plan compilation/validation (`compileGraph`, `validateExecutionPlan`), including:
  - deterministic pass ordering and dependency barriers
  - resource allocation/alias planning diagnostics
- CPU reference implementations for baseline correctness checks

## Environment Contract

This package is platform-neutral by design:

- no DOM globals (`window`, `document`, `navigator`)
- no direct WebGPU API usage
- no browser-only host assumptions
