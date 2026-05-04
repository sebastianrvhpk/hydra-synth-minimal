/*
Hydra curated corpus port candidate: pattern_009
Title: source block 9
Status: semantic port, not visually accepted.
Bucket: portable core feedback

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
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
Second pass:
- shared helpers moved to shared-v2.js
- Hydra array sequences converted to quantized texture-valued seqSignal(...)
- callback parameters converted to signal helpers where possible
- status remains: review candidate, not visually accepted
*/

// Run shared-v2.js once before this patch.

speed = 1;

solid()
.diff(osc(Math.PI * 2.0375, Math.PI * .15, btw(0, TAU)).color(1, 0, 0).modulate(solid(1, 0), rn()).modulate(gradient().scale(1, (noiseloop(3, .06, 2.5).scale(4, 1, 1, rn(), rn()).brightness(.5)).r(.5, 1), (noiseloop(3, .06, 2.5).scale(4, 1, 1, rn(), rn()).brightness(.5)).g(.5, 1)).sub(gradient()), 1).modulate(gradient().rotate((noiseloop(3, .06, 2.5).scale(4, 1, 1, rn(), rn())).r(Math.PI / 2, 0)).sub(gradient()), 1))
.diff(osc(Math.PI * 2.0375, Math.PI * .15, btw(0, TAU)).color(0, 1, 0).modulate(solid(1, 0), rn()).modulate(gradient().scale(1, (noiseloop(3, .06, 2.5).scale(4, 1, 1, rn(), rn()).brightness(.5)).r(.5, 1), (noiseloop(3, .06, 2.5).scale(4, 1, 1, rn(), rn()).brightness(.5)).g(.5, 1)).sub(gradient()), 1).modulate(gradient().rotate((noiseloop(3, .06, 2.5).scale(4, 1, 1, rn(), rn())).r(Math.PI / 2, 0)).sub(gradient()), 1))
.diff(osc(Math.PI * 2.0375, Math.PI * .15, btw(0, TAU)).color(0, 0, 1).modulate(solid(1, 0), rn()).modulate(gradient().scale(1, (noiseloop(3, .06, 2.5).scale(4, 1, 1, rn(), rn()).brightness(.5)).r(.5, 1), (noiseloop(3, .06, 2.5).scale(4, 1, 1, rn(), rn()).brightness(.5)).g(.5, 1)).sub(gradient()), 1).modulate(gradient().rotate((noiseloop(3, .06, 2.5).scale(4, 1, 1, rn(), rn())).r(Math.PI / 2, 0)).sub(gradient()), 1))
.out(o3);

shape(400, .05, 0)
.modulate(gradient().scale(1, (solid().add(noiseloop(2.5, 2 * .015, 5).scale(4, 1, 1, rn(), rn())).add(noiseloop(25, 8 * .015, 5).scale(4, 1, 1, rn(), rn()), .25).pixelate(1, 1).brightness(.5)).r(4, 1), (solid().add(noiseloop(2.5, 2 * .015, 5).scale(4, 1, 1, rn(), rn())).add(noiseloop(25, 8 * .015, 5).scale(4, 1, 1, rn(), rn()), .25).pixelate(1, 1).brightness(.5)).g(4, 1)).sub(gradient()), 1)
.modulate(solid().add(noiseloop(5, 2 * .15, .5).scale(4, 1, 1, rn(), rn()).color(1, 0)).add(noiseloop(5, 2 * .15, .5).scale(4, 1, 1, rn(), rn()).color(0, 1)).add(noiseloop(5, 8 * .15, .5).scale(4, 1, 1, rn(), rn()).color(1, 0), .25).add(noiseloop(5, 8 * .15, .5).scale(4, 1, 1, rn(), rn()).color(0, 1), .25), 2.5)
.modulate(gradient().rotate((noiseloop(5, 2 * .15, .5 * 2).scale(4, 1, 1, rn(), rn()).pixelate(1, 1)).r(Math.PI, 0)).sub(gradient()), 1)
.modulate(gradient().scale(1, (noiseloop(5, 8 * .15, .5).scale(2, 1, 1, rn(), rn()).brightness(1).pixelate(1, 1)).r(.25, 1), (noiseloop(5, 8 * .15, .5).scale(2, 1, 1, rn(), rn()).brightness(1).pixelate(1, 1)).g(.25, 1)).sub(gradient()), 1)
.out(o2);

