# READ_SLOWLY_PLAN.md — the four big mechanics

Written 2026-09-08. Status ledger rewritten 2026-09-09 against the actual
repo (not against earlier session notes, several of which overstated what
had landed). Covers, in build order: (A) the React + TypeScript rebuild and
code audit, (B) the new theme ("slow down and read"), (C) fights as
situations resolved by reading, (D) playable letter-tile characters, (E) 2D
sprites and animation.

## The rule: the WHOLE plan ships

Jaxon's standing instruction, 2026-09-09, verbatim: _"I don't want 'done in
spirit' — I want to complete the full transition to shadcn, Tailwind,
TypeScript, and the other things I wanted, even if it is challenging or
will take a little while."_

**Every item in sections A–E is implemented, in full, as specified. No
session closes this plan early, and no session stops while the Work queue
below is non-empty.**

**Never open anything in Jaxon's Firefox browser** — no launching it, no
opening tabs/windows in it, no pointing an existing instance at a URL. It
pulls him away from whatever he's doing. All verification (Playwright,
screenshots, live checks) runs headless in a separate Chromium/Playwright
browser, never his Firefox. This holds for every session working this plan,
including unattended/overnight runs.

- **Done means the code matches the spec.** A note explaining why a piece
  was skipped, deferred, judged "not worth the risk", "done in spirit",
  "coherent as is", or replaced with a wrapper is not a completed item. It
  is an open item with a note attached and stays in the Work queue until
  the code matches. "Recommend closing" is a question to Jaxon, not a
  status.
- **Nothing is optional and nothing is cosmetic.** A layout target, a file
  deletion, a rename, a perf budget: each is an item like any other.
  `sandbox.css` still existing, a `.js` file still in `src/ui/`, a pose
  prop that changes nothing on screen: each one is open work.
- **Hard is not blocked.** "A large rewrite with no test suite", "touches
  30 call sites", "risks a transcription mistake" describe the work, not a
  reason to skip it. Verify in a real browser (Playwright, headless) after
  each step; if browser automation is denied, verify by `bun run build`
  plus a careful diff and say so in the commit.
- **Blocked means waiting on Jaxon and nothing else.** The only things a
  session cannot do itself are: hold the phone, choose the art source,
  settle a rules decision. Those go in the **Waiting on Jaxon** list, never
  in the Work queue, and never end a session: record the question, move
  to the next queue item. A phone check is Jaxon's item; the session's
  item is "deployed and ready for the phone check".
- **Session protocol.** Open this file. Take the first Work-queue item.
  Deliver it fully, run `bun run typecheck && bun run lint && bun run
format:check && bun run build`, verify in the browser, `bun run deploy`,
  move the item to Done as one line with the commit hash, then take the
  next item. Repeat until the queue is empty. Do not start work outside
  this plan while the queue is non-empty unless Jaxon asks for it.
- **Keep this ledger truthful and short.** One line per Done item. Long
  narrative belongs in the commit message. When a Done item turns out not
  to be done, move it back to the queue.

Nothing here changes the music rule: bosses keep their recordings, audio
stays synthesized elsewhere.

### Why the last session stalled (fix applied 2026-09-09)

The 2026-09-08 status wrote E4 as "needs an actual phone playing the actual
build" under a heading "Blocked, not abandoned", and E4 was the last item
in the suggested order. A later session reached E4, had no phone, called
the plan blocked, and stopped with A2/A4/A6 work still open. Three
mistakes, each fixed above: (1) a phone check was filed as the session's
item instead of Jaxon's; (2) "blocked" ended the session instead of
skipping to the next item; (3) the queue had no acceptance checks, so
"partial" could pass as done. E4 is now split into what a session does
(sheet audit, lazy-load, emulated-mobile perf numbers) and what Jaxon does
(the phone check).

---

## Status ledger (compacted 2026-09-09, verified against the tree)

### Done

- **A1 toolchain** — Bun, Vite, TS strict, Tailwind v4 + `@theme`, shadcn
  init, Prettier, ESLint flat, Husky pre-commit/pre-push, `.env.example`.
- **A1 `.jsx` → `.tsx`** — sixteen components ported with real prop types
  (`811df5d`, `4722c2c`, `d69e76f`, `e746198`).
- **A2 engine port** — every engine module is typed `.ts`; `recorded*.js`
  became `src/recordings/*.json`; `wordlist.js` is the one allowed plain-JS
  data import.
- **A2 no globals** — `window.Wordbound.Sandbox` / `window.Game.RNG` gone;
  every module is a plain ES import (`0405687`).
