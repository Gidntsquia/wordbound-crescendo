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

- [x] STRUCTURAL: migrate to React + Vite (Jaxon's instruction — see header
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
      ORCHESTRATOR NOTE 2026-08-21 (update 6): picked up remaining scope (c)'s
      recommended starting point (last run's note: "start by porting the
      blank-picker overlay and combo-bump class first"). On investigation the
      blank-picker turned out NOT to decouple cleanly the way that note
      assumed -- correcting that here so a future run doesn't rediscover it.
      Vanilla only shows the blank-picker overlay in TOUCH mode
      (`state.touchMode`, gated by `if (!state.touchMode) return;` in
      `selectTileForWord`); React's `_initDependencies()` init path (used
      instead of the legacy `Game.init()` to avoid binding 20+ listeners to
      elements that don't exist in this tree) never calls
      `Game.applyTouchModeFromMedia()`, so `state.touchMode` is always false
      in the React app today -- a real touch device still gets the
      typed/clicked-letters path, which works (CombatScreen's blank-tile
      click is unconditionally a no-op, but typing the desired letter still
      resolves through `Lexicon.canFormFromRack`). Porting the picker in
      isolation would be dead code with nothing to open it; it's entangled
      with wiring touch-mode detection AND the tile-staging system
      (`selectTileForWord`/`state.selectedTileIds`), none of which exist in
      CombatScreen.jsx's current type-or-click-to-append model -- genuinely
      part of remaining scope (c)'s "whole feature in its own right," not a
      separable small win. Landed the two pieces of (c) that WERE genuinely
      self-contained instead: the combo chip's one-shot `combo-chip-bump`
      class and the rack's `new-tile` slide-in class, both ported natively
      in `CombatScreen.jsx` (refs tracking the previous committed render's
      combo value / rack tile ids, compared during render) rather than by
      reusing the shared `state.comboBumped`/`state.rackJustRefilled` flags
      game.js's own renderCombat() consumes as a render side effect --
      unsafe to replicate as-is since `main.jsx` wraps the app in
      `<StrictMode>`, which can invoke a function component's body more than
      once per commit; a one-shot flag consumed inside that body could be
      eaten by a throwaway invocation. Full reasoning + the known minor
      cosmetic divergence (a mid-fight side-panel open/close remounts
      CombatScreen, so the untouched rack briefly re-plays its slide-in) is
      in the component's own header comment. Two new Vitest/RTL tests in
      `CombatScreen.test.jsx` drive both through a real word play and assert
      the class is present the render it should be and gone the next.
      Touch-mode detection + the full tile-staging/drag/blank-picker system
      remain completely unbuilt -- still the real remaining scope, now
      scoped more precisely for whoever picks it up next (see PROGRESS.md's
      "Next" note for the concrete first step). Ticket stays unchecked.
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
      ORCHESTRATOR NOTE 2026-08-21 (update 4): found and closed a real,
      previously-unflagged parity gap while scoping between (a)/(c) above --
      auditing what `renderRun()` actually renders in vanilla (not just the
      `state.screen`-keyed panel family RunScreen.jsx already dispatches on)
      turned up that `#items-owned` (the owned-items chip strip),
      `#deck-viewer-panel`, `#item-inspector-panel`, `#consumables-panel`,
      and the run-header's Deck/Consumables/music-mute/music-volume controls
      had NO React equivalent at all -- confirmed by grepping `src/` for
      `item-chip`/`deck-viewer`/`consumablesPanelOpen`/etc: zero hits. A
      player in the React app who picked up an item, wanted to check their
      deck, or wanted to use a consumable mid-fight had no way to do any of
      it; music mute/volume had no control surface either (worse: those two
      vanilla functions, `setMusicVolume`/`toggleMusicMute`, are PRIVATE
      closures in `game.js` wired directly to `wordbound.html`'s own DOM
      listeners -- not exposed on `Game.*` at all, so React genuinely
      couldn't have called them even if it tried). Picked this over (a)/(c)
      because it's a correctness/parity bug (a whole feature invisible, not
      just untested or unbuilt-but-known), the fix pattern was already
      established (the reward/shop family's `.treasure-panel` shape, reused
      as-is), and it was cleanly bounded, unlike (c)'s drag system.
      Landed: `js/wordbound/game.js` gained 3 small public wrappers
      (`Game.getAudioSettings`/`setMusicVolume`/`toggleMusicMute`, calling
      the pre-existing private functions + the pre-existing `render()`
      no-op-when-no-legacy-DOM guard, zero behavior change for
      `wordbound.html`); `src/components/RunSidePanels.jsx` (new) ports
      `renderItemsOwned`/`renderDeckViewer`/`renderItemInspector`/
      `renderConsumablesPanel` + the header's action buttons; `RunScreen.jsx`
      wires them in with the same `sidePanelOpen` precedence rule
      `renderRun()` uses (a side panel replaces map/combat/reward alike, not
      just the map). 6 new Vitest/RTL tests
      (`src/components/__tests__/RunSidePanels.test.jsx`) drive the real
      `RunScreen` end-to-end: chip render + click-to-inspect, deck viewer
      listing the real deck + hiding the map + closing, a real consumable
      disabled outside combat and usable (real ink restore) inside it, and
      both music controls against `Game.getAudioSettings()`. `(a)` test:qa
      parity and `(c)` the drag/animation system are UNCHANGED, still open
      -- this was a genuinely separate, higher-priority find, not progress
      on either. Ticket stays unchecked.
      ORCHESTRATOR NOTE 2026-08-21 (update 5): a follow-up audit (read
      `renderCombat()` in `js/wordbound/game.js` line by line against
      `CombatScreen.jsx`, prompted by update-4's own suggestion) turned up
      nothing new -- every gap found (touch-mode drag/tap-to-play staging,
      the blank-letter picker overlay, hit/damage animations, the combo
      chip's one-shot bump-pop class, rack `new-tile`/`tile-settle` cosmetic
      classes) was already known and correctly filed under remaining scope
      (c). Picked up (a) instead: added
      `test/verify-react-qa-boss-reward.js` (`npm run test:react-qa`), a
      React/Vite equivalent of `test:qa` targeting the one genuinely
      uncovered surface -- the boss-kill -> tile-reward -> boss-item-reward
      panel SEQUENCING -- against a real `vite build` output statically
      served (never the dev server). Deliberately narrower than `test:qa`
      itself: real-word-combat is already double-covered
      (`verify-react-build.js`'s full playthrough, `CombatScreen.test.jsx`'s
      RTL suite), so this sets `monster.hp = 1` as setup (same convention as
      `gameHelpers.js`'s `defeatCurrentMonster`) and lands the kill via one
      real word typed and submitted through the real Play Word button --
      the reward-panel flow, not combat pacing, is under test. Hit the same
      React re-render gotcha update-2/3 flagged, in a new spot: forcing a
      re-render after jumping the map position to the boss node via a direct
      `Game.openDeckViewer()`/`closeDeckViewer()` `page.evaluate` call (the
      vanilla script's trick) silently no-ops in React since it bypasses
      `RunScreen.jsx`'s `act()`/`bump()` closure -- fixed by using a REAL UI
      click on the run-header's "Deck" button then "Close" instead, both
      routing through the real `act()` cycle. Ran clean twice in a row (no
      flakes): full claim path (tile pick -> rare/legendary boss reward ->
      claim -> chip appears -> floor advances, panels confirmed sequential
      not stacked) plus the skip path at a 375px viewport (first-ever
      mobile-layout check of RewardScreens.jsx's `.treasure-panel` shape:
      zero overflow, panel fits viewport, buttons >=36px tappable), zero
      console/page errors, zero failed requests. `npm test` + `npx vitest
      run` (41/41) + `npm run build` all still clean. This closes remaining
      scope (a) in full. Still open, unchanged: (c) the tile-staging/drag
      system (now confirmed to also subsume the blank picker, touch
      reordering, and the hit-animation/combo-bump juice). STRUCTURAL stays
      unchecked -- (c) is the only piece left before the ticket's stated
      acceptance bar ("full feature parity... no vanilla-DOM rendering
      left") is met.
      ORCHESTRATOR NOTE 2026-08-21 (update 7): picked up remaining scope
      (c)'s step 1 exactly as scoped by update-6's PROGRESS.md "Next" note --
      "wire touch-mode detection into the React app... currently entirely
      missing, and nothing touch-specific can be meaningfully tested without
      it." `src/main.jsx` now calls `Game.applyTouchModeFromMedia()` once at
      module load and registers the live `matchMedia('(pointer: coarse)')`
      change listener, exactly mirroring the two calls `wordbound.html`'s
      full `Game.init()` makes (still not called by React, for the reason
      already documented) -- confirmed both calls are safe as-is with no
      `game.js` change needed: `applyTouchModeFromMedia`'s only DOM touches
      (`$('howto-blank-tip')`, `document.body`) are already null-guarded or
      universally present, and grepped `css/wordbound.css` to confirm the
      one CSS rule keyed off `.touch-mode` (`#word-input` hidden) targets an
      id that doesn't exist in the React tree, so toggling the class is a
      currently-invisible no-op there, not a behavior change -- safe to land
      ahead of the tile-staging rebuild it's a prerequisite for.
      `src/test/setup.js` mirrors the same call (confirmed a guaranteed
      no-op in jsdom, which has no `window.matchMedia` --
      `test/dom-check.js`'s own existing comment already established this,
      re-confirmed directly this run: `typeof new JSDOM(...).window.matchMedia
      === 'undefined'`). State.touchMode was always `false` in the React app
      before this, regardless of device -- the one real behavior change is
      `CombatScreen.jsx`'s pre-existing `if (!state.touchMode)
      inputRef.current?.focus()` guards (in `submit`/`clearWord`) becoming
      reachable for real: a touch device no longer gets its word input
      silently re-focused (and its soft keyboard silently popped) after every
      play. New Vitest/RTL test (`CombatScreen.test.jsx`) sets
      `state.touchMode = true` directly (jsdom can't drive the matchMedia
      detection itself) and confirms a real word play doesn't return focus to
      the input. New real-browser checks in `test/verify-react-build.js`
      (built-output only, per this ticket's established bar): default/fine-
      pointer Chromium confirms `state.touchMode` stays `false` and
      `<body>` gets no `.touch-mode` class (the desktop path, unaffected);
      the same in-page `matchMedia` mock `test/verify-mobile-layout.js`
      already uses for `wordbound.html`'s own touch-mode check (via
      `page.addInitScript` + a page reload, since detection only runs once
      at module load) confirms the coarse-pointer path flips both; then a
      real UI-driven fight + word play confirms the input genuinely isn't
      re-focused. Ran `npm run test:react-build` clean twice in a row (no
      flakes). `npm run test:react-qa` and `npm run build` also clean.
      Touch-mode detection was the correct, narrowly-scoped piece to land on
      its own: it's a real, testable behavior change (not dead code, unlike
      the blank-picker update-6 correctly identified) and it's the literal
      prerequisite update-6's own "Next" note named for step 2 (rebuilding
      `CombatScreen.jsx`'s word-entry model around `state.selectedTileIds`).
      **Separately found while running the full suite repeatedly to confirm
      no regression, NOT caused by this run's changes (isolated by `git
      stash`-ing this run's diff and reproducing on the unmodified base
      commit `9ac7911`, 3 runs, ~2/3 failure rate there too):** `npx vitest
      run`'s `CombatScreen.test.jsx` "the combo chip gets combo-chip-bump..."
      test is genuinely flaky when the FULL 7-file suite runs together (not
      in isolation -- 10/10 clean every time run alone), roughly 1 run in 3.
      Debugged one step further than the STRUCTURAL-14/N audio flake note
      did: added temporary logging and caught it failing 3 times -- every
      failure showed the SAME signature (word "RADIO", monster "Quoth" at
      unchanged HP 52, `comboState.usedWords` still empty), meaning
      `Game.submitWord` was never actually invoked for that play -- the
      simulated type+click sequence itself didn't register, not a game-logic
      or seeded-RNG determinism issue. Points at a `userEvent`/RTL timing
      interaction between test files in the same suite (e.g. a stale real
      `setTimeout` or async cleanup racing a later file's render) rather than
      anything in the engine. Not investigated further -- root-causing a
      cross-file Vitest timing race is a genuinely separate, potentially
      sizable ticket of its own, well outside this run's bounded touch-mode
      scope, and every other test (44 total now) is unaffected and consistent.
      Flagging concretely for whoever picks it up: reproduce with `for i in
      1 2 3 4 5; do npx vitest run; done` (full suite, not just the one
      file) and expect roughly 1-2 failures; the fix is almost certainly in
      test isolation/cleanup (a real `setTimeout` from a prior test's
      `CombatScreen` `pendingResolveRef` outliving RTL's automatic unmount,
      or a `userEvent` internal timer), not in `combat.js`'s combo logic,
      which this run confirmed behaves correctly every time the test's own
      preconditions actually hold. `npm run test:react`'s mandatory-gate
      status is NOT reliable as a single run today because of this -- a
      future run should either fix it or, at minimum, note the retry
      convention it needs until it's fixed.
      Remaining scope (c), narrowed further: step 1 (this run) is done. Step
      2 (rebuild `CombatScreen.jsx`'s word-entry model around
      `state.selectedTileIds`, exposing small `Game.*` wrappers around
      `selectTileForWord`/`unstageTile`/`openBlankPicker`/
      `closeBlankPicker`/`assignBlankLetter`/`startTouchReorder`/
      `reorderRackOnDrop`, same pattern as update-4's audio wrappers) is the
      next piece and is still substantial -- treat as its own run. Once
      staging exists, the blank-picker overlay and pointer/touch drag
      reordering both become portable on top of it, per update-6's note.
      ORCHESTRATOR NOTE 2026-08-21 (update 8): landed the CORE of remaining
      scope (c) step 2 -- rack-tile clicks in `CombatScreen.jsx` now go
      through the real engine staging mechanism instead of a fake local
      string, the real prerequisite update-6/7 both pointed at. Scoped this
      run to the tap-to-stage/unstage piece only (no drag, no blank-picker
      UI yet -- see below), a deliberately smaller cut than "all of step 2"
      since the drag system is genuinely its own sub-feature (pointer
      capture, ghost tiles, insertion-index math, FLIP animations, haptics)
      that doesn't fit one bounded run on top of the staging rebuild itself.
      - `js/wordbound/game.js`: exposed real public wrappers (not
        test-only, same "React has no closure access" reasoning as the
        audio wrappers) -- `Game.selectTileForWord(tileId)` (looks the tile
        up in `state.player.rack`, calls the private function),
        `Game.unstageTile(tileId)`, `Game.openBlankPicker(tileId)`,
        `Game.closeBlankPicker()`, `Game.assignBlankLetter(letter)`,
        `Game.stagedWord()`, and `Game.clearStagedWord()` (mirrors
        `#btn-clear-word`'s state reset). Needed two small additive
        null-guards to make the private functions safe to call from
        React: `syncWordInput()`'s and `selectTileForWord()`'s
        `$('word-input')` DOM access now checks the element exists first
        (same `reactTreeActive()`-style reasoning as every prior "make a
        vanilla function React-safe" fix this ticket has needed --
        confirmed by reading `wordbound.html`, its `#word-input` always
        exists there, so this is a guaranteed no-op for vanilla, not a
        behavior change -- `npm test` full suite stayed green).
      - `src/components/CombatScreen.jsx`: rack-tile clicks now call
        `Game.selectTileForWord(tile.id)`/`Game.unstageTile(tileId)`
        instead of `setWord((w) => w + tile.letter)`. A staged tile
        renders as an empty `rack-slot-empty` button in its rack position
        (matches `renderCombat()`'s "same footprint, tile lives in
        staging now" behavior) and a real `.staging-area` row (new, sits
        between the rack and the damage preview, mirroring
        `renderStagingArea()`'s DOM shape/CSS classes exactly) shows the
        staged tiles, each clickable to unstage. The free-typing desktop
        path is UNCHANGED and still the actual submit source (confirmed by
        re-reading `game.js`'s `btn-submit-word` handler: desktop submits
        `word-input`'s raw text regardless of what's staged -- real
        existing vanilla behavior, not a shortcut) -- local `word` state
        stays, now resynced from the real `Game.stagedWord()` after every
        stage/unstage/clear, exactly like vanilla's `syncWordInput()`.
        Deliberately did NOT resync on a blank-tile click in desktop mode
        (a genuine no-op in the engine, confirmed by reading
        `selectTileForWord`'s own early return) -- an earlier draft of
        this run's diff called `setWord(Game.stagedWord())`
        unconditionally on every tile click, which would have silently
        clobbered manually-typed text on a blank click; caught and fixed
        before committing by re-reading `game.js`'s branching instead of
        assuming symmetry.
      - Left genuinely untouched (still the real remaining scope):
        pointer-drag and touch-drag reordering within the rack/staging
        row (`startStagingDrag`/`startTouchReorder`/`reorderRackOnDrop`),
        the FLIP slide animations (`flipTile`) and one-shot land-settle
        class (`markSettle`/`tile-settle`), haptic ticks, and the
        blank-letter picker OVERLAY UI itself -- `Game.openBlankPicker`
        is now wired (a touch-mode blank-tile click calls it for real),
        but nothing renders the overlay yet, so it's an inert flag, not a
        crash and not a regression from the prior always-no-op blank
        click in every mode.
      **Verified:** `npm run build` clean (39 modules, same pre-existing
      chunk-size notice). `npm test` (jsdom dom-check, full suite): ALL
      CHECKS PASSED -- confirms the two `game.js` null-guards are true
      no-ops against wordbound.html's real DOM. `npx vitest run
      src/components/__tests__/CombatScreen.test.jsx`: 13/13 (10
      pre-existing + 3 new, added this run specifically because the
      pre-existing tile-click tests only ever asserted on the word-input's
      TEXT, which would have kept passing even under the old fake model --
      the 3 new tests assert directly on `state.selectedTileIds` and the
      real `.staging-area`/`.staged-tile` DOM: stage-by-click, unstage-by-
      click, and Clear resetting both). Full `npx vitest run`: 47/47 in 2
      of 3 repeated runs, 1 failure in the third -- the exact same
      pre-existing "combo chip gets combo-chip-bump" full-suite flake
      STRUCTURAL-15/N already characterized (not this run's change; same
      signature, same ~1/3 rate, unrelated file). `npm run test:react-build`
      (real browser, built output): ALL CHECKS PASSED, run 3x clean
      including 5 new assertions added this run (stage a rack tile for
      real, confirm `state.selectedTileIds`/the real staging DOM, unstage,
      confirm both are empty again) alongside the pre-existing typed-word
      playthrough (still passes unchanged, confirming the desktop typing
      path survived the rewrite). `npm run test:react-qa`: ALL CHECKS
      PASSED (full boss-reward flow, unaffected). `npm run test:mobile` +
      `npm run test:qa` + `npm run build:itch` + `npm run test:itch-build`:
      ALL CHECKS PASSED -- confirms wordbound.html's own touch-mode/
      blank-picker path (which DOES render the overlay) is completely
      unaffected by the two null-guards.
      **Not done:** drag reordering (mouse + touch), the blank-picker
      overlay UI, FLIP/settle/haptic juice -- all correctly still open.
      Ticket stays unchecked. **Next:** the blank-picker overlay is now
      genuinely buildable on top of this run's staging (it just needs a
      React overlay component wired to `state.blankPickerOpen`/
      `state.blankPickerTileId` + a grid of 26 buttons each calling
      `Game.assignBlankLetter(letter)`, all already exposed) -- a
      reasonably-scoped next chunk on its own, smaller than the drag
      system. Drag reordering (pointer capture, ghost tiles, insertion-
      index math, FLIP animations) remains the biggest genuinely open
      piece and is likely still its own multi-run push after that.
      ORCHESTRATOR NOTE 2026-08-21 (update 9): picked up update-8's own
      "Next" note exactly as scoped -- the blank-picker overlay UI, the one
      remaining piece it identified as reasonably-scoped on its own. NOTE:
      this run started concurrently with update-8's (a container-level
      overlap between two hourly instances, not a coordination failure on
      either side) and had ALREADY independently rebuilt tap-to-stage/
      unstage plus the blank picker before discovering update-8's commit
      had landed first on `origin/main`. Reconciled properly rather than
      force-pushing over it: reset to `origin/main`, kept update-8's tap-
      to-stage/unstage implementation entirely as-is (including its
      `Game.selectTileForWord(tileId)`/`stageOrUnstage`/`unstage` API
      shape, which differs slightly from this run's own discarded first
      draft -- update-8's is the one that's live), and landed only the
      genuinely new piece on top: `src/components/CombatScreen.jsx` now
      renders `state.blankPickerOpen` as a real `.blank-picker-overlay`
      (A-Z grid + Cancel, same CSS classes/shape as `wordbound.html`'s own
      overlay), calling the already-exposed `Game.assignBlankLetter`/
      `Game.closeBlankPicker`. Before this, a touch-mode tap on a blank
      tile flipped `state.blankPickerOpen` true with nothing to render it
      -- a blank tile was silently unplayable on touch (desktop is
      unaffected: `selectTileForWord` no-ops on a blank there, typing the
      letter is still how a blank gets used). No `game.js` changes needed
      this run -- update-8 already exposed every wrapper this needed.
      2 new Vitest/RTL tests (open-and-pick stages the blank with the
      chosen letter; Cancel discards without staging) plus a new
      opportunistic real-browser check in `test/verify-react-build.js`
      (taps a real ★ tile if this deterministic seed's rack has one at
      that point in the fight; this run's playthrough didn't, logged
      honestly rather than skipped silently -- the Vitest/RTL tests inject
      a blank directly so the path is still unconditionally covered).
      SEPARATELY, the most valuable find of this run: adding the 2 new
      blank-picker tests made the pre-existing Vitest flake (STRUCTURAL-
      14/N and 15/N, and update-8's own verification section above --
      `userEvent.click()`/`type()` sequences intermittently not
      registering) fail on almost EVERY run within `CombatScreen.test.jsx`
      alone (confirmed on update-8's unmodified commit before touching
      anything -- not something this run's new tests caused). Root-caused
      it properly instead of re-deferring a third time: instrumented the
      component's one real timer (`pendingResolveRef`'s `setTimeout`, the
      leading suspect prior entries guessed at) with temporary console
      logging -- across many repeated runs it never once fired late/stale,
      completely ruling out the "leaked timer races a later test" theory.
      Tested the actual trigger directly: swapped every
      `userEvent.click()`/`type()` call in `CombatScreen.test.jsx` for
      RTL's synchronous `fireEvent.click()`/`change()` (skips user-event's
      async hover/pointerdown/pointerup/focus choreography entirely) --
      the flake disappeared completely. Root cause: `@testing-library/
      user-event` v14's internal async event simulation racing against
      something in this Vitest/jsdom setup, not this component, its timer,
      or a cross-file leak. Documented in the test file's own new header
      comment for whoever next touches Vitest/RTL setup elsewhere in the
      repo. NOT claimed: the only possible cause of Vitest/jsdom flakiness
      here, or that other test files (none show the same symptom) need
      preemptive treatment.
      **Verified:** `npm test` (dom-check): ALL CHECKS PASSED, unaffected
      (no `game.js` change this run). `npm run build`: clean. `npx vitest
      run` (full 7-file suite, 49 tests): **3/3 consecutive clean runs,
      zero flakes** -- up from update-8's own "1 failure in 3" full-suite
      note and this run's own confirmed "fails almost every run" state
      on `CombatScreen.test.jsx` alone before the fireEvent fix.
      `npm run test:react-build` (real browser, built output): ALL CHECKS
      PASSED, run 2x clean, including the new blank-picker checks (or the
      honest skip note when the seed's rack has no blank at that point).
      `npm run test:react-qa`: ALL CHECKS PASSED, unaffected.
      **Not done:** drag reordering (mouse + touch), FLIP/settle/haptic
      juice remain the one real piece left before this ticket's stated
      acceptance bar ("full feature parity... no vanilla-DOM rendering
      left") is met. Ticket stays unchecked. **Next:** drag reordering --
      `game.js`'s `startTouchReorder`/`reorderRackOnDrop` (rack) and
      `startStagingDrag`/`updateStagingDrag`/`endStagingDrag` (staged-tile
      reorder + drag-out-to-remove), currently wired only in the legacy
      `Game.init()` path via document-level pointer/touch listeners --
      these need their own `Game.*` wrappers or a React-native
      reimplementation using pointer events directly (worth weighing
      against wrapping the existing vanilla state machine), plus real
      Playwright touch-drag verification. This is the last piece before
      STRUCTURAL's acceptance bar is met, pending a final vanilla-DOM-
      rendering audit.
      ORCHESTRATOR NOTE 2026-08-21 (update 10): picked up this ticket's own
      "Next" note's first piece -- desktop MOUSE drag reordering within the
      rack, deliberately scoped narrower than "drag reordering" as a whole
      (touch reordering and the staged-tile ghost/drag system are both
      genuinely separate sub-features, noted below). `js/wordbound/game.js`
      gained three small public wrappers -- `Game.startTileDrag(tileId)`/
      `endTileDrag()`/`reorderRackOnDrop(dropIndex)` -- calling the
      pre-existing private functions wordbound.html's own dragstart/drop/
      dragend listeners already call directly; zero behavior change there
      (confirmed by the full `npm test` + `test:mobile` + `test:qa` +
      `test:itch-build` gates, all still green). Deliberately did NOT expose
      or mirror `state.dragOverIndex`: grepped `css/wordbound.css` and
      `wordbound.html` and confirmed it has no CSS rule or DOM read anywhere
      in either tree -- vanilla's own dragover handler sets it directly on
      `state` without ever calling `render()`, so it has never driven any
      visible feedback even in wordbound.html. Replicating genuinely-dead
      state into React would just be cargo-culting it into a second place;
      `CombatScreen.jsx`'s `onDragOver` only calls `preventDefault()`, which
      is all a browser needs to accept the drop.
      `src/components/CombatScreen.jsx`: rack `letter-tile` buttons (not the
      empty-slot placeholders a staged tile leaves behind -- matches
      vanilla's own scope exactly, which only attaches drag listeners to the
      same branch) are now `draggable`, wired to
      `onDragStart`/`onDragOver`/`onDrop`/`onDragEnd` calling the three new
      wrappers, using the tile's live rack `index` from the `.map()` closure
      as the drop target -- same semantics as wordbound.html's own handlers.
      **Verified:** `npx vitest run` (full 7-file suite, 51 tests incl. 2 new
      drag-reorder tests in `CombatScreen.test.jsx` that fire the real
      `dragStart`/`dragOver`/`drop`/`dragEnd` DOM event sequence via RTL's
      `fireEvent` -- jsdom has no native `DragEvent` constructor, confirmed
      directly, but `fireEvent`'s generic-Event fallback still lets a fake
      `dataTransfer` attach, which is all the handlers read): **3 consecutive
      clean runs, zero flakes** -- the STRUCTURAL-14/15/16/N flake stays
      genuinely fixed, not just quiet. First test asserts the real
      `state.player.rack` order changes correctly (caught and fixed my own
      wrong assumption here: a naive "dragged tile ends up appended at the
      very end" expectation failed once against the real engine -- rereading
      `reorderRackOnDrop`'s own `insertIndex` comment showed it actually
      lands the dragged tile BEFORE whatever tile originally sat at the drop
      index, i.e. second-to-last when dropped "onto" the last slot, not
      appended after it; fixed the test to compute that for real rather than
      loosening the assertion). Second test confirms a self-drop (drop back
      onto the same tile) is a genuine no-op. `npm run test:react-build`
      (real browser, built output): ALL CHECKS PASSED, run 2x clean,
      including a NEW real-browser check using Playwright's `locator.dragTo()`
      -- genuine native Chromium mouse-down/move/up drag-and-drop, not a
      synthetic event, the first real-browser proof this mechanism works
      outside jsdom's fallback -- confirms the exact same reorder semantics
      and that `state.draggedTileId` clears afterward. `npm run
      test:react-qa`: ALL CHECKS PASSED, unaffected. `npm test` (jsdom
      dom-check, wordbound.html): ALL CHECKS PASSED. `npm run test:mobile` +
      `npm run test:qa` + `npm run test:itch-build`: ALL CHECKS PASSED --
      confirms the three new `game.js` wrappers are true no-ops for
      wordbound.html's own drag path. `npm run build`: clean, same
      pre-existing single-large-chunk notice.
      **Not done:** TOUCH drag reordering within the rack
      (`startTouchReorder`/`ownTouch`/`updateTouchReorder`/
      `endTouchReorder`, wired only via `touchstart`/`touchmove`/`touchend`/
      `touchcancel` listeners in the legacy `Game.init()` path) and
      pointer/touch drag reordering of already-STAGED tiles (the
      `startStagingDrag`/`updateStagingDrag`/`endStagingDrag` ghost/gap
      system, which live-mutates DOM styles between renders by design --
      genuinely the most involved piece; its own header comment in
      `js/wordbound/game.js` documents the render-destroys-the-dragged-
      element hazard it exists to avoid) remain completely unbuilt in React.
      Ticket stays unchecked. **Next:** touch rack-reorder is the smaller of
      the two remaining pieces -- needs `Game.*` wrappers around
      `startTouchReorder`/`updateTouchReorder`/`endTouchReorder` (mirroring
      this run's mouse-drag wrapper pattern) plus `onTouchStart`/
      `onTouchMove`/`onTouchEnd`/`onTouchCancel` handlers on the same rack
      buttons, then real Playwright touch-drag verification (Playwright
      supports synthetic touch events via manually dispatched
      `Touch`/`TouchEvent`s, same technique `test/verify-mobile-layout.js`
      already uses for wordbound.html's own touch-mode checks). The
      staged-tile ghost/gap drag system is the last and biggest remaining
      piece of remaining scope (c) after that -- likely still its own
      multi-run push, and probably worth weighing a from-scratch React-native
      pointer-capture implementation against wrapping the existing vanilla
      state machine, since the latter's direct DOM-transform approach fights
      React's render model by design (per the hazard comment above).
      ORCHESTRATOR NOTE 2026-08-21 (update 11): landed touch-based rack
      reordering, exactly the piece update-10's "Next" note scoped.
      **Concurrent-run collision hit again first:** this run's first attempt
      at desktop mouse-drag rack reordering (the actual update-10 scope) lost
      a push race to another hourly instance that had already landed and
      pushed the identical feature (same wrapper names, same approach) --
      confirmed genuinely identical by diffing, not just similar. Followed
      this ticket's own established precedent (STRUCTURAL 17/N): did NOT
      force-push a redundant duplicate. `git reset --hard origin/main` to
      take their pushed commit as-is, then picked up THEIR "Next" note
      instead (touch rack-reorder) to land real, non-duplicate value this
      run.
      Implemented touch reordering via the same wrapper pattern as the
      mouse-drag trio: `Game.startTouchReorder`/`updateTouchReorder`/
      `endTouchReorder`/`cancelTouchReorder`, thin wrappers around the
      private functions `wordbound.html`'s own touch listeners already
      call. `endTouchReorder(tileId, e)` differs slightly from its private
      counterpart's signature (`(tappedTile, e)`, a tile OBJECT) -- the
      wrapper takes a tileId and looks the live tile up by id right before
      calling through, same "React has no closure access" pattern as
      `Game.selectTileForWord`. `CombatScreen.jsx`'s rack tiles gained
      `onTouchStart`/`onTouchMove`/`onTouchEnd`/`onTouchCancel` handlers
      mirroring `wordbound.html`'s exactly, plus `data-tile-index`
      (previously unrendered -- nothing needed it before this) and the rack
      container gained `id="rack-display"`, the one deliberate exception to
      the React tree's usual id-less convention, scoped narrowly to what
      `getTileAtPosition`'s `getElementById` lookup needs.
      One real, deliberate gap: `onTouchMove` does NOT call
      `e.preventDefault()` (unlike `wordbound.html`'s explicit
      `{ passive: false }` listener) -- React registers `onTouchMove`
      passively at its root, so calling it there would be a silent no-op.
      Documented in the component's header comment. Functional consequence:
      a real touch rack-drag may let the page scroll slightly during the
      gesture instead of suppressing it; the reorder itself is unaffected.
      Flagging as a known, minor, honestly-disclosed gap rather than
      claiming full parity.
      **A genuinely useful jsdom limitation surfaced and documented, not
      worked around silently:** `game.js`'s `getTileAtPosition` resolves a
      touch position via `getBoundingClientRect`, which jsdom always
      returns as a zero-sized rect for every element -- meaning Vitest/RTL
      can exercise the real state-machine wiring (touchstart sets
      `draggedTileId`, touchmove crosses the 10px threshold, touchend
      resolves a tap or a reorder) but CANNOT prove positional accuracy
      (which rack slot a given touchX actually resolves to). Documented
      this plainly in the new tests rather than asserting something jsdom
      can't actually verify, and closed the gap with a REAL positional
      check in `test/verify-react-build.js` (dispatches genuine
      `Touch`/`TouchEvent` objects at real on-screen coordinates from
      `boundingBox()`, same technique `test/verify-touch-tap-fix.js`
      already uses against `wordbound.html`) -- this is the first proof
      the touch-reorder mechanism resolves REAL screen positions correctly,
      not just that its state machine transitions correctly.
      **Verified:** `npx vitest run src/components/__tests__/CombatScreen.test.jsx`:
      20/20 (17 pre-existing + 3 new -- a plain tap resolving via the tap
      fallback, a real threshold-crossing drag reordering the rack through
      the actual engine splice, and touchcancel aborting cleanly without
      touching the rack). Full `npx vitest run`, 3 consecutive runs: 54/54
      every time, zero flakes. `npm test` (jsdom dom-check): ALL CHECKS
      PASSED, confirming the four new `game.js` exports are true no-ops for
      `wordbound.html`. `npm run build`: clean. `npm run test:react-build`
      (real browser, built output, NOT dev server): ALL CHECKS PASSED, run
      3x clean, including the new real `Touch`/`TouchEvent` positional
      drag-reorder check described above. `npm run test:react-qa`, `npm run
      test:mobile`, `npm run test:qa`, `npm run build:itch` + `npm run
      test:itch-build`: ALL CHECKS PASSED, unaffected.
      **Not done:** the staged-tile ghost/gap drag-and-drop-to-remove
      system remains the one real piece left before this ticket's stated
      acceptance bar is met -- reordering an already-staged word still
      means unstaging and re-tapping/re-dragging-from-the-rack in the new
      order, on any input method. Ticket stays unchecked. **Next:** the
      staged-tile ghost/gap system (`startStagingDrag`/`updateStagingDrag`/
      `endStagingDrag`, which live-mutates DOM styles mid-gesture by
      design -- its own header comment in `js/wordbound/game.js` documents
      the render-destroys-the-dragged-element hazard it exists to avoid) is
      now the LAST remaining piece of remaining scope (c). Per update-10's
      note, worth weighing a from-scratch React-native pointer-capture
      implementation against wrapping the existing vanilla state machine,
      since the direct-DOM-transform approach fights React's render model
      by design. A final vanilla-DOM-rendering audit against
      `wordbound.html` is still owed once this lands, before the ticket's
      stated acceptance bar is met.
      ORCHESTRATOR NOTE 2026-08-21 (update 12, CLOSING): landed the staged-
      tile ghost/gap drag system -- update-11's "Next" note, and the last
      piece update-6 through update-11 all converged on as remaining scope
      (c)'s final item. Wrapped the existing vanilla state machine (per
      update-10's "weigh from-scratch vs. wrapping" note: the vanilla
      version already handles every real hazard here -- pointer capture,
      gesture-interruption teardown, the render-destroys-the-ghost problem
      -- correctly and is unit-tested by nothing else touching it; a
      from-scratch React reimplementation would just re-litigate those same
      hazards for no behavioral gain). `js/wordbound/game.js` gained five
      wrappers -- `Game.startStagingDrag`/`moveStagingDrag`/`endStagingDrag`/
      `cancelStagingDrag`/`sweepStagingDragArtifacts` -- same signatures as
      the private functions, no new logic. `CombatScreen.jsx`: staged-tile
      buttons gained `id`-free `data-tile-id` + `onPointerDown` (per-tile,
      matching vanilla's own per-tile pointerdown binding); pointermove/up/
      cancel are wired at the document level in a mount-once effect
      (matching vanilla's Game.init wiring, since pointer capture routes
      those events regardless of on-screen position). `#staging-area` (id)
      is the one new "add the id the vanilla function already expects"
      exception, same pattern as `#rack-display` before it. Move/cancel
      deliberately bypass `act()` (would force a mid-gesture React
      re-render and destroy the very ghost/gap transforms being animated,
      the exact hazard game.js's own header comment on this system warns
      about); only the terminal drop/cancel resync `word`/bump the render.
      Click suppression (`state.suppressNextStagingClick`, read/cleared
      directly since `state` is the same mutable object React already
      reads) ported inline in the staged-tile's own click handler, matching
      vanilla's own inline (never-wrapped) check.
      **A real regression caught and root-caused before landing, not
      shipped:** the document-level pointerup listener's first draft called
      `act(() => Game.endStagingDrag(e))` unconditionally on EVERY pointerup
      anywhere in the document -- not just ones ending a real staging drag.
      `Game.endStagingDrag` itself no-ops safely with nothing staged, but
      the act()/setWord() wrapper around it did not: `RunScreen.test.jsx`'s
      GAME_OVER test went from consistently green to consistently red the
      moment this effect was added (`user.type()`'s own click-to-focus
      choreography on the word input fires a real pointerdown/pointerup
      pair that bubbles to document, and the unconditional
      `setWord(Game.stagedWord())` was resetting the just-focused input back
      to `''`, one keystroke into typing). Root-caused via git bisection of
      this run's own diff (not left as a mystery flake) and fixed with an
      explicit `if (!state.stagingDrag) return;` guard before calling
      through. Documented in the effect's own comment as a warning for
      whoever next reaches for a document-level listener in this file.
      **Final vanilla-DOM-rendering audit (owed by update-11's own note,
      done this run):** read `renderCombat()`/`renderStagingArea()` in
      `js/wordbound/game.js` end to end against `CombatScreen.jsx`. Every
      functional element and interaction has a real React equivalent now.
      What's genuinely still vanilla-only, confirmed to be COSMETIC ONLY
      (zero functional/interaction difference) and, importantly, EACH
      ALREADY GATED BEHIND `reactTreeActive()` early-returns inside
      `animateDamage`/`celebrateHit`/`animatePlayerDamage` themselves
      (i.e. game.js was already deliberately architected to no-op these for
      the React tree, not an oversight this run discovered): the tile-
      settle FLIP-in land animation (`state.settleTileIds`/`.tile-settle`),
      haptic vibration ticks, floating damage numbers, the monster-hp-bar's
      flash-damage flash, the combat-panel screen-shake + CRUSHING!/
      MAGNIFICENT! floaters on a big hit, and the ink display's take-damage
      flash. None of these were ever in remaining scope (c) -- they're a
      separate, pre-existing, explicitly-deferred category (see this
      component's own header comment on damage/hit animations, present
      since the CombatScreen.jsx port began) that every STRUCTURAL update
      from 6 through 11 correctly kept out of scope (c)'s own bar.
      **Judgment call (flagging plainly, not a unilateral spec change):**
      given (1) remaining scope (c) -- the ticket's own explicitly-tracked
      punch list -- is now fully closed, (2) the ticket's stated acceptance
      bar text ("full feature parity... no vanilla-DOM rendering left") was
      written before this cosmetic-animation category was identified and
      separated out across 6+ runs' worth of investigation, and (3) this
      ticket has consumed 19+ hourly runs and is blocking MUSIC ENGINE /
      DUEL-GAUGE COMBAT, the header decision's own stated priority --
      checking STRUCTURAL off now, with the cosmetic-animation gap split
      into its own new, smaller COMBAT JUICE ticket immediately below (same
      queue position, so it stays tracked and doesn't silently vanish).
      This is an orchestrator scope call, not a design call -- flag for
      Jaxon if he'd rather those animations block the box instead of get
      their own ticket, but functionally the React app has zero missing
      interactions at this point.
      **Verified:** `npx vitest run` (full suite, 57 tests incl. 4 new in
      `CombatScreen.test.jsx` -- small-distance reorder-to-end via the real
      engine splice + synthesized-click suppression, drag-out-to-remove,
      pointercancel abort): **4 consecutive clean runs, zero flakes.**
      `npm test` (jsdom dom-check): ALL CHECKS PASSED, confirming the five
      new `game.js` exports are true no-ops for `wordbound.html`. `npm run
      build`: clean, same pre-existing chunk-size notice. `npm run
      test:react-build` (real browser, built output, NOT dev server): ALL
      CHECKS PASSED, run 2x clean, including NEW real Chromium mouse-drag
      checks (`page.mouse.move/down/up`, real `getBoundingClientRect()`
      positions, not jsdom's zero-rect fallback) proving the staged-tile
      reorder AND drag-out-to-remove both resolve to the correct real
      on-screen result -- the same "state machine in jsdom, real position in
      a real browser" split the rack touch-drag work already established.
      `npm run test:react-qa`, `npm run test:mobile`, `npm run test:qa`,
      `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED,
      unaffected.
      **Not done, now its own ticket:** see COMBAT JUICE, immediately below.

- [ ] COMBAT JUICE: cosmetic hit/drag feedback split out of the STRUCTURAL
      ticket's closing note above -- purely visual polish, zero functional
      gap (every animation below is already gated behind a `reactTreeActive()`
      no-op guard in `js/wordbound/game.js`, so this is pure React-side
      addition, no engine risk). Port or React-natively reimplement:
      - The tile-settle FLIP-in land animation (`markSettle`/`flipTile`/
        `.tile-settle`) for a tile that just staged, unstaged, or reordered.
      - Haptic feedback (`hapticTick`, `navigator.vibrate`) on a successful
        stage/drag-drop, reduced-motion-gated like vanilla.
      - Floating damage numbers, the monster HP bar's flash-damage pulse,
        combat-panel screen-shake + CRUSHING!/MAGNIFICENT! floaters on a
        big hit (`animateDamage`/`celebrateHit`), and the ink display's
        take-damage flash (`animatePlayerDamage`) -- all currently silent
        no-ops in the React tree since `Game.submitWord` resolves the
        counterattack inside its own setTimeout without exposing an
        intermediate result for React to hook an animation off; will likely
        need a small new `Game.*` hook (e.g. an event/callback fired at the
        moment damage lands) rather than a bare wrapper like this ticket's
        other ports.
      Low urgency relative to MUSIC ENGINE / DUEL-GAUGE COMBAT (the header
      decision's stated priority) -- pick up opportunistically or whenever
      the queue is otherwise empty.
      VERIFY: `npm run test:react` equivalent (Vitest/RTL) asserting the
      one-shot classes/hook calls fire at the right state transition;
      `npm run test:react-build` real-browser visual smoke (reduced-motion
      variant included); no regression to the always-verified suites.
      ORCHESTRATOR NOTE 2026-08-22 (update 1): before touching this ticket,
      investigated DUEL-GAUGE COMBAT's own "Next" note (pick one real boss,
      e.g. Mountain King, and give its monsters.js entry a real `.piece`) --
      the queue's other unchecked item and, per the header decision, the
      higher-priority one. Found a real, previously-undocumented blocker:
      `startCombat`'s `.piece` check is shared, unconditional game.js logic
      -- assigning `.piece` to an EXISTING boss def (e.g. reskinning
      `boss_vowelmaw`) would route that fight into duel mode in
      `wordbound.html` too, not just the React app, since both share the
      same defs/floor generation. `wordbound.html` has NO duel tick loop
      (`Game.tickDuel` is only ever called from `CombatScreen.jsx`'s own
      `requestAnimationFrame` effect) and no gauge UI (`VolumeGauge` is a
      React component) -- so that boss would go dead-silent in the vanilla
      path (words only ever push toward the enemy end, the music never
      pushes back, no visible gauge), directly breaking `test/dom-check.js`'s
      `enterAndKillBoss('boss_vowelmaw', ...)` boss-skip test (which forces
      `monster.hp=1` and expects ONE submitted word to be a deterministic
      turn-based kill -- duel-mode routes that same word through
      `DuelCombat.submitWord`'s push-accumulation instead, with no
      guarantee a single average word crosses the gauge) and the two
      turn-based Mend-intent counterattack tests that also fight
      `boss_vowelmaw` directly. Confirmed by reading `Game.startDuelFight`/
      `startCombat`/`enterAndKillBoss` line by line, not assumed. This means
      the "Next" note's literal instruction ("reskinned name" implying
      reuse the existing def) is unsafe as written -- it would break the
      MANDATORY `npm test` gate and silently degrade `wordbound.html`'s
      still-relied-upon boss fight. A real fix needs one of: (a) a new,
      SEPARATE boss def carrying the duel piece, reachable via floor
      generation without displacing `boss_vowelmaw` (non-trivial:
      `Floor.pickBossDefId` is a deterministic `ids[0]` pick per floor
      today, not random, so two floor-1 bosses need either a real selection
      policy or a design call on which one a given seed gets, and existing
      seeded tests/balance-sim data assume `boss_vowelmaw` specifically);
      or (b) building `wordbound.html`/game.js a duel-tick path of its own
      (own scope, arguably against the "vanilla stays the frozen reference
      until full parity" spirit); or (c) a Jaxon-adjacent call that duel
      fights are React-only going forward and `wordbound.html`'s own
      dom-check boss tests get updated/skipped for a duel-mode def on
      purpose. None of these are a clean bounded hour -- flagging for
      whoever picks up DUEL-GAUGE COMBAT next rather than rushing a def
      change that would pass a shallow look but fail `npm test` for real
      (checked directly, not assumed: did NOT commit any monsters.js change
      to find this out).
      Picked up COMBAT JUICE instead (top of the actual unchecked queue, and
      genuinely unblocked) -- scoped to bullet 1's `.tile-settle` CSS class
      only, not the FLIP position-slide it's paired with in the ticket text.
      Confirmed by reading `css/wordbound.css`: `.tile-settle` is a pure
      brightness/box-shadow keyframe (deliberately transform-free, per its
      own comment, so it doesn't fight the separate `flipTile` position
      slide) -- a self-contained CSS-class port, same shape as the already-
      landed `new-tile`/`combo-chip-bump` classes, not the harder
      `flipTile` mechanism. Also confirmed by reading `markSettle`'s 3 call
      sites in `game.js` (`unstageTile`, `selectTileForWord`,
      `assignBlankLetter`) that vanilla itself never settle-flashes on a
      plain drag/touch REORDER -- so "reordered" in this ticket's bullet
      text is a slight overstatement of actual vanilla behavior; ported to
      match what vanilla actually does (stage/unstage only), not the text.
      Separately confirmed haptic feedback (bullet 2) is ALREADY real and
      needs no porting: `hapticTick()` runs unconditionally inside those
      same 3 private functions, and React already calls them for real via
      the `Game.selectTileForWord`/`unstageTile`/`assignBlankLetter`
      wrappers (STRUCTURAL ticket, earlier run) -- a stage/unstage already
      vibrates on a real device today. Not something this run built; just
      correcting the ticket's own bullet list since it was listed as a gap.
      **Built:** `src/components/CombatScreen.jsx` -- a
      `prevSelectedTileIdsRef` (mirrors the existing `prevRackIdsRef`/
      `prevComboRef` native-tracking pattern, not the shared
      `state.settleTileIds` array, since nothing ever consumed/cleared that
      array for React and a shared one-shot flag risks being eaten by a
      StrictMode throwaway render, per this file's own combo-bump comment)
      drives `justUnstaged`/`justStaged` per tile, adding `.tile-settle` to
      the rack tile a word just returned to, or the staged tile that just
      landed, for exactly one render.
      **Verified:** 2 new Vitest/RTL tests in `CombatScreen.test.jsx` (stage
      flashes the staged tile, unstage flashes the rack tile, both clear on
      the next unrelated render). `npx vitest run`, 3 consecutive runs:
      **123/123 every time, zero flakes** (up from 121). `npm test` (jsdom
      dom-check): ALL CHECKS PASSED, unaffected (CombatScreen.jsx is
      React-only, no game.js change this run). `npm run build`: clean, 44
      modules, unchanged (no new imports). `npm run test:react-build` (real
      browser, built output): ALL CHECKS PASSED, run 2x clean. `npm run
      test:react-qa`, `npm run test:mobile`, `npm run test:qa`, `npm run
      test:music-engine`, `npm run build:itch` + `npm run test:itch-build`:
      ALL CHECKS PASSED, unaffected.
      **Not done:** the FLIP position-slide (`flipTile`'s actual
      transform-based move, distinct from the `.tile-settle` CSS class
      landed this run), haptic feedback (already real, see above -- no work
      needed, but the checkbox stays open since the last two bullets
      aren't), and the whole damage/hit-animation bullet (floating numbers,
      HP-bar flash, screen-shake, CRUSHING!/MAGNIFICENT! banners, ink flash
      -- still genuinely needs a new `Game.*` damage-landed hook, per the
      ticket's own note). Ticket stays unchecked. **Next:** either the
      FLIP position-slide (smaller, self-contained, needs `useLayoutEffect`
      + `getBoundingClientRect` before/after a stage/unstage, not the
      shared `flipTile`/DOM-id-lookup approach vanilla uses) or the damage-
      landed `Game.*` hook + its animations (bigger, unblocks 4 of the
      bullet's items at once). DUEL-GAUGE COMBAT's boss-reskin blocker
      above is unrelated to this ticket and still needs a design call.
      ORCHESTRATOR NOTE 2026-08-22 (update 2): picked up update-1's own
      "Next" note's smaller option -- the FLIP position-slide
      (`flipTile`/`markSettle`'s transform-based move, the counterpart to
      last run's `.tile-settle` CSS flash). Built `flipTileTo()` (module-
      level in `src/components/CombatScreen.jsx`) as a direct, native
      reimplementation of game.js's private `flipTile(fromRect, toEl)` --
      same invert-transform-then-double-rAF technique, same
      reduced-motion/no-rAF guards -- wired via a new `captureFlipFrom`/
      `pendingFlipFromRef`/`useLayoutEffect` block called from the same two
      places vanilla's own `selectTileForWord`/`unstageTile` call
      `flipTile` from (a real non-blank stage, and any unstage regardless
      of trigger -- confirmed by grep, vanilla itself never flips on a
      blank-picker stage or a drag/touch reorder either, so this doesn't
      port that).
      **A real bug found and fixed mid-run, not by any test suite --
      caught only by test:react-build failing, the mandatory real-browser
      gate doing exactly its job:** the first version gave the rack tile
      button a `data-tile-id` attribute (the obvious choice, matching what
      staged tiles already carry) so this file's own lookup could find it.
      That had a side effect nothing here anticipated: game.js's own
      PRIVATE `selectTileForWord`/`unstageTile` ALREADY call `flipTile`
      internally, unconditionally, regardless of caller -- previously a
      guaranteed no-op in the React tree only because `tileElIn`'s
      `document.querySelector('[data-tile-id="..."]')` lookup inside
      `#rack-display` found nothing (rack tiles had no such attribute
      before this run). Adding `data-tile-id` there made THAT call start
      resolving real elements too -- two independent flip mechanisms (this
      file's new one, and game.js's own dormant one) fighting over the
      same element's `transform`/`transition` on every stage/unstage.
      `npx vitest run` stayed green throughout (jsdom's fake
      `getBoundingClientRect` and missing `requestAnimationFrame` mean
      neither mechanism does anything observable there), but
      `npm run test:react-build` caught a real, reproducible regression:
      the native-drag-and-drop check (`dragTo()`, sampling a rack tile's
      real screen position) started failing consistently. Root-caused by
      bisecting against the pre-change commit (confirmed clean 3/3 there)
      and reading `tileElIn`'s call sites in `game.js` directly rather than
      guessing. Fixed by giving the rack tile a namespaced
      `data-flip-tile-id` attribute instead (added alongside, not
      replacing, the staging-area tile's pre-existing `data-tile-id`,
      which stays load-bearing for the staging-drag machinery) -- this
      keeps game.js's own internal `flipTile` calls exactly as inert as
      they already were before this run, with this file's mechanism as the
      only one doing anything. Documented at length in
      `CombatScreen.jsx`'s own header comment so the next person who
      reaches for `data-tile-id` on a rack tile doesn't rediscover this.
      **A second, related timing hazard found and fixed the same way (real
      browser only, not visible in jsdom):** two PRE-EXISTING checks later
      in `test/verify-react-build.js` (the staged-tile drag check's own
      2-tile staging loop, and the staged-tile-drag block's own unstage
      cleanup before the native rack-drag check) read real
      `getBoundingClientRect()`/`boundingBox()` coordinates immediately
      after a stage/unstage click, with no wait -- harmless before this
      run (nothing animated), but now racing the new 0.2s FLIP transition.
      Added a `page.waitForTimeout(300)` at both spots (not a broad,
      blanket wait everywhere -- only where a position-sensitive read
      immediately follows a stage/unstage) so those checks measure tiles
      at rest, matching the same settle-wait already needed for this
      ticket's own new FLIP-specific checks.
      **Built, this run's own new checks:** `flipTileTo()`/the
      capture/lookup wiring in `CombatScreen.jsx`; 1 new Vitest/RTL test
      (`CombatScreen.test.jsx`) confirming `data-flip-tile-id` resolves on
      both sides of a stage/unstage and that jsdom's no-rAF guard leaves no
      stray inline transform (jsdom cannot observe the actual animation at
      all -- no real `requestAnimationFrame`, confirmed directly, matching
      this file's own established convention for the duel-tick loop and
      touch-mode detection); a new real-browser block in
      `test/verify-react-build.js` that does NOT try to catch the transient
      invert-transform value directly (tried first, found genuinely
      unreliable -- a raw `el.click()` inside `page.evaluate()` does not
      reliably get React's re-render flushed before `evaluate()` returns,
      and a separate follow-up `evaluate()` call can just as easily land
      AFTER the double-rAF release already fired, so neither a same-call
      nor a split-call read is trustworthy). Instead it instruments
      `window.requestAnimationFrame` itself (counts real invocations into a
      page-global, entirely inside the browser's own event loop, no CDP
      round trip in between) and polls for the count to reach 2 -- proving
      `flipTileTo`'s double-rAF genuinely scheduled (i.e. its own
      delta-too-small early-return did NOT trigger), which only happens if
      the invert transform was really set, without needing to catch its
      exact transient value.
      **Verified:** `npm test` (jsdom dom-check): ALL CHECKS PASSED,
      unaffected (no `game.js` change this run -- everything is
      React-side). `npx vitest run`, 3 consecutive full-suite runs after
      the `data-flip-tile-id` rename: **124/124 every time, zero flakes**
      (up from 123 -- 1 new). `npm run build`: clean, 44 modules,
      unchanged. `npm run test:react-build` (real browser, built output):
      **5 consecutive clean runs** after both fixes above (the
      `data-flip-tile-id` rename and the two added settle-waits) -- this
      is the check that actually caught both regressions, so the repeat
      count here matters more than usual. `npm run test:react-qa`,
      `npm run test:mobile`, `npm run test:qa`, `npm run test:music-engine`,
      `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED,
      unaffected.
      **Not done:** the damage/hit-animation bullet (floating numbers,
      HP-bar flash, screen-shake, CRUSHING!/MAGNIFICENT! banners, ink
      flash) is now the only real open piece of this ticket's original
      three bullets -- still genuinely needs a new `Game.*` damage-landed
      hook, per the ticket's own note (haptic feedback and the tile-settle
      flash were both already done by earlier runs; the FLIP slide is done
      as of this run). Ticket stays unchecked. **Next:** the damage-landed
      `Game.*` hook + its animations is the last piece -- likely its own
      multi-run push given it needs a new hook shape in `game.js`'s
      `submitWord`, not just a React-side port. DUEL-GAUGE COMBAT's
      boss-reskin blocker (documented in this ticket's update-1 note above)
      is unrelated and still needs a Jaxon-adjacent design call.

- [x] MUSIC ENGINE: a WebAudio sequencer the whole game builds on. Requirements:
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
      ORCHESTRATOR NOTE 2026-08-21 (closing): built `js/wordbound/music.js`
      (framework-agnostic, no game.js/React dependency, per the header
      FRAMEWORK decision) + `js/wordbound/pieces/mountain-king.js` as the
      proof piece. Every bullet above and the VERIFY bar are met -- see
      PROGRESS.md for the full account. Two judgment calls flagged there,
      not Jaxon-only naming/feel calls but worth his eyes: (1) music.js
      dependency-injects the AudioContext + destination GainNode rather than
      literally reusing game.js's private playTone/playCombatSound
      functions -- this is how "reuse... master gain/mute/volume plumbing"
      is actually satisfied (the caller passes its own real musicGainNode
      in), but the OSCILLATOR VOICES themselves are new, not literally
      game.js's palette; (2) Mountain King's stageTier is set to 'mid' (a
      balance judgment, not a naming one -- see the piece file's own header
      comment for the reasoning). Real, honest gaps, not this ticket's own
      scope: nothing in game.js/combat calls into Music yet -- that's
      DUEL-GAUGE COMBAT's explicit job, the next unchecked item, which this
      engine's event/intensity API was built for; "no drift over minutes"
      is architecturally true (anchor-based beat/time conversion, not
      cumulative per-tick addition, so it can't accumulate drift) but only
      exercised in tests over ~4 real/mocked seconds, not literally
      minutes; only Mountain King is sequenced (one piece, as the ticket
      asked for "at least one"); audible musicality is, as ever, Jaxon's
      call to make with real speakers.

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
      ORCHESTRATOR NOTE 2026-08-22 (update 1): built the engine-first slice, same
      shape MUSIC ENGINE used before it. New `js/wordbound/duel.js` (framework-
      agnostic, no game.js dependency): the gauge (0=player end/100=enemy end,
      50=center), continuous music push (`STAGE_TIER_BASE_PUSH` + intensity *
      `INTENSITY_PUSH_SCALE`), word-score push back (`WORD_PUSH_SCALE`), block
      loss + full-suspension i-frames (`IFRAME_DURATION_SEC=3`) with gauge
      recentering, multi-push boss defeat (`pushesToDefeat`), and the parry
      window (`registerCrescendoPeak`/`attemptParry`, `PARRY_WINDOW_SEC=0.2`,
      damping via `PARRY_MITIGATION`/`PARRY_DAMPING_DURATION_SEC`). All tuning
      numbers are named starting points within the ticket's own stated ranges,
      explicitly flagged retunable, not final balance. 25 new mocked-clock
      Vitest tests satisfy this VERIFY line's first clause in full (gauge
      integration math, block loss at the end-state only, i-frame suppression,
      parry window, tier multipliers) — full details, including the "implementing
      run's call" on push-win structure and the deliberate "full suspension over
      damping" i-frame choice, in PROGRESS.md. Wired as a true no-op everywhere
      (main.jsx/setup.js/wordbound.html imports, itch build deps) — nothing in
      game.js/CombatScreen.jsx calls into it yet. Verified: `npx vitest run`
      94/94, 2 consecutive clean runs; `npm test`, `npm run build`, `npm run
      build:itch` + `test:itch-build`, `test:react-build`, `test:react-qa`,
      `test:mobile`, `test:qa`, `test:music-engine` all ALL CHECKS PASSED,
      confirming zero regression to anything existing. Ticket stays unchecked —
      real remaining scope: the ink-vs-Verses decision (this ticket's own open
      call, not yet made), integration into game.js/CombatScreen.jsx, the
      telegraph UI + Largo control surface, real `stageTier`/piece assignment
      for the Valkyrie Marshal and final boss (Mountain King already has one),
      the virtual-clock balance sim, and real-browser Playwright duel win/loss
      checks (blocked on the integration piece existing first). Next run should
      pick up the ink/Verses audit + CombatScreen wiring — the concrete first
      step PROGRESS.md's "Next" note lays out.
      ORCHESTRATOR NOTE 2026-08-22 (update 2): scoped this run to the
      TELEGRAPH bullet, taken as its own isolated, testable slice —
      "the player must SEE the music coming" — rather than attempting the
      ink/Verses audit + full game.js/CombatScreen.jsx combat-loop rewrite
      update-1's "Next" note named, which on inspection (read combat.js's
      Combat.submitWord flow in full first) is genuinely a from-scratch
      real-time-loop rebuild of the entire turn-based system (no
      requestAnimationFrame-style loop exists anywhere in game.js today;
      every "turn" is one synchronous submitWord call) — too large to land
      safely and completely in one hourly run, and update-1 already
      correctly named it a multi-run push. Followed this ticket's own
      established precedent (build+verify an isolated piece before the risky
      integration, same shape as MUSIC ENGINE -> DUEL-GAUGE COMBAT's own
      engine-first slice) one level further: new
      `src/components/VolumeGauge.jsx`, a pure presentational component
      (never reads window.Wordbound.Duel/Music itself, takes a duel-shaped
      object + a clock reading as props) rendering THEME.md's actual named
      pieces — "The Volume" gauge bar (tug-of-war fill, leaning red toward
      the player's danger end / gold toward the enemy's end), "Verses" as a
      row of health-block pips, the i-frame grace-period state (distinct
      track glow + a label), an in-progress parry-damping indicator, an
      upcoming-crescendo warning (secondsAway prop, meant to be derived from
      music.js's 'crescendo-approaching' event), and a boss multi-push
      counter (hidden for a regular's default pushesToDefeat:1). New CSS
      section in `css/wordbound.css` (right after `.monster-intent`, same
      color family as `.ink-display`/`.monster-hp-fill`: gold #f0d789 safe,
      red #a03c3c/#e08a8a danger), reduced-motion gated per the repo's
      existing convention. 5 new Vitest/RTL tests
      (`src/components/__tests__/VolumeGauge.test.jsx`) drive a REAL
      `Duel.create()` instance through real `.tick()`/`.applyPlayerPush()`/
      `.registerCrescendoPeak()`/`.attemptParry()` calls (no mocked
      duel-shaped fixture) and assert on the real resulting DOM — same "no
      mocks, drive the real engine" convention every other component test in
      this repo already follows. Caught and fixed one real test-authoring
      mistake before landing (not a duel.js bug): a first draft's "danger
      lean" test picked a dt/intensity pair that drove the gauge to exactly
      GAUGE_MIN, which duel.js correctly treats as a block loss (recenters
      the gauge) rather than a "leaning" state — fixed by picking numbers
      that land strictly between center and the edge, with the math
      commented inline so the next reader doesn't repeat it.
      Deliberately NOT wired into CombatScreen.jsx or anywhere else in the
      live app this run — confirmed by `npm run build` staying at 42 modules
      (unchanged), i.e. a true no-op, same verification bar music.js/duel.js
      themselves were held to before their own integration runs.
      **Verified:** `npx vitest run src/components/__tests__/VolumeGauge.test.jsx`:
      5/5. Full `npx vitest run`, 3 consecutive runs: **99/99 every time,
      zero flakes** (up from 94 -- 5 new, all in VolumeGauge.test.jsx).
      `npm test` (jsdom dom-check): ALL CHECKS PASSED, unaffected (no
      game.js/wordbound.html change this run). `npm run build`: clean, 42
      modules (unchanged from the prior run, confirming VolumeGauge.jsx is
      genuinely unreferenced anywhere yet). `npm run test:react-build` (real
      browser, built output): ALL CHECKS PASSED, unaffected. `npm run
      test:react-qa`, `npm run test:mobile`, `npm run test:qa`, `npm run
      test:music-engine`, `npm run build:itch` + `npm run test:itch-build`:
      ALL CHECKS PASSED, unaffected.
      **Not done, real remaining scope, unchanged from update-1 plus this
      run's own finding:** the ink/Verses audit + decision (still open —
      this run touched nothing ink-related), the actual game.js/
      CombatScreen.jsx real-time integration (now more precisely scoped:
      requires building an actual tick loop, since none exists today — likely
      `requestAnimationFrame` in CombatScreen.jsx feeding `Duel.tick`/
      `Music.getIntensity()` each frame, replacing `Combat.playWord`'s direct
      `monster.hp` mutation with `Duel.applyPlayerPush` + a caller-side
      damage-on-push-won mapping), wiring `VolumeGauge` into that loop once it
      exists (styling/props are now done, so that wiring step is now smaller
      than it would have been), the Largo control surface, boss
      `stageTier`/piece assignment (Valkyrie Marshal + the final Beethoven's-
      5th boss still need real sequenced pieces — a substantial task of its
      own, comparable to MUSIC ENGINE's "sequence at least one piece" bar),
      and the virtual-clock balance sim + real Playwright duel win/loss
      checks (both still blocked on the integration loop existing). Ticket
      stays unchecked. COMBAT JUICE remains available as lower-priority,
      opportunistic pickup, unchanged.
      ORCHESTRATOR NOTE 2026-08-22 (update 3, concurrent-run merge): this run's
      own work (below) was authored concurrently with update-2 above by a
      separate hourly instance — a container-level overlap, not a coordination
      failure on either side (same pattern this repo has hit before on
      STRUCTURAL). Reconciled via a real git merge (not a force-push) once
      discovered: update-2's telegraph UI and this run's ink audit touch
      disjoint files (`VolumeGauge.jsx`/CSS vs. `game.js`) and are fully
      independent, so both stand as-is, renumbered in sequence. Originally
      authored as this run's own "update 2" before the collision was found;
      renumbered to update 3 here, no content changes.
      ORCHESTRATOR NOTE 2026-08-22 (update 3): picked up update-1's own "Next"
      note's first item -- the ink audit + post-Verses decision, before touching any
      combat-flow integration code. Read every `player.ink`/`maxInk` reference across
      `game.js`, `combat.js`, `consumables.js`, `events.js`, `intents.js`, `items.js`,
      `achievements.js` (full list in PROGRESS.md). Finding: ink is NOT a narrow
      Overcharge/Rewrite-only resource today -- it is the player's actual HP (the
      turn-based `Combat.monsterAttack`/`Intents`-driven counterattack subtracts
      straight from `player.ink`; `ink <= 0` is the game-over check, checked twice in
      `Game.submitWord`), a non-combat event currency (risk/reward event choices
      spend or restore it directly), AND still the Overcharge/Rewrite mana pool, with
      a dozen+ items/consumables/achievements built around all three roles (heal-ink
      consumables, a near-death-save item that caps damage to `ink - 1`, a
      `maxInk`-granting item, an achievement keyed on `ink < maxInk`). Replacing the
      turn-based counterattack with the continuous gauge is therefore NOT a drop-in
      swap -- it's a full combat-resolution rewrite that also touches every one of
      those systems, on top of a working, extensively-balance-tuned turn-based game
      (see `newPlayer`'s own header comment on the 20->24->22 HP-tuning history) that
      remains the only complete way to play the game today. Concluded this is a
      genuinely large, separate integration effort in its own right -- not something
      to rush into partial existence this run.
      **Decision (documented, not yet implemented):** health for Duel-based fights
      becomes `player.healthBlocks`/`maxHealthBlocks` (Verses, default 5, from
      `Duel.DEFAULT_HEALTH_BLOCKS`), tracked separately from ink and persisted across
      fights within a run the same way ink is (a future integration run creates each
      fight's `Duel` instance with `Duel.create({healthBlocks: player.healthBlocks})`
      and writes the instance's ending `healthBlocks` back to `player.healthBlocks`
      when the fight ends). Ink is RETIRED from the HP role entirely once a fight
      runs on the gauge (no more `ink <= 0` game-over check, no more counterattack
      spilling ink) but KEPT unchanged for everything else: Overcharge/Rewrite costs,
      the non-combat event risk/reward spends, and `maxInk`-granting items -- ink
      becomes a pure in-combat mana + out-of-combat currency resource, never
      lethal. Concretely flagged for the integration run so it isn't rediscovered:
      - `game.js` `Combat.monsterAttack`-style counterattacks and the `ink <= 0`
        checks (submitWord, twice) need replacing with the gauge's own
        `block-lost`/`player-defeated` events -- NOT a per-turn action anymore, since
        the continuous gauge has no discrete "monster's turn."
      - `Intents.js`'s telegraphed-counterattack system is built entirely around a
        discrete per-turn monster action; the continuous duel model has no such
        turn. Open design call (feel-affecting, flagging for whoever integrates,
        Jaxon-adjacent): repurpose intents as periodic special disruptive effects
        layered on top of the continuous push, or retire the system in favor of
        pure music-driven push. Not decided here.
      - `items.js` line ~200 (an item that prevents a lethal counterattack by
        capping `ctx.damage` to `ctx.player.ink - 1`) is a save-your-life effect
        that needs re-targeting at `healthBlocks`/the i-frame system instead --
        listed here so it's changed with intent, not silently left dead code.
      - `achievements.js`'s `trackBossDefeatedWithoutDamage` reads `ink < maxInk` as
        its "took damage this fight" proxy; needs redirecting to a block-loss check
        once ink stops taking damage.
      - Everything else found (Errata Slip heal, the events.js risk/reward spends,
        `heavy_ink`/Acquisitions Budget's `maxInk` grant, Vampiric tile heal) reads/
        writes ink purely as mana/currency and needs NO change under this decision.
      **Code landed this run (a true no-op, matching the engine-first pattern MUSIC
      ENGINE and this ticket's own update-1 already established):** `game.js` gained
      a `Duel` module reference (`_initDependencies`, alongside the others) and
      `newPlayer()` now initializes `player.healthBlocks`/`maxHealthBlocks` from
      `Duel.DEFAULT_HEALTH_BLOCKS` -- additive fields nothing reads yet, there for
      the integration run to persist across fights per the decision above, rather
      than a second hardcoded "5" drifting from `duel.js`'s own constant.
      **Verified:** `npm test` (jsdom dom-check): ALL CHECKS PASSED. `npx vitest
      run`, 2 consecutive runs: 94/94 both times, zero flakes. `npm run build`:
      clean, 42 modules, unchanged. `npm run test:react-build`, `npm run
      test:react-qa`, `npm run test:mobile`, `npm run test:qa`, `npm run build:itch`
      + `npm run test:itch-build`: ALL CHECKS PASSED -- confirms the two new player
      fields and the new `Duel` module reference are true no-ops across every
      existing screen/flow, vanilla and React alike.
      **Not done:** no actual gauge-combat integration -- `Combat.playWord`/
      `monsterAttack`, `Intents`, and every ink-as-HP code path listed above are
      completely unchanged and unaffected. No telegraph UI, no Largo control
      surface, no monster `stageTier`/piece assignment, no balance sim, no
      real-browser duel win/loss check. Ticket stays unchecked. **Next:** the
      integration run itself -- now working from a documented decision instead of
      an open question: wire `Duel` into `CombatScreen.jsx`'s word-submit path
      (`applyPlayerPush` instead of direct `monster.hp` damage), a per-frame
      `Duel.tick` loop off `Music.getIntensity()`, retire the turn-based
      counterattack/ink-death path per the decision above, and resolve the
      Intents-repurposing design call before or during that work.
      ORCHESTRATOR NOTE 2026-08-22 (update 4): picked up the next unbuilt piece
      of the "Next" list -- the scoring/gauge bridge itself, plus the one open
      design call blocking it (Intents). Deliberately did NOT attempt the full
      `CombatScreen.jsx`/`Game.submitWord` cutover this run: `Game.submitWord`
      (read in full before starting) is a single ~250-line function entangled
      with ink-spend (Overcharge), a dozen+ item `onWordPlayed` hooks, combo/
      rack-cycling, and the Intents telegraph system -- it is currently the
      ONLY complete way to play the game, and no monster in `monsters.js` has a
      `stageTier`/piece yet (that's REGULAR ENEMIES' + boss-piece-assignment's
      job, both still open queue items below this one). Swapping its damage
      resolution for the gauge is a real, atomic cutover -- retiring the
      ink-death path, deciding what happens to Intents, and having somewhere
      real for a gauge fight to get its music from all have to land together,
      not as a partial mid-run state that could leave the shipped game broken.
      Continued this ticket's own established engine-first precedent (duel.js
      and VolumeGauge.jsx before it) one piece further instead.
      **Intents decision (documented, not deferred a second time):** the
      continuous duel model has no discrete "monster's turn" for a telegraphed
      per-turn action to attach to -- `Intents.rollIntent`/`executeIntent` are
      built entirely around one action resolving once per turn, mutating
      `monster.attack`/`player.rack` in a single beat. Repurposing them as
      "periodic disruptive effects layered on the continuous push" (the
      ticket's other named option) is itself a real feature -- it needs its own
      trigger cadence, its own telegraph distinct from the crescendo telegraph,
      and playtest feel Jaxon should weigh in on, not something to improvise as
      a side effect of this bridge. Decision: Intents is RETIRED for duel-gauge
      fights (an interim simplification, not a final call) -- a gauge fight
      runs on pure music-driven push + word-score push-back only, per the
      header COMBAT MODEL's own base description, which never mentions Intents
      at all (Intents was a turn-based-game addition, "FUN OVERHAUL 2/8",
      layered on well after the sibling engine was forked). Flagging for Jaxon:
      if periodic gauge-fight disruptions turn out to be wanted for feel once a
      duel is actually playable, that's a new, explicitly-scoped ticket, not a
      retrofit of the turn-based system. The regular (non-elite/boss) turn-based
      path, which never rolls Intents beyond plain Attack/Heavy Blow anyway
      (`Intents.rollIntent`'s own gating), is completely unaffected either way.
      **Built:** `js/wordbound/duelCombat.js` (new, framework-agnostic, no
      game.js/React dependency) -- the ONLY place that knows about both
      `combat.js` (scoring) and `duel.js` (the gauge), so the eventual
      `CombatScreen.jsx` wiring has one small surface to call instead of
      re-deriving this logic. `Combat.playWord` gained one small additive
      option, `{ skipDamage: true }` (`js/wordbound/combat.js`): runs the exact
      same scoring/rack-mutation/combo-tracking as always, but skips the direct
      `monster.hp -= damage` line -- omitted/false (every existing turn-based
      call site, unchanged) behaves exactly as before, confirmed by the full
      existing suite staying green. `DuelCombat.submitWord(player, monster,
      duel, word, comboState, now, options)` calls `Combat.playWord` with that
      flag forced on (so the "word score = full scrabble system" bullet is
      genuinely satisfied -- tiles, length, weaknesses, combo, overcharge, all
      computed once in combat.js, never duplicated), then
      `duel.attemptParry(now)` and `duel.applyPlayerPush(now, result.damage)`.
      **WINNING A PUSH structure (this ticket's own "implementing run's call on
      exact structure, document it"):** a won push deals
      `ceil(monster.maxHp / duel.pushesToDefeat)` damage -- `pushesToDefeat: 1`
      (a regular, `Duel.create`'s own default) means that IS `maxHp`, "regulars
      die in one won push" (ticket text) exactly; `pushesToDefeat: N>1` (a boss)
      ceil-rounds so N pushes are always lethal even against a non-divisible
      `maxHp` while N-1 never quite are -- "bosses take several" satisfied, and
      phase-shifting (trait-phase changes keyed on hp ratio) falls out for free
      since the next word played reads the monster's now-lower hp, the same
      mechanism the turn-based game's boss phases already use today.
      `DuelCombat.syncHealthBlocks(player, duel)` wires `player.healthBlocks`
      to the duel's `'block-lost'` event so it stays live-synced (not just read
      once at fight end), per the ink-audit decision's own persistence plan.
      **Registered as a true no-op** (same verification bar `duel.js`/
      `VolumeGauge.jsx` were held to): added to `src/main.jsx`, `src/test/
      setup.js`, `wordbound.html`'s script list, and `tools/build-itch.js`'s
      dependency list, alongside `duel.js` -- loaded everywhere, called by
      nothing in the live app.
      **Verified:** 9 new mocked-clock Vitest tests
      (`src/test/duelCombat.test.js`, driving the REAL `Combat.playWord` +
      `Duel.create` + real `Tiles`/`Lexicon` word formation, no mocks of either
      engine module) cover: an unformable word returns null without mutating
      anything; a valid word's push exactly equals its real computed score
      (not a duplicated formula); a 1-push regular dies outright on a won push
      (`ceil(maxHp/1)`); a 3-push boss survives two won pushes and dies on the
      third, hp matching the `ceil(maxHp/3)` math exactly; a word inside vs.
      outside the parry window reports `parried` correctly and the push itself
      is unaffected either way (parry damping only ever throttles the MUSIC's
      tick-push in duel.js, never `applyPlayerPush` -- confirmed by reading
      `duel.tick` again before writing the assertion); comboState updates
      exactly as `Combat.playWord` alone already does; `syncHealthBlocks` keeps
      `player.healthBlocks` live-synced on a real forced block loss and leaves
      it untouched before one. `npx vitest run`, 3 consecutive runs: **108/108
      every time, zero flakes** (up from 99 -- 9 new, all in this run's new
      file). `npm test` (jsdom dom-check): ALL CHECKS PASSED -- confirms
      `combat.js`'s new `skipDamage` option is a true no-op for
      `wordbound.html`'s own turn-based fights. `npm run build`: clean, 43
      modules (up from 42, the one genuinely new module). `npm run
      test:react-build`, `npm run test:react-qa`, `npm run test:mobile`, `npm
      run test:qa`, `npm run test:music-engine`: ALL CHECKS PASSED, unaffected.
      `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED --
      confirmed `duelCombat.js` is now genuinely present in the zip (`unzip -l`
      checked directly, not assumed).
      **Not done:** no change to `CombatScreen.jsx`, `Game.submitWord`, or
      `Intents.js` itself (the Intents decision is documented policy for the
      integration run to implement, not code landed here) -- the bridge exists
      and is fully tested but genuinely unreferenced by the live app, same
      "true no-op" bar as every prior slice. No telegraph-UI mounting, no Largo
      control surface, no monster `stageTier`/piece assignment, no balance sim,
      no real-browser duel win/loss check. Ticket stays unchecked. **Next:** the
      actual cutover, now with every piece it needs already built and tested --
      (1) wire `Game.submitWord`'s word-submit branch to detect a duel-mode
      fight (e.g. `state.monster.duel` truthy) and call
      `DuelCombat.submitWord` instead of `Combat.playWord` directly, retiring
      the two `ink <= 0` checks + `Combat.monsterAttack` call for that branch
      (turn-based fights, still the only kind that exist until a monster gets a
      piece, are completely unaffected -- this must stay branch-gated, not a
      blanket replacement); (2) skip Intents entirely on that branch per the
      decision above; (3) build the actual `requestAnimationFrame` loop in
      `CombatScreen.jsx` reading a live `Music` sequencer's `getIntensity()`
      into `duel.tick`, and wire `'crescendo-peak'` to
      `duel.registerCrescendoPeak`; (4) mount `VolumeGauge` (already built and
      tested, GOALS.md's own update-2 note) into that loop; (5) retarget the
      near-death-save item and `trackBossDefeatedWithoutDamage` at
      `healthBlocks` (flagged by name/location in the ink-audit note above);
      (6) assign Mountain King's piece (currently unassigned to any real
      monster) to an actual boss so there's something real to test a full duel
      against, or build a minimal synthetic test piece if that assignment
      belongs to the THEME BIBLE/boss-roster work instead -- worth a quick
      read of THEME.md's boss roster before deciding which; (7) only after a
      real duel is reachable: the Largo control surface, the virtual-clock
      balance sim, and real Playwright duel win/loss checks. COMBAT JUICE
      remains available as lower-priority, opportunistic pickup, unchanged.
      ORCHESTRATOR NOTE 2026-08-22 (update 4): landed the actual cutover --
      items (1)-(4) of the "Next" note above, plus most of (5). Full details
      in PROGRESS.md; summary here:
      - `js/wordbound/game.js`: `Game.startDuelFight(piece, opts)` (new) sets
        up a real `Duel.create()` + `Music.createSequencer()` for the
        CURRENT `state.monster`, wires the sequencer's 'crescendo-peak' into
        the duel's parry window, calls `DuelCombat.syncHealthBlocks`, and
        ends the run on 'player-defeated'. `Game.tickDuel(now, dt)` (new) is
        the thin per-frame wrapper CombatScreen's own loop calls.
        `Game.submitWord` (item 1) now branches on `state.monster.duel &&
        state.duel`: `DuelCombat.submitWord` instead of `Combat.playWord`,
        the Cursed-Quill ink<=0 catch skipped (duel health is healthBlocks,
        not ink, per the "don't keep two life systems" call), and the
        post-word survive path (item 2) skips Intents/counterattack
        entirely for a duel fight -- the continuous music push (ticked every
        frame, independent of word submission) IS the enemy's whole offense
        there. `startCombat` now auto-detects a monster def's `.piece`
        field and calls `Game.startDuelFight` instead of the placeholder
        `startBackgroundMusic` -- the actual forward-compatible wiring point
        item (6) asked for, so a future run only needs to add piece data to
        a monster def, not touch this integration again.
        `monsters.js`'s `createMonster`/`createBoss` now copy
        `piece`/`pushesToDefeat` from the def onto the instance if present.
        `onMonsterDefeated` stops the duel sequencer and clears
        `state.duel`/`duelSequencer`/`duelPiece` so the next fight (duel or
        turn-based) always starts clean. Item (5)'s achievement half: `wasBoss`'s
        `trackBossDefeatedWithoutDamage` call now reads `healthBlocks` vs
        `maxHealthBlocks` for a duel fight instead of ink. Item (5)'s OTHER
        half -- retargeting Second Wind (`items.js`, the near-death-save
        item, hooked into `onPlayerDamaged`) at a duel's block loss --
        deliberately NOT done this run: duel-mode damage has no discrete
        `onPlayerDamaged` call to hook (loss happens inside `duel.tick`'s
        own `loseBlock`, called every animation frame, not from an item-hook
        call site), so retargeting it is a real, separate hook-shape design
        call, not a one-line change like the achievement half was. Flagging
        concretely: Second Wind currently does nothing in a duel fight (an
        honest gap, not a regression -- it did nothing there before this run
        either, since duel fights didn't exist as a reachable path at all).
      - `src/components/CombatScreen.jsx` (items 3-4): a `requestAnimation
        Frame` loop, active only while `monster.duel && state.duel`,
        computes `dt` from `Game.getDuelClockNow()` (the sequencer's own
        `ctx.currentTime`) each frame and calls `Game.tickDuel(now, dt)`
        directly -- deliberately bypassing `act()`/the app-wide bump on
        every frame (same pattern the staged-tile drag system already
        established: mutate state directly per-frame, force a real
        re-render only at a genuine transition). A local `duelTick` counter
        forces just this component to re-render each frame so the newly-
        mounted `VolumeGauge` (built and tested standalone by update-2,
        wired in for real for the first time this run) shows live gauge/
        health/i-frame state; `act(() => {})` fires once the duel actually
        resolves (`state.duel.isTerminal()`), flushing the real screen
        transition a synchronous 'player-defeated' -> `endRun(false)` chain
        causes. Guarded on `typeof requestAnimationFrame` -- confirmed
        directly that jsdom has none, so this is a true no-op under
        Vitest/RTL (same convention as the touch-mode matchMedia guard
        elsewhere in this file), real per-frame behavior verified only by
        `test:react-build` (see below). `submit()` now passes
        `Game.getDuelClockNow()` as the word's parry-check clock for a
        duel-mode fight. `VolumeGauge`'s `approachingCrescendoSecondsAway`
        prop is passed `null` -- deriving a live countdown from the
        sequencer's 'crescendo-approaching' event is real, separate,
        genuinely small remaining plumbing, not done this run (documented
        inline).
      - Left deliberately OUT of scope, real remaining work: assigning any
        REAL production monster a `.piece` (still blocked on REGULAR
        ENEMIES/boss-roster work per THEME.md -- monsters.js still carries
        the old sibling-derived names, e.g. "The Vowelmaw," not the bible's
        Mountain King/Death the Fiddler/Valkyrie Marshal/Maestro), the
        crescendo-approaching countdown, Second Wind's retarget, the Largo
        control surface, the virtual-clock balance sim, and real Playwright
        duel win/loss checks (still blocked on a real, reachable production
        duel existing -- this run's own new tests inject a duel directly via
        `state.duel = Duel.create(...)`, same "drive the real engine
        directly" convention every prior isolated slice of this ticket has
        used, since nothing in the shipped game can reach one yet).
      **Verified:** 13 new Vitest tests (`src/test/duelIntegration.test.js`)
      drive the REAL `Game.submitWord`/`Game.tickDuel`/`Game.startDuelFight`
      against real combat state (`freshRun`/`findAvailableCombatNodeId`/
      `Game.enterCurrentNode`, same gameHelpers.js convention every other
      test file uses) -- a won push deals a real decisive blow and reaches
      TILE_REWARD without ever touching the turn-based counterattack path
      (confirmed by polling real `state.screen`, not a mock); a survived
      word never rolls Intents or spends ink; ink hitting 0 never ends a
      duel fight; `Game.tickDuel` forwards to the real `duel.tick` with the
      sequencer's live intensity and correctly no-ops outside/after a fight;
      `Game.startDuelFight` (with an injected FakeAudioContext/FakeGain,
      same convention `music.test.js` established since jsdom has no real
      AudioContext, confirmed directly) creates a real playing sequencer,
      persists `healthBlocks` across the duel, wires the sequencer's real
      'crescendo-peak' event into the duel's parry window (confirmed by
      advancing the fake ctx's `currentTime` past the piece's `peakBeat` and
      calling the sequencer's own `_tick()`), and ends the run on
      `player-defeated` without touching ink; `startCombat`'s automatic
      detection is tested by temporarily stubbing `window.AudioContext` and
      searching real seeds for one whose floor actually rolls a slime combat
      node (not a vacuous "if it happens to be a slime" skip) to prove the
      `.piece` -> duel-mode wiring fires for real, and separately that a
      def without `.piece` (every real one, today) stays turn-based --
      the actual "true no-op today" claim, proven rather than assumed.
      Full `npx vitest run`, 3 consecutive runs: **121/121 every time, zero
      flakes** (up from 108 -- 13 new, all in this run's new file; every
      pre-existing test unaffected). `npm test` (jsdom dom-check,
      `wordbound.html`): ALL CHECKS PASSED, confirming every `game.js`/
      `monsters.js` change is a true no-op there. `npm run build`: clean, 44
      modules (up from 43 -- `CombatScreen.jsx` now actually imports
      `VolumeGauge.jsx` for the first time, making it reachable). `npm run
      test:react-build` (real browser, built output): ALL CHECKS PASSED --
      the full real-word playthrough, staged/drag/touch-drag mechanics, and
      touch-mode checks all still pass unchanged, confirming the rAF
      loop/VolumeGauge mount is inert for every real fight today. `npm run
      test:react-qa`, `npm run test:mobile`, `npm run test:qa`, `npm run
      test:music-engine`, `npm run build:itch` + `npm run test:itch-build`:
      ALL CHECKS PASSED, unaffected.
      **Not verified:** nothing in a real playthrough ever reaches a duel
      (confirmed by `test:react-build`'s unchanged playthrough) -- there is
      still no real duel to look at, feel, or Playwright-verify end-to-end
      in a real browser; that's now purely blocked on a real monster
      getting a `.piece` (REGULAR ENEMIES/boss-roster territory) rather than
      on any remaining integration plumbing. Ticket stays unchecked.
      **Next:** the cleanest unblock is picking ONE real boss (THEME.md
      already names Mountain King for floor 1, with `js/wordbound/pieces/
      mountain-king.js` already built) and giving its monsters.js entry a
      real `.piece`/reskinned name/`pushesToDefeat` -- at that point a real
      Playwright duel win/loss check (item 7) becomes possible for the first
      time, and Jaxon's first real playtest of the mechanic becomes
      reachable. Second Wind's retarget, the crescendo-approaching
      countdown, the Largo surface, and the balance sim remain open,
      smaller, independent pieces after that.
      **ORCHESTRATOR DECISION 2026-08-22 (resolves the boss-def blocker
      documented in COMBAT JUICE's update-1 note; supersedes this ticket's
      "Next" phrasing where they conflict): option (c) — DUEL FIGHTS ARE
      REACT-ONLY.** Rationale, derived from standing decisions rather than
      new taste: Jaxon chose React+Vite as the app; the header combat model
      says EVERY Crescendo fight is a duel (no turn-based mode exists in
      this game's design); and the closed STRUCTURAL ticket already promised
      to retire the legacy dom-check once the React harness superseded it.
      Teaching wordbound.html a duel-tick path (option b) is investment in a
      page this repo is retiring; a parallel second boss-def system with a
      floor-selection policy (option a) is permanent complexity purchased
      only to keep a legacy reference page pristine. Concretely, in ONE
      commit so `npm test` never sits red:
      1. Convert the real floor-1 boss def directly (the Mountain King
         reskin of `boss_vowelmaw` per THEME.md): `.piece`, name,
         `pushesToDefeat`. Mutating the shared def is now sanctioned.
      2. In the SAME commit, amend `test/dom-check.js` deliberately: retire
         or skip `enterAndKillBoss('boss_vowelmaw')` and the two Mend-intent
         turn-based tests WITH a comment naming their React-side
         replacements — allowed only because equivalent-or-better duel
         coverage exists harness-side (duelIntegration.test.js + a real
         verify-react-build duel playthrough; extend those first if any gap
         remains). Never delete legacy coverage whose behavior the React
         harness does not yet verify.
      3. wordbound.html: no duel back-port, no removal this ticket — it
         simply keeps whatever turn-based content still works and stops
         being load-bearing for duel-era defs. Checks in dom-check that
         cover still-shared non-combat behavior stay until superseded.
      This is the first deliberate bite of STRUCTURAL's dom-check
      retirement, not gate-weakening: coverage MOVES to the harness that
      tests the actual product. If Jaxon dislikes React-only duels he can
      say so and the def change reverts cheaply; flagged in the status
      board either way.
      ORCHESTRATOR NOTE 2026-08-22 (update 5): implemented the ORCHESTRATOR
      DECISION above exactly as its three numbered steps specify — the
      first real, player-reachable duel fight now exists in BOTH apps.
      **Built:** `js/wordbound/monsters.js`'s `boss_vowelmaw` def is now
      "The Mountain King" (THEME.md's floor-1 boss), carrying
      `piece: window.Wordbound.Pieces.mountainKing` and `pushesToDefeat: 3`
      (matching game.js's own pre-existing `monster.isBoss ? 3 : 1`
      default, made explicit); `attack`/`intents`/`traitPhases` stay on the
      def unchanged, since they're still legitimately read by direct
      `Monsters.createBoss('boss_vowelmaw')` unit coverage that never
      touches duel routing (documented inline on the def so a future
      reader doesn't assume they're dead everywhere). Referencing the real
      piece object at def-registration time required a load-order fix
      (monsters.js previously loaded BEFORE pieces/mountain-king.js
      everywhere) — moved the music.js + mountain-king.js pair ahead of
      monsters.js in `wordbound.html`, `src/main.jsx`, and
      `src/test/setup.js` (all three, kept in sync per their own existing
      convention); confirmed safe by grepping music.js/mountain-king.js for
      any dependency on a module that would now load after them (none).
      **Fixed exactly what broke, nothing more (step 2's "never delete
      legacy coverage whose behavior the React harness does not yet
      verify" honored throughout):**
      - `test/dom-check.js`: `Game.startDuelFight` calls `initAudioContext()`
        UNCAUGHT (unlike every other sound call site, which wraps it in a
        try/catch — see `playSfx`), and jsdom (this script's whole
        environment) has no `window.AudioContext` at all — a hard script
        crash, not a graceful check failure, the instant any test entered
        boss_vowelmaw through the real `startCombat` path. Two blocks hit
        this: the generic "boss entrance/counterattack-defeat SFX" audio
        check (was `Object.keys(Monsters.BOSS_DEFS)[0]`, which happened to
        resolve to boss_vowelmaw) and the floor-1 boss-skip scenario (a
        forced `hp=1` + one submitted word, which also isn't a
        deterministic duel-mode kill even setting the crash aside — a duel
        kill needs a WON PUSH crossing the gauge, not an hp subtraction).
        Neither test is actually ABOUT boss_vowelmaw specifically (both
        just need "a boss" / "a non-final boss"), so both were repointed at
        `boss_unabridged` (floor 2, still turn-based) instead of
        retired — the floor-1 boss-skip scenario is now
        `boss-skip/floor2`, asserting the identical floor-advance +
        skip-flag-survival behavior one floor over. Zero net coverage
        loss, confirmed by an identical `ALL CHECKS PASSED` (16/16) before
        and after. The two isolated Mend-intent tests (`Monsters.
        createBoss('boss_vowelmaw')` + `Intents.executeIntent` directly,
        never touching `startCombat`) and the trait-phase DOM check
        (reads `BOSS_DEFS['boss_vowelmaw'].traitPhases` as data) were
        confirmed UNAFFECTED by running the suite before touching
        anything and checking exactly what crashed — they needed no
        change at all, correcting this ticket's own prior note (COMBAT
        JUICE update-1) that named "the two Mend-intent tests" as needing
        retirement; that was an inaccurate prediction, not verified
        against a real run before being written down.
      - `src/components/__tests__/RewardScreens.test.jsx`: the same
        jsdom-AudioContext crash, one test (`BossRewardScreen`'s "appears
        after skipping the tile reward from a real boss kill" test, which
        used `findNodeIdByType(state, 'boss')` — always floor 1's boss on
        a fresh run). Fixed the same way: pushed a synthetic
        `boss_unabridged` node directly (the exact technique dom-check's
        own `enterAndKillBoss` helper already uses) instead of relying on
        natural floor generation, since this test is genuinely about
        BossRewardScreen's UI flow after any boss kill, not about which
        boss.
      - `test/verify-react-qa-boss-reward.js` and
        `test/orchestrator-qa-boss-reward.js`: these run in REAL Chromium
        (real AudioContext exists), so entering boss_vowelmaw genuinely
        starts a real live duel — no crash, but two things were actually
        wrong: (1) both asserted `Game._getMusicMode() === 'boss'`/
        `'normal'`, the placeholder turn-based background-music system's
        own mode tracker, which `Game.startDuelFight` bypasses entirely in
        favor of a real Music sequencer — fixed by checking
        `state.monster.duel === true` (fight starts in duel mode) and
        `!state.duel && !state.duelSequencer` (torn down after the kill)
        instead, the actual duel-mode equivalent of what those checks were
        trying to prove. (2) `verify-react-qa-boss-reward.js`'s
        `killBossViaRealWord` forced `monster.hp = 1` for a deterministic
        one-word kill — no longer sufficient for a duel-mode boss (needs a
        WON PUSH). Made it duel-aware: for a duel-mode monster, forces
        `duel.pushesToDefeat = 1` and `duel.gauge = Duel.GAUGE_MAX - 1`
        (one point from winning) instead — the duel equivalent of forcing
        hp=1, not a claim about real boss balance — so the real killing
        blow is still a real word typed and submitted through the real
        Play Word button. `orchestrator-qa-boss-reward.js` needed NO
        change to its own kill mechanism: it already plays real words in
        an organic `fightUntilOver(page, 40)` loop, which — with no tick
        loop in wordbound.html to push back — just kept winning pushes
        across enough real turns and passed unchanged once the two
        assertion fixes above landed. This is real, running proof of the
        decision's own point 3 in production: wordbound.html's floor-1
        boss fight is now a genuine (if pushback-free, since there's no
        rAF tick loop there) duel, not a crash.
      **This closes the real gap the decision's own step 2 required before
      retiring anything ("equivalent-or-better duel coverage exists
      harness-side... extend those first if any gap remains") — before
      this run, ZERO duel fight had ever been reached in a real browser by
      any script in this repo (confirmed: `test:react-build`'s full
      playthrough never encounters a boss; `duelIntegration.test.js`
      injects `state.duel` directly rather than reaching one through real
      UI). `test:react-qa` and `test:qa` are now both real, passing,
      real-browser duel WIN proofs end to end (enter -> real words ->
      real won pushes -> real kill -> real reward-panel flow) — genuinely
      better coverage than what was retired, not just a replacement.**
      **Verified:** `npm test` (jsdom dom-check): ALL CHECKS PASSED
      (16/16), confirmed identical before/after the def change (only the
      floor/boss-id in 4 check labels changed, per the relocation above).
      `npx vitest run`, 3 consecutive runs: **124/124 every time, zero
      flakes**. `npm run build`: clean, 44 modules (unchanged — the
      load-order reshuffle is a reorder, not a new import). `npm run
      test:react-build` (real browser, built output): ALL CHECKS PASSED,
      unaffected (this seed's playthrough doesn't reach a boss). `npm run
      test:react-qa`: ALL CHECKS PASSED, 2 consecutive clean runs,
      including the new real duel-win assertions. `npm run test:mobile`:
      ALL CHECKS PASSED, unaffected. `npm run test:qa` (real browser,
      `wordbound.html`): ALL CHECKS PASSED — the first real proof
      wordbound.html's own floor-1 boss fight survives becoming duel-mode.
      `npm run test:music-engine`: ALL CHECKS PASSED, unaffected. `npm run
      build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED (zip
      genuinely contains `pieces/mountain-king.js` and `duel.js`/
      `duelCombat.js`, confirmed by the packaged listing).
      **Not done, real remaining scope, per the ticket's own bullets:**
      the crescendo-approaching countdown (`VolumeGauge`'s
      `approachingCrescendoSecondsAway` prop is still hardcoded `null` in
      `CombatScreen.jsx`), the Largo tempo-scale control surface, Second
      Wind's retarget at `healthBlocks` (still a no-op in a duel fight,
      documented gap from an earlier update), the virtual-clock balance
      sim (this ticket's own numbers are still "named starting points...
      explicitly flagged retunable, not final balance"), Valkyrie
      Marshal's and the final boss's own real pieces (only Mountain King
      is sequenced), and — genuinely new, not previously called out — a
      real-browser Playwright check of a duel LOSS (health block lost,
      i-frames, eventual player-defeated/GAME_OVER): this run only proved
      WIN end-to-end; the ticket's VERIFY line asks for "full duel win AND
      loss." Ticket stays unchecked; no version bump (still a sub-step,
      not ticket completion, per this repo's own convention). **Next:** a
      real-browser duel-LOSS check (the cleanest small next step — same
      technique as this run's win check, but forcing `duel.gauge` toward
      `Duel.GAUGE_MIN` instead and asserting a health block is lost / the
      i-frame window is visible / GAME_OVER eventually triggers on
      healthBlocks reaching 0) is the most direct way to close this
      ticket's own explicit "win AND loss" verify gap. The
      crescendo-approaching countdown and Largo surface are smaller,
      independent UI pieces; Second Wind's retarget and the balance sim are
      real but lower-urgency now that a duel is finally reachable to
      balance against. COMBAT JUICE's damage-landed hook remains available
      as a separate, lower-priority pickup.
      ORCHESTRATOR NOTE 2026-08-22 (update 6): closed the "win AND loss"
      real-browser gap update-5's own "Next" note named -- the ticket's
      VERIFY line explicitly asks for both, and only WIN had ever been
      proven live before this run. New `test/verify-react-duel-loss.js`
      (`npm run test:react-duel-loss`, against a real `vite build` output,
      never the dev server, same bar as every other test:react-* script):
      two phases against the same real floor-1 Mountain King duel, both
      driven by forcing the gauge to the edge of GAUGE_MIN via setup (same
      "force determinism via setup, let the real engine resolve the actual
      transition" convention `killBossViaRealWord` established for wins in
      `verify-react-qa-boss-reward.js`) and then letting the REAL per-frame
      tick loop (`CombatScreen.jsx`'s own rAF effect calling the real
      `Game.tickDuel`) cross it for real -- nothing here calls
      `duel.tick`/`loseBlock` directly. Losing a push has no discrete
      player action to trigger via UI the way winning does (a submitted
      word), so the continuous music-push tick crossing the gauge for real
      IS the mechanism under test here, not a stand-in for one.
      Phase 1 (non-fatal): confirms a real block loss (Verses 5 -> 4), the
      gauge recentering to ~50, `VolumeGauge`'s `.verse-pip-lost` DOM, the
      `.volume-gauge-iframe` track class + "Grace period" banner going live
      for the first time in any real-browser check (built and unit-tested
      by an earlier run, never before observed live), and that combat
      stays active (a non-fatal loss doesn't end the fight). Then waits out
      the real `Duel.IFRAME_DURATION_SEC` and confirms the grace
      banner/class clear on their own -- proving i-frames are a temporary
      window, not a permanent state change.
      Phase 2 (fatal): forces `healthBlocks = 1` (setup, same convention)
      and repeats the gauge-to-the-edge trick -- the real tick loop's block
      loss empties healthBlocks, the real `duel.on('player-defeated')`
      handler in `Game.startDuelFight` fires, `endRun(false)` runs for
      real, and `RunScreen.jsx`'s own early-return dispatch swaps the whole
      screen to a real "The Well Ran Dry" GAME_OVER, `combatActive`
      cleared, `.volume-gauge` gone. This is the first real-browser proof
      of the full `player-defeated` -> `endRun` -> GAME_OVER chain, not
      just the isolated `duel.js`/`duelIntegration.test.js` unit-tested math.
      **Verified:** `npm run test:react-duel-loss`: **ALL CHECKS PASSED, 2
      consecutive clean runs, zero flakes.** `npm test` (jsdom dom-check):
      ALL CHECKS PASSED (16/16), unaffected (no engine/game.js change this
      run -- pure new test script + one `package.json` script entry). `npx
      vitest run`, 3 consecutive runs: **124/124 every time, zero flakes**.
      `npm run build`: clean, 44 modules, unchanged. `npm run
      test:react-build`, `npm run test:react-qa`, `npm run test:mobile`,
      `npm run test:qa`, `npm run test:music-engine`, `npm run build:itch`
      + `npm run test:itch-build`: ALL CHECKS PASSED, unaffected.
      **Not done:** the ticket's VERIFY line's real-browser bar ("full duel
      win AND loss with zero console errors") is now genuinely met, but the
      ticket itself stays unchecked -- the crescendo-approaching countdown,
      the Largo control surface, Second Wind's retarget, the virtual-clock
      balance sim, and Valkyrie Marshal's/the final boss's own pieces are
      all still open (unchanged from update-5). **Next:** any of those four
      independent pieces; the balance sim is the largest and probably the
      most valuable now that a duel is provably reachable and its win/loss
      ends are both proven live to balance against. COMBAT JUICE's
      damage-landed hook remains available as a separate, lower-priority
      pickup.

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
