# Palmera Cover Studio

An offline web app that turns a photo and a caption into cover art in
the style of GTA 6's posters: an angled multi-panel layout, a Vice City
sunset or neon colour grade, and bold condensed masthead lettering,
exported as a PNG in the common post sizes — 1080 × 1080, 1080 × 1350
and 1920 × 1080.

Built for the gta6-cover-art-01 bounty on make.fun.

## What it does

- **Three angled layouts** — Showcase, Mosaic and Hero Trio. The panel
  dividers slant, so a grid of photos reads as a game cover rather than
  a contact sheet.
- **Any photo, in any panel.** Add your own photos (they are read on
  your machine and never uploaded), put one photo across several panels
  or a different one in each, and frame each panel by dragging on the
  cover itself or with the focus and zoom sliders.
- **Two illustrated scenes of its own** — a retro sunset with palm
  silhouettes over the sea, and a neon skyline across the water — drawn
  by the app, so a panel with no photo still looks like key art.
- **Five colour grades** per panel (Sunset, Neon, Gold, Noir, Clean),
  each a filter pass plus a colour wash and a printed-poster gloss.
- **The full masthead**: a letterspaced kicker, the title set in a
  shipped condensed display face with a gradient fill, dark outline and
  gradient underline bar, plus a tagline, an age badge and a barcode
  with an issue mark — the barcode is generated from the title, so
  every cover's mark is its own.
- **Deterministic**: all randomness is seeded, so the same state always
  renders the same cover, byte for byte.

Four sample photographs are included (made with an image model for
this app, free to use), so the studio opens on a finished cover and the
first export is one click away. The display type is Noto Sans
ExtraCondensed Black and Noto Sans Condensed Bold, shipped under
`app/fonts/` under the SIL Open Font License (see `app/fonts/OFL.txt`).

## Run it

```
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Or simply open
`app/index.html` — the app is plain static files with no build step and
no network requests.

## Hand it in

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and
writes `dossier.json` there with the vendored make.fun library
(`vendor/makefun-app.ts`, the kit's copy, unchanged).

The screenshots in `screenshots/` are the app's own compositions,
redrawn at export size by `tools/make_screenshots.py` (Pillow), which
shares one design spec with `app/src/render.js` — same polygons,
gradient stops and type sizes.
