/*
Hydra curated corpus port candidate: pattern_046
Title: source block 46
Status: semantic port, not visually accepted.
Bucket: staging / source construction

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension

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

speed=.375
shape(4,1,0)
.scale(2,1/width,1/height)
.modulate(gradient().scale(1, (ns(30,1).rotate(0,1).pixelate(2,2).thresh(.5,0).color(1,0)).r(width, 1), (ns(30,1).rotate(0,1).pixelate(2,2).thresh(.5,0).color(1,0)).g(width, 1)).sub(gradient()), 1)
.modulate(gradient().scale(1, (ns(30,1).rotate(0,1).pixelate(2,2).thresh(.5,0).color(0,1)).r(height, 1), (ns(30,1).rotate(0,1).pixelate(2,2).thresh(.5,0).color(0,1)).g(height, 1)).sub(gradient()), 1)
.modulate(gradient().brightness(-.5).mask(ns(30,1).rotate(0,1).pixelate(1,1).thresh(.5,0)).mask(ns(13,0).pixelate(4,1).scrollX(0,1).pixelate(1,1)).modulate(ns(4,1).color(0,1).pixelate(2,4),1),-1)
.repeat(2,2).mult(osc(TAU,.5,1).pixelate(1,1))
.blend(src(o0).add(src(o0).modulate(ns(3,1).pixelate(9,9).color(1,0).add(ns(3,1).pixelate(13,13).color(0,1)).color(1/width,1/height),25).mask(ns(width,1/width).thresh(0,0)),.75),.5)
.modulate(ns(3,1).pixelate(7,7).color(1,0).add(ns(3,1).pixelate(5,5).color(0,1)).color(1/width,1/height),5)
.diff(src(o0).add(src(o0).pixelate(width/32,height/32),.125).scrollX(1/width).add(src(o0).scrollY(1/height),.05))
//.rotate(1/width)
.mask(ns(width,0).thresh(-.875,0))
.out(o0)
