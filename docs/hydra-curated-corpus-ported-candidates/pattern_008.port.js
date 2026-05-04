/*
Hydra curated corpus port candidate: pattern_008
Title: source block 8
Status: semantic port, not visually accepted.
Bucket: portable core feedback

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
- G?: review gate role; hard gates for ingress, soft/luma only for other roles or intended legacy behavior

This file preserves authored behavior where automatic conversion would be risky.
Math-safe automated rewrites currently include:
- .out() -> .out(o0)
- modulateScrollX/Y(field, amount, speed?) -> explicit .modulate(...) pixel-step equivalent
- modulateRotate(field, multiple, offset) -> gradient().rotate(...).sub(gradient()) transform delta
- modulateScale(field, multiple, offset) -> gradient().scale(...).sub(gradient()) transform delta
*/

// Shared helpers for first-pass corpus ports.
// These are assignments, not const declarations, so snippets can be re-run in the Hydra editor.
TAU = Math.PI * 2
A = width > height ? height / width : 1
B = height > width ? width / height : 1
rn = (max = 1) => Math.random() * max
btw = (min = 0, max = 1, power = 1) => min + Math.random() ** power * (max - min)
intgr = (min = 0, max = 1, power = 1) => {
  const lo = Math.ceil(min)
  const hi = Math.floor(max)
  return lo + Math.floor(Math.random() ** power * (hi - lo + 1))
}
chc = (values, power = 1) => values[Math.min(values.length - 1, Math.floor(Math.random() ** power * values.length))]
maybe = (p = 0.5) => Math.random() < p
bi = (p = 0.5) => rn() > p ? 1 : -1
bl = (p = 0.5, power = 1) => Math.random() ** power > p ? 1 : 0
pick = (p, a, b) => maybe(p) ? a : b
ns = (freq = 3, vel = 0, x = rn(), y = rn()) =>
  noise(freq, vel).scale(1, A, B).modulate(solid(width * x, height * y), 1)
nsloop = (freq = 35, vel = 0.25, rad = 0.8, x = rn(), y = rn()) =>
  noiseloop(freq, vel, rad).modulate(solid(width * x, height * y), 1)
pixelX = () => chc([1, intgr(4, 13), width])
pixelY = () => chc([1, intgr(4, 13), height])


speed = .15;

solid()
.diff(osc(Math.PI * 2.025 * 4, Math.PI / 2 / 4, btw(.5, 1.5)).color(1, 0, 0).scale(4, btw(.75, 1.5), btw(.75, 1.5), rn(), rn()).rotate(btw(0, TAU)))
.diff(osc(Math.PI * 2.025 * 4, Math.PI / 2 / 4, btw(.5, 1.5)).color(0, 1, 0).scale(4, btw(.75, 1.5), btw(.75, 1.5), rn(), rn()).rotate(btw(0, TAU)))
.diff(osc(Math.PI * 2.025 * 4, Math.PI / 2 / 4, btw(.5, 1.5)).color(0, 0, 1).scale(4, btw(.75, 1.5), btw(.75, 1.5), rn(), rn()).rotate(btw(0, TAU)))
.out(o2);

src(o0)
.layer(src(o2).mask(shape(400, .0025, 0).modulate(gradient().scale(1, (solid().add(noiseloop(2.5, 2, .5).scale(4, 1, 1, rn(), rn())).add(noiseloop(25, 8, .5).scale(4, 1, 1, rn(), rn()), .25).brightness(.5).pixelate(1, 1)).r(4, 1), (solid().add(noiseloop(2.5, 2, .5).scale(4, 1, 1, rn(), rn())).add(noiseloop(25, 8, .5).scale(4, 1, 1, rn(), rn()), .25).brightness(.5).pixelate(1, 1)).g(4, 1)).sub(gradient()), 1).modulate(solid().add(noiseloop(2.5, 2, .5).scale(4, 1, 1, rn(), rn()).color(1, 0)).add(noiseloop(2.5, 2, .5).scale(4, 1, 1, rn(), rn()).color(0, 1)).add(noiseloop(25, 8, .5).scale(4, 1, 1, rn(), rn()).color(1, 0), .25).add(noiseloop(25, 8, .5).scale(4, 1, 1, rn(), rn()).color(0, 1), .25).scroll(rn(), rn()).pixelate(1, 1).scroll(0, 0, 1 / width, 1 / height), .5).modulate(gradient().rotate((solid().add(noiseloop(2.5, 2, .125).pixelate(1, 1))).r(Math.PI, 0)).sub(gradient()), 1).modulate(gradient().scale(1, (solid().add(noiseloop(25, 2, .5).brightness(.5).pixelate(1, 1))).r(1, 1), (solid().add(noiseloop(25, 2, .5).brightness(.5).pixelate(1, 1))).g(1, 1)).sub(gradient()), 1).modulate(osc(Math.PI * 2.0375, Math.PI / 2, btw(0, TAU)).pixelate(1, 1).brightness(-.5), 2 / width)))
.modulate(solid().add(src(o2).brightness(-.5).color(1 / width, 1 / height).modulate(gradient().scale(1, (noiseloop(25, .1, 2.5).scale(4, 1, 1, rn(), rn()).brightness(1)).r(1, 1), (noiseloop(25, .1, 2.5).scale(4, 1, 1, rn(), rn()).brightness(1)).g(1, 1)).sub(gradient()), 1).rotate(btw(0, TAU)).scale(1 / 25, btw(1, 2), btw(1, 2), rn(), rn()).pixelate(3, 4)).add(src(o2).brightness(-.5).color(1 / width, 1 / height).modulate(gradient().scale(1, (noiseloop(25, .1, 2.5).scale(4, 1, 1, rn(), rn()).brightness(1)).r(1, 1), (noiseloop(25, .1, 2.5).scale(4, 1, 1, rn(), rn()).brightness(1)).g(1, 1)).sub(gradient()), 1).rotate(btw(0, TAU)).scale(1 / 25, btw(1, 2), btw(1, 2), rn(), rn()).pixelate(5, 3)).add(src(o3).brightness(-.5).color(1 / width, 1 / height), 1), 1)
.out(o0);

osc(TAU, 0, .5)
.repeatX(btw(1, 2))
.rotate(btw(0, TAU))
.modulate(noise(15, 2).scale(10, 1, 1, rn(), rn()), rn())
.diff(osc(TAU, 0, .75).repeatX(btw(1, 2)).rotate(btw(0, TAU)).modulate(noise(20, 2).scale(10, 1, 1, rn(), rn()).thresh(.5, 1)), rn())
.diff(osc(TAU, 0, 1.).repeatX(btw(1, 2)).rotate(btw(0, TAU)).modulate(noise(25, 2).scale(10, 1, 1, rn(), rn()).thresh(1, 2)), rn())
.diff(osc(TAU, 0, 1.25).repeatX(btw(1, 2)).rotate(btw(0, TAU)).modulate(noise(30, 2).scale(10, 1, 1, rn(), rn()).thresh(1.5, 3)), rn())
.diff(osc(TAU, 0, 1.5).repeatX(btw(1, 2)).rotate(btw(0, TAU)).modulate(noise(35, 2).scale(10, 1, 1, rn(), rn()).thresh(2, 4)), rn())
.out(o3);

solid()
.layer(src(o0))
.out(o1);

render(o1);
