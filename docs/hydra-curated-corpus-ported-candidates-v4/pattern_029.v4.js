/*
Hydra curated corpus port candidate: pattern_029
Title: source block 29
Status: semantic port, not visually accepted.
Bucket: legacy feedback / conceptual port

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
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
src(o0)
.layer(osc(Math.PI*8,1,1).kaleid(4).mask(shape(4,1,0).scale(1/n,1,1).repeat(width/n,height/n)
.modulate(gradient().rotate(0,Math.PI/4).pixelate(2,2).brightness(-.5).repeat(width/n,height/n).color(1/width,1/height).mask(noise(3,1).brightness(0).pixelate(width/n,height/n)),-n*2)))
.out(o0)
