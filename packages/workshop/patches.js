const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)))

const round = (value, precision = 3) => {
  const factor = 10 ** precision
  return Math.round(Number(value) * factor) / factor
}

const literal = (value, precision = 3) => {
  const rounded = round(value, precision)
  if (Object.is(rounded, -0)) return '0'
  const text = String(rounded)
  if (text.startsWith('0.')) return text.slice(1)
  if (text.startsWith('-0.')) return `-${text.slice(2)}`
  return text
}

const code = (...lines) => ({
  lines: lines.map(([region, text]) => ({ region, text })),
  text: lines.map(([, text]) => text).join('\n')
})

const branchA = (synth, rotation = 0.12) => synth
  .shape(3, 0.28, 0.025)
  .repeat(4, 3, 0.12, 0.08)
  .rotate(rotation)
  .color(0.18, 0.72, 1.2)

const branchB = (synth) => synth
  .osc(8, 0, 0.2)
  .rotate(0.25)
  .color(1.2, 0.18, 0.48)

const branchCode = (rotation = 0.12) => [
  ['branchA', 'const a = shape(3, .28, .025)'],
  ['branchA', '  .repeat(4, 3, .12, .08)'],
  ['branchA', `  .rotate(${literal(rotation)})`],
  ['branchA', '  .color(.18, .72, 1.2)'],
  ['blank', ''],
  ['branchB', 'const b = osc(8, 0, .2)'],
  ['branchB', '  .rotate(.25)'],
  ['branchB', '  .color(1.2, .18, .48)']
]

const finalVariants = {
  orientation: {
    label: 'orientación',
    min: -0.35,
    max: 0.5,
    step: 0.01,
    default: 0.12
  },
  relation: {
    label: 'profundidad de B',
    min: 0,
    max: 0.58,
    step: 0.01,
    default: 0.28
  },
  time: {
    label: 'velocidad temporal',
    min: 0,
    max: 0.16,
    step: 0.005,
    default: 0.04
  },
  persistence: {
    label: 'persistencia',
    min: 0.45,
    max: 0.96,
    step: 0.01,
    default: 0.82
  }
}

export const defaults = Object.freeze({
  openingDepth: 0.28,
  sourceMode: 'synthetic',
  rotation: 0.12,
  rotationCompare: 0.12,
  order: 'a',
  branchView: 'a',
  materialView: 'both',
  materialAmount: 0.42,
  relationRole: 'control',
  relationDepth: 0.32,
  parameterMode: 'number',
  timeMode: 'static',
  timeStructure: 'a',
  feedbackEnabled: false,
  feedbackPersistence: 0.88,
  feedbackScale: 1.006,
  finalDimension: 'orientation',
  finalValue: 0.12
})

