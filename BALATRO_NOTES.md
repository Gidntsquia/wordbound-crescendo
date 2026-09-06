# Balatro, taken apart — and mapped onto Wordbound

Written 2026-09-06 at Jaxon's direction: build the sandbox to be Balatro
first, then decide where to diverge. Part 1 is how Balatro actually works
(numbers checked against balatrowiki.org). Part 2 is the one-to-one mapping.
Part 3 is the list of places we could diverge, for Jaxon to pick from later.

## 1. How Balatro works

### The run

- 8 **antes**. Each ante is 3 **blinds** in order: Small, Big, Boss.
- Each blind is one scoring round: reach the chip target or lose the run.
- Small and Big blinds may be **skipped** for a Tag (a one-off perk: a free
  pack, a free reroll, double the next tag, a coupon for a free shop...).
  The Boss cannot be skipped.
- **The shop opens after every blind**, won or skipped. Three shops per
  ante, 24 per run. This is where the run is actually built.

### The round

- 4 **hands** (plays), 3 **discards**, hand size 8. A hand plays 1–5 cards.
- Play or discard, then draw back up to hand size. Neither refills the other.
- Reach the target with hands to spare and the leftover hands pay out.

### Targets (the scaling that forces builds)

Base chips per ante, then Small ×1, Big ×1.5, Boss ×2:

| Ante | Base | Small | Big | Boss |
|---|---|---|---|---|
| 1 | 300 | 300 | 450 | 600 |
| 2 | 800 | 800 | 1,200 | 1,600 |
| 3 | 2,000 | 2,000 | 3,000 | 4,000 |
| 4 | 5,000 | 5,000 | 7,500 | 10,000 |
| 5 | 11,000 | | | 22,000 |
| 6 | 20,000 | | | 40,000 |
| 7 | 35,000 | | | 70,000 |
| 8 | 50,000 | | | 100,000 |

Growth is ~×2.5 per ante. Additive bonuses cannot keep up; by ante 4 the
player needs multiplicative mult (×1.5, ×2, ×3 jokers) stacked on additive
ones. That is the whole design: the shop offers additive things early and
the player must find the multiplicative engine before the curve outruns them.

### Scoring: chips × mult

1. The played hand's **type** sets base chips and base mult (High Card 5×1,
   Pair 10×2, Two Pair 20×2, Three of a Kind 30×3, Straight 30×4, Flush 35×4,
   Full House 40×4, Four of a Kind 60×7, Straight Flush 100×8).
2. **Planet cards** level a hand type permanently: e.g. Pair +15 chips +1
   mult per level, Flush +15 chips +2 mult.
3. Each **scoring card** adds its rank as chips (2–10 face value, J/Q/K 10,
   A 11), then its enhancement / edition / seal fires.
4. **Held-in-hand** effects (Steel ×1.5 mult, Gold $3, some jokers).
5. **Jokers fire left to right.** Order matters: +mult before ×mult.
6. Total = chips × mult, added to the round score.

### The three card layers (the deck IS the build)

- **Enhancements** (one per card, from Tarot cards): Bonus +30 chips,
  Mult +4 mult, Wild (any suit), Glass ×2 mult but 1-in-4 to shatter,
  Steel ×1.5 mult while held, Stone +50 chips with no rank or suit,
  Gold +$3 if held at round end, Lucky 1-in-5 +20 mult and 1-in-15 +$20.
- **Editions** (one per card or joker): Foil +50 chips, Holographic +10
  mult, Polychrome ×1.5 mult, Negative +1 joker slot.
- **Seals**: Gold $3 when played, Red retrigger, Blue makes a Planet if held
  at round end, Purple makes a Tarot when discarded.

### Jokers (the run-defining layer)

- 5 slots. ~150 jokers. Rarity: Common 70% / Uncommon 25% / Rare 5%,
  Legendary only from a Spectral card.
- Prices: Common $1–6, Uncommon $4–8, Rare $7–10. Sell for floor(cost/2).
- Kinds: flat +chips / +mult, ×mult, conditional (per suit, per hand type,
  per card count), scaling (grows each round or on a trigger), economy
  ($ per round, interest cap), utility (+hand size, retriggers, copies).

### Consumables

- 2 slots. **Tarot** (22): enhance 1–2 selected cards, convert suit, copy a
  card, destroy a card, give money, make a joker. **Planet** (12): level a
  hand type. **Spectral** (18, rare): powerful with a cost — destroy cards,
  add seals, legendary joker.

### Money

- Start $4. Blind rewards: Small $3, Big $4, Boss $5. +$1 per unused hand.
- **Interest**: $1 per $5 held at round end, capped at $5 (so $25 is the
  target purse). This is what makes "don't spend" a real strategy.
- **Vouchers** ($10, one per shop, permanent): +1 shop slot, +1 hand, +1
  discard, +1 hand size, cheaper rerolls, more Planets/Tarots in shop...

### The shop

- 2 card slots (71% Joker, 14% Tarot, 14% Planet), 2 booster packs, 1
  voucher, Reroll ($5, +$1 each, resets per shop).
