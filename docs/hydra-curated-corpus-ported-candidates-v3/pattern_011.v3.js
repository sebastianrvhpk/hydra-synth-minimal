/*
Hydra curated corpus port candidate: pattern_011
Title: source block 11
Status: semantic port, not visually accepted.
Bucket: already close to current core

Port moves:
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

speed = .25;

solid()
.diff(o0)
.modulate(solid().add(noiseLoop(35, .25, 2).scale(4, A, B, rn(), rn()).color(1 / width, 0, 0).mask(noiseLoop(13, .5, 2).scale(4, A, B, rn(), rn()).thresh(.125, .25)), 1).add(noiseLoop(35, .25, 2).scale(4, A, B, rn(), rn()).color(0, 1 / height, 0).mask(noiseLoop(13, .5, 2).scale(4, A, B, rn(), rn()).thresh(.375, .25)), 1).scrollY(0, btw(-2, 2) / height).pixelate(intgr(6, 12) / (A) * 2, intgr(6, 12) / (B) * 2).add(gradient().brightness(-.5).rotate(Math.PI / 2).repeat(intgr(6, 12) / (A), intgr(6, 12) / (B)).color(1 / width, 1 / height).mask(noiseLoop(35 / 2, .05, 2).scale(4, A, B, .75, .75).thresh(.875, .025).pixelate(intgr(6, 12) / (A), intgr(6, 12) / (B))), 5).modulate(osc(Math.PI * btw(1, 10), btw(.01, .25)).brightness(-.5).thresh(0, 0).pixelate(intgr(6, 12) / (A) * 2, 1).color(0, 1).mask(noiseLoop(13, .5, 2).scale(4, A, B, .7, .3)), btw(0, .25)).scrollY(0, -btw(-2, 2) / height), 25)
.modulate(gradient().scale(1, (noiseLoop(33, 1, 2).scale(4, A, B, rn(), rn()).pixelate(width, 1).brightness(-.5).rotate(.25).thresh(.125, 0).pixelate(intgr(6, 12) / (A), intgr(6, 12) / (B)).mult(noiseLoop(33, 1, 2).scale(4, A, B, rn(), rn()).pixelate(intgr(6, 12) / (A) / 2, intgr(6, 12) / (B) / 2)).color(0, 1, 0)).r(5, 1), (noiseLoop(33, 1, 2).scale(4, A, B, rn(), rn()).pixelate(width, 1).brightness(-.5).rotate(.25).thresh(.125, 0).pixelate(intgr(6, 12) / (A), intgr(6, 12) / (B)).mult(noiseLoop(33, 1, 2).scale(4, A, B, rn(), rn()).pixelate(intgr(6, 12) / (A) / 2, intgr(6, 12) / (B) / 2)).color(0, 1, 0)).g(5, 1)).sub(gradient()), 1)
.layer(shape(4, .5, 0).scroll(bi() * .25, bi() * .25, 0).repeat(width / 2, height / 2).mask(noiseLoop(23, .25, 2).scale(4, A, B, rn(), rn()).thresh(.75, 0).pixelate(intgr(6, 12) / (A) * 2, intgr(6, 12) / (B) * 2)))
.out(o0);

src(o1)
.modulate(solid().add(shape(4, 1, 0), 2 * bl()).add(noiseLoop(35, .025, 2).scale(4, A, B, rn(), rn()).thresh(.05, .1).brightness(btw(-0.5, 0))).add(noiseLoop(35, .025, 2).scale(4, A, B, rn(), rn()).thresh(.05, .1).brightness(btw(-0.5, 0))).color(1 / width, 0 / height).mask(noiseLoop(13, .1, 2).scale(4, A, B, rn(), rn()).thresh(0, .5)).scrollY(0, btw(-2, 2) / height).pixelate(1, intgr(6, 12) / (B)).scrollY(0, -btw(-2, 2) / height), btw(-2, 2) * 2)
.layer(src(o0).scroll(rn(), rn(), btw(-3, 3) / width, btw(-3, 3) / height).mask(shape(4, 1, 0).scale(1, btw(2, 4) / width, 1, bl()).scrollX(btw(-2, 2) / width).mask(noiseLoop(5, .25, 2).scale(4, A, B, rn(), rn()).thresh(0, 0).pixelate(1, height))))
.out(o1);

solid()
.diff(src(o1))
.out(o2);

render(o2);

solid()
.diff(o0)
.modulate(solid().add(noiseLoop(35, .25, 2).scale(4, A, B, rn(), rn()).color(1 / width, 0, 0).mask(noiseLoop(13, .5, 2).scale(4, A, B, rn(), rn()).thresh(.125, .25)), 1).add(noiseLoop(35, .25, 2).scale(4, A, B, rn(), rn()).color(0, 1 / height, 0).mask(noiseLoop(13, .5, 2).scale(4, A, B, rn(), rn()).thresh(.375, .25)), 1).scrollY(0, btw(-2, 2) / height).pixelate(intgr(6, 12) / (A) * 2, intgr(6, 12) / (B) * 2).add(gradient().brightness(-.5).rotate(Math.PI / 2).repeat(intgr(6, 12) / (A), intgr(6, 12) / (B)).color(1 / width, 1 / height).mask(noiseLoop(35 / 2, .05, 2).scale(4, A, B, .75, .75).thresh(.875, .025).pixelate(intgr(6, 12) / (A), intgr(6, 12) / (B))), 5).modulate(osc(Math.PI * btw(1, 10), btw(.01, .25)).brightness(-.5).thresh(0, 0).pixelate(intgr(6, 12) / (A) * 2, 1).color(0, 1).mask(noiseLoop(13, .5, 2).scale(4, A, B, .7, .3)), btw(0, .25)).scrollY(0, -btw(-2, 2) / height), 25)
.modulate(gradient().scale(1, (noiseLoop(33, 1, 2).scale(4, A, B, rn(), rn()).pixelate(width, 1).brightness(-.5).rotate(.25).thresh(.125, 0).pixelate(intgr(6, 12) / (A), intgr(6, 12) / (B)).mult(noiseLoop(33, 1, 2).scale(4, A, B, rn(), rn()).pixelate(intgr(6, 12) / (A) / 2, intgr(6, 12) / (B) / 2)).color(0, 1, 0)).r(rn() * 5, 1), (noiseLoop(33, 1, 2).scale(4, A, B, rn(), rn()).pixelate(width, 1).brightness(-.5).rotate(.25).thresh(.125, 0).pixelate(intgr(6, 12) / (A), intgr(6, 12) / (B)).mult(noiseLoop(33, 1, 2).scale(4, A, B, rn(), rn()).pixelate(intgr(6, 12) / (A) / 2, intgr(6, 12) / (B) / 2)).color(0, 1, 0)).g(rn() * 5, 1)).sub(gradient()), 1)
.layer(shape(4, .5, 0).scroll(bi() * .25, bi() * .25, 0).repeat(width / 2, height / 2).mask(noiseLoop(23, .25, 2).scale(4, A, B, rn(), rn()).thresh(.75, 0).pixelate(intgr(6, 12) / (A) * 2, intgr(6, 12) / (B) * 2)))
.out(o0);

src(o1)
.modulate(solid().add(shape(4, 1, 0), 2 * bl()).add(noiseLoop(35, .025, 2).scale(4, A, B, rn(), rn()).thresh(.05, .1).brightness(btw(-0.5, 0))).add(noiseLoop(35, .025, 2).scale(4, A, B, rn(), rn()).thresh(.05, .1).brightness(btw(-0.5, 0))).color(1 / width, 0 / height).mask(noiseLoop(13, .1, 2).scale(4, A, B, rn(), rn()).thresh(0, .5)).scrollY(0, btw(-2, 2) / height).pixelate(1, intgr(6, 12) / (B)).scrollY(0, -btw(-2, 2) / height), btw(-2, 2) * 2)
.layer(src(o0).scroll(rn(), rn(), btw(-3, 3) / width, btw(-3, 3) / height).mask(shape(4, 1, 0).scale(1, btw(2, 4) / width, 1, bl()).scrollX(btw(-2, 2) / width).mask(noiseLoop(5, .25, 2).scale(4, A, B).thresh(btw(-.5, .5), 0).pixelate(1, height))))
.out(o1);

solid()
.add(solid().add(noiseLoop(35, .25, 2).scale(4, A, B, rn(), rn()).brightness(1).color(1, 0, 0).mask(noiseLoop(13, .5, 2).scale(4, A, B, rn(), rn()).thresh(.125, .25)), 1).add(noiseLoop(35, .25, 2).scale(4, A, B, rn(), rn()).brightness(1).color(0, 1, 0).mask(noiseLoop(13, .5, 2).scale(4, A, B, rn(), rn()).thresh(.375, .25)), 1).scrollY(0, btw(-2, 2) / height).pixelate(intgr(6, 12) / (A) * 2, intgr(6, 12) / (B) * 2).add(gradient().brightness(-.5).rotate(Math.PI / 2).repeat(intgr(6, 12) / (A), intgr(6, 12) / (B)).mask(noiseLoop(35 / 2, .05, 2).scale(4, A, B, .75, .75).thresh(.875, .025).pixelate(intgr(6, 12) / (A), intgr(6, 12) / (B))), 5).modulate(osc(Math.PI * btw(1, 10), btw(.01, .25)).brightness(-.5).thresh(0, 0).pixelate(intgr(6, 12) / (A) * 2, 1).color(0, 1).mask(noiseLoop(13, .5, 2).scale(4, A, B, .7, .3)), btw(0, .25)).scrollY(0, -btw(-2, 2) / height), 2)
.modulate(gradient().scale(1, (noiseLoop(33, 1, 2).scale(4, A, B, rn(), rn()).pixelate(width, 1).brightness(-.5).rotate(.25).thresh(.125, 0).pixelate(intgr(6, 12) / (A), intgr(6, 12) / (B)).mult(noiseLoop(33, 1, 2).scale(4, A, B, rn(), rn()).pixelate(intgr(6, 12) / (A) / 2, intgr(6, 12) / (B) / 2)).color(0, 1, 0)).r(5, 1), (noiseLoop(33, 1, 2).scale(4, A, B, rn(), rn()).pixelate(width, 1).brightness(-.5).rotate(.25).thresh(.125, 0).pixelate(intgr(6, 12) / (A), intgr(6, 12) / (B)).mult(noiseLoop(33, 1, 2).scale(4, A, B, rn(), rn()).pixelate(intgr(6, 12) / (A) / 2, intgr(6, 12) / (B) / 2)).color(0, 1, 0)).g(5, 1)).sub(gradient()), 1)
.out(o2);

solid()
.add(solid().add(src(o2).r().color(1, 0, 0).mask(shape(4, 1, 0).scale(1, 1, .125).repeatY(height / 16))).add(src(o2).g().color(0, 1, 0).mask(shape(4, 1, 0).scale(1, .125, 1).repeatX(width / 16))))
.blend(o3, .25)
.out(o3);

render(o3);

src(o3)
.layer(src(o0).luma(.5, 0))
.out(o4);

render(o4);

solid()
.add(solid().add(shape(4, 1, 0), 2).add(noiseLoop(35, .025, 2).scale(4, A, B, rn(), rn()).thresh(.05, .1).brightness(-.5)).add(noiseLoop(35, .025, 2).scale(4, A, B, rn(), rn()).thresh(.05, .1).brightness(-.5)).mask(noiseLoop(13, .1, 2).scale(4, A, B, rn(), rn()).thresh(.025, .25)).scrollY(0, btw(-2, 2) / height).pixelate(1, intgr(6, 12) / (B)).scrollY(0, -btw(-2, 2) / height).diff(solid(1, 1, 1)).color(1, 0, 0).r().color(0, 0, -1).b().color(0, 0, 1), 1 - bl())
.add(solid().add(shape(4, 1, 0), 2 * bl()).add(noiseLoop(35, .025, 2).scale(4, A, B, rn(), rn()).thresh(.05, .1).brightness(btw(-0.5, 0))).add(noiseLoop(35, .025, 2).scale(4, A, B, rn(), rn()).thresh(.05, .1).brightness(btw(-0.5, 0))).mask(noiseLoop(13, .1, 2).scale(4, A, B, rn(), rn()).thresh(.025, .25)).scrollY(0, btw(-2, 2) / height).pixelate(1, intgr(6, 12) / (B)).scrollY(0, -btw(-2, 2) / height).r().color(1, 0, 0).r().color(1, 0, 0))
.out(o2);

solid()
.add(solid().add(src(o2).r().color(1, 0, 0)).add(src(o2).b().color(0, 0, 1)).mask(shape(4, 1, 0).scale(1, 1, .125).repeatY(height / 16)))
.blend(o3, .25)
.out(o3);

render(o3);

src(o3)
.layer(src(o1).luma(.5, 0))
.out(o4);

render(o4);

solid()
.diff(src(o1))
.out(o2);

render(o2);

solid()
.diff(src(o0))
.out(o2);

render(o2);
