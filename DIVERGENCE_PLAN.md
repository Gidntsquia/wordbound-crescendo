# Divergence plan — where Crescendo stops being Balatro

Written 2026-09-07 after Jaxon played a full run through Movement III and
called the loop, the economy and the item power level good as they are. The
Balatro-faithful phase (DEMO_PLAN.md, NIGHT_REPORT.md) is done; this file is
the build order for the features that make the game its own. BALATRO_NOTES.md
§3 is the brainstorm this was chosen from.

Legal framing, so nobody over-corrects: game mechanics are not
copyrightable. The exposure is in EXPRESSION — names, art, jargon, audio
feel. The UI already says movements / inks / études / tempo markings for
antes / tarots / planets / boss blinds, and as of today the jokers are
QUILLS (the player is on the words side; the code keeps `item`). The
design goal is the bigger one: a player who has played Balatro should feel
a different game within one round.

## Shipped today (2026-09-07)

- **Quills.** On-screen rename of the item layer. Code, files, tuning keys
  and `run.items` are unchanged.
- **Climax** (uncommon, 7 gold): ×3 mult if the word lands on a crescendo.
  The first CRESCENDO EFFECT — see the contract below.
- **Libretto** (uncommon, 6 gold): ×2 mult if the word is a musical term.
  The first SECOND-AXIS quill (word kind, not word length). The list is
  `MUSIC_WORDS` in items.js; short common terms (NOTE, KEY, HARP, BEAT) are
  in on purpose so it fires a few times a run.

## Shipped today (2026-09-07, part 2)

- **Premium slots.** One stick position per round (rolled at creation,
  weighted toward the middle) may carry DOUBLE LETTER, TRIPLE LETTER or
  DOUBLE WORD (`Sandbox.PREMIUM_KINDS`, `round.premium`, tuning keys
  `PREMIUM_CHANCE/DL/TL/DW` in round.js). Drawn on the empty stick as a
  dashed placeholder before any tile is placed; the tile that lands there
  picks up a matching dashed rim. Scored as its own `slot` step between the
  letter steps and the items, narrated by the cascade with its own pop.

## Shipped today (2026-09-07, part 3)

