A=()=>height/width,speed=1,fps=60,setCanvasDisplay(512,512),rn=()=>Math.random(),ns=(f=.3,v=.125,x=rn(),y=rn())=>noise(f,v).modulate(solid(width*x,height*y),1).scale(1,A,1,rn())

solid().diff(o0)
.layer(osc(Math.PI
,.75,Math.PI/4).mask(shape(4,1,0)).scale(1,1/width,1/height))
.blur().scale(1.05).bloomUpsample().sharpen().dualKawaseBloom()
.out()
src(o0)
.toneMap(.25,1).sub(prevN(o1,55).modulate(ns().color(1,0).add(ns().color(0,1)).pixelate(1,1)))
.blend(src(o1),.125)
.out(o1)
render(o1)


---


A=()=>height/width,speed=1,fps=60,
setCanvasDisplay(512,512),rn=()=>Math.random(),
ns=(f=.3,v=.125,r=.25,x=rn(),y=rn())=>noiseLoop(f,v,r)
.modulate(solid(width*x,height*y),1).scale(1,A,1,rn())

solid().diff(o0).diff(prevN(75),.25)
.layer(osc(Math.PI,.75,Math.PI/4).mask(shape(4,1,0).scale(1,1/width,1/height,ns().pixelate(1,1).mult(.5).add(.5),ns().pixelate(1,1).mult(.5).add(.5))))
.rotate(prevN(16).blur().mult(.05))
.out(o0)


---


setCanvasDisplay(512,512)
ns=(f=1,v=.25,r=.5,x=Math.random(),y=Math.random())=>noiseLoop(1,.25,.5).modulate(solid(width*x,height*y),1)
shape(4,1,0).scale(2,1/width,1/height).repeat(2,2)
.modulate(ns().color(1,0).add(ns().color(0,1)).pixelate(2,2),.25)
.add(o0,1).blur(.25)
.out()


---

setCanvasDisplay(512,512)
ns=(f=1,v=.25,r=.5,x=Math.random(),y=Math.random())=>noiseLoop(f,v,r).modulate(solid(width*x,height*y),1)
shape(4,1,0).scale(2,1/width,1/height).repeat(2,2)
.modulate(ns().color(1,0).add(ns().color(0,1)).pixelate(2,2),.25)
.add(o0,1).blur(.25).sharpen(.125)
.out()

---

setCanvasDisplay(500,500)

ns=(f=1,v=.25,r=.5,x=Math.random(),y=Math.random())=>noiseLoop(f,v,r).modulate(solid(width*x,height*y),1)

shape(4,1,0).scale(1,1/width,1/height)
.modulate(ns().color(1,0).add(ns().color(0,1)).pixelate(1,1),.5).modulate(prevN(o1,50).color(1/width,1/height))
.add(o0,1)
.bloom(.125)
.sharpen(.3)
.blur(.125)
.out()
src(o0)
.diff(shape(4,1,0).scale(.5,1,1,0,0).repeat(width/2,height/2,0,.5)).out(o1)
render(o1)

---

setCanvasDisplay(500,500)
speed=1,fps=60
ns=(f=1,v=.25,r=.5,x=Math.random(),y=Math.random())=>noiseLoop(f,v,r).modulate(solid(width*x,height*y),1)

src(o0).layer(osc(Math.PI*2*10,.1,Math.PI/4).mask(shape(4,1,0).scale(4,1/width,1/height)))
.blur(1)
.scale(1,1+24/width,1+24/height,ns(.01,.1,1).add(1).mult(.5),ns(.01,.1,1).add(1).mult(.5))
.blur(2)
.out()
render(o0)


---


setCanvasDisplay(500,500)
speed=1,fps=60
ns=(f=1,v=.25,r=.5,x=Math.random(),y=Math.random())=>noiseLoop(f,v,r).modulate(solid(width*x,height*y),1)

