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

- `bun run dev` / `build` / `preview` — Vite (toolchain switched to Bun,
  READ_SLOWLY_PLAN.md A1); build outputs to `dist/app` (relative `base: './'`).
- `bun run dev:sandbox` — alias for `dev`; index.html IS the ROUND SANDBOX.
- `bun run typecheck` / `lint` / `format` / `format:check` — TypeScript,
  ESLint, Prettier. Pre-commit runs lint-staged; pre-push runs typecheck.
- Deploy (LIVE DEPLOY rule): `bun run deploy` (tools/deploy.sh) does all of
  this in one quiet call and prints one line; run it after EVERY change that
  lands, since Jaxon watches the live link from a phone. Under the hood:
  `bun run build:site` stages
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

## Coding rules (READ_SLOWLY_PLAN.md A6)

- `src/engine/` (and `src/engine/content/`) never imports React, DOM,
  `window`, or timers — pure TS only, so it stays testable headless even
  though there is no test suite right now.
- Content tables (`ITEMS`, `INKS`, `RULES`, `KEYS`, `MOVEMENTS`, `TIERS`,
  `ROUND_DEFAULTS`, etc.) are data plus small hook functions
  (`score(ctx, acc)`, `barsLetter`, `goldAtWin`); no game content lives in
  UI components.
- One component per file, under ~200 lines; a component that grows past
  that gets a child extracted. (`FightScreen.tsx` predates this rule and
  is the one exception until READ_SLOWLY_PLAN.md A4 splits it.)
- Styling: **shadcn/ui** on Tailwind v4. Components live in
  `src/ui/primitives/`, copied in by `shadcn` and owned by the repo — use
  its Button, Card, Dialog, Sheet, Tooltip, Popover, Tabs, Badge, Progress,
  Toggle, Slider, Sonner rather than hand-rolling new chrome. Game pieces
  (Tile, Stick, Cascade) stay bespoke, styled with Tailwind utilities plus
  the parts of `sandbox.css` that own the FLIP/pop rules — `transform` on
  `.sb-tile` stays forbidden; the cascade's pops stay on `.sb-tile-pop`.
  Theme tokens (paper, ink, gilt, marginalia) belong in the Tailwind
  `@theme` block in `src/styles/globals.css` so shadcn primitives pick up
  the look.
- All persisted `localStorage` keys (`wbc.best/key/keyUnlocked/letters/
quills/seen/sfx`) should eventually go through one `persistence.ts` with
  a versioned schema and a `migrate()`, per READ_SLOWLY_PLAN.md A2 — not
  yet done; new keys should still be added to CLAUDE.md when introduced.
- No `any` outside `tools/` (plain Node scripts, not part of the typed
  engine). `bun run typecheck` / `lint` / `format:check` must stay clean.

## Map

The former React app that lived at `index.html` (`src/main.jsx`, `src/App.jsx`,
screens under `src/components/`), `js/core/`, `wordbound.html` + `css/`, and
most of `js/wordbound/*.js` (duel/combat/music+pieces/tiles/lexicon/floor/
game/monsters/characters/items/intents/traits/stolenLetters/bossEntrances/
shakespeareGuide/shopkeepers/achievements/events) were deleted 2026-09-07.
`index.html` now loads the ROUND SANDBOX
directly — the sandbox is the app. Only two things survive from that tree:
`js/wordbound/wordlist.js` (still imported by `src/main.tsx`) and
`js/wordbound/pieces/` (11 sequenced-piece note-data files) — `pieces/` is
orphaned dead weight, nothing references it; nothing loads `music.js` either
(it too is gone) since the sandbox plays RECORDINGS, not sequenced pieces.

- `src/engine/rng.ts` — seeded RNG (TS port of the old `js/core/rng.js` +
  `namespace.js`, READ_SLOWLY_PLAN.md A2).
- `src/engine/` + `src/engine/content/` — the framework-agnostic engine,
  being ported file-by-file from plain JS to typed `.ts` (READ_SLOWLY_PLAN.md
  A2). `window.Wordbound.Sandbox`/`window.Game.RNG` are gone (A2 remainder,
  "no globals") — every module is a plain ES import; only
  `window.Wordbound.Lexicon`/`Tiles`/`WORD_SET`/`WORDLIST`/`Items`/
  `StolenLetters` remain, `js/wordbound/wordlist.js`'s legacy plumbing, a
  separate global out of that item's scope. Ported so far: `rng.ts`,
  `lexicon.ts`, `tiles.ts`, `sandboxGlobal.ts` (now just the
  `SandboxNamespace` type `app/store.ts` still needs), and everything
  listed under ROUND SANDBOX below except `FightScreen.tsx` itself.
