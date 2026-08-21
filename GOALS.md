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

Rules for the routine:
- Work top to bottom. Blocked → note why in PROGRESS.md, move to the next item.
- Only check `[x]` when complete, working, and verified. Multi-run tasks are fine —
  leave working state + clear notes each run.
- Commit and push every run, even partial progress.
- Real timestamps only (`date -u +%Y-%m-%dT%H:%MZ`).
- Queue empty → check ROADMAP.md's known gaps; still nothing → note idle, stop.
- Version convention: semantic-ish v0.x displayed in the main menu, bump minor per
  completed feature, patch per fix. Start at v0.1.

## Queue

- [x] SCAFFOLD/PRUNE: this repo was seeded as a full copy of the sibling repo's
      working tree. Make it Crescendo's own:
      1. Remove the Descent of Essence game entirely: index.html and every js/css/test
         file that belongs to it (grep before deleting — some js/ modules and tests are
         shared by Wordbound; anything wordbound.html actually loads stays). Rename
         wordbound.html's displayed title/branding to "Wordbound: Crescendo", version
         v0.1.
      2. Make `npm test` (and test:mobile / test:qa where applicable) run CLEAN
         against this pruned tree — delete or fix tests that targeted the removed
         game; keep every Wordbound-engine test green. The full suite passing is this
         ticket's acceptance bar.
      3. Rewrite README.md minimally: what this game is (one paragraph of the concept
         above), that it's engine-forked from descent-of-essence, quickstart, test
         commands. THEME.md still contains the sibling's library lore — leave it; the
         next ticket replaces it.
      4. Sanity-check `npm run build:itch` / `test:itch-build` still work or disable
         them cleanly with a note (they can be revived at launch time).
      VERIFY: full `npm test` clean, `npm run test:qa` clean or explicitly amended,
      game boots and plays a fight in a real browser (Playwright smoke).

