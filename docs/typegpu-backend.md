# TypeGPU backend boundary

TypeGPU is Hydra's only GPU backend. It owns the GPU root, schemas, buffers,
textures, samplers, layouts, bind groups, render pipelines, compute pipelines,
screen presentation, and the render pipeline used to convert capture frames to
`rgba8unorm`.

## Compilation and execution

Calling `.out()` synchronously performs these steps:

1. Split the Hydra chain at built-in renderpass boundaries.
2. Lower each section to a strict pass object containing an entry body, typed
   shader-function descriptors, uniform bindings, texture bindings, and
   resolution scale.
3. Materialize every reachable descriptor as a `tgpu.fn`, link its function and
   resource dependencies through TypeGPU, and reject duplicate, recursive,
   missing, or unreachable functions.
4. Ask the TypeGPU pipeline cache for the pass's fragment or compute pipeline.
   Compute passes do not carry a second compatibility implementation.
5. Prepare every pipeline and per-pass buffer before replacing the active graph.
   Compilation failures throw at the `.out()` call and leave the previous graph
   intact; there is no delayed error envelope or diagnostic event bus.

On each frame the runtime updates sources, orders `o0`–`o3` by their output
dependencies, executes every pass once, records required feedback history, and
presents either one output or the four-output grid.

Device loss is terminal for a runtime instance. The renderer releases its
TypeGPU root, the runtime stops and disposes its sources and outputs, and callers
create a new runtime rather than continuing with resources from a lost device.

## The small native WebGPU edge

TypeGPU 0.11.9 accepts a caller-owned `GPUCommandEncoder`, but does not wrap all
operations Hydra must place on that same ordered command stream. Those few
operations live directly in `webgpu/renderer.ts`, the TypeGPU backend itself:

- create and submit the shared encoder;
- encode history texture copies and capture texture-to-buffer copies;
- map a capture buffer for WebCodecs;
- upload a flipped external image, because TypeGPU's texture writer has no
  `flipY` option.

This is explicit interoperability, not a second renderer or abstraction layer.
No raw pipeline, shader module, bind-group layout, bind group, buffer schema, or
texture lifecycle exists outside TypeGPU. Repository lint rejects native GPU
operations anywhere outside the backend file.

## Shader authoring boundary

The built-in formulas remain WGSL function bodies, but they are no longer
concatenated into a global source block. Every function has an explicit TypeGPU
schema and is instantiated through TypeGPU's supported `tgpu.fn` string
overload. TypeGPU validates the signatures, assigns final symbols, links only
reachable dependencies and bound resources, and generates the complete shader.

This is deliberate. Hydra composes arbitrary chains and nested graphs while the
instrument is running. TGSL's `'use gpu'` functions are transformed by a build
plugin, so they are useful for statically authored shader logic but cannot
replace the runtime-generated entry body. Translating the formulas to TGSL
would add a compiler plugin and a second operator dialect without removing that
runtime boundary. The typed WGSL-function route therefore gives this engine the
full TypeGPU ownership it needs while preserving exact Hydra semantics and a
single shader model.

The repository test suite resolves every built-in through TypeGPU. Browser
verification additionally compiles and executes those generated shaders on an
actual WebGPU device.

## Intentionally absent

The backend does not collect timestamps, profiles, shader dumps, capability
mirrors, debug events, scheduling metadata, sparse passes, dynamic transform
extensions, or compatibility filter modes. None of those values affected the
instrument's output or UI.
