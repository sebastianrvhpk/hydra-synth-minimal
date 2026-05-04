/*
Hydra curated corpus port candidate: pattern_003
Title: source block 3
Status: semantic port, not visually accepted.
Bucket: memory-drift / non-ingress feedback

Port moves:
- N: normalize feedback displacement into pixel-step units where possible
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- G?: review gate role; hard gates for ingress, soft/luma only for other roles or intended legacy behavior
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

src(o1)
.diff(shape(4, .0075, 0).modulate(osc(4, 1).pixelate(1, 1).brightness(-.5).color(0, 1)).scale(1, A, B).luma())
.modulate(gradient().brightness(-.5).pixelate(2, 2), seqSignal(-0.0125, -0.0075, 5, 2))
.out(o1);

src(o2)
.diff(shape(4, .015, 0).mask(noiseloop(62, 1, 2)).scale(1, A, B).luma())
.modulate(gradient().brightness(-.5).pixelate(2, 2), -.0125)
.out(o2);

solid()
.diff(o1)
.out(o3);

render(o3);
