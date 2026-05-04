/*
Hydra curated corpus port candidate: pattern_023
Title: source block 23
Status: semantic port, not visually accepted.
Bucket: portable core feedback

Port moves:
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
- C: callback/time controls retained as legacy controls; replace manually when porting for the no-callback grammar
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


speed=.075
hush()
src(o0)
.modulate(gradient().brightness(-.5).rotate(Math.PI/2).pixelate([2,4],[2,4]).scroll(.5,.5).color(1/width,1/height).repeat([1,1,2,1],[1,1,2,1])
.mask(ns(1,1)),[2,2,4])
.modulateHue(src(o0).rotate(.01),-.5)
.layer(/*osc(10,.5,()=>time/5)*/osc(TAU*4,.125*10,1).mask(shape(400,1,0).scale(.025,A))
.modulate(solid()
.add(ns(.5,.5).color(1,0))
.add(ns(.5,.5).color(0,1)).pixelate(1,1)
.add(ns(.5,.5).color(1,0))
.add(ns(.5,.5).color(0,1))
.mask(ns(1,1))
,1)
.modulate(gradient().scale(1, (solid()
.add(ns(.5,.5).color(1,0))
.add(ns(.5,.5).color(0,1)).pixelate(1,1)
.add(ns(.5,.5).color(1,0))
.add(ns(.5,.5).color(0,1))
.mask(ns(1,1))).r(80, 1), (solid()
.add(ns(.5,.5).color(1,0))
.add(ns(.5,.5).color(0,1)).pixelate(1,1)
.add(ns(.5,.5).color(1,0))
.add(ns(.5,.5).color(0,1))
.mask(ns(1,1))).g(80, 1)).sub(gradient()), 1)
.mask(shape(4,1,0).scale(.5,1,1,0,0).repeat(width/2,height/2,()=>Math.sin(time/2)/2+.5,()=>Math.cos(time/2)/2+.5))
)
.out(o0)

//screencap()
