shape(4,1/32,0).repeat(1,1).scale(1/8).mult(osc(Math.PI*4,0,1).rotate(Math.PI/4))
.modulate(gradient().mask(shape(4,1,0)).repeat(1,1).scale(1/8,1,1,0,0).mask(noise(3,1).pixelate(8,8).thresh(.5,0)),-.125)
.out(o0)
