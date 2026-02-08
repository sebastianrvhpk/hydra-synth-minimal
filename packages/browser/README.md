# hydra-synth

Browser host package for Hydra v2.

Includes:

- `BrowserHost` (canvas + RAF ownership)
- `WebGPURenderer` (WebGPU backend)
- `HydraBrowserRuntime` (core + host + renderer composition)
- `HydraSourceNode` / `WebGPUOutputNode` adapters
- sequential multipass execution for `renderpass`-compiled chains
- dependency-aware output scheduling (topological when possible, stable fallback on cycles)

Use `createHydraBrowserRuntime()` for default composition, or wire `BrowserHost` + `WebGPURenderer` explicitly.
