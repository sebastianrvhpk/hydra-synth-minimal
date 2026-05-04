/*
Hydra curated corpus port candidate: pattern_025
Title: source block 25
Status: semantic port, not visually accepted.
Bucket: portable core feedback

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
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
Second pass:
- shared helpers moved to shared-v2.js
- Hydra array sequences converted to quantized texture-valued seqSignal(...)
- callback parameters converted to signal helpers where possible
- status remains: review candidate, not visually accepted
*/

// Run shared-v2.js once before this patch.

function ns(f=1.5,v=0,dx=rn(),dy=rn()) {
  return noise(f,v).color(0,1,0).modulate(solid(1,0),oscSignal(-1, 1, 0.05))
    .add(noise(f,v).color(1,0,0).modulate(solid(1,0),1).modulate(solid(0,1),seqSignal(0, 1, 8, 0.25)),1)
    .modulate(solid(width*dx,height*dy),1)
}
src(o0)
.layer(osc(Math.PI*4,1,1).pixelate(1,1).layer(solid(1,1,1)).mask(shape(4,1,0).scale(1,1/width,1/height)
.modulate(solid()
.add(gradient().brightness(-.5).pixelate(2,2),seqSignal(0, 1, 8, 0.25))
//.add(gradient().brightness(-.5).pixelate(2,2).repeat(2,2),-1/2)
//.add(gradient().brightness(-.5).pixelate(2,2).repeat(4,4),-1/4)
,1)
)
.modulate(ns().pixelate(1,1).color(1/width,1/height),height/4))
.modulate(ns().pixelate(1,1).color(1/width,1/height),height/fps)
.out(o0)
//screencap()
