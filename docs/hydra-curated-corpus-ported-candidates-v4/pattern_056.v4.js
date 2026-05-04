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
Final v3 pass + v4 buffer-normalized pass:
- shared helpers moved to shared-v3.js
- arrays are ported by intent: range, density, null/identity base, and motion character
- old exact-sequence helper emulation is intentionally removed
- callback parameters are replaced with compact signal helpers where possible
- status remains: review candidate, not visually accepted
*/

// Run shared-v4.js once before this patch.

src(o0)
.diff(shape(4,1,0).scale(2,1/width,1/height))
.modulate(shape(1,-1,2).scrollY(0,1).pixelate(1,1).mult(gradient().pixelate(2,2).brightness(-.5)).color(1/width,1/height),-height/8)
.out(o0)
