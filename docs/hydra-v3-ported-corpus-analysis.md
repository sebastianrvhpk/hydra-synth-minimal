# Hydra V3 Ported Corpus Analysis

This analyzes the 90 v3 port candidates through the current modular feedback grammar. These are syntax-checked review candidates, not visually accepted patches.

## High-Level Result

- Patterns analyzed: 90
- Patterns with texture-valued parameter signals: 27
- Total parameter-signal helper uses: 76
- Closed feedback buffers detected: 73
- Staging / multi-buffer patterns: 28
- Patterns with transform-delta fields: 38
- Patterns with global blend/diff/sub pressure: 59
- Patterns with direct feedback transform legacy markers: 67

## Current Reading

The v3 pass migrated old arrays and callback motion into a visible `ParameterSignal` layer. That did not create a new style from nowhere; it exposed a practice already present in the corpus through arrays, `()=>time`, `Math.sin/cos`, `btw`, `bi/bl`, and `.pixelate(1,1)` uniform texture tricks.

The main modular opportunity is now clearer:

```text
Material / Gate / UVField / Conditioner
  receive ParameterSignal inputs
  rather than hiding parameter motion as JS callbacks or Hydra arrays
```

## Modular Refactor Directions

1. Extract `ParameterSignal` plans before writing patch code: range, center, activation density, grain, receiver.
2. Name buffer roles in multi-buffer patches; avoid anonymous `o2/o3` staging unless the buffer role is obvious.
3. Factor large `solid().add(...).add(...)` vector fields into x/y component builders before packing into RG.
4. Treat global `.diff/.blend/.sub/.add` on feedback memory as artifact branches; either move them inside ingress material or hard-mask the artifact branch.
5. Translate direct feedback `.scale/.rotate/.scroll` into transform-delta fields when the motion is meant to become field-composable.
6. Review soft thresholds by role. They can shape material or conditioners, but hard ingress gates remain the default for clean feedback admission.

## Legacy Thinking Exposed By The Port

### Arrays And Callbacks As Hidden Parameter Motion

The old corpus used arrays and `()=>time` callbacks to execute motion. V3 makes those into named `ParameterSignal` forms. This is a better fit for the grammar because it asks what kind of signal is driving the parameter: range, centered amount, identity hit, periodic range, or centered periodic wobble.

Legacy form:

```js
.scale([1, 1, 1.00125], 1, 1, .75, .5)
```

Modular reading:

```js
.scale(hit(1, 0.00125, 0.35, 1, 0.01), 1, 1, .75, .5)
```

Raw Hydra reading:

```js
.scale(
  solid(1).add(ns(1, 0.01).pixelate(1, 1).thresh(0.35, 0), 0.00125),
  1, 1, .75, .5
)
```

### Anonymous Buffer Thinking

Many ports still read as `o1/o2/o3` choreography. That is historically accurate, but not modular enough for generation or mutation. A better rewrite names each buffer by role before code exists:

```text
o0: feedback memory
o1: composite preview / render buffer
o2: gate or material stage
o3: chroma/material carrier
```

The same patch can then be reasoned as a circuit rather than a list of buffers.

### Global Blend/Diff/Sub Pressure

Global blend modes in feedback are valid, but they are high-energy recurrence operators. The modular rewrite is not to ban them; it is to name their responsibility.

Prefer this reading:

```text
artifact branch = src(o0).diff(...).mask(hardArtifactGate)
feedback = displaced memory + clean ingress + contained artifact branch
```

over treating `.diff`, `.blend`, `.sub`, and `.add` as interchangeable feedback decoration.

### Direct Transform Thinking

Direct `.scale`, `.rotate`, `.scroll`, `.scrollX`, and `.scrollY` are not invalid. The older corpus often uses them as immediate scalar transforms. The newer grammar asks whether that transform wants to become a composable field:

```js
gradient()
  .scale(control)
  .sub(gradient())
```

This matters because a transform-delta field can be masked, pixelated, blended, axis-split, normalized, and fed into feedback as a UV field.

### Soft Threshold Ambiguity

Soft thresholds appear throughout the corpus. The modular question is role-based:

```text
hard gate: ingress admission
soft threshold: material shaping / conditioner / reaction term
legacy soft gate: needs review before generation
```

This preserves the corpus while keeping hard ingress gates as the default for clean feedback admission.

