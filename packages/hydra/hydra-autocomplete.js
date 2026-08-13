import { syntaxTree } from '@codemirror/language'

const completionSections = {
  sources: { name: 'texture sources', rank: 10 },
  grammar: { name: 'grammar utilities', rank: 20 },
  signals: { name: 'signals', rank: 30 },
  buffers: { name: 'buffers', rank: 40 },
  runtime: { name: 'Hydra controls', rank: 50 },
  coord: { name: 'geometry', rank: 10 },
  color: { name: 'color', rank: 20 },
  combine: { name: 'mixing', rank: 30 },
  combineCoord: { name: 'modulation', rank: 40 },
  renderpass: { name: 'fragment effects', rank: 50 },
  output: { name: 'output', rank: 60 },
  sequence: { name: 'sequences', rank: 10 },
  sourceMedia: { name: 'media source', rank: 10 },
  audio: { name: 'audio', rank: 10 },
  mouse: { name: 'pointer signal', rank: 10 }
}

const transformTypeLabels = {
  src: 'texture source',
  coord: 'geometry operation',
  color: 'color operation',
  combine: 'texture mix',
  combineCoord: 'texture modulation',
  renderpass: 'fragment effect'
}

const blockedSyntaxNodes = new Set([
  'LineComment',
  'BlockComment',
  'String',
  'TemplateString',
  'RegExp'
])

const sequenceCompletions = [
  ['fast', '(speed = 1)', 'Changes sequence playback speed.'],
  ['smooth', '(amount = 1)', 'Interpolates between sequence values.'],
  ['ease', '(name | function)', 'Applies an easing curve to a smooth sequence.'],
  ['offset', '(amount = 0.5)', 'Offsets sequence phase.'],
  ['fit', '(low = 0, high = 1)', 'Remaps sequence values into a range.']
].map(([label, detail, info]) => ({
  label,
  detail,
  info,
  type: 'method',
  section: completionSections.sequence
}))

const sourceMediaCompletions = [
  ['initVideo', '(fileOrUrl, { flipY })', 'Loads a video into this Hydra source. Replaces and releases its previous media.'],
  ['initImage', '(fileOrUrl, { flipY })', 'Loads an image into this Hydra source. Replaces and releases its previous media.'],
  ['initCam', '(index | constraints)', 'Uses a camera as this Hydra source.'],
  ['initScreen', '(options, { flipY })', 'Uses a shared screen or window as this Hydra source.'],
  ['init', '({ src, dynamic }, { flipY })', 'Uses an existing canvas, image, or video element as this Hydra source.'],
  ['clear', '()', 'Clears this source and releases its current media.']
].map(([label, detail, info]) => ({
  label,
  detail,
  info,
  type: 'method',
  section: completionSections.sourceMedia
}))

const audioCompletions = [
  ['show', 'method', '()', 'Shows the audio analyzer.'],
  ['hide', 'method', '()', 'Hides the audio analyzer.'],
  ['start', 'method', '()', 'Starts microphone analysis.'],
  ['stop', 'method', '()', 'Stops audio analysis.'],
  ['setBins', 'method', '(count)', 'Changes the number of analyzed frequency bands.'],
  ['setSmooth', 'method', '(amount)', 'Changes frequency smoothing.'],
  ['setCutoff', 'method', '(amount)', 'Changes the audio cutoff.'],
  ['setScale', 'method', '(amount)', 'Changes audio amplitude scaling.'],
  ['setMax', 'method', '(amount)', 'Changes the analyzer display range.'],
  ['getBand', 'method', '(index, scale = 1, offset = 0)', 'Creates a signal for one frequency band.'],
  ['fft', 'property', 'number[]', 'Current frequency-band values.'],
  ['waveform', 'property', 'number[]', 'Current waveform values.'],
  ['vol', 'property', 'number', 'Current volume signal.'],
  ['rms', 'property', 'number', 'Current RMS signal.'],
  ['peak', 'property', 'number', 'Current peak signal.'],
  ['centroid', 'property', 'number', 'Current spectral centroid.'],
  ['low', 'property', 'number', 'Low-frequency signal.'],
  ['mid', 'property', 'number', 'Mid-frequency signal.'],
  ['high', 'property', 'number', 'High-frequency signal.'],
  ['onBeat', 'property', '() => {}', 'Callback run when the analyzer detects a beat.']
].map(([label, type, detail, info]) => ({
  label,
  detail,
  info,
  type,
  section: completionSections.audio
}))

