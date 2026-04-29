# Fragment Pipeline Architecture

## Overview

Hydra now executes shader passes as a **fragment-first pipeline**.

Every pass is compiled into WGSL with:
- `vsMain`: fullscreen-triangle vertex stage
- `fsMain`: fragment stage that evaluates the transform chain

The runtime renders each pass into an offscreen texture, then feeds that texture
into the next pass through `prevBuffer` semantics.

## Design Goals

1. Keep transform semantics stable (`src`, `coord`, `color`, `combine`, `renderpass`).
2. Keep multipass scheduling features (`resolutionScale`, `updateRate`, `sparse`).
3. Keep deterministic pass ordering and plan diagnostics.
4. Remove dependency on legacy non-fragment execution paths for normal rendering.

## End-to-End Flow

### 1) DSL chain to pass groups

`splitPasses()` partitions transform chains around standalone `renderpass`
operators so multipass effects remain explicit and deterministic.

### 2) Pass compilation

`compileWgslPass()` lowers each pass group into a fragment render shader:
- uniform packing for callback-based dynamic values
- nested graph argument evaluation
- texture binding registration (`prevBuffer`, source textures, history refs)
- generated WGSL utilities + transform function declarations

### 3) Runtime plan routing

`HydraBrowserRuntime.routeGraphRender()` compiles a plan from active transforms
and executes through `HydraExecutor`, which delegates concrete rendering to
`WebGPUOutputNode`.

### 4) Pipeline cache

`PipelineCache` compiles and stores `GPURenderPipeline` instances by signature+
WGSL hash. Compilation is async to reduce main-loop stalls.

### 5) Output execution

`WebGPUOutputNode.tick()`:
1. resolves pass list and render pipelines
2. resolves input textures (`prevBuffer`, history, external sources)
3. updates global/dynamic uniforms
4. renders full-screen triangle into ping-pong/scale target
5. stores pass output for sparse scheduling/history reads

### 6) Presentation

`WebGPURenderer.renderTextureToScreen()` draws the selected output texture to
canvas; `renderAllOutputsToScreen()` tiles up to four outputs.

## Resource Model

### Ping-pong targets

Each output node maintains two primary textures:
- current read texture
- next write texture

Passes alternate between them at full resolution.

### Scaled targets

When a pass has `resolutionScale < 1`, a scale-specific texture pair is used.
Pairs are cached and LRU-pruned.

### History ring

Outputs can expose frame history via `historyOffset`. Requested depth is
re-derived across all live outputs and maintained as ring textures.

## Uniform and Binding Layout

Bindings are generated per pass shape and reflected in pipeline layout:
- `@binding(0)`: global uniforms (`time`, `bpm`, `width`, `height`)
- `@binding(1)`: dynamic uniform block (only when needed)
- `@binding(2)`: sampler (only when textures are used)
- `@binding(3+)`: sampled input textures

The bind-group cache key includes pipeline, global buffer, optional dynamic
buffer, sampler, and resolved textures.

## Scheduling Semantics

### updateRate

Supported scheduling policies:
- `everyFrame`
- `{ everyNFrames }`
- `{ onEvent }`

### sparse

When `sparse` is enabled and prior output is valid, the pass can skip execution
until a schedule/event condition requires refresh.

## Capture Path

Capture APIs remain compatible with fragment runtime output:
- deterministic stepping (`captureHydraFrameSequence`)
- optional GPU queue sync for frame-complete reads
- GPU readback path with optional conversion to `rgba8unorm`
- WebCodecs MP4 recording path (`captureHydraVideo`)

## Diagnostics

### Runtime profiler snapshot

Profiler data includes:
- frame timing window (`avg/p95/p99`)
- per-pass encode timing + fallback count
- routing mode diagnostics
- capability summary (fragment target format + color attachment limits)

### Shader dump

`runtime.dumpShaders()` returns generated WGSL from the latest compiled plan.

## Migration Notes

### Execution mode values

Use:
- `auto`
- `fragment`

### Removed assumptions

Do not assume:
- kernel-style launch behavior
- legacy backend feature gating in render path
- compiled-pass fallback chains or variant-selection ladders
- primitive-substitution metadata paths for alternate backends
- storage-capability probing as a rendering decision input

## Extension Guidelines

When adding transforms:
1. define WGSL body in `default-transforms.ts`
2. choose transform type correctly (`src/coord/color/combine/combineCoord/renderpass`)
3. avoid backend-specific assumptions in transform WGSL
4. verify pass schedule behavior under `sparse` and scaled resolution

## Troubleshooting

### First frame not rendered for a new effect

Likely async pipeline compilation warm-up. The pipeline cache will settle after
first compile completes.

### Missing texture input

Verify source binding resolves to a valid output/source texture and check
history offset availability.

### Capture mismatch vs canvas

For deterministic capture, enable GPU readback and wait for submitted work when
needed.

## Key Files

- `packages/synth/src/core/transforms/compile-wgsl.ts`
- `packages/synth/src/core/transforms/split-passes.ts`
- `packages/synth/src/runtime/runtime.ts`
- `packages/synth/src/runtime/output-node.ts`
- `packages/synth/src/webgpu/pipeline-cache.ts`
- `packages/synth/src/webgpu/renderer.ts`
- `packages/synth/src/capture/frame-sequence.ts`
