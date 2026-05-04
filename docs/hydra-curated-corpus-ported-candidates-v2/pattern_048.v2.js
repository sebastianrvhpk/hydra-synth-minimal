/*
Hydra curated corpus port candidate: pattern_048
Title: source block 48
Status: semantic port, not visually accepted.
Bucket: staging / source construction

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
- G?: review gate role; hard gates for ingress, soft/luma only for other roles or intended legacy behavior

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

shape(4,1,1).scale(1,1/width,1/height)
.modulate(noise(1,1).pixelate(width,1).color(1,0),.5).rotate(0,1)
.modulate(gradient().scale(1, (osc(1,1).rotate(0,Math.PI/4).pixelate(width,1).color(0,1)).r(.5, 1), (osc(1,1).rotate(0,Math.PI/4).pixelate(width,1).color(0,1)).g(.5, 1)).sub(gradient()), 1)
.modulate(noise(1,-1).pixelate(width,1).color(0,1),.5)
.add(o0,.9875).blend(o0,.5).contrast(1.001)
.modulate(solid(0,1).color(0,1/height),1)
.modulate(noise(0,.1).color(1,0).mask(noise(3,1.25).pixelate(8,8).thresh(.75,0).scrollX(0,.1)))
.out(o0)

src(o0)
.thresh(.05,.025)
.out(o1)

src(o0).brightness(.5).contrast(1.25)
.mult(o1,1)
.out(o2)
render(o2)
