/*
Hydra curated corpus port candidate: pattern_030
Title: source block 30
Status: semantic port, not visually accepted.
Bucket: staging / source construction

Port moves:
- B: make buffer role explicit: staging, parallel feedback, or composite feedback
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
- G?: review gate role; hard gates for ingress, soft/luma only for other roles or intended legacy behavior
- C: callback/time controls retained as legacy controls; replace manually when porting for the no-callback grammar

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

ofst=btw(.125,.375)

function multi(px,spd) {
  return ns(px,0).pixelate(px,1).scrollX(0,(1/px)*spd).brightness(1).pixelate(1,1)
}
speed=.5

solid().diff(o0)
.modulate(solid()
.add(osc(TAU,1).sub(multi(3,1),.25).pixelate(1,1).color(1,0).mult(multi(7,1)),-100)
.add(shape(4,.25,1).rotate(0,.1).scale(1, A, B).modulate(gradient().scale(1, (ns(3,1).pixelate(1,1)).r(4, 1), (ns(3,1).pixelate(1,1)).g(4, 1)).sub(gradient()), 1).diff(osc(1,-1)).mult(multi(9,1)),50)
.add(gradient().rotate(Math.PI/2).mult(noise(10,1).thresh(.25,.5).pixelate(1,1)).mult(multi(4,2)),125)
.add(gradient().rotate(Math.PI/-2).mult(noise(10,1).thresh(.25,.5).invert().pixelate(1,1)).mult(multi(4,2)),-125)
.color(1/width,1/height)
,.1)
.layer(src(o1).mask(shape(4,1,0).scale(1,1/width,1,0)))
.out(o0)

solid(0,0,0)
.add(osc(TAU,1).modulate(solid(1,0),0).color(1,0,0))
.add(osc(TAU,1).modulate(solid(1,0),ofst/2*btw(.75,1.25)).color(0,1,0))
.add(osc(TAU,1).modulate(solid(1,0),ofst*btw(.75,1.25)).color(0,0,1))
.modulate(solid(rn()*width,rn()*height),1)
.out(o1)

render(o0)

//screencap()
