/*
Hydra curated corpus port candidate: pattern_039
Title: source block 39
Status: semantic port, not visually accepted.
Bucket: staging / source construction

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- C: callback/time controls retained as legacy controls; replace manually when porting for the no-callback grammar

This file preserves authored behavior where automatic conversion would be risky.
Math-safe automated rewrites currently include:
- .out() -> .out(o0)
- modulateScrollX/Y(field, amount, speed?) -> explicit .modulate(...) pixel-step equivalent
- modulateRotate(field, multiple, offset) -> gradient().rotate(...).sub(gradient()) transform delta
- modulateScale(field, multiple, offset) -> gradient().scale(...).sub(gradient()) transform delta
*/

/*
Final v3 pass + v4 buffer-normalized pass:
- shared helpers moved to shared-v3.js
- arrays are ported by intent: range, density, null/identity base, and motion character
- old exact-sequence helper emulation is intentionally removed
- callback parameters are replaced with compact signal helpers where possible
- status remains: review candidate, not visually accepted
*/

// Run shared-v4.js once before this patch.

function ns(f=.375,v=0,dx=rn(),dy=rn()) {
  return noise(f,v).modulate(solid(1,0),wob(-1, 1, 0.05)).color(0,1)
    .add(noise(f,v).modulate(solid(1,0),1).modulate(solid(0,1),wob(-1, 1, 0.05)).color(1,0),1)
    .modulate(solid(width*dx,height*dy),1)
}
speed=.25
shape(4,1,0).scale(1,1/width,1/height)
.modulate(solid()
.add(gradient().brightness(-.5).pixelate(2,2),-1)
.add(gradient().brightness(-.5).pixelate(2,2).repeat(2,2),-1/2)
.add(gradient().brightness(-.5).pixelate(2,2).repeat(4,4),-1/4)
//.add(gradient().brightness(-.5).pixelate(2,2).repeat(8,8),-1/8)
,1)
.modulate(ns(1).pixelate(8,8),.025)
//.diff(noise(3,0).pixelate(2,2))
.add(o0,1)
.out(o0)
//screencap()
