import { createHydraBrowserRuntime } from 'hydra-synth'
import { chapters, scenes } from './content.js'

const byId = (id) => document.getElementById(id)

const ui = {
  body: document.body,
  canvas: byId('hydra-canvas'),
  runtimeStatus: byId('runtime-status'),
  scene: byId('scene'),
  sceneKicker: byId('scene-kicker'),
  sceneTitle: byId('scene-title'),
  sceneBody: byId('scene-body'),
  scenePrompt: byId('scene-prompt'),
  graphStrip: byId('graph-strip'),
  experiment: byId('experiment'),
  experimentControls: byId('experiment-controls'),
  resetControls: byId('reset-controls'),
  chapterIndex: byId('chapter-index'),
  chapterLabel: byId('chapter-label'),
  sceneCurrent: byId('scene-current'),
  sceneTotal: byId('scene-total'),
  progressFill: byId('progress-fill'),
  previous: byId('previous-button'),
  next: byId('next-button'),
  pause: byId('pause-button'),
  codeButton: byId('code-button'),
  mapButton: byId('map-button'),
  codePanel: byId('code-panel'),
  mapPanel: byId('map-panel'),
  sceneCode: byId('scene-code').querySelector('code'),
  copyCode: byId('copy-code-button'),
  openHydra: byId('open-hydra-link'),
  codeStatus: byId('code-status'),
  chapterMap: byId('chapter-map'),
  mediaInput: byId('media-input'),
  dropMessage: byId('drop-message'),
  presentation: byId('presentation')
}

const TAU = Math.PI * 2
const pad = (value) => String(value).padStart(2, '0')
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const round = (value, precision = 3) => {
  const factor = 10 ** precision
  return Math.round(Number(value) * factor) / factor
}
const literal = (value, precision = 3) => String(round(value, precision))
const codeLines = (...lines) => lines.join('\n')

const defaults = Object.freeze({
  frequency: 24,
  angle: 0.16,
  whereWhatMode: 'coordinates',
  whereWhatAmount: 0.32,
  sourceType: 'noiseLoop',
  geometryAngle: 0.24,
  geometryScale: 1.12,
  geometryRepeat: 3,
  colorContrast: 1.55,
  colorThreshold: 0.46,
  colorHue: 0.08,
  blendMode: 'blend',
  blendAmount: 0.52,
  modulationMode: 'modulate',
  modulationAmount: 0.18,
  parameterMode: 'field',
  intermodTarget: 'frequency',
  intermodDepth: 0.72,
  multipassMode: 'blur',
  multipassAmount: 2.2,
  timeRate: 0.72,
  historyDepth: 8,
  feedbackAmount: 0.84,
  feedbackScale: 1.006,
  feedbackRotate: 0.004,
  finalSource: 'fbm',
  finalRelation: 'modulate',
  finalDepth: 0.18,
  finalMemory: 0.72
})

const controls = { ...defaults }

const controlSchemas = {
  causality: [
    { type: 'range', key: 'frequency', label: 'frecuencia', min: 4, max: 80, step: 1, format: (value) => String(Math.round(value)) },
    { type: 'range', key: 'angle', label: 'rotación', min: -1, max: 1, step: 0.01 }
  ],
  whereWhat: [
    {
      type: 'select',
      key: 'whereWhatMode',
      label: 'intervenir',
      rebuild: true,
      options: [
        ['coordinates', 'coordenadas'],
        ['values', 'valores']
      ]
    },
    { type: 'range', key: 'whereWhatAmount', label: 'intensidad', min: 0, max: 1, step: 0.01 }
  ],
  source: [
    {
      type: 'select',
      key: 'sourceType',
      label: 'fuente',
      rebuild: true,
      options: [
        ['osc', 'osc'],
        ['noiseLoop', 'noiseLoop'],
        ['fbm', 'fbm'],
        ['shape', 'shape']
      ]
    }
  ],
  geometry: [
    { type: 'range', key: 'geometryAngle', label: 'rotación', min: -1.2, max: 1.2, step: 0.01 },
    { type: 'range', key: 'geometryScale', label: 'escala', min: 0.55, max: 2.2, step: 0.01 },
    { type: 'range', key: 'geometryRepeat', label: 'repetición', min: 1, max: 8, step: 1, format: (value) => String(Math.round(value)) }
  ],
  color: [
    { type: 'range', key: 'colorContrast', label: 'contraste', min: 0.4, max: 3, step: 0.01 },
    { type: 'range', key: 'colorThreshold', label: 'umbral', min: 0, max: 1, step: 0.01 },
    { type: 'range', key: 'colorHue', label: 'hue', min: -0.5, max: 0.5, step: 0.01 }
  ],
  blend: [
    {
      type: 'select',
      key: 'blendMode',
      label: 'relación',
      rebuild: true,
      options: [
        ['blend', 'blend'],
        ['add', 'add'],
        ['mult', 'mult'],
        ['diff', 'diff'],
        ['mask', 'mask']
      ]
    },
    { type: 'range', key: 'blendAmount', label: 'presencia B', min: 0, max: 1, step: 0.01 }
  ],
  modulation: [
    {
      type: 'select',
      key: 'modulationMode',
      label: 'operación',
      rebuild: true,
      options: [
        ['modulate', 'modulate'],
        ['modulateScale', 'modulateScale'],
        ['modulateRotate', 'modulateRotate'],
        ['modulatePixelate', 'modulatePixelate']
      ]
    },
    { type: 'range', key: 'modulationAmount', label: 'profundidad', min: 0, max: 1, step: 0.01 }
  ],
  parameterScale: [
    {
      type: 'select',
      key: 'parameterMode',
      label: 'tipo',
      rebuild: true,
      options: [
        ['constant', 'número'],
        ['uniform', 'función'],
        ['field', 'campo']
      ]
    }
  ],
  deepIntermod: [
    {
      type: 'select',
      key: 'intermodTarget',
      label: 'controlar',
      rebuild: true,
      options: [
        ['frequency', 'frecuencia'],
        ['threshold', 'umbral'],
        ['blur', 'radio blur']
      ]
    },
    { type: 'range', key: 'intermodDepth', label: 'profundidad', min: 0.05, max: 1.4, step: 0.01 }
  ],
  multipass: [
    {
      type: 'select',
      key: 'multipassMode',
      label: 'operación',
      rebuild: true,
      options: [
        ['blur', 'blur'],
        ['edge', 'edgeDetect'],
        ['dilate', 'dilate'],
        ['bloom', 'bloom']
      ]
    },
    { type: 'range', key: 'multipassAmount', label: 'radio / fuerza', min: 0.2, max: 8, step: 0.1 }
  ],
  time: [
    { type: 'range', key: 'timeRate', label: 'velocidad', min: 0.05, max: 2, step: 0.01, effect: 'speed' }
  ],
  history: [
    { type: 'range', key: 'historyDepth', label: 'demora', min: 1, max: 32, step: 1, rebuild: true, format: (value) => String(Math.round(value)) }
  ],
  feedback: [
    { type: 'range', key: 'feedbackAmount', label: 'retorno', min: 0, max: 0.995, step: 0.001 },
    { type: 'range', key: 'feedbackScale', label: 'escala', min: 0.97, max: 1.03, step: 0.001 },
    { type: 'range', key: 'feedbackRotate', label: 'rotación', min: -0.025, max: 0.025, step: 0.001 }
  ],
  external: [
    {
      type: 'actions',
      actions: [
        { label: 'cargar archivo', action: 'pick-media' },
        { label: 'activar cámara', action: 'camera' }
      ],
      note: 'El archivo permanece dentro de esta pestaña.'
    }
  ],
  finalSystem: [
    {
      type: 'select',
      key: 'finalSource',
      label: 'fuente',
      rebuild: true,
      options: [
        ['fbm', 'fbm'],
        ['osc', 'osc'],
        ['shape', 'shape']
      ]
    },
    {
      type: 'select',
      key: 'finalRelation',
      label: 'relación',
      rebuild: true,
      options: [
        ['modulate', 'modulate'],
        ['blend', 'blend'],
        ['mult', 'mult']
      ]
    },
    { type: 'range', key: 'finalDepth', label: 'profundidad', min: 0, max: 0.7, step: 0.01 },
    { type: 'range', key: 'finalMemory', label: 'memoria', min: 0, max: 0.96, step: 0.01, rebuild: true }
  ]
}

