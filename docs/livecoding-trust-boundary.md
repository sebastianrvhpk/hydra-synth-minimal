# Livecoding Trust Boundary

Hydra livecoding evaluates local patch code inside the page. That is the feature: old Hydra-style patches depend on assignments, callbacks, globals, and chained expressions that normal JSON/config parsing cannot represent.

Because of that, the livecoding app supplies a trusted-code runner. The `hydra-synth` package does not compile executable strings; it only receives an explicit `runCode(code, scope)` callback from the embedding app.

## Policy

- Run livecoding code only from the local user, a trusted sketch file, or an explicitly trusted collaboration/session channel.
- Do not feed arbitrary remote gallery content, chat messages, URL parameters, or unreviewed network data into `livecoding.run(...)`.
- Keep the engine package independent from editor/gallery/network trust decisions.
- Keep executable string compilation in the embedding app, close to the UI and provenance decision.
- Use a custom `runCode` function for sandboxing, policy checks, instrumentation, or a restricted language.

## API Contract

`hydra-synth/livecoding` requires an explicit code runner:

```ts
import { createLivecodingPlugin } from 'hydra-synth/livecoding'

const plugin = createLivecodingPlugin({
  runCode: (code, scope) => {
    const compileTrustedCode = globalThis.Function
    return compileTrustedCode('scope', `with (scope) {\n${code}\n}`)(scope)
  }
})
```

Apps that want sandboxing or policy checks can replace that with a restricted runner:

```ts
const plugin = createLivecodingPlugin({
  runCode: (code, scope) => {
    // Parse, validate, sandbox, or delegate to another trusted runner here.
    return trustedRunner(code, scope)
  }
})
```

The `hydra` livecoding app owns this runner because it is a local instrument surface. That code should stay close to the app boundary rather than hidden inside `hydra-synth`.

URL sketch snapshots are local editor state, not an execution grant. The app may load `#code=...` into CodeMirror, but it should not auto-run that code on page load. Execution still happens only through the local run controls, shortcuts, or explicit helper calls.

## App Responsibilities

Before adding sharing, gallery loading, network collaboration, or URL-driven patches, the `hydra` app should add:

- provenance metadata for loaded sketches,
- a visible trust decision before first execution of remote code,
- a blocked-by-default path for untrusted remote code,
- tests that remote strings do not reach `livecoding.run(...)` without opt-in.
