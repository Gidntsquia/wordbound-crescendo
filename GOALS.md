# Goals — Wordbound: Crescendo

This file is the task queue for this repo's autonomous hourly dev routine. Jaxon (or
the orchestrator acting on his behalf) adds tasks here. Each run picks the FIRST
unchecked item, does a complete working chunk, checks it off only when fully done AND
verified, and logs to PROGRESS.md.

**WHAT THIS PROJECT IS:** a new "words vs music" game, forked from the Wordbound
engine (sibling repo: descent-of-essence, forked at its v0.42 state). Jaxon's concept:
every fight is a real-time MUSICAL DUEL (wizard-duel tug-of-war — see the combat
decision below); bosses are backed by famous operas/classical pieces, normal enemies
by lesser-known pieces; the piece's actual dynamics ARE the enemy's offense;
permanent progression is unlocking letters the evil music faction has stolen; bosses
get entrance cutscenes (taunt, flaunt, character). The pressure element is central:
you get the best word you can QUICKLY, not the best word possible. It is a SEPARATE
GAME in a separate repo precisely because the engine is expected to diverge — change
engine code freely when the design needs it, no obligation to stay compatible with
the sibling.

**STANDING DECISIONS (made by Jaxon or logged by the orchestrator — don't re-litigate):**
- All music is SYNTHESIZED from sequenced note data via the WebAudio engine. NEVER
  use audio recordings (licensing risk + no-external-assets convention). Owning the
  note data is also what makes crescendo timing exact enough to build the
  attack/parry mechanic on.
  - ONE EXPLICIT EXCEPTION, granted by Jaxon 2026-08-25: the TUG SANDBOX's opening
    opponent plays a RECORDING of Für Elise (public/audio/fur-elise.mp3, Pixabay
    Content License -- the composition is PD, the recording is not), because the
    synthesized transcription still did not sound like a real performance. It is
    confined to src/sandbox/ (recordedFurElise.js + audioPiece.js); js/wordbound/
    music.js and the main app stay synthesized-only, so do NOT generalise this.
    The rule's crescendo-timing reasoning still holds and is honoured by
    extracting an intensity envelope + surge list from the audio offline
    (tools/analyze-audio-piece.js) rather than by giving up telegraphed attacks.
    Do not delete the mp3 as a rule violation -- it is a logged decision.
- PUBLIC-DOMAIN VETTING IS MANDATORY for every piece: composition published before
  1930 AND composer dead 70+ years. (Explicit trap to avoid: Carmina Burana /
  "O Fortuna" is 1936, Orff died 1982 — NOT public domain. Vet each piece and note
  the vetting in PROGRESS.md.)
- Art direction inherits the sibling's inked-woodcut SVG style unless Jaxon says
  otherwise (logged orchestrator default so the two games read as siblings).
- Working title "Wordbound: Crescendo" — a naming pass lives in the theme-bible
  ticket; Jaxon has final say.
- COMBAT MODEL (Jaxon, 2026-08-21, direct instruction — this supersedes any older
  "boss attacks on a turn/crescendo counter" phrasing elsewhere): every fight is a
  DUEL GAUGE — a tug-of-war meter between player and enemy, Harry Potter
  wizard-duel style. The MUSIC pushes the gauge toward the player-damaging end,
  continuously and in correspondence with the actual piece playing (crescendos push
  much harder); later-stage enemies push a base amount more than earlier-stage
  ones. The PLAYER pushes it back toward the enemy-damaging end by spelling words
  (the scrabble system's word score = push force). Health is only lost when the
  player LOSES A DUEL PUSH (gauge fully reaches their end).
- HEALTH MODEL (Jaxon, same instruction): discrete BLOCKS, total much lower than
  the sibling's ink pool — about 5 blocks of a thematically-fitting unit (NOT
  necessarily hearts; the theme bible names it). Losing a duel push costs exactly
  one block, followed by INVINCIBILITY FRAMES (a grace period + gauge reset) so a
  brutal passage can never instantly chain away all health. Items can increase max
  blocks.
- DIFFICULTY CURVE (Jaxon, same instruction): expressed through the MUSIC itself.
  Early-stage enemies have slow, chill pieces posing little threat; middle-stage
  pieces have a few spikes to worry about; end-stage enemies have frequent,
  scarily powerful crescendos that only the strongest runs and players survive.
  FINAL BOSS: Beethoven's 5th Symphony (Jaxon's pick; composed 1808, Beethoven
  d. 1827 — safely public domain; its four movements are a natural phase
  structure).
