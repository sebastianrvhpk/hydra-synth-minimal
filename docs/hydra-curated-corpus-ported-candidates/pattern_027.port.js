/*
Hydra curated corpus port candidate: pattern_027
Title: source block 27
Status: semantic port, not visually accepted.
Bucket: portable core feedback

Port moves:
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
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


shape(4,()=>(time/120)%1*.025,.001).rotate(0,-.0075).repeat(4,4,.25,.25).rotate(0,.0888).repeat(4,2,.25,.5).rotate(0,.01).repeat(16,16)
.modulate(gradient().scale(1, (noise(3,1).thresh(0,0)).r(()=>(time/120)%1*8, 1), (noise(3,1).thresh(0,0)).g(()=>(time/120)%1*8, 1)).sub(gradient()), 1)
.modulate(o2)
.out(o0)

src(o1)
.modulate(solid(0,2).add(noise(1,.1).brightness(1).pixelate(1,height),.5)
.color(0,1),-1/height)
.layer(src(o0).scrollX(0,1).mask(shape(4,1,0).scale(1,2/width).scrollX(.5)))
.layer(src(o0).mask(noise(10,1).thresh(.5,0)))
.out(o1)

src(o1).mult(noise(1000).thresh(-.25,0))
.modulate(gradient().scale(1, (osc(Math.PI*5,.081021).pixelate(1,1)
.diff(osc(Math.PI*4,.071275))
.modulate(gradient().scale(1, (osc(Math.PI*3,.01).pixelate(1,1)
.diff(osc(TAU,.075))).r(1, 1), (osc(Math.PI*3,.01).pixelate(1,1)
.diff(osc(TAU,.075))).g(1, 1)).sub(gradient()), 1).color(0,1).mask(noise(6,.025).scale(1,4).pixelate(8,8).thresh(0,0))).r(1, 1), (osc(Math.PI*5,.081021).pixelate(1,1)
.diff(osc(Math.PI*4,.071275))
.modulate(gradient().scale(1, (osc(Math.PI*3,.01).pixelate(1,1)
.diff(osc(TAU,.075))).r(1, 1), (osc(Math.PI*3,.01).pixelate(1,1)
.diff(osc(TAU,.075))).g(1, 1)).sub(gradient()), 1).color(0,1).mask(noise(6,.025).scale(1,4).pixelate(8,8).thresh(0,0))).g(1, 1)).sub(gradient()), 1)
.add(o2,()=>(time/120)%1*.875)
.modulate(gradient().brightness(-.5).repeat(16,16).mask(noise(5,.01).brightness(()=>Math.sin(time/30)).pixelate(8,8)).color(1/width,1/height),()=>time<=90?(time/(90))*200:200)
.out(o2)

render(o2)
