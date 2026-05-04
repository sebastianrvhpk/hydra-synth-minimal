/*
Hydra curated corpus port candidate: pattern_074
Title: source block 74
Status: semantic port, not visually accepted.
Bucket: portable core feedback

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
- L/X: review global blend/diff/sub pressure; move into material before mask unless intentionally global
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

src(o0).add(o0,.01).mask(shape(4,1,0))
.layer(solid()
.add(osc(Math.PI*.6,.666,1).pixelate(1,1),1).add(osc(Math.PI*.2,.75,1).kaleid(60000),.5)
.add(osc(Math.PI*6,.666,1).pixelate(1,1),-.25).add(osc(TAU,.75,1).kaleid(60000),-.25)
.mask(shape(4,.001,0).scale(1, A, B)
.modulate(gradient().scale(1, (noise(4.5,0).pixelate(8,1).scrollX(0,1).pixelate(1,1).brightness(1)).r(500, 1), (noise(4.5,0).pixelate(8,1).scrollX(0,1).pixelate(1,1).brightness(1)).g(500, 1)).sub(gradient()), 1)
.mask(noise(4.5,0).pixelate(8,1).thresh(-.5,0).scrollX(0,1.75).pixelate(1,1))
.mask(shape(4,1,0).scale(.25,1,1,0,0).repeat(width/4,height/4))
.mask(noise(.7,-2).thresh(0,0))
))
.blend(src(o0)
.mask(shape(4,1,.01).scale(.25,1,1,0,0).repeat(width/4,height/4).invert())
,.5)
.modulate(gradient().rotate((noise(.3,.25)).r(Math.PI/360, 0)).sub(gradient()), 1)
.modulate(noise(1,1).color(.05,1).add(noise(1,1.25).color(1,.05)).color(1/width,1/height),2.5)
.modulateHue(o0,2)
.modulate(gradient().scale(1, (noise(4.5,0).pixelate(16,1).scrollX(0,.5).pixelate(1,1).color(1/width,1/height)).r(-20, 1), (noise(4.5,0).pixelate(16,1).scrollX(0,.5).pixelate(1,1).color(1/width,1/height)).g(-20, 1)).sub(gradient()), 1)
.layer(src(o0).colorama(.0025).mask(noise(.3,1).thresh(.5,0)))
.out(o0)
