ns = (f=.375,v=0,dx=rn(),dy=rn()) => {
  return noise(f,v).modulate(solid(1,0),wob(-1, 1, 0.05)).color(0,1)
    .add(noise(f,v).modulate(solid(1,0),1).modulate(solid(0,1),wob(-1, 1, 0.05)).color(1,0),1)
    .modulate(solid(width*dx,height*dy),1)
}
speed=.25
shape(4,1,0).scale(1,1/width,1/height)
.modulate(solid()
.add(gradient().brightness(-.5).pixelate(2,2),-1)
.add(gradient().brightness(-.5).pixelate(2,2).repeat(2,2),-1/2)
.add(gradient().brightness(-.5).pixelate(2,2).repeat(4,4),-1/4)
//.add(gradient().brightness(-.5).pixelate(2,2).repeat(8,8),-1/8)
,1)
.modulate((ns(1).pixelate(8,8)).color(1 / width, 1 / height), px((.025) * Math.max(width, height)))
//.diff(noise(3,0).pixelate(2,2))
.add(o0,1)
.out(o0)
//screencap()
