# Hydra Agentic Livecoding API

The Hydra livecoding app exposes a browser-side API for agent-driven editing:

```js
window.hydraAgentLivecoder
window.hydraEditor.agent
```

This API is meant for demos where an agent visibly edits the CodeMirror score:
typing characters, deleting words, replacing parameters, selecting ranges, and
running stable code states. It is different from swapping an entire patch in one
hidden call.

## Why This Exists

The grammar-aware mutator should feel like livecoding:

```text
think -> select text -> delete / type / replace -> run -> watch feedback -> continue
```

Whole-buffer replacement is useful for setup, but it does not show the agent's
creative process. For an agentic demo, the visible editor should move.

## API

### Read Current Code

```js
hydraAgentLivecoder.getCode()
```

### Set Code

Fast setup:

```js
await hydraAgentLivecoder.setCode(code, {
  run: true,
  persist: false
})
```

Animated full replacement:

```js
await hydraAgentLivecoder.setCode(code, {
  animate: true,
  delayMs: 10,
  chunkSize: 2,
  run: true
})
```

### Insert Text

```js
await hydraAgentLivecoder.insert(
  '.modulate(ns().color(1/width,0),2)',
  120,
  {
    delayMs: 18,
    chunkSize: 1,
    run: true
  }
)
```

### Replace Text

```js
await hydraAgentLivecoder.replace(
  '.thresh(.75,0)',
  '.thresh(.675,0)',
  {
    delayMs: 32,
    run: true
  }
)
```

The replacement animates by selecting the found text, deleting it
character-by-character, then typing the replacement.

### Delete Text

```js
await hydraAgentLivecoder.delete('.rotate(.375)\n', {
  delayMs: 24,
  run: true
})
```

### Select Text

```js
await hydraAgentLivecoder.select('.color(1,0),2/height')
```

### Run Current Buffer

```js
await hydraAgentLivecoder.run({ label: 'normalized post drift' })
```

### Wait

```js
await hydraAgentLivecoder.wait(3000)
```

### Play A Sequence

```js
await hydraAgentLivecoder.play([
  {
    label: 'normalize post drift',
    type: 'replace',
    find: '.color(1,0),2/height',
    replacement: '.color(1/width,0),2*width/height',
    delayMs: 28,
    run: true,
    pauseAfterMs: 3000
  },
  {
    label: 'nudge material threshold',
    type: 'replace',
    find: '.thresh(.75,0)',
    replacement: '.thresh(.675,0)',
    delayMs: 42,
    run: true,
    pauseAfterMs: 3000
  },
  {
    label: 'delete rotation',
    type: 'delete',
    find: '.rotate(.375)\n',
    delayMs: 32,
    run: true
  }
])
```

### Stop A Running Sequence

```js
hydraAgentLivecoder.stop()
```

This cancels the current sequence before the next typed chunk or step.

## Step Types

Supported `play(...)` step types:

```text
set
insert
replace
delete
select
run
wait
sleep
```

Common fields:

```text
label        human-readable reason
delayMs      delay between typed/deleted chunks
chunkSize    characters per inserted chunk
run          run the buffer after the edit
pauseAfterMs wait after a step completes
```

Target fields:

```text
find         exact text to locate
range        { from, to }
from/to      numeric positions
at           insert position
```

## Agent Guidelines

An agent should:

- preserve the authored patch as the source state
- prefer exact local replacements over whole-patch swaps
- type or delete visibly when demonstrating agency
- run only at stable syntax points unless intentionally showing failed edits
- use labels that describe the signal-flow intent
- preserve authored energy calibration by default
- mutate one responsibility at a time: field, gate, material, memory, or post drift

For example:

```js
await hydraAgentLivecoder.play([
  {
    label: 'energy-conserving field split',
    type: 'replace',
    find: originalFieldBlock,
    replacement: splitFieldBlock,
    delayMs: 8,
    chunkSize: 3,
    run: true
  }
])
```

## Hermes / External Agent Integration

For an external browser-controlling agent, the integration point is the page
JavaScript environment:

```js
await window.hydraAgentLivecoder.play(sequence)
```

The agent does not need private app internals. It only needs:

- a local or deployed Hydra page
- browser automation capable of executing page JavaScript
- a sequence of text-edit operations generated from the grammar-aware mutator

This keeps the demo honest: the agent edits the same CodeMirror surface the user
sees, and Hydra runs the same livecoding evaluator.

## Harness Modes

The local harness has two loop modes:

```powershell
node scripts/hydra-agentic-livecode-harness.mjs --execute --loop
```

Phrase loop mode is a carousel: it resets to the authored patch, applies a
coherent mutation phrase, waits, then tries another phrase.

```powershell
node scripts/hydra-agentic-livecode-harness.mjs --execute --loop --evolve
```

Evolution mode is cumulative: it loads the authored patch once, then computes
typed range edits from the current buffer to the next grammar-aware code state.
It changes one responsibility at a time, lets the feedback breathe, and later
backs out through nearby states instead of hard-resetting every cycle.

For an actual LLM decision loop, use:

```powershell
node scripts/hydra-llm-livecode-harness.mjs --execute --once --provider mock
```

or the package script:

```powershell
pnpm agentic:llm-livecode -- --execute --once --provider command --command "your-agent-command"
```

That harness observes the current editor state, builds a grammar packet, asks a
provider for exactly one bounded edit, validates it, then performs it through
this same browser API.

## Safety Boundary

The app still evaluates Hydra livecoding code locally. Do not feed arbitrary
remote text into `hydraAgentLivecoder.play(...)` or `livecoding.run(...)` without
trusting the source. The API is intended for local, trusted agent demos and
curated patch mutation workflows.
