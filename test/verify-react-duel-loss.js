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
const PORT = 9884;
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
  await page.click('button:has-text("Deck")');
  await page.waitForSelector('.treasure-panel:has-text("Your Deck")');
  await page.click('button:has-text("Close")');
  await page.waitForSelector('.node-map');
}

async function main() {
  console.log('Building the Vite/React app fresh...');
  execFileSync('npx', ['vite', 'build'], { cwd: ROOT, stdio: 'inherit' });
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

    const initialBlocks = await page.evaluate(() => window.Wordbound.Game._state.duel.healthBlocks);
    check(`fight starts with the full Verse count (${initialBlocks})`, initialBlocks === await page.evaluate(() => window.Wordbound.Game._state.duel.maxHealthBlocks));
    check('The Volume gauge is visible and live', await page.isVisible('.volume-gauge'));
    check('no Verse is lost yet', (await page.locator('.verse-pip-lost').count()) === 0);

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
