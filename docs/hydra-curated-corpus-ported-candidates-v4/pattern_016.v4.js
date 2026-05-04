/*
Hydra curated corpus port candidate: pattern_016
Title: source block 16
Status: semantic port, not visually accepted.
Bucket: staging / source construction

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
- G?: review gate role; hard gates for ingress, soft/luma only for other roles or intended legacy behavior
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

src(o0)
//.mask(shape(4,1-1/width,0))
.layer(osc(Math.PI*4,.1,1).mask(shape(4,.5,0).mask(shape(4,.4875,0).invert()).scale(1.25,1,.5)))
.modulate(solid(0,0,0,0)
.add(gradient().brightness(-.5).mult(noise(1,.5),1)
     .mask(osc(TAU,.25)
           .modulate(solid(1,0),0/8).thresh(.875,.125/3).pixelate(1,1)),5)
.add(osc(Math.PI*4,.25).brightness(-.5).color(0,1)
     .mask(osc(TAU)
           .modulate(solid(1,0),1/8).thresh(.875,.125/3).pixelate(1,1)),2)
.add(gradient().brightness(-.5).mult(noise(4,.5).kaleid(width),1)
     .mask(osc(TAU)
           .modulate(solid(1,0),2/8).thresh(.875,.125/3).pixelate(1,1)),5)
.add(gradient().brightness(-.5).rotate(Math.PI/2).pixelate(2,2)
     .mask(osc(TAU)
           .modulate(solid(1,0),3/8).thresh(.96375,.125/3).pixelate(1,1)),4)
/*.add(gradient().brightness(-.5).rotate(Math.PI/2,1).pixelate(2,2).repeat(2,2)
     .mask(osc(TAU)
           .modulate(solid(1,0),5/8).thresh(.96375,.125/3).pixelate(1,1)),1)
.add(noise(.5,1).color(1,0).pixelate(1,1)
     .mask(osc(TAU)
           .modulate(solid(1,0),6/8).thresh(.96375,.125/3).pixelate(1,1)),2)
.add(gradient().brightness(-.5).mult(noise(1,.5),1).blend(gradient().brightness(-.5).mult(noise(.3,-1).kaleid(width),1),.25)
     .mask(osc(TAU)
           .modulate(solid(1,0),7/8).thresh(.96375,.125/3).pixelate(1,1)),10)*/
.color(1/width,1/height)
,2)
.modulateHue(src(o0).hue(rng(0, 1, 8, 2, 0.05)).scale(1.025)
     .mask(osc(TAU)
           .modulate(solid(1,0),4/8).thresh(.5,.125/3).pixelate(1,1)),-2)
.modulate(gradient().scale(1, (src(o0).hue(rng(0, 1, 8, 2, 0.05)).scale(1.0125)
     .mask(osc(TAU)
           .modulate(solid(1,0),0/8).thresh(.5,.125/3).pixelate(1,1)).color(1/width,1/height)).r(10, 1), (src(o0).hue(rng(0, 1, 8, 2, 0.05)).scale(1.0125)
     .mask(osc(TAU)
           .modulate(solid(1,0),0/8).thresh(.5,.125/3).pixelate(1,1)).color(1/width,1/height)).g(10, 1)).sub(gradient()), 1)
.out(o0)
