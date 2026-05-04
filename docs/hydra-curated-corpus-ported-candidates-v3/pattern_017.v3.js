/*
Hydra curated corpus port candidate: pattern_017
Title: source block 17
Status: semantic port, not visually accepted.
Bucket: staging / source construction

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback
- N: normalize feedback displacement into pixel-step units where possible
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
Final v3 pass:
- shared helpers moved to shared-v3.js
- arrays are ported by intent: range, density, null/identity base, and motion character
- old exact-sequence helper emulation is intentionally removed
- callback parameters are replaced with compact signal helpers where possible
- status remains: review candidate, not visually accepted
*/

// Run shared-v3.js once before this patch.

osc(7.5,.1,1).kaleid(4).rotate(Math.PI/4)
.rotate(0,.5).modulate(
gradient()
  .r()
  .repeatX(2)
  .kaleid(4)
  .rotate(Math.PI/4)
  .brightness(-.5),1)
.blend(src(o0).modulate(gradient().scale(1, (noise(3,3)).r(.001, 1), (noise(3,3)).g(.001, 1)).sub(gradient()), 1)
.modulate(gradient().scale(1, (src(o0).brightness(-.5)).r(.0025, 1), (src(o0).brightness(-.5)).g(.0025, 1)).sub(gradient()), 1)
,.9875).scale(1.0025)
//.hue(.001)
.saturate(1.0025)
  .out(o0)
