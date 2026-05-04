# Hydra Feedback Prompt Grammar

This is the current LLM-facing grammar for the user's Hydra feedback practice.

It is intentionally not a coded extractor, not a hard schema, and not a deterministic generator. At this stage the grammar should remain latent, interpretive, and prompt-based. Code can come later, once the language stabilizes.

The goal is to teach the model how to think before it writes Hydra.

The corpus-independent living version of the grammar is:

```text
docs/hydra-living-feedback-grammar.md
docs/hydra-operator-module-ledger.md
```

Corpus audits and ports are evidence. They should inform the living grammar, not become the grammar itself.

## Core Principle

Do not generate Hydra by random chaining.

Every operation should have a signal-flow, raster, mathematical, or feedback-memory reason.

The model should ask:

```text
What signal is this?
What role does it play?
What units is it in?
What does it do to pixels?
Where does it sit in the feedback loop?
Why is this operation placed here?
```

The grammar must stay permissive in syntax, but strict in intent accounting. A patch may use unusual Hydra forms if the construction makes sense.

## Current Maturity Map

The grammar is currently in a discovery and formalization stage. It is not yet a mature autonomous generator.

Stable layers:

```text
Hydra DSL reading
signal units
operation context
hard ingress gates
pixel-normalized feedback fields
axis-separated UV fields
metric raster/grain logic
gradient identity / transform-delta calculus
channel affine extraction with r/g/b(scale, offset)
texture-valued ParameterSignal controls through pixelate(1,1)
```

Developing layers:

```text
ParameterSignal receiver contracts
spectral roles: lowpass, highpass, bandpass
conditioners and feedback energy
material-first vs memory-first feedback variants
emergence conditions under recurrence
```

Not ready:

```text
autonomous good-patch generation
accepted visual families
rendered corpus expansion
visual quality claims without user acceptance
```

Current abstraction stack:

```text
Hydra DSL
-> Signal unit
-> Signal range / grain
-> Operation context
-> Channel / range mapping
-> ParameterSignal / ControlField receiver contract
-> CoordinateProgram
-> TransformDeltaField
-> UVField composition
-> Feedback flow
-> Spectral / conditioner roles
-> Circuit spec
-> Prompt / generator protocol
-> User critique / later visual audit
```

Use evidence levels when adding to the grammar:

```text
standard math
standard graphics / image processing
Hydra/runtime fact
user practice rule
emergence hypothesis
visual-audit-needed
```

Example:

```text
gradient().coordOp(...).sub(gradient())
  evidence: standard shader coordinate math + Hydra/runtime fact

hard ingress gate
  evidence: user practice rule + visual motivation

low-frequency memory steers geometry
  evidence: emergence hypothesis from authored patch reading
```

## Current Method

The central feedback method is:

```text
memory is displaced first
new hard-gated material is layered after displacement
the current injected material stays clean
the accumulated memory moves behind it
```

Canonical phrase:

```js
src(o0)
  .modulate(pixelStepUVField, k)
  .layer(texture.mask(hardGate))
  .out(o0)
```

The `k` value is displacement power. The field itself remains dimensionally normalized.

Preferred pixel-step field structure:

```js
texture.color(1 / width, 1 / height)
```

Stronger feedback motion should be expressed as:

```js
src(o0).modulate(texture.color(1 / width, 1 / height), 4)
```

not as:

```js
src(o0).modulate(texture.color(4 / width, 4 / height), 1)
```

The second form was a failed generator interpretation.

## Signal Vocabulary

Keep the basic signal vocabulary small:

```text
Parameter
Metric
Texture
Memory
Gate
Ingress
UVField
ParameterSignal
CoordinateProgram
TransformDeltaField
Conditioner
```

These are not rigid classes. They are thinking handles.

### Parameter

Ordinary numeric settings:

```js
osc(20, 0.1, 0)
shape(4, 0.3, 0)
.pixelate(8, 8)
.modulate(field, 4)
```

Avoid using `() => time` as a generic animation trick. If time appears, it should have a reason.

Parameter values are conditional. Their meaning depends on the operation, signal role, and local units.

Examples:

```js
.add(component, 4)
```

This kind of gain is appropriate inside a modulation/vector-field construction before dimensional normalization:

```js
solid()
  .add(xComponent, 4)
  .add(yComponent, 4)
  .color(1 / width, 1 / height)
```

or when the component is already dimensionally encoded:

```js
solid()
  .add(xComponent.color(1 / width, 0), 4)
  .add(yComponent.color(0, 1 / height), 4)
```

Outside modulation/field contexts, that same `4` can be far too strong unless the signal is quantized, clamped, or otherwise intentionally bounded.

Threshold parameters depend on signal polarity:

```js
osc(...).thresh(0.5, 0)
```

cuts a unipolar `[0, 1]` signal in half.

```js
bipolarSignal.thresh(0, 0)
```

cuts a bipolar `[-1, 1]` signal in half.

Scale anchors matter for pixel-perfect tiling:

```js
shape(4, 1, 0)
  .scale(0.125, 1, 1, 0, 0)
  .repeat(width / 8, height / 8)
```

The fourth and fifth scale arguments being pinned to `0` or `1` matters for repeat alignment. This supports one-cell / pixel-perfect tiling used to mask material into feedback chains.

### ParameterSignal

A `ParameterSignal` is a texture-valued control used inside a parameter slot. It is usually made global with:

```js
texture.pixelate(1, 1)
```

and range-mapped with channel extraction:

```js
texture.pixelate(1, 1).r(scale, offset)
```

This layer captures older idioms that were previously scattered across arrays, callbacks, scalar randomness, and uniform texture tricks.

Compact vocabulary:

```js
knob(base, amount, bins, freq, vel)
rng(min, max, bins, freq, vel)
hit(base, amount, threshold, freq, vel)
wob(min, max, sync)
wobc(base, amount, sync)
```

These are prompt/authoring handles. If clarity matters, expand them into raw Hydra.

`rng(2, 4, 2, 2, 0.01)` means:

```js
ns(2, 0.01)
  .posterize(2, 1)
  .pixelate(1, 1)
  .r(1, 3)
```

`hit(1, 0.00125, 0.35, 1, 0.01)` means:

```js
solid(1)
  .add(ns(1, 0.01).pixelate(1, 1).thresh(0.35, 0), 0.00125)
```

`wob(0, 1, 0.05)` means:

```js
osc(TAU, 0.05, 1)
  .pixelate(1, 1)
  .r(1, 0)
```

When using a `ParameterSignal`, state:

```text
source: noise / oscillator / memory / gate / material
range: unipolar / signed / centered / identity-hit
grain: smooth / posterized / pixelated / sparse
receiver: blend amount / scale / repeat offset / threshold / field gain / posterize count
reason: why this parameter should evolve as a signal
```

### Metric

Resolution and dimension-aware values:

```js
width
height
1 / width
1 / height
width / 8
height / 8
Math.PI * width
```

Metrics are not generic controls. They express pixel-space, aspect, grid scale, or raster frequency.

### Texture

Any image-like signal before a stricter role is assigned:

```js
osc()
noise()
ns()
shape()
solid()
gradient()
src(o1)
```

`solid()` often means construction-zero:

```js
solid()
  .add(xComponent)
  .add(yComponent)
```

Do not read this as a solid-color aesthetic by default.

### Memory

Persistent buffer state:

```js
src(o0)
src(o1)
.out(o0)
```

The main memory path is often:

```js
src(o0)
  .modulate(field, k)
  .layer(ingress)
  .out(o0)
```

### Gate

A hard admission field.

For this practice, the gate is not decorative. It is what lets material enter feedback cleanly.

Examples:

```js
shape(4, 0.3, 0)
osc().thresh(0.95, 0)
noise().thresh(0.5, 0)
```

Important:

```js
shape(4, 0.3, 0)
```

is already hard. Do not redundantly write:

```js
shape(4, 0.3, 0).thresh(0.5, 0)
```

### Ingress

Material admitted through a hard gate:

```js
texture.mask(gate)
```

Typical feedback use:

```js
src(o0)
  .modulate(field, k)
  .layer(texture.mask(gate))
  .out(o0)
```

### UVField

A texture interpreted as coordinate displacement.

This can be built in many ways. Do not force only one syntax.

The important question is:

```text
what vector field does this produce, in what units?
```

### ControlField / ParameterSignal

A texture signal used as a parameter to another operation. `ParameterSignal` is the general term. `ControlField` is a useful narrower term when the receiver is a coordinate operation or a field-building module.

It is not necessarily the final displacement field by itself:

```js
control = src(o0).dualKawaseBlur(12).mult(2)

field = gradient()
  .scale(control)
  .sub(gradient())
```

The flow is:

```text
Memory / texture / gate
-> control shaping
-> coordinate operation parameter
-> transformed coordinate program
-> subtract identity coordinate
-> UV displacement field
```

ControlField contracts should track:

```text
source
shaping
range mapping
grain
receiver operation
feedback role
risk
evidence level
```

Example:

```text
source: memory
shaping: lowpass blur + gain
range mapping: raw amplified memory
grain: smooth large-scale
receiver: scale()
feedback role: low-frequency memory controls geometry
risk: near-zero scale / excessive local expansion
evidence: authored patch reading + standard coordinate math + emergence hypothesis
```

Texture-valued parameters should not be generalized blindly. Their suitability depends on the receiver:

```js
gradient().rotate(control.r(Math.PI * 2, -Math.PI), 0)
gradient().pixelate(control.r(32, 2), control.g(32, 2))
material.blend(otherMaterial, ns().pixelate(2, 2).mult(0.5).add(0.5))
```

Keep the receiver's expected range visible. Scale-like receivers usually need positive or guarded values. Rotation receivers can accept signed angular values. Pixelate and kaleid count receivers usually need positive and often quantized values.

For the current grammar, prefer the term `ParameterSignal` unless the signal is specifically building a UV or transform field.

### CoordinateProgram

An expression that returns coordinates, not color material.

Examples:

```js
gradient()
gradient().scale(...)
gradient().rotate(...)
gradient().pixelate(...)
gradient().repeat(...)
gradient().kaleid(...)
```

When a coordinate program is applied to `gradient()`, it can become an explicit field by subtracting the identity coordinate.

### TransformDeltaField

A UV field produced by:

```js
gradient().coordOp(...).sub(gradient())
```

Math:

```text
gradient() = st
gradient().coordOp(...) = T(st)
field = T(st) - st
modulate(field, 1): st + field = T(st)
```

