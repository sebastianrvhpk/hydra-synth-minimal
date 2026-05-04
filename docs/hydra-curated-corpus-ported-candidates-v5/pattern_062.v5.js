// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/

ns(width/4,.1).kaleid(6).thresh(.8,0)
.mask(ns(width/32,.1).thresh(.25,0))
.add(o0,.75).blend(o0,.35)
.modulate(ns(1,.1).color(1,0).blend(ns(1,.1).color(0,1),.5).color(1/width,1/height).pixelate(4,4),4)
.diff(o0,.125)
.modulate(osc(TAU,.25).color(1/width,0).pixelate(4,height),2)
.out(o0)
