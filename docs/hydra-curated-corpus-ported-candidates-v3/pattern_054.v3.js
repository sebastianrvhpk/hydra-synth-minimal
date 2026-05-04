/*
Hydra curated corpus port candidate: pattern_054
Title: source block 54
Status: semantic port, not visually accepted.
Bucket: extension / staging

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback
- N: normalize feedback displacement into pixel-step units where possible
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended

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

shape(4,1/32,0).repeat(1,1).scale(1/8).mult(osc(Math.PI*4,0,1).rotate(Math.PI/4))
.modulate(gradient().mask(shape(4,1,0)).repeat(1,1).scale(1/8,1,1,0,0).mask(noise(3,1).pixelate(8,8).thresh(.5,0)),-.125)
.out(o0)
