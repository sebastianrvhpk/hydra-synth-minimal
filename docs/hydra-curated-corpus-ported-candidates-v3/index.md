# Hydra Curated Corpus Ported Candidates V3

This directory is the final review pass over the 90 curated corpus ports.

Use:

```js
// run this once
shared-v3.js

// then evaluate individual pattern files
pattern_002.v3.js
```

V3 targets:

- array ports preserve parameter-motion intent rather than exact array order
- legacy sequence helper calls are removed
- `()=>time` style callback parameters are replaced where possible
- `noiseLoop` is used as the real transform name
- every original authored array is audited in `array-port-audit.md` and `array-port-audit.json`

Audit summary:

- Original authored arrays: 13
- V3 array ports: 13
- Callback ports: 66
- Original/v3 array count mismatches: 0

These are still review candidates, not accepted visual ports.

## Files

- [pattern_002.v3.js](./pattern_002.v3.js)
- [pattern_003.v3.js](./pattern_003.v3.js)
- [pattern_004.v3.js](./pattern_004.v3.js)
- [pattern_006.v3.js](./pattern_006.v3.js)
- [pattern_007.v3.js](./pattern_007.v3.js)
- [pattern_008.v3.js](./pattern_008.v3.js)
- [pattern_009.v3.js](./pattern_009.v3.js)
- [pattern_010.v3.js](./pattern_010.v3.js)
- [pattern_011.v3.js](./pattern_011.v3.js)
- [pattern_012.v3.js](./pattern_012.v3.js)
- [pattern_013.v3.js](./pattern_013.v3.js)
- [pattern_014.v3.js](./pattern_014.v3.js)
- [pattern_015.v3.js](./pattern_015.v3.js)
- [pattern_016.v3.js](./pattern_016.v3.js)
- [pattern_017.v3.js](./pattern_017.v3.js)
- [pattern_018.v3.js](./pattern_018.v3.js)
- [pattern_019.v3.js](./pattern_019.v3.js)
- [pattern_020.v3.js](./pattern_020.v3.js)
- [pattern_021.v3.js](./pattern_021.v3.js)
- [pattern_022.v3.js](./pattern_022.v3.js)
- [pattern_023.v3.js](./pattern_023.v3.js)
- [pattern_025.v3.js](./pattern_025.v3.js)
- [pattern_026.v3.js](./pattern_026.v3.js)
- [pattern_027.v3.js](./pattern_027.v3.js)
- [pattern_028.v3.js](./pattern_028.v3.js)
- [pattern_029.v3.js](./pattern_029.v3.js)
- [pattern_030.v3.js](./pattern_030.v3.js)
- [pattern_031.v3.js](./pattern_031.v3.js)
- [pattern_032.v3.js](./pattern_032.v3.js)
- [pattern_033.v3.js](./pattern_033.v3.js)
- [pattern_034.v3.js](./pattern_034.v3.js)
- [pattern_035.v3.js](./pattern_035.v3.js)
- [pattern_037.v3.js](./pattern_037.v3.js)
- [pattern_038.v3.js](./pattern_038.v3.js)
- [pattern_039.v3.js](./pattern_039.v3.js)
- [pattern_040.v3.js](./pattern_040.v3.js)
- [pattern_041.v3.js](./pattern_041.v3.js)
- [pattern_042.v3.js](./pattern_042.v3.js)
- [pattern_043.v3.js](./pattern_043.v3.js)
- [pattern_044.v3.js](./pattern_044.v3.js)
- [pattern_045.v3.js](./pattern_045.v3.js)
- [pattern_046.v3.js](./pattern_046.v3.js)
- [pattern_047.v3.js](./pattern_047.v3.js)
- [pattern_048.v3.js](./pattern_048.v3.js)
- [pattern_049.v3.js](./pattern_049.v3.js)
- [pattern_050.v3.js](./pattern_050.v3.js)
- [pattern_051.v3.js](./pattern_051.v3.js)
- [pattern_052.v3.js](./pattern_052.v3.js)
- [pattern_053.v3.js](./pattern_053.v3.js)
- [pattern_054.v3.js](./pattern_054.v3.js)
- [pattern_055.v3.js](./pattern_055.v3.js)
- [pattern_056.v3.js](./pattern_056.v3.js)
- [pattern_057.v3.js](./pattern_057.v3.js)
- [pattern_058.v3.js](./pattern_058.v3.js)
- [pattern_059.v3.js](./pattern_059.v3.js)
- [pattern_060.v3.js](./pattern_060.v3.js)
- [pattern_061.v3.js](./pattern_061.v3.js)
- [pattern_062.v3.js](./pattern_062.v3.js)
- [pattern_063.v3.js](./pattern_063.v3.js)
- [pattern_064.v3.js](./pattern_064.v3.js)
- [pattern_065.v3.js](./pattern_065.v3.js)
- [pattern_066.v3.js](./pattern_066.v3.js)
- [pattern_067.v3.js](./pattern_067.v3.js)
- [pattern_068.v3.js](./pattern_068.v3.js)
- [pattern_069.v3.js](./pattern_069.v3.js)
- [pattern_070.v3.js](./pattern_070.v3.js)
- [pattern_071.v3.js](./pattern_071.v3.js)
- [pattern_072.v3.js](./pattern_072.v3.js)
- [pattern_073.v3.js](./pattern_073.v3.js)
- [pattern_074.v3.js](./pattern_074.v3.js)
- [pattern_075.v3.js](./pattern_075.v3.js)
- [pattern_076.v3.js](./pattern_076.v3.js)
- [pattern_077.v3.js](./pattern_077.v3.js)
- [pattern_078.v3.js](./pattern_078.v3.js)
- [pattern_079.v3.js](./pattern_079.v3.js)
- [pattern_080.v3.js](./pattern_080.v3.js)
- [pattern_081.v3.js](./pattern_081.v3.js)
- [pattern_082.v3.js](./pattern_082.v3.js)
- [pattern_083.v3.js](./pattern_083.v3.js)
- [pattern_084.v3.js](./pattern_084.v3.js)
- [pattern_085.v3.js](./pattern_085.v3.js)
- [pattern_086.v3.js](./pattern_086.v3.js)
- [pattern_087.v3.js](./pattern_087.v3.js)
- [pattern_088.v3.js](./pattern_088.v3.js)
- [pattern_089.v3.js](./pattern_089.v3.js)
- [pattern_090.v3.js](./pattern_090.v3.js)
- [pattern_091.v3.js](./pattern_091.v3.js)
- [pattern_092.v3.js](./pattern_092.v3.js)
- [pattern_093.v3.js](./pattern_093.v3.js)
- [pattern_094.v3.js](./pattern_094.v3.js)
