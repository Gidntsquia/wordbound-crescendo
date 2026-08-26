#!/usr/bin/env node
// test/verify-react-duel-loss.js
//
// GOALS.md DUEL-GAUGE COMBAT ticket -- the ticket's own VERIFY line asks for
// "Playwright real-browser full duel win AND loss with zero console errors."
// The boss-def cutover run (2026-08-22) landed a real duel WIN check
// (test:react-qa's killBossViaRealWord), but flagged the LOSS half of that
// bar as genuinely new, unclosed scope. This script closes it, against a
// real `vite build` output statically served (same bar as every other
// test:react-* script, never the dev server).
//
// Two phases, both against the SAME live duel (the floor-1 Mountain King
// boss fight, real .piece auto-detection via startCombat):
//   1. A NON-FATAL block loss: forces the gauge to the edge of the
//      player-damaging end via setup (same "force determinism via setup,
//      let the real engine resolve the actual transition" convention
//      verify-react-qa-boss-reward.js's killBossViaRealWord already
//      established for wins) and lets the real per-frame tick loop
//      (CombatScreen.jsx's own rAF effect, calling the real Game.tickDuel)
//      cross it for real -- proving a Verse is lost, the gauge recenters,
//      and the i-frame grace window is visibly active (VolumeGauge's own
//      `.volume-gauge-iframe`/"Grace period" UI, built and unit-tested by
//      an earlier run but never before observed live). Then waits out the
//      real i-frame duration and confirms the grace state clears on its
//      own -- proving i-frames are a temporary window, not a permanent
//      state change.
//   1.5. SECOND WIND: grants the item (setup -- no shop/treasure UI to pick
//      one up for real yet), forces the same fatal setup as phase 2 below,
//      and confirms the real tick loop's block loss is revived back to 1
//      Verse instead of ending the run -- items.js's onDuelBlockLost hook,
//      GOALS.md's own flagged retarget gap. The item is stripped afterward
//      so phase 2 still proves the real, un-saved death path.
//   2. A FATAL defeat: forces healthBlocks to 1 (setup) and repeats the
//      same gauge-to-the-edge trick -- the real tick loop's block loss
//      empties healthBlocks, which the real Duel.on('player-defeated')
//      handler (js/wordbound/game.js's Game.startDuelFight) turns into a
//      real endRun(false), swapping the whole screen to GAME_OVER. No word
//      is ever typed or clicked in this script -- losing a duel push has no
//      discrete player action to trigger via UI (unlike winning, which
//      needs a real submitted word); the gauge crossing GAUGE_MIN via the
//      real continuous music-push tick IS the real mechanism under test.
//
// Run with `npm run test:react-duel-loss` (or `node test/verify-react-duel-loss.js`).

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');
const { chromium } = require('@playwright/test');

const ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist', 'app');
// Port is overridable so tools/run-gates.js can run the gates in PARALLEL
// without two of them fighting over the same one -- several of these files
// were written with the same hard-coded default.
const PORT = Number(process.env.WB_PORT) || 9884;
const SEED = 'vitest-fixed-seed-1'; // same known-good seed the rest of the React suite relies on
const CHARACTER_NAME = 'The Archivist';

const MIME_TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

let failures = 0;
function check(label, cond) {
  if (cond) {
    console.log('OK   ' + label);
  } else {
    console.log('FAIL ' + label);
    failures++;
  }
}

function startServer(rootDir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      const filePath = path.join(rootDir, urlPath === '/' ? 'index.html' : urlPath);
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(PORT, () => resolve(server));
  });
}

// Setup-only (not an interaction under test): jump the run's map position to
// the current floor's boss node -- same technique/comment as
// verify-react-qa-boss-reward.js's jumpToBossNode, duplicated here rather
// than shared since every test/verify-*.js script in this repo is its own
// standalone entry point (no cross-script require convention exists).
async function jumpToBossNode(page) {
  await page.evaluate(() => {
    const s = window.Wordbound.Game._state;
    const floor = s.floor;
    const lastRowNode = floor.nodes.find((n) => n.row === floor.rows - 1);
    floor.nodes.forEach((n) => { if (n.type !== 'boss') n.cleared = true; });
    s.mapPositionNodeId = lastRowNode.id;
    s.currentNodeId = null;
  });
  // PLAYTEST FINDINGS 3 item 2 (GOALS.md, 2026-08-22): this used to open and
  // close the run-header's Deck button, whose act() call re-rendered the
  // tree as a side effect. That button is gone with the deck view, so this
  // now uses Game._render() -- which RunScreen registers its own bump with
  // while mounted, so the one hook repaints whichever tree is live. (The
  // corner settings gear is NOT a substitute, confirmed the hard way: its
  // open state lives inside SettingsCorner, so toggling it re-renders that
  // component alone and leaves the node map stale.)
  await page.evaluate(() => window.Wordbound.Game._render());
  await page.waitForSelector('.node-map');
}

