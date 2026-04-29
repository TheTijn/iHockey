# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (SCSS watch + server auto-reload)
npm run dev

# Production start (compile SCSS once, then serve)
npm start

# Compile SCSS once (without starting server)
npm run sass

# Watch SCSS only
npm run sass:watch
```

There are no tests, no linter, and no type-checker configured.

## Architecture

**iHockey** is a self-contained betting simulation SPA. Express serves static files only — all game logic runs entirely in the browser.

```
public/
  index.html       # Single HTML file; entire DOM structure lives here
  js/
    data.js        # Static constants: TEAMS, ODDS_TEMPLATES, SCORE_ODDS, VIDEO_TIMELINE
    game.js        # All game logic (~1,410 lines)
  css/style.css    # COMPILED OUTPUT — never edit directly
  assets/          # Logo, background, team badge PNGs, game video
scss/
  style.scss       # Source of truth for all styles (~2,500 lines)
server.js          # Express static file server — 15 lines, no API routes
```

### SCSS is the source of truth

`public/css/style.css` is auto-generated. Every `npm start` and `npm run sass` overwrites it. **All style changes must be made in `scss/style.scss`.** After editing SCSS locally, run `npm run sass` to compile before checking results.

When deploying to Hostinger (auto-deploy from `main`), the `npm start` script recompiles SCSS fresh, so SCSS must be correct in the repo.

### Game flow

1. **`DOMContentLoaded`** → `loadMatch()`: randomises two teams, generates odds from `ODDS_TEMPLATES`, renders all bet markets
2. **Betting phase**: user places bets; `handleBetToggle()` mutates `state.bets`; `updateBetslip()` recalculates payout display
3. **`playGame()`**: deducts stake, transitions to in-game view, plays the video
4. **In-game**: `onVideoTimeUpdate()` fires against `VIDEO_TIMELINE` events to advance the score display; bet cards update live via `updateIngameBetStates()`
5. **`showResult()`**: pauses video, hides in-game view, shows result overlay, updates balance, saves to `sessionStorage` history
6. **New Game / Re-Bet**: `loadMatch()` resets view state (must clear `ingameView.active`, `resultOverlay.visible`, `betslip.force-hidden`, etc.)

### State

One global `state` object holds everything: `balance`, `stake`, `bets[]`, `homeTeam/awayTeam`, `odds`, `isPlaying`, `autoplay` config. There is no reactive framework — rendering is triggered manually by calling `render*()` functions after mutations.

### Key implementation details

- **The match result is always the same** — the outcome is baked into the MP4 video via `VIDEO_TIMELINE` in `data.js`. "Odds" and "simulation" are cosmetic.
- **Bet history** is `sessionStorage` only — lost on page refresh.
- **Team colors** are applied as CSS custom properties (`--home-color`, `--away-color`, `--igm-home-color`, etc.) set by JavaScript on each `loadMatch()`.
- **CSS cache busting**: the `<link>` tag in `index.html` uses `?v=N` — bump this when deploying a CSS change to a live site that may have cached the old file.
- **Overlay visibility pattern**: most overlays use `opacity: 0; pointer-events: none` → `opacity: 1; pointer-events: auto` via an `.active` or `.visible` class, not `display: none/flex` toggling.
- **`loadMatch()` must fully reset view state** — including hiding the in-game view and result overlay — before setting up a new match.

### SCSS conventions

- Variables are defined at the top of `style.scss`: color palette (`$win-green: #22c55e`, `$accent-gold`, `$accent`, etc.), spacing, font mixins
- Mixins: `@condensed()` for uppercase condensed labels, `@card-bg` for panel backgrounds, `@overlay-base` for fixed modal overlays
- BEM-inspired class names (`.res-bet-card`, `.ingame-score-num`, `.igm-btn`)
- Desktop breakpoint: `@media (min-width: 480px)` — app is constrained to 420px max-width on desktop

### Deployment

Hosted on Hostinger with auto-deploy from the `main` branch on GitHub. The server runs `npm start` (`npm run sass && node server.js`), so `sass` must be in `dependencies` (not `devDependencies`) for the production build to work.
