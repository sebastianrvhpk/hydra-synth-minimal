# Hydra Systems Conventions

This document defines conventions for macro-level "systems" in Hydra core. A system is a graph builder that stitches multiple transforms into a cohesive, playable unit. Systems are not WGSL transforms; they are composition utilities that return a `HydraGraphNode` and remain compatible with the standard DSL chain.

## Scope

These conventions apply to any macro-level function exposed by core that builds multi-pass graphs or manages state. They do not apply to low-level transform definitions in `default-transforms.ts`.

## Terminology

- System: a function that assembles multiple transforms into a reusable patch.
- Transform: a single WGSL-defined operation in one execution domain.
- Node: a `HydraGraphNode` produced by a generator or system.

## Input Conventions

- Texture-first modulation: system inputs should accept Hydra nodes (textures) wherever modulation makes sense.
- Scalars remain optional: numeric inputs are still supported for global knobs.
- Callback values: if a parameter accepts time-varying values, it should accept a callback `(props: HydraFrameState) => number` or array.
- Default behavior: omit inputs and the system should still produce useful visuals.

## Parameter Naming

- `amount`: normalized [0, 1] mix or strength.
- `speed`: units per second; avoid arbitrary multipliers.
- `decay` or `dissipation`: stable range [0.95, 0.999] for feedback loops.
- `gain`: post-amplification, default 1.0.
- `gamma`: perceptual shaping, default 1.0.
- `seed`, `source`, `force`, `emit`, `mask`: texture inputs with clear roles.

## Texture Encoding Rules

- Scalar masks: use luminance of RGB, range [0, 1].
- Vector fields: use RG for XY in [0, 1], remapped to [-1, 1].
- Color seeds: use full RGBA; alpha acts as intensity when applicable.
- Directional flow: document whether the system expects normalized or absolute vectors.

## Reset and State

- If the system is stateful, expose a `reset` boolean or a `resetEvent` name.
- Reset should be explicit; avoid hidden implicit resets except for a one-time initialization.
- Systems that require an initialization pass should do it once and then run steady-state updates.

## Output Conventions

- Outputs must be standard textures compatible with the Hydra DSL.
- Document the output encoding if it is not visually direct (e.g., vector fields).
- Prefer visually interpretable outputs by default; provide explicit knobs for raw-field output if needed.

## Scheduling and Execution

- Multi-pass systems should keep transform ordering stable and documented.
- Avoid mixing unrelated concerns inside a single system; compose systems instead.
- Use existing transform types (`renderpass`, `simulation`, `kernel`) and avoid introducing new types for systems.

## Defaults and Playability

- Defaults should be tuned for immediate feedback with no external modulation.
- Favor predictability over correctness when live-coding ergonomics require it.
- When a system is sensitive, provide guard rails (clamp ranges, minimums).

## Documentation Requirements

- Each system should document:
- Input types (texture vs scalar), ranges, and semantics.
- State/reset behavior.
- Output encoding.
- Example usage with and without modulation.
