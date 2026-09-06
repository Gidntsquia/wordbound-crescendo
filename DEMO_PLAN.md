# Overnight demo plan — from dry-fit to a real run

Written 2026-09-06. Jaxon likes the dry-fit sandbox (Balatro-with-Scrabble,
three fixed enemies, spoils between them). This plan grows it into a demo
someone can play for ten minutes and want to play again. It is written to be
executed in one unattended overnight session: every decision that would
otherwise need Jaxon is made here, every phase ends deployed, and the stop
rules say what to do when something fails.

## Ground rules for the executing session

- Sandbox only. Nothing under `js/wordbound/` or `src/components/` changes.
  `src/sandbox/round.js` stays plain JS, no React, no timers.
- No new audio files. The three recordings are the only music. No new
  recordings can be licence-checked unattended, and synthesized pieces are
  not worth the night. Enemies beyond three REUSE the three recordings.
- No tests (CLAUDE.md). Verification is `npm run build` clean plus a real run
  of `npm run dev:sandbox` driven by the `run` skill: play a full run through
  to a win and a loss, on a phone-width viewport as well as desktop.
- One commit per phase, `SANDBOX:` prefix, then `npm run deploy` and
  `git push origin main`. Phases are ordered by value; later phases may be
  dropped, earlier ones may not.
- Stop rule: if a phase fails verification twice, `git checkout .` on it,
  note it in NIGHT_REPORT.md, and move to the next phase. Never leave main
  broken; never leave the live link broken.
- Keep the tuning panel working over every new constant (add to
  ROUND_DEFAULTS, it appears in the panel).
- Nothing sets `transform` on `.sb-tile`. Drag and FLIP own it.
- End of night: NIGHT_REPORT.md at repo root — what shipped, what was cut,
  what needs Jaxon's feel judgement (targets, prices, boss rules). Update
  CLAUDE.md's map for every new file or mechanic.

## Phase 0 — Calibrate before building (30 min)

Targets are guesses today (100 / 175 / 300). Measure before the run grows.

- Script in scratchpad (not committed): load namespace, rng, wordlist,
  lexicon, tiles, tileBags, round.js under node with a `window` shim. Play
  2,000 rounds per bag with a greedy policy (best word by
  `round.scoreFor` from wordFinder; changeout when the best word scores
  under a threshold). Record score distribution after 4 plays.
- Set TARGET_n so a greedy player on the normal bag clears round 1 at ~90%,
  round 3 (boss) at ~45% with no items and ~80% with two items. Write the
  numbers into ROUND_DEFAULTS and the measured table into round.js's
  header comment.
- Commit as its own phase so the numbers are traceable.

## Phase 1 — A longer run: two acts, six enemies, one boss per act (2 h)

The demo's spine. Today's run is three rounds and over in four minutes.

- `Sandbox.ENEMIES` in a new `src/sandbox/enemies.js`: name, recording id,
  target multiplier, act, boss flag, one-line flavour from THEME.md's voice.
  Lineup, fixed for the demo (reusing the three recordings):
  - Act 1: The Bagatelle (Für Elise) → The Moonlight (Moonlight) → boss
    Fate at the Door (Symphony 5).
  - Act 2: The Bagatelle, Reprise (Für Elise, faster target ramp) → The
    Moonlight, Third Movement (Moonlight) → final boss Fate Answered
    (Symphony 5).
- Targets: `TARGET_BASE × enemy.mult`, mult table grows roughly ×1.6 per
  enemy so items must keep pace. Act 2 starts around where act 1's boss
  ended.
- `createRun` takes the lineup instead of the three-stage array. `run.act`,
  `run.stage`, `run.enemy` exposed for the UI.
- UI: a run strip across the top — six enemy pips, current one lit, act
  divider, gold purse. Replaces the plain counter.
- Between acts: nothing special yet (the shop is Phase 3).

## Phase 2 — Tile upgrades: the bag is the deck (2 h)

Items are all flat +points/+mult today; runs feel identical. Balatro's depth
is that the deck itself changes.

- `Tiles` already carries `FLAT_ON_PLAY`, `MULT_ON_PLAY`, `MULT_ON_HOLD`
  bonuses and `Lexicon.scoreWord` already returns `bonusFlat`, `variantFlat`,
  `bonusMult` — round.js folds them in today. So this phase is: let the run
  put upgraded tiles INTO the bag and keep the bag across rounds.
- `run.deck` persists across rounds (today `makeDeck()` is called per
  round; change to draw a fresh RACK from the same persisted bag).
