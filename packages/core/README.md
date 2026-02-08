# hydra-synth-core

Core runtime package for Hydra v2.

Includes:

- lifecycle orchestration (`HydraEngine`)
- typed error envelope (`HydraEngineError`)
- transform registry (`HydraTransformRegistry`)
- WGSL pass generation (`compileWgslPass`)
- multipass graph compilation via `renderpass` transforms
- dynamic uniform packing for scalar and vector callback inputs

No DOM, `window`, `document`, `navigator`, or WebGPU API usage is allowed in this package.
