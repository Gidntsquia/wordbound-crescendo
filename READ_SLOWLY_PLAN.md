# READ_SLOWLY_PLAN.md — the four big mechanics

Written 2026-09-08. Status ledger rewritten 2026-09-09 against the actual
repo (not against earlier session notes, several of which overstated what
had landed). Covers, in build order: (A) the React + TypeScript rebuild and
code audit, (B) the new theme ("slow down and read"), (C) fights as
situations resolved by reading, (D) playable letter-tile characters, (E) 2D
sprites and animation.

## The rule: the WHOLE plan ships

Jaxon's standing instruction, restated 2026-09-09 and again when this
ledger was compacted: **every item in sections A–E is implemented, in
full, as specified. No session closes this plan early.**

- **Done means the code matches the spec.** A note explaining why a piece
  was skipped, deferred, judged "not worth the risk", "done in spirit", or
  replaced with a wrapper is not a completed item. It is an open item with
  a note attached, and it stays under **Open** until the code matches.
- **Sessions do not narrow scope.** If an item is blocked, finish
  everything else, say exactly what is blocked and why, and leave it under
  Open with that reason. Only Jaxon strikes an item. "Recommend closing"
  is a question to Jaxon, not a status.
- **Nothing is optional and nothing is cosmetic.** A layout target, a file
  deletion, a rename, a perf budget and a phone check are items like any
  other. `sandbox.css` still existing, a `.js` file still in `src/ui/`, a
  pose prop that changes nothing on screen: each one is open work.
- **Every session opens by reading Open below and picks the first item it
  can move.** Do not start new work outside this plan while Open is
  non-empty unless Jaxon asks for it.
- **Each landed item deploys** (`bun run deploy`) so it can be played on
  the phone. Feel-sensitive items (timing, audio, drag) get a phone check
  before they move to Done.
- **Keep this ledger truthful and short.** When something lands, move it
  to Done as one line with the commit hash. Long narrative belongs in the
  commit message, not here. When a Done item turns out not to be done,
  move it back.

Nothing here changes the music rule: bosses keep their recordings, audio
stays synthesized elsewhere.

---

## Status ledger (compacted 2026-09-09, verified against the tree)

### Done

- **A1 toolchain** — Bun, Vite, TS strict, Tailwind v4 + `@theme`, shadcn
  init, Prettier, ESLint flat, Husky pre-commit/pre-push, `.env.example`.
- **A1 `.jsx` → `.tsx`** — all sixteen components ported with real prop
  types (`811df5d`, `4722c2c`, `d69e76f`, `e746198`).
- **A2 engine port** — every engine module is typed `.ts`; `recorded*.js`
  became `src/recordings/*.json`; `wordlist.js` is the one allowed plain-JS
  data import.
- **A2 no globals** — `window.Wordbound.Sandbox` / `window.Game.RNG` gone;
  every module is a plain ES import (`0405687`). Dead mutable
  `content/round.ts` `createRound`/`createRun` and `content/shop.ts`
  deleted.
- **A2 persistence.ts** — `src/app/persistence.ts` owns `wbc.best/key/
keyUnlocked/seen/sfx` with a `KEYS` map and a `migrate()` run at startup.
- **A2 hooks** — `useCrescendo`, `useDragReorder`, `useSfx` extracted to
  `src/ui/hooks/` (`23d7f71`, `f1c9d76`).
- **A2 App.tsx phase router** — `src/app/App.tsx` composes title / gear
  sheet / fight / shop / letter / end from `FightScreen.tsx`'s state
  (`55363aa`).
- **A2 main.tsx mount-only** — beyond the four legacy-global loads
  (`5523b48`); `audio/` and `engine/meta/` moved to the target paths
  (`a994c15`).
- **A3 immutable engine** — `state/round.ts` / `state/run.ts` pure
  transitions with threaded `RngState`, parity-verified over 15 seeds
  (`9d5652b`, `55d49aa`, `cde2d15`, `befe9ec`).
