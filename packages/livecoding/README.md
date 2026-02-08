# hydra-synth-livecoding

Optional livecoding plugin for Hydra v2.

Features:

- explicit attach/run/dispose lifecycle
- opt-in global injection for selected bindings
- helper-managed listener and dispose callback cleanup

Core runtime behavior remains side-effect free unless this plugin is attached.
