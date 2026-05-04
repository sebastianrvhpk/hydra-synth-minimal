/*
Hydra curated corpus port candidate: pattern_012
Title: source block 12
Status: semantic port, not visually accepted.
Bucket: legacy feedback / conceptual port

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
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

setResolution(width / 2, height / 2);

solid()
.add(o0)
.diff(shape(4, .25, 0).mask(shape(4, .25, 0).invert().scale(1, 1 - 5 / width, 1 - 5 / height)).modulate(gradient().scale(1, (ns(3, 1, .75).pixelate(10, 10).scrollX(0, .5).pixelate(1, 1)).r(2, 1), (ns(3, 1, .75).pixelate(10, 10).scrollX(0, .5).pixelate(1, 1)).g(2, 1)).sub(gradient()), 1).modulate(ns(3, .25, .75).color(1, 0).add(ns(3, .25, .75).color(0, 1)).pixelate(1, 1), .5))
.modulate(solid().add(shape(4, .5, 0).modulate(gradient().scale(1, (ns(3, .25, .75).color(1, 0).add(ns(3, .25, .75).color(0, 1)).pixelate(1, 1)).r(1, 1), (ns(3, .25, .75).color(1, 0).add(ns(3, .25, .75).color(0, 1)).pixelate(1, 1)).g(1, 1)).sub(gradient()), 1).modulate(ns(3, .25, .75).color(1, 0).add(ns(3, .25, .75).color(0, 1)).pixelate(1, 1), .5).color(1, 0, 0)).add(shape(4, .5, 0).modulate(gradient().scale(1, (ns(3, .25, .75).color(1, 0).add(ns(3, .25, .75).color(0, 1)).pixelate(1, 1)).r(1, 1), (ns(3, .25, .75).color(1, 0).add(ns(3, .25, .75).color(0, 1)).pixelate(1, 1)).g(1, 1)).sub(gradient()), 1).modulate(ns(3, .25, .75).color(1, 0).add(ns(3, .25, .75).color(0, 1)).pixelate(1, 1), .5).color(0, 1, 0)).color(1 / width, 1 / height), 10)
.modulate(src(o0).color(1 / width, 1 / height), 1)
.diff(o0)
.out(o0);
