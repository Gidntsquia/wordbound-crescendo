# DEMO PLAN 2 — the shareable demo

Written 2026-09-06 for the next session. Goal: a link Jaxon can send to
friends. Four asks, in Jaxon's words: (1) two more enemies and one more boss,
every enemy with its own classical piece, pulled from a royalty-free source on
the internet; (2) UI simplification so a new player picks it up; (3) subtle
sound effects on tile input; (4) Balatro-style sound and animation when a word
lands, "meaty" for a big word.

Everything below is sandbox-only (`src/sandbox/`, `sandbox.html`). Nothing
under `js/wordbound/` or `src/components/` changes. No tests (CLAUDE.md).
Deploy after every phase that lands (`npm run deploy`, then push main).

Phases are ordered so each one ships on its own. Suggested order:
**1 → 3 → 4 → 2**, because the sound layer (3) is what phase 4 builds on, and
the UI pass (2) should come last so it hides the sandbox tooling that phases
1/3/4 will still want for tuning.

---

## Phase 1 — Nine enemies, nine pieces

### Shape

Today: two movements × (small, big, boss) = 6 enemies sharing 3 recordings.
Target: **three movements** × (small, big, boss) = 9 enemies, 9 distinct
recordings. "Two more enemies and one more boss" is exactly one more
movement; the three existing reused slots (bagatelle2, moonlight2, fate2)
become new pieces too, which is what "all enemies have their own song" means.

`enemies.js`: add Movement III, give every enemy a distinct `recorded` key,
a name, glyph, flavour. New boss gets a new RULE. Candidates for the third
tempo marking (pick one, keep the other for later):
- `da_capo` — "From the top." The first word played is scored again at the
  end of the round (a free replay of your opener; rewards leading strong).
- `sotto_voce` — "Softly." Words of 5+ letters score ×0.5, 3–4 letters ×1.5.
  (Inverts the tier ladder for one fight.)
- `fermata_boss` — one extra word, but changeouts are 0.

`round.js`: `MOVEMENT_BASE_3` in `ROUND_DEFAULTS` (tuning panel mirrors it
automatically); `createRun` already walks `Sandbox.MOVEMENTS`, verify nothing
hard-codes 2. Movement I/II difficulty is still flagged in NIGHT_REPORT as
needing Jaxon's feel; base 3 starts as `MOVEMENT_BASE_2 × 1.6` and gets tuned
by playing.

### Music: fetched from the internet, not hand-placed

New script `tools/fetch-audio.js` driven by `tools/audio-manifest.json`:

```json
{ "id": "goldberg-aria", "file": "public/audio/goldberg-aria.mp3",
  "url": "https://…", "license": "CC0 / public domain", "performer": "…",
  "composer": "J. S. Bach", "title": "Goldberg Variations, Aria",
  "sourcePage": "https://…", "trim": { "start": 0, "seconds": 150 },
  "sha256": "…" }
```

For each entry: download the URL (ogg/flac/mp3, whatever the source has),
`ffmpeg` (present at /usr/bin/ffmpeg) trims to the excerpt and transcodes to
128 kbps MP3, then `tools/analyze-audio-piece.js` fills the GENERATED block
of `src/sandbox/recorded<Id>.js`. The hand-owned header of each recorded file
(title, composer, licence prose, source URL, fetch date) is generated ONCE
from the manifest and committed; that keeps the existing "the file documents
its own licence" convention.

Decisions:
- **Bundle, don't stream.** The game keeps serving MP3s from its own
  gh-pages origin. Streaming straight from Wikimedia/Musopen at runtime would
  hit CORS on `decodeAudioData`, break when the host moves a file, and make
  the demo depend on a third party while a friend is playing. "Pulled from
  the internet" is satisfied by the manifest: every track's provenance is a
  URL and a licence line, and `npm run fetch:audio` reproduces
  `public/audio/` from nothing.
- **Trim to excerpts.** A fight is one to three minutes. Nine full pieces at
  the current bitrate would be ~60 MB; nine 2–3 minute excerpts at 128 kbps
  are ~20 MB total, about what three tracks weigh today. Pick the excerpt so
  it opens on the recognisable theme.
- **Keep MP3s out of git from here** (`public/audio/*.mp3` in `.gitignore`,
  `build:site` runs the fetch if a file is missing). The three tracks already
  in history stay in history; removing them from the tree is optional and
  Jaxon's call. Argument for keeping them committed: `npm run deploy` works
  offline. Argument against: a 9-track repo with re-trims piles up tens of
  MB per change. Recommendation: gitignore, and cache downloads in
  `.cache/audio/` (already ignored) so re-trims don't re-download.
