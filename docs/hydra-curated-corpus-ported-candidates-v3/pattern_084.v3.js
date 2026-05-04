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

/*
Final v3 pass:
- shared helpers moved to shared-v3.js
- arrays are ported by intent: range, density, null/identity base, and motion character
- old exact-sequence helper emulation is intentionally removed
- callback parameters are replaced with compact signal helpers where possible
- status remains: review candidate, not visually accepted
*/

// Run shared-v3.js once before this patch.

function nst(f, v, t, x = rn(), y = rn()) {
  return ns(f, v, x, y).thresh(t, 0)
}
function nstpx(f, v, t, pxx, pxy = pxx, x = rn(), y = rn()) {
  return nst(f, v, t, x, y).pixelate(pxx / A, pxy)
}

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
