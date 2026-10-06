# Reveal

Progressively reveals an image or GIF as a date approaches: a teaser panel for product launches, birthdays, advent calendars and surprises.

Upload an image (or paste a URL), pick a reveal date and a mode. The panel shows a little more as the moment nears and reaches 100% at the reveal date, with an optional countdown footer and caption. Animated GIFs stay frozen on their first frame until fully revealed so individual frames don't spoil the surprise.

![Four reveal modes on a dashboard](https://raw.githubusercontent.com/SparkAnswers/Reveal/main/src/img/screenshot-dashboard.png)

## Reveal modes

| Mode                    | What viewers see                                            |
| ----------------------- | ----------------------------------------------------------- |
| Blur (default)          | Heavy blur that sharpens over time                          |
| Pixelate                | Large blocks that gain resolution                           |
| Fade, Brightness, Color | Opacity, darkness or saturation ramps                       |
| Wipe, Iris, Blinds      | Clip-path reveals from an edge, the centre or in strips     |
| Jigsaw, Puzzle, Shuffle | Tiles appear, drop in as jigsaw pieces, or slide into place |
| Mosaic, Scratch-off     | Random cells dissolve in, or a foil cover is scratched away |
| Advent                  | Numbered doors, one opening per day                         |
| Combo                   | Stack of filter modes applied together                      |
| Instant                 | Hidden until the reveal moment, then shown in full          |

Every random order is seeded from the reveal date, so all viewers see the same state.

## Getting started

1. Add a **Reveal** panel. No data source is required.
2. Under **Reveal > Image**, drop a PNG, JPG, WebP or GIF. It is stored in the dashboard JSON; large images are downscaled automatically and files over 4 MB are rejected.
3. Set the **Reveal date**. The **Start date** is stamped to "now" when you pick a reveal date, so the reveal runs from that moment. Edit it to change the window.
4. Choose a **Reveal mode** and **Easing curve**. Ease in keeps the surprise hidden longest; **Steps** reveals in jumps, either a count or a **Step interval** such as `1h` or `1d`.
5. Optional: an **Expire date** hides the image again afterwards, a **Caption** appears at 100%, and **Background** sets the colour behind transparent images.
6. Use **Preview > Preview at** to scrub through the reveal in the editor. It never affects viewers.

The panel updates on its own timer: every second during the last hour, otherwise every 30 seconds.

## Repeating schedules

Under **Schedule**, switch on **Repeat** to cycle the reveal instead of using a single reveal date. Set **Every** (cycle length), **Reveal over** (how long the reveal takes, empty for instant) and **Show for** (how long it stays visible). The panel is completely blank between cycles.

- **Alternate two panels:** both "Every 2m, Show for 1m"; give one **Offset** `1m`. One shows on even minutes, the other on odd minutes, with no linking needed.
- **Random pop-ups:** set **Chance per cycle** below 100. Which cycles show is seeded, so every viewer sees the same pattern.
- Cycles align to the wall clock by default, so panels on different dashboards stay in step. Choose **Start date** alignment to count from the panel's start date instead.

## Good to know

- The reveal is cosmetic, not a security boundary: the full image is part of the dashboard JSON, so anyone with dashboard read access can extract it early.
- Time-based progress uses the viewer's browser clock by default. Switch **Time source** to dashboard time to scrub with the time picker.
- Removing the image from the panel and saving the dashboard removes it from the current version; Grafana's dashboard version history keeps older copies until it is trimmed.

## Feedback and contributions

Issues and pull requests are welcome at https://github.com/SparkAnswers/Reveal.
