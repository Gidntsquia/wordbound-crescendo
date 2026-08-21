#!/usr/bin/env node
// test/verify-react-qa-boss-reward.js
//
// GOALS.md STRUCTURAL ticket, remaining scope (a): `test:qa`
// (test/orchestrator-qa-boss-reward.js) drives wordbound.html's boss-kill ->
// tile-reward -> boss-item-reward flow with real Playwright clicks; nothing
// exercised that flow against the React/Vite app. This is that equivalent,
// against a real `vite build` output statically served (same bar as
// verify-react-build.js, never the dev server).
//
// Deliberately narrower than test:qa's own script: this repo already has
// TWO real-word-combat checks (verify-react-build.js's full UI playthrough,
// and src/components/__tests__/CombatScreen.test.jsx's RTL coverage), so
// this script does not re-prove "playing a real word drops real HP" -- it
// targets the one genuinely uncovered surface, the reward-panel SEQUENCING
// after a boss kill, via real UI clicks throughout:
//   1. boss kill -> tile-reward panel (real click pick) -> boss-item-reward
//      panel (rare/legendary only) -> real click claim -> item chip appears,
//      floor advances, panels never stacked.
//   2. Skip path (tile-reward Skip -> straight to boss-item-reward -> Skip)
//      at a 375px mobile viewport, with an overflow/tap-target check on the
//      boss-reward panel -- the first mobile-layout check of the React
//      reward-panel family (RewardScreens.jsx's `.treasure-panel` shape has
//      never been checked at a mobile width before).
//   3. Zero console/page errors and zero failed requests throughout.
//
// React re-render gotcha (GOALS.md STRUCTURAL update 2's own flagged trap):
// jumping the run's map position to a boss node goes through
// `window.Wordbound.Game._state` directly (setup, not an interaction under
// test -- same convention orchestrator-qa-boss-reward.js itself documents),
// but that mutation alone does NOT re-render the React tree -- RunScreen.jsx
// only re-renders when its own `act()` wrapper runs, and that wrapper is a
// local closure, unreachable from page.evaluate. Calling
// `Game.openDeckViewer()`/`closeDeckViewer()` directly (the trick the
// vanilla script uses to force a re-render) would silently no-op here for
// the same reason. So instead, this script forces every post-mutation
// re-render with a REAL UI click on the run-header's "Deck" button (open)
// then "Close" (close) -- both real, on-screen, actionability-checked
// clicks that route through RunScreen's real `act()`/bump cycle, landing
// the map jump into a genuine re-rendered DOM rather than a stale one.
//
// Similarly, killing a boss via a real full duel isn't this script's job
// (that's DUEL-GAUGE COMBAT's future territory, and today's engine has no
// multi-turn pressure to begin with) -- monster.hp is set to 1 as setup
// (identical convention to src/test/gameHelpers.js's own
// `defeatCurrentMonster` helper, already relied on by the Vitest suite),
// and the actual killing blow is a real word typed and submitted through
// the real Play Word button, same as every other script in this repo.
//
// Run with `npm run test:react-qa` (or `node test/verify-react-qa-boss-reward.js`).

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');
const { chromium } = require('@playwright/test');

const ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist', 'app');
const PORT = 9883;
const SEED = 'vitest-fixed-seed-1'; // same known-good seed the rest of the React suite relies on
const CHARACTER_NAME = 'The Archivist';
const WORD_CANDIDATES = ['RADIO', 'ROAD', 'RAID', 'READ', 'RAIN', 'AIDE', 'DINE', 'RIDE', 'RIOT', 'TRIO', 'TIRE', 'RITE'];

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
// the current floor's boss node, exactly as orchestrator-qa-boss-reward.js
// does for wordbound.html -- every non-boss node in the floor's last
// encounter row leads straight to the boss (Floor.generateBranchingFloor),
// so this is the branching-map equivalent of "select the boss directly."
async function jumpToBossNode(page) {
  await page.evaluate(() => {
    const s = window.Wordbound.Game._state;
    const floor = s.floor;
    const lastRowNode = floor.nodes.find((n) => n.row === floor.rows - 1);
    floor.nodes.forEach((n) => { if (n.type !== 'boss') n.cleared = true; });
    s.mapPositionNodeId = lastRowNode.id;
    s.currentNodeId = null;
  });
  // Force a real React re-render via real UI clicks (see header comment --
  // a direct Game.openDeckViewer()/closeDeckViewer() page.evaluate call
  // would bypass RunScreen's act()/bump cycle and leave the DOM stale).
  await page.click('button:has-text("Deck")');
  await page.waitForSelector('.treasure-panel:has-text("Your Deck")');
  await page.click('button:has-text("Close")');
  await page.waitForSelector('.node-map');
}

