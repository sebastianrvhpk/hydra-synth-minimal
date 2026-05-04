/*
Hydra curated corpus port candidate: pattern_002
Title: source block 2
Status: semantic port, not visually accepted.
Bucket: legacy feedback / conceptual port

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
- N: normalize feedback displacement into pixel-step units where possible
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
- G?: review gate role; hard gates for ingress, soft/luma only for other roles or intended legacy behavior
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

src(o0)
.layer(src(o2).mult(o3, rng(0.25, 1, 8, 2, 0.05)))
.modulate((osc(btw(2.5, 20), btw(-.1, .1), 2).modulate(noise(btw(0.5, 10), btw(.005, .125)).rotate(btw(0, Math.PI / 2)).luma(btw(0, .875)).pixelate(btw(3, 750), btw(3, 150)), 1)).r().color(1 / width, 0), (btw(-0.00375, 0.00375)) * width)
.modulate((osc(btw(2.5, 20), -btw(-.1, .1), 2).modulate(noise(btw(0.5, 10), -btw(.005, .125)).rotate(btw(0, TAU) / 2).luma(btw(0, .875)).pixelate(btw(3, 750), btw(3, 150)), 1)).r().color(0, 1 / height), (btw(-0.00375, 0.00375)) * height)
.modulate((osc(btw(2.5, 20), btw(-.1, .1), 2).modulate(noise(btw(0.5, 10), btw(.005, .125)).invert().rotate(btw(0, Math.PI * 3) / 2).luma(btw(0, .875)).pixelate(btw(3, 750), btw(3, 150)), 1)).r().color(1 / width, 0), (btw(-0.005625, 0.005625)) * width)
.modulate((osc(btw(2.5, 20), -btw(-.1, .1), 2).modulate(noise(btw(0.5, 10), -btw(.005, .125)).invert().rotate(btw(0, Math.PI * 4) / 2).luma(btw(0, .875)).pixelate(btw(3, 750), btw(3, 150)), 1)).r().color(0, 1 / height), (btw(-0.005625, 0.005625)) * height)
.modulateHue(src(o0).pixelate(btw(3, 750), btw(3, 150)), rng(0, btw(.5, 7.5), 8, 2, 0.05))
.color(1, .999, 1)
.out(o0);

osc(btw(2.5, 20), btw(.05, .25), btw(1, 4))
.rotate(btw(0, TAU))
.contrast(.75)
.saturate(.875)
.modulate(noise(btw(1, 5), btw(-0.5, 0.5)), btw(.1, .75))
.diff(osc(btw(5, 15), btw(.05, .25), btw(1, 4)).rotate(btw(0, TAU)).hue(.1).contrast(.666).saturate(2).color(1, .5, 1).modulate(noise(btw(1, 5), btw(-0.5, 0.5)), btw(.1, .75)))
.out(o3);

shape(300, btw(.2, .7), .00)
.diff(shape(300, btw(-0.15, 0.6), .00))
.repeat(intgr(3, 15), intgr(3, 15))
.mult(osc(btw(50, 600), btw(.0125, .125)).luma(btw(.75, .975)).modulate(gradient().rotate((noise(3, .05)).r(1, 0)).sub(gradient()), 1))
.mult(noise(btw(1, 8), btw(0.05, 0.75)).pixelate(intgr(3, 15), intgr(3, 15)).contrast(2).thresh(.25))
.luma()
.scale(1, A, B)
.out(o2);

render(o0);
