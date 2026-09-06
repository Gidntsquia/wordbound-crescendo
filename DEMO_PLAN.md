# Overnight demo plan — Balatro first, diverge later

Written 2026-09-06, rewritten the same day after Jaxon's direction: make
the sandbox work like Balatro to start (shop after EVERY fight, antes of
three, jokers, consumables, deck upgrades, exponential targets), then decide
where to diverge. BALATRO_NOTES.md is the reference: how Balatro works and
the term-for-term mapping. This file is the build order for one unattended
overnight session. Every decision that would otherwise need Jaxon is made
here; every phase ends deployed; the stop rules say what to do on failure.

## Ground rules for the executing session

- Sandbox only. Nothing under `js/wordbound/` or `src/components/` changes.
  `src/sandbox/round.js` stays plain JS, no React, no timers. New model
  code goes in new plain-JS files under `src/sandbox/` on the
  `window.Wordbound.Sandbox` namespace.
- No new audio files. The three recordings are the only music. Enemies
  beyond three reuse them.
- No tests (CLAUDE.md). Verification is `npm run build` clean plus a real
  run of `npm run dev:sandbox` driven by the `run` skill: play a full run
  through to a win and a loss, at desktop and 390×844.
- One commit per phase, `SANDBOX:` prefix, then `npm run deploy` and
  `git push origin main`. Phases are ordered; later ones may be dropped,
  earlier ones may not.
- Stop rule: a phase that fails verification twice is reverted with
  `git checkout .`, noted in NIGHT_REPORT.md, and skipped. Main and the
  live link are never left broken.