- FRAMEWORK (Jaxon, 2026-08-21, direct instruction): this game is built in REACT
  ("because I like it more"). The vanilla-JS engine fork gets migrated: game
  LOGIC (combat math, RNG, wordlist, items, seeded generation) stays as plain,
  framework-agnostic JS modules; the entire UI/rendering layer becomes React.
  Vite is the build tool (boring default; orchestrator-logged). The sibling
  repo's "no build step" convention does NOT apply here.

**MANDATORY VERIFICATION (inherited from the sibling repo, same reasons):** run
`npm test` (jsdom dom-check) clean before checking off ANY task touching game logic,
wordbound.html, or rendering/event CSS. `npm run test:mobile` (real-browser, 375/414px)
for any CSS layout/panel change. jsdom cannot verify audio, real timing, or
drag-and-drop — for those, verify what you can (state changes, callback wiring, no
errors), use a real headless browser (Playwright is already a devDependency) for
timing-sensitive checks with a mocked/virtual clock where possible, and say plainly in
PROGRESS.md what's confirmed vs. what still needs real ears/hands. Never claim
confidence you don't have.
ADDED 2026-08-21 (STRUCTURAL sub-step 3, Vitest/RTL stood up): `npm run test:react`
(Vitest + React Testing Library, `src/components/__tests__/*`) is now ALSO mandatory
before checking off any task touching a `src/components/*.jsx` file — it drives the
real engine modules (`window.Wordbound.*`, same import order as `src/main.jsx`)
through the actual React components, not a mock. This does NOT replace `npm test`:
`npm test` (dom-check) still covers `wordbound.html`, which remains the complete,
unmodified reference implementation until the React port reaches full parity — at
that point a future run should retire dom-check and update this header for real, per
the STRUCTURAL ticket's original instruction. Until then both suites are mandatory,
each for the tree it actually covers. When adding a new ported screen, add its
Vitest/RTL test in the same commit rather than letting it lag (see gameHelpers.js's
`freshRun`/`findNodeIdByType`/`defeatCurrentMonster` for the established pattern of
driving real game state instead of hardcoding node ids, which the seed's `floor.js`
node-id counter makes unsafe across tests).

**LIVE DEPLOY (added 2026-08-22, DEPLOY ticket):** the game is publicly served at
https://gidntsquia.github.io/wordbound-crescendo/ from the `gh-pages` BRANCH
(GitHub Pages "deploy from branch"; there is deliberately NO Actions workflow —
every available token lacks the `workflow` scope, see the DEPLOY ticket note).
STANDING RULE: any run that changes game code/assets must, after its normal
verify+push to main, refresh the deploy: `npm run build`, publish the CONTENTS of
`dist/app/` (plus an empty `.nojekyll`) as the new root of the `gh-pages` branch
(orphan/replace commit, `git push -f origin gh-pages`), a plain branch push that
the sandbox's `repo`-scoped token CAN do. Verify with a curl of the live index +
one hashed asset URL (expect 200s; Pages takes ~a minute to rebuild). Doc-only
runs may skip this. If the deploy push ever 403s, flag it in PROGRESS.md — do not
silently drop the rule.

Rules for the routine:
- Work top to bottom. Blocked → note why in PROGRESS.md, move to the next item.
- Only check `[x]` when complete, working, and verified. Multi-run tasks are fine —
  leave working state + clear notes each run.
- Commit and push every run, even partial progress.
- Real timestamps only (`date -u +%Y-%m-%dT%H:%MZ`).
- Queue empty → check ROADMAP.md's known gaps; still nothing → note idle, stop.
- Version convention: semantic-ish v0.x displayed in the main menu, bump minor per
  completed feature, patch per fix. Start at v0.1.