let runtime = null
let synth = null
let runtimeReady = false
let currentSceneIndex = 0
let currentCode = ''
let paused = false
let wheelLocked = false
let rebuildFrame = 0
let mediaFile = null
let externalMode = 'mouse'
let cameraActive = false
let touchStart = null

const currentScene = () => scenes[currentSceneIndex]
const currentChapter = () => chapters.find((chapter) => chapter.id === currentScene().chapter) ?? chapters[0]

const hydraWidth = () => Number(synth?.width ?? ui.canvas.width ?? 1280)
const hydraHeight = () => Number(synth?.height ?? ui.canvas.height ?? 720)
const aspectA = () => hydraWidth() > hydraHeight() ? hydraHeight() / hydraWidth() : 1
const aspectB = () => hydraHeight() > hydraWidth() ? hydraWidth() / hydraHeight() : 1

const fieldNoise = (frequency = 2.5, velocity = 0.05, radius = 0.7) =>
  synth.noiseLoop(frequency, velocity, radius).scale(1, aspectA(), aspectB())

const parameterField = (scale = 1, offset = 0) =>
  fieldNoise(
    () => 1.3 + controls.intermodDepth * 2.2,
    0.045,
    0.72
  ).r(
    () => scale * controls.intermodDepth,
    offset
  )

const fitRenderResolution = () => {
  const displayWidth = Math.max(2, window.innerWidth)
  const displayHeight = Math.max(2, window.innerHeight)
  const scale = Math.min(1, 1280 / displayWidth, 720 / displayHeight)
  const even = (value) => Math.max(2, Math.floor(value / 2) * 2)
  return {
    width: even(displayWidth * scale),
    height: even(displayHeight * scale)
  }
}

const resetVisual = () => {
  if (!runtimeReady) return
  runtime.hush()
  runtime.render(synth.o0)
  synth.speed = controls.timeRate
}

const buildSourceGraph = (name = controls.sourceType) => {
  if (name === 'osc') return synth.osc(24, 0.045, 0.22)
  if (name === 'fbm') return synth.fbm(3.2, 0.055, 5, 2, 0.52)
  if (name === 'shape') return synth.shape(5, 0.34, 0.018).repeat(4, 3, 0.18, 0.08)
  return synth.noiseLoop(3.2, 0.055, 0.76)
}

const applyBlend = (base, secondary, mode, amount) => {
  if (mode === 'diff' || mode === 'mask') return base[mode](secondary)
  return base[mode](secondary, amount)
}

const applyModulation = (base, modulator, mode, amount) => {
  if (mode === 'modulateScale') return base.modulateScale(modulator, amount * 1.8, 1)
  if (mode === 'modulateRotate') return base.modulateRotate(modulator, amount * 3.2, 0)
  if (mode === 'modulatePixelate') return base.modulatePixelate(modulator, 4 + amount * 32, 3)
  return base.modulate(modulator, amount)
}

const parameterModeGraph = () => {
  if (controls.parameterMode === 'constant') return 26
  if (controls.parameterMode === 'uniform') {
    return ({ time }) => 26 + Math.sin(time * 0.8) * 18
  }
  return synth.noiseLoop(2.2, 0.045, 0.7).r(38, 8)
}

const drawCodeTexture = (code) => {
  let canvas = document.getElementById('workshop-code-texture')
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.id = 'workshop-code-texture'
    canvas.width = 1024
    canvas.height = 512
    canvas.hidden = true
    document.body.appendChild(canvas)
  }
  const context = canvas.getContext('2d')
  context.fillStyle = '#050505'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.font = '28px ui-monospace, SFMono-Regular, Menlo, monospace'
  context.textBaseline = 'top'
  const lines = String(code).split('\n')
  lines.forEach((line, index) => {
    context.fillStyle = index % 3 === 0 ? '#75f7ff' : index % 3 === 1 ? '#f2f4ed' : '#ff6bd6'
    context.fillText(line, 38, 34 + index * 46, canvas.width - 76)
  })
  return canvas
}

