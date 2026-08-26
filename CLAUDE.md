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
  see `src/test/gameHelpers.js` for the pattern.
- `npm run test:mobile` — real-browser 375/414px layout check. MANDATORY for
  CSS layout changes.
- Targeted Playwright verifies — run the one matching what you touched:
  `test:music-engine`, `test:audio`, `test:react-build`, `test:react-qa`,
  `test:react-duel-loss`, `test:regular-duel-smoke`, `test:drag-interrupt`,
  `test:qa`, `test:itch-build`.
- `npm run test:duel-balance` — headless duel-balance simulation.
- `npm run dev:sandbox` / `npm run test:sandbox` — the bare-bones TUG SANDBOX
  (see below): one fight, no run. MANDATORY gate for any src/sandbox/ or
  music.js change.
- Deploy (LIVE DEPLOY rule, GOALS.md header): `npm run build:site` stages
  `dist/app/` into `dist/site/` with the SANDBOX as the root `index.html` (the
  full app moves to `/app.html`) plus an empty `.nojekyll`; publish the CONTENTS
  of `dist/site/` as the root of the `gh-pages` branch (orphan/replace commit,
  `git push -f origin gh-pages`). The public link points at the sandbox on
  purpose — that is the thing being iterated on.

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
- `sandbox.html` + `src/sandbox/` — TUG SANDBOX, a second Vite entry and the
  current focus of work: ONE fight, no menus, no map, no rewards, no
  items/intents/shops/events/achievements/stolen letters, and no
  game.js/floor.js/monsters.js/combat.js/duel.js. Loads only namespace, rng,
  wordlist, lexicon, tiles, music + pieces. Combat is a TUG OF WAR owned by
  `src/sandbox/tugOfWar.js` — a rope on 0..100, words become permanent
  ramping-in "pushers" shoving right, the song answers with telegraphed burst
  attacks plus a hidden dB ramp — and it deliberately does NOT use
  js/wordbound/duel.js, so tuning it cannot break the shipped app.
  `src/sandbox/wordFinder.js` is the word-maker helper (anagram map over
  WORDLIST). `src/sandbox/TugSandbox.jsx` is the whole UI, with a live tuning
  panel over every constant. `src/sandbox/audioPiece.js` +
  `recordedFurElise.js` play a RECORDED piece (public/audio/fur-elise.mp3)
  behind the sequencer's own surface -- the one logged exception to the
  synthesized-only rule, sandbox-only, see the GOALS.md header. Regenerate its
  intensity envelope with `node tools/analyze-audio-piece.js`. Add an engine module back to
  `src/sandbox/main.jsx` only when tuning the mechanic it owns.
- `wordbound.html` + `css/` — the complete pre-React reference implementation;
  remains the `npm test` target until the React port reaches full parity (see
  GOALS.md header).
- `test/` — node-driven checks (dom-check, `verify-*.js`, balance sims).
  `tools/` — `ensure-deps.js`, `build-itch.js`, `record-gameplay.js`.
- `THEME.md` — world/style bible. `ROADMAP.md` — north star + known gaps.
- `GOALS_ARCHIVE.md` / `PROGRESS_ARCHIVE.md` — history only, not context.