**STATE HYGIENE (added 2026-08-24, orchestrator — token-budget protection; these queue
files are re-ingested by every zero-memory run, so their size is a fixed per-run tax):**
- When you check a ticket `[x]`, MOVE its whole block to GOALS_ARCHIVE.md in the same
  commit. GOALS.md stays header + OPEN tickets only.
- PROGRESS.md entries: hard cap ~25 lines. Summarize; never paste passing test/build
  output (name the command and say clean — paste failing output only). When PROGRESS.md
  exceeds ~1,500 lines, move all but the newest ~10 entries verbatim to
  PROGRESS_ARCHIVE.md in the same commit.
- Read PROGRESS.md's tail (offset/tail), never the whole file; archives are history,
  not context — don't read them unless investigating something specific.
- Prefer quiet test reporters where available; keep large command output out of your
  transcript when a summary line proves the same thing.
- NO inline run narratives inside tickets. Each OPEN ticket carries exactly one
  compact "STATE ..." block (≤~20 lines), REWRITTEN IN PLACE each run: items
  done/open, the concrete next chunk, open judgment calls/flags. The full run
  story goes in PROGRESS.md as always; when a STATE update supersedes older
  text, move that text verbatim to GOALS_ARCHIVE.md ("Rotated run notes"
  section) in the same commit. Read a ticket's rotated notes only when its
  STATE block says the detail you need lives there — targeted, never by
  default.

## Queue

(Completed tickets live in GOALS_ARCHIVE.md — see STATE HYGIENE above.)

- [ ] PLAYTEST FINDINGS 3 — JAXON, 2026-08-22 (~20:00 UTC), DECLUTTER ORDER.
      His list, near-verbatim, all binding; this EXTENDS Playtest-2's item 5
      (streamline) and WINS wherever they conflict. "Remove" below means
      gone from the playable product NOW — prefer clean feature-flag/
      disable over irreversible deletion where cheap (he said "for now" on
      several), but the UI must actually be gone, not hidden-but-leaky:
      1. REMOVE the consumable mechanic in its entirety (no consumable
         drops, no consumable UI/slots anywhere).
      2. REMOVE the deck view — Jaxon: "we aren't adding tiles to our deck
         anymore." Crescendo has no deck-building: no add-tile-to-deck
         rewards or views. If deck data structures still feed the rack
         internally, that's implementation detail — nothing deck-shaped in
         the UI, and no reward step that offers deck tiles (re-point those
         reward moments to something duel-relevant or drop them; document
         the call).
      3. The "Largo" assist: Jaxon doesn't know what Largo means — the
         label failed. MOVE it into the settings menu as plain English
         ("Slower music (easier)"), out of the combat screen entirely.
      4. MOVE mute + volume into a small settings-menu button tucked in a
         bottom corner, out of the way. Settings holds: volume, mute, the
         slower-music toggle, and any future options.
      5. REMOVE the log screen in the middle of combat.
      6. REMOVE combos totally for now (no combo counter, no combo chip,
         no combo scoring bonuses in duels).
      7. REMOVE ink entirely for now — this resolves the orchestrator's
         earlier flagged question: ink is OUT, not demoted. No ink counter,
         no ink costs, no ink rewards. Anything currently priced in ink
         (rewrites, overcharge, shop stock, shopkeeper ink-discount quirks)
         gets re-pointed to gold or disabled with a documented judgment
         call per case — nothing may remain that shows or spends ink.
      Verification: the mandatory suites will have tests asserting on the
      removed UI — amend those tests DELIBERATELY in the same commits
      (coverage moves to asserting the clean layout), never leave red.
      Deploy per the LIVE DEPLOY rule each run so Jaxon can re-test.
      Check this box only when a live-build seeded playthrough shows a
      combat screen containing ONLY: Volume gauge, enemy segment bar,
      Verses pips, tile rack + input, crescendo warning, and the corner
      settings button — with no ink, combos, consumables, deck, log, or
      unexplained labels anywhere in the run flow.
      STATE 2026-08-24 (orchestrator hygiene pass; full run notes:
      GOALS_ARCHIVE.md § "PLAYTEST FINDINGS 3 — rotated run notes"):
      DONE: items 1–6. Consumables removed outright (consumables.js
      deleted; Interlibrary Loan + Withdrawal Slip deleted as an orphaned
      pair; Homer/Wilde quirks quirkInert). Deck view + per-kill
      TILE_REWARD screen removed — boss kills go straight to
      BOSS_ITEM_REWARD (or advanceFloor when all rares owned), regular
      kills straight to the map; gold is the whole per-kill reward.
      Largo → corner ⚙️ settings popover as "Slower music (easier)", with
      mute + volume (SettingsCorner, RunSidePanels.jsx). No message log
      during combat. Combos fully removed (repeat-word penalty KEPT).
      Test seam to know: Game._render() + Game._setReactBump replaced the
      old open/closeDeckViewer force-re-render idiom (~40 call sites).
      OPEN: item 7 (ink) — the LAST sub-item. Re-point anything priced in
      ink (rewrites, overcharge, shop stock, shopkeeper ink quirks) to
      gold or disable with a documented call; surface is smaller than the
      ticket assumed now that consumables + tile rewards are gone. Ink
      counter still shows in the run header — acceptance bar not met
      until it's gone.
      FLAGGED for Jaxon / a later shop pass (defensible as-is, not
      blocking): Premium Tile purchase LEFT IN (paid gold sink, Dickinson
      quirk targets it — but it sells a tile the player can no longer
      inspect); Shredder event LEFT IN (tile-removal, the run's only
      remaining deck-shaping lever). Homer still has no exclusive item
      (flagged in items.js + shopkeepers.js). Version now v0.16.

