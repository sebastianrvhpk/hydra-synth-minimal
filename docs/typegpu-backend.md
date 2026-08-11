# TypeGPU shader and renderer boundary

TypeGPU is Hydra's WebGPU backend and the canonical shader-linking layer. It
owns WebGPU schemas, buffers, textures, samplers, layouts, bind groups, fragment
pipelines, screen presentation, and the fragment pipeline used to convert
capture frames to `rgba8unorm`.

## Compilation and execution

Calling `.out()` synchronously performs these steps:

1. Split the Hydra chain at built-in renderpass boundaries.
2. Lower each section to a strict pass object containing an entry body, typed
   shader-function descriptors, uniform bindings, texture bindings, and
   resolution scale.
3. Materialize every reachable descriptor as a `tgpu.fn`, link its function and
   resource dependencies through TypeGPU, and reject duplicate, recursive,
   missing, or unreachable functions.
4. Ask the TypeGPU pipeline cache for the pass's fragment pipeline.
5. Prepare every pipeline and per-pass buffer before replacing the active graph.
   Compilation failures throw at the `.out()` call and leave the previous graph
   intact; there is no delayed error envelope or diagnostic event bus.

On each frame the runtime updates sources, orders `o0`–`o3` by their output
dependencies, executes every pass once, records required feedback history, and
presents either one output or the four-output grid.

On WebGL2, step 4 instead resolves the same TypeGPU function graph to canonical
WGSL, translates it to GLSL ES 3.00 through Naga, and creates a fragment
program. No transform has a parallel GLSL implementation.

Device or context loss is terminal for a runtime instance. The renderer releases
its resources, the runtime stops and disposes its sources and outputs, and
callers create a new runtime rather than continuing with invalid resources.

## Backend selection and precision

`createHydraBrowserRuntime()` defaults to `backend: 'auto'`: it initializes
WebGPU first and falls back to WebGL2 if WebGPU is unavailable. Passing
`backend: 'webgpu'` or `backend: 'webgl2'` forces one implementation, which is
useful for verification.

WebGL2 uses `rgba16float` render targets when `EXT_color_buffer_float` is
available. Otherwise it degrades render targets to `rgba8unorm`. Graph shape,
dynamic callbacks, sequences, texture inputs, renderpass boundaries, feedback,
history, source uploads, and output dependencies remain unchanged; only numeric
range and precision are reduced.

## The small native WebGPU edge

TypeGPU 0.11.9 accepts a caller-owned `GPUCommandEncoder`, but does not wrap all
operations Hydra must place on that same ordered command stream. Those few
operations live directly in `webgpu/renderer.ts`, the TypeGPU backend itself:

- create and submit the shared encoder;
- encode history texture copies and capture texture-to-buffer copies;
- map a capture buffer for WebCodecs;
- upload a flipped external image, because TypeGPU's texture writer has no
  `flipY` option.

This is explicit interoperability inside the WebGPU implementation. The runtime
sees only opaque textures, buffers, frames, and pipelines through the shared
renderer boundary; native WebGPU and WebGL2 resources do not leak into the
graph, source, output, feedback, or capture scheduler.

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

Every built-in is represented as a fragment pass. This keeps the shader graph
portable: WebGPU executes the linked TypeGPU program directly, while the WebGL2
fallback translates that same resolved WGSL program instead of maintaining a
second implementation of each transform.

The repository test suite resolves every built-in through TypeGPU. Browser
verification additionally compiles and executes those generated shaders on an
actual GPU backend.

## Intentionally absent

The backend does not collect timestamps, profiles, shader dumps, capability
mirrors, debug events, scheduling metadata, sparse passes, dynamic transform
extensions, or compatibility filter modes. None of those values affected the
instrument's output or UI.
