/*
Hydra curated corpus port candidate: pattern_091
Title: source block 91
Status: semantic port, not visually accepted.
Bucket: legacy feedback / conceptual port

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
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

shape(width,.125*.1,0*4/width).hue(5/width).color(1-.01,1-.05,1)
.modulate(solid(0,0,0,0)
.add(ns(3,1).pixelate(1,1).color(0,1),height/2)
.add(ns(3,1).pixelate(1,1).color(1,0),width/2)
.color(1/width,1/height),1)
.diff(src(o0).rotate(0*Math.PI/width).shift(5/width,-2/height,0).hue(3/height).color(1-.01,1-.015,1))
.add(ns(.3,1).pixelate(width,1).thresh(.75,.0125),.25)
.modulate(ns(.3,1).pixelate(width,1).thresh(.75,.0125),.25)
.modulate(gradient().scale(1, (ns(.3,1).pixelate(width,1).thresh(.75,.0125)).r(.01, 1), (ns(.3,1).pixelate(width,1).thresh(.75,.0125)).g(.01, 1)).sub(gradient()), 1)
.out(o0)
