import { createHydraBrowserRuntime } from 'hydra-synth'
import { movements, scenes, sceneById } from './content.js'
import {
  controlSets,
  defaults,
  getCode,
  getFinalVariant,
  recoveries,
  runPatch
} from './patches.js'

const byId = (id) => document.getElementById(id)

const ui = {
  body: document.body,
  canvas: byId('hydra-canvas'),
  runtimeStatus: byId('runtime-status'),
  presentation: byId('presentation'),
  scene: byId('scene'),
  sceneKicker: byId('scene-kicker'),
  sceneTitle: byId('scene-title'),
  sceneStatement: byId('scene-statement'),
  sceneBody: byId('scene-body'),
  sceneSources: byId('scene-sources'),
  diagramStage: byId('diagram-stage'),
  diagram: byId('diagram'),
  codeStage: byId('code-stage'),
  codeLines: byId('code-lines'),
  copyCode: byId('copy-code-button'),
  openHydra: byId('open-hydra-link'),
  codeStatus: byId('code-status'),
  labStage: byId('lab-stage'),
  scenePrompt: byId('scene-prompt'),
  controls: byId('experiment-controls'),
  experimentStatus: byId('experiment-status'),
  reset: byId('reset-button'),
  movementLabel: byId('movement-label'),
  sceneTime: byId('scene-time'),
  sceneCurrent: byId('scene-current'),
  sceneTotal: byId('scene-total'),
  progressFill: byId('progress-fill'),
  sceneTransition: byId('scene-transition'),
  previous: byId('previous-button'),
  next: byId('next-button'),
  home: byId('home-button'),
  pause: byId('pause-button'),
  motion: byId('motion-button'),
  mapButton: byId('map-button'),
  notesButton: byId('notes-button'),
  mapPanel: byId('map-panel'),
  notesPanel: byId('notes-panel'),
  movementMap: byId('movement-map'),
  sceneCue: byId('scene-cue'),
  sceneRecovery: byId('scene-recovery'),
  notesTransition: byId('notes-transition'),
  mediaInput: byId('media-input'),
  dropMessage: byId('drop-message')
}

const state = { ...defaults }
const stateKeys = Object.keys(defaults)
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

let currentIndex = 0
let currentCode = ''
let runtime = null
let synth = null
let runtimeReady = false
let paused = false
let lowMotion = prefersReducedMotion.matches
let patchRequest = 0
let resizeTimer = 0
let touchStart = null
let externalSource = { kind: 'default', value: './og.png' }

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)))
const pad = (value) => String(value).padStart(2, '0')

const formatValue = (value, step = 0.01) => {
  if (Number(step) >= 1) return String(Math.round(Number(value)))
  const precision = Math.max(0, String(step).split('.')[1]?.length ?? 0)
  const text = Number(value).toFixed(Math.min(precision, 3))
  if (text.startsWith('0.')) return text.slice(1)
  if (text.startsWith('-0.')) return `-${text.slice(2)}`
  return text
}

const setText = (element, value) => {
  element.textContent = value || ''
  element.hidden = !value
}

const currentScene = () => scenes[currentIndex]

const parseStateValue = (key, raw) => {
  const initial = defaults[key]
  if (typeof initial === 'boolean') return raw === 'true' || raw === '1'
  if (typeof initial === 'number') {
    const value = Number(raw)
    return Number.isFinite(value) ? value : initial
  }
  return String(raw)
}

