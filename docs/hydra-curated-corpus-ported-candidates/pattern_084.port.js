/*
Hydra curated corpus port candidate: pattern_084
Title: source block 84
Status: semantic port, not visually accepted.
Bucket: staging / source construction

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback
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


nst=(f,v,t,x=rn(),y=rn())=>ns(f,v,x,y).thresh(t,0),nstpx=(f,v,t,pxx,pxy=pxx,x=rn(),y=rn())=>nst(f,v,t,x,y).pixelate(pxx/A,pxy)

nstpx(13,.1,.125,8,19)
.diff(nstpx(13,.2,.125,5,1))
.mask(nstpx(13,.3,.125,18,9))
.mask(nstpx(13,.5,.125,24,35))//.scrollY(0,.025))
.mask(nstpx(13,.7,.125,7))
.modulate(gradient().scale(1, (nstpx(13,1,.125,15,15)).r(-1, 1), (nstpx(13,1,.125,15,15)).g(-1, 1)).sub(gradient()), 1)
.out(o0)

src(o0)
.diff(src(o0).scroll(rn(),rn()).rotate(rn()*TAU).pixelate(4,4)
.diff(src(o0).scroll(rn(),rn()).rotate(rn()*TAU).pixelate(3,3)
.mask(src(o0).scroll(rn(),rn()).rotate(rn()*TAU).pixelate(2,2)
.mask(src(o0).scroll(rn(),rn()).rotate(rn()*TAU).pixelate(1,1)))))
.mask(shape(4,1,0).scale(.5,1,1,0,0).repeat(width/2,height/2,0,.5))
.out(o1)

render(o1)
