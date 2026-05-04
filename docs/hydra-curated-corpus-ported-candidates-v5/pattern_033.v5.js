ns = (f=.75,v=0,dx=rn(),dy=rn()) => {
  return noise(f,v).modulate(solid(1,0),wob(-1, 1, 0.05))
    .blend(noise(f,v).modulate(solid(width,0),.5).modulate(solid(0,1),wob(-1, 1, 0.05)),.5)
    .modulate(solid(width*dx,height*dy),1)
}
nspx = (xpx=1,ypx=1) => {
  return ns().color(1,0).add(ns().color(0,1),1).pixelate(xpx,ypx)
}
src(o0)
.layer(osc(TAU,.5,1).kaleid(height)
.mask(shape(4,1,0).scale(1,1/width,1/height)
.modulate(nspx(),.5)))
.modulate(nspx(2,2).color(1/width,1/height),2)
.out(o0)