async function main() {
  console.log('Building the Vite/React app fresh...');
  // tools/run-gates.js builds ONCE and hands every gate the same dist/, so
  // six gates no longer run six identical `vite build`s. Running this file
  // on its own still builds -- WB_SKIP_BUILD is only set by the runner.
  if (!process.env.WB_SKIP_BUILD) {
    execFileSync('npx', ['vite', 'build'], { cwd: ROOT, stdio: 'inherit' });
  }
  check('dist/app/index.html exists after build', fs.existsSync(path.join(DIST_DIR, 'index.html')));

  const server = await startServer(DIST_DIR);
  let browser;
  try {
    const sandboxChromiumPath = '/opt/pw-browsers/chromium';
    const launchOpts = { headless: true };
    if (fs.existsSync(sandboxChromiumPath)) launchOpts.executablePath = sandboxChromiumPath;
    browser = await chromium.launch(launchOpts);
    const page = await browser.newPage();

    const consoleErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push(String(err)));
    const failedRequests = [];
    page.on('requestfailed', (req) => failedRequests.push(req.url() + ' (' + (req.failure() || {}).errorText + ')'));
    page.on('response', (res) => { if (res.status() >= 400) failedRequests.push(res.url() + ' -> ' + res.status()); });

    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.Wordbound?.Game, { timeout: 15000 });

    // ---- Reach the boss fight ----
    await page.click('button:has-text("New Run")');
    await page.waitForSelector('#screen-character-select');
    await page.fill('#run-seed-input', SEED);
    await page.click(`.character-option:has-text("${CHARACTER_NAME}")`);
    await page.waitForSelector('.node-map');
    await jumpToBossNode(page);
    await page.click('.node-pill.node-boss.node-current');
    check('boss fight starts in duel mode (real .piece auto-detection)', await page.evaluate(() => window.Wordbound.Game._state.monster.duel === true));

    let initialBlocks = await page.evaluate(() => window.Wordbound.Game._state.duel.healthBlocks);
    check(`fight starts with the full Verse count (${initialBlocks})`, initialBlocks === await page.evaluate(() => window.Wordbound.Game._state.duel.maxHealthBlocks));
    check('The Volume gauge is visible and live', await page.isVisible('.volume-gauge'));
    check('no Verse is lost yet', (await page.locator('.verse-pip-lost').count()) === 0);
    check('no crescendo warning yet (early in the piece)', !(await page.isVisible('.volume-crescendo-warning')));

    // ---- Largo accessibility assist: a real click slows the live duel ----
    // DUEL-GAUGE COMBAT ticket, header Accessibility bullet. PLAYTEST
    // FINDINGS 3 items 3+4 moved the control (relabeled "Slower music
    // (easier)") + mute/volume out of the run header into a corner settings
    // popover (RunSidePanels.jsx's SettingsCorner) -- opened once here via a
    // real click and left open for the rest of this phase's clicks, since
    // the popover stays mounted/open across re-renders until toggled shut.
    // It must still affect an ALREADY-RUNNING duel's sequencer live
    // (Game.setLargoEnabled's whole point) -- proven here via a real click,
    // not a direct Game.setLargoEnabled() call, so the actual wired-up
    // button is what's under test.
    await page.click('.settings-corner-btn');
    check('the settings popover opens on a real click', await page.isVisible('.settings-panel'));
    const tempoBeforeLargo = await page.evaluate(() => window.Wordbound.Game._state.duelSequencer.getTempoScale());
    check(`Largo starts off (tempo scale ${tempoBeforeLargo})`, tempoBeforeLargo === 1);
    await page.click('.largo-toggle-btn');
    check('the Largo button shows its "On" state after a real click', await page.isVisible('.largo-toggle-btn.largo-toggle-btn-on'));
    const tempoAfterLargo = await page.evaluate(() => window.Wordbound.Game._state.duelSequencer.getTempoScale());
    check(`Largo slows the LIVE duel's sequencer for real (tempo scale ${tempoBeforeLargo} -> ${tempoAfterLargo})`, tempoAfterLargo < 1 && tempoAfterLargo > 0);
    await page.click('.largo-toggle-btn'); // toggle back off so the phases below run at the normal pace they were written against
    check('a second real click restores normal tempo', (await page.evaluate(() => window.Wordbound.Game._state.duelSequencer.getTempoScale())) === 1);
    check('the Largo button shows its "Off" state again', !(await page.isVisible('.largo-toggle-btn.largo-toggle-btn-on')));

    // ---- RITARDANDO (ITEMS ticket): the item's own tempo-scale hook, live on the SAME real sequencer ----
    // No shop/treasure UI offers a specific item yet (same "grant via
    // page.evaluate" convention Phase 1.5 below uses for Second Wind) --
    // this proves Game.startDuelFight's computeDuelTempoScale actually reads
    // Items.getTempoScale for a REAL running sequencer, not just that the
    // pure helper functions multiply correctly (already unit-tested in
    // dom-check). Toggling Largo back on WHILE Ritardando is owned also
    // proves the two combine multiplicatively (0.6 * 0.75 = 0.45), the one
    // behavior no jsdom test can touch (Game.setLargoEnabled's own
    // mid-duel live-sequencer branch).
    await page.evaluate(() => { window.Wordbound.Game._state.player.items = ['ritardando']; });
    // Ritardando only applies at fight START (computeDuelTempoScale is read
    // once in Game.startDuelFight) -- re-enter the same boss fight for real
    // rather than expecting the already-running sequencer to pick it up
    // retroactively, which would be testing a behavior this item was never
    // built to have.
    await page.evaluate(() => {
      const s = window.Wordbound.Game._state;
      s.combatActive = false;
      s.duelSequencer.stop();
    });
    await jumpToBossNode(page);
    await page.click('.node-pill.node-boss.node-current');
    const tempoWithRitardando = await page.evaluate(() => window.Wordbound.Game._state.duelSequencer.getTempoScale());
    check(`Ritardando slows a freshly-started real duel's sequencer (tempo scale ${tempoWithRitardando})`, Math.abs(tempoWithRitardando - 0.75) < 1e-9);
    await page.click('.largo-toggle-btn');
    const tempoWithBoth = await page.evaluate(() => window.Wordbound.Game._state.duelSequencer.getTempoScale());
    check(`Ritardando + Largo combine multiplicatively on the live sequencer (${tempoWithRitardando} * Largo -> ${tempoWithBoth})`, Math.abs(tempoWithBoth - 0.45) < 1e-9);
    await page.click('.largo-toggle-btn'); // back off
    await page.evaluate(() => { window.Wordbound.Game._state.player.items = []; }); // strip the item so the phases below run at the normal pace they were written against
    // Re-enter the fight once more, now item-free, so its sequencer starts
    // at tempoScale 1 like every phase below assumes.
    await page.evaluate(() => {
      const s = window.Wordbound.Game._state;
      s.combatActive = false;
      s.duelSequencer.stop();
    });
    await jumpToBossNode(page);
    await page.click('.node-pill.node-boss.node-current');
    check('tempo is back to normal for the remaining phases', (await page.evaluate(() => window.Wordbound.Game._state.duelSequencer.getTempoScale())) === 1);

    // ---- SORDINO / FERMATA / RUBATO (ITEMS ticket, AMENDED batch): the 3
    // duel-gauge-space statMod items, live on a REAL Duel instance ----
    // Same reasoning as the Ritardando section above: dom-check already
    // unit-tests Items.getDuelPushResistance/getDuelIframeBonus/
    // getDuelParryWindowBonus in isolation, but only a real
    // Game.startDuelFight call proves those getters are actually READ when
    // building a real Duel.create() -- these opts only apply at fight start
    // (same "read once, fight-start" timing as Ritardando/Largo), so grant
    // all 3, re-enter the same boss fight for real, and read the values
    // straight off the live duel object (duel.js stores each opt as a
    // same-named field -- see that file's own Duel.create).
    await page.evaluate(() => { window.Wordbound.Game._state.player.items = ['sordino', 'fermata', 'rubato']; });
    await page.evaluate(() => {
      const s = window.Wordbound.Game._state;
      s.combatActive = false;
      s.duelSequencer.stop();
    });
    await jumpToBossNode(page);
    await page.click('.node-pill.node-boss.node-current');
    const duelResistance = await page.evaluate(() => window.Wordbound.Game._state.duel.pushResistance);
    const duelIframeBonus = await page.evaluate(() => window.Wordbound.Game._state.duel.iframeBonusSec);
    const duelParryBonus = await page.evaluate(() => window.Wordbound.Game._state.duel.parryWindowBonusSec);
    check(`Sordino's push-resistance reaches a freshly-started real Duel instance (${duelResistance})`, Math.abs(duelResistance - 0.2) < 1e-9);
    check(`Fermata's i-frame bonus reaches a freshly-started real Duel instance (${duelIframeBonus})`, Math.abs(duelIframeBonus - 1.5) < 1e-9);
    check(`Rubato's parry-window bonus reaches a freshly-started real Duel instance (${duelParryBonus})`, Math.abs(duelParryBonus - 0.1) < 1e-9);
    await page.evaluate(() => { window.Wordbound.Game._state.player.items = []; }); // strip the items so the phases below run against the plain-Duel numbers they were written against
    await page.evaluate(() => {
      const s = window.Wordbound.Game._state;
      s.combatActive = false;
      s.duelSequencer.stop();
    });
    await jumpToBossNode(page);
    await page.click('.node-pill.node-boss.node-current');
    check('duel modifiers are back to zero for the remaining phases', await page.evaluate(() => {
      const d = window.Wordbound.Game._state.duel;
      return d.pushResistance === 0 && d.iframeBonusSec === 0 && d.parryWindowBonusSec === 0;
    }));

    // ---- Phase 0: the crescendo-approaching countdown, real sequencer + real wall-clock ----
    // Mountain King's own crescendo peaks at beat 71 (js/wordbound/pieces/
    // mountain-king.js); waiting through the piece's early bars naturally
    // would take ~30s of real time to reach it, so this fast-forwards the
    // sequencer's own anchor (seq.anchorBeat/anchorTime are public
    // properties on the sequencer object music.js returns, not private
    // closure state) to just before the approach beat (67 = peakBeat 71
    // minus the default crescendoLeadBeats=4) -- then lets the REAL
    // sequencer's own still-running setInterval tick loop discover and emit
    // 'crescendo-approaching' on its own schedule. Nothing here calls
    // _tick()/emits the event directly, same "force determinism via setup,
    // let the real engine resolve the rest" convention phase 1 below uses
    // for the gauge.
    await page.evaluate(() => {
      const state = window.Wordbound.Game._state;
      const seq = state.duelSequencer;
      seq.anchorBeat = 63;
      seq.anchorTime = window.Wordbound.Game.getDuelClockNow();
      // Also skip lastScheduledBeat forward so the next _tick() doesn't
      // treat beats 0-63 as newly "in range" and burst-schedule/replay
      // every already-passed note in one go -- this phase is testing the
      // crescendo-approaching event, not note playback.
      seq.lastScheduledBeat = 63;
    });
    await page.waitForFunction(
      () => window.Wordbound.Game.getApproachingCrescendoSecondsAway(window.Wordbound.Game.getDuelClockNow()) != null,
      { timeout: 5000 },
    );
    check('the crescendo-approaching countdown goes live from a real sequencer event', true);
    check('VolumeGauge shows the live "Crescendo in..." warning banner', await page.isVisible('.volume-crescendo-warning'));

    const secondsAway1 = await page.evaluate(() =>
      window.Wordbound.Game.getApproachingCrescendoSecondsAway(window.Wordbound.Game.getDuelClockNow()));
    await page.waitForTimeout(500);
    const secondsAway2 = await page.evaluate(() =>
      window.Wordbound.Game.getApproachingCrescendoSecondsAway(window.Wordbound.Game.getDuelClockNow()));
    check(
      `the countdown decreases over real wall-clock time (${secondsAway1.toFixed(2)}s -> ${secondsAway2.toFixed(2)}s)`,
      secondsAway2 < secondsAway1,
    );

    // Let the real tick loop carry playback across peakBeat=71 for real (a
    // couple more real seconds at this tempo) -- confirms the warning
    // clears itself once the real crescendo-peak event actually fires, not
    // just via the getter's own defensive "already past, treat as null"
    // guard for a dropped frame.
    await page.waitForFunction(() => !document.querySelector('.volume-crescendo-warning'), { timeout: 8000 });
    check('the warning banner clears once the real crescendo-peak event fires', !(await page.isVisible('.volume-crescendo-warning')));

    // Mountain King's real intensity curve is high in the beat-63..71 range
    // this phase fast-forwarded through (0.85-1.0, see the piece's own
    // dynamics.keyframes), so the real tick loop, still running the whole
    // time, may well have pushed the gauge into a real Verse loss (with a
    // real i-frame grace window) as a side effect of proving the countdown
    // -- a genuine, correctly-resolved engine outcome, not a bug, but one
    // that would silently corrupt phase 1/2's own "first loss" assumptions
    // below if left as-is. Reset to a clean baseline (healthBlocks/gauge/
    // iframeUntil are all public Duel instance properties, same "force
    // determinism via setup" convention as everywhere else in this file) so
    // phases 0 and 1/2 stay fully decoupled, then re-capture initialBlocks
    // fresh for phase 1 to compare against.
    await page.evaluate(() => {
      const duel = window.Wordbound.Game._state.duel;
      duel.healthBlocks = duel.maxHealthBlocks;
      duel.gauge = window.Wordbound.Duel.GAUGE_CENTER;
      duel.iframeUntil = -Infinity;
    });
    initialBlocks = await page.evaluate(() => window.Wordbound.Game._state.duel.healthBlocks);
    check(`Verse count reset to full after the countdown check (${initialBlocks})`, initialBlocks === await page.evaluate(() => window.Wordbound.Game._state.duel.maxHealthBlocks));

    // ---- Phase 1: a real, NON-FATAL block loss via the real tick loop ----
    // Setup-only mutation (same convention killBossViaRealWord uses for
    // wins): push the gauge to the very edge of the player-damaging end.
    // The real per-frame Game.tickDuel loop (CombatScreen.jsx's own rAF
    // effect, already running since the fight started) does the actual
    // crossing -- nothing here calls loseBlock/tick directly.
    await page.evaluate(() => {
      const state = window.Wordbound.Game._state;
      state.duel.gauge = window.Wordbound.Duel.GAUGE_MIN + 2;
    });
    await page.waitForFunction(
      (before) => window.Wordbound.Game._state.duel.healthBlocks < before,
      initialBlocks,
      { timeout: 5000 },
    );
    const afterFirstLoss = await page.evaluate(() => window.Wordbound.Game._state.duel.healthBlocks);
    check(`a real tick-loop push crossing GAUGE_MIN costs exactly one Verse (${initialBlocks} -> ${afterFirstLoss})`, afterFirstLoss === initialBlocks - 1);

    const gaugeAfterLoss = await page.evaluate(() => window.Wordbound.Game._state.duel.gauge);
    check(`the gauge recenters on a block loss (${gaugeAfterLoss})`, Math.abs(gaugeAfterLoss - 50) < 1);

    check('the lost Verse renders as a real .verse-pip-lost', (await page.locator('.verse-pip-lost').count()) === 1);
    check('the i-frame grace track class is applied', await page.locator('.volume-gauge-track.volume-gauge-iframe').count() === 1);
    check('the grace-period banner is visible', await page.isVisible('.volume-gauge-grace:has-text("Grace period")'));
    check('combat is still active (a non-fatal loss does not end the fight)', await page.evaluate(() => window.Wordbound.Game._state.combatActive === true));

    // ---- Confirm the grace window is temporary, not permanent ----
    const iframeSec = await page.evaluate(() => window.Wordbound.Duel.IFRAME_DURATION_SEC);
    await page.waitForFunction(() => !document.querySelector('.volume-gauge-grace'), { timeout: (iframeSec + 2) * 1000 });
    check(`the grace banner clears on its own once i-frames elapse (~${iframeSec}s)`, !(await page.isVisible('.volume-gauge-grace')));
    check('the i-frame track class clears too', (await page.locator('.volume-gauge-track.volume-gauge-iframe').count()) === 0);

    // ---- Phase 1.5: Second Wind saves a real fatal block loss ----
    // GOALS.md's own flagged gap (DUEL-GAUGE COMBAT ticket): Second Wind's
    // onDuelBlockLost hook (js/wordbound/items.js) revives a would-be-fatal
    // loss back to 1 health block via duel.js's own 'block-lost' event,
    // BEFORE Game.startDuelFight's 'player-defeated' handler's post-emit
    // check runs -- proven here against the REAL per-frame tick loop (no
    // direct duel.tick()/loseBlock() call), same "force determinism via
    // setup, let the real engine resolve the transition" convention phase 1
    // above used. Granting the item via page.evaluate (player.items is a
    // plain array, no shop/treasure UI exists yet to pick one up for real)
    // is setup, same category as forcing healthBlocks/gauge below it.
    await page.evaluate(() => {
      const state = window.Wordbound.Game._state;
      state.player.items = ['second_wind'];
      state.duel.healthBlocks = 1;
      state.duel.gauge = window.Wordbound.Duel.GAUGE_MIN + 2;
    });
    await page.waitForFunction(
      () => window.Wordbound.Game._state.player.usedSecondWind === true,
      { timeout: 5000 },
    );
    check('Second Wind revives a real fatal block loss back to 1 Verse', await page.evaluate(() => window.Wordbound.Game._state.duel.healthBlocks === 1));
    check('the duel is not terminal -- the fight survives', await page.evaluate(() => window.Wordbound.Game._state.duel.isTerminal() === false));
    check('combat is still active after the save', await page.evaluate(() => window.Wordbound.Game._state.combatActive === true));
    check('the screen never reaches GAME_OVER', await page.evaluate(() => window.Wordbound.Game._state.screen !== 'GAME_OVER'));

    // Wait out this save's own i-frame window, then strip the item so phase
    // 2 below exercises the real, un-saved death path it was already
    // written against (a fresh Duel instance is not created between phases
    // in this script, so leaving Second Wind equipped would silently change
    // what phase 2 proves).
    await page.waitForFunction(() => !document.querySelector('.volume-gauge-grace'), { timeout: (iframeSec + 2) * 1000 });
    await page.evaluate(() => { window.Wordbound.Game._state.player.items = []; });

    // ---- Phase 2: a real FATAL defeat -> GAME_OVER ----
    // Setup-only: force the LAST Verse (same "force determinism via setup"
    // convention as phase 1 and killBossViaRealWord) so the next real
    // tick-loop block loss is the fatal one -- proving the FULL
    // player-defeated -> endRun(false) -> GAME_OVER chain, not just the
    // isolated duel.js unit-tested math.
    await page.evaluate(() => {
      const state = window.Wordbound.Game._state;
      state.duel.healthBlocks = 1;
      state.duel.gauge = window.Wordbound.Duel.GAUGE_MIN + 2;
    });
    await page.waitForFunction(() => window.Wordbound.Game._state.screen === 'GAME_OVER', { timeout: 5000 });
    check('a Verse loss at healthBlocks=1 ends the run for real', await page.evaluate(() => window.Wordbound.Game._state.screen === 'GAME_OVER'));
    check('the real GAME_OVER screen renders ("The Well Ran Dry")', await page.isVisible('h1:has-text("The Well Ran Dry")'));
    check('combatActive is cleared on defeat', await page.evaluate(() => window.Wordbound.Game._state.combatActive === false));
    check('the run map/combat panel is gone (GAME_OVER swaps the whole screen, per RunScreen.jsx)', !(await page.isVisible('.volume-gauge')));

    // ---- Errors across the whole run ----
    check('zero failed requests / 404s across the whole run', failedRequests.length === 0);
    failedRequests.forEach((f) => console.log('  BAD REQUEST:', f));
    check('zero console/page errors across the whole run', consoleErrors.length === 0);
    consoleErrors.forEach((e) => console.log('  CONSOLE ERROR:', e));
  } finally {
    if (browser) await browser.close();
    server.close();
  }

  console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'));
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('SCRIPT CRASHED:', e);
  process.exit(1);
});