- Spoils offer becomes mixed: two items + one "upgrade a tile" card. Taking
  the upgrade shows the current bag as a grid; tap a tile to gild it
  (FLAT_ON_PLAY +10, or MULT_ON_PLAY +1 for vowels — pick one rule, keep it
  simple). Gilded tiles render with the existing bonus styling from the
  reference CSS.
- Show the breakdown line naming the tile bonuses when they fire so the
  player sees why the gilded E mattered.

## Phase 3 — The shop between acts (2 h)

The gold has nothing to buy. This is the phase that makes gold matter.

- `Sandbox.createShop(run, rng)`: stock of 2 items (from the item pool, not
  carried), 2 tile packs (draw 3 from the strong bag, keep one into the
  deck), 1 reroll. Prices in ROUND_DEFAULTS: ITEM_PRICE 5, PACK_PRICE 4,
  REROLL_PRICE 2. Adjust after Phase 0's numbers so an average act-1 run
  can afford one item plus one pack.
- Shows after the act-1 boss instead of the spoils offer. Spoils stay for
  regular enemies.
- UI: one screen, THEME.md voice — the shopkeeper line can come from
  `shopkeepers.js`'s text if it reads well, copied not imported (the engine
  module is not loaded in the sandbox).
- Leave with a Continue button; gold carried on.

## Phase 4 — Boss rules: the piece changes the round (1.5 h)

COMBAT_REDESIGN option (c), the layer that makes fights distinct.

- Each enemy may carry one `rule` id, applied by round.js via a small
  registry in enemies.js:
  - Fate at the Door: `four_knocks` — words of exactly 4 letters score
    double mult. (The motif.)
  - Fate Answered: `no_repeats` — a letter played this round cannot be
    played again this round (the stick refuses it, greyed).
  - The Moonlight, Third Movement: `presto` — 3 plays instead of 4, target
    scaled down ×0.8.
  - Reprise: `da_capo` — the first word's score is added again at the end
    if the round is won.
- Rule shown as a card under the target before the first play, in the
  enemy's voice. No rule for act-1 regular enemies; the demo teaches
  scoring first.

## Phase 5 — Run end and persistence (1 h)

- A proper end screen for win and loss: enemies felled, total score, best
  word of the run with its breakdown, gold earned, items carried. One
  Play Again button that reseeds.
- `localStorage['wbc.best']`: best word ever, deepest enemy reached, runs
  won. Shown small on the idle screen. Wrapped in try/catch.
- Seed shown and copyable so Jaxon can report "seed X felt wrong".

## Phase 6 — Onboarding and phone polish (1.5 h)

Jaxon plays on a phone from the live link.

- First-run overlay, three lines: tap tiles to the stick, Play to score,
  Change out to throw back. Dismiss on first tap. Stored in localStorage.
- Audit at 390×844: run strip, offer, shop and end screen all fit without
  horizontal scroll; tap targets ≥ 44px; the tuning panel and setup bar
  collapse behind one gear button on narrow screens.
- Score pop: the total flies from the stick to the score readout on Play
  (a `.sb-score-fly` element, not the tile, so the transform rule holds).

## Phase 7 — Cleanup (30 min)

- Delete `tugOfWar.js`, `TugSandbox.jsx`, `sequencedSurges.js` (CLAUDE.md
  already marks them due). Confirm nothing imports them, build, run.
- CLAUDE.md map rewritten for the sandbox section; COMBAT_REDESIGN.md gets
  a "built as of 2026-09-07" note pointing here.
- NIGHT_REPORT.md written. Final deploy, final push.

## Not tonight

New music, the shipped React app, the run map, stolen letters, achievements,
events, intents. Any change to word scoring rules beyond what a boss rule
adds. Anything that needs a licence decision or a feel judgement — those go
in NIGHT_REPORT.md for Jaxon.

## Time budget

| Phase | Est. | Cumulative |
|---|---|---|
| 0 calibrate | 0.5 h | 0.5 h |
| 1 longer run | 2 h | 2.5 h |
| 2 tile upgrades | 2 h | 4.5 h |
| 3 shop | 2 h | 6.5 h |
| 4 boss rules | 1.5 h | 8 h |
| 5 end + persistence | 1 h | 9 h |
| 6 onboarding + phone | 1.5 h | 10.5 h |
| 7 cleanup | 0.5 h | 11 h |

Phases 0–3 are the demo. If time runs short, cut from 6 backwards, but
always do 7's report.
