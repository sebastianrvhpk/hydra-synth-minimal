/*
Hydra curated corpus port candidate: pattern_068
Title: source block 68
Status: semantic port, not visually accepted.
Bucket: staging / source construction

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback
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

shape(4,0,1).rotate(0,1).kaleid()
  .add(o0,.1)
.modulate(
gradient().brightness(-.5)
.modulate(noise(3,1)
.modulate(gradient().scale(1, (noise(3,1).modulate(solid(.05,.05),1)).r(.5, 1), (noise(3,1).modulate(solid(.05,.05),1)).g(.5, 1)).sub(gradient()), 1)
.modulate(noise(3,1).modulate(solid(-.05,-.15),1),.05)
.modulate(gradient().scale(1, (noise(3/2,1).modulate(solid(.15,.35),1)).r(.25, 1), (noise(3/2,1).modulate(solid(.15,.35),1)).g(.25, 1)).sub(gradient()), 1)
.modulate(noise(3/2,1).modulate(solid(-.25,-.15),1),.025),.5)
.pixelate(64,64)
,.5)
.blend(o0,.75)
.modulate(noise(500,.1).color(1,0).add(noise(500,-.1).color(0,1)).color(1/width,1/height),12.5)
.contrast(1.01)
.brightness(.01)
.out(o0)