const mousePropertyDetails = {
  x: 'normalized horizontal position',
  y: 'normalized vertical position',
  speed: 'normalized pointer speed',
  acceleration: 'normalized pointer acceleration',
  jerk: 'normalized acceleration change',
  speedSmooth: 'smoothed pointer speed',
  accelerationSmooth: 'smoothed pointer acceleration',
  jerkSmooth: 'smoothed acceleration change',
  dragDistance: 'distance from drag origin',
  dragTravel: 'distance travelled while dragging',
  dragDuration: 'current drag duration',
  hold: 'current press duration',
  pressure: 'pointer pressure',
  inside: '1 while the pointer is over the canvas',
  pixelX: 'horizontal canvas pixel',
  pixelY: 'vertical canvas pixel',
  uvX: 'horizontal UV coordinate',
  uvY: 'vertical UV coordinate',
  velocityX: 'horizontal velocity',
  velocityY: 'vertical velocity',
  accelerationX: 'horizontal acceleration',
  accelerationY: 'vertical acceleration',
  jerkX: 'horizontal acceleration change',
  jerkY: 'vertical acceleration change',
  buttons: 'pointer button bitmask',
  down: 'whether a pointer button is held',
  dragActive: 'whether a drag is active',
  pointerType: 'mouse, pen, or touch',
  mods: 'keyboard modifier state',
  reset: 'resets the pointer signal'
}

const mouseCompletions = Object.entries(mousePropertyDetails).map(([label, info]) => ({
  label,
  detail: label === 'reset' ? '()' : undefined,
  info,
  type: label === 'reset' ? 'method' : 'property',
  section: completionSections.mouse
}))

const formatDefaultValue = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return String(value)
  if (typeof value === 'string') return JSON.stringify(value)
  return null
}

const displayInputName = (name) => {
  if (name === 'tex') return 'texture'
  if (name === 'historyTex') return 'output'
  return name
}

const transformSignature = (descriptor) => {
  const inputs = descriptor.inputs.map((input) => {
    const defaultValue = formatDefaultValue(input.default)
    const name = displayInputName(input.name)
    return defaultValue === null ? name : `${name} = ${defaultValue}`
  })
  if (descriptor.type === 'combine' || descriptor.type === 'combineCoord') inputs.unshift('texture')
  return `(${inputs.join(', ')})`
}

const createTransformCompletion = (descriptor) => ({
  label: descriptor.name,
  detail: transformSignature(descriptor),
  info: `Hydra ${transformTypeLabels[descriptor.type] ?? 'visual operation'}.`,
  type: descriptor.type === 'src' ? 'function' : 'method',
  section: completionSections[descriptor.type] ?? completionSections.color
})

const grammarCompletion = (name, info) => ({
  label: name,
  type: name === 'A' || name === 'B' ? 'constant' : 'function',
  detail: name === 'rn'
    ? '(max = 1)'
    : name === 'btw'
      ? '(min = 0, max = 1)'
      : name === 'ns'
        ? '(scale = 10, speed = .1, seedX, seedY)'
        : name === 'nsloop'
          ? '(scale = 10, speed = .1, radius = 1, seedX, seedY)'
          : 'number',
  info,
  section: completionSections.grammar
})

const createRuntimeCompletions = () => {
  const bufferCompletions = [
    ...Array.from({ length: 4 }, (_, index) => ({
      label: `s${index}`,
      detail: 'media source',
      info: 'Hydra input source. Type a dot for image, video, camera, and screen utilities.',
      type: 'variable',
      section: completionSections.buffers
    })),
    ...Array.from({ length: 4 }, (_, index) => ({
      label: `o${index}`,
      detail: 'output texture',
      info: 'Hydra output texture; pass it to src(), prevN(), render(), or another texture input.',
      type: 'variable',
      section: completionSections.buffers
    }))
  ]

  const signalCompletions = [
    ['time', 'seconds', 'Elapsed Hydra time.'],
    ['speed', 'number', 'Global Hydra clock multiplier.'],
    ['bpm', 'number', 'Tempo used by array sequences.'],
    ['fps', 'number | undefined', 'Optional render frame-rate limit.'],
    ['width', 'pixels', 'Current render width.'],
    ['height', 'pixels', 'Current render height.'],
    ['mouse', 'pointer signal', 'Pointer values; type a dot to see its channels.'],
    ['a', 'audio analyzer', 'Audio analyzer; type a dot to see its controls and signals.'],
    ['update', '(deltaMs) => {}', 'Per-frame Hydra update callback.'],
    ['afterUpdate', '(deltaMs) => {}', 'Callback run after each Hydra update.']
  ].map(([label, detail, info]) => ({
    label,
    detail,
    info,
    type: 'variable',
    section: completionSections.signals
  }))

  const audioBandCompletions = Array.from({ length: 4 }, (_, index) => ({
    label: `a${index}`,
    detail: '(scale = 1, offset = 0)',
    info: `Creates a live signal from audio band ${index}.`,
    type: 'function',
    section: completionSections.signals
  }))

  const controlCompletions = [
    ['render', '(output)', 'Displays one output, or all outputs when called without an argument.'],
    ['hush', '()', 'Clears every Hydra output.'],
    [
      'setCanvasDisplay',
      '(width = viewportWidth, height = viewportHeight, { nativeSize = true })',
      'Sets the render resolution and canvas display size for pixel-precise output. Resolution changes rerun the patch and refresh A/B.'
    ]
  ].map(([label, detail, info]) => ({
    label,
    detail,
    info,
    type: 'function',
    section: completionSections.runtime
  }))

  return [...signalCompletions, ...audioBandCompletions, ...bufferCompletions, ...controlCompletions]
}

