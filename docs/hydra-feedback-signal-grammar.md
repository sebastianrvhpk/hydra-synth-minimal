# Hydra Feedback Signal Grammar

This is a manually curated working document for the feedback grammar being developed from the user's Hydra practice. It is not a complete Hydra reference and it is not a statistical summary of the corpus. It captures the current intended interpretation of signal types, displacement units, gating, ingress, and feedback motion so the system can be iterated without drifting into generic Hydra chaining.

## Current Goal

The system should understand feedback patches as a modular video synthesizer grammar:

```text
Texture + Gate -> Ingress
Memory + UVField -> displaced feedback memory
Displaced Memory + Ingress -> layered feedback accumulation
Displaced feedback -> Buffer write
```

The core phrase is:

```js
src(o0)
  .modulate(pixelStepUVField, k)
  .layer(texture.mask(gate))
  .out(o0)
```

This should be treated as the canonical feedback structure. The expressive center is not a bare texture layered on video feedback. The expressive center is the existing memory being displaced behind the new material, while the new texture is admitted cleanly through a hard gate after that displacement.

The current grammar also has an explicit parameter-signal layer. Some values that looked like JavaScript arrays, `()=>time` callbacks, or random scalar helpers are better read as texture-valued controls:

```text
TextureSignal -> pixelate(1, 1) -> ParameterSignal
```

This is how material, gate, UV-field, and conditioner modules can receive dynamic parameters while staying inside Hydra's texture graph. It does not replace ordinary numbers; it names the cases where a value should remain alive as a signal.

## Corpus Fit Snapshot

This snapshot checks the first 90 curated patterns against the current manual signal grammar. It is a heuristic read over the extracted chains, not a final semantic proof.

Corpus size:

```text
patterns: 90
chains: 153
```

Strong matches:

```text
closed feedback loops: 65 / 153 chains
closed feedback accumulation: 57 / 153 chains
masked feedback accumulation: 50 / 57 closed accumulation chains
closed accumulation using .layer(...): 47 / 57 closed accumulation chains
closed accumulation with .layer(arg.mask(...)): 46 / 57 closed accumulation chains
masked feedback with UV displacement: 43 / 50 masked feedback chains
mask chains with hard gate evidence: 88 / 92 chains containing .mask(...)
```

Order check for the stricter `layer(mask) + UV feedback` subset:

```text
all modulation before layer: 19 / 41 chains
all modulation after layer: 12 / 41 chains
modulation before and after layer: 7 / 41 chains
interleaved / more complex: 3 / 41 chains
```

This supports pre-accumulation displacement as a real corpus-supported structure, while also showing that post-accumulation displacement exists as an older or adjacent variant.

Pattern-level presence:

```text
patterns with closed feedback: 59 / 90
patterns with closed feedback accumulation: 52 / 90
patterns with masked feedback accumulation: 45 / 90
patterns with closed + masked + UV feedback: 40 / 90
patterns with hard gate evidence: 68 / 90
patterns with pixel-step metric evidence: 66 / 90
patterns containing ns(): 47 / 90
patterns with solid().add(...) construction: 41 / 90
```

Interpretation:

```text
Texture + Gate -> Ingress
Memory + UVField -> displaced feedback memory
Displaced Memory + Ingress -> layered feedback accumulation
```

is not an invented abstraction. It describes a large central mass of the corpus, especially the closed-feedback subset.

The new stricter view also reveals mismatches:

```text
closed accumulation using add/blend somewhere: 19 / 57
closed feedback with direct geometry modulation or transform operators: 23 / 65
uv-feedback without pixel-step metric evidence: 14 chains
possible redundant shape(..., 0).thresh(..., 0): 6 chains
chains with soft/nonzero thresh evidence: 30 / 153
```

These should not all be treated as failures. Some are likely older or adjacent idioms, staged helper chains, source-construction chains, or examples where the corpus is broader than the current core feedback method. For generation, they should be marked as secondary or exceptional until manually accepted.

## Extension Vs Divergence Read

The corpus does not heavily contradict the current grammar. It looks more like a layered practice:

```text
core grammar
  hard-gated ingress into feedback, usually layered, usually displaced

extensions
  source construction, staging buffers, carving, channels, chroma, constructed vector fields

legacy / divergent idioms
  soft thresholds, add/blend accumulation, direct transform operators on feedback, unnormalized feedback modulation
```

Pattern-level heuristic buckets:

```text
strict core patterns: 28 / 90
broader core patterns: 38 / 90
core plus extension patterns: 19 / 90
extension without core patterns: 46 / 90
divergence with core patterns: 25 / 90
divergence without core patterns: 17 / 90
neither core, extension, nor divergence: 5 / 90
```

These buckets overlap because one pattern can contain a canonical feedback chain plus staging/helper chains or legacy moves.

Useful extensions:

```text
source construction: 27 / 90 patterns
cross-buffer staging: 20 / 90 patterns
subtractive carving: 39 / 90 patterns
channel staging: 8 / 90 patterns
chroma modulation: 17 / 90 patterns
solid().add(...) construction: 41 / 90 patterns
axis-packed ns() vector fields: 10 / 90 patterns
```

These should mostly extend the module and circuit layers, not bloat the signal layer. For example, `solid().add(...)` supports `TextureConstruction`, and `ns().color(1, 0).add(ns().color(0, 1))` supports `AxisPackedUVField`. They are not reasons to invent many new signal types.

Likely legacy or non-core moves:

```text
closed feedback accumulation using add/blend: 18 / 90 patterns
closed feedback with direct geometry/transform ops: 22 / 90 patterns
UV feedback without pixel-step metric evidence: 12 / 90 patterns
soft/nonzero threshold evidence: 23 / 90 patterns
```

These should be preserved as corpus facts but not treated as the preferred grammar. They may represent older practice, experiments, or adjacent Hydra idioms. In generation they should be tagged as `legacy`, `exception`, or `experimental`, not mixed into the default feedback recipe.

## Circuit Variants To Build

The generator should begin with a small set of named circuit variants. These variants share the same signal layer, but differ in where displacement, construction, and blend-mode operations happen.

### Canonical Pre-Accumulation Feedback

Memory is displaced first. New ingress is layered after displacement, so the injected material appears cleanly on the current pass while all accumulated history moves behind it.

```js
src(o0)
  .modulate(pixelStepUVField, k)
  .layer(texture.mask(gate))
  .out(o0)
```

### Texture-Locus Modulation Feedback

The texture moves internally before it is admitted through the gate. The feedback memory still moves before the layer.

```js
src(o0)
  .modulate(pixelStepUVField, k)
  .layer(
    texture
      .modulate(nativeUVField, amount)
      .mask(gate)
  )
  .out(o0)
```

### Gate-Locus Modulation Feedback

The gate gesture moves or deforms. If the gate source is already hard, the modulation changes sampling coordinates rather than edge smoothness.

```js
src(o0)
  .modulate(pixelStepUVField, k)
  .layer(
    texture.mask(
      gate.modulate(nativeUVField, amount)
    )
  )
  .out(o0)
```

### Ingress-Locus Modulation Feedback

The already-masked ingress moves as a unit before being layered into the displaced memory.

```js
src(o0)
  .modulate(pixelStepUVField, k)
  .layer(
    texture
      .mask(gate)
      .modulate(nativeUVField, amount)
  )
  .out(o0)
```

### Block Or Global Field Feedback

The feedback memory is displaced by a constant or low-resolution field.

```js
src(o0)
  .modulate(solid(1 / width, 0), 1)
  .layer(texture.mask(gate))
  .out(o0)
```

```js
src(o0)
  .modulate(
    noise()
      .pixelate(4, 4)
      .color(1 / width, 1 / height),
    1
  )
  .layer(texture.mask(gate))
  .out(o0)
```

### Axis-Packed Pixel-Step Feedback

Independent x and y fields are packed through red and green before pixel-step normalization.

```js
src(o0)
  .modulate(
    ns()
      .color(1, 0)
      .add(ns().color(0, 1))
      .color(1 / width, 1 / height),
    1
  )
  .layer(texture.mask(gate))
  .out(o0)
```

### Inline Texture Construction Feedback

Material can be constructed directly inside the layer instead of staged in a separate buffer when reuse or temporal staging is not needed.

