# Hydra Curated Corpus Ported Candidates V4

This directory is a conservative buffer-normalized pass over the v3 port candidates.

Use:

```js
// run this once
shared-v4.js

// then evaluate individual pattern files
pattern_002.v4.js
```

Normalization rule:

- collapse display-only alias buffers such as `solid().layer(src(o0)).out(o1); render(o1)` into `render(o0)`
- only apply when the alias buffer is not read anywhere else
- do not inline feedback memory, staging buffers, display postprocess buffers, or source-construction buffers

Applied changes: 5

## Files

- [pattern_002.v4.js](./pattern_002.v4.js)
- [pattern_003.v4.js](./pattern_003.v4.js)
- [pattern_004.v4.js](./pattern_004.v4.js)
- [pattern_006.v4.js](./pattern_006.v4.js)
- [pattern_007.v4.js](./pattern_007.v4.js)
- [pattern_008.v4.js](./pattern_008.v4.js)
- [pattern_009.v4.js](./pattern_009.v4.js)
- [pattern_010.v4.js](./pattern_010.v4.js)
- [pattern_011.v4.js](./pattern_011.v4.js)
- [pattern_012.v4.js](./pattern_012.v4.js)
- [pattern_013.v4.js](./pattern_013.v4.js)
- [pattern_014.v4.js](./pattern_014.v4.js)
- [pattern_015.v4.js](./pattern_015.v4.js)
- [pattern_016.v4.js](./pattern_016.v4.js)
- [pattern_017.v4.js](./pattern_017.v4.js)
- [pattern_018.v4.js](./pattern_018.v4.js)
- [pattern_019.v4.js](./pattern_019.v4.js)
- [pattern_020.v4.js](./pattern_020.v4.js)
- [pattern_021.v4.js](./pattern_021.v4.js)
- [pattern_022.v4.js](./pattern_022.v4.js)
- [pattern_023.v4.js](./pattern_023.v4.js)
- [pattern_025.v4.js](./pattern_025.v4.js)
- [pattern_026.v4.js](./pattern_026.v4.js)
- [pattern_027.v4.js](./pattern_027.v4.js)
- [pattern_028.v4.js](./pattern_028.v4.js)
- [pattern_029.v4.js](./pattern_029.v4.js)
- [pattern_030.v4.js](./pattern_030.v4.js)
- [pattern_031.v4.js](./pattern_031.v4.js)
- [pattern_032.v4.js](./pattern_032.v4.js)
- [pattern_033.v4.js](./pattern_033.v4.js)
- [pattern_034.v4.js](./pattern_034.v4.js)
- [pattern_035.v4.js](./pattern_035.v4.js)
- [pattern_037.v4.js](./pattern_037.v4.js)
- [pattern_038.v4.js](./pattern_038.v4.js)
- [pattern_039.v4.js](./pattern_039.v4.js)
- [pattern_040.v4.js](./pattern_040.v4.js)
- [pattern_041.v4.js](./pattern_041.v4.js)
- [pattern_042.v4.js](./pattern_042.v4.js)
- [pattern_043.v4.js](./pattern_043.v4.js)
- [pattern_044.v4.js](./pattern_044.v4.js)
- [pattern_045.v4.js](./pattern_045.v4.js)
- [pattern_046.v4.js](./pattern_046.v4.js)
- [pattern_047.v4.js](./pattern_047.v4.js)
- [pattern_048.v4.js](./pattern_048.v4.js)
- [pattern_049.v4.js](./pattern_049.v4.js)
- [pattern_050.v4.js](./pattern_050.v4.js)
- [pattern_051.v4.js](./pattern_051.v4.js)
- [pattern_052.v4.js](./pattern_052.v4.js)
- [pattern_053.v4.js](./pattern_053.v4.js)
- [pattern_054.v4.js](./pattern_054.v4.js)
- [pattern_055.v4.js](./pattern_055.v4.js)
- [pattern_056.v4.js](./pattern_056.v4.js)
- [pattern_057.v4.js](./pattern_057.v4.js)
- [pattern_058.v4.js](./pattern_058.v4.js)
- [pattern_059.v4.js](./pattern_059.v4.js)
- [pattern_060.v4.js](./pattern_060.v4.js)
- [pattern_061.v4.js](./pattern_061.v4.js)
- [pattern_062.v4.js](./pattern_062.v4.js)
- [pattern_063.v4.js](./pattern_063.v4.js)
- [pattern_064.v4.js](./pattern_064.v4.js)
- [pattern_065.v4.js](./pattern_065.v4.js)
- [pattern_066.v4.js](./pattern_066.v4.js)
- [pattern_067.v4.js](./pattern_067.v4.js)
- [pattern_068.v4.js](./pattern_068.v4.js)
- [pattern_069.v4.js](./pattern_069.v4.js)
- [pattern_070.v4.js](./pattern_070.v4.js)
- [pattern_071.v4.js](./pattern_071.v4.js)
- [pattern_072.v4.js](./pattern_072.v4.js)
- [pattern_073.v4.js](./pattern_073.v4.js)
- [pattern_074.v4.js](./pattern_074.v4.js)
- [pattern_075.v4.js](./pattern_075.v4.js)
- [pattern_076.v4.js](./pattern_076.v4.js)
- [pattern_077.v4.js](./pattern_077.v4.js)
- [pattern_078.v4.js](./pattern_078.v4.js)
- [pattern_079.v4.js](./pattern_079.v4.js)
- [pattern_080.v4.js](./pattern_080.v4.js)
- [pattern_081.v4.js](./pattern_081.v4.js)
- [pattern_082.v4.js](./pattern_082.v4.js)
- [pattern_083.v4.js](./pattern_083.v4.js)
- [pattern_084.v4.js](./pattern_084.v4.js)
- [pattern_085.v4.js](./pattern_085.v4.js)
- [pattern_086.v4.js](./pattern_086.v4.js)
- [pattern_087.v4.js](./pattern_087.v4.js)
- [pattern_088.v4.js](./pattern_088.v4.js)
- [pattern_089.v4.js](./pattern_089.v4.js)
- [pattern_090.v4.js](./pattern_090.v4.js)
- [pattern_091.v4.js](./pattern_091.v4.js)
- [pattern_092.v4.js](./pattern_092.v4.js)
- [pattern_093.v4.js](./pattern_093.v4.js)
- [pattern_094.v4.js](./pattern_094.v4.js)
