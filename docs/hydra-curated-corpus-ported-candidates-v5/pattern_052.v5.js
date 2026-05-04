// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/
src(o0)
.modulate(osc(TAU,.075).thresh(.5,.375).brightness(-.5).color(1,0).add(osc(TAU,.075).scrollX(.25).thresh(.5,.375).brightness(-.5).color(0,1)).pixelate(1,1).color(1/width,1/height),2)
.layer(osc(Math.PI*width*Math.cos(Math.PI/-4)/2,2/width,1.25).rotate(Math.PI/-4).kaleid(width/32)//.mask(ns().thresh(0,0))
.mask(shape(4,1,0).scale(1/8,1,1,0,0)
.repeat(width/8,height/8*2,.5)))
.modulate(gradient().brightness(-.5).pixelate(2,2).repeat(8,8).mult(ns(3,.1).pixelate(8,8).thresh(.25,.125)).color(1/width,1/height),4)
.out(o0)
