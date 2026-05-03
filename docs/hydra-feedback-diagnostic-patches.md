# Hydra Feedback Diagnostic Patches

These are not accepted examples. They are review candidates for criticizing the current grammar.

The goal is to expose signal-flow decisions clearly enough to reject, correct, or refine them.

## Review Round 1

User critique outcome:

```text
Candidate 1:
  not accepted.
  Noise in material made the ingress too dim.
  Raw transform-delta scale inside feedback was too strong unless normalized/attenuated.
  Raster oscillator gate should use the cosine threshold formula for pixel-perfect cuts.
  The scaleField was too plain: a valid scale transform is not yet an emergent control.

Candidate 2:
  rejected.
  The idea did not read clearly and should not be used as a grammar example.

Candidate 3:
  useful channel-affine idea, but the separate variable format failed because graph nodes mutate.
  Branches must be inlined, regenerated through factories, or cloned.

Candidate 4:
  promising.
  Works better when the tile transform-delta field is blurred and pixel-normalized before feedback modulation.
  This shows coordinate topology can become feedback-scale motion structure, not necessarily raw exact transform.

Candidate 5:
  partially useful after manual rewrite, but not strong as a patch.
  Repeated src(o0) branches and variable reuse need safer branch construction.
  Some mixed centered/raw gradient forms should be treated as weird UV mappings, not canonical transform-delta.
```

Grammar updates from critique:

```text
exact transform-delta:
  gradient().coordOp(...).sub(gradient())
  means T(st) - st and is exact when used as modulate(field, 1)

feedback-scale transform-derived drift:
  transform-delta field can be blurred, attenuated, quantized, or pixel-normalized
  before entering a recursive feedback loop

control quality:
  a ControlField must carry motion, grain, spectral structure, phase, mask, or another authored behavior
  plain scale from lowpass memory can be mathematically valid but visually uninteresting

branch safety:
  assigned graph nodes mutate in this runtime.
  repeated branch sources need inlining, factory functions, or clone().
```

Safe reusable branch patterns:

```js
// factory style
wave = () => osc(Math.PI, .015, 1).modulate(ns(2, .05), .5)

material = wave().g(-.5, .5).color(0, 1, 0)
  .add(wave().r(-.5, .5).color(1, 0, 0))
```

```js
// clone style, supported by this runtime after the clone helper
wave = osc(Math.PI, .015, 1).modulate(ns(2, .05), .5)

material = wave.clone().g(-.5, .5).color(0, 1, 0)
  .add(wave.clone().r(-.5, .5).color(1, 0, 0))
```

## Candidate 1: Low Memory Scale, Raster Push, High Memory Carve

Plan:

```text
memory role: canonical memory-first feedback
control: lowpass memory drives scale transform-delta field
direct field: hard raster x push, masked by slow noise
ingress: metric tiled hard gate
conditioner: weak high-frequency contrast subtraction
open risk: scale control may be too smooth or too weak; conditioner may flatten detail
```

Patch:

```js
low = src(o0).dualKawaseBlur(10).r(.65, .65)

edge = src(o0)
  .sharpen(1.5)
  .diff(src(o0).dualKawaseBlur(5))

gate = shape(4, 1, 0)
  .scale(1 / 8, 1, 1, 0, 0)
  .repeat(width / 8, height / 8, .5)

material = ns(width / 8, .22)
  .pixelate(width / 8, height / 8)
  .mult(
    osc(Math.PI * 2, .17, 1)
      .color(1.2, .7, 1.1)
      .hue(.08)
  )

scaleField = gradient()
  .scale(low)
  .sub(gradient())

rasterField = osc(Math.PI * width, 1 / width)
  .thresh(.5, 0)
  .color(1 / width, 0)
  .mask(ns(1, .08))

src(o0)
  .modulate(scaleField, .35)
  .modulate(rasterField, 4)
  .layer(material.mask(gate))
  .sub(edge.invert(), .015)
  .blur(.25)
  .out(o0)
```

## Candidate 2: Bandpass Rotation Control In Material-First Accumulation

Plan:

```text
memory role: material-first feedback accumulation
control: band-ish memory controls local rotation
field conversion: transform-delta rotate field
forcing: thresholded noise material
conditioner: weak sharpen/source-band contrast subtraction
open risk: material-first blend may become too generic; rotation control may need stronger range shaping
```

Patch:

```js
band = src(o0)
  .blur(.5)
  .diff(src(o0).dualKawaseBlur(7))
  .posterize(6, 1)
  .pixelate(4, 4)

angle = band.r(Math.PI * 1.5, -Math.PI * .75)

field = gradient()
  .rotate(angle, 0)
  .sub(gradient())

force = noise(1, .45)
  .diff(solid())
  .thresh(.28, 0)

force
  .modulate(field, .75)
  .blend(src(o0).blur(.2), .93)
  .sub(src(o0).sharpen(1.7).diff(band), .02)
  .blur(.25)
  .out(o0)
```

## Candidate 3: Channel-Affine Oscillator Material With Axis Field

Plan:

```text
memory role: canonical memory-first feedback
material: RGB phase-split oscillator using r/g/b(scale, offset)
field: channel-affine oscillator components packed as x/y axes
gate: metric raster gate intersected with tiled shape gate
open risk: may read as color study more than feedback emergence; gate may need stronger coupling
```

Patch:

```js
wave = osc(Math.PI, .015, 1)
  .modulate(ns(2, .05), .5)

material = wave.g(-.5, .5).color(0, 1, 0)
  .modulate(ns(1, .07), 1)
  .add(
    wave.r(-.5, .5).color(1, 0, 0)
      .modulate(ns(1, .09), 1)
  )
  .add(
    wave.b(1, -.5).color(0, 0, 1)
      .modulate(ns(1, .11), 1)
  )
  .blend(wave, .35)

gate = osc(Math.PI * width / 8, 1 / 8 / width)
  .thresh((1 + Math.cos(Math.PI / 16)) / 2, 0)
  .mask(
    shape(4, 1, 0)
      .scale(1 / 8, 1, 1, 0, 0)
      .repeat(width / 8, height / 8, .5)
  )

field = solid()
  .add(wave.r(2, -1).color(1, 0).mask(ns(1, .1)), 2)
  .add(wave.g(2, -1).color(0, 1).mask(ns(1, .13)), 3)
  .color(1 / width, 1 / height)

src(o0)
  .modulate(field, 4)
  .layer(material.mask(gate))
  .out(o0)
```

## Candidate 4: Tile Topology Field With Phase-Controlled Gate

Plan:

```text
memory role: canonical feedback with topology displacement
control: global posterized noise drives repeat phase
field: repeat coordinate topology converted to transform-delta
secondary field: small direct noise drift
ingress: gate and field share tile phase
open risk: repeat topology discontinuity may tear too hard; modulation amount intentionally partial
```

Patch:

```js
phase = ns(1, .03)
  .posterize(4, 1)
  .pixelate(1, 1)
  .r(.5, 0)

tileField = gradient()
  .repeat(width / 8, height / 8, phase, 0)
  .sub(gradient())

gate = shape(4, 1, 0)
  .scale(1 / 8, 1, 1, 0, 0)
  .repeat(width / 8, height / 8, phase, 0)

material = solid()
  .add(ns(width / 8, .2).pixelate(width / 8, height / 8), .8)
  .diff(osc(Math.PI * 2, .21, 1).kaleid(8))

src(o0)
  .modulate(tileField, .25)
  .modulate(ns().color(1 / width, 1 / height), 2)
  .layer(material.mask(gate))
  .blur(.15)
  .out(o0)
```

## Candidate 5: Band-Regulated Gate With Lowpass Geometry

Plan:

```text
memory role: canonical memory-first feedback
control: lowpass memory drives scale transform
field: lowpass transform plus band x-component
gate: procedural tiled gate with bandpass memory reinforcement
conditioner: weak band subtraction
open risk: gate depends partly on current memory, so initial seeding and fallback gate matter
```

Patch:

```js
low = src(o0).dualKawaseBlur(14)

band = src(o0)
  .blur(.75)
  .diff(src(o0).dualKawaseBlur(9))
  .posterize(5, 1)

baseGate = shape(4, 1, 0)
  .scale(1 / 6, 1, 1, 0, 0)
  .repeat(width / 6, height / 6, .5)
  .mask(ns(2, .1).thresh(0, 0))

gate = baseGate
  .add(band.thresh(.2, 0), .5)
  .thresh(.25, 0)

scaleField = gradient()
  .scale(low.r(.8, .6))
  .sub(gradient())

field = scaleField
  .add(band.color(1 / width, 0), 3)

material = noise(1, .4)
  .diff(solid())
  .thresh(.25, 0)
  .mult(
    osc(Math.PI * 2, .2, 1)
      .color(1.1, .8, 1.2)
  )

src(o0)
  .modulate(field, 1)
  .layer(material.mask(gate))
  .sub(band.invert(), .01)
  .out(o0)
```