- **A3 facade + data-only actions** — `state/facade.ts` presents the
  mutable-shaped API over the immutable state (`8ff70e8`); `store.ts`'s
  `FightAction` is plain data, `runFightAction` returns `FightEffect[]`
  (`4f644af` + follow-up).
- **A4 component split** — `RoundSandbox.jsx` split into the `ui/fight`,
  `ui/shop`, `ui/chrome`, `ui/meta` children (`22f4d25`, `2379665`,
  `de45dee`, `a80ea47`), renamed `FightScreen.tsx`; Callout on Sonner
  (`ba2f69f`).
- **A5 CLAUDE.md rewrite, A6 rules written** — Map and Coding rules match
  the tree.
- **A5 step 6 proof** — zero `any` outside `tools/`; pre-commit hook proven
  by a deliberate bad commit.
- **A6 primitives wired** — Sheet (gear, `58acb5d`), Slider (volume,
  `45d8195`), Progress (meter, `93ab0b1`), Toggle (sfx/helper), Tabs
  (tuning), Tooltip (felled pips, `726db40`), Popover/Badge/Card/Dialog
  (intro hint, end screen, share preview, `62edd39`), Sonner (callouts).
  Three latent bugs in the shadcn scaffolding fixed along the way
  (`vite.config.mjs` alias, Slider single-value fallback, Progress
  duplicate track).
- **B1 vocabulary swap** — `src/ui/copy.ts`; gold → ink; inks →
  marginalia; `BOOK_WORDS`/`SLOW_WORDS` kinds.
- **B2 enemy lineup** — nine names and chapter titles in `enemies.ts`,
  recordings unmoved.
- **B3 copy pass** — eyebrow, end-screen lines, callouts; THEME.md rewritten.
- **C1–C4 situations** — `situations.ts` data and ladders, `ladderIndex`,
  `run.resolved`, `SituationPanel.tsx`, opening beats, page-turn SFX on a
  ladder crossing, resolution beat before the shop button, boss-specific
  openings, loss line (`8342754`, `0ab311e`, `9d1d28e`).
- **D1 character tile** — `RunState.characterTile`, scoring step, drag as a
  third row, deck-view line, first-use callout.
- **D2 roster + passives, D3 select screen** — `characters.ts`,
  `CharacterSelect.tsx`, `wbc.characters`.
- **E1 pipeline** — `tools/art-manifest.json` (24 sheets, all `sourced`),
  `Sprite.jsx`, SVG art under `src/art/svg/`, three CC0 PNGs.
- **E2 per-fight antagonists** — six big/boss antagonists shown on their own
  enemy via `Enemy.antagonist` (`fb5082a`).
- **E3 partial** — ladder step → pose crossfade; cascade total hit →
  antagonist shake (`e6b5550`).
- **E4 first phone pass** — 2026-09-09 report fixed (`4d7a4f1`, `1ba0bf0`,
  `077845f`, `7023b2c`, `e46b475`, `75931ac`).

### Open (in build order)

Each entry is the gap between the tree and the spec. None is optional.

- **A2 target layout.** `FightScreen.tsx` and `main.tsx` still live under
  `src/sandbox/`, not `src/ui/fight/` and `src/`. `src/ui/quills/` does not
  exist (QuillRow/QuillCard sit in `ui/fight`). `cardCopy.js` in
  `src/ui/fight/` is still plain JS. `Sprite.jsx` is still `.jsx`.
  `wbc.letters/quills/characters` are still direct `localStorage` calls
  inside `engine/meta/` and `content/characters.ts`; the spec says every key
  goes through `persistence.ts`, which means those modules take the store
  as a parameter or move out of `engine/`. The audio-context/recording
  lifecycle (ctx, gain, seq, resume, warm-ahead, stage-start music) is still
  inline in `FightScreen.tsx`; spec puts it in `useSfx`/`recordingPlayer`.
  Needs a phone check for background/resume after the move.
