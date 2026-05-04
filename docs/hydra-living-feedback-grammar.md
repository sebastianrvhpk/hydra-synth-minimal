# Hydra Living Feedback Grammar

This is the current corpus-independent grammar for the Hydra feedback practice
we have been articulating. Corpus ports, including v5, are evidence. They are
not the target. The target is a prompt-based, math-aware modular video
synthesizer grammar that can read, mutate, stress, and eventually generate
patches without falling back into random Hydra chaining.

The grammar should stay open enough for authored surprises, but precise enough
that every major operation has a signal role, coordinate role, raster role, or
feedback-memory reason.

Companion artifact:

```text
docs/hydra-operator-module-ledger.md
```

The living grammar defines the language. The ledger turns that language into
reusable operators and modules for reading, mutating, and composing patches.

## What The System Is Learning

The system is learning conditions for emergence, not only surface style.

The central question is:

```text
What lets a feedback patch keep evolving without becoming arbitrary, flat,
washed out, or instantly chaotic?
```

The current answer is:

```text
bounded recurrence
  + hard ingress
  + intentional coordinate fields
  + metric/raster grain
  + parameter/range awareness
  + memory conditioning
  + controlled blend pressure
  + livecodeable module boundaries
```

This is not a rigid patch template. It is a way to account for energy, motion,
masking, and accumulation.

## Abstraction Layers

The working stack is:

```text
Hydra DSL
-> signal unit
-> signal range
-> signal grain
-> operation context
-> channel/range mapping
-> module contract
-> signal flow
-> circuit spec
-> energy behavior under recurrence
-> mutation/generation protocol
-> user visual critique
```

The important move is that a Hydra expression is not interpreted only by its
method names. The same operation can mean different things depending on where it
sits.

Example:

```js
texture.pixelate(8, 8)
```

may be material grain.

```js
field.pixelate(8, 8).color(1 / width, 1 / height)
```

may be quantized displacement.

```js
control.pixelate(1, 1).r(.5, 0)
```

may be a global texture-valued parameter.

## Core Signal Units

Keep the vocabulary small. These are thinking handles, not hard runtime classes.

```text
Parameter
Metric
Texture
Material
Gate
Ingress
Memory
UVField
TransformDeltaField
ParameterSignal
Conditioner
Accumulator
Buffer
```

### Parameter

A scalar value or a fixed JavaScript value used by a Hydra operation.

```js
osc(Math.PI * 2, .25, 1)
shape(4, 1, 0)
.pixelate(width / 8, height / 8)
.modulate(field, 4)
```

Parameters are not abstract knobs. Their meaning depends on the receiver:

```js
.add(component, 4)
```

is high energy in a material mix, but can be reasonable inside a field builder
when the result is later normalized:

```js
solid()
  .add(xComponent.color(1, 0), 4)
  .add(yComponent.color(0, 1), 4)
  .color(1 / width, 1 / height)
```

### Metric

A dimension-aware spatial unit such as `width`, `height`, `1 / width`,
`1 / height`, `width / n`, or `height / n`.

Metrics are not control signals. They define raster scale, pixel-step units,
tile counts, and aspect-safe construction.

```js
field.color(1 / width, 1 / height)

shape(4, 1, 0)
  .scale(1 / 8, 1, 1, 0, 0)
  .repeat(width / 8, height / 8, .5)
```

### Texture And Material

A `Texture` is any image-valued signal. A `Material` is a texture intended to
enter memory through an ingress gate.

Material can be simple:

```js
osc(Math.PI * 2, .2, 1).color(1.2, .7, 1.1)
```

or built by composition:

```js
solid()
  .add(ns(width / 8, .25).pixelate(width / 8, height / 8), .8)
  .diff(osc(Math.PI * 2, .21, 1).kaleid(8))
```

`solid()` is often a construction base, the neutral surface that lets components
be assembled with explicit weights.

### Gate

A gate controls where material is admitted. In feedback ingress, gates should be
hard.

Hard shape gate:

```js
shape(4, 1, 0)
```

Metric tile gate:

```js
shape(4, 1, 0)
  .scale(1 / 8, 1, 1, 0, 0)
  .repeat(width / 8, height / 8, .5)
```

Noise gate:

```js
ns(2, .1).thresh(0, 0)
```

Raster oscillator gate:

```js
osc(Math.PI * width / 8, 1 / 8 / width)
  .thresh((1 + Math.cos(Math.PI / 16)) / 2, 0)
```

