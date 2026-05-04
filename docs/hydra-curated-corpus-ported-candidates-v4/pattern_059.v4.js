/*
Hydra curated corpus port candidate: pattern_059
Title: source block 59
Status: semantic port, not visually accepted.
Bucket: staging / source construction

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback
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
Final v3 pass + v4 buffer-normalized pass:
- shared helpers moved to shared-v3.js
- arrays are ported by intent: range, density, null/identity base, and motion character
- old exact-sequence helper emulation is intentionally removed
- callback parameters are replaced with compact signal helpers where possible
- status remains: review candidate, not visually accepted
*/

// Run shared-v4.js once before this patch.

// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/

src(o0)
.modulate(solid()
.add(osc(Math.PI*width/4,1/width).brightness(-.5).color(0,1/height),4)
.add(osc(Math.PI*width,1/width).thresh(.5,0).color(1/width,0),4)
,1)
.layer(ns(width/8,.25).rotate(.375).thresh(.75,0).pixelate(width/8,height/8).mult(osc(TAU,.25,1).color(1.25,.66,1.12).hue(.1).kaleid(width))
.mask(shape(4,1,0).scale(.125,1,1,0,0).repeat(width/8,height/8,.5))
)
//.modulate(osc(TAU,.25).brightness(-.25).color(1,0),2/height)
//.add(src(o0).modulate(osc(TAU,.25).invert().brightness(-.5).color(0,1),.25),.125/2*0)
.out(o0)
