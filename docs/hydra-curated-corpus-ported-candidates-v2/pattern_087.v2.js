/*
Hydra curated corpus port candidate: pattern_087
Title: source block 87
Status: semantic port, not visually accepted.
Bucket: portable core feedback

Port moves:
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
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

shape(4,1,0).scale(.5,1,1,0,0).rotate(0,.1)
.repeat(width/4,height/2,.5,.125).rotate(0,.01)
.add(shape(4,1,0).scale(.5,1,1,1,1)
.repeat(width/2,height/2,.5,.25)).rotate(TAU*.1025)
.mult(noise(40,10).thresh(.875,0))
.modulate(solid(1/width,0),seqSignal(0, 8, 8, 0.25))
.diff(src(o2).mult(osc(TAU,.1).rotate(Math.PI/4)))
.out(o0)

src(o1)
.modulate(solid(1/width,0),-1)
.modulate(gradient().scale(1, (noise(1,1).color(1/width,1/height)).r(1, 1), (noise(1,1).color(1/width,1/height)).g(1, 1)).sub(gradient()), 1)
.layer(src(o0).mask(shape(4,1,0).scale(1,1/width,1,0)))
.out(o1)

src(o1).modulate(gradient().scale(1, (noise(.3,.5)).r(4, 1), (noise(.3,.5)).g(4, 1)).sub(gradient()), 1)
.add(src(o1).modulate(gradient().scale(1, (noise(3,.25)).r(4, 1), (noise(3,.25)).g(4, 1)).sub(gradient()), 1))
.add(src(o1).modulate(gradient().scale(1, (noise(1,.3)).r(4, 1), (noise(1,.3)).g(4, 1)).sub(gradient()), 1))
.blend(o2,.5)
.out(o2)
render(o1)
