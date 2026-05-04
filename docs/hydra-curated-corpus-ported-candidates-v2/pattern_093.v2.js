/*
Hydra curated corpus port candidate: pattern_093
Title: source block 93
Status: semantic port, not visually accepted.
Bucket: memory-drift / non-ingress feedback

Port moves:
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- G?: review gate role; hard gates for ingress, soft/luma only for other roles or intended legacy behavior
- L/X: review global blend/diff/sub pressure; move into material before mask unless intentionally global

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

src(o0)
.mask(shape(4,1-1/width,0))
.diff(solid(1,1,1).mask(shape(4,.5,0).diff(shape(4,.4875,0))))
.modulate(solid(0,0,0,0)
.add(gradient().brightness(-.5).mult(noise(1,.5),1)
     .mask(osc(TAU)
           .modulate(solid(1,0),0/8).thresh(.96375,.125).pixelate(1,1)),10)
.add(osc(Math.PI*4).brightness(-.5).color(0,1)
     .mask(osc(TAU)
           .modulate(solid(1,0),1/8).thresh(.96375,.125).pixelate(1,1)),4)
.add(gradient().brightness(-.5).mult(noise(3,1).kaleid(width),1)
     .mask(osc(TAU)
           .modulate(solid(1,0),2/8).thresh(.96375,.125).pixelate(1,1)),10)
.add(gradient().brightness(-.5).rotate(Math.PI/2).pixelate(2,2)
     .mask(osc(TAU)
           .modulate(solid(1,0),3/8).thresh(.96375,.125).pixelate(1,1)),4)
.add(gradient().brightness(-.5).rotate(Math.PI/2).pixelate(2,2).repeat(2,2)
     .mask(osc(TAU)
           .modulate(solid(1,0),4/8).thresh(.96375,.125).pixelate(1,1)),-2)
.add(gradient().brightness(-.5).rotate(Math.PI/2,1).pixelate(2,2).repeat(2,2)
     .mask(osc(TAU)
           .modulate(solid(1,0),5/8).thresh(.96375,.125).pixelate(1,1)),1)
.add(noise(.5,1).color(1,0).pixelate(1,1)
     .mask(osc(TAU)
           .modulate(solid(1,0),6/8).thresh(.96375,.125).pixelate(1,1)),2)
.add(gradient().brightness(-.5).mult(noise(1,.5),1).blend(gradient().brightness(-.5).mult(noise(.3,-1).kaleid(width),1),.25)
     .mask(osc(TAU)
           .modulate(solid(1,0),7/8).thresh(.96375,.125).pixelate(1,1)),10)
.color(1/width,1/height),2)
.out(o0)