- **A4 FightScreen under ~200 lines.** The rename landed; the split did not.
  `FightScreen.tsx` is still the whole app. Extract the fight phase's state
  and callbacks so `App.tsx` truly routes between Title / Fight / Shop /
  Pack / End screens each owning their state.
- **A6 sandbox.css deleted, chrome on shadcn.** `sandbox.css` is 3,283
  lines. Spec: game pieces keep a small `game.css` for FLIP/pop rules;
  everything else is Tailwind utilities on shadcn primitives, including the
  native `<button>` theme and the `.sb-card` rarity system. The earlier
  note recommending "done in spirit" is a request to Jaxon, not a status;
  until Jaxon strikes it, this is open. Plan for the Button conflict named
  in that note: a `paper` variant added to `button.tsx`'s cva so the theme
  is expressed in the primitive rather than fought by it.
- **A6 GearPanel.tsx.** The Sheet exists but there is no `GearPanel`
  component in `ui/chrome/`; the three panels are composed inline.
- **A5 live verification gaps.** Shop split (`a80ea47`), won-banner
  resolution beat and page SFX (`8342754`, `0ab311e`), and the `nextStage`/
  `buyCard`/`pickCard`/`useInk`/`applyInk` effect cases were never driven
  live through a real win. Add a dev-only forced-win affordance (a tuning
  panel target override applied at `createRound`) so the shop/win/end paths
  can be played and verified, then verify them.
- **D1 vs Decision 3.** `7023b2c` limited the character tile to once per
  round with a divider (`3160a75`); Decision 3 says once per word. Jaxon
  made the change while watching the phone, so record which rule stands and
  update D1, `CHAR_*` tunables and the callout copy to match.
- **D4 balance.** Revisit `MOVEMENT_BASE_n` now every player has a letter.
- **E1 poses.** `Sprite` keys on sheet id only; the `pose` prop changes a
  `data-` attribute and nothing drawn. Spec: per-pose frames or per-pose
  SVGs for the five ladder poses + `win-idle` on the three people and
  `idle`/`weakening`/`gone` (+ `crescendo` on bosses) on the nine
  antagonists, played by a `steps()` `background-position` animation with a
  per-sheet `{frameW, frameH, poses}` manifest. Art source is Jaxon's open
  call; the SVG stand-ins can be extended per pose meanwhile.
- **E2 remaining sheets.** `wordsmith` (desk panel with the character letter
  in a badge), `mark_overlay_gilt/bold/steel` (on inked tiles),
  `bookmark_card_frame` (quill cards), `pack_wrapper` (packs),
  `backdrop_chapter_1/2/3` (far/near parallax pair with slow drift,
  dark-theme recolour or a proper scrim; the reverted 32% wash is not the
  design). Every sheet in the manifest is rendered somewhere.
- **E3 remaining hooks.** Word played → wordsmith `write`; win → `flourish`;
  `clear` (round won) → antagonist `gone`; boss crescendo `soon` → backdrop
  pulse, `live` → antagonist `crescendo` pose. `prefers-reduced-motion`
  must disable loops and drifts without freezing a `steps()` loop on its
  first frame; poses still swap.
- **E4 perf pass.** Visible sheet count under ~10, sheets ≤ 1024², lazy-load
  the next chapter's sheets during the shop, then a phone check at the
  deployed link for drag feel, cascade timing and crescendo cues.

---

## 0. What exists today (audit findings, 2026-09-08)

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
- All source is `.ts` / `.tsx`; `allowJs` and `.jsx` files are transitional
  only and are gone by the end of A.
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

No `window.Wordbound.*` / `window.Game.*` attachments survive; modules
import each other.

### A3. State model

- Replace mutable `run`/`round` objects with plain immutable state types
  and pure transition functions:
  `playWord(state, word): { state, result }`, `changeout(state, ids)`,
  `buyCard(state, i)`, `advance(state)`, `skipEnemy(state)`.
  Each returns a new state. Old code that mutated in place (`round.rack.push`)
  becomes spread/`with` helpers.
