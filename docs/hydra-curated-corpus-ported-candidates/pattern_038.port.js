/*
Hydra curated corpus port candidate: pattern_038
Title: source block 38
Status: semantic port, not visually accepted.
Bucket: memory-drift / non-ingress feedback

Port moves:
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
- G?: review gate role; hard gates for ingress, soft/luma only for other roles or intended legacy behavior
- L/X: review global blend/diff/sub pressure; move into material before mask unless intentionally global
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


ns=(f,v,x=rn(),y=rn())=>noise(f,0).modulate(solid(x*width,y*height),1).modulate(osc(TAU,v).brightness(-.5).color(1,0).add(osc(TAU,v).brightness(-.5).scrollX(.25).color(0,1)).pixelate(1,1),1)

src(o0).colorama(-10/width).hue(1/width)
.diff(shape(4,1,0).scale(1,1/width,1/height))
.modulate(gradient().scale(1, (solid()
.add(ns(3,.1).color(1,0,0).mask(osc(TAU,.25).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(1,0,0).mask(osc(TAU,.25).scrollX(.5).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(.25,1,0).mask(osc(TAU,.25).scrollX(.25).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(0,1,0).mask(osc(TAU,.25).scrollX(.75).pixelate(1,1).thresh(.75,.1)))
//.brightness(.5)
.pixelate(1,1)).r(.0125, 1), (solid()
.add(ns(3,.1).color(1,0,0).mask(osc(TAU,.25).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(1,0,0).mask(osc(TAU,.25).scrollX(.5).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(.25,1,0).mask(osc(TAU,.25).scrollX(.25).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(0,1,0).mask(osc(TAU,.25).scrollX(.75).pixelate(1,1).thresh(.75,.1)))
//.brightness(.5)
.pixelate(1,1)).g(.0125, 1)).sub(gradient()), 1)
.modulate(solid()
.add(ns(3,.1).color(1,0,0).mask(osc(TAU,.25).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(1,0,0).mask(osc(TAU,.25).scrollX(.5).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(.25,1,0).mask(osc(TAU,.25).scrollX(.25).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(0,1,0).mask(osc(TAU,.25).scrollX(.75).pixelate(1,1).thresh(.75,.1)))
.pixelate(1,1)
.color(1/width,1/height)
,25)
.out(o0)
