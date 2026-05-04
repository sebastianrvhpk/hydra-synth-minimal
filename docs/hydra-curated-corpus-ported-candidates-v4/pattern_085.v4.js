/*
Hydra curated corpus port candidate: pattern_085
Title: source block 85
Status: semantic port, not visually accepted.
Bucket: extension / staging

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension

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

shape(4,1,0)
.scale(2,1/width,1/height)
.modulate(gradient().scale(1, (ns(30,1).rotate(0,1).pixelate(2,2).thresh(.5,0).color(1,0)).r(width, 1), (ns(30,1).rotate(0,1).pixelate(2,2).thresh(.5,0).color(1,0)).g(width, 1)).sub(gradient()), 1)
.modulate(gradient().scale(1, (ns(30,1).rotate(0,1).pixelate(2,2).thresh(.5,0).color(0,1)).r(height, 1), (ns(30,1).rotate(0,1).pixelate(2,2).thresh(.5,0).color(0,1)).g(height, 1)).sub(gradient()), 1)
.modulate(gradient().brightness(-.5).mask(ns(30,1).rotate(0,1).pixelate(1,1).thresh(.5,0)).mask(ns(13,0).pixelate(4,1).scrollX(0,1).pixelate(1,1)).modulate(ns(4,1).color(0,1).pixelate(1,4),1),-1)
.repeat(2,2)
.out(o0)
