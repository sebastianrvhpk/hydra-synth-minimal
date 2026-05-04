/*
Hydra curated corpus port candidate: pattern_064
Title: source block 64
Status: semantic port, not visually accepted.
Bucket: portable core feedback

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
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


ns=(scl=1,tm=1,freq=3)=>noise(freq,0).modulate(solid(rn()*width,rn()*height),1).scroll(()=>Math.sin(time*tm*.5)*scl*.5,()=>Math.cos(time*tm*.5)*scl*.5)

src(o0).diff(solid())
.layer(src(o1).mask(shape(5000,1,0).scale(.01,A)
.modulate(solid()
.add(ns(.15,4).color(1,0))
.add(ns(.15,8).color(0,1))
.add(ns(.25,4).color(1,0))
.add(ns(.25,8).color(0,1))
.pixelate(1,1)
,.25)))
.modulate(solid()
.add(ns(.15,1).color(1,0))
.add(ns(.15,1).color(0,1))
.add(ns(.25,1).color(1,0))
.add(ns(.25,1).color(0,1))
.pixelate(1,1)
.color(1/width,1/height),10)
.modulate(gradient().scale(1, (ns(.03,.01,10).color(1/width,1/height).pixelate(8,8).mask(ns(.25,1,10).pixelate(10,10).thresh(0,0))).r(10, 1), (ns(.03,.01,10).color(1/width,1/height).pixelate(8,8).mask(ns(.25,1,10).pixelate(10,10).thresh(0,0))).g(10, 1)).sub(gradient()), 1)
.out(o0)

solid(0,0,0)
.add(osc(TAU,1).modulate(solid(Math.PI,0),2).color(1,0,0).rotate((rn()-.5)*.0005))
.add(osc(TAU,1).modulate(solid(Math.PI,0),1).color(0,1,0).rotate((rn()-.5)*.0005))
.add(osc(TAU,1).modulate(solid(Math.PI,0),0).color(0,0,1).rotate((rn()-.5)*.0005))
.modulate(solid(rn()*width,rn()*height),1)
.pixelate(width,1)
.scale(1,1/A).rotate(0,Math.PI/2).scale(1, A, B)
.kaleid(2).scale(1, A, B).scrollY(0,.1).scale(1,1/A).rotate(0,1).scale(1, A, B).kaleid(5000).scale(1, A, B)
.modulate(gradient().scale(1, (shape(5000,0,1).scale(1, A, B)).r(()=>Math.sin(time)*.9875, 1), (shape(5000,0,1).scale(1, A, B)).g(()=>Math.sin(time)*.9875, 1)).sub(gradient()), 1)
.out(o1)

//screencap()
