nst = (f, v, t, x = rn(), y = rn()) => {
  return ns(f, v, x, y).thresh(t, 0)
}
nstpx = (f, v, t, pxx, pxy = pxx, x = rn(), y = rn()) => {
  return nst(f, v, t, x, y).pixelate(pxx / A, pxy)
}

nstpx(13,.1,.125,8,19)
.diff(nstpx(13,.2,.125,5,1))
.mask(nstpx(13,.3,.125,18,9))
.mask(nstpx(13,.5,.125,24,35))//.scrollY(0,.025))
.mask(nstpx(13,.7,.125,7))
.modulate((gradient().scale(1, (nstpx(13,1,.125,15,15)).r(-1, 1), (nstpx(13,1,.125,15,15)).g(-1, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
.out(o0)

src(o0)
.diff(src(o0).scroll(rn(),rn()).rotate(rn()*TAU).pixelate(4,4)
.diff(src(o0).scroll(rn(),rn()).rotate(rn()*TAU).pixelate(3,3)
.mask(src(o0).scroll(rn(),rn()).rotate(rn()*TAU).pixelate(2,2)
.mask(src(o0).scroll(rn(),rn()).rotate(rn()*TAU).pixelate(1,1)))))
.mask(shape(4,1,0).scale(.5,1,1,0,0).repeat(width/2,height/2,0,.5))
.out(o1)

render(o1)
