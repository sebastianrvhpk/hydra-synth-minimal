/*
Hydra curated corpus port candidate: pattern_052
Title: source block 52
Status: semantic port, not visually accepted.
Bucket: already close to current core

Port moves:
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
src(o0)
.modulate(osc(TAU,.075).thresh(.5,.375).brightness(-.5).color(1,0).add(osc(TAU,.075).scrollX(.25).thresh(.5,.375).brightness(-.5).color(0,1)).pixelate(1,1).color(1/width,1/height),2)
.layer(osc(Math.PI*width*Math.cos(Math.PI/-4)/2,2/width,1.25).rotate(Math.PI/-4).kaleid(width/32)//.mask(ns().thresh(0,0))
.mask(shape(4,1,0).scale(1/8,1,1,0,0)
.repeat(width/8,height/8*2,.5)))
.modulate(gradient().brightness(-.5).pixelate(2,2).repeat(8,8).mult(ns(3,.1).pixelate(8,8).thresh(.25,.125)).color(1/width,1/height),4)
.out(o0)
