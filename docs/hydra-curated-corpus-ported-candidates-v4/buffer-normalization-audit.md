# Hydra V4 Buffer Normalization Audit

This pass only collapses display-only aliases. It intentionally does not inline buffers that may carry feedback memory, temporal staging, postprocessed display state, or source construction.

Applied changes: 5
Skipped candidates: 0

## Applied

- pattern_002.v3.js: display-alias:solid-layer-buffer o0 -> o1; alias buffer only appears in out(alias) and render(alias); render source directly
- pattern_006.v3.js: display-alias:solid-layer-buffer o0 -> o1; alias buffer only appears in out(alias) and render(alias); render source directly
- pattern_008.v3.js: display-alias:solid-layer-src o0 -> o1; alias buffer only appears in out(alias) and render(alias); render source directly
- pattern_009.v3.js: display-alias:solid-layer-src o0 -> o1; alias buffer only appears in out(alias) and render(alias); render source directly
- pattern_075.v3.js: display-alias:src-copy o0 -> o1; alias buffer only appears in out(alias) and render(alias); render source directly

## Skipped

- none

## Math Policy

Safe:

```js
solid().layer(src(o0)).out(o1)
render(o1)
```

when `o1` is not read anywhere else. This is only a display alias, so it becomes:

```js
render(o0)
```

Not collapsed:

- buffers that are read by `src(oN)` in another chain
- buffers that receive their own feedback loop
- buffers that apply display-only transforms before render
- buffers that stage material, masks, fields, or artifact branches

