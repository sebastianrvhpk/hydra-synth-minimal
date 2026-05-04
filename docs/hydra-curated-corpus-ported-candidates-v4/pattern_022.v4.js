/*
Hydra curated corpus port candidate: pattern_022
Title: source block 22
Status: semantic port, not visually accepted.
Bucket: staging / source construction

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
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

speed=.25
n=128
shape(4,1,0)
.scale(1/n,1,1).repeat(width/n,height/n)
.modulate(gradient().pixelate(2,2).brightness(-.5).repeat(width/n,height/n).color(1/width,1/height).mask(noise(3,1).brightness(0).pixelate(width/n,height/n)),-n*2)
.add(o0,.875)
.modulate(gradient().repeat(width/32,height/32).color(1/width,1/height).mask(noise(3,-1).brightness(0).pixelate(width/32,height/32)),-width/32)
.out(o0)
