/*
Hydra curated corpus port candidate: pattern_041
Title: source block 41
Status: semantic port, not visually accepted.
Bucket: portable core feedback

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
- G?: review gate role; hard gates for ingress, soft/luma only for other roles or intended legacy behavior
- T: preserve metric tiling and anchor math
- R: preserve raster oscillator math

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


// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/
speed=1
src(o0)
.layer(shape(4,.25,.0125).scale(1,.5).mult(osc(TAU,.25,1)).repeat(width/8,height/4,.5).mask(ns(width/4,1).thresh(.5,0).pixelate(width/4,height/2))
.mask(shape(4,1,0).scale(.125,1,1,0,0).scroll(.125/2,.125/2).scrollX(0,-.25).scrollY(0,-.25/8).pixelate(8,8).repeat(2,2)))
.scrollX(-1/width)
.modulate(osc(Math.PI*width/32,32/width).rotate(Math.PI/2).kaleid(width).thresh(.5,.125).color(1/width,0).rotate(Math.PI/-
                                                                                               2).mask(osc(Math.PI*width/8,1/width).rotate(Math.PI/2)).pixelate(width/8,height/4),4)
.modulate(osc(Math.PI*width/8,2/width).brightness(-.5).pixelate(width/16,height).color(0,1/height),2)
.modulateHue(o0,1)
.out(o0)