Soft masks are valid for other jobs, but ingress gating uses hard admission so
the feedback does not accumulate gray uncertainty unless that is explicitly the
effect.

### Ingress

Ingress is material after the gate:

```js
material.mask(gate)
```

The preferred memory admission is:

```js
.layer(material.mask(gate))
```

This keeps the material/gate relationship readable. Blend modes may be used
inside the material before masking:

```js
solid()
  .add(textureA, .7)
  .diff(textureB, .2)
  .mask(gate)
```

Global feedback blend modes are a different, higher-energy circuit move.

### Memory

Memory is the previous buffer state:

```js
src(o0)
```

In feedback, operations on memory are not post effects. They become recurrence
terms.

```js
src(o0).blur(.5)
src(o0).dualKawaseBlur(4)
src(o0).sharpen(1.2)
src(o0).invert()
src(o0).diff(solid())
```

These alter what survives into the next pass.

### UVField

A `UVField` is a texture used as coordinate displacement. In `.modulate()`, red
is x displacement and green is y displacement. Blue is ignored by the coordinate
math.

Native material displacement can use full-dimension units:

```js
texture.modulate(nativeField, .35)
```

Feedback memory displacement should usually be pixel-normalized:

```js
src(o0)
  .modulate(field.color(1 / width, 1 / height), 4)
```

Here the field describes direction/shape, and `4` means four pixel-step units
per pass.

### TransformDeltaField

A coordinate operation can be converted into a UV displacement field by
subtracting identity coordinates.

```js
gradient()
  .scale(control)
  .sub(gradient())
```

or:

```js
gradient()
  .rotate(angle)
  .sub(gradient())
```

Math:

```text
T(uv) - uv = coordinate delta
```

Once converted into a delta, the field can be normalized, masked, pixelated,
mixed, or driven by texture-valued parameters:

```js
gradient()
  .scale(src(o0).dualKawaseBlur(4).r(.8, .6))
  .sub(gradient())
  .color(1 / width, 1 / height)
```

This is different from a centered coordinate basis:

```js
gradient().brightness(-.5)
```

The centered form gives a signed coordinate field around a zero point. The
`sub(gradient())` form extracts the displacement caused by a coordinate
operation. Both are useful. They are not interchangeable, even when they can
produce related feedback motion.

### ParameterSignal

A `ParameterSignal` is a texture-valued signal used inside a parameter slot.

Canonical global signal form:

```js
ns(1, .05)
  .posterize(4, 1)
  .pixelate(1, 1)
  .r(.5, 0)
```

This can drive expressive parameter receivers such as amount, position, color,
effect depth, transform amount, or repeat offset.

It should not be used blindly for every parameter. Frequency, speed, and scale
slots often have mathematical meaning that can break if treated as arbitrary
textures.

### Conditioner

A conditioner alters memory, material, gate, or field behavior before recurrence
uses it.

Lowpass-like:

```js
src(o0).blur(.75)
src(o0).dualKawaseBlur(9)
```

Highpass-like / contrast-like:

```js
src(o0).sharpen(2)
src(o0).diff(src(o0).dualKawaseBlur(9))
```

Quantizing:

```js
signal.posterize(6, 1)
signal.pixelate(8, 8)
signal.thresh(.5, 0)
```

Conditioners are not "stabilizers" by default. Their role depends on where they
are routed. A blur used before a sharpen feedback term is part of an emergent
energy system, not merely smoothing.

## Mathematical Contracts

### Pixel-Step Feedback Contract

Feedback displacement is safest and most legible when units are explicit:

```js
src(o0)
  .modulate(field.color(1 / width, 1 / height), k)
```

Interpretation:

```text
field: vector texture
color(1 / width, 1 / height): convert channel values to pixel units
k: displacement power in pixels per pass
```

To increase force, change `k`, not the normalization:

```js
.modulate(field.color(1 / width, 1 / height), 6)
```

not:

```js
.modulate(field.color(6 / width, 6 / height), 1)
```

The second form hides the unit system and makes mutation harder.

### Axis Responsibility

Same-field x/y routing often produces diagonal or correlated drift:

```js
ns().color(1 / width, 1 / height)
```

Axis-composed fields allow separate x and y responsibilities:

```js
solid()
  .add(ns(2, .05).color(1, 0), 2)
  .add(ns(2, .07).color(0, 1), 3)
  .color(1 / width, 1 / height)
```

