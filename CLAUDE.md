# CLAUDE.md — Wordbound: Crescendo

Working notes for anyone (human or zero-memory routine run) touching this repo.
Read GOALS.md first: its header carries the standing rules (verification gates,
public-domain music vetting, synthesized-audio-only, LIVE DEPLOY, STATE
HYGIENE); its body is the open ticket queue. This file is the repo map — keep
it truthful when you add or move structure.

## What this is

"Words vs music" browser game: real-time duel-gauge combat where the playing
piece's actual dynamics push the gauge against the player's word scores.
React + Vite UI over a framework-agnostic JS engine, forked from the sibling
Wordbound game (descent-of-essence).
Live build: https://gidntsquia.github.io/wordbound-crescendo/

## Commands

- `npm run dev` / `build` / `preview` — Vite; build outputs to `dist/app`
  (relative `base: './'`).
- `npm test` — jsdom dom-check of wordbound.html. MANDATORY gate for game
  logic, wordbound.html, or rendering/event CSS changes.
- `npm run test:react` — Vitest + RTL over src/components. MANDATORY for any
  src/components change; drives the real engine modules (window.Wordbound.*),
  see `src/components/__tests__/gameHelpers.js` for the pattern.
- `npm run test:mobile` — real-browser 375/414px layout check. MANDATORY for
  CSS layout changes.
- Targeted Playwright verifies — run the one matching what you touched:
  `test:music-engine`, `test:audio`, `test:react-build`, `test:react-qa`,
  `test:react-duel-loss`, `test:regular-duel-smoke`, `test:drag-interrupt`,
  `test:qa`, `test:itch-build`.
- `npm run test:duel-balance` — headless duel-balance simulation.
- Deploy (LIVE DEPLOY rule, GOALS.md header): `npm run build`, then publish the
  CONTENTS of `dist/app/` plus an empty `.nojekyll` as the root of the
  `gh-pages` branch (orphan/replace commit, `git push -f origin gh-pages`).

## Map

- `index.html` + `src/` — the React app (Vite entry). `src/main.jsx` loads the
  engine modules onto `window.Wordbound.*` in a fixed order, then mounts
  `src/App.jsx`. Screens/overlays in `src/components/`: MainMenu,
  CharacterSelect, RunScreen, RunSidePanels, CombatScreen, BossEntranceOverlay,
  RewardScreens, HowToPlayOverlay, VolumeGauge. Component tests:
  `src/components/__tests__/` (Vitest/RTL).
- `js/core/` — `namespace.js` (window.Wordbound namespace), `rng.js` (seeded
  RNG).
- `js/wordbound/` — framework-agnostic engine, plain JS, no React imports:
  `duel.js` / `duelCombat.js` / `combat.js` (duel-gauge combat), `music.js` +
  `pieces/` (WebAudio sequencer + sequenced note data — synthesized only,
  never recordings), `tiles.js` / `wordlist.js` / `lexicon.js` (word system),
  `floor.js` / `game.js` (run structure), `monsters.js` / `characters.js` /
  `items.js` / `intents.js` / `traits.js`, `stolenLetters.js`
  (meta-progression), `bossEntrances.js`, `shakespeareGuide.js`,
  `shopkeepers.js`, `achievements.js`, `events.js`.
- `wordbound.html` + `css/` — the complete pre-React reference implementation;
  remains the `npm test` target until the React port reaches full parity (see
  GOALS.md header).
- `test/` — node-driven checks (dom-check, `verify-*.js`, balance sims).
  `tools/` — `ensure-deps.js`, `build-itch.js`, `record-gameplay.js`.
- `THEME.md` — world/style bible. `ROADMAP.md` — north star + known gaps.
- `GOALS_ARCHIVE.md` / `PROGRESS_ARCHIVE.md` — history only, not context.
