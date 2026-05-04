/*
Hydra curated corpus port candidate: pattern_021
Title: source block 21
Status: semantic port, not visually accepted.
Bucket: portable core feedback

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
- L/X: review global blend/diff/sub pressure; move into material before mask unless intentionally global
- T: preserve metric tiling and anchor math
- R: preserve raster oscillator math

This file preserves authored behavior where automatic conversion would be risky.
Math-safe automated rewrites currently include:
- .out() -> .out(o0)
- modulateScrollX/Y(field, amount, speed?) -> explicit .modulate(...) pixel-step equivalent
- modulateRotate(field, multiple, offset) -> gradient().rotate(...).sub(gradient()) transform delta
- modulateScale(field, multiple, offset) -> gradient().scale(...).sub(gradient()) transform delta
*/

/*
Final v3 pass:
- shared helpers moved to shared-v3.js
- arrays are ported by intent: range, density, null/identity base, and motion character
- old exact-sequence helper emulation is intentionally removed
- callback parameters are replaced with compact signal helpers where possible
- status remains: review candidate, not visually accepted
*/

// Run shared-v3.js once before this patch.

// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/
speed=1
src(o0)
.modulate(gradient().scale(1, (ns(3,.025).mask(osc(TAU,1).kaleid(height/64).posterize(6,1).pixelate(2,2)).color(1,0)).r(.0125/2, 1), (ns(3,.025).mask(osc(TAU,1).kaleid(height/64).posterize(6,1).pixelate(2,2)).color(1,0)).g(.0125/2, 1)).sub(gradient()), 1)
.modulate(solid()
.add(osc(Math.PI*width/4,1/width).brightness(-.5).color(0,1/height),4)
.add(osc(Math.PI*width,1/width).thresh(.5,0).color(1/width,0).mask(ns(1,.1)),4)
,1)
.layer(ns(width/8,.25).rotate(.375).thresh(.75,0).pixelate(width/8,height/8).mult(osc(TAU,.25,1).color(1.25,.66,1.12).hue(.1).kaleid(width))
.mask(shape(4,1,0).scale(.125,1,1,0,0).repeat(width/8,height/8,.5))
)
.modulate(osc(TAU,.25).brightness(-.25).color(1,0),2/height)
.add(src(o0).modulate(osc(TAU,.25).invert().brightness(-.5).color(0,1),.25),.125/8/2)
.modulate(gradient().scale(1, (ns(3,.025).mask(osc(TAU,1).kaleid(height/64).posterize(6,1).pixelate(2,2)).color(0,1)).r(.0125/2, 1), (ns(3,.025).mask(osc(TAU,1).kaleid(height/64).posterize(6,1).pixelate(2,2)).color(0,1)).g(.0125/2, 1)).sub(gradient()), 1)
.out(o0)
//screencap()
