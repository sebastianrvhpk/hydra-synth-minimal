/*
Hydra curated corpus port candidate: pattern_071
Title: source block 71
Status: semantic port, not visually accepted.
Bucket: portable core feedback

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
- C: callback/time controls retained as legacy controls; replace manually when porting for the no-callback grammar

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
.layer(osc(TAU,1,.5).kaleid(width).pixelate(1,1)
.mask(shape(4,1,0).scale(2,1/width,1/height)//.repeat(2,2)
.modulate(ns(6).brightness(wob(-1, 1, 0.05)).rotate(0,Math.PI/2).color(1,0)
.add(ns(-6).brightness(wob(-1, 1, 0.05)).rotate(0,-Math.PI/2).color(0,1))
.scroll(.125,.125).pixelate(1,1)
,.5)))
.modulate(ns(6).brightness(wob(-1, 1, 0.05)).rotate(0,Math.PI/2).color(1,0)
.add(ns(-6).brightness(wob(-1, 1, 0.05)).rotate(0,-Math.PI/2).color(0,1))
.scroll(-.125,-.125).pixelate(1,1)
.color(1/width,1/height),1)
.modulate(ns(6).brightness(wob(-1, 1, 0.05)).rotate(0,Math.PI/2).color(1,0)
.add(ns(-6).brightness(wob(-1, 1, 0.05)).rotate(0,-Math.PI/2).color(0,1))
.scroll(-.125,-.125).pixelate(4,4)
.color(1/width,1/height),2)
.out(o0)