This is standard shader coordinate math expressed through Hydra's `gradient()` source.

### Conditioner

A signal branch that shapes feedback energy by damping, carving, diffusing, sharpening, thresholding, or otherwise regulating accumulation.

Examples:

```js
.sub(src(o0).sharpen(2), 0.025)
.brightness(-0.001)
.blur(0.5)
.diff(src(o0).mask(hardArtifactGate))
```

Conditioners are developing grammar. They should be described by behavior under recurrence rather than treated as generic post-effects.

## Signal Grain Contracts

This layer sits between signal vocabulary and signal flow. It describes the numeric/raster contract of a signal before the signal is placed in a larger circuit.

Current abstraction stack:

```text
Hydra DSL form
-> Signal unit
-> Signal grain / numeric contract
-> Operation context
-> Construction idiom
-> Signal flow
-> Circuit variant
-> Patch intent / character
```

The grain layer should answer:

```text
range: unipolar, bipolar, hard binary, soft scalar, color/material
axis meaning: x, y, xy, scalar shared by both axes
units: native displacement, pixel-step displacement, grid metric, color space
spatial character: global, local, tiled, blocky, masked, raster-alternating
context: material, gate, UV field, feedback memory, post-effect
```

### Native Signal Ranges

The grammar should keep a default range model for common sources:

```text
osc()       -> unipolar [0, 1]
shape()     -> unipolar [0, 1]
gradient()  -> coordinate-like x/y in [0, 1]
noise()     -> bipolar [-1, 1]
ns()        -> bipolar [-1, 1]
src(oN)     -> image/memory signal; visually often [0, 1], but may carry signed field values internally
solid()     -> literal constant or construction-zero
```

`brightness(-0.5)` is the canonical centering operation for unipolar signals when symmetric field behavior is intended:

```js
osc().brightness(-0.5)
gradient().brightness(-0.5)
```

When used inside `.modulate()`, this is dimensional encoding:

```js
field.color(1 / width, 1 / height)
```

Read it as:

```text
red channel = x displacement unit
green channel = y displacement unit
1 / width, 1 / height = pixel normalization
```

Distinguish viewable signals from field signals. A signed/bipolar signal is meaningful as a field even if direct display clips or hides its negative half:

```js
noise(2, 0).posterize(8, 1).out()
noise(2, 0).posterize(8, 1).color(0, 1)
```

The first is a visual inspection path. The second is field use.

Track range approximately through operation chains:

```js
osc().brightness(-0.5)
```

means:

```text
[0, 1] -> [-0.5, 0.5]
```

```js
noise().posterize(8, 1)
```

means:

```text
[-1, 1] -> [-1, 1] stepped
```

```js
shape(4, 1, 0).mask(gate)
```

means:

```text
unipolar geometry constrained by an admission signal
```

`color(1, 0)` preserves the scalar range but assigns it to an axis/channel:

```js
ns().color(1, 0)  // bipolar x component
osc().color(1, 0) // unipolar x component
```

Unipolar field sources should usually be centered when symmetric drift is desired:

```js
osc().brightness(-0.5).color(1, 0)
```

Uncentered unipolar fields are also allowed as directional drift:

```js
osc().color(1 / width, 0)
```

Shape-derived centered fields are unusual and should not be a default:

```js
shape(4, 1, 0).brightness(-0.5).color(0, 1)
```

This creates a binary/piecewise force, not a smooth geometric field. It may be useful as an intentional step displacement, but shapes are mostly gates, masks, and tiled admission structures.

### Operation Semantics By Context

The same Hydra operation should be interpreted by signal range and graph context.

`add()` is the primary vector-sum operation for UV fields:

```js
solid()
  .add(xField.color(1, 0), 4)
  .add(yField.color(0, 1), 2)
  .color(1 / width, 1 / height)
```

Negative add amounts are first-class and should be preferred over introducing a separate `sub()` form when the math is just subtraction:

```js
solid()
  .add(xField.color(1, 0), 4)
  .add(yField.color(0, 1), -2)
  .color(1 / width, 1 / height)
```

`mult()` is a classic computer-graphics blend/multiply operation. It can behave like spatial weighting in field construction:

```js
gradient()
  .brightness(-0.5)
  .mult(ns(2, 0.1))
  .color(1 / width, 1 / height)
```

But do not call `mult()` the canonical gate. Gating/admission should remain a mask operation over a hard or intentionally prepared gate:

```js
texture.mask(gate.thresh(threshold, 0))
```

`diff()` is useful wherever absolute difference is meaningful, not only as a material/comparison effect. In binary or hard-gate space it can act as a gate-composition operation:

```js
gateA.diff(gateB).thresh(0.5, 0)
fieldA.diff(fieldB).color(1 / width, 1 / height)
```

`blend()` is interpolation between signal behaviors:

```js
fieldA
  .blend(fieldB, 0.25)
  .color(1 / width, 1 / height)
```

`pixelate()` is spatial quantization. In parameter textures, `pixelate(1, 1)` creates a uniform/global value field. Other pixelations create spatially varying parameter regions:

```js
ns().pixelate(1, 1) // one value across the canvas
ns().pixelate(2, 2) // quadrant values
ns().pixelate(4, 4) // block values
```

Do not assume every helper argument can accept a texture-valued signal. If a helper multiplies an argument in JavaScript before building the Hydra graph, a texture-valued argument may break routing.

Inside UV fields, low-number pixelations create block-field structure:

```js
field.pixelate(2, 2)
field.pixelate(4, 4)
```

`posterize()` is range quantization. It should preserve signal kind:

```js
osc().posterize(8, 1) // unipolar stairs
ns().posterize(8, 1)  // bipolar stairs
```

Use `thresh()` for hard binary cuts and `posterize()` for multi-step quantization:

```js
osc().thresh(0.5, 0)
noise().posterize(8, 1)
```

Dynamic quantization and spatial quantization are different tools:

```js
signal.posterize(k, 1) // range/value quantization
signal.pixelate(x, y)  // spatial/sample quantization
```

They can be combined:

```js
ns()
  .posterize(8, 1)
  .pixelate(2, 2)
```

`contrast()` can shape fields, but it is only equivalent to stronger gain when applied around the correct center.

For unipolar signals, this:

```js
osc().contrast(2).brightness(-0.5)
```

is mathematically similar to:

```js
osc().brightness(-0.5).mult(2)
```

because contrast expands around `0.5`.

For already centered or bipolar fields, contrast is not automatically the same as gain:

```js
ns().contrast(2)
```

uses Hydra's visual contrast center and may bias the field unless the range is intentionally prepared. For field gain, prefer explicit add amounts, `.mult(k)`, or `.modulate(field, k)` depending on context.

Channel semantics are contextual. Inside ordinary `.modulate()` only red and green matter:

```js
src(o0).modulate(field.color(1 / width, 1 / height), k)
```

The local modulation math is:

```text
st' = st + field.xy * amount
```

So blue is ignored by `.modulate()` unless the operation explicitly uses it:

```js
field.color(1 / width, 1 / height, blueValue)
```

Outside `.modulate()`, `color()` returns to visual/chroma meaning:

```js
material.color(1.25, 0.66, 1.12)
```

### Channel Affine Extraction

The channel helpers are not only selectors. In the local implementation they are affine remappers:

```js
texture.r(scale, offset)
texture.g(scale, offset)
texture.b(scale, offset)
```

Math:

```text
out = selectedChannel * scale + offset
```

This creates a compact range-mapping primitive for fields, controls, and material channels.

Useful mappings:

```js
.r(1, -0.5)   // [0, 1] -> [-0.5, 0.5]
.r(-1, 0.5)   // [0, 1] -> [0.5, -0.5]
.r(2, -1)     // [0, 1] -> [-1, 1]
.r(0.5, 0)    // [0, 1] -> [0, 0.5]
.r(-0.5, 0.5) // [0, 1] -> [0.5, 0]
```

Do not describe these arguments as min/max directly. They are `scale, offset`.

Roles:

```text
scalar channel extraction
range centering
inversion
signed field construction
phase-separated oscillator construction
ParameterSignal / ControlField range mapping
```

Example material construction:

```js
osc(Math.PI, 0.01, 1).g(-0.5, 0.5).color(0, 1, 0)
  .modulate(ns(), 1)
  .add(
    osc(Math.PI, 0.01, 1).r(-0.5, 0.5).color(1, 0, 0)
      .modulate(ns(), 1)
  )
  .add(
    osc(Math.PI, 0.01, 1).b(1, -0.5).color(0, 0, 1)
      .modulate(ns(), 1)
  )
  .blend(osc(Math.PI, 0.01, 1).modulate(ns(), 1), 0.5)
```

Interpretation:

```text
phase-split oscillator material
channel extraction and affine remap per component
component repacking into RGB
independent domain warp per component
recombine with full warped oscillator anchor
```

Example field construction:

```js
solid()
  .add(osc(Math.PI, 0.01, 1).r(1, -0.5).color(1, 0), 4)
  .add(osc(Math.PI, 0.01, 1).g(1, -0.5).color(0, 1), 4)
  .color(1 / width, 1 / height)
```

Example control mapping:

```js
control = src(o0).blur(8).r(0.75, 0.75)

field = gradient()
  .scale(control)
  .sub(gradient())
```

### UV Field Grain

Feedback displacement should usually preserve the split between field structure, pixel normalization, and displacement power:

```js
src(o0)
  .modulate(field.color(1 / width, 1 / height), k)
```

Interpretation:

```text
field = displacement structure
color(1 / width, 1 / height) = convert to pixel units
k = feedback displacement power
```

This spelling is preferred even when mathematically similar forms exist, because it keeps the intent readable.

Material-internal displacement has a different contract:

```js
material.modulate(texture, k)
```

Here `k = 1` may mean full native-dimension displacement. This is allowed for material motion, but it should not be confused with pixel-step feedback drift.

Useful UV field types:

```text
NativeUVField
PixelStepUVField
MaterialDisplacementField
FeedbackDisplacementField
```

Same-field xy displacement is valid, but should not be the default for rich motion:

```js
ns().color(1 / width, 1 / height)
```

This often gives correlated or diagonal-feeling displacement.

Prefer axis-separated fields when x/y responsibility matters:

```js
ns()
  .color(1, 0)
  .add(ns().color(0, 1))
  .color(1 / width, 1 / height)
```

Only-x and only-y fields are also valid:

```js
ns().color(1 / width, 0)
ns().color(0, 1 / height)
```

A more explicit field builder uses `solid()` as zero:

```js
solid()
  .add(xComponent.color(1, 0), xGain)
  .add(yComponent.color(0, 1), yGain)
  .color(1 / width, 1 / height)
```

This is equivalent in intent to dimensionally encoding each component directly:

```js
solid()
  .add(xComponent.color(1 / width, 0), xGain)
  .add(yComponent.color(0, 1 / height), yGain)
```

The first form is preferred because pixel normalization remains a visible final step.

Large component gains such as `4` should mostly live before pixel normalization:

```js
solid()
  .add(xComponent.color(1, 0), 4)
  .add(yComponent.color(0, 1), 2)
  .color(1 / width, 1 / height)
```

Field components may be local or global. Component masking is core, but global fields are also allowed:

```js
osc(Math.PI * width, 1 / width)
  .thresh(0.5, 0)
  .color(1, 0)
  .mask(ns(1, 0.1))
```

Soft masks are allowed inside UV-field construction. Hard masks are required for clean ingress, not for every signal task:

```js
xComponent.mask(ns(1, 0.1))
xComponent.mask(ns(1, 0.1).thresh(0.5, 0))
```

For unipolar displacement signals, centering should be the norm when symmetric drift is intended:

```js
osc(Math.PI * width / 4, 1 / width)
  .brightness(-0.5)
  .color(0, 1)
```

Hard raster drift is a distinct grain, not just an oscillator:

```js
osc(Math.PI * width, 1 / width)
  .thresh(0.5, 0)
  .color(1, 0)
```

Metric variants should preserve the normalization logic of the raster cut, but the exact one-pixel threshold depends on the oscillator shader math.

```js
osc(Math.PI * width / 4, 1 / 4 / width)
  .thresh((1 + Math.cos(Math.PI / 8)) / 2, 0)
```

```js
osc(Math.PI * width / 16, 1 / 16 / width)
  .thresh((1 + Math.cos(Math.PI / 32)) / 2, 0)
```

In the local WGSL implementation, oscillator color is approximately:

```text
u = sin(st.x * frequency + time * sync * frequency + channelOffset) * 0.5 + 0.5
```

The cosine appears because the hard raster cut is being measured around the peak of a sine wave.

At the peak:

```text
theta = pi / 2
sin(theta) = 1
```

If the desired bright band has phase half-width `delta` around that peak, the edge value is:

```text
sin(pi / 2 - delta) = cos(delta)
```

Hydra's oscillator remaps sine from `[-1, 1]` to `[0, 1]`, so the threshold becomes:

```text
threshold = (1 + cos(delta)) / 2
```

For:

```js
osc(Math.PI * width / n, sync)
```

the spatial period is `2 * n` pixels. A continuous one-pixel-wide cut inside that period uses approximately:

```js
.thresh((1 + Math.cos(Math.PI / (2 * n))) / 2, 0)
```

If the desired period is `n` pixels rather than `2 * n` pixels, use:

```js
osc(Math.PI * 2 * width / n, sync)
  .thresh((1 + Math.cos(Math.PI / n)) / 2, 0)
```

Sampling alignment still matters. Without phase/scroll alignment, a mathematically one-pixel continuous band can hit two adjacent sampled pixel centers. The earlier form:

```js
.thresh(1 - 1 / n, 0)
```

is still useful as a broader high-crest raster cut, but it should not be described as a strict one-pixel cut.

Axis orientation matters. These should not be treated as interchangeable:

```js
osc(Math.PI * width, 1 / width)
```

can produce vertical pixel-perfect scan lines, while:

```js
osc(Math.PI * height, 1 / height)
  .rotate(Math.PI / 2)
```

can produce horizontal pixel-perfect scan lines.

Global and low-number pixelated displacement are separate grains:

```js
field.pixelate(1, 1)
field.pixelate(2, 2)
field.pixelate(3, 3)
field.pixelate(4, 4)
field.pixelate(5, 5)
```

These low-number pixelations can create specific modern/block displacement behavior and should be treated as potential-bearing, not arbitrary simplification.

Metric block displacement is also central:

```js
field.pixelate(width / 8, height / 8)
```

### Gate Grain

Hard ingress masks are a core contract:

```js
texture.mask(shape(4, 1, 0))
texture.mask(noise().thresh(0.5, 0))
texture.mask(osc().thresh(0.95, 0))
```

The gate does not merely decorate material. It controls whether material can pass cleanly into feedback memory.

Metric tile gates are central:

```js
shape(4, 1, 0)
  .scale(1 / 8, 1, 1, 0, 0)
  .repeat(width / 8, height / 8, 0.5)
```

In `.repeat(a, b, c, d)`, the third and fourth parameters are x/y offsets. They should be understood as part of tile phase and spatial alignment.

Scale anchors are also part of the grain because they affect alignment and artifact behavior:

```js
.scale(1 / 8, 1, 1, 0, 0)
.scale(1 / 8, 1, 1, 1, 0)
.scale(1 / 8, 1, 1, 0, 1)
.scale(1 / 8, 1, 1, 1, 1)
```

The local scale coordinate map is:

```text
st' = (st - anchor) / amount + anchor
```

So anchors are not decorative. They choose the fixed point of the scaled sampling space. For quadrant gates:

```js
gateA = shape(4, 1, 0).scale(1 / 2, 1, 1, 0, 0)
gateB = shape(4, 1, 0).scale(1 / 2, 1, 1, 1, 0)
gateC = shape(4, 1, 0).scale(1 / 2, 1, 1, 0, 1)
gateD = shape(4, 1, 0).scale(1 / 2, 1, 1, 1, 1)
```

the four anchors pin the scaled shape to the four corners. This is a positioning operation in coordinate space, not just a visual offset.

Gate motion is allowed before final hard cutting:

```js
texture.mask(
  gate
    .modulate(gateField.color(1 / width, 1 / height), k)
    .thresh(0.5, 0)
)
```

Displacing an already-hard gate without re-thresholding is also allowed when the gate remains suitable for ingress:

```js
texture.mask(
  shape(4, 1, 0)
    .modulate(field.color(1 / width, 1 / height), 2)
)
```

### Material Grain

Material texture is open-ended as long as it enters feedback through a hard gate:

```js
src(o0)
  .modulate(field.color(1 / width, 1 / height), k)
  .layer(anyMaterial.mask(hardGate))
  .out(o0)
```

Metric coupling between material and gate is preferred when they belong to the same element or flow:

```js
ns(width / 8, 0.25)
  .pixelate(width / 8, height / 8)
  .mask(
    shape(4, 1, 0)
      .scale(1 / 8, 1, 1, 0, 0)
      .repeat(width / 8, height / 8)
  )
```

Texture-side blending should mostly happen before masking:

```js
solid()
  .add(textureA, 0.8)
  .diff(textureB)
  .mult(carrier)
  .mask(gate)
```

`solid()` as construction-zero is a central primitive idiom:

```js
solid()
  .add(textureA, amountA)
  .add(textureB, amountB)
  .mask(gate)
```

### Flow Grain

Canonical ingress flow:

```js
src(o0)
  .modulate(memoryField.color(1 / width, 1 / height), k)
  .layer(material.mask(hardGate))
  .out(o0)
```

This means memory moves first and the new material enters cleanly afterward.

Post-ingress drift is a second valid flow, not an exception:

```js
src(o0)
  .modulate(memoryField.color(1 / width, 1 / height), k)
  .layer(material.mask(hardGate))
  .modulate(postField.color(1 / width, 1 / height), postK)
  .out(o0)
```

Combined fields and chained fields should be distinguished because the math and results differ:

```js
src(o0).modulate(
  solid()
    .add(fieldA.color(1, 0), 4)
    .add(fieldB.color(0, 1), 2)
    .color(1 / width, 1 / height),
  1
)
```

versus:

```js
src(o0)
  .modulate(fieldA.color(1 / width, 1 / height), 4)
  .modulate(fieldB.color(1 / width, 1 / height), 2)
```

Masked global artifact flows are allowed but high-energy:

```js
src(o0)
  .modulate(field.color(1 / width, 1 / height), k)
  .layer(material.mask(gate))
  .diff(src(o0).mask(hardArtifactGate))
  .out(o0)
```

A more contained form is to layer a masked artifact branch:

```js
src(o0)
  .modulate(field.color(1 / width, 1 / height), k)
  .layer(material.mask(gate))
  .layer(
    src(o0)
      .diff(carveTexture)
      .mask(hardArtifactGate)
  )
  .out(o0)
```

### Randomness Grain

`ns()` should imply spatial randomization per call:

```js
ns(freq, speed, rn(), rn())
```

Do not conceptually reuse one noise field for x and y unless correlation is intended:

```js
// correlated
ns().color(1, 1)

// separated
ns().color(1, 0).add(ns().color(0, 1))
```

Avoid `() => time` patterns for this grammar layer. Animation should come from Hydra-native motion parameters, live execution, structural changes, or explicit signal construction rather than generic time callbacks.

The WebGPU Hydra framework can use texture signals as two-dimensional functions inside some parameter slots. This is important for cohesive parameter modulation, but it should not be generalized to every scalar parameter.

Good candidates are expressive parameters such as:

```text
position / offset
amount / gain
color / tint
effect amount
threshold
anchor / phase-like spatial offsets
```

Risky or usually poor candidates are parameters that define the source's base domain or time behavior:

```text
frequency / scale
speed / sync / time-rate
noise scale
oscillator frequency
```

Those parameters are often better kept scalar and stable. If the goal is to move a source through a texture-valued position field, route it as coordinate modulation rather than changing its generator scale or speed.

Example of explicit position routing:

```js
noise(3, 0)
  .modulate(
    solid(
      ns(1, 1 / width).pixelate(2, 2).mult(width),
      ns(1, 1 / height).pixelate(2, 2).mult(height),
      0
    ),
    1
  )
```

This is different from trying to feed texture-valued signals directly into `noise(scale, speed)`. The route expresses spatial displacement of the noise field, not per-pixel changes to its frequency/time parameters.

Texture-valued scalar arguments are sampled as scalar values. In the local compiler, if a texture-valued graph is passed to a `float` parameter, its `x` channel is used.

Therefore:

```js
solid(xField, yField, 0)
```

is equivalent in intent to:

```js
solid()
  .add(xField.color(1, 0))
  .add(yField.color(0, 1))
```

only when `xField` and `yField` are scalar signals whose intended values are in the red/x channel. If the fields are already packed, colored, or multi-channel, `solid(xField, yField, 0)` is not the same construction.

A safe pattern is:

```js
solid(
  xScalarField,
  yScalarField,
  0
)
```

for building a vector from scalar parameter textures, and:

```js
solid()
  .add(xComponent.color(1, 0), xGain)
  .add(yComponent.color(0, 1), yGain)
```

for explicit field algebra.

### Graph Node Branching In This Runtime

The current graph-node API mutates chains. If a graph node is stored in a variable and then reused in multiple branches, later method calls append to the same graph unless a fresh node or clone is used.

Unsafe branch reuse:

```js
wave = osc(Math.PI, 0.015, 1).modulate(ns(2, 0.05), 0.5)

material = wave.g(-0.5, 0.5)
  .add(wave.r(-0.5, 0.5))
```

The `.g(...)` call mutates `wave`, then `.r(...)` continues from the already-mutated chain. This can make separate-format patches behave differently from fully inlined/composed patches.

Safe options:

```js
wave = () => osc(Math.PI, 0.015, 1).modulate(ns(2, 0.05), 0.5)

material = wave().g(-0.5, 0.5)
  .add(wave().r(-0.5, 0.5))
```

or, in this WebGPU runtime after the clone helper is available:

```js
wave = osc(Math.PI, 0.015, 1).modulate(ns(2, 0.05), 0.5)

material = wave.clone().g(-0.5, 0.5)
  .add(wave.clone().r(-0.5, 0.5))
```

For prompt-generation, prefer either inlining or factory functions for repeated branch sources. Do not assume assigned Hydra graph nodes are persistent immutable values.

### Renderpass Transforms In Nested Fields

Some operations are implemented as standalone renderpass transforms:

```text
blur
blurX / blurY
sharpen
edgeDetect / edgeLaplacian
dualKawaseBlur
dualKawaseBloom
other post-processing passes
```

These now have two explicit meanings in the WebGPU compiler.

Top-level renderpass mode keeps the original framebuffer meaning:

```js
osc(8, 0.1, 0)
  .blur(4)
  .sharpen(1)
  .out(o0)
```

This becomes multiple GPU passes. Each renderpass samples the previous pass texture.

Nested staged-texture mode applies when the same renderpass method appears inside a graph-valued argument:

```js
src(o0).modulate(
  gradient()
    .repeat(width / 8, height / 8, phase, 0)
    .blur(8)
    .sub(gradient())
    .color(1 / width, 1 / height),
  4
)
```

In this context, the nested graph is automatically lowered to hidden texture passes:

```text
build field texture -> apply renderpass texture kernels -> sample final hidden texture in host
```

not:

```text
recursively inline all kernel samples into the host shader
```

This makes renderpass methods valid in modulation fields, material builders, gate builders, scalar parameter fields, and other graph-valued arguments while preserving the same computational shape as explicit staging with `out(o1)` / `src(o1)`.

If a nested staged field appears after a top-level renderpass boundary, the compiler must preserve two different texture roles:

```js
src(s0)
  .blur(4)      // main chain framebuffer pass
  .modulate(
    fieldWithNestedRenderpasses,
    1
  )
```

The final pass reads:

```text
main input: result of blur(4)
field input: final hidden texture from fieldWithNestedRenderpasses
```

Do not collapse both into a generic `prevBuffer`; otherwise the hidden field pass can accidentally become the main image input.

Runtime allocation must also avoid read/write aliasing. A final pass may need to sample both ping-pong textures at once:

```text
sample pingpong-0: older main-chain renderpass result
sample pingpong-1: latest hidden field result
write output: cannot be pingpong-0 or pingpong-1 in that same render pass
```

When that happens, the renderer uses a transient write texture so WebGPU does not see the same texture as both `TextureBinding` and `RenderAttachment` in one synchronization scope.

The renderer must also preserve pass-output lifetime, not only same-pass binding legality. A pass like:

```js
osc(Math.PI * 2, 1, 1)
  .blur(40)
  .modulate(fieldWithHiddenRenderpasses, 1)
```

needs the blurred oscillator texture to survive while hidden field passes run. If a later hidden pass reuses that same texture as its render target, the final modulation pass will sample the field texture where it expected the blurred oscillator, often making the result appear grayscale. Internally referenced pass outputs stay protected until their last use.

Important math caveat:

```js
gradient()
  .blur(20)
  .sub(gradient())
```

is still usually weak because a symmetric blur preserves a linear ramp in the interior:

```text
blur(st) - st ~= 0
```

The expressive use is to blur a discontinuous, nonlinear, quantized, memory-shaped, or topology-changing coordinate program:

```js
gradient()
  .repeat(width / 8, height / 8, phase, 0)
  .sub(gradient())
  .blur(8)
  .color(1 / width, 1 / height)
```

or:

```js
gradient()
  .scale(src(o0).dualKawaseBlur(8).r(0.5, 0.75))
  .sub(gradient())
  .edgeDetect(1, 1)
  .color(1 / width, 1 / height)
```

Performance caveat: nested renderpass graphs now allocate hidden passes. This is much more reliable than recursive expression kernels, but it is still real GPU work. If the field is shared across multiple outputs, should be inspected/debugged, or should have a named role in the patch, explicit staging is still useful:

```js
// stage when reuse, cost control, or exact framebuffer feedback semantics matter
field = gradient()
  .repeat(width / 8, height / 8, phase, 0)
  .sub(gradient())

field.out(o1)

src(o1)
  .dualKawaseBlur(20)
  .color(1 / width, 1 / height)
  .out(o2)

src(o0)
  .modulate(src(o2), 0.5)
  .layer(material.mask(gate))
  .out(o0)
```

Output textures use floating-point storage, so signed field values can be staged. Visual display may still hide or clip negative values, but field use can preserve them.

Parameter textures preserve their native range:

```js
osc().pixelate(1, 1) // [0, 1]
ns().pixelate(1, 1)  // [-1, 1]
```

When a parameter expects a positive range, remap bipolar sources before use:

```js
ns()
  .mult(0.5)
  .add(0.5)
  .pixelate(1, 1)
```

Here `.pixelate(1, 1)` turns a parameter texture into a uniform global signal. Other pixelations create spatially varying parameter regions.

Texture-valued parameter contracts:

```text
stable scalar:
  base source scale/frequency, time-rate/speed, sync

metric scalar:
  width/n, height/n, 1/width, 1/height

texture-valued expressive:
  position, offset, amount, gain, color, tint, effect amount, threshold, blend amount, repeat offsets, posterize bins, pixelate counts

texture-valued risky:
  scale anchors, tile anchors, continuous repeat offsets, continuous pixelate counts

avoid by default:
  per-pixel source frequency/scale and per-pixel time-speed
```

`.modulate(field, amountField)` is allowed:

```js
src(o0).modulate(
  field.color(1 / width, 1 / height),
  ns().pixelate(2, 2).posterize(4, 1).mult(4)
)
```

But in feedback patches it is often clearer to place spatial variation inside the field and keep the final modulation gain scalar:

```js
src(o0).modulate(
  field
    .mult(amountField)
    .color(1 / width, 1 / height),
  4
)
```

This keeps the displacement field inspectable before the feedback host receives it.

Blend amount is a good expressive texture-valued slot:

```js
material.blend(
  otherMaterial,
  ns().pixelate(2, 2).mult(0.5).add(0.5)
)
```

Thresholds can be texture-valued:

```js
ns().thresh(
  osc().pixelate(1, 1).mult(0.25).add(0.5),
  0
)
```

Repeat offsets can be texture-valued, but they affect tile phase and can get artifacty if the signal moves continuously:

```js
shape(4, 1, 0).repeat(
  width / 8,
  height / 8,
  ns().pixelate(1, 1),
  0
)
```

Scale anchors can be texture-valued, but this is not ideal for pixel-perfect tiling unless the anchor field is quantized:

```js
shape(4, 1, 0).scale(
  1 / 8,
  1,
  1,
  ns().posterize(4, 1).pixelate(1, 1).mult(0.5).add(0.5),
  0
)
```

Pixelate counts can be texture-valued:

```js
field.pixelate(
  ns().posterize(4, 1).mult(8).add(8),
  2
)
```

Posterize bins can be texture-valued:

```js
ns().posterize(
  osc().pixelate(1, 1).mult(8).add(8),
  1
)
```

Color/tint parameters can be texture-valued:

```js
material.color(
  ns().pixelate(2, 2).mult(0.5).add(0.5),
  0.66,
  1.12
)
```

Continuous parameter textures can create precision shimmer, unstable tile boundaries, or hard-to-read subpixel motion. Use `posterize()` for range quantization and `pixelate()` for spatial quantization when a parameter should step cleanly:

```js
ns()
  .posterize(8, 1)
  .pixelate(2, 2)
```

Stair-like parameter variations should prefer signal construction over generic arrays:

```js
ns()
  .posterize(k, 1)
```

For unipolar signals, `posterize(k, 1)` creates `k`-style stairsteps and returns a unipolar `[0, 1]` signal. For bipolar signals, the same `posterize(k, 1)` should quantize the signed signal and return a bipolar `[-1, 1]` signal.

One interaction:

```js
osc().posterize(k, 1)
```

returns `[0, 1]` when the source is unipolar.

```js
ns().posterize(k, 1)
noise(2, 0).posterize(8, 1)
```

returns `[-1, 1]` when the source is bipolar.

Posterize should not ask the author to choose modes. It should quantize the signal it receives and preserve the signal kind.

Implementation behavior:

```text
signalSign = sign(value)
magnitude = pow(abs(value), gamma)
quantizedMagnitude = floor(magnitude * bins) / bins
result = signalSign * pow(quantizedMagnitude, 1 / gamma)
```

This keeps ordinary positive/unipolar posterize behavior while preventing negative bipolar values from clipping, going invalid through `pow()`, or being treated as a separate API.

Looping sequence behavior should prefer looped/noise sources such as:

```js
nsloop(...)
```

Arrays and sequence helpers are not the preferred grammar for this layer unless they express something the signal method cannot express clearly.

Structural swaps are part of livecoding grammar:

```js
src(o0).modulate(fieldA.color(1 / width, 1 / height), 4)
src(o0).modulate(fieldB.color(1 / width, 1 / height), 4)
```

The patch can evolve by swapping fields, extending chains, changing masks, or altering material construction, not only by moving scalar knobs.

### Component Source Grain

UV components should be understood by source behavior, not just by function name:

```js
osc(...).color(1, 0)
ns(...).color(1, 0)
shape(...).color(1, 0)
gradient().color(1, 0)
src(o0).color(1, 0)
```