## Rewrite Templates

### Parameter-Signal Receiver

```text
ParameterSignal(source, range, grain)
  -> receiver parameter
  -> module behavior
```

Hydra:

```js
shape(4, 1, 0)
  .repeat(width / 8, height / 8, rng(0, 1, 8, 2, 0.05), 0)
```

### Axis-Packed Field Builder

```js
xField = ns(2, .05).posterize(6, 1).pixelate(8, 8).color(1, 0)
yField = ns(2, .07).posterize(8, 1).pixelate(8, 8).color(0, 1)

uvField = solid()
  .add(xField, 1)
  .add(yField, 1)
  .color(1 / width, 1 / height)
```

### Contained Artifact Branch

```js
artifact = src(o0)
  .diff(src(o0).blur(2))
  .mask(hardArtifactGate)

src(o0)
  .modulate(pixelStepUVField, k)
  .layer(material.mask(ingressGate))
  .diff(artifact, amount)
  .out(o0)
```

### Named Staging Buffers

```text
materialStage -> o2
fieldStage -> o3
feedbackMemory -> o0
renderComposite -> o1
```

This is a documentation layer today. Later it can become a livecoding mutator contract.

## Helper Use

- `knob`: 1
- `rng`: 33
- `hit`: 7
- `wob`: 25
- `wobc`: 10
- `ns`: 296
- `nsloop`: 0
- `choice2`: 1
- `choice3`: 0
- `choice4`: 0
- `btw`: 147
- `rn`: 401
- `bi`: 12
- `bl`: 13
- `pixelX`: 11
- `pixelY`: 11

## Tag Counts

- direct-transform-legacy: 67
- global-blend-pressure: 59
- metric-raster: 56
- transform-delta: 38
- soft-threshold: 31
- staging: 28
- parameter-signal: 27
- axis-packed: 26
- portable-core: 25
- canonical-core: 22
- noiseLoop: 6
- ingress-focused: 6

## Pattern Table

