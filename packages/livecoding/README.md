# hydra-synth-livecoding

Compatibility wrapper for the livecoding helpers now exported by `hydra-synth`.

Prefer:

```ts
import { attachLivecoding, createLivecodingPlugin } from 'hydra-synth/livecoding'
```

or:

```ts
import { attachLivecoding, createLivecodingPlugin } from 'hydra-synth'
```

## Features

- explicit `attach -> run -> dispose` lifecycle
- opt-in global binding injection (`allowedBindings`)
- optional helper exposure (`hydraOnDispose`, `hydraListen`, plus custom helpers)
- reversible global mutation (restores previous global values on dispose)
- host/global sync helpers (`syncFromEngine`, `syncFromGlobal`)

## API

- `attachLivecoding(engine, options)` for manual session control
- `createLivecodingPlugin(options)` for runtime plugin attachment via `runtime.attachPlugin(...)`

`AttachLivecodingOptions`:

- `targetGlobal`: target object for injected bindings (defaults to `globalThis`)
- `allowedBindings`: explicit list of host bindings to inject
- `exposeHelpers`: `true` or a helper object to expose convenience helpers
- `evaluate`: custom evaluator override for code execution

This package remains available for backward compatibility. Core runtime behavior remains side-effect free unless livecoding is explicitly attached.