const patchLibrary = {
  opening: {
    run: () => {
      const material = synth.fbm(3.4, 0.055, 5, 2.05, 0.52)
        .modulate(synth.noiseLoop(2.1, 0.04, 0.72).rotate(0.18), 0.13)
        .color(0.72, 0.28, 1.18)
        .contrast(1.28)
      material
        .blend(synth.prev().scale(1.004).rotate(0.0018).brightness(-0.012), 0.81)
        .bloom(0.42, 1.1, 0.55, 0.18)
        .toneMap(1.1, 2.2)
        .out()
    },
    code: () => codeLines(
      'fbm(3.4, .055, 5, 2.05, .52)',
      '  .modulate(noiseLoop(2.1, .04, .72).rotate(.18), .13)',
      '  .color(.72, .28, 1.18)',
      '  .contrast(1.28)',
      '  .blend(prev().scale(1.004).rotate(.0018).brightness(-.012), .81)',
      '  .bloom(.42, 1.1, .55, .18)',
      '  .toneMap(1.1, 2.2)',
      '  .out()'
    )
  },
  causality: {
    run: () => synth.osc(
      () => controls.frequency,
      0.045,
      0.18
    )
      .rotate(() => controls.angle)
      .modulate(synth.noiseLoop(2.2, 0.035, 0.7), 0.08)
      .color(0.85, 0.38, 1.12)
      .out(),
    code: () => codeLines(
      'osc(' + literal(controls.frequency, 0) + ', .045, .18)',
      '  .rotate(' + literal(controls.angle) + ')',
      '  .modulate(noiseLoop(2.2, .035, .7), .08)',
      '  .color(.85, .38, 1.12)',
      '  .out()'
    )
  },
  field: {
    run: () => synth.gradient(0.03)
      .mult(synth.noiseLoop(3.2, 0.05, 0.8).contrast(1.5))
      .modulateScale(synth.osc(9, 0.02, 0), 0.18, 1)
      .color(0.42, 0.9, 1.2)
      .out(),
    code: () => codeLines(
      'gradient(.03)',
      '  .mult(noiseLoop(3.2, .05, .8).contrast(1.5))',
      '  .modulateScale(osc(9, .02, 0), .18, 1)',
      '  .color(.42, .9, 1.2)',
      '  .out()'
    )
  },
  whereWhat: {
    run: () => {
      let graph = synth.osc(18, 0.035, 0.22)
      if (controls.whereWhatMode === 'coordinates') {
        graph = graph.modulateScale(
          synth.noiseLoop(2.6, 0.045, 0.72),
          () => controls.whereWhatAmount * 1.5,
          1
        )
      } else {
        graph = graph
          .contrast(() => 0.7 + controls.whereWhatAmount * 2.6)
          .thresh(() => 0.25 + controls.whereWhatAmount * 0.48, 0.035)
      }
      graph.color(0.68, 0.38, 1.1).out()
    },
    code: () => controls.whereWhatMode === 'coordinates'
      ? codeLines(
        'osc(18, .035, .22)',
        '  .modulateScale(noiseLoop(2.6, .045, .72), ' + literal(controls.whereWhatAmount * 1.5) + ', 1)',
        '  .color(.68, .38, 1.1)',
        '  .out()'
      )
      : codeLines(
        'osc(18, .035, .22)',
        '  .contrast(' + literal(0.7 + controls.whereWhatAmount * 2.6) + ')',
        '  .thresh(' + literal(0.25 + controls.whereWhatAmount * 0.48) + ', .035)',
        '  .color(.68, .38, 1.1)',
        '  .out()'
      )
  },
  dense: {
    run: () => synth.ridged(4.2, 0.065, 6, 2.08, 0.56)
      .modulateRotate(synth.noiseLoop(2.2, 0.035, 0.84), 1.4, -0.5)
      .colorama(0.018)
      .bloom(0.72, 1.5, 0.48, 0.16)
      .edgeDetect(1.35, 0.34)
      .toneMap(1.15, 2.1)
      .out(),
    code: () => codeLines(
      'ridged(4.2, .065, 6, 2.08, .56)',
      '  .modulateRotate(noiseLoop(2.2, .035, .84), 1.4, -.5)',
      '  .colorama(.018)',
      '  .bloom(.72, 1.5, .48, .16)',
      '  .edgeDetect(1.35, .34)',
      '  .toneMap(1.15, 2.1)',
      '  .out()'
    )
  },
  graph: {
    run: () => synth.osc(22, 0.04, 0.18)
      .modulate(
        synth.noiseLoop(2.4, 0.045, 0.72)
          .rotate(0.16)
          .contrast(1.3),
        0.16
      )
      .blend(
        synth.shape(5, 0.34, 0.02)
          .repeat(4, 3, 0.12, 0.08)
          .rotate(({ time }) => time * -0.035),
        0.38
      )
      .color(0.72, 0.45, 1.1)
      .out(),
    code: () => codeLines(
      'osc(22, .04, .18)',
      '  .modulate(',
      '    noiseLoop(2.4, .045, .72)',
      '      .rotate(.16)',
      '      .contrast(1.3),',
      '    .16',
      '  )',
      '  .blend(',
      '    shape(5, .34, .02)',
      '      .repeat(4, 3, .12, .08)',
      '      .rotate(() => time * -.035),',
      '    .38',
      '  )',
      '  .color(.72, .45, 1.1)',
      '  .out()'
    )
  },
  source: {
    run: () => buildSourceGraph()
      .color(0.72, 0.44, 1.08)
      .contrast(1.25)
      .out(),
    code: () => {
      const sourceCode = {
        osc: 'osc(24, .045, .22)',
        noiseLoop: 'noiseLoop(3.2, .055, .76)',
        fbm: 'fbm(3.2, .055, 5, 2, .52)',
        shape: 'shape(5, .34, .018).repeat(4, 3, .18, .08)'
      }[controls.sourceType]
      return codeLines(
        sourceCode,
        '  .color(.72, .44, 1.08)',
        '  .contrast(1.25)',
        '  .out()'
      )
    }
  },
  geometry: {
    run: () => synth.osc(22, 0.04, 0.2)
      .repeat(
        () => Math.round(controls.geometryRepeat),
        () => Math.max(1, Math.round(controls.geometryRepeat - 1)),
        0.12,
        0.08
      )
      .scale(() => controls.geometryScale)
      .rotate(() => controls.geometryAngle)
      .color(0.78, 0.38, 1.12)
      .out(),
    code: () => codeLines(
      'osc(22, .04, .2)',
      '  .repeat(' + Math.round(controls.geometryRepeat) + ', ' + Math.max(1, Math.round(controls.geometryRepeat - 1)) + ', .12, .08)',
      '  .scale(' + literal(controls.geometryScale) + ')',
      '  .rotate(' + literal(controls.geometryAngle) + ')',
      '  .color(.78, .38, 1.12)',
      '  .out()'
    )
  },
  color: {
    run: () => synth.noiseLoop(3.1, 0.05, 0.76)
      .contrast(() => controls.colorContrast)
      .thresh(() => controls.colorThreshold, 0.045)
      .hue(() => controls.colorHue)
      .color(0.72, 0.38, 1.15)
      .out(),
    code: () => codeLines(
      'noiseLoop(3.1, .05, .76)',
      '  .contrast(' + literal(controls.colorContrast) + ')',
      '  .thresh(' + literal(controls.colorThreshold) + ', .045)',
      '  .hue(' + literal(controls.colorHue) + ')',
      '  .color(.72, .38, 1.15)',
      '  .out()'
    )
  },
  blend: {
    run: () => {
      const base = synth.osc(18, 0.04, 0.18).rotate(0.16)
      const second = synth.shape(5, 0.34, 0.025)
        .repeat(4, 3, 0.14, 0.1)
        .rotate(({ time }) => time * -0.04)
      applyBlend(base, second, controls.blendMode, () => controls.blendAmount)
        .color(0.76, 0.48, 1.08)
        .out()
    },
    code: () => {
      const amount = controls.blendMode === 'diff' || controls.blendMode === 'mask'
        ? ''
        : ', ' + literal(controls.blendAmount)
      return codeLines(
        'osc(18, .04, .18).rotate(.16)',
        '  .' + controls.blendMode + '(',
        '    shape(5, .34, .025)',
        '      .repeat(4, 3, .14, .1)',
        '      .rotate(() => time * -.04)' + amount,
        '  )',
        '  .color(.76, .48, 1.08)',
        '  .out()'
      )
    }
  },
  modulation: {
    run: () => {
      const material = synth.osc(20, 0.04, 0.2).rotate(0.12)
      const modulator = synth.noiseLoop(2.5, 0.04, 0.72).contrast(1.35)
      applyModulation(material, modulator, controls.modulationMode, () => controls.modulationAmount)
        .color(0.7, 0.36, 1.14)
        .out()
    },
    code: () => {
      let args = literal(controls.modulationAmount)
      if (controls.modulationMode === 'modulateScale') args = literal(controls.modulationAmount * 1.8) + ', 1'
      if (controls.modulationMode === 'modulateRotate') args = literal(controls.modulationAmount * 3.2) + ', 0'
      if (controls.modulationMode === 'modulatePixelate') args = literal(4 + controls.modulationAmount * 32) + ', 3'
      return codeLines(
        'osc(20, .04, .2).rotate(.12)',
        '  .' + controls.modulationMode + '(',
        '    noiseLoop(2.5, .04, .72).contrast(1.35),',
        '    ' + args,
        '  )',
        '  .color(.7, .36, 1.14)',
        '  .out()'
      )
    }
  },
  outputs: {
    run: () => {
      synth.osc(18, 0.04, 0.18).out(synth.o0)
      synth.noiseLoop(3.2, 0.05, 0.75).color(0.35, 0.8, 1.1).out(synth.o1)
      synth.shape(5, 0.34, 0.02).repeat(4, 3).rotate(({ time }) => time * 0.03).out(synth.o2)
      synth.src(synth.o0)
        .modulate(synth.src(synth.o1), 0.14)
        .blend(synth.src(synth.o2), 0.34)
        .out(synth.o3)
      runtime.render()
    },
    code: () => codeLines(
      'osc(18, .04, .18).out(o0)',
      'noiseLoop(3.2, .05, .75).color(.35, .8, 1.1).out(o1)',
      'shape(5, .34, .02).repeat(4, 3).rotate(() => time * .03).out(o2)',
      '',
      'src(o0)',
      '  .modulate(src(o1), .14)',
      '  .blend(src(o2), .34)',
      '  .out(o3)',
      '',
      'render()'
    )
  },
  parameterScale: {
    run: () => synth.osc(parameterModeGraph(), 0.04, 0.18)
      .modulate(synth.noiseLoop(2.3, 0.035, 0.7), 0.06)
      .color(0.72, 0.4, 1.12)
      .out(),
    code: () => {
      const parameter = controls.parameterMode === 'constant'
        ? '26'
        : controls.parameterMode === 'uniform'
          ? '() => 26 + Math.sin(time * .8) * 18'
          : 'noiseLoop(2.2, .045, .7).r(38, 8)'
      return codeLines(
        'osc(' + parameter + ', .04, .18)',
        '  .modulate(noiseLoop(2.3, .035, .7), .06)',
        '  .color(.72, .4, 1.12)',
        '  .out()'
      )
    }
  },
  parameterUniform: {
    run: () => synth.shape(
      ({ time }) => 3 + Math.floor((Math.sin(time * 0.8) * 0.5 + 0.5) * 6),
      0.35,
      0.02
    )
      .repeat(5, 4, 0.12, 0.08)
      .rotate(({ time }) => time * 0.04)
      .color(0.42, 0.82, 1.08)
      .out(),
    code: () => codeLines(
      'shape(',
      '  () => 3 + Math.floor((Math.sin(time * .8) * .5 + .5) * 6),',
      '  .35,',
      '  .02',
      ')',
      '  .repeat(5, 4, .12, .08)',
      '  .rotate(() => time * .04)',
      '  .color(.42, .82, 1.08)',
      '  .out()'
    )
  },
  parameterField: {
    run: () => synth.osc(
      synth.noiseLoop(2.15, 0.045, 0.72).r(42, 7),
      0.038,
      0.16
    )
      .contrast(1.25)
      .color(0.78, 0.32, 1.15)
      .out(),
    code: () => codeLines(
      'osc(',
      '  noiseLoop(2.15, .045, .72).r(42, 7),',
      '  .038,',
      '  .16',
      ')',
      '  .contrast(1.25)',
      '  .color(.78, .32, 1.15)',
      '  .out()'
    )
  },
  deepIntermod: {
    run: () => {
      let graph
      if (controls.intermodTarget === 'threshold') {
        graph = synth.noiseLoop(3.2, 0.055, 0.78)
          .modulate(synth.osc(13, 0.02, 0), 0.1)
          .thresh(parameterField(0.34, 0.42), 0.035)
      } else if (controls.intermodTarget === 'blur') {
        graph = synth.ridged(4, 0.055, 5, 2, 0.54)
          .color(0.65, 0.34, 1.14)
          .blurFast(parameterField(3.8, 0.4))
      } else {
        graph = synth.osc(parameterField(38, 7), 0.04, 0.18)
          .modulateScale(fieldNoise(2.6, 0.035, 0.74), 0.18, 1)
      }
      graph.colorama(0.008).contrast(1.22).out()
    },
    code: () => {
      const depth = literal(controls.intermodDepth)
      if (controls.intermodTarget === 'threshold') {
        return codeLines(
          'noiseLoop(3.2, .055, .78)',
          '  .modulate(osc(13, .02, 0), .1)',
          '  .thresh(',
          '    noiseLoop(1.3 + ' + depth + ' * 2.2, .045, .72)',
          '      .r(.34 * ' + depth + ', .42),',
          '    .035',
          '  )',
          '  .colorama(.008)',
          '  .contrast(1.22)',
          '  .out()'
        )
      }
      if (controls.intermodTarget === 'blur') {
        return codeLines(
          'ridged(4, .055, 5, 2, .54)',
          '  .color(.65, .34, 1.14)',
          '  .blurFast(',
          '    noiseLoop(1.3 + ' + depth + ' * 2.2, .045, .72)',
          '      .r(3.8 * ' + depth + ', .4)',
          '  )',
          '  .colorama(.008)',
          '  .contrast(1.22)',
          '  .out()'
        )
      }
      return codeLines(
        'osc(',
        '  noiseLoop(1.3 + ' + depth + ' * 2.2, .045, .72)',
        '    .r(38 * ' + depth + ', 7),',
        '  .04,',
        '  .18',
        ')',
        '  .modulateScale(noiseLoop(2.6, .035, .74), .18, 1)',
        '  .colorama(.008)',
        '  .contrast(1.22)',
        '  .out()'
      )
    }
  },
  multipass: {
    run: () => {
      let graph = synth.fbm(4.1, 0.05, 5, 2, 0.52)
        .modulate(synth.osc(18, 0.025, 0.1), 0.12)
        .color(0.68, 0.35, 1.15)
      if (controls.multipassMode === 'edge') {
        graph = graph.edgeDetect(() => controls.multipassAmount, 0.72)
      } else if (controls.multipassMode === 'dilate') {
        graph = graph.dilate(() => controls.multipassAmount)
      } else if (controls.multipassMode === 'bloom') {
        graph = graph.bloom(
          () => controls.multipassAmount * 0.16,
          () => controls.multipassAmount * 0.55,
          0.52,
          0.16
        )
      } else {
        graph = graph.blur(() => controls.multipassAmount)
      }
      graph.toneMap(1.12, 2.15).out()
    },
    code: () => {
      const amount = literal(controls.multipassAmount)
      let operation = '.blur(' + amount + ')'
      if (controls.multipassMode === 'edge') operation = '.edgeDetect(' + amount + ', .72)'
      if (controls.multipassMode === 'dilate') operation = '.dilate(' + amount + ')'
      if (controls.multipassMode === 'bloom') {
        operation = '.bloom(' + literal(controls.multipassAmount * 0.16) + ', ' +
          literal(controls.multipassAmount * 0.55) + ', .52, .16)'
      }
      return codeLines(
        'fbm(4.1, .05, 5, 2, .52)',
        '  .modulate(osc(18, .025, .1), .12)',
        '  .color(.68, .35, 1.15)',
        '  ' + operation,
        '  .toneMap(1.12, 2.15)',
        '  .out()'
      )
    }
  },
  time: {
    run: () => {
      const sides = [3, 4, 5, 7]
      if (typeof sides.smooth === 'function') sides.smooth(0.22)
      synth.shape(sides, 0.34, 0.018)
        .repeat(5, 4, 0.12, 0.08)
        .rotate(({ time }) => time * 0.045)
        .modulateScale(synth.osc(9, 0.03, 0), 0.16, 1)
        .color(0.46, 0.82, 1.08)
        .out()
    },
    code: () => codeLines(
      'shape([3, 4, 5, 7].smooth(.22), .34, .018)',
      '  .repeat(5, 4, .12, .08)',
      '  .rotate(() => time * .045)',
      '  .modulateScale(osc(9, .03, 0), .16, 1)',
      '  .color(.46, .82, 1.08)',
      '  .out()',
      '',
      'speed = ' + literal(controls.timeRate)
    )
  },
  stateless: {
    run: () => synth.noiseLoop(3.2, 0.06, 0.75)
      .modulateRotate(synth.osc(12, 0.02, 0), 0.75, -0.35)
      .color(0.42, 0.76, 1.12)
      .out(),
    code: () => codeLines(
      'noiseLoop(3.2, .06, .75)',
      '  .modulateRotate(osc(12, .02, 0), .75, -.35)',
      '  .color(.42, .76, 1.12)',
      '  .out()'
    )
  },
  feedback: {
    run: () => synth.osc(14, 0.035, 0.18)
      .modulate(synth.noiseLoop(2.1, 0.03, 0.7), 0.06)
      .blend(
        synth.prev()
          .scale(() => controls.feedbackScale)
          .rotate(() => controls.feedbackRotate)
          .brightness(-0.012),
        () => controls.feedbackAmount
      )
      .color(0.72, 0.36, 1.12)
      .out(),
    code: () => codeLines(
      'osc(14, .035, .18)',
      '  .modulate(noiseLoop(2.1, .03, .7), .06)',
      '  .blend(',
      '    prev()',
      '      .scale(' + literal(controls.feedbackScale) + ')',
      '      .rotate(' + literal(controls.feedbackRotate) + ')',
      '      .brightness(-.012),',
      '    ' + literal(controls.feedbackAmount),
      '  )',
      '  .color(.72, .36, 1.12)',
      '  .out()'
    )
  },
  history: {
    run: () => synth.osc(16, 0.035, 0.18)
      .blend(
        synth.prevN(Math.max(1, Math.round(controls.historyDepth)))
          .scale(1.008)
          .rotate(0.003)
          .hue(0.035),
        0.72
      )
      .modulate(synth.noiseLoop(2.2, 0.025, 0.7), 0.055)
      .color(0.72, 0.4, 1.08)
      .out(),
    code: () => codeLines(
      'osc(16, .035, .18)',
      '  .blend(',
      '    prevN(' + Math.max(1, Math.round(controls.historyDepth)) + ')',
      '      .scale(1.008)',
      '      .rotate(.003)',
      '      .hue(.035),',
      '    .72',
      '  )',
      '  .modulate(noiseLoop(2.2, .025, .7), .055)',
      '  .color(.72, .4, 1.08)',
      '  .out()'
    )
  },
  external: {
    run: async () => {
      if (externalMode === 'file' && mediaFile) {
        if (mediaFile.type.startsWith('video/')) synth.s0.initVideo(mediaFile)
        else synth.s0.initImage(mediaFile)
      }
      if (externalMode === 'file' || externalMode === 'camera') {
        synth.src(synth.s0)
          .scale(1, aspectA(), aspectB())
          .modulate(fieldNoise(2.2, 0.035, 0.7), 0.11)
          .color(0.82, 0.66, 1.08)
          .out()
        return
      }
      synth.osc(
        () => 8 + (Number(synth.mouse.x) / Math.max(1, hydraWidth())) * 64,
        0.04,
        0.16
      )
        .modulateScale(
          fieldNoise(2.4, 0.04, 0.74),
          () => 0.08 + (Number(synth.mouse.y) / Math.max(1, hydraHeight())) * 0.5,
          1
        )
        .color(0.7, 0.38, 1.16)
        .out()
    },
    code: () => {
      if (externalMode === 'file' || externalMode === 'camera') {
        return codeLines(
          '// carga una imagen, video o cámara en s0',
          'src(s0)',
          '  .scale(1, A, B)',
          '  .modulate(nsloop(2.2, .035, .7), .11)',
          '  .color(.82, .66, 1.08)',
          '  .out()'
        )
      }
      return codeLines(
        'osc(',
        '  () => 8 + mouse.x / width * 64,',
        '  .04,',
        '  .16',
        ')',
        '  .modulateScale(',
        '    nsloop(2.4, .04, .74),',
        '    () => .08 + mouse.y / height * .5,',
        '    1',
        '  )',
        '  .color(.7, .38, 1.16)',
        '  .out()'
      )
    }
  },
  codeTexture: {
    run: () => {
      const sampleCode = codeLines(
        'attachCodeMaterial("s3")',
        'src(s3)',
        '  .modulate(noiseLoop(2.4, .04, .7), .12)',
        '  .diff(osc(18, .03, .2))',
        '  .out()'
      )
      const codeCanvas = drawCodeTexture(sampleCode)
      synth.s3.init({ src: codeCanvas, dynamic: true })
      synth.src(synth.s3)
        .modulate(fieldNoise(2.4, 0.04, 0.7), 0.12)
        .diff(synth.osc(18, 0.03, 0.2))
        .color(0.72, 0.54, 1.08)
        .out()
    },
    code: () => codeLines(
      'attachCodeMaterial("s3")',
      '',
      'src(s3)',
      '  .modulate(noiseLoop(2.4, .04, .7), .12)',
      '  .diff(osc(18, .03, .2))',
      '  .color(.72, .54, 1.08)',
      '  .out()'
    )
  },
  score: {
    run: () => synth.shape([3, 4, 6, 8], 0.34, 0.018)
      .repeat(5, 4, 0.12, 0.08)
      .rotate(({ time }) => time * 0.035)
      .modulateScale(synth.noiseLoop(2.2, 0.035, 0.74), 0.2, 1)
      .blend(synth.prev().scale(1.004).brightness(-0.018), 0.66)
      .color(0.45, 0.84, 1.1)
      .out(),
    code: () => codeLines(
      'startInterfaceRecording({ label: "trayectoria 01" })',
      '',
      'shape([3, 4, 6, 8], .34, .018)',
      '  .repeat(5, 4, .12, .08)',
      '  .rotate(() => time * .035)',
      '  .modulateScale(noiseLoop(2.2, .035, .74), .2, 1)',
      '  .blend(prev().scale(1.004).brightness(-.018), .66)',
      '  .color(.45, .84, 1.1)',
      '  .out()',
      '',
      '// stopInterfaceRecording() guarda la partitura'
    )
  },
  performance: {
    run: () => synth.fbm(3.4, 0.055, 5, 2, 0.52)
      .modulateRotate(
        synth.noiseLoop(2.2, 0.04, 0.76)
          .modulate(synth.osc(8, 0.02, 0), 0.08),
        1.2,
        -0.48
      )
      .blend(
        synth.shape(6, 0.3, 0.025)
          .repeat(4, 3)
          .rotate(({ time }) => time * -0.025),
        0.28
      )
      .blend(synth.prev().scale(1.003).hue(0.012).brightness(-0.014), 0.74)
      .bloom(0.48, 1.1, 0.5, 0.16)
      .toneMap(1.15, 2.15)
      .out(),
    code: () => codeLines(
      'fbm(3.4, .055, 5, 2, .52)',
      '  .modulateRotate(',
      '    noiseLoop(2.2, .04, .76)',
      '      .modulate(osc(8, .02, 0), .08),',
      '    1.2,',
      '    -.48',
      '  )',
      '  .blend(shape(6, .3, .025).repeat(4, 3).rotate(() => time * -.025), .28)',
      '  .blend(prev().scale(1.003).hue(.012).brightness(-.014), .74)',
      '  .bloom(.48, 1.1, .5, .16)',
      '  .toneMap(1.15, 2.15)',
      '  .out()'
    )
  },
  finalSystem: {
    run: () => {
      let graph = buildSourceGraph(controls.finalSource)
      const second = synth.noiseLoop(2.4, 0.04, 0.74).rotate(0.12)
      if (controls.finalRelation === 'blend') {
        graph = graph.blend(second.color(0.35, 0.82, 1.12), () => controls.finalDepth)
      } else if (controls.finalRelation === 'mult') {
        graph = graph.mult(second.contrast(1.4), () => controls.finalDepth)
      } else {
        graph = graph.modulate(second, () => controls.finalDepth)
      }
      graph = graph
        .rotate(({ time }) => time * 0.025)
        .color(0.7, 0.4, 1.13)
        .contrast(1.22)
      if (controls.finalMemory > 0.001) {
        graph = graph.blend(
          synth.prev().scale(1.004).rotate(0.0015).brightness(-0.014),
          () => controls.finalMemory
        )
      }
      graph.bloom(0.38, 1, 0.54, 0.16).toneMap(1.12, 2.15).out()
    },
    code: () => {
      const sourceCode = {
        fbm: 'fbm(3.2, .055, 5, 2, .52)',
        osc: 'osc(24, .045, .22)',
        shape: 'shape(5, .34, .018).repeat(4, 3, .18, .08)'
      }[controls.finalSource]
      let relation
      if (controls.finalRelation === 'blend') {
        relation = '.blend(noiseLoop(2.4, .04, .74).rotate(.12).color(.35, .82, 1.12), ' + literal(controls.finalDepth) + ')'
      } else if (controls.finalRelation === 'mult') {
        relation = '.mult(noiseLoop(2.4, .04, .74).rotate(.12).contrast(1.4), ' + literal(controls.finalDepth) + ')'
      } else {
        relation = '.modulate(noiseLoop(2.4, .04, .74).rotate(.12), ' + literal(controls.finalDepth) + ')'
      }
      const lines = [
        sourceCode,
        '  ' + relation,
        '  .rotate(() => time * .025)',
        '  .color(.7, .4, 1.13)',
        '  .contrast(1.22)'
      ]
      if (controls.finalMemory > 0.001) {
        lines.push(
          '  .blend(prev().scale(1.004).rotate(.0015).brightness(-.014), ' + literal(controls.finalMemory) + ')'
        )
      }
      lines.push(
        '  .bloom(.38, 1, .54, .16)',
        '  .toneMap(1.12, 2.15)',
        '  .out()'
      )
      return lines.join('\n')
    }
  }
}

