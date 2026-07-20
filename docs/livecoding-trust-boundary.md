# Livecoding trust boundary

Hydra patches are executable JavaScript. The synth package does not compile
strings and does not attach plugins to the runtime. The browser app explicitly
provides the trusted runner to a small scoped session:

```ts
import { createLivecodingSession } from 'hydra-synth/livecoding'

const session = createLivecodingSession({
  scope: window,
  helpers: { saveFrame, randomize },
  runCode: (code, scope) => {
    const compileTrustedCode = globalThis.Function
    return compileTrustedCode('scope', `with (scope) {\n${code}\n}`)(scope)
  }
})
```

The session invokes the supplied runner, installs the explicitly supplied
helpers, and restores overwritten helper values on disposal. Hydra bindings are
owned by the app's live global scope.

Only run code written locally or received from a trusted source. Remote gallery
content, messages, collaboration data, and URL parameters are not execution
permission. Keep provenance and trust decisions in the embedding app, beside
the UI that initiates execution.