- [x] THEME BIBLE: replace THEME.md with the Crescendo world bible. Premise (Jaxon's,
      keep its spine): an evil music faction has STOLEN THE LETTERS; the player spells
      words to fight musical enemies and win the alphabet back. Name the faction, the
      player role, the setting, in a consistent voice. Design the roster:
      - 3 bosses mapped to FAMOUS pieces (candidates to vet, pick 3 with distinct
        tempo/character: Queen of the Night aria (Mozart), Ride of the Valkyries
        (Wagner), In the Hall of the Mountain King (Grieg), Toccata & Fugue in D minor
        (Bach), Night on Bald Mountain (Mussorgsky), Danse Macabre (Saint-Saëns),
        Flight of the Bumblebee (Rimsky-Korsakov), Moonlight Sonata 3rd mvt
        (Beethoven), Winter/Summer presto (Vivaldi)). Each boss: name, personality
        (for the cutscene ticket), how their piece's dynamics shape their fight.
      - 6-10 regulars mapped to LESSER-KNOWN pieces (Satie Gnossiennes, Bach
        inventions, Grieg lyric pieces, Czerny etudes, a metronome-creature...), each
        with a one-line gimmick.
      - PD vetting noted per piece, per the standing rule.
      Also: settle the game's display name (working title "Wordbound: Crescendo";
      propose alternatives if something better fits — flag for Jaxon either way).
      AMENDED 2026-08-21 (Jaxon's duel-gauge instruction, see header decisions):
      organize the WHOLE roster as a threat curve expressed through the music —
      early-stage enemies get slow/chill pieces (Satie Gymnopédies/Gnossiennes,
      Bach Air on the G String, Debussy Clair de Lune (d. 1918, vet the 1930 rule),
      Grieg Morning Mood...), middle-stage pieces have a few real spikes (In the
      Hall of the Mountain King's accelerando, Danse Macabre, Moonlight 3rd mvt),
      end-stage enemies get frequent, powerful crescendos (Ride of the Valkyries,
      Toccata & Fugue, Night on Bald Mountain, Flight of the Bumblebee), and the
      FINAL BOSS is Beethoven's 5th Symphony (per the header decision; consider its
      movements as fight phases and give the boss a personality worthy of the
      da-da-da-DUM motif — that motif is the game's scariest crescendo telegraph
      for free). ALSO name two themed things: the health-block unit (~5 discrete
      blocks; NOT default hearts unless nothing better fits — candidates in the
      bible's voice, e.g. verses, stanzas, quills, seals; pick one, flag for
      Jaxon) and the duel gauge itself.
      AMENDED 2026-08-21 (Jaxon, guide + shopkeepers): the bible also casts the
      words side's friendly faces. WILLIAM SHAKESPEARE is the player's initial
      GUIDE — he sets the player on the quest. Write his voice (grandiose,
      wordplay-drunk, quotable) and draft the quest-setting beats the intro
      sequence will use. And design a SHOPKEEPER ROSTER of 4-6 FAMOUS AUTHORS
      (long-dead public-domain personas only — historical figures, never modern
      estates; candidates: Austen, Poe, Dickinson, Cervantes, Dickens, Wilde,
      Homer — pick for variety of voice), each with: a distinct personality +
      a few shop lines in their voice, ONE mechanical SHOP QUIRK concept, and
      1-2 EXCLUSIVE-ITEM concepts flavored to them. The implementation ticket
      below (SHAKESPEARE GUIDE + AUTHOR SHOPKEEPERS) builds all of this — the
      bible is its source of truth.
      VERIFY: n/a (design doc) — but keep it consistent with what the engine can do.

- [ ] STRUCTURAL: migrate to React + Vite (Jaxon's instruction — see header
      FRAMEWORK decision). Do this BEFORE the music engine and any duel-UI work,
      so the signature systems get built React-native instead of rewritten later.
      1. Scaffold Vite + React in this repo; wordbound.html's UI becomes React
         components (menu, character select, combat screen, rack/staging, shop,
         map, panels). Port screen by screen; keep commits working.
      2. Game LOGIC stays framework-agnostic plain JS (combat math, RNG, wordlist,
         seeded generation, items): import it from React, don't rewrite it. The
         wordlist's load strategy may need a Vite-friendly import (it's large —
         keep it lazy/async as it effectively is today).
      3. Tests: migrate the verification gates — Vitest + React Testing Library
         replaces the jsdom dom-check harness for logic/DOM assertions; Playwright
         stays for real-browser/mobile/QA flows (port the existing scripts to hit
         the Vite dev server or built output). The migrated suite must cover what
         dom-check covered — don't drop assertions, port them. UPDATE GOALS.md's
         MANDATORY VERIFICATION header in the same commit that changes what
         `npm test` means, so the gates stay accurate for future runs.
      4. Dev/prod: `npm run dev` (Vite), `npm run build` producing a static
         bundle; GitHub Pages deployment can be deferred to a later ticket, but
         the built output must work when statically served (correct base path).
      5. Touch-mode input (tap/drag from the sibling) must survive the port —
         re-verify with the Playwright touch checks.
      This is a multi-run ticket. Acceptance: full feature parity with the pruned
      v0.1 game, all migrated gates green, no vanilla-DOM rendering left.
      ORCHESTRATOR NOTE 2026-08-21 (update): sub-step 3 is DONE for every screen
      ported so far — Vitest + React Testing Library is stood up
      (`vite.config.mjs`'s `test` block, `src/test/setup.js`,
      `src/test/gameHelpers.js`, run via `npm run test:react`) with real,
      repeatable tests (not throwaway scripts) covering MainMenu,
      HowToPlayOverlay, CharacterSelect, RunScreen's node map + screen routing,
      CombatScreen (rack clicks, live damage preview, real word submission,
      overcharge/rewrite), and all six reward/shop/event panels (Treasure, Shop
      incl. affordability gating, TileReward, BossReward, Event incl. a real
      `disabledReason` grey-out, Shredder incl. real deck destruction via its
      `{hold: 'SHREDDER'}` sub-screen) — 32 tests, all driving the REAL engine
      modules end-to-end (no mocks), see `src/components/__tests__/*.test.jsx`.
      GOALS.md's MANDATORY VERIFICATION header now requires `npm run test:react`
      alongside `npm test` (dom-check still covers wordbound.html, unretired
      until full parity per that header's own note).
      ORCHESTRATOR NOTE 2026-08-21 (update 2): GAME_OVER and VICTORY are now
      ported too (`RunScreen.jsx`'s `GameOverScreen`/`VictoryScreen` +
      shared `RunStatsSummary`, direct ports of game.js's renderGameOver()/
      renderVictory()/renderRunStats()) — every `renderRun()`-family screen
      now has a real React port. Unlike the reward/shop/event family (which
      are sub-panels WITHIN #screen-run and keep the run header/message-log
      visible), GAME_OVER/VICTORY are genuinely separate top-level screens in
      vanilla (render()'s early-return dispatch swaps #screen-run out
      entirely) — RunScreen.jsx now returns them BEFORE the run-header
      wrapper to match, confirmed by a real-browser check that the ink/gold/
      floor header and message log are gone on GAME_OVER. Sub-step 1 (screen
      porting) is DONE. Still open, real remaining STRUCTURAL scope: (a)
      Playwright's `test:mobile`/`test:qa`/`test:itch-build` scripts still
      only target wordbound.html, not the Vite/React app — porting THOSE (or
      adding React-app equivalents) is sub-step 3's last piece; (b)
      real-browser verification on the BUILT output (not just dev server);
      (c) tile-staging/drag system + per-hit animations (noted open by
      earlier runs, untouched since). NOTE for whichever run tackles (a)/(b):
      Game.* test hooks (e.g. `Game._advanceFloor`) called via
      `page.evaluate` OUTSIDE the UI's real click handlers skip React's
      re-render entirely (RunScreen.jsx's own `act`/`bump` header comment
      explains why — `bump` is the only thing that triggers a re-render, and
      it only runs from a real UI action) — a real Playwright screen-content
      check needs a real UI-driven path to the target state (e.g. an actual
      boss kill on floor 3 for VICTORY), not a direct engine-hook shortcut,
      or it'll assert against a stale DOM. This run hit exactly that gap
      trying to smoke-check VICTORY's live re-render (see PROGRESS.md) — the
      Vitest/RTL test for it sidesteps the gap by mutating state BEFORE the
      component's first render, which is valid in a fresh test render but
      doesn't generalize to an already-mounted page.
      VERIFY: migrated `npm test` (Vitest/RTL) clean, Playwright QA + mobile
      ports clean, real-browser boot + full fight on the built output (not just
      dev server). Minor bump.
      ORCHESTRATOR NOTE 2026-08-21 (update 3): added `npm run test:react-build`
      (`test/verify-react-build.js`), a NEW committed Playwright script (not a
      throwaway) that builds the real Vite/React app (`vite build`), serves
      `dist/app/` statically, and in one real-browser pass: (1) asserts zero
      failed requests/404s loading the built bundle (the itch-build-style
      "real static-serve, not dev server" bar, now covered for the React tree
      for the first time), (2) drives a genuine UI playthrough -- real
      `.click()`/`.fill()` calls, New Run -> seeded character select
      (`vitest-fixed-seed-1` + The Archivist, the same known-good seed
      `src/test/gameHelpers.js` already relies on) -> a real map-node click
      -> a real word typed and submitted via the actual Play Word button --
      confirming monster HP genuinely drops in the DOM and there are zero
      console/page errors throughout, and (3) checks horizontal-overflow at
      375px/414px (test:mobile's widths) at each screen reached along that
      real playthrough (main menu, character select, run map, mid-fight
      combat) -- the first mobile-layout check of any kind against the React
      component tree's CSS classes. Deliberately UI-driven rather than
      `page.evaluate`-ing `Game.*` hooks directly, per the re-render gotcha
      this ticket's update-2 note already flagged. Ran clean twice in a row
      (no flakes); full `npm test` + `npx vitest run` (34/34) + `npm run
      build` all still clean, confirming no regression. This covers real
      remaining-scope item (a) (a React/Vite equivalent of test:mobile) and
      (b) (real-browser verification on the BUILT output, not dev server)
      for the "does it boot and play through the real build" bar. NOT yet
      done, still real open scope: `test:qa`'s deeper boss-reward-flow
      coverage has no React equivalent yet; `test:itch-build` intentionally
      untouched (it packages `wordbound.html`, the still-shipped reference,
      not the React app -- out of scope here); and (c) the tile-staging/drag
      system + per-hit animations remain unbuilt (CombatScreen.jsx's own
      header comment documents this gap directly -- word entry is
      type-or-click-to-append only, no drag reordering, no floating-damage/
      screen-shake juice). Ticket stays unchecked.

- [ ] MUSIC ENGINE: a WebAudio sequencer the whole game builds on. Requirements:
      - A note-data format for a piece: tracks (melody/bass at minimum), tempo,
        note events, and a DYNAMICS track with explicit crescendo markers
        (timestamp/beat, ramp duration, peak intensity). Store pieces as plain JS
        data modules.
      - Playback through the existing audio module's synth voices (reuse its
        palette + master gain/mute/volume plumbing — the AudioContext resume-on-
        gesture fix from the sibling MUST carry over intact).
      - Solid scheduling (lookahead pattern, no drift over minutes), a tempo-scale
        hook (an item will slow enemy music later — build the hook now), pause/stop.
      - An event API the combat layer subscribes to: 'crescendo-approaching' (lead
        time configurable), 'crescendo-peak', 'piece-ended'. This API is what makes
        crescendo attacks and the parry window possible — its TIMING ACCURACY is
        the acceptance bar.
      - AMENDED 2026-08-21 (duel-gauge decision): in addition to the discrete
        crescendo events, the dynamics track must expose a CONTINUOUS INTENSITY
        function — intensity(t) sampled from the piece's dynamics — because the
        duel gauge is pushed continuously in correspondence with the music, not
        only at crescendo peaks. Crescendos are the spikes of that same curve.
        Pieces also carry a stage-tier field (early/mid/late/final) the combat
        layer reads for the base-push multiplier.
      - Sequence at least ONE vetted famous piece end-to-end as the proof.
      VERIFY: unit tests with a mocked clock proving events fire at the right
      musical positions (±1 scheduler tick), tempo-scale correctness, mute/volume
      integration; real-browser Playwright check that a piece schedules real nodes
      without errors. Audible musicality: flag for Jaxon's ears, honestly.

- [ ] DUEL-GAUGE COMBAT: the signature mechanic, per the header COMBAT MODEL /
      HEALTH MODEL decisions (Jaxon, 2026-08-21 — this ticket REPLACES the older
      "boss attacks at crescendos" combat spec). EVERY fight is a real-time
      tug-of-war duel:
      - THE GAUGE: one meter between player and enemy. The enemy's piece pushes
        it toward the player-damaging end CONTINUOUSLY, force proportional to the
        music-engine's intensity(t) curve — crescendos push much harder — times a
        stage-tier base multiplier (late-stage enemies push a base amount more
        than early-stage; final tier above that). The player pushes it back by
        playing words: word score (full scrabble system — tiles, length,
        weaknesses, items, overcharge if kept) converts to opposing push force.
        Tune the conversion so a decent word visibly moves the gauge and a great
        word swings it.
      - LOSING A PUSH: gauge fully reaches the player's end → lose exactly ONE
        health block, then INVINCIBILITY FRAMES: a grace window (~2-4s, tune)
        where the music's push is suspended/heavily damped and the gauge resets
        toward center — a brutal passage must never chain away multiple blocks
        before the player can respond. Make i-frames visually obvious.
      - WINNING A PUSH: gauge fully reaches the enemy's end → the enemy takes a
        decisive blow. Regulars die in one won push; bosses take several and/or
        phase-shift (Beethoven's 5th: consider a phase per movement, per the
        bible). Implementing run's call on exact structure — document it.
      - HEALTH: ~5 discrete themed blocks (bible names the unit), max raisable
        by items. The sibling's continuous ink-as-HP pool is GONE in this game;
        if ink survives at all it's only as a spend resource, implementing run's
        call — don't keep two life systems.
      - TELEGRAPH: the player must SEE the music coming — current push intensity
        NOW and the upcoming crescendo (swelling meter, scrolling dynamics
        ribbon — design call). The da-da-da-DUM problem is the design target: a
        player who reads the telegraph should feel a big crescendo bearing down
        BEFORE it hits.
      - PARRY (kept from the earlier concept, reinterpreted for the gauge):
        submitting a valid word within a tight window around a crescendo PEAK
        (start ~±200ms, tune) blunts that crescendo's push by a meaningful
        percent, with a distinct SFX/visual so it feels earned.
      - PACING: words playable at any time (the core verb is untouched); clock
        pressure changes WHICH word you go for. Early-tier duels should be
        nearly-safe learning space (their chill pieces barely push); final-tier
        duels only the strongest runs/players survive — the difficulty lives in
        the MUSIC, per the header curve decision.
      - Accessibility: "Largo" assist (global tempo scale via the engine hook,
        clearly labeled, no shame).
      - Balance: virtual-clock duel simulation (deterministic intensity schedule
        + bot with configurable word-rate/reaction profiles); confirm each tier
        is winnable/losable as intended (early ~always winnable, final brutal).
        Document the numbers and the tuning trail.
      VERIFY: mocked-clock unit tests (gauge integration math, block loss at the
      end-state only, i-frame suppression, parry window, tier multipliers),
      Playwright real-browser full duel win AND loss with zero console errors,
      full migrated `npm test` suite. Real feel: Jaxon's playtest — flag when a
      duel is playable end-to-end.

- [ ] BOSS ENTRANCE CUTSCENES: each boss gets a short, SKIPPABLE entrance — their
      woodcut portrait plate, 2-3 taunt lines in their distinct voice (from the
      theme bible), their piece striking up underneath, a title card ("THE QUEEN OF
      NIGHT — she of the burning coloratura"), then the fight. Text/CSS/SVG only,
      reduced-motion gated, skippable with one tap/keypress, never blocks input for
      more than ~600ms before skip is available.
      VERIFY: `npm test` (cutscene elements render, skip works, fight state
      unaffected by skipping), `npm run test:mobile`, Playwright click-through.

- [ ] STOLEN LETTERS META-PROGRESSION: the permanent progression. The faction has
      stolen part of the alphabet; recover letters permanently across runs.
      - Starting stolen set: curated so early runs are playable but visibly
        incomplete (start by stealing e.g. J K Q V X Z + 2-3 mid-tier letters —
        tune; stealing E would be miserable, don't).
      - Recovery: beat a boss → recover a specific letter (their "hostage",
        themed in the bible); optional extra recoveries via achievements.
      - Stolen letters: never appear in racks/shops; visibly locked (chained tile?)
        in a menu "Alphabet" display showing recovered vs. stolen.
      - Persistence via localStorage (follow the achievements system's pattern,
        distinct key). Word validation itself is UNCHANGED (the dictionary doesn't
        shrink — your tile SUPPLY does).
      - Sim check: bot runs with the starting alphabet confirm the game is
        winnable pre-recovery.
      VERIFY: `npm test` (stolen letters absent from draws, recovery persists
      across a simulated reload, display correct), sim sanity, `npm run test:qa`.

- [ ] SHAKESPEARE GUIDE + AUTHOR SHOPKEEPERS (Jaxon, 2026-08-21): the friendly
      faces of the words side are famous dead authors.
      0. FIRST, AMEND THE BIBLE: THEME.md was completed before this request
         landed, so the design work moved here — add the guide + shopkeeper
         section to THEME.md per the "AMENDED 2026-08-21 (Jaxon, guide +
         shopkeepers)" block in the THEME BIBLE ticket above (Shakespeare's
         voice + quest-setting beats; the 4-6 author roster with personality,
         shop lines, quirk, exclusive-item concepts). Match the bible's
         existing voice and PD-persona rule.
      1. GUIDE INTRO: William Shakespeare delivers the quest-setting intro on a
         new game / first run (who stole the letters, what the player must do),
         fully in-character per the bible. Keep it SHORT and skippable (same
         skip bar as boss cutscenes) and reuse the cutscene presentation layer
         where it fits. If tutorial hint moments exist, he fronts those too.
      2. SHOPKEEPERS: each shop visit is run by ONE author picked at random from
         the bible's 4-6 roster (seeded off the run seed — same seed, same
         keepers, so sims/tests stay reproducible; document whether the pick is
         per-shop or per-run and why). Standard shop stock logic stays
         underneath; each author LAYERS ON: their shop lines/personality, their
         mechanical QUIRK (e.g. category discount, extra stock of a type,
         cheaper rerolls — implement whatever the bible specced), and their
         1-2 EXCLUSIVE ITEMS that appear only in their shop. COORDINATE with
         the ITEMS ticket below: exclusives are either drawn from its pool or
         added on top, but always with that ticket's same verification bar
         (hook-level tests + sim sanity).
      3. Woodcut portraits for Shakespeare and every roster author, shared
         style, visible in the intro / shop UI respectively.
      VERIFY: `npm test` (guide sequence renders + skips cleanly, seeded keeper
      pick deterministic, each quirk asserts at hook level, exclusives appear
      only in their author's shop), `npm run test:mobile` (shop layout with
      portrait + dialogue), Playwright smoke: intro click-through + one shop
      visit per author.

