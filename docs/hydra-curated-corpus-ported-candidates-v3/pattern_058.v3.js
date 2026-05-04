/*
Hydra curated corpus port candidate: pattern_058
Title: source block 58
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
Final v3 pass:
- shared helpers moved to shared-v3.js
- arrays are ported by intent: range, density, null/identity base, and motion character
- old exact-sequence helper emulation is intentionally removed
- callback parameters are replaced with compact signal helpers where possible
- status remains: review candidate, not visually accepted
*/

// Run shared-v3.js once before this patch.

n=4
src(o0)
.scroll(-1/height,1/width)
.modulate(gradient().scale(1, (noise(3,.1).blend(o0,.75).posterize(4,1).color(1/width,1/height)).r(5, 1), (noise(3,.1).blend(o0,.75).posterize(4,1).color(1/width,1/height)).g(5, 1)).sub(gradient()), 1)
.modulateHue(o0,1)
.layer(osc(TAU,.1,1).saturate(.875).contrast(1.25).color(1,.6,.875)
.mask(shape(4,1,1/width)
.scale(1/n,1,1/n)
.repeat(n,n)
.modulate(gradient().scale(1, (osc(TAU,-.5).rotate(0,.25).brightness(-.25).posterize(16,1).color(0,1)).r(1, 1), (osc(TAU,-.5).rotate(0,.25).brightness(-.25).posterize(16,1).color(0,1)).g(1, 1)).sub(gradient()), 1)
))
.out(o0)