Component masks distribute motion over space:

```js
solid()
  .add(xField.color(1, 0).mask(xGate), 2)
  .add(yField.color(0, 1).mask(yGate), 3)
  .color(1 / width, 1 / height)
```

### Centering And Polarity

Unipolar signals `[0, 1]` need centering when symmetric drift is intended:

```js
osc(Math.PI * 2, .1, 1)
  .brightness(-.5)
```

or channel affine extraction:

```js
osc(Math.PI, .01, 1).r(-.5, .5)
```

Bipolar-ish signals should preserve their sign when quantized. `posterize(k, 1)`
should quantize within the signal's own range rather than clipping negative
values.

### Raster Metric Gates

Metric gates are made by aligning scale and repeat:

```js
shape(4, 1, 0)
  .scale(1 / n, 1, 1, 0, 0)
  .repeat(width / n, height / n, .5)
```

The fourth and fifth `scale` arguments are positioning anchors. For pixel-perfect
tiling, moving the scaled shape to a corner matters:

```js
.scale(1 / 8, 1, 1, 0, 0)
```

instead of leaving the default center anchor.

### Metric Oscillators

Oscillators can be raster instruments, not only waves.

Pixel-aligned vertical structure:

```js
osc(Math.PI * width, 1 / width)
```

One-cell-in-eight raster gate:

```js
osc(Math.PI * width / 8, 1 / 8 / width)
  .thresh((1 + Math.cos(Math.PI / 16)) / 2, 0)
```

The cosine threshold is a raster-width cut. It sets the threshold near the
sample edge of the desired bright cell, rather than using an arbitrary visual
threshold.

### Transform Delta Contract

Use transform-delta fields when affine or coordinate operations should become
composable field material:

```js
gradient()
  .scale(scaleSignal)
  .sub(gradient())
  .color(1 / width, 1 / height)
```

This unlocks:

```text
masking transform influence
pixelating transform influence
mixing transform deltas with noise/raster fields
driving transform amount by ParameterSignal
feeding memory analysis back into coordinate motion
```

## Module Contracts

### Memory Drift

Input:

```text
Memory + UVField + k
```

Hydra:

```js
src(o0).modulate(pixelStepUVField, k)
```

Responsibility:

```text
move existing memory before or after ingress
```

Canonical placement is pre-ingress:

```js
src(o0)
  .modulate(field.color(1 / width, 1 / height), k)
  .layer(material.mask(gate))
  .out(o0)
```

Post-ingress drift is valid when the new material should also move on the
current pass.

### Ingress Module

Input:

```text
Material + Gate
```

Hydra:

```js
material.mask(gate)
```

Responsibility:

```text
admit new material into feedback cleanly
```

The default host is `.layer(...)`.

### Field Orchestra

Input:

```text
multiple field components
```

Hydra:

```js
solid()
  .add(fieldA.color(1, 0).mask(gateA), gainA)
  .add(fieldB.color(0, 1).mask(gateB), gainB)
  .add(transformDelta, gainC)
  .color(1 / width, 1 / height)
```

Responsibility:

```text
compose motion from distributed axis, raster, noise, and transform components
```

This is one of the main creative modules. It replaces generic "modulate by
noise" with authored motion responsibilities.

### Conditioner Branch

Input:

```text
Memory or material
```

Hydra:

```js
src(o0)
  .blur(.75)
  .diff(src(o0).dualKawaseBlur(9))
  .posterize(5, 1)
```

Responsibility:

```text
extract energy, contrast, blur/sharpen tension, polarity, or structure for use
as material, gate, field, or feedback pressure
```

### Global Blend Pressure

Input:

```text
Memory + secondary feedback/material branch
```

Hydra:

```js
src(o0)
  .modulate(field.color(1 / width, 1 / height), k)
  .layer(material.mask(gate))
  .diff(src(o0).mask(hardArtifactGate), .05)
  .out(o0)
```

Responsibility:

```text
introduce feedback-wide pressure, subtraction, inversion, difference, or buildup
```

This is not default ingress. It is a conscious high-energy recurrence move. It
can be masked to localize artifacts.

## Signal Flow Grammar

### Canonical Clean-Ingress Feedback

```text
Memory -> pre-ingress drift
Material + Gate -> Ingress
DisplacedMemory + Ingress -> Accumulator
Accumulator -> Buffer
```

