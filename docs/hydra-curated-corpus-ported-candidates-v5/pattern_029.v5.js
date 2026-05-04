speed=.25
n=128
src(o0)
.layer(osc(Math.PI*8,1,1).kaleid(4).mask(shape(4,1,0).scale(1/n,1,1).repeat(width/n,height/n)
.modulate(gradient().rotate(0,Math.PI/4).pixelate(2,2).brightness(-.5).repeat(width/n,height/n).color(1/width,1/height).mask(noise(3,1).brightness(0).pixelate(width/n,height/n)),-n*2)))
.out(o0)
