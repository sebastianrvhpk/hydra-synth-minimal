/*
Hydra curated corpus port candidate: pattern_085
Title: source block 85
Status: semantic port, not visually accepted.
Bucket: extension / staging

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
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


shape(4,1,0)
.scale(2,1/width,1/height)
.modulate(gradient().scale(1, (ns(30,1).rotate(0,1).pixelate(2,2).thresh(.5,0).color(1,0)).r(width, 1), (ns(30,1).rotate(0,1).pixelate(2,2).thresh(.5,0).color(1,0)).g(width, 1)).sub(gradient()), 1)
.modulate(gradient().scale(1, (ns(30,1).rotate(0,1).pixelate(2,2).thresh(.5,0).color(0,1)).r(height, 1), (ns(30,1).rotate(0,1).pixelate(2,2).thresh(.5,0).color(0,1)).g(height, 1)).sub(gradient()), 1)
.modulate(gradient().brightness(-.5).mask(ns(30,1).rotate(0,1).pixelate(1,1).thresh(.5,0)).mask(ns(13,0).pixelate(4,1).scrollX(0,1).pixelate(1,1)).modulate(ns(4,1).color(0,1).pixelate(1,4),1),-1)
.repeat(2,2)
.out(o0)
