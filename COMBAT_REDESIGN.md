# Combat redesign — Balatro with Scrabble

Written 2026-09-05 from Jaxon's decision. This replaces the 2026-09-04 "set
the phrase to words" plan, which is abandoned: combat is no longer real-time
and the rope goes away.

**Built as of 2026-09-07, see DEMO_PLAN.md** — the round below shipped as
`src/sandbox/round.js`, and the run around it (movements, shop, inks, items,
boss rules, skip, end screen) followed DEMO_PLAN.md; NIGHT_REPORT.md says
what landed and what was cut. The rest of this file is the original plan.

## The loop

A fight is one scoring round against a piece of music.

- The enemy sets a **point target**.
- The player has **4 words** (plays) and **3 changeouts** (discards).
- Each play: assemble a word from the rack on the composing stick, push it,
  score it, rack refills from the bag. Each changeout: throw back any tiles,
  draw replacements. Neither refills the other.
- **Reach the target → win.** Run out of words below it → lose.
- Winning with words unspent pays **bonus gold** per word left.
- Gold buys **items** and **new tiles** in a shop between fights.

## What already exists to build on

- `Lexicon.scoreWord(word, tilesUsed, rackCapacity)` — the per-word score.
- `Tiles` bonuses: `FLAT_ON_PLAY`, `MULT_ON_PLAY`, `MULT_ON_HOLD`, and the
  Volatile variant. These are the "enhanced card" layer already; the shop
  sells tiles carrying them.
- `src/sandbox/tileBags.js` — the bag the rack draws from becomes the deck.
- `src/sandbox/wordFinder.js` — stays as the (priced) assistant.
- The case / composing-stick tile play and FLIP animation — unchanged.
- `js/wordbound/items.js` — item definitions for the shop; check what still
  fits a turn-based round before reusing.

## What goes away in the sandbox

`tugOfWar.js` (rope, pushers, bursts, dB ramp, push lock), `sequencedSurges.js`,
the surge/attack lanes in `TugSandbox.jsx`, and the recorded-piece playback
(`audioPiece.js`, `recordedFurElise.js`, `recordedMoonlight.js`) — a
turn-based round has no clock to sync a recording to, which also closes the
one exception to the synthesized-only rule.

## Decisions still open

1. **What the music does now.** Options, cheapest first: (a) soundtrack only,
   the piece names the "blind" and sets the target; (b) the piece's dynamics
   curve shapes the round — e.g. the target ramps as the piece plays, or a
   forte passage doubles the next play's score; (c) piece-specific rules
   (the Metronome caps word length, the Swarm swaps a tile every play), the
   Balatro boss-blind analogue. Recommend (a) for the first build, (c) as the
   layer that makes fights distinct later.
2. **Target numbers.** Need a baseline: average scoreWord for a 7-tile normal
   bag over 4 plays, then set the first target around 60% of that and scale.
   Measure before tuning.
3. **Do sequencer pieces still play during a round?** Yes if (a): the piece
   is the fight's soundtrack from first play to result.
4. **Changeout size.** Whole rack or chosen tiles? Recommend chosen tiles,
   Balatro-style.

## Build plan (sandbox only)

Each phase ends with a playable `npm run dev:sandbox`, verified by running it.

1. **Round model.** New `src/sandbox/round.js`: target, plays left,
   changeouts left, running score, bag/rack draw, win/lose, gold payout.
   Plain JS, no React, no timers. Wire into TugSandbox (rename later): score
   readout, target, counters, play and changeout buttons. Delete the rope UI.
2. **Scoring detail.** Show the score breakdown per play (letter sum, bonuses,
   mults) Balatro-style so tile bonuses read. Tuning panel over target and
   payout constants.
3. **Shop.** One shop screen after a win: buy tiles (with bonuses) into the
   bag, buy items, spend gold. Then next fight with a higher target. This is
   the smallest "run": fight → shop → fight.
4. **Music as the blind.** Pick the piece per fight; name and target come
   from it; sequencer plays underneath. Piece-specific rules come after
   the base loop is fun.
5. **Cleanup.** Remove tugOfWar/surges/recorded playback, update CLAUDE.md
   and THEME.md, redeploy the sandbox as the public link.

## Deliberately not in this plan

The run map, intents, events, achievements, stolen-letter persistence, and
the shipped React app / engine `duel.js`. The sandbox stays the thing being
iterated on.
