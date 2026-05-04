src(o0)
.diff(shape(4,1,0).scale(2,1/width,1/height))
.modulate(shape(1,-1,2).scrollY(0,1).pixelate(1,1).mult(gradient().pixelate(2,2).brightness(-.5)).color(1/width,1/height),-height/8)
.out(o0)
