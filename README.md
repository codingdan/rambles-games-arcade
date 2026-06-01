# Rambles Games — Arcade

The public-facing arcade for games produced by the Rambles pipeline.
Live at https://codingdan.github.io/rambles-games-arcade/.

## What lives here

This repo is a deploy target. The `games/` folders and `data/games.js` are
written by `engine.arcade.promote` in the rambles-games monorepo. Don't edit
those by hand. The UI itself (`index.html`, `shared/arcade.jsx`) is hand-authored.

- `index.html` — arcade UI: dark theme, fonts + full stylesheet
- `shared/arcade.jsx` — UI source (edit this)
- `shared/arcade.js` — compiled output (don't edit; rebuild with babel — see below)
- `data/games.js` — auto-generated catalog index
- `games/<slug>/` — one folder per promoted game (cover.png, meta.json, audio.mp3?, transcript.txt, game/)

## Rebuilding the UI

After editing `shared/arcade.jsx`:

    npx babel shared/arcade.jsx --presets=@babel/preset-react -o shared/arcade.js

## One-time setup

In repo settings → Pages → Source = "GitHub Actions".
After the first push, the workflow at `.github/workflows/pages.yml` deploys
on every push to `main`.

## Local preview

    npx serve .

Then open http://localhost:3000.

## Publishing updates

After promoting from the monorepo (`uv run -m engine.arcade.promote …`), the engine
writes full run metrics into each `games/<slug>/meta.json`. The public site must not
expose cost. **Always run the scrubber before committing:**

    node scripts/strip-cost.mjs

It removes `metrics`/`changelog` from every `meta.json` and `builtIn` from
`data/games.js`. It is idempotent. Routine: `promote` → `node scripts/strip-cost.mjs`
→ commit → push.
