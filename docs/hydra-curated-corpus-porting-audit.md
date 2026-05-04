# Hydra Curated Corpus Porting Audit

This document revisits `curated_hydra_patterns_no_external_media.md` through the current feedback grammar.

It is not a visual ranking. It is a porting audit: which parts of the first 90 curated patches already speak the new language, which parts are older idioms, and how to translate them without flattening their authored behavior.

Source:

```text
C:/Users/sebas/Downloads/curated_hydra_patterns_no_external_media.md
```

Fresh extraction:

```powershell
node scripts/hydra-style-extract.mjs --input="C:\Users\sebas\Downloads\curated_hydra_patterns_no_external_media.md" --outDir=".tmp\hydra-style-fresh"
```

Working audit data:

```text
.tmp/hydra-corpus-audit/porting-audit.json
.tmp/hydra-corpus-audit/porting-ledger.md
```

First-pass ported candidate corpus:

```text
docs/hydra-curated-corpus-ported-candidates/index.md
docs/hydra-curated-corpus-ported-candidates/pattern_002.port.js
...
docs/hydra-curated-corpus-ported-candidates/pattern_094.port.js
```

Generation command:

```powershell
node scripts/hydra-corpus-port-candidates.mjs --input="C:\Users\sebas\Downloads\curated_hydra_patterns_no_external_media.md" --audit=".tmp\hydra-corpus-audit\porting-audit.json" --outDir="docs\hydra-curated-corpus-ported-candidates"
```

Second-pass ported candidate corpus:

```text
docs/hydra-curated-corpus-ported-candidates-v2/index.md
docs/hydra-curated-corpus-ported-candidates-v2/shared-v2.js
docs/hydra-curated-corpus-ported-candidates-v2/pattern_002.v2.js
...
docs/hydra-curated-corpus-ported-candidates-v2/pattern_094.v2.js
```

Second-pass command:

```powershell
node scripts/hydra-corpus-second-pass.mjs --inputDir="docs\hydra-curated-corpus-ported-candidates" --outDir="docs\hydra-curated-corpus-ported-candidates-v2"
```

The second pass targets redundancy and legacy control syntax:

```text
shared helpers moved to shared-v2.js
Hydra array sequences replaced with quantized texture-valued seqSignal(...)
callback parameters replaced with signal helpers where possible
local arrow helpers converted to function declarations
```

## Current Lens

The new grammar reads a patch as signal flow:

```text
Memory
  -> optional memory conditioner
  -> UV displacement / coordinate program
  -> hard-gated ingress
  -> optional post-ingress drift / conditioner
  -> BufferWrite
```

Canonical feedback phrase:

```js
src(o0)
  .modulate(pixelStepUVField, k)
  .layer(material.mask(hardGate))
  .out(o0)
```

Porting does not mean forcing every old patch into this one shape. It means making responsibilities explicit:

```text
material construction
gate construction
field construction
coordinate transform delta
feedback memory drift
conditioner / carve / blend pressure
buffer routing
```

## Snapshot

The corpus still strongly fits the evolved grammar, but many patches carry legacy authoring forms.

```text
patterns: 90
closed memory loops: 59
feedback accumulation patterns: 52
patterns with UV displacement evidence: 76
patterns with hard gate evidence: 72
patterns with pixel normalization evidence: 77
patterns with xy pixel normalization evidence: 72
patterns with axis-packed field evidence: 31
patterns with metric tiling evidence: 49
patterns with raster oscillator evidence: 15
patterns with specialized modulation operators: 49
patterns with callback/time controls: 30
patterns with soft/luma gate evidence: 32
patterns with global blend/diff/sub pressure: 31
patterns with renderpass conditioners: 0
patterns with transform-delta fields: 0
patterns with channel affine r/g/b(scale, offset): 0
```

Interpretation:

```text
the old corpus already contains:
  memory, ingress, hard gates, pixel metrics, vector fields, staging, carving

the old corpus often expresses them through:
  post-layer displacement, specialized modulate* operators, luma/soft gates,
  callback controls, global blend/diff/sub, multi-buffer construction

the newer grammar adds:
  transform-delta fields from gradient().coordOp(...).sub(gradient()),
  renderpass conditioners inside graph-valued arguments,
  channel affine extraction with r/g/b(scale, offset),
  stricter energy preservation for mutation
```

## Buckets

These buckets are for porting effort, not taste.

```text
already close to current core: 6
portable core feedback: 33
legacy feedback / conceptual port: 13
memory-drift / non-ingress feedback: 7
staging / source construction: 24
extension / staging: 7
```

