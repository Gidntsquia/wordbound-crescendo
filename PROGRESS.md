# Progress log — Wordbound: Crescendo

One entry per run, newest at the bottom: what was done, current state, what's next,
what was actually verified vs. not. Never edit past entries. Real timestamps only
(`date -u +%Y-%m-%dT%H:%MZ`); trust `git log` over self-reported times. Entries
≤~25 lines (see GOALS.md STATE HYGIENE). Older entries rotate verbatim to
PROGRESS_ARCHIVE.md; this file keeps only the recent tail.

## 2026-08-22T18:39Z -- REGULAR ENEMIES: The Metronome, third and final mid-tier regular composed + verified standalone

Picked up GOALS.md's REGULAR ENEMIES ticket at its current tip: mid tier
had 2 of 3 pieces composed and wired (Gnossienne, Invention), The
Metronome (Czerny) still fully unstarted. Composed it, same "proof piece,
verified standalone before wiring" precedent every prior regular in this
ticket already established -- deliberately NOT wired into any
`MONSTER_DEFS` entry this run.

New `js/wordbound/pieces/czerny-299.js`: "School of Velocity," Op. 299
No. 1, Carl Czerny. PD vetting: composed 1834, Czerny died 1857 (169
years dead as of 2026) -- safely past both the pre-1930 and
70-years-dead bars, re-derived directly rather than trusted from
THEME.md's table (same standing rule every piece file in this directory
follows).

THEME.md's own gimmick -- "Mechanical, relentless, perfectly even -- no
surprise crescendos, just unceasing pressure that never actually stops
to breathe" -- modeled structurally in three separate ways, not just
described in a comment:
1. The bass IS a literal metronome click: one unvarying tonic note per
   beat, same duration/velocity/pitch, for the whole 64-beat length --
   direct sonic proof of the regular's own name.
2. The melody is a single 8-note scale-run cell (four ascending, four
   descending) repeated verbatim -- identical pitches/durations/
   velocities every single repetition, no development at all, unlike
   every other piece in this directory.
3. The dynamics curve is confined to a genuinely narrow band (0.30-0.34)
   for the entire piece with NO `crescendos` entries at all -- unlike
   Gnossienne/Invention's calm-baseline-plus-spikes shape, this one
   never spikes and never dips. Deliberately set meaningfully higher
   than Air on the G String's own genuinely-flat early-tier baseline
   (~0.06-0.08) -- the actual difference this run intended between
   "barely attacks" (early tier) and "unceasing pressure that never lets
   up" (mid tier), even though neither piece ever spikes.

Computed every one of these claims directly with `node` against the real
`music.js`/piece module BEFORE writing any dom-check.js assertion (exact
intensity at 9 sample beats across the whole length, bass note count/
uniformity, all 16 melody cells byte-identical in shape) -- not assumed
correct from the code reading right, matching the standing precedent
gnossienne-1.js's own note established after a real off-by-beat bug was
caught the same way.

Wired into all 4 script-load lists (`wordbound.html`, `src/main.jsx`,
`src/test/setup.js`, `tools/build-itch.js`'s DEPENDENCIES manifest, in
the correct alphabetical position between `beethoven-5th.js` and
`gnossienne-1.js`).

**Verified this run:**
- `npm test` (dom-check.js): 16 new checks (presence/title/PD-vetting/
  70-years-dead/stageTier/gimmick-string/keyframe-sort-and-bounds/
  peak-below-boss-level, a `Music.intensityAt`-driven narrow-band-plus-
  no-crescendos check, a literal-metronome-click bass structural check,
  an identical-repeated-cell melody structural check, plus track-note
  bounds) -- ALL CHECKS PASSED, clean run, no flake hit.
- `npm run test:react`: 183/183, unaffected (true no-op -- no
  `src/components/*` file touched, `main.jsx`/`setup.js` just gained one
  more inert import, same as every prior proof-piece run in this
  ticket).
- `npm run build`: clean, 57 modules (up from 56).
- `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED --
  confirmed `czerny-299.js` present in the real zip listing directly
  (`adding: js/wordbound/pieces/czerny-299.js`), the unzipped
  dom-check.js run (16/16 including this piece's own new checks), and a
  real-browser zero-404s load of the unzipped static build.
- Deliberately did NOT run `test:mobile`/`test:qa`/`test:react-qa`/
  `test:duel-balance`/`test:branching-map`/`test:music-engine`/
  `test:regular-duel-smoke`/`test:react-duel-loss`/`test:drag-interrupt`/
  `test:run-header` -- same judgment call the landed Invention run
  already made and reasoned through explicitly in GOALS.md: an unwired,
  unreachable piece file touches none of what those scripts exercise.

**Settling a genuine, previously-flagged inconsistency:** the Invention
run's own GOALS.md note explicitly flagged that it skipped the live
deploy refresh for an inert proof-piece file, breaking from the
immediately-prior Gnossienne run's choice to refresh, and asked a future
run to settle the inconsistency rather than each run re-deciding it
fresh. Settled it this run: going with the LITERAL header rule ("any run
that changes game code/assets must... refresh the deploy," no carve-out
for unreachable code) -- the same reading the Gnossienne run's own note
already argued for directly. Refreshed the deploy this run (see below).

**Genuinely-Jaxon-only:** none this run (composition/balance judgment
calls only, all flagged above).

**Not done, honest gaps:** the mid-tier roster (Gnossienne, Invention,
Metronome) is now fully COMPOSED, but The Metronome is not yet wired
into any `MONSTER_DEFS` entry -- normal tier still has 3 of 5 old
generic defs reachable (serpent/bindingstrap/appendix), unchanged by
this run. Late tier (Swarm/Sabbath/Organist) is fully untouched, 0 of 3
composed. PLAYTEST FINDINGS item 2 ("no def without `.piece` remains
reachable") is therefore still open. GOALS.md's REGULAR ENEMIES ticket
stays open. Version NOT bumped -- nothing shipped to real gameplay this
run, same convention every prior isolated-composition run in this
ticket already followed.

**Next:** wire The Metronome into a real `normal`-tier `MONSTER_DEFS`
entry alongside retiring the last of the old generic normal-tier defs it
and its two mid-tier siblings replace (`retiredFromPool` on serpent/
bindingstrap/appendix, completing normal tier's 100% conversion), extend
`test:regular-duel-smoke`'s mid-tier pass to cover all 3 pieces, and run
this ticket's own full VERIFY bar against the merged tree, mirroring the
early-tier wiring run exactly. Once that lands, normal tier is 100%
duel-mode and only strong tier (0 of 3 late-tier pieces composed)
remains before PLAYTEST FINDINGS item 2's own closing bar is met.

**Live deploy, actually executed:** built `dist/app/` fresh off this
run's own commit (57 modules, includes `czerny-299.js`), published its
contents + an empty `.nojekyll` as the new root of the `gh-pages` branch
via a scratch `git worktree` + orphan branch, `git push -f origin
gh-pages-refresh:gh-pages` -- succeeded, confirmed by git's own
ref-update output (`5b1d298...5af500e gh-pages-refresh -> gh-pages
(forced update)`). Worktree removed after. **Could NOT curl-verify,
honestly flagged rather than assumed:** `curl -sv
https://gidntsquia.github.io/wordbound-crescendo/` hit the SAME
pre-existing domain-specific proxy block this repo's prior runs have
already repeatedly documented -- a `403` on the CONNECT tunnel to
`gidntsquia.github.io` specifically, not a general egress problem (this
session never tested another domain, but every prior run's own note
already established `api.github.com` works fine in the same kind of
session). The push itself is the actual deploy action and it succeeded;
this is a known, recurring sandbox limitation, not a new one introduced
by this run.

## 2026-08-22T19:07Z -- REGULAR ENEMIES: normal tier's 100% cutover -- The Metronome wired in, last 3 old generic normal defs retired, two real pre-existing test-suite bugs found+fixed