- One `useReducer` in `store.ts` with a discriminated-union `Action` type
  whose payloads are plain data (no closures, no `SB`). The UI dispatches;
  the reducer calls engine functions; side effects (say / sfx / persist)
  run in the UI off the returned result. Delete `forceRender` and any
  `refresh`-style action that stands in for it.
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
   `sandbox.css` keeps working beside Tailwind until step 4. Deploy. **Done.**
2. Port `js/core` + `tiles/lexicon/wordlist` to `src/engine/` as ES modules
   with types. Keep the window namespace shim for one step so the UI still
   works. Deploy. **Done.**
3. Port `round.js` + `items.js` + `inks.js` + `shop.js` + `enemies.js` +
   metas to typed pure functions. Remove the shim. `RoundSandbox.jsx`
   temporarily imports them directly. Deploy. **Done.**
4. Split `RoundSandbox.jsx` into the `ui/` tree above, introduce the
   reducer store, delete `forceRender`. Deploy. **Reducer store done; split and `sandbox.css` deletion open (see Open A4/A6).**
5. Move `recorded*.js` envelopes to `src/recordings/*.json`; update
   `tools/fetch-audio.js` and `analyze-audio-piece.js` to write JSON.
   Rewrite CLAUDE.md's Map to match the new tree. Deploy. **Done.**
6. `bun run lint`, `bun run typecheck`, `bun run format --check` clean; no
   `any` outside `tools/`; pre-commit hook proven by a deliberate bad commit.
   **Done.**

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
  intro and strip. The antagonist is the current _enemy's_ sprite, not
  one per chapter.
- `opening[]` shows before the first word of the fight.
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

| id    | letter | passive (small, one line)                                  |
| ----- | ------ | ---------------------------------------------------------- |
| zed   | Z      | high value, rare in words; +1 swap per round               |
| ess   | S      | pluraliser; words ending in S get +10 points               |
| ee    | E      | the common one; a second E tile in the slot (two per word) |
| queue | Q      | Q and U played together score ×2 mult                      |
| why   | Y      | counts as a vowel for vowel quills                         |
| ex    | X      | +15 points when the word is 3–4 letters                    |

Passives are `Quill`-shaped hooks (`score(ctx, acc)`) registered as a
hidden quill at run start, so they reuse the item pipeline instead of a
new one. Unlock: Z and E from the start; others unlock by finishing a
chapter with the previous one (persisted via `persistence.ts`).

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
  No JS frame timers. A `pose` value must change what is drawn.
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
  slow drift. Must be composed for the dark theme (or scrimmed) so they
  read as scenery, not a wash.
- Every sheet in the manifest is rendered somewhere; an authored-but-unwired
  sheet is not done.

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

Suggested order for what is left, given what has landed: A3 (immutable
state) → A2 remainder (kill globals, persistence.ts, layout) → D1 (the
tile; it needs the new RunState) → C3 beats → A4 + A6 together (the
component split is the moment to swap chrome onto shadcn and delete
`sandbox.css`) → `.jsx` → `.tsx` → E1 poses + E2 wiring → E3 → E4.

## Decisions (settled by Jaxon)

1. Keep all nine recordings for now; small/big enemies keep theirs.
2. Gold → **ink**. The old tarot-style "ink" → **marginalia**.
3. Character tile is playable **once per word**, not once per round.
4. Toolchain: Bun, Vite, Tailwind, shadcn/ui, Prettier, Husky, lint-staged,
   dotenv (A1). UI on shadcn primitives, not hand-rolled CSS.
5. Situations deduplicated: one phone enemy per chapter at most.
6. (2026-09-09) **The whole plan is implemented.** No section is optional;
   partial passes stay in the Open ledger until they match the spec, and a
   session that runs out of time leaves the item open with a reason rather
   than calling it done. Still open: art source for E1 (draw, CC0
   placeholders, or generated), and whether Decision 3 (once per word) or
   `7023b2c` (once per round) stands for the character tile.