`already close to current core` means the patch has a readable pre-accumulation feedback structure with layer/mask ingress and pixel-normalized field evidence, without the most disruptive legacy controls.

`portable core feedback` means the patch already has the useful primitives, but the routing may need order cleanup, specialized operator translation, axis splitting, gate review, or global blend containment.

`legacy feedback / conceptual port` means the patch probably needs a human reading before code translation. These are not wrong patches; they are older or adjacent idioms.

`memory-drift / non-ingress feedback` means the loop is more about memory deformation, carve, or comparison than clean material ingress. These should not be forced into ingress-first grammar unless that is the porting goal.

`staging / source construction` means the patch is mostly building buffers/materials used elsewhere. It extends the grammar through routing and construction rather than canonical feedback.

## Port Move Glossary

`P`: Re-evaluate feedback order. Prefer pre-accumulation memory drift when the new material should enter cleanly.

`N`: Convert unnormalized feedback displacement into pixel-step units.

`AX?`: Review same-field xy displacement. Split x/y into independent components when diagonal correlation is not intended.

`S`: Translate specialized `modulate*` operators into explicit field or transform-delta form where it clarifies the circuit.

`G?`: Review ingress gates. Hard gates are required for clean ingress, but soft/luma may be valid in non-ingress roles.

`L/X`: Review global blend/diff/sub/add pressure. Move it inside material before mask when it is texture mixing; keep it global only when it is intentionally an artifact or conditioner.

`C`: Replace callback/time controls with Hydra-native motion, initialized randomness, loop helpers, or texture-valued parameter fields where the receiver supports them.

`B`: Make buffer role explicit: source construction, staging memory, parallel feedback system, or composite feedback.

`T`: Preserve metric tiling and anchor math.

`R`: Preserve raster oscillator math.

The `?` means the move is not automatic. It needs a semantic read of the patch.

## Math-Compatible Rewrites

### Feedback Order

Legacy/post order:

```js
src(o0)
  .layer(material.mask(gate))
  .modulate(field, k)
  .out(o0)
```

Canonical clean-ingress port:

```js
src(o0)
  .modulate(field, k)
  .layer(material.mask(gate))
  .out(o0)
```

The second version displaces old memory before the new material enters. The first version displaces the newly injected material too. Both are valid, but they are different circuits.

### Pixel-Step Normalization

Old normalized-coordinate amount:

```js
src(o0)
  .modulate(noise().color(1, 0), 0.005)
```

Pixel-step port, x axis:

```js
src(o0)
  .modulate(noise().color(1 / width, 0), 0.005 * width)
```

Pixel-step port, y axis:

```js
src(o0)
  .modulate(noise().color(0, 1 / height), 0.005 * height)
```

For new authoring, keep the metric in the field and the force in `k`:

```js
src(o0)
  .modulate(field.color(1 / width, 1 / height), k)
```

### Axis-Separated Field

Same-field xy:

```js
src(o0)
  .modulate(ns().color(1 / width, 1 / height), k)
```

Axis-separated port:

```js
src(o0)
  .modulate(
    solid()
      .add(ns().color(1, 0), xGain)
      .add(ns().color(0, 1), yGain)
      .color(1 / width, 1 / height),
    k
  )
```

This is vector addition, not arbitrary texture layering.

### Specialized Scroll

`modulateScrollX(field, amount)` is shader-equivalent to adding the field's red channel into x coordinates:

```js
src(o0)
  .modulateScrollX(field, amount)
```

Explicit field form:

```js
src(o0)
  .modulate(field.r().color(1, 0), amount)
```

Pixel-step feedback form:

```js
src(o0)
  .modulate(field.r().color(1 / width, 0), k)
```

`modulateScrollY` similarly maps the field's red channel into y:

```js
src(o0)
  .modulate(field.r().color(0, 1), amount)
```

or:

```js
src(o0)
  .modulate(field.r().color(0, 1 / height), k)
```

If the source field is grayscale, `field.color(0, 1)` is visually equivalent enough for authoring, but the exact operator mapping uses the red channel.

### Transform Delta

`gradient()` is the identity coordinate program:

```text
gradient() = st
```

Any coordinate operation on it gives:

```text
gradient().coordOp(...) = T(st)
```

Subtracting identity gives a displacement field:

```text
T(st) - st
```

Then:

```text
modulate(T(st) - st, 1) = st + T(st) - st = T(st)
```

Hydra:

```js
src(o0)
  .modulate(
    gradient()
      .scale(control)
      .sub(gradient()),
    1
  )
```

This is an exact coordinate-transform field, not a pixel-step drift. If the goal is a feedback pressure shaped like scale but controlled in pixel units, attenuate or normalize intentionally:

```js
src(o0)
  .modulate(
    gradient()
      .scale(control)
      .sub(gradient())
      .color(1 / width, 1 / height),
    k
  )
```

That second form is not the same as full `scale(control)`. It is a pixel-step field shaped by the scale delta.

Rotation works by the same coordinate identity:

```js
src(o0)
  .modulate(
    gradient()
      .rotate(angleControl)
      .sub(gradient()),
    1
  )
```

No separate user-facing `sin`/`cos` signal is needed for the common case because `rotate()` already implements the rotation matrix.

### Metric Tiling

The shader for `scale(amount, xMult, yMult, offsetX, offsetY)` subtracts the offset, divides coordinates by the scale, then adds the offset back.

This is why corner anchors matter:

```js
shape(4, 1, 0)
  .scale(1 / 8, 1, 1, 0, 0)
  .repeat(width / 8, height / 8, 0.5)
```

With `offsetX = 0` and `offsetY = 0`, the scaled shape is anchored to the top-left coordinate corner before repeat. Leaving the default center anchor can create alignment artifacts for tiled ingress.

### Raster Oscillator

Current oscillator shader:

```text
sin((_st.x - offset / frequency + time * sync) * frequency) * 0.5 + 0.5
```

If:

```js
osc(Math.PI * width / n, 1 / n / width)
```

then adjacent pixels differ by approximately:

```text
frequency / width = Math.PI / n
```

For one-pixel peak cuts, a useful threshold is:

```js
(1 + Math.cos(Math.PI / (2 * n))) / 2
```

Example for `n = 8`:

```js
osc(Math.PI * width / 8, 1 / 8 / width)
  .thresh((1 + Math.cos(Math.PI / 16)) / 2, 0)
```

For alternating pixel scanlines:

```js
osc(Math.PI * width, 1 / width)
  .thresh(0.5, 0)
```

## Corpus Extensions

The initial 90 patches extend the grammar mainly through these modules:

```text
cross-buffer staging
source material construction
subtractive carving
specialized geometry modulation
chroma modulation
global artifact / conditioner pressure
metric tiling
raster oscillators
```

They do not yet provide evidence for:

```text
renderpass conditioners inside fields
gradient transform-delta fields
channel affine extraction with r/g/b(scale, offset)
```

Those newer modules come from later manual practice and backend work. They should be included in the evolving grammar, but not attributed to the initial corpus.

## Per-Pattern Ledger