```js
src(o0)
  .modulate(pixelStepUVField, k)
  .layer(
    solid()
      .add(textureA)
      .add(textureB)
      .mask(gate)
  )
  .out(o0)
```

### Staged Texture Construction Feedback

A separate buffer matters when the constructed material is reused by multiple chains, needs its own feedback/history, needs different timing or resolution logic, or must be inspected/rendered independently before entering the main feedback chain.

```js
solid()
  .add(textureA)
  .add(textureB)
  .out(o1)

src(o0)
  .modulate(pixelStepUVField, k)
  .layer(
    src(o1).mask(gate)
  )
  .out(o0)
```

### Blend-Mode Feedback Extension

Blend-mode operations such as `diff`, `sub`, `add`, `blend`, and `mult` are preferred inside the ingress texture before masking. This keeps texture mixing local to the material being admitted into feedback.

Preferred texture-side blend/mix:

```js
src(o0)
  .modulate(pixelStepUVField, k)
  .layer(
    texture
      .diff(carveTexture)
      .mult(colorCarrier)
      .mask(gate)
  )
  .out(o0)
```

Global feedback blend/diff is valid as an extension, but it is artifact-heavy because it operates on the feedback memory or the combined result. If used, it should be understood as a global feedback operation and often constrained with a hard mask.

Example after ingress:

```js
src(o0)
  .modulate(pixelStepUVField, k)
  .layer(texture.mask(gate))
  .diff(carveTexture)
  .out(o0)
```

Example masked global feedback artifact:

```js
src(o0)
  .modulate(pixelStepUVField, k)
  .layer(texture.mask(gate))
  .layer(
    src(o0)
      .diff(carveTexture)
      .mask(hardArtifactGate)
  )
  .out(o0)
```

Example before ingress:

```js
src(o0)
  .modulate(pixelStepUVField, k)
  .diff(carveTexture)
  .layer(texture.mask(gate))
  .out(o0)
```

## Signal Layer

The signal layer should stay small. Earlier extracted reports had many signal names such as `AccumulatedSignal`, `DisplacedSignal`, `ConditionedSignal`, and `CarvedSignal`. Those are better treated as states or operation history, not first-class signal types.

Current first-class units:

```text
Parameter
ParameterSignal
Metric
Texture
Memory
Gate
Ingress
UVField
```

## Parameter

A `Parameter` is an ordinary numeric setting for a Hydra operation. It tunes a module but does not describe image-space dimensions by itself.

Examples:

```js
osc(20, 0.1, 0)
noise(8, 0.2)
shape(4, 0.3, 0)
.pixelate(2, 2)
.modulate(field, 1)
```

Avoid generating `() => time`-style function parameters as a default idiom. Time may exist in the source corpus, but the grammar should not lean on time callbacks as a generic animation trick.

## ParameterSignal

A `ParameterSignal` is a texture-valued control used where Hydra expects a parameter. It is usually made global with `pixelate(1, 1)` and shaped through channel extraction such as `.r(scale, offset)`.

This is the grammar unit revealed by the v3 array/callback port. It was already present in the corpus through arrays, callbacks, `Math.sin/cos`, `btw(...)`, `bi()`, `bl()`, and especially through `texture.pixelate(1, 1)` used as a uniform signal.

General form:

```text
TextureSignal
  -> range shaping
  -> quantization / grain shaping
  -> pixelate(1, 1)
  -> r/g/b(scale, offset)
  -> parameter receiver
```

Compact v3 helper names:

```js
knob(base, amount, bins, freq, vel)
rng(min, max, bins, freq, vel)
hit(base, amount, threshold, freq, vel)
wob(min, max, sync)
wobc(base, amount, sync)
```

These are authoring handles, not new Hydra runtime primitives. They should always be explainable as raw Hydra chains.

Centered quantized control:

```js
knob(-0.01, 0.0025, 3, 2, 0.08)
```

Raw equivalent:

```js
ns(2, 0.08)
  .posterize(3, 1)
  .pixelate(1, 1)
  .r(0.0025, -0.01)
```

Range control:

```js
rng(2, 4, 2, 2, 0.01)
```

Raw equivalent:

```js
ns(2, 0.01)
  .posterize(2, 1)
  .pixelate(1, 1)
  .r(1, 3)
```

