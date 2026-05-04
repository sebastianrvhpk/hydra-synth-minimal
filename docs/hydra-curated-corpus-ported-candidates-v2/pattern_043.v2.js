/*
Hydra curated corpus port candidate: pattern_043
Title: source block 43
Status: semantic port, not visually accepted.
Bucket: staging / source construction

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
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

shape(4,1,0).scale(1,1/width,1/height)
.modulate(osc(TAU,.25).brightness(-.5).color(1,0).pixelate(1,1),.5)
.rotate(0,Math.PI/5)
.modulate(osc(TAU,.25).scrollX(.25).brightness(-.5).color(0,1).pixelate(1,1),.5)
.add(src(o0).blend(o0,.25),1)
.modulate(gradient().brightness(-.5).pixelate(2,2).color(1/width,1/height),-4)
.diff(o0)
//.diff(shape(4,1,0).scale(.5,1,1,1,0).repeat(width/2,height/2,0,.5))
.out(o0)
