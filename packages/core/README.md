# hydra-synth-core

Core runtime and compiler package for Hydra v2.

## Includes

- engine lifecycle orchestration (`HydraEngine`)
- typed error envelope and failure wrapper (`HydraEngineError`, `HydraEngineFailure`)
- transform registry and chain generation (`HydraTransformRegistry`, `HydraGraphNode`)
- default low-level transform surface includes loopable noise/fractal generators, blend-mode operators, modulate domain displacement, morphology/simulation passes, analysis probes, and linear particle buffer kernels
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
- systems/macros conventions: see `SYSTEMS_CONVENTIONS.md` for the macro-level API contract

## Systems Layer

Macro-level systems are graph builders that stitch multiple transforms into a cohesive unit. They return standard `HydraGraphNode` instances and are compatible with the normal DSL chain.

Runtime hosts can expose them with `attachSystems`:

```ts
import { attachSystems } from 'hydra-synth-core'

attachSystems(bindings)
bindings.systems.particles({ seed: 7, decay: 0.99 }).out()
```

Legacy top-level aliases (`particles`, `reactionDiffusion`, `fluid`) remain available for compatibility when `attachSystems` is used with defaults.

## Environment Contract

This package is platform-neutral by design:

- no DOM globals (`window`, `document`, `navigator`)
- no direct WebGPU API usage
- no browser-only host assumptions
