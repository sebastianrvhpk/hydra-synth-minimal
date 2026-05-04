/*
Hydra curated corpus port candidate: pattern_075
Title: source block 75
Status: semantic port, not visually accepted.
Bucket: already close to current core

Port moves:
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
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

src(o0)
.modulateHue(src(o0).scroll(.25,.125),1)
.modulate(solid()
.layer(gradient().brightness(-.5).rotate(Math.PI/2))
.layer(gradient().brightness(-.5).rotate(Math.PI/-2).mask(shape(4,1,0)).scale(2/3))
.layer(gradient().brightness(-.5).rotate(Math.PI/2).mask(shape(4,1,0)).scale(1/3))
.layer(gradient().brightness(-.5).rotate(Math.PI/-2).mask(shape(4,1,0)).scale(1/6))
.layer(gradient().brightness(-.5).rotate(Math.PI/2).mask(shape(4,1,0)).scale(1/12))
//.modulate(noise(1,0).color(1,0).modulate(solid(rn(),rn()),width).add(noise(1,0).color(0,1).modulate(solid(rn(),rn()),width)),.25)
.color(1/width,1/height)
,2)
.layer(osc(Math.PI,1,1).mask(shape(4,1,0).scale(.25,1,1,0,0).repeat(width/4,height/4).mask(noise(30,.5).thresh(.875,0))))
.out(o0)

src(o0).out(o1)
render(o1)
