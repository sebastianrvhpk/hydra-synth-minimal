/*
Hydra curated corpus port candidate: pattern_006
Title: source block 6
Status: semantic port, not visually accepted.
Bucket: portable core feedback

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
- N: normalize feedback displacement into pixel-step units where possible
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
- G?: review gate role; hard gates for ingress, soft/luma only for other roles or intended legacy behavior
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

solid()
.out(o0);

src(o0)
.layer(shape(4, .5, 0).scroll(.25, .25, 0, .25).repeat(width / 3, height / 3).mask(noise(2, -.1).thresh(.5, 0).pixelate(9, 9)))
.modulate(solid().add(noise(3, .1).scale(2, 1, 1, 0, 0).color(1, 0, 0).pixelate(3, 3).mask(noise(3, .1).scale(2, 1, 1, 0, 0).thresh(.5, .1))).add(noise(3, .1).scale(2, 1, 1, 1, 1).color(0, 1, 0).pixelate(3, 3).mask(noise(3, .1).scale(2, 1, 1, 1, 1).thresh(.5, .1))).sub(noise(3, .1).scale(2, 1, 1, 1, 0).color(1, 0, 0).pixelate(6, 6).mask(noise(3, .1).scale(2, 1, 1, 1, 0).thresh(.5, .1))).sub(noise(3, .1).scale(2, 1, 1, 0, 1).color(0, 1, 0).pixelate(6, 6).mask(noise(3, .1).scale(2, 1, 1, 0, 1))).pixelate(9, 9), .02 * 2)
.modulate(gradient().scale(1, (osc(35, .15).brightness(-.5).rotate(.25).pixelate(6, 6).mask(noise(1, .5).thresh(.375, 0).pixelate(3, 3)).color(0, 1, 0)).r(2, 1), (osc(35, .15).brightness(-.5).rotate(.25).pixelate(6, 6).mask(noise(1, .5).thresh(.375, 0).pixelate(3, 3)).color(0, 1, 0)).g(2, 1)).sub(gradient()), 1)
.out(o0);

solid()
.layer(o0)
.out(o1);

render(o1);