- [ ] PLAYTEST FINDINGS 2 — JAXON, 2026-08-22 (~19:25 UTC), SECOND PLAYTEST.
      His feedback, near-verbatim: enemies shouldn't have an HP number — HP
      bar instead; damaging them should ONLY happen by winning the duel push
      (pushing the bar in their direction); the game is far too difficult;
      all enemies have the same music; one song is unrecognizable; the base
      mechanic is confusing and needs streamlining. Orchestrator translation
      into binding work, priority order:
      1. COMBAT MODEL ALIGNMENT (this was always the pitch — enforce it):
         in a duel, word scores NEVER damage enemy HP directly. Words push
         the gauge; WINNING a push is the only thing that hurts the enemy —
         one won push = one enemy segment lost, `pushesToDefeat` segments
         total. Remove/disable any parallel word→HP damage path in duel
         mode. Enemy health UI = a SEGMENTED BAR (one segment per remaining
         push), no numeric HP anywhere in duel fights. Mirrors the player's
         Verses pips — two bars, one tug-of-war, fully readable.
      2. DIFFICULTY: floor-1 must be beatable by a casual player. Use the
         existing balance sim with a modest words-per-minute/score profile
         and tune music push rates / player push-per-word until floor-1
         weak-tier win rate ≥ ~80% at casual pace, scaling difficulty into
         later floors per the header curve. Commit the tuned numbers AND
         the sim profile that justifies them.
      3. MUSIC VARIETY BUG: Jaxon heard the SAME music on all enemies.
         Diagnose for real (likely the duel-first floor bias or def
         selection collapsing onto one def) and fix: consecutive fights in
         a run must not repeat the same piece back-to-back when
         alternatives exist in the pool. Verify on a seeded playthrough
         listing which piece each fight used.
      4. RECOGNIZABILITY RULE (standing, add to the header's PD-vetting
         rule): pieces must be PD **and broadly recognizable** — the
         "name that tune in a few seconds" bar. Czerny 299 (The Metronome)
         fails this; REPLACE its piece with a famous one (candidates
         already PD-safe: Turkish March, Für Elise, Ode to Joy, William
         Tell overture, Danse Macabre, Blue Danube). Audit the current
         roster against this bar and list any other misses in PROGRESS.md.
      5. STREAMLINE THE LOOP: in duel fights the combat screen shows ONLY
         what drives the loop — the Volume gauge center-stage, enemy
         segment bar, player Verses, tile rack/input, crescendo warning.
         Demote or hide everything else during duels (numeric HP, intents,
         ink counter prominence, legacy panels). First duel of a fresh
         profile gets ONE short inline hint ("the music pushes — type
         words to push back!"), dismissed on first push win.
      Do these ACROSS RUNS in order; each run deploys per the LIVE DEPLOY
      rule so Jaxon can re-test immediately. Check this box only when a
      seeded live-build playthrough demonstrates 1, 3, and 5 together and
      the sim evidence for 2 is committed; item 4's replacement piece must
      be wired, not just composed.
      STATE 2026-08-24 (orchestrator hygiene pass; full run notes:
      GOALS_ARCHIVE.md § "PLAYTEST FINDINGS 2 — rotated run notes"):
      DONE: item 1 — duel damage flows ONLY through won pushes (verified;
      the one bypass found — consumable bonus damage hitting monster.hp
      raw — was routed through DuelCombat.applyBonusPush; consumables are
      gone entirely now anyway per PF3). Enemy HP renders as an
      .enemy-segment-pip bar in VolumeGauge.jsx; numeric HP gated behind
      !duelModeActive.
      PARTIAL: item 2 — the real "far too difficult" mechanism was floor 1
      drawing normal-tier (mid-piece) duels; Floor.getAllowedTiers(1) is
      now ['weak'] only (1800/1800 floor-1 combat nodes weak across 200
      seeds; sim: early/weak wins 100%). REMAINING GAP, the next chunk
      here: Mountain King (boss_vowelmaw, mid-stageTier piece) still
      measures 0% win for the sim's casual profile — a casual player
      cannot clear floor 1's BOSS. Retune Mountain King itself (maxHp /
      pushesToDefeat / pieces/mountain-king.js dynamics), sim-verified —
      NOT the shared mid-tier constants (correctly tuned elsewhere).
      OPEN: item 3 (music variety — consecutive fights must not repeat a
      piece back-to-back; verify on a seeded playthrough listing pieces),
      item 4 (replace Czerny 299 with a famous PD piece, audit the roster
      for recognizability, add the standing rule to this header's PD
      bullet), item 5 (duel screen shows only the core loop + a one-time
      first-duel inline hint; much of the clutter is already gone via
      PF3 items 1–6).