ns(2).blend(o0,.002).edgeDetect(15,1).blend(prevN(o0,30),.0025).sharpen(16).blur(500).diff(ns().edgeDetect(3,1)).sharpen(.01).bloom().out()


---

fps=60,setCanvasDisplay(420,420)
ns=(f=1,v=.25,r=.5,x=Math.random(),y=Math.random())=>noiseLoop(1,.25,.5).modulate(solid(width*x,height*y),1)
shape(4,1,0).scale(2,1/width,1/height)
.modulate(ns().color(1,0).add(ns().color(0,1)),.5)
.add(o0,1).blur(1).sharpen(prevN(o2))
.out()
src(o0).sharpen(10000).out(o1)
src(o1).modulate(o0,()=>mouse.uvY*.05).modulateScale(o0,()=>mouse.uvX*.5).out(o2)
render(o2)

---


fps=120,setCanvasDisplay(420,420)
rn=()=>Math.random()
ns=(f=1,v=.75,r=.5,x=rn(),y=rn())=>noiseLoop(f,v,r).modulate(solid(width*x,height*y),1)
solid().diff(o0)
.layer(solid(ns(),ns(),ns(),ns().mult(.5).add(.5)).mask(shape(width,1,0).scale(2,1/width,1/height)
//.modulate(ns().color(1,0).add(ns().color(0,1)),.1)
.scale(() => 1 + mouse.accelerationNorm*.01)
.scroll(()=>mouse.normX-.5,()=>-mouse.normY-.5)))
.modulateHue(o1,2)
.out()
src(o0).blur(1).out(o1)
render(o1)

---


fps=120,setCanvasDisplay(420,420)
rn=()=>Math.random()
ns=(f=1,v=.75,r=.5,x=rn(),y=rn())=>noiseLoop(f,v,r).modulate(solid(width*x,height*y),1)
solid().diff(o0).blur(src(o1).blur(4).mult(1))
.layer(solid(ns(),ns(),ns(),1).color(1,1,.5).shift(.25,0,.25).color(1,.75,1)
.mask(shape(width,1,0).scale(2,1/width,1/height)
.scale(() => 1 + mouse.accelerationNorm*.01)
.scroll(()=>mouse.normX-.5,()=>-mouse.normY-.5)))
.out()
src(o0).blur(1).out(o1)
render(o1)

---

fps=240,setCanvasDisplay(420,420)
rn=()=>Math.random()
ns=(f=.3,v=.375,r=.5,x=rn(),y=rn())=>noiseLoop(f,v,r).modulate(solid(width*x,height*y),1)
solid().diff(src(o0))
.blur(src(o1).blur(1).mult(4))
.layer(solid(ns(),ns(),ns(),ns().add(1).mult(.5).pixelate(2,2)).color(1,1,.5).shift(.25,0,.25).color(1,.75,1)
.mask(shape(width,1,0).scale(50,1/width,1/height).repeat(2,2)
.modulate(gradient().brightness(-.5).repeat(2,2).mult(ns(10).pixelate(2,2)),.375)
.modulate(solid(ns(8),ns(8)).pixelate(2,2),.175)
))
.out()
src(o0).blur(1).sharpen(1)
.out(o1)
render(o0)

---


fps=240,setCanvasDisplay(420,420)
rn=()=>Math.random()
ns=(f=.3,v=.375,r=.5,x=rn(),y=rn())=>noiseLoop(f,v,r).modulate(solid(width*x,height*y),1)
os=(f,v,h,x=rn())=>osc(f,v,h).modulate(solid(x*width),1)
osc(Math.PI*8,0).scrollX(.315).thresh(.99,0).rotate(Math.PI*1.5).kaleid(12).rotate(Math.PI/12).scale(2.1,1,1,.5,1)
.blur(4).blur(3)
.diff(os(Math.PI*8,-.025,.5).color(1.25,1,1).shift(-.5,.15,.10)
.kaleid(6).scale(2,1,1,.5,1).modulateScale(ns(.3,0).add(.5),4)).dualKawaseBlur(4).dualKawaseBlur(4).dualKawaseBloom(-1)
.out()

