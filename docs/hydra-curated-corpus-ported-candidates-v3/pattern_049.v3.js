/*
Hydra curated corpus port candidate: pattern_049
Title: source block 49
Status: semantic port, not visually accepted.
Bucket: memory-drift / non-ingress feedback

Port moves:
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
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

ns(3).modulate(gradient().scale(1, (ns(3).color(1,0)).r(1.25, 1), (ns(3).color(1,0)).g(1.25, 1)).sub(gradient()), 1).modulate(ns(1,.1).color(0,1)).color(1,0,.5)
.add(ns(3).modulate(gradient().scale(1, (ns(3).color(1,0)).r(1.25, 1), (ns(3).color(1,0)).g(1.25, 1)).sub(gradient()), 1).modulate(ns(1,.1).color(0,1)).color(0,1,.5)
).pixelate(20,13).out(o0)
0

src(o1)
.diff(shape(4,1,0).mask(shape(4,1,0).diff(shape(4,1,0).scale(1,1-1/width,1-1/height))
.scale(.5)
.modulate(gradient().scale(1, (shape(1,-1,2).scrollY(0,1).pixelate(1,1).brightness(-.5)).r(2, 1), (shape(1,-1,2).scrollY(0,1).pixelate(1,1).brightness(-.5)).g(2, 1)).sub(gradient()), 1)))
.modulateHue(src(o0).scale(4,1,1,0,0),1)
.modulateHue(src(o0).scale(4,1,1,1,0),1)
.modulateHue(src(o0).scale(4,1,1,1,1),1)
.modulateHue(src(o0).scale(4,1,1,0,1),1)
.out(o1)
render(o1)
