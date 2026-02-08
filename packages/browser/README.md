# hydra-synth

Browser host package for Hydra v2.

Includes:

- `BrowserHost` (canvas + RAF ownership)
- `WebGPURenderer` (WebGPU backend)
- `HydraBrowserRuntime` (core + host + renderer composition)
- `HydraSourceNode` / `WebGPUOutputNode` adapters

Use `createHydraBrowserRuntime()` for default composition, or wire `BrowserHost` + `WebGPURenderer` explicitly.