const getPatch = (scene = currentScene()) => patchLibrary[scene.patch] ?? patchLibrary.opening

const buildHydraUrl = (code) => {
  const bytes = new TextEncoder().encode(String(code ?? ''))
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  const encoded = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
  const hydraPath = window.location.pathname.startsWith('/packages/workshop/')
    ? '/packages/hydra/index.html'
    : '/hydra/'
  const url = new URL(hydraPath, window.location.origin)
  url.hash = 'code=' + encoded
  return url.toString()
}

const updateCode = () => {
  const patch = getPatch()
  currentCode = String(patch.code?.() ?? '')
  ui.sceneCode.textContent = currentCode
  ui.openHydra.href = buildHydraUrl(currentCode)
}

const renderGraph = (nodes = []) => {
  ui.graphStrip.replaceChildren()
  nodes.forEach((label, index) => {
    if (index > 0) {
      const arrow = document.createElement('span')
      arrow.className = 'graph-arrow'
      arrow.textContent = '→'
      arrow.setAttribute('aria-hidden', 'true')
      ui.graphStrip.appendChild(arrow)
    }
    const node = document.createElement('span')
    node.className = 'graph-node'
    node.textContent = label
    ui.graphStrip.appendChild(node)
  })
  ui.graphStrip.hidden = nodes.length === 0
}

