# Hydra v2 Hidden Graphics Engine (Core Reverse Engineering Notes)

Scope: `packages/core/src/transforms/default-transforms.ts`, `packages/core/src/types.ts`.

This document focuses on the low-level primitives exposed by the core transform registry and the "hidden gem" compute and analysis passes. It assumes you will bypass the high-level live-coding API and wire transforms directly.

## Engine Plumbing You Can Exploit

The transform model is fully described by `HydraTransformDefinition` in `packages/core/src/types.ts`. Key fields relevant to compute and analysis:

- `type`: includes `simulation`, `analysis`, and `kernel` in addition to standard image-space `src/coord/color/combine`.
- `resources`: optional persistent or frame resources (buffers/textures). These map directly to storage bindings.
- `analysisOut`: indicates output values that become uniform bindings (`analysis_*`), with types `float`/`vec2`/`vec3`/`vec4`.
- `executionDomain`: `pixel2d` (default) or `linear1d` for compute kernels.
- `dispatchItems`: count for `linear1d` dispatches.
- `writesOutput`: can be `false` to run compute without writing a render target.
- `updateRate` and `resolutionScale`: sub-frame scheduling and downscaled dispatch for analysis/simulation.
- `lifetime` and `stateKey`: explicit state persistence for resources (`persistent` vs `frame`).

Resource types (`HydraTransformResource`) are direct WebGPU storage bindings:

- `storageBuffer` with `elementType` and `minLength`.
- `storageTexture2D` and `storageTexture2DArray` with `format` and scale controls.
- `access`: `read`, `write`, `read_write`.

The important pattern: a transform can both read `prevBuffer` (implicit) and read/write explicit storage resources, with lifetime control and a stable `stateKey`.

## 1) Particle System (Compute Kernels)

Transforms: `particleInit` and `particleStep` (type `kernel`).

### Execution + Resources

- `executionDomain: 'linear1d'`
- `dispatchItems: 4096`
- `writesOutput: false` (pure compute)
- Resource: `storageBuffer` named `particleState`
  - `elementType: 'vec4f'`, `minLength: 4096`
  - `access: 'read_write'`
  - `lifetime: 'persistent'`
  - `stateKey: 'particle-state'`

This is a fixed-size particle buffer of 4096 elements. Because the dispatch is linear 1D, each invocation corresponds to one particle. The buffer persists across frames via `stateKey`.

### State Layout (vec4f)

From `particleInit`:

```
particleState[index] = vec4f(uv, jitter * 0.5 + 0.5, 1.0);
```

- `x,y`: particle position in UV space (`uv` computed from linear index via `hydraUvFromLinearIndex` using current framebuffer dimensions).
- `z`: seeded jitter in [0, 1] (noise value remapped from [-1, 1] -> [0, 1]).
- `w`: constant 1.0 (acts like alive/alpha, but unused by the step).

From `particleStep`:

```
particleState[index] = vec4f(uv, velocity.x * 0.5 + 0.5, 1.0);
```

The `z` channel is overwritten with `velocity.x` remapped to [0, 1]. So the layout is not a fixed semantic contract; `z` is a scratch channel you can repurpose. `w` remains 1.0.

### WGSL Math

Step logic, per particle:

1. Load `state = particleState[index]`.
2. `uv = fract(state.xy)` to keep positions wrapped in [0, 1).
3. Time-dependent curl-like velocity from noise:
   - `vx = hydraNoise(vec3f(uv * 12.7 + vec2f(31.3, 17.9), t))`
   - `vy = hydraNoise(vec3f(uv * 11.1 + vec2f(7.7, 53.2), t + 11.0))`
4. `velocity = vec2f(vx, vy) * 0.5`
5. Convert velocity to UV delta using `texel = (1/width, 1/height)` and `drift`:
   - `uv = fract(uv + velocity * drift * texel)`

