/*
Hydra curated corpus port candidate: pattern_073
Title: source block 73
Status: semantic port, not visually accepted.
Bucket: already close to current core

Port moves:
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- T: preserve metric tiling and anchor math
- R: preserve raster oscillator math

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
.modulate(osc(Math.PI*width/4,1/width).brightness(-.5).add(ns(.3,.025),.25).color(0,1/height),4)
.modulate(solid(2/width,0).mask(osc(Math.PI*width,1/width).thresh(.5,0)),1)
.layer(ns(width/8,.25).rotate(.375).thresh(.75,0).pixelate(width/2,height/2).mult(osc(Math.PI,.25,1).kaleid(width))
.mask(shape(4,1,0).scale(.25,1,1,0,0).repeat(width/4,height/4,.5)))
.out(o0)
