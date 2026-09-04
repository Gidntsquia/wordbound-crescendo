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
- `npm run dev:sandbox` — the bare-bones TUG SANDBOX (see below): one fight, no run.
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
- `sandbox.html` + `src/sandbox/` — TUG SANDBOX, a second Vite entry and the
  current focus of work: ONE fight, no menus, no map, no rewards, no
  items/intents/shops/events/achievements/stolen letters, and no
  game.js/floor.js/monsters.js/combat.js/duel.js. Loads only namespace, rng,
  wordlist, lexicon, tiles, music + pieces. Combat is a TUG OF WAR owned by
  `src/sandbox/tugOfWar.js` — a rope on 0..100, words become ramping-in
  "pushers" shoving right (which then hold for a while and wear off — see
  PUSHER_LIFE_*/PUSHER_FADE_SEC; they are not permanent), the song answers with
  telegraphed burst attacks plus a hidden dB ramp — and it deliberately does NOT
  use js/wordbound/duel.js, so tuning it cannot break the shipped app. Two rules
  price the word maker: a word the player ASSEMBLED banks at SELF_SPELL_BONUS
  times face strength (`pusher.self`, set in rubric in the typecase), and a push
  whose letters spell nothing in any order locks the Push button — never the
  tiles — for BLIND_PUSH_LOCK_SEC per tile past BLIND_PUSH_FREE_TILES. Detecting
  "spells nothing" needs the dictionary, so the UI decides it and calls
  `tug.lockPush(n)`; the model owns the clock and the arithmetic.
  `src/sandbox/wordFinder.js` is the word-maker helper (anagram map over
  WORDLIST). `src/sandbox/tileBags.js` owns the three tile bags the rack is
  drawn from (weak/normal/strong, 26 tiles each, picked in the setup bar) —
  the sandbox does NOT use Tiles.createStarterDeck(), which is the shipped
  game's deck-building artefact. `src/sandbox/TugSandbox.jsx` is the whole UI,
  with a live tuning panel over every constant. Tiles are played by tapping:
  the rack is THE CASE (a played tile leaves a hollow slot rather than closing
  the gap) and the row under it is THE COMPOSING STICK, with a FLIP slide
  carrying the tile between them — nothing may set `transform` on `.sb-tile`,
  which that animation owns. `src/sandbox/audioPiece.js` +
  `recordedFurElise.js` play a RECORDED piece (public/audio/fur-elise.mp3)
  behind the sequencer's own surface -- the one logged exception to the
  synthesized-only rule, sandbox-only, see the GOALS.md header. Regenerate its
  intensity envelope with `node tools/analyze-audio-piece.js`.
  `src/sandbox/sequencedSurges.js` gives a SEQUENCED piece the equivalent list
  by analysing its own note data, and wraps Music.createSequencer so both kinds
  of opponent telegraph the same way — without it a synthesized opponent barely
  attacks, because `dynamics.crescendos` holds two or three hand-written markers
  per piece and two of the eight have none at all. Add an engine module back to
  `src/sandbox/main.jsx` only when tuning the mechanic it owns.
- `wordbound.html` + `css/` — the complete pre-React reference implementation,
  kept until the React port reaches full parity.
- `tools/` — `ensure-deps.js`, `build-itch.js`, `build-site.js`, `record-gameplay.js`.
- `THEME.md` — world/style bible. `ROADMAP.md` — north star + known gaps.