Interpretation:

```text
osc = periodic, metric, raster, or carrier source
ns/noise = spatial field, random initialization, moving texture
shape = geometric region, mostly gate/tile construction but also possible field source
gradient = coordinate/affine-like field
src(oN) = memory-derived field
```

Feedback-derived displacement is core:

```js
src(o0)
  .modulate(src(o0).color(1 / width, 1 / height), 2)
  .layer(material.mask(gate))
  .out(o0)
```

Processed feedback displacement is also a central possibility:

```js
src(o0)
  .modulate(
    src(o0)
      .thresh(0.5, 0)
      .pixelate(4, 4)
      .color(1 / width, 1 / height),
    3
  )
```

This can make strong results because the memory image becomes a field that steers itself. It should be treated as a valid field source, not as an accidental recursion.

### Axis Logic Grain

When noise is used as a UV field, axis separation should be the default prompt behavior unless correlation is intended:

```js
solid()
  .add(ns().color(1, 0), xGain)
  .add(ns().color(0, 1), yGain)
  .color(1 / width, 1 / height)
```

Asymmetric axes are first-class:

```js
solid()
  .add(osc(Math.PI * width, 1 / width).thresh(0.5, 0).color(1, 0), 4)
  .add(ns(3, 0.1).color(0, 1), 2)
  .color(1 / width, 1 / height)
```

One axis may be structural while the other is atmospheric:

```js
solid()
  .add(rasterX.color(1, 0), 4)
  .add(softNoiseY.color(0, 1), 2)
  .color(1 / width, 1 / height)
```

Axis gains should usually be strong enough to matter. Gains below `1` can be valid, but may be too small in feedback fields unless another multiplier or context gives them enough force.

Independent axis masks are part of the complexity grammar:

```js
solid()
  .add(xComponent.mask(xMask).color(1, 0), xGain)
  .add(yComponent.mask(yMask).color(0, 1), yGain)
  .color(1 / width, 1 / height)
```

### Raster Metric Grain

Metric raster oscillator families should prioritize even powers or clean divisors such as `2`, `4`, `8`, and `16`.

Odd values are allowed, but they tend to create awkward alignment behavior against the pixel grid and should be treated as a deliberate disruption rather than the default.

Raster oscillators and tile gates should be explicitly coupled when they belong to the same spatial element:

```js
osc(Math.PI * width / 8, 1 / 8 / width)
  .thresh((1 + Math.cos(Math.PI / 16)) / 2, 0)
```

paired with:

```js
shape(4, 1, 0)
  .scale(1 / 8, 1, 1, 0, 0)
  .repeat(width / 8, height / 8)
```

The third `osc` parameter should not be described as spatial position. In the local shader it offsets RGB phase:

```js
osc(frequency, sync, offset)
```

This can affect color/channel relationship and luminance after operations such as `.thresh()`, but it is not the same thing as spatially scrolling the oscillator.

### Gate Composition Grain

Gates may be composed through nested masks:

```js
texture.mask(gateA.mask(gateB))
```

This is a core intersection idiom.

Binary gate operations are allowed when the result remains appropriate for ingress:

```js
texture.mask(gateA.diff(gateB).thresh(0.5, 0))
texture.mask(gateA.add(gateB).thresh(0.5, 0))
texture.mask(gateA.mult(gateB))
```

For multi-ingress, non-overlap is often cleaner:

```js
src(o0)
  .modulate(field.color(1 / width, 1 / height), k)
  .layer(materialA.mask(gateA))
  .layer(materialB.mask(gateB))
  .out(o0)
```

But overlap is allowed. Later layers sit on top, so ordering is part of the composition:

```js
src(o0)
  .modulate(field.color(1 / width, 1 / height), k)
  .layer(materialA.mask(gateA))
  .layer(materialB.mask(gateB.diff(gateA).thresh(0.5, 0)))
  .out(o0)
```

### Gate / Field Coupling Grain

Fields and gates may share the same source when lockstep structure is intended:

```js
gate = ns(width / 8, 0.25)
  .thresh(0.75, 0)
  .pixelate(width / 8, height / 8)

field = ns(width / 8, 0.25)
  .posterize(8, 1)
  .color(1 / width, 0)
```

They may also be related but not identical, to avoid over-locking:

```js
gate = ns(width / 8, 0.25)
  .thresh(0.75, 0)

field = ns(width / 4, 0.1)
  .posterize(8, 1)
  .color(1 / width, 0)
```

Gate-derived fields are core:

```js
src(o0)
  .modulate(gate.color(1 / width, 0), 4)
  .layer(material.mask(gate))
  .out(o0)
```

This means the admission structure can also become the motion structure. The model should still account for signal range: a hard gate used as a field is unipolar unless centered, inverted, differenced, or otherwise prepared.

### Texture Carrier Grain

Chroma/carrier modulation is central inside material:

```js
texture.mult(
  osc(Math.PI * 2, 0.25, 1)
    .color(1.25, 0.66, 1.12)
    .hue(0.1)
)
```

Material displacement may happen before masking:

```js
material
  .modulate(materialField, materialK)
  .mask(gate)
```

Material-side displacement and feedback-side displacement use different contracts:

```js
material.modulate(ns(), 1)
src(o0).modulate(ns().color(1 / width, 1 / height), 1)
```

The first may be native/full-dimension material movement. The second is one pixel-step unit in feedback when the field is normalized.

Material quantization should often mirror gate quantization when they are part of the same visual element:

```js
material.pixelate(width / 8, height / 8)
gate.repeat(width / 8, height / 8)
```

### Gradient And Affine Field Grain

Direct Hydra coordinate operations remain understandable:

```js
src(o0).scrollX(1 / width)
src(o0).scale(1.01)
src(o0).rotate(0.01)
```

But the preferred grammar should seek texture-field equivalents because fields can be pixelated, masked, blended, modulated, or partially applied.

Scroll equivalent:

```js
src(o0)
  .modulate(solid(1 / width, 0), 1)
```

There are two related but distinct field languages:

```text
absolute coordinate transform as field:
  field = T(st) - st

centered vector/force field:
  field = authored vector based on st - center
```

The first uses raw `gradient()` as identity coordinates. The second uses `gradient().brightness(-0.5)` as a centered vector from the middle of the image.

The transform-delta bridge is:

```js
gradient().coordOp(...).sub(gradient())
```

Math:

```text
gradient() = st
gradient().coordOp(...) = T(st)
field = T(st) - st
modulate(field, 1) samples at st + field = T(st)
```

This means coordinate operations can become explicit UV fields:

```js
gradient().scale(...).sub(gradient())
gradient().rotate(...).sub(gradient())
gradient().pixelate(...).sub(gradient())
gradient().repeat(...).sub(gradient())
gradient().kaleid(...).sub(gradient())
```

This rule is standard shader coordinate math expressed through Hydra's `gradient()` source. It is not a replacement for pixel-normalized direct fields; it is an additional field construction path.

Examples:

```js
src(o0).modulate(
  gradient().scale(1.02, 1, 1, 0.5, 0.5).sub(gradient()),
  1
)
```

```js
src(o0).modulate(
  gradient().rotate(Math.PI / 16, 0).sub(gradient()),
  1
)
```

```js
src(o0).modulate(
  gradient().pixelate(8, 8).sub(gradient()),
  1
)
```

With texture-valued parameters:

```js
control = src(o0).blur(8).r(0.5, 0.75)

src(o0).modulate(
  gradient().scale(control).sub(gradient()),
  1
)
```

Exact transform-delta and feedback-useful transform-delta are different contracts.

This form:

```js
src(o0).modulate(
  gradient().coordOp(...).sub(gradient()),
  1
)
```

is the exact coordinate-map conversion:

```text
st + (T(st) - st) = T(st)
```

Inside recursive feedback this can be too strong. It is valid to attenuate, blur, quantize, or pixel-normalize the transform-delta field when the goal is emergent accumulation rather than exact one-pass coordinate equivalence:

```js
src(o0).modulate(
  gradient()
    .repeat(width / 8, height / 8, phase, 0)
    .sub(gradient())
    .dualKawaseBlur(20)
    .color(1 / width, 1 / height),
  0.5
)
```

Read this as:

```text
coordinate topology is used as a source of motion structure,
then converted into feedback-scale displacement.
```

Do not blindly use transform-delta fields raw inside closed feedback. The model must state whether it wants:

```text
exact coordinate equivalence
or feedback-scale drift derived from a coordinate transform
```

Also, a transform-delta field is not interesting just because it is mathematically valid. The ControlField or coordinate program should carry motion, grain, spectral structure, masking, phase, or another authored responsibility:

```js
control = src(o0)
  .dualKawaseBlur(6)
  .modulate(ns(1, 0.05), 0.25)
  .posterize(8, 1)
  .r(0.6, 0.7)

field = gradient()
  .scale(control)
  .sub(gradient())
  .color(1 / width, 1 / height)
```

Gradient-based scale-like drift:

```js
src(o0)
  .modulate(
    gradient()
      .brightness(-0.5)
      .pixelate(2, 2)
      .color(1 / width, 1 / height),
    k
  )
```

The local `gradient()` source returns coordinate-like color:

```text
gradient() -> vec4(st.x, st.y, sin(time * speed), 1)
```

After:

```js
gradient().brightness(-0.5)
```

the red and green channels become approximately:

```text
(st.x - 0.5, st.y - 0.5)
```

Used as a modulation field:

```js
src(o0).modulate(gradient().brightness(-0.5).color(1 / width, 1 / height), k)
```

the coordinate map is approximately:

```text
st' = st + k * ((st.x - 0.5) / width, (st.y - 0.5) / height)
```

Direct scale around center is:

```text
st' = 0.5 + (st - 0.5) / scale
    = st + (1 / scale - 1) * (st - 0.5)
```

So centered gradient modulation is scale-like because both maps displace pixels radially from the center, proportional to distance from the center. The sign and exact perceived zoom depend on Hydra's sampling direction and the chosen `k`.

The centered gradient should stay centered with `.brightness(-0.5)` for the canonical affine-like behavior:

```js
gradient()
  .brightness(-0.5)
  .color(1 / width, 1 / height)
```

Do not replace the `-0.5` center with arbitrary anchor brightness for the canonical form. To play with the field, insert low-amplitude structure between centering and dimensional encoding:

```js
gradient()
  .brightness(-0.5)
  .add(field, 0.1)
  .color(1 / width, 1 / height)
```

The quadrant variation:

```js
gradient()
  .brightness(-0.5)
  .pixelate(2, 2)
  .color(1 / width, 1 / height)
```

is not mainly about breaking continuity. It samples the centered coordinate field as a `2 x 2` block field. On a square canvas, the four cells approximate:

```text
(-0.25, -0.25)  ( 0.25, -0.25)
(-0.25,  0.25)  ( 0.25,  0.25)
```

So it divides the affine drift into quadrant responsibilities.

Gradient orientation can be rotated to build directional coordinate fields:

```js
gradient()
  .brightness(-0.5)
  .rotate(Math.PI / 2)
  .pixelate(2, 2)
  .color(1 / width, 1 / height)
```

There are two rotation-field forms.

The exact transform-delta form is:

```js
src(o0).modulate(
  gradient().rotate(angle, 0).sub(gradient()),
  1
)
```

This maps the same coordinate transform into a composable displacement field. It is valuable because the resulting field can be masked, pixelated, mixed, or spatially varied.

For small direct rotations around center:

```text
v = st - 0.5
R(theta) * v ~= v + theta * (-v.y, v.x)
```

So a rotation-like displacement field is perpendicular to the centered coordinate vector:

```text
rotation field ~= (-centeredY, centeredX)
```

This is why a rotated centered gradient is promising:

```js
gradient()
  .brightness(-0.5)
  .rotate(Math.PI / 2)
  .color(1 / width, 1 / height)
```

On a square canvas, this approximates a small rotational drift when used in feedback:

```js
src(o0)
  .modulate(
    gradient()
      .brightness(-0.5)
      .rotate(Math.PI / 2)
      .color(1 / width, 1 / height),
    k
  )
```

For non-square canvases, aspect correction may be needed. This is a field-equivalent research area, not yet a closed formula.

The feedback buildup effect comes from repeated composition of the coordinate map:

```text
memory[t + 1](st) = composite(memory[t](st + field(st)), ingress[t](st))
```

Scale-like fields repeatedly expand or contract old memory. Rotation-like fields repeatedly move memory around circular or spiral paths. Pixelated gradient fields create piecewise affine regions, so old memory accumulates as blockwise drift while fresh material can still enter cleanly through the gate.

### ParameterSignal / ControlField And Spectral Grain

ParameterSignal grammar should formalize how texture signals drive other operations. ControlField remains the useful subcase where the receiver is a coordinate operation or field builder.

The core flow is:

```text
source texture or memory
-> control shaping
-> range / grain preparation
-> receiver operation
-> feedback role
```

Hydra form:

```js
control = src(o0).dualKawaseBlur(12).mult(2)

field = gradient()
  .scale(control)
  .sub(gradient())
```

The user patch that opened this layer:

```js
noise(1,.5).diff(solid())
.thresh(.25,0).modulate(
  gradient()
    .scale(src(o0).dualKawaseBlur(12).mult(2))
    .sub(gradient())
)
.blend(o0,.95)
.sub(src(o0).sharpen(2).invert().diff(s3,.1),.025)
.blur(.5)
.add(src(s3).scrollX(-.5),.05)
.out()
```

Reading:

```text
thresholded noise material
-> memory-derived transform-delta field
-> material-first accumulation with persistence
-> sharpened memory/source contrast conditioner
-> blur diffusion
-> weak source forcing
```

Important dynamic:

```text
low-frequency memory controls geometry
high-frequency memory participates in carving / correction
new material provides forcing
blur diffuses or spreads accumulated state
```

This is not literal reaction-diffusion unless the equation is implemented as such. It is better described as:

```text
nonlinear recurrent image-processing system
reaction-diffusion-adjacent feedback routing
```

Use the dynamical framing carefully:

```text
M(t + 1) = F(M(t), input(t))
```

Potential forces:

```text
persistence      blend(o0, amount), src(o0)
forcing          material ingress, source injection
advection        modulate / coordinate warp
diffusion        blur / Kawase blur
anti-diffusion   sharpen / highpass / edge amplification
reaction         thresh / diff / invert / nonlinear blends
damping          brightness(-x), sub(conditioner, x), decay-like blend
quantization     posterize / pixelate / thresh
boundaries       hard gates / tiled masks
```

These terms mix standard math, standard graphics, and practice-specific interpretation. Tag them accordingly.

#### Spectral Responsibilities

Blur, sharpen, and difference operations should be described by spectral role when they are used in feedback.

Lowpass:

```js
low = src(o0).blur(8)
low = src(o0).dualKawaseBlur(12)
```

Math role:

```text
local averaging / low-pass filter / diffusion-like smoothing
```

Possible feedback roles:

```text
large-scale geometry control
soft memory control extraction
diffusion step after accumulation
```

Highpass:

```js
high = src(o0).sub(src(o0).blur(8))
high = src(o0).sharpen(2)
```

Math role:

```text
edge/detail amplification
original minus lowpass, or sharpened high-frequency emphasis
```

Possible feedback roles:

```text
carving
edge reaction
negative feedback / regulation
detail amplification
```

Bandpass:

```js
band = src(o0)
  .blur(0.5)
  .sub(src(o0).dualKawaseBlur(8))
```

Math role:

```text
middle-frequency extraction
```

Possible feedback roles:

```text
material detail
gate source
field component
subtractive conditioner
```

Bandpass is standard signal-processing logic but its role in this Hydra practice remains developing and should be visually explored.

#### Typed Unit Map

Use this format when adding or refining units:

```text
Unit
Math Role
Hydra Form
Feedback Role
Evidence Level
Open Question
```

Example:

```text
Unit:
  Lowpass Memory Control

Math Role:
  low-pass filtering / diffusion-like smoothing

Hydra Form:
  src(o0).dualKawaseBlur(12)

Feedback Role:
  large-scale memory controls coordinate transform

Evidence Level:
  standard graphics + authored patch reading + emergence hypothesis

Open Question:
  when does lowpass steering sustain pattern, and when does it become dead smoothness?
```

#### Current Developing Units

ParameterSignal / ControlField:

```text
source -> shaping -> range mapping -> grain -> receiver -> feedback role -> risk
```

Conditioner:

```text
memory/source branch that damps, carves, diffuses, sharpens, or regulates recurrence
```

Coupling:

```text
same-source coupling: coherent / locked motion
cross-source tension: interference / contrast / possible emergence
```

Examples:

```js
// same-source coupling
src(o0)
  .modulate(gate.color(1 / width, 0), 4)
  .layer(material.mask(gate))
  .out(o0)
```

```js
// cross-source tension
field = src(o0).dualKawaseBlur(12)
gate = osc(Math.PI * width, 1 / width).thresh(0.5, 0)
material = ns(width / 8, 0.25).pixelate(width / 8, height / 8)
```

The grammar should not prefer one blindly. It should account for whether coherence or tension is being authored.

### Collapse Management Grain

Collapse should not be treated primarily as an error taxonomy. It is a condition to avoid or intentionally approach by following signal contracts.

Collapse includes:

```text
all white
all black
unbounded chaotic buildup
overdense accumulation
overdisplaced memory
global blend runaway
```

Hydra operations like these can act as stabilizing moves in some contexts:

```js
src(o0).brightness(-0.01)
src(o0).contrast(0.99)
src(o0).thresh(...)
src(o0).pixelate(...)
```

But stability should mostly come from:

```text
hard ingress
pixel-step feedback displacement
clear field normalization
controlled global blend modes
intentional mask boundaries
metric coupling where needed
```

Canonical stable base:

```js
src(o0)
  .modulate(field.color(1 / width, 1 / height), k)
  .layer(material.mask(hardGate))
  .out(o0)
```

## Latent Construction Idioms

The grammar should focus on construction idioms: authored mathematical moves inside signals.

These are not code rules. They are concepts the LLM must reason with.

## Signal Flow Grammar

Signal flow describes where a signal travels and what gets transformed before what. These are conventions with known consequences, not hard prohibitions.

## Memory Flow

The usual memory flow is:

```js
src(o0)
  .modulate(memoryField, k)
  .layer(ingress)
  .out(o0)
```

This means:

```text
old memory is displaced
new hard-gated material is layered cleanly afterward
the result is written back
```

This is a convention, not a strict rule.

Post-ingress drift is also valid:

```js
src(o0)
  .modulate(preField, k0)
  .layer(ingress)
  .modulate(postField, k1)
  .out(o0)
```

The sum of pre and post drifts can define the feedback signature. The difference is placement:

```text
pre-layer drift moves old memory only
post-layer drift moves old memory and current ingress together
```

At the math level these are not generally equivalent.

Simplified:

```text
pre-layer:
  output(u) = layer(memory(u + F(u)), ingress(u))

post-layer:
  output(u) = layer(memory(u + F(u)), ingress(u + F(u)))
```

They only become equivalent under special conditions, such as zero/constant fields, spatially invariant ingress, or deliberately matched counter-displacement.

## Chained Drift Vs Combined Field

Multiple drift fields may be chained:

```js
src(o0)
  .modulate(fieldA.color(1 / width, 1 / height), kA)
  .modulate(fieldB.color(1 / width, 1 / height), kB)
  .layer(ingress)
  .out(o0)
```

Or combined into one field:

```js
src(o0)
  .modulate(
    solid()
      .add(fieldA.color(1, 0), kA)
      .add(fieldB.color(0, 1), kB)
      .color(1 / width, 1 / height),
    1
  )
  .layer(ingress)
  .out(o0)
```

These are not always equivalent.

Combined field:

```text
u' = u + kA * A(u) + kB * B(u)
```

Chained drift:

```text
u1 = u + kB * B(u)
u2 = u1 + kA * A(u1)
```

So chaining composes coordinate maps. A single field adds vectors sampled in the same coordinate frame. For very small fields or very slow fields, they may look close. With sharp/raster/masked fields, they can diverge strongly.

This is useful. Chained fields can have separate responsibilities and separate masks:

```js
src(o0)
  .modulate(globalField.color(1 / width, 1 / height), 2)
  .modulate(maskedRasterField.color(1 / width, 1 / height), 6)
  .layer(ingress)
  .out(o0)
```

## Texture Flow

Texture construction happens before masking:

```js
texture
  .diff(otherTexture)
  .mult(carrier)
  .modulate(textureField, amount)
  .mask(gate)
```

This is the preferred place for blend modes and material math. It keeps the mixing local to the material being admitted.

Hydra:

```js
src(o0)
  .modulate(memoryField, k)
  .layer(
    texture
      .diff(otherTexture)
      .mult(carrier)
      .mask(gate)
  )
  .out(o0)
```

