/*
Hydra curated corpus port candidate: pattern_041
Title: source block 41
Status: semantic port, not visually accepted.
Bucket: portable core feedback

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
- G?: review gate role; hard gates for ingress, soft/luma only for other roles or intended legacy behavior
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

// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/
speed=1
src(o0)
.layer(shape(4,.25,.0125).scale(1,.5).mult(osc(TAU,.25,1)).repeat(width/8,height/4,.5).mask(ns(width/4,1).thresh(.5,0).pixelate(width/4,height/2))
.mask(shape(4,1,0).scale(.125,1,1,0,0).scroll(.125/2,.125/2).scrollX(0,-.25).scrollY(0,-.25/8).pixelate(8,8).repeat(2,2)))
.scrollX(-1/width)
.modulate(osc(Math.PI*width/32,32/width).rotate(Math.PI/2).kaleid(width).thresh(.5,.125).color(1/width,0).rotate(Math.PI/-
                                                                                               2).mask(osc(Math.PI*width/8,1/width).rotate(Math.PI/2)).pixelate(width/8,height/4),4)
.modulate(osc(Math.PI*width/8,2/width).brightness(-.5).pixelate(width/16,height).color(0,1/height),2)
.modulateHue(o0,1)
.out(o0)