export const controlSets = {
  opening: [
    {
      type: 'range',
      key: 'openingDepth',
      label: 'profundidad de B',
      min: 0.02,
      max: 0.58,
      step: 0.01
    }
  ],
  source: [
    {
      type: 'select',
      key: 'sourceMode',
      label: 'procedencia',
      options: [
        ['synthetic', 'generada'],
        ['external', 'incorporada']
      ]
    },
    {
      type: 'actions',
      label: 'material local',
      actions: [
        { action: 'pick-media', label: 'cargar archivo' },
        { action: 'camera', label: 'usar cámara' }
      ],
      note: 'Opcional. El material permanece en esta pestaña.'
    }
  ],
  rotation: [
    {
      type: 'range',
      key: 'rotation',
      label: 'rotación',
      min: -0.35,
      max: 0.5,
      step: 0.01
    }
  ],
  rotationCompare: [
    {
      type: 'select',
      key: 'rotationCompare',
      label: 'comparar valor',
      numeric: true,
      options: [
        [0.12, '.12 · inicial'],
        [0.32, '.32 · contraste']
      ]
    }
  ],
  order: [
    {
      type: 'select',
      key: 'order',
      label: 'orden',
      options: [
        ['a', 'A · repetir → rotar'],
        ['b', 'B · rotar → repetir']
      ]
    }
  ],
  branchView: [
    {
      type: 'select',
      key: 'branchView',
      label: 'mostrar',
      options: [
        ['a', 'sólo A'],
        ['b', 'sólo B'],
        ['both', 'A + B']
      ]
    }
  ],
  material: [
    {
      type: 'select',
      key: 'materialView',
      label: 'mostrar',
      options: [
        ['a', 'sólo A'],
        ['b', 'sólo B'],
        ['both', 'ambas']
      ]
    },
    {
      type: 'range',
      key: 'materialAmount',
      label: 'presencia de B',
      min: 0,
      max: 0.8,
      step: 0.01
    }
  ],
  materialAmount: [
    {
      type: 'range',
      key: 'materialAmount',
      label: 'presencia de B',
      min: 0,
      max: 0.8,
      step: 0.01
    }
  ],
  relation: [
    {
      type: 'select',
      key: 'relationRole',
      label: 'papel de B',
      options: [
        ['material', 'aporta valores'],
        ['control', 'modifica coordenadas']
      ]
    },
    {
      type: 'range',
      key: 'relationDepth',
      label: 'aporte / profundidad',
      min: 0,
      max: 0.65,
      step: 0.01
    }
  ],
  parameter: [
    {
      type: 'select',
      key: 'parameterMode',
      label: 'tipo de parámetro',
      options: [
        ['number', 'número'],
        ['function', 'función temporal'],
        ['field', 'campo']
      ]
    }
  ],
  time: [
    {
      type: 'select',
      key: 'timeMode',
      label: 'argumento de rotate',
      options: [
        ['static', 'valor constante'],
        ['dynamic', 'función temporal']
      ]
    }
  ],
  timeStructure: [
    {
      type: 'select',
      key: 'timeStructure',
      label: 'estructura activa',
      options: [
        ['a', 'A · repetir → rotar'],
        ['b', 'B · rotar → repetir']
      ]
    }
  ],
  feedbackSwitch: [
    {
      type: 'toggle',
      key: 'feedbackEnabled',
      label: 'reentrada',
      offLabel: 'sin historia',
      onLabel: 'estado anterior activo',
      clearOnChange: true
    },
    {
      type: 'action',
      action: 'clear-history',
      label: 'limpiar estado'
    }
  ],
  feedback: [
    {
      type: 'toggle',
      key: 'feedbackEnabled',
      label: 'reentrada',
      offLabel: 'apagada',
      onLabel: 'activa',
      clearOnChange: true
    },
    {
      type: 'range',
      key: 'feedbackPersistence',
      label: 'persistencia',
      min: 0.45,
      max: 0.96,
      step: 0.01
    },
    {
      type: 'range',
      key: 'feedbackScale',
      label: 'escala antes de volver',
      min: 0.985,
      max: 1.02,
      step: 0.001
    }
  ],
  final: [
    {
      type: 'select',
      key: 'finalDimension',
      label: 'relación elegida',
      options: [
        ['orientation', 'orientación'],
        ['relation', 'profundidad de B'],
        ['time', 'tiempo'],
        ['persistence', 'persistencia']
      ]
    },
    {
      type: 'variant-range',
      key: 'finalValue',
      variantKey: 'finalDimension',
      variants: finalVariants
    },
    {
      type: 'action',
      action: 'copy-url',
      label: 'guardar enlace'
    }
  ]
}

export const recoveries = {
  'opening-default': { values: { openingDepth: 0.28 }, clear: true },
  'source-synthetic': { values: { sourceMode: 'synthetic' }, clear: true },
  'chain-default': { values: { rotation: 0.12, rotationCompare: 0.12 }, clear: true },
  'order-a': { values: { order: 'a' }, clear: true },
  'branches-a': { values: { branchView: 'a' }, clear: true },
  'material-default': { values: { materialView: 'both', materialAmount: 0.42 }, clear: true },
  'relation-control': { values: { relationRole: 'control', relationDepth: 0.32 }, clear: true },
  'time-static': { values: { timeMode: 'static' }, clear: true },
  'time-structure-a': { values: { timeStructure: 'a' }, clear: true },
  'feedback-off-clean': {
    values: { feedbackEnabled: false, feedbackPersistence: 0.88, feedbackScale: 1.006 },
    clear: true
  },
  'final-default': {
    values: { finalDimension: 'orientation', finalValue: 0.12 },
    clear: true
  }
}

