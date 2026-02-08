import Hydra from '../src/hydra-synth.js'

function oscWgslBody () {
  return `
  let safeFreq = max(freq, 0.0001);
  let st = _st;
  let r = sin((st.x - offset / safeFreq + globals.time * sync) * safeFreq) * 0.5 + 0.5;
  let g = sin((st.x + globals.time * sync) * safeFreq) * 0.5 + 0.5;
  let b = sin((st.x + offset / safeFreq + globals.time * sync) * safeFreq) * 0.5 + 0.5;
  return vec4f(r, g, b, 1.0);
`
}

export function exampleResize () {
  window.addEventListener('resize', () => {
    setResolution(window.innerWidth, window.innerHeight)
  })
}

export function exampleMultipleMasks () {
  registerFunction({
    name: 'mask2',
    type: 'combine',
    inputs: [],
    wgsl: `
  let a = hydraLuminance(_c1.xyz);
  return vec4f(_c0.xyz * a, a * _c0.w);
`
  })

  gradient().layer(osc().luma().mask(noise(3))).out()
  gradient().layer(osc().luma().mask2(noise(3))).out(o1)
  render()
}

export function exampleMultipleCanvases (num = 2) {
  for (let i = 0; i < num; i++) {
    nonGlobalCanvas()
  }
}

export function nonGlobalCanvas () {
  const div = document.createElement('div')
  const canvas = document.createElement('canvas')
  canvas.style.backgroundColor = '#000'
  canvas.width = 800
  canvas.height = 200
  div.appendChild(canvas)
  document.body.appendChild(div)

  const hydra = new Hydra({
    autoLoop: false,
    canvas,
    makeGlobal: false
  }).synth

  hydra.osc().rotate().blend(hydra.noise().repeat(), 0.99).out()
  window.c1 = hydra

  setInterval(() => {
    hydra.tick(1000)
  }, 1000)
}

export async function exampleLoadScript () {
  await loadScript('https://unpkg.com/tone')
  console.log('loaded script')
}

export function exampleVideo () {
  s0.initVideo('https://media.giphy.com/media/26ufplp8yheSKUE00/giphy.mp4', { flipY: false })
  src(s0).out()
}

export function exampleSmoothstep () {
  shape(4, 0.3, 0.01).out()
  shape(4, 0.5, 0).out()
  osc(89, 0.01, 1.8).luma(0.5, 0).out()
  osc(89, 0.01, 1.8).thresh(0.5, 0).out()
}

export function exampleNonGlobal () {
  const hydra = new Hydra({ makeGlobal: false }).synth
  hydra.osc().diff(hydra.shape()).out()
  hydra.gradient().out(hydra.o1)
  hydra.render()

  const h2 = new Hydra({ makeGlobal: false }).synth
  h2.shape(4).diff(h2.osc(2, 0.1, 1.2)).out()
}

export function exampleExtendTransforms () {
  const hydra = new Hydra({
    extendTransforms: {
      name: 'myOsc',
      type: 'src',
      inputs: [
        { name: 'freq', type: 'float', default: 0.2 },
        { name: 'sync', type: 'float', default: 0.1 },
        { name: 'offset', type: 'float', default: 0.0 }
      ],
      wgsl: oscWgslBody()
    }
  }).synth

  hydra.myOsc(10, 0.2, 0.8).out()
}

export function exampleImage () {
  s0.initImage('https://upload.wikimedia.org/wikipedia/commons/2/25/Hydra-Foto.jpg')
  src(s0).out()
}

export function exampleAddFunction (hydraInstance = window.hydra?.synth || window.hydra) {
  if (!hydraInstance || typeof hydraInstance.registerFunction !== 'function') return

  hydraInstance.registerFunction({
    name: 'myOsc',
    type: 'src',
    inputs: [
      { name: 'freq', type: 'float', default: 0.2 },
      { name: 'sync', type: 'float', default: 0.1 },
      { name: 'offset', type: 'float', default: 0.0 }
    ],
    wgsl: oscWgslBody()
  })

  hydraInstance.myOsc(10, 0.2, 0.8).out()
}

export function exampleGetWGSL () {
  const passes = src(s0).blend(o0).wgsl()
  if (passes[0]) console.log(passes[0].wgsl)
}

export function exampleCustomCanvas () {
  const canvas = document.createElement('canvas')
  canvas.style.backgroundColor = '#000'
  canvas.width = 800
  canvas.height = 200
  canvas.style.width = '100%'
  canvas.style.height = '100%'

  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.moveTo(0, 0)
    ctx.lineTo(200, 100)
    ctx.stroke()
  }

  s0.init({ src: canvas })
}

export function exampleSetResolution () {
  setResolution(20, 20)
}
