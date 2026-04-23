# Rambles Games — Arcade

The public-facing arcade for games produced by the Rambles pipeline.
Live at https://codingdan.github.io/rambles-games-arcade/.

## What lives here

This repo is a deploy target. Every file under here is written by
`engine.arcade.promote` in the rambles-games monorepo. Don't edit by hand
unless you're tweaking the UI itself (`shared/arcade.jsx`, `shared/crt.css`,
`index.html`).

- `index.html` — arcade UI (amber CRT theme)
- `shared/arcade.jsx` — UI source (edit this)
- `shared/arcade.js` — compiled output (don't edit; promote rebuilds it)
- `shared/cover.js` — procedural cover SVG factory
- `shared/crt.css` — CRT effects (scanlines, glow, flicker)
- `data/games.js` — auto-generated catalog index
- `games/<slug>/` — one folder per promoted game

## One-time setup

In repo settings → Pages → Source = "GitHub Actions".
After the first push, the workflow at `.github/workflows/pages.yml` deploys
on every push to `main`.

## Local preview

    npx serve .

Then open http://localhost:3000.
