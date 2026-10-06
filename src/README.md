# Reveal - Timed Image Reveals for Grafana

Progressively reveal an **image or GIF** as a date approaches, or on a repeating
schedule. Put a teaser on a dashboard for a launch, a birthday, an advent calendar,
or a surprise that pops up in different places over the day.

## Screenshots

![Four reveal modes on a dashboard](https://raw.githubusercontent.com/SparkAnswers/reveal/main/imgs/reveal-dashboard.png)
![Panel editor with live preview](https://raw.githubusercontent.com/SparkAnswers/reveal/main/imgs/panel-editor.png)
![A motorcycle blurring into view on a scheduled reveal](https://raw.githubusercontent.com/SparkAnswers/reveal/main/imgs/bike-reveal.gif)
![A GIF ghost popping up in a random corner and waving once revealed](https://raw.githubusercontent.com/SparkAnswers/reveal/main/imgs/ghost-demo.gif)
![Motorcycle demo with a scheduled bike reveal](https://raw.githubusercontent.com/SparkAnswers/reveal/main/imgs/motorcycle-dashboard.png)
![Memory demo with a scheduled memory reveal](https://raw.githubusercontent.com/SparkAnswers/reveal/main/imgs/memory-dashboard.png)

## Features

- **16 reveal modes** - blur, pixelate, fade, brightness, colour, wipe, iris, blinds,
  jigsaw, puzzle pieces, shuffle, mosaic, scratch-off, advent doors, combo, and instant.
- **Built for suspense** - ease-in by default so the image stays hidden until late; step
  easing by count or by interval (`1h`, `1d`) for once-a-day reveals.
- **GIF aware** - animated GIFs stay frozen on their first frame until fully revealed so
  frames never spoil the surprise; modes keep the GIF animating at 100%.
- **Repeat schedules** - cycle every `2m`, `1h` or `1d`, choose how long the reveal takes
  and how long it stays shown, align to the clock, offset panels so two alternate, and set
  a seeded per-cycle chance for random pop-ups that look the same to every viewer.
- **Expire date, caption, background colour, countdown footer** - and an editor-only
  preview slider to scrub the reveal without affecting viewers.
- **No data source and no backend** - the image lives in the dashboard JSON; large uploads
  are downscaled automatically and capped at 4 MB.

## How it works

The panel computes progress from the start date to the reveal date on its own timer
(every second in the last hour, otherwise every 30 seconds), applies the easing curve,
and renders the image through the selected mode using CSS filters, clip paths, tiles or
a canvas. Tile orders and random cycles are seeded from the reveal date, so every viewer
and every refresh sees the same state.

```
dashboard JSON (image + dates + mode) -> timer -> progress -> easing -> reveal mode -> <img>
```

## Installation

Reveal is unsigned until it is listed in the Grafana catalog, so allow it explicitly:
unzip the release into `<plugins dir>/sparkanswers-reveal-panel`, set
`GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=sparkanswers-reveal-panel` (or the
`allow_loading_unsigned_plugins` setting in `grafana.ini`), and restart Grafana.

## Requirements

- Grafana **>= 12.3.0**
- Nothing else: no data source, no backend, no external services

## Getting started

1. Add a **Reveal** panel to a dashboard.
2. Under **Reveal > Image**, drop a PNG, JPG, WebP or GIF, or paste an image URL.
3. Set the **Reveal date**. The **Start date** is stamped to "now" automatically; edit it
   to change the window.
4. Pick a **Reveal mode** and **Easing curve**, then scrub **Preview > Preview at** to see
   the whole reveal in the editor.
5. Optional: **Expire date**, **Caption**, **Background**, or switch on **Schedule > Repeat**
   for cycling reveals (`Every 2m`, `Show for 1m`, `Offset 1m` on a second panel makes the
   two alternate).

## Good to know

- The reveal is cosmetic, not a security boundary: the full image is in the dashboard
  JSON, so anyone with dashboard read access can extract it early.
- Removing the image and saving the dashboard drops it from the current version; Grafana's
  dashboard version history keeps older copies until trimmed.

## Feedback and contributions

Issues and pull requests are welcome at https://github.com/SparkAnswers/reveal.
