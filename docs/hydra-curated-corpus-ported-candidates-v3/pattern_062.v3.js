/*
Hydra curated corpus port candidate: pattern_062
Title: source block 62
Status: semantic port, not visually accepted.
Bucket: staging / source construction

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback
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

// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/

ns(width/4,.1).kaleid(6).thresh(.8,0)
.mask(ns(width/32,.1).thresh(.25,0))
.add(o0,.75).blend(o0,.35)
.modulate(ns(1,.1).color(1,0).blend(ns(1,.1).color(0,1),.5).color(1/width,1/height).pixelate(4,4),4)
.diff(o0,.125)
.modulate(osc(TAU,.25).color(1/width,0).pixelate(4,height),2)
.out(o0)