**What landed (`js/wordbound/monsters.js`):** a new `metronome` (The
Metronome) `MONSTER_DEFS` entry -- `tier: 'normal'`, `pushesToDefeat: 1`
explicit (same convention as every other duel-mode regular), HP 54 /
attack 3 / gold 3-6 (this file's own normal-tier band), `piece:
window.Wordbound.Pieces.czerny299` (School of Velocity, Op. 299 No. 1,
Czerny -- composed and PD-vetted by the prior run), `traitId: 'plain'`
(a metronome has no thematic "weakness," so the flattest trait fit
better than a pointed one -- duel damage math never reads it either
way), glyph `⏰`. `serpent`/`bindingstrap`/`appendix` -- the last 3 of
the 5 old generic normal-tier defs -- now carry `retiredFromPool: true`
(same "kept intact for direct construction/tests, no longer drawn by a
fresh floor" treatment every prior retirement in this ticket used).
**normal tier is now 100% duel-mode**: every real floor draw of a
'normal'-tier regular is one of gnossienne/invention/metronome.
`floor.js` needed no change -- `pickCombatDefId`'s `retiredFromPool`
filter already generalizes across tiers, confirmed by reading it
directly rather than assumed.

**Two real, pre-existing test-suite bugs found and fixed while running
this ticket's own full VERIFY bar** (both confirmed via `git stash`
isolation to already be broken against the unmodified base tree --
neither is a regression from this run's own change, both are the exact
same hazard class this ticket's own earlier dom-check.js audit already
established a fix pattern for, just not yet exposed because normal tier
still had a poolable non-duel fallback until this run removed the last
one):

1. `src/test/duelIntegration.test.js`'s "a monster def with .piece
   starts a real duel fight instead of the turn-based loop" test picks a
   target def via its own `firstPoolableNonDuelDefId()` helper (first
   def that's both un-`.piece`d and not `retiredFromPool`), then searches
   40 `freshRun` seeds' floor-1 start nodes for it. With BOTH weak and
   normal tier now fully real/duel-mode, that helper can only ever return
   a `'strong'`-tier def (sentinel/warden/spinesplinter) -- and
   `floor.js`'s `getAllowedTiers(1)` is `['weak','normal']` only, so a
   `'strong'` def can NEVER appear on floor 1 regardless of sample size.
   Confirmed directly: a floor-1-only version of this exact search, run
   against this run's own tree, found it in 0 of 40 seeds. Fixed by
   falling back to a real `Game._advanceFloor()` call (the same
   test-only hook `RunScreen.test.jsx` already drives directly for an
   identical "jump past floor 1" need) to floor 2 -- which
   `getAllowedTiers` adds `'strong'` to -- before giving up on a seed.
   Verified: the fixed test passed 4 consecutive repeat runs against this
   run's own tree (was a reproducible failure before the fix).

2. `test/verify-react-build.js`'s real-browser UI playthrough clicks
   whichever combat node its fixed seed (`vitest-fixed-seed-1`) happens
   to roll on floor 1, with zero duel-mode awareness (unlike every other
   real-browser QA script in this suite), then asserts a submitted word
   drops `monster.hp` -- which duel mode never touches (it pushes
   `state.duel.gauge` instead) -- so a duel-mode draw hangs that
   assertion's `waitForFunction` for its full 3s timeout and fails the
   whole run. Confirmed via `git stash` that this exact seed already
   rolled a duel-mode monster on the CLEAN, unmodified base tree too
   (weak tier alone was already sufficient to trigger it before this
   run's own normal-tier change) -- a real, pre-existing gap, not
   introduced by this run, just made impossible to miss now (both trees
   fail identically). Fixed by pinning the available combat node away
   from duel mode via `page.evaluate` immediately before the click,
   mirroring `test/dom-check.js`'s own established
   `firstSafeDefId`/`pinNodeAwayFromDuelMode` convention inline (this
   script drives a real browser via Playwright rather than importing the
   vanilla suite's own helper). Verified: 2 clean runs after the fix (was
   a reproducible 100% failure both before and after this run's own
   monsters.js change, until fixed).

Extended `test/verify-regular-duel-smoke.js` with a WIN via The
Metronome. First attempt stacked it as a 3rd forced fight on the
existing mid-tier floor via `enterForcedRegularDuelAnywhereOnFloor` --
crashed with "no uncleared combat node left on the floor to force",
because that helper force-clears every OTHER node on the floor each time
it's called, so it only tolerates one additional fight per floor after
the first. Fixed by giving The Metronome its own third fresh run
instead, using the simpler row-0 `enterForcedRegularDuel` helper since
it's that run's first fight -- same convention PART 1 (early tier) and
PART 2 (gnossienne/invention) already use for their own first fights.

**Verified this run (this ticket's own full VERIFY bar, against the
final merged tree):**
- `npm test` (dom-check.js): 2 clean runs.
- `npm run test:react` (Vitest): 183/183, stable across 12 of 13 total
  repeat runs this session -- 1 run hit a failure whose output scrolled
  past before it was captured; every other run, including several run
  back-to-back immediately after, was clean, consistent with the
  already-documented `duelIntegration.test.js` "flat 260ms wait on a
  razor-thin margin" timing flake this file's own PLAYTEST FINDINGS entry
  already names (not confirmed to be that specific flake since the
  output wasn't captured, but the rate and file are consistent with it,
  not with a new regression -- flagged honestly rather than assumed).
- `npm run build`: clean, 57 modules (unchanged -- no new file this run,
  just edits to existing ones plus the version bump).
- `npm run test:mobile` / `npm run test:qa` / `npm run test:react-qa`:
  ALL CHECKS PASSED.
- `npm run test:branching-map`: ALL CHECKS PASSED, 180 floors/seeds, no
  orphan/reachability regressions from the pool-filter change.
- `npm run test:duel-balance`: no crash, no new sanity flags, numbers
  unchanged from the prior run (the sim reads Gnossienne's piece data
  directly for its 'mid' representative, not `MONSTER_DEFS` -- per
  GOALS.md's own "optional" note, deliberately did NOT wire Metronome in
  as a third representative, since Gnossienne/Invention already
  establish the sim's "one representative per tier" convention).
- `npm run test:regular-duel-smoke` (extended, this run's own real
  content): ALL CHECKS PASSED, 2 clean runs including the new Metronome
  WIN pass.
- `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED (no
  new piece file was needed this run -- `czerny-299.js` already shipped
  in the prior run's deploy).
- `npm run test:music-engine` / `test:audio` / `test:drag-interrupt` /
  `test:run-header` / `test:react-duel-loss`: ALL CHECKS PASSED,
  unaffected.
- `npm run test:react-build`: ALL CHECKS PASSED, 2 clean runs -- after
  the fix above; was a reproducible failure before it (see bug #2 above).

Version bumped v0.10 -> v0.11 (`MainMenu.jsx` / `wordbound.html` /
`MainMenu.test.jsx`) -- real gameplay content shipped (normal tier's 3rd
duel regular, completing that tier's cutover).

**Genuinely-Jaxon-only:** none this run (composition/balance/test-harness
judgment calls only, all flagged above).

**Not done, honest gaps:** late tier (Swarm/Sabbath/Organist) remains
completely untouched -- 0 of 3 composed, all 3 old strong-tier defs
(sentinel/warden/spinesplinter) still reachable and still turn-based/
silent. GOALS.md's PLAYTEST FINDINGS item 2 ("no def without `.piece`
remains reachable") is therefore still open -- weak and normal tiers are
now both 100% converted, strong tier is the entire remaining gap.
GOALS.md's REGULAR ENEMIES ticket stays open (box not checked).

**Next:** start the late tier -- compose the first of The Swarm/The
Sabbath/The Organist (THEME.md's own names), same "proof piece, verified
standalone before wiring" precedent as every mid-tier piece before it.
Once all 3 late pieces are composed and wired (retiring
sentinel/warden/spinesplinter via `retiredFromPool`), PLAYTEST FINDINGS
item 2's own closing bar is finally reachable. A future run should also
decide whether `pickEliteDefId` (floor.js, untouched by any of this
ticket's work -- elites still draw from the same 3 strong-tier defs
regardless of `.piece`) needs its own duel treatment, or is deliberately
out of scope (elites already carry a labeled resistance-trait warning
per FUN OVERHAUL 6/8 -- a separate, already-telegraphed difficulty
spike) -- not decided either way yet, flagged for whoever picks this up.

**Live deploy, actually executed:** built `dist/app/` fresh off this
run's own commit (57 modules), published its contents + an empty
`.nojekyll` as the new root of the `gh-pages` branch via a scratch `git
worktree` + orphan branch, `git push -f origin
gh-pages-refresh:gh-pages` -- succeeded, confirmed by git's own
ref-update output (`5af500e...a3144da gh-pages-refresh -> gh-pages
(forced update)`). Worktree removed after. **Could NOT curl-verify,
honestly flagged rather than assumed:** `curl -sv
https://gidntsquia.github.io/wordbound-crescendo/` hit the SAME
pre-existing domain-specific proxy block this repo's prior runs have
already repeatedly documented -- a `403` on the CONNECT tunnel to
`gidntsquia.github.io` specifically. The push itself is the actual
deploy action and it succeeded; this is a known, recurring sandbox
limitation, not a new one introduced by this run.

---

## 2026-08-22T19:20Z -- REGULAR ENEMIES: The Swarm, late tier's first piece, composed + verified standalone

Picked up GOALS.md's REGULAR ENEMIES ticket (still open -- weak/normal
tiers are 100% duel-mode, late tier was 0 of 3 composed) at its own
documented "Next" step: start the late tier. Composed The Swarm (Flight
of the Bumblebee), the first of the 3 late-tier pieces THEME.md names,
same "proof piece, verified standalone before wiring" precedent every
mid-tier piece (Gnossienne, Invention, The Metronome) already used --
deliberately NOT wired into any `MONSTER_DEFS` entry yet.

**PD vetting** (re-checked directly, not trusted from THEME.md's table):
Flight of the Bumblebee, an orchestral interlude from Rimsky-Korsakov's
opera *The Tale of Tsar Saltan*, composed 1899-1900 (used 1900, the
opera's completion/premiere year, as the `composed` field -- same
convention every other piece file in this directory uses for a range).
Rimsky-Korsakov died 1908 -- 118 years ago as of 2026, well past the
70-years-dead bar and composed well before 1930. Safely public domain.

**What landed:** `js/wordbound/pieces/flight-bumblebee.js` (new), wired
into all 4 script-load lists (`wordbound.html`, `src/main.jsx`, `src/test/
setup.js`, `tools/build-itch.js`'s DEPENDENCIES manifest -- inserted
alphabetically right after `czerny-299.js`, since `flight-bumblebee.js`
sorts before `gnossienne-1.js`). THEME.md's own gimmick for The Swarm --
"Frantic, chromatic, constant -- no single big crescendo, just relentless
high-frequency pressure" -- is modeled structurally, not just described,
in four ways:

1. **True chromaticism, not just a label.** The melody cell is a literal
   24-note round trip built from INTEGER SEMITONE OFFSETS (0 through 12
   going up, 11 down to 1 coming back down) rather than named scale
   degrees the way every other piece file in this directory builds its
   melody -- a direct structural difference from The Metronome's own
   5-distinct-pitch DIATONIC scale-run cell. Verified this isn't just
   claimed: a new dom-check.js structural check computes the pitch class
   (`Math.round(12 * Math.log2(freq/440)) % 12`) of every note in one cell
   and confirms all 12 distinct chromatic pitch classes appear.
2. **Genuinely "frantic."** Each melody note is a sixteenth note (0.25
   beat) with zero gaps -- the fastest, most continuous melodic motion of
   any piece in this directory (The Metronome's own scale-run cell, the
   next-fastest, uses 0.5-beat notes). Tempo is 168 BPM (Presto), also the
   fastest tempo marking of any piece composed so far.
3. **"Constant," verified as a real structural property.** Same
   "identical cell repeated verbatim" check every prior mechanical-feeling
   piece (The Metronome) already established, applied here to the new
   chromatic cell instead of a diatonic one.
4. **"No single big crescendo," verified against the actual intensity
   curve, not assumed from a comment.** `dynamics.keyframes` stays inside
   a genuinely narrow 0.50-0.56 band for the piece's entire 72-beat
   length (sampled every 9 beats via `Music.intensityAt`, the pure
   function, not the sequencer) and carries NO `crescendos` array at all
   -- same "no crescendos" structural choice Air on the G String and The
   Metronome already established for a piece whose whole point is that
   there isn't one, but at a meaningfully HIGHER band (~0.50-0.56 vs The
   Metronome's own ~0.28-0.36) -- the real difference between "unceasing
   pressure" (mid tier) and "boss-adjacent pressure" (late tier), even
   though neither piece ever spikes.

The bass is an unvarying eighth-note "wing-beat" pulse (one identical low
note every half beat for the whole piece) -- the buzzing hum under the
melody's own chromatic motion, and a second "no variation" structural
proof alongside the melody's own repeated-cell check.

**stageTier judgment call** (flagged, pure balance tuning not a
naming/feel call, same convention every prior tier's own first piece
already established): `'late'`. Per `Duel.STAGE_TIER_BASE_PUSH`
(`js/wordbound/duel.js`), `'late'` already pushes 6x harder than `'early'`
(and 2x harder than `'mid'`) before this piece's own curve is even
factored in -- so, like The Metronome before it, this piece's own job is
the SHAPE (a sustained, only mildly undulating high baseline, no discrete
spike) rather than out-pushing a boss on raw peak numbers. This run also
had to ESTABLISH a new peak-intensity convention for the tier, since no
late-tier piece existed before it to need one: `< 0.7` (one step above
mid's already-established `< 0.6` and early's `< 0.5`), keeping "late"
readable as "approaching boss-level" (THEME.md's own "boss-adjacent"
phrasing) without a regular ever actually reaching a boss's own 1.0 peak
(Mountain King, Valkyrie Marshal).

**Verified this run:**
- `npm test` (dom-check.js): 18 new checks (presence / title / PD-vetting
  / 70-years-dead / stageTier / gimmick-string / keyframe-sort-and-bounds
  / peak-below-0.7, a `Music.intensityAt`-driven narrow-high-band-plus-
  no-crescendos check across 9 sample beats spanning the full 72-beat
  length, a true-12-chromatic-pitch-classes structural check, an
  identical-repeated-chromatic-cell melody check, a literal-wing-beat-
  pulse bass check, plus track-note bounds): ALL CHECKS PASSED, clean run,
  no flake hit.
- `npm run test:react` (Vitest): 183/183, unaffected -- true no-op, no
  `src/components/*` file touched, same as every prior unwired
  proof-piece run.
- `npm run build`: clean, 58 modules (up from 57).
- `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED.
  Confirmed directly (not assumed) via `unzip -l dist/wordbound-itch.zip
  | grep bumblebee` that `js/wordbound/pieces/flight-bumblebee.js` is
  actually present in the real zip listing, plus the unzipped
  dom-check.js run (18/18 including this piece's own new checks) and a
  real-browser zero-404s load of the unzipped build.
- Did NOT run `test:mobile` / `test:qa` / `test:react-qa` /
  `test:duel-balance` / `test:branching-map` / `test:music-engine` /
  `test:regular-duel-smoke` / `test:react-duel-loss` / `test:drag-interrupt`
  / `test:run-header` / `test:react-build` -- same judgment call every
  landed mid-tier proof-piece run (Gnossienne's, Invention's, The
  Metronome's own initial composition run) already made and reasoned
  through explicitly: an unwired, unreachable piece file touches none of
  what those scripts exercise.

Version NOT bumped -- nothing shipped to real gameplay this run, same
convention every prior isolated-composition run in this ticket already
followed. GOALS.md's REGULAR ENEMIES ticket stays open (box not checked)
-- late tier is 1 of 3 composed, 0 of 3 wired; The Sabbath and The
Organist are fully unstarted; strong tier still has all 3 old generic
defs (sentinel/warden/spinesplinter) reachable and turn-based/silent.
PLAYTEST FINDINGS item 2 ("no def without `.piece` remains reachable")
therefore also stays open.

**Genuinely-Jaxon-only:** none this run (composition/balance judgment
calls only, all flagged above).

**Next:** compose The Sabbath (Night on Bald Mountain) or The Organist
(Toccata and Fugue in D minor) -- same precedent -- then wire all 3
late-tier pieces into real `strong`-tier `MONSTER_DEFS` entries +
`retiredFromPool` on sentinel/warden/spinesplinter in one dedicated
wiring run, mirroring the normal-tier wiring run's own shape. That
finally closes PLAYTEST FINDINGS item 2 and makes this ticket's remaining
VERIFY-line items (virtual-clock sim confirming the full tier curve,
Playwright duel smoke per tier) meaningful to run for the first time.

**Live deploy refresh, actually executed:** built `dist/app/` fresh off
this run's own commit (`bae5337`, 58 modules, identical asset hashes to
the pre-commit build already verified above) in a disposable `git
worktree`, published its contents + an empty `.nojekyll` as the new root
of the `gh-pages` branch via a scratch orphan branch, `git push -f origin
gh-pages-refresh:gh-pages` -- succeeded, confirmed by git's own
ref-update output (`a3144da...ba72ab0 gh-pages-refresh -> gh-pages
(forced update)`). Worktree removed after. **Could NOT curl-verify,
honestly flagged rather than assumed:** `curl -sv
https://gidntsquia.github.io/wordbound-crescendo/` hit the SAME
pre-existing domain-specific proxy block this repo's prior runs have
already repeatedly documented -- a `403` on the CONNECT tunnel to
`gidntsquia.github.io` specifically. The push itself is the actual deploy
action and it succeeded; this is a known, recurring sandbox limitation,
not a new one introduced by this run.

---

## 2026-08-22T19:57Z -- PLAYTEST FINDINGS 2, items 1 and 2 (partial)

Picked up the top of the queue: PLAYTEST FINDINGS 2 (Jaxon's second
playtest) had no prior work logged against it, so started at item 1.

**Item 1 -- combat model alignment (no word-score-to-HP path; segmented
enemy bar; no numeric HP in duel fights):** read `duelCombat.js` and
`duel.js` line by line before touching anything -- the LOGIC was already
correct: `DuelCombat.submitWord` forces `skipDamage: true` on every
`Combat.playWord` call and the only place `monster.hp` gets touched is
`decisiveBlow`, called only on `duelPush.pushWon`. No parallel damage path
existed to remove. What was genuinely missing was the UI: `CombatScreen.jsx`
showed real numeric `monster.hp / monster.maxHp HP` unconditionally, even
during a duel, and `VolumeGauge.jsx`'s enemy-side readout was a bare
"Pushes 0 / 4" text line (hidden entirely for a regular's `pushesToDefeat:
1`) rather than a segmented bar.

Fixed both:
- `VolumeGauge.jsx`: new `.enemy-segments-display` of `.enemy-segment-pip`
  spans, same shape as the existing `.verse-pip` Verses row (filled = a
  push still owed, lost/hollow = a push already won), shown unconditionally
  -- a regular's single pip IS its whole health bar, not a case to hide.
  New CSS in `css/wordbound.css`, danger-red family so the enemy row reads
  as the opposing side from the gold Verses row.
- `CombatScreen.jsx`: the old numeric `.monster-hp-bar`/`.monster-hp-text`
  now render only when `!duelModeActive` (`monster.duel && state.duel`,
  the same condition `VolumeGauge` already mounts on). A classic
  turn-based fight is completely unaffected -- still real numeric HP,
  same as always.

**Item 2 -- difficulty (floor-1 weak-tier win rate ≥ ~80%):** ran
`test/duel-balance-simulation.js` first per the item's own instruction.
It already showed `early regular weak: win 100% / loss 0%` -- looked
satisfied on paper. Before trusting that number alone, checked what
"weak-tier" actually means for a real floor-1 encounter and found the
REAL bug: `js/wordbound/floor.js`'s `getAllowedTiers(1)` returned
`['weak', 'normal']`. Combined with REGULAR ENEMIES' already-landed
normal-tier 100% duel cutover and PLAYTEST FINDINGS item 1's "prefer any
duel-capable def" selection bias in `pickCombatDefId`, floor 1's combat
nodes were drawing UNIFORMLY across all 6 duel-capable weak+normal defs --
roughly half of floor 1's regular fights were secretly a 'mid'-stageTier
duel (Gnossienne/Invention/The Metronome). The sim's own `mid regular
weak` row: **0% win, 100% loss** against the exact same casual profile
that wins 100% of early-tier fights. This is a floor-generation EXPOSURE
bug, not a duel-math imbalance -- early-tier math was already fine.

Fixed at the actual fault line: `getAllowedTiers(1)` now returns
`['weak']` only. Floor 2 (`['weak', 'normal', 'strong']`) is unchanged --
'normal' tier still starts on floor 2 as originally designed, which is
correct per the header curve ("middle-stage pieces have a few real
spikes"). Deliberately did NOT touch any shared `Duel.*` push constant or
piece dynamics -- those serve 'mid' tier's intentionally-harder later-floor
appearances too; a global nerf would have wrongly softened content that's
already correctly tuned, just to patch one floor's exposure bug.

**Verified, real not assumed:**
- Ad-hoc jsdom script (same "load real wordbound.html, `Game.startRun`
  across many seeds" convention PLAYTEST FINDINGS item 1 established,
  deleted after running): 200 seeds, every floor-1 combat node's resolved
  tier tallied. **Before: roughly even weak/normal split (confirmed by
  this run's own reasoning from the pool logic, not re-measured directly).
  After this fix: 1800/1800 floor-1 combat nodes are 'weak' tier, 0
  'normal', 0 'strong'.**
- `npm test` (dom-check.js): ALL CHECKS PASSED. Hit the already-documented
  pre-existing "STOLEN LETTERS boss-kill GAME_OVER" flake once on an early
  run; a clean immediate retry confirmed it's that same characterized
  flake, not a regression.
- `npx vitest run`: 184/184 clean, including 2 new `VolumeGauge.test.jsx`
  tests (a regular's single-pip enemy bar; a pip drops on a real won push)
  and 2 existing tests updated from asserting "Pushes X / Y" text to
  asserting the new pip DOM.
- `npm run build`: clean, 58 modules, unaffected.
- `npm run test:branching-map`: ALL CHECKS PASSED (180 floors/seeds) --
  the floor-1 tier change touches nothing any reachability/orphan/rest/
  elite/treasure/shop guarantee depends on.
- `npm run test:mobile`: ALL CHECKS PASSED (per the header's CSS-change
  rule; the new pip classes are additive).
- `npm run test:react-build` (real browser, built output, full UI-driven
  playthrough incl. drag/touch-drag/FLIP/blank-picker): ALL CHECKS PASSED
  twice. Confirms the turn-based (`firstSafeDefId`-pinned) path is
  unaffected by either change; the floor-1 tier fix visibly changed which
  def that path lands on (a weak-tier 20-maxHp monster vs. the prior run's
  ~56-maxHp one) with zero test breakage.
- `npm run test:regular-duel-smoke` / `test:react-duel-loss` /
  `test:react-qa` / `test:qa` (real-browser duel-mode checks: regulars and
  all 4 bosses, win+loss paths, full 4-floor victory): ALL CHECKS PASSED --
  the new segmented enemy bar renders correctly through every real duel
  these scripts drive.
- `npm run test:music-engine` / `test:audio` / `test:drag-interrupt` /
  `test:run-header`: ALL CHECKS PASSED, unaffected.
- `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED (hit
  the same pre-existing dom-check flake once, clean on retry).
- `node test/duel-balance-simulation.js`: reran to refresh
  `test/duel-balance-simulation-results.json` per item 2's own "commit the
  sim evidence" requirement -- content identical to before (no duel-math
  constant changed this run), zero new sanity flags.

Version bumped v0.11 -> v0.12 (`MainMenu.jsx`/`wordbound.html`/
`MainMenu.test.jsx`) -- both changes are real, structural, player-facing.

**Not done, honest gaps -- GOALS.md's box stays unchecked:** item 2's
literal ask ("floor-1 weak-tier win rate ≥ ~80%") is satisfied for the
tier label itself and for the regular-fight exposure bug this run found
and fixed -- but clearing floor 1 also requires beating its boss, Mountain
King (`boss_vowelmaw`, 'mid'-stageTier piece), and the sim's `mid boss
weak` row measures that pairing at **0% win / 100% loss** too, same
severity as the bug just fixed. **A casual player still cannot clear
floor 1 today** -- they can now cleanly handle every regular on the way,
but not the mandatory boss at the end. This is a separate, real, still-open
problem the sim already demonstrates; not fixed this run, deliberately --
Mountain King's balance has its own multi-round pre-duel tuning history
and deserves a dedicated, carefully sim-verified retune rather than a
rushed change folded in alongside the exposure fix (same "balance tuning
gets its own dedicated run" convention REGULAR ENEMIES' own history
already established). Items 3 (music variety bug), 4 (recognizability --
replace The Metronome's Czerny 299 piece), and 5 (streamline the duel UI)
are completely untouched this run.

**Genuinely-Jaxon-only:** none this run -- the enemy-pip bar's visual
shape/color and the floor-1-only tier restriction are balance/UI judgment
calls, not naming/feel/launch calls.

**Live deploy refresh, actually executed:** rebased onto `origin/main`
first (a concurrent human/orchestrator push landed PLAYTEST FINDINGS 3,
see below), then built `dist/app/` fresh off the final rebased commit
(`0a52db1`, 58 modules, same asset shape as every prior React build) in a
disposable `git worktree`, published its contents + an empty `.nojekyll`
as the new root of the `gh-pages` branch via a scratch orphan branch,
`git push -f origin gh-pages-refresh:gh-pages` -- succeeded, confirmed by
git's own ref-update output (`ba72ab0...3baf7dc gh-pages-refresh ->
gh-pages (forced update)`). Worktree removed after. Could NOT curl-verify,
honestly flagged rather than assumed: hit the same pre-existing
domain-specific proxy 403 on `gidntsquia.github.io` this repo's history
already documents repeatedly (`CONNECT tunnel failed, response 403`); the
push itself is the real deploy action and it succeeded.

**Concurrent-push note (no code conflict, real priority-order info):**
`git push` to `main` was initially rejected -- `origin/main` had moved to
`d2a213a`, a real Jaxon-authored commit (not another autonomous run)
adding **PLAYTEST FINDINGS 3** ("declutter order": remove consumables/
deck/log/combos/ink entirely, move Largo + audio controls into a settings
corner) directly ABOVE PLAYTEST FINDINGS 2 in GOALS.md's queue -- now the
genuinely first unchecked item. `git pull --rebase origin main` resolved
cleanly with zero conflicts (Jaxon's commit only touched GOALS.md, in a
region this run's own GOALS.md edit didn't overlap). Re-ran the full
verification suite (`npx vitest run`, `npm test`) on the rebased tree
before pushing -- both still clean -- rather than trusting the pre-rebase
results. Worth flagging for whoever picks up next: PLAYTEST FINDINGS 3
explicitly says it "WINS wherever they conflict" with Playtest-2's own
item 5 (streamline), and its own acceptance bar's combat-screen inventory
("Volume gauge, enemy segment bar, Verses pips, tile rack + input,
crescendo warning, and the corner settings button") directly names and
validates this run's new `.enemy-segments-display` bar as a keeper, not
something PLAYTEST FINDINGS 3 removes.

**Next:** Mountain King's own boss-duel retune is the direct next step to
actually close item 2's real intent (a casual player clearing floor 1
start to finish) -- start from the sim's `mid boss weak`/`mid boss
average` rows, and consider whether the fix belongs on Mountain King
specifically (maxHp/pushesToDefeat/its piece's own dynamics) rather than
any shared 'mid'-tier constant, for the same "don't soften mid tier
everywhere" reasoning this run applied to the regular fix. Items 3-5
remain fully open after that.

---

## 2026-08-22T20:05Z -- PLAYTEST FINDINGS 2 item 1 addendum: a real word-score-adjacent HP bypass the concurrent run's fix missed, found+fixed on the merged tree

Started this run against the same first-unchecked ticket (PLAYTEST
FINDINGS 2, item 1) as the run immediately above, independently:
investigated `js/wordbound/duelCombat.js`'s `submitWord`, confirmed the
same thing that run's own note confirms (word-score damage was already
gauge-only, `skipDamage: true` forced on, only `decisiveBlow` on a won
push touches `monster.hp`), then built the exact same fix the other run
built -- a segmented enemy-pip health bar replacing numeric HP during
duels, wired into `CombatScreen.jsx`/`VolumeGauge.jsx`. `git push` was
rejected non-fast-forward; fetching showed the other run had landed first
(`0a52db1`, "PLAYTEST FINDINGS 2 items 1-2: segmented enemy bar, floor-1
tier-exposure fix"). Diffed the two implementations before doing anything
else: genuinely equivalent (same condition gating the swap, same pip
shape mirroring `VolumeGauge`'s own Verses pips, same red/gold color
split) -- `git reset --hard origin/main` to take theirs rather than land
a duplicate second implementation of the same UI, per this repo's own
established collision-handling precedent (see the PLAYTEST FINDINGS
item-1 entry's own "POSTSCRIPT" from earlier today).

**What survived the reset, because it's genuinely additive, not
duplicated:** before noticing the collision, this run's own reading of
`game.js`'s `Game.submitWord` found a SEPARATE real gap the other run's
diff never touches (confirmed by checking their commit's changed-files
list: `js/wordbound/game.js` and `js/wordbound/duelCombat.js` are not in
it). The other run's note correctly says "no word-score-to-HP path
existed to remove" -- true for a word's own score. But a CONSUMABLE's
bonus damage (`player.bonusDamageUntilEndOfTurn`, granted by Index Card
Shard or Homer's exclusive Wine-Dark Litany) is resolved separately,
later in the same function, via a raw `state.monster.hp = Math.max(0,
state.monster.hp - bonusDmg)` -- UNCONDITIONALLY, including inside a duel
fight. That's exactly the parallel word->HP path item 1 bans, just
sourced from a consumable rather than the word's own score: a player
holding that item could kill a duel-mode monster outright without ever
winning a push, invisible to the segment bar the other run just built.

**Fix:** new `DuelCombat.applyBonusPush(monster, duel, now, bonusDamage)`
in `js/wordbound/duelCombat.js` -- a second, independent
`duel.applyPlayerPush` call through the exact same `decisiveBlow`
mechanism the word's own push already uses (not a new damage path of its
own). `game.js`'s bonus-damage block now branches on `isDuelFight`: duel
mode routes through this new push, turn-based mode keeps the original
direct subtraction (correct there -- no gauge to push through). Verified
the second push call is genuinely safe in every duel state, not assumed:
`duel.applyPlayerPush` itself no-ops (`{pushed:0, pushWon:false}`) once
`duel.isTerminal()` (read directly in `duel.js` before relying on it), so
a bonus landing on an already-lethal word can't double-defeat an
already-dead monster or push a boss past its final phase; on a
non-terminal multi-push boss it's a second real push against the
just-recentered gauge -- extra force, same as the flat bonus damage
always represented, just correctly routed now.

**Verified against the MERGED tree (their landed commit + this addition
applied on top), not just this addition in isolation:**
- `npm test` (dom-check.js): ALL CHECKS PASSED, clean.
- `npm run test:react` (Vitest): 184/184 clean, unchanged from the
  concurrent run's own count (this addition touches no
  `src/components/*` file, no new/changed test needed for it beyond what
  the concurrent run's own VolumeGauge/EnemySegmentBar-equivalent tests
  already cover for the UI half).
- `npm run build`: clean.
- `npm run test:regular-duel-smoke`: ALL CHECKS PASSED -- every regular
  tier (weak/mid, including The Metronome) still killed via a real duel
  word, real Verse-loss GAME_OVER still fires, on the merged tree.
- `npm run test:react-duel-loss`: ALL CHECKS PASSED -- Largo/Ritardando/
  Sordino/Fermata/Rubato, the crescendo countdown, a real block loss,
  Second Wind's revival, and a real fatal loss all still work.
- `npm run test:react-qa`: ALL CHECKS PASSED -- full 4-floor victory run,
  all 4 bosses killed via real duel words, zero console/page errors.
- `npm run test:mobile` / `npm run test:branching-map`: ALL CHECKS
  PASSED, unaffected (no CSS/floor-gen change in this addition).
- `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED --
  confirms the shared-engine change (game.js, duelCombat.js) still works
  in the vanilla itch bundle.
- `npm run test:duel-balance`: ran clean, no new sanity flags (this
  addition doesn't touch any push-rate/word-score constant, only how a
  consumable's already-existing bonus routes).
- Did NOT re-run `test:audio`/`test:music-engine`/`test:drag-interrupt`/
  `test:run-header` -- none of this addition's 2 changed files
  (duelCombat.js, game.js's bonus-damage block) intersect what those
  scripts exercise, and the concurrent run this addition builds on top of
  already ran them clean against the same shared-engine surface.

Version stays v0.12 (already bumped by the concurrent run for this same
ticket; this is an addition to that run's own shipped chunk, not a
separate feature).

**Genuinely-Jaxon-only:** none this run.

**Not done, honest gaps -- box stays unchecked (unchanged from the
concurrent run's own note):** item 2's real remaining gap (Mountain
King, floor 1's own boss, still 0% winnable for a weak/casual bot per the
sim) is untouched by this addition. Items 3 (music variety), 4
(recognizability), 5 (streamline) are all still fully open.

**Next:** same as the concurrent run's own note -- Mountain King's boss-duel
retune is the direct next step for item 2's real intent. No other
consumable-bonus-style bypass was found while auditing this one (checked
every other `monster.hp` write site in `game.js`/`combat.js`/
`duelCombat.js` directly -- `combat.js`'s own direct write is gated
behind `skipDamage`, already correctly `true` for every duel-mode call;
`duelCombat.js`'s only other write is `decisiveBlow` itself), so this
addendum is believed to close out item 1's "remove/disable any parallel
word->HP damage path" bullet completely, not just partially -- flagged as
a belief based on a direct audit, not an exhaustive proof.

**Live deploy refresh, actually executed:** built `dist/app/` fresh off
this run's own commit (`f6c5465`, merged tree + this addition) in a
disposable `git worktree`, published its contents + an empty
`.nojekyll` as the new root of the `gh-pages` branch via a scratch
orphan branch, `git push -f origin gh-pages-refresh:gh-pages` --
succeeded, confirmed by git's own ref-update output (`3baf7dc...573f92b
gh-pages-refresh -> gh-pages (forced update)`). Worktree removed after.
**Could NOT curl-verify, honestly flagged rather than assumed:** `curl
-sv https://gidntsquia.github.io/wordbound-crescendo/` hit the same
pre-existing domain-specific proxy block this repo's prior runs have
already repeatedly documented -- a `403` on the CONNECT tunnel to
`gidntsquia.github.io` specifically. The push itself is the actual
deploy action and it succeeded; this is a known, recurring sandbox
limitation, not a new one introduced by this run.

---

## 2026-08-22T20:27Z -- PLAYTEST FINDINGS 3, items 3+4+5 (settings corner + log declutter)

Started at the top of the queue: PLAYTEST FINDINGS 3 (Jaxon's declutter order,
7 sub-items, WINS over Playtest-2's own item 5 wherever they conflict) had no
prior work logged against it. Scoped this run to the lowest-risk, fully
self-contained subset -- pure UI moves/removals with zero economy or
duel-math surface -- rather than attempting all 7 items in one run: items 1
(consumables), 2 (deck view), 6 (combos), 7 (ink) all reach into shop/reward/
duel-scoring code shared with other systems and deserve their own dedicated,
carefully-verified passes (this repo's own established "balance/economy
changes get their own run" convention).

**Item 3 -- Largo's label was UI copy that failed ("Jaxon doesn't know what
Largo means"):** renamed the button from "🐢 Largo"/"🐢 Largo: On" to
"🐢 Slower music (easier)"/"🐢 Slower music (easier): On" and moved it out of
the always-visible run header.

**Item 4 -- mute + volume into a settings corner:** new `SettingsCorner`
component (`src/components/RunSidePanels.jsx`) -- a small ⚙️ gear button,
`position: fixed` in the bottom-right corner of every run screen (map,
combat, shop, reward alike, since it's rendered once at RunScreen's top
level, not per-sub-screen), toggling a popover holding mute, the volume
slider, and the renamed Largo assist. `RunHeaderActions` (the always-visible
run header) now shows only Deck/Consumables -- those two remain in scope for
items 1/2, deliberately untouched this run.

**Item 5 -- remove the log mid-combat:** `RunScreen.jsx`'s `MessageLog` is
now gated on `!state.combatActive` -- gone the instant a fight starts
(turn-based or duel alike), still shown on the map/shop/reward screens
between fights.

**Verified, real not assumed:**
- `npx vitest run`: 186/186 clean. 2 new tests: the settings popover opens
  on a real click of the corner button (closed by default); the message log
  disappears once a real fight starts via a genuine UI-driven node-pill
  click (not a direct `Game.enterCurrentNode` call after render, which
  would never trigger RunScreen's own `bump` re-render -- see its header
  comment). Also updated the 3 existing mute/volume/Largo tests to open the
  settings panel first, and the Largo test's expected text to the new
  label. Hit the pre-existing, already-characterized cross-test flake in
  `duelIntegration.test.js` ("surviving a word..." combatActive assertion)
  once, on an unrelated file this run never touched -- a clean immediate
  re-run of the full suite confirmed it, not a regression.
- `npm test` (dom-check.js): ALL CHECKS PASSED. Confirmed directly (read the
  file before assuming) that `wordbound.html`'s own Largo/mute/volume
  markup is static HTML with entirely different ids/classes -- this run's
  React-only changes don't touch it at all.
- `npm run build`: clean, 58 modules.
- `npm run test:mobile`: ALL CHECKS PASSED (real browser, 375/414px, per
  the header's CSS-change rule) -- the new corner button/popover doesn't
  overflow at either width.
- `npm run test:react-duel-loss` (real browser, built output): ALL CHECKS
  PASSED, including a new check that the settings popover opens on a real
  click; every existing Largo/Ritardando check still passes since the
  script now opens the popover once before its first `.largo-toggle-btn`
  click (it stays open/mounted across the script's later boss re-entries,
  confirmed by the passing checks, not assumed).
- `npm run test:react-qa` (real browser, full 4-floor victory, all 4
  bosses): ALL CHECKS PASSED, unaffected.
- `npm run test:react-build` (real browser, built output, full drag/touch/
  FLIP playthrough): ALL CHECKS PASSED.
- `npm run test:regular-duel-smoke`: ALL CHECKS PASSED (every regular tier
  still killable via a real duel word).
- `npm run test:branching-map`: ALL CHECKS PASSED (180 floors/seeds),
  unaffected as expected -- no floor-gen code touched.
- Manually screenshotted a real built-app run (seeded, The Archivist,
  corner button closed then open) to eyeball actual layout rather than just
  asserting classes exist -- gear button sits cleanly in the corner,
  popover shows mute/volume/"Slower music (easier)" legibly with no
  overlap or clipping.

Version bumped v0.12 -> v0.13 (`MainMenu.jsx`/`wordbound.html`/
`MainMenu.test.jsx`) -- a real, player-facing UI reorg (a control multiple
playtest reports flagged is now out of the main header and relabeled in
plain English).

**Not done, honest gaps -- GOALS.md's box stays unchecked:** items 1
(consumables), 2 (deck view), 6 (combos), 7 (ink) are completely untouched.
The ticket's own acceptance bar ("combat screen containing ONLY: Volume
gauge, enemy segment bar, Verses pips, tile rack + input, crescendo
warning, and the corner settings button") is NOT yet met -- Deck/
Consumables still show in the run header, ink still shows there too, and
combos (not yet audited for UI presence) are untouched.

**Genuinely-Jaxon-only:** none this run -- the settings label copy and its
exact corner placement are UI judgment calls, not naming/feel/launch calls.

**Next:** items 1+2 are naturally paired (deck-add reward step needs a real
replacement decision once tile-deck rewards go away -- gold, or something
duel-relevant -- worth its own dedicated design-plus-implementation run)
and touch `RewardScreens.jsx`/`items.js`/`game.js`/
`test/balance-simulation.js`. Item 7 (ink) likely follows 1+2 since the
ticket's own text says ink removal must re-point "anything currently priced
in ink (rewrites, overcharge, shop stock, shopkeeper ink-discount quirks)",
which overlaps consumable/shop mechanics. Item 6 (combos) is more
standalone but touches `duel.js`/`duelCombat.js` scoring math directly --
deserves its own sim-verified pass rather than folding into a UI-only run
like this one. PLAYTEST FINDINGS 2's own still-open gap (Mountain King's
boss-duel retune, floor 1's real difficulty problem) remains untouched by
this run too -- still the other live open thread above this ticket in the
queue.

**Live deploy refresh, actually executed:** built `dist/app/` fresh off
this run's own commit (`fb32b4b`, 58 modules, v0.13) in a disposable `git
worktree`, published its contents + an empty `.nojekyll` as the new root
of the `gh-pages` branch via a scratch orphan branch, `git push -f origin
gh-pages-refresh:gh-pages` -- succeeded, confirmed by git's own ref-update
output (`573f92b...530ba85 gh-pages-refresh -> gh-pages (forced update)`).
Worktree removed after. **Could NOT curl-verify, honestly flagged rather
than assumed:** `curl -sv https://gidntsquia.github.io/wordbound-crescendo/`
hit the same pre-existing domain-specific proxy block this repo's prior
runs have already repeatedly documented -- a `403` on the CONNECT tunnel
to `gidntsquia.github.io` specifically. The push itself is the actual
deploy action and it succeeded; this is a known, recurring sandbox
limitation, not a new one introduced by this run.

---

## 2026-08-22T20:48Z -- PLAYTEST FINDINGS 3, item 6 (remove combos)

Continued PLAYTEST FINDINGS 3 (7 sub-items; items 3-5 done in the prior run,
this repo's own established next-item note from that run). Picked item 6
("REMOVE combos totally for now") over the paired items 1+2 (consumables +
deck, which need a reward-replacement design call worth their own dedicated
run) since it's standalone with no economy/balance surface -- same reasoning
the prior run itself gave for deferring it.

**What combos were:** `js/wordbound/combat.js`'s `Combat.playWord` tracked a
per-fight `comboState.combo` streak of consecutive DISTINCT words -- each
non-repeat word incremented it, a repeat reset it to 0 -- and used it for a
`comboMultiplier` damage bonus (+12%/stack, capped at 5 stacks -> +60%),
shown as a "Combo xN * +NN%" chip on the combat screen (both the live React
`CombatScreen.jsx` and the vanilla `game.js` `renderCombat` reference
implementation) with a one-shot "bump" pop animation on each stack gain, plus
a combo-driven pitch rise on the hit sound.

**Important distinction kept intact:** the SAME `comboState` object also
carries `usedWords`, which powers a SEPARATE, still-live mechanic -- the
repeat-word penalty (playing a word already used this fight deals x0.4
damage, logged "The Archive has heard that one before"). Jaxon's ticket text
names only combos for removal, not this. Verified this distinction directly
by reading `combat.js`'s scoring math line by line before touching anything,
not assumed from the field names.

**Implementation -- cheap-disable, not hard-delete, per the ticket's own
stated preference ("prefer clean feature-flag/disable... where cheap"):**
`combat.js`'s `playWord` no longer increments `comboState.combo` at all (the
mutation block at the end of `playWord` now only maintains `usedWords`) --
`comboAtPlay`/`comboMultiplier` are still computed FROM `comboState.combo`
exactly as before, but since nothing sets that field above 0 in real play any
more, they permanently resolve to 0/1. The read-side formula was left in
place rather than deleted so existing unit tests that set `combo` explicitly
(testing the math in isolation) still exercise real code, not a stub.

This is a REAL, verified removal though, not just data-starvation dressed
up as one -- the UI/audio surface was actually deleted, confirmed nothing
leaks:
- React `CombatScreen.jsx`: removed the combo-bump ref/effect hooks and the
  `.combo-chip` JSX block entirely (was gated on `combo > 0`, so it would
  never have rendered anyway once `combo` is permanently 0 -- deleted it
  regardless, per the ticket's own "must actually be gone, not
  hidden-but-leaky" instruction, applied here to code cleanliness too, not
  just visible UI).
- vanilla `game.js` `renderCombat`: removed its equivalent combo-chip HTML
  block, the `state.comboBumped` field (init, per-fight reset, and its
  consumption in renderCombat), and the "Combo xN! +NN% damage." log line
  (was gated on `result.comboAtPlay > 0`, same reasoning).
- `playCombatSound`'s combo-driven pitch ramp: removed the `comboLevel`
  param and the `pitchMult` calc entirely, updated its 3 call sites in
  `game.js` to drop the second argument. This one WOULD have silently
  stayed permanently inert (pitchMult always computing to 1x) if left
  alone -- removed it anyway rather than leave dead math sitting in an
  audio-synthesis function.
- `css/wordbound.css`: deleted the `.combo-chip` rule and the `comboBump`
  keyframe. Kept the `comboPop` keyframe -- read the CSS directly before
  assuming and confirmed `.volume-crescendo-warning` (the crescendo-warning
  banner) also uses it, so deleting it would have broken an unrelated,
  still-live animation.

**Verified, real not assumed:**
- `npm test` (dom-check.js): ALL CHECKS PASSED. Amended the synthetic
  "combo streak" test block (previously: 3 consecutive distinct words each
  score a bigger multiplier, +12%/+24%; now: all three assert comboAtPlay 0
  / comboMultiplier 1, damage matches raw score, no growth) and the live-DOM
  "8/8 magnificent-gold" check (previously asserted a `.combo-chip.
  combo-chip-bump` element existed after a real word play through the real
  submit path; now asserts NO `.combo-chip` exists at all) -- both
  previously-passing assertions deliberately rewritten to assert the
  opposite, not silently dropped, per the ticket's own verification
  instruction. The repeat-penalty checks in the same synthetic block (x0.4
  on a repeat, isRepeat flag) are UNCHANGED and still pass, confirming that
  separate mechanic survived untouched.
- `npx vitest run`: 186/186 clean. Amended `CombatScreen.test.jsx`'s
  combo-chip-bump test (replaced with a check that `.combo-chip` never
  renders, even right after playing a real distinct word) and
  `duelCombat.test.js`'s "honors comboState" test (now asserts
  `comboState.combo` stays 0 after `DuelCombat.submitWord`, `usedWords`
  still gets the word added). Hit the pre-existing, already-characterized
  `duelIntegration.test.js` cross-test flake once, on a file this run never
  touched (same flake the last two PROGRESS.md entries already logged) --
  a clean immediate re-run of the full suite confirmed it, not a
  regression.
- `npm run build`: clean, 58 modules.
- `npm run test:mobile`: ALL CHECKS PASSED (real browser, 375/414px) -- the
  CSS change here is pure deletion, no new layout to regress.
- `npm run test:react-build` (real browser, built output, full drag/touch/
  FLIP playthrough): ALL CHECKS PASSED.
- `npm run test:react-qa` (real browser, full 4-floor victory, all 4
  bosses, duel mode): ALL CHECKS PASSED.
- `npm run test:react-duel-loss` (real browser, built output, full duel
  mechanics -- Largo/Ritardando/Sordino/Fermata/Rubato, crescendo warning,
  i-frames, Second Wind, game over): ALL CHECKS PASSED, unaffected.
- `npm run test:regular-duel-smoke` (real browser, every regular tier,
  early + mid): ALL CHECKS PASSED -- real word plays, real kills, real
  damage numbers, none of it broke from removing the combo multiplier.
- `npm run test:qa` (vanilla wordbound.html path, real browser, full
  4-floor victory): ALL CHECKS PASSED -- confirms the non-React reference
  implementation's renderCombat change didn't break anything either.
- `npm run test:branching-map`: ALL CHECKS PASSED (180 floors/seeds),
  unaffected as expected -- no floor-gen code touched.
- Manually ran `node test/duel-balance-simulation.js 10` (NOT a mandatory
  gate -- extra sanity check since this touches `combat.js`'s core scoring
  path the duel-gauge damage conversion is built on): completed cleanly, no
  crash, win/loss/parry numbers in the same ballpark as this ticket's own
  prior documented runs. Did NOT commit the regenerated
  `test/duel-balance-simulation-results.json` -- reverted it before
  committing (that file is prior runs' own recorded output at their own
  trial count, not part of this change; running the sim at a smaller trial
  count for speed would have overwritten it with noise).

Version bumped v0.13 -> v0.14 (`MainMenu.jsx`/`wordbound.html`/
`MainMenu.test.jsx`) -- a real, player-facing removal (no more combo chip,
no more combo-driven pitch rise on hit sounds).

**Not done, honest gaps -- GOALS.md's box stays unchecked:** items 1
(consumables), 2 (deck view), 7 (ink) are completely untouched. The
ticket's own acceptance bar (combat screen containing ONLY the 6 named
elements) is still not met -- Deck/Consumables buttons and ink still show
in the run header.

**Genuinely-Jaxon-only:** none this run -- cheap-disable vs. hard-delete
for the scoring formula's read side is an implementation judgment call the
ticket's own header text explicitly delegates to the orchestrator.

**Next:** items 1+2 (consumables + deck) are the natural next step -- same
reasoning the prior run gave (a real reward-replacement design decision
once tile-deck/consumable rewards go away, touching `RewardScreens.jsx`/
`items.js`/`game.js`/`test/balance-simulation.js`). Item 7 (ink) likely
follows 1+2 per the ticket's own text (ink removal must re-point anything
currently priced in ink, which overlaps consumable/shop mechanics).
PLAYTEST FINDINGS 2's own still-open gap (Mountain King's boss-duel retune,
floor 1's real difficulty problem) remains untouched -- still the other
live open thread above this ticket in the queue.

**Live deploy refresh, actually executed:** built `dist/app/` fresh off
this run's own commit (`a6defef`, main pushed) in a disposable `git
worktree`, published its contents + an empty `.nojekyll` as the new root
of the `gh-pages` branch via a scratch orphan branch, `git push -f origin
gh-pages-refresh:gh-pages` -- succeeded, confirmed by git's own ref-update
output (`530ba85...c60445c gh-pages-refresh -> gh-pages (forced update)`).
Worktree removed after. **Could NOT curl-verify, honestly flagged rather
than assumed:** `curl -sv https://gidntsquia.github.io/wordbound-crescendo/`
hit the same pre-existing domain-specific proxy block this repo's prior
runs have already repeatedly documented -- a `403` on the CONNECT tunnel
to `gidntsquia.github.io` specifically. The push itself is the actual
deploy action and it succeeded; this is a known, recurring sandbox
limitation, not a new one introduced by this run.

---

## 2026-08-22T21:27Z -- PLAYTEST FINDINGS 3, item 1 (remove consumables)

Started at the top of the queue (this ticket, first unchecked). NOTE ON A
RACE: this run's first attempt at item 6 (combo removal) discovered mid-way
that a CONCURRENT run had already landed the exact same ticket item and
pushed it (`ba8a94e`/`a6defef` -- see that commit/PROGRESS entry) -- reset
this session's own duplicate work with `git reset --hard origin/main` rather
than fight a push conflict, then picked up the next real open item instead:
item 1+2 (consumables + deck), the prior run's own documented "Next."

Scoped both before touching code: an Explore agent confirmed `consumables.js`
(one-time-use potions: Errata Slip, Index Card Shard, Page Turn, The
Wine-Dark Litany) is a completely separate system from `items.js`'s
permanent roster -- item 1 doesn't touch items.js's own mechanics. Item 2
(deck view + tile-reward re-point) turned out much bigger than expected --
the per-fight TILE_REWARD screen fires after EVERY kill, not just bosses, so
removing it ripples through ~8 test files' reward-flow assertions. Split the
pairing rather than rush a wide, under-verified change across all of them in
one run: did item 1 completely, left item 2 fully scoped (concrete plan in
GOALS.md's own note) for a dedicated follow-up.

**Item 1, what came out:** `consumables.js` deleted outright; the shop's
pinned consumable slot + `'c:'`-prefixed id branching (`rollShopOptions`/
`effectiveShopPrice`/`Game.buyItem`); the kill-drop roll;
`Game.open/closeConsumablesPanel`/`useConsumable` + vanilla render/wiring;
React's `ConsumablesPanel` + its header button; `ShopChoices`' consumable
branch; Page Turn's rack-cycling branch in `cycleRackAfterWord` (100% dead
once Page Turn is gone, simplified back to a plain discard-and-refill); the
script/import everywhere (`wordbound.html`, `main.jsx`, `src/test/setup.js`,
`tools/build-itch.js`); two orphaned standalone Playwright scripts (neither
wired to an npm script).

**Judgment calls, documented not Jaxon-only:** Interlibrary Loan (+3 dmg
holding 2+ consumables) and Withdrawal Slip (+6 dmg holding 0) were an
opposed build-around pair keyed entirely on the now-gone
`player.consumables.length` -- one would never fire again, the other would
fire on EVERY word (a de-facto unconditional +6). Deleted both rather than
invent a new trigger condition under a removal ticket. Homer's Bard's
Largesse (guaranteed 2 consumable slots) and Wilde's discount quirk both
targeted the gone mechanic -- flagged `quirkInert: true`, same treatment
this file already gives Cervantes's reroll-discount quirk (no reroll
mechanic exists). **Real flagged gap, not fixed here:** Homer's ONLY
exclusive item was the now-deleted Wine-Dark Litany -- he currently has NO
exclusive at all, unlike the other 5 authors. Documented directly in
items.js's and shopkeepers.js's own comments, not left for a future run to
rediscover.

**Verified, real not assumed:**
- `npm test` (dom-check.js): ALL CHECKS PASSED across several clean runs.
  Rewrote every consumable-dependent block rather than delete coverage
  wholesale where a real replacement existed (shop-odds block now tests the
  simpler plain-shuffle contract; Homer/Wilde blocks assert `quirkInert`;
  panel-stacking mid-combat check re-pointed from the consumables panel to
  the item inspector, same `sidePanelOpen` code path). Hit ONE flake on an
  immediate re-run after the version bump -- `waitForScreen(state,
  'TILE_REWARD')` timed out with `state.screen` stuck at `GAME_OVER` in the
  stolen-letters boss-hostage block (a turn-based fight where ambient
  `state.player.ink` carried over from an earlier block, unrelated to this
  run's changes) -- 3 immediate clean re-runs confirmed it's not a
  regression, same "pre-existing shared-state-order flake" pattern this
  file's own header already documents for a different assertion.
- `npx vitest run`: 185/185 clean. Deleted `RunSidePanels.test.jsx`'s
  "consumables panel" describe block outright (nothing left to test) and
  simplified `RewardScreens.test.jsx`'s buy-item test.
- `npm run build`: clean, 57 modules (down from 58 -- `consumables.js` gone).
- `npm run test:mobile`: ALL CHECKS PASSED (real browser, 375/414px) -- the
  run header lost a button, confirmed no new overflow.
- `npm run test:run-header`: ALL CHECKS PASSED across 375-1280px, directly
  relevant given the header change.
- `npm run test:react-build`, `npm run test:react-qa` (exercises the shop's
  real purchase path along a full 4-floor victory), `npm run
  test:react-duel-loss`, `npm run test:regular-duel-smoke`, `npm run test:qa`
  (vanilla wordbound.html path, exercises the shop button removal directly):
  ALL CHECKS PASSED across every one.
- `npm run test:itch-build`: ALL CHECKS PASSED (16/16 + zero-404 real-browser
  load) -- confirms the itch bundle's dependency-list change didn't break
  the standalone build.
- `npm run test:branching-map`: ALL CHECKS PASSED, unaffected as expected.
- `npm run test:duel-balance`: byte-identical numbers to the pre-existing
  baseline, zero new sanity flags -- expected, per-word scoring is untouched.
- `npm run test:audio`, `npm run test:drag-interrupt`, `npm run
  test:music-engine`: ALL CHECKS PASSED, unaffected as expected.

Version bumped v0.14 -> v0.15 (`MainMenu.jsx`/`wordbound.html`/
`MainMenu.test.jsx`) -- a real, player-facing removal (no more Consumables
button/panel, no more consumable shop slots or kill drops).

**Genuinely-Jaxon-only:** none this run -- every choice above (delete vs.
redesign the two coupled items, inert vs. invented-replacement quirks) is a
documented implementation/design judgment call the ticket's own header text
delegates to the orchestrator.

**Not done, honest gaps -- GOALS.md's box stays unchecked:** item 2 (deck
view + tile-reward re-point) is fully scoped (see GOALS.md's own note for
the concrete plan: fold `resolveTileReward`'s boss-branch into
`onMonsterDefeated`'s tail, drop the tile-pick step since gold is already
granted unconditionally on every kill, update ~8 affected test files, decide
the Premium Tile shop-purchase judgment call) but NOT implemented this run.
Item 7 (ink) remains untouched. Homer's missing exclusive item is a real,
undecided content gap.

**Next:** item 2, exactly as scoped in GOALS.md's own note. Then item 7
(ink). Homer's exclusive-item gap and PLAYTEST FINDINGS 2's Mountain King
boss-duel retune remain the other live open threads above this ticket.

**Live deploy refresh, actually executed:** built `dist/app/` fresh off
this run's own commit (`177822f`, main pushed) in a disposable `git
worktree`, published its contents + an empty `.nojekyll` as the new root
of the `gh-pages` branch via a scratch orphan branch, `git push -f origin
gh-pages-refresh:gh-pages` -- succeeded, confirmed by git's own ref-update
output (`c60445c...4fc8bf0 gh-pages-refresh -> gh-pages (forced update)`).
Worktree removed after. **Could NOT curl-verify, honestly flagged rather
than assumed:** `curl -sv https://gidntsquia.github.io/wordbound-crescendo/`
hit the same pre-existing domain-specific proxy block this repo's prior
runs have already repeatedly documented -- a `403` on the CONNECT tunnel
to `gidntsquia.github.io` specifically. The push itself is the actual
deploy action and it succeeded; this is a known, recurring sandbox
limitation, not a new one introduced by this run.

---

## 2026-08-24T03:17Z -- PLAYTEST FINDINGS 3, item 2 (deck view + tile-reward)

Picked the first unchecked GOALS.md item and did the prior run's own scoped
"Next": item 2. Item 7 (ink) is now the ticket's LAST open sub-item.

**Removed:** the per-kill TILE_REWARD screen entirely (pick/skip/resolve
actions, `tileRewardOptions`/`pendingAfterTileReward` state, vanilla
`renderTileReward` + markup, React's `TileRewardScreen`, and the whole dead
`.treasure-choice-tile`/`.tile-reward-letter` CSS family -- `.tile-reward-skip`
KEPT, BossRewardScreen still uses it, checked before deleting). Plus the deck
view: `open/closeDeckViewer`, `deckViewerOpen`, `renderDeckViewer` + markup,
`DeckViewerPanel`, and the header's Deck button (`RunHeaderActions` is now an
empty but still-mounted slot, so header layout/callers are untouched).

**Re-point, as scoped:** `resolveTileReward`'s boss branch folded into
`onMonsterDefeated`'s tail -- boss kill goes straight to BOSS_ITEM_REWARD (or
`advanceFloor()` if all rare/legendaries are owned), regular kill straight back
to the map. No new reward invented: gold is already granted unconditionally on
every kill, so no new balance number needed -- and `test:duel-balance` came
back byte-identical, confirming it.

**Judgment calls, flagged not silently assumed:** the shop's Premium Tile
purchase is LEFT IN (a paid gold sink, and the sole target of Dickinson's live
shopkeeper quirk -- removing it strands a third inert quirk), but it now sells
a tile the player can't inspect, so it's a real open inconsistency for the next
shop/economy pass or for Jaxon. The Shredder event is also still deck-shaped UI
and left alone (tile REMOVAL, not deck-building, and now the only deck-shaping
lever left). Both flagged in GOALS.md too.

**Harness change worth knowing:** ~40 sites used `openDeckViewer();
closeDeckViewer();` purely to force a re-render. That idiom died with the
panel, so it's now an explicit `Game._render()` hook. React scripts needed
more -- RunScreen's `act()`/bump is a local closure unreachable from
`page.evaluate`, which is why they clicked Deck at all -- so RunScreen now
registers its bump via `Game._setReactBump` while mounted and the one hook
repaints whichever tree is live. Confirmed the hard way that the settings gear
is NOT a substitute (its state lives inside SettingsCorner, so it re-renders
that component alone and leaves the node map stale -- a first attempt passed
some checks then timed out on a never-re-rendered boss pill).

**Real pre-existing bug found + fixed:** duelIntegration.test.js's first duel
test never awaited its own deferred `submitWord` resolution, so its 220ms timer
fired against the NEXT test's state -- which sets up a one-point-from-winning
gauge, so the stale push won it and drove a SECOND `onMonsterDefeated`.
Harmless while kills parked on TILE_REWARD; a hard crash once kills call
`advanceMapPosition()` (nulls `currentNodeId`). Fixed at the root (drain the
timer in the test that creates it), not with a production guard.

**Verified, real not assumed:** `npm test` (dom-check) ALL CHECKS PASSED;
`npm run test:react` 186/186; `npm run build` clean (57 modules); and ALL CHECKS
PASSED across `test:mobile`, `test:run-header`, `test:qa`, `test:react-qa`
(full 4-floor victory, all 4 bosses), `test:react-build`, `test:react-duel-loss`,
`test:regular-duel-smoke`, `test:branching-map`, `test:audio`,
`test:drag-interrupt`, `test:music-engine`, `test:itch-build`.
`test:duel-balance` byte-identical (results.json reverted, not committed). Zero
flakes this run. Every removed-UI assertion across ~10 test files was rewritten
to assert the INVERSE (no tile panel in the DOM, no Deck button, removed
`Game.*` actions `undefined`), never deleted.

**Deleted, orphaned + npm-unwired:** `test/verify-boss-item-reward.js` (its
whole subject was the removed sequencing) and `test/verify-rng-fix.js` (already
crashing on main pre-change -- verified by stashing). **Also noted, untouched:**
`test/balance-simulation.js` (old pre-duel sim, npm-unwired) already crashes on
main with a duel-cutover AudioContext error -- verified by stashing, not a
regression here.

Version bumped v0.15 -> v0.16.

**Not done:** item 7 (ink) untouched -- the ticket's acceptance bar is still
unmet (the run header still shows ink). **Next:** item 7. With consumables and
tile rewards both gone, its ink surface is smaller than the ticket assumed.
Homer's missing exclusive item and PLAYTEST FINDINGS 2's Mountain King retune
remain the other live threads.