The motion is a divergence-free-ish flow field built from two different noise slices. Because displacement is scaled by a single texel, this is in pixel-space, independent of resolution.

### Why This Is Cool

- The kernel never renders. It is a persistent particle state update you can read from any custom render pass. This is a raw compute primitive, not a visual effect.
- The state buffer is a generic `vec4f[]`. You can encode position, velocity, lifetime, color index, or custom attributes. The shipped step only uses xy and overwrites z; you can safely redefine that contract.
- Because it runs in a 1D dispatch, you are not locked to screen-space mapping. You can reinterpret indices as any topology and still derive UVs via `hydraUvFromLinearIndex`.

## 2) Physical Simulations (Reaction-Diffusion and Fluids)

Transforms: `rdStep`, `advect`, `diffuse` (type `simulation`).

These operate on the implicit `prevBuffer` texture, which is the prior output of the pipeline (ping-ponged internally). State persistence here is not a named resource; it is implicit through `prevBuffer`.

### Reaction-Diffusion (rdStep)

WGSL implements a Gray-Scott system on the RG channels:

- `a = c.x`, `b = c.y`
- 3x3 Laplacian with a 9-point stencil:
  - Cross neighbors: weight 0.2
  - Corners: weight 0.05
  - Center: subtract 1.0

Equations:

```
reaction = a * b * b
a += (diffA * lapA - reaction + feed * (1 - a)) * dt
b += (diffB * lapB + reaction - (kill + feed) * b) * dt
```

Clamp to [0, 1]. Output is `vec4f(a, b, 0.0, 1.0)`.

Interpretation:

- R channel = A concentration, G channel = B concentration.
- Z is unused, W is constant 1.
- Sampling uses `fract(_st + offset)`, giving a toroidal boundary condition.

### Advection (advect)

Per-pixel semi-Lagrangian advection:

1. `center = sample(prevBuffer, _st)`
2. Velocity field is encoded in RG of the same buffer:
   - `velocity = (center.xy * 2.0 - vec2f(1.0)) * amount`
3. Backtrace in UV space by one step:
   - `backtraceUv = fract(_st - velocity * texel)`
4. Sample advected value at `backtraceUv`.
5. Output `vec4f(advected.xyz, center.w)`.

This is a single-pass advection where velocity and quantity are co-located. It is stable but dissipative (typical for semi-Lagrangian).

### Diffusion (diffuse)

A 4-neighbor Jacobi smoothing step:

```
mean = (n + s + e + w) * 0.25
out = mix(c, mean, k)
```

with `k = clamp(rate, 0, 1)`. RGB are diffused, alpha is preserved.

### Why This Is Cool

- `rdStep` is a full reaction-diffusion engine in 20 lines of WGSL. You can treat RG as two coupled scalar fields and feed them into any visual transform.
- `advect` and `diffuse` are the core of a minimal fluid solver. You can stack: external force injection -> advect -> diffuse -> render.
- Because these are `simulation` transforms, they are composable with the rest of the graph; they can be embedded as feedback loops with `prev` or `prevN`.

## 3) Analysis Probes and Audio/Video Reactivity

Transforms: `lumaProbe`, `motionProbe`, `histogramProbe`, `edgeDensityProbe` (type `analysis`).

The design pattern:

- Each probe computes a per-pixel metric and returns it as `vec4f`.
- `analysisOut` declares uniform bindings that surface to the engine as scalar/vec values.
- `resolutionScale: 0.5` and `updateRate` reduce compute cost and stabilize signals.

The analysis reduction mechanism is not defined in these two files, but the presence of `analysisOut` strongly implies an engine-side reduction (likely average or sum) of the per-pixel output into a uniform.

### Luma Probe (lumaProbe)

Inputs: `radius` (default 1.0). Output uniform: `analysis_luma` (float).

Math:

- Sample center + 4-neighbors (N,S,E,W) with a texel radius scaled by `radius`.
- Weighted luma:
  - `0.4 * L(center) + 0.15 * (L(n) + L(s) + L(e) + L(w))`

