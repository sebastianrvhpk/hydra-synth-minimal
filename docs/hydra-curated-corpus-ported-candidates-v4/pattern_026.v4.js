/*
Hydra curated corpus port candidate: pattern_026
Title: source block 26
Status: semantic port, not visually accepted.
Bucket: portable core feedback

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
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

speed=.5
hush()
src(o0)
.modulate(gradient().brightness(-.5).rotate(Math.PI/2).pixelate(rng(2, 4, 2, 2, 0.01),rng(2, 4, 2, 2, 0.01)).scroll(.5,.5).color(1/width,1/height).repeat(hit(1, 1, 0.6, 1, 0.01),hit(1, 1, 0.6, 1, 0.01))
.mask(ns(1,1)),hit(2, 2, 0.35, 1, 0.01))
.modulateHue(src(o0).rotate(.01),-.5)
.layer(/*osc(10,.5,rng(0, 1, 8, 2, 0.05))*/osc(TAU*4,.125*10,1).mask(shape(400,1,0).scale(.025,A))
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
.mask(shape(4,1,0).scale(.5,1,1,0,0).repeat(width/2,height/2,wob(0, 1, 0.05),wob(0, 1, 0.05)))
)
.diff(solid())
.out(o0)

//screencap()
