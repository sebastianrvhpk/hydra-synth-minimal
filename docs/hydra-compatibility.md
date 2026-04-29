# Hydra Compatibility Matrix

This project targets Hydra patch compatibility, not pixel-identical WebGL output. A patch is considered compatible when the same livecoding shape runs without source edits and produces a recognizably equivalent Hydra visual under the WebGPU renderer.

Status labels:

- **Supported**: implemented and covered by runtime or compiler tests.
- **Supported/modernized**: implemented with intentionally modern behavior.
- **Partial**: usable, but not at the original Hydra surface area yet.
- **Not targeted**: intentionally outside this engine/app boundary.

## Core Patch Language

| Area | Status | Notes |
| --- | --- | --- |
| Global livecoding names | Supported | The `hydra` app exposes synth bindings as globals through `hydra-synth/livecoding`. |
| Chain syntax | Supported | `osc().rotate().modulate().out()` style patches are the primary compatibility target. |
| Function arguments | Supported | Numbers, functions, arrays/sequences, texture inputs, and nested graph arguments are compiled through the TypeScript/WGSL pipeline. Nested graphs can drive scalar/vector parameter slots, so patches such as `noise(osc().blend(o0))` are field-valued parameter expressions rather than global scalar knobs. |
| Output routing | Supported | `out()`, output nodes, dependency ordering, and current texture handoff are implemented. |
| Multiple outputs | Supported | Runtime defaults to `o0..o3`; source/output counts are configurable. |
| Exact WebGL numeric parity | Not targeted | WGSL/WebGPU color and precision behavior may differ from legacy WebGL/regl output. |

## Classic Transforms

| Group | Status | Current surface |
| --- | --- | --- |
| Generators | Supported | `noise`, `voronoi`, `osc`, `shape`, `gradient`, `src`, `solid` |
| Coordinates | Supported | `rotate`, `scale`, `pixelate`, `repeat`, `repeatX`, `repeatY`, `kaleid`, `scroll`, `scrollX`, `scrollY` |
| Modulators | Supported | `modulate`, `modulateScale`, `modulatePixelate`, `modulateRotate`, `modulateHue`, `modulateRepeat`, `modulateRepeatX`, `modulateRepeatY`, `modulateKaleid`, `modulateScrollX`, `modulateScrollY` |
| Color and levels | Supported | `posterize`, `shift`, `invert`, `contrast`, `brightness`, `luma`, `thresh`, `color`, `saturate`, `hue`, `colorama` |
| Compositing | Supported | `add`, `sub`, `layer`, `blend`, `mult`, `diff`, `mask` |
| Original aliases and quirks | Partial | Most patch-level patterns work; exact undocumented WebGL/glsl-generator quirks are not a compatibility promise. |

## WebGPU Extensions

| Group | Status | Current surface |
| --- | --- | --- |
| Procedural noise | Supported/modernized | `noiseLoop`, `fbm`, `ridged`, `turbulence` |
| Blend modes | Supported/modernized | `screen`, `overlay`, `softLight`, `hardLight`, `colorDodge`, `colorBurn`, `bloomMix` |
| Renderpass effects | Supported/modernized | `renderpass`, `blurX`, `blurY`, `blur`, `blurFast`, `blurBilateral`, `bloom`, `bloomThreshold`, `bloomDownsample`, `bloomUpsample` |
| Post effects | Supported/modernized | `sharpen`, `chromaticAberration`, `rgbSplit`, `vignette`, `filmGrain`, `dither`, `edgeDetect`, `edgeLaplacian`, `dilate`, `erode`, `radialBlur`, `zoomBlur`, `dualKawaseBlur`, `dualKawaseBloom` |

## Sources, Inputs, And Runtime Globals

