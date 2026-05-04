# Hydra Operator And Module Ledger

This ledger translates the living feedback grammar into reusable operators and
modules. It is not a Hydra API reference and not a corpus family map. It is a
working vocabulary for reading, mutating, stressing, and eventually generating
Hydra feedback systems from authored signal-flow logic.

Corpus patches can provide evidence for these operators. The operators are the
abstract layer we actually want to work with.

## Ledger Schema

Each entry should answer:

```text
what it is
what it consumes
what it produces
Hydra idioms
math role
feedback role
mutation handles
weak or risky uses
```

Use the ledger like a modular video synth patchbay:

```text
Memory -> Memory Drift -> Accumulator
Material + Gate -> Ingress -> Accumulator
Field components -> Field Orchestra -> UVField
Memory/Material -> Conditioner -> Gate/Field/Material/Pressure
ParameterSignal -> receiver slot
Accumulator -> Buffer
```

## 1. Pixel-Step Normalizer

What it is:

```text
Dimension-aware conversion from texture channel values to pixel-sized UV motion.
```

Consumes:

```text
UVField-like texture
```

Produces:

```text
PixelStepUVField
```

Hydra idiom:

```js
field.color(1 / width, 1 / height)
```

Used in feedback:

```js
src(o0)
  .modulate(field.color(1 / width, 1 / height), 4)
```

Math role:

```text
red channel -> x displacement in normalized UV units
green channel -> y displacement in normalized UV units
1 / width, 1 / height -> one-pixel coordinate units
second modulate amount -> pixels per pass
```

Feedback role:

```text
Lets feedback build over many passes instead of warping full-frame instantly.
```

Mutation handles:

```text
k in .modulate(field, k)
field component gains before normalization
axis masks
field grain before normalization
```

Weak or risky use:

```js
field.color(6 / width, 6 / height)
```

This hides power inside the normalizer. Prefer:

```js
field.color(1 / width, 1 / height), 6
```

## 2. Memory Drift

What it is:

```text
Coordinate displacement of feedback memory.
```

Consumes:

```text
Memory + PixelStepUVField + amount
```

Produces:

```text
DisplacedMemory
```

Hydra idiom:

```js
src(o0).modulate(field.color(1 / width, 1 / height), k)
```

Math role:

```text
sample previous frame at uv + field * pixelUnit * k
```

Feedback role:

```text
The main pass-to-pass motion engine. It determines how memory travels before
new material is admitted or after it has been accumulated.
```

Canonical pre-ingress:

```js
src(o0)
  .modulate(field.color(1 / width, 1 / height), 4)
  .layer(material.mask(gate))
  .out(o0)
```

Post-ingress variant:

```js
src(o0)
  .layer(material.mask(gate))
  .modulate(field.color(1 / width, 1 / height), 2)
  .out(o0)
```

Mutation handles:

```text
pre vs post ingress placement
k
field component count
axis split
component masks
field quantization
```

Weak or risky use:

```text
Unnormalized full-frame fields in closed feedback unless intentionally glitchy.
```

## 3. Hard Ingress

What it is:

```text
Admission of new material through a binary or nearly binary mask.
```

Consumes:

```text
Material + Gate
```

Produces:

```text
Ingress
```

Hydra idiom:

```js
material.mask(gate)
```

Preferred host:

```js
.layer(material.mask(gate))
```

Math role:

```text
Gate selects where new material replaces/layers into the feedback state.
Hard gates avoid fractional gray accumulation at ingress edges.
```

Feedback role:

```text
Controls what new information enters memory. The expressive gesture is often
more in the gate and its displacement than in the material alone.
```

Mutation handles:

```text
gate source
gate metric
gate modulation
gate composition
material/gate coupling
```

Weak or risky use:

```text
Soft ingress masks when clean accumulation is desired.
Bare material layers without masking in feedback.
```

## 4. Accumulator Layer

What it is:

```text
The operation that combines displaced memory with new ingress.
```

Consumes:

```text
DisplacedMemory + Ingress
```

Produces:

```text
AccumulatedSignal
```

Hydra idiom:

```js
src(o0)
  .modulate(field.color(1 / width, 1 / height), k)
  .layer(material.mask(gate))
```

Math role:

```text
Composites new gated material into the memory path.
```

Feedback role:

```text
Defines the current frame's new memory state before writeback.
```

