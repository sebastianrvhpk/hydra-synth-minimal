/*
Hydra curated corpus port candidate: pattern_023
Title: source block 23
Status: semantic port, not visually accepted.
Bucket: portable core feedback

Port moves:
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

speed=.075
hush()
src(o0)
.modulate(gradient().brightness(-.5).rotate(Math.PI/2).pixelate(seqSignal(2, 4, 2, 0.25),seqSignal(2, 4, 2, 0.25)).scroll(.5,.5).color(1/width,1/height).repeat(seqSignal(1, 2, 4, 0.25),seqSignal(1, 2, 4, 0.25))
.mask(ns(1,1)),seqSignal(2, 4, 3, 0.25))
.modulateHue(src(o0).rotate(.01),-.5)
.layer(/*osc(10,.5,seqSignal(0, 1, 8, 0.25))*/osc(TAU*4,.125*10,1).mask(shape(400,1,0).scale(.025,A))
.modulate(solid()
.add(ns(.5,.5).color(1,0))
.add(ns(.5,.5).color(0,1)).pixelate(1,1)
.add(ns(.5,.5).color(1,0))
.add(ns(.5,.5).color(0,1))
.mask(ns(1,1))
,1)
.modulate(gradient().scale(1, (solid()
.add(ns(.5,.5).color(1,0))
.add(ns(.5,.5).color(0,1)).pixelate(1,1)
.add(ns(.5,.5).color(1,0))
.add(ns(.5,.5).color(0,1))
.mask(ns(1,1))).r(80, 1), (solid()
.add(ns(.5,.5).color(1,0))
.add(ns(.5,.5).color(0,1)).pixelate(1,1)
.add(ns(.5,.5).color(1,0))
.add(ns(.5,.5).color(0,1))
.mask(ns(1,1))).g(80, 1)).sub(gradient()), 1)
.mask(shape(4,1,0).scale(.5,1,1,0,0).repeat(width/2,height/2,oscSignal(0, 1, 0.05),seqSignal(0, 1, 8, 0.25)))
)
.out(o0)

//screencap()