const nodeText = (state, node) => state.doc.sliceString(node.from, node.to)

const firstExpressionChild = (node) => {
  let child = node?.firstChild ?? null
  while (child && new Set(['(', ')', '[', ']', '{', '}', '.', '?.']).has(child.type.name)) {
    child = child.nextSibling
  }
  return child
}

const findAncestor = (node, typeName) => {
  let current = node
  while (current) {
    if (current.type.name === typeName) return current
    current = current.parent
  }
  return null
}

const isBlockedCompletionPosition = (tree, position) => {
  let node = tree.resolveInner(position, -1)
  while (node) {
    if (blockedSyntaxNodes.has(node.type.name)) return true
    node = node.parent
  }
  return false
}

const classifyExpression = (state, node, sourceNames, textureUtilityNames) => {
  if (!node) return null
  const typeName = node.type.name

  if (typeName === 'ArrayExpression') return 'sequence'

  if (typeName === 'VariableName') {
    const name = nodeText(state, node)
    if (/^s[0-3]$/u.test(name)) return 'sourceMedia'
    if (name === 'a') return 'audio'
    if (name === 'mouse') return 'mouse'
    return null
  }

  if (typeName === 'CallExpression') {
    const callee = firstExpressionChild(node)
    if (!callee) return null
    if (callee.type.name === 'VariableName') {
      const name = nodeText(state, callee)
      return sourceNames.has(name) || textureUtilityNames.has(name) ? 'graph' : null
    }
    if (callee.type.name === 'MemberExpression') {
      return classifyExpression(state, firstExpressionChild(callee), sourceNames, textureUtilityNames)
    }
    return classifyExpression(state, callee, sourceNames, textureUtilityNames)
  }

  if (typeName === 'MemberExpression') {
    return classifyExpression(state, firstExpressionChild(node), sourceNames, textureUtilityNames)
  }

  if (typeName === 'ParenthesizedExpression') {
    return classifyExpression(state, firstExpressionChild(node), sourceNames, textureUtilityNames)
  }

  return null
}

const receiverKindAt = (context, tree, wordFrom, sourceNames, textureUtilityNames) => {
  const beforeWord = context.state.doc.sliceString(0, wordFrom)
  let cursor = beforeWord.length - 1
  while (cursor >= 0 && /\s/u.test(beforeWord[cursor] ?? '')) cursor -= 1
  if (beforeWord[cursor] !== '.') return null

  const resolved = tree.resolveInner(context.pos, -1)
  const memberExpression = findAncestor(resolved, 'MemberExpression')
  if (!memberExpression) return 'unknownMember'
  return classifyExpression(
    context.state,
    firstExpressionChild(memberExpression),
    sourceNames,
    textureUtilityNames
  ) ?? 'unknownMember'
}

export const createHydraCompletionCatalog = ({
  transformDescriptors,
  grammarUtilityNames = [],
  grammarUtilityInfo = new Map()
}) => {
  const sourceDescriptors = transformDescriptors.filter(({ type }) => type === 'src')
  const graphDescriptors = transformDescriptors.filter(({ type }) => type !== 'src' && type !== 'passBoundary')
  const sourceNames = new Set(sourceDescriptors.map(({ name }) => name))
  const textureUtilityNames = new Set(grammarUtilityNames.filter((name) => name === 'ns' || name === 'nsloop'))

  const globals = [
    ...sourceDescriptors.map(createTransformCompletion),
    ...grammarUtilityNames.map((name) => grammarCompletion(name, grammarUtilityInfo.get(name))),
    ...createRuntimeCompletions()
  ]

  const graph = [
    ...graphDescriptors.map(createTransformCompletion),
    {
      label: 'out',
      detail: '(output = o0)',
      info: 'Routes this texture graph to a Hydra output.',
      type: 'method',
      section: completionSections.output
    }
  ]

  return {
    globals,
    graph,
    sequence: sequenceCompletions,
    sourceMedia: sourceMediaCompletions,
    audio: audioCompletions,
    mouse: mouseCompletions,
    sourceNames,
    textureUtilityNames
  }
}

export const createHydraCompletionSource = (catalog) => (context) => {
  const tree = syntaxTree(context.state)
  if (isBlockedCompletionPosition(tree, context.pos)) return null

  const word = context.matchBefore(/[A-Za-z_$][\w$]*/) ?? {
    from: context.pos,
    to: context.pos,
    text: ''
  }
  const receiverKind = receiverKindAt(
    context,
    tree,
    word.from,
    catalog.sourceNames,
    catalog.textureUtilityNames
  )

  if (receiverKind === 'unknownMember') return null
  if (receiverKind) {
    const options = catalog[receiverKind]
    if (!options) return null
    return {
      from: word.from,
      options,
      validFor: /^[A-Za-z_$][\w$]*$/
    }
  }

  if (!context.explicit && word.from === word.to) return null
  return {
    from: word.from,
    options: catalog.globals,
    validFor: /^[A-Za-z_$][\w$]*$/
  }
}