Mutation handles:

```text
ingress ordering
multiple ingress layers
post-layer drift
localized artifact pressure after layer
```

Weak or risky use:

```text
Replacing the canonical layer with global add/blend as a default ingress method.
Those are valid, but they are different recurrence pressure modules.
```

## 5. Material Builder

What it is:

```text
Construction of the visual texture to be admitted.
```

Consumes:

```text
Texture generators, blend modes, chroma operations, native displacement,
conditioned memory, constants
```

Produces:

```text
Material
```

Hydra idioms:

```js
osc(Math.PI * 2, .25, 1)
  .color(1.25, .66, 1.12)
  .hue(.1)
  .kaleid(width)
```

```js
solid()
  .add(ns(width / 8, .25).pixelate(width / 8, height / 8), .8)
  .diff(osc(Math.PI * 2, .21, 1).kaleid(8))
```

Math role:

```text
Builds color, contrast, rhythm, texture, and internal displacement before
admission into memory.
```

Feedback role:

```text
Provides new visual energy. It should usually be gated before feedback ingress.
```

Mutation handles:

```text
chroma range
internal displacement
material quantization
blend modes before mask
metric coupling to gate
```

Weak or risky use:

```text
Material complexity that is not matched by a clear gate or field role.
Material that is too dim because destructive texture mixes happen before ingress.
```

## 6. Gate Builder

What it is:

```text
Construction of binary admission structure.
```

Consumes:

```text
shape, osc, noise, metric transforms, masks, thresholds
```

Produces:

```text
Gate
```

Hydra idioms:

```js
shape(4, 1, 0)
```

```js
ns(2, .1).thresh(0, 0)
```

```js
osc(Math.PI * width / 8, 1 / 8 / width)
  .thresh((1 + Math.cos(Math.PI / 16)) / 2, 0)
```

Math role:

```text
Binary selection field. The third argument of shape(..., ..., 0) already makes a
hard edge. .thresh(value, 0) hardens continuous or noisy signals.
```

Feedback role:

```text
Determines spatial admission, rhythm, and discontinuity. A strong gate lets
memory stay readable even when material and fields are energetic.
```

Mutation handles:

```text
gate source
threshold
metric scale
repeat offset
gate-local modulation
gate composition
```

Weak or risky use:

```text
Adding redundant .thresh() to an already hard shape unless later operations made
gray values.
```

## 7. Metric Tile Gate

What it is:

```text
Pixel/raster-aligned gate made by scale + repeat.
```

Consumes:

```text
shape or hard source + metric scale
```

Produces:

```text
Metric Gate
```

Hydra idiom:

```js
shape(4, 1, 0)
  .scale(1 / 8, 1, 1, 0, 0)
  .repeat(width / 8, height / 8, .5)
```

Math role:

```text
scale(1 / n, ..., anchorX, anchorY) makes the cell.
repeat(width / n, height / n, offsetX, offsetY) maps it onto a raster grid.
Corner anchors avoid centered sampling artifacts for pixel-perfect tiling.
```

Feedback role:

```text
Gives ingress a stable metric footprint. This can make highly complex material
read as structured rather than smeared.
```

Mutation handles:

```text
n
anchor corner
repeat offsets
gate composition
metric-coupled material pixelation
```

Weak or risky use:

```text
Smoothly animating tile position when pixel-perfect behavior is the goal,
unless posterize/quantization is used intentionally.
```

## 8. Raster Oscillator

What it is:

```text
An oscillator used as a raster clock or pixel/cell selector.
```

Consumes:

```text
Metric frequency and metric sync
```

Produces:

```text
Gate, FieldComponent, MaterialCarrier, Scanline
```

Hydra idioms:

```js
osc(Math.PI * width, 1 / width)
```

```js
osc(Math.PI * width / 8, 1 / 8 / width)
  .thresh((1 + Math.cos(Math.PI / 16)) / 2, 0)
```

Math role:

```text
The oscillator phase is tied to raster dimensions, so it can produce pixel- or
cell-aligned alternation rather than arbitrary waves.
```

Feedback role:

```text
Creates on/off raster force, scanlines, comb fields, and metric rhythm.
```

Mutation handles:

```text
width vs height axis
cell divisor
threshold
rotation for horizontal structure
channel routing into x or y
```

Weak or risky use:

