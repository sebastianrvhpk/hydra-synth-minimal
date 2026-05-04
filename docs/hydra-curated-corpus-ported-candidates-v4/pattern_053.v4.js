/*
Hydra curated corpus port candidate: pattern_053
Title: source block 53
Status: semantic port, not visually accepted.
Bucket: staging / source construction

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback
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
Final v3 pass + v4 buffer-normalized pass:
- shared helpers moved to shared-v3.js
- arrays are ported by intent: range, density, null/identity base, and motion character
- old exact-sequence helper emulation is intentionally removed
- callback parameters are replaced with compact signal helpers where possible
- status remains: review candidate, not visually accepted
*/

// Run shared-v4.js once before this patch.

src(o0)
.layer(ns(width/4,1).thresh(.75,0).mask(shape(4,1,0).scale(1,1,2/height,1,0)))
//.layer(ns(1,10).thresh(0,0).mask(shape(4,1,0).scale(1,1/256*2).repeat(8/A,8).diff(ns(width/4,0).thresh(.75,0))).mask(shape(4,1,0).scale(1,1,4/height,1,0)).mask(shape(.3,1).thresh(.5,0)))
//.modulate(ns(.3,.25,md1x=rn(),md1y=rn()).thresh(.5,0.025).diff(ns(.3,.25,md1x,md1y).thresh(.5,0.025).modulate(solid(1/width,0),10)).pixelate(width,1).mult(gradient().brightness(-.5).scale(1, A, B)),.5)
.modulate(ns(.3,.25,md2x=rn(),md2y=rn()).thresh(.5,0.0025).diff(ns(.3,.25,md2x,md2y).thresh(.5,0.0025).modulate(solid(1/width,0),50)).pixelate(width,1).color(1,0),.1)
.modulate(gradient().brightness(-.5).mask(shape(4,1,0)).repeat(1,1).scale(1/8,1,1,0,0).mask(ns(6,1).thresh(.625/2,0).pixelate(8,8)).scale(1, A, B).color(A,1).modulate(gradient().scale(1, (ns(6,0).pixelate(8/A,8).brightness(1).color(A,1)).r(.5, 1), (ns(6,0).pixelate(8/A,8).brightness(1).color(A,1)).g(.5, 1)).sub(gradient()), 1),-.125)
.modulate(solid(0,1/height),-2)
.out(o0)
