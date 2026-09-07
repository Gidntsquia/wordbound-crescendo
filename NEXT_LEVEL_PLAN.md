# Next-level plan — from a good sandbox to a game people finish

Written 2026-09-07, after DIVERGENCE_PLAN.md items 1–4 all shipped in one day.
Jaxon likes where the game is. This file is the build order for what comes
after: the stages, in order, each with a gate that is a played run on the
phone, not a build passing. BALATRO_NOTES.md §3 is still the source for the
"where to diverge" rule: copy Balatro on economy, pacing and legibility;
diverge on what a hand is.

The one-sentence goal: **the music stops being a soundtrack and becomes the
opponent.** Today the recording plays under the round and only quills care
about it. ROADMAP.md's pitch — bosses attack on the crescendos, a word landed
on the crescendo parries — is not in the sandbox yet. That is stage 2 and it
is the biggest single thing on this list.

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

## Stage 2 — The music attacks (the pitch, finally)

The recording's big swells become the enemy's turns. This makes every
enemy a different fight because every recording has a different shape,
which is the thing Balatro cannot have.

- **The strike.** When a crescendo window closes with no word played in
  it, the enemy strikes. Small enemies: the target rises by a few percent.
  Big enemies: one tile in the case is BARRED for the next play (like
  no_repeats' strike-through). Bosses: a play is lost, or a stick slot is
  locked. All strikes go through one `round.strike(kind)` in round.js and
  one `STRIKES` table; the tempo marking chooses the kind.
- **The parry.** A word played inside the window cancels the strike and
  scores normally (the crescendo quills stack on top). This makes the
  window matter for every player, not only quill owners; the quills become
  the "and get paid for it" layer.
- **Pacing.** The window curation is per recording; early enemies should
  strike rarely (THEME.md: early tier "rare weak crescendos", late tier
  "frequent, powerful"). Add a `strikeMag` threshold per enemy in
  enemies.js so Gymnopédie almost never strikes and Night on Bald Mountain
  does every 12 s. Audit each of the nine curated surge lists by ear.
- **Timer honesty.** A player thinking over a rack must not be ambushed. The
  countdown ring is already there; add the enemy's name pulsing on the
  run strip and a low synthesized rumble from sfx.js at "soon".
- **Pause.** The recording pauses when the tab hides or the shop opens
  (it should already); a "hold" button during a round is a design decision —
  recommend none, because the pressure is the game.
- Feel target: a player who has never seen a quill understands within one
  round that the music is doing something to them and that words stop it.
- Gate: a round of Mountain King is tense; a round of Gymnopédie is
  calm. If both feel the same, the strikes are wrong, not the music.

## Stage 3 — Chords: held tiles score

BALATRO_NOTES §3.6. The case is currently dead weight between plays. A
"chord" is two or three tiles left in the case after a play that spell a
word themselves; they score as a small extra step in the cascade.

- `scoreWordPoints` gets a `chord` step after the items: base points only
  (no mult), so it is a bonus and never the build.
- Quills unlock it as a build: **Harmony** (chords ×3), **Drone** (a chord
  of the same letter counts), **Counterpoint** (the chord's mult applies
  to the main word). These are second-axis quills of a new kind: the
  first ones that reward what you DON'T play.
- Steel ink (held ×1.2) already lives here; the chord gives it company.
- Gate: does the player start leaving letters behind on purpose?

## Stage 4 — A run with choices

Today the run is a fixed lineup of nine. Add the shape that makes a second
run different from the first without a map screen.

- **Movement choice.** Before each movement, pick one of two enemies for
  the small and big slots (the recording's name, its tempo marking and its
  strike rate shown). Bosses fixed. This is `MOVEMENTS` gaining
  alternates in enemies.js and one picker screen in RoundSandbox.jsx.
- **Keys** (Balatro's stakes): after a first win, the title screen offers
  the run in a harder key — C major (base), G major (targets ×1.15),
  D minor (strikes lock a tile on small enemies too), and so on up to six.
  Persist `wbc.key` next to `wbc.best`. Wins per key on the end screen.
- **Encore** (endless): after the last boss, keep going with the targets
  climbing until a loss; best encore movement on the end screen.
- **Daily seed.** A seed derived from the date, one attempt, its own
  best. The share text already exists; daily makes it worth sharing.
- Gate: run 3 should look different from run 1 in the run strip alone.

## Stage 5 — The meta grows past letters

Stolen letters are the first meta. Two more give a reason for run ten.

- **Repertoire.** Enemies felled at least once are marked in a gear-panel
  list with the recording's name and performer (the manifest already holds
  this). Felling every enemy in a movement unlocks its alternate enemy
  (stage 4) — so the roster reveals itself instead of arriving all at once.
- **Quill discovery.** New quills are not in the shop pool until first
  seen in a pack or earned by a boss; `wbc.quills` like `wbc.letters`.
  Keep the starting pool at ~10 so early runs are legible.
- **No currency, no grind.** Same rule as letters: a lost run never loses
  progress; nothing is bought with anything but a felled enemy.

## Stage 6 — Identity and polish

The last pass before a build people outside the household play.

- **Enemy faces.** One portrait or emblem per enemy on the run strip and
  the target card, plus one line in the enemy's voice on the rule card
  (the tempo-marking cards already speak). THEME.md's Mountain King /
  Fiddler / Valkyrie Marshal should replace the placeholder boss names
  where the recording matches.
- **Title screen.** A name decision (ROADMAP: Jaxon's call), the recording
  of the day playing quietly, the alphabet with its hollow letters as the
  progress display.
- **Sound.** One synthesized strike sound and one parry sound in sfx.js;
  a distinct shimmer per premium kind.
- **Offline.** The seven fetched MP3s are not committed; a service worker
  caching `public/audio/` after first play makes the phone build work on
  the train. `build:site` already fetches them.
- **Retire the old app.** `/app.html` (the React run app) and
  `wordbound.html` (the pre-React reference) are no longer where the game
  is. Decide: delete both and make the sandbox the app, or keep them behind
  a note. Recommend delete; CLAUDE.md's map shrinks by half.
- **Itch build.** tools/build-itch.js exists from the sibling repo; point
  it at the sandbox entry and test the zip.

## Order of work and what is Jaxon's call

1. Stage 1 — Jaxon plays; the numbers are his.
2. Stage 2 — build the strike/parry loop; this is the work that decides
   whether the pitch holds. Everything after it assumes it does.
3. Stage 3 — small, one afternoon, do it right after 2 while the cascade
   is warm.
4. Stage 4 — keys and daily are cheap; movement choice and encore are a
   day.
5. Stage 5 — after a week of play, when the roster needs a reason to grow.
6. Stage 6 — when someone outside the household is going to play.

Jaxon-only decisions along the way: the strike kinds per enemy tier (stage
2), whether a hold button exists (stage 2, recommend no), the game's name
(stage 6), and whether the old app is deleted (stage 6, recommend yes).

Not doing, on purpose: vouchers and editions (Balatro's own economy
layers, and the game has enough quills), an overworld map (movement
choice does the job in one screen), multiplayer, and any recording that is
not public domain or already logged as an exception.
