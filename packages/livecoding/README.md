# hydra-synth-livecoding

Optional livecoding plugin for Hydra v2.

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

Core runtime behavior remains side-effect free unless this package is explicitly attached.