## Round 2 Candidates

These incorporate the first critique:

```text
use nested renderpass transforms as auto-staged texture conditioners when they are local field/material conditioners
stage renderpass fields when reuse, cost control, or framebuffer feedback semantics matter
use clone or repeated source construction for branches
normalize/attenuate transform-derived fields in feedback
make control fields carry motion, grain, or phase instead of plain scale
```

## Candidate 6: Staged Tile-Topology Field

Plan:

```text
field staging: exact tile topology field into o1
field conditioning: blur and pixel-normalize staged field into o2
feedback: memory-first, using topology-derived drift at feedback scale
ingress: tile gate shares phase with topology field
open risk: uses extra buffers; should verify signed field staging visually
```

Patch:

```js
phase = ns(1, .03)
  .posterize(4, 1)
  .pixelate(1, 1)
  .r(.5, 0)

gradient()
  .repeat(width / 8, height / 8, phase, 0)
  .sub(gradient())
  .out(o1)

src(o1)
  .dualKawaseBlur(20)
  .color(1 / width, 1 / height)
  .out(o2)

gate = shape(4, 1, 0)
  .scale(1 / 8, 1, 1, 0, 0)
  .repeat(width / 8, height / 8, phase, 0)

material = solid()
  .add(ns(width / 8, .2).pixelate(width / 8, height / 8), .8)
  .diff(osc(Math.PI * 2, .21, 1).kaleid(8))

src(o0)
  .dualKawaseBlur(2)
  .modulate(src(o2), .5)
  .modulate(ns().color(1 / width, 1 / height), 2)
  .layer(material.mask(gate))
  .out(o0)
```

## Candidate 7: Clone-Safe Channel Oscillator Feedback

Plan:

```text
branching: uses clone() so r/g/b branches do not mutate one another
field: channel-affine wave components, axis separated
material: phase-split chroma oscillator, hard-gated
feedback: canonical memory-first pixel-normalized drift
open risk: still may read as a color/material study unless feedback field is strong enough
```

Patch:

```js
wave = osc(Math.PI, .015, 1)
  .modulate(ns(2, .05), .5)

gate = osc(Math.PI * width / 8, 1 / 8 / width)
  .thresh((1 + Math.cos(Math.PI / 16)) / 2, 0)
  .mask(
    shape(4, 1, 0)
      .scale(1 / 8, 1, 1, 0, 0)
      .repeat(width / 8, height / 8, .5)
  )

field = solid()
  .add(wave.clone().r(2, -1).color(1, 0).mask(ns(1, .1)), 2)
  .add(wave.clone().g(2, -1).color(0, 1).mask(ns(1, .13)), 3)
  .color(1 / width, 1 / height)

material = wave.clone().g(-.5, .5).color(0, 1, 0)
  .modulate(ns(1, .07), 1)
  .add(
    wave.clone().r(-.5, .5).color(1, 0, 0)
      .modulate(ns(1, .09), 1)
  )
  .add(
    wave.clone().b(1, -.5).color(0, 0, 1)
      .modulate(ns(1, .11), 1)
  )
  .blend(wave.clone(), .35)

src(o0)
  .modulate(field, 4)
  .layer(material.mask(gate))
  .out(o0)
```

## Candidate 8: Non-Renderpass Memory Control, Transform-Derived Drift

Plan:

```text
control: memory-derived but no renderpass in nested field
control shaping: posterized/pixelated memory controls local scale
field: transform-derived, then pixel-normalized for feedback
secondary field: hard raster x component
conditioner: simple subtractive pixelated memory branch
open risk: without lowpass, control may be too busy; pixelate/posterize should make it structured
```

Patch:

```js
control = src(o0)
  .posterize(6, 1)
  .pixelate(4, 4)
  .r(.5, .75)

scaleField = gradient()
  .scale(control)
  .sub(gradient())
  .color(1 / width, 1 / height)

rasterField = osc(Math.PI * width / 8, 1 / 8 / width)
  .thresh((1 + Math.cos(Math.PI / 16)) / 2, 0)
  .color(1 / width, 0)
  .mask(ns(1, .08))

gate = shape(4, 1, 0)
  .scale(1 / 8, 1, 1, 0, 0)
  .repeat(width / 8, height / 8, .5)

material = osc(Math.PI * 2, .2, 1)
  .color(1.15, .75, 1.05)
  .hue(.08)
  .mask(gate)

src(o0)
  .modulate(scaleField, .5)
  .modulate(rasterField, 4)
  .layer(material)
  .sub(src(o0).pixelate(width / 16, height / 16), .02)
  .out(o0)
```

