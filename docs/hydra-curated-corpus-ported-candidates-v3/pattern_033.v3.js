/*
Hydra curated corpus port candidate: pattern_033
Title: source block 33
Status: semantic port, not visually accepted.
Bucket: portable core feedback

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
- C: callback/time controls retained as legacy controls; replace manually when porting for the no-callback grammar

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

function ns(f=.75,v=0,dx=rn(),dy=rn()) {
  return noise(f,v).modulate(solid(1,0),wob(-1, 1, 0.05))
    .blend(noise(f,v).modulate(solid(width,0),.5).modulate(solid(0,1),wob(-1, 1, 0.05)),.5)
    .modulate(solid(width*dx,height*dy),1)
}
function nspx(xpx=1,ypx=1) {
  return ns().color(1,0).add(ns().color(0,1),1).pixelate(xpx,ypx)
}
src(o0)
.layer(osc(TAU,.5,1).kaleid(height)
.mask(shape(4,1,0).scale(1,1/width,1/height)
.modulate(nspx(),.5)))
.modulate(nspx(2,2).color(1/width,1/height),2)
.out(o0)