src(o0)
.layer(src(o3).mask(src(o2).mask(noiseloop(25, .05, 2.5).scale(4, 1, 1, rn(), rn()).pixelate(pixelX(), pixelY()).thresh(-.5, .0075))))
.modulate(solid().add(src(o0).modulate(gradient().brightness(-.5), -.005).mask(noiseloop(25, .05, 2.5).scale(4, 1, 1, rn(), rn()).pixelate(pixelX(), pixelY()).thresh(0, .25)), bi() * .025).add(gradient().brightness(.5).rotate(1).pixelate(9, 9).brightness(-2).mask(noiseloop(25, .05, 2.5).scale(4, 1, 1, rn(), rn()).pixelate(pixelX(), pixelY()).thresh(.25, .025)), bi() * 5).add(solid().add(noiseloop(2.5, .025, 2.5).scale(4, 1, 1, rn(), rn()).color(1, 0)).add(noiseloop(5, .025, 2.5).scale(4, 1, 1, rn(), rn()).color(0, 1)).mask(noiseloop(25, .05, 2.5).scale(4, 1, 1, rn(), rn()).pixelate(pixelX() * 0 + 1, pixelY() * 0 + 1).thresh(-.125, .025)), bi() * 1).add(solid().add(noiseloop(2.5, .05, 2.5).scale(4, 1, 1, rn(), rn()).color(1, 0)).add(noiseloop(5, .05, 2.5).scale(4, 1, 1, rn(), rn()).color(0, 1)).pixelate(1, 1).mask(noiseloop(25, .05, 2.5).scale(4, 1, 1, rn(), rn()).pixelate(pixelX() * 0 + 1, pixelY() * 0 + 1).thresh(-.25, .075)), bi() * 5).add(osc(12, bi() * .125).rotate(btw(-(Math.PI / 4), Math.PI / 4)).brightness(-.5).color(1, .1).mask(noiseloop(25, .05, 2.5).scale(4, 1, 1, rn(), rn()).pixelate(pixelX(), pixelY()).thresh(0, .025)), bi() * 5).add(shape(4, 1, 0).scale(1, .25).scrollX(0, .075).repeat(width / 4, 1).color(0, 1).mask(noiseloop(15, .025, 2.5).scale(4, 1, 1, rn(), rn()).brightness(0).pixelate(width, 1).add(noiseloop(15, .025, 2.5).scale(4, 1, 1, rn(), rn()).brightness(0).pixelate(1, height), .25)).mask(noiseloop(25, .05, 2.5).scale(4, 1, 1, rn(), rn()).pixelate(pixelX(), pixelY()).thresh(0, .075)), bi() * 2.5).add(gradient().modulate(gradient().rotate((noiseloop(25, .005, 2.5).scale(4, 1, 1, rn(), rn()).pixelate(pixelX(), pixelY())).r(TAU, 0)).sub(gradient()), 1).brightness(-.5).mask(shape(choice2(4, 100), .75, .25)).repeat(pixelX(), pixelY(), .5, .5).mask(noiseloop(15, .025, 2.5).scale(4, 1, 1, rn(), rn()).brightness(.5).pixelate(pixelX(), pixelY()).thresh(-.5, 0)).mask(noiseloop(25, .05, 2.5).scale(4, 1, 1, rn(), rn()).pixelate(pixelX(), pixelY()).thresh(0, .075)), bi() * 2.5).pixelate(8, 8).color(1 / width, 1 / height), 1)
.out(o0);

solid()
.layer(src(o0))
.out(o1);

render(o1);
