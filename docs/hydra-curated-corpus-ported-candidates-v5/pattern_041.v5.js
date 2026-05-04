// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/
speed=1
src(o0)
.layer(shape(4,.25,.0125).scale(1,.5).mult(osc(TAU,.25,1)).repeat(width/8,height/4,.5).mask(ns(width/4,1).thresh(.5,0).pixelate(width/4,height/2))
.mask(shape(4,1,0).scale(.125,1,1,0,0).scroll(.125/2,.125/2).scrollX(0,-.25).scrollY(0,-.25/8).pixelate(8,8).repeat(2,2)))
.scrollX(-1/width)
.modulate(osc(Math.PI*width/32,32/width).rotate(Math.PI/2).kaleid(width).thresh(.5,.125).color(1/width,0).rotate(Math.PI/-
                                                                                               2).mask(osc(Math.PI*width/8,1/width).rotate(Math.PI/2)).pixelate(width/8,height/4),4)
.modulate(osc(Math.PI*width/8,2/width).brightness(-.5).pixelate(width/16,height).color(0,1/height),2)
.modulateHue(o0,1)
.out(o0)
