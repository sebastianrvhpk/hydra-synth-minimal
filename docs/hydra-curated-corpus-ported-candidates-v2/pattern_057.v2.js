/*
Hydra curated corpus port candidate: pattern_057
Title: source block 57
Status: semantic port, not visually accepted.
Bucket: extension / staging

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback

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

solid(0,-.25,0)
.add(osc(Math.PI*5,.1).modulate(solid(Math.PI,0),3).color(1,.25,0))
.add(osc(Math.PI*5,-.1).modulate(solid(Math.PI,0),2).color(0,1,.333))
.add(osc(Math.PI*5,-.1).modulate(solid(Math.PI,0),1).color(.25,0,1))
.rotate(0,Math.PI/2)
.kaleid(2).scrollY(0,.1).rotate(0,1).kaleid(5000)
.out(o0)