- Prefer **public-domain recordings** (composition AND performance) so the
  licence exception in CLAUDE.md gets simpler, not wider. The two Pixabay
  tracks can stay or be replaced; replacing them makes every enemy the same
  kind of exception. Candidate sources, to be verified at fetch time and
  recorded in the manifest (do not trust this list, check each page):
  - Wikimedia Commons: Skidmore College Orchestra (PD dedication, already
    used for Symphony 5) has other Beethoven movements; US Marine Band and
    US Army Band recordings are US-government works (PD) — Sousa, Grieg's
    Peer Gynt, Rossini overtures, Tchaikovsky arrangements.
  - Musopen (musopen.org): Kimiko Ishizaka's Goldberg Variations and
    Well-Tempered Clavier are CC0; the Musopen symphony recordings are PD.
  - archive.org mirrors of the above when Commons throttles.
- Each enemy's piece should MATCH its role: small = light, solo instrument;
  big = something with a pulse; boss = orchestral and loud. Rough slate
  (composer-only, the exact recording is chosen from what is actually PD):

  | Mv | Kind | Enemy | Piece |
  |----|------|-------|-------|
  | I | small | The Bagatelle | Für Elise (keep) |
  | I | big | The Moonlight | Moonlight Sonata (keep) |
  | I | boss | Fate at the Door | Symphony 5, I (keep) |
  | II | small | The Aria | Bach, Goldberg Aria |
  | II | big | The Mountain King | Grieg, In the Hall of the Mountain King |
  | II | boss | The Storm | Vivaldi, Summer III, or Rossini, William Tell finale |
  | III | small | The Gymnopédie | Satie, Gymnopédie 1 |
  | III | big | The Turkish March | Mozart, Rondo alla Turca |
  | III | boss | Dies Irae / The Night | Mussorgsky, Night on Bald Mountain, or Verdi Requiem Dies Irae |

`main.jsx` imports the nine recorded files (or one generated
`recordings.js` index, cleaner). `prefetchAudio` already warms the current
enemy; also warm the NEXT enemy during the shop so no fight opens silent.

### Done when
`npm run fetch:audio` on a clean checkout produces all nine files; each
`recorded*.js` header names URL + licence; all nine enemies play through in
one run on the live link; NIGHT_REPORT licence section updated.

---

## Phase 3 (before 2) — Input sounds: a tiny synthesized SFX layer

New `src/sandbox/sfx.js` → `Sandbox.createSfx(ctx, destination)`. All sounds
synthesized in WebAudio (the synthesized-only rule covers SFX; recordings are
music only). No samples, no files. Routed through its own gain so the volume
slider and a future mute apply, mixed a touch under the music.

| Event | Sound | Where it fires |
|-------|-------|----------------|
| tile case → stick | short wooden tick, pitch rises with stick position (1st tile low, 7th high — the Balatro "card select" climb) | `stageTile` |
| tile stick → case | same tick, pitch falls, a little softer | unstage handler |
| drag reorder drop | muted tick | `dragReorder` drop |
| changeout | soft shuffle: 3–4 filtered-noise taps in 120 ms | `changeout` |
| tap a disabled/barred tile | dull thud | the `say(...)` branches |
| buy / sell / reroll | coin: two short sines a fifth apart | shop handlers |
| ink applied | brief shimmer (detuned pair, 200 ms) | `applyInk` |

Design rules: every sound ≤ 150 ms except the shimmer; attack under 5 ms so
it lands on the tap; never more than one per event; all params in one
`SFX_DEFAULTS` table so they can be tuned without reading the code. The
AudioContext is already created on first user gesture for music, reuse it.

Add a `SFX` toggle next to Volume in the gear panel (default on), persisted
in `wbc.sfx`.

### Done when
Playing a word by tapping seven tiles produces seven rising ticks with no
audible lag on a phone; changeout, shop and ink each have their sound.

---

## Phase 4 — Scoring like Balatro: meaty word plays

Today `playWord` scores instantly and one `.sb-score-fly` element drifts up.
Replace with a SCORING SEQUENCE, driven by the breakdown `round.js` already
returns (tier → letters → inks → items left to right → rule), so the UI
narrates the same maths the log shows.

Sequence for a played word (durations scale down when the word is small):
1. **Lock** — stick tiles snap up 4 px, brief freeze (60 ms). Sound: a low
   thump whose volume tracks the word's tier.
2. **Letters** — left to right, each tile pops (scale via a wrapper, NOT
   `.sb-tile` — the FLIP rule in CLAUDE.md) and the points counter ticks up
   by its value; one tick sound per letter, pitch rising. ~70 ms per tile.
   Inked tiles get a colour flash matching the ink and a slightly different
   tick.
3. **Items** — each item in the held row that contributed jiggles in turn,
   its contribution text floats off it ("+10 pts" / "×1.5"); sound: a
   marimba-ish note, higher for mult than for points. ~180 ms each.
4. **Rule** — if a tempo marking fired, the rule card flashes and its text
   floats.