const readHash = () => {
  const raw = window.location.hash.replace(/^#/, '')
  if (!raw) return { index: 0, values: {} }

  if (!raw.includes('=') && sceneById.has(raw)) {
    return { index: sceneById.get(raw).index, values: {} }
  }

  const params = new URLSearchParams(raw)
  const sceneId = params.get('scene')
  const index = sceneId && sceneById.has(sceneId)
    ? sceneById.get(sceneId).index
    : 0
  const values = {}

  stateKeys.forEach((key) => {
    if (params.has(key)) values[key] = parseStateValue(key, params.get(key))
  })

  return { index, values }
}

const stateHash = () => {
  const params = new URLSearchParams()
  params.set('scene', currentScene().id)
  stateKeys.forEach((key) => {
    if (state[key] !== defaults[key]) params.set(key, String(state[key]))
  })
  return `#${params.toString()}`
}

const updateLocation = ({ replace = true } = {}) => {
  const url = `${window.location.pathname}${window.location.search}${stateHash()}`
  if (replace) window.history.replaceState(null, '', url)
  else window.history.pushState(null, '', url)
}

const applyHashState = () => {
  const parsed = readHash()
  Object.assign(state, defaults, parsed.values)
  currentIndex = clamp(parsed.index, 0, scenes.length - 1)
}

const buildHydraUrl = (source) => {
  const bytes = new TextEncoder().encode(String(source ?? ''))
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
  url.hash = `code=${encoded}`
  return url.toString()
}

const fitRenderResolution = () => {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
  const width = Math.max(640, Math.min(1920, Math.round(window.innerWidth * dpr)))
  const height = Math.max(360, Math.min(1080, Math.round(window.innerHeight * dpr)))
  return {
    width: width % 2 === 0 ? width : width + 1,
    height: height % 2 === 0 ? height : height + 1
  }
}

const applyExternalSource = async () => {
  if (!synth) return
  if (externalSource.kind === 'camera') {
    await synth.s0.initCam()
    return
  }
  if (externalSource.kind === 'video') {
    synth.s0.initVideo(externalSource.value)
    return
  }
  synth.s0.initImage(externalSource.value)
}

const clearSignal = async () => {
  if (!runtimeReady) return
  runtime.hush()
  await applyExternalSource()
  runtime.render(synth.o0)
}

const applyMotionRate = () => {
  if (!synth) return
  const sceneRate = currentScene().mode === 'pause' ? 0.16 : 1
  synth.speed = lowMotion ? Math.min(sceneRate, 0.18) : sceneRate
}

const runCurrentPatch = async ({ clear = false } = {}) => {
  if (!runtimeReady || !synth) return
  const request = ++patchRequest
  try {
    if (clear) await clearSignal()
    if (request !== patchRequest) return
    applyMotionRate()
    runPatch(currentScene().patch, synth, state, { scene: currentScene() })
    runtime.render(synth.o0)
    ui.body.dataset.runtime = 'ready'
    ui.runtimeStatus.textContent = ''
  } catch (error) {
    ui.body.dataset.runtime = 'fallback'
    ui.runtimeStatus.textContent = 'La señal no pudo actualizarse. El relato y el código siguen disponibles.'
    console.error('[workshop] patch failed', error)
  }
}

const createElement = (tag, className, text) => {
  const element = document.createElement(tag)
  if (className) element.className = className
  if (text != null) element.textContent = text
  return element
}

const renderBody = (paragraphs = []) => {
  ui.sceneBody.replaceChildren()
  paragraphs.forEach((paragraph) => {
    ui.sceneBody.appendChild(createElement('p', '', paragraph))
  })
  ui.sceneBody.hidden = paragraphs.length === 0
}

const renderSources = (sources = []) => {
  ui.sceneSources.replaceChildren()
  sources.forEach((source) => {
    const link = createElement('a', '', source.label)
    link.href = source.href
    link.target = '_blank'
    link.rel = 'noreferrer'
    ui.sceneSources.appendChild(link)
  })
  ui.sceneSources.hidden = sources.length === 0
}

const renderDiagram = (items = []) => {
  ui.diagram.replaceChildren()
  const hasPairs = items.some(Array.isArray)
  ui.diagram.className = `diagram ${hasPairs ? 'diagram-pairs' : 'diagram-flow'}`

  items.forEach((item, index) => {
    if (Array.isArray(item)) {
      const pair = createElement('div', 'diagram-pair')
      pair.append(
        createElement('strong', '', item[0]),
        createElement('span', '', item[1])
      )
      ui.diagram.appendChild(pair)
      return
    }

    if (index > 0) ui.diagram.appendChild(createElement('span', 'diagram-arrow', '→'))
    ui.diagram.appendChild(createElement('span', 'diagram-node', item))
  })

  ui.diagramStage.hidden = items.length === 0
}

const renderCode = () => {
  const scene = currentScene()
  const specification = getCode(scene.patch, state, { scene })
  const focus = new Set(scene.focus || [])
  currentCode = specification.text
  ui.codeLines.replaceChildren()

  specification.lines.forEach(({ region, text }) => {
    const item = createElement('li', 'code-line')
    item.dataset.region = region
    if (focus.has(region)) item.classList.add('is-focus')
    const line = createElement('code', '', text || ' ')
    item.appendChild(line)
    ui.codeLines.appendChild(item)
  })

  ui.openHydra.href = buildHydraUrl(currentCode)
  ui.codeStage.hidden = scene.code === 'hidden'
}

const renderRange = (definition) => {
  const wrapper = createElement('label', 'range-control')
  const heading = createElement('span', 'control-heading')
  const label = createElement('span', 'control-label', definition.label)
  const output = createElement('output', 'control-value')
  const input = document.createElement('input')
  input.type = 'range'
  input.min = String(definition.min)
  input.max = String(definition.max)
  input.step = String(definition.step)
  input.value = String(state[definition.key])
  output.value = formatValue(state[definition.key], definition.step)
  output.textContent = output.value
  heading.append(label, output)
  wrapper.append(heading, input)

  input.addEventListener('input', () => {
    state[definition.key] = Number(input.value)
    output.value = formatValue(state[definition.key], definition.step)
    output.textContent = output.value
    renderCode()
    updateLocation()
    void runCurrentPatch()
  })
  return wrapper
}

const renderChoice = (definition) => {
  const fieldset = createElement('fieldset', 'choice-control')
  const legend = createElement('legend', 'control-label', definition.label)
  const group = createElement('div', 'choice-group')
  fieldset.append(legend, group)

  definition.options.forEach(([value, label]) => {
    const button = createElement('button', 'choice-button', label)
    button.type = 'button'
    const normalized = definition.numeric ? Number(value) : value
    const active = state[definition.key] === normalized
    button.setAttribute('aria-pressed', String(active))
    button.addEventListener('click', () => {
      state[definition.key] = normalized
      if (definition.key === 'finalDimension') {
        state.finalValue = getFinalVariant(normalized).default
      }
      renderControls()
      renderCode()
      updateLocation()
      void runCurrentPatch({ clear: Boolean(definition.clearOnChange) })
    })
    group.appendChild(button)
  })

  return fieldset
}

const renderToggle = (definition) => {
  const wrapper = createElement('div', 'toggle-control')
  const label = createElement('span', 'control-label', definition.label)
  const button = createElement(
    'button',
    'toggle-button',
    state[definition.key] ? definition.onLabel : definition.offLabel
  )
  button.type = 'button'
  button.setAttribute('aria-pressed', String(Boolean(state[definition.key])))
  button.addEventListener('click', () => {
    state[definition.key] = !state[definition.key]
    renderControls()
    renderCode()
    updateLocation()
    void runCurrentPatch({ clear: Boolean(definition.clearOnChange) })
  })
  wrapper.append(label, button)
  return wrapper
}

const performAction = async (action) => {
  if (action === 'pick-media') {
    ui.mediaInput.click()
    return
  }
  if (action === 'camera') {
    if (!runtimeReady) return
    ui.experimentStatus.textContent = 'solicitando cámara…'
    try {
      externalSource = { kind: 'camera', value: null }
      state.sourceMode = 'external'
      runtime.hush()
      await applyExternalSource()
      runPatch(currentScene().patch, synth, state, { scene: currentScene() })
      runtime.render(synth.o0)
      renderControls()
      renderCode()
      updateLocation()
      ui.experimentStatus.textContent = 'cámara incorporada como s0'
    } catch (error) {
      externalSource = { kind: 'default', value: './og.png' }
      state.sourceMode = 'synthetic'
      ui.experimentStatus.textContent = 'la cámara no fue autorizada; seguimos con la fuente generada'
      console.error('[workshop] camera failed', error)
      void runCurrentPatch({ clear: true })
    }
    return
  }
  if (action === 'clear-history') {
    await runCurrentPatch({ clear: true })
    ui.experimentStatus.textContent = 'estado anterior limpiado'
    return
  }
  if (action === 'copy-url') {
    await copyWorkshopUrl()
  }
}

const renderAction = (definition) => {
  const button = createElement('button', 'action-button', definition.label)
  button.type = 'button'
  button.addEventListener('click', () => { void performAction(definition.action) })
  return button
}

const renderActions = (definition) => {
  const group = createElement('div', 'action-control')
  group.appendChild(createElement('span', 'control-label', definition.label))
  const buttons = createElement('div', 'action-group')
  definition.actions.forEach((action) => buttons.appendChild(renderAction(action)))
  group.appendChild(buttons)
  if (definition.note) group.appendChild(createElement('small', 'control-note', definition.note))
  return group
}

const renderVariantRange = (definition) => {
  const variant = definition.variants[state[definition.variantKey]] || getFinalVariant('orientation')
  return renderRange({ ...definition, ...variant, label: variant.label })
}

const renderControls = () => {
  const definitions = controlSets[currentScene().controls] || []
  ui.controls.replaceChildren()
  definitions.forEach((definition) => {
    if (definition.type === 'range') ui.controls.appendChild(renderRange(definition))
    else if (definition.type === 'select') ui.controls.appendChild(renderChoice(definition))
    else if (definition.type === 'toggle') ui.controls.appendChild(renderToggle(definition))
    else if (definition.type === 'action') ui.controls.appendChild(renderAction(definition))
    else if (definition.type === 'actions') ui.controls.appendChild(renderActions(definition))
    else if (definition.type === 'variant-range') ui.controls.appendChild(renderVariantRange(definition))
  })
  ui.labStage.hidden = definitions.length === 0
}

const updateMapActiveState = () => {
  ui.movementMap.querySelectorAll('[data-scene-index]').forEach((button) => {
    const active = Number(button.dataset.sceneIndex) === currentIndex
    button.setAttribute('aria-current', active ? 'step' : 'false')
  })
}

const renderScene = ({ clear = true, updateHash = true } = {}) => {
  const scene = currentScene()
  ui.body.dataset.sceneMode = scene.mode
  ui.body.dataset.codeVisibility = scene.code
  ui.body.dataset.movement = scene.movement
  ui.scene.dataset.sceneId = scene.id
  ui.scene.classList.remove('scene-entering')
  window.requestAnimationFrame(() => ui.scene.classList.add('scene-entering'))

  setText(ui.sceneKicker, scene.kicker)
  setText(ui.sceneTitle, scene.title)
  setText(ui.sceneStatement, scene.statement)
  renderBody(scene.body || [])
  renderSources(scene.sources || [])
  renderDiagram(scene.diagram || [])
  renderCode()
  renderControls()

  setText(ui.scenePrompt, scene.prompt)
  ui.movementLabel.textContent = scene.movement
  ui.sceneTime.textContent = scene.time
  ui.sceneCurrent.textContent = pad(currentIndex + 1)
  ui.sceneTotal.textContent = pad(scenes.length)
  ui.progressFill.style.transform = `scaleX(${(currentIndex + 1) / scenes.length})`
  ui.sceneTransition.textContent = scene.transition || ''
  ui.previous.disabled = currentIndex === 0
  ui.next.disabled = currentIndex === scenes.length - 1

  ui.sceneCue.textContent = scene.cue || '—'
  ui.sceneRecovery.textContent = scene.recovery || 'sin punto de reunión explícito'
  ui.notesTransition.textContent = scene.transition || 'cierre'
  ui.codeStatus.textContent = ''
  ui.experimentStatus.textContent = ''
  updateMapActiveState()

  if (updateHash) updateLocation()
  void runCurrentPatch({ clear })
}

const goToScene = (index, { push = true, clear = true } = {}) => {
  const next = clamp(index, 0, scenes.length - 1)
  if (next === currentIndex && !clear) return
  currentIndex = next
  closePanels()
  renderScene({ clear, updateHash: false })
  updateLocation({ replace: !push })
}

const resetCurrentScene = () => {
  const scene = currentScene()
  const recovery = recoveries[scene.recovery]
  if (recovery) {
    Object.assign(state, recovery.values)
  } else {
    const definitions = controlSets[scene.controls] || []
    definitions.forEach((definition) => {
      if (definition.key in defaults) state[definition.key] = defaults[definition.key]
    })
  }
  renderControls()
  renderCode()
  updateLocation()
  ui.experimentStatus.textContent = 'punto de reunión restaurado'
  void runCurrentPatch({ clear: recovery?.clear !== false })
}

const openPanel = (panel) => {
  const isMap = panel === ui.mapPanel
  const other = isMap ? ui.notesPanel : ui.mapPanel
  other.hidden = true
  panel.hidden = false
  ui.body.dataset.overlay = isMap ? 'map' : 'notes'
  ui.mapButton.setAttribute('aria-expanded', String(isMap))
  ui.notesButton.setAttribute('aria-expanded', String(!isMap))
  panel.querySelector('button')?.focus()
}

const closePanels = () => {
  ui.mapPanel.hidden = true
  ui.notesPanel.hidden = true
  delete ui.body.dataset.overlay
  ui.mapButton.setAttribute('aria-expanded', 'false')
  ui.notesButton.setAttribute('aria-expanded', 'false')
}

const togglePanel = (panel) => {
  if (panel.hidden) openPanel(panel)
  else closePanels()
}

const buildMap = () => {
  ui.movementMap.replaceChildren()
  movements.forEach((movement, movementIndex) => {
    const section = createElement('section', 'movement-section')
    const heading = createElement('header', 'movement-heading')
    heading.append(
      createElement('span', 'movement-number', pad(movementIndex + 1)),
      createElement('h3', '', movement.label),
      createElement('span', 'movement-range', movement.range)
    )
    const list = createElement('ol', 'movement-scenes')
    scenes.forEach((scene, index) => {
      if (scene.movement !== movement.id) return
      const item = document.createElement('li')
      const button = createElement('button', 'map-scene')
      button.type = 'button'
      button.dataset.sceneIndex = String(index)
      button.append(
        createElement('span', 'map-scene-number', pad(index + 1)),
        createElement('span', 'map-scene-title', scene.title),
        createElement('span', 'map-scene-time', scene.time)
      )
      button.addEventListener('click', () => goToScene(index))
      item.appendChild(button)
      list.appendChild(item)
    })
    section.append(heading, list)
    ui.movementMap.appendChild(section)
  })
}

const copyCurrentCode = async () => {
  try {
    await navigator.clipboard.writeText(currentCode)
    ui.codeStatus.textContent = 'código copiado'
  } catch {
    ui.codeStatus.textContent = 'selecciona el código y cópialo manualmente'
  }
}

const copyWorkshopUrl = async () => {
  updateLocation()
  try {
    await navigator.clipboard.writeText(window.location.href)
    ui.experimentStatus.textContent = 'enlace copiado: conserva escena y decisiones actuales'
  } catch {
    ui.experimentStatus.textContent = 'copia la dirección del navegador para conservar este estado'
  }
}

const togglePause = async () => {
  if (!runtimeReady) return
  paused = !paused
  ui.pause.setAttribute('aria-pressed', String(paused))
  ui.pause.textContent = paused ? 'reanudar reloj' : 'detener reloj'
  if (paused) runtime.stop()
  else await runtime.start()
}

const toggleMotion = () => {
  lowMotion = !lowMotion
  ui.body.dataset.lowMotion = String(lowMotion)
  ui.motion.setAttribute('aria-pressed', String(lowMotion))
  ui.motion.textContent = lowMotion ? 'movimiento normal' : 'menos movimiento'
  applyMotionRate()
}

const useMediaFile = (file) => {
  if (!(file instanceof File)) return
  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')
  if (!isImage && !isVideo) {
    ui.experimentStatus.textContent = 'elige una imagen o un video'
    return
  }
  externalSource = { kind: isVideo ? 'video' : 'image', value: file }
  state.sourceMode = 'external'
  renderControls()
  renderCode()
  updateLocation()
  ui.experimentStatus.textContent = `${isVideo ? 'video' : 'imagen'} incorporada como s0`
  void runCurrentPatch({ clear: true })
}

const registerEvents = () => {
  ui.previous.addEventListener('click', () => goToScene(currentIndex - 1))
  ui.next.addEventListener('click', () => goToScene(currentIndex + 1))
  ui.home.addEventListener('click', () => goToScene(0))
  ui.pause.addEventListener('click', () => { void togglePause() })
  ui.motion.addEventListener('click', toggleMotion)
  ui.mapButton.addEventListener('click', () => togglePanel(ui.mapPanel))
  ui.notesButton.addEventListener('click', () => togglePanel(ui.notesPanel))
  ui.reset.addEventListener('click', resetCurrentScene)
  ui.copyCode.addEventListener('click', () => { void copyCurrentCode() })

  document.querySelectorAll('[data-close-panel]').forEach((button) => {
    button.addEventListener('click', closePanels)
  })

  window.addEventListener('popstate', () => {
    applyHashState()
    renderScene({ clear: true, updateHash: false })
  })

  window.addEventListener('hashchange', () => {
    const parsed = readHash()
    if (parsed.index === currentIndex && Object.keys(parsed.values).length === 0) return
    Object.assign(state, defaults, parsed.values)
    currentIndex = parsed.index
    renderScene({ clear: true, updateHash: false })
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
    if (!ui.mapPanel.hidden || !ui.notesPanel.hidden) return
    if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
      event.preventDefault()
      goToScene(currentIndex + 1)
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault()
      goToScene(currentIndex - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      goToScene(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      goToScene(scenes.length - 1)
    } else if (event.key.toLowerCase() === 'm') {
      togglePanel(ui.mapPanel)
    } else if (event.key.toLowerCase() === 'p') {
      void togglePause()
    } else if (event.key.toLowerCase() === 'n' && !ui.notesButton.hidden) {
      togglePanel(ui.notesPanel)
    }
  })

  ui.presentation.addEventListener('touchstart', (event) => {
    const touch = event.changedTouches[0]
    if (touch) touchStart = { x: touch.clientX, y: touch.clientY }
  }, { passive: true })

  ui.presentation.addEventListener('touchend', (event) => {
    const touch = event.changedTouches[0]
    if (!touch || !touchStart) return
    const dx = touch.clientX - touchStart.x
    const dy = touch.clientY - touchStart.y
    touchStart = null
    if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy)) return
    goToScene(dx < 0 ? currentIndex + 1 : currentIndex - 1)
  }, { passive: true })

  ui.mediaInput.addEventListener('change', () => {
    const file = ui.mediaInput.files?.[0]
    if (file) useMediaFile(file)
    ui.mediaInput.value = ''
  })

  window.addEventListener('dragenter', (event) => {
    if (!event.dataTransfer?.types.includes('Files')) return
    ui.dropMessage.hidden = false
  })
  window.addEventListener('dragover', (event) => {
    if (!event.dataTransfer?.types.includes('Files')) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  })
  window.addEventListener('dragleave', (event) => {
    if (event.relatedTarget == null) ui.dropMessage.hidden = true
  })
  window.addEventListener('drop', (event) => {
    event.preventDefault()
    ui.dropMessage.hidden = true
    const file = event.dataTransfer?.files?.[0]
    if (file) useMediaFile(file)
  })

  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      if (!runtimeReady) return
      const resolution = fitRenderResolution()
      runtime.setResolution(resolution.width, resolution.height)
      void runCurrentPatch({ clear: true })
    }, 180)
  })
}