- **A2 persistence.ts** — owns `wbc.best/key/keyUnlocked/seen/sfx` with a
  `KEYS` map and a startup `migrate()`.
- **A2 hooks** — `useCrescendo`, `useDragReorder`, `useSfx` in
  `src/ui/hooks/` (`23d7f71`, `f1c9d76`).
- **A2 App.tsx phase router** — `src/app/App.tsx` (`55363aa`).
- **A2 main.tsx mount-only** beyond the four legacy-global loads (`5523b48`);
  `audio/` and `engine/meta/` at target paths (`a994c15`).
- **A3 immutable engine** — `state/round.ts` / `state/run.ts`, parity over
  15 seeds (`9d5652b`, `55d49aa`, `cde2d15`, `befe9ec`).
- **A3 facade + data-only actions** — `state/facade.ts` (`8ff70e8`);
  `FightAction` is plain data, `runFightAction` returns `FightEffect[]`.
- **A4 component split (first pass)** — `ui/fight`, `ui/shop`, `ui/chrome`,
  `ui/meta` children (`22f4d25`, `2379665`, `de45dee`, `a80ea47`); rename to
  `FightScreen.tsx`; Callout on Sonner (`ba2f69f`).
- **A5 CLAUDE.md rewrite, A6 rules written.**
- **A5 step 6 proof** — zero `any` outside `tools/`; pre-commit proven.
- **A6 primitives wired** — Sheet (`58acb5d`), Slider (`45d8195`), Progress
  (`93ab0b1`), Toggle, Tabs, Tooltip (`726db40`), Popover/Badge/Card/Dialog
  (`62edd39`), Sonner. Three scaffolding bugs fixed (vite alias, Slider
  fallback, Progress duplicate track).
- **B1–B3** — `copy.ts`, gold → ink, inks → marginalia, word kinds, nine
  enemies, THEME.md.
- **C1–C4** — situations, ladders, `SituationPanel.tsx`, opening beats,
  page SFX, resolution beat, boss openings, loss line (`8342754`,
  `0ab311e`, `9d1d28e`).
- **D1 character tile**, **D2 roster**, **D3 select screen.**
- **E1 pipeline** — manifest (24 sheets `sourced`), `Sprite`, SVG art.
- **E2 per-fight antagonists** (`fb5082a`). **E3 partial** — ladder
  crossfade, hit shake (`e6b5550`).
- **E4 first phone pass** — 2026-09-09 report fixed (`4d7a4f1`, `1ba0bf0`,
  `077845f`, `7023b2c`, `e46b475`, `75931ac`).
- **A1/A2 last files to TypeScript and target paths** — `cardCopy.ts`,
  `main.tsx`, `FightScreen.tsx`/`SituationPanel.tsx` under `ui/fight/`,
  `CharacterSelect.tsx` under `ui/meta/`, `QuillRow`/`QuillCard`/`cardCopy`
  under `ui/quills/`; index.html and CLAUDE.md updated (`1eb95d6`).
- **A2 every localStorage key through `persistence.ts`** — `stolenLetters.ts`,
  `quillDiscovery.ts`, `characters.ts` are pure (won/known/stored params);
  `wbc.letters/quills/characters` read/written only by `persistence.ts`;
  `RunState` carries `wonLetters`/`discoveredQuills` so the pure engine
  threads them through; `window.Wordbound.Lexicon/Tiles/WORD_SET/WORDLIST/
Items` remain, the documented legacy-global exception (`4ab4dab`).
- **A2 audio lifecycle out of FightScreen** — ctx/gain/sfx creation, the
  mobile suspend/close rebuild, and visibility/focus/gesture resume moved
  into `src/ui/hooks/useAudio.ts`; `FightScreen.tsx` has no `AudioContext`
  reference (`375ccdb`).
- **A4 FightScreen becomes a fight screen** — the ~930-line state machine
  (every useState/useReducer, the scoring cascade, shop/pack/ink/letter
  callbacks) moved out of the component into `src/ui/hooks/useFight.ts`;
  `FightScreen.tsx` is a 20-line mount point calling `useFight()` and
  rendering `<App {...props} />`; `bun run build` clean. Verified live:
  title → fight (tuning panel's `MOVEMENT_BASE_*` dropped to 1 for a
  one-word win) → won → shop → continue → second fight → shop, zero
  console errors across the whole sequence; the boss/letter-choice/end leg
  needs either a scripted real word or the dev forced-win affordance the
  next item adds, so that specific leg is unverified pending it (`0cd23e9`).

