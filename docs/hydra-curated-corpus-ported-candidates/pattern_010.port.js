/*
Hydra curated corpus port candidate: pattern_010
Title: source block 10
Status: semantic port, not visually accepted.
Bucket: already close to current core

Port moves:
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


speed = .75;

src(o0)
.modulate(solid().add(noiseloop(35, .25, .8).scale(4, A, B).pixelate(6 * (height / 500) / A, 6 * (height / 500)).mask(noiseloop(13, .5, .8).scale(4, A, B).thresh(.125, .25)).color(1, 0), 1).add(noiseloop(35, .25, .8).scale(4, A, B).pixelate(6 * (height / 500) / A, 6 * (height / 500)).mask(noiseloop(13, .5, .8).scale(4, A, B).thresh(.5, .25)).color(0, 1), 1).scrollY(0, btw(-2, 2) / height).pixelate(pick(0.95, 6 * (height / 500) * 2 / A, width), pick(0.95, 6 * (height / 500) * 2, height)).scrollY(0, -btw(-2, 2) / height).color(1 / width, 1 / height), 50)
.layer(shape(4, .5, 0).scroll(.25, .25, 0).repeat(width / 2, height / 2).mask(noiseloop(43, .25, .8).scale(4, A, B).thresh(.75, 0).pixelate(6 * (height / 500) * 4 / A, 6 * (height / 500) * 4)))
.out(o0);

src(o1)
.modulate(solid(btw(-2, 2), 0, 0).add(noiseloop(35, .025, 1).scale(4, A, B).thresh(.05, .1).brightness(bl() * -.5)).add(noiseloop(35, .025, 1).scale(4, A, B).thresh(.05, .1).brightness(bl() * -.5)).color(1 / width, 0 / height).mask(noiseloop(13, .1, 1).scale(4, A, B).thresh(0, .125)).scrollY(0, btw(-2, 2) / height).pixelate(1, 6 * (height / 500)).scrollY(0, -btw(-2, 2) / height), btw(-2, 2) * 2)
.layer(src(o0).diff(solid()).scroll(rn(), rn(), btw(-3, 3) / width, btw(-3, 3) / height).mask(shape(4, 1, 0).scale(1, btw(1, 4) / width, 1, bl()).scrollX(btw(-2, 2) / width)))
.out(o1);

solid()
.diff(src(o1))
.out(o2);

render(o2);

solid()
.diff(src(o1))
.out(o2);

solid()
.diff(src(o0))
.out(o2);
