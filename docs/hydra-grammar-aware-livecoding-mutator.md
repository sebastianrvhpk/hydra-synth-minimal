# Hydra Grammar-Aware Livecoding Mutator

This document defines the current LLM-based livecoding mutator. It is not a
patch generator. It starts from an authored Hydra patch, reads the patch as a
typed signal-flow graph, and proposes localized mutations that preserve the
patch's circuit logic.

The goal is to help livecode through a patch:

```text
authored patch
-> grammar-aware reading
-> preservation contract
-> scoped mutation candidates
-> user visual review
-> accepted candidate becomes the next authored patch
```

Do not treat generated candidates as successful examples until they have been
rendered and reviewed by the user.

## 1. Difference From Generation

The previous "generate ten patches" direction failed because it let the system
invent whole circuits. The mutator works differently:

```text
new-from-scratch generator:
grammar -> patch

livecoding mutator:
patch -> module map -> local edit -> same patch identity
```

The authored patch remains the source of truth. The mutator may bend it,
intensify it, clarify it, or open a nearby branch, but it should not replace the
composition with a generic Hydra sketch.

## 2. Required Input

The mutator can work from raw Hydra code, but it works better when the prompt
contains:

- the current patch
- any helper vocabulary in scope, especially `ns`, `rn`, `A`, `B`, `TAU`
- whether the user wants micro, module, or circuit mutations
- what visual behavior the user wants to preserve
- what behavior currently feels wrong, weak, too dim, too static, too diagonal,
  too artifact-heavy, or too arbitrary

Optional annotation comments can be used, but should not be required:

```js
// @field pre-ingress memory drift
// @ingress hard tiled mask
// @material chroma oscillator material
// @memory conditioner blur/sharpen tension
```

## 3. Output Contract

A mutator response should have this structure:

```text
1. Reading
   Brief module map of the current patch.

2. Preservation Contract
   What must remain true for the patch to still be this patch.

3. Mutation Candidates
   Three to five candidates, each with:
   - scope: micro | module | circuit
   - target: field | gate | material | memory | buffer | parameter field
   - intent: what behavior is being changed
   - math/signal reason: why the edit should affect the rendered system
   - Hydra code: complete replacement patch, or exact replacement block
   - risk: what could make it fail visually

4. Review Questions
   Very short questions that help the user critique the result.
```

The mutator should prefer complete Hydra code when ambiguity would make a block
replacement hard to apply. For local edits, exact replacement blocks are useful.

## 4. Mutation Scopes

### Micro Mutations

Small parameter or operator edits that preserve the circuit:

```js
.modulate(field.color(1 / width, 1 / height), 1)
```

can become:

```js
.modulate(field.color(1 / width, 1 / height), 4)
```

This is valid because feedback fields are pixel-normalized and the final
modulate amount controls pass-to-pass force.

### Module Mutations

Edits that replace a module implementation while preserving its port role.

Example: replace same-field diagonal noise with axis-separated noise:

```js
ns().color(1 / width, 1 / height)
```

becomes:

```js
solid()
  .add(ns().color(1, 0), 2)
  .add(ns().color(0, 1), 2)
  .color(1 / width, 1 / height)
```

This keeps the same `UVFieldSignal` port but changes x/y correlation.

### Circuit Mutations

Edits that change routing while preserving the patch's identity.

Example: add a post-ingress drift after a pre-ingress drift:

```js
src(o0)
  .modulate(preField.color(1 / width, 1 / height), 3)
  .layer(material.mask(gate))
  .out(o0)
```

can become:

```js
src(o0)
  .modulate(preField.color(1 / width, 1 / height), 3)
  .layer(material.mask(gate))
  .modulate(postField.color(1 / width, 1 / height), 1.5)
  .out(o0)
```

This changes the sum of drifts. It should be treated as a circuit mutation
because the injected material now participates in the post drift.

## 5. Module Map

These are mutation targets, not rigid classes. A patch may combine or omit them.

### Memory Path

The feedback memory read, usually:

```js
src(o0)
```

Mutation possibilities:

```js
src(o0).blur(.5)
src(o0).dualKawaseBlur(4)
src(o0).sharpen(1.2, 1)
src(o0).toneMap(.4, 1)
src(o0).sub(prevN(o0, 8), .02)
```

These are not generic post effects. In feedback, they alter the memory that will
be accumulated into the next frame.

### Ingress

The new material entering memory. Canonical form:

```js
.layer(material.mask(gate))
```

The gate should be hard for ingress. Soft masks can be useful in other roles,
but ingress gates should avoid gray partial accumulation unless explicitly
intended.

Mutation possibilities:

```js
material.mask(gate)
material.mask(gateA.mask(gateB))
material.mask(gate.mask(ns(1, .1).thresh(0, 0)))
```

### Hard Gate

Gate sources can be shape, raster oscillator, noise, or composed binary fields:

```js
shape(4, 1, 0)
  .scale(1 / 8, 1, 1, 0, 0)
  .repeat(width / 8, height / 8, .5)
```

```js
osc(Math.PI * width / 8, 1 / 8 / width)
  .thresh((1 + Math.cos(Math.PI / 16)) / 2, 0)
```

```js
ns(2, .1).thresh(0, 0)
```

The `shape(..., 0)` form is already hard. It does not need `.thresh(...)` unless
the gate is later changed by operations that create gray values.

### Material

The texture being injected through the gate:

```js
osc(Math.PI * 2, .25, 1)
  .color(1.25, .66, 1.12)
  .hue(.1)
  .kaleid(width)
```

Material mutations should usually happen before masking:

```js
material
  .diff(otherTexture, .25)
  .mult(chromaTexture)
  .pixelate(width / 8, height / 8)
  .modulate(localField, .5)
  .mask(gate)
```

### UV Field

A displacement field passed into `.modulate(...)`.

Feedback fields should usually be pixel-normalized:

```js
field.color(1 / width, 1 / height)
```

then force is controlled by the host:

```js
.modulate(field.color(1 / width, 1 / height), k)
```

Axis-separated construction should be the default for noise-based fields unless
same-field diagonal motion is intentional:

```js
solid()
  .add(ns().color(1, 0), xGain)
  .add(ns().color(0, 1), yGain)
  .color(1 / width, 1 / height)
```

### Transform Delta Field

Coordinate transforms can be turned into UV fields by subtracting identity
coordinates:

```js
gradient()
  .scale(scaleSignal)
  .sub(gradient())
```

```js
gradient()
  .rotate(rotationSignal)
  .sub(gradient())
```

```js
gradient()
  .repeat(width / 8, height / 8, phase, 0)
  .sub(gradient())
```

This expresses `T(st) - st`. In feedback usage, the delta may still need
normalization or attenuation:

```js
gradient()
  .scale(src(o0).dualKawaseBlur(4).r(.6, .8))
  .sub(gradient())
  .color(1 / width, 1 / height)
```

### Field Conditioner

A field can be conditioned with blur, dualKawaseBlur, sharpen, edgeDetect,
posterize, pixelate, threshold, channel remap, or masks.

Examples:

```js
ns()
  .posterize(8, 1)
  .pixelate(8, 8)
  .dualKawaseBlur(5)
```

```js
src(o0)
  .blur(3)
  .diff(src(o0).sharpen(1.4, 1))
  .posterize(6, 1)
```

Renderpass methods can now be used inside graph-valued arguments through hidden
staging, but resource lifetime remains a backend-sensitive area. Use them
because they are signal conditioners, not because they are decorative effects.

### Parameter Field

Some parameters can receive texture-valued signals. This should be limited to
expressive parameters such as amount, position, color, gate phase, effect
strength, and similar cohesive controls.

Useful:

```js
gradient()
  .repeat(width / 8, height / 8, ns(1, .03).posterize(4, 1).pixelate(1, 1).r(.5, 0), 0)
  .sub(gradient())
```

Risky or usually poor:

```js
noise(ns(), ns())
```

because this changes the source's base frequency and speed in a way that tends
to break the intended routing and can create precision or compile issues.

## 6. Mutation Operators

### Preserve Energy Calibration

The mutator should preserve authored energy levels by default. In this grammar,
small numeric amounts are often carefully calibrated against feedback buildup,
pixel normalization, raster density, material brightness, and gate coverage.

Do not casually increase `.add(..., amount)`, `.modulate(..., k)`, blend/sub
amounts, thresholds, or post-ingress drift strength. A mutation should either:

- keep the original amount exactly
- preserve proportional total energy when splitting one component into several
- state that it is intentionally changing energy

Example of proportional splitting:

```js
// original x contribution
.add(xField, 2)

// split into two x responsibilities without raising total x energy
.add(xFieldA, 1)
.add(xFieldB, 1)
```

Example of preserving host force:

```js
// original
.modulate(field, 1)

// mutate field structure, not energy
.modulate(mutatedField, 1)
```

This is especially important in closed feedback because apparent strength is not
just local amplitude; it is multiplied by accumulation over time.

### Increase Feedback Force

Use final `k`, not raw unnormalized field amplitude:

```js
.modulate(field.color(1 / width, 1 / height), 6)
```

This is an explicit energy mutation, not a default mutation.

### Split Axis Responsibility

```js
solid()
  .add(xComponent.color(1, 0), xGain)
  .add(yComponent.color(0, 1), yGain)
  .color(1 / width, 1 / height)
```

### Add Component Masks

```js
xComponent
  .color(1, 0)
  .mask(ns(1, .1).thresh(0, 0))
```

This distributes motion gestures spatially instead of applying a uniform field
everywhere.

### Add Quantization

Spatial quantization:

```js
.pixelate(4, 4)
```

Dynamic quantization:

```js
.posterize(8, 1)
```

Together:

```js
ns()
  .posterize(8, 1)
  .pixelate(4, 4)
```

### Retile Ingress

```js
shape(4, 1, 0)
  .scale(1 / n, 1, 1, 0, 0)
  .repeat(width / n, height / n, phase, 0)
```

Even tile divisions are preferred by default because odd divisions tend to
produce awkward grid alignment. Odd values are allowed as deliberate disruption.

### Add Transform Delta

```js
gradient()
  .scale(scaleField)
  .sub(gradient())
  .color(1 / width, 1 / height)
```

or:

```js
gradient()
  .rotate(rotationField)
  .sub(gradient())
  .color(1 / width, 1 / height)
```

### Condition Memory Into Control

```js
memoryControl = src(o0)
  .blur(3)
  .diff(src(o0).sharpen(1.4, 1))
  .posterize(6, 1)
```

Then use it inside a field or gate, not necessarily as a visible layer.

### Move Drift Pre Or Post Ingress

Pre-ingress drift keeps injected material cleaner:

```js
src(o0)
  .modulate(field, k)
  .layer(material.mask(gate))
  .out(o0)
```

Post-ingress drift makes injected material part of the displaced memory:

```js
src(o0)
  .layer(material.mask(gate))
  .modulate(field, k)
  .out(o0)
```

Both are allowed. They are not interchangeable in feedback because the order
changes which signal is displaced before the next write.

## 7. Preservation Contract

Every mutation should explicitly state what it preserves. Examples:

```text
preserve:
- closed o0 feedback
- hard tiled ingress
- material before mask
- pre-ingress memory drift
- pixel-normalized feedback displacement
- authored energy calibration, unless explicitly changed
- no external media
```

When a mutation intentionally breaks one of these, it should say so:

```text
breaks:
- moves one drift post-ingress to let new material join the displacement
```

## 8. Rejection Criteria

Do not frame this as an error checklist by default, but the mutator should avoid
these by construction:

- inventing a whole new patch when asked to mutate
- replacing the core authored circuit without saying so
- using soft masks for ingress
- using one noise texture for both x and y by default
- adding unnormalized field amplitude inside feedback
- changing authored amounts, thresholds, or drift powers without saying the
  mutation is an energy change
- moving material mixing after the ingress mask unless that is intentional
- treating global blend modes as harmless feedback operations
- using `()=>time` param motion
- using texture-valued params on base frequency/speed unless the user is
  explicitly exploring that failure space

## 9. LLM Prompt Template

Use this when asking an LLM to mutate a patch:

```text
You are a Hydra grammar-aware livecoding mutator.

Do not generate a new patch from scratch. Read the input patch as an authored
signal-flow circuit and propose localized mutations that preserve its identity.

First map the patch into modules:
- memory path
- ingress layer
- hard gate
- material
- UV field
- transform delta field
- field conditioner
- parameter field
- buffer routing

Then state the preservation contract.

Then propose {count} mutation candidates. Each candidate must include:
- scope: micro, module, or circuit
- target module
- intent
- math/signal reason
- complete Hydra code or exact replacement block
- risk / what to visually review

Follow these grammar constraints:
- ingress should prefer .layer(material.mask(hardGate))
- hard ingress gates should avoid smooth gray masks
- feedback .modulate fields should usually use .color(1 / width, 1 / height)
  and put force in the host k
- preserve authored energy calibration by default; if splitting a component,
  divide its total contribution proportionally instead of stacking extra power
- noise UV fields should default to independent x/y components
- material mixing should usually happen before masking
- transform-delta fields use gradient().coordOp(...).sub(gradient())
- renderpass methods inside fields/material/gates are allowed as signal
  conditioners, but should have a routing reason
- preserve helper vocabulary and buffer routing unless the mutation explicitly
  changes it
- do not use ()=>time motion
- do not call candidates visually successful before user/render review
```

## 10. Review Loop

The user should review candidates with concrete feedback:

```text
candidate B has the right gate, but the field is too weak
candidate C broke the material identity
candidate D works only if the blur is before the subtract
keep the memory conditioner but remove the global sub
```

The next mutator turn should use the accepted candidate as the new source patch.
This keeps the system close to livecoding practice: iteration, not one-shot
generation.

## 11. Implementation State

Current state:

- LLM mutation protocol: defined here
- packet builder: `scripts/hydra-livecode-mutation-packet.mjs`
- editor integration: implemented through `window.hydraAgentLivecoder`
- LLM livecoding harness: `scripts/hydra-llm-livecode-harness.mjs`
- visual audit loop: partly automated through screenshot/status capture, still
  manually/user-reviewed for taste and acceptance
- accepted mutation library: not yet curated

Possible next implementation steps:

- add an editor button that copies a mutation packet for the current code
- add optional `// @role` comments to improve module recognition
- keep a `docs/hydra-feedback-accepted-mutations.md` file after user approval
- add capture hooks so each candidate can be recorded and reviewed