## Candidate 9: Staged Low/High Spectral Responsibilities

Plan:

```text
staging: lowpass memory into o1, highpass-like memory into o2
field: lowpass memory controls scale, highpass adds x-component
conditioner: highpass branch subtracts weakly
feedback: memory-first with hard metric ingress
open risk: multi-buffer but responsibilities are explicit
```

Patch:

```js
src(o0)
  .dualKawaseBlur(8)
  .out(o1)

src(o0)
  .diff(src(o1))
  .posterize(6, 1)
  .out(o2)

lowControl = src(o1).r(.6, .7)

scaleField = gradient()
  .scale(lowControl)
  .sub(gradient())
  .color(1 / width, 1 / height)

field = scaleField
  .add(src(o2).color(1 / width, 0), 3)

gate = shape(4, 1, 0)
  .scale(1 / 8, 1, 1, 0, 0)
  .repeat(width / 8, height / 8, .5)
  .mask(ns(2, .1).thresh(0, 0))

material = osc(Math.PI * 2, .17, 1)
  .color(1.2, .7, 1.1)
  .hue(.08)

src(o0)
  .modulate(field, .75)
  .layer(material.mask(gate))
  .sub(src(o2).invert(), .015)
  .blur(.15)
  .out(o0)
```

## Candidate 10: Auto-Staged Nested Tile Drift

Plan:

```text
field: transform-derived tile topology, then nested blur as auto-staged texture conditioner
normalization: field remains pixel-normalized before feedback use
ingress: hard tile gate with same phase responsibility
material: clear oscillator material, not dimmed by heavy noise
open risk: blur over exact linear gradient is weak, so blur is placed after repeat/sub topology
```

Patch:

```js
phase = ns(1, .04)
  .posterize(4, 1)
  .pixelate(1, 1)
  .r(.5, 0)

tileDrift = gradient()
  .repeat(width / 8, height / 8, phase, 0)
  .sub(gradient())
  .blur(6)
  .color(1 / width, 1 / height)

noiseVector = solid()
  .add(ns(2, .08).color(1, 0).mask(ns(1, .1)), 2)
  .add(ns(2, .11).color(0, 1).mask(ns(1, .13)), 3)
  .color(1 / width, 1 / height)

gate = shape(4, 1, 0)
  .scale(1 / 8, 1, 1, 0, 0)
  .repeat(width / 8, height / 8, phase, 0)

material = osc(Math.PI * 2, .18, 1)
  .color(1.15, .7, 1.1)
  .hue(.08)
  .kaleid(8)

src(o0)
  .modulate(tileDrift, 5)
  .modulate(noiseVector, 2)
  .layer(material.mask(gate))
  .out(o0)
```

## Candidate 11: Inline Edge-Conditioned Scale Field

Plan:

```text
field: memory control creates transform-derived scale drift
conditioner: nested edgeDetect acts on that field expression, not on prevBuffer
feedback: edge field is pixel-normalized and kept weak enough to avoid instant tearing
ingress: hard raster/tile hybrid gate
open risk: edgeDetect of a signed coordinate delta may need gain/range review visually
```

Patch:

```js
control = src(o0)
  .dualKawaseBlur(6)
  .posterize(5, 1)
  .r(.45, .75)

scaleEdges = gradient()
  .scale(control)
  .sub(gradient())
  .edgeDetect(1.5, 1)
  .color(1 / width, 1 / height)

raster = osc(Math.PI * width / 8, 1 / 8 / width)
  .thresh((1 + Math.cos(Math.PI / 16)) / 2, 0)

gate = shape(4, 1, 0)
  .scale(1 / 8, 1, 1, 0, 0)
  .repeat(width / 8, height / 8, .5)
  .mask(raster)

material = solid()
  .add(osc(Math.PI * 2, .16, 1).color(1.2, .75, 1.05), .8)
  .diff(ns(width / 8, .18).pixelate(width / 8, height / 8), .35)

src(o0)
  .modulate(scaleEdges, 3)
  .modulate(ns().color(1 / width, 1 / height), 2)
  .layer(material.mask(gate))
  .out(o0)
```
