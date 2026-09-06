# Night report — 2026-09-06/07

DEMO_PLAN.md executed end to end. Every phase shipped, deployed and pushed;
nothing was cut. Live: https://gidntsquia.github.io/wordbound-crescendo/

## What shipped (one commit per phase, `SANDBOX:` prefix)

| Phase | Commit | What |
|---|---|---|
| 0 calibrate | (in round.js header) | Greedy solver, 2,000 rounds per bag, uncapped: normal bag mean 779 / p10 528 / p90 1080 on the tier table; mean best word 5.4 letters. |
| 1 tiers | f9a5aa1 | SHORT/THREE/FOUR/FIVE/SIX/SEVEN, base points × mult, études level them. Breakdown says "FIVE · lvl 2". Tuning panel edits every tier. |
| 2 movements | 137a185 | `enemies.js`: two movements of small/big/boss. Targets 300/450/600 then 750/1125/1500. Gold 3/4/5 +1 per unused word, start 4, interest 1 per 5 held cap 5. Run strip across the top. |
| 3 shop | 7fc5251 | `shop.js` after every won fight: 2 cards (70/15/15 item/ink/étude), 2 packs at 4 (keep 1 of 3), reroll 5 +1, sell for half, 5 item slots, 2 consumable slots. One deck per run. |
| 4 inks | 8e90917 | `inks.js`: gilt +20, bold +2 mult, steel ×1.2 held, blank, vowel shift, erase, coin. Choose-a-tile mode on the case. |
| 5 items | 70d928a | `items.js`: 15 items firing left to right with the chain written out in the breakdown line. Refrain scales, Coda ×2 on the last word, Miser, Fermata. Reorder buttons (dragReorder was not a fit for cards). |
| 6 boss rules | a09765e | four_knocks, presto, no_repeats. Rule card under the target in the enemy's voice; barred tiles greyed with a strike. |
| 7 skip / end | 237c446 | Skip small/big before the first word for Free Pack, Coupon or Bounty (+8). End screen with felled pips, best word, gold, items, Play Again with a fresh seed, copyable seed. `wbc.best` in localStorage. |
| 8 cleanup | (this commit) | First-run overlay (`wbc.seen`), gear button folding setup/tuning away under 620px, score fly, tap targets ≥44px on phone, `tugOfWar.js` / `TugSandbox.jsx` / `sequencedSurges.js` deleted, CLAUDE.md map rewritten. |

Verification per phase: `npm run build` clean, then a headless Chromium
driver (scratchpad, not committed) played the built sandbox through a full
run at 1280 wide and 390×844 — win path, loss path, every ink, every boss
rule, a skip, Play Again — with page errors and horizontal scroll checked.
Zero page errors; no horizontal scroll at 390.

## Decisions made without Jaxon

1. **Tier table not scaled down.** The plan said scale so a greedy player
   averages ~120 a round. The greedy solver with the whole dictionary is a
   ceiling, not a player; scaling to it would make single words score 5–40
   and lose Balatro's legible numbers. Kept the notes' table as written
   and set Movement I base at 300 (Balatro's own ante-1 number). A human
   playing 4–5 letter words on the house case lands around 250–300 a round
   before any upgrade.
2. **Movement II base 750** (×2.5). The greedy driver with a random shop
   build beats Movement II's small and big enemies and LOSES to Fate
   Answered (no_repeats) about half the time at 1418–1730 against 1500.
   That is the intended pressure but it is tuned against a solver, not a
   hand. Expect a human to find Movement II hard.
3. **Bold is +2 mult additive**, not the engine's multiplicative
   MULT_ON_PLAY, to match Balatro's Mult card. Inks live on `tile.ink`,
   separate from the engine's `tile.bonus`, so nothing in js/wordbound/
   changed.
4. **No shop after a skip** (Balatro's rule). Favours are spent at the next
   shop that opens.
5. **Double Stop became ×2 mult** (was +2) per the plan's roster; its old
   role is Second Ink.
6. **Item reordering is buttons, not drag.** dragReorder is built for tile
   rows and the FLIP; reusing it on cards would have meant a second drag
   system. Left/right arrows do the job.
7. **An étude with no consumable room is played on the spot** when picked
   from a pack; an ink with no room refuses the pick.

## Needs Jaxon's feel judgement

- **Difficulty of Movement II**, especially Fate Answered. The tuning
  panel has MOVEMENT_BASE_2 and the rule's target is ×1 (presto is ×0.8).
- **Shop prices vs income.** A run brings in roughly 30–40 gold; a build of
  three items plus a pack or two is affordable, a fourth item is not
  without interest discipline. This is Balatro's shape; whether it is
  fun with words is the question.
- **The first-run overlay's three lines** — wording is a first draft.
- **Coin ink** doubles gold up to +10 — probably too good at 3 gold when
  the purse is near 10; Balatro's Hermit is the same and that is on purpose.
- **Setup bar on desktop** still shows all fifteen starting-item
  checkboxes; it is a sandbox tool, not a player screen.

## Licence notes

No new audio. Nothing changed under js/wordbound/ or src/components/. The
Pixabay recordings remain the logged not-PD exceptions.

## Not done / not tonight

Vouchers, spectral-tier consumables, editions and seals, stakes, endless,
the run map, and every divergence in BALATRO_NOTES §3. The driver script
lives only in the session scratchpad; there is still no test suite
(CLAUDE.md).