const initRuntime = async () => {
  const resolution = fitRenderResolution()
  ui.canvas.width = resolution.width
  ui.canvas.height = resolution.height
  runtime = createHydraBrowserRuntime({
    canvas: ui.canvas,
    autoLoop: false,
    audio: false,
    mouse: false,
    backend: 'auto'
  })
  synth = runtime.synth
  try {
    await runtime.init()
    runtimeReady = true
    await applyExternalSource()
    runPatch(currentScene().patch, synth, state, { scene: currentScene() })
    runtime.render(synth.o0)
    applyMotionRate()
    await runtime.start()
    ui.body.dataset.runtime = 'ready'
    ui.runtimeStatus.textContent = ''
  } catch (error) {
    runtimeReady = false
    ui.body.dataset.runtime = 'fallback'
    ui.runtimeStatus.textContent = 'No fue posible iniciar el motor gráfico. El recorrido y el código siguen disponibles.'
    console.error('[workshop] runtime initialization failed', error)
  }
}

const init = () => {
  applyHashState()
  buildMap()
  registerEvents()
  ui.sceneTotal.textContent = pad(scenes.length)
  ui.body.dataset.lowMotion = String(lowMotion)
  ui.motion.setAttribute('aria-pressed', String(lowMotion))
  ui.motion.textContent = lowMotion ? 'movimiento normal' : 'menos movimiento'

  const params = new URLSearchParams(window.location.search)
  if (params.get('facilitator') === '1') ui.notesButton.hidden = false

  renderScene({ clear: false, updateHash: true })
  void initRuntime()
}

init()
