# Hydra Curated Corpus Ported Candidates

This directory contains first-pass semantic port candidates for the 90 curated Hydra patterns.

These are not accepted visual examples. They are reviewable ports generated from the current grammar so each old patch can be tested, corrected, or rejected manually.

Generated files live in:

```text
docs\hydra-curated-corpus-ported-candidates
```

## Bucket Counts

- legacy feedback / conceptual port: 13
- memory-drift / non-ingress feedback: 7
- portable core feedback: 33
- already close to current core: 6
- staging / source construction: 24
- extension / staging: 7

## Port Moves

- P: feedback order review
- N: pixel-step normalization
- AX?: x/y axis responsibility review
- S: specialized modulation translation or review
- G?: gate hardness / role review
- L/X: global blend/diff/sub pressure review
- C: callback/time control review
- B: buffer role clarification
- T: metric tiling preservation
- R: raster oscillator preservation

## Ledger

| Pattern | Bucket | Port moves |
| --- | --- | --- |
| [pattern_002](./pattern_002.port.js) | legacy feedback / conceptual port | P N AX? S G? C |
| [pattern_003](./pattern_003.port.js) | memory-drift / non-ingress feedback | N AX? G? L/X |
| [pattern_004](./pattern_004.port.js) | portable core feedback | P N AX? S G? L/X |
| [pattern_006](./pattern_006.port.js) | portable core feedback | P N AX? S G? T |
| [pattern_007](./pattern_007.port.js) | portable core feedback | P S |
| [pattern_008](./pattern_008.port.js) | portable core feedback | P S G? |
| [pattern_009](./pattern_009.port.js) | portable core feedback | P S G? T |
| [pattern_010](./pattern_010.port.js) | already close to current core | G? T |
| [pattern_011](./pattern_011.port.js) | already close to current core | AX? S G? T |
| [pattern_012](./pattern_012.port.js) | legacy feedback / conceptual port | P S L/X |
| [pattern_013](./pattern_013.port.js) | portable core feedback | P AX? S G? L/X T |
| [pattern_014](./pattern_014.port.js) | legacy feedback / conceptual port | P S G? L/X T |
| [pattern_015](./pattern_015.port.js) | portable core feedback | P AX? S G? L/X T |
| [pattern_016](./pattern_016.port.js) | staging / source construction | B S G? C |
| [pattern_017](./pattern_017.port.js) | staging / source construction | B N AX? S |
| [pattern_018](./pattern_018.port.js) | legacy feedback / conceptual port | P G? L/X T |
| [pattern_019](./pattern_019.port.js) | legacy feedback / conceptual port | P G? L/X T |
| [pattern_020](./pattern_020.port.js) | extension / staging | B G? T |
| [pattern_021](./pattern_021.port.js) | portable core feedback | P S L/X T R |
| [pattern_022](./pattern_022.port.js) | staging / source construction | B AX? T |
| [pattern_023](./pattern_023.port.js) | portable core feedback | S C T |
| [pattern_025](./pattern_025.port.js) | portable core feedback | P AX? C |
| [pattern_026](./pattern_026.port.js) | portable core feedback | P S L/X C T |
| [pattern_027](./pattern_027.port.js) | portable core feedback | AX? S C |
| [pattern_028](./pattern_028.port.js) | staging / source construction | B AX? T |
| [pattern_029](./pattern_029.port.js) | legacy feedback / conceptual port | P T |
| [pattern_030](./pattern_030.port.js) | staging / source construction | B AX? S G? C |
| [pattern_031](./pattern_031.port.js) | staging / source construction | B T R |
| [pattern_032](./pattern_032.port.js) | portable core feedback | P G? L/X T R |
| [pattern_033](./pattern_033.port.js) | portable core feedback | P C |
| [pattern_034](./pattern_034.port.js) | staging / source construction | B C |
| [pattern_035](./pattern_035.port.js) | portable core feedback | L/X T R |
| [pattern_037](./pattern_037.port.js) | memory-drift / non-ingress feedback | G? L/X |
| [pattern_038](./pattern_038.port.js) | memory-drift / non-ingress feedback | S G? L/X C |
| [pattern_039](./pattern_039.port.js) | staging / source construction | B AX? C |
| [pattern_040](./pattern_040.port.js) | extension / staging | B AX? T R |
| [pattern_041](./pattern_041.port.js) | portable core feedback | P AX? S G? T R |
| [pattern_042](./pattern_042.port.js) | portable core feedback | P AX? S L/X T |
| [pattern_043](./pattern_043.port.js) | staging / source construction | B AX? T |
| [pattern_044](./pattern_044.port.js) | portable core feedback | L/X T R |
| [pattern_045](./pattern_045.port.js) | staging / source construction | B AX? S G? C |
| [pattern_046](./pattern_046.port.js) | staging / source construction | B S |
| [pattern_047](./pattern_047.port.js) | portable core feedback | L/X T R |
| [pattern_048](./pattern_048.port.js) | staging / source construction | B AX? S G? |
| [pattern_049](./pattern_049.port.js) | memory-drift / non-ingress feedback | S L/X |
| [pattern_050](./pattern_050.port.js) | portable core feedback | P AX? L/X T |
| [pattern_051](./pattern_051.port.js) | already close to current core | G? T R |
| [pattern_052](./pattern_052.port.js) | already close to current core | G? T R |
| [pattern_053](./pattern_053.port.js) | staging / source construction | B S G? |
| [pattern_054](./pattern_054.port.js) | extension / staging | B N AX? |
| [pattern_055](./pattern_055.port.js) | legacy feedback / conceptual port | P AX? S L/X C T |
| [pattern_056](./pattern_056.port.js) | memory-drift / non-ingress feedback | AX? L/X |
| [pattern_057](./pattern_057.port.js) | extension / staging | B |
| [pattern_058](./pattern_058.port.js) | legacy feedback / conceptual port | P S |
| [pattern_059](./pattern_059.port.js) | staging / source construction | B T R |
| [pattern_060](./pattern_060.port.js) | staging / source construction | B T R |
| [pattern_061](./pattern_061.port.js) | portable core feedback | P L/X T R |
| [pattern_062](./pattern_062.port.js) | staging / source construction | B AX? |
| [pattern_063](./pattern_063.port.js) | memory-drift / non-ingress feedback | S L/X |
| [pattern_064](./pattern_064.port.js) | portable core feedback | P S L/X C |
| [pattern_065](./pattern_065.port.js) | portable core feedback | P S L/X C |
| [pattern_066](./pattern_066.port.js) | staging / source construction | B AX? C |
| [pattern_067](./pattern_067.port.js) | extension / staging | B N AX? R |
| [pattern_068](./pattern_068.port.js) | staging / source construction | B S |
| [pattern_069](./pattern_069.port.js) | staging / source construction | B AX? S C T |
| [pattern_070](./pattern_070.port.js) | legacy feedback / conceptual port | P S |
| [pattern_071](./pattern_071.port.js) | portable core feedback | P C |
| [pattern_072](./pattern_072.port.js) | staging / source construction | B N AX? C T |
| [pattern_073](./pattern_073.port.js) | already close to current core | AX? T R |
| [pattern_074](./pattern_074.port.js) | portable core feedback | P AX? S L/X T |
| [pattern_075](./pattern_075.port.js) | already close to current core | S T |
| [pattern_076](./pattern_076.port.js) | portable core feedback | AX? S C T |
| [pattern_077](./pattern_077.port.js) | portable core feedback | AX? S C T |
| [pattern_078](./pattern_078.port.js) | portable core feedback | AX? S C T |
| [pattern_079](./pattern_079.port.js) | portable core feedback | AX? S C |
| [pattern_080](./pattern_080.port.js) | portable core feedback | AX? S C T |
| [pattern_081](./pattern_081.port.js) | portable core feedback | AX? S C T |
| [pattern_082](./pattern_082.port.js) | staging / source construction | B AX? C |
| [pattern_083](./pattern_083.port.js) | portable core feedback | P AX? S T |
| [pattern_084](./pattern_084.port.js) | staging / source construction | B S C T |
| [pattern_085](./pattern_085.port.js) | extension / staging | B AX? S |
| [pattern_086](./pattern_086.port.js) | extension / staging | B N AX? S |
| [pattern_087](./pattern_087.port.js) | portable core feedback | AX? S C T |
| [pattern_088](./pattern_088.port.js) | staging / source construction | B G? T |
| [pattern_089](./pattern_089.port.js) | legacy feedback / conceptual port | P G? L/X C T |
| [pattern_090](./pattern_090.port.js) | legacy feedback / conceptual port | P G? L/X T |
| [pattern_091](./pattern_091.port.js) | legacy feedback / conceptual port | P AX? S G? L/X |
| [pattern_092](./pattern_092.port.js) | legacy feedback / conceptual port | P AX? G? L/X T |
| [pattern_093](./pattern_093.port.js) | memory-drift / non-ingress feedback | AX? G? L/X |
| [pattern_094](./pattern_094.port.js) | staging / source construction | B S G? C |
