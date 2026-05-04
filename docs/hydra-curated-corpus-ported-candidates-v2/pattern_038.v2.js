/*
Hydra curated corpus port candidate: pattern_038
Title: source block 38
Status: semantic port, not visually accepted.
Bucket: memory-drift / non-ingress feedback

Port moves:
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
- G?: review gate role; hard gates for ingress, soft/luma only for other roles or intended legacy behavior
- L/X: review global blend/diff/sub pressure; move into material before mask unless intentionally global
- C: callback/time controls retained as legacy controls; replace manually when porting for the no-callback grammar

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

function ns(f,v,x=rn(),y=rn()) {
  return noise(f,0).modulate(solid(x*width,y*height),1).modulate(osc(TAU,v).brightness(-.5).color(1,0).add(osc(TAU,v).brightness(-.5).scrollX(.25).color(0,1)).pixelate(1,1),1)
}

src(o0).colorama(-10/width).hue(1/width)
.diff(shape(4,1,0).scale(1,1/width,1/height))
.modulate(gradient().scale(1, (solid()
.add(ns(3,.1).color(1,0,0).mask(osc(TAU,.25).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(1,0,0).mask(osc(TAU,.25).scrollX(.5).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(.25,1,0).mask(osc(TAU,.25).scrollX(.25).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(0,1,0).mask(osc(TAU,.25).scrollX(.75).pixelate(1,1).thresh(.75,.1)))
//.brightness(.5)
.pixelate(1,1)).r(.0125, 1), (solid()
.add(ns(3,.1).color(1,0,0).mask(osc(TAU,.25).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(1,0,0).mask(osc(TAU,.25).scrollX(.5).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(.25,1,0).mask(osc(TAU,.25).scrollX(.25).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(0,1,0).mask(osc(TAU,.25).scrollX(.75).pixelate(1,1).thresh(.75,.1)))
//.brightness(.5)
.pixelate(1,1)).g(.0125, 1)).sub(gradient()), 1)
.modulate(solid()
.add(ns(3,.1).color(1,0,0).mask(osc(TAU,.25).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(1,0,0).mask(osc(TAU,.25).scrollX(.5).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(.25,1,0).mask(osc(TAU,.25).scrollX(.25).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(0,1,0).mask(osc(TAU,.25).scrollX(.75).pixelate(1,1).thresh(.75,.1)))
.pixelate(1,1)
.color(1/width,1/height)
,25)
.out(o0)
