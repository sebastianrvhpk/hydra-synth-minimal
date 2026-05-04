/*
Hydra curated corpus port candidate: pattern_091
Title: source block 91
Status: semantic port, not visually accepted.
Bucket: legacy feedback / conceptual port

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
- G?: review gate role; hard gates for ingress, soft/luma only for other roles or intended legacy behavior
- L/X: review global blend/diff/sub pressure; move into material before mask unless intentionally global

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


shape(width,.125*.1,0*4/width).hue(5/width).color(1-.01,1-.05,1)
.modulate(solid(0,0,0,0)
.add(ns(3,1).pixelate(1,1).color(0,1),height/2)
.add(ns(3,1).pixelate(1,1).color(1,0),width/2)
.color(1/width,1/height),1)
.diff(src(o0).rotate(0*Math.PI/width).shift(5/width,-2/height,0).hue(3/height).color(1-.01,1-.015,1))
.add(ns(.3,1).pixelate(width,1).thresh(.75,.0125),.25)
.modulate(ns(.3,1).pixelate(width,1).thresh(.75,.0125),.25)
.modulate(gradient().scale(1, (ns(.3,1).pixelate(width,1).thresh(.75,.0125)).r(.01, 1), (ns(.3,1).pixelate(width,1).thresh(.75,.0125)).g(.01, 1)).sub(gradient()), 1)
.out(o0)
