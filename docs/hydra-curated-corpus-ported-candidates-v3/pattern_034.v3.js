/*
Hydra curated corpus port candidate: pattern_034
Title: source block 34
Status: semantic port, not visually accepted.
Bucket: staging / source construction

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback
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

function ns(f=2.5,v=0,dx=rn(),dy=rn()) {
  return noise(f,v).modulate(solid(1,0),wob(-1, 1, 0.05))
    .blend(noise(f,v).modulate(solid(0,1),wob(-1, 1, 0.05)),.5)
    .modulate(solid(width*dx,height*dy),1)
}
shape(4,1,0).scale(1,1/width,1/height)
.modulate(ns().color(1,0).blend(ns().color(0,1),.5).pixelate(1,1),1)
.add(o0,1)
.modulate(ns().color(1,0).blend(ns().color(0,1),.5).color(2/width,2/height),2)
.out(o0)