- Booster packs: Standard (playing cards, some enhanced), Arcana (Tarots),
  Celestial (Planets), Buffoon (Jokers), Spectral. Open, pick 1 of 3
  (or 2 of 5 for the big version).

### Why it works (the parts worth copying on purpose)

1. Exponential target, additive-then-multiplicative tools. Forces a build.
2. Every round is followed by a shop, so a bad round is a shop with less
   money, not a dead end.
3. Three layers of build (deck cards, jokers, hand levels) that interact
   through ordering — the "aha" of watching the scoring animation.
4. Skips and interest give the player a reason NOT to do the obvious thing.
5. Boss rules break one habit each, so the deck must be flexible.
6. Scoring is itemised on screen, one number at a time. The build is legible.

## 2. The mapping onto Wordbound: Crescendo

| Balatro | Crescendo | Status |
|---|---|---|
| Playing card | Letter tile (Scrabble value = chips) | exists |
| Hand (8 cards) | The case (7 tiles) | exists |
| Played hand (1–5 cards) | Word on the composing stick | exists |
| Hand type + level | **Word length tier** (2, 3, 4, 5, 6, 7+) with its own base points × mult, levelable | today mult = length, linear; needs a tier table |
| Planet card | **Étude** — levels one length tier | new |
| Chips × mult | Points × mult | exists |
| Enhancement / edition / seal | Tile bonuses FLAT_ON_PLAY / MULT_ON_PLAY / MULT_ON_HOLD, Volatile | scoring exists in Lexicon; nothing puts them into the bag yet |
| Tarot card | **Ink** — enhances a chosen tile, converts a letter, destroys a tile | new |
| Joker (5 slots) | **Item** (5 slots), sellable | exists, only flat +points/+mult so far |
| Spectral | later | — |
| Deck | The tile bag, persisted across rounds | bag is rebuilt per round today |
| Blind | An enemy: a piece of music | exists |
| Boss blind rule | **Tempo marking**: a rule the piece imposes | new |
| Ante (3 blinds) | **Movement** (3 enemies, third is the boss) | new |
| Skip a blind → Tag | Skip an enemy → a favour | new |
| Money, interest | Gold, interest | gold exists; no interest |
| Shop after every blind | **Shop after every enemy** | spoils only today; shop is new |
| Voucher | Permanent run upgrade | later |
| Booster pack | Pack: 3 tiles / 3 inks / 3 études, keep one | new |
| Held in hand | Tiles left in the case after the play | scoring hook exists |

### Length tier table (starting proposal, replaces linear mult)

Tune after Phase 0 measurement. Scrabble letter sum is the "chips".

| Length | Base points | Base mult | Étude per level |
|---|---|---|---|
| 1–2 | 0 | 1 | +5, +1 |
| 3 | 5 | 2 | +10, +1 |
| 4 | 10 | 3 | +10, +1 |
| 5 | 20 | 4 | +15, +2 |
| 6 | 35 | 5 | +20, +2 |
| 7+ | 60 | 7 | +30, +3 |

Points = tier base + letter sum + tile flats + item flats.
Mult = tier mult + item mult, then × multiplicative items and tile ×mults.

### Target curve (Balatro's shape, our scale)

Measure the greedy baseline first (DEMO_PLAN Phase 0). Then set movement
bases so movement n ≈ 2.5 × movement n−1, enemy ×1 / ×1.5 / ×2 within.

## 3. Where we could diverge (Jaxon's call, later)

Not to be built until the Balatro-faithful loop is playable and felt.

1. **The music does something.** Balatro's blinds are static. Ours play a
   recording. Cheapest: the piece's dynamics curve ramps the target as the
   round goes on, or a crescendo doubles the NEXT play. This is the game's
   whole pitch and nothing in Balatro has it.
2. **Words are not poker hands.** A rack of 7 tiles rarely holds a 7-letter
   word; a hand of 8 cards nearly always holds a pair. So discards matter
   more here, racks go dead, and "single tile always plays" is our High
   Card. Tiers may need to be flatter than Balatro's, and changeouts
   may need to be cheaper (a 4th changeout, or partial refunds).
3. **Word quality, not just length.** The dictionary is a second axis
   poker lacks: rare words, Shakespeare's words (THEME.md), words in the
   piece's key (words containing the note letters A–G?), words that are
   also musical terms. These are "hand types" poker cannot have.
4. **Letter economy as the deck.** Stolen letters (the meta) fits here:
   a letter you have not won back cannot appear in the bag. Balatro's
   deck is fixed at 52; ours can start at 20 letters and grow.
5. **Position on the stick.** Scrabble's premium squares: the stick could
   carry a double-letter slot or a triple-word slot that moves per round.
6. **Held tiles as instruments.** MULT_ON_HOLD exists already; a "chord"
   mechanic — tiles left in the case that spell a 2–3 letter word score
   too — is a Wordbound-only idea.
7. **No skip, or a musical skip.** Skipping a movement might mean hearing
   less of the piece; the favour could be tied to the recording.

The rule for deciding: copy Balatro wherever the mechanic is about
economy, pacing and legibility; diverge wherever the mechanic is about what
a "hand" is, because that is where words and music are not cards.
