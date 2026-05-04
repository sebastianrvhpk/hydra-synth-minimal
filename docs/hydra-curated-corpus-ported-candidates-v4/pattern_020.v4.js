/*
Hydra curated corpus port candidate: pattern_020
Title: source block 20
Status: semantic port, not visually accepted.
Bucket: extension / staging

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
Final v3 pass + v4 buffer-normalized pass:
- shared helpers moved to shared-v3.js
- arrays are ported by intent: range, density, null/identity base, and motion character
- old exact-sequence helper emulation is intentionally removed
- callback parameters are replaced with compact signal helpers where possible
- status remains: review candidate, not visually accepted
*/

// Run shared-v4.js once before this patch.

shape(4,1,0).scale(.5,1,1,0,rn()).repeat(width/2,height/2).mult(ns(1,.1).thresh(.25-.5,.25))
.diff(shape(4,1,0).scale(.25,1,1,rn(),0).scrollX(0,.5).repeat(width/4,height/4).mult(ns(2,.1).thresh(.375-.5,.25)))
.diff(shape(4,1,0).scale(.125,1,1,1,rn()).repeat(width/8,height/8).mult(ns(3,.1).thresh(.5-.5,.25)))
.diff(shape(4,1,0).scale(.5,1,1,rn(),1).rotate(0,1).repeat(width/2,height/2).mult(ns(4,.1).thresh(.75-.5,.25)))

.out(o0)
