// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/

src(o0)
.modulate(solid()
.add(osc(Math.PI*width/4,1/width).brightness(-.5).color(0,1/height),4)
.add(osc(Math.PI*width,1/width).thresh(.5,0).color(1/width,0),4)
,1)
.layer(ns(width/8,.25).rotate(.375).thresh(.75,0).pixelate(width/8,height/8).mult(osc(TAU,.25,1).color(1.25,.66,1.12).hue(.1).kaleid(width))
.mask(shape(4,1,0).scale(.125,1,1,0,0).repeat(width/8,height/8,.5))
)
//.modulate((osc(TAU,.25).brightness(-.25).color(1,0)).color(1 / width, 0), 2)
//.add(src(o0).modulate(osc(TAU,.25).invert().brightness(-.5).color(0,1),.25),.125/2*0)
.out(o0)
