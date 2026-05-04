/*
Hydra curated corpus port candidate: pattern_081
Title: source block 81
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
Final v3 pass + v4 buffer-normalized pass:
- shared helpers moved to shared-v3.js
- arrays are ported by intent: range, density, null/identity base, and motion character
- old exact-sequence helper emulation is intentionally removed
- callback parameters are replaced with compact signal helpers where possible
- status remains: review candidate, not visually accepted
*/

// Run shared-v4.js once before this patch.

// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/
dx=rn(),dy=rn()
src(o0)//.add(o0,.01).mask(shape(4,1,0))
.layer(solid()

.diff(osc(Math.PI*.6,.0666,1).modulate(solid(dx*width,0),1).pixelate(1,1),1).add(osc(Math.PI*.2,.075,1).modulate(solid(dx*width,0),1).kaleid(60000),.5)
.diff(osc(Math.PI*6,.0666,1).modulate(solid(dy*width,0),1).pixelate(1,1),-.25).add(osc(TAU,.075,1).modulate(solid(dy*width,0),1).kaleid(60000),-.25)
.mask(shape(4,.001,0).rotate(0,Math.PI/4/1.5).scale(1, A, B)
.modulate(gradient().scale(1, (ns(4.5,0).pixelate(8,1).scrollX(0,1).pixelate(1,1).brightness(1)).r(500, 1), (ns(4.5,0).pixelate(8,1).scrollX(0,1).pixelate(1,1).brightness(1)).g(500, 1)).sub(gradient()), 1)
.mask(ns(4.5,0).pixelate(8,1).thresh(-.5,0).scrollX(0,1.75).pixelate(1,1))
.mask(shape(400,1,0).scale(.25/2,1,1,rn(),rn()).repeat(width/4/8,height/4/8,.5,0)
.modulate(osc(TAU,.1).color(0,1).add(osc(TAU,-.1).color(1,0))))
.mask(ns(.7,-2).thresh(0,0))
))
.modulate(gradient().rotate((ns(.3,.25)).r(Math.PI/360*2, 0)).sub(gradient()), 1)
.modulate(ns(.3,.25).color(.05,1).add(ns(.3,.25).color(1,.05)).color(1/width,1/height),2.5)
.modulateHue(o0,2)
.modulate(gradient().scale(1, (ns(.3,1).pixelate(16,4).scrollX(0,.125).pixelate(1,1).brightness(-2).color(1/width,1/height)).r(-5, 1), (ns(.3,1).pixelate(16,4).scrollX(0,.125).pixelate(1,1).brightness(-2).color(1/width,1/height)).g(-5, 1)).sub(gradient()), 1)
.diff(solid()).layer(src(o0).colorama(.00025).mask(ns(.3,1).thresh(.875,0)))

.out(o0)

src(o0).blend(src(o0).b().blend(src(o0).r(),wob(0, 1, 0.05)).contrast(2),wobc(0.75, 0.125, 0.05))
.out(o1)

src(o2)
.modulate(gradient().scale(.5,A).brightness(-.5).mult(noise(3,1).pixelate(8,7).add(solid(1,1),1)).color(2/width,2/height)
,-2)
.layer(src(o1).mask(shape(4,1,0).scale(.5,A)))
.out(o2)
render(o2)
//screencap()
