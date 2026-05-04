/*
Hydra curated corpus port candidate: pattern_050
Title: source block 50
Status: semantic port, not visually accepted.
Bucket: portable core feedback

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
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
Final v3 pass:
- shared helpers moved to shared-v3.js
- arrays are ported by intent: range, density, null/identity base, and motion character
- old exact-sequence helper emulation is intentionally removed
- callback parameters are replaced with compact signal helpers where possible
- status remains: review candidate, not visually accepted
*/

// Run shared-v3.js once before this patch.

src(o1)
.layer(osc(TAU,1,1).mask(shape(width,1,0)
.scale(4,1/width,1/height)
.repeat(4,4,.5,0)).mask(noise(4,.4).pixelate(4,4).thresh(0,0))
.scrollX(0,.125)
.rotate(0,.1)
.kaleid(4))
.modulate(gradient().brightness(-.5).color(1/width,1/height).pixelate(2,2).mask(noise(.2,1)),-4)
.out(o1)

src(o2)
.layer(osc(TAU,1,1).mask(shape(width,1,0)
.scale(4,1/width,1/height)
.repeat(4,4,.5,0)).mask(noise(4,.4).pixelate(4,4).thresh(0,0))
.scrollX(0,.125)
.rotate(0,.1)
.kaleid(4))
.modulate(gradient().brightness(-.5).color(1/width,1/height).pixelate(2,2).mask(noise(.2,1)),4)
.out(o2)

src(o1)
.add(o2)
.add(o3,.75)
.modulate(gradient().brightness(-.5).color(1/width,1/height).pixelate(2,2).rotate(0,.25).mask(noise(.2,1).brightness(-1)),-4)
.out(o3)

src(o0)
.scrollX(-1/width)
.layer(src(o3).mask(shape(4,1,0).scale(1,1/width,1,0))
)
.diff(shape(4,1,0).scale(.25,1,1/4,0,0).repeat(width/4,height/4/4,0,.5))
.out(o0)

render(o0)