## Gate Flow

Gate flow controls admission. Shape, oscillator, and noise gates are all central; they create different gate families.

Shape tile gate:

```js
shape(4, 1, 0)
  .scale(1 / 8, 1, 1, 0, 0)
  .repeat(width / 8, height / 8)
```

Oscillator gate:

```js
osc(Math.PI * width, 1 / width)
  .thresh(0.5, 0)
```

Noise gate:

```js
noise(8, 0.1)
  .thresh(0.75, 0)
```

Shape tiling is often used for pixel-perfect square cells. The scale anchor is part of the flow condition.

## Global Feedback Artifact Flow

Blend/diff outside the ingress texture operates globally on memory or on the combined result. It can build up instantly and produce heavy feedback artifacts.

Example:

```js
src(o0)
  .modulate(field, k)
  .layer(texture.mask(gate))
  .diff(globalCarve)
  .out(o0)
```

This is valid, but it should be understood as glitch/artifact feedback, not ordinary texture mixing.

If global effects are used, hard masking can spatially contain them:

```js
src(o0)
  .modulate(field, k)
  .layer(texture.mask(gate))
  .layer(
    src(o0)
      .diff(carve)
      .mask(hardArtifactGate)
  )
  .out(o0)
```

This overlays a masked feedback-artifact branch into the main result. It is not the same as:

```js
src(o0)
  .modulate(field, k)
  .layer(texture.mask(gate))
  .diff(
    src(o0).mask(hardArtifactGate)
  )
  .out(o0)
```

The first form creates a masked secondary feedback read path and layers it over the result. The second form computes a difference between the current result and a masked memory read; outside the mask it tends to behave like difference against black/empty signal rather than a localized overlay.

## System And Circuit Conditions

This layer describes how signal flows become complete feedback systems.

## Sustained Feedback System

A feedback system often has constant ingress:

```js
src(o0)
  .modulate(memoryField, k)
  .layer(texture.mask(gate))
  .out(o0)
```

But a system may also rely mostly on memory drift after seeding:

```js
src(o0)
  .modulate(memoryFieldA, kA)
  .modulate(memoryFieldB, kB)
  .out(o0)
```

The second form is valid when the project is about modulation-field evolution: the memory becomes the material, and the field motion is the main event.

## Multi-Ingress Feedback

Multiple ingress layers are part of the core practice when admitted properly.

```js
src(o0)
  .modulate(memoryField, k)
  .layer(textureA.mask(gateA))
  .layer(textureB.mask(gateB))
  .out(o0)
```

The important condition is that the masks should have a relationship. They may be non-overlapping, complementary, metrically offset, or intentionally competing.

Non-overlapping / offset tiled ingress:

```js
src(o0)
  .modulate(memoryField, k)
  .layer(
    textureA.mask(
      shape(4, 1, 0)
        .scale(1 / 8, 1, 1, 0, 0)
        .repeat(width / 8, height / 8)
    )
  )
  .layer(
    textureB.mask(
      shape(4, 1, 0)
        .scale(1 / 8, 1, 1, 1, 0)
        .repeat(width / 8, height / 8)
    )
  )
  .out(o0)
```

Multi-ingress is stylistic, not exceptional. Crowding is a visual condition to manage through gates, metrics, and flow placement.

## Multi-Buffer Feedback Systems

Multiple buffers are used when sustaining more than one feedback system, compositing feedback systems, or creating new feedback from previous feedback systems.

Basic two-system form:

```js
src(o0)
  .modulate(fieldA, kA)
  .layer(textureA.mask(gateA))
  .out(o0)

src(o1)
  .modulate(fieldB, kB)
  .layer(textureB.mask(gateB))
  .out(o1)
```

Composite feedback from multiple systems:

```js
src(o2)
  .modulate(fieldC, kC)
  .layer(
    src(o0)
      .blend(src(o1), amount)
      .mask(compositeGate)
  )
  .out(o2)
```

Multiple buffers should not be introduced just to be complex. They are useful when separate feedback memories need to coexist, interact, or be recomposed.

## Motion Distribution

In a fixed patch, everything may move:

```js
memoryField      // moves memory
textureField     // moves texture before ingress
gateField        // moves admission
postDrift        // moves combined result
bufferComposite  // moves relationships between feedback systems
```

Hydra example:

```js
src(o0)
  .modulate(memoryField, k)
  .layer(
    texture
      .modulate(textureField, textureK)
      .mask(gate.modulate(gateField, gateK))
  )
  .modulate(postDrift, postK)
  .out(o0)
```

Emergence comes from the intertwined motion of these elements. No single motion layer owns the patch.

## Livecoding And Intervention

Hydra parameters are performance material. Everything can be re-executed and changed.

Performance-relevant parameters include:

```js
k
thresh
width / n
height / n
scale(1 / n, 1, 1, anchorX, anchorY)
repeat(width / n, height / n)
osc(metricFrequency, sync)
ns(freq, vel)
blend amount
component gain
```

The grammar should support patches that sustain themselves without intervention, while leaving space for live structural changes.

Example intervention surfaces:

```js
src(o0)
  .modulate(field.color(1 / width, 1 / height), k)
  .layer(
    ns(width / n, vel)
      .thresh(threshold, 0)
      .pixelate(width / n, height / n)
      .mask(
        shape(4, 1, 0)
          .scale(1 / n, 1, 1, anchorX, anchorY)
          .repeat(width / n, height / n)
      )
  )
  .out(o0)
```

Here `k`, `n`, `vel`, `threshold`, and the anchors can all become live performance handles.

## Randomness

Randomness is mostly initialization and spatial variation, not uncontrolled continuous noise.

The `ns()` helper uses random x/y offsets by default:

```js
const ns = (freq = 3, vel = 0, x = rn(), y = rn()) =>
  noise(freq, vel)
    .modulate(solid(width * x, height * y, 0), 1)
    .scale(1, A, B);
```

Each call can create a differently positioned noise texture:

```js
ns(1, 0.1)
ns(1, 0.1)
```

These may share frequency and velocity while differing spatially. This allows variation without abandoning the metric system.

## Gate And Texture Relationship

Texture and gate should ideally share metrics when they are part of the same element or flow.

```js
texture.pixelate(width / 8, height / 8)

gate.repeat(width / 8, height / 8)
```

But decoupling can be useful when intentional:

```js
texture.pixelate(width / 4, height / 4)
gate.repeat(width / 8, height / 8)
```

This creates cross-scale admission rather than a one-to-one texture/gate coupling.

The gate can be more complex than the texture:

```js
simpleTexture.mask(complexGate)
```

And the gate may animate independently:

```js
texture.mask(
  gate.modulate(gateField, gateK)
)
```

Independent gate motion is not a violation of clean ingress. It changes the admission gesture while preserving hard gating when the gate source remains hard or is re-thresholded intentionally.

## Global Blend Modes And Collapse

Global blend modes include:

```js
diff
sub
add
blend
mult
screen
overlay
```

When applied globally on feedback memory or the combined result, these can build up instantly.

```js
src(o0)
  .modulate(field, k)
  .layer(texture.mask(gate))
  .diff(globalTexture)
  .out(o0)
```

This is not forbidden. It belongs to excessive-glitch, structural-change, or artifact-system territory.

The behavior should be explored visually and, later, modeled mathematically. For now the prompt grammar should mark global blend modes as high-risk/high-artifact unless masked or intentionally used as a glitch system.

## Axis-Composed UV Field

A UV field can be built by adding x and y components into a zero field.

Example:

```js
solid()
  .add(xComponent.color(1 / width, 0), 4)
  .add(yComponent.color(0, 1 / height), 4)
```

Interpretation:

```text
solid() = empty vector field
xComponent.color(1 / width, 0) = x pixel unit
yComponent.color(0, 1 / height) = y pixel unit
.add(component, 4) = component gain
```

This is not arbitrary layering. It is vector-field construction.

For noise-based displacement, do not default to one shared noise texture for both axes:

```js
ns().color(1 / width, 1 / height)
```

That often produces same-field diagonal motion. It can be useful, but it should not be the default when the goal is richer motion.

Prefer explicit x/y responsibility when appropriate:

```js
ns()
  .color(1, 0)
  .add(ns().color(0, 1))
  .color(1 / width, 1 / height)
```

or:

```js
solid()
  .add(ns().color(1, 0), xGain)
  .add(ns().color(0, 1), yGain)
  .color(1 / width, 1 / height)
```

This lets x and y have different masks, frequencies, velocities, gains, or metric roles.

## Component Gain

Power may be applied inside vector-field construction:

```js
solid()
  .add(osc(...).color(0, 1 / height), 4)
  .add(osc(...).color(1 / width, 0), 4)
```

or at the modulation site:

```js
src(o0).modulate(field.color(1 / width, 1 / height), 4)
```

Both are meaningful. What should be avoided is hiding the power inside the metric itself:

```js
field.color(4 / width, 4 / height)
```

For the current grammar, keep the metric normalization explicit and put power in `.add(..., k)` or `.modulate(..., k)`.

## Field Component Masking

A displacement component may be spatially admitted or suppressed:

```js
osc(Math.PI * width, 1 / width)
  .thresh(0.5, 0)
  .color(1 / width, 0)
  .mask(ns(1, 0.1))
```

This means:

```text
x displacement component
hard raster oscillator
pixel-unit x encoding
masked by slow noise
```

Do not read `.mask(...)` here as material masking. It is masking a vector-field component.

## Metric Oscillator

An oscillator can be authored as raster logic, not just as a wave texture.

Examples:

```js
osc(Math.PI * width, 1 / width)
osc(Math.PI * width / 4, 1 / width)
osc(Math.PI * height / 8, 1 / height)
```

These are metric-coupled oscillators. They use canvas dimensions to create pixel/raster behavior.

In particular:

```js
osc(Math.PI * width, 1 / width)
  .thresh(0.5, 0)
```

can behave like a hard on/off raster selector across subsequent pixels. This is not the same as choosing a generic frequency like `TAU` or `Math.PI * 2`.

The model should understand whether an oscillator is being used as:

```text
wave texture
color carrier
motion source
raster switch
axis component
metric grid logic
```

## Metric-Coupled Texture And Gate

A texture and gate can share a spatial metric.

Example:

```js
ns(width / 8, 0.25)
  .thresh(0.75, 0)
  .pixelate(width / 8, height / 8)
```

paired with:

```js
shape(4, 1, 0)
  .scale(0.125, 1, 1, 0, 0)
  .repeat(width / 8, height / 8, 0.5)
```