| pattern | tags | controls | buffers | modular rewrite direction |
|---|---|---:|---|---|
| pattern_002 | staging, parameter-signal, transform-delta, global-blend-pressure, direct-transform-legacy | 2 | read o0,o2 / write o0,o3,o2,o1 | name parameter-signal responsibilities before wiring receivers; move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite |
| pattern_003 | staging, parameter-signal, global-blend-pressure, direct-transform-legacy, noiseLoop | 1 | read o1,o2 / write o1,o2,o3 | name parameter-signal responsibilities before wiring receivers; move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite; review feedback displacement units and normalize if it is a memory drift |
| pattern_004 | ingress-focused, transform-delta, global-blend-pressure, direct-transform-legacy, soft-threshold | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); review soft threshold role: ingress gate, texture shaping, or conditioner; review feedback displacement units and normalize if it is a memory drift |
| pattern_006 | ingress-focused, staging, global-blend-pressure, direct-transform-legacy, soft-threshold, metric-raster | 0 | read o0 / write o0,o1 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite; review soft threshold role: ingress gate, texture shaping, or conditioner; review feedback displacement units and normalize if it is a memory drift |
| pattern_007 | portable-core, staging, axis-packed, transform-delta, direct-transform-legacy, noiseLoop | 0 | read o0 / write o0,o1 | consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite; factor x/y fields into explicit vector-field builder |
| pattern_008 | portable-core, staging, axis-packed, transform-delta, global-blend-pressure, direct-transform-legacy, soft-threshold, noiseLoop | 0 | read o0,o2,o3 / write o2,o0,o3,o1 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite; review soft threshold role: ingress gate, texture shaping, or conditioner; factor x/y fields into explicit vector-field builder |
| pattern_009 | portable-core, staging, axis-packed, transform-delta, global-blend-pressure, direct-transform-legacy, soft-threshold, metric-raster, noiseLoop | 0 | read o0,o3,o2 / write o3,o2,o0,o1 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite; review soft threshold role: ingress gate, texture shaping, or conditioner; factor x/y fields into explicit vector-field builder |
| pattern_010 | canonical-core, staging, axis-packed, global-blend-pressure, direct-transform-legacy, soft-threshold, metric-raster, noiseLoop | 0 | read o0,o1 / write o0,o1,o2 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite; review soft threshold role: ingress gate, texture shaping, or conditioner; factor x/y fields into explicit vector-field builder |
| pattern_011 | canonical-core, staging, global-blend-pressure, direct-transform-legacy, soft-threshold, metric-raster, noiseLoop | 0 | read o1,o0,o2,o3 / write o0,o1,o2,o3,o4 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite; review soft threshold role: ingress gate, texture shaping, or conditioner |
| pattern_012 | axis-packed, transform-delta, global-blend-pressure, metric-raster | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; factor x/y fields into explicit vector-field builder |
| pattern_013 | canonical-core, transform-delta, global-blend-pressure, direct-transform-legacy, soft-threshold, metric-raster | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); review soft threshold role: ingress gate, texture shaping, or conditioner |
| pattern_014 | ingress-focused, transform-delta, direct-transform-legacy, soft-threshold, metric-raster | 0 | read o0 / write o0 | consider transform-delta field via gradient().op(...).sub(gradient()); review soft threshold role: ingress gate, texture shaping, or conditioner; review feedback displacement units and normalize if it is a memory drift |
| pattern_015 | canonical-core, global-blend-pressure, direct-transform-legacy, soft-threshold, metric-raster | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); review soft threshold role: ingress gate, texture shaping, or conditioner |
| pattern_016 | portable-core, parameter-signal, global-blend-pressure, direct-transform-legacy, soft-threshold | 3 | read o0 / write o0 | name parameter-signal responsibilities before wiring receivers; move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); review soft threshold role: ingress gate, texture shaping, or conditioner |
| pattern_017 | transform-delta, global-blend-pressure, direct-transform-legacy | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); review feedback displacement units and normalize if it is a memory drift |
| pattern_018 | global-blend-pressure, soft-threshold, metric-raster | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; review soft threshold role: ingress gate, texture shaping, or conditioner; review feedback displacement units and normalize if it is a memory drift |
| pattern_019 | soft-threshold, metric-raster | 0 | read o0 / write o0 | review soft threshold role: ingress gate, texture shaping, or conditioner; review feedback displacement units and normalize if it is a memory drift |
| pattern_020 | soft-threshold, metric-raster | 0 | read - / write o0 | review soft threshold role: ingress gate, texture shaping, or conditioner |
| pattern_021 | portable-core, axis-packed, transform-delta, global-blend-pressure, direct-transform-legacy, metric-raster | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); factor x/y fields into explicit vector-field builder |
| pattern_022 | metric-raster | 0 | read - / write o0 | already close; mostly needs module names and visual review |
| pattern_023 | canonical-core, parameter-signal, axis-packed, global-blend-pressure, direct-transform-legacy, metric-raster | 7 | read o0 / write o0 | name parameter-signal responsibilities before wiring receivers; move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); factor x/y fields into explicit vector-field builder |
| pattern_025 | portable-core, parameter-signal, global-blend-pressure, direct-transform-legacy, metric-raster | 3 | read o0 / write o0 | name parameter-signal responsibilities before wiring receivers; move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()) |
| pattern_026 | canonical-core, parameter-signal, axis-packed, global-blend-pressure, direct-transform-legacy, metric-raster | 7 | read o0 / write o0 | name parameter-signal responsibilities before wiring receivers; move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); factor x/y fields into explicit vector-field builder |
| pattern_027 | portable-core, staging, parameter-signal, transform-delta, global-blend-pressure, direct-transform-legacy | 6 | read o1,o0 / write o0,o1,o2 | name parameter-signal responsibilities before wiring receivers; move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite |
| pattern_028 | metric-raster | 0 | read - / write o0 | already close; mostly needs module names and visual review |
| pattern_029 | portable-core, direct-transform-legacy, metric-raster | 0 | read o0 / write o0 | consider transform-delta field via gradient().op(...).sub(gradient()) |
| pattern_030 | portable-core, staging, transform-delta, global-blend-pressure, direct-transform-legacy, soft-threshold | 0 | read o1 / write o0,o1 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite; review soft threshold role: ingress gate, texture shaping, or conditioner |
| pattern_031 | portable-core, global-blend-pressure, direct-transform-legacy, metric-raster | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()) |
| pattern_032 | portable-core, axis-packed, global-blend-pressure, direct-transform-legacy, soft-threshold, metric-raster | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); review soft threshold role: ingress gate, texture shaping, or conditioner; factor x/y fields into explicit vector-field builder |
| pattern_033 | portable-core, parameter-signal, axis-packed, direct-transform-legacy | 2 | read o0 / write o0 | name parameter-signal responsibilities before wiring receivers; consider transform-delta field via gradient().op(...).sub(gradient()); factor x/y fields into explicit vector-field builder |
| pattern_034 | parameter-signal, axis-packed | 2 | read - / write o0 | name parameter-signal responsibilities before wiring receivers; factor x/y fields into explicit vector-field builder |
| pattern_035 | portable-core, axis-packed, global-blend-pressure, direct-transform-legacy, metric-raster | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); factor x/y fields into explicit vector-field builder |
| pattern_037 | axis-packed, global-blend-pressure, direct-transform-legacy, soft-threshold | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); review soft threshold role: ingress gate, texture shaping, or conditioner; factor x/y fields into explicit vector-field builder; review feedback displacement units and normalize if it is a memory drift |
| pattern_038 | axis-packed, global-blend-pressure, direct-transform-legacy, soft-threshold | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); review soft threshold role: ingress gate, texture shaping, or conditioner; factor x/y fields into explicit vector-field builder |
| pattern_039 | parameter-signal | 2 | read - / write o0 | name parameter-signal responsibilities before wiring receivers |
| pattern_040 | metric-raster | 0 | read - / write o0 | already close; mostly needs module names and visual review |
| pattern_041 | portable-core, direct-transform-legacy, soft-threshold, metric-raster | 0 | read o0 / write o0 | consider transform-delta field via gradient().op(...).sub(gradient()); review soft threshold role: ingress gate, texture shaping, or conditioner |
| pattern_042 | canonical-core, staging, transform-delta, global-blend-pressure, direct-transform-legacy, metric-raster | 0 | read o0,o1 / write o0,o1,o2 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite |
| pattern_043 | global-blend-pressure | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch |
| pattern_044 | portable-core, axis-packed, global-blend-pressure, direct-transform-legacy, metric-raster | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); factor x/y fields into explicit vector-field builder |
| pattern_045 | portable-core, transform-delta, soft-threshold | 0 | read - / write o0 | review soft threshold role: ingress gate, texture shaping, or conditioner |
| pattern_046 | axis-packed, transform-delta, global-blend-pressure, direct-transform-legacy, metric-raster | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); factor x/y fields into explicit vector-field builder |
| pattern_047 | portable-core, axis-packed, global-blend-pressure, direct-transform-legacy, metric-raster | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); factor x/y fields into explicit vector-field builder |
| pattern_048 | staging, transform-delta, soft-threshold | 0 | read o0 / write o0,o1,o2 | name each buffer role: material stage, gate stage, field stage, feedback memory, or composite; review soft threshold role: ingress gate, texture shaping, or conditioner |
| pattern_049 | staging, axis-packed, transform-delta, global-blend-pressure, direct-transform-legacy | 0 | read o1,o0 / write o0,o1 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite; factor x/y fields into explicit vector-field builder; review feedback displacement units and normalize if it is a memory drift |
| pattern_050 | canonical-core, staging, global-blend-pressure, direct-transform-legacy, metric-raster | 0 | read o1,o2,o0,o3 / write o1,o2,o3,o0 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite |
| pattern_051 | canonical-core, axis-packed, global-blend-pressure, direct-transform-legacy, soft-threshold, metric-raster | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); review soft threshold role: ingress gate, texture shaping, or conditioner; factor x/y fields into explicit vector-field builder |
| pattern_052 | canonical-core, axis-packed, direct-transform-legacy, soft-threshold, metric-raster | 0 | read o0 / write o0 | consider transform-delta field via gradient().op(...).sub(gradient()); review soft threshold role: ingress gate, texture shaping, or conditioner; factor x/y fields into explicit vector-field builder |
| pattern_053 | ingress-focused, transform-delta, global-blend-pressure, direct-transform-legacy, soft-threshold, metric-raster | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); review soft threshold role: ingress gate, texture shaping, or conditioner; review feedback displacement units and normalize if it is a memory drift |
| pattern_054 | unclassified | 0 | read - / write o0 | already close; mostly needs module names and visual review |
| pattern_055 | parameter-signal, transform-delta, global-blend-pressure, direct-transform-legacy, metric-raster | 3 | read o0 / write o0 | name parameter-signal responsibilities before wiring receivers; move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()) |
| pattern_056 | global-blend-pressure, direct-transform-legacy, metric-raster | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()) |
| pattern_057 | unclassified | 0 | read - / write o0 | already close; mostly needs module names and visual review |
| pattern_058 | canonical-core, transform-delta, global-blend-pressure, direct-transform-legacy | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()) |
| pattern_059 | portable-core, direct-transform-legacy, metric-raster | 0 | read o0 / write o0 | consider transform-delta field via gradient().op(...).sub(gradient()) |
| pattern_060 | portable-core, direct-transform-legacy, metric-raster | 0 | read o0 / write o0 | consider transform-delta field via gradient().op(...).sub(gradient()) |
| pattern_061 | portable-core, axis-packed, global-blend-pressure, direct-transform-legacy, metric-raster | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); factor x/y fields into explicit vector-field builder |
| pattern_062 | metric-raster | 0 | read - / write o0 | already close; mostly needs module names and visual review |
| pattern_063 | transform-delta, global-blend-pressure, direct-transform-legacy | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()) |
| pattern_064 | portable-core, staging, parameter-signal, axis-packed, transform-delta, global-blend-pressure, direct-transform-legacy | 4 | read o0,o1 / write o0,o1 | name parameter-signal responsibilities before wiring receivers; move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite; factor x/y fields into explicit vector-field builder |
| pattern_065 | portable-core, staging, parameter-signal, axis-packed, transform-delta, global-blend-pressure, direct-transform-legacy | 2 | read o0,o1 / write o0,o1 | name parameter-signal responsibilities before wiring receivers; move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite; factor x/y fields into explicit vector-field builder |
| pattern_066 | parameter-signal | 1 | read - / write o0 | name parameter-signal responsibilities before wiring receivers |
| pattern_067 | metric-raster | 0 | read - / write o0 | already close; mostly needs module names and visual review |
| pattern_068 | axis-packed, transform-delta | 0 | read - / write o0 | factor x/y fields into explicit vector-field builder |
| pattern_069 | canonical-core, parameter-signal, transform-delta, global-blend-pressure, direct-transform-legacy, metric-raster | 1 | read o0 / write o0 | name parameter-signal responsibilities before wiring receivers; move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()) |
| pattern_070 | ingress-focused, transform-delta, direct-transform-legacy | 0 | read o0 / write o0 | consider transform-delta field via gradient().op(...).sub(gradient()); review feedback displacement units and normalize if it is a memory drift |
| pattern_071 | portable-core, parameter-signal, axis-packed, global-blend-pressure, direct-transform-legacy | 6 | read o0 / write o0 | name parameter-signal responsibilities before wiring receivers; move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); factor x/y fields into explicit vector-field builder |
| pattern_072 | ingress-focused, staging, parameter-signal, direct-transform-legacy, metric-raster | 1 | read o0 / write o0,o1 | name parameter-signal responsibilities before wiring receivers; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite; review feedback displacement units and normalize if it is a memory drift |
| pattern_073 | portable-core, direct-transform-legacy, metric-raster | 0 | read o0 / write o0 | consider transform-delta field via gradient().op(...).sub(gradient()) |
| pattern_074 | canonical-core, transform-delta, global-blend-pressure, direct-transform-legacy, metric-raster | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()) |
| pattern_075 | canonical-core, staging, direct-transform-legacy, metric-raster | 0 | read o0 / write o0,o1 | consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite |
| pattern_076 | canonical-core, staging, parameter-signal, transform-delta, global-blend-pressure, direct-transform-legacy, metric-raster | 2 | read o0,o2,o1 / write o0,o1,o2 | name parameter-signal responsibilities before wiring receivers; move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite |
| pattern_077 | canonical-core, staging, parameter-signal, transform-delta, global-blend-pressure, direct-transform-legacy, metric-raster | 3 | read o0,o2,o1 / write o0,o1,o2 | name parameter-signal responsibilities before wiring receivers; move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite |
| pattern_078 | canonical-core, staging, parameter-signal, transform-delta, global-blend-pressure, direct-transform-legacy, metric-raster | 3 | read o0,o2,o1 / write o0,o1,o2 | name parameter-signal responsibilities before wiring receivers; move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite |
| pattern_079 | canonical-core, staging, parameter-signal, transform-delta, global-blend-pressure, direct-transform-legacy | 2 | read o0,o2,o1 / write o0,o1,o2 | name parameter-signal responsibilities before wiring receivers; move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite |
| pattern_080 | canonical-core, staging, parameter-signal, transform-delta, global-blend-pressure, direct-transform-legacy, metric-raster | 2 | read o0,o2,o1 / write o0,o1,o2 | name parameter-signal responsibilities before wiring receivers; move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite |
| pattern_081 | canonical-core, staging, parameter-signal, transform-delta, global-blend-pressure, direct-transform-legacy, metric-raster | 2 | read o0,o2,o1 / write o0,o1,o2 | name parameter-signal responsibilities before wiring receivers; move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite |
| pattern_082 | parameter-signal | 6 | read - / write o0 | name parameter-signal responsibilities before wiring receivers |
| pattern_083 | canonical-core, staging, transform-delta, global-blend-pressure, direct-transform-legacy, metric-raster | 0 | read o0,o2,o1 / write o0,o1,o2 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite |
| pattern_084 | staging, transform-delta, global-blend-pressure, direct-transform-legacy, soft-threshold, metric-raster | 0 | read o0 / write o0,o1 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite; review soft threshold role: ingress gate, texture shaping, or conditioner; review feedback displacement units and normalize if it is a memory drift |
| pattern_085 | transform-delta | 0 | read - / write o0 | already close; mostly needs module names and visual review |
| pattern_086 | unclassified | 0 | read - / write o0 | already close; mostly needs module names and visual review |
| pattern_087 | canonical-core, staging, parameter-signal, transform-delta, global-blend-pressure, direct-transform-legacy, metric-raster | 1 | read o2,o1,o0 / write o0,o1,o2 | name parameter-signal responsibilities before wiring receivers; move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite |
| pattern_088 | soft-threshold, metric-raster | 0 | read - / write o0 | review soft threshold role: ingress gate, texture shaping, or conditioner |
| pattern_089 | global-blend-pressure, direct-transform-legacy, soft-threshold, metric-raster | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); review soft threshold role: ingress gate, texture shaping, or conditioner; review feedback displacement units and normalize if it is a memory drift |
| pattern_090 | staging, parameter-signal, axis-packed, global-blend-pressure, direct-transform-legacy, soft-threshold, metric-raster | 1 | read o0,o1 / write o0,o1 | name parameter-signal responsibilities before wiring receivers; move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); name each buffer role: material stage, gate stage, field stage, feedback memory, or composite; review soft threshold role: ingress gate, texture shaping, or conditioner; factor x/y fields into explicit vector-field builder; review feedback displacement units and normalize if it is a memory drift |
| pattern_091 | transform-delta, global-blend-pressure, direct-transform-legacy, soft-threshold, metric-raster | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); review soft threshold role: ingress gate, texture shaping, or conditioner |
| pattern_092 | global-blend-pressure, soft-threshold, metric-raster | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; review soft threshold role: ingress gate, texture shaping, or conditioner |
| pattern_093 | global-blend-pressure, direct-transform-legacy, soft-threshold | 0 | read o0 / write o0 | move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); review soft threshold role: ingress gate, texture shaping, or conditioner |
| pattern_094 | portable-core, parameter-signal, global-blend-pressure, direct-transform-legacy, soft-threshold | 1 | read o0 / write o0 | name parameter-signal responsibilities before wiring receivers; move blend/diff/sub into material or mask the global artifact branch; consider transform-delta field via gradient().op(...).sub(gradient()); review soft threshold role: ingress gate, texture shaping, or conditioner |

## Reading Notes

- `parameter-signal` means the patch now uses `rng`, `knob`, `hit`, `wob`, or `wobc` in executable code.
- `transform-delta` means affine-like operations are represented as `gradient().op(...).sub(gradient())` fields.
- `global-blend-pressure` is not an error. It marks artifact-heavy feedback mixing that should be named and contained when used.
- `direct-transform-legacy` is not forbidden. It marks places where older scalar transform thinking may be refactored into field-composable motion.
- `staging` means the patch likely needs buffer-role names before any further generation or mutation.