### Work queue (do in this order; each has an acceptance check)

1. **A6 `sandbox.css` deleted; chrome on shadcn + Tailwind.**
   Add a `paper` variant (and `paperPrimary`, `paperGhost` as needed) to
   `button.tsx`'s cva carrying the paper/ink/gilt look, so the primitive
   expresses the theme instead of fighting it; convert every native
   `<button>` in `src/ui` and `src/app` to `Button`. Shop/pack cards on
   `Card` with a rarity `Badge`; the `.sb-card.is-{rarity}` glow becomes
   Tailwind utilities keyed off `data-rarity`. Everything else in
   `sandbox.css` becomes Tailwind utilities on the element, section by
   section (title, run strip, score line, rack, stick, cascade, shop, end
   screen, tuning). What survives moves to `src/styles/game.css`: only
   the FLIP/pop keyframes, `.sb-tile`'s no-transform rule, `.sb-tile-pop`,
   board-shake and sprite crossfade keyframes. Accept: `sandbox.css` does
   not exist; `game.css` is under ~250 lines; `grep -rn "<button" src/ui
src/app` returns nothing; a full run in Playwright looks the same at
   390 px and 1280 px (screenshots before/after committed to the scratch
   dir, not the repo).
2. **A6 `GearPanel.tsx`.** `ui/chrome/GearPanel.tsx` composes `SetupPanel`,
   `StartingQuills`, `TuningPanel` inside the Sheet. Accept: `App.tsx` renders
   `<GearPanel>` and nothing else from the gear.
3. **A5 live verification of the win paths.** Add a dev-only forced-win
   affordance (tuning-panel target override applied at `createRound`, gated
   on `import.meta.env.DEV`). Then play shop split, resolution beat, page
   SFX, `nextStage`/`buyCard`/`pickCard`/`useInk`/`applyInk` live in
   Playwright. Accept: each path listed with "verified live" in the commit.
4. **D4 balance.** Revisit `MOVEMENT_BASE_n` for a player who always has a
   letter tile; record the before/after targets in the commit.
5. **E1 poses.** Per-pose SVGs (extend `src/art/svg/`) for the five ladder
   poses + `win-idle` on the three people and `idle`/`weakening`/`gone`
   (+ `crescendo` on bosses) on the nine antagonists; `Sprite` picks the
   pose's art; manifest gains `poses`. Accept: changing `pose` changes
   what is drawn for every sheet; Playwright screenshots of two poses
   differ.
6. **E2 remaining sheets rendered.** `wordsmith` (desk panel, character
   letter in a badge), `mark_overlay_gilt/bold/steel` on marked tiles,
   `bookmark_card_frame` on quill cards, `pack_wrapper` on packs,
   `backdrop_chapter_1/2/3` as far/near parallax with slow drift and a
   proper dark-theme scrim (the reverted 32% wash is not the design).
   Accept: every manifest id appears in a `Sprite` render site.
7. **E3 remaining hooks.** Word played → wordsmith `write`; win →
   `flourish`; round won → antagonist `gone`; crescendo `soon` → backdrop
   pulse; `live` → antagonist `crescendo`. `prefers-reduced-motion` stops
   loops and drift without freezing a `steps()` loop on frame one.
   Accept: each hook observed in Playwright via the class/pose it sets.
8. **E4 perf pass (session half).** `tools/audit-art.js` reports sheet
   count and dimensions (fail over 1024²); visible sheets under ~10 per
   screen; next chapter's sheets prefetched during the shop; Playwright
   mobile emulation (Pixel 5, CPU 4× slowdown) records a fight's frame
   timing and the cascade's timing before/after in the commit. Accept:
   numbers in the commit; then move "phone check" to Waiting on Jaxon.

### Waiting on Jaxon (never blocks the queue)

- **Character tile: once per word or once per round?** Decision 3 says per
  word; `7023b2c` (made while Jaxon watched the phone) limits it to once per
  round with a divider (`3160a75`). Until answered, per-round stands as
  shipped and D1's text is not rewritten.
- **Art source for E1** (draw / CC0 / generated). Until answered, the SVG
  stand-ins are extended per pose (queue item 9).
- **Phone checks** at the deployed link, after items 3, 5 and 12 land:
  audio background/resume, drag feel, cascade timing, crescendo cues.

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

Order for what is left: the Work queue above, top to bottom. It
supersedes the earlier suggested order.

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