- `index.html` + `src/main.tsx` — ROUND SANDBOX, the whole app (the public
  link points at it). It is a BALATRO-SHAPED RUN, built 2026-09-06/07.
  `src/main.tsx` is mount only beyond loading `rng.ts`/`lexicon.ts`/
  `tiles.ts`/`wordlist.js` (the legacy-global loads above); every other
  content module is reached transitively via `src/ui/fight/FightScreen.tsx`'s real
  imports, which then mounts `FightScreen.tsx`:
  - `src/engine/content/enemies.ts` — `MOVEMENTS`: three movements of
    three enemies (small / big / boss), each its own recording;
    `RULES` are the boss TEMPO MARKINGS (four_knocks: 4-letter words
    ×2 mult; presto: 3 words, target ×0.8; no_repeats: a letter played this
    round is barred; sotto_voce: 5+ letters ×0.5 mult, 3–4 letters ×1.5).
  - `src/engine/content/round.ts` — `ROUND_DEFAULTS` (every tunable; the
    tuning panel mirrors it), `TIERS` (word-length tiers
    SHORT/THREE/FOUR/FIVE/SIX/SEVEN, each a base points × mult, levelled by
    ÉTUDES), `scoreWordPoints` (points = tier + letters + marginalia +
    items; mult = tier + marginalia + items, items fire LEFT TO RIGHT),
    `PACK_KINDS`/`priceOf` (shop-pack display copy). The mutable
    `createRound`/`createRun` this file used to also host (PLAYS words,
    CHANGEOUTS swaps, walks the lineup, gold with INTEREST, a shop after
    every won fight, a small/big enemy skip for a favour) are gone —
    superseded by `state/round.ts`'s/`state/run.ts`'s pure, immutable
    transitions (`facade.ts` wires them into the mutable-shaped API the UI
    still expects; READ_SLOWLY_PLAN.md A3/A2). Its header carries the
    Phase 0 calibration table. Also exports `chordPoints` (plain base
    points for Harmony, imported by `items.ts`).
  - `src/engine/content/items.ts` — `ITEMS`, seventeen jokers (on
    screen: QUILLS; the code keeps "item") with `score(ctx, acc)` hooks,
    rarity and price; `run.moveItem` reorders them. `climax` is the first
    CRESCENDO EFFECT (`crescendo: true`; fires when `ctx.crescendo`, which
    round.ts reads from the run's `crescendo()` callback the UI supplies);
    `libretto` is the first second-axis quill (word KIND: `MUSIC_WORDS`).
    Harmony's chord-scoring imports `findWords` from `wordFinder.ts` and
    `chordPoints` from `round.ts` directly (safe despite round.ts importing
    an `ItemNote` type back from items.ts — that import is type-only and
    erased at compile time, so there is no runtime cycle).
  - Shop card/pack rolling lives in `state/run.ts`'s pure `rollShop`/
    `rollCardsAndPacks` (two card slots item/étude by weight, two packs
    tile/mark/étude keep-one-of-three, reroll, sell for half); the old
    mutable `content/shop.ts` this used to be is gone (A2 no-globals).
  - Word-mark tarots (formerly "inks") are `src/engine/content/
marginalia.ts`'s `MARK_DEFS`: gilt, bold, steel, blank, vowel shift,
    erase, coin; `applyMark` marks tiles in the case (`tile.mark`).
  - `src/engine/content/tileBags.ts` — the three bags (weak/normal/strong, 26
    tiles each) the run's deck starts from; NOT Tiles.createStarterDeck().
  - `src/engine/meta/stolenLetters.ts` — the stolen-letters meta: which
    letters are locked out of every bag/pack until a boss is felled and one
    is won back (localStorage `wbc.letters`); also wires
    `window.Wordbound.StolenLetters.isStolen` so `tiles.ts`'s
    letter-frequency pool actually filters stolen letters.
  - `src/engine/meta/quillDiscovery.ts` — which quills are hidden from the
    shop/packs until a boss is felled or Movement III is reached
    (localStorage `wbc.quills`).
  - `src/engine/content/wordFinder.ts` — the WORD HELPER (anagram map), off
    by default; also used by items.ts's Harmony chord scoring.
  - `src/engine/dragReorder.ts` — drag a tile along or between the case and
    the stick (plain export, not a `Sandbox.*` global — imported directly by
    `FightScreen.tsx`).
  - `src/ui/fight/FightScreen.tsx` — the whole UI: title screen (Play = random seed),
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
  - `src/audio/sfx.ts` — `createSfx(ctx, dest)`: synthesized input sounds
    (tick climbing the stick, shuffle, thud, coin, shimmer) and the
    cascade's hits (lock, letter, item, rule, hit, resolve, riffle);
    `SFX_DEFAULTS` is the table.
  - `src/audio/recordingPlayer.ts` (also owns THE CRESCENDO WINDOW:
    `seq.crescendo()` → idle / soon / live from the big surges,
    `CRESCENDO` holds the 0.4 s-before / 1.0 s-after / 5 s-countdown
    numbers; the quill card in `src/ui/quills/QuillCard.tsx` polls it) +
    `src/engine/content/recordings.ts` (generated import index) +
    `src/recordings/*.json` ×9 — the nine RECORDINGS under public/audio/,
    one per enemy; each JSON holds title/composer/performer/audio plus the
    analyzed envelope (durationSec/peak/loudness/dynamics).
    `tools/audio-manifest.json` is the source of truth (URL, licence,
    performer, trim, sha256); `npm run fetch:audio` (tools/fetch-audio.js)
    downloads into `.cache/audio/`, trims/transcodes with ffmpeg to 128 kbps
    excerpts, writes a new recording's initial JSON once, and refreshes the
    analyzed fields via tools/analyze-audio-piece.js (ffmpeg decode, Chromium
    fallback), which also regenerates recordings.ts's import list. Fetched
    MP3s are gitignored; `build:site` fetches any that are missing. Für
    Elise and Moonlight are Pixabay (permissive, not PD, committed); the
    other seven are public domain in composition and performance. These are
    the logged exceptions to the synthesized-only rule; the sandbox does not
    load music.js. Soundtrack
    only; the music never touches the score.
  - `src/art/Sprite.tsx` (also owns THE SITUATION SCENE, stage E) +
    `tools/art-manifest.json` — the ~20 sprite sheets stage E's scene/pieces
    need; a `status: "sourced"` entry (`coin`, `premium_slot_marker` so far,
    CC0 Kenney Game Icons pack) has an `image` path under `public/art/`
    that Sprite.tsx renders as a real background-image; everything else is
    still `status: "placeholder"` (a CSS box) until sourced.
    layers need (situation people, antagonists, the wordsmith player, tile
    pieces, chapter backdrops), one manifest entry per sheet mirroring
    `audio-manifest.json`'s licence-tracking shape. Every entry is
    currently `status: "placeholder"` — there is no real art yet (Jaxon's
    call, still open, is draw/CC0 packs/generated); `Sprite` renders a
    plain CSS box keyed by sheet id + pose so the pose-driven wiring
    (ladder step → pose prop → CSS crossfade in `src/ui/fight/SituationPanel.tsx`) is
    real end-to-end even without art. Swapping in real PNGs later is a
    manifest + CSS `background-image` change, not a caller change.
- `tools/` — `ensure-deps.js`, `build-itch.js`, `build-site.js`, `deploy.sh`, `record-gameplay.js`, `fetch-audio.js` + `audio-manifest.json`, `analyze-audio-piece.js`, `fetch-wiktionary.js` (`npm run fetch:words`: pulls Wiktionary's English lemmas into the GENERATED WIKT_EXTRA block of `js/wordbound/wordlist.js`, 4+ letter lowercase titles only; cache in `.cache/wiktionary/`).
- `READ_SLOWLY_PLAN.md` — the 2026-09-08 plan for the next big step: React +
  TypeScript rebuild and code audit, the "slow down and read" theme, fights
  as situations resolved by reading, playable letter-tile characters, 2D
  sprites. Its Work queue is the standing to-do list: a session takes the
  top item, lands it, deploys, and takes the next; anything needing Jaxon
  goes in its Waiting-on-Jaxon list and never ends a session. No "done in
  spirit" (Jaxon, 2026-09-09). (Earlier plan docs —
  BALATRO_NOTES, COMBAT_REDESIGN, DEMO_PLAN(_2), DIVERGENCE_PLAN,
  NEXT_LEVEL_PLAN, NIGHT_REPORT — were implemented and removed 2026-09-09.)
- `THEME.md` — world/style bible (pre-dates READ_SLOWLY_PLAN.md; stage B rewrites it). `ROADMAP.md` — north star + known gaps.
