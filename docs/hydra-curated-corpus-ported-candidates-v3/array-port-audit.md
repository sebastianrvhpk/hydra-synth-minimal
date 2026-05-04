# Hydra Curated Corpus Final Array Port Audit

This audit checks the authored arrays against the v3 porting lens. The important shift is intentional: arrays are no longer treated as exact ordered sequences. They are interpreted as parameter-motion hints: range, value density, base/null/identity, and activation character.

## Summary

- Patterns processed: 90
- Original authored arrays found: 13
- Arrays ported in v3 bodies: 13
- Callback arrows ported: 66
- Pattern count mismatches between original arrays and v3 body arrays: 0

## V3 Array Mapping Rules

- `static-scalar`: equal entries collapse to the scalar because there is no motion density.
- `identity-hit` / `base-hit`: dominant base values become `hit(base, amount, threshold, ...)`, preserving identity/nullity and sparse activation.
- `unipolar-range`: non-negative ranges become `rng(min, max, bins, ...)`.
- `signed-range`: signed ranges become `knob(center, amount, bins, ...)`.
- `choice-expression`: expression arrays become `choice2/3/4(...)` when they are initialization choices rather than Hydra sequence motion.

## Kind Counts

- base-hit: 2
- choice-expression: 1
- identity-hit: 5
- signed-range: 1
- unipolar-range: 4

## Per-Pattern Array Ports

### pattern_002 - source block 2

- Original arrays: 0
- V3 array ports: 0
- Callback ports: 2
- callback: `() => .25 + time / 2.5 % .75` -> `rng(0.25, 1, 8, 2, 0.05)`
- callback: `() => time / 5 % btw(.5, 7.5)` -> `rng(0, btw(.5, 7.5), 8, 2, 0.05)`

### pattern_003 - source block 3

- Original arrays: 1
- V3 array ports: 1
- Callback ports: 0
- 1. signed-range: `[-.0125, -.0125, -.0075, -.0075, -.01].fast(2)` -> v2 `seqSignal(-0.0125, -0.0075, 5, 2)` -> v3 `knob(-0.01, 0.0025, 3, 2, 0.08)`

### pattern_009 - source block 9

- Original arrays: 1
- V3 array ports: 1
- Callback ports: 0
- 1. choice-expression: `[4, 100]` -> v2 `choice2(4, 100)` -> v3 `choice2(4, 100)`

### pattern_016 - source block 16

- Original arrays: 0
- V3 array ports: 0
- Callback ports: 3
- callback: `() => time/3` -> `rng(0, 1, 8, 2, 0.05)`
- callback: `() => time/3` -> `rng(0, 1, 8, 2, 0.05)`
- callback: `() => time/3` -> `rng(0, 1, 8, 2, 0.05)`

### pattern_023 - source block 23

- Original arrays: 5
- V3 array ports: 5
- Callback ports: 3
- 1. unipolar-range: `[2,4]` -> v2 `seqSignal(2, 4, 2, 0.25)` -> v3 `rng(2, 4, 2, 2, 0.01)`
- 2. unipolar-range: `[2,4]` -> v2 `seqSignal(2, 4, 2, 0.25)` -> v3 `rng(2, 4, 2, 2, 0.01)`
- 3. identity-hit: `[1,1,2,1]` -> v2 `seqSignal(1, 2, 4, 0.25)` -> v3 `hit(1, 1, 0.6, 1, 0.01)`
- 4. identity-hit: `[1,1,2,1]` -> v2 `seqSignal(1, 2, 4, 0.25)` -> v3 `hit(1, 1, 0.6, 1, 0.01)`
- 5. base-hit: `[2,2,4]` -> v2 `seqSignal(2, 4, 3, 0.25)` -> v3 `hit(2, 2, 0.35, 1, 0.01)`
- callback: `() => time/5` -> `rng(0, 1, 8, 2, 0.05)`
- callback: `() => Math.sin(time/2)/2+.5` -> `wob(0, 1, 0.05)`
- callback: `() => Math.cos(time/2)/2+.5` -> `wob(0, 1, 0.05)`

### pattern_025 - source block 25

- Original arrays: 0
- V3 array ports: 0
- Callback ports: 3
- callback: `() => Math.sin(time)/4` -> `wobc(0, 0.25, 0.05)`
- callback: `() => Math.cos(time)/4` -> `wobc(0, 0.25, 0.05)`
- callback: `() => (time/4)%1*-1` -> `rng(-1, 0, 8, 2, 0.05)`

### pattern_026 - source block 26

