shape(4,1,0).scale(.5,1,1,0,rn()).repeat(width/2,height/2).mult(ns(1,.1).thresh(.25-.5,.25))
.diff(shape(4,1,0).scale(.25,1,1,rn(),0).scrollX(0,.5).repeat(width/4,height/4).mult(ns(2,.1).thresh(.375-.5,.25)))
.diff(shape(4,1,0).scale(.125,1,1,1,rn()).repeat(width/8,height/8).mult(ns(3,.1).thresh(.5-.5,.25)))
.diff(shape(4,1,0).scale(.5,1,1,rn(),1).rotate(0,1).repeat(width/2,height/2).mult(ns(4,.1).thresh(.75-.5,.25)))

.out(o0)
