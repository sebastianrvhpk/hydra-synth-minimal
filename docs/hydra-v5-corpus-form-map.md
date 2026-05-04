# Hydra Corpus Form Map

This maps the v4 corpus into reusable patch forms. A form is not a visual family name and not a frequency claim. It is a signal-flow or graphics-program responsibility that can be recombined in a generator.

The forms are intentionally non-exclusive: one patch can be hard-gated feedback, a transform-delta field patch, a channel carrier, and a global blend-pressure patch at the same time.

## Summary

- Patterns analyzed: 90
- Primary circuit forms: 6
- Non-exclusive reusable forms present: 12
- Evolution/rework runs detected by adjacent structural similarity: 15

Primary circuit form counts:

- single-buffer hard-gated pixel-step feedback: 32
- multi-buffer feedback pipeline: 26
- feed-forward lattice/source construction: 12
- memory conditioner / artifact feedback: 11
- feed-forward material/composite: 5
- closed feedback / uncategorized: 4

## Reusable Forms

### F01 hard-gated feedback ingress

clean material enters memory through a hard gate, usually with `.layer(material.mask(gate))`

Hydra shape:

```js
src(o0)
  .modulate(field.color(1 / width, 1 / height), k)
  .layer(material.mask(hardGate))
  .out(o0)
```

Members (52): pattern_004, pattern_006, pattern_007, pattern_008, pattern_009, pattern_010, pattern_011, pattern_013, pattern_014, pattern_015, pattern_016, pattern_021, pattern_023, pattern_025, pattern_026, pattern_027, pattern_029, pattern_030, pattern_031, pattern_032, pattern_033, pattern_035, pattern_041, pattern_042, pattern_044, pattern_047, pattern_050, pattern_051, pattern_052, pattern_053, pattern_058, pattern_059, pattern_060, pattern_061, pattern_064, pattern_065, pattern_069, pattern_070, pattern_071, pattern_072, pattern_073, pattern_074, pattern_075, pattern_076, pattern_077, pattern_078, pattern_079, pattern_080, pattern_081, pattern_083, pattern_087, pattern_094

### F02 compound/interleaved feedback accumulation

feedback path mixes repeated layers, modulation, or global blend pressure in one recurrence

Hydra shape:

```js
src(o0)
  .layer(a.mask(gateA))
  .modulate(fieldA, kA)
  .layer(b.mask(gateB))
  .diff(src(o0), amount)
  .out(o0)
```

Members (63): pattern_002, pattern_003, pattern_004, pattern_006, pattern_007, pattern_008, pattern_009, pattern_010, pattern_011, pattern_012, pattern_013, pattern_014, pattern_015, pattern_016, pattern_017, pattern_018, pattern_019, pattern_021, pattern_023, pattern_025, pattern_026, pattern_027, pattern_030, pattern_031, pattern_032, pattern_033, pattern_035, pattern_038, pattern_042, pattern_043, pattern_044, pattern_046, pattern_047, pattern_048, pattern_049, pattern_050, pattern_053, pattern_055, pattern_058, pattern_061, pattern_063, pattern_064, pattern_065, pattern_069, pattern_070, pattern_071, pattern_074, pattern_075, pattern_076, pattern_077, pattern_078, pattern_079, pattern_080, pattern_081, pattern_083, pattern_084, pattern_087, pattern_089, pattern_090, pattern_091, pattern_092, pattern_093, pattern_094

### F03 multi-buffer staged circuit

extra buffers hold material, field, composite, render, or parallel feedback responsibilities

Hydra shape:

```js
materialStage.out(o1)
src(o0).layer(src(o1).mask(gate)).out(o0)
render(o0)
```

Members (26): pattern_002, pattern_003, pattern_007, pattern_008, pattern_009, pattern_010, pattern_011, pattern_027, pattern_030, pattern_042, pattern_048, pattern_049, pattern_050, pattern_064, pattern_065, pattern_072, pattern_076, pattern_077, pattern_078, pattern_079, pattern_080, pattern_081, pattern_083, pattern_084, pattern_087, pattern_090

