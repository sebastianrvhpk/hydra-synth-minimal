/*
Hydra curated corpus port candidate: pattern_072
Title: source block 72
Status: semantic port, not visually accepted.
Bucket: staging / source construction

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback
- N: normalize feedback displacement into pixel-step units where possible
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- C: callback/time controls retained as legacy controls; replace manually when porting for the no-callback grammar
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

shape(4,1,0).scale(.125/2,1,1,0,0).repeat(width/16,height/16,.5,0)
.modulate(gradient().rotate(0,1).repeat(width/16,height/16),seqSignal(0, 1, 8, 0.25))
.blend(o0,.25)
.out(o0)

src(o0).mask(noise(3,.1).pixelate(8,8).thresh(0,0))
.layer(shape(4,1,0).scale(.125/2,1,1,0,0).repeat(width/16,height/16,.5,0).mask(noise(3,.1).pixelate(8,8).thresh(0,0).invert()))
.out(o1)
render(o1)
