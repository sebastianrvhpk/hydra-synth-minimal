/*
Hydra curated corpus port candidate: pattern_037
Title: source block 37
Status: semantic port, not visually accepted.
Bucket: memory-drift / non-ingress feedback

Port moves:
- G?: review gate role; hard gates for ingress, soft/luma only for other roles or intended legacy behavior
- L/X: review global blend/diff/sub pressure; move into material before mask unless intentionally global

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

src(o0)
.diff(solid(1,1,1).mask(shape(4,1,0).scale(2,1/width,1/height)))
.modulate(solid()
.add(ns(3,1).color(1,0).mask(osc(Math.PI*4,.25).pixelate(1,1).thresh(.5,.1)))
.add(ns(3,1).color(1,0).mask(osc(Math.PI*4,.25).scrollX(.5).pixelate(1,1).thresh(.5,.1)))
.add(ns(3,1).color(0,1).mask(osc(Math.PI*4,.25).scrollX(.25).pixelate(1,1).thresh(.5,.1)))
.add(ns(3,1).color(0,1).mask(osc(Math.PI*4,.25).scrollX(.75).pixelate(1,1).thresh(.5,.1)))
.pixelate(1,1)
,.025)
.out(o0)