- [ ] PLAYTEST FINDINGS — JAXON, 2026-08-22 (~17:00 UTC), FIRST HUMAN PLAYTEST.
      His verbatim report, from the live URL: "There's no duel, there's no
      classical music, there's still 'ink' instead of health blocks, the game
      looks basically identical to Wordbound 1." Root cause (orchestrator
      diagnosis, confirmed in code): the duel system is real but GATED
      per-enemy-def; when he played, only 2 boss defs carried a `.piece`, so
      every regular fight ran the classic turn-based/ink path with NO music
      (music exists only inside duels). Component-level tickets got checked
      while the product-level pitch — EVERY fight is a duel — stayed
      undelivered. That is the exact "reads correct, ships wrong" failure
      this file's header warns about, at the product level instead of the
      code level. Standing correction, binding on every future run:
      **PRODUCT ACCEPTANCE = what a player meets in the first 90 seconds,
      not what a component test proves.** Concretely, in priority order:
      1. A NEW run's FIRST fight must be a real duel with audible music.
         Until the whole roster is converted, make floor generation prefer
         duel-capable defs (piece-carrying) over classic ones wherever both
         are eligible — a temporary selection bias, removed when conversion
         completes. Verify with a seeded fresh-run playthrough, not a def
         audit.
      2. Finish REGULAR ENEMIES (next ticket) to 100%: NO def without a
         `.piece` remains reachable in normal play. Do not check that
         ticket off until a seeded full-run playthrough encounters ZERO
         classic turn-based fights.
      3. Make the Verses/health-blocks HP unmistakable in the duel UI
         (blocks as the "~5 discrete themed" pips of the pitch, front and
         center). Ink stays ONLY as the item/rewrite currency for now —
         renaming/retiring ink entirely is Jaxon's call, flagged, not
         assumed; demote its visual prominence in combat so HP reads as
         Verses, not ink.
      4. After ANY change to piece wiring / def conversion / combat
         routing, the gh-pages deploy refresh (header LIVE DEPLOY rule) is
         MANDATORY in the same run — Jaxon plays the live URL; code that
         isn't deployed does not exist for him.
      Check this box only when 1–4 are done and a seeded live-build
      playthrough (Playwright against the real built app) proves the
      first-90-seconds experience: duel gauge visible, music playing,
      Verses pips as HP, from the first fight of a fresh run.
      STATE 2026-08-24 (orchestrator hygiene pass; full run notes:
      GOALS_ARCHIVE.md § "PLAYTEST FINDINGS — rotated run notes"):
      DONE: item 1 — pickCombatDefId narrows every draw to duel-capable
      defs whenever the tier pool has any (506/506 start-lane nodes across
      200 seeds are duels); a fresh run's first fight is always a real
      duel with music.
      PARTIAL: item 3 — Verses pips live in every duel and the ink counter
      is visually demoted while a duel is active; an at-a-glance
      screenshot sanity pass is still open. (Ink's fate is settled since:
      PF3 item 7 removes ink entirely.)
      OPEN: item 2 — tracks REGULAR ENEMIES below (weak + normal tiers are
      now 100% duel; STRONG tier is the entire remaining gap). Item 4 is
      the header's standing LIVE DEPLOY rule (ongoing).
      CLOSING BAR still unrun: one seeded Playwright pass against the LIVE
      gh-pages URL proving the first-90-seconds experience end to end
      (gauge visible + audible music + Verses pips, first fight of a
      fresh run).