Sparse base or identity activation:

```js
hit(1, 0.00125, 0.35, 1, 0.01)
```

Raw equivalent:

```js
solid(1)
  .add(
    ns(1, 0.01)
      .pixelate(1, 1)
      .thresh(0.35, 0),
    0.00125
  )
```

Periodic range control:

```js
wob(0, 1, 0.05)
```

Raw equivalent:

```js
osc(TAU, 0.05, 1)
  .pixelate(1, 1)
  .r(1, 0)
```

Centered periodic control:

```js
wobc(0.25, 0.125, 0.05)
```

Raw equivalent:

```js
osc(TAU, 0.05, 1)
  .brightness(-0.5)
  .pixelate(1, 1)
  .r(0.25, 0.25)
```

Receiver examples:

```js
osc(TAU, 0.1, 1)
  .posterize(rng(4, 32, 8, 2, 0.05))
```

```js
shape(4, 1, 0)
  .scale(hit(1, 0.00125, 0.35, 1, 0.01), 1, 1, 0.75, 0.5)
```

```js
src(o0)
  .blend(src(o0).invert(), wob(0, 1, 0.05))
```

Use a `ParameterSignal` when a parameter should evolve as part of the texture graph. Use `btw(...)`, `rn()`, `bi()`, `bl()`, or `choice2/3/4(...)` when the patch needs per-execution initialization, not continuous signal motion.

## Metric

A `Metric` is a resolution or aspect value used for dimension-aware construction. It is not a generic control signal.

Examples:

```js
width
height
1 / width
1 / height
width / height
height / width
```

Primary uses:

```js
field.color(1 / width, 1 / height)
```

```js
shape(4, 1, 0)
  .scale(0.5, 1, 1, 0, 0)
  .repeat(width / 2, height / 2, 0.5)
```

The important interpretation is that `1 / width` and `1 / height` calibrate displacement to pixel-sized units in feedback.

## Texture

A `Texture` is any image-like Hydra signal before it has been assigned a stricter role.

Examples:

```js
osc()
noise()
ns()
shape()
solid()
gradient()
src(o1)
```

Textures may become visible material, gate sources, UV fields, or staging buffers depending on the port where they are used.

### Solid As Construction Base

`solid()` is often not expressive material by itself. In this grammar it frequently acts as a zero or blank base to build upon.

Example:

```js
solid()
  .add(ns())
  .add(osc())
```

This should be interpreted as constructed texture assembly, not as "a solid-color style move" by default.

## Memory

`Memory` is persistent buffer state. It is the feedback or staging buffer read through `src(oN)` and written through `.out(oN)`.

Examples:

```js
src(o0)
src(o1)
src(o2)
```

Closed feedback:

```js
src(o0)
  .layer(
    osc().mask(shape(4, 0.3, 0))
  )
  .out(o0)
```

Staging:

```js
osc(20, 0.1, 0)
  .out(o1)

src(o1)
  .modulate(noise(4), 0.2)
  .out(o0)
```

## Gate

A `Gate` is a hard admission field. For the core feedback language, soft masks should not be generated.

Hard gates matter because the texture needs to pass cleanly through the mask into feedback. Soft masks introduce grey transitional material that accumulates into unwanted territory.

Canonical gate examples:

```js
shape(4, 0.3, 0)
shape(5, 0.2, 0)
osc().thresh(0.95, 0)
noise().thresh(0.5, 0)
```

Important rule:

```js
shape(4, 0.3, 0)
```

is already a hard gate because the third `shape` parameter is `0`. It does not need:

```js
shape(4, 0.3, 0).thresh(0.5, 0)
```

That threshold is redundant in this context.

### Gate Forms

Shape gate:

```js
shape(4, 0.3, 0)
```

Oscillating trace gate:

```js
osc(40, 0.1, 0)
  .thresh(0.95, 0)
```

Noise gate:

```js
noise(8, 0.2)
  .thresh(0.5, 0)
```

Tiled shape gate:

```js
shape(4, 1, 0)
  .scale(0.5, 1, 1, 0, 0)
  .repeat(width / 2, height / 2, 0.5)
```

Deformed gate:

```js
shape(4, 0.35, 0)
  .modulate(noise(4), 0.15)
```

When a gate source is not intrinsically hard, make it hard with zero smoothness:

```js
noise(8, 0.2).thresh(0.5, 0)
osc(40, 0.1, 0).thresh(0.95, 0)
```

## Ingress

`Ingress` is the key compound signal: a texture admitted into feedback through a hard gate.

Canonical form:

```js
texture.mask(gate)
```

Examples:

```js
osc()
  .mask(shape(4, 0.3, 0))
```

```js
noise()
  .mask(osc().thresh(0.95, 0))
```

```js
solid(1, 0, 0)
  .mask(
    shape(4, 1, 0)
      .scale(0.5, 1, 1, 0, 0)
      .repeat(width / 2, height / 2, 0.5)
  )
```

The preferred feedback accumulator for ingress is `.layer(...)`:

```js
src(o0)
  .layer(
    osc().mask(shape(4, 0.3, 0))
  )
  .out(o0)
```

`.add(...)` and `.blend(...)` may exist in Hydra, but they are not equal to `.layer(texture.mask(gate))` in this core feedback grammar.

## UVField

A `UVField` is a texture interpreted as coordinate displacement. It should carry metadata because not all displacement fields mean the same thing.

Current metadata:

```text
units: native | pixelStep
spatialForm: constant | block | affine | textural | axisPacked
locus: texture | gate | ingress | memory | postAccumulation
```

## Native UV Field

Native displacement is used mostly for internal material or texture motion. In Hydra, `.modulate(texture, x)` uses the signal in normalized coordinate space; an amount of `1` is a full native-dimension displacement.

Examples:

```js
osc(30)
  .modulate(noise(4, 0.2), 0.25)
```

```js
shape(4, 0.3, 0)
  .modulate(osc(10, 0.1, 0), 0.2)
```

Native fields are useful for moving the texture, the gate, or the ingress gesture before it enters feedback.

## Pixel-Step UV Field

Pixel-step displacement is preferred on the feedback chain. It normalizes the field so feedback moves by approximately pixel-scale increments per pass.

Canonical form:

```js
field.color(1 / width, 1 / height)
```

Displacement power belongs in the `.modulate(..., k)` amount, not in the normalization numerator. Keep the field normalization dimensionally explicit:

```js
feedback.modulate(field.color(1 / width, 1 / height), k)
```

Here `k` is the feedback displacement power in pixel-step units. For example:

```js
feedback.modulate(field.color(1 / width, 1 / height), 1)
feedback.modulate(field.color(1 / width, 1 / height), 4)
feedback.modulate(field.color(1 / width, 1 / height), 8)
```

All three stay in the pixel-step regime. The field remains normalized the same way; only the amount changes.

Used as:

```js
src(o0)
  .layer(
    osc().mask(shape(4, 0.3, 0))
  )
  .modulate(
    noise(4, 0.2).color(1 / width, 1 / height),
    4
  )
  .out(o0)
```

The important distinction:

```js
material.modulate(texture, x)
```

is native-scale internal displacement, while:

```js
feedback.modulate(texture.color(1 / width, 1 / height), 1)
```

is pixel-step feedback displacement. If stronger motion is needed, change the second argument:

```js
feedback.modulate(texture.color(1 / width, 1 / height), 6)
```

## Constant And Block UV Fields

Global displacement means every pixel receives the same displacement vector.

Examples:

```js
solid(1 / width, 0)
solid(0, 1 / height)
```

As a global feedback translation:

```js
src(o0)
  .layer(
    osc().mask(shape(4, 0.3, 0))
  )
  .modulate(solid(1 / width, 0), 1)
  .out(o0)
```

A one-cell pixelated field also behaves as a global or near-global displacement sample:

```js
noise()
  .pixelate(1, 1)
```

Block displacement uses a low-resolution grid of displacement vectors:

```js
noise()
  .pixelate(2, 2)
```

```js
noise()
  .pixelate(4, 4)
  .color(1 / width, 1 / height)
```

Feedback example:

```js
src(o0)
  .layer(
    osc().mask(noise().thresh(0.5, 0))
  )
  .modulate(
    noise()
      .pixelate(4, 4)
      .color(1 / width, 1 / height),
    1
  )
  .out(o0)
```