// Setup-only HP shortcut (same convention as gameHelpers.js's
// defeatCurrentMonster) + a REAL killing blow: finds a word the live rack
// can actually play (read-only engine query, not a mutation) and submits it
// through the real word input + real Play Word button click.
async function killBossViaRealWord(page) {
  await page.evaluate(() => { window.Wordbound.Game._state.monster.hp = 1; });
  const word = await page.evaluate((candidates) => {
    const { Combat } = window.Wordbound;
    const state = window.Wordbound.Game._state;
    for (const w of candidates) {
      const preview = Combat.previewWord(state.player, state.monster, w, state.comboState, {
        previousWord: state.previousWordThisFight,
        wordsPlayedThisFight: state.wordsPlayedThisFightCount,
        hexedTileId: state.hexedTileId,
        overcharge: state.overchargeArmed,
      });
      if (preview && preview.valid) return w;
    }
    return null;
  }, WORD_CANDIDATES);
  if (!word) return null;
  await page.fill('input[placeholder="Type or click letters..."]', word);
  await page.click('button:has-text("Play Word")');
  // CombatScreen.jsx's own killing-blow bump lands ~800ms after the click
  // (see its header comment) -- wait on the real re-rendered heading text
  // rather than a fixed sleep.
  await page.waitForFunction(() => document.body.textContent.includes('Add a tile to your deck?'), { timeout: 5000 });
  return word;
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

    // ---- Reach the run map with a real, deterministic run ----
    await page.click('button:has-text("New Run")');
    await page.waitForSelector('#screen-character-select');
    await page.fill('#run-seed-input', SEED);
    await page.click(`.character-option:has-text("${CHARACTER_NAME}")`);
    await page.waitForSelector('.node-map');

    // ---- Phase 1: boss kill -> tile reward -> boss item reward (claim path) ----
    await jumpToBossNode(page);
    await page.click('.node-pill.node-boss.node-current');
    check(
      'boss combat starts via real click',
      await page.evaluate(() => window.Wordbound.Game._state.combatActive === true && window.Wordbound.Game._state.monster.isBoss === true),
    );
    check('boss music mode switches to boss on fight start', await page.evaluate(() => window.Wordbound.Game._getMusicMode() === 'boss'));

    const floorBefore = await page.evaluate(() => window.Wordbound.Game._state.floorNumber);
    const word1 = await killBossViaRealWord(page);
    check(`boss #1 killed via a real submitted word (${word1})`, !!word1);
    check('boss music mode switches back to normal right after the kill', await page.evaluate(() => window.Wordbound.Game._getMusicMode() === 'normal'));

    check('tile-reward panel visible after boss kill', await page.isVisible('.treasure-panel:has-text("Add a tile to your deck?")'));
    check('boss-reward panel NOT visible yet (sequential, not stacked)', !(await page.isVisible('.treasure-panel:has-text("hoard")')));

    await page.click('.treasure-choice-tile'); // real click: take a tile
    check('after tile pick: boss-reward panel visible', await page.isVisible('.treasure-panel:has-text("hoard")'));
    check('after tile pick: tile-reward panel hidden again', !(await page.isVisible('.treasure-panel:has-text("Add a tile to your deck?")')));
    check('after tile pick: node map hidden while boss reward shows', !(await page.isVisible('.node-map')));

    const rarities = await page.evaluate(() => {
      const s = window.Wordbound.Game._state;
      const Items = window.Wordbound.Items;
      return (s.bossRewardOptions || []).map((id) => Items.ITEM_DEFS[id].rarity);
    });
    check(`boss reward offers only rare/legendary items (${rarities.join(',')})`, rarities.length > 0 && rarities.every((r) => r === 'rare' || r === 'legendary'));

    const chipCountBefore = await page.evaluate(() => document.querySelectorAll('.items-owned .item-chip').length);
    await page.click('.treasure-panel:has-text("hoard") .treasure-choice'); // real click: claim the item
    await page.waitForFunction((before) => window.Wordbound.Game._state.floorNumber > before, floorBefore, { timeout: 3000 });
    const floorAfter = await page.evaluate(() => window.Wordbound.Game._state.floorNumber);
    const chipCountAfter = await page.evaluate(() => document.querySelectorAll('.items-owned .item-chip').length);
    check(`claiming the boss item advances the floor (${floorBefore} -> ${floorAfter})`, floorAfter === floorBefore + 1);
    check('claimed item appears as a real chip in the items strip', chipCountAfter === chipCountBefore + 1);
    check('boss-reward panel hidden after claiming', !(await page.isVisible('.treasure-panel:has-text("hoard")')));
    check('node map visible again on the new floor', await page.isVisible('.node-map'));

    // ---- Phase 2: skip path at 375px mobile viewport ----
    await page.setViewportSize({ width: 375, height: 720 });
    await page.waitForTimeout(150);
    await jumpToBossNode(page);
    await page.click('.node-pill.node-boss.node-current');
    check('boss #2 combat starts via real click', await page.evaluate(() => window.Wordbound.Game._state.combatActive === true));

    const word2 = await killBossViaRealWord(page);
    check(`boss #2 killed via a real submitted word (${word2}), 375px viewport`, !!word2);

    await page.click('.tile-reward-skip'); // real click: skip the tile
    check('skip path: boss-reward panel visible immediately after skipping the tile', await page.isVisible('.treasure-panel:has-text("hoard")'));

    const layout = await page.evaluate(() => {
      const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      const panel = document.querySelector('.treasure-panel');
      const r = panel.getBoundingClientRect();
      const btns = panel.querySelectorAll('button');
      let minH = Infinity;
      btns.forEach((b) => { const br = b.getBoundingClientRect(); if (br.height < minH) minH = br.height; });
      return { overflow, panelRight: r.right, viewport: document.documentElement.clientWidth, minBtnHeight: minH, btnCount: btns.length };
    });
    check(`375px: no horizontal overflow with boss-reward panel open (overflow=${layout.overflow}px)`, layout.overflow <= 0);
    check(`375px: boss-reward panel fits the viewport (right edge ${Math.round(layout.panelRight)} <= ${layout.viewport})`, layout.panelRight <= layout.viewport + 1);
    check(`375px: boss-reward buttons are tappable-height (min ${Math.round(layout.minBtnHeight)}px across ${layout.btnCount} buttons)`, layout.minBtnHeight >= 36);

    const floorBeforeSkip = await page.evaluate(() => window.Wordbound.Game._state.floorNumber);
    await page.click('.tile-reward-skip'); // real click: skip the boss item too (same class, reused by BossRewardScreen)
    await page.waitForFunction((before) => window.Wordbound.Game._state.floorNumber > before, floorBeforeSkip, { timeout: 3000 });
    const floorAfterSkip = await page.evaluate(() => window.Wordbound.Game._state.floorNumber);
    check(`skip path: skipping the boss item still advances the floor (${floorBeforeSkip} -> ${floorAfterSkip})`, floorAfterSkip === floorBeforeSkip + 1);

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