const openingCode = (state, selectedRegion = null) => {
  const rotationRegion = selectedRegion === 'orientation' ? 'selectedDimension' : 'time'
  const relationRegion = selectedRegion === 'relation' ? 'selectedDimension' : 'relationAmount'
  const timeRate = selectedRegion === 'time' ? state.finalValue : 0.04
  const rotation = selectedRegion === 'orientation' ? state.finalValue : null
  const relationDepth = selectedRegion === 'relation' ? state.finalValue : state.openingDepth
  const persistence = selectedRegion === 'persistence' ? state.finalValue : 0.82
  const persistenceRegion = selectedRegion === 'persistence' ? 'selectedDimension' : 'persistence'

  return code(
    ['source', 'shape(3, .28, .025)'],
    ['transform', '  .repeat(4, 3, .12, .08)'],
    [rotationRegion, rotation == null
      ? `  .rotate(() => time * ${literal(timeRate)})`
      : `  .rotate(${literal(rotation)})`],
    ['relation', '  .modulate('],
    ['branchB', '    osc(8, 0, .2)'],
    ['branchB', '      .rotate(.25)'],
    ['branchB', '      .color(1.2, .18, .48),'],
    [relationRegion, `    ${literal(relationDepth)}`],
    ['relation', '  )'],
    ['transform', '  .color(.18, .72, 1.2)'],
    ['relation', '  .blend('],
    ['previousState', '    prev().scale(1.004).brightness(-.02),'],
    [persistenceRegion, `    ${literal(persistence)}`],
    ['relation', '  )'],
    ['output', '  .out()']
  )
}

