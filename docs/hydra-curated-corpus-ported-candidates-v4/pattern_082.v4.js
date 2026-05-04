/*
Hydra curated corpus port candidate: pattern_082
Title: source block 82
Status: semantic port, not visually accepted.
Bucket: staging / source construction

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- C: callback/time controls retained as legacy controls; replace manually when porting for the no-callback grammar

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

shape(4,1,0).scale(2,1/width,1/height).repeat(2,2)
.modulate(noise(3,-.5).brightness(.5).posterize(rng(4, 132, 8, 2, 0.05)).brightness(-.5).color(1,0,0).add(noise(3,.5).brightness(.5).posterize(rng(7, 135, 8, 2, 0.05)).brightness(-.5).color(0,1,0))
.pixelate(2,2),.25)
.diff(o0,.9)
.modulate(noise(3,.5).brightness(.5).posterize(rng(4, 132, 8, 2, 0.05)).brightness(-.5).color(1,0,0).add(noise(3,-.5).brightness(.5).posterize(rng(7, 135, 8, 2, 0.05)).brightness(-.5).color(0,1,0))
.pixelate(4,4).color(1/width,1/height),2.5)
.modulate(noise(3,.5).brightness(.5).posterize(rng(4, 132, 8, 2, 0.05)).brightness(-.5).color(1,0,0).add(noise(3,-.5).brightness(.5).posterize(rng(7, 135, 8, 2, 0.05)).brightness(-.5).color(0,1,0))
.pixelate(8,8).color(1/width,1/height),5)
.out(o0)
