/*
Hydra curated corpus port candidate: pattern_056
Title: source block 56
Status: semantic port, not visually accepted.
Bucket: memory-drift / non-ingress feedback

Port moves:
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- L/X: review global blend/diff/sub pressure; move into material before mask unless intentionally global

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
.diff(shape(4,1,0).scale(2,1/width,1/height))
.modulate(shape(1,-1,2).scrollY(0,1).pixelate(1,1).mult(gradient().pixelate(2,2).brightness(-.5)).color(1/width,1/height),-height/8)
.out(o0)
