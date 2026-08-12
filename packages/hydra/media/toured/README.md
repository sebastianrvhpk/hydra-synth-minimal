# Toured patch video sources

These are web-distribution copies of the three source videos supplied for the
Hypereikon toured Hydra patch. They preserve each source's frame rate, aspect
ratio, and duration, while removing unused audio and moving MP4 metadata to the
front for progressive browser playback.

Encoding: H.264 at 960 px width, `yuv420p`, CRF 31, `faststart`, no audio.

The Hydra performance playlist attaches exactly one file to `s0`. Selecting a
replacement synchronously pauses and detaches the previous video element before
the next URL is initialized.
