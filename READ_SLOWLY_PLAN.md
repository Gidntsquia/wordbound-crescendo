# READ_SLOWLY_PLAN.md — the four big mechanics

Written 2026-09-08 for implementation in a fresh session. Covers, in build
order: (A) the React + TypeScript rebuild and code audit, (B) the new theme
("slow down and read"), (C) fights as situations resolved by reading,
(D) playable letter-tile characters, (E) 2D sprites and animation. The order
is deliberate: the rebuild gives every later item a typed home; the theme
renames things the situations and sprites depend on; characters are one
mechanic on top; art goes last because it only has value once the names,
enemies and beats are fixed.

Each stage ends with a deploy (`npm run deploy`) so Jaxon can play it on the
phone. Nothing here changes the music rule: bosses keep their recordings,
audio stays synthesized elsewhere.

## Status (2026-09-08 implementation pass)

Done and deployed: A1/A2/A5/A6, all of B, C, D, and E1–E3 (all ~20 art
sheets have real art — a handful of verified-license CC0 pieces, the rest
original hand-authored SVG; single-pose only so far, the pose-driven
plumbing works but doesn't swap art per pose yet).

Update (2026-09-08, browser-verification pass): Jaxon granted this session
a scoped headless-Playwright exception, unblocking the rest of A3.

- **A3** (reducer store): `forceRender` is deleted and six UI-only state
  slices are reducer-backed (`src/app/store.ts`). Of the ten remaining
  run/round mutation call sites, seven are now routed through dispatched
  `FightAction`s: `playWord`, `changeout`, `next` (`fight/nextStage`),
  `skip`, `leaveShop`, `pickLetter`, `moveTile` (both call sites). Each
  case's body is a verbatim relocation of the original `useCallback`'s
  logic; the closures it needed (`say`, `sfx`, `startStage`, `markSeen`,
  `warm`, `unlockNextKey`, `refreshDiscovered`, `setPhase`, `setBest`,
  `SB`, `recordRun`) are threaded through as action-payload fields so
  ordering is unchanged. Verified: `bun run typecheck`/`lint`/`build`
  clean, plus a headless Playwright smoke test (chromium, `headless:
true`) driving `vite preview` — start a run, tap-play several words,
  attempt a swap, click Continue/advance repeatedly — zero console errors
  or page exceptions across the run.
  Update (2026-09-08/09, pass 3): the remaining five call sites --
  `buyCard`, `pickCard`, `commitSelecting` (covers `saveMark`/
  `useAdhocMark`), `useInk`, `applyInk` (covers `drawMarkHand`/
  `useAdhocMark`/`useConsumable`) -- are now also routed through dispatched
  `FightAction`s (`fight/buyCard`, `fight/pickCard`,
  `fight/commitSelecting`, `fight/useInk`, `fight/applyInk`), each
  converted wholesale rather than call-by-call (their mark-card-detour vs.
  plain-buy/pick branches share one `act`-shaped result path, so splitting
  a function half-dispatched would be worse than moving the whole thing).
  `act` itself stays a local UI helper (still passed to `HeldRow`/`Shop`
  as a prop) since it never touches `fight.current`; the reducer inlines
  its say/sfx/refresh-on-result logic as a shared `actResult` function.
  All ten original run/round mutation call sites are now dispatch-routed;
  `fight.current`/`round.ts`/`items.ts` etc. are still the same mutable
  objects underneath (A3's "wrapping" conversion, not an immutable
  rewrite -- see the file-header note in `src/app/store.ts`).
  Verified: `bun run typecheck`/`lint`/`build` clean, bundle grep for the
  five new action-type strings, and an extended headless Playwright smoke
  test (chromium, `headless: true`, `vite preview`) that starts a run,
  auto-plays words via the word helper's "Best play", reaches the shop,
  buys a marginalia pack, picks a mark card from it (exercising
  `pickCard`'s mark-detour → `fight/pickCard`), and commits it via "Buy &
  apply" (`commitSelecting` → `fight/commitSelecting` →
  `run.useAdhocMark`) -- zero console errors or page exceptions. That
  particular run's mark happened to be 0-target (no tile to tap), so the
  smoke test didn't get to also assert a tile visibly gained an
  `is-mark-*` class; it does assert the purse/selecting state transitions
  correctly and nothing throws. A future pass could bias the RNG/seed to
  land on a tile-targeting mark for that extra assertion, but the dispatch
  path itself (buy → pick → select → commit → useAdhocMark) is exercised
  end to end.
- **A4** (component split): pass 4 checked the three blocks the plan named
  as remaining and found less left than expected, plus one block judged
  not worth the risk:
  - **Pack-pick** turned out to already be extracted -- it lives inside
    `src/ui/shop/Shop.jsx` (the `selecting`/`run.pack` branches), moved
    there in an earlier A4 pass along with the rest of the shop. Nothing
    to do.
  - **Callout/toast rendering** is three small one-line conditional
    `<span className="sb-callout">` elements, each gated on its own
    `!seen.has(...)` check and interleaved with unrelated markup (rack
    header, stick header, swap-button row). Pulling them into a shared
    file would trade three inline lines for a component call plus a prop
    for each condition -- not a real simplification, so left as-is.
    Update (2026-09-09, pass 5): the board/rack/stick/drag wrapper was
    attempted and extracted -- `src/ui/fight/PlayBoard.jsx` (new file,
    `forwardRef` so `playRef` still resolves to the real `.sb-play` DOM node
    for `drag.bind`'s `.sb-rack`/`.sb-stick` queries). It's a pure code-move:
    the ~30 closed-over values (`drag`, `rackShown`/`stickShown`, `inking`/
    `setInking`/`toggleInkTile`/`applyInk`, `scoring`, `spelt`/`worthHow`/
    `worth`, `formable`/`barredNow`, `helper`/`suggestions`/`indexing`,
    `stageTile`/`unstageAt`/`play`/`changeout`/`playWord`, `word`/`setWord`,
    `pickedIds`/`letters`/`rackLetters`, `SB`/`W`/`sfx`/`say`/`seen`/`round`/
    `live`/`inputRef`) became explicit props with no logic changes; the two
    module-level `PREMIUM_HINT`/`PREMIUM_ICON` consts moved into the new file
    since they were only used inside this block. `dragReorder.ts` itself was
    not touched. Verified: `bun run typecheck`/`lint`/`build` clean, and a
    headless Playwright smoke test (chromium, `headless: true`, `vite
preview`) driving the full loop -- open gear, enable the word helper,
    start a run, click through the pre-fight intro card, auto-play words via
    "Best play" + "Play" (score/plays-left updated correctly each time),
    reach the shop -- zero console errors or page exceptions throughout.
    `RoundSandbox.jsx`: 2,333 -> 1,920 lines. Not separately re-confirmed:
    actual drag-gesture feel and scoring-cascade pop/lit timing, same
    headless-tooling gap as everything else feel-sensitive in this plan --
    that's still E4's job. Commit `<pending, see git log>`.
- **E4** (phone perf pass): still needs an actual phone playing the actual
  build; headless Playwright can't stand in for this one. With A3 and A4
  now both complete, E4 is the only item left in the entire plan that
  requires Jaxon's own hands rather than more automated passes.

Not independently re-verified by this pass: audio/animation timing
(`runCascade`'s `setTimeout`-paced cascade, crescendo-window audio cues) —
Playwright confirmed no exceptions across a full play loop but can't judge
whether the _feel_ of timing/audio is right; that still wants a human
playtest.

---

## 0. What exists today (audit findings)

Read before starting. All paths under `src/sandbox/` unless noted.

**Architecture.** One Vite entry (`index.html` → `main.jsx`). Model code is
plain ES5-style JS attached to `window.Wordbound.Sandbox` by IIFEs in a
fixed import order (`main.jsx`). The UI is one 1,859-line component,
`RoundSandbox.jsx`, with three helper components (`HeldRow`, `Shop`,
`EndScreen`) and roughly 25 `useState` hooks; `sandbox.css` is 1,961 lines
of hand-written classes. The engine in `js/wordbound/` is down to
`wordlist.js`, `lexicon.js`, `tiles.js` (485 lines) plus `js/core/`.

**What is good and should be kept as-is in spirit:**

- Model/UI split is real. `round.js`, `shop.js`, `items.js` have no React,
  no timers. The scoring cascade reads a `breakdown.steps` list the model
  produces, so the model is testable headless and the UI is a narrator.
- Data-driven definitions: `ITEMS`, `INKS` (→ marginalia), `RULES`, `KEYS`, `MOVEMENTS`,
  `TIERS`, `ROUND_DEFAULTS` are tables with small hook functions
  (`score(ctx, acc)`, `barsLetter`, `goldAtWin`). Adding a mechanic mostly
  means adding a row. The TypeScript port should preserve this shape.
- Every tunable lives in `ROUND_DEFAULTS` and is mirrored by the tuning
  panel. Keep that contract.
- Seeded RNG everywhere; a seed reproduces a run.

**What is weak and the rebuild should fix:**

- `window.Wordbound.Sandbox` global namespace instead of modules. Hidden
  coupling through import order; no types; every consumer does
  `const SB = window.Wordbound.Sandbox`.
- `RoundSandbox.jsx` is a god component: title, run strip, board, shop,
  pack pick, inking, cascade, end screen, callouts, gear panel, audio
  polling, localStorage all in one file. Mutable model objects are forced
  through React with a `forceRender` counter.
- `run` and `round` are mutable objects mutated in place by methods
  (`run.next()`, `round.playWord()`). Works, but React cannot diff them and
  every state change needs a manual rerender.
- Seven localStorage keys (`wbc.best/key/keyUnlocked/letters/quills/seen/sfx`)
  read and written from scattered places with no single persistence layer.
- Nine `recorded*.js` files (2,800 lines) are generated envelope data
  checked in as code. They should be JSON assets.
- CLAUDE.md is stale: it still lists `sandbox.html`, `wordbound.html`,
  `css/`, `src/components/`, and a dozen engine files that no longer exist.
  Fix it in stage A5.
- Theme text is split across `THEME.md` (the old Concert Eternal / Fermata
  lore, tug-of-war Volume gauge) and the code (Balatro-shaped run). Neither
  matches what ships. Stage B replaces THEME.md wholesale.

---

## A. React + TypeScript rebuild

Goal: same game, typed, modular, no globals, with the UI split into
components fed by an immutable store. Do this as a port with behaviour
parity, verified by playing the same seed before and after and getting the
same words, targets, shop contents and scores.

### A1. Toolchain (settled 2026-09-08)

Stack: **Bun** (runtime + package manager + script runner), **Vite**,
**TypeScript**, **Tailwind CSS v4**, **shadcn/ui**, **Prettier**, **ESLint**,
**Husky** + **lint-staged**, **dotenv**.

- **Bun**: delete `package-lock.json`, commit `bun.lock`. All scripts run
  via `bun run <script>`; `tools/*.js` run under `bun` directly (they are
  plain Node-compatible scripts, no changes expected; `ffmpeg` and
  Playwright are unaffected). `tools/deploy.sh` and `build-site.js` switch
  their `npm run` calls to `bun run`. CLAUDE.md Commands section is
  rewritten to `bun run dev / build / deploy`.
- **TypeScript**: `typescript`, `@types/react`, `@types/react-dom`,
  `tsconfig.json` (`strict: true`, `noUncheckedIndexedAccess: true`,
  `jsx: react-jsx`, `moduleResolution: bundler`, path alias `@/* -> src/*`
  because shadcn expects it). `bun run typecheck` = `tsc --noEmit`.
- **Tailwind v4** via `@tailwindcss/vite`; one `src/styles/globals.css`
  with `@import "tailwindcss"` and the `@theme` tokens (paper, ink, gilt,
  marginalia colours). No `tailwind.config.js` (v4 is CSS-first).
- **shadcn/ui**: `bunx shadcn@latest init` (style: new-york, base colour:
  neutral, CSS variables on). Components land in `src/ui/primitives/`
  (set `aliases.ui` in `components.json`). See A6 for which ones.
- **Prettier** with `prettier-plugin-tailwindcss` (sorts class lists).
  Config: default options plus `singleQuote: true`. `bun run format`.
- **ESLint** flat config: `typescript-eslint` recommended,
  `eslint-plugin-react-hooks`, `eslint-config-prettier` last. `bun run lint`.
- **Husky + lint-staged**: `bunx husky init`; `.husky/pre-commit` runs
  `bunx lint-staged`. lint-staged: `*.{ts,tsx}` → `eslint --fix` then
  `prettier --write`; `*.{css,md,json}` → `prettier --write`. Exclude
  `src/engine/wordlist.ts` and `src/recordings/*.json` (generated, large).
  A `pre-push` hook runs `bun run typecheck` so a red build never reaches
  `main`.
- **dotenv**: Vite already reads `.env*`; `dotenv` is for `tools/`
  scripts (`import 'dotenv/config'` at the top of `fetch-audio.js`,
  `fetch-wiktionary.js`, `deploy.sh` via `bun --env-file`). `.env.example`
  committed with the keys used; `.env` gitignored. First uses:
  `VITE_BASE_URL` (deploy target), `AUDIO_CACHE_DIR`,
  `WIKT_CACHE_DIR`, an optional `DEPLOY_REMOTE`.
- Rename entry to `src/main.tsx`. Keep `index.html` as the only entry.
- Keep the no-test rule from CLAUDE.md. Parity is checked by seed replay
  in the browser, not by a suite.

### A2. Target layout

```
src/
  main.tsx                 mount only
  app/
    App.tsx                phase router (Title | Fight | Shop | Pack | End)
    store.ts               useReducer-based run store (see A3)
    persistence.ts         one module owning every localStorage key
  engine/                  pure TS, no React, no DOM, no timers
    rng.ts                 port of js/core/rng.js
    tiles.ts               Tile type, bags, pile (draw/discard)
    lexicon.ts, wordlist.ts (wordlist stays a generated data file)
    scoring.ts             scoreWordPoints + scoreSteps -> Breakdown
    round.ts               createRound -> pure functions on RoundState
    run.ts                 createRun, targets, gold, interest, skip
    shop.ts, marginalia.ts (was inks), etudes.ts
    content/               data tables only
      items.ts  rules.ts  keys.ts  enemies.ts  situations.ts (C)
      characters.ts (D)  tileBags.ts
    meta/
      stolenLetters.ts  quillDiscovery.ts
  audio/
    recordingPlayer.ts     audioPiece.js port; owns the crescendo window
    sfx.ts
  recordings/*.json        the nine envelope blocks, generated
  ui/
    fight/  FightScreen.tsx  Rack.tsx  Stick.tsx  Tile.tsx  ScoreLine.tsx
            Cascade.tsx  EnemyPanel.tsx  SituationPanel.tsx (C)
    shop/   ShopScreen.tsx  CardSlot.tsx  PackPick.tsx
    quills/ QuillRow.tsx  QuillCard.tsx
    meta/   TitleScreen.tsx  EndScreen.tsx  CharacterSelect.tsx (D)
    chrome/ RunStrip.tsx  GearPanel.tsx  TuningPanel.tsx  Callout.tsx
    primitives/ shadcn-generated components (button, card, dialog, ...)
    hooks/  useDragReorder.ts  useCrescendo.ts  useSfx.ts
  art/                     sprite sheets + manifests (E)
tools/                     unchanged, converted to .mjs where trivial
```

### A3. State model

- Replace mutable `run`/`round` objects with plain immutable state types
  and pure transition functions:
  `playWord(state, word): { state, result }`, `changeout(state, ids)`,
  `buyCard(state, i)`, `advance(state)`, `skipEnemy(state)`.
  Each returns a new state. Old code that mutated in place (`round.rack.push`)
  becomes spread/`with` helpers.
- One `useReducer` in `store.ts` with a discriminated-union `Action` type.
  The UI dispatches; the reducer calls engine functions. Delete
  `forceRender`.
- RNG state is part of the run state (a seed plus a counter), so replaying a
  seed is deterministic without a hidden mutable generator. `rng.ts` gets
  `next(rngState): [value, rngState]` alongside a convenience class for
  tools.
- The crescendo window is _input_ to `playWord` (`ctx.crescendo`), read by
  the UI from `useCrescendo()` at dispatch time. This preserves the
  "music never touches the model" rule: the model receives a phase, it does
  not read the clock.

### A4. Core types (sketch)

```ts
type Letter = 'A' | ... | 'Z' | '?';
interface Tile { id: string; letter: Letter; mark?: MarkId; origin: 'bag' | 'pack' | 'character' }
interface Breakdown { points: number; mult: number; total: number; steps: ScoreStep[]; /* ... */ }
type ScoreStep = { kind: 'lock' | 'letters' | 'item' | 'rule' | 'character' | 'slot' | 'total'; label: string; pts?: number; mult?: number; ratio?: number }
interface Quill { id: QuillId; name: string; rarity: Rarity; price: number; hint: string;
  score?(ctx: ScoreCtx, acc: Acc): string | null; plays?: number; goldAtWin?(round: RoundState): number;
  onPlayed?(run: RunState): RunState; crescendo?: boolean }
interface Enemy { id: string; name: string; kind: 'small' | 'big' | 'boss'; situation: SituationId;
  recording?: RecordingId; rule?: RuleId; sprite: SpriteId }
interface RunState { seed: string; rng: RngState; movement: number; stage: number; ink: number;
  deck: Tile[]; pile: Pile; quills: QuillId[]; consumables: Consumable[]; tierLevels: Record<TierId, number>;
  key: KeyId; character: CharacterId; characterTile: CharacterTileState; round: RoundState | null;
  shop: ShopState | null; pack: PackState | null; phase: RunPhase; bestPlay: BestPlay | null }
```

### A5. Migration order (each step deploys and plays)

1. Toolchain: Bun lockfile, TS, Tailwind + shadcn init, Prettier, ESLint,
   Husky/lint-staged, dotenv + `.env.example`; rename `main.jsx` →
   `main.tsx`; everything else still `.js` with `allowJs`. Existing
   `sandbox.css` keeps working beside Tailwind until step 4. Deploy.
2. Port `js/core` + `tiles/lexicon/wordlist` to `src/engine/` as ES modules
   with types. Keep the window namespace shim for one step so the UI still
   works. Deploy.
3. Port `round.js` + `items.js` + `inks.js` + `shop.js` + `enemies.js` +
   metas to typed pure functions. Remove the shim. `RoundSandbox.jsx`
   temporarily imports them directly. Deploy.
4. Split `RoundSandbox.jsx` into the `ui/` tree above, introduce the
   reducer store, delete `forceRender`. Deploy.
5. Move `recorded*.js` envelopes to `src/recordings/*.json`; update
   `tools/fetch-audio.js` and `analyze-audio-piece.js` to write JSON.
   Rewrite CLAUDE.md's Map to match the new tree. Deploy.
6. `bun run lint`, `bun run typecheck`, `bun run format --check` clean; no
   `any` outside `tools/`; pre-commit hook proven by a deliberate bad commit.

### A6. Coding rules to write into CLAUDE.md

- `src/engine/` never imports React, DOM, `window`, or timers.
- Content tables are data plus small hooks; no content in components.
- One component per file, under ~200 lines; a component that grows past
  that gets a child extracted.
- Styling: **shadcn/ui** on Tailwind v4 (installed in A1; components
  copied into `src/ui/primitives/` and owned by the repo). Use its Button,
  Card, Dialog, Sheet (gear panel), Tooltip, Popover, Tabs, Badge, Progress,
  Toggle, Slider (volume, tuning), Sonner (callouts). Game pieces (Tile,
  Stick, Cascade, Sprite) stay bespoke components styled with Tailwind
  utilities plus a small `game.css` for the FLIP/pop rules that must not
  move (`transform` on `.sb-tile` still forbidden). `sandbox.css` is
  deleted at the end of A5 step 4. Theme tokens (paper, ink, gilt) go in
  the Tailwind `@theme` block so shadcn primitives pick up the look.
- All persisted keys go through `persistence.ts` with a versioned schema
  and a `migrate()`.

---

## B. Theme: "slow down and read"

Premise, one paragraph, to become the new THEME.md: We are **wordsmiths**
in a world that has stopped reading. Everyone is rushing, scrolling,
shouting, or bored. Each fight is a person (or a crowd) caught in that
rush; we spell words at them until they slow down, look up, and pick up a
book. The antagonists are not villains so much as _tempos_: the
Doomscroll, the Deadline, the Loudspeaker, the Nothing-To-Do. The bosses
are the only ones with actual music, because a boss is the moment the rush
becomes a full orchestra. Beating a boss is a chapter read to the end.

### B1. Vocabulary swap (code stays, screen text changes)

| Today                     | New on-screen word                               | Notes                                                                                                             |
| ------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Movement I/II/III         | Chapter 1/2/3                                    | `MOVEMENTS` keeps its id in code                                                                                  |
| Enemy (small/big/boss)    | Distraction / Pressure / Finale (boss)           | kind ids unchanged                                                                                                |
| Target score              | Attention needed                                 | the number a situation needs to resolve                                                                           |
| Quills                    | Bookmarks                                        | jokers; `items.ts` stays                                                                                          |
| Inks (tarots)             | Marginalia                                       | `inks.ts` → `marginalia.ts`; `tile.ink` → `tile.mark`                                                             |
| Études                    | Rereads                                          | planet cards; level a length tier                                                                                 |
| Tempo marking (boss rule) | Reading condition                                | still `RULES`                                                                                                     |
| Keys (stakes)             | Editions (First Edition … Sixth)                 | `KEYS`                                                                                                            |
| Stolen letters            | Lost letters ("the alphabet is being forgotten") | same module                                                                                                       |
| Skip for a bonus          | Walk past (for a favour)                         | same                                                                                                              |
| Gold                      | **Ink**                                          | the currency; `run.gold` → `run.ink`, GOLD_* tunables → INK__; the old INK_GILT/BOLD/STEEL tunables become MARK__ |

Word kinds already exist (`MUSIC_WORDS` for `libretto`). Add `BOOK_WORDS`
(PAGE, INK, SPINE, NOVEL, VERSE, PROSE, READ, STORY…) and `SLOW_WORDS`
(PAUSE, REST, BREATHE, LINGER, DWELL…) as new second-axis quill kinds.

### B2. New enemy lineup (`content/enemies.ts`)

All nine recordings stay, one per enemy as today; only names and framing
change. The recording-to-enemy mapping below is the current one, so
`recorded` ids in `enemies.ts` do not move. Six situations, not nine: the
three small enemies are each one distraction, and the big enemies reuse a
chapter's person under more pressure rather than introducing a new phone.

Chapter 1 — _The Commute_

- Distraction: **The Doomscroll** (Für Elise) — a commuter hypnotised by a
  phone. The only phone enemy in the game.
- Pressure: **The Deadline** (Moonlight) — the same commuter, now at a desk,
  a clock face where the phone was. Rushing, not scrolling.
- Finale: **Fate at the Door** (Symphony 5, rule `four_knocks`) — the
  deadline arrives in person and knocks.

Chapter 2 — _The Square_

- Distraction: **The Bored Bench** (Goldberg Aria) — someone with nothing
  to do and no idea a book counts as something.
- Pressure: **The Loudspeaker** (Mountain King, rule `presto`) — a leader
  who talks so no one has to think; the bench-sitter is in the crowd.
- Finale: **The Gallop** (William Tell, rule `no_repeats`) — the parade
  that never stops for anyone.

Chapter 3 — _The Tower_

- Distraction: **The Waiting Room** (Gymnopédie) — a person staring at a
  wall, so bored they have forgotten boredom has a cure.
- Pressure: **The Chancellor** (Nachtmusik) — hegemony; a hall repeating
  the same word after a podium.
- Finale: **The Bare Mountain** (Mussorgsky, rule `sotto_voce`) — the whole
  night of noise; win and the sun comes up on someone reading.

Removed from the earlier draft: The Notification and The Infinite Feed
(both were the Doomscroll again). Situations table therefore has six
persons/antagonists, and Chapter 1's finale reuses the commuter.

### B3. Copy pass

- Title: keep "Wordbound: Crescendo" but the eyebrow becomes
  "Words against the rush".
- End screen: "The last page turns." / "Lost the room to X."
- Callouts rewritten in the wordsmith voice. All strings gathered into
  `src/ui/copy.ts` so the theme can be edited in one file.

---

## C. Fights as situations resolved by reading

A **situation** is the framing of a fight: an opening beat, a person to
save, and a resolution beat that plays on the win. Mechanically the fight
is unchanged (reach the target in N words). The situation adds a visible
_state ladder_ driven by score progress, so every word visibly moves the
person toward the book.

### C1. Data (`content/situations.ts`)

```ts
interface Situation {
  id: SituationId;
  title: string; // "A commuter, lit by a screen"
  opening: string[]; // 1–3 short lines shown before the first word
  person: SpriteId; // who we are helping (E)
  antagonist: SpriteId; // the distraction sprite
  ladder: LadderStep[]; // ordered by `at` (fraction of target)
  resolution: string[]; // lines at the win
  failure: string; // one line at the loss
}
interface LadderStep {
  at: number;
  caption: string;
  personPose: PoseId;
  antagonistPose: PoseId;
}
```

Example, the Doomscroll:

- 0.00 — "Thumb moving. Eyes glazed." person `scrolling`, phone `glow`.
- 0.30 — "A word catches. The thumb stops." `paused`, `glow-dim`.
- 0.60 — "They look up." `looking-up`, `flicker`.
- 0.85 — "The phone goes face-down." `reaching`, `dark`.
- 1.00 — "A book. A page. A smile." `reading`, `gone`.

### C2. Engine hooks

- `RoundState` gains `situation: SituationId` and a derived selector
  `ladderIndex(round)` = highest step with `at <= score/target`. Pure; no
  new state.
- `enemies.ts` rows reference a situation; every enemy has one. Bosses'
  situations have the recording's crescendo mentioned in the opening so
  the crescendo mechanic reads as part of the story.
- On win, `RunState.resolved: SituationId[]` accumulates; the end screen
  lists the people helped ("Six people put down the rush").

### C3. UI

- `SituationPanel.tsx` above the rack: person sprite left, antagonist
  right, caption between. Replaces the enemy glyph and flavour quote in the
  intro and strip.
- The cascade's final "total hit" step triggers a ladder-step transition
  when the index changes; a step change gets its own SFX ("page turn").
- Resolution plays as a 2–3 s beat after the win before the shop button
  appears; any tap skips (same rule as the cascade).

### C4. Lose state

A loss is not death: "You ran out of words before they looked up." The
person stays scrolling; the run ends. No extra mechanic.

---

## D. Playable characters: the letter tile

You pick a **letter**. That letter is a permanent extra tile you may play
in any word, every word, and it scores extra. It can be
inked (boosted) like any tile and the ink persists for the run. The rack
stays seven; the character tile sits in its own slot beside the rack.

### D1. Rules

- `CharacterTileState = { tile: Tile }` on `RunState` (no per-round flag).
- Playable in every word: at most one copy on the stick at a time. It is
  never drawn from the bag and never goes to the discard; after the word
  scores it returns to its slot, ready for the next word.
- Scoring: the character tile's letter points count ×`CHAR_LETTER_MULT`
  (default 3) and the word gets `+CHAR_MULT` (default 2) mult. Both in
  `ROUND_DEFAULTS`. Reported as a `character` `ScoreStep` so the cascade
  narrates "Z, your letter, ×3".
- Rules interact honestly: `no_repeats` bars it if that letter was played;
  `sotto_voce` counts it toward length; a blank `?` character is disallowed.
- Inks apply via the existing `applyInk` path; the tile has
  `origin: 'character'` so the shop's tile packs never duplicate it and
  the deck view shows it separately.
- Swaps (changeouts) cannot discard it.

### D2. Roster (`content/characters.ts`)

Start with six, chosen for distinct play patterns rather than lore:

| id                                                                      | letter | passive (small, one line)                                  |
| ----------------------------------------------------------------------- | ------ | ---------------------------------------------------------- |
| zed                                                                     | Z      | high value, rare in words; +1 swap per round               |
| ess                                                                     | S      | pluraliser; words ending in S get +10 points               |
| ee                                                                      | E      | the common one; a second E tile in the slot (two per word) |
| queue                                                                   | Q      | Q and U played together score ×2 mult                      |
| why                                                                     | Y      | counts as a vowel for vowel quills                         |
| ex                                                                      | X      | +15 points when the word is 3–4 letters                    |
| Passives are `Quill`-shaped hooks (`score(ctx, acc)`) registered as a   |
| hidden quill at run start, so they reuse the item pipeline instead of a |
| new one. Unlock: Z and E from the start; others unlock by finishing a   |
| chapter with the previous one (persisted via `persistence.ts`).         |

### D3. UI

- `CharacterSelect.tsx` on the title screen: a row of letter tiles, the
  chosen one raised. Locked ones greyed with the unlock hint.
- The character slot renders as a `Tile` with a distinct border; tapping it
  moves it to the stick like any rack tile. `useDragReorder` treats the
  slot as a third row that only accepts its own tile back.
- Callout on first use: "Your letter. Play it once a round; it scores
  extra."

### D4. Balance note

A guaranteed Z in every word at ×3 letter points is ~30 points per word
before mult, ~120 a round on Chapter 1's 300 target: loud. Start with
`CHAR_LETTER_MULT: 2`, `CHAR_MULT: 1`, and expect targets to rise once
the character is standard; every player has one, so bake it into
MOVEMENT_BASE rather than nerfing the letters. Character tile stats sit
in the tuning panel like everything else.

---

## E. Looks: 2D sprites and animation

Goal: the game stops being boxes. Two layers: **scene** (situation people
and antagonists, animated poses) and **pieces** (tiles, quills, shop
cards) as drawn assets. Everything runs on CSS/DOM, not a canvas, so the
existing tap/drag/FLIP rules keep working.

### E1. Pipeline

- Format: PNG sprite sheets, 2× export, one sheet per character/antagonist,
  plus a JSON manifest per sheet (`{ frameW, frameH, poses: { idle: { frames, fps, loop } } }`).
  Alternative for a smaller footprint: hand-drawn SVGs with CSS keyframes
  for 2–4 pose swaps; recommend **sheets for people, SVG for pieces**.
- `src/art/` holds sheets + manifests; a `Sprite.tsx` component takes
  `sheet`, `pose`, plays via `steps()` CSS animation on `background-position`.
  No JS frame timers.
- Source of art: Jaxon's call. Options in order of cost: (1) commission or
  draw in Aseprite; (2) CC0 packs (Kenney, OpenGameArt) as placeholders,
  logged in a `tools/art-manifest.json` with licence like the audio
  manifest; (3) generated. The manifest is required regardless.
- `tools/pack-sprites.js` optional later; start with hand-exported sheets.

### E2. Asset list (first pass, ~20 sheets)

- Three situation _people_, one per chapter (commuter, bench-sitter,
  waiting-room sitter), each with 5 ladder poses (see C1) + `win-idle`;
  the pressure and finale fights reuse the chapter's person with a
  different antagonist.
- Nine antagonists: phone glow, clock, knocking door, empty bench,
  loudspeaker, parade, blank wall, podium, the night. Poses: `idle`,
  `weakening`, `gone`. Boss antagonists get a `crescendo` pose the
  `useCrescendo` hook toggles.
- Player: a wordsmith at a writing desk, `idle`, `write` (on play),
  `flourish` (on win). Character letter in a badge.
- Pieces: tile face (wood/paper), inked tile overlays (gilt, bold, steel,
  blank), premium slot marker, bookmark (quill) card frame, pack wrapper,
  coin.
- Backdrops: three chapters, one parallax pair each (far/near), with a
  slow drift.

### E3. Animation hooks (all CSS, driven by state)

- Ladder step change → person pose crossfade (200 ms) + antagonist pose.
- Word played → wordsmith `write`; tile FLIP unchanged (`transform` rule
  on `.sb-tile` stays; pops on the wrapper).
- Cascade `total hit` → antagonist shake; `clear` → `gone`.
- Boss crescendo `soon` → backdrop pulse; `live` → antagonist `crescendo`.
- `prefers-reduced-motion` disables loops and drifts; poses still swap.

### E4. Performance

Phones. Keep the visible sheet count under ~10, sheets ≤ 1024² each, lazy
load the next chapter's sheets during the shop. Test on the phone at the
deployed link before calling it done.

---

## Stage order and deploy points

| #     | Stage                                                              | Deploy? | Depends on |
| ----- | ------------------------------------------------------------------ | ------- | ---------- |
| A1–A3 | TS toolchain, engine port, shim removed                            | yes     | —          |
| A4–A6 | UI split, reducer, JSON recordings, CLAUDE.md, lint                | yes     | A1–A3      |
| B     | Rename, new enemies, copy.ts, THEME.md rewrite                     | yes     | A          |
| C     | Situations data, ladder selector, SituationPanel (text-only first) | yes     | B          |
| D     | Character tile: engine, select screen, slot, six passives          | yes     | A          |
| E1–E2 | Sprite pipeline + first people/antagonists                         | yes     | C          |
| E3–E4 | Animation hooks, backdrops, phone perf pass                        | yes     | E1         |

D can run in parallel with B/C. C should ship with plain text captions
before any art exists, so the pacing can be felt early.

## Decisions (settled by Jaxon 2026-09-08)

1. Keep all nine recordings for now; small/big enemies keep theirs.
2. Gold → **ink**. The old tarot-style "ink" → **marginalia**.
3. Character tile is playable **once per word**, not once per round.
4. Toolchain: Bun, Vite, Tailwind, shadcn/ui, Prettier, Husky, lint-staged,
   dotenv (A1). UI on shadcn primitives, not hand-rolled CSS.
5. Situations deduplicated: one phone enemy per chapter at most.
   Still open: art source for E1 (draw, CC0 placeholders, or generated).
