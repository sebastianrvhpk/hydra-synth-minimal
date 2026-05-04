/*
Hydra curated corpus port candidate: pattern_070
Title: source block 70
Status: semantic port, not visually accepted.
Bucket: legacy feedback / conceptual port

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension

This file preserves authored behavior where automatic conversion would be risky.
Math-safe automated rewrites currently include:
- .out() -> .out(o0)
- modulateScrollX/Y(field, amount, speed?) -> explicit .modulate(...) pixel-step equivalent
- modulateRotate(field, multiple, offset) -> gradient().rotate(...).sub(gradient()) transform delta
- modulateScale(field, multiple, offset) -> gradient().scale(...).sub(gradient()) transform delta
*/

/*
Second pass:
- shared helpers moved to shared-v2.js
- Hydra array sequences converted to quantized texture-valued seqSignal(...)
- callback parameters converted to signal helpers where possible
- status remains: review candidate, not visually accepted
*/

// Run shared-v2.js once before this patch.

src(o0)
.brightness(-25/width).modulate(gradient().scale(1, (osc(Math.PI*.2,1)).r(1, 1), (osc(Math.PI*.2,1)).g(1, 1)).sub(gradient()), 1)
.layer(osc(TAU,.5,1).mask(shape(4,1,0).scale(1,1,1/height)
.modulate(osc(TAU,.5).brightness(-.5).color(0,1),1)
))
.layer(osc(TAU,.5,1).modulate(solid(1,0),.25).mask(shape(4,1,0).scale(1,1,1/height)
.modulate(osc(TAU,.5).modulate(solid(1,0),.25).brightness(-.5).color(0,1),1)
))
.layer(osc(TAU,.5,1).modulate(solid(1,0),.5).mask(shape(4,1,0).scale(1,1,1/height)
.modulate(osc(TAU,.5).modulate(solid(1,0),.5).brightness(-.5).color(0,1),1)
))
.layer(osc(TAU,.5,1).modulate(solid(1,0),.75).mask(shape(4,1,0).scale(1,1,1/height)
.modulate(osc(TAU,.5).modulate(solid(1,0),.75).brightness(-.5).color(0,1),1)
))
.out(o0)
