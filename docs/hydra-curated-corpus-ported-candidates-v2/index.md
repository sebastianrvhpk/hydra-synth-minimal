# Hydra Curated Corpus Ported Candidates V2

This directory is the second-pass corpus.

Use:

```js
// run this once
shared-v2.js

// then evaluate individual pattern files
pattern_002.v2.js
```

Second-pass targets:

- repeated helper boilerplate moved into `shared-v2.js`
- `()=>time` style callback parameters replaced by texture-valued signal helpers where possible
- Hydra array sequences replaced by `seqSignal(min, max, bins, speed)`
- local arrow helper definitions converted to function declarations

These are still review candidates, not accepted visual ports.

## Files

- [pattern_002.v2.js](./pattern_002.v2.js)
- [pattern_003.v2.js](./pattern_003.v2.js)
- [pattern_004.v2.js](./pattern_004.v2.js)
- [pattern_006.v2.js](./pattern_006.v2.js)
- [pattern_007.v2.js](./pattern_007.v2.js)
- [pattern_008.v2.js](./pattern_008.v2.js)
- [pattern_009.v2.js](./pattern_009.v2.js)
- [pattern_010.v2.js](./pattern_010.v2.js)
- [pattern_011.v2.js](./pattern_011.v2.js)
- [pattern_012.v2.js](./pattern_012.v2.js)
- [pattern_013.v2.js](./pattern_013.v2.js)
- [pattern_014.v2.js](./pattern_014.v2.js)
- [pattern_015.v2.js](./pattern_015.v2.js)
- [pattern_016.v2.js](./pattern_016.v2.js)
- [pattern_017.v2.js](./pattern_017.v2.js)
- [pattern_018.v2.js](./pattern_018.v2.js)
- [pattern_019.v2.js](./pattern_019.v2.js)
- [pattern_020.v2.js](./pattern_020.v2.js)
- [pattern_021.v2.js](./pattern_021.v2.js)
- [pattern_022.v2.js](./pattern_022.v2.js)
- [pattern_023.v2.js](./pattern_023.v2.js)
- [pattern_025.v2.js](./pattern_025.v2.js)
- [pattern_026.v2.js](./pattern_026.v2.js)
- [pattern_027.v2.js](./pattern_027.v2.js)
- [pattern_028.v2.js](./pattern_028.v2.js)
- [pattern_029.v2.js](./pattern_029.v2.js)
- [pattern_030.v2.js](./pattern_030.v2.js)
- [pattern_031.v2.js](./pattern_031.v2.js)
- [pattern_032.v2.js](./pattern_032.v2.js)
- [pattern_033.v2.js](./pattern_033.v2.js)
- [pattern_034.v2.js](./pattern_034.v2.js)
- [pattern_035.v2.js](./pattern_035.v2.js)
- [pattern_037.v2.js](./pattern_037.v2.js)
- [pattern_038.v2.js](./pattern_038.v2.js)
- [pattern_039.v2.js](./pattern_039.v2.js)
- [pattern_040.v2.js](./pattern_040.v2.js)
- [pattern_041.v2.js](./pattern_041.v2.js)
- [pattern_042.v2.js](./pattern_042.v2.js)
- [pattern_043.v2.js](./pattern_043.v2.js)
- [pattern_044.v2.js](./pattern_044.v2.js)
- [pattern_045.v2.js](./pattern_045.v2.js)
- [pattern_046.v2.js](./pattern_046.v2.js)
- [pattern_047.v2.js](./pattern_047.v2.js)
- [pattern_048.v2.js](./pattern_048.v2.js)
- [pattern_049.v2.js](./pattern_049.v2.js)
- [pattern_050.v2.js](./pattern_050.v2.js)
- [pattern_051.v2.js](./pattern_051.v2.js)
- [pattern_052.v2.js](./pattern_052.v2.js)
- [pattern_053.v2.js](./pattern_053.v2.js)
- [pattern_054.v2.js](./pattern_054.v2.js)
- [pattern_055.v2.js](./pattern_055.v2.js)
- [pattern_056.v2.js](./pattern_056.v2.js)
- [pattern_057.v2.js](./pattern_057.v2.js)
- [pattern_058.v2.js](./pattern_058.v2.js)
- [pattern_059.v2.js](./pattern_059.v2.js)
- [pattern_060.v2.js](./pattern_060.v2.js)
- [pattern_061.v2.js](./pattern_061.v2.js)
- [pattern_062.v2.js](./pattern_062.v2.js)
- [pattern_063.v2.js](./pattern_063.v2.js)
- [pattern_064.v2.js](./pattern_064.v2.js)
- [pattern_065.v2.js](./pattern_065.v2.js)
- [pattern_066.v2.js](./pattern_066.v2.js)
- [pattern_067.v2.js](./pattern_067.v2.js)
- [pattern_068.v2.js](./pattern_068.v2.js)
- [pattern_069.v2.js](./pattern_069.v2.js)
- [pattern_070.v2.js](./pattern_070.v2.js)
- [pattern_071.v2.js](./pattern_071.v2.js)
- [pattern_072.v2.js](./pattern_072.v2.js)
- [pattern_073.v2.js](./pattern_073.v2.js)
- [pattern_074.v2.js](./pattern_074.v2.js)
- [pattern_075.v2.js](./pattern_075.v2.js)
- [pattern_076.v2.js](./pattern_076.v2.js)
- [pattern_077.v2.js](./pattern_077.v2.js)
- [pattern_078.v2.js](./pattern_078.v2.js)
- [pattern_079.v2.js](./pattern_079.v2.js)
- [pattern_080.v2.js](./pattern_080.v2.js)
- [pattern_081.v2.js](./pattern_081.v2.js)
- [pattern_082.v2.js](./pattern_082.v2.js)
- [pattern_083.v2.js](./pattern_083.v2.js)
- [pattern_084.v2.js](./pattern_084.v2.js)
- [pattern_085.v2.js](./pattern_085.v2.js)
- [pattern_086.v2.js](./pattern_086.v2.js)
- [pattern_087.v2.js](./pattern_087.v2.js)
- [pattern_088.v2.js](./pattern_088.v2.js)
- [pattern_089.v2.js](./pattern_089.v2.js)
- [pattern_090.v2.js](./pattern_090.v2.js)
- [pattern_091.v2.js](./pattern_091.v2.js)
- [pattern_092.v2.js](./pattern_092.v2.js)
- [pattern_093.v2.js](./pattern_093.v2.js)
- [pattern_094.v2.js](./pattern_094.v2.js)
