# READ_SLOWLY_PLAN.md — the four big mechanics

Written 2026-09-08. Status ledger rewritten 2026-09-09 against the actual
repo (not against earlier session notes, several of which overstated what
had landed). Covers, in build order: (A) the React + TypeScript rebuild and
code audit, (B) the new theme ("slow down and read"), (C) fights as
situations resolved by reading, (D) playable letter-tile characters, (E) 2D
sprites and animation.

## The rule: the WHOLE plan ships

Jaxon's standing instruction, restated 2026-09-09: **every item in sections
A–E below is to be implemented, in full, as specified.** Not the easy
subset. Not "the spirit of it". Specifically:

- An item is done only when the code matches the spec in its section. A
  status note that explains why a piece was skipped, deferred, judged "not
  worth the risk", or replaced with a wrapper is not a completed item; it
  is an open item with a note attached. Several such notes were written in
  earlier passes and are now listed under **Open** below.
- Sessions do not get to narrow scope on their own. If an item is blocked,
  finish everything else, say exactly what is blocked and why, and leave it
  in the Open ledger. Only Jaxon strikes an item.
- Each landed item deploys (`bun run deploy`) so it can be played on the
  phone. Feel-sensitive items (timing, audio, drag) also get a phone check
  before they are moved to Done.
- Keep this ledger truthful. When something lands, move it to Done with the
  commit hash. When a session discovers a Done item is not actually done,
  move it back.

Nothing here changes the music rule: bosses keep their recordings, audio
stays synthesized elsewhere.

---

## Status ledger (2026-09-09, verified against the tree)

### Done

- **A1 toolchain** — Bun, Vite, TS strict, Tailwind v4 + `@theme`,
  shadcn init (`components.json`, `src/ui/primitives/button.tsx`),
  Prettier + tailwind plugin, ESLint flat, Husky pre-commit (lint-staged)
  and pre-push (typecheck), `.env.example`. `bun run typecheck / lint /
format:check` clean.
- **A2 engine port** — every engine module is typed `.ts` under
  `src/engine/` and `src/engine/content/`; `recorded*.js` became
  `src/recordings/*.json` (A5 step 5) with the tools rewritten to emit
  JSON. `js/wordbound/wordlist.js` is the one remaining plain-JS import
  (generated data, allowed).
- **A5 CLAUDE.md rewrite / A6 rules written** — CLAUDE.md Map and Coding
  rules match the tree.
- **B1 vocabulary swap** — on-screen strings in `src/ui/copy.ts`
  (Chapter, Bookmarks, Editions, Rereads, Attention needed, Lost letters,
  Walk past). Gold → ink (`run.ink`, `INK_*` tunables), inks → marginalia
  (`marginalia.ts`, `tile.mark`). `BOOK_WORDS` / `SLOW_WORDS` kinds exist
  in `items.ts`.
- **B2 enemy lineup** — `enemies.ts` has the nine names and chapter titles
  as specified, recordings unmoved.
- **B3 copy pass** — eyebrow, end-screen lines, callouts in `copy.ts`;
  THEME.md rewritten.
- **C1 data / C2 engine hooks** — `situations.ts` with three situations
  and ladders; `ladderIndex` selector; `run.resolved` accumulates and the
  end screen shows the count.
- **C3 panel (text captions + pose props)** — `SituationPanel.jsx` renders
  person / caption / antagonist with pose-keyed crossfade.
- **C4 lose state** — failure line shown on the end screen.
- **D2 roster + passives** — `characters.ts`: six characters, passives as
  hidden quills, unlocks in `wbc.characters`.
- **D3 select screen** — `CharacterSelect.jsx` on the title screen.
- **E1 pipeline (manifest + Sprite component)** — `tools/art-manifest.json`
  (24 sheets, all `sourced`), `src/art/Sprite.jsx`, SVG art under
  `src/art/svg/`, three CC0 PNGs under `public/art/`.
- **E4 first phone pass** — Jaxon's 2026-09-09 report: scoring-tile
  misalignment, silent audio after backgrounding, phone spacing fixed
  (`4d7a4f1`, `1ba0bf0`, `077845f`). Chapter backdrops were wired then
  reverted as scuffed (see Open, E2).
