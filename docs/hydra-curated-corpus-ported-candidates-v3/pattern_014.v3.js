/*
Hydra curated corpus port candidate: pattern_014
Title: source block 14
Status: semantic port, not visually accepted.
Bucket: legacy feedback / conceptual port

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
- G?: review gate role; hard gates for ingress, soft/luma only for other roles or intended legacy behavior
- L/X: review global blend/diff/sub pressure; move into material before mask unless intentionally global
- T: preserve metric tiling and anchor math

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

speed = 1;

solid()
.diff(o0)
.mask(shape(4, 1, 0))
.layer(solid().diff(osc(Math.PI * .6 / 3, .666 / 7, 1).modulate(solid(rn() * width, 0), 1).pixelate(1, 1), 1).add(osc(Math.PI * .2 / 3, .75 / 7, 1).modulate(solid(rn() * width, 0), 1).kaleid(60000), .5).diff(osc(Math.PI * 6 / 3, .666 / 7, 1).modulate(solid(rn() * width, 0), 1).pixelate(1, 1), -.25).add(osc(TAU / 3, .75 / 7, 1).modulate(solid(rn() * width, 0), 1).kaleid(60000), -.25).mask(shape(4, 1, 0).scale(.25, 1, 1, rn(), rn()).repeat(width / 4, height / 4)))
.modulate(gradient().rotate((ns(.3, .025).scale(1, A, B)).r(Math.PI / 360, 0)).sub(gradient()), 1)
.layer(src(o0).colorama(.0025).mask(ns(.03, .025).scale(1, A, B).thresh(.5, 0)).mask(shape(4, 1, 0).scale(.25, 1, 1, rn(), rn()).repeat(width / 4, height / 4)))
.out(o0);