- Every new constant lands in ROUND_DEFAULTS so the tuning panel shows it.
- Nothing sets `transform` on `.sb-tile`. Drag and FLIP own it.
- End of night: NIGHT_REPORT.md at repo root (what shipped, what was cut,
  what needs Jaxon's feel judgement) and CLAUDE.md's map updated for every
  new file and mechanic.

## Phase 0 — Calibrate (30 min)

- Scratchpad script (not committed): load namespace, rng, wordlist,
  lexicon, tiles, tileBags, round.js under node with a `window` shim. Play
  2,000 rounds per bag with a greedy policy (best word by `round.scoreFor`
  from wordFinder; changeout when the best word scores under a threshold).
  Record the score distribution after 4 plays, and the mean best word
  length per rack.
- Output: the numbers Phase 1 needs for the tier table and Phase 2 for the
  target curve. Write the measured table into round.js's header comment.

## Phase 1 — Length tiers and études (1.5 h)

Balatro's hand types. Replaces the linear mult.

- `Sandbox.TIERS` in round.js: the table from BALATRO_NOTES §2, scaled
  from Phase 0 so a greedy normal-bag player averages ~120 per round with
  no upgrades. `round.tierFor(word)`, `run.tierLevels` (persisted across
  rounds), étude levelling adds the per-level bonus.
- `scoreWordPoints`: points = tier base + letter sum + tile flats + item
  flats; mult = tier mult + item mult, then × multiplicative parts.
- Breakdown line shows the tier name and level ("FIVE · lvl 2").
- Tuning panel: tier base/mult editable.

## Phase 2 — Movements: 3 enemies per movement, 2 movements (1.5 h)

Antes. The run is six fights: Small, Big, Boss, twice.

- `src/sandbox/enemies.js`: `Sandbox.MOVEMENTS`, each with three enemies
  {name, recording, kind: small|big|boss, flavour}. Lineup:
  - Movement I: The Bagatelle (Für Elise, small), The Moonlight (Moonlight,
    big), Fate at the Door (Symphony 5, boss).
  - Movement II: The Bagatelle, Reprise (small), The Moonlight, Presto
    (big), Fate Answered (boss).
- Targets: `MOVEMENT_BASE[n] × (1 / 1.5 / 2)`. Base II ≈ 2.5 × base I.
  Base I from Phase 0 so the greedy player clears the small blind ~90%.
- Gold: small 3, big 4, boss 5, +1 per unused play. Start purse 4.
  **Interest**: +1 per 5 gold held at round end, cap 5.
- `createRun` walks the lineup. `run.movement`, `run.stage`, `run.enemy`.
- UI: run strip across the top — movement numeral, three pips, current
  lit, purse with the interest preview ("+2 interest").

## Phase 3 — The shop after every fight (2.5 h)

The core of the night. Replaces the spoils offer entirely.

- `src/sandbox/shop.js`: `Sandbox.createShop(run, rng)` with
  - 2 **card slots**: 70% item, 15% ink, 15% étude.
  - 2 **packs**: Tile pack (3 tiles from the strong bag, keep 1 into the
    deck), Ink pack (3 inks, keep 1), Étude pack (3 études, keep 1).
    PACK_PRICE 4.
  - **Reroll**: 5, +1 per reroll, resets per shop.
  - Items priced by rarity: common 3–5, uncommon 5–7, rare 8. Sell for
    floor(price/2). **5 item slots.** 2 consumable slots.
  - `shop.buy(slot)`, `shop.sell(itemIndex)`, `shop.reroll()`,
    `shop.openPack(slot)` → `run.pack = {kind, choices}` → `run.pick(i|null)`.
- UI: one screen after every won fight. Purse, the two rows, Reroll, Next
  Fight. Held items shown as a row of five with sell buttons. Consumables
  usable from the round screen (Phase 4) or the shop.
- Voucher slot: NOT tonight.

## Phase 4 — Inks: the deck is the build (1.5 h)

Tarot. Tile enhancements exist in Lexicon scoring already; nothing
creates them.

- `run.deck` persists across rounds (draw a fresh RACK from the same bag
  each round; the bag is the deck).
- `Sandbox.INKS` in `src/sandbox/inks.js`, each targeting 1–2 tiles chosen
  from the current case, using the existing Tiles bonuses:
  - Gilt: FLAT_ON_PLAY +20. Bold: MULT_ON_PLAY +2. Steel: MULT_ON_HOLD
    ×1.2 (uses the existing hold path). Blank: tile becomes a wildcard.
  - Vowel Shift: tile becomes a vowel of choice. Erase: destroy a tile.
    Coin: +gold (Hermit-style: double gold up to 10).
- Consumable row on the round screen; tapping an ink enters "choose a
  tile" mode on the case; confirm applies it. Inked tiles use the
  reference CSS bonus styling, breakdown line names them when they fire.

## Phase 5 — Items that are not flat (1.5 h)

The joker roster. Today's five are all flat. Add twelve so a build can
exist. Scoring hook: items fire left to right in the held order.

- Common: Brass Nib (+10 pts), Second Ink (+1 mult), Vowel Song (+3 mult
  per vowel played), Hard Consonant (+15 pts per K/Q/X/Z/J), Short Form
  (+4 mult if word ≤ 4), Long Form (+30 pts if word ≥ 6).
- Uncommon: Half Note (×1.5 mult), Refrain (+1 mult each play this run,
  scaling), Coda (last play of the round ×2), Anagram (+20 pts if the word
  uses a tile that was inked), Miser (+1 gold per unused changeout).
- Rare: Double Stop (×2 mult), Fermata (+1 play per round).
- Drag to reorder the item row (reuse dragReorder if it fits; else
  left/right buttons).

## Phase 6 — Tempo markings: boss rules (1 h)

- Rule registry in enemies.js, applied by round.js at creation:
  - Fate at the Door: `four_knocks` — 4-letter words ×2 mult.
  - The Moonlight, Presto: `presto` — 3 plays, target ×0.8.
  - Fate Answered: `no_repeats` — a letter played this round cannot be
    played again (stick refuses it, greyed).
- Rule card under the target, in the enemy's voice. Bosses only.

## Phase 7 — Skip, end screen, persistence (1 h)

- Small and Big enemies may be **skipped** for a favour: Free Pack
  (next shop's first pack is free), Coupon (next shop everything free
  except packs), Bounty (+8 gold). Boss cannot be skipped.
- End screen for win and loss: enemies felled, best word with breakdown,
  gold, items. Play Again reseeds. Seed shown and copyable.
- `localStorage['wbc.best']` (best word, deepest enemy, wins) in try/catch.

## Phase 8 — Onboarding, phone, cleanup (1.5 h)

- First-run overlay, three lines, dismissed on first tap, remembered.
- Audit at 390×844: strip, shop, pack pick, end screen fit without
  horizontal scroll; tap targets ≥ 44px; tuning panel and setup bar behind
  one gear button on narrow screens.
- Score fly from stick to score readout (`.sb-score-fly`, not the tile).
- Delete `tugOfWar.js`, `TugSandbox.jsx`, `sequencedSurges.js`. CLAUDE.md
  map rewritten; COMBAT_REDESIGN.md gets a "built as of 2026-09-07, see
  DEMO_PLAN.md" note. NIGHT_REPORT.md. Final deploy and push.

## Not tonight

Vouchers, spectral-tier consumables, editions and seals, stakes, endless,
new music, the shipped React app, the run map, stolen letters,
achievements, events, intents, and every divergence in BALATRO_NOTES §3.
Any licence decision or feel judgement goes in NIGHT_REPORT.md for Jaxon.

## Time budget

| Phase | Est. | Cumulative |
|---|---|---|
| 0 calibrate | 0.5 h | 0.5 h |
| 1 tiers + études | 1.5 h | 2 h |
| 2 movements + interest | 1.5 h | 3.5 h |
| 3 shop | 2.5 h | 6 h |
| 4 inks + persistent deck | 1.5 h | 7.5 h |
| 5 item roster | 1.5 h | 9 h |
| 6 boss rules | 1 h | 10 h |
| 7 skip + end + persistence | 1 h | 11 h |
| 8 onboarding + cleanup | 1.5 h | 12.5 h |

Phases 0–3 are the demo. Cut from 7 backwards if short, but always write
the report and never skip cleanup's CLAUDE.md update for what did ship.
