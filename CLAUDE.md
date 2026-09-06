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
- Deploy (LIVE DEPLOY rule): `npm run deploy` (tools/deploy.sh) does all of
  this in one quiet call and prints one line; run it after EVERY change that
  lands, since Jaxon watches the live link from a phone. Under the hood:
  `npm run build:site` stages
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
  current focus of work (the public link points at it). No menus, map,
  intents, events, achievements or stolen letters, and none of
  game.js/floor.js/monsters.js/combat.js/duel.js/items.js. Loads only
  namespace, rng, wordlist, lexicon, tiles from the engine. It is a
  BALATRO-SHAPED RUN, built 2026-09-06/07 to DEMO_PLAN.md (BALATRO_NOTES.md
  is the term-for-term mapping; NIGHT_REPORT.md is what shipped and what
  needs Jaxon's feel judgement). All model code is plain JS on
  `window.Wordbound.Sandbox`, no React, no timers:
  - `enemies.js` — `Sandbox.MOVEMENTS`: three movements of three enemies
    (small / big / boss), each its own recording; `Sandbox.RULES` are the
    boss TEMPO MARKINGS (four_knocks: 4-letter words ×2 mult; presto: 3
    words, target ×0.8; no_repeats: a letter played this round is barred;
    sotto_voce: 5+ letters ×0.5 mult, 3–4 letters ×1.5).
  - `round.js` — `ROUND_DEFAULTS` (every tunable; the tuning panel mirrors
    it), `TIERS` (word-length tiers SHORT/THREE/FOUR/FIVE/SIX/SEVEN, each a
    base points × mult, levelled by ÉTUDES), `scoreWordPoints` (points =
    tier + letters + inks + items; mult = tier + inks + items, items fire
    LEFT TO RIGHT), `createRound` (PLAYS words, CHANGEOUTS swaps, a single
    tile always playable), `createRun` (walks the lineup; targets
    MOVEMENT_BASE_n × 1 / BIG_MULT / BOSS_MULT; gold with INTEREST; one
    `run.deck` for the whole run, reshuffled into a fresh `run.pile` (bag +
    DISCARD PILE, refilled only when the bag runs dry) at every fight; `run.shop` after every won fight short of
    the last; `run.skip()` a small/big enemy for a favour; `run.bestPlay`).
    Its header carries the Phase 0 calibration table.
  - `items.js` — `Sandbox.ITEMS`, fifteen jokers with `score(ctx, acc)`
    hooks, rarity and price; `run.moveItem` reorders them.
  - `shop.js` — `Sandbox.createShop(run, rng)`: two card slots (item / ink /
    étude by weight), two packs (tile / ink / étude, keep one of three),
    reroll, sell for half; consumables live in `run.consumables`.
  - `inks.js` — `Sandbox.INKS` (tarots): gilt, bold, steel, blank, vowel
    shift, erase, coin; `applyInk` marks tiles in the case (`tile.ink`).
  - `tileBags.js` — the three bags (weak/normal/strong, 26 tiles each) the
    run's deck starts from; NOT Tiles.createStarterDeck().
  - `wordFinder.js` — the WORD HELPER (anagram map), off by default.
  - `dragReorder.js` — drag a tile along or between the case and the stick.
  - `RoundSandbox.jsx` — the whole UI: title screen (Play = random seed),
    run strip, one score line (score · meter · target · words · swaps),
    board, shop (Continue is the big button), pack pick, inking mode, end
    screen with Copy result (share text), one-time CALLOUTS in place of an
    overlay (`wbc.seen` is a JSON set of ids: rack, stick, swap, shop,
    boss), best-ever (`wbc.best`), SFX toggle (`wbc.sfx`), the gear button
    on every screen size folding seed / bag / starting items / helper /
    tuning away. THE SCORING CASCADE narrates `breakdown.steps` (lock,
    letters, items, rule, total hit, clear; `CASCADE` timing table,
    `intensity(total, target)` is the one feel knob; any tap skips).
    Tiles play by tap: the rack is THE CASE in code (a played tile leaves a
    hollow), the row under it THE COMPOSING STICK, a FLIP slide between them
    — nothing may set `transform` on `.sb-tile`; the cascade's pops go on
    the `.sb-tile-pop` wrapper. The stick is also the swap selection. UI
    words: "swap" for changeout, "skip for a bonus" for a favour; "case"
    and "stick" never appear on screen.
  - `sfx.js` — `Sandbox.createSfx(ctx, dest)`: synthesized input sounds
    (tick climbing the stick, shuffle, thud, coin, shimmer) and the
    cascade's hits (lock, letter, item, rule, hit, resolve, riffle);
    `SFX_DEFAULTS` is the table.
  - `audioPiece.js` + `recordings.js` (generated import index) +
    `recorded*.js` ×9 — the nine RECORDINGS under public/audio/, one per
    enemy. `tools/audio-manifest.json` is the source of truth (URL, licence,
    performer, trim, sha256); `npm run fetch:audio` (tools/fetch-audio.js)
    downloads into `.cache/audio/`, trims/transcodes with ffmpeg to 128 kbps
    excerpts, writes a new recorded file's header once, and refreshes the
    GENERATED envelope block via tools/analyze-audio-piece.js (ffmpeg
    decode, Chromium fallback). Fetched MP3s are gitignored; `build:site`
    fetches any that are missing. Für Elise and Moonlight are Pixabay
    (permissive, not PD, committed); the other seven are public domain in
    composition and performance. These are the logged exceptions to the
    synthesized-only rule; the sandbox does not load music.js. Soundtrack
    only; the music never touches the score.
- `wordbound.html` + `css/` — the complete pre-React reference implementation,
  kept until the React port reaches full parity.
- `tools/` — `ensure-deps.js`, `build-itch.js`, `build-site.js`, `deploy.sh`, `record-gameplay.js`, `fetch-audio.js` + `audio-manifest.json`, `analyze-audio-piece.js`.
- `THEME.md` — world/style bible. `ROADMAP.md` — north star + known gaps.
  `COMBAT_REDESIGN.md` — the 2026-09-05 plan: Balatro-with-Scrabble rounds
  (4 words, 3 changeouts, beat a point target, gold, shop) replacing the tug
  of war.
