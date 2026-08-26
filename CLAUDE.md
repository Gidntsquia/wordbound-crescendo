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
- `npm run test:gates` — EVERY node-driven gate above, in parallel, off ONE
  shared `vite build` (tools/run-gates.js). 78s wall instead of ~285s run one
  at a time. `test:gates:fast` is the sub-20s subset for an inner loop,
  `test:gates:slow` the long browser playthroughs; fast + slow = the whole set.
  Each gate still runs standalone exactly as before — the runner only sets
  WB_PORT (so two gates never fight over a port) and WB_SKIP_BUILD (so six of
  them stop rebuilding the same tree).
- `npm run dev:sandbox` / `npm run test:sandbox` — the bare-bones TUG SANDBOX
  (see below): one fight, no run. MANDATORY gate for any src/sandbox/ or
  music.js change.
- Deploy (LIVE DEPLOY rule, GOALS.md header): `npm run build:site` stages
  `dist/app/` into `dist/site/` with the SANDBOX as the root `index.html` (the
  full app moves to `/app.html`) plus an empty `.nojekyll`; publish the CONTENTS
  of `dist/site/` as the root of the `gh-pages` branch (orphan/replace commit,
  `git push -f origin gh-pages`). The public link points at the sandbox on
  purpose — that is the thing being iterated on.

## Tests

Runtime is part of the cost of a test. Before adding one, check that it earns its place.

- One test per behavior, not per branch of the same code path. Tests differing only in an input literal should be one parameterized test.
- Don't test framework, standard library, or ORM behavior.
- Don't add characterization tests for code written in the same change.
- Search the suite for existing coverage before adding a test.
- New tests run in under 100ms unless tagged slow or integration. Anything touching network, disk, or a real database gets the tag.
- Fake clock over sleeping. Stub over live service. Fixtures get the widest scope that's still correct.
- Deleting a test that no longer earns its runtime is a normal part of a change — do it, and say so in the summary.

### What to run, and when

Match the verification to the size of the change. The full set is ~3 minutes of
machine time and far more of yours, and running it on a one-constant edit tells
you nothing the targeted gate didn't.

1. **While iterating — test the exact thing you changed.** The behaviour, not
   the repo. Usually that is the one MANDATORY gate for the file you touched
   (src/sandbox/ or music.js -> `test:sandbox`; src/components -> `test:react`
   or `test:react:changed`; CSS layout -> `test:mobile`), or a throwaway
   harness in the scratchpad that drives the module directly and measures the
   property you were actually trying to change. A harness that proves the new
   behaviour beats a suite that proves nothing broke.
2. **If the change reaches past one file — add the fast tier**,
   `npm run test:gates:fast` (sub-20s).
3. **Before `git push` — and only then — run everything**:
   `npm run test:gates && npm run test:react`. That is the gate on the push,
   not on the edit.

A deploy counts as a push: full set first.

Commands:
- Full suite (pre-push only): `npm run test:gates && npm run test:react`
- Fast tier (default while developing): `npm run test:gates:fast`
- Changed files only: `npm run test:react:changed`

Known flaky, do not chase without reproducing first: `verify-react-build.js`'s
FLIP double-rAF check (fails ~2 runs in 3 standalone, passes under the parallel
runner) and `dom-check.js`'s BOSS_ITEM_REWARD wait (intermittently lands on
GAME_OVER via a null deref at js/wordbound/game.js:1756).

Vitest is left on its DEFAULTS on purpose: `--pool=threads` (44s), `--no-isolate`
(red — RTL trees leak between files) and `--maxWorkers=14` (15s) were all
measured and are all worse than the stock 10s. Nearly all of that 10s is
src/test/setup.js importing the 7MB wordlist.js once per test file; cutting it
needs a lazy dictionary, not a config flag.

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