- Original arrays: 5
- V3 array ports: 5
- Callback ports: 3
- 1. unipolar-range: `[2,4]` -> v2 `seqSignal(2, 4, 2, 0.25)` -> v3 `rng(2, 4, 2, 2, 0.01)`
- 2. unipolar-range: `[2,4]` -> v2 `seqSignal(2, 4, 2, 0.25)` -> v3 `rng(2, 4, 2, 2, 0.01)`
- 3. identity-hit: `[1,1,2,1]` -> v2 `seqSignal(1, 2, 4, 0.25)` -> v3 `hit(1, 1, 0.6, 1, 0.01)`
- 4. identity-hit: `[1,1,2,1]` -> v2 `seqSignal(1, 2, 4, 0.25)` -> v3 `hit(1, 1, 0.6, 1, 0.01)`
- 5. base-hit: `[2,2,4]` -> v2 `seqSignal(2, 4, 3, 0.25)` -> v3 `hit(2, 2, 0.35, 1, 0.01)`
- callback: `() => time/5` -> `rng(0, 1, 8, 2, 0.05)`
- callback: `() => Math.sin(time/2)/2+.5` -> `wob(0, 1, 0.05)`
- callback: `() => Math.cos(time/2)/2+.5` -> `wob(0, 1, 0.05)`

### pattern_027 - source block 27

- Original arrays: 0
- V3 array ports: 0
- Callback ports: 6
- callback: `() => (time/120)%1*.025` -> `rng(0, 0.025, 8, 2, 0.05)`
- callback: `() => (time/120)%1*8` -> `rng(0, 8, 8, 2, 0.05)`
- callback: `() => (time/120)%1*8` -> `rng(0, 8, 8, 2, 0.05)`
- callback: `() => (time/120)%1*.875` -> `rng(0, 0.875, 8, 2, 0.05)`
- callback: `() => Math.sin(time/30)` -> `wob(-1, 1, 0.05)`
- callback: `() => time<=90?(time/(90))*200:200` -> `rng(0, 200, 8, 2, 0.05)`

### pattern_033 - source block 33

- Original arrays: 0
- V3 array ports: 0
- Callback ports: 2
- callback: `() => Math.sin(time)` -> `wob(-1, 1, 0.05)`
- callback: `() => Math.cos(time)` -> `wob(-1, 1, 0.05)`

### pattern_034 - source block 34

- Original arrays: 0
- V3 array ports: 0
- Callback ports: 2
- callback: `() => Math.sin(time)` -> `wob(-1, 1, 0.05)`
- callback: `() => Math.cos(time)` -> `wob(-1, 1, 0.05)`

### pattern_039 - source block 39

- Original arrays: 0
- V3 array ports: 0
- Callback ports: 2
- callback: `() => Math.sin(time)` -> `wob(-1, 1, 0.05)`
- callback: `() => Math.cos(time)` -> `wob(-1, 1, 0.05)`

### pattern_055 - source block 55

- Original arrays: 0
- V3 array ports: 0
- Callback ports: 3
- callback: `() => Math.sin(time*4)` -> `wob(-1, 1, 0.05)`
- callback: `() => -time/8.1` -> `rng(-1, 0, 8, 2, 0.05)`
- callback: `() => time/8` -> `rng(0, 1, 8, 2, 0.05)`

### pattern_064 - source block 64

- Original arrays: 0
- V3 array ports: 0
- Callback ports: 4
- callback: `() => Math.sin(time*tm*.5)*scl*.5` -> `wobc(0, scl*.5, 0.05)`
- callback: `() => Math.cos(time*tm*.5)*scl*.5` -> `wobc(0, scl*.5, 0.05)`
- callback: `() => Math.sin(time)*.9875` -> `wobc(0, 0.9875, 0.05)`
- callback: `() => Math.sin(time)*.9875` -> `wobc(0, 0.9875, 0.05)`

### pattern_065 - source block 65

- Original arrays: 0
- V3 array ports: 0
- Callback ports: 2
- callback: `() => Math.sin(time*tm*.5)*scl*.5` -> `wobc(0, scl*.5, 0.05)`
- callback: `() => Math.cos(time*tm*.5)*scl*.5` -> `wobc(0, scl*.5, 0.05)`

### pattern_066 - source block 66

- Original arrays: 0
- V3 array ports: 0
- Callback ports: 1
- callback: `() => -(time*100)%(width)` -> `rng(-(width), 0, 8, 2, 0.05)`

### pattern_069 - source block 69

