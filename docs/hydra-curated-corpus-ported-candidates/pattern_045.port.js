/*
Hydra curated corpus port candidate: pattern_045
Title: source block 45
Status: semantic port, not visually accepted.
Bucket: staging / source construction

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
- G?: review gate role; hard gates for ingress, soft/luma only for other roles or intended legacy behavior
- C: callback/time controls retained as legacy controls; replace manually when porting for the no-callback grammar

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


multi=(px,spd)=>ns(px,0).pixelate(px,1).scrollX(0,(1/px)*spd).brightness(1).pixelate(1,1)
speed=1

solid().diff(o0)
.modulate(solid()
.add(osc(TAU,1).sub(multi(3,1),.1).pixelate(1,1).color(1,0).mult(multi(7,1)),-100)
.add(shape(4,.25,0).rotate(0,.1).scale(1, A, B).modulate(gradient().scale(1, (ns(3,1).pixelate(1,1)).r(4, 1), (ns(3,1).pixelate(1,1)).g(4, 1)).sub(gradient()), 1).diff(osc(1,-1)).mult(multi(9,1)),50)
.add(gradient().rotate(Math.PI/2).mult(noise(10,1).thresh(.25,.5).pixelate(1,1)).mult(multi(4,2)),125)
.add(gradient().rotate(Math.PI/-2).mult(noise(10,1).thresh(.25,.5).invert().pixelate(1,1)).mult(multi(4,2)),-125)
.color(1/width,1/height)
)
.layer(osc(TAU,1,1).rotate(0,.1*0).mask(shape(4,1,0).scale(1,1/width,1,0)))
.out(o0)
