/*
Hydra curated corpus port candidate: pattern_086
Title: source block 86
Status: semantic port, not visually accepted.
Bucket: extension / staging

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback
- N: normalize feedback displacement into pixel-step units where possible
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
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

osc(TAU,.1,1)
.rotate(3/Math.PI)
.kaleid(4)
.modulate(osc(TAU,.1,1))
.rotate(-7/TAU,1)
.kaleid()
.modulateKaleid(osc(Math.PI*4,.25,Math.PI/2).rotate(7/TAU*0).rotate(Math.PI/8).pixelate(2,2),2,4)
//.kaleid(6)
.out(o0)
