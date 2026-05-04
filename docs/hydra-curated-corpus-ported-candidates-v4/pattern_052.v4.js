/*
Hydra curated corpus port candidate: pattern_052
Title: source block 52
Status: semantic port, not visually accepted.
Bucket: already close to current core

Port moves:
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
Final v3 pass + v4 buffer-normalized pass:
- shared helpers moved to shared-v3.js
- arrays are ported by intent: range, density, null/identity base, and motion character
- old exact-sequence helper emulation is intentionally removed
- callback parameters are replaced with compact signal helpers where possible
- status remains: review candidate, not visually accepted
*/

// Run shared-v4.js once before this patch.

// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/
src(o0)
.modulate(osc(TAU,.075).thresh(.5,.375).brightness(-.5).color(1,0).add(osc(TAU,.075).scrollX(.25).thresh(.5,.375).brightness(-.5).color(0,1)).pixelate(1,1).color(1/width,1/height),2)
.layer(osc(Math.PI*width*Math.cos(Math.PI/-4)/2,2/width,1.25).rotate(Math.PI/-4).kaleid(width/32)//.mask(ns().thresh(0,0))
.mask(shape(4,1,0).scale(1/8,1,1,0,0)
.repeat(width/8,height/8*2,.5)))
.modulate(gradient().brightness(-.5).pixelate(2,2).repeat(8,8).mult(ns(3,.1).pixelate(8,8).thresh(.25,.125)).color(1/width,1/height),4)
.out(o0)