Hydra:

```js
src(o0)
  .modulate(field.color(1 / width, 1 / height), 4)
  .layer(material.mask(gate))
  .out(o0)
```

### Texture-Locus Motion

```text
Material -> native displacement -> hard gate -> ingress
Memory -> pixel-step drift
```

Hydra:

```js
src(o0)
  .modulate(memoryField.color(1 / width, 1 / height), 3)
  .layer(
    material
      .modulate(nativeField, .35)
      .mask(gate)
  )
  .out(o0)
```

### Gate-Locus Motion

```text
Gate coordinates move before admitting material
```

Hydra:

```js
src(o0)
  .modulate(memoryField.color(1 / width, 1 / height), 3)
  .layer(
    material.mask(
      gate.modulate(nativeField, .25)
    )
  )
  .out(o0)
```

### Feedback Conditioner Circuit

```text
Memory -> conditioner -> gate/field/material/control
```

Hydra:

```js
condition = src(o0)
  .blur(.75)
  .diff(src(o0).dualKawaseBlur(9))
  .posterize(5, 1)

src(o0)
  .modulate(
    condition.color(1 / width, 0),
    3
  )
  .layer(material.mask(gate))
  .out(o0)
```

### Transform-Delta Feedback

```text
CoordinateProgram -> subtract identity -> UVField -> Memory drift
```

Hydra:

```js
scaleField = gradient()
  .scale(src(o0).dualKawaseBlur(4).r(.8, .6))
  .sub(gradient())

src(o0)
  .modulate(scaleField.color(1 / width, 1 / height), 1)
  .layer(material.mask(gate))
  .out(o0)
```

## Energy Conditions

The grammar should reason in pairings:

```text
destabilizer + limiter
```

Examples:

```text
feedback drift + pixel-step normalization
hard ingress + strong material
global diff + small amount or hard artifact mask
blur/sharpen tension + quantization or threshold
noise field + axis split or component mask
transform delta + normalization
dense material + metric gate
multi-buffer routing + distinct buffer roles
```

The goal is not to avoid collapse with defensive rules. The goal is to build
conditions where recurrence can produce structure.

## Mutation Protocol

When mutating an authored patch, do not rewrite the whole patch unless asked.

Read the patch as:

```text
memory path
field orchestra
ingress material
ingress gate
conditioner branches
global pressure
buffer roles
parameter signals
```

Then choose a mutation scope:

```text
micro: amount, threshold, gain, channel range, quantization depth
module: replace a field/gate/material/conditioner with same port role
circuit: move drift, add/remove conditioner branch, stage a buffer, add masked pressure
```

The preservation contract must be explicit:

```text
what makes this patch still itself?
which energy balances must remain proportional?
which masks, metrics, or fields are structural?
which values are carefully authored and should not be casually changed?
```

## Generation Protocol

Generation is allowed only as a reasoning process, not as blind patch synthesis.

Before code, produce a circuit plan:

```text
1. memory order
2. ingress material
3. hard gate and metric
4. field orchestra components
5. conditioner branches
6. global pressure, if any
7. parameter-signal receivers, if any
8. energy budget in pixels per pass or small blend amounts
```

Then write Hydra.

Before calling a result successful, read it back:

```text
What is the memory drift?
What are its units?
Where is ingress?
Why is the gate hard?
What is the material doing before the mask?
Are x and y fields correlated or separated?
What is quantized spatially?
What is quantized dynamically?
What is centered, bipolar, or unipolar?
What is the recurrence pressure?
What is allowed to accumulate?
```

## Current State

Mature enough:

```text
signal units
operation context
pixel-step feedback fields
hard ingress
axis-packed field construction
metric gates
transform-delta fields
parameter-signal idea
conditioner branch vocabulary
grammar-aware mutation protocol
```

Still developing:

```text
ParameterSignal receiver contracts
spectral roles under recurrence
field-orchestra design patterns
global blend pressure taxonomy
multi-buffer role taxonomy
visual acceptance criteria
LLM mutator examples accepted by user
```

Not the default direction right now:

```text
new patch generation from scratch
visual family naming
corpus-version-specific conclusions
compute-shader expansion
hard rejection rules
```

The grammar should now be treated as a living design language. Corpus analysis
can feed it, but should not replace it.

The next active working surface is the operator/module ledger:

```text
docs/hydra-operator-module-ledger.md
```
