# CLAUDE.md — Wordbound: Crescendo

Working notes for anyone touching this repo. This file is the repo map — keep
it truthful when you add or move structure.

Standing rules: verify changes by running the app (see `run` skill) before
calling a task done; music must be public-domain or the logged
recorded-Fur-Elise exception; audio is synthesized-only outside that
exception; deploys follow the LIVE DEPLOY steps under Commands below; keep
committed state clean (no stray scratch files).

## What this is

"Words vs music" browser game: real-time duel-gauge combat where the playing
piece's actual dynamics push the gauge against the player's word scores.
React + Vite UI over a framework-agnostic JS engine, forked from the sibling
Wordbound game (descent-of-essence).
Live build: https://gidntsquia.github.io/wordbound-crescendo/

## Commands

- `npm run dev` / `build` / `preview` — Vite; build outputs to `dist/app`
  (relative `base: './'`).
- `npm run dev:sandbox` — the bare-bones ROUND SANDBOX (see below): one round, no run.
- Deploy (LIVE DEPLOY rule): `npm run build:site` stages
  `dist/app/` into `dist/site/` with the SANDBOX as the root `index.html` (the
  full app moves to `/app.html`) plus an empty `.nojekyll`; publish the CONTENTS
  of `dist/site/` as the root of the `gh-pages` branch (orphan/replace commit,
  `git push -f origin gh-pages`). The public link points at the sandbox on
  purpose — that is the thing being iterated on.

## Tests

There is no test suite right now. It was deleted on 2026-09-04 at Jaxon's direct
instruction for a fast-iteration sandbox phase where
breaking changes are expected and re-fixing tests after every change cost more
than it saved. Don't add new tests, don't resurrect deleted ones, and don't
suggest running a `test:*` command — there isn't one. If the pace slows down and
verification becomes worth its cost again, that's a deliberate future decision,
not something to reintroduce piecemeal mid-task.

## Map

- `index.html` + `src/` — the React app (Vite entry). `src/main.jsx` loads the
  engine modules onto `window.Wordbound.*` in a fixed order, then mounts
  `src/App.jsx`. Screens/overlays in `src/components/`: MainMenu,
  CharacterSelect, RunScreen, RunSidePanels, CombatScreen, BossEntranceOverlay,
  RewardScreens, HowToPlayOverlay, VolumeGauge.
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
- `sandbox.html` + `src/sandbox/` — ROUND SANDBOX, a second Vite entry and the
  current focus of work: ONE round, no menus, no map, no rewards, no
  items/intents/shops/events/achievements/stolen letters, and no
  game.js/floor.js/monsters.js/combat.js/duel.js. Loads only namespace, rng,
  wordlist, lexicon, tiles, music + pieces. Combat is the Balatro-with-Scrabble
  round owned by `src/sandbox/round.js` (see COMBAT_REDESIGN.md): a point
  target, PLAYS words, CHANGEOUTS tile swaps, `Lexicon.scoreWord` for the
  points, gold on a win (GOLD_WIN + GOLD_PER_WORD_LEFT per unspent word). It has
  no clock; the music is a soundtrack only and never touches the score. It
  deliberately does NOT use js/wordbound/duel.js, so tuning it cannot break the
  shipped app. `src/sandbox/RoundSandbox.jsx` is the whole UI, with a live
  tuning panel over ROUND_DEFAULTS. Tiles are played by tapping: the rack is
  THE CASE (a played tile leaves a hollow slot rather than closing the gap) and
  the row under it is THE COMPOSING STICK, with a FLIP slide carrying the tile
  between them — nothing may set `transform` on `.sb-tile`, which that
  animation owns. The stick is also the changeout selection: Change out throws
  back whatever tiles stand on it. `src/sandbox/wordFinder.js` is the
  word-maker helper (anagram map over WORDLIST). `src/sandbox/tileBags.js`
  owns the three tile bags the rack is drawn from (weak/normal/strong, 26
  tiles each, picked in the setup bar) — the sandbox does NOT use
  Tiles.createStarterDeck(), which is the shipped game's deck-building
  artefact. LEFTOVERS from the retired tug of war, not loaded by main.jsx and
  due for deletion in the redesign's cleanup phase: `tugOfWar.js`,
  `TugSandbox.jsx`, `sequencedSurges.js`, `audioPiece.js`,
  `recordedFurElise.js`, `recordedMoonlight.js` (the recorded-piece exception
  to the synthesized-only rule goes with them). Add an engine module back to
  `src/sandbox/main.jsx` only when tuning the mechanic it owns.
- `wordbound.html` + `css/` — the complete pre-React reference implementation,
  kept until the React port reaches full parity.
- `tools/` — `ensure-deps.js`, `build-itch.js`, `build-site.js`, `record-gameplay.js`.
- `THEME.md` — world/style bible. `ROADMAP.md` — north star + known gaps.
  `COMBAT_REDESIGN.md` — the 2026-09-05 plan: Balatro-with-Scrabble rounds
  (4 words, 3 changeouts, beat a point target, gold, shop) replacing the tug
  of war.