| Pattern | Current reading | Main cues | Port moves |
| --- | --- | --- | --- |
| pattern_002 | legacy feedback / conceptual port | closed, uv, specialized, callback | P N AX? S G? C |
| pattern_003 | memory-drift / non-ingress feedback | closed, uv, global-blend | N AX? G? L/X |
| pattern_004 | portable core feedback | closed, layer-mask, uv, specialized, global-blend | P N AX? S G? L/X |
| pattern_006 | portable core feedback | closed, layer-mask, uv, tiling, specialized | P N AX? S G? T |
| pattern_007 | portable core feedback | closed, layer-mask, uv, px-norm, axis, specialized | P S |
| pattern_008 | portable core feedback | closed, layer-mask, uv, px-norm, axis, specialized | P S G? |
| pattern_009 | portable core feedback | closed, layer-mask, uv, px-norm, axis, tiling, specialized | P S G? T |
| pattern_010 | already close to current core | canonical-pre, layer-mask, uv, px-norm, axis, tiling | G? T |
| pattern_011 | already close to current core | canonical-pre, layer-mask, uv, px-norm, tiling, specialized | AX? S G? T |
| pattern_012 | legacy feedback / conceptual port | closed, uv, px-norm, axis, specialized, global-blend | P S L/X |
| pattern_013 | portable core feedback | closed, layer-mask, uv, px-norm, tiling, specialized, global-blend | P AX? S G? L/X T |
| pattern_014 | legacy feedback / conceptual port | closed, layer-mask, tiling, specialized, global-blend | P S G? L/X T |
| pattern_015 | portable core feedback | closed, layer-mask, uv, px-norm, tiling, specialized, global-blend | P AX? S G? L/X T |
| pattern_016 | staging / source construction | px-norm, specialized, callback | B S G? C |
| pattern_017 | staging / source construction | uv, specialized | B N AX? S |
| pattern_018 | legacy feedback / conceptual port | closed, px-norm, tiling, global-blend | P G? L/X T |
| pattern_019 | legacy feedback / conceptual port | closed, px-norm, tiling, global-blend | P G? L/X T |
| pattern_020 | extension / staging | tiling | B G? T |
| pattern_021 | portable core feedback | closed, layer-mask, uv, px-norm, axis, tiling, specialized, global-blend | P S L/X T R |
| pattern_022 | staging / source construction | uv, px-norm, tiling | B AX? T |
| pattern_023 | portable core feedback | canonical-pre, layer-mask, uv, px-norm, axis, tiling, specialized, callback | S C T |
| pattern_025 | portable core feedback | closed, layer-mask, uv, px-norm, callback | P AX? C |
| pattern_026 | portable core feedback | closed, layer-mask, uv, px-norm, axis, tiling, specialized, global-blend, callback | P S L/X C T |
| pattern_027 | portable core feedback | canonical-pre, layer-mask, uv, px-norm, specialized, callback | AX? S C |
| pattern_028 | staging / source construction | uv, px-norm, tiling | B AX? T |
| pattern_029 | legacy feedback / conceptual port | closed, layer-mask, px-norm, tiling | P T |
| pattern_030 | staging / source construction | layer-mask, uv, px-norm, specialized, callback | B AX? S G? C |
| pattern_031 | staging / source construction | layer-mask, uv, px-norm, axis, tiling | B T R |
| pattern_032 | portable core feedback | closed, layer-mask, uv, px-norm, axis, tiling, global-blend | P G? L/X T R |
| pattern_033 | portable core feedback | closed, layer-mask, uv, px-norm, axis, callback | P C |
| pattern_034 | staging / source construction | uv, px-norm, axis, callback | B C |
| pattern_035 | portable core feedback | canonical-pre, layer-mask, uv, px-norm, axis, tiling, global-blend | L/X T R |
| pattern_037 | memory-drift / non-ingress feedback | closed, uv, px-norm, axis, global-blend | G? L/X |
| pattern_038 | memory-drift / non-ingress feedback | closed, uv, px-norm, axis, specialized, global-blend, callback | S G? L/X C |
| pattern_039 | staging / source construction | uv, px-norm, callback | B AX? C |
| pattern_040 | extension / staging | uv, px-norm, tiling | B AX? T R |
| pattern_041 | portable core feedback | closed, layer-mask, uv, px-norm, tiling, specialized | P AX? S G? T R |
| pattern_042 | portable core feedback | closed, layer-mask, uv, px-norm, tiling, specialized, global-blend | P AX? S L/X T |
| pattern_043 | staging / source construction | uv, px-norm, tiling | B AX? T |
| pattern_044 | portable core feedback | canonical-pre, layer-mask, uv, px-norm, axis, tiling, global-blend | L/X T R |
| pattern_045 | staging / source construction | layer-mask, uv, px-norm, specialized, callback | B AX? S G? C |
| pattern_046 | staging / source construction | uv, px-norm, axis, specialized | B S |
| pattern_047 | portable core feedback | canonical-pre, layer-mask, uv, px-norm, axis, tiling, global-blend | L/X T R |
| pattern_048 | staging / source construction | uv, px-norm, specialized | B AX? S G? |
| pattern_049 | memory-drift / non-ingress feedback | closed, uv, px-norm, axis, specialized, global-blend | S L/X |
| pattern_050 | portable core feedback | closed, layer-mask, uv, px-norm, tiling, global-blend | P AX? L/X T |
| pattern_051 | already close to current core | canonical-pre, layer-mask, uv, px-norm, axis, tiling | G? T R |
| pattern_052 | already close to current core | canonical-pre, layer-mask, uv, px-norm, axis, tiling | G? T R |
| pattern_053 | staging / source construction | layer-mask, px-norm, specialized | B S G? |
| pattern_054 | extension / staging | uv | B N AX? |
| pattern_055 | legacy feedback / conceptual port | closed, uv, px-norm, tiling, specialized, global-blend, callback | P AX? S L/X C T |
| pattern_056 | memory-drift / non-ingress feedback | closed, uv, px-norm, global-blend | AX? L/X |
| pattern_057 | extension / staging |  | B |
| pattern_058 | legacy feedback / conceptual port | closed, layer-mask, px-norm, specialized | P S |
| pattern_059 | staging / source construction | layer-mask, uv, px-norm, axis, tiling | B T R |
| pattern_060 | staging / source construction | layer-mask, uv, px-norm, axis, tiling | B T R |
| pattern_061 | portable core feedback | closed, layer-mask, uv, px-norm, axis, tiling, global-blend | P L/X T R |
| pattern_062 | staging / source construction | uv, px-norm | B AX? |
| pattern_063 | memory-drift / non-ingress feedback | closed, uv, px-norm, axis, specialized, global-blend | S L/X |
| pattern_064 | portable core feedback | closed, layer-mask, uv, px-norm, axis, specialized, global-blend, callback | P S L/X C |
| pattern_065 | portable core feedback | closed, layer-mask, uv, px-norm, axis, specialized, global-blend, callback | P S L/X C |
| pattern_066 | staging / source construction | uv, px-norm, callback | B AX? C |
| pattern_067 | extension / staging | uv | B N AX? R |
| pattern_068 | staging / source construction | uv, px-norm, axis, specialized | B S |
| pattern_069 | staging / source construction | layer-mask, uv, px-norm, tiling, specialized, callback | B AX? S C T |
| pattern_070 | legacy feedback / conceptual port | closed, layer-mask, px-norm, specialized | P S |
| pattern_071 | portable core feedback | closed, layer-mask, uv, px-norm, axis, callback | P C |
| pattern_072 | staging / source construction | layer-mask, uv, tiling, callback | B N AX? C T |
| pattern_073 | already close to current core | canonical-pre, layer-mask, uv, px-norm, tiling | AX? T R |
| pattern_074 | portable core feedback | closed, layer-mask, uv, px-norm, tiling, specialized, global-blend | P AX? S L/X T |
| pattern_075 | already close to current core | canonical-pre, layer-mask, uv, px-norm, axis, tiling, specialized | S T |
| pattern_076 | portable core feedback | canonical-pre, layer-mask, uv, px-norm, tiling, specialized, callback | AX? S C T |
| pattern_077 | portable core feedback | canonical-pre, layer-mask, uv, px-norm, tiling, specialized, callback | AX? S C T |
| pattern_078 | portable core feedback | canonical-pre, layer-mask, uv, px-norm, tiling, specialized, callback | AX? S C T |
| pattern_079 | portable core feedback | canonical-pre, layer-mask, uv, px-norm, specialized, callback | AX? S C |
| pattern_080 | portable core feedback | canonical-pre, layer-mask, uv, px-norm, tiling, specialized, callback | AX? S C T |
| pattern_081 | portable core feedback | canonical-pre, layer-mask, uv, px-norm, tiling, specialized, callback | AX? S C T |
| pattern_082 | staging / source construction | uv, px-norm, callback | B AX? C |
| pattern_083 | portable core feedback | closed, layer-mask, uv, px-norm, tiling, specialized | P AX? S T |
| pattern_084 | staging / source construction | tiling, specialized, callback | B S C T |
| pattern_085 | extension / staging | uv, px-norm, specialized | B AX? S |
| pattern_086 | extension / staging | uv, specialized | B N AX? S |
| pattern_087 | portable core feedback | canonical-pre, layer-mask, uv, px-norm, tiling, specialized, callback | AX? S C T |
| pattern_088 | staging / source construction | px-norm, tiling | B G? T |
| pattern_089 | legacy feedback / conceptual port | closed, px-norm, tiling, global-blend, callback | P G? L/X C T |
| pattern_090 | legacy feedback / conceptual port | closed, uv, px-norm, axis, tiling, global-blend | P G? L/X T |
| pattern_091 | legacy feedback / conceptual port | closed, uv, px-norm, specialized, global-blend | P AX? S G? L/X |
| pattern_092 | legacy feedback / conceptual port | closed, uv, px-norm, tiling, global-blend | P AX? G? L/X T |
| pattern_093 | memory-drift / non-ingress feedback | closed, uv, px-norm, global-blend | AX? G? L/X |
| pattern_094 | staging / source construction | px-norm, specialized, callback | B S G? C |

## Suggested Next Pass

The next useful manual step is not to port all 90 at once. Use three passes:

1. Select 5 "already close" patches and rewrite only the legacy syntax.
2. Select 5 "portable core feedback" patches and port them into the new mutator contract, preserving energy.
3. Select 3 "legacy / conceptual" patches and write a human explanation first, then decide whether they should become clean-ingress feedback, memory-drift systems, or artifact systems.

For every port, keep both:

```text
original circuit reading
ported circuit reading
```

and do not call the port successful until it is visually reviewed.