src(o0)
.dualKawaseBlur(2)
.layer(shape(4,.1,0).modulateScale(ns(3),1).luma().mult(osc(1,1,1).kaleid(width)).rotate(0,1))
.modulateScale(shape(width,.5,.25),-.0675)
.add(shape(width,.5,.25),.1)
.modulateScale(shape(width,.25,.25),.5)
.blur(2)
.out(o1)
render(o1)
//STOPED AIRBURSH 1






---

fps=60,setCanvasDisplay(height/16*9,height)
rn=()=>Math.random()
//s0.initVideo("C:\Users\sebas\Downloads\WhatsApp Video 2026-04-20 at 1.02.27 PM_chr2.mp4")
//loadVideoFile(s0).then(() => src(s0).out())
src(s0)
.diff(src(o0).edgeDetect(4).sharpen(6).thresh(.25,0))
.blend(prevN(o0,35).edgeDetect(src(s0).add(1.5),4))
.out()



---


fps=60,setCanvasDisplay(window.innerHeight/16*9,window.innerHeight)
rn=()=>Math.random()
//s0.initVideo("C:\Users\sebas\Downloads\WhatsApp Video 2026-04-20 at 1.02.27 PM_chr2.mp4")
//loadVideoFile(s0).then(() => src(s0).out())
src(s0)
.diff(src(o0).edgeDetect(4).sharpen(6).thresh(.25,0))
.blend(prevN(o0,35).edgeDetect(prevN(85).edgeDetect(1,0).add(1.5),4))
.diff(src(s0).mask(noise(.5,.5).mult(.25)),1)
.out()

---


fps=60,setCanvasDisplay(window.innerHeight/16*9,window.innerHeight)
rn=()=>Math.random()
//loadVideoFile(s0).then(() => src(s0).out())
src(s0).dualKawaseBloom(-1)
.modulateScale(src(s0).dualKawaseBloom(1))
.edgeDetect(6)
.layer(src(s0).mask(osc(Math.PI*8,.1).rotate(1).pixelate(4,4/width*height).thresh(.5,0)))
.blend(prevN(o0,95))
.out()
render(o0)


---


fps=60,setCanvasDisplay(window.innerHeight/16*9,window.innerHeight)
rn=()=>Math.random()
//loadVideoFile(s0).then(() => src(s0).out())
src(s0).invert(osc(Math.PI*2.5,.125).pixelate(2.5,1).thresh(.5,0)).dualKawaseBloom(-1).sharpen(2)
.edgeDetect(4).blur(1).dualKawaseBlur(2)
.blend(o0,.5)
.out()
src(o0).mult(s0)
.layer(src(s0).mask(shape(400,1,0).invert().scrollY(-.5).repeat(2.5,2.5/width*height)))
.out(o1)
render(o1)


---

fps=60,setCanvasDisplay(window.innerHeight/16*9,window.innerHeight)
rn=()=>Math.random()
//loadVideoFile(s0).then(() => src(s0).out())
src(s0).out(o0)
src(o0).edgeDetect(40,.25)
.add(prevN(o0,75).edgeDetect(4))
.out(o1)
render(o1)

---


fps=60,setCanvasDisplay(512,512)

impulse=()=>shape(4,.08,0)
.scrollX(({time})=>Math.sin(time*1.6)*.36)
.scrollY(({time})=>Math.cos(time*1.2)*.34)
.color(1,.25,.08)

src(o0)
.scale(1.006)
.blend(prevN(o0,60),.36)
.brightness(-.012)
.add(impulse(),.85)
.out(o0)

src(o0)
.toneMap(.35,1)
.sub(prevN(o1,62).modulate(prevN(o0,28).pixelate(4,4),.018))
.blend(src(o1),.16)
.bloomUpsample()
.sharpen(.18)
.out(o1)

render(o1)