/*
Hydra curated corpus port candidate: pattern_042
Title: source block 42
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
Final v3 pass + v4 buffer-normalized pass:
- shared helpers moved to shared-v3.js
- arrays are ported by intent: range, density, null/identity base, and motion character
- old exact-sequence helper emulation is intentionally removed
- callback parameters are replaced with compact signal helpers where possible
- status remains: review candidate, not visually accepted
*/

// Run shared-v4.js once before this patch.

shape(4,1,0).scale(1,1/width,1/height)
.modulate(osc(TAU,.25).brightness(-.5).color(1,0).pixelate(1,1),.5)
.rotate(0,Math.PI/5)
.modulate(osc(TAU,.25).scrollX(.25).brightness(-.5).color(0,1).pixelate(1,1),.5)
.add(src(o0).blend(o0,.25).color(1-1/width,1-1/height),1)
.modulate(gradient().brightness(-.5).pixelate(2,2).color(1/width,1/height),-4)
.diff(o0)
//.diff(shape(4,1,0).scale(.5,1,1,1,0).repeat(width/2,height/2,0,.5))
.out(o0)

shape(4,1,0).scale(1,1/width,1/height)
.modulate(osc(TAU,.25).brightness(-.5).color(1,0).pixelate(1,1),.5)
.rotate(0,Math.PI/5)
.modulate(osc(TAU,.25).scrollX(.25).brightness(-.5).color(0,1).pixelate(1,1),.5)
.add(src(o1).blend(o1,.25),1)
.modulate(gradient().brightness(-.5).pixelate(2,2).color(1/width,1/height),-4)
.diff(src(o1)
.diff(shape(4,1,0).scale(.5,1,1,0,0).repeat(width/2,height/2,0,.5)))
.out(o1)

src(o0)
.layer(src(o1).mask(noise(3,4).posterize(2,1).pixelate(1,1)))
.modulate(gradient().scale(1, (shape(width,1,1).scale(100,1/width,1/height)
.modulate(osc(TAU,.25).brightness(-.5).color(1,0).pixelate(1,1),.5)
.rotate(0,Math.PI/5)
.modulate(osc(TAU,.25).scrollX(.25).brightness(-.5).color(0,1).pixelate(1,1),.5)
.modulate(gradient().brightness(-.5).pixelate(2,2).color(1/width,1/height),-4)).r(.25, 1), (shape(width,1,1).scale(100,1/width,1/height)
.modulate(osc(TAU,.25).brightness(-.5).color(1,0).pixelate(1,1),.5)
.rotate(0,Math.PI/5)
.modulate(osc(TAU,.25).scrollX(.25).brightness(-.5).color(0,1).pixelate(1,1),.5)
.modulate(gradient().brightness(-.5).pixelate(2,2).color(1/width,1/height),-4)).g(.25, 1)).sub(gradient()), 1)
.out(o2)
render(o2)
