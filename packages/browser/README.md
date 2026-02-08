# hydra-synth

Browser host package for Hydra v2.

Includes:

- `BrowserHost` (canvas + RAF ownership)
- `WebGPURenderer` (WebGPU backend)
- `HydraBrowserRuntime` (core + host + renderer composition)
- `HydraSourceNode` / `WebGPUOutputNode` adapters
- sequential multipass compute dispatch for compiled chains (`.out()` remains screen render/present)
- dependency-aware output scheduling (topological when possible, stable fallback on cycles)

Use `createHydraBrowserRuntime()` for default composition, or wire `BrowserHost` + `WebGPURenderer` explicitly.