### F04 feed-forward lattice/source construction

shape/noise/osc program constructs a material, mask, or source without closed feedback as the main fact

Hydra shape:

```js
shape(4, 1, 0)
  .scale(1 / n, 1, 1, 0, 0)
  .repeat(width / n, height / n)
  .mult(texture)
  .out(o0)
```

Members (12): pattern_020, pattern_022, pattern_028, pattern_040, pattern_045, pattern_054, pattern_062, pattern_066, pattern_067, pattern_082, pattern_085, pattern_088

### F05 metric raster / pixel-grid form

width/height, repeat, pixelate, or raster oscillator math controls exact grid or scanline structure

Hydra shape:

```js
shape(4, 1, 0)
  .scale(1 / 8, 1, 1, 0, 0)
  .repeat(width / 8, height / 8, .5)
```

Members (56): pattern_006, pattern_009, pattern_010, pattern_011, pattern_012, pattern_013, pattern_014, pattern_015, pattern_018, pattern_019, pattern_020, pattern_021, pattern_022, pattern_023, pattern_025, pattern_026, pattern_028, pattern_029, pattern_031, pattern_032, pattern_035, pattern_040, pattern_041, pattern_042, pattern_044, pattern_046, pattern_047, pattern_050, pattern_051, pattern_052, pattern_053, pattern_055, pattern_056, pattern_059, pattern_060, pattern_061, pattern_062, pattern_067, pattern_069, pattern_072, pattern_073, pattern_074, pattern_075, pattern_076, pattern_077, pattern_078, pattern_080, pattern_081, pattern_083, pattern_084, pattern_087, pattern_088, pattern_089, pattern_090, pattern_091, pattern_092

### F06 axis-packed vector field

x and y displacement responsibilities are built separately then packed into R/G

Hydra shape:

```js
solid()
  .add(xField.color(1, 0), xGain)
  .add(yField.color(0, 1), yGain)
  .color(1 / width, 1 / height)
```

Members (35): pattern_002, pattern_004, pattern_007, pattern_008, pattern_009, pattern_010, pattern_012, pattern_021, pattern_023, pattern_026, pattern_032, pattern_033, pattern_034, pattern_035, pattern_037, pattern_038, pattern_041, pattern_042, pattern_043, pattern_044, pattern_046, pattern_047, pattern_048, pattern_049, pattern_051, pattern_052, pattern_061, pattern_062, pattern_063, pattern_064, pattern_065, pattern_068, pattern_071, pattern_085, pattern_090

### F07 transform-delta coordinate field

a coordinate operation becomes a UV field by subtracting the identity gradient

Hydra shape:

```js
gradient()
  .scale(scaleProgram)
  .sub(gradient())
```

Members (44): pattern_002, pattern_004, pattern_006, pattern_007, pattern_008, pattern_009, pattern_011, pattern_012, pattern_013, pattern_014, pattern_016, pattern_017, pattern_021, pattern_023, pattern_026, pattern_027, pattern_030, pattern_038, pattern_042, pattern_045, pattern_046, pattern_048, pattern_049, pattern_053, pattern_055, pattern_058, pattern_063, pattern_064, pattern_065, pattern_068, pattern_069, pattern_070, pattern_074, pattern_076, pattern_077, pattern_078, pattern_079, pattern_080, pattern_081, pattern_083, pattern_084, pattern_085, pattern_087, pattern_091

### F08 channel / chroma carrier

R/G/B extraction, hue, colorama, or modulateHue is structural rather than just decoration

Hydra shape:

```js
src(o0)
  .modulateHue(o0, k)
  .layer(material.r(a, b).mask(gate))
```

Members (56): pattern_002, pattern_004, pattern_006, pattern_007, pattern_008, pattern_009, pattern_011, pattern_012, pattern_013, pattern_014, pattern_015, pattern_016, pattern_017, pattern_021, pattern_023, pattern_026, pattern_027, pattern_030, pattern_031, pattern_032, pattern_035, pattern_038, pattern_041, pattern_042, pattern_044, pattern_045, pattern_046, pattern_047, pattern_048, pattern_049, pattern_053, pattern_055, pattern_058, pattern_059, pattern_060, pattern_061, pattern_063, pattern_064, pattern_065, pattern_068, pattern_069, pattern_070, pattern_074, pattern_075, pattern_076, pattern_077, pattern_078, pattern_079, pattern_080, pattern_081, pattern_083, pattern_084, pattern_085, pattern_087, pattern_091, pattern_094

