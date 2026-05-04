/*
Hydra curated corpus port candidate: pattern_088
Title: source block 88
Status: semantic port, not visually accepted.
Bucket: staging / source construction

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback
- G?: review gate role; hard gates for ingress, soft/luma only for other roles or intended legacy behavior
- T: preserve metric tiling and anchor math

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

shape(4,1,0).scale(.5,1,1,0,rn()).invert().scrollY(0,.25).repeat(width/2,height/2,rn(),rn()).diff(o0).mult(ns(1,.1).thresh(.25-.5,.25))
.diff(shape(4,1,0).scale(.25,1,1,rn(),0).scrollX(0,.05).repeat(width/4,height/4,rn(),rn()).mult(ns(1.25,.1).thresh(.375-.5,.25)))
.diff(shape(4,1,0).scale(.125,1,1,1,rn()).repeat(width/8,height/8,rn(),rn()).mult(ns(.5,.1).thresh(.5-.5,.25)))
.diff(shape(4,1,0).scale(.5,1,1,rn(),1).rotate(0,1).repeat(width/2,height/2,rn(),rn()).mult(ns(1.75,.1).thresh(.75-.5,.25)))
//.diff(src(o0).mask(ns(Math.PI/4,.05).pixelate(8,8).thresh(.5,0)))
//.blend(src(o0).modulate(solid(1/width,1/height).mult(osc(TAU,.1).brightness(-.5).contrast(2)),-1),.875)
.blend(o0,.75)
.out(o0)
