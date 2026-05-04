/*
Hydra curated corpus port candidate: pattern_046
Title: source block 46
Status: semantic port, not visually accepted.
Bucket: staging / source construction

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension

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


speed=.375
shape(4,1,0)
.scale(2,1/width,1/height)
.modulate(gradient().scale(1, (ns(30,1).rotate(0,1).pixelate(2,2).thresh(.5,0).color(1,0)).r(width, 1), (ns(30,1).rotate(0,1).pixelate(2,2).thresh(.5,0).color(1,0)).g(width, 1)).sub(gradient()), 1)
.modulate(gradient().scale(1, (ns(30,1).rotate(0,1).pixelate(2,2).thresh(.5,0).color(0,1)).r(height, 1), (ns(30,1).rotate(0,1).pixelate(2,2).thresh(.5,0).color(0,1)).g(height, 1)).sub(gradient()), 1)
.modulate(gradient().brightness(-.5).mask(ns(30,1).rotate(0,1).pixelate(1,1).thresh(.5,0)).mask(ns(13,0).pixelate(4,1).scrollX(0,1).pixelate(1,1)).modulate(ns(4,1).color(0,1).pixelate(2,4),1),-1)
.repeat(2,2).mult(osc(TAU,.5,1).pixelate(1,1))
.blend(src(o0).add(src(o0).modulate(ns(3,1).pixelate(9,9).color(1,0).add(ns(3,1).pixelate(13,13).color(0,1)).color(1/width,1/height),25).mask(ns(width,1/width).thresh(0,0)),.75),.5)
.modulate(ns(3,1).pixelate(7,7).color(1,0).add(ns(3,1).pixelate(5,5).color(0,1)).color(1/width,1/height),5)
.diff(src(o0).add(src(o0).pixelate(width/32,height/32),.125).scrollX(1/width).add(src(o0).scrollY(1/height),.05))
//.rotate(1/width)
.mask(ns(width,0).thresh(-.875,0))
.out(o0)
