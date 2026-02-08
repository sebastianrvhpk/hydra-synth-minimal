# hydra-synth-core

Core runtime package for Hydra v2.

Includes:

- lifecycle orchestration (`HydraEngine`)
- typed error envelope (`HydraEngineError`)
- transform registry (`HydraTransformRegistry`)
- WGSL pass generation (`compileWgslPass`)

No DOM, `window`, `document`, `navigator`, or WebGPU API usage is allowed in this package.
