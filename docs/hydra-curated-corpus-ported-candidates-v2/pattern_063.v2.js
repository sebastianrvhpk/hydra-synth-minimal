/*
Hydra curated corpus port candidate: pattern_063
Title: source block 63
Status: semantic port, not visually accepted.
Bucket: memory-drift / non-ingress feedback

Port moves:
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

src(o0)
.diff(shape(width,1,0).scale(.125,1,1).diff(shape(width,1,0).scale(.125,1-16/width,1-16/height).mult(osc(Math.PI,1,1))))
.modulate(noise(.5,.5).blend(osc(Math.PI,1).brightness(-.5),.5).color(0,1/height),2)
.modulate(noise(.5,-.5).blend(osc(Math.PI,1).modulate(solid(1,0),1).brightness(-.5),.5).color(1/width,0),2)
.modulate(gradient().scale(1, (noise(.5,.5).blend(osc(Math.PI,1).brightness(-.5),.5).color(0,1/height)).r(2, 1), (noise(.5,.5).blend(osc(Math.PI,1).brightness(-.5),.5).color(0,1/height)).g(2, 1)).sub(gradient()), 1)
.modulate(gradient().scale(1, (noise(.5,-.5).blend(osc(Math.PI,1).modulate(solid(1,0),1).brightness(-.5),.5).color(1/width,0)).r(2, 1), (noise(.5,-.5).blend(osc(Math.PI,1).modulate(solid(1,0),1).brightness(-.5),.5).color(1/width,0)).g(2, 1)).sub(gradient()), 1)
.out(o0)