```text
Treating oscillator frequencies as decorative tau/pi multiples when the patch
needs metric raster behavior.
```

## 9. Axis-Packed UV Field

What it is:

```text
Vector displacement assembled by assigning different components to red/x and
green/y.
```

Consumes:

```text
x component, y component, optional component gates, gains
```

Produces:

```text
UVField
```

Hydra idiom:

```js
solid()
  .add(xComponent.color(1, 0), xGain)
  .add(yComponent.color(0, 1), yGain)
  .color(1 / width, 1 / height)
```

With component masks:

```js
solid()
  .add(xComponent.color(1, 0).mask(xGate), xGain)
  .add(yComponent.color(0, 1).mask(yGate), yGain)
  .color(1 / width, 1 / height)
```

Math role:

```text
red channel displaces x; green channel displaces y.
Component gains happen before final dimensional normalization.
```

Feedback role:

```text
Breaks same-field diagonal drift. Gives motion separate responsibilities.
```

Mutation handles:

```text
x/y source independence
x/y gain ratio
x-only or y-only field
component masks
field grain
```

Weak or risky use:

```text
Using the exact same noise instance for both axes when independent motion was
intended.
```

## 10. Field Orchestra

What it is:

```text
Composed UV field with multiple authored components.
```

Consumes:

```text
axis components, raster components, transform deltas, noise fields, masks,
conditioner-derived fields
```

Produces:

```text
UVField or PixelStepUVField
```

Hydra idiom:

```js
solid()
  .add(rasterY.brightness(-.5).color(0, 1 / height), 2)
  .add(rasterX.thresh(.5, 0).color(1 / width, 0).mask(ns(1, .1)), 2)
  .add(ns(2, .05).posterize(6, 1).pixelate(8, 8).color(1 / width, 0), 1)
  .add(ns(2, .07).posterize(8, 1).pixelate(8, 8).color(0, 1 / height), 1)
```

Math role:

```text
Adds displacement vectors. Each component can carry its own axis, grain, mask,
gain, and polarity.
```

Feedback role:

```text
The main site of authored motion. It creates the feedback signature by summing
several small forces.
```

Mutation handles:

```text
add/remove component
change one component's axis
mask a component
quantize a component
swap component source
rebalance gains while keeping total field energy bounded
```

Weak or risky use:

```text
Adding unrelated components with no axis, grain, or role accounting.
```

## 11. Component Masking

What it is:

```text
Spatially limiting one field/material/conditioner component before it joins a
larger system.
```

Consumes:

```text
Component + Gate
```

Produces:

```text
Localized component
```

Hydra idiom:

```js
xComponent.color(1, 0).mask(ns(1, .1).thresh(0, 0))
```

Math role:

```text
Sets the component to participate only where the mask admits it.
```

Feedback role:

```text
Distributes gestures across the canvas. This is how flow and rhythm can emerge
without every displacement acting everywhere.
```

Mutation handles:

```text
mask source
threshold
metric coupling
masking only x, only y, or both
masking artifact pressure
```

Weak or risky use:

```text
Masking so many components that the field loses coherent global behavior.
```

## 12. Transform Delta Field

What it is:

```text
Coordinate transform expressed as a UV displacement texture.
```

Consumes:

```text
CoordinateProgram + identity gradient
```

Produces:

```text
TransformDeltaField
```

Hydra idioms:

```js
gradient()
  .scale(scaleSignal)
  .sub(gradient())
```

```js
gradient()
  .rotate(angleSignal)
  .sub(gradient())
```

Math role:

```text
T(uv) - uv = coordinate displacement caused by T.
```

Feedback role:

```text
Lets affine-like motion become field material. It can be composed with noise,
raster fields, masks, quantization, and memory-derived controls.
```

Mutation handles:

```text
coordinate operation
control signal
pre-transform distortion of gradient
post-delta quantization
masking the delta
mixing with axis fields
```

Weak or risky use:

```text
Assuming it is the same as gradient().brightness(-.5). The centered gradient is
a coordinate basis; transform delta is a difference between transformed and
identity coordinates.
```

## 13. Centered Coordinate Field

What it is:

```text
Signed coordinate basis around a zero point.
```

Consumes:

```text
gradient()
```

Produces:

```text
Centered field
```

Hydra idiom:

```js
gradient().brightness(-.5)
```

