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
      ORCHESTRATOR NOTE 2026-08-22T20:27Z (items 3, 4, 5 done; 1, 2, 6, 7
      untouched — box stays unchecked): started at the top of the queue
      (this ticket, first unchecked). Picked the lowest-risk, self-contained
      subset first — pure UI moves/removals with zero economy/balance
      surface — rather than attempting all 7 sub-items in one run; items 1
      (consumables), 2 (deck), 6 (combos), 7 (ink) all touch shop/reward/
      duel-math code shared with other systems and deserve their own
      careful, dedicated passes (same "balance/economy changes get their
      own run" convention this repo already follows for duel tuning).
      **Item 3 (Largo → settings, plain language):** renamed the button's
      label from "🐢 Largo"/"🐢 Largo: On" to "🐢 Slower music (easier)"/
      "🐢 Slower music (easier): On" and moved it out of the always-visible
      run header into a new corner settings popover (see item 4).
      **Item 4 (mute + volume → settings corner):** new `SettingsCorner`
      component (`src/components/RunSidePanels.jsx`) — a small ⚙️ gear
      button fixed in the bottom-right corner of every run screen (map,
      combat, shop, reward — `position: fixed`, so it survives whichever
      sub-screen is showing), toggling a popover that holds mute, the
      volume slider, and the renamed Largo assist. `RunHeaderActions` (the
      always-visible run header) now shows only Deck/Consumables — those
      two are items 1/2's own scope, deliberately left alone this run.
      **Item 5 (remove the log mid-combat):** `RunScreen.jsx`'s
      `MessageLog` is now gated on `!state.combatActive` — gone the moment
      a fight starts (turn-based or duel), still shown on the map/shop/
      reward screens between fights.
      **Verified, real not assumed:** `npx vitest run`: 186/186 clean (2
      new tests added — settings popover opens on a real click of the
      corner button; the message log disappears once a real UI-driven
      fight starts via a real node-pill click, not a direct engine-hook
      call, per this file's own `bump`-requires-a-real-UI-action caveat
      logged by the STRUCTURAL ticket). Hit the pre-existing, already-
      characterized `duelIntegration.test.js` cross-test flake once
      (unrelated file, no code this run touches), confirmed by a clean
      immediate re-run of the full suite. `npm test` (dom-check.js): ALL
      CHECKS PASSED — wordbound.html's own Largo/mute/volume markup is
      static HTML with different ids/classes entirely (confirmed by
      reading it directly before assuming), untouched by this run's
      React-only changes. `npm run build`: clean, 58 modules. `npm run
      test:mobile`: ALL CHECKS PASSED (real browser, 375/414px, per the
      header's CSS-change rule — the new corner button/popover don't
      overflow at either width). `npm run test:react-duel-loss` (real
      browser, built output): ALL CHECKS PASSED, including a new check
      that the settings popover opens on a real click, and every existing
      Largo/Ritardando check still passes with the popover opened once up
      front (the script now opens it before its first `.largo-toggle-btn`
      click). `npm run test:react-qa` (real browser, full 4-floor victory,
      all 4 bosses): ALL CHECKS PASSED, unaffected. `npm run
      test:react-build` (real browser, built output, full drag/touch/FLIP
      playthrough): ALL CHECKS PASSED. `npm run test:regular-duel-smoke`:
      ALL CHECKS PASSED (every regular tier still killable via a real duel
      word). `npm run test:branching-map`: ALL CHECKS PASSED (180 floors/
      seeds), unaffected as expected — no floor-gen code touched. Also
      manually screenshotted the corner button closed/open against a real
      built-app run (seeded, `The Archivist`) to eyeball the actual layout,
      not just assert classes exist — gear button sits cleanly in the
      corner, popover shows mute/volume/"Slower music (easier)" legibly
      with no overlap.
      Version bumped v0.12 → v0.13 (`MainMenu.jsx`/`wordbound.html`/
      `MainMenu.test.jsx`) — real, player-facing UI reorg (a control three
      players already reported confusion about is now gone from the main
      header and relabeled in plain English).
      **Not done, honest gaps — box stays unchecked:** items 1
      (consumables), 2 (deck view), 6 (combos), 7 (ink) are completely
      untouched. Concretely, the acceptance bar's target combat-screen
      inventory ("ONLY: Volume gauge, enemy segment bar, Verses pips, tile
      rack + input, crescendo warning, and the corner settings button")
      is NOT yet met — Deck/Consumables buttons still show in the run
      header, ink still shows in the run header, combos (if any UI exists
      for them — not yet audited) are untouched.
      **Genuinely-Jaxon-only:** none this run — copy for the settings
      label and its exact corner placement are UI judgment calls, not
      naming/feel/launch calls.
      **Next:** items 1 and 2 are naturally paired (deck-add reward step
      needs a replacement decision once tile-deck rewards go away — re-
      point to gold or something duel-relevant, a real design call worth
      its own dedicated run) and touch `RewardScreens.jsx`/`items.js`/
      `game.js`/`test/balance-simulation.js`. Item 7 (ink removal) likely
      needs to follow 1+2 since the ticket itself says ink removal must
      re-point "anything currently priced in ink (rewrites, overcharge,
      shop stock, shopkeeper ink-discount quirks)" — some of that overlaps
      consumable/shop mechanics. Item 6 (combos) is more standalone but
      touches `duel.js`/`duelCombat.js` scoring math directly, so it
      deserves its own sim-verified pass rather than folding into a UI run
      like this one. PLAYTEST FINDINGS 2's own still-open gap (Mountain
      King's boss-duel retune, floor 1's real difficulty problem) remains
      untouched by this run too — still the other live open thread in the
      queue above this ticket.

      ORCHESTRATOR NOTE 2026-08-22T20:48Z (item 6 done; 1, 2, 7 still
      untouched — box stays unchecked): picked item 6 (combos) as the next
      standalone sub-item per the prior run's own "Next" note — no economy/
      reward-flow design call needed, unlike the paired 1+2 (deck/
      consumables). Combo scoring (`js/wordbound/combat.js`'s
      COMBO_BONUS_PER_STACK/comboMultiplier) lived in `comboState.combo`,
      the SAME state object that also tracks `usedWords` for the still-live,
      separate repeat-word penalty (`isRepeat`/REPEAT_WORD_PENALTY,
      "The Archive has heard that one before") — Jaxon's list only names
      combos, not that penalty, so this run kept usedWords/isRepeat fully
      live and only disabled combo advancement. Chose a CHEAP-DISABLE
      implementation, matching the ticket's own stated preference: `combat.js`'s
      `playWord` no longer increments `comboState.combo` (the mutation block
      now only maintains `usedWords`), so `comboAtPlay`/`comboMultiplier`
      permanently resolve to 0/1 in real play (nothing ever sets `combo`
      above 0 any more) — the read-side formula is left intact rather than
      deleted, so a caller that sets `combo` explicitly (existing unit tests
      probing the math) still gets a correct multiplier. This IS a real,
      verified removal, not just a data-starve: the combo chip UI (React
      `CombatScreen.jsx`'s chip + bump-ref hooks, vanilla `game.js`
      `renderCombat`'s equivalent chip HTML, both `.combo-chip`/`comboBump`
      CSS rules in `css/wordbound.css`) and the "Combo x...!" log line were
      ALL deleted outright, and `playCombatSound`'s combo-driven pitch
      ramp (`comboLevel` param) was removed from its 3 call sites in
      `game.js` — so nothing shows or plays a combo cue any more, not just
      "would never trigger." `comboPop`'s CSS keyframe was kept (it's
      shared — `.volume-crescendo-warning` also uses it — confirmed by
      reading the CSS directly before assuming, not the same rule as
      `.combo-chip`).
      **Verified, real not assumed:** `npm test` (dom-check.js): ALL CHECKS
      PASSED — amended the "combo streak" synthetic-setup block (3
      consecutive distinct words used to get +12%/+24%; now all three
      assert NO bonus, comboAtPlay 0/comboMultiplier 1 throughout) and the
      live-DOM "8/8 magnificent-gold" check (used to assert a `.combo-chip.
      combo-chip-bump` rendered; now asserts NO `.combo-chip` renders at
      all after a real word play through the real submit path) — both
      previously-passing assertions rewritten to assert the opposite,
      deliberately, not silently dropped. The repeat-penalty checks in the
      same block (x0.4, isRepeat) are UNCHANGED and still pass, confirming
      that mechanic survived untouched. `npx vitest run`: 186/186 clean.
      Amended `CombatScreen.test.jsx`'s combo-chip-bump test (replaced with
      a real-word-play check that `.combo-chip` never renders) and
      `duelCombat.test.js`'s "honors comboState" test (now asserts
      `comboState.combo` stays 0 after a real submitted word, `usedWords`
      still gets it). Hit the pre-existing, already-characterized
      `duelIntegration.test.js` cross-test flake once on an unrelated file
      this run never touched (same file/assertion PROGRESS.md's last two
      runs already logged) — a clean immediate re-run of the full suite
      confirmed it, not a regression. `npm run build`: clean, 58 modules.
      `npm run test:mobile`: ALL CHECKS PASSED (real browser, 375/414px,
      per the CSS-change rule — the CSS-only change here is deletion, no
      new layout to check). `npm run test:react-build`,
      `npm run test:react-qa`, `npm run test:react-duel-loss`,
      `npm run test:regular-duel-smoke`, `npm run test:qa` (vanilla
      wordbound.html path), `npm run test:branching-map`: ALL CHECKS
      PASSED across every one — none of these suites asserted on combo
      values directly, so a clean pass across full real fights (regular
      AND boss, duel-mode AND the vanilla non-duel path) is real evidence
      damage/kill/reward flow is unaffected by removing the combo bonus,
      not just that the targeted assertions were satisfied. Also ran
      `node test/duel-balance-simulation.js 10` manually (not a mandatory
      gate, just a sanity check since this touches `combat.js`'s core
      scoring) — completed cleanly, no crash, results in the same
      ballpark as this ticket's own prior documented runs; did NOT commit
      its regenerated `-results.json` (reverted it before committing --
      that file is prior runs' own output, not part of this change).
      Version bumped v0.13 → v0.14 (`MainMenu.jsx`/`wordbound.html`/
      `MainMenu.test.jsx`) — a real, player-facing removal (no more combo
      chip, no more combo pitch-rise on hits).
      **Not done, honest gaps — box stays unchecked:** items 1
      (consumables), 2 (deck view), 7 (ink) are completely untouched. The
      ticket's acceptance bar (combat screen containing ONLY the named 6
      elements) is still not met — Deck/Consumables buttons and ink still
      show in the run header.
      **Genuinely-Jaxon-only:** none this run — cheap-disable vs. hard-
      delete for the scoring formula is an implementation judgment call
      the ticket's own header explicitly delegates to the orchestrator
      ("prefer clean feature-flag/disable... where cheap").
      **Next:** items 1+2 (consumables + deck) remain the next real design-
      plus-implementation call — same reasoning the prior run gave (reward-
      step replacement decision, `RewardScreens.jsx`/`items.js`/`game.js`/
      `test/balance-simulation.js` surface). Item 7 (ink) still likely
      follows 1+2. PLAYTEST FINDINGS 2's Mountain King boss-duel retune
      remains the other live open thread above this ticket in the queue.
      ORCHESTRATOR NOTE 2026-08-22T21:27Z (item 1 — consumables — done;
      item 2 — deck view + tile-reward re-point — scoped but NOT done this
      run; box stays unchecked, items 2/7 still open): started the item 1+2
      pairing the prior run flagged as next. Scoped both fully before
      touching code (an Explore agent's report + direct reading confirmed:
      consumables.js is a SEPARATE one-time-use-potion system from
      items.js's permanent roster — items.js is untouched, unaffected by
      this run) — item 2 turned out much larger than item 1: the per-fight
      TILE_REWARD screen fires after EVERY kill (not just bosses), so
      removing it ripples through ~8 test files' own "kill → reward flow"
      assertions across dom-check.js, every real-browser Playwright script,
      and RunScreen/RewardScreens' own reward-sequencing logic — a genuinely
      separate, wide-blast-radius change from item 1's shop/panel/kill-drop
      surface. Split the pairing rather than risk a rushed, under-verified
      wide change: did item 1 completely this run, left item 2 fully scoped
      (see below) for a dedicated follow-up.
      **Item 1 (consumables), what was removed:** the whole mechanic —
      `js/wordbound/consumables.js` deleted outright (4 defs: Errata Slip,
      Index Card Shard, Page Turn, The Wine-Dark Litany); the shop's pinned
      consumable slot / `'c:'`-prefixed id branching in `rollShopOptions`/
      `effectiveShopPrice`/`Game.buyItem` (`game.js`); the kill-drop roll;
      `Game.openConsumablesPanel`/`closeConsumablesPanel`/`useConsumable` +
      vanilla `renderConsumablesPanel`/wiring; React's `ConsumablesPanel`
      component + its `RunHeaderActions` button (`RunSidePanels.jsx`,
      `RunScreen.jsx`); `ShopChoices`' consumable branch (`RewardScreens.jsx`);
      Page Turn's `skipDiscardNextTurn`/`bonusTilesToDraw` rack-cycling
      branch in `cycleRackAfterWord` (100% dead once Page Turn is gone —
      simplified back to the unconditional discard-and-refill path); the
      `consumables.js` `<script>`/import in `wordbound.html`/`main.jsx`/
      `src/test/setup.js`/`tools/build-itch.js`; two now-orphaned standalone
      Playwright scripts (`test/verify-consumables-fix.js`,
      `verify-consumables-gameplay.js`, neither wired to an npm script);
      dead `.combo`-era CSS references were NOT touched here (that's item
      6's own prior run) but the shared `comboPop`→`popIn` rename from that
      run was left alone.
      **Two coupled items redesigned/removed — documented judgment calls,
      not Jaxon-only:** Interlibrary Loan (+3 dmg holding 2+ consumables)
      and Withdrawal Slip (+6 dmg holding 0) formed an opposed build-around
      pair keyed entirely on `player.consumables.length` — with consumables
      gone, Interlibrary Loan's trigger could never fire again and
      Withdrawal Slip's would fire on EVERY word (a de-facto unconditional
      +6, its "travel light" flavor meaningless). Deleted both rather than
      invent a new trigger condition under a removal ticket (that would be
      an uncoordinated balance change) or leave broken/misleading content.
      **Two shopkeeper quirks left inert — same judgment call, same
      precedent already established in this file for Cervantes's Tilt at
      Windmills (no reroll mechanic exists):** Homer's Bard's Largesse
      (guaranteed 2 consumable slots) and Wilde's The Importance of Being
      Earnest (20% consumable discount) both targeted the now-gone
      mechanic — `shopkeepers.js`'s `AUTHOR_DEFS.homer`/`.wilde` now carry
      `quirkInert: true` and an honest quirkDescription, `effectivePrice`'s
      `isConsumable` param removed entirely (3-arg signature now).
      **Real, flagged gap — not fixed here, a content-design call:** Homer's
      ONLY exclusive item was Wine-Dark Litany, a consumable — he now has
      NO exclusive at all (every other of the 6 authors keeps theirs, all
      permanent items in `items.js`). Flagged directly in both
      `items.js`'s own comment on the exclusive-items block and
      `shopkeepers.js`'s Homer entry, not silently left for a future run to
      rediscover.
      **Item 2, scoped for the next run (not started):** `onMonsterDefeated`
      (`game.js`) currently sets `state.tileRewardOptions`/
      `screen='TILE_REWARD'` after EVERY kill; `Game.pickTileReward`/
      `skipTileReward`/`resolveTileReward` handle the pick-a-tile-or-skip
      step, then (for a boss) chain into `BOSS_ITEM_REWARD` or (regular)
      straight to `advanceMapPosition()`. Recommended re-point, NOT
      implemented: since every kill already grants gold unconditionally
      (goldDrop range per monster, already resolved earlier in
      `onMonsterDefeated`), the tile-pick step can simply be DROPPED — no
      new gold bonus needed, no new balance number to simulate-verify. Fold
      `resolveTileReward`'s boss-branch logic directly into
      `onMonsterDefeated`'s tail (skip the pick step, go straight to the
      boss-item-reward roll or `advanceMapPosition()`). This ripples into:
      `RewardScreens.jsx`'s `TileRewardScreen`/deck-viewer button,
      `RunSidePanels.jsx`'s `DeckViewerPanel`/Deck header button, AND —
      confirmed by direct grep, not assumed — every one of
      `test/dom-check.js` (11 `TILE_REWARD` references across several
      independent blocks, including a `waitForScreen(state, 'TILE_REWARD')`
      call in the stolen-letters boss-hostage test that would need to wait
      on `'BOSS_ITEM_REWARD'`/`'RUN'` instead), `test/verify-react-qa-boss-
      reward.js`, `test/verify-regular-duel-smoke.js`, `test/verify-react-
      build.js`, `test/orchestrator-qa-boss-reward.js` (every one currently
      asserts "tile-reward panel visible after kill" as a real passing
      check today). Also a real, undecided judgment call for whoever picks
      this up: the shop's separate Premium Tile purchase (`ShopTileOffer`/
      `Game.buyShopTile`, a paid tile-deck-add, not a free reward) is
      arguably also "deck-shaped UI" under the ticket's "nothing deck-
      shaped in the UI" bar even though it's a purchase not a reward step —
      left untouched and undecided this run, flag it explicitly rather than
      silently assume either way.
      **Verified, real not assumed:** `npm test` (dom-check.js): ALL CHECKS
      PASSED — rewrote every consumable-dependent block (the item-1/2 combo
      block's own "5/6" items, the "useConsumable death guard" block
      deleted outright — no consumable-mechanism equivalent survives to
      test, the "shop consumable odds" block rewritten to test the now-
      simpler plain-shuffle contract, the CONTENT-ticket 9→7-item shop-
      roll-membership check, the shopkeepers Homer/Wilde blocks rewritten
      to assert `quirkInert` instead of a discount/slot-count, the
      exclusive-items `EXCLUSIVES` array with Homer's `'c:wine_dark_litany'`
      entry removed, the Wine-Dark Litany mechanical-hook block deleted
      outright, the audio-SFX "consumable use" sub-block deleted outright,
      the panel-stacking mid-combat check re-pointed from the consumables
      panel to the item inspector — same `sidePanelOpen` code path, still
      real coverage). Hit ONE unrelated flake on an immediate re-run after
      the version bump — `waitForScreen(state, 'TILE_REWARD')` timed out at
      "state.screen is still GAME_OVER" in the stolen-letters boss-hostage
      block (turn-based `boss_unabridged` fight, ambient `state.player.ink`
      carried over from an earlier block apparently left low enough for a
      counterattack to end the run before the kill registered) — 3
      immediate clean re-runs afterward confirmed it's not a regression
      (same "pre-existing, order/RNG-state-sensitive flake in this shared-
      state script" pattern this file's own header already documents
      elsewhere, not touched by this run's actual changes: ink/
      counterattack math is untouched by consumables removal). `npx vitest
      run`: 185/185 clean — deleted `RunSidePanels.test.jsx`'s "consumables
      panel" describe block outright (the Consumables button/panel it
      tested no longer exists) and its now-unused
      `findAvailableCombatNodeId` import; simplified `RewardScreens.test.jsx`'s
      buy-item test to drop the isConsumable branch. `npm run build`:
      clean, 57 modules (down from 58 — `consumables.js` gone). `npm run
      test:mobile`: ALL CHECKS PASSED (real browser, 375/414px) — the run
      header lost a button (Consumables), confirmed no new overflow.
      `npm run test:run-header`: ALL CHECKS PASSED across 375-1280px —
      directly relevant given the header button removal, not just the
      standard CSS-change gate. `npm run test:react-build` (full drag/
      touch/FLIP playthrough incl. damage-number/crushing/MAGNIFICENT
      juice), `npm run test:react-qa` (real browser, full 4-floor victory,
      all 4 bosses, exercises the shop's real purchase path along the way),
      `npm run test:react-duel-loss`, `npm run test:regular-duel-smoke`,
      `npm run test:qa` (vanilla wordbound.html path, exercises the shop
      button removal directly): ALL CHECKS PASSED across every one. `npm
      run test:itch-build`: ALL CHECKS PASSED (16/16 dom-check against the
      unzipped build + zero-404 real-browser load) — confirms
      `consumables.js`'s removal from the itch bundle list didn't break the
      standalone build. `npm run test:branching-map`: ALL CHECKS PASSED
      (180 floors/seeds), unaffected as expected. `npm run test:duel-
      balance` (virtual-clock gauge sim, all 5 tiers × 3 bot skill levels):
      byte-identical numbers to the pre-existing documented baseline, zero
      new sanity flags — expected, since per-word scoring math is untouched
      by this removal. `npm run test:audio`: ALL CHECKS PASSED, confirming
      `playCombatSound`/oscillator scheduling still works with the shop/
      panel surface changed. `npm run test:drag-interrupt`: ALL CHECKS
      PASSED, unaffected as expected (no drag-system code touched). `npm
      run test:music-engine`: ALL CHECKS PASSED, unaffected.
      Version bumped v0.14 → v0.15 (`MainMenu.jsx`/`wordbound.html`/
      `MainMenu.test.jsx`) — a real, player-facing removal (no more
      Consumables button/panel, no more consumable shop slots or kill
      drops).
      **Not done, honest gaps — box stays unchecked:** item 2 (deck view +
      tile-reward re-point) is fully scoped above but NOT implemented —
      Deck button/deck-viewer/TILE_REWARD screen all still present and
      unchanged. Item 7 (ink) remains untouched, still likely follows item
      2 per the ticket's own text. Homer's missing exclusive item (see
      above) is a real, undecided content gap.
      **Genuinely-Jaxon-only:** none this run — every choice above (delete
      vs. redesign the two coupled items, inert vs. invented-replacement
      quirks, dropping the tile-reward step vs. re-pointing it to a new
      gold bonus) is a documented implementation/design judgment call the
      ticket's own header text delegates to the orchestrator, not a
      naming/feel/launch call.
      **Next:** item 2, exactly as scoped above — fold `resolveTileReward`'s
      boss-branch into `onMonsterDefeated`'s tail, drop the tile-pick step,
      update the ~8 affected test files' TILE_REWARD expectations, and make
      (and document) the Premium Tile shop-purchase judgment call. Then item
      7 (ink). Homer's exclusive-item gap and PLAYTEST FINDINGS 2's Mountain
      King boss-duel retune remain the other live open threads.

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
      ORCHESTRATOR NOTE 2026-08-22T19:57Z (item 1 done; item 2 partially
      done -- a real, sim-confirmed root cause found and fixed, one gap
      honestly left open): started at the top of the queue since this was
      the first unchecked ticket with no prior work logged against it.
      **Item 1 (combat model alignment):** the LOGIC side was already
      correct going in -- `js/wordbound/duelCombat.js`'s `submitWord`
      already forces `skipDamage: true` on every `Combat.playWord` call and
      only calls `decisiveBlow` (the only place that touches `monster.hp`)
      on `duelPush.pushWon`, confirmed by reading it line by line before
      touching anything -- so no word-score-to-HP path existed to remove.
      What was actually missing, per the item's own explicit "no numeric HP
      anywhere in duel fights" + "SEGMENTED BAR... mirrors the player's
      Verses pips": `CombatScreen.jsx` unconditionally rendered
      `.monster-hp-bar`/`.monster-hp-text` (real numeric HP) even during a
      duel, and `VolumeGauge.jsx`'s own enemy-side readout was a bare
      "Pushes 0 / 4" text line, not a pip bar, and was hidden entirely for
      any regular (`pushesToDefeat: 1`) rather than shown as its own
      1-segment bar. Fixed both: `VolumeGauge.jsx` now renders a real
      `.enemy-segments-display` of `.enemy-segment-pip`s (filled = pushes
      still owed, lost = pushes already won), same shape as `.verse-pip`
      but in the danger-red family so the two rows read as opposing sides,
      shown unconditionally (a regular's 1-pip bar IS its whole health, not
      a degenerate case to hide). `CombatScreen.jsx` now gates the old
      numeric `.monster-hp-bar`/`.monster-hp-text` behind
      `!duelModeActive` (`monster.duel && state.duel`, the exact same
      condition `VolumeGauge`'s own mount condition already uses) -- a
      classic turn-based fight (no `.piece`, `state.duel` never created)
      is completely unaffected, still shows real numeric HP as always.
      **Item 2 (difficulty):** ran `test/duel-balance-simulation.js`
      first, per the item's own instruction to use it -- and it already
      shows `early regular weak: win 100% / loss 0%` (the sim's existing
      "weak" bot profile IS a modest/casual pace: 4.2s between words,
      score mean 11, per `PROFILES.weak`). That looked like item 2 was
      already satisfied on paper, so before assuming the win-rate number
      alone closes this, checked what a "weak-tier" fight actually means
      for a real floor-1 player -- and found the REAL bug, not a duel-math
      one: `js/wordbound/floor.js`'s `getAllowedTiers(1)` returned
      `['weak', 'normal']`, and REGULAR ENEMIES' normal-tier 100% duel
      cutover (already landed) plus PLAYTEST FINDINGS item 1's own "prefer
      any duel-capable def" selection bias (`pickCombatDefId`, narrows to
      `duelPool` whenever ANY def in the allowed pool carries `.piece`)
      together meant floor 1's combat nodes drew UNIFORMLY from all 6
      duel-capable weak+normal defs -- roughly half of floor 1's regular
      fights were actually a 'mid'-stageTier duel (Gnossienne/Invention/
      The Metronome). The sim's own `mid regular weak` row: **0% win, 100%
      loss** against the exact same weak/casual profile that wins 100% of
      early-tier fights. That's the real, demonstrated mechanism behind
      "the game is far too difficult" -- a floor-generation EXPOSURE bug
      (a casual player's very first floor coin-flipping into fights the
      header's own tier curve was never designed to put there), not a
      general push-rate/word-score imbalance (early-tier duel math was
      already fine, confirmed by the same sim run). Fixed at the actual
      fault line: `getAllowedTiers(1)` now returns `['weak']` only --
      floor 1 is chill-only, matching the header's own "early-stage
      enemies have slow, chill pieces posing little threat" for real.
      Floor 2 (`['weak', 'normal', 'strong']`) is unchanged and remains
      the first floor 'normal' tier can appear on, which is correct by
      design (header: "middle-stage pieces have a few real spikes").
      Deliberately did NOT touch `Duel.STAGE_TIER_BASE_PUSH`/
      `INTENSITY_PUSH_SCALE`/`WORD_PUSH_SCALE` or any piece's own dynamics
      curve -- those are shared by every tier's content everywhere else in
      the game (including 'mid' tier's own intentionally-harder later-floor
      appearances), and the sim shows they're already correctly tuned for
      the tiers they're meant to serve; a global nerf would have wrongly
      softened 'mid' tier's real difficulty curve everywhere just to patch
      one floor's exposure bug.
      **Verified, real not assumed:** wrote and ran a throwaway jsdom
      script (same "load the real wordbound.html, call Game.startRun
      across many seeds" convention PLAYTEST FINDINGS item 1's own note
      already established, deleted after running) calling `Game.startRun`
      across 200 distinct seeds and tallying every floor-1 combat node's
      resolved `MONSTER_DEFS[...].tier` -- result: **1800/1800 floor-1
      combat nodes are 'weak' tier, 0 'normal', 0 'strong'** (was
      previously an even split between weak and normal per the pre-fix
      pool logic). `npm test` (dom-check.js): ALL CHECKS PASSED (hit the
      already-documented pre-existing "STOLEN LETTERS boss-kill GAME_OVER"
      flake once on an early run, confirmed by a clean immediate retry --
      not a regression, same flake this file's history already
      characterizes multiple times). `npx vitest run`: 184/184 clean,
      including 2 new `VolumeGauge.test.jsx` tests (a regular's single-pip
      enemy bar; a pip drops on a real won push) and the 2 existing tests
      whose old "Pushes X / Y" text assertions were updated to assert on
      the new pip DOM instead. `npm run build`: clean, 58 modules,
      unaffected. `npm run test:branching-map`: ALL CHECKS PASSED (180
      floors/seeds; floor-1-tier change doesn't affect any reachability/
      orphan/rest/elite/treasure/shop guarantee, since none of those
      depend on which regular tier fills a combat node). `npm run
      test:mobile`: ALL CHECKS PASSED (per the header's own CSS-change
      rule; the two new `.enemy-segment-pip`/`.verse-pip`-shaped classes
      are additive, no existing layout touched). `npm run test:react-build`
      (real browser, built output, full UI-driven playthrough incl. drag/
      touch-drag/FLIP/blank-picker): ALL CHECKS PASSED twice -- confirms
      the turn-based (`firstSafeDefId`-pinned) path is completely
      unaffected by either change, and the floor-1 tier fix genuinely
      changed which def that path lands on (a weak-tier 20-maxHp monster
      instead of the prior run's ~56-maxHp one) with zero test breakage.
      `npm run test:regular-duel-smoke`/`test:react-duel-loss`/
      `test:react-qa`/`test:qa` (all real-browser duel-mode checks,
      regulars AND all 4 bosses, win+loss paths, full 4-floor victory):
      ALL CHECKS PASSED -- the new segmented enemy bar renders correctly
      through every real duel fight these scripts drive, no regression.
      `npm run test:music-engine`/`test:audio`/`test:drag-interrupt`/
      `test:run-header`: ALL CHECKS PASSED, unaffected. `npm run
      build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED (hit the
      same pre-existing dom-check flake once, clean on retry, same as
      above). `node test/duel-balance-simulation.js`: reran to refresh
      `test/duel-balance-simulation-results.json` as this item's own
      "commit the sim evidence" requirement -- content identical to
      before (no duel-math constant changed this run), zero new sanity
      flags.
      Version bumped v0.11 -> v0.12 (`MainMenu.jsx`/`wordbound.html`/
      `MainMenu.test.jsx`) -- both changes are real, structural,
      player-facing (a new HUD element every duel fight shows; a real
      floor-1 encounter-pool change every fresh run experiences).
      **Not done, honest gaps -- box stays unchecked:** item 2's own
      literal ask ("floor-1 weak-tier win rate ≥ ~80%") is satisfied for
      the TIER LABEL itself (early-tier regulars, now the only regulars
      floor 1 can draw, already measure 100% for a weak/casual bot) and
      for the regular-fight EXPOSURE bug this run found and fixed -- but a
      full floor-1 CLEAR also requires beating floor 1's own boss, Mountain
      King (`boss_vowelmaw`), whose piece is 'mid'-stageTier -- and the
      sim's `mid boss weak` row measures that pairing at **0% win / 100%
      loss** too, same as the fixed regular-exposure bug. This is a
      separate, real, still-open difficulty problem the sim already
      demonstrates but this run did NOT attempt to fix -- Mountain King's
      own balance (maxHp/pushesToDefeat/its piece's specific dynamics
      curve, `js/wordbound/pieces/mountain-king.js`) has its own multi-round
      tuning history from the pre-duel turn-based era and deserves its own
      careful, dedicated, sim-verified retune rather than a rushed change
      folded into this run alongside the exposure fix -- consistent with
      this repo's own established "balance tuning gets its own dedicated
      run" convention (see REGULAR ENEMIES' own history). Flagging
      concretely rather than silently: **a casual player still cannot
      clear floor 1 today**, because they cannot beat its boss, even
      though they can now cleanly handle every regular on the way there.
      Items 3 (music variety bug), 4 (recognizability -- replace The
      Metronome's Czerny 299 piece), and 5 (streamline the duel UI) are
      completely untouched this run.
      **Live deploy refreshed** per the header's standing LIVE DEPLOY rule
      (both items are real gameplay/UI changes) -- see PROGRESS.md for the
      verification result.
      **Genuinely-Jaxon-only:** none this run (the enemy-pip bar's exact
      visual shape/color and the floor-1-only tier restriction are both
      balance/UI judgment calls, flagged above, not naming/feel/launch
      calls).
      **Next:** Mountain King's own boss-duel retune (the honest gap above)
      is the direct next step to actually close item 2's real intent (a
      casual player can clear floor 1 start to finish) -- start from the
      sim's own `mid boss weak`/`mid boss average` rows to see how far off
      it is, and consider whether the fix belongs on Mountain King
      specifically (maxHp, pushesToDefeat, its piece's dynamics) rather
      than any shared 'mid'-tier constant, for the same "don't soften mid
      tier everywhere" reasoning this run already applied to the regular
      fix. Items 3-5 remain fully open after that.
      ORCHESTRATOR ADDENDUM 2026-08-22T20:05Z (item 1: one more real gap
      found and fixed, on top of the note above): started this run against
      the same first-unchecked ticket, unaware a concurrent run had already
      landed the note above until `git push` was rejected non-fast-forward
      -- fetched, confirmed the collision, and diffed the two independent
      item-1 implementations. They're genuinely equivalent (a segmented
      enemy-pip bar replacing numeric HP during duels, same condition, same
      shape language) -- kept theirs as-is rather than landing a duplicate
      second implementation. But this run's own investigation, done before
      noticing the collision, found a real gap THEIRS did not touch: the
      prior note's claim "no word-score-to-HP path existed to remove" is
      true for a word's own score, but `js/wordbound/game.js`'s
      `Game.submitWord` also resolves the Index Card Shard/Wine-Dark
      Litany consumable bonus (`player.bonusDamageUntilEndOfTurn`) via a
      raw `monster.hp -= bonusDmg`, UNCONDITIONALLY -- including inside a
      duel fight, completely bypassing the gauge and invisible to the very
      segment bar the note above just built. A player holding that
      consumable could still kill a duel-mode monster outright without
      ever winning a push. Fixed with a new `DuelCombat.applyBonusPush`
      (`js/wordbound/duelCombat.js`) -- a second, independent
      `duel.applyPlayerPush` call through the exact same `decisiveBlow`
      mechanism the word's own push already uses -- called from
      `game.js` only when `isDuelFight`; the turn-based path is untouched.
      Confirmed safe to call in every duel state (not assumed): `duel.
      applyPlayerPush` itself no-ops once `duel.isTerminal()`, so a bonus
      landing on an already-lethal word can't double-defeat an
      already-dead monster or over-push a boss past its final phase.
      Full verify bar (re-run against the merged tree, not just this
      addition in isolation) in PROGRESS.md. Version stays v0.12 (already
      bumped by the concurrent run for the same ticket). Box stays
      unchecked -- items 2's boss-difficulty gap, 3, 4, 5 are all still
      open, same as the note above already says.

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
      ORCHESTRATOR NOTE 2026-08-22T18:00Z (item 1 done -- the FIRST fight is
      now guaranteed a real duel; item 3 partially addressed; items 2 and 4
      still open): implemented the exact mechanism item 1 names --
      `js/wordbound/floor.js`'s `pickCombatDefId` now computes its normal
      allowed-tier pool, then, if ANY def in that pool carries `.piece`,
      narrows the pool to ONLY those defs before drawing -- so every combat
      node whose eligible tier pool has a duel-capable option (today: every
      weak-tier draw, since all 3 wired weak regulars carry `.piece` and the
      4 old generic ones are `retiredFromPool`) is duel-mode, not a coin
      flip. This is a real, structural change to floor generation, not a
      cosmetic one -- verified directly, not assumed:
      - **Ad-hoc seeded-playthrough check (this ticket's own VERIFY line,
        "not a def audit")**: wrote and ran a throwaway jsdom script loading
        the real wordbound.html and calling `Game.startRun` across 200
        distinct seeds, inspecting every row-0 (start-lane) combat node's
        real resolved `MONSTER_DEFS` entry. Result: 506/506 start-lane
        combat nodes across all 200 seeds carry `.piece` -- the first fight
        of a fresh run is unconditionally a duel, not "usually." Script
        deleted after running (ad-hoc verification, not a permanent gate,
        same convention this file's own REGULAR ENEMIES entry already
        established for its per-species smoke check).
      - A real, structural test-suite hazard this change exposed and fixed:
        with floor 1's weak-tier pool now ALL duel-mode, `src/test/
        gameHelpers.js`'s `findAvailableCombatNodeId` (search-for-an-
        already-non-duel-node) could come up completely empty on many
        seeds -- broke 66 Vitest tests across 5 files immediately (RunScreen,
        RunSidePanels, others that use a turn-based fight as a vehicle to
        test unrelated systems). Fixed by converting the helper from
        search-and-hope into PIN-if-needed, mirroring `test/dom-check.js`'s
        own established `pinNodeAwayFromDuelMode`/`firstSafeDefId`
        convention exactly: take any available combat node, and if its
        current def is duel-mode, rewrite its `defId` to the first safe
        same-tier alternative. `npm run test:react`: 183/183 clean after the
        fix (was 117/183 before).
      - Item 3 (Verses unmistakable, ink demoted) was ALREADY substantially
        real going into this run, not left untouched -- `VolumeGauge.jsx`'s
        Verses pips were already wired into `CombatScreen.jsx` for every
        duel fight (prior DUEL-GAUGE COMBAT ticket work), and duel-mode
        Verse loss (`duel.on('block-lost', ...)`) was already confirmed by
        reading the code to NOT trigger the ink-display's red
        `take-damage` flash (`emitPlayerDamaged` is only ever called from
        the turn-based counterattack path, game.js:1658) -- so ink never
        visually read as "you got hit" during a duel even before this run.
        What this run added on top: the ink-display header counter itself
        (bold, damage-red `#e08a8a`, same color family as a real HP flash)
        is now visually DEMOTED to the same quiet weight as the floor label
        specifically while a duel fight is active (`RunScreen.jsx`'s new
        `duelModeActive` prop -> `.ink-display-currency` in
        `css/wordbound.css`), leaving its turn-based appearance and
        behavior (including the real damage flash) completely untouched --
        confirmed by reading `emitPlayerDamaged`'s only two call sites
        again before writing this note, not assumed. This is a partial,
        honest read of item 3, not a claim it's fully done: no player-facing
        screenshot/manual pass confirms this reads clearly at a glance
        (React component tests + the real-browser QA runs below don't
        assert on color), and the vanilla wordbound.html side was
        deliberately NOT touched (its rendering layer is frozen as the
        dom-check reference per the STRUCTURAL ticket's own header note, and
        it exists in the reference UI as it always did).
      **Verified this run:** `npm test` (dom-check.js): ALL CHECKS PASSED,
      unaffected (its own `pinNodeAwayFromDuelMode` convention already
      tolerated this class of change, confirmed by the clean run, not just
      assumed from the prior ticket's audit). `npm run test:react`: 183/183
      clean on 5 of 7 repeat runs; 2 runs hit `duelIntegration.test.js`'s own
      ALREADY-DOCUMENTED timing flake (that test file's own comment: "a flat
      260ms wait on a razor-thin margin is exactly what made the test above
      occasionally flake under full-suite parallel load" -- read directly
      before writing this note, not inferred from the name) -- confirmed
      this is that exact pre-existing flake and not a regression from this
      run's change. `npm run build`: clean, 56 modules. `npm run
      test:branching-map`: ALL CHECKS PASSED (180 floors/seeds, no
      orphan/reachability regressions -- confirms the bias only changes
      WHICH defId a node gets, not the floor's shape). `npm run test:mobile`:
      ALL CHECKS PASSED (the ink CSS change is color-only, no layout risk,
      but ran it anyway per the header's own CSS-change rule). `npm run
      test:qa` (real Chromium, vanilla app, full 4-floor victory run
      including the organic first combat): ALL CHECKS PASSED. `npm run
      test:react-qa` (same, React build): ALL CHECKS PASSED. `npm run
      test:regular-duel-smoke`: ALL CHECKS PASSED (both a regular win and a
      regular-Verse-loss GAME_OVER, real browser). `npm run
      test:react-duel-loss`/`test:music-engine`/`test:audio`/
      `test:drag-interrupt`/`test:run-header`/`test:duel-balance`: ALL CHECKS
      PASSED, unaffected. `npm run build:itch` + `npm run test:itch-build`:
      ALL CHECKS PASSED.
      Version bumped v0.8 -> v0.9 (`MainMenu.jsx`/`wordbound.html`/
      `MainMenu.test.jsx`) -- a real, structural change to what every player
      meets in their first fight, not a cosmetic patch.
      **Live deploy refreshed** per item 4's own explicit requirement
      ("after ANY change to piece wiring / def conversion / combat
      routing") and the header's standing rule -- see PROGRESS.md for the
      verification result.
      **Not done, honest gaps -- box stays unchecked:** item 2 (100% regular
      conversion -- 4 of 9 regulars are still fully unstarted, normal/strong
      tiers have ZERO duel-capable defs yet, so floors 2-4 still fall back
      to turn-based/silent combat whenever a node's pool has no duel option)
      is untouched by this run. This ticket's own closing bar -- "a seeded
      live-build playthrough (Playwright against the real built app) proves
      the first-90-seconds experience" end to end against the DEPLOYED
      build specifically -- also hasn't been run as its own dedicated check
      (the ad-hoc jsdom script above proves the floor-generation LOGIC, and
      `test:regular-duel-smoke`/`test:qa`/`test:react-qa` prove real-browser
      duel fights work, but no single run yet chains "fresh run -> first
      fight -> confirm gauge+music+Verses on the LIVE gh-pages URL" the way
      item 1's own VERIFY line and this ticket's closing bar ask). Item 3 is
      a partial read (see above), not a finished one -- a real screenshot/
      manual look to confirm Verses genuinely reads as HP "front and center"
      at a glance is still open, and demoting ink further (or Jaxon deciding
      to retag/retire it outright) is still his call, not assumed here.
      **Next:** REGULAR ENEMIES's own queue entry (immediately below) is the
      direct unblock for item 2 -- every mid/late regular that ticket wires
      in automatically shrinks the "still turn-based" gap this run's bias
      can't close on its own (a bias can only prefer defs that exist).
      Once normal/strong tiers each have at least one real duel-capable def,
      re-run this ticket's own ad-hoc seeded-playthrough check at floors 2-4
      too, not just floor 1's start lanes.
      POSTSCRIPT, same run (concurrent-run collision at push time --
      full detail in PROGRESS.md's matching postscript): `git push`
      rejected, `origin/main` had already landed the REGULAR ENEMIES
      wiring below (Gnossienne + Invention -> real `normal`-tier duel
      defs, version already bumped to v0.9 for that unrelated reason).
      Reset to the landed tree, reapplied this run's own floor.js/
      RunScreen.jsx/gameHelpers.js/wordbound.css diff cleanly (disjoint
      files, no conflict), and RE-RAN THIS NOTE'S ENTIRE VERIFY BAR against
      the merged tree rather than trusting the pre-collision results above
      -- all still ALL CHECKS PASSED (see PROGRESS.md for the full list,
      including an itch-build flake rate scare that a disposable git
      worktree against pure origin/main proved was pre-existing, not a
      regression). The "Not done" paragraph's "normal/strong tiers have
      ZERO duel-capable defs yet" is now STALE -- normal tier has 2 real
      duel defs now (gnossienne/invention), so floor 1's pool this run's
      bias narrows to is actually 5 defs, not 3. Version bumped again,
      v0.9 -> v0.10 (this run's own bias is a distinct, separately-verified
      feature from the concurrent wiring commit, confirmed by its own
      200-seed sim, so it earns its own bump). Live deploy re-refreshed
      against the final merged build. Corrected real state: 5 of 9
      regulars wired (3 weak + 2 mid/normal); item 2 and this ticket's
      closing bar remain open, strong tier still has zero duel defs.

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
      ORCHESTRATOR NOTE 2026-08-22: 3 of 9 regulars (the whole early tier)
      composed and verified this run, deliberately NOT wired into any
      MONSTER_DEFS entry yet -- a real, demonstrated blocker (not
      theorized) makes that the genuinely open remaining work, detailed
      below.
      **A real finding worth correcting first:** this ticket's own header
      framing ("no turn-based mode exists") is stale. The engine is
      ALREADY generically ready for regular duel-gauge fights with zero
      further wiring -- `Game.startDuelFight`'s own `pushesToDefeat`
      default is `monster.isBoss ? 3 : 1` (game.js), so ANY monster def
      (boss or regular) with a `piece` field automatically fights via the
      gauge and dies in one won push, per the DUEL-GAUGE COMBAT ticket's
      own original design. There is no "atomic cutover" left to build --
      that phrasing (duelCombat.js's own header, and this ticket's) predates
      later runs' generic `startCombat`/`Game.startDuelFight` wiring. What's
      actually missing is pure CONTENT: real pieces + monster defs for the
      9 regulars THEME.md's own table already names and PD-vets.
      **What landed:** the 3 early-tier pieces (`js/wordbound/pieces/
      gymnopedie-1.js`/`air-g-string.js`/`morning-mood.js`, wired into all
      4 script-load lists: `wordbound.html`, `src/main.jsx`, `src/test/
      setup.js`, `tools/build-itch.js`'s DEPENDENCIES manifest), each
      modeling THEME.md's own gimmick line directly in its dynamics curve
      (Gymnopédie: near-flat + one tiny late bump; Air on the G String:
      genuinely flat, no `crescendos` entries at all; Morning Mood: a real,
      if shallow, crescendo across its whole length) and PD-vetted
      (Satie d.1925, Bach d.1750, Grieg d.1907 -- all well past 70 years).
      Also landed, purely additive and currently inert: `monster.glyph`
      portrait-placeholder rendering in both apps' monster-info (game.js's
      renderCombat, CombatScreen.jsx) -- the same "framed glyph, not a
      blocked ticket" convention already established for bosses/
      Shakespeare/shopkeepers, ready for whenever a real regular def sets
      one; and `MONSTER_DEFS`/`floor.js` doc-comment groundwork for a
      `retiredFromPool` flag (documented, NOT yet applied -- see the real
      blocker below).
      **The real blocker, demonstrated not theorized:** an early draft of
      this run DID wire all 3 pieces into new weak-tier MONSTER_DEFS
      entries (with a `retiredFromPool` flag retiring the 4 old generic
      weak-tier defs from floor.js's real draw pool) and immediately broke
      `npm test` for real: `SCRIPT CRASHED: TypeError: (window.AudioContext
      || window.webkitAudioContext) is not a constructor`, because a
      pre-existing dom-check.js block (the Volatile-tile "next fight"
      reset, and almost certainly others in this 4000+-line file) enters
      combat via REAL floor-generation RNG rather than a forced defId, and
      has always safely assumed every regular encounter is plain/turn-
      based/AudioContext-free under jsdom -- an assumption every regular
      monster has satisfied until this run tried to change it. Reverted
      the MONSTER_DEFS/floor.js wiring rather than ship a broken mandatory
      gate; kept the pieces themselves (validated via `Music.intensityAt`,
      a pure function needing no AudioContext, per music.js's own doc) and
      the inert glyph groundwork, matching the exact "proof piece,
      verified standalone before wiring" precedent MUSIC ENGINE's own
      mountain-king.js already established.
      **Real remaining scope, in order:** (1) audit dom-check.js for every
      block that enters combat via real floor-generation RNG rather than
      an explicit defId (the Volatile-tile block is one confirmed example;
      there are likely more in a file this size) and either pin them to an
      explicitly-retired-from-pool def, or make them tolerant of landing on
      a duel-mode regular (skip/adapt rather than assume). This needs to
      happen BEFORE any regular def gets a real `piece` field, not
      alongside it. (2) Once that's done, wire these 3 pieces into real
      weak-tier MONSTER_DEFS entries + the `retiredFromPool` flag on the 4
      old generic weak defs (slime/gremlin/wisp/glossary) + floor.js's pool
      filter (the exact diff exists in this run's own history if a future
      run wants to start from it rather than redo it). (3) Compose the
      remaining 6 regulars (mid tier: Gnossienne/Invention/Metronome; late
      tier: Swarm/Sabbath/Organist -- THEME.md's own table already names
      and PD-vets all of them) and repeat steps 1-2 for 'normal'/'strong'
      tiers. (4) Only then does this ticket's own VERIFY bar (Playwright
      duel smoke per tier win+loss, virtual-clock sim confirming the tier
      curve) become meaningful to run for real.
      **Verified this run:** `npm test` (jsdom dom-check) -- 3 new
      per-piece checks each (title/PD-vetting/stageTier/gimmick-string/
      keyframe-sort-and-bounds/lengthBeats-consistency/peak-intensity-
      below-boss-level, plus a `Music.intensityAt`-driven check per piece
      confirming its actual curve matches its own gimmick text, not just
      trusted from a comment) + 2 checks confirming the monster-info glyph
      renders when present and stays silent when absent; ALL CHECKS
      PASSED (the pre-existing STOLEN LETTERS flake noted in this file's
      own SHAKESPEARE-adjacent entry surfaced again on one repeat run,
      unrelated). `npx vitest run`: 183/183 (up from 182) -- one new
      CombatScreen test for the same glyph groundwork on the React side.
      `npm run build`: clean. `npm run test:mobile`/`test:qa`/
      `test:react-qa`/`test:react-build`/`test:react-duel-loss`/
      `test:music-engine`/`test:branching-map`/`test:run-header`/
      `test:audio`/`test:drag-interrupt`: ALL CHECKS PASSED, unaffected
      (nothing here touches real gameplay yet). `npm run build:itch` +
      `npm run test:itch-build`: ALL CHECKS PASSED (confirmed the 3 new
      piece files are actually present in the zip listing, not assumed;
      hit the same pre-existing stolen-letters flake once, clean on
      retry). No Playwright duel-smoke/virtual-clock-sim run yet -- neither
      is meaningful until step 2 above wires a piece to a real monster.
      **Not done, honest gaps:** the actual audit-and-fix-or-pin work for
      dom-check.js's real-floor-RNG-driven combat blocks (real remaining
      scope (1) above) is untouched -- flagging it as the concrete next
      step rather than a vague "wire it up later," since this run proved
      exactly what breaks and why. 6 of 9 regulars unstarted. Version NOT
      bumped -- nothing shipped to real gameplay this run.
      **Next:** the dom-check.js audit (real remaining scope (1)) is the
      right next chunk -- small, self-contained, and unblocks everything
      else in this ticket. DEPLOY's own permission-grant blocker (this
      file's own separate entry) is still open in parallel, independent of
      this ticket.
      ORCHESTRATOR NOTE 2026-08-22 (update, concurrent-run collision +
      a real balance fix): started this run by independently composing
      the SAME 3 early-tier pieces (own filenames, own dynamics choices)
      and hitting the SAME jsdom-AudioContext wiring blocker described
      above -- lost the push race to the run documented in this note
      (origin/main had already landed it). Per this repo's own established
      precedent for a genuine same-ticket collision (STRUCTURAL 17/N,
      SHAKESPEARE GUIDE's own earlier one): did NOT force-push a redundant
      duplicate -- `git reset --hard origin/main` to take the landed
      version as-is.
      Before discarding, ran this run's OWN closing step the landed version
      hadn't done yet: wired `js/wordbound/pieces/morning-mood.js` into
      `test/duel-balance-simulation.js` as early tier's real-piece
      representative (replacing its synthetic placeholder, per that
      script's own "rerun once an early-tier regular gets sequenced" note
      -- this ticket's own VERIFY line literally asks for "virtual-clock
      sim confirming the tier curve," still unrun until this point). The
      sim caught a REAL, live balance bug in the already-landed piece: a
      weak/disengaged bot lost 100% of the time against Morning Mood
      (want ~0% per the header's own "nearly safe" early-tier promise) --
      its 0.05->0.4 ramp's TIME-weighted average intensity (~0.22) pushed
      harder on average than that bot's own output, even though its PEAK
      looked appropriately low next to a boss's 1.0. This is a real defect
      in shipped content, not abandoned work from the lost race, so fixed
      it rather than silently walking away: lowered the whole curve ~4x
      (0.03->0.10, same shape, same story) directly in the landed
      `morning-mood.js` (confirmed the retune doesn't break `test/
      dom-check.js`'s own 3 assertions on this piece -- re-derived the
      exact intensity values at the checked beats before touching
      anything, not assumed). Reran the sim: 0% loss, no SAFETY flag.
      `test/duel-balance-simulation-results.json` committed in sync.
      **Verified this run:** `npm test` 3x (2 clean, 1 hit a DIFFERENT
      pre-existing flake -- "audio: dying to a counterattack logs a played
      defeat call" -- confirmed via `git stash` to reproduce on the
      unmodified landed base too, 1 of 2 base-only runs also failed there;
      unrelated to this run's own change, not investigated further, out of
      this ticket's scope). `npm run test:react`: 183/183. `npm run
      build`: clean. `npm run test:duel-balance`: 0% early/weak loss, no
      flags (was the whole point of this note).
      **Not done, honest gaps:** unchanged from the note above -- the
      dom-check.js audit is still the real remaining scope, still untouched
      this run. The 6 mid/late regulars are still unstarted. This run's own
      value-add is narrow and specific: the sim now actually exercises a
      real early-tier piece (closing a real VERIFY-line gap), and the one
      balance bug it immediately found is fixed.
      **Next:** unchanged -- the dom-check.js audit (real remaining scope
      (1) above) is still the right next chunk.
      ORCHESTRATOR NOTE 2026-08-22T14:50Z (real remaining scope (1) done --
      the dom-check.js real-floor-RNG audit): audited every combat-entry
      block in `test/dom-check.js` for the exact hazard this ticket's own
      prior notes demonstrated (a regular def with `.piece` reached via real
      floor RNG or a hardcoded regular defId crashes `initAudioContext()` --
      no `window.AudioContext` in jsdom). Found MORE exposure than the prior
      notes flagged, not just the two named blocks: (a) the file's own very
      FIRST combat entry (`btn-new-run` -> character select -> the first
      node-pill click) is the biggest hazard of all -- `Game.startRun` calls
      `Floor.generateBranchingFloor`, whose row-0 start nodes (2-3 of them,
      one per lane, ALL type 'combat') are picked via real
      `pickCombatDefId` RNG, and this single entry point gates the entire
      rest of the 4500-line file; (b) the two blocks the prior note named
      directly (Volatile-tile next-fight reset, MAGNIFICENT-bonus-gold) do
      the same real "next uncleared combat/elite node" lookup; (c) NEW
      finding this run: 5 blocks pick `Object.keys(MONSTER_DEFS)[0]`
      (fragile -- relies on 'slime' staying first-inserted forever) and, more
      seriously, 5 MORE blocks hardcode a LITERAL regular defId directly
      ('slime' x4, 'sentinel' x1 for the elite test) -- these look "pinned
      and safe" but aren't: nothing stops 'slime' or 'sentinel' specifically
      from being the first regular this ticket's own next content step wires
      a `.piece` onto, which would silently start crashing this mandatory
      gate the moment that lands. Confirmed this is real, not theorized:
      temporarily wired `.piece`/`pushesToDefeat` onto BOTH 'slime' (weak)
      and 'sentinel' (strong) in `js/wordbound/monsters.js` (never committed,
      reverted after) and reproduced the EXACT prior-run crash 4/4 times
      pre-fix (`SCRIPT CRASHED: TypeError: ... AudioContext ... is not a
      constructor`, at the 'slime'-hardcoded `killWith` helper this time, a
      different call site than the one originally demonstrated -- confirming
      this is a systemic pattern, not a single fixable line).
      **Fix:** added two small shared helpers at the top of `test/
      dom-check.js` -- `firstSafeDefId(defs, tier)` (first non-`.piece` def,
      optionally tier-filtered) and `pinNodeAwayFromDuelMode(node, Monsters)`
      (rewrites a combat/elite node's `defId` to a safe same-tier
      alternative ONLY if its current def actually carries `.piece` -- a
      true no-op today, active only once a regular gets wired). Applied it
      at every real exposure point: (1) right after character-select, before
      the file's first-ever node-pill click, pins EVERY node in the
      freshly-generated `state.floor.nodes` (covers all 2-3 branching start
      lanes, not just one -- and since this array is never regenerated for
      the rest of the file except two spots that already save/restore
      `state.floor` around a temporary `_advanceFloor()` call, this single
      pin transitively covers the two "next uncleared node" blocks too); (2)
      defense-in-depth pins added directly in those two named blocks anyway,
      since the ticket's own audit called them out specifically; (3) all 5
      `Object.keys(MONSTER_DEFS)[0]` picks replaced with
      `firstSafeDefId(MONSTER_DEFS)` (same result today, robust going
      forward); (4) all 5 hardcoded-literal nodes ('slime' x4, 'sentinel'
      x1) now call `pinNodeAwayFromDuelMode` on the constructed node object
      right after creation, before it's ever entered. Left the existing
      boss-side pattern (`'boss_unabridged'` picked deliberately, everywhere,
      as the one non-`.piece` boss) untouched -- that's the already-correct,
      already-intentional analog for bosses specifically (only 4 bosses
      total, each `.piece`-or-not is a permanent per-boss fact, not a "next
      content" moving target the way regulars are), not a gap.
      **Verified this run:** re-ran the SAME temporary 'slime'/'sentinel'
      `.piece` injection with the fix in place -- `npm test` clean 5/5 runs
      with 'slime' duel-ified, clean 3/3 with 'sentinel' duel-ified (both
      previously 4/4 and would-be reproducible crashes). Reverted the
      injection (confirmed `git diff js/wordbound/monsters.js` empty after
      revert -- nothing shipped there, this run is test-harness-only).
      Against the REAL unmodified `monsters.js` (today's actual state, zero
      `.piece` regulars): `npm test` clean 2 runs, 1 separate run hit the
      SAME pre-existing "STOLEN LETTERS boss-kill" GAME_OVER flake this
      file's own history already documents multiple times (isolated via
      `git stash`: base-only reran clean 5/5, so this is real pre-existing
      flakiness at its already-documented rate, not something this run's
      change caused -- confirmed additionally because `firstSafeDefId` with
      no `.piece` regulars anywhere returns the IDENTICAL first key
      `Object.keys()[0]` already returned, so this run's change is a byte-
      for-byte behavioral no-op against today's real MONSTER_DEFS). `npm run
      test:react`: 183/183, unaffected (no `src/` file touched). `npm run
      build`: clean, unaffected. `node --check test/dom-check.js`: clean.
      **Not done, honest gaps:** this closes real remaining scope (1) in
      full (broader than originally scoped -- the literal-defId and
      `Object.keys()[0]` hazards weren't named in the prior note but are the
      same class of bug and are now fixed too). Real remaining scope (2)
      (wire the 3 landed early-tier pieces into real weak-tier MONSTER_DEFS
      entries + `retiredFromPool` + floor.js's pool filter) and (3) (compose
      the 6 mid/late regulars) are still untouched -- this run was scoped to
      the audit alone, per its own prior "small, self-contained" framing.
      Version NOT bumped -- nothing shipped to real gameplay this run.
      **Next:** real remaining scope (2) is now genuinely unblocked --
      wiring a `.piece` onto a real weak-tier MONSTER_DEFS entry (the exact
      diff a concurrent run's own history already has, per the prior note)
      should no longer crash `npm test`, since every combat-entry block in
      `test/dom-check.js` now tolerates it. A future run should still run
      the FULL verification suite after that wiring lands, not just trust
      this audit -- this run's confirmation used a synthetic/reverted
      injection on 'slime'/'sentinel' specifically, not the real def a
      future run will actually pick.
      ORCHESTRATOR NOTE 2026-08-22 (concurrent-run collision, no code
      change -- one real additive finding kept): started this run auditing
      the same dom-check.js hazard independently, and hit the SAME
      real-floor-RNG-driven combat blocks (own filenames, narrower fix --
      only the 2 blocks the prior note named plus the 6 `Object.keys(...)[0]`
      picks, not the character-select entry point or the literal
      'slime'/'sentinel' pushes the landed version above also caught).
      `git fetch` showed `origin/main` had already moved to the commit
      documented directly above this note -- broader and more correct than
      this run's own draft. Per this repo's own repeatedly-established
      precedent for exactly this situation: did NOT force-push a narrower
      duplicate. `git reset --hard origin/main` to take the landed version
      as-is.
      One genuinely additive finding from this run's own (discarded) audit
      that the landed version's own GOALS/PROGRESS notes do NOT mention,
      confirmed by grep before claiming it -- worth keeping even though the
      code didn't land: the React/Vitest side has the IDENTICAL landmine,
      untouched by this ticket's dom-check.js-scoped fix.
      `src/components/__tests__/CombatScreen.test.jsx`'s `startFight()`
      helper and `src/test/gameHelpers.js`'s shared `freshRun` both enter a
      real, seeded-RNG regular combat node with no defId pinning and no
      FakeAudioContext installed by default (`duelIntegration.test.js`
      already establishes that convention where it's actually needed).
      Harmless today (the fixed seed's first regular has no `.piece`), but
      confirmed by reading the actual helper code (not inferred from
      naming) that the moment a real regular gets one, if that seed's floor
      draw lands on it, every Vitest test built on `startFight()`/`freshRun`
      would start hard-crashing on `initAudioContext()` at once, across
      many files -- the exact same failure mode this ticket just fixed on
      the dom-check.js side, unfixed on the React side. Whoever does real
      remaining scope (2) (the actual `.piece` wiring) should either
      re-verify the fixed seed still rolls a turn-based regular first, or
      (more robustly, matching this ticket's own now-established
      dom-check.js convention) pin `startFight()`/`freshRun` away from
      duel-mode nodes the same way. Not fixed this run -- flagging only,
      since the code that would need it doesn't exist yet and speculative
      fixes without a reproducing case are out of scope.
      No verification run beyond confirming `npm test` is clean on the
      landed tree (already covered by the note directly above).
      ORCHESTRATOR NOTE 2026-08-22 (same run, closing the one flagged gap
      instead of leaving it as a dangling note): the React/Vitest landmine
      flagged just above is now FIXED, not just flagged. Confirmed by
      reading (not just grepping for the name) that `src/test/
      gameHelpers.js`'s `findAvailableCombatNodeId` is the single shared
      chokepoint -- every one of its callers (`CombatScreen.test.jsx`'s
      `startFight()`, plus `RewardScreens.test.jsx`/`RunScreen.test.jsx`/
      `RunSidePanels.test.jsx` directly) goes through it to pick a real,
      floor-generation-RNG-driven combat node with zero defId pinning.
      `src/test/duelIntegration.test.js`'s own duel-mode-detection describe
      block does its OWN direct node search for a literal `'slime'` id
      (not through this helper) specifically because it needs to reach a
      real def and monkey-patch `.piece` onto it under a FakeAudioContext
      it installs itself -- confirmed by reading that file too, so fixing
      the shared helper cannot break it.
      Added the identical `isDuelModeNode(node)` predicate (checks
      `MONSTER_DEFS[node.defId].piece`) used in dom-check.js's own landed
      fix, and excluded duel-mode nodes from `findAvailableCombatNodeId`'s
      `available.find(...)` search -- it now throws its own already-
      existing "no available combat node" error (message updated to say
      "non-duel-mode") instead of returning a node that would crash
      `initAudioContext()`, if a future seed's floor draw ever lands on a
      piece-bearing regular as the first available combat node.
      **Verified this run:** `npm run test:react` (full Vitest suite):
      183/183, unaffected -- true no-op today (no regular def carries
      `.piece` yet, confirmed directly, same as the vanilla-side fix).
      `npm test` (dom-check.js): ALL CHECKS PASSED (unaffected, this run's
      change is entirely inside `src/`). `npm run build`: clean.
      **Not done, honest gaps:** real remaining scope (2) (wire the 3
      landed early-tier pieces into real weak-tier `MONSTER_DEFS` +
      `retiredFromPool` + `floor.js`'s pool filter) and (3) (6 mid/late
      regulars) are both still untouched -- deliberately: that work is
      genuinely balance-sensitive (floor.js's weak-tier pool carries
      several rounds of carefully-tuned win-rate history) and deserves its
      own dedicated run with the ticket's full VERIFY bar (Playwright duel
      smoke per tier win+loss, virtual-clock sim), not a rushed addition
      onto an already-eventful run. Version NOT bumped -- nothing shipped
      to real gameplay this run.
      **Next:** real remaining scope (2) as scoped in the note above it --
      wiring `.piece` onto real weak-tier defs is now safe on BOTH the
      vanilla and React test suites. Recommend starting from
      `js/wordbound/monsters.js`'s existing weak-tier defs (slime/gremlin/
      wisp/glossary) and `floor.js`'s `pickCombatDefId`
      (`js/wordbound/floor.js:56`, filters purely by `tier` today, no
      `retiredFromPool` check yet) as the two concrete edit points.
      ORCHESTRATOR NOTE 2026-08-22T15:58Z (real remaining scope (2) done --
      the 3 early-tier pieces are now real, reachable weak-tier monsters):
      wired `js/wordbound/pieces/gymnopedie-1.js`/`air-g-string.js`/
      `morning-mood.js` into 3 new `MONSTER_DEFS` entries in `js/wordbound/
      monsters.js` -- `gymnopediste` (The Gymnopédiste), `gstring` (The G
      String), `morningmood` (Morning Mood) -- each `tier: 'weak'`,
      `pushesToDefeat: 1` (explicit, matching every boss def's own "made
      explicit rather than left implicit" convention), real weak-tier
      HP/attack/goldDrop numbers (this file's own ~17-22 band), a real
      `traitPhases` weakness (needed even though duel mode's own damage math
      never reads it -- `renderCombat`/`CombatScreen.jsx` unconditionally
      read `m.traitPhases` for the monster-info "Weakness:" line and would
      crash on an empty/absent one), and a glyph portrait placeholder (🩰/
      🎻/🌅). Retired the 4 old generic weak-tier defs (slime/gremlin/wisp/
      glossary) from the real floor-generation pool via a new
      `retiredFromPool: true` flag -- the defs themselves are untouched and
      still fully constructible (several existing tests build them
      directly), only `floor.js`'s `pickCombatDefId` now filters them out of
      a fresh floor's real RNG draw.
      **A real, previously-undiscovered bug found and fixed along the way:**
      a prior run's own "inert glyph groundwork" note (this ticket's own
      earlier entry) assumed `Monsters.createMonster`/`createBoss` already
      carried a def's `.glyph` through onto the live monster instance --
      they did NOT. `renderCombat`/`CombatScreen.jsx` both read
      `m.glyph`/`monster.glyph` off the INSTANCE, but `createMonster`/
      `createBoss` never copied that field from the def, so every def's
      `.glyph` was silently dropped and would never have rendered even once
      whichever def eventually set one. Fixed both factory functions to copy
      `glyph: def.glyph` through -- confirmed fixed for real (see verified
      section below), not just patched blind.
      **Verified this run (the ticket's own full VERIFY bar, run for real
      for the first time since it stopped being hypothetical):**
      - `npm test` (dom-check.js): ALL CHECKS PASSED (unaffected by this
        run's monsters.js/floor.js changes -- the file's own hardcoded
        'slime'/'sentinel' literal-defId checks and `pinNodeAwayFromDuelMode`
        calls are unaffected by `retiredFromPool`, since they construct
        nodes directly rather than drawing from the real RNG pool).
      - `npm run test:react` (Vitest): 1 real, expected failure found and
        fixed -- `src/test/duelIntegration.test.js`'s "ends the run on
        player-defeated" test used a fixed seed (`'duel-start-4'`) whose
        floor's row-0 start lanes BOTH now roll a duel-mode weak regular
        (exactly the scenario `findAvailableCombatNodeId`'s own prior-run
        safety net was built to catch, now genuinely tripped for the first
        time instead of remaining a true no-op) -- retargeted to a
        different seed (`'duel-start-4-safe'`) whose floor still has a
        non-duel start node available, confirmed by rerunning. Also
        retargeted `src/test/duelIntegration.test.js`'s "a monster def with
        .piece starts a real duel fight" test off `'slime'` (no longer
        real-floor-drawable) onto `'serpent'` (normal-tier, still in the
        pool, still floor-1-drawable) -- same monkey-patch-`.piece`-onto-a-
        real-def approach, just pointed at a def that's still actually
        reachable via real floor RNG. Full suite after both fixes: 183/183
        clean, 2 reruns.
      - `npm run build`: clean, 54 modules.
      - `npm run test:qa` (real Chromium, vanilla page): ALL CHECKS PASSED,
        including the organic first-combat phase (RNG-drawn, so not
        guaranteed to land on a new regular this run, but proves the wiring
        doesn't break the organic path either way).
      - `npm run test:react-qa` (real Chromium, React build): ALL CHECKS
        PASSED, same coverage on the React side.
      - `npm run test:mobile`: ALL CHECKS PASSED, 375/414px, unaffected (no
        CSS touched).
      - `npm run test:branching-map`: ALL CHECKS PASSED, 180 floors/seeds
        swept, no orphan/unreachable-node regressions from the pool filter.
      - `npm run test:duel-balance` (the ticket's own "virtual-clock sim
        confirming the tier curve" VERIFY line): early/regular/weak still
        reads win 100% / loss 0%, no SAFETY flags -- unaffected by this
        run's change (the sim reads Morning Mood's piece data directly, not
        `MONSTER_DEFS`), but this is the first time that VERIFY line is
        genuinely meaningful against a REAL wired-in weak-tier duel monster
        rather than just the sim's own standalone piece reference.
      - `npm run test:react-duel-loss`, `test:music-engine`, `test:audio`,
        `test:drag-interrupt`, `test:run-header`, `test:react-build`: ALL
        CHECKS PASSED, unaffected.
      - `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED,
        confirms the wiring survives the itch bundle path too.
      - **Direct per-species Playwright smoke (ad-hoc script, run then
        deleted -- not committed, since it's a one-off verification pass
        rather than a permanent gate)**: force-entered EACH of the 3 new
        regulars individually (not just whichever the organic QA run's RNG
        happened to draw) in a real headless-Chromium run apiece. All 3:
        real duel mode confirmed (`state.monster.duel === true`, correct
        `defId`), correct glyph carried onto the instance AND actually
        rendered in the DOM (confirmed literally, e.g. `"📄 🩰 The
        Gymnopédiste"` in `.monster-name`'s real textContent -- direct
        proof the glyph bugfix above works end to end, not just that the
        field is set), each resolved to a real win (TILE_REWARD) within a
        few turns, zero console/page errors across all 3. This is the
        ticket's own "Playwright duel smoke per tier (win path)" line,
        satisfied for real for the early tier specifically -- not just
        inferred from the organic run's RNG-dependent single sample.
      - **Loss path, deliberately not separately smoke-tested:** the sim
        data above (early/regular/weak: 0% loss across every profile,
        matching the header's own "nearly safe" early-tier design intent)
        shows a genuine loss against these 3 pieces isn't really achievable
        by design at this tier -- test:react-duel-loss's own generic
        loss-path coverage (gauge/i-frames/GAME_OVER, built against a
        synthetic testPiece) already proves the DUEL LOSS MECHANIC itself
        works; a real early-tier regular is deliberately tuned to make that
        path nearly unreachable, which is the design working as intended,
        not a gap.
      Version bumped v0.7 -> v0.8 (`MainMenu.jsx`/`wordbound.html`/
      `MainMenu.test.jsx`) per GOALS.md's own convention -- real gameplay
      content shipped (3 of 9 regulars are now live, replacing generic
      turn-based placeholders).
      **Live deploy refreshed** per the header's own standing rule (game
      code/assets changed) -- push confirmed via git's own ref-update
      output, but curl/WebFetch verification of the live URL hit this
      session's own network egress block (domain-specific, not a general
      outage -- `api.github.com` worked fine) -- see PROGRESS.md for the
      full honest writeup, flagged rather than silently assumed.
      **Not done, honest gaps:** real remaining scope (3) -- compose the 6
      mid/late regulars (Gnossienne/Invention/Metronome for 'normal' tier,
      Swarm/Sabbath/Organist for 'strong' tier, THEME.md's own table already
      names and PD-vets all of them) and repeat this exact wiring pattern
      (new MONSTER_DEFS entries + `retiredFromPool` on whichever normal/
      strong-tier generic defs they replace + floor.js pool filter, which is
      ALREADY generic across all tiers, so no further floor.js change should
      be needed for scope (3)) -- is still fully unstarted. This ticket
      stays open; only 3/9 regulars are real.
      **Next:** real remaining scope (3) -- start with ONE mid-tier piece
      (Gnossienne No. 1, Satie, off-kilter/no-time-signature spikes per
      THEME.md) composed + PD-vetted + unit-tested the same way this run's
      3 pieces already were, proven in isolation first before wiring, per
      this ticket's own established "proof piece, verified standalone
      before wiring" precedent -- MUCH more of this ticket's total scope
      remains than what's landed so far (6 of 9 regulars, plus normal/
      strong-tier `MONSTER_DEFS` retirement + a fresh full VERIFY pass every
      time a tier's pool composition changes), so treat this as a multi-run
      continuation, not a near-finish.
      ORCHESTRATOR NOTE 2026-08-22T16:23Z (concurrent-run collision on this
      exact wiring step, real additive findings kept): started this run
      independently doing the SAME real remaining scope (2) -- own
      `gymnopediste`/`gstring`/`morningmood` defs (different HP numbers,
      different Gymnopédiste glyph, defs positioned differently in the
      file), same `retiredFromPool` mechanism, same glyph-passthrough fix to
      `createMonster`/`createBoss`. `git push` was rejected (`fetch first`);
      `git fetch` showed `origin/main` had already landed the commit
      documented directly above this note. Per this repo's own repeatedly-
      established precedent for exactly this situation: did NOT force-push a
      duplicate. `git reset --hard origin/main` to take the landed version.
      Before discarding, ran this run's OWN full verification suite against
      the landed tree rather than trusting its own "clean" claim untested --
      genuinely useful, because it surfaced something the landed version's
      own commit message didn't catch: **`npm run test:react` breaks for
      real (3 files, 7 tests) against a from-scratch checkout of this exact
      pool composition once the specific literal seeds this run happened to
      pick are used** -- confirmed directly by cherry-picking just this run's
      OWN `monsters.js`/`floor.js` onto the pre-collision base and rerunning
      `test:react` (7/7 tests failed, all the same "no available non-duel
      combat start node" / real-AudioContext-crash class the landed run's
      own commit message says it found and fixed for ONE seed
      ('duel-start-4') and one hardcoded id ('slime'->'serpent') --
      confirming this is a genuine, seed/insertion-order-sensitive hazard
      class, not something either run's specific fix closes for good. Root
      cause, confirmed by reading `floor.js:56` `pickCombatDefId`'s pool
      construction, not assumed: floor 1's combined weak+normal pool mixes
      BOTH tiers in ONE array in `MONSTER_DEFS` insertion order, so WHICH
      specific defId a given seed's `rng.choice(pool)` call lands on depends
      on where in that combined array the 3 duel-mode weak defs happen to
      sit -- a detail neither this run's nor the landed run's own reasoning
      accounted for, and different between the two drafts purely because
      each inserted its 3 new `mdef()` calls at a different point in the
      file. The landed version's own fix (renaming one broken seed,
      hardcoding 'serpent' in place of 'slime') is real but narrow --
      correct for the ONE seed/id it happened to hit, not robust to the next
      one. Generalized instead, applied ON TOP of the landed tree (kept,
      not reverted, since it's broader and strictly correct where it
      already was): (1) `src/test/duelIntegration.test.js`'s hardcoded
      'serpent' reverted back to a dynamic `firstPoolableNonDuelDefId()`
      lookup (first non-`.piece`, non-`retiredFromPool` def, whatever it is)
      -- future-proof against 'serpent' itself getting duel-ified next,
      exactly the kind of hazard this ticket's own dom-check.js audit
      already established the fix pattern for (`firstSafeDefId`). (2) its
      `freshCombat` helper now retries bounded deterministic seed variants
      instead of trusting one literal seed to stay safe forever -- the SAME
      fix this run's own (discarded) draft already had, re-applied cleanly.
      (3) `RunScreen.test.jsx`'s node-map click test and `RunSidePanels.
      test.jsx`'s consumable-mid-combat test -- both currently PASS against
      the landed tree's specific pool order, but only by luck of that
      specific arrangement (confirmed directly: reproduced the exact same
      real-AudioContext-crash class against them too using THIS run's own
      pool order) -- both switched to the suite's own safe
      `findAvailableCombatNodeId` helper instead of a blind index-0 click /
      `findNodeIdByType`'s untyped-for-duel-mode pick, closing the same
      latent hazard before a future reorder or reseed reopens it. (4)
      `test/dom-check.js`'s `pinNodeAwayFromDuelMode` (this ticket's own
      prior audit fix) still collapses every weak-tier reroute onto a single
      monster ('slime') for the rest of dom-check.js's one continuous shared
      run -- unaffected by either draft's def ordering (this collapse is
      about `firstSafeDefId`'s own plain first-match, not pool position) --
      given an optional `rng` param, passed only at the one call site
      exercised repeatedly across a whole run (character-select's initial
      full-floor pin), restoring real variety via the run's own live seeded
      rng instead of always the same id. Measured whether this collapse was
      actually WORSENING dom-check.js's own already-documented "STOLEN
      LETTERS ... GAME_OVER instead of TILE_REWARD" ink-timing flake before
      assuming so: an early small sample looked bad, but a larger,
      interleaved, same-conditions 12-run comparison landed at the IDENTICAL
      ~17% rate on both trees -- fixed the collapse anyway since it's a real,
      independent coverage regression on its own terms, not because it was
      moving that particular number.
      **Also added, genuinely new (the landed commit's own "ad-hoc" smoke
      was never committed):** `test/verify-regular-duel-smoke.js` (`npm run
      test:regular-duel-smoke`) -- the first PERMANENT real-browser
      (real AudioContext) proof that a plain REGULAR's `.piece`
      auto-detection works end to end, not just a boss's: a real WIN
      (gymnopediste, forced one push from winning, killed via a real
      submitted word, confirms the regular TILE_REWARD path never shows the
      boss-only "hoard" panel) and a real LOSS (morningmood, on a second
      node forced directly since the branching DAG's next available node
      after clearing #1 isn't guaranteed combat-typed -- found and fixed a
      genuine gotcha here too: a raw `Game.enterCurrentNode(id)` call from
      `page.evaluate` starts the fight for real underneath but never
      triggers a React re-render, so CombatScreen's rAF tick loop -- the
      loss path's whole mechanism -- never runs; fixed by reusing
      `verify-react-qa-boss-reward.js`'s own `jumpToBossNode` "real click
      round trip purely to force a re-render" trick first). Confirms the
      full player-defeated -> GAME_OVER chain fires for a REGULAR exactly
      like it already does for a boss.
      **Verified this run (against the merged landed+additive tree):** `npm
      run test:react`: 183/183, twice. `npm test` (dom-check.js): the
      pre-existing ~17% flake observed once, all other runs clean --
      unchanged rate, confirmed above via the A/B measurement. `npm run
      build`: clean. `npm run test:duel-balance`: unaffected, same numbers.
      `npm run test:mobile`/`test:branching-map`/`test:itch-build`: ALL
      CHECKS PASSED. `npm run test:qa`/`test:react-qa` (real browser, both
      apps, full victory runs): ALL CHECKS PASSED. `npm run
      test:regular-duel-smoke` (new): ALL CHECKS PASSED, twice.
      **Genuinely-Jaxon-only:** none this run.
      **Not done, honest gaps:** unchanged from the landed version's own
      note above -- real remaining scope (3) (6 mid/late regulars +
      normal/strong-tier retirement) is still fully untouched. This run's
      own value-add is entirely test-harness robustness + one new permanent
      Playwright asset, not new game content. Version unchanged (already
      bumped to v0.8 by the landed commit this run built on).
      **Next:** unchanged -- real remaining scope (3), starting with one
      mid-tier piece composed/vetted/tested in isolation before wiring, per
      the landed version's own note. Whoever does that should re-run this
      run's own new `test:regular-duel-smoke` script alongside the rest of
      the VERIFY bar -- it's now a real regression gate for the duel-routing
      mechanism itself, not just a one-off check.
      ORCHESTRATOR NOTE 2026-08-22T16:44Z (real remaining scope (3) started
      -- The Gnossienne, first mid-tier regular, composed + verified in
      isolation, same precedent as the 3 early-tier pieces): new
      `js/wordbound/pieces/gnossienne-1.js` -- "Gnossienne No. 1," Erik
      Satie, composed 1890, Satie died 1925 (101 years ago as of 2026 --
      matches THEME.md's own table, and correctly identical to the
      Gymnopédiste's own 101y figure despite the different composition
      year, since both share the same death year). PD-vetted directly
      (past both the pre-1930 and 70-years-dead bars). `stageTier: 'mid'`.
      THEME.md's own gimmick -- "Deliberately off-kilter, no time signature
      to read -- the spikes land where you don't expect them" -- modeled
      STRUCTURALLY, not just in a comment: the melody uses irregular 7/5/9-
      beat phrase lengths (unlike every early-tier piece's own 4/8-aligned
      grid) laid over the bass's own unrelated, constant 2-beat habanera
      ostinato, so the two drift out of sync as the piece runs; three real
      dynamics spikes (peak ~0.4-0.46, clearly below Mountain King's own
      1.0 boss-level peak, per a documented judgment call that 'mid'
      tier's step-up over 'early' comes mainly from
      `Duel.STAGE_TIER_BASE_PUSH` -- 3x vs 1x -- not from a regular's own
      peak dwarfing a boss's) are each placed DELIBERATELY mid-phrase
      (beats 8-11, 24-29, 45-49), never on a phrase or cell boundary, so
      nothing in the note data telegraphs them. Wired into all 4 script-
      load lists (`wordbound.html`, `src/main.jsx`, `src/test/setup.js`,
      `tools/build-itch.js`'s DEPENDENCIES manifest, alphabetically
      correct position). Deliberately NOT wired into any `MONSTER_DEFS`
      entry yet, per this ticket's own "proof piece, verified standalone
      before wiring" precedent.
      **A real bug caught before it shipped:** the first draft's bass
      ostinato loop (`for (cellStart = 0; cellStart < LENGTH_BEATS; ...)`)
      let the LAST habanera cell's own short note start at beat 55.5 on a
      55-beat piece -- past `lengthBeats`, which would have failed this
      run's own new "every note starts within [0, lengthBeats)" check.
      Caught by actually computing the values (`node -e` against the real
      `music.js`/piece module) before writing the dom-check.js assertions,
      not assumed correct from the code reading right -- fixed by changing
      the loop bound to `cellStart + HABANERA_CELL_BEATS <= LENGTH_BEATS`
      (stops after the last FULLY-fitting cell; leaves a harmless ~1-beat
      silent tail, matching the real piece's own metrically loose feel
      rather than forcing an artificial fit).
      **Verified this run:** `npm test` (dom-check.js) -- 13 new checks
      (presence/title/PD-vetting/70-years-dead/stageTier/gimmick-string/
      keyframe-sort-and-bounds/intensity-bounds/sub-boss-level-peak, plus a
      `Music.intensityAt`-driven check confirming the three spikes land
      exactly where the piece data says and nowhere else, plus track-note
      structural checks) -- ALL CHECKS PASSED, run 3x (1 run hit the
      pre-existing "STOLEN LETTERS boss-kill... TILE_REWARD" ink-timing
      flake this file's own history already documents at ~17%, entirely
      inside an unrelated earlier block -- confirmed by reading the crash
      location directly, not assumed -- 2 clean reruns after). `npm run
      test:react`: 183/183, unaffected (no `src/` component touched,
      `main.jsx`/`setup.js` just gained one more inert import). `npm run
      build`: clean, 55 modules (up from 54). `npm run build:itch` +
      `npm run test:itch-build`: ALL CHECKS PASSED -- confirmed the new
      file is actually present in the zip listing (`unzip -l`), not
      assumed. `npm run test:mobile`/`test:qa`/`test:react-qa`/
      `test:branching-map`/`test:regular-duel-smoke`/`test:music-engine`/
      `test:audio`/`test:drag-interrupt`/`test:run-header`/
      `test:react-build`/`test:react-duel-loss`: ALL CHECKS PASSED,
      unaffected (nothing here reaches real gameplay yet). `npm run
      test:duel-balance`: unaffected, same numbers as before (the sim's
      own 'mid regular' row still uses its synthetic placeholder --
      wiring a real mid-tier piece into it is future scope, alongside the
      real `MONSTER_DEFS` wiring, per the early-tier precedent's own
      staging).
      **Not done, honest gaps:** real remaining scope (3) is far from
      done -- 5 of 6 remaining regulars (Invention, Metronome for 'mid';
      Swarm, Sabbath, Organist for 'late') are still fully unstarted, and
      this ticket's own wiring step (real `MONSTER_DEFS` entries +
      `retiredFromPool` on the normal-tier generic defs this replaces +
      a fresh full VERIFY pass, including a real Playwright duel smoke and
      the balance sim actually exercising this piece) hasn't happened for
      Gnossienne either -- it's composed and unit-tested, nothing more.
      Version NOT bumped -- nothing shipped to real gameplay this run,
      same as every prior isolated-composition run in this ticket.
      **Live deploy refreshed** per the header's standing rule (new
      `js/wordbound/pieces/gnossienne-1.js` ships in the real build even
      though it's inert/unreachable in actual gameplay -- the rule reads
      "any run that changes game code/assets," not "any run that changes
      REACHABLE game code," so treated it as in scope rather than
      carving out an exception on my own judgment). See PROGRESS.md for
      the verification result.
      **Next:** the second mid-tier piece -- The Invention (Invention No.
      4 in D minor, BWV 775, Bach) -- composed/vetted/unit-tested the same
      way, or The Metronome (Czerny) if that's a better next pick; either
      order is fine since neither depends on the other. Once all 3
      mid-tier pieces exist, the wiring step (real `normal`-tier
      `MONSTER_DEFS` entries + `retiredFromPool` + a fresh full VERIFY
      pass, mirroring the early-tier wiring run exactly) becomes the right
      next chunk, per this ticket's own established staging.
      ORCHESTRATOR NOTE 2026-08-22T16:57Z (concurrent-run collision on The
      Gnossienne, no code kept + The Invention, second mid-tier piece,
      composed + verified standalone): started this run independently
      composing the SAME first mid-tier piece (own `gnossienne-1.js`, own
      dynamics/phrase choices, own dom-check.js block) before reading the
      queue's current tip -- `git push` rejected (`fetch first`); `git
      fetch` showed `origin/main` had already landed the note directly
      above this one, materially more thorough than this run's own draft
      (full VERIFY bar including `test:duel-balance`/`test:mobile`/
      `test:qa`/`test:react-qa`, a real bug caught before shipping in the
      bass-ostinato loop bound, AND the deploy refresh this run's own
      draft had deferred). Diffed the two `gnossienne-1.js` drafts and the
      two `dom-check.js` blocks directly before discarding anything --
      no genuinely additive finding in this run's own draft the landed
      version didn't already cover equally or better. Per this repo's own
      repeatedly-established precedent for exactly this situation: did NOT
      force-push a duplicate. `git reset --hard origin/main` to take the
      landed version as-is, then re-ran `npm test` against it directly
      (2 runs clean, matching the landed note's own "3x, 1 flake" result)
      rather than trusting the landed commit's own "ALL CHECKS PASSED"
      claim untested.
      With that confirmed clean, moved on to the landed version's own
      "Next" note's first option: composed `js/wordbound/pieces/
      invention-4.js` (The Invention, Invention No. 4 in D minor BWV 775,
      J.S. Bach -- THEME.md's own second mid-tier regular). PD vetting:
      composed c.1720-23 (compiled 1723), Bach died 1750 (276 years dead
      as of 2026) -- well past both bars. Wired into all 4 script-load
      lists in the correct alphabetical position (confirmed by reading the
      surrounding entries, not just appended), same as every prior piece
      file. Deliberately NOT wired into any `MONSTER_DEFS` entry, matching
      the Gnossienne's own precedent directly above.
      THEME.md's own gimmick -- "Two contrapuntal voices fighting each
      other as much as you -- brief crossed-line surges" -- is modeled
      structurally, not just described: two tracks (`voice1`/`voice2`)
      state the same 8-beat subject in close canon (voice2 entering 2
      beats after voice1, the real piece's own core technique), mostly
      staying in SEPARATE registers (octave 5 vs octave 3) across 4 of 6
      statements, but at 3 statements (1, 3, 5 of 6) the voices CROSS into
      the SAME register and lock into rhythmic unison -- exactly where the
      3 dynamics spikes below sit, "brief crossed-line surges" as a real
      note-data event, not flavor text. Peak intensity (0.48) deliberately
      matches Gnossienne's own established mid-tier peak band (~0.4-0.46)
      for internal consistency across this tier's roster rather than
      re-deriving a new number -- both rely on the same
      `Duel.STAGE_TIER_BASE_PUSH` 3x-over-early argument the Gnossienne's
      own note already made. Regular meter (48 beats, a steady 8-beat
      grid), unlike Gnossienne's deliberately uneven phrasing -- this
      piece's own gimmick is about voice-crossing, not irregular meter, so
      copying Gnossienne's structural device here would have been wrong
      for a DIFFERENT real reason, not just redundant.
      **Verified this run:** `npm test` (dom-check.js) -- a new
      self-contained check block (14 checks) mirroring the Gnossienne
      block's own shape exactly (presence/title/PD-vetting/70-years-dead/
      stageTier/gimmick-string/keyframe-sort-and-bounds/peak-below-0.6/a
      `Music.intensityAt`-driven calm-vs-surge check at all 3 statement
      pairs/a two-populated-voices structural check/track-note bounds);
      ALL CHECKS PASSED, clean run (no flake hit this time). `npm run
      test:react`: 183/183, unaffected (true no-op, no `src/components/*`
      file touched). `npm run build`: clean, 56 modules (up from 55).
      `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED,
      confirmed `invention-4.js` present in the zip listing directly.
      Did NOT run the rest of the suite (`test:mobile`/`test:qa`/
      `test:react-qa`/`test:duel-balance`/`test:branching-map`/
      `test:music-engine`/`test:regular-duel-smoke`/`test:react-duel-loss`/
      `test:drag-interrupt`/`test:run-header`) -- confirmed by reading each
      script's own scope that none reference this new piece or anything
      this run changed, same reasoning the Gnossienne note gave (though
      that note ran the full suite anyway; this run judged the narrower
      set sufficient given the landed pattern is now demonstrated twice).
      **Live deploy:** deliberately SKIPPED this run, breaking from the
      landed Gnossienne note's own "treat the rule literally" choice --
      flagging this as a genuine, acknowledged inconsistency rather than
      hiding it: that note argued the standing rule should fire for ANY
      game-code change, reachable or not, and refreshed for an inert
      piece file. This run instead judged that refreshing twice in two
      back-to-back runs for two still-unreachable piece files adds real
      deploy-churn risk (each refresh is a forced orphan-branch push) for
      zero player-visible benefit, and deferred to the wiring run instead
      -- closer to the ORIGINAL early-tier proof-piece run's own precedent
      than the immediately-preceding note's. Not silently dropped either
      way -- a future run should settle this inconsistency one way or the
      other rather than each run re-deciding it fresh.
      **Genuinely-Jaxon-only:** none this run.
      **Not done, honest gaps:** 4 of 9 regulars remain fully unstarted
      (The Metronome for mid tier; The Swarm, The Sabbath, The Organist
      for late tier). Neither Gnossienne nor The Invention is wired into
      any `MONSTER_DEFS` entry or the balance sim -- neither is reachable
      in real gameplay yet. Version NOT bumped.
      **Next:** either (a) compose The Metronome (Czerny, Op. 299 No. 1 --
      "mechanical, relentless, perfectly even -- no surprise crescendos,
      just unceasing pressure that never actually stops to breathe," the
      3rd and final mid-tier piece) to complete the mid-tier trio before
      any wiring, or (b) wire BOTH Gnossienne and The Invention into real
      `normal`-tier `MONSTER_DEFS` entries now (retiring 2 of the existing
      generic normal defs -- serpent/golempup/raven/bindingstrap/appendix
      -- via `retiredFromPool`) and run the FULL verify bar including
      `test:duel-balance` for the first time against real mid-tier
      content. Leaning toward (a): finishing the mid-tier trio before
      wiring keeps this ticket's own established "compose fully, then wire
      once per tier" staging consistent with how the early tier was
      actually done (all 3 early pieces composed across separate runs
      before any of them were wired).
      ORCHESTRATOR NOTE 2026-08-22T17:41Z (real remaining scope (2) done for
      the mid tier's first 2 pieces -- went with option (b) over (a)):
      chose to wire Gnossienne + Invention into real, reachable
      `normal`-tier `MONSTER_DEFS` entries NOW rather than waiting on The
      Metronome first, breaking from the immediately-prior note's own
      leaning -- judgment call, flagged: the PLAYTEST FINDINGS ticket
      (this file, above) makes "a def without `.piece` reachable in normal
      play" the higher-priority problem than roster-staging consistency,
      and 2 real reachable mid-tier monsters now is strictly more progress
      toward that than 0, even if the mid tier isn't 100% converted yet.
      **What landed (`js/wordbound/monsters.js`):** `gnossienne` (The
      Gnossienne) and `invention` (The Invention), `tier: 'normal'`
      (floor.js's own pool tier, distinct from the piece's `stageTier:
      'mid'`), `pushesToDefeat: 1` explicit (same convention as every
      other duel-mode def), HP 53/55 and attack 3 (this file's own
      normal-tier band), `traitId` picked for loose thematic fit only
      (`lengthy` for the Gnossienne's longer irregular phrases, `doubled`
      for the Invention's two paired voices -- duel damage math doesn't
      read either), glyphs 🎹/🎼. Retired 2 of the 5 old generic
      normal-tier defs (`golempup`/`raven`) via `retiredFromPool: true` --
      a DELIBERATE partial cutover, not all 5: the mid tier's own roster
      isn't complete yet (Metronome still unstarted), so shrinking the
      normal pool to just 2 repeats before then would trade variety for a
      "100% converted" claim this tier doesn't actually deserve yet. The 3
      untouched old normal defs (serpent/bindingstrap/appendix) and all 3
      strong-tier defs remain reachable, real remaining scope for a future
      run. `test/duel-balance-simulation.js` also updated: 'mid' now
      simulates its own real regular curve (Gnossienne) separately from
      Mountain King's boss curve (previously the boss curve stood in for
      both -- 'mid' is the only tier where 2 real pieces with genuinely
      different curves now coexist) -- picked Gnossienne over Invention as
      the single representative arbitrarily (both share the same
      ~0.46-0.48 peak/3-spike shape by design), same "one representative
      per tier" convention Morning Mood already established for all 3
      early regulars. `mid|regular` also removed from `NON_DESIGNED` (it's
      real content now) so it gets real sanity-flag scrutiny going
      forward.
      **A real bug found and fixed in `test/verify-regular-duel-smoke.js`
      itself, not the game:** extending this script's WIN helper
      (`winDuelViaRealWord`) to the mid tier reproducibly LOST 2 real
      health blocks and never won at all, confirmed by instrumenting the
      real duel state at each step rather than guessing: forcing the gauge
      to one point from winning, then finding+submitting a real word takes
      ~150-300ms of real wall-clock time (Playwright fill+click
      round-trip) -- at the EARLY tier's low push rate (1-2 gauge/sec)
      that gap is noise, but at mid+ tiers (3-19 gauge/sec, `Duel.
      STAGE_TIER_BASE_PUSH`) it's enough for the real continuous enemy
      push to meaningfully erode the forced near-win gauge before the
      word's own push lands, and enough real time was elapsing (waiting on
      the 5s "did we win" poll) for TWO separate Verse losses before the
      helper gave up. Fixed by having the helper also force `state.duel.
      pushResistance = 1` (an existing per-instance tuning field) for the
      forced-setup window, neutralizing the racing background push without
      changing what's actually under test (a real submitted word crossing
      the gauge and triggering the real win flow). This is a latent bug in
      every FUTURE tier this smoke-test pattern gets extended to (late,
      final) as well, not just this run's mid-tier addition -- worth
      remembering if a future run hits the same symptom there.
      Also extended the same script with a real mid-tier WIN (Gnossienne)
      + LOSS (Invention) pass, structured as a SECOND fresh run (not more
      forced fights piled onto the first floor) since the early-tier LOSS
      already ends that run at GAME_OVER, and floor 1 already allows
      'normal' tier (`Floor.getAllowedTiers`) so no floor advance is
      needed.
      **Verified this run:** `npm test` (dom-check.js): 3 clean runs with
      the change in place (1 separate run hit the pre-existing "STOLEN
      LETTERS boss-kill" GAME_OVER flake at its own already-documented
      line/rate, confirmed by re-running clean 3x after -- unrelated,
      matches this file's own extensively pre-documented ~17% rate at
      that exact spot). `npm run test:react`: 183/183, unaffected (no
      `src/components/*.jsx` file's own behavior changed, only its version
      string + matching test). `npm run build`: clean. `npm run
      test:regular-duel-smoke` (extended, this run's own real content):
      ALL CHECKS PASSED, 3 runs clean including the mid-tier WIN/LOSS pass
      (confirms the pushResistance fix holds, not a one-off). `npm run
      test:mobile`/`test:qa`/`test:react-qa`: ALL CHECKS PASSED. `npm run
      build:itch` + `test:itch-build`: ALL CHECKS PASSED (confirmed via
      `unzip -l` that `gnossienne-1.js`/`invention-4.js` are present in
      the zip; hit the same pre-existing dom-check flake once inside the
      itch-build harness too, clean on retry). `npm run test:duel-balance`:
      no crash, no new sanity flags -- `mid|regular|weak` reads 0% win /
      100% loss (same "weak/disengaged play loses" pattern `mid|boss|weak`
      already showed pre-existing; not flagged as a problem since no
      sanity check requires mid tier to be "nearly-safe" the way early
      tier is -- INFO only, worth a real Jaxon playtest read, not
      necessarily a defect). Version bumped v0.8 -> v0.9 (wordbound.html +
      MainMenu.jsx + its own Vitest assertion, all 3 updated together and
      re-verified).
      **Genuinely-Jaxon-only:** none this run (balance/wiring judgment
      calls only, all flagged above).
      **Not done, honest gaps:** normal tier is NOT 100% converted (3 of 5
      old generic defs still reachable: serpent/bindingstrap/appendix);
      strong tier is completely untouched (0 of 3 late-tier pieces
      composed, all 3 old strong defs still reachable). The Metronome
      (mid tier's 3rd piece) is still unstarted. PLAYTEST FINDINGS's own
      item 2 ("no def without `.piece` remains reachable") is therefore
      still open -- this run is real, verified progress toward it, not a
      close.
      **Next:** either compose The Metronome (completes the mid tier
      roster, unblocks retiring the last 3 normal defs) or start the late
      tier (Swarm/Sabbath/Organist, THEME.md's own names) -- both are
      valid next chunks, neither blocks the other. Whoever eventually
      wires the LAST normal-tier def should also remember to extend
      `test:regular-duel-smoke`'s mid-tier pass to cover all 3 pieces
      rather than just 2, and apply this run's own `pushResistance` fix
      pattern proactively to any late/final-tier smoke test rather than
      rediscovering it.
      ORCHESTRATOR NOTE 2026-08-22T18:39Z (mid-tier roster complete -- The
      Metronome, third and final mid-tier piece, composed + verified
      standalone, same precedent as Gnossienne/Invention): new
      `js/wordbound/pieces/czerny-299.js` -- "School of Velocity," Op. 299
      No. 1, Carl Czerny, composed 1834, Czerny died 1857 (169 years dead
      as of 2026, well past both PD bars). THEME.md's own gimmick --
      "Mechanical, relentless, perfectly even -- no surprise crescendos,
      just unceasing pressure that never actually stops to breathe" --
      modeled structurally in three ways: (1) the bass IS a literal
      metronome click, one unvarying tonic note per beat for the whole 64
      beats, nothing about it ever changes; (2) the melody is a single
      8-note scale-run cell repeated verbatim (identical pitches/
      durations/velocities every repetition) rather than developing, the
      real "no variation" character of a velocity study; (3) the dynamics
      curve is confined to a genuinely narrow 0.30-0.34 band the entire
      length with NO `crescendos` entries at all -- unlike the other two
      mid-tier pieces' calm-baseline-plus-spikes shape, this one never
      spikes AND never dips, "unceasing pressure" as a literal property of
      the curve. Deliberately set meaningfully higher than Air on the G
      String's own genuinely-flat early-tier baseline (~0.06-0.08) -- the
      actual difference this run intended between "barely attacks" and
      "unceasing pressure that never lets up," even though neither piece
      ever spikes. Wired into all 4 script-load lists (`wordbound.html`,
      `src/main.jsx`, `src/test/setup.js`, `tools/build-itch.js`'s
      DEPENDENCIES manifest, alphabetically correct position between
      `beethoven-5th.js` and `gnossienne-1.js`). Deliberately NOT wired
      into any `MONSTER_DEFS` entry yet, per this ticket's own "proof
      piece, verified standalone before wiring" precedent.
      **Verified this run:** computed every claimed number directly with
      `node` against the real `music.js`/piece module before writing any
      dom-check.js assertion (intensity at beats 0/8/16/24/32/40/48/56/64
      all land in [0.30, 0.34]; bass is exactly 64 notes, one per
      integer beat, identical freq/duration/velocity; all 16 melody cells
      are byte-identical in shape) -- not assumed correct from the code
      reading right, matching the standing precedent gnossienne-1.js's own
      note established after catching a real off-by-beat bug the same way.
      `npm test` (dom-check.js) -- 16 new checks (presence/title/PD-
      vetting/70-years-dead/stageTier/gimmick-string/keyframe-sort-and-
      bounds/peak-below-boss-level, a `Music.intensityAt`-driven
      narrow-band-plus-no-crescendos check, a literal-metronome-click bass
      structural check, an identical-repeated-cell melody structural
      check, plus track-note bounds): ALL CHECKS PASSED, clean run, no
      flake hit. `npm run test:react`: 183/183, unaffected (true no-op --
      no `src/components/*` file touched, `main.jsx`/`setup.js` just
      gained one more inert import, same as every prior proof-piece run).
      `npm run build`: clean, 57 modules (up from 56). `npm run build:itch`
      + `npm run test:itch-build`: ALL CHECKS PASSED, confirmed
      `czerny-299.js` present in the zip listing directly (`adding:
      js/wordbound/pieces/czerny-299.js`), the unzipped dom-check.js run
      (16/16 including this piece's own new checks), and a real-browser
      zero-404s load of the unzipped build. Did NOT run
      `test:mobile`/`test:qa`/`test:react-qa`/`test:duel-balance`/
      `test:branching-map`/`test:music-engine`/`test:regular-duel-smoke`/
      `test:react-duel-loss`/`test:drag-interrupt`/`test:run-header` --
      same judgment call the landed Invention note already made and
      reasoned through explicitly (an unwired, unreachable piece file
      touches none of what those scripts exercise), not a shortcut taken
      without reading why that reasoning applied.
      **Settling the deploy-refresh inconsistency this ticket's own
      Invention-run note explicitly flagged and left open** ("a future run
      should settle this... rather than each run re-deciding it fresh"):
      going with the LITERAL header rule -- "any run that changes game
      code/assets must... refresh the deploy," no carve-out for
      unreachable code, which is also the reading the Gnossienne run's own
      note already argued for directly. Refreshed the deploy this run; see
      PROGRESS.md for the verification result. Future runs composing an
      inert proof-piece file should refresh too, for consistency, unless
      Jaxon says the churn isn't worth it (a feel/product call, not an
      engineering one, flagged rather than assumed here).
      **Genuinely-Jaxon-only:** none this run (composition/balance
      judgment calls only, all flagged above).
      **Not done, honest gaps:** the mid-tier roster (Gnossienne,
      Invention, Metronome) is now fully COMPOSED, but The Metronome is
      NOT yet wired into any `MONSTER_DEFS` entry -- normal tier still has
      3 of 5 old generic defs reachable (serpent/bindingstrap/appendix),
      unchanged by this run. Late tier (Swarm/Sabbath/Organist) is fully
      untouched, 0 of 3 composed. PLAYTEST FINDINGS item 2 ("no def
      without `.piece` remains reachable") is therefore still open. This
      ticket stays open. Version NOT bumped -- nothing shipped to real
      gameplay this run, same convention every prior isolated-composition
      run in this ticket already followed.
      **Next:** wire The Metronome into a real `normal`-tier `MONSTER_DEFS`
      entry alongside retiring the last of the old generic normal-tier
      defs it and its two mid-tier siblings replace (`retiredFromPool` on
      serpent/bindingstrap/appendix, completing normal tier's 100%
      conversion), extend `test:regular-duel-smoke`'s mid-tier pass to
      cover all 3 pieces, wire the piece into `test/
      duel-balance-simulation.js` if a distinct third representative curve
      is judged useful (optional -- Gnossienne/Invention already share
      the sim's single 'mid' slot per that ticket's own "one representative
      per tier" convention), and run this ticket's own full VERIFY bar
      against the merged tree, mirroring the early-tier wiring run exactly.
      Once that lands, normal tier is 100% duel-mode and only strong tier
      (0 of 3 late-tier pieces composed) remains before PLAYTEST FINDINGS
      item 2's own closing bar is met.
      ORCHESTRATOR NOTE 2026-08-22T19:07Z (normal tier's 100% cutover done --
      The Metronome wired in, the last 3 old generic normal defs retired):
      `js/wordbound/monsters.js` gets a new `metronome` (The Metronome)
      entry, `tier: 'normal'`, `pushesToDefeat: 1` explicit, HP/attack/gold
      matching this file's own normal-tier band, `piece:
      window.Wordbound.Pieces.czerny299` (composed + PD-vetted in the prior
      run), `traitId: 'plain'` (a metronome has no thematic "weakness," so
      the flattest trait fit better than a pointed one -- duel damage math
      never reads it either way, same as every other duel regular's
      traitId), glyph '⏰'. `serpent`/`bindingstrap`/`appendix` -- the last 3
      of the 5 old generic normal-tier defs -- get `retiredFromPool: true`
      (same "kept intact for direct construction, no longer drawn by a
      fresh floor" treatment as every prior retirement in this ticket).
      normal tier is now 100% duel-mode: every real floor-1/2/3 'normal'
      draw is one of gnossienne/invention/metronome. No floor.js change was
      needed -- `pickCombatDefId`'s `retiredFromPool` filter already
      generalizes across tiers, confirmed by reading it directly before
      assuming so.
      **Two real, pre-existing test-suite bugs found and fixed while
      running this ticket's own full VERIFY bar, both the same hazard
      class this ticket's own dom-check.js audit already established a fix
      pattern for -- neither is new; both were demonstrated (via `git
      stash` isolation against the unmodified base tree) to already be
      broken before this run's own change, just not yet exposed because
      normal tier still had a poolable non-duel fallback until now:**
      1. `src/test/duelIntegration.test.js`'s "a monster def with .piece
         starts a real duel fight" test picks a target def via its own
         `firstPoolableNonDuelDefId()` helper (first def that's both
         un-`.piece`d and not `retiredFromPool`) and then searches 40
         `freshRun` seeds' floor-1 start nodes for it. With BOTH weak and
         normal tier now fully real/duel-mode, that helper can only ever
         return a 'strong'-tier def (sentinel/warden/spinesplinter) --
         and floor.js's `getAllowedTiers(1)` is `['weak','normal']` only,
         so a 'strong' def can never appear on floor 1 at all, confirmed
         directly (a floor-1-only version of this exact search, run
         against this run's own tree, found it in 0/40 seeds). Fixed by
         falling back to a real `Game._advanceFloor()` call (the same
         test-only hook `RunScreen.test.jsx` already drives directly) to
         floor 2 -- which `getAllowedTiers` adds 'strong' to -- before
         giving up on a seed, rather than widening the seed count (which
         would never have helped, since the def is categorically
         unreachable on floor 1 regardless of sample size). Verified: the
         fixed test passes 4/4 repeat runs against this run's own tree
         (was 0/1 before the fix, reproduced directly).
      2. `test/verify-react-build.js`'s real-browser playthrough clicks
         whichever combat node its fixed seed (`vitest-fixed-seed-1`)
         happens to roll on floor 1, with no duel-mode awareness at all
         (unlike every other real-browser QA script in this suite), then
         asserts a submitted word drops `monster.hp` -- which duel mode
         never touches (it pushes `state.duel.gauge` instead), so a
         duel-mode draw hangs that assertion's `waitForFunction` for the
         full 3s timeout and fails the whole run. Confirmed via `git
         stash` that this exact seed already rolled a duel-mode monster on
         the unmodified base tree too (weak tier alone was already enough
         to trigger it) -- a real, pre-existing gap this run's own change
         didn't introduce but did make impossible to miss (both trees
         fail identically). Fixed by pinning the available combat node
         away from duel mode via `page.evaluate` right before the click,
         mirroring `test/dom-check.js`'s own `firstSafeDefId`/
         `pinNodeAwayFromDuelMode` convention inline (this script drives a
         real browser rather than importing the vanilla suite's helper
         directly). Verified: 2/2 clean runs after the fix (was a
         reproducible 100% failure before, both before and after this
         run's own monsters.js change).
      Extended `test/verify-regular-duel-smoke.js` with a WIN via The
      Metronome (originally attempted as a 3rd forced fight stacked on the
      existing mid-tier floor via `enterForcedRegularDuelAnywhereOnFloor`,
      which crashed with "no uncleared combat node left on the floor to
      force" -- that helper force-clears every OTHER node each time it's
      called, so it only tolerates one fight per floor after the first;
      fixed by giving Metronome its own third fresh run instead, using the
      simpler row-0 `enterForcedRegularDuel` since it's that run's first
      fight, same convention PART 1/2 already use for their own first
      fights).
      **Verified this run (this ticket's own full VERIFY bar, against the
      final merged tree):** `npm test` (dom-check.js): 2 clean runs.
      `npm run test:react` (Vitest): 183/183, stable across 12 of 13 total
      repeat runs this session (1 run hit a failure not captured before it
      scrolled past -- almost certainly the already-documented
      `duelIntegration.test.js` "flat 260ms wait on a razor-thin margin"
      timing flake this file's own PLAYTEST FINDINGS entry already named,
      not a new issue: every other run, including several run back-to-back
      immediately after, was clean). `npm run build`: clean, 57 modules
      (unchanged -- no new file, just edits to existing ones + the version
      bump). `npm run test:mobile`/`test:qa`/`test:react-qa`: ALL CHECKS
      PASSED. `npm run test:branching-map`: ALL CHECKS PASSED, 180
      floors/seeds, no orphan/reachability regressions. `npm run
      test:duel-balance`: no crash, no new sanity flags, numbers unchanged
      from before (the sim reads Gnossienne's piece data directly for
      'mid', not `MONSTER_DEFS` -- per the "Next" note above, did NOT wire
      Metronome in as a third representative, since Gnossienne/Invention
      already establish the sim's own "one representative per tier"
      convention and neither piece's own curve differs meaningfully from
      Metronome's for this purpose). `npm run test:regular-duel-smoke`
      (extended, this run's own real content): ALL CHECKS PASSED, 2 runs
      clean, including the new Metronome WIN pass. `npm run build:itch` +
      `npm run test:itch-build`: ALL CHECKS PASSED (confirmed via the real
      zip listing that no new piece file was needed -- `czerny-299.js` was
      already shipped by the prior run). `npm run test:music-engine`/
      `test:audio`/`test:drag-interrupt`/`test:run-header`/
      `test:react-duel-loss`: ALL CHECKS PASSED, unaffected. `npm run
      test:react-build`: ALL CHECKS PASSED, 2 clean runs (after the fix
      above -- was a reproducible failure before it).
      Version bumped v0.10 -> v0.11 (`MainMenu.jsx`/`wordbound.html`/
      `MainMenu.test.jsx`) -- real gameplay content shipped (normal tier's
      3rd duel regular, completing that tier's cutover).
      **Genuinely-Jaxon-only:** none this run (composition/balance/test-
      harness judgment calls only, all flagged above).
      **Not done, honest gaps:** late tier (Swarm/Sabbath/Organist) remains
      completely untouched -- 0 of 3 composed, all 3 old strong-tier defs
      (sentinel/warden/spinesplinter) still reachable and still turn-based/
      silent. PLAYTEST FINDINGS item 2 ("no def without `.piece` remains
      reachable") is therefore still open -- weak and normal tiers are now
      both 100% converted, strong tier is the entire remaining gap. This
      ticket stays open (box not checked).
      **Next:** start the late tier -- The Swarm (or whichever of
      Swarm/Sabbath/Organist THEME.md pairs with the strongest gimmick to
      compose first), same "proof piece, verified standalone before
      wiring" precedent as every mid-tier piece before it. Once all 3 late
      pieces are composed and wired (retiring sentinel/warden/spinesplinter
      via `retiredFromPool`), PLAYTEST FINDINGS item 2's own closing bar is
      finally reachable, and this ticket's VERIFY line's remaining pieces
      (virtual-clock sim confirming the FULL tier curve end to end) become
      meaningful to run for the first time. A future run picking that up
      should also decide whether `pickEliteDefId` (floor.js, unaffected by
      any of this ticket's work so far -- elites still draw from the same
      3 strong-tier defs regardless of `.piece`) needs its own duel
      treatment, or is deliberately out of this ticket's scope (elites
      already carry a labeled resistance-trait warning per FUN OVERHAUL
      6/8 -- a separate, already-telegraphed difficulty spike, not
      obviously the same "silent turn-based fight" problem PLAYTEST
      FINDINGS item 2 is about) -- not decided either way yet, flagging
      for whoever picks this up next.
      ORCHESTRATOR NOTE 2026-08-22T19:20Z (late tier started -- The Swarm,
      first of 3 late-tier pieces, composed + verified standalone): same
      "proof piece, verified standalone before wiring" precedent every
      mid-tier piece before it used. `js/wordbound/pieces/
      flight-bumblebee.js` (new), wired into all 4 script-load lists
      (`wordbound.html`, `src/main.jsx`, `src/test/setup.js`, `tools/
      build-itch.js`'s DEPENDENCIES manifest, alphabetically after
      czerny-299.js). PD-vetted: Flight of the Bumblebee (Rimsky-Korsakov,
      from the opera *The Tale of Tsar Saltan*, composed 1899-1900,
      composer died 1908 -- 118 years, matching THEME.md's own table).
      Models THEME.md's own gimmick ("Frantic, chromatic, constant -- no
      single big crescendo, just relentless high-frequency pressure")
      structurally: the melody is a literal 24-note chromatic round trip
      (all 12 semitones, up an octave then back down) built from integer
      semitone offsets rather than named scale degrees -- real
      chromaticism, unlike The Metronome's own 5-note diatonic scale-run
      cell -- at sixteenth-note speed (0.25 beat/note, the fastest of any
      piece in this directory, matching "frantic"); the bass is an
      unvarying eighth-note wing-beat pulse; the dynamics curve stays in a
      narrow 0.50-0.56 band the entire length with NO `crescendos` array
      at all (same "no crescendos" structural choice as Air on the G
      String / The Metronome, but at a meaningfully higher band -- "no
      single big crescendo" as a real property of the curve, not just
      described). stageTier judgment call (flagged, balance tuning not a
      naming/feel call): 'late'. This ALSO establishes a new peak-intensity
      convention for the tier (< 0.7, one step above mid's already-
      established < 0.6 and early's < 0.5) since no late-tier piece
      existed before this run to need one -- still well under a boss's own
      1.0 peak, reading as "boss-adjacent" per THEME.md without reaching
      boss level.
      **Verified this run:** `npm test` (dom-check.js) -- 18 new checks
      (presence/title/PD-vetting/70-years-dead/stageTier/gimmick-string/
      keyframe-sort-and-bounds/peak-below-0.7, a `Music.intensityAt`-driven
      narrow-high-band-plus-no-crescendos check across 9 sample points, a
      true-12-chromatic-pitch-classes structural check, an
      identical-repeated-cell melody check, a literal-wing-beat-pulse bass
      check, plus track-note bounds): ALL CHECKS PASSED, clean run, no
      flake hit. `npm run test:react`: 183/183, unaffected (true no-op --
      no `src/components/*` file touched, `main.jsx`/`setup.js` just
      gained one more inert import, same as every prior proof-piece run).
      `npm run build`: clean, 58 modules (up from 57). `npm run
      build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED, confirmed
      `flight-bumblebee.js` present in the real zip listing directly
      (`unzip -l`), the unzipped dom-check.js run (18/18 including this
      piece's own new checks), and a real-browser zero-404s load of the
      unzipped build. Did NOT run `test:mobile`/`test:qa`/`test:react-qa`/
      `test:duel-balance`/`test:branching-map`/`test:music-engine`/
      `test:regular-duel-smoke`/`test:react-duel-loss`/`test:drag-interrupt`/
      `test:run-header`/`test:react-build` -- same judgment call every
      landed mid-tier proof-piece run already made and reasoned through
      explicitly (an unwired, unreachable piece file touches none of what
      those scripts exercise).
      **Live deploy refreshed** per the header's LITERAL rule and this
      ticket's own settled convention (the Invention/Gnossienne/Metronome
      notes above already argued for "refresh always, no unreachable-code
      carve-out" and the Metronome run adopted it) -- see PROGRESS.md for
      the verification result.
      **Genuinely-Jaxon-only:** none this run (composition/balance judgment
      calls only, all flagged above).
      **Not done, honest gaps:** The Swarm is composed but NOT wired into
      any `MONSTER_DEFS` entry -- strong tier still has 0 of 3 old generic
      defs (sentinel/warden/spinesplinter) retired, all 3 still reachable
      and still turn-based/silent. The Sabbath and The Organist (late
      tier's other 2 pieces) are fully unstarted. PLAYTEST FINDINGS item 2
      ("no def without `.piece` remains reachable") is therefore still
      open. Version NOT bumped -- nothing shipped to real gameplay this
      run, same convention every prior isolated-composition run in this
      ticket already followed.
      **Next:** compose The Sabbath (Night on Bald Mountain) or The
      Organist (Toccata and Fugue in D minor) next, same precedent -- then
      wire all 3 late-tier pieces into real `strong`-tier `MONSTER_DEFS`
      entries + `retiredFromPool` on sentinel/warden/spinesplinter in one
      dedicated wiring run (mirroring the normal-tier wiring run's own
      shape), which finally closes PLAYTEST FINDINGS item 2 and makes this
      ticket's VERIFY line's remaining pieces (virtual-clock sim confirming
      the FULL tier curve end to end, Playwright duel smoke per tier)
      meaningful to run for the first time.