const schedulePatchRebuild = () => {
  window.cancelAnimationFrame(rebuildFrame)
  rebuildFrame = window.requestAnimationFrame(() => {
    void runCurrentPatch()
  })
}

const formatControlValue = (schema, value) => {
  if (schema.format) return schema.format(value)
  if (typeof value === 'number') return literal(value)
  const option = schema.options?.find(([key]) => key === value)
  return option?.[1] ?? String(value)
}

const renderControls = (schemaName) => {
  const schema = controlSchemas[schemaName] ?? []
  ui.experimentControls.replaceChildren()
  ui.experiment.hidden = schema.length === 0
  if (schema.length === 0) return

  schema.forEach((definition) => {
    if (definition.type === 'actions') {
      const row = document.createElement('div')
      row.className = 'control-row control-action-row'
      definition.actions.forEach((action) => {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'control-button'
        button.textContent = action.label
        button.dataset.action = action.action
        if (action.action === 'camera') button.setAttribute('aria-pressed', String(cameraActive))
        button.addEventListener('click', () => {
          void handleControlAction(action.action, button)
        })
        row.appendChild(button)
      })
      ui.experimentControls.appendChild(row)
      if (definition.note) {
        const note = document.createElement('p')
        note.className = 'control-file-label'
        note.textContent = definition.note
        ui.experimentControls.appendChild(note)
      }
      return
    }

    const row = document.createElement('label')
    row.className = 'control-row'
    const label = document.createElement('span')
    label.className = 'control-label'
    label.textContent = definition.label
    row.appendChild(label)

    let input
    if (definition.type === 'select') {
      input = document.createElement('select')
      definition.options.forEach(([value, text]) => {
        const option = document.createElement('option')
        option.value = value
        option.textContent = text
        input.appendChild(option)
      })
      input.value = controls[definition.key]
    } else {
      input = document.createElement('input')
      input.type = 'range'
      input.min = String(definition.min)
      input.max = String(definition.max)
      input.step = String(definition.step)
      input.value = String(controls[definition.key])
    }
    input.setAttribute('aria-label', definition.label)
    row.appendChild(input)

    const value = document.createElement('span')
    value.className = 'control-value'
    value.textContent = formatControlValue(definition, controls[definition.key])
    row.appendChild(value)

    const eventName = definition.type === 'range' ? 'input' : 'change'
    input.addEventListener(eventName, () => {
      controls[definition.key] = definition.type === 'range' ? Number(input.value) : input.value
      value.textContent = formatControlValue(definition, controls[definition.key])
      if (definition.effect === 'speed' && synth) synth.speed = controls.timeRate
      updateCode()
      if (definition.rebuild) schedulePatchRebuild()
    })
    row.addEventListener('change', () => {
      if (definition.rebuild) schedulePatchRebuild()
    })
    ui.experimentControls.appendChild(row)
  })
}