Common variation:

```js
gradient()
  .brightness(-.5)
  .pixelate(2, 2)
  .color(1 / width, 1 / height)
```

Math role:

```text
Converts unipolar coordinate ramp toward a signed coordinate basis. Pixelating
at low counts such as 2,2 turns this into quadrant-like affine pressure.
```

Feedback role:

```text
Useful for scale-like, radial, quadrant, or centered expansion/contraction
motions.
```

Mutation handles:

```text
brightness center
pixelate count
axis routing
small added fields before normalization
masking
```

Weak or risky use:

```text
Changing the -.5 center casually when the field is meant to be symmetric.
Small additions can be expressive, but the center is structural.
```

## 14. Native Material Displacement

What it is:

```text
Displacement inside material, gate, or ingress before or outside feedback
pixel-step normalization.
```

Consumes:

```text
Texture/Gate/Ingress + NativeUVField
```

Produces:

```text
Displaced texture/gate/ingress
```

Hydra idiom:

```js
material.modulate(ns(2, .05), .35)
```

```js
gate.modulate(ns(1, .1), .25)
```

Math role:

```text
Uses Hydra's native modulation units. This can be large and expressive because
it is not recursively moving feedback memory unless placed in the memory path.
```

Feedback role:

```text
Creates internal motion before material is admitted, or moves the gate gesture
that controls admission.
```

Mutation handles:

```text
field source
amount
texture-locus vs gate-locus vs ingress-locus placement
quantization of the field
```

Weak or risky use:

```text
Confusing native material displacement with pixel-step feedback displacement.
```

## 15. Spatial Quantizer

What it is:

```text
Reduction of spatial resolution or sampling granularity.
```

Consumes:

```text
Texture, field, gate, conditioner, or ParameterSignal source
```

Produces:

```text
Spatially quantized signal
```

Hydra idiom:

```js
signal.pixelate(8, 8)
signal.pixelate(width / 8, height / 8)
signal.pixelate(1, 1)
```

Math role:

```text
Forces regions to share sampled values. pixelate(1, 1) makes a global
texture-valued signal. Low counts such as 2,2 or 4,4 produce block/global
structure. Metric counts align to the raster.
```

Feedback role:

```text
Controls grain, reduces high-frequency chaos, creates block motion, or converts
texture into parameter-like control.
```

Mutation handles:

```text
pixelate count
aspect correction
pre/post field construction placement
coupling to gate metric
```

Weak or risky use:

```text
Using odd or arbitrary counts when the intended effect is pixel-perfect or
metric.
```

## 16. Dynamic Quantizer

What it is:

```text
Range/value quantization.
```

Consumes:

```text
Continuous signal
```

Produces:

```text
Stepped signal in the same polarity/range class
```

Hydra idiom:

```js
signal.posterize(k, 1)
```

Math role:

```text
Quantizes values, not space. For the current grammar, posterize(k, 1) should
preserve the signal class: unipolar stays unipolar, bipolar stays bipolar.
```

Feedback role:

```text
Creates stepped fields, parameter staircases, robust gate/control behavior, and
less fragile modulation of sensitive receiver slots.
```

Mutation handles:

```text
k
before or after pixelate
before or after channel affine extraction
parameter receiver
```

Weak or risky use:

```text
Posterize implementations that clip negative/bipolar signals.
```

## 17. ParameterSignal

What it is:

```text
Texture-valued parameter source.
```

Consumes:

```text
texture signal + shaping + grain + channel affine extraction
```

Produces:

```text
Parameter-like value, often global or blocky
```

Hydra idiom:

```js
ns(1, .03)
  .posterize(4, 1)
  .pixelate(1, 1)
  .r(.5, 0)
```

As repeat offset:

```js
gradient()
  .repeat(width / 8, height / 8, phase, 0)
  .sub(gradient())
```

Math role:

```text
Uses the texture graph as a control source. pixelate(1,1) makes it global;
posterize makes it stepped; r/g/b(scale, offset) maps its range.
```

Feedback role:

```text
Allows motion and parameter changes to be signal-driven without () => time or
arrays.
```

Mutation handles:

```text
source
posterize depth
pixelate grain
channel used
scale/offset
receiver slot
```

Weak or risky use:

```text
Driving frequency/speed-like receiver slots blindly, especially where the
runtime expects scalar JS values or where texture-valued params change the math
too aggressively.
```

