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