const renderScene = () => {
  const scene = currentScene()
  const chapter = currentChapter()
  ui.scene.dataset.kind = scene.kind ?? 'content'
  ui.sceneKicker.textContent = scene.kicker ?? ''
  ui.sceneTitle.textContent = scene.title
  ui.sceneBody.replaceChildren()
  scene.body.forEach((paragraph) => {
    const node = document.createElement('p')
    node.textContent = paragraph
    ui.sceneBody.appendChild(node)
  })
  ui.scenePrompt.textContent = scene.prompt ?? ''
  ui.scenePrompt.hidden = !scene.prompt
  renderGraph(scene.graph)
  renderControls(scene.controls)

  ui.chapterIndex.textContent = chapter.index
  ui.chapterLabel.textContent = chapter.label
  ui.sceneCurrent.textContent = pad(currentSceneIndex + 1)
  ui.sceneTotal.textContent = pad(scenes.length)
  ui.progressFill.style.width = ((currentSceneIndex + 1) / scenes.length * 100) + '%'
  ui.previous.disabled = currentSceneIndex === 0
  ui.next.disabled = currentSceneIndex === scenes.length - 1

  ui.scene.style.animation = 'none'
  void ui.scene.offsetWidth
  ui.scene.style.animation = ''
  updateCode()
  updateMapState()
}

