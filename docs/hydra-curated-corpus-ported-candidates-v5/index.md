# Hydra Curated Corpus Ported Candidates V5

This directory is an energy-bound pass over the v4 corpus.

Rule:

- feedback-influencing displacement is capped at 6 pixels/pass where the field exposes pixel-step units
- transform-delta fields used as modulators are converted to pixel-step fields with `.color(1 / width, 1 / height)`
- lower-energy authored motions are preserved
- pre-feedback material/gate raw modulates are not flattened unless they expose coordinate-delta energy
- unresolved dynamic or non-normalized cases, if any, are listed in the audit for manual review

Use:

```js
// run this once
shared-v5.js

// then evaluate individual pattern files
pattern_002.v5.js
```

Audit:

- changed modulate calls: 142
- residual review calls: 0

## Files

- [pattern_002.v5.js](./pattern_002.v5.js)
- [pattern_003.v5.js](./pattern_003.v5.js)
- [pattern_004.v5.js](./pattern_004.v5.js)
- [pattern_006.v5.js](./pattern_006.v5.js)
- [pattern_007.v5.js](./pattern_007.v5.js)
- [pattern_008.v5.js](./pattern_008.v5.js)
- [pattern_009.v5.js](./pattern_009.v5.js)
- [pattern_010.v5.js](./pattern_010.v5.js)
- [pattern_011.v5.js](./pattern_011.v5.js)
- [pattern_012.v5.js](./pattern_012.v5.js)
- [pattern_013.v5.js](./pattern_013.v5.js)
- [pattern_014.v5.js](./pattern_014.v5.js)
- [pattern_015.v5.js](./pattern_015.v5.js)
- [pattern_016.v5.js](./pattern_016.v5.js)
- [pattern_017.v5.js](./pattern_017.v5.js)
- [pattern_018.v5.js](./pattern_018.v5.js)
- [pattern_019.v5.js](./pattern_019.v5.js)
- [pattern_020.v5.js](./pattern_020.v5.js)
- [pattern_021.v5.js](./pattern_021.v5.js)
- [pattern_022.v5.js](./pattern_022.v5.js)
- [pattern_023.v5.js](./pattern_023.v5.js)
- [pattern_025.v5.js](./pattern_025.v5.js)
- [pattern_026.v5.js](./pattern_026.v5.js)
- [pattern_027.v5.js](./pattern_027.v5.js)
- [pattern_028.v5.js](./pattern_028.v5.js)
- [pattern_029.v5.js](./pattern_029.v5.js)
- [pattern_030.v5.js](./pattern_030.v5.js)
- [pattern_031.v5.js](./pattern_031.v5.js)
- [pattern_032.v5.js](./pattern_032.v5.js)
- [pattern_033.v5.js](./pattern_033.v5.js)
- [pattern_034.v5.js](./pattern_034.v5.js)
- [pattern_035.v5.js](./pattern_035.v5.js)
- [pattern_037.v5.js](./pattern_037.v5.js)
- [pattern_038.v5.js](./pattern_038.v5.js)
- [pattern_039.v5.js](./pattern_039.v5.js)
- [pattern_040.v5.js](./pattern_040.v5.js)
- [pattern_041.v5.js](./pattern_041.v5.js)
- [pattern_042.v5.js](./pattern_042.v5.js)
- [pattern_043.v5.js](./pattern_043.v5.js)
- [pattern_044.v5.js](./pattern_044.v5.js)
- [pattern_045.v5.js](./pattern_045.v5.js)
- [pattern_046.v5.js](./pattern_046.v5.js)
- [pattern_047.v5.js](./pattern_047.v5.js)
- [pattern_048.v5.js](./pattern_048.v5.js)
- [pattern_049.v5.js](./pattern_049.v5.js)
- [pattern_050.v5.js](./pattern_050.v5.js)
- [pattern_051.v5.js](./pattern_051.v5.js)
- [pattern_052.v5.js](./pattern_052.v5.js)
- [pattern_053.v5.js](./pattern_053.v5.js)
- [pattern_054.v5.js](./pattern_054.v5.js)
- [pattern_055.v5.js](./pattern_055.v5.js)
- [pattern_056.v5.js](./pattern_056.v5.js)
- [pattern_057.v5.js](./pattern_057.v5.js)
- [pattern_058.v5.js](./pattern_058.v5.js)
- [pattern_059.v5.js](./pattern_059.v5.js)
- [pattern_060.v5.js](./pattern_060.v5.js)
- [pattern_061.v5.js](./pattern_061.v5.js)
- [pattern_062.v5.js](./pattern_062.v5.js)
- [pattern_063.v5.js](./pattern_063.v5.js)
- [pattern_064.v5.js](./pattern_064.v5.js)
- [pattern_065.v5.js](./pattern_065.v5.js)
- [pattern_066.v5.js](./pattern_066.v5.js)
- [pattern_067.v5.js](./pattern_067.v5.js)
- [pattern_068.v5.js](./pattern_068.v5.js)
- [pattern_069.v5.js](./pattern_069.v5.js)
- [pattern_070.v5.js](./pattern_070.v5.js)
- [pattern_071.v5.js](./pattern_071.v5.js)
- [pattern_072.v5.js](./pattern_072.v5.js)
- [pattern_073.v5.js](./pattern_073.v5.js)
- [pattern_074.v5.js](./pattern_074.v5.js)
- [pattern_075.v5.js](./pattern_075.v5.js)
- [pattern_076.v5.js](./pattern_076.v5.js)
- [pattern_077.v5.js](./pattern_077.v5.js)
- [pattern_078.v5.js](./pattern_078.v5.js)
- [pattern_079.v5.js](./pattern_079.v5.js)
- [pattern_080.v5.js](./pattern_080.v5.js)
- [pattern_081.v5.js](./pattern_081.v5.js)
- [pattern_082.v5.js](./pattern_082.v5.js)
- [pattern_083.v5.js](./pattern_083.v5.js)
- [pattern_084.v5.js](./pattern_084.v5.js)
- [pattern_085.v5.js](./pattern_085.v5.js)
- [pattern_086.v5.js](./pattern_086.v5.js)
- [pattern_087.v5.js](./pattern_087.v5.js)
- [pattern_088.v5.js](./pattern_088.v5.js)
- [pattern_089.v5.js](./pattern_089.v5.js)
- [pattern_090.v5.js](./pattern_090.v5.js)
- [pattern_091.v5.js](./pattern_091.v5.js)
- [pattern_092.v5.js](./pattern_092.v5.js)
- [pattern_093.v5.js](./pattern_093.v5.js)
- [pattern_094.v5.js](./pattern_094.v5.js)
