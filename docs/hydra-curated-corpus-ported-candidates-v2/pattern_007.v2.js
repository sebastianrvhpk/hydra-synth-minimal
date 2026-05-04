/*
Hydra curated corpus port candidate: pattern_007
Title: source block 7
Status: semantic port, not visually accepted.
Bucket: portable core feedback

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension

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

speed = .15;

src(o0)
.layer(solid().add(osc(Math.PI * 2.0375 * 4, Math.PI / 2 / 4, 1.5).color(1, 0, 0).scale(4, 1, 1, .5, .5)).add(osc(Math.PI * 2.0375 * 4, Math.PI / 2 / 4, 1.5).color(0, 1, 0).scale(4, 1, 1, .5, .5)).add(osc(Math.PI * 2.0375 * 4, Math.PI / 2 / 4, 1.5).color(0, 0, 1).scale(4, 1, 1, .5, .5)).mask(shape(400, .0025, 0).modulate(gradient().scale(1, (solid().add(noiseloop(2.5, 2, .5).scale(4, 1, 1, rn(), rn())).add(noiseloop(25, 8, .5).scale(4, 1, 1, rn(), rn()), .25).brightness(.5).pixelate(1, 1)).r(4, 1), (solid().add(noiseloop(2.5, 2, .5).scale(4, 1, 1, rn(), rn())).add(noiseloop(25, 8, .5).scale(4, 1, 1, rn(), rn()), .25).brightness(.5).pixelate(1, 1)).g(4, 1)).sub(gradient()), 1).modulate(solid().add(noiseloop(2.5, 2, .5).scale(4, 1, 1, rn(), rn()).color(1, 0)).add(noiseloop(2.5, 2, .5).scale(4, 1, 1, rn(), rn()).color(0, 1)).add(noiseloop(25, 8, .5).scale(4, 1, 1, rn(), rn()).color(1, 0), .25).add(noiseloop(25, 8, .5).scale(4, 1, 1, rn(), rn()).color(0, 1), .25).scroll(rn(), rn()).pixelate(1, 1).scroll(0, 0), .5).modulate(gradient().rotate((solid().add(noiseloop(2.5, 2, .5).pixelate(1, 1))).r(Math.PI, 0)).sub(gradient()), 1).modulate(gradient().scale(1, (solid().add(noiseloop(25, 8, .5).brightness(.5).pixelate(1, 1))).r(1, 1), (solid().add(noiseloop(25, 8, .5).brightness(.5).pixelate(1, 1))).g(1, 1)).sub(gradient()), 1).modulate(osc(Math.PI * 2.0375 * 10, TAU, btw(0, TAU)).pixelate(1, 1).brightness(-.5), 2 / width)))
.modulate(gradient().brightness(-.5).brightness(1).pixelate(9, 9).add(solid().add(noiseloop(2.5, 2, .5).scale(4, 1, 1, rn(), rn()).color(1, 0)).add(noiseloop(2.5, 2, .5).scale(4, 1, 1, rn(), rn()).color(0, 1)).add(noiseloop(25, 8, .5).scale(4, 1, 1, rn(), rn()).color(1, 0), .25).add(noiseloop(25, 8, .5).scale(4, 1, 1, rn(), rn()).color(0, 1), .25).scroll(rn(), rn()).pixelate(1, 1), 2.5 / 2).color(1 / width, 1 / height), 5 / 2)
.out(o0);

solid()
.layer(src(o0).scale(2.5, 1, 1, rn(), rn()).hue(-.1).color(1.1, .995))
.modulate(src(o0).scale(5).hue(.1).color(1.1, 2 - .995).rotate(0, 0))
.layer(src(o0))
.out(o1);

render(o1);
