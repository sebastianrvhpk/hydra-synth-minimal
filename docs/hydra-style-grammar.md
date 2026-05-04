# Hydra Style Grammar Experiment

This experiment turns curated Hydra patches into an inspectable style grammar. It uses JavaScript parsing heuristics only as a first layer; the real target is a Hydra-specific representation of primitives, construction methods, buffer topologies, chains, motifs, families, and mutation rules.

## Source

Current source used during development:

```text
C:/Users/sebas/Downloads/curated_hydra_patterns_no_external_media.md
```

The source contains 90 curated Hydra patterns plus shared helpers, with external media patterns excluded.

## Commands

Extract the grammar:

```powershell
node scripts/hydra-style-extract.mjs --input="C:\Users\sebas\Downloads\curated_hydra_patterns_no_external_media.md" --outDir=".tmp\hydra-style"
```

Generate constrained samples:

```powershell
node scripts/hydra-style-generate.mjs --archetype=shape-mask-lattice --seed=curated-001 --outDir=".tmp\hydra-style\generated"
node scripts/hydra-style-generate.mjs --archetype=feedback-kaleid --seed=curated-002 --outDir=".tmp\hydra-style\generated"
node scripts/hydra-style-generate.mjs --archetype=rgb-scanline --seed=curated-003 --outDir=".tmp\hydra-style\generated"
```

Syntax-check generated patches:

```powershell
node --check ".tmp\hydra-style\generated\shape-mask-lattice_curated-001.js"
node --check ".tmp\hydra-style\generated\feedback-kaleid_curated-002.js"
node --check ".tmp\hydra-style\generated\rgb-scanline_curated-003.js"
```

Optional render capture when WebGPU/canvas rendering is available:

```powershell
node scripts/capture-hydra-patterns.mjs --patternsDir=".tmp\hydra-style\generated" --outDir=".tmp\hydra-style\generated-captures" --duration=2 --fps=24 --width=512 --height=512
```

## Generated Artifacts

The extractor writes:

```text
.tmp/hydra-style/summary.json
.tmp/hydra-style/patterns.json
.tmp/hydra-style/chains.json
.tmp/hydra-style/primitives.json
.tmp/hydra-style/primitive-vocabulary.md
.tmp/hydra-style/method-map.json
.tmp/hydra-style/method-map.md
.tmp/hydra-style/texture-operation-map.json
.tmp/hydra-style/texture-operation-map.md
.tmp/hydra-style/contextual-operation-map.json
.tmp/hydra-style/contextual-operation-map.md
.tmp/hydra-style/flow-grammar.json
.tmp/hydra-style/flow-grammar.md
.tmp/hydra-style/signal-flow-graph.json
.tmp/hydra-style/signal-flow-graph.md
.tmp/hydra-style/hydra-dsl-module-spec.json
.tmp/hydra-style/hydra-dsl-module-spec.md
.tmp/hydra-style/motifs.json
.tmp/hydra-style/families.json
.tmp/hydra-style/families.md
.tmp/hydra-style/series.json
.tmp/hydra-style/series.md
.tmp/hydra-style/vocabulary.md
.tmp/hydra-style/style-grammar.md
.tmp/hydra-style/aggregate.json
```

The generator writes sample patches under:

```text
.tmp/hydra-style/generated/
```

## First Extraction Snapshot

The current run found:

```text
patterns: 90
chains: 153
families: 27
variation series: 13
```

The primary reports are now:

```text
.tmp/hydra-style/primitive-vocabulary.md
.tmp/hydra-style/method-map.md
.tmp/hydra-style/texture-operation-map.md
.tmp/hydra-style/contextual-operation-map.md
.tmp/hydra-style/flow-grammar.md
.tmp/hydra-style/signal-flow-graph.md
.tmp/hydra-style/hydra-dsl-module-spec.md
```

Families and names are intentionally downstream. Inspect the primitive vocabulary first, then the method map, texture/operation space map, contextual operation map, flow grammar, typed signal-flow graph, and Hydra DSL module spec: statement generators, embedded generators, generator roles, operation transitions, topology, construction signatures, outside-vs-inside operations, modulation texture programs, operation meaning by semantic space, flow recipes, module responsibilities, signal types, ports, Hydra DSL forms, symbolic tokens, and helper usage.

Top roots:

```text
src: 84
shape: 30
solid: 30
osc: 6
ns: 2
nstpx: 1
```

Top operations:

```text
color: 403
pixelate: 371
scale: 315
add: 313
modulate: 307
mask: 282
thresh: 229
brightness: 214
out: 153
rotate: 141
repeat: 115
diff: 106
layer: 99
```

Top method topologies from the current curated run:

```text
closed-feedback:o0: 46
source-write:o0: 21
read-transform-no-write: 17
cross-buffer:o0->o1: 14
closed-feedback:o1: 10
closed-feedback:o2: 9
```

Representative construction methods:

```text
closed-feedback:o2 | feedback-memory -> displace > accumulate > write: 7
closed-feedback:o0 | feedback-memory -> accumulate > displace > write: 6
closed-feedback:o0 | feedback-memory -> displace > accumulate > displace > accumulate > write: 5
closed-feedback:o1 | feedback-memory -> displace > accumulate > write: 4
```

Top modulation field cues:

```text
color-encoded-field: 143
uv-displacement-host: 134
width-height-normalized: 98
rg-width-height-vector: 80
geometry-parameter-host: 48
```

Top operations inside modulation textures:

```text
color: 262
pixelate: 201
brightness: 139
add: 138
scale: 106
thresh: 88
mask: 87
```

Context-sensitive operation examples:

```text
uv-displacement-field:color: 229
uv-displacement-field:pixelate: 148
uv-displacement-field:brightness: 126
feedback-accumulation-input-material:mask: 85
feedback-accumulation-input-material:color: 63
feedback-accumulation-input-material:pixelate: 60
feedback-accumulation-host:layer: 55
```

Top flow readings:

```text
closed-feedback-accumulation: 57
uv-displaced-feedback: 54
masked-source-feedback-accumulation: 50
cross-buffer-staging: 28
source-accumulation-construction: 19
```

Representative flow signature:

```text
closed-feedback-loop -> feedback-memory -> accumulate -> masked-input -> uv-displace -> write:o0
```

Typed modular graph readings:

```text
VectorFieldBuilder -> Displacer
MaskBuilder -> AccumulatorMixer
BufferRead -> AccumulatorMixer -> BufferWrite
TransformFieldBuilder -> TransformModulator
ControlSource -> Displacer / AccumulatorMixer / VectorFieldBuilder
```

Current refinement:

```text
ParameterSignalBuilder -> operation parameter slot
TextureSignal -> pixelate(1, 1) -> ParameterSignal
```

This layer explains older arrays, `()=>time` callbacks, `Math.sin/cos`, `btw`, `bi/bl`, and uniform texture tricks as parameter motion rather than as generic JavaScript animation. In the v3 port corpus this is expressed with compact authoring handles:

```text
knob: centered quantized control
rng: unipolar range control
hit: sparse base / identity activation
wob: periodic range control
wobc: centered periodic control
```

Representative typed graph signature:

```text
BufferRead -> AccumulatorMixer(material:MaskBuilder) -> Displacer(uv-field:VectorFieldBuilder) -> BufferWrite
```

Hydra DSL module spec examples:

```text
VectorFieldBuilder: noise(...).color(1/width, 1/height)
AccumulatorMixer: .layer(material), .add(material, amount), .blend(material, amount)
MaskBuilder: shape(...).mask(...), noise(...).thresh(...)
Displacer: .modulate(field, amount)
```

Top motifs:

```text
pixel_grid_sampling: 86
temporal_motion: 80
subpixel_displacement: 76
feedback_memory: 73
mask_stack: 65
threshold_gate: 62
rgb_channel_logic: 60
stochastic_authoring: 57
noise_vector_field: 49
scanline_axis_logic: 47
```

## Interpretation

The style is not adequately described by a JS AST. The stronger object is a Hydra Style IR:

```text
raw JS -> chain extraction -> primitive vocabulary -> method map -> texture/operation space map -> contextual operation map -> flow grammar -> typed signal-flow graph -> Hydra DSL module spec -> buffer graph -> motif tags -> family/series grammar
```

The dominant authoring habits in this corpus are:

- feedback memory through `src(o0)` and staged buffers
- pixel-grid and scanline logic
- width/height-normalized displacement
- thresholded masks and erosion-like gates
- noisy vector fields as structure, not background texture
- RGB/channel recombination
- stochastic helper-driven parameter selection

## Current Limits

- Clustering is heuristic and intentionally inspectable, not statistically final.
- Family names are labels over motif evidence and should be edited when they feel wrong.
- The generator emits constrained archetype samples, not a learned probabilistic model.
- MP4 capture depends on a browser with WebGPU and muxable H.264 AVC WebCodecs support. The current harness probes installed Chrome/Edge on Windows before falling back to bundled Playwright Chromium.

## Local Codex Skill

A reusable skill was created at:

```text
C:/Users/sebas/.codex/skills/hydra-style-grammar
```

It contains the same extractor/generator scripts plus references for the IR schema, motif taxonomy, and generation rules.