## 18. Channel Affine Extraction

What it is:

```text
Range remapping of one channel into a useful signal interval.
```

Consumes:

```text
Texture channel + scale/offset arguments
```

Produces:

```text
Mapped scalar/channel signal
```

Hydra idioms:

```js
osc(Math.PI, .01, 1).r(-.5, .5)
osc(Math.PI, .01, 1).g(-.5, .5)
osc(Math.PI, .01, 1).b(1, -.5)
```

Math role:

```text
channel * scale + offset, with possible inversion when scale is negative.
```

Feedback role:

```text
Creates centered, inverted, or range-specific signals for fields, colors,
parameters, and channel-separated material systems.
```

Mutation handles:

```text
channel
scale
offset
inversion
routing into color() or parameter slots
```

Weak or risky use:

```text
Using channel affine extraction without knowing whether the receiver expects
unipolar, centered, or pixel-normalized values.
```

## 19. Random Coordinate Sampler

What it is:

```text
Noise sampled from a random coordinate window, usually through the ns helper.
```

Consumes:

```text
frequency, velocity, random x/y offsets, aspect correction
```

Produces:

```text
Noise texture or field component
```

Hydra idiom:

```js
rn = () => Math.random()
A = width > height ? height / width : 1
B = height > width ? width / height : 1
ns = (f = 1, v = .5, x = rn(), y = rn()) =>
  noise(f, v).scale(1, A, B).modulate(solid(width * x, height * y), 1)
```

Math role:

```text
The helper offsets the sampling window so each call can be a different noise
texture. Aspect correction keeps the field visually balanced.
```

Feedback role:

```text
Provides varied fields, masks, materials, and parameter sources without all
noise components being the same texture.
```

Mutation handles:

```text
frequency
velocity
offset strategy
axis packing
threshold
posterize/pixelate
```

Weak or risky use:

```text
Reusing identical noise texture for x and y when independent components were
intended.
```

## 20. Conditioner Branch

What it is:

```text
A branch that processes memory/material into another signal role.
```

Consumes:

```text
Memory, material, source, or buffer
```

Produces:

```text
Gate, field component, material, pressure term, or ParameterSignal source
```

Hydra idioms:

```js
src(o0)
  .blur(.75)
  .diff(src(o0).dualKawaseBlur(9))
  .posterize(5, 1)
```

```js
src(o0)
  .dualKawaseBlur(12)
  .mult(2)
```

Math role:

```text
Extracts low-frequency structure, high-frequency contrast, polarity, edges,
energy, or stepped state from an existing signal.
```

Feedback role:

```text
Makes memory analyze itself and feed that analysis into motion, gate, material,
or recurrence pressure.
```

Mutation handles:

```text
lowpass radius
highpass/diff pair
posterize depth
threshold
receiver role
amount
```

Weak or risky use:

```text
Calling blur/sharpen merely post effects. In recurrence, they are part of the
feedback equation.
```

## 21. Polarity Conditioner

What it is:

```text
Operation that changes sign, contrast relation, or light/dark pressure.
```

Consumes:

```text
Texture or memory
```

Produces:

```text
Polarity-shifted signal
```

Hydra idioms:

```js
signal.invert()
signal.diff(solid())
signal.brightness(-.5)
signal.sub(other, amount)
```

Math role:

```text
Changes the zero point, opposition, or difference relation between signals.
```

Feedback role:

```text
Can create negative memory systems, erasure, edge pressure, or contrast-driven
recurrence.
```

Mutation handles:

```text
amount
masking
pre/post accumulator placement
source paired for diff/sub
```

Weak or risky use:

```text
Strong global polarity pressure with no limiter, unless immediate buildup or
glitch pressure is intended.
```

## 22. Global Blend Pressure

What it is:

```text
Blend/diff/add/sub applied to the feedback chain itself, not merely inside a
material.
```

Consumes:

```text
Memory/Accumulator + pressure branch
```

Produces:

```text
Pressure-modified feedback state
```

Hydra idioms:

```js
src(o0)
  .modulate(field.color(1 / width, 1 / height), 2)
  .layer(material.mask(gate))
  .sub(src(o0).sharpen(2).invert(), .025)
  .out(o0)
```

Masked pressure:

```js
src(o0)
  .modulate(field.color(1 / width, 1 / height), 2)
  .layer(material.mask(gate))
  .diff(src(o0).mask(hardArtifactGate), .05)
  .out(o0)
```

Math role:

```text
Alters the recurrence equation globally or in a masked region.
```

Feedback role:

```text
Introduces artifact pressure, subtraction, difference, decay, buildup, or
contrast reaction.
```

Mutation handles:

```text
blend mode
amount
masking
source branch
pre/post drift placement
conditioning before pressure
```

Weak or risky use:

```text
Using global blend modes as ordinary texture compositing. In feedback they are
recurrence terms and can dominate the system.
```

## 23. Feedback-As-Material

What it is:

```text
Using memory or a feedback buffer as an input texture for another material,
gate, field, or feedback system.
```

Consumes:

```text
Buffer memory
```

Produces:

```text
Material, gate, field, conditioner source, or secondary feedback
```

Hydra idiom:

```js
material = src(o0)
  .blur(.75)
  .diff(src(o0).dualKawaseBlur(9))
  .posterize(5, 1)
```

Math role:

```text
Closes a semantic loop: the system's current state becomes input material for
the next state.
```

Feedback role:

```text
Enables self-reactive systems where memory drives its own gates, fields, or
visual matter.
```

Mutation handles:

```text
which buffer is read
conditioning
receiver role
amount
quantization
```

Weak or risky use:

```text
Creating unnecessary buffers when the branch can be expressed inline without
changing feedback timing or reuse.
```

## 24. Staged Buffer / Carrier Buffer

What it is:

```text
Separate output buffer with a distinct role.
```

Consumes:

```text
source/material/feedback branch
```

Produces:

```text
Reusable buffer memory
```

Hydra idiom:

```js
material.out(o1)

src(o0)
  .modulate(src(o1).color(1 / width, 1 / height), 2)
  .layer(src(o1).mask(gate))
  .out(o0)
```

Math role:

```text
Stores a signal so it can be reused, delayed, conditioned independently, or run
as another feedback system.
```

Feedback role:

```text
Useful for sustaining multiple systems, compositing feedback systems, or sharing
an expensive/semantic branch across receivers.
```

Mutation handles:

```text
buffer role
read/write timing
whether to inline
whether to add feedback to the staged buffer
which receivers consume it
```

Weak or risky use:

```text
Adding buffers as organization only when inline math is equivalent and clearer.
```

## 25. Metric Coupling

What it is:

```text
Keeping material, gate, and field on related raster scales.
```

Consumes:

```text
metric choices across modules
```

Produces:

```text
coherent raster system
```

Hydra idiom:

```js
gate = shape(4, 1, 0)
  .scale(1 / 8, 1, 1, 0, 0)
  .repeat(width / 8, height / 8, .5)

material = ns(width / 8, .25)
  .pixelate(width / 8, height / 8)
```

Math role:

```text
Aligns spatial frequencies so material and admission share a readable grid.
```

Feedback role:

```text
Lets dense material pass through feedback without becoming muddy.
```

Mutation handles:

```text
shared divisor
intentional mismatch
phase offset
material pixelation
field pixelation
```

Weak or risky use:

```text
Random metric mismatch when clarity is desired. Intentional mismatch can still
be a strong style decision.
```

## 26. Chroma / Channel Material System

What it is:

```text
Using channels as independent material or signal lanes.
```

Consumes:

```text
channel-routed textures, affine ranges, color operations
```

Produces:

```text
Material, field component, or control source
```

Hydra idiom:

```js
osc(Math.PI, .01, 1).g(-.5, .5).color(0, 1, 0)
  .add(osc(Math.PI, .015, 1).r(-.5, .5).color(1, 0, 0))
  .add(osc(Math.PI, .015, 1).b(1, -.5).color(0, 0, 1))
```

Math role:

```text
Channels can hold color, scalar controls, or displacement lanes depending on
receiver context.
```

Feedback role:

```text
Creates chroma pressure, separated signal responsibilities, and material
systems that can later be gated or displaced.
```

Mutation handles:

```text
channel assignment
range mapping
blend amount
hue/color transforms
native displacement per channel source
```

Weak or risky use:

```text
Forgetting that RGB channels mean different things when used as visual material
versus UV displacement.
```

## 27. Texture-Locus, Gate-Locus, Ingress-Locus Motion