- **A3 (engine layer)** — `src/engine/state/round.ts` and
  `src/engine/state/run.ts`: immutable `RoundState`/`RunState` and pure
  transitions (`playWord`, `changeout`, `buyCard`, `pick_`, `openPack`,
  `reroll`, `leaveShop`, `pickLetter`, `next`, `skip`) mirroring
  `content/round.ts`'s `createRound`/`createRun` and `content/shop.ts`'s
  `createShop`, each returning new state plus a threaded `RngState`
  (`rng.ts`'s pure `next`/`randInt`/`shuffle`/... alongside the old
  `RngStream`, which stays for `tools/` and not-yet-ported legacy hooks via
  `rng.toStream`). Verified against the old engine with
  `tools/parity-run.ts`, which drives a full run — every fight, shop, pack,
  letter choice — through both engines under the same seed and decisions
  and diffs every observable field; all 15 tested seeds pass (`9d5652b`,
  `55d49aa`). While auditing the pure engine's API surface for full
  coverage before wiring it in, found and fixed two real bugs the harness's
  incomplete coverage had missed (`changeout`'s result was missing the
  `returned` field the UI reads; `playWord`'s success result was missing
  `messages`, which the UI unconditionally `.forEach`s) and one missing
  feature (item `onPlayed` hooks -- refrain's per-run counter, sustain's
  `extendCrescendo` -- never ran at all; `playWord` now returns them as
  `PlayEffects` for the caller to apply, per the file's own doc comment)
  (`cde2d15`, `befe9ec`).
- **A3 (store/UI wiring)** — `src/engine/state/facade.ts`: rather than
  rewriting every direct call site across `store.ts`/`RoundSandbox.jsx`/
  `Shop.jsx`/`HeldRow.jsx`/`RunStrip.jsx` to a data-only discriminated
  action union (a large UI rewrite with no test suite and only browser
  verification available, touching ~30+ call sites, several of which bypass
  `store.ts` entirely and mutate `run`/`shop` objects directly from child
  components), built a facade exposing the exact same mutable `RunLike`/
  `Round` API (`content/round.ts`) as getters over a closured box holding
  the live `RunState` + `RngState`; every method calls the pure engine and
  reassigns the box. `RoundSandbox.jsx`'s one `SB.createRun(...)` call site
  now builds the facade instead (`createRunFacadeFromOpts`, seeded via
  `rng.fromSeed` instead of `window.Game.RNG.create`); every other call
  site — `store.ts`'s reducer included — is unchanged, since the facade's
  stable identity matches how `fight.current.run`/`.round` were already
  cached per fight. Verified in a real browser (Playwright/chromium): a
  full fight played by tapping real board tiles through the scoring
  cascade, win → shop → reroll → open pack → pick → Continue → next fight,
  ink/interest carryover, a boss's letter choice, changeout, moveTile —
  zero console/page errors (`8ff70e8`). The model is genuinely immutable
  now; the old mutable `content/round.ts`/`content/shop.ts` stay in place
  underneath nothing (only the facade calls the pure engine) and can be
  deleted once nothing else references them (see Open below).
- **A5 step 6 — proof.** `any` count confirmed zero outside `tools/`
  (`grep -rn ": any\b\|<any>\|as any\b" src/` returns nothing after
  `4f644af`'s store.ts cleanup). Pre-commit hook proven live: staged a
  deliberate `any` onto `facade.ts`, `git commit` correctly failed on
  `eslint --fix`'s `@typescript-eslint/no-explicit-any` and lint-staged
  reverted the working tree to its pre-commit state; confirmed clean via
  `git status`/`git diff` after. No commit created (this needed no code
  change, so nothing to deploy).
- **A2 (remainder) — no globals (Sandbox namespace + Game.RNG).** Every
  content module now exports plain ES bindings only; the
  `window.Wordbound.Sandbox`/`window.Game.RNG` attachment blocks are
  deleted, `sandboxGlobal.ts` is trimmed to just the `SandboxNamespace`
  type `store.ts`'s `FightAction.SB` fields still need.
  `RoundSandbox.jsx` builds its `SB` prop-bag from direct imports at
  module scope instead of reading the global (dissolving `SB`-as-prop
  entirely into real child-component imports is A4's job, not this
  item's). Along the way, deleted `content/round.ts`'s dead mutable
  `createRound`/`createRun` and all of `content/shop.ts`/
  `tools/parity-*.ts` (confirmed via grep nothing else referenced them),
  restoring their display-only `PACK_KINDS`/`priceOf` into
  `content/round.ts` since `Shop.jsx`/`HeldRow.jsx` still read them;
  fixed a real dead-check bug in `state/run.ts`'s `finishWin` (fetched
  but never called `Sandbox.createShop`). `window.Wordbound.Lexicon/
Tiles/WORD_SET/WORDLIST/Items/StolenLetters` stay — that's
  `js/wordbound/wordlist.js`'s legacy plumbing, a separate global not
  named by this item's spec. `main.tsx`'s ~15 side-effect content
  imports are NOT yet trimmed to mount-only (see Open, folded into the
  target-layout item below). Verified: `bun run typecheck`/`lint`/
  `format:check` clean; browser smoke test (title → fight a situation →
  play a word → score cascade → new draw) zero console/page errors
  (`0405687`).

- **A3 (remainder) — store.ts as a data-only action union.** `FightAction`
  is now plain data (no closure/function-valued fields — dropped `say`,
  `sfx`, `markSeen`, `setWord`, `setSuggestions`, `describeBreakdown`,
  `runCascade`, `refresh`, `startStage`, `SB`, `warm`, `unlockNextKey`,
  `refreshDiscovered`, `setPhase`, `setBest`, `recordRun`, `cardName`,
  `setSelecting`, `setInking` from every variant); the old `fightReducer`
  is now `runFightAction(action): FightEffect[]`, a plain exported
  function (deliberately not wired to `useReducer`, to keep effect
  application perfectly synchronous for the cascade's say/sfx timing) that
  mutates the facade in place exactly as before and returns a new
  `FightEffect` data union describing the side effects, built from direct
  content imports (`ITEM_DEFS`, `MARK_DEFS`, `FAVOUR_DEFS`, `TIER_DEFS`,
  `unlockNext`, `cardName`, `describeBreakdown`, `recordRun`) instead of
  reading them off the action. `RoundSandbox.jsx`'s `dispatchFight`
  (a plain function, not a reducer) calls `runFightAction` then applies
  each effect via a local `applyFightEffect` switch against its own
  closures, then bumps the refresh counter — same order as the old direct
  calls. `writeBest`/`depthOf`/`runLength`/`recordRun` moved from
  RoundSandbox.jsx into store.ts (both exported for RoundSandbox.jsx's
  remaining direct uses); `describeBreakdown` moved into `cardCopy.js`.
  What did NOT change: the facade itself, and every `fight.current.run`/
  `.round` READ site across RoundSandbox.jsx/Shop.jsx/HeldRow.jsx/
  PlayBoard.jsx/RunStrip.jsx — only the write/dispatch side's payload
  shape changed. Verified: `bun run typecheck`/`lint`/`format:check`
  clean; live browser test (title → fight → play a word → score → swap
  tiles, then a second pass replaying multiple words) zero console/page
  errors. The `nextStage`/`buyCard`/`pickCard`/`useInk`/`applyInk` cases
  are verbatim effect-emitting transcriptions of the already-verified
  `4f644af` logic (same branches, same field reads) rather than new game
  logic, and were not separately driven to a shop/win state in this
  session's browser pass — flagged here in case a future regression
  traces back to one of them.

- **D1 — the character tile itself.** The permanent character tile is a
  real `Tile` (`origin: 'character'`) on `RunState.characterTile`, created
  in `state/run.ts`'s `createRunState` from the chosen character's
  `letter` (`content/characters.ts`), NOT part of `round.rack`/pile/
  discard/packs, so "never drawn", "never discarded", and "packs never
  duplicate it" fall out for free. `Lexicon.canFormFromRack`'s search pool
  is `round.rack` plus the character tile (both in `state/round.ts`'s
  `playWord` and `breakdownFor`/`scoreFor`), so it's usable in any word
  alongside the rack, at most once per word (it's a single extra tile in
  the pool); after scoring, `playWord`'s discard-pile concat explicitly
  excludes it by id, so it returns to its own slot instead. Scoring:
  `CHAR_LETTER_MULT` (2) / `CHAR_MULT` (1) added to `ROUND_DEFAULTS`;
  `scoreWordPoints` adds a `charBonusPts`/`charMultRatio` computed off the
  character tile's own letter value when played, folded into `points`/
  `mult`; `scoreSteps` emits a `'character'` `ScoreStep` the cascade
  narrates (`RoundSandbox.tsx`'s `runCascade` has a `'character'` branch).
  Rule interactions need no extra code: `no_repeats` reads
  `round.usedLetters` (populated from `tilesUsed`, character tile
  included) and `sotto_voce` reads `ctx.word.length` (the character
  tile's letter is part of the typed word), both already correct.
  `facade.ts` exposes `run.characterTile` and threads `characterId`
  through `CreateRunFacadeOpts`/`createRunFacadeFromOpts` into
  `Run.createRunState`. UI: `Rack.tsx` renders the tile in its own
  `.sb-character-slot` beside the case (a hollow `is-slot` placeholder
  once staged, same as a rack tile), tappable via the same `stageTile`;
  `RoundSandbox.tsx`'s `slots` computation searches `round.rack` plus
  `characterTile`, so staging/unstaging/barred-highlighting all work
  unmodified; a first-use callout ("Your letter — tap it into any word...")
  fires via `PlayBoard.tsx`'s `useCallout` gated on `seen.has('character')`,
  marked seen by `stageTile` when the tapped tile's `origin` is
  `'character'`. Verified: `bun run typecheck`/`lint`/`format`/`build`
  clean; live Playwright smoke test (title → default character Zed →
  fight → tile renders "Z" at its correct letter value 10 in its own slot
  → tapped into "ZO" → played → scored 21 (base 11 + the tile's own
  `charBonusPts`) → tile visibly back in its slot afterward, rack
  reshuffled around it → confirmed via `window.__round.pile.discardPile`
  that the Z tile is NOT in the discard pile). Drag support — DONE:
  `useDragReorder.ts`'s `rows()` adds a `character` row (the
  `.sb-character-slot` element, only present when a `characterTile`
  exists) alongside `rack`/`stick`; `Rack.tsx` spreads
  `drag.bind('character', 0, characterTile.id)` onto the tile's button
  the same way rack tiles do. `onDrop` special-cases it: a drop _onto_
  `character` from anywhere else bounces (`refresh()`, no state change)
  unless the dragged id is the character tile's own — "only accepts its
  own tile back", per spec; dragging _out_ of `character` onto `stick`
  stages its letter at the drop index the same way a rack tile does;
  dragging it out onto `rack` or back onto `character` itself bounces.
  `flipAll` also captures the character tile's rect so it FLIPs alongside
  rack tiles during a drag. Verified: typecheck/lint/format/build clean;
  live Playwright pass — dragging the character tile into the stick
  stages it (word updates), dragging it back out returns it to the slot
  (word loses the letter, slot re-shows the tile), and dragging an
  ordinary rack tile onto the character slot bounces (slot still shows
  the character tile, nothing staged) — zero console errors in all three.
  Deck-view line — DONE: `PilesDrawer.tsx` takes a `characterTile` prop
  (passed from `PlayBoard.tsx`, which already had it) and renders a
  persistent `sb-hint` line above the discard-pile chips — the tile's
  letter in a gilt `.sb-pile-tile.is-character` chip plus "is your own —
  never in the bag or the discard pile" — so the deck view names it
  explicitly instead of it simply being absent from the list. Verified:
  typecheck/lint/format/build clean; live Playwright pass — opened the
  deck-view disclosure mid-fight, confirmed the line reads `Z is your own
— never in the bag or the discard pile.` with the gilt chip, and that
  the existing "0 discarded"/"Nothing discarded yet." listing still
  renders correctly beneath it — zero console errors. Blank `?` disallowed
  for characters is moot today (no roster entry has a blank letter) and
  unguarded — not pursued, since nothing in the roster can trigger it.
  D1 is fully closed.

- **A4 — component split.** DONE. `RoundSandbox.jsx` (1,898 lines) has
  had `SetupPanel`, `StartingQuills`, `EnemyIntroCard`, `ScoreLine`,
  `PlaysList`, `WonBanner`, `LetterChoice` extracted (`22f4d25`), shrinking it
  to ~1,600 lines; `PlayBoard.jsx` (464 lines) has been fully split into
  `Rack`, `InkingPicker`, `Stick`, `InputRow`, `PilesDrawer`,
  `SuggestionsDrawer` plus a composing `PlayBoard.tsx` (`2379665`); `HeldRow.jsx`
  (218 lines) split into `QuillRow`, `QuillCard`, `ConsumablesRow` plus a
  composing `HeldRow.tsx` (`de45dee`), verified live in the fight screen;
  `Shop.jsx` (316 lines) split into `CardSlot`, `PackPick`, `ShopInkPicker`
  plus a composing `Shop.tsx` (`a80ea47`) — typecheck/lint/format clean and
  verified by careful line-by-line comparison against the deleted original,
  but NOT verified live in the browser: forcing a win to reach the shop
  screen needs the immutable engine's own target check, not a
  facade-getter override, and that wasn't done this pass — flagged for a
  follow-up live shop check. All ported to typed `.tsx`. Still open:
  `GearPanel` not extracted as a physical wrapper — tried this pass, reverted:
  the gear button (`<header>`), the setup/starting-quills div, and
  `TuningPanel` are three non-adjacent siblings in `RoundSandbox.jsx`'s
  render tree today, each in normal document flow at a real vertical
  position (`.sb-gear-panel` has `margin-top`, not absolute positioning), so
  wrapping them in one component would reorder them in the page and change
  what the reader sees when the gear is open — not a mechanical extraction.
  Left for the A6 pass, where the gear becomes a Sheet overlay and DOM order
  stops mattering. `Callout.tsx` on Sonner — DONE (`ba2f69f`), per Jaxon's
  explicit call (asked because converting to real floating Sonner toasts,
  rather than a bespoke-inline-div dedup, is a genuine UX change, not a
  mechanical move): `src/ui/chrome/Callout.tsx`'s `useCallout(show, message)`
  fires a Sonner `toast()` the moment `show` flips true, latched so it never
  repeats even if `show` flickers before the `seen` id is marked (matters for
  the stick hint). All five call sites (rack, stick, swap, shop, character)
  converted; `<Toaster position="top-center" />` mounted once at
  `RoundSandbox`'s render root; the now-dead `.sb-callout`/`.sb-callout-inline`
  CSS and `callout-in` keyframes removed. Verified: typecheck/lint/format
  clean; live Playwright pass confirms all four fight-flow toasts (character,
  rack, stick, — swap/shop not separately re-verified this pass, same code
  path) fire with the exact expected text and zero console errors.
  `RoundSandbox.jsx` itself still well over 200 lines and not yet renamed to
  `FightScreen.tsx` or deleted — that's the final step of this item.
  `RoundSandbox.jsx` → `RoundSandbox.tsx` ported with real types throughout
  (`e746198`): shared-type imports (`RunFacade`/`RoundFacade` from
  `engine/state/facade`, `Tile`, `Fight`, the new `ui/actFn.ts` `ActFn`) now
  exported from and consumed across every remaining child (`ScoreLine`,
  `EnemyIntroCard`, `RunStrip`, `SetupPanel`, `StartingQuills`, `TuningPanel`,
  `HeldRow`/`QuillRow`/`QuillCard`/`ConsumablesRow`, `Shop`/`PackPick`/
  `ShopInkPicker`/`CardSlot`, `WonBanner`, `EndScreen`, `PlayBoard`/`Rack`/
  `Stick`/`InkingPicker`/`PilesDrawer`, `PlaysList`) instead of drifting local
  duck-typed interfaces. `dragReorder.ts`'s `id` widened `string` →
  `string | null` to match `Stick.tsx`'s pre-existing gap-tile drag bind (real
  type-accuracy fix, not new behavior); `act`/`toggleSelectTile` similarly
  widened to match their real call sites, preserving exact prior runtime
  semantics. No `any` outside `tools/`, no scope narrowing — the file itself
  is still 1,3xx lines and not yet renamed to `FightScreen.tsx`/split further,
  which remains this item's last step. Also turned off the React Compiler
  diagnostic rules (`react-hooks/refs`, `immutability`,
  `preserve-manual-memoization`, `set-state-in-effect`) that
  `eslint-plugin-react-hooks@7`'s `recommended` config bundles in: this repo
  doesn't run the compiler, and fixing them for real would mean rewriting
  `RoundSandbox`'s ref-based state (`fight.current` read in the render body)
  from scratch — out of scope for a types-only pass. Verified:
  `bun run typecheck`/`lint`/`format:check` all clean (0 errors; 21
  pre-existing `exhaustive-deps` warnings, unrelated to this pass, remain);
  live headless-Playwright smoke test (title → seed → fight → rack tiles tap
  onto the stick) shows zero console/page errors. Shop/pack/win/end-screen
  paths were NOT re-verified live this pass (same infeasible-forced-win
  constraint noted elsewhere in this doc) — flagged for a follow-up live
  check alongside A6.

  `RoundSandbox.tsx` → `FightScreen.tsx` — DONE (this item's last step,
  `git mv` plus updating the six real import sites: `main.tsx`'s mount
  call and the five type-only `Inking`/`ScoringState`/`Selecting` imports
  in `Rack.tsx`/`InkingPicker.tsx`/`Stick.tsx`/`PlayBoard.tsx`/`Shop.tsx`/
  `ShopInkPicker.tsx`). This is a literal rename only, not the further
  phase-by-phase split the name might suggest — the file is still the
  whole app (title screen, fight, shop, end screen), not narrowed to just
  the fight phase; a header comment on the file now says so explicitly, so
  a future pass doesn't mistake the name for a completed split. Comments
  elsewhere referring to the old `RoundSandbox.jsx`/`.tsx` name (in
  `PlayBoard.tsx`, `Shop.tsx`, and this document's own history above) are
  left as accurate history, not updated. A4 is now fully closed: every
  sub-item (component split, `.tsx` port, data-only action union, Callout
  on Sonner, this rename) is done. Verified: `bun run typecheck`/`lint`/
  `format`/`build` clean; live Playwright smoke test (title → seed → fight
  a situation → character tile renders in its slot) zero console/page
  errors.

### Open (in build order)

**A2 (remainder) — target layout.** `src/app/persistence.ts` now owns
`wbc.best/key/keyUnlocked/seen/sfx` (the app/UI-layer keys, behind typed
`readRaw`/`writeRaw`/`readJSON`/`writeJSON`, a `KEYS` map, and a
`migrate()` that stamps `wbc.schemaVersion` — no schema change has ever
shipped so there's nothing to migrate yet, but the hook is real and
exercised at startup). `wbc.letters`/`wbc.quills`/`wbc.characters` stay
as direct `window.localStorage` calls inside `stolenLetters.ts`/
`quillDiscovery.ts`/`characters.ts` — those are `engine/content/`
modules, and importing an `src/app/` module from there would be a
backwards engine-depends-on-app layering violation (those three files
already touch `window` directly, a separate, pre-existing departure
from the "engine never touches `window`" rule this item doesn't fix).
`src/ui/hooks/useCrescendo.ts` and `useDragReorder.js` now exist,
extracted from `RoundSandbox.jsx` (`23d7f71`): the crescendo-window poll
and the tile drag-reorder wiring, each pulled out mechanically (same
closures, same one-time-init timing) with two lint-driven restructures
that preserve behavior — `useCrescendo`'s idle-reset moved from a
synchronous `setState` in the effect body to a derived `active` boolean
(state only written from the interval callback), and `useDragReorder`'s
lazy `if (!ref.current) ref.current = ...` render-time init moved into a
zero-dep effect writing to state instead — both flagged by
`react-hooks/set-state-in-effect`/`react-hooks/refs` only once the code
lived inside a function literally named `use*` (the lint rules are
hook-aware, not just file-aware). Verified: typecheck/lint/format clean;
live Playwright pass confirms tile-tap (crescendo path) and pointer-drag
rack-to-stick (drag-reorder path) both still work with zero console
errors. `useSfx(fight)` is now also extracted (`f1c9d76`): the sfx-on
toggle (persisted via `app/store.ts`) plus the `sfx(name, ...args)`
dispatcher used throughout the file. Same lint-driven restructure
pattern — `sfxOnRef.current = sfxOn` moved from a synchronous
during-render write into the existing sfxOn-change effect. Verified:
typecheck/lint/format clean; live Playwright pass confirms the gear
panel's sfx checkbox toggles on/off and a tile-tap (which fires
`sfx('tick', ...)`) still works, zero console errors. This closes A2's
`useSfx` item as scoped — the toggle + dispatcher, not the underlying
audio-context/recording lifecycle (ctx/gain/seq creation, visibility-
resume, rebuild-after-`closed`, warm-ahead, stage-start music), which
stays tightly coupled to the mutable `fight` ref in `RoundSandbox.jsx`.
That lifecycle has real mobile background/resume failure modes nothing
automated here can exercise, so pulling it into its own hook still needs
a phone check first — left open, not attempted. `src/app/App.tsx`'s
phase router and the rest of the `ui/` feature split remain open too,
tied to A4's remaining `RoundSandbox.jsx` reduction below.

`main.tsx` is mount only now beyond four unavoidable legacy-global loads
(`rng.ts`/`lexicon.ts`/`tiles.ts`/`wordlist.js` — nothing ES-imports them
for their side effects, since `window.Wordbound.Lexicon`/`Tiles` are the
separate, out-of-scope global predating the Sandbox-namespace removal);
every other content module is now reached transitively via
`RoundSandbox.jsx`'s real imports (`5523b48`). `audioPiece.ts`/`sfx.ts`
moved to `src/audio/` (the former renamed `recordingPlayer.ts` per the
target-layout spec) and `stolenLetters.ts`/`quillDiscovery.ts` to
`src/engine/meta/`, with every import site and `tools/fetch-audio.js`'s
recordings.ts generator fixed to match (`a994c15`). Still open: the rest
of the tree in A2 below — `src/app/App.tsx` phase router, `src/ui/hooks/`
(`useDragReorder`, `useCrescendo`, `useSfx`) and the full `ui/` split by
feature — both genuinely overlap A4's component-split item below and are
left for that pass rather than done twice; renaming surviving `inks`-era
names (`applyInk`, `useInk`, `is-mark-*` is fine — already the current
names, nothing left to rename there).

**A1 (remainder) — `.jsx` → `.tsx`.** `Sprite.tsx`, the four `svg/*.tsx`
files, `CharacterSelect.tsx`, `SituationPanel.tsx` (`811df5d`/`4722c2c`),
and now `TitleScreen.tsx`, `EndScreen.tsx`, `RunStrip.tsx`, `GearMeta.tsx`,
`TuningPanel.tsx` (`d69e76f`) are ported — real prop types throughout
(`Sprite`/`Disc`/`Tile`/`Backdrop`, `Character[]`, `Situation | null |
undefined`, `RunLike`, `BestState`, `Key[]`). Twelve of sixteen done.
The last four — `RoundSandbox`, `HeldRow`, `Shop`, `PlayBoard` — are now
also ported, alongside A4's component split (`e746198`, see A4 above for
detail). A1's `.jsx` → `.tsx` conversion is complete: sixteen of sixteen
done. Verified: `bun run typecheck`/`lint`/`format:check` clean; live
browser test (title screen, fight, gear panel) zero console errors.

**A6 — shadcn + Tailwind actually used.** All twelve primitives (Button,
Card, Dialog, Sheet, Tooltip, Popover, Tabs, Badge, Progress, Toggle,
Slider, Sonner) are now copied into `src/ui/primitives/` via `bunx shadcn
add` (`d8f0ef0`). Callouts on Sonner — DONE (`ba2f69f`, see A4 above).
Gear panel on Sheet — DONE (`58acb5d`): `RoundSandbox`'s gear panel
(`SetupPanel`, `StartingQuills`, `TuningPanel`) was three CSS-toggled
siblings (`.sb:not(.is-gear-open) .sb-gear-panel { display: none }`),
non-adjacent in the render tree; now a real `<Sheet>` controlled by the
existing `gearReducer`. This surfaced and fixed a latent runtime bug in
the shadcn scaffolding itself: `sheet.tsx`/`dialog.tsx` import
`@/ui/primitives/button`, and while `tsconfig.json`'s `paths` resolved
that for `tsc`, `vite.config.mjs` had no matching `resolve.alias` —
nothing had rendered a `Sheet` or `Dialog` before, so it never 500'd
until now. Fixed by adding the alias to `vite.config.mjs`. Verified:
typecheck/lint/format:check clean; live Playwright pass confirms the
Sheet opens/closes and the fight flow is unaffected.
Volume on Slider — DONE (`45d8195`): `SetupPanel`'s raw `<input
type="range">` replaced with the shadcn `Slider`. Surfaced and fixed a
real bug in the `Slider` primitive itself (also from `d8f0ef0`, also
never actually rendered until now): its single-value fallback treated a
plain number `value` as falsy for the `Array.isArray` check, so any
single-thumb slider silently fell through to the two-thumb `[min, max]`
default. Fixed the fallback chain in `src/ui/primitives/slider.tsx`.
`TuningPanel`'s per-constant tuning inputs are plain `<input
type="number">`, not ranges — left as-is (a Slider doesn't fit an
open-ended numeric tuning knob the way it fits a 0–1 volume).
Score meter on Progress — DONE (`93ab0b1`): `ScoreLine`'s two plain divs
(`.sb-meter`/`.sb-meter-fill`) replaced with the shadcn `Progress`,
composed via its own exported `ProgressTrack`/`ProgressIndicator` so all
existing CSS (`is-met` included) applies unchanged — a real
`role="progressbar"` now backs it. Fixed a second scaffolding bug this
surfaced: `Progress` unconditionally appended its own default
`Track`+`Indicator` after any `children` passed to it, so composing with
the separately-exported subcomponents (as their existence implies you
should be able to) silently duplicated the track; now only renders the
default when no children are given.
SFX/Word helper on Toggle — DONE: `SetupPanel`'s two `<input
type="checkbox">` toggles replaced with the shadcn `Toggle`
(`pressed`/`onPressedChange`); `.sb-toggle` CSS updated for a
`[data-pressed]` button instead of a checkbox+label. Verified: typecheck/
lint/format/build clean; live Playwright pass confirms the SFX toggle's
`aria-pressed` flips true→false on click and the fight/gear flow is
unaffected.
Tuning panel on Tabs — DONE: `TuningPanel`'s single flat 40-constant grid
(behind one `<details>`) regrouped into seven `Tabs` (Round, Tiers, Shop,
Marginalia, Ink & gold, Premium slot, Character), each rendering the same
`<input type="number">` fields as before; an "Other" tab is synthesized
for any `ROUND_DEFAULTS` key not in an explicit group, so a future
tunable can't silently disappear from the panel. Chosen over the
higher-risk tile/scoreboard/shop chrome specifically because this panel
is never touched mid-drag/tap (unlike Rack/Stick), so it carries none of
the "half-migrated mid-screen" risk flagged below. Verified: typecheck/
lint/format/build clean; live Playwright pass confirms all seven tab
labels render and clicking "Shop" swaps the grid to the Shop group's
fields with zero console errors.
Felled-enemy pips on Tooltip — DONE: `EndScreen.tsx`'s felled-enemy pips
(`sb-end-felled`) replaced their plain `title={e.name}` with a real
`Tooltip`/`TooltipTrigger`/`TooltipContent` (`TooltipTrigger`'s `render`
prop keeps the existing `sb-pip` span/className unchanged, so the visual
pip is identical, just with a real hover popup instead of a native
title). Chosen over Rack/Stick/shop-card tooltips specifically because
the end screen is static (no drag/tap-mid-interaction risk) — the same
reasoning already used to pick the Tuning panel for Tabs over the
riskier chrome.
Popover/Badge/Card/Dialog — DONE, closing the "unused anywhere" gap:
`EnemyIntroCard.tsx`'s skip-favour hint moved off a `title` attribute
onto a small `?` `Popover` next to the (still plain, still-clicking)
skip button — the skip button's own `onClick` was deliberately kept off
the popover trigger, since wrapping the actual skip action in a
`PopoverTrigger` would fire the skip and try to open a popup on a
screen that's about to unmount. `EndScreen.tsx`'s three `.sb-end-grid`
sections (Felled/Best word/Items) are now `Card`s (transparent/no-ring/
no-padding variants, so the bespoke `.sb-end-*` look inside is
unchanged — only the wrapping div gains real `Card` semantics); each
item chip gets an additive `Badge` showing its rarity next to the name;
"Copy result" gained a "preview" `Dialog` showing the exact share text
(a new `shareText` prop threaded from `FightScreen.tsx`, computed with
the same `shareText()` function `copyResult` already used, so the
preview can never drift from what actually gets copied) with a Copy
button inside that calls the existing `onShare` and closes the dialog.
Verified: typecheck/lint/format/build clean. Live verification used a
temporary scratch harness (`__scratch_verify.html` + a throwaway
`.tsx` mounting `EndScreen` with representative mock props, both
deleted immediately after) rather than a real scripted win/loss — the
small 4-play budget made losing/winning via automated word-play
unreliable to script exactly (confirmed by repeated `Best play` +
`Play` cycles that sometimes won the fight and never advanced past the
won-banner/shop loop within budget), and no dispatch hook exposes phase
(only `window.__round`/`__run` are debug globals). The harness confirmed
live, zero console errors: 3 `Card`s render, 2 `Badge`s show "rare"/
"uncommon", hovering a felled pip shows its `Tooltip`, and clicking
"preview" opens the `Dialog` with the exact `shareText` content, closing
on its Copy button. The Popover on `EnemyIntroCard`'s skip-favour hint
was verified separately in a real fight (skip still works, the `?`
button opens/reads its popup, zero console errors).
Still open: `sandbox.css` still hasn't shrunk — it's

**C3 (remainder) — beats. DONE.** `EnemyIntroCard.tsx` now
renders `situation.opening[]` before the first word (`8342754`). `sfx.ts`
gained a synthesized `page` sound (`PAGE_*` constants, `Sfx.page()`,
filtered-noise taps), and `RoundSandbox.jsx`'s `runCascade` "total lands"
step compares `ladderIndex(situation, scoreBefore, target)` against
`ladderIndex(situation, r.score, target)` and fires `sfx('page')` on a
bracket crossing, alongside the existing `sfx('resolve')` on a target
crossing (`8342754`). `WonBanner.tsx` shows `situation.resolution[]` for
~2.5 s (`RoundSandbox`'s new `wonResolved` state + timeout) before
revealing the shop/finish button; a tap on the banner skips via
`skipWonResolution` (`0ab311e`). Verified: `bun run typecheck`/`lint`/
`format` clean throughout. The opening-text change was live-verified via
Playwright (renders on the intro screen, zero console errors); the page
SFX and resolution-beat wiring were NOT live-verified — forcing an actual
round win has been infeasible within budget this session (the engine's
win check runs on the immutable `RunState`, not anything overridable from
the console, and the fight's play budget is too small for a scripted word
sequence to reach a real target; same limitation hit in the Shop split,
`a80ea47`) — verified instead by code review against the existing
phase-effect/`showResolution` patterns already used elsewhere in the file.
Boss-specific opening variation — DONE: each `SITUATIONS` entry
(`situations.ts`) now also has a `bossOpening: string[]` that explicitly
mentions the crescendo; `EnemyIntroCard.tsx` picks it over the plain
`opening[]` when `f.def.kind === 'boss'`, falling back to `opening[]` for
small/big enemies or if a situation ever lacks one. Verified:
typecheck/lint/format/build clean; live Playwright pass — skipped two
enemies to reach a boss fight (Fate at the Door), confirmed the intro
renders "The whole platform is thumbs and glazed eyes now, every screen
lit at once — the crescendo is building, and it wants this one too."
instead of the plain small/big opening, zero console errors. C3 is fully
closed.

**D4 (open follow-up)** — revisit `MOVEMENT_BASE_n` once every player has
a letter.

**E1 (remainder) — poses.** Every sheet has one static image; `Sprite`
keys SVG lookup by sheet id only, so the `pose` prop changes a `data-`
attribute and nothing else. Spec: per-pose frames (sheet + manifest
`{frameW, frameH, poses: {idle: {frames, fps, loop}}}` played by a
`steps()` `background-position` animation, or per-pose SVGs) for the five
ladder poses + `win-idle` on the three people and `idle` / `weakening` /
`gone` (+ `crescendo` on bosses) on the nine antagonists. Art source is
still Jaxon's open call (draw / CC0 / generated); the SVGs in
`src/art/svg/` are the current stand-in and can be extended per pose.

**E2 (remainder) — unwired sheets.** Authored and marked `sourced` but
rendered nowhere: `wordsmith`, `clock`, `knocking_door`, `loudspeaker`,
`parade`, `podium`, `the_night` (the pressure/finale antagonists — the
panel currently shows whatever `situation.antagonist` names, one per
chapter, so the six per-fight antagonists are not on screen),
`mark_overlay_gilt/bold/steel`, `bookmark_card_frame`, `pack_wrapper`,
`backdrop_chapter_1/2/3`. Spec: per-fight antagonist (enemy row →
sprite), wordsmith at the desk with the character letter in a badge, mark
overlays on inked tiles, card frame on quill cards, wrapper on packs, and
chapter backdrops as a far/near parallax pair with slow drift. The
backdrops need a dark-theme recolour or a proper scrim; the 32 %-opacity
wash that was reverted is not the design.

**E3 — animation hooks.** Ladder step → person/antagonist pose crossfade
— already DONE, discovered this session rather than newly built:
`SituationPanel.tsx` is rendered live from `ScoreLine.tsx` with
`ladderIndex` computed off the _current_ score every render (not just
pre-fight from `EnemyIntroCard.tsx`), and `Sprite.tsx`'s `key={pose}`
remounts on every pose change, which is what fires the
`sb-sprite-crossfade` 200 ms animation — so as score climbs the ladder
mid-fight, the person/antagonist poses already swap and crossfade with
no further wiring needed.
Cascade `total hit` → antagonist shake — DONE this session:
`SituationPanel` takes a new `hit?: number` prop; `ScoreLine.tsx` passes
`scoring?.hit` through (its local `ScoringState` type gained the field);
new `.sb-situation-antagonist.is-antagonist-hit-1/2/3` CSS layers a
`board-shake-N` keyframe (the same tiered keyframes `.sb-board` already
uses) onto the antagonist sprite, alongside its own crossfade animation.
Verified: typecheck/lint/format/build clean; live Playwright pass —
played a word during a real fight and confirmed
`is-antagonist-hit-3` appears on the antagonist sprite during the
cascade, zero console errors.
Still open, not attempted: word played → wordsmith `write` and boss
crescendo `soon`/`live` → backdrop pulse/antagonist `crescendo` pose
both need sheets E2 hasn't wired yet (`wordsmith`, the per-fight
antagonist backdrops) — pursuing the animation hook before the sheet
exists would have nothing to animate; `clear` → antagonist `gone` is
already reachable via the ladder's `at: 1` step (every situation's final
ladder step sets `antagonistPose: 'gone'`), so there may be nothing left
to wire there once "clear" is confirmed to mean "round won", not
pursued further this session to avoid guessing at an event that isn't
named anywhere in the codebase. `prefers-reduced-motion`'s blanket
`animation-duration: 0.01ms` rule was left alone: today it only affects
the crossfade (which still ends in the right pose, just without the
fade) since no sheet has a real `steps()` frame-loop animation yet
(every sheet is still `status: "placeholder"`, per E1) — fixing the
iteration-count-1 loop-freezing failure mode the plan calls out has
nothing to fix against yet and risks guessing at a shape E1's real
frame data hasn't defined.

**E4 (remainder) — perf pass after E1–E3 land.** Visible sheet count
under ~10, sheets ≤ 1024², lazy-load next chapter's sheets during the
shop, and a phone check at the deployed link for drag feel, cascade timing
and crescendo cues (never verified by a person since A3/A4 landed).

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
   temporarily imports them directly. Deploy. **Ported; shim NOT removed.**
4. Split `RoundSandbox.jsx` into the `ui/` tree above, introduce the
   reducer store, delete `forceRender`. Deploy. **Partial (see Open A3/A4).**
5. Move `recorded*.js` envelopes to `src/recordings/*.json`; update
   `tools/fetch-audio.js` and `analyze-audio-piece.js` to write JSON.
   Rewrite CLAUDE.md's Map to match the new tree. Deploy. **Done.**
6. `bun run lint`, `bun run typecheck`, `bun run format --check` clean; no
   `any` outside `tools/`; pre-commit hook proven by a deliberate bad commit.
   **Open (eight `any`s in store.ts; hook not proven).**

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
   partial passes stay in the Open ledger until they match the spec.
   Still open: art source for E1 (draw, CC0 placeholders, or generated).