| Area | Status | Notes |
| --- | --- | --- |
| `s0..s3` sources | Supported | Source nodes support canvas/image/video/stream initialization and texture binding. |
| Local video files | Supported/modernized | The `hydra` app exposes `loadVideoFile`, `loadVideoFiles`, and `restartVideos` helpers. |
| Camera | Partial | `HydraSourceNode.initCam()` exists, but the app still needs a dedicated camera picker/control surface. |
| Screen capture | Supported/modernized | `HydraSourceNode.initScreen()` uses `navigator.mediaDevices.getDisplayMedia()` and stops captured tracks during source cleanup. |
| Audio/FFT | Supported/modernized | `HydraAudioAnalyzer` exposes legacy `a.fft` and `a0..aN` helpers plus volume, RMS, peak, centroid, low/mid/high, waveform, beat detection, external source connection, and injected frequency-data updates. |
| Mouse | Supported/modernized | `mouse.x/y/speed/acceleration/jerk` plus smoothed, pixel, UV, drag, pressure, and modifier channels. |
| `time`, `speed`, `bpm`, `fps`, `update`, `afterUpdate` | Supported | Exposed in the synth bindings and synchronized by the livecoding bridge. |
| Patch bay/WebRTC | Partial | `initStream` and patchbay adapter hooks exist; original network/gallery workflows belong in the `hydra` app layer. |

## Legacy Constructor/API Facade

| Original surface | Status | Current mapping |
| --- | --- | --- |
| `new Hydra(...)` | Supported/modernized | Default export `Hydra` wraps `createHydraBrowserRuntime()` while preserving old constructor options where practical. |
| `makeGlobal` | Supported/modernized | The facade installs live getters/setters on the target global; multiple runtimes should prefer `runtime.synth` or separate target globals. |
| `hydra.eval(code)` | Supported with app runner | The facade keeps the method for old sketches, but executable string handling must be supplied through the `runCode` option at the app boundary. New code should prefer `hydra-synth/livecoding` with an explicit runner. |
| `setFunction(...)` | Supported/modernized | Alias for typed `registerFunction(...)`. |
| `screencap()`, `getScreenImage(...)`, `canvasToImage(...)` | Supported/modernized | Aliased to PNG capture helpers. |
| `vidRecorder.start()` / `vidRecorder.stop()` | Supported/modernized | Uses canvas stream recording where available and WebCodecs capture fallback otherwise. |
| Package default import | Supported/modernized | `import Hydra from 'hydra-synth'` is available as a compatibility facade; named exports remain the preferred typed API. |

## Livecoding App

| Area | Status | Notes |
| --- | --- | --- |
| Fullscreen visual-first surface | Supported | The canvas is the primary screen; UI stays as overlay chrome. |
| CodeMirror 6 editor | Supported | Syntax highlighting, selection/current-line execution, buffer execution, local persistence, Hydra completions, fullscreen Hydra-style code overlay, compact icon dock, and optional floating geometry are enabled. |
| First-run shell | Supported/modernized | A dismissible welcome panel introduces the local-code trust boundary and core shortcuts without replacing the live canvas surface. |
| Code flash after evaluation | Supported | Evaluated ranges briefly highlight in the editor. |
| URL sketch sharing | Supported/modernized | `saveSketchToUrl()` encodes code into the local URL hash; full-buffer execution updates browser history for back/forward sketch navigation. |
| Random/dice helpers | Supported/modernized | `loadRandomSketch()`/`randomize()` load generated patches, while `mutateEditorCode()` changes one numeric literal like the original dice workflow. |
| Editor-as-texture | Supported/modernized | The CodeMirror document is rendered into an offscreen canvas, attached to `s3` by default, and exposed through `codeCanvas`, `attachCodeMaterial()`, and `syncCodeMaterial()` so patches can use `src(s3)`. |
| Capture | Supported/modernized | MP4 capture uses WebCodecs; deterministic frame capture is exposed through helpers; duration, 60fps default capture, and resolution presets live in the record popover. |
| Gallery/sharing/social editor flows | Not targeted for engine | These belong in the `hydra` package and can be added independently of `hydra-synth`. |

## Test Anchors

- Transform/compiler compatibility: `packages/synth/test/core/compatibility-matrix.test.ts`
- Core chain compilation: `packages/synth/test/core/core.test.ts`
- Runtime browser smoke: `packages/synth/test/playwright/runtime-smoke.spec.ts`
- Hydra app smoke: `packages/synth/test/playwright/runtime-smoke.spec.ts`
- Mouse compatibility: `packages/synth/test/mouse-input.test.ts`
- Capture behavior: `packages/synth/test/frame-sequence-capture.test.ts`