- Original arrays: 0
- V3 array ports: 0
- Callback ports: 1
- callback: `() => (Math.sin(time/4)*.5+.5)/2` -> `wob(0, 0.5, 0.05)`

### pattern_071 - source block 71

- Original arrays: 0
- V3 array ports: 0
- Callback ports: 6
- callback: `() => Math.sin(time/2)` -> `wob(-1, 1, 0.05)`
- callback: `() => Math.cos(time/2)` -> `wob(-1, 1, 0.05)`
- callback: `() => Math.sin(time/2)` -> `wob(-1, 1, 0.05)`
- callback: `() => Math.cos(time/2)` -> `wob(-1, 1, 0.05)`
- callback: `() => Math.sin(time/2)` -> `wob(-1, 1, 0.05)`
- callback: `() => Math.cos(time/2)` -> `wob(-1, 1, 0.05)`

### pattern_072 - source block 72

- Original arrays: 0
- V3 array ports: 0
- Callback ports: 1
- callback: `() => time/100%.1` -> `rng(0, 0.1, 8, 2, 0.05)`

### pattern_076 - source block 76

- Original arrays: 0
- V3 array ports: 0
- Callback ports: 2
- callback: `() => time%1` -> `rng(0, 1, 8, 2, 0.05)`
- callback: `() => Math.sin(time)/2+.5` -> `wob(0, 1, 0.05)`

### pattern_077 - source block 77

- Original arrays: 0
- V3 array ports: 0
- Callback ports: 3
- callback: `() => time%1` -> `rng(0, 1, 8, 2, 0.05)`
- callback: `() => Math.sin(time)/2+.5` -> `wob(0, 1, 0.05)`
- callback: `() => -time/4%1` -> `rng(-1, 0, 8, 2, 0.05)`

### pattern_078 - source block 78

- Original arrays: 0
- V3 array ports: 0
- Callback ports: 3
- callback: `() => time%1` -> `rng(0, 1, 8, 2, 0.05)`
- callback: `() => Math.sin(time)/2+.5` -> `wob(0, 1, 0.05)`
- callback: `() => -time/4%1` -> `rng(-1, 0, 8, 2, 0.05)`

### pattern_079 - source block 79

- Original arrays: 0
- V3 array ports: 0
- Callback ports: 2
- callback: `() => Math.sin(time)/2+.5` -> `wob(0, 1, 0.05)`
- callback: `() => -time/4%1` -> `rng(-1, 0, 8, 2, 0.05)`

### pattern_080 - source block 80

- Original arrays: 0
- V3 array ports: 0
- Callback ports: 2
- callback: `() => Math.sin(time)/2+.5` -> `wob(0, 1, 0.05)`
- callback: `() => Math.sin(time/8)*.125+.25` -> `wobc(0.25, 0.125, 0.05)`

### pattern_081 - source block 81

- Original arrays: 0
- V3 array ports: 0
- Callback ports: 2
- callback: `() => Math.sin(time)/2+.5` -> `wob(0, 1, 0.05)`
- callback: `() => Math.sin(time/8)*.125+.75` -> `wobc(0.75, 0.125, 0.05)`

### pattern_082 - source block 82

- Original arrays: 0
- V3 array ports: 0
- Callback ports: 6
- callback: `() => 4+(time+64)%128` -> `rng(4, 132, 8, 2, 0.05)`
- callback: `() => 7+time%128` -> `rng(7, 135, 8, 2, 0.05)`
- callback: `() => 4+(time+64)%128` -> `rng(4, 132, 8, 2, 0.05)`
- callback: `() => 7+time%128` -> `rng(7, 135, 8, 2, 0.05)`
- callback: `() => 4+(time+64)%128` -> `rng(4, 132, 8, 2, 0.05)`
- callback: `() => 7+time%128` -> `rng(7, 135, 8, 2, 0.05)`

### pattern_087 - source block 87

- Original arrays: 0
- V3 array ports: 0
- Callback ports: 1
- callback: `() => time*5` -> `rng(0, 8, 8, 2, 0.05)`

### pattern_090 - source block 90

- Original arrays: 1
- V3 array ports: 1
- Callback ports: 0
- 1. identity-hit: `[1,1,1.00125]` -> v2 `seqSignal(1, 1.00125, 3, 0.25)` -> v3 `hit(1, 0.00125, 0.35, 1, 0.01)`

### pattern_094 - source block 94

- Original arrays: 0
- V3 array ports: 0
- Callback ports: 1
- callback: `() => time` -> `rng(0, 1, 8, 2, 0.05)`

