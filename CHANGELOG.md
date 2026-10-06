# Changelog

All notable changes to the Reveal panel plugin are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 1.0.0 (2026-10-06)

Initial release.

### Added

- Reveal panel (`sparkanswers-reveal-panel`): hold one image (PNG/JPEG/WebP/SVG/GIF) behind a
  time-based reveal that completes on a configurable reveal date.
- Reveal modes: fade, blur (default), pixelate, jigsaw, shuffle, wipe, iris, scratch, blinds,
  mosaic, brightness, color, advent, puzzle and combo (ordered stack of modes).
- Easings: linear, ease-in (default), ease-out, ease-in-out and steps (one step per day,
  recommended for jigsaw/advent).
- Progress source: browser clock or dashboard time; optional countdown and post-reveal caption.
- Deterministic seeded tile orders (seed derived from the reveal date) so every viewer and every
  refresh sees the same state.
- Image upload stored inline as a data URL in the dashboard JSON, with a 1 MB warning and a
  4 MB hard cap; animated GIFs are frozen until fully revealed unless opted in.
- Editor preview override (0-100 %) to inspect any point of the reveal.
- Docker-only toolchain: multi-stage `Dockerfile` (deps / build / dist / runtime),
  `docker-compose.yaml` tool services, `Makefile` targets, provisioned "Reveal demo"
  dashboard with blur, pixelate, jigsaw and advent panels.

### Known limitations

- The image is embedded in the dashboard JSON: anyone with dashboard read access (or API
  access) can extract it. The reveal is cosmetic, not a secrecy mechanism.
- Pixelate (canvas) and combo render only the first frame of animated GIFs.