const runCurrentPatch = async () => {
  if (!runtimeReady) return
  const scene = currentScene()
  const patch = getPatch(scene)
  try {
    resetVisual()
    await Promise.resolve(patch.run?.())
    if (!paused && !runtime.host.isRunning) await runtime.start()
    ui.runtimeStatus.textContent = ''
    ui.runtimeStatus.style.opacity = ''
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    ui.runtimeStatus.textContent = 'El patch no pudo ejecutarse: ' + message
    ui.runtimeStatus.style.opacity = '1'
    console.error('[workshop] patch failed', { scene: scene.id, error })
  }
}

const sceneIndexFromHash = () => {
  const id = decodeURIComponent(window.location.hash.replace(/^#/, ''))
  const index = scenes.findIndex((scene) => scene.id === id)
  return index >= 0 ? index : 0
}

const goToScene = (index, options = {}) => {
  const nextIndex = clamp(Math.round(index), 0, scenes.length - 1)
  const changed = nextIndex !== currentSceneIndex
  const leavingCamera = changed && getPatch().run === patchLibrary.external.run && cameraActive
  if (leavingCamera) {
    synth?.s0.clear()
    cameraActive = false
    externalMode = 'mouse'
  }
  currentSceneIndex = nextIndex
  const scene = currentScene()
  const nextHash = '#' + encodeURIComponent(scene.id)
  if (window.location.hash !== nextHash) {
    const method = options.push ? 'pushState' : 'replaceState'
    window.history[method]({ workshopScene: scene.id }, '', nextHash)
  }
  renderScene()
  if (changed || options.force) void runCurrentPatch()
}

const nextScene = () => {
  if (currentSceneIndex < scenes.length - 1) goToScene(currentSceneIndex + 1)
}

const previousScene = () => {
  if (currentSceneIndex > 0) goToScene(currentSceneIndex - 1)
}

const closePanels = () => {
  ui.codePanel.hidden = true
  ui.mapPanel.hidden = true
  ui.codeButton.setAttribute('aria-expanded', 'false')
  ui.mapButton.setAttribute('aria-expanded', 'false')
}

const togglePanel = (name) => {
  const panel = name === 'code' ? ui.codePanel : ui.mapPanel
  const button = name === 'code' ? ui.codeButton : ui.mapButton
  const otherPanel = name === 'code' ? ui.mapPanel : ui.codePanel
  const otherButton = name === 'code' ? ui.mapButton : ui.codeButton
  const opening = panel.hidden
  otherPanel.hidden = true
  otherButton.setAttribute('aria-expanded', 'false')
  panel.hidden = !opening
  button.setAttribute('aria-expanded', String(opening))
  if (opening) panel.querySelector('.panel-close')?.focus()
}

const buildChapterMap = () => {
  ui.chapterMap.replaceChildren()
  chapters.forEach((chapter) => {
    const firstIndex = scenes.findIndex((scene) => scene.chapter === chapter.id)
    const count = scenes.filter((scene) => scene.chapter === chapter.id).length
    const link = document.createElement('a')
    link.className = 'chapter-link'
    link.href = '#' + scenes[firstIndex].id
    link.dataset.chapter = chapter.id
    link.innerHTML =
      '<span class="chapter-link-index">' + chapter.index + '</span>' +
      '<span>' + chapter.label + '</span>' +
      '<span class="chapter-link-count">' + count + '</span>'
    link.addEventListener('click', (event) => {
      event.preventDefault()
      closePanels()
      goToScene(firstIndex, { push: true })
    })
    ui.chapterMap.appendChild(link)
  })
}

const updateMapState = () => {
  ui.chapterMap.querySelectorAll('.chapter-link').forEach((link) => {
    link.setAttribute('aria-current', String(link.dataset.chapter === currentScene().chapter))
  })
}

const resetCurrentControls = () => {
  Object.assign(controls, defaults)
  if (cameraActive) synth?.s0.clear()
  cameraActive = false
  externalMode = mediaFile ? 'file' : 'mouse'
  if (synth) synth.speed = controls.timeRate
  renderControls(currentScene().controls)
  updateCode()
  void runCurrentPatch()
}

const handleControlAction = async (action, button) => {
  if (action === 'pick-media') {
    ui.mediaInput.click()
    return
  }
  if (action !== 'camera' || !runtimeReady) return
  try {
    button.disabled = true
    button.textContent = 'solicitando…'
    resetVisual()
    await synth.s0.initCam()
    externalMode = 'camera'
    cameraActive = true
    button.setAttribute('aria-pressed', 'true')
    button.textContent = 'cámara activa'
    await patchLibrary.external.run()
    updateCode()
  } catch (error) {
    cameraActive = false
    externalMode = 'mouse'
    button.setAttribute('aria-pressed', 'false')
    button.textContent = 'activar cámara'
    ui.runtimeStatus.textContent = 'La cámara no pudo activarse.'
    ui.runtimeStatus.style.opacity = '1'
    console.warn('[workshop] camera unavailable', error)
  } finally {
    button.disabled = false
  }
}

const useMediaFile = (file) => {
  if (!(file instanceof File) || (!file.type.startsWith('image/') && !file.type.startsWith('video/'))) return
  mediaFile = file
  externalMode = 'file'
  cameraActive = false
  const externalIndex = scenes.findIndex((scene) => scene.id === 'senales-externas')
  goToScene(externalIndex, { push: true, force: true })
}

const copyCurrentCode = async () => {
  try {
    await navigator.clipboard.writeText(currentCode)
    ui.codeStatus.textContent = 'Código copiado.'
  } catch {
    ui.codeStatus.textContent = 'Selecciona el código y cópialo manualmente.'
    ui.sceneCode.parentElement.focus()
  }
}

const togglePause = async () => {
  if (!runtimeReady) return
  paused = !paused
  ui.pause.setAttribute('aria-pressed', String(paused))
  ui.pause.textContent = paused ? 'reanudar' : 'pausar'
  if (paused) runtime.stop()
  else await runtime.start()
}

const initRuntime = async () => {
  const resolution = fitRenderResolution()
  ui.canvas.width = resolution.width
  ui.canvas.height = resolution.height
  runtime = createHydraBrowserRuntime({
    canvas: ui.canvas,
    autoLoop: false,
    audio: false,
    mouse: true
  })
  synth = runtime.synth
  try {
    await runtime.init()
    runtimeReady = true
    ui.body.dataset.runtime = 'ready'
    synth.speed = controls.timeRate
    await runCurrentPatch()
    await runtime.start()
  } catch (error) {
    runtimeReady = false
    ui.body.dataset.runtime = 'fallback'
    ui.runtimeStatus.textContent = 'WebGPU no está disponible aquí. El recorrido y el código siguen accesibles.'
    console.error('[workshop] WebGPU initialization failed', error)
  }
}

const registerEvents = () => {
  ui.previous.addEventListener('click', previousScene)
  ui.next.addEventListener('click', nextScene)
  ui.pause.addEventListener('click', () => { void togglePause() })
  ui.codeButton.addEventListener('click', () => togglePanel('code'))
  ui.mapButton.addEventListener('click', () => togglePanel('map'))
  ui.resetControls.addEventListener('click', resetCurrentControls)
  ui.copyCode.addEventListener('click', () => { void copyCurrentCode() })

  document.querySelectorAll('[data-close-panel]').forEach((button) => {
    button.addEventListener('click', closePanels)
  })

  window.addEventListener('hashchange', () => {
    const index = sceneIndexFromHash()
    if (index !== currentSceneIndex) goToScene(index, { force: true })
  })

  window.addEventListener('keydown', (event) => {
    const target = event.target
    const editable = target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement ||
      target?.isContentEditable
    if (editable) return
    if (event.key === 'Escape') {
      closePanels()
      return
    }
    if (!ui.codePanel.hidden || !ui.mapPanel.hidden) return
    if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
      event.preventDefault()
      nextScene()
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault()
      previousScene()
    } else if (event.key === 'Home') {
      event.preventDefault()
      goToScene(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      goToScene(scenes.length - 1)
    } else if (event.key.toLowerCase() === 'c') {
      togglePanel('code')
    } else if (event.key.toLowerCase() === 'm') {
      togglePanel('map')
    }
  })

  window.addEventListener('wheel', (event) => {
    if (wheelLocked || !ui.codePanel.hidden || !ui.mapPanel.hidden) return
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return
    if (Math.abs(event.deltaY) < 24 || Math.abs(event.deltaY) < Math.abs(event.deltaX)) return
    wheelLocked = true
    if (event.deltaY > 0) nextScene()
    else previousScene()
    window.setTimeout(() => { wheelLocked = false }, 520)
  }, { passive: true })

  ui.presentation.addEventListener('touchstart', (event) => {
    const touch = event.changedTouches[0]
    if (!touch) return
    touchStart = { x: touch.clientX, y: touch.clientY }
  }, { passive: true })

  ui.presentation.addEventListener('touchend', (event) => {
    const touch = event.changedTouches[0]
    if (!touch || !touchStart) return
    const dx = touch.clientX - touchStart.x
    const dy = touch.clientY - touchStart.y
    touchStart = null
    if (Math.abs(dx) < 54 || Math.abs(dx) < Math.abs(dy)) return
    if (dx < 0) nextScene()
    else previousScene()
  }, { passive: true })

  ui.mediaInput.addEventListener('change', () => {
    const file = ui.mediaInput.files?.[0]
    if (file) useMediaFile(file)
    ui.mediaInput.value = ''
  })

  document.addEventListener('dragenter', (event) => {
    if (!Array.from(event.dataTransfer?.items ?? []).some((item) => item.kind === 'file')) return
    ui.dropMessage.hidden = false
  })
  document.addEventListener('dragover', (event) => {
    if (!Array.from(event.dataTransfer?.items ?? []).some((item) => item.kind === 'file')) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  })
  document.addEventListener('dragleave', (event) => {
    if (event.relatedTarget) return
    ui.dropMessage.hidden = true
  })
  document.addEventListener('drop', (event) => {
    const file = Array.from(event.dataTransfer?.files ?? []).find((candidate) =>
      candidate.type.startsWith('image/') || candidate.type.startsWith('video/')
    )
    ui.dropMessage.hidden = true
    if (!file) return
    event.preventDefault()
    useMediaFile(file)
  })

  let resizeTimer = 0
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      if (!runtimeReady) return
      const resolution = fitRenderResolution()
      runtime.setResolution(resolution.width, resolution.height)
      void runCurrentPatch()
    }, 180)
  })

  window.addEventListener('pagehide', () => {
    window.cancelAnimationFrame(rebuildFrame)
    runtime?.dispose()
  }, { once: true })
}

buildChapterMap()
registerEvents()
currentSceneIndex = sceneIndexFromHash()
renderScene()
void initRuntime()