5. **Total** — points × mult collapse into the total with a heavy hit:
   number scales up then settles, the target meter fills with an ease-out,
   the whole board shakes 1–3 px scaled by `total / target`. Sound: a
   layered hit (sine sub + noise burst + a chord whose size follows tier).
   If the play crosses the target, the meter turns gold and a short
   resolved chord plays; the "Won" panel then appears.
6. **Clear** — stick tiles fly to the plays list (the existing FLIP can be
   reused by putting the played word in the list with the same
   `data-flip-tile-id`s for one frame), rack refills with a soft riffle.

Implementation:
- Sequencing lives in the UI (RoundSandbox), not round.js; round.js stays
  instant and pure. Use a small async step runner with `setTimeout`, and a
  `skip` on any tap so an impatient player is never blocked. Input stays
  disabled during the sequence (`phase === 'scoring'`).
- `scoreWordPoints` should return the ordered step list it already computes
  internally (tier / letter / ink / item / rule entries with pts/mult
  deltas) so the animation is data-driven; check `describeBreakdown` uses
  the same list.
- "Big word" scaling: one function `intensity(total, target)` in [0,1] that
  every effect reads (shake amplitude, hit volume, chord size, total scale,
  step timing). One knob, one feel.
- Respect `prefers-reduced-motion`: skip shake and pops, keep the counter.
- CSS: `.sb-tile-pop` wrapper class, `.sb-board.is-hit-N` for shake tiers,
  keyframes in sandbox.css. No `transform` on `.sb-tile`.

### Done when
A 3-letter word feels like a tap; a 7-letter word with three items and a
rule fires a 2–3 second cascade that ends in a hit, and Jaxon says it feels
meaty on the phone. All timings in one table.

---

## Phase 2 — UI for a first-time player

The sandbox screen is still a tuning tool. The demo needs one path:
**open link → understand the goal → play**. Nothing is deleted; the tooling
moves behind the gear.

1. **Title screen instead of the setup bar.** On load: wordmark, one line
   ("Spell words. Beat the target before your words run out."), a big
   **Play** button and a small "Best: …" line. Seed, tile bag, starting
   items, word helper and tuning move into the gear panel on every screen
   size (today only under 620 px). Play uses a random seed; the seed is
   still shown on the end screen for sharing.
2. **Teach in play, not in an overlay.** Replace the three-line first-run
   overlay with short one-time callouts that appear in context and dismiss
   on the action they describe (`wbc.seen` becomes a set of ids):
   - on the rack, first round: "Tap letters to spell a word"
   - on the stick after 2 tiles: "Tap Play, or tap a tile to send it back"
   - on the changeout button, first time affordable: "Swap tiles you don't
     want — 3 per fight"
   - in the shop, first visit: "Items score every word. Gold carries over."
   - on the first boss: the rule card is already there; add a pulse.
3. **One score line.** Merge the header's "score / target" and the meter
   with the counters: a single strip reading `score ▮▮▮▮▯▯ target ·
   3 words · 2 swaps`. The "in the bag of N" count moves to the gear panel.
4. **Plain words.** Rename in the UI only (code keeps its names):
   "changeout" → "swap", "The composing stick" → no label (the row explains
   itself once the callout has fired), "Tempo marking" stays but the rule
   text gets a one-line plain version above the flavour quote,
   "favour" → "skip for a bonus". Keep "case" out of the UI entirely.
5. **Shop clarity.** Price on every card, a "Continue" button that is the
   biggest thing on the screen, item hints visible without hover (phones
   have no hover — `title` attributes are invisible there, so every hint
   that matters becomes visible text or a tap-to-expand).
6. **End screen → share.** Add a "Copy result" that puts a Balatro-style
   text summary on the clipboard (enemies felled, best word, seed, link)
   so friends can paste it back to Jaxon.
7. **Phone check.** Play a whole run at 360 px wide with Chrome device mode
   AND on the real phone; nothing overflows horizontally, every tap target
   ≥ 40 px.

### Done when
Someone who has never seen the repo can be handed the link with no
explanation and finish a run; the gear panel still exposes everything the
sandbox exposed before.

---

## Not in this plan

Music reacting to score (soundtrack only, still). Vouchers, editions,
stakes, endless, run map (BALATRO_NOTES §3). A main-app port of any of this.
Tests.

## Files touched, by phase

- 1: `enemies.js`, `round.js`, `main.jsx`, new `tools/fetch-audio.js`,
  `tools/audio-manifest.json`, `recorded*.js` ×6 new, `.gitignore`,
  `package.json` (`fetch:audio`), `build-site.js`, CLAUDE.md map.
- 3: new `sfx.js`, `RoundSandbox.jsx` handlers, `dragReorder.js` drop hook,
  `main.jsx`.
- 4: `round.js` (step list out of `scoreWordPoints`), `RoundSandbox.jsx`,
  `sandbox.css`, `sfx.js`.
- 2: `RoundSandbox.jsx`, `sandbox.css`, first-run storage keys.
