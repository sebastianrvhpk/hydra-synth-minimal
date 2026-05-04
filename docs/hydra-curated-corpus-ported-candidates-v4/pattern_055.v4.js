/*
Hydra curated corpus port candidate: pattern_055
Title: source block 55
Status: semantic port, not visually accepted.
Bucket: legacy feedback / conceptual port

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
- L/X: review global blend/diff/sub pressure; move into material before mask unless intentionally global
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
Final v3 pass + v4 buffer-normalized pass:
- shared helpers moved to shared-v3.js
- arrays are ported by intent: range, density, null/identity base, and motion character
- old exact-sequence helper emulation is intentionally removed
- callback parameters are replaced with compact signal helpers where possible
- status remains: review candidate, not visually accepted
*/

// Run shared-v4.js once before this patch.

shape(4,1,0).modulate(src(o0).color(0,1),wob(-1, 1, 0.05))
.scale(.125,1,1,0,0).repeat(width/8,height/8).modulate(noise(.6,.1).color(0,1).hue(rng(-1, 0, 8, 2, 0.05)).posterize(4,1).hue(rng(0, 1, 8, 2, 0.05)).blend(noise(2,.25).color(1,0),.025).scale(1,.4,1,rn()).rotate(0,1).pixelate(width/8,height/8),.5)
.add(o0,.875)
.scroll(1/width,1/height)
.modulate(gradient().scale(1, (src(o0).color(1/width,0/height)).r(2, 1), (src(o0).color(1/width,0/height)).g(2, 1)).sub(gradient()), 1)
.modulate(src(o0).color(0/width,1/height),1)
.out(o0)