- [ ] ITEMS, Jaxon's four + batch: implement Jaxon's four exactly, then round out
      to 8-12 with music-space designs. His four (names are placeholders, use the
      bible's voice):
      1. RITARDANDO: slows ALL enemy music (global tempo-scale via the engine
         hook) — crescendos arrive later, more time to build words.
      2. POETIC LICENSE: any 3-letter combination scores as a word (validity
         bypass for exactly-3-letter plays; keep base scoring low so it's a
         floor-raiser, not a degenerate optimum — sim-check this).
      3. FORTISSIMO: ALL scores doubled, but tiles render at double size and the
         rack holds HALF as many (rack capacity + layout change — test:mobile
         mandatory; interaction with Rewrite/rack cycling must be defined).
      4. THE INVERTED SCORE: flips all tiles upside-down; a word is playable ONLY
         if it reads as a real word upside-down. Define the flip mapping
         conservatively (u↔n, m↔w, b↔q, d↔p, o/s/x/z/i self-flip; letters without
         a clean flipped form make a word unplayable) and remember upside-down
         reading REVERSES letter order. Precompute or check via the mapping +
         dictionary. This is a build-warping rare — cost/rarity accordingly.
      AMENDED 2026-08-21 (Jaxon): also add HEALTH ITEMS — items that increase max
      health blocks (and/or restore a lost block; rare, since ~5 blocks makes each
      one precious — sim-check that health items don't trivialize late tiers).
      Plus 4-8 more leaning into the duel-gauge space: gauge push-resistance,
      longer i-frames, wider parry windows, crescendo-payback effects, tempo/
      letter-recovery synergies.
      Each item: real hook-level `npm test` assertions, seeded-shop appearance
      check, sim sanity per tier. VERIFY as the sibling's item batches did.

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