const patches = {
  opening: {
    run: (synth, state) => synth
      .shape(3, 0.28, 0.025)
      .repeat(4, 3, 0.12, 0.08)
      .rotate(({ time }) => time * 0.04)
      .modulate(branchB(synth), clamp(state.openingDepth, 0, 0.7))
      .color(0.18, 0.72, 1.2)
      .blend(synth.prev().scale(1.004).brightness(-0.02), 0.82)
      .out(),
    code: (state) => openingCode(state)
  },

  source: {
    run: (synth, state) => {
      const source = state.sourceMode === 'external'
        ? synth.src(synth.s0).scale(1.08)
        : synth.shape(3, 0.28, 0.025).repeat(4, 3, 0.12, 0.08)

      return source
        .rotate(0.12)
        .color(0.18, 0.72, 1.2)
        .out()
    },
    code: (state) => state.sourceMode === 'external'
      ? code(
        ['source', 'src(s0)'],
        ['transform', '  .scale(1.08)'],
        ['transform', '  .rotate(.12)'],
        ['transform', '  .color(.18, .72, 1.2)'],
        ['output', '  .out()']
      )
      : code(
        ['source', 'shape(3, .28, .025)'],
        ['transform', '  .repeat(4, 3, .12, .08)'],
        ['transform', '  .rotate(.12)'],
        ['transform', '  .color(.18, .72, 1.2)'],
        ['output', '  .out()']
      )
  },

  chain: {
    run: (synth, state, env) => {
      const rotation = env.scene?.controls === 'rotationCompare'
        ? state.rotationCompare
        : state.rotation

      return branchA(synth, rotation).out()
    },
    code: (state, env) => {
      const rotation = env.scene?.controls === 'rotationCompare'
        ? state.rotationCompare
        : state.rotation

      return code(
        ['source', 'shape(3, .28, .025)'],
        ['transform', '  .repeat(4, 3, .12, .08)'],
        ['rotation', `  .rotate(${literal(rotation)})`],
        ['transform', '  .color(.18, .72, 1.2)'],
        ['output', '  .out()']
      )
    }
  },

  order: {
    run: (synth, state) => {
      const source = synth.shape(3, 0.28, 0.025)
      const ordered = state.order === 'b'
        ? source.rotate(0.12).repeat(4, 3, 0.12, 0.08)
        : source.repeat(4, 3, 0.12, 0.08).rotate(0.12)

      return ordered.color(0.18, 0.72, 1.2).out()
    },
    code: (state) => state.order === 'b'
      ? code(
        ['source', 'shape(3, .28, .025)'],
        ['order', '  .rotate(.12)'],
        ['order', '  .repeat(4, 3, .12, .08)'],
        ['transform', '  .color(.18, .72, 1.2)'],
        ['output', '  .out()']
      )
      : code(
        ['source', 'shape(3, .28, .025)'],
        ['order', '  .repeat(4, 3, .12, .08)'],
        ['order', '  .rotate(.12)'],
        ['transform', '  .color(.18, .72, 1.2)'],
        ['output', '  .out()']
      )
  },

  branches: {
    run: (synth, state) => {
      const a = branchA(synth)
      const b = branchB(synth)
      if (state.branchView === 'b') return b.out()
      if (state.branchView === 'both') return a.blend(b, 0.42).out()
      return a.out()
    },
    code: (state) => {
      const output = state.branchView === 'b'
        ? ['output', 'b.out()']
        : state.branchView === 'both'
          ? ['relation', 'a.blend(b, .42).out()']
          : ['output', 'a.out()']
      return code(...branchCode(), ['blank', ''], output)
    }
  },

  material: {
    run: (synth, state) => {
      const a = branchA(synth)
      const b = branchB(synth)
      if (state.materialView === 'a') return a.out()
      if (state.materialView === 'b') return b.out()
      return a.blend(b, clamp(state.materialAmount, 0, 1)).out()
    },
    code: (state) => {
      if (state.materialView === 'a') {
        return code(...branchCode(), ['blank', ''], ['output', 'a.out()'])
      }
      if (state.materialView === 'b') {
        return code(...branchCode(), ['blank', ''], ['output', 'b.out()'])
      }
      return code(
        ...branchCode(),
        ['blank', ''],
        ['relation', `a.blend(b, ${literal(state.materialAmount)})`],
        ['output', '  .out()']
      )
    }
  },

  relation: {
    run: (synth, state) => {
      const a = branchA(synth)
      const b = branchB(synth)
      return state.relationRole === 'material'
        ? a.blend(b, clamp(state.relationDepth, 0, 1)).out()
        : a.modulate(b, clamp(state.relationDepth, 0, 0.8)).out()
    },
    code: (state) => {
      const output = state.relationRole === 'material'
        ? ['relation', `a.blend(b, ${literal(state.relationDepth)}).out()`]
        : ['relation', `a.modulate(b, ${literal(state.relationDepth)}).out()`]
      return code(...branchCode(), ['blank', ''], output)
    }
  },

  parameter: {
    run: (synth, state) => {
      let frequency = 24
      if (state.parameterMode === 'function') {
        frequency = ({ time }) => 24 + Math.sin(time * 0.8) * 12
      }
      if (state.parameterMode === 'field') {
        frequency = synth.noiseLoop(2.2, 0.04, 0.7).r(36, 6)
      }

      return synth
        .osc(frequency, 0, 0.2)
        .rotate(0.25)
        .color(1.2, 0.18, 0.48)
        .out()
    },
    code: (state) => {
      const parameter = state.parameterMode === 'function'
        ? '  () => 24 + Math.sin(time * .8) * 12,'
        : state.parameterMode === 'field'
          ? '  noiseLoop(2.2, .04, .7).r(36, 6),'
          : '  24,'

      return code(
        ['source', 'osc('],
        ['parameter', parameter],
        ['parameter', '  0,'],
        ['parameter', '  .2'],
        ['source', ')'],
        ['transform', '  .rotate(.25)'],
        ['transform', '  .color(1.2, .18, .48)'],
        ['output', '  .out()']
      )
    }
  },

  time: {
    run: (synth, state) => branchA(
      synth,
      state.timeMode === 'dynamic' ? ({ time }) => time * 0.04 : 0.12
    ).out(),
    code: (state) => code(
      ['source', 'shape(3, .28, .025)'],
      ['transform', '  .repeat(4, 3, .12, .08)'],
      ['time', state.timeMode === 'dynamic'
        ? '  .rotate(() => time * .04)'
        : '  .rotate(.12)'],
      ['transform', '  .color(.18, .72, 1.2)'],
      ['output', '  .out()']
    )
  },

  timeStructure: {
    run: (synth, state) => {
      const source = synth.shape(3, 0.28, 0.025)
      const rotate = (graph) => graph.rotate(({ time }) => time * 0.04)
      const ordered = state.timeStructure === 'b'
        ? rotate(source).repeat(4, 3, 0.12, 0.08)
        : rotate(source.repeat(4, 3, 0.12, 0.08))

      return ordered.color(0.18, 0.72, 1.2).out()
    },
    code: (state) => state.timeStructure === 'b'
      ? code(
        ['source', 'shape(3, .28, .025)'],
        ['order', '  .rotate(() => time * .04)'],
        ['order', '  .repeat(4, 3, .12, .08)'],
        ['transform', '  .color(.18, .72, 1.2)'],
        ['output', '  .out()']
      )
      : code(
        ['source', 'shape(3, .28, .025)'],
        ['order', '  .repeat(4, 3, .12, .08)'],
        ['order', '  .rotate(() => time * .04)'],
        ['transform', '  .color(.18, .72, 1.2)'],
        ['output', '  .out()']
      )
  },

  feedback: {
    run: (synth, state) => {
      const present = synth
        .shape(3, 0.2, 0.03)
        .repeat(3, 2, 0.1, 0.06)
        .rotate(({ time }) => time * 0.08)
        .color(0.18, 0.72, 1.2)

      if (!state.feedbackEnabled) return present.out()

      return present
        .blend(
          synth.prev()
            .scale(clamp(state.feedbackScale, 0.97, 1.03))
            .rotate(0.003)
            .brightness(-0.02),
          clamp(state.feedbackPersistence, 0, 0.98)
        )
        .out()
    },
    code: (state) => {
      const base = [
        ['source', 'shape(3, .2, .03)'],
        ['transform', '  .repeat(3, 2, .1, .06)'],
        ['time', '  .rotate(() => time * .08)'],
        ['transform', '  .color(.18, .72, 1.2)']
      ]

      if (!state.feedbackEnabled) return code(...base, ['output', '  .out()'])

      return code(
        ...base,
        ['relation', '  .blend('],
        ['previousState', '    prev()'],
        ['feedbackScale', `      .scale(${literal(state.feedbackScale)})`],
        ['previousState', '      .rotate(.003)'],
        ['previousState', '      .brightness(-.02),'],
        ['persistence', `    ${literal(state.feedbackPersistence)}`],
        ['relation', '  )'],
        ['output', '  .out()']
      )
    }
  },

  final: {
    run: (synth, state) => {
      const orientation = state.finalDimension === 'orientation' ? state.finalValue : null
      const relationDepth = state.finalDimension === 'relation' ? state.finalValue : 0.28
      const timeRate = state.finalDimension === 'time' ? state.finalValue : 0.04
      const persistence = state.finalDimension === 'persistence' ? state.finalValue : 0.82
      const rotation = orientation == null
        ? ({ time }) => time * timeRate
        : orientation

      return synth
        .shape(3, 0.28, 0.025)
        .repeat(4, 3, 0.12, 0.08)
        .rotate(rotation)
        .modulate(branchB(synth), clamp(relationDepth, 0, 0.7))
        .color(0.18, 0.72, 1.2)
        .blend(
          synth.prev().scale(1.004).brightness(-0.02),
          clamp(persistence, 0, 0.98)
        )
        .out()
    },
    code: (state) => openingCode(state, state.finalDimension)
  }
}

export const getPatch = (id) => patches[id] || patches.opening

export const getFinalVariant = (id) => finalVariants[id] || finalVariants.orientation

export const getCode = (id, state, env = {}) => getPatch(id).code(state, env)

export const runPatch = (id, synth, state, env = {}) => getPatch(id).run(synth, state, env)