### F09 kaleid / symmetry recurrence

kaleid symmetry is used as material, field, mask, or feedback conditioner

Hydra shape:

```js
material
  .kaleid(n)
  .mask(gate)
```

Members (36): pattern_013, pattern_014, pattern_015, pattern_016, pattern_017, pattern_021, pattern_029, pattern_031, pattern_032, pattern_033, pattern_035, pattern_041, pattern_044, pattern_047, pattern_050, pattern_052, pattern_057, pattern_059, pattern_060, pattern_061, pattern_062, pattern_064, pattern_068, pattern_069, pattern_071, pattern_073, pattern_074, pattern_076, pattern_077, pattern_078, pattern_079, pattern_080, pattern_081, pattern_086, pattern_093, pattern_094

### F10 global artifact / blend-pressure feedback

diff, sub, add, or blend acts on feedback memory globally or semi-globally

Hydra shape:

```js
src(o0)
  .modulate(field, k)
  .layer(material.mask(gate))
  .diff(src(o0).blur(2), amount)
  .out(o0)
```

Members (50): pattern_002, pattern_003, pattern_004, pattern_006, pattern_007, pattern_008, pattern_009, pattern_010, pattern_011, pattern_012, pattern_013, pattern_014, pattern_015, pattern_017, pattern_018, pattern_019, pattern_021, pattern_026, pattern_027, pattern_030, pattern_031, pattern_032, pattern_035, pattern_042, pattern_043, pattern_044, pattern_046, pattern_047, pattern_049, pattern_050, pattern_055, pattern_058, pattern_061, pattern_063, pattern_064, pattern_065, pattern_069, pattern_074, pattern_076, pattern_077, pattern_078, pattern_079, pattern_080, pattern_081, pattern_084, pattern_087, pattern_089, pattern_090, pattern_092, pattern_093

### F12 parameter-signal receiver form

texture-valued controls replace arrays/callbacks and drive parameters with range, grain, or activation density

Hydra shape:

```js
phase = ns(1, .03).posterize(4, 1).pixelate(1, 1).r(.5, 0)
shape(4, 1, 0).repeat(width / 8, height / 8, phase, 0)
```

Members (26): pattern_002, pattern_016, pattern_023, pattern_025, pattern_026, pattern_027, pattern_033, pattern_034, pattern_039, pattern_055, pattern_064, pattern_065, pattern_066, pattern_069, pattern_071, pattern_072, pattern_076, pattern_077, pattern_078, pattern_079, pattern_080, pattern_081, pattern_082, pattern_087, pattern_090, pattern_094

### F13 direct-transform legacy form

scale, rotate, scroll, and friends act directly on feedback/material before being rewritten into fields

Hydra shape:

```js
src(o0)
  .scale(amount, 1, 1, anchorX, anchorY)
  .layer(material.mask(gate))
  .out(o0)
```

Members (67): pattern_002, pattern_003, pattern_004, pattern_006, pattern_007, pattern_008, pattern_009, pattern_010, pattern_011, pattern_013, pattern_014, pattern_015, pattern_016, pattern_017, pattern_021, pattern_023, pattern_025, pattern_026, pattern_027, pattern_029, pattern_030, pattern_031, pattern_032, pattern_033, pattern_035, pattern_037, pattern_038, pattern_041, pattern_042, pattern_044, pattern_046, pattern_047, pattern_049, pattern_050, pattern_051, pattern_052, pattern_053, pattern_055, pattern_056, pattern_058, pattern_059, pattern_060, pattern_061, pattern_063, pattern_064, pattern_065, pattern_069, pattern_070, pattern_071, pattern_072, pattern_073, pattern_074, pattern_075, pattern_076, pattern_077, pattern_078, pattern_079, pattern_080, pattern_081, pattern_083, pattern_084, pattern_087, pattern_089, pattern_090, pattern_091, pattern_093, pattern_094

