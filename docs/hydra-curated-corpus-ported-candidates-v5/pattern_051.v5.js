// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/
src(o0)
.modulate(osc(TAU,.25).thresh(.5,.375).brightness(-.5).color(1,0).add(osc(TAU,.25).scrollX(.25).thresh(.5,.375).brightness(-.5).color(0,1)).pixelate(1,1).color(1/width,1/height), 6)
.layer(osc(Math.PI*width*Math.cos(Math.PI/-4)/2,2/width,1.25).rotate(Math.PI/-4)//.kaleid(width*4)
.mask(shape(4,1,0).scale(1/4,1,1,0,0)
.repeat(width/4,height/4*2,.5)))
.out(o0)