- **Stolen letters, the meta.** `src/sandbox/stolenLetters.js`: `wbc.letters`
  in localStorage, a JSON array of won letters. A fresh install locks J, Q,
  X, Z, K, W (`STOLEN_ORDER`'s first six; vowels are never touched), leaving
  20 available. `tileBags.js`'s `createBagDeck` and the shop's tile pack
  (shop.js) both drop any letter still locked. Felling a boss (any of the
  three, `run.next()` in round.js) pauses the win with `run.letterChoice =
  { options, last }` — up to three still-missing letters, offered win or
  lose the round after; `run.pickLetter(letter)` persists the pick and
  resumes the shop/finish flow. RoundSandbox.jsx's `phase === 'letter'`
  screen shows the pick; the gear panel's alphabet row shows the missing
  ones hollow. Packs stay limited to won letters (the plan's open question
  answered by inference from "missing letters cannot appear in any bag,
  pack or ink result").

## The crescendo-effect contract

Every quill flagged `crescendo: true` in items.js follows these rules, so
the player learns one reflex and it works for all of them.

1. **The window.** `audioPiece.js` curates the dense surge list down to the
   BIG swells (`mag ≥ 0.6`, at least 12 s apart), which is one every 15–20 s
   in every recording. A word played from 0.4 s before the peak to **1.0 s
   after it** counts. The leniency is on the late side because the player
   hears the swell and then taps. `Sandbox.CRESCENDO` holds the numbers;
   `seq.crescendo()` answers `{ phase: 'idle' | 'soon' | 'live', secs }`.
2. **Telegraph.** Five seconds before the peak the card switches from grey
   to a countdown: a draining ring plus "crescendo in 4 … 3 … 2 … 1". The
   swell is on screen before it is audible.
3. **Clarity.** Idle: the card sits at 45 % opacity, desaturated, reading
   "waiting for a crescendo". Live: full brass glow, throbbing, badge
   reads "NOW · 0.8s" counting down the window. A shimmer plays the moment
   the window opens. The preview score above the stick includes the ×3
   while the window is open, so what the player sees is what lands.
4. **Scoring.** `round.playWord` asks the run's `crescendo()` callback at
   the instant of the play (round.js); the item reads `ctx.crescendo`.
   Headless rounds have no callback and never fire it.

Ideas that fit the contract, for later:

- **Fortissimo** — the crescendo's own points: +50 points × the swell's
  `mag`, so bigger swells pay more.
- **Anticipation** — a word played during the COUNTDOWN (not the window)
  gets +2 mult; the opposite reflex to Climax.
- **Sustain** — a crescendo hit extends the window for the NEXT play by 2 s.

Tuning to watch on the phone: whether 5 s is enough warning to assemble a
word (it is probably not, if the rack is cold — the honest play is to have
a word ready and hold it), and whether one window per 15–20 s is too
frequent once the player has two crescendo quills.

## Second-axis quills (word kind)

Poker has hand types; words have kinds the dictionary already knows. One
shipped (Libretto). Candidates, cheapest first:

- **Dissonance** — ×2 mult for a word with no A, E, I, O, U (RHYTHM, MYTH,
  LYNX, CRYPT). A real word class and on theme.
- **Notation** — +4 mult per letter in A–G (the note names). Rewards
  BADGE, FACADE, CABBAGE; every rack has some.
- **Palindrome** — ×3 mult; rare enough to be a build-around.
- **Bard** — ×2 mult for a word in Shakespeare's vocabulary. Needs a word
  list; `js/wordbound/shakespeareGuide.js` may seed it.
- **Rhyme** — +20 points if the word ends in the same two letters as the
  last word played this round. Sequence, not kind, but the same axis.

## Stolen letters as the meta (next big build)

Balatro's deck is fixed at 52. Ours can start small and grow — and the
world already says the enemy stole the alphabet (THEME.md, ROADMAP.md).

- **Starting state.** A new player's bag holds a reduced alphabet: the
  common letters plus a few of the rare ones, roughly 20 distinct letters.
  Missing letters cannot appear in any bag, pack or ink result. Vowels
  are never stolen.
- **Winning letters back.** Felling a boss offers a choice of two or three
  stolen letters; the player takes one home. It joins every future run's
  bag. A lost run keeps letters already won (the meta never punishes).
- **Persistence.** `wbc.letters` in localStorage, a JSON array of won
  letters, next to `wbc.best` and `wbc.seen`. The gear panel shows the
  alphabet with the missing ones hollow.
- **Which letters are stolen first.** The high-value ones the player will
  miss: J, Q, X, Z, K first, then W, V, Y, then the mid-value consonants.
  `tileBags.js` gets a `stolen` filter applied at `createBagDeck`.
- **Feel target.** The first runs play with an easy, vowel-rich alphabet
  and low targets. Each letter won back is a felt change to every rack
  after it. Tie the tempo markings in: no_repeats bites harder with a
  small alphabet, sotto_voce less.
- **Not doing.** No letter can be lost once won. No currency for letters
  beyond beating a boss. No shop sale of letters (that is Balatro's
  Standard pack; keep the meta separate from the run economy).

Open for Jaxon: does a run START with the full alphabet available in the
shop's tile packs, or are packs also limited to won letters? Plan says
limited; it makes the meta legible.

## Premium slots on the stick

Scrabble's premium squares, one at a time, moving. Nothing in Balatro has
position.

- **The slot.** One position on the composing stick carries a bonus for the
  round: DOUBLE LETTER (the tile there scores ×2 letter points), TRIPLE
  LETTER, or DOUBLE WORD (×2 mult). It is drawn on the stick as an empty
  premium square before any tile is placed.
- **Where it sits.** Rolled per round from the seed: position 1–5 on the
  stick, weighted toward the middle so short words can still reach it.
  Bosses may fix it (a tempo marking: "the premium is the last tile").
- **Interaction with drag.** The stick already supports reordering
  (dragReorder.js); the premium makes the order matter, which is the
  point. A tile dropped on the slot shows the bonus live in the preview.
- **Scoring.** A `slot` step in `scoreSteps` between the letter steps and
  the items, narrated by the cascade with its own pop and sfx. Tuning
  keys: `PREMIUM_DL`, `PREMIUM_TL`, `PREMIUM_DW`, `PREMIUM_CHANCE` (a
   round may have none).
- **Growth.** Études or a rare quill could add a second premium slot; an
  ink could pin one to a tile ("this tile carries its own double letter").
- **Feel target.** The player rearranges a word on the stick to land a Q
  on the triple letter. That single motion is not in Balatro.

## Order of work

1. Play Climax and Libretto on the phone; tune the window and countdown.
2. ~~Premium slots~~ shipped 2026-09-07 — play it on the phone and tune
   `PREMIUM_CHANCE`/`DL`/`TL`/`DW`.
3. ~~Stolen letters~~ shipped 2026-09-07 — play a full run on the phone to
   feel the locked alphabet and the boss letter-choice screen.
4. More crescendo and second-axis quills once 1–3 have settled the feel.
