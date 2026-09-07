# Next-level plan — from a good sandbox to a game people finish

Written 2026-09-07, after DIVERGENCE_PLAN.md items 1–4 all shipped in one day;
revised the same day to Jaxon's cuts (below). The build order for what comes
after the divergence work: each stage gated on a played run on the phone,
not a build passing. BALATRO_NOTES.md §3 is still the rule for where to
diverge: copy Balatro on economy, pacing and legibility; diverge on what a
hand is.

Jaxon's decisions, 2026-09-07:

- **No enemy strikes.** The music never attacks. Crescendos stay a reward
  layer (the crescendo quills), never a punishment. The ROADMAP.md
  strike/parry pitch is dropped for the sandbox.
- **Chords are one quill**, not a base mechanic.
- **From run choices, only keys** (difficulty tiers). No movement choice,
  no encore, no daily seed.
- **Quill discovery** is in.
- **Identity and polish, all of it**, minus strike/parry sounds.
- **Delete the old app** (`/app.html`, `wordbound.html`, `css/`, and the
  engine modules only they used).

## Stage 1 — Feel pass (before anything new)

Nine quills, premium slots and the letter meta shipped untested. Play three
full runs on the phone, then tune before building on top of it.

- **Crescendo window.** Is 5 s warning enough to hold a word ready? If not:
  8 s countdown, or the card shows "next crescendo in 14 s" at all times
  (`Sandbox.CRESCENDO`, `seq.crescendo()`).
- **Crescendo frequency.** One window per 15–20 s with two crescendo quills
  may be a ×3 every other word. If so, raise the `mag ≥ 0.6` cut or the
  12 s spacing in audioPiece.js.
- **Premium slots.** `PREMIUM_CHANCE/DL/TL/DW`. Does the player actually
  drag a tile onto the slot? If the drag is never used, the slot needs to
  be more visible or the bonus bigger.
- **Locked alphabet.** Is a 20-letter start too easy, and does the boss
  letter-choice screen feel like a prize?
- **Movement II/III difficulty** — still tuned against a solver
  (NIGHT_REPORT.md). `MOVEMENT_BASE_2/3`.
- Write the numbers that change into `ROUND_DEFAULTS` and one line each
  here. Gate: Jaxon says the three shipped systems feel right.

## Stage 2 — Harmony: the chord quill

BALATRO_NOTES §3.6, as a single quill. **Harmony** (rare): after a play,
if two or three tiles left in the case spell a word, that word's base
points are added as a `chord` step in the cascade (points only, no mult).
Without the quill nothing in the case scores, so the base game is
unchanged.

- `scoreWordPoints` gains the `chord` step after the items, only when an
  item sets `acc.chord`; the cascade narrates it with its own pop.
- The chord is found with the existing anagram map in wordFinder.js over
  the tiles still in the case (longest word wins, ties by points).
- Steel ink (held ×1.2) is its natural partner and needs no change.
- Gate: does a Harmony owner start leaving letters behind on purpose?

## Stage 3 — Keys (difficulty tiers)

Balatro's stakes, named for musical keys. After a first win the title
screen offers the next key; each is the one before plus one rule.

- C major — the base game.
- G major — targets ×1.15.
- D major — one fewer swap per round.
- A minor — the premium slot never appears on boss rounds.
- E minor — shop reroll starts at 7.
- B minor — no skip favours.

`wbc.key` next to `wbc.best`; the end screen shows wins per key; the
tuning panel exposes each key's numbers. Gate: G major is a real step up
and B minor is beatable by Jaxon.

## Stage 4 — Quill discovery

The second meta after stolen letters. New quills are not in the shop or
pack pool until first discovered.

- `wbc.quills` in localStorage, a JSON array like `wbc.letters`; a
  fresh install knows ~10 starting quills (the plain length and mult
  ones), the rest hidden.
- Discovery: felling a boss offers a quill alongside the letter choice
  (one screen, two prizes), and any run reaching Movement III reveals one
  more at random. A lost run never loses a quill.
- shop.js and the packs filter the pool by `wbc.quills`; the gear panel
  gains a quill list with the undiscovered ones hollow, next to the
  alphabet row.
- Gate: run five still shows a quill the player has not seen.

## Stage 5 — Identity and polish

The pass before a build people outside the household play.

- **Delete the old app.** Remove `index.html` + `src/main.jsx`, `src/App.jsx`
  and `src/components/`, `wordbound.html`, `css/`, and the engine modules
  only they used (duel, duelCombat, combat, music + pieces, floor, game,
  monsters, characters, items, intents, traits, bossEntrances,
  shakespeareGuide, shopkeepers, achievements, events, the engine's
  stolenLetters). Keep namespace, rng, wordlist, lexicon, tiles. The
  sandbox becomes the app: `sandbox.html` is renamed `index.html`,
  `dev:sandbox` becomes `dev`, build-site stops moving anything to
  `/app.html`. CLAUDE.md's map shrinks by half.
- **Enemy faces.** One emblem per enemy on the run strip and the target
  card, plus one line in the enemy's voice on the rule card. THEME.md's
  Mountain King / Fiddler / Valkyrie Marshal replace placeholder boss
  names where the recording matches.
- **Title screen.** A name decision (ROADMAP: Jaxon's call), a recording
  playing quietly, the alphabet with its hollow letters and the quill
  count as the progress display.
- **Sound.** A distinct shimmer per premium kind in sfx.js. No strike or
  parry sounds — there are no strikes.
- **Offline.** The seven fetched MP3s are not committed; a service worker
  caching `public/audio/` after first play makes the phone build work
  without signal. `build:site` already fetches them.
- **Itch build.** tools/build-itch.js exists from the sibling repo; point
  it at the sandbox entry and test the zip.

## Order of work

1. Stage 1 — Jaxon plays; the numbers are his.
2. Stage 5's first item, deleting the old app — do it before any new
   feature so nothing new is built against dead code.
3. Stage 2 (Harmony) — one afternoon.
4. Stage 3 (keys) — cheap, a day with tuning.
5. Stage 4 (quill discovery) — after a week of play, when the pool needs
   a reason to grow.
6. The rest of stage 5 — when someone outside the household is going to
   play.

Jaxon-only decisions along the way: the six key rules (stage 3), the
starting quill set (stage 4) and the game's name (stage 5).

Not doing, on purpose: enemy strikes or any punishment tied to the music,
chords as a base mechanic, movement choice, encore, daily seed, vouchers
and editions, an overworld map, multiplayer, and any recording that is
not public domain or already logged as an exception.