What it is:

```text
Placement of modulation relative to material, gate, and mask.
```

Consumes:

```text
Material/Gate/Ingress + NativeUVField
```

Produces:

```text
moved material, moved gate, or moved already-masked ingress
```

Hydra idioms:

Texture-locus:

```js
material
  .modulate(nativeField, .35)
  .mask(gate)
```

Gate-locus:

```js
material.mask(gate.modulate(nativeField, .25))
```

Ingress-locus:

```js
material
  .mask(gate)
  .modulate(nativeField, .35)
```

Math role:

```text
The same modulate operation changes different coordinates depending on where it
is applied.
```

Feedback role:

```text
Controls whether the texture moves inside a fixed gate, the gate gesture moves,
or the already-admitted material moves as a unit.
```

Mutation handles:

```text
locus
field source
amount
whether gate remains hard
whether movement affects current ingress or only future memory
```

Weak or risky use:

```text
Treating these placements as equivalent.
```

## 28. Delay / Previous-State Branch

What it is:

```text
Using earlier memory states as signals.
```

Consumes:

```text
Buffer + frame offset
```

Produces:

```text
delayed memory signal
```

Hydra idiom:

```js
prevN(o0, 8)
```

Example:

```js
src(o0).sub(prevN(o0, 8), .02)
```

Math role:

```text
Temporal difference, echo, or delayed recurrence term.
```

Feedback role:

```text
Can introduce memory contrast, temporal rhythm, decay, or reaction-like terms.
```

Mutation handles:

```text
delay length
blend mode
amount
conditioning delayed branch
masking
```

Weak or risky use:

```text
Large unbounded temporal pressure without normalization or small amounts.
```

## Composition Recipes

### Clean Ingress With Field Orchestra

```js
field = solid()
  .add(ns(2, .05).posterize(6, 1).pixelate(8, 8).color(1, 0), 2)
  .add(ns(2, .07).posterize(8, 1).pixelate(8, 8).color(0, 1), 3)
  .color(1 / width, 1 / height)

src(o0)
  .modulate(field, 4)
  .layer(material.mask(gate))
  .out(o0)
```

### Metric-Coupled Ingress

```js
gate = shape(4, 1, 0)
  .scale(1 / 8, 1, 1, 0, 0)
  .repeat(width / 8, height / 8, .5)

material = ns(width / 8, .25)
  .pixelate(width / 8, height / 8)
  .mult(osc(Math.PI * 2, .25, 1).color(1.25, .66, 1.12))

src(o0)
  .modulate(field, 4)
  .layer(material.mask(gate))
  .out(o0)
```

### Transform-Delta Memory Analysis

```js
scaleField = gradient()
  .scale(src(o0).dualKawaseBlur(4).r(.8, .6))
  .sub(gradient())

src(o0)
  .modulate(scaleField.color(1 / width, 1 / height), 1)
  .layer(material.mask(gate))
  .out(o0)
```

### Masked Global Pressure

```js
pressureGate = ns(2, .1).thresh(0, 0)

src(o0)
  .modulate(field.color(1 / width, 1 / height), 3)
  .layer(material.mask(gate))
  .sub(src(o0).sharpen(2).invert().mask(pressureGate), .025)
  .out(o0)
```

## How A Model Should Use This Ledger

When reading a patch:

```text
1. Identify Memory, Ingress, Field, Gate, Material, Conditioner, Pressure,
   ParameterSignal, and Buffer roles.
2. Mark operation context before interpreting an operation.
3. Write the math contract for every important coordinate and range decision.
4. Identify energy pairings: destabilizer + limiter.
5. Only then propose mutations.
```

When mutating:

```text
preserve patch identity
preserve authored energy ratios unless the goal is to stress them
change one module role at a time for reviewable candidates
keep displacement power in k, not hidden in normalization
prefer module-level substitutions over unrelated chains
```

When generating:

```text
generate a circuit plan first
instantiate modules from the ledger
read the patch back through the ledger
do not call the result good until rendered and accepted
```

## Current Gaps

The ledger is mature enough to guide mutation and critique. It still needs more
manual refinement in:

```text
ParameterSignal receiver contracts
field orchestra design patterns
global blend pressure subtypes
multi-buffer role taxonomy
visual acceptance vocabulary
render-reviewed examples
```