### Grammar-adjacent but not detected in this v4 corpus

- F11 spectral conditioner feedback: blur, dualKawaseBlur, sharpen, or edgeDetect introduces low/high frequency recurrence pressure

## Evolution / Rework Runs

These are adjacent corpus runs with high structural similarity after the v4 pass. They should be read as likely reworks, variations, or neighboring iterations, not proof of authorial intent.

| run | members | shared forms | primary path |
| --- | --- | --- | --- |
| run_01 | pattern_004, pattern_006 | F01 hard-gated feedback ingress (2); F02 compound/interleaved feedback accumulation (2); F07 transform-delta coordinate field (2); F08 channel / chroma carrier (2); F10 global artifact / blend-pressure feedback (2); F13 direct-transform legacy form (2) | single-buffer hard-gated pixel-step feedback |
| run_02 | pattern_007, pattern_008, pattern_009, pattern_010, pattern_011 | F01 hard-gated feedback ingress (5); F02 compound/interleaved feedback accumulation (5); F03 multi-buffer staged circuit (5); F10 global artifact / blend-pressure feedback (5); F13 direct-transform legacy form (5); F06 axis-packed vector field (4) | multi-buffer feedback pipeline |
| run_03 | pattern_012, pattern_013, pattern_014, pattern_015, pattern_016 | F02 compound/interleaved feedback accumulation (5); F08 channel / chroma carrier (5); F01 hard-gated feedback ingress (4); F05 metric raster / pixel-grid form (4); F07 transform-delta coordinate field (4); F09 kaleid / symmetry recurrence (4) | memory conditioner / artifact feedback -> single-buffer hard-gated pixel-step feedback |
| run_04 | pattern_018, pattern_019, pattern_020 | F05 metric raster / pixel-grid form (3); F02 compound/interleaved feedback accumulation (2); F10 global artifact / blend-pressure feedback (2); F04 feed-forward lattice/source construction (1) | memory conditioner / artifact feedback -> feed-forward lattice/source construction |
| run_05 | pattern_023, pattern_025, pattern_026, pattern_027 | F01 hard-gated feedback ingress (4); F02 compound/interleaved feedback accumulation (4); F12 parameter-signal receiver form (4); F13 direct-transform legacy form (4); F05 metric raster / pixel-grid form (3); F07 transform-delta coordinate field (3) | single-buffer hard-gated pixel-step feedback -> multi-buffer feedback pipeline |
| run_06 | pattern_031, pattern_032, pattern_033 | F01 hard-gated feedback ingress (3); F02 compound/interleaved feedback accumulation (3); F09 kaleid / symmetry recurrence (3); F13 direct-transform legacy form (3); F05 metric raster / pixel-grid form (2); F06 axis-packed vector field (2) | single-buffer hard-gated pixel-step feedback |
| run_07 | pattern_037, pattern_038 | F06 axis-packed vector field (2); F13 direct-transform legacy form (2); F02 compound/interleaved feedback accumulation (1); F07 transform-delta coordinate field (1); F08 channel / chroma carrier (1) | closed feedback / uncategorized |
| run_08 | pattern_048, pattern_049 | F02 compound/interleaved feedback accumulation (2); F03 multi-buffer staged circuit (2); F06 axis-packed vector field (2); F07 transform-delta coordinate field (2); F08 channel / chroma carrier (2); F10 global artifact / blend-pressure feedback (1) | multi-buffer feedback pipeline |
| run_09 | pattern_051, pattern_052, pattern_053 | F01 hard-gated feedback ingress (3); F05 metric raster / pixel-grid form (3); F13 direct-transform legacy form (3); F06 axis-packed vector field (2); F02 compound/interleaved feedback accumulation (1); F07 transform-delta coordinate field (1) | single-buffer hard-gated pixel-step feedback |
| run_10 | pattern_059, pattern_060, pattern_061 | F01 hard-gated feedback ingress (3); F05 metric raster / pixel-grid form (3); F08 channel / chroma carrier (3); F09 kaleid / symmetry recurrence (3); F13 direct-transform legacy form (3); F02 compound/interleaved feedback accumulation (1) | single-buffer hard-gated pixel-step feedback |
| run_11 | pattern_064, pattern_065 | F01 hard-gated feedback ingress (2); F02 compound/interleaved feedback accumulation (2); F03 multi-buffer staged circuit (2); F06 axis-packed vector field (2); F07 transform-delta coordinate field (2); F08 channel / chroma carrier (2) | multi-buffer feedback pipeline |
| run_12 | pattern_069, pattern_070 | F01 hard-gated feedback ingress (2); F02 compound/interleaved feedback accumulation (2); F07 transform-delta coordinate field (2); F08 channel / chroma carrier (2); F13 direct-transform legacy form (2); F05 metric raster / pixel-grid form (1) | single-buffer hard-gated pixel-step feedback |
| run_13 | pattern_076, pattern_077, pattern_078, pattern_079, pattern_080, pattern_081 | F01 hard-gated feedback ingress (6); F02 compound/interleaved feedback accumulation (6); F03 multi-buffer staged circuit (6); F07 transform-delta coordinate field (6); F08 channel / chroma carrier (6); F09 kaleid / symmetry recurrence (6) | multi-buffer feedback pipeline |
| run_14 | pattern_089, pattern_090 | F02 compound/interleaved feedback accumulation (2); F05 metric raster / pixel-grid form (2); F10 global artifact / blend-pressure feedback (2); F13 direct-transform legacy form (2); F03 multi-buffer staged circuit (1); F06 axis-packed vector field (1) | memory conditioner / artifact feedback -> multi-buffer feedback pipeline |
| run_15 | pattern_093, pattern_094 | F02 compound/interleaved feedback accumulation (2); F09 kaleid / symmetry recurrence (2); F13 direct-transform legacy form (2); F01 hard-gated feedback ingress (1); F08 channel / chroma carrier (1); F10 global artifact / blend-pressure feedback (1) | memory conditioner / artifact feedback -> single-buffer hard-gated pixel-step feedback |

