# Hydra LLM Livecoding Harness

This harness turns the existing grammar-aware mutator into an actual
observe-decide-perform loop. It does not replace the deterministic agentic
performer; it adds a decision layer above it.

```text
Hydra browser/editor
-> observe current code + render status
-> build grammar decision packet
-> ask one LLM/provider for one bounded edit
-> validate the edit
-> type it through window.hydraAgentLivecoder
-> record decision/history
-> repeat
```

## Why This Shape

The current repo already has:

- prompt grammar and signal grammar
- mutation packet generation
- visible CodeMirror editing through `window.hydraAgentLivecoder`
- deterministic phrase/evolution performers

The missing layer was not another patch generator. The missing layer was a
controlled decision loop that lets a model ask "what is happening here, what
could this become, and what is one meaningful local move?"

## References Used

Hermes Agent docs describe the relevant outer architecture: a model/provider
abstraction, browser/terminal/file tools, skills as procedural memory, and a
closed learning loop. This repo does not vendor Hermes; instead it exposes a
`command` provider so Hermes or any other agent CLI can act as the decision
engine.

OpenAI's current API docs recommend the Responses API for new text generation
work and document structured JSON outputs via `text.format: { type:
"json_schema" }`. The `openai` provider follows that shape directly through
`fetch`, without adding an SDK dependency.

## Providers

### Mock

Local deterministic provider for smoke tests:

```powershell
pnpm agentic:llm-livecode -- --provider mock --input patch.js
```

### Command

Provider-agnostic integration point. The command receives the decision packet as
JSON on stdin and must return decision JSON on stdout:

```powershell
pnpm agentic:llm-livecode -- --execute --once --provider command --command "your-agent-command"
```

This is the Hermes-compatible path. A Hermes wrapper can read stdin, reason
with its own tools/memory/skills, and print one decision object.

Local command-provider smoke test:

```powershell
pnpm agentic:llm-livecode -- --provider command --command "node scripts/hydra-llm-livecode-command-mock.mjs" --input patch.js
```

Codex Exec provider:

```powershell
pnpm agentic:llm-livecode -- --execute --once --provider command --command "node scripts/hydra-llm-livecode-codex-provider.mjs"
```

Faster low-reasoning livecoding loop:

```powershell
pnpm agentic:llm-livecode -- --execute --loop --provider command --command "node scripts/hydra-llm-livecode-codex-provider.mjs --model gpt-5.5 --reasoning-effort low"
```

The Codex wrapper reads the packet from stdin, calls `codex exec` in read-only
ephemeral mode with `scripts/hydra-llm-livecode-decision-schema.json`, then
prints only the final decision JSON back to the harness. This is similar to the
Hermes bridge: Codex is the reasoning provider; the Hydra harness remains the
browser/editor hand.

### OpenAI

Structured-output provider:

```powershell
$env:OPENAI_API_KEY="..."
pnpm agentic:llm-livecode -- --execute --once --provider openai --model gpt-5.2
```

By default screenshots are not sent to the model. Use `--send-screenshot` only
when you explicitly want to transmit the current render image to the provider.

## Decision Contract

The model returns one JSON object:

```json
{
  "reading": {
    "summary": "what the patch currently is",
    "moduleMap": {
      "memory": "src(o0)",
      "field": "pre-ingress pixel-normalized UV field",
      "material": "texture entering feedback",
      "gate": "hard binary ingress mask",
      "ingress": "layer(material.mask(gate))",
      "postDrift": "post-layer drift if present",
      "conditioner": "blur/sharpen/etc if present",
      "routing": "buffer reads/writes"
    },
    "dominantBehavior": "current rendered behavior hypothesis",
    "concerns": ["what might be fragile"]
  },
  "move": {
    "action": "replace",
    "target": "field",
    "intent": "one meaningful livecoding move",
    "math": "why the edit makes signal-flow sense",
    "expectedEffect": "what should change visually",
    "risk": "what to review after rendering",
    "confidence": 0.7,
    "edit": {
      "type": "replace",
      "find": ".color(1,0),2/height",
      "replacement": ".color(1/width,0),2*width/height",
      "text": "",
      "at": -1,
      "from": -1,
      "to": -1,
      "run": true,
      "ms": 0
    }
  },
  "review": {
    "questions": ["short visual critique prompts"],
    "keepIf": "condition for accepting",
    "retreatIf": "condition for backing off"
  }
}
```

## Thinking Protocol

Each turn is intentionally narrow:

```text
1. Read what is already there.
2. Name the active modules and responsibilities.
3. Identify the dominant behavior and the fragile part.
4. Choose one target module.
5. Explain the signal/math reason before syntax.
6. Return one bounded edit.
7. Let the browser/runtime decide whether it executes.
8. Record enough history for the next turn to continue or retreat.
```

This is the part that makes the harness different from a generator. The LLM is
asked to decide the next livecoding move, not to maximize novelty or write a
complete patch. The process should be able to say "no move", "run again",
"retreat", or "wait" when the current state needs time or review.

## Safety Boundary

The harness validates generated code before it reaches Hydra:

- no network/browser APIs such as `fetch`, `WebSocket`, `document`, `window`
- no dynamic execution such as `eval`, `Function`, `import`, `require`
- no `()=>time` motion
- no external media initializers by default
- whole-buffer `set` is rejected unless `--allow-set` is provided
- code must parse as JavaScript

This is not a full sandbox. It is a guardrail for trusted local creative
workflows and curated agent demos.

## Running It Live

One safe visible turn from the current editor:

```powershell
pnpm agentic:llm-livecode -- --execute --once --provider mock --launch-chrome --include-screenshot
```

Long-running mock loop:

```powershell
pnpm agentic:llm-livecode -- --execute --loop --provider mock --launch-chrome --include-screenshot --stop-file .tmp\stop-hydra-llm-livecode
```

Stop:

```powershell
New-Item -ItemType File .tmp\stop-hydra-llm-livecode
```

Outputs are written under `.tmp/hydra-llm-livecode` by default:

- `turn-###-packet.json`
- `turn-###-decision.json`
- `session.json`
- optional screenshots