## Affine-Like UV Fields

In feedback, affine behavior should often be expressed through `.modulate(...)` fields rather than direct transform operators. This keeps feedback motion inside a shared displacement grammar.

Scroll-like displacement:

```js
src(o0)
  .modulate(solid(1 / width, 0), 1)
  .out(o0)
```

Scale-like displacement:

```js
src(o0)
  .layer(
    osc().mask(shape(4, 0.3, 0))
  )
  .modulate(
    gradient()
      .brightness(-0.5)
      .pixelate(2, 2)
      .color(1 / width, 1 / height),
    1
  )
  .out(o0)
```

The mathematical interpretation is that affine transforms can be represented as coordinate displacement fields. For the system, this means `.modulate(...)` is not only "warping"; it is the preferred geometric operator for feedback motion.

## Axis-Packed UV Fields

Axis-packed fields build independent x and y displacement components, usually by encoding one texture into red and another into green. This is one reason `ns()` matters in the grammar.

The `ns()` helper should use random x/y offsets by default. Fixed x/y offsets make the generated fields feel too locked and unlike the intended practice.

Preferred helper shape:

```js
const rn = (max = 1) => Math.random() * max;
const ns = (freq = 3, vel = 0, x = rn(), y = rn()) =>
  noise(freq, vel)
    .modulate(solid(width * x, height * y, 0), 1)
    .scale(1, A, B);
```

Native axis-packed form:

```js
ns()
  .color(1, 0)
  .add(ns().color(0, 1))
```

Pixel-step normalized axis-packed form:

```js
ns()
  .color(1, 0)
  .add(ns().color(0, 1))
  .color(1 / width, 1 / height)
```

Feedback example:

```js
src(o0)
  .layer(
    osc().mask(shape(4, 0.3, 0))
  )
  .modulate(
    ns()
      .color(1, 0)
      .add(ns().color(0, 1))
      .color(1 / width, 1 / height),
    1
  )
  .out(o0)
```

This should be interpreted as deliberate two-axis vector construction, not as arbitrary additive texture layering.

## Modulation Locus

The same UV field has different meaning depending on what it displaces.

Texture locus:

```js
osc()
  .modulate(noise(), 0.2)
  .mask(shape(4, 0.3, 0))
```

The material moves inside a stable gate.

When used in the canonical feedback circuit, texture-local modulation happens inside the ingress path while memory displacement still happens before the layer:

```js
src(o0)
  .modulate(pixelStepUVField, k)
  .layer(
    osc()
      .modulate(nativeUVField, 0.2)
      .mask(shape(4, 0.3, 0))
  )
  .out(o0)
```

Gate locus:

```js
osc()
  .mask(
    shape(4, 0.3, 0)
      .modulate(noise(), 0.2)
  )
```

The gate gesture itself moves or deforms.

Modulating a hard gate changes the coordinates used to sample the gate. It does not make the edge soft by itself. If a gate source is already hard, such as `shape(..., ..., 0)`, the grammar does not require re-thresholding after modulation.

Ingress locus:

```js
osc()
  .mask(shape(4, 0.3, 0))
  .modulate(noise(), 0.2)
```

The already-gated material moves as a unit.

Memory locus, canonical:

```js
src(o0)
  .modulate(noise().color(1 / width, 1 / height), k)
  .layer(
    osc().mask(shape(4, 0.3, 0))
  )
  .out(o0)
```

The existing feedback memory moves before new ingress is layered. This is the current canonical feedback order.

Post-accumulation locus, valid variant:

```js
src(o0)
  .layer(
    osc().mask(shape(4, 0.3, 0))
  )
  .modulate(noise().color(1 / width, 1 / height), k)
  .out(o0)
```

The accumulated feedback result moves after new ingress is layered. This is valid, but it is not the current canonical circuit because it also moves the newly injected material. The canonical order keeps the injected mask/material clean on the current pass and moves the existing memory behind it.

## Current Canonical Circuit

```text
Texture
  -> optional texture-local modulation

Gate
  -> optional gate-local modulation

Texture.mask(Gate)
  -> Ingress

Memory.modulate(PixelStepUVField, k)
  -> displaced feedback memory

displaced feedback memory.layer(Ingress)
  -> accumulated feedback texture

out(same buffer)
  -> updated Memory
```

