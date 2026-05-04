// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/
speed=1
shape(4,.25/2,0).repeat(width/8/2,height/4/2,.5)
.modulate(osc(Math.PI*width/2,1/width).brightness(-.5).color(0,1).mult(osc(TAU,.25).pixelate(8,8),8),.025)
.out(o0)

//screencap()
