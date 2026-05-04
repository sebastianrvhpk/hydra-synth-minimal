ns = (f=2.5,v=0,dx=rn(),dy=rn()) => {
  return noise(f,v).modulate(solid(1,0),wob(-1, 1, 0.05))
    .blend(noise(f,v).modulate(solid(0,1),wob(-1, 1, 0.05)),.5)
    .modulate(solid(width*dx,height*dy),1)
}
shape(4,1,0).scale(1,1/width,1/height)
.modulate(ns().color(1,0).blend(ns().color(0,1),.5).pixelate(1,1),1)
.add(o0,1)
.modulate(ns().color(1,0).blend(ns().color(0,1),.5).color(2/width,2/height),2)
.out(o0)
