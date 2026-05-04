/*
Hydra curated corpus port candidate: pattern_020
Title: source block 20
Status: semantic port, not visually accepted.
Bucket: extension / staging

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback
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


shape(4,1,0).scale(.5,1,1,0,rn()).repeat(width/2,height/2).mult(ns(1,.1).thresh(.25-.5,.25))
.diff(shape(4,1,0).scale(.25,1,1,rn(),0).scrollX(0,.5).repeat(width/4,height/4).mult(ns(2,.1).thresh(.375-.5,.25)))
.diff(shape(4,1,0).scale(.125,1,1,1,rn()).repeat(width/8,height/8).mult(ns(3,.1).thresh(.5-.5,.25)))
.diff(shape(4,1,0).scale(.5,1,1,rn(),1).rotate(0,1).repeat(width/2,height/2).mult(ns(4,.1).thresh(.75-.5,.25)))

.out(o0)
