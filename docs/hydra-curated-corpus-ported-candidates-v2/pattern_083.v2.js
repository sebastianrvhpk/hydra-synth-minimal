/*
Hydra curated corpus port candidate: pattern_083
Title: source block 83
Status: semantic port, not visually accepted.
Bucket: portable core feedback

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
- T: preserve metric tiling and anchor math

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

shape(4,1,0).scale(.25,1,1,0,0).repeat(width/4,height/4).color(1,0,0)
.add(shape(4,1,0).scale(.25,1,1,0,0).repeat(width/4,height/4).color(0,1,0)
     .modulate(noise(3,1).color(1/width,0/height).add(noise(9,-1/3).color(0/width,1/height)).pixelate(1,1).mask(noise(22,-.1).pixelate(1,height).mask(noise(2,-.01)).thresh(0,0)),20))
.add(shape(4,1,0).scale(.25,1,1,0,0).repeat(width/4,height/4).color(0,0,1)
     .modulate(noise(3,-1).color(0/width,1/height).add(noise(9,1/3).color(1/width,0/height)).pixelate(1,1).mask(noise(22,.1).pixelate(width,1).mask(noise(2,.01)).thresh(0,0)),20))
.add(o0,.75).blend(o0,.625)
.rotate(.01)
.out(o0)

src(o0).mask(noise(7.5,.1).mask(noise(3,-.0375))/*.pixelate(8,8)*/.thresh(.25,0))
.out(o1)
render(o1)

src(o2)
.modulate(solid(0,0,0,0)
.add(solid(1,0),-2)
.add(noise(3,.1).color(0,1),1)
.add(noise(3,.125).color(1,0),1)
.modulate(gradient().scale(1, (osc(Math.PI*5,.1).pixelate(2,1)).r(10, 1), (osc(Math.PI*5,.1).pixelate(2,1)).g(10, 1)).sub(gradient()), 1)
.color(1/width,1/height)
,1)
.layer(src(o1).scrollX(0,-100/width).mask(shape(4,1,0).scale(1,2/width,1,0,.5).repeat(2,1)))
.out(o2)

render(o2)