## Pattern Form Table

| pattern | primary circuit form | forms | reads/writes |
| --- | --- | --- | --- |
| pattern_002 | multi-buffer feedback pipeline | F02, F03, F06, F07, F08, F10, F12, F13 | read o0,o2 / write o0,o3,o2 / render o0 |
| pattern_003 | multi-buffer feedback pipeline | F02, F03, F10, F13 | read o1,o2 / write o1,o2,o3 / render o3 |
| pattern_004 | single-buffer hard-gated pixel-step feedback | F01, F02, F06, F07, F08, F10, F13 | read o0 / write o0 / render - |
| pattern_006 | single-buffer hard-gated pixel-step feedback | F01, F02, F05, F07, F08, F10, F13 | read o0 / write o0 / render o0 |
| pattern_007 | multi-buffer feedback pipeline | F01, F02, F03, F06, F07, F08, F10, F13 | read o0 / write o0,o1 / render o1 |
| pattern_008 | multi-buffer feedback pipeline | F01, F02, F03, F06, F07, F08, F10, F13 | read o0,o2,o3 / write o2,o0,o3 / render o0 |
| pattern_009 | multi-buffer feedback pipeline | F01, F02, F03, F05, F06, F07, F08, F10, F13 | read o0,o3,o2 / write o3,o2,o0 / render o0 |
| pattern_010 | multi-buffer feedback pipeline | F01, F02, F03, F05, F06, F10, F13 | read o0,o1 / write o0,o1,o2 / render o2 |
| pattern_011 | multi-buffer feedback pipeline | F01, F02, F03, F05, F07, F08, F10, F13 | read o1,o0,o2,o3 / write o0,o1,o2,o3,o4 / render o2,o3,o4 |
| pattern_012 | memory conditioner / artifact feedback | F02, F05, F06, F07, F08, F10 | read o0 / write o0 / render - |
| pattern_013 | single-buffer hard-gated pixel-step feedback | F01, F02, F05, F07, F08, F09, F10, F13 | read o0 / write o0 / render - |
| pattern_014 | single-buffer hard-gated pixel-step feedback | F01, F02, F05, F07, F08, F09, F10, F13 | read o0 / write o0 / render - |
| pattern_015 | single-buffer hard-gated pixel-step feedback | F01, F02, F05, F08, F09, F10, F13 | read o0 / write o0 / render - |
| pattern_016 | single-buffer hard-gated pixel-step feedback | F01, F02, F07, F08, F09, F12, F13 | read o0 / write o0 / render - |
| pattern_017 | memory conditioner / artifact feedback | F02, F07, F08, F09, F10, F13 | read o0 / write o0 / render - |
| pattern_018 | memory conditioner / artifact feedback | F02, F05, F10 | read o0 / write o0 / render - |
| pattern_019 | memory conditioner / artifact feedback | F02, F05, F10 | read o0 / write o0 / render - |
| pattern_020 | feed-forward lattice/source construction | F04, F05 | read - / write o0 / render - |
| pattern_021 | single-buffer hard-gated pixel-step feedback | F01, F02, F05, F06, F07, F08, F09, F10, F13 | read o0 / write o0 / render - |
| pattern_022 | feed-forward lattice/source construction | F04, F05 | read - / write o0 / render - |
| pattern_023 | single-buffer hard-gated pixel-step feedback | F01, F02, F05, F06, F07, F08, F12, F13 | read o0 / write o0 / render - |
| pattern_025 | single-buffer hard-gated pixel-step feedback | F01, F02, F05, F12, F13 | read o0 / write o0 / render - |
| pattern_026 | single-buffer hard-gated pixel-step feedback | F01, F02, F05, F06, F07, F08, F10, F12, F13 | read o0 / write o0 / render - |
| pattern_027 | multi-buffer feedback pipeline | F01, F02, F03, F07, F08, F10, F12, F13 | read o1,o0 / write o0,o1,o2 / render o2 |
| pattern_028 | feed-forward lattice/source construction | F04, F05 | read - / write o0 / render - |
| pattern_029 | single-buffer hard-gated pixel-step feedback | F01, F05, F09, F13 | read o0 / write o0 / render - |
| pattern_030 | multi-buffer feedback pipeline | F01, F02, F03, F07, F08, F10, F13 | read o1 / write o0,o1 / render o0 |
| pattern_031 | single-buffer hard-gated pixel-step feedback | F01, F02, F05, F08, F09, F10, F13 | read o0 / write o0 / render - |
| pattern_032 | single-buffer hard-gated pixel-step feedback | F01, F02, F05, F06, F08, F09, F10, F13 | read o0 / write o0 / render - |
| pattern_033 | single-buffer hard-gated pixel-step feedback | F01, F02, F06, F09, F12, F13 | read o0 / write o0 / render - |
| pattern_034 | feed-forward material/composite | F06, F12 | read - / write o0 / render - |
| pattern_035 | single-buffer hard-gated pixel-step feedback | F01, F02, F05, F06, F08, F09, F10, F13 | read o0 / write o0 / render - |
| pattern_037 | closed feedback / uncategorized | F06, F13 | read o0 / write o0 / render - |
| pattern_038 | closed feedback / uncategorized | F02, F06, F07, F08, F13 | read o0 / write o0 / render - |
| pattern_039 | feed-forward material/composite | F12 | read - / write o0 / render - |
| pattern_040 | feed-forward lattice/source construction | F04, F05 | read - / write o0 / render - |
| pattern_041 | single-buffer hard-gated pixel-step feedback | F01, F05, F06, F08, F09, F13 | read o0 / write o0 / render - |
| pattern_042 | multi-buffer feedback pipeline | F01, F02, F03, F05, F06, F07, F08, F10, F13 | read o0,o1 / write o0,o1,o2 / render o2 |
| pattern_043 | memory conditioner / artifact feedback | F02, F06, F10 | read o0 / write o0 / render - |
| pattern_044 | single-buffer hard-gated pixel-step feedback | F01, F02, F05, F06, F08, F09, F10, F13 | read o0 / write o0 / render - |
| pattern_045 | feed-forward lattice/source construction | F04, F07, F08 | read - / write o0 / render - |
| pattern_046 | memory conditioner / artifact feedback | F02, F05, F06, F07, F08, F10, F13 | read o0 / write o0 / render - |
| pattern_047 | single-buffer hard-gated pixel-step feedback | F01, F02, F05, F06, F08, F09, F10, F13 | read o0 / write o0 / render - |
| pattern_048 | multi-buffer feedback pipeline | F02, F03, F06, F07, F08 | read o0 / write o0,o1,o2 / render o2 |
| pattern_049 | multi-buffer feedback pipeline | F02, F03, F06, F07, F08, F10, F13 | read o1,o0 / write o0,o1 / render o1 |
| pattern_050 | multi-buffer feedback pipeline | F01, F02, F03, F05, F09, F10, F13 | read o1,o2,o0,o3 / write o1,o2,o3,o0 / render o0 |
| pattern_051 | single-buffer hard-gated pixel-step feedback | F01, F05, F06, F13 | read o0 / write o0 / render - |
| pattern_052 | single-buffer hard-gated pixel-step feedback | F01, F05, F06, F09, F13 | read o0 / write o0 / render - |
| pattern_053 | single-buffer hard-gated pixel-step feedback | F01, F02, F05, F07, F08, F13 | read o0 / write o0 / render - |
| pattern_054 | feed-forward lattice/source construction | F04 | read - / write o0 / render - |
| pattern_055 | memory conditioner / artifact feedback | F02, F05, F07, F08, F10, F12, F13 | read o0 / write o0 / render - |
| pattern_056 | closed feedback / uncategorized | F05, F13 | read o0 / write o0 / render - |
| pattern_057 | feed-forward material/composite | F09 | read - / write o0 / render - |
| pattern_058 | single-buffer hard-gated pixel-step feedback | F01, F02, F07, F08, F10, F13 | read o0 / write o0 / render - |
| pattern_059 | single-buffer hard-gated pixel-step feedback | F01, F05, F08, F09, F13 | read o0 / write o0 / render - |
| pattern_060 | single-buffer hard-gated pixel-step feedback | F01, F05, F08, F09, F13 | read o0 / write o0 / render - |
| pattern_061 | single-buffer hard-gated pixel-step feedback | F01, F02, F05, F06, F08, F09, F10, F13 | read o0 / write o0 / render - |
| pattern_062 | feed-forward lattice/source construction | F04, F05, F06, F09 | read - / write o0 / render - |
| pattern_063 | memory conditioner / artifact feedback | F02, F06, F07, F08, F10, F13 | read o0 / write o0 / render - |
| pattern_064 | multi-buffer feedback pipeline | F01, F02, F03, F06, F07, F08, F09, F10, F12, F13 | read o0,o1 / write o0,o1 / render - |
| pattern_065 | multi-buffer feedback pipeline | F01, F02, F03, F06, F07, F08, F10, F12, F13 | read o0,o1 / write o0,o1 / render - |
| pattern_066 | feed-forward lattice/source construction | F04, F12 | read - / write o0 / render - |
| pattern_067 | feed-forward lattice/source construction | F04, F05 | read - / write o0 / render - |
| pattern_068 | feed-forward material/composite | F06, F07, F08, F09 | read - / write o0 / render - |
| pattern_069 | single-buffer hard-gated pixel-step feedback | F01, F02, F05, F07, F08, F09, F10, F12, F13 | read o0 / write o0 / render - |
| pattern_070 | single-buffer hard-gated pixel-step feedback | F01, F02, F07, F08, F13 | read o0 / write o0 / render - |
| pattern_071 | single-buffer hard-gated pixel-step feedback | F01, F02, F06, F09, F12, F13 | read o0 / write o0 / render - |
| pattern_072 | multi-buffer feedback pipeline | F01, F03, F05, F12, F13 | read o0 / write o0,o1 / render o1 |
| pattern_073 | single-buffer hard-gated pixel-step feedback | F01, F05, F09, F13 | read o0 / write o0 / render - |
| pattern_074 | single-buffer hard-gated pixel-step feedback | F01, F02, F05, F07, F08, F09, F10, F13 | read o0 / write o0 / render - |
| pattern_075 | single-buffer hard-gated pixel-step feedback | F01, F02, F05, F08, F13 | read o0 / write o0 / render o0 |
| pattern_076 | multi-buffer feedback pipeline | F01, F02, F03, F05, F07, F08, F09, F10, F12, F13 | read o0,o2,o1 / write o0,o1,o2 / render o2 |
| pattern_077 | multi-buffer feedback pipeline | F01, F02, F03, F05, F07, F08, F09, F10, F12, F13 | read o0,o2,o1 / write o0,o1,o2 / render o2 |
| pattern_078 | multi-buffer feedback pipeline | F01, F02, F03, F05, F07, F08, F09, F10, F12, F13 | read o0,o2,o1 / write o0,o1,o2 / render o2 |
| pattern_079 | multi-buffer feedback pipeline | F01, F02, F03, F07, F08, F09, F10, F12, F13 | read o0,o2,o1 / write o0,o1,o2 / render o2 |
| pattern_080 | multi-buffer feedback pipeline | F01, F02, F03, F05, F07, F08, F09, F10, F12, F13 | read o0,o2,o1 / write o0,o1,o2 / render o0 |
| pattern_081 | multi-buffer feedback pipeline | F01, F02, F03, F05, F07, F08, F09, F10, F12, F13 | read o0,o2,o1 / write o0,o1,o2 / render o2 |
| pattern_082 | feed-forward lattice/source construction | F04, F12 | read - / write o0 / render - |
| pattern_083 | multi-buffer feedback pipeline | F01, F02, F03, F05, F07, F08, F13 | read o0,o2,o1 / write o0,o1,o2 / render o1,o2 |
| pattern_084 | multi-buffer feedback pipeline | F02, F03, F05, F07, F08, F10, F13 | read o0 / write o0,o1 / render o1 |
| pattern_085 | feed-forward lattice/source construction | F04, F06, F07, F08 | read - / write o0 / render - |
| pattern_086 | feed-forward material/composite | F09 | read - / write o0 / render - |
| pattern_087 | multi-buffer feedback pipeline | F01, F02, F03, F05, F07, F08, F10, F12, F13 | read o2,o1,o0 / write o0,o1,o2 / render o1 |
| pattern_088 | feed-forward lattice/source construction | F04, F05 | read - / write o0 / render - |
| pattern_089 | memory conditioner / artifact feedback | F02, F05, F10, F13 | read o0 / write o0 / render - |
| pattern_090 | multi-buffer feedback pipeline | F02, F03, F05, F06, F10, F12, F13 | read o0,o1 / write o0,o1 / render o0 |
| pattern_091 | closed feedback / uncategorized | F02, F05, F07, F08, F13 | read o0 / write o0 / render - |
| pattern_092 | memory conditioner / artifact feedback | F02, F05, F10 | read o0 / write o0 / render - |
| pattern_093 | memory conditioner / artifact feedback | F02, F09, F10, F13 | read o0 / write o0 / render - |
| pattern_094 | single-buffer hard-gated pixel-step feedback | F01, F02, F08, F09, F12, F13 | read o0 / write o0 / render - |

## Generator Reading

The useful abstraction is not one master family. The corpus is better read as a small number of circuit topologies receiving reusable form modules:

```text
Circuit topology
  + ingress form
  + field form
  + material/gate form
  + conditioner/pressure form
  + parameter-signal form
```

This means generation should choose a circuit first, then attach compatible forms. For example:

```text
single-buffer hard-gated pixel-step feedback
  + metric raster gate
  + axis-packed vector field
  + transform-delta drift
  + channel/chroma carrier
  + bounded global artifact branch
```

That is a grammar object. A specific Hydra patch is one rendering of it.