- [ ] REGULAR ENEMIES: build the 6-10 regulars from the bible — every one a
      DUEL-GAUGE fight (per the header combat decision; no turn-based mode
      exists), with their lesser-known piece sequenced and driving their push
      curve. The tier curve lives in the music: early regulars' chill pieces
      barely threaten (gentle intensity, rare weak crescendos — the player's
      learning space), mid-tier pieces carry a few real spikes, late regulars
      approach boss-adjacent pressure. Each regular keeps a one-line gimmick on
      top. Woodcut portraits in the shared style.
      VERIFY: migrated `npm test` per-enemy, mobile check, Playwright duel smoke
      per tier (win + loss paths), virtual-clock sim confirming the tier curve,
      PD vetting noted per piece.
      STATE 2026-08-24 (orchestrator hygiene pass; full run notes:
      GOALS_ARCHIVE.md § "REGULAR ENEMIES — rotated run notes"):
      The engine is already generic — ANY def with .piece duel-fights
      (pushesToDefeat defaults to 1 for regulars); no cutover work exists,
      this ticket is pure CONTENT now.
      DONE: weak tier 100% (gymnopediste/gstring/morningmood wired; 4 old
      weak defs retiredFromPool; morning-mood's curve lowered ~4x after
      the sim caught a 100% casual-loss bug). Normal tier 100%
      (gnossienne/invention/metronome wired; serpent/golempup/raven/
      bindingstrap/appendix retired). Both test suites hardened against
      duel-mode draws (dom-check.js firstSafeDefId/pinNodeAwayFromDuelMode;
      gameHelpers' pin-if-needed). Permanent gate: npm run
      test:regular-duel-smoke (early+mid, win+loss). KNOWN TRAP for the
      late-tier smoke extension: force-setup must set
      state.duel.pushResistance = 1 during setup or real push rates erode
      the forced gauge (solved once already — don't rediscover it).
      OPEN (= all of strong/late tier): The Swarm is composed + verified
      standalone (pieces/flight-bumblebee.js; late-tier peak convention
      < 0.7) but NOT wired; The Sabbath (Night on Bald Mountain) and The
      Organist (Toccata and Fugue in D minor) not composed — THEME.md's
      table names + PD-vets both. Then ONE wiring run: 3 strong-tier
      MONSTER_DEFS entries + retiredFromPool on sentinel/warden/
      spinesplinter + this ticket's full VERIFY bar + extend duel-smoke to
      late tier. That wiring run also closes PLAYTEST FINDINGS item 2.
      OPEN DECISION for it: does pickEliteDefId get duel treatment, or is
      it out of scope (elites already telegraph via resistance traits)?
      Convention settled: refresh the gh-pages deploy even for inert
      proof-piece runs. Czerny 299 is slated for REPLACEMENT by PF2
      item 4 (recognizability) — coordinate before composing more around
      The Metronome.