This is a low-pass luminance estimate, resilient to noise.

### Histogram Probe (histogramProbe)

Output uniform: `analysis_hist4` (vec4).

Math:

```
b0 = luma < 0.25
b1 = 0.25 <= luma < 0.5
b2 = 0.5 <= luma < 0.75
b3 = luma >= 0.75
```

Each pixel contributes a one-hot bin. The reduced vec4 is effectively a 4-bin luminance histogram.

### Edge Density Probe (edgeDensityProbe)

Inputs: `amount` (default 1.0). Output uniform: `analysis_edge_density` (float).

Math:

- Compute luminance differences across axis-aligned neighbors:
  - `dx = e - w`, `dy = n - s`
- `edge = clamp(length(vec2(dx, dy)) * amount * 2.0, 0, 1)`

This is a Sobel-lite gradient magnitude (no diagonals).

### Motion Probe (motionProbe)

Inputs: `sensitivity` (default 1.0). Output uniform: `analysis_motion` (float).

Resources:

- `storageTexture2D` named `motionState`
  - `access: 'read_write'`
  - `format: 'rgba16float'`
  - `lifetime: 'persistent'`
  - `stateKey: 'motion-probe-state'`

Math:

1. Convert UV to integer pixel index.
2. `current = sample(prevBuffer, _st)`
3. `previous = textureLoad(motionState, pix)`
4. `motion = clamp(length(current.xyz - previous.xyz) * sensitivity, 0, 1)`
5. `textureStore(motionState, pix, current)`

This is a persistent temporal difference at half resolution. Because it uses a storage texture with explicit state, it is immune to feedback graph structure and always compares to the previous frame.

### Why This Is Cool

- These probes give you GPU-side signal extraction for reactive systems (audio/video or generative feedback).
- The outputs are scalar/vec uniforms, not textures, which makes them cheap to thread into any transform parameter.
- `motionProbe` provides a robust temporal derivative that is independent of how you compose the render graph, because it keeps its own persistent storage.

## Practical Notes for Bypassing High-Level Abstractions

- Compute kernels (`kernel`) do not need to produce an output texture. You can run them solely to update persistent buffers or textures.
- You can read a persistent `storageBuffer` or `storageTexture` in any custom transform by declaring the resource with the same `stateKey`.
- `simulation` transforms that read `prevBuffer` are compatible with feedback chains; the persistence is implicit in the ping-pong mechanism.
- `analysis` transforms can be used as hidden metering passes. Even if you never render their output, the `analysisOut` values can drive the rest of the graph.

If you want to render particles or visualize these simulations directly, the missing piece is a custom render pass that reads the persistent state (buffer/texture) and writes to an output texture. The default library intentionally leaves that final rasterization step to you.

## Systems Layer (Macro-Level Graph Builders)

Core now includes a macro-level systems layer exposed via `attachSystems`. Systems are not WGSL transforms; they are graph constructors that wire multiple low-level passes into a cohesive unit while staying compatible with the standard DSL chain.

Key characteristics:

- Systems return `HydraGraphNode` instances, so they can be composed like normal generators.
- Inputs are texture-first: pass nodes anywhere a field or mask makes sense.
- Defaults are tuned for immediate visual feedback.
- State is explicit (e.g., particle reset events, seed pulses).

Canonical systems (as shipped):

- `systems.particles(...)`: particle buffer + scatter + render.
- `systems.reactionDiffusion(...)`: RD sim with seed injection.
- `systems.fluid(...)`: velocity + dye advection with force/source.
- `systems.feedback(...)`: opinionated feedback loop using `prev`.
- `systems.displace(...)`: multi-layer domain displacement.
- `systems.probe(...)`: convenience wrapper for analysis probes.

Conventions and parameter contracts live in `packages/core/SYSTEMS_CONVENTIONS.md`.