Hydra:

```js
src(o0)
  .modulate(
    ns()
      .color(1, 0)
      .add(ns().color(0, 1))
      .color(1 / width, 1 / height),
    k
  )
  .layer(
    osc()
      .mask(shape(4, 0.3, 0))
  )
  .out(o0)
```

## Construction Policy

Prefer positive construction recipes over anti-rules. The generator should build from typed potential: choose a circuit, choose modules that satisfy the circuit ports, emit the Hydra DSL, then validate that the result still expresses the intended circuit.

Default feedback construction:

```js
src(o0).modulate(pixelStepUVField, k).layer(texture.mask(hardGate)).out(o0)
```

Use `.layer(...)` as the primary feedback ingress operator.

Use hard gates as the core feedback admission form.

Use `shape(..., ..., 0)` directly as a hard gate.

Use `.thresh(value, 0)` when hardening non-shape texture gates such as `noise()` or `osc()`.

Use `field.color(1 / width, 1 / height)` for feedback displacement normalization.

Choose `k` for displacement strength. Keep normalization in the field and power in the second `.modulate(...)` argument.

Use `solid()` as a construction base when the patch is assembling fields or materials by addition.

Treat `ns().color(1, 0).add(ns().color(0, 1))` as axis-packed vector field construction.

Treat `texture.pixelate(1, 1).r(scale, offset)` as parameter-signal construction when it is passed into a parameter slot.

Prefer visible parameter-signal forms over hidden `()=>time` callbacks when porting older patches:

```js
wob(0, 1, 0.05)
```

or, raw:

```js
osc(TAU, 0.05, 1).pixelate(1, 1).r(1, 0)
```

Prefer `hit(...)`-style identity/base controls over exact array emulation when the authored array mostly holds a null or identity value:

```js
hit(1, 0.00125, 0.35, 1, 0.01)
```

When affine motion is desired on the feedback path, prefer a `.modulate(...)` equivalent where practical. The point is not to ban `.scale(...)`, `.scroll(...)`, or `.rotate(...)`; it is to express affine motion as a texture field when the patch benefits from field extension.

Blending modes such as `.diff(...)`, `.sub(...)`, `.add(...)`, `.blend(...)`, and related operations are valid modules. Their meaning depends on where they appear in the feedback chain. They should be selected intentionally as part of a circuit rather than treated as generic interchangeable accumulation.

Legacy or exception markers:

```js
src(o0).add(texture).out(o0)
src(o0).blend(texture).out(o0)
texture.mask(softMask)
shape(4, 0.3, 0).thresh(0.5, 0)
```

These may appear in the corpus or in Hydra generally. They are not phrased as forbidden operations; they are simply not the preferred default construction for the current core feedback method.

## Generation Experiment Status

The first two recorded generator batches are rejected experiments. They are useful as diagnostic output, but they should not be treated as accepted examples of the grammar.

Rejected batches:

```text
.tmp/hydra-style/feedback-grammar-recordings-30s
.tmp/hydra-style/feedback-grammar-recordings-v2-30s
```

Reason:

```text
v1: too timid, too clean, and several ns() fields were effectively over-fixed.
v2: corrected random-offset ns() and stronger motion, but incorrectly moved displacement power into field normalization such as color(6 / width, 4 / height).
```

Current correction:

```js
feedback.modulate(texture.color(1 / width, 1 / height), k)
```

The normalized field stays fixed. The amount `k` changes the displacement power.

## Open Questions

Should `.add(...)` and `.blend(...)` be fully excluded from feedback accumulation, or kept as marked exceptions?

Should soft masks be entirely invalid, or allowed only outside feedback ingress?

Should direct `.scale(...)`, `.scroll(...)`, and `.rotate(...)` be considered discouraged on feedback paths when an equivalent `.modulate(...)` field can express the motion?

Should `Gate` and `UVField` become typed wrappers around `Texture`, or stay as first-class signal units in the authoring grammar?

Should `solid()` always be tagged as `constructionBase` unless it is directly masked and layered as color ingress?