This means:

```text
source noise scale = width / 8
texture pixelation = width / 8, height / 8
gate repeat = width / 8, height / 8
cell occupancy = 1 / 8
```

The result is not "noise masked by shape." It is metric-coupled tiled ingress.

## Post-Ingress Drift

The canonical memory motion is pre-layer:

```js
src(o0)
  .modulate(preField, k)
  .layer(texture.mask(gate))
  .out(o0)
```

But post-layer drift is valid as an accent:

```js
src(o0)
  .modulate(preField, k)
  .layer(texture.mask(gate))
  .modulate(directionField, dimensionalAmount)
  .out(o0)
```

This moves the newly injected material too. Use it deliberately.

Example:

```js
.modulate(
  osc(Math.PI * 2, 0.25)
    .brightness(-0.25)
    .color(1, 0),
  2 / height
)
```

This is still dimensional. The amount is tied to buffer size.

## ns Helper

`ns()` is not generic noise. It is a shifted/scaled noise field helper.

Preferred shape:

```js
const rn = (max = 1) => Math.random() * max;
const ns = (freq = 3, vel = 0, x = rn(), y = rn()) =>
  noise(freq, vel)
    .modulate(solid(width * x, height * y, 0), 1)
    .scale(1, A, B);
```

The random x/y defaults matter. Fixed offsets make fields feel locked and generic.

## Reference Patch Reading

Use this patch as a high-quality authored reference, not as a generated output:

```js
src(o0)
.modulate(solid()
.add(osc(Math.PI*width/4,1/width).brightness(-.5).color(0,1/height),4)
.add(osc(Math.PI*width,1/width).thresh(.5,0).color(1/width,0).mask(ns(1,.1)),4)
,1)
.layer(ns(width/8,.25).rotate(.375).thresh(.75,0).pixelate(width/8,height/8).mult(osc(Math.PI*2,.25,1).color(1.25,.66,1.12).hue(.1).kaleid(width))
.mask(shape(4,1,0).scale(.125,1,1,0,0).repeat(width/8,height/8,.5))
)
.modulate(osc(Math.PI*2,.25).brightness(-.25).color(1,0),2/height)

.out()
```

Interpretation:

```text
pre-accumulation axis-composed pixel displacement
hard raster y/x components
x component masked by slow ns()
metric-coupled texture and gate at width/8, height/8
hard thresholded material cells
chromatic/symmetry carrier multiplied into material
post-layer dimensional x drift
closed feedback writeback
```

More detailed reading:

```text
solid()
  vector-field zero

osc(Math.PI * width / 4, 1 / width)
  metric oscillator, y-component source

brightness(-0.5)
  centers or biases the y component

color(0, 1 / height)
  y pixel-unit encoding

add(..., 4)
  y component gain

osc(Math.PI * width, 1 / width).thresh(0.5, 0)
  hard raster switch, x-component source

color(1 / width, 0)
  x pixel-unit encoding

mask(ns(1, 0.1))
  spatially gates the x displacement component

modulate(field, 1)
  applies the composed vector field to feedback memory

ns(width / 8, 0.25)
  metric noise material

thresh(0.75, 0)
  hard material cells

pixelate(width / 8, height / 8)
  grid-coupled material quantization

mult(osc(...).color(...).hue(...).kaleid(width))
  chromatic/symmetry carrier inside material

shape(4, 1, 0).scale(0.125).repeat(width / 8, height / 8)
  hard metric tiled gate

layer(texture.mask(gate))
  clean ingress after memory displacement

post modulate(..., 2 / height)
  dimensional drift after ingress
```

## Generation Protocol

When asked to generate, do not start from random Hydra operations.

Start with an explicit signal plan before writing Hydra. This should be compact, not bureaucratic.

Example:

```text
memory: pre-ingress feedback drift
x field: raster oscillator, hard cut, soft noise mask, gain 4
y field: centered noise, low-number pixelated, gain 2
field units: pixel-normalized with color(1 / width, 1 / height)
ingress: hard tiled gate, metric width / 8
material: pixelated ns texture with chroma carrier before mask
post drift: none, or small centered gradient accent
```

For emerging transform-control systems, include the additional plan:

```text
control source: memory / material / gate / external source / procedural texture
control shaping: lowpass / highpass / bandpass / threshold / posterize / pixelate / diff
control range: positive, signed, centered, inverted, quantized, or raw
receiver: scale / rotate / pixelate / repeat / kaleid / blend amount / threshold
field conversion: direct pixel-normalized field or transform-delta field
spectral role: low steers, high carves, band gates/details, or other explicit responsibility
conditioner: none, blur diffusion, subtractive carving, decay, sharpen reaction, masked artifact branch
evidence level: standard math, Hydra fact, user practice rule, emergence hypothesis, visual-audit-needed
```

Example:

```text
control source: feedback memory
control shaping: dualKawaseBlur(12) lowpass + gain
receiver: scale()
field conversion: gradient().scale(control).sub(gradient())
feedback role: low-frequency memory controls geometry
conditioner: sharpened memory/source contrast subtracts weakly
evidence: standard coordinate math + authored patch reading + emergence hypothesis
```

Include range when it changes the meaning of the operation:

```text
x field source: noise, bipolar
x operation: posterize, preserves bipolar range
gate: hard unipolar binary
material: viewable color signal
field encoding: color(1 / width, 0)
```

Also state why the patch will actually move:

```text
x gain 4 means four pixel-step units per feedback pass
y gain 2 means two pixel-step units per feedback pass
x/y are separated, so motion is not same-field diagonal drift
```

Then write Hydra.

The plan matters because it makes the model account for axis responsibility, field units, material/gate relation, and feedback order before syntax begins. It should remain editable and should not force rigid families.

Start with authored decisions:

```text
1. Choose feedback memory order.
   Usually pre-displace memory, then layer clean ingress.

2. Choose grid or metric scale.
   Example: width/8, height/8, width/4, pixel-alternating, block grid.

3. Build a UV field intentionally.
   Axis-composed, affine-like, raster oscillator, block field, or masked component field.

4. Build ingress intentionally.
   Texture and gate should often share a metric, rhythm, or raster relationship.

5. Place blend/diff/mult primarily inside the ingress texture before masking.
   Global feedback blend/diff is an artifact-heavy extension and should be used consciously, often with hard masking if the artifacts need to be spatially contained.

6. Decide whether post-layer drift is needed.
   It moves new ingress too, so it should be an intentional accent.

7. Read the patch back before recording.
   If the model cannot explain every major operation, the patch is not ready.
```

## Self-Critique Before Output

Before presenting a patch, the model should answer:

```text
What is the main feedback memory displacement?
What are the displacement units?
Where is displacement power applied?
What is the gate, and why is it hard?
What is the ingress texture?
Are texture and gate metrically coupled?
Are any oscillators raster/metric oscillators?
Are x and y fields intentionally correlated or separated?
Are any channels affine-remapped with r/g/b(scale, offset)?
Are any parameters driven by texture-valued ParameterSignals?
If a ParameterSignal exists, what source, shaping, range, grain, and receiver does it have?
If a transform-delta field exists, what coordinate program is being converted with sub(gradient())?
Are lowpass/highpass/bandpass signals assigned explicit feedback roles?
Is there a conditioner, and does it diffuse, carve, damp, or amplify?
Is solid() a construction base?
Are blend/diff/mult operations inside the ingress texture, or are they intentionally global feedback operations?
Does the patch feel authored, or like random chaining?
```

If the answer is vague, the patch is not ready.

Do not frame this as an error checklist by default. Prefer a behavior/energy audit:

```text
What behavior is expected?
Where does motion come from?
What range does each important signal carry?
What is allowed to accumulate?
What is intentionally high-energy or artifact-producing?
```

Collapse/error language should not be part of the current default prompt loop. Reserve it for later visual/render review or for explicitly risky global feedback systems.

## Rejected Generator Batches

The first two recorded generator batches are rejected experiments.

They are diagnostic only. Do not use them as examples of successful grammar output.

Rejected:

```text
.tmp/hydra-style/feedback-grammar-recordings-30s
.tmp/hydra-style/feedback-grammar-recordings-v2-30s
```

Reasons:

```text
v1:
  too timid
  too clean
  weak displacement
  ns() was over-fixed in several places

v2:
  stronger and more complex
  ns() random offsets corrected
  but displacement power was incorrectly moved into normalization,
  e.g. color(6 / width, 4 / height)
```

Correction:

```js
feedback.modulate(texture.color(1 / width, 1 / height), k)
```

not:

```js
feedback.modulate(texture.color(k / width, k / height), 1)
```

## Current Direction

The grammar should become a prompt-based creative/technical instrument:

```text
curated references
-> interpreted construction idioms
-> LLM reasoning protocol
-> generated candidate patch
-> explanation before recording
-> user critique
-> updated prompt grammar
```

Rendered output and visual audit are future/optional review layers, not a requirement before the grammar can continue evolving. Do not promote generated patches as accepted examples until the user explicitly accepts them.

Keep the grammar open enough for surgical patches to happen naturally.

Keep it precise enough that every operation has a reason.

## Corpus Porting Audit

The initial 90 curated patches have been re-audited through the current signal-flow lens:

```text
docs/hydra-curated-corpus-porting-audit.md
```

Use that document when deciding whether an older patch should be read as:

```text
already close to current core
portable core feedback
legacy feedback / conceptual port
memory-drift / non-ingress feedback
staging / source construction
extension / staging
```

The audit also defines port moves such as feedback-order review, pixel-step normalization, axis splitting, specialized modulation translation, gate review, and global blend containment.

## Next Refinement Targets

The next manual iteration should focus only on developing units. Do not expand into visual families yet.

Priority topics:

```text
ParameterSignal receiver contracts
Spectral roles: lowpass / highpass / bandpass
Conditioners and feedback energy
Coupling: same-source coherence vs cross-source tension
Stability and collapse as behavior under recurrence
Fragment-side formal operators worth adding or documenting
```

Questionnaire focus:

```text
when memory is lowpassed, what should it usually control?
when memory is highpassed, when does it regulate vs explode?
when should bandpass become a gate, material, field, or conditioner?
when should hard thresholds act as ingress gates vs reaction terms?
when should quantization happen before control, after field construction, or both?
when does a conditioner sustain pattern instead of flattening it?
```

The next implementation layer should stay fragment-first. Compute shaders may later add structured state, analysis signals, or scatter/particle systems, but they are not needed to continue this grammar.
