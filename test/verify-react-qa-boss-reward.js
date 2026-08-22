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
//   3. Floor 3's boss (the Valkyrie Marshal, a SECOND real duel piece
//      distinct from floor 1/2's Mountain King) -> claiming its item
//      advances to floor 4, NOT victory -- floor 3 is no longer the run's
//      last floor (GOALS.md DUEL-GAUGE COMBAT ticket's floor/def-plumbing
//      run added a real floor 4, "the Podium").
//   4. The run's LAST floor boss (floor 4, the Maestro, a THIRD real duel
//      piece -- Beethoven's 5th) -> claiming its item resolves to VICTORY
//      through the exact same reward-panel plumbing, not a special-cased
//      path.
//   5. Zero console/page errors and zero failed requests throughout.
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
// UPDATE 2026-08-22 (GOALS.md DUEL-GAUGE COMBAT ORCHESTRATOR DECISION,
// "duel fights are React-only"): floor 1's boss now carries a real `.piece`
// and fights as a genuine real-time duel -- this script IS now a real,
// harness-side duel win check (the first one), not just a reward-panel
// sequencing check. killBossViaRealWord below is duel-aware: it forces the
// gauge one point from a won push (plus pushesToDefeat:1, so that push
// deals a full kill) rather than a bare monster.hp=1, since a duel kill
// needs a WON PUSH, not an hp subtraction -- same "force determinism via
// setup, real killing blow via a real submitted word" convention as
// before, adapted for the gauge. Deep gauge-math coverage (tier
// multipliers, i-frames, parry) stays Vitest's job
// (src/test/duelIntegration.test.js, duel.test.js) -- this script's own
// job is still the reward-panel sequencing after a kill, now proven to
// survive a real duel-mode kill in a real browser too.
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
//
// DUEL-GAUGE COMBAT boss-def cutover (GOALS.md ORCHESTRATOR DECISION
// 2026-08-22, "duel fights are React-only"): floor 1's boss now carries a
// real `.piece` and fights as a live duel, so `monster.hp = 1` alone is no
// longer a deterministic one-word kill -- a duel kill needs a WON PUSH (the
// gauge reaching Duel.GAUGE_MAX), not a bare hp subtraction. For a duel-mode
// monster this sets the gauge one point from winning AND forces
// pushesToDefeat to 1 (so the won push's ceil(maxHp/pushesToDefeat) damage
// formula deals exactly maxHp, a full kill in one push) -- the duel
// equivalent of forcing hp=1, not a claim about real boss balance. The
// actual killing blow is still a real word typed and submitted through the
// real Play Word button either way.
// Setup-only: neutralize the real-time tick-loop's ongoing enemy push the
// instant a duel starts. GOALS.md DUEL-GAUGE COMBAT boss-def cutover found
// this for real: Valkyrie Marshal's dynamics never drop below 0.5 (unlike
// Mountain King's near-silent opening), so the continuous push at 'late'
// tier (STAGE_TIER_BASE_PUSH.late=6 + intensity*INTENSITY_PUSH_SCALE=16, up
// to 22/sec) can erode a real fight's gauge -- and even cost a health block
// -- during the handful of real Playwright round trips (the two assertions
// below, then killBossViaRealWord's own word lookup/fill/click) between
// combat starting and the forced kill actually landing, occasionally
// leaving the boss alive (and the fight screen gone) when
// killBossViaRealWord expects a combat UI to still be there. Confirmed by
// running this script 3x in a row: passed, passed, then hit exactly this
// hang at the floor-3 (Valkyrie Marshal) phase, never at floor 1/2 (Mountain
// King's near-zero opening intensity leaves this race harmless there).
// Zeroing state.duelSequencer.getIntensity leaves only the tier's flat
// STAGE_TIER_BASE_PUSH term (6/sec for late), safely smaller than any real
// word's push (WORD_PUSH_SCALE=1 x wordScore, routinely >20) over these
// same real round trips -- the duel-mode equivalent of freezing hp before a
// forced kill, not a claim about real boss balance.
async function neutralizeDuelPush(page) {
  await page.evaluate(() => {
    const state = window.Wordbound.Game._state;
    if (state.duelSequencer) state.duelSequencer.getIntensity = () => 0;
  });
}

async function killBossViaRealWord(page) {
  await page.evaluate(() => {
    const state = window.Wordbound.Game._state;
    if (state.monster.duel && state.duel) {
      state.duel.pushesToDefeat = 1;
      state.duel.gauge = window.Wordbound.Duel.GAUGE_MAX - 1;
    } else {
      state.monster.hp = 1;
    }
  });
  // Real rack -> real word, via the SAME anagram-subset technique
  // orchestrator-qa-boss-reward.js's FIND_WORD_FN already uses for
  // wordbound.html -- not the fixed WORD_CANDIDATES list this used to be.
  // Found a real gap this run: by the floor-4 (Maestro) fight, the
  // deterministic seed's rack (after 3 real duel kills' worth of tile/item
  // rewards) no longer happened to contain any of WORD_CANDIDATES' fixed
  // R/A/D/I/O/E/N/T family -- `killBossViaRealWord` returned null and the
  // script crashed waiting on a reward panel that never appeared. A fixed
  // list can't promise to stay playable against an ever-changing deck; a
  // real subset lookup against the actual rack + real WORDLIST can, for any
  // rack shape at any floor. Kept the existing `Combat.previewWord` validity
  // check as a second real safety net (rejects a comboState/hex edge case
  // the anagram index alone wouldn't know about) rather than trusting the
  // index blindly.
  const word = await page.evaluate(() => {
    const { Combat } = window.Wordbound;
    const state = window.Wordbound.Game._state;
    if (!window.__anagramIndex) {
      const idx = new Map();
      const list = window.Wordbound.WORDLIST || [];
      for (const w of list) {
        if (w.length < 2 || w.length > 8) continue;
        const key = w.split('').sort().join('');
        if (!idx.has(key)) idx.set(key, w);
      }
      window.__anagramIndex = idx;
    }
    const rack = state.player.rack;
    const letters = [];
    for (const tile of rack) {
      if (tile.letter !== '?' && tile.id !== state.hexedTileId) letters.push(tile.letter);
    }
    const n = letters.length;
    const candidates = new Set();
    for (let mask = 1; mask < (1 << n); mask++) {
      const subset = [];
      for (let b = 0; b < n; b++) if (mask & (1 << b)) subset.push(letters[b]);
      if (subset.length < 2) continue;
      const w = window.__anagramIndex.get(subset.slice().sort().join(''));
      if (w) candidates.add(w);
    }
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
  });
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
    await neutralizeDuelPush(page); // see the function's own header comment -- closes a real race, not a defensive habit
    check(
      'boss combat starts via real click',
      await page.evaluate(() => window.Wordbound.Game._state.combatActive === true && window.Wordbound.Game._state.monster.isBoss === true),
    );
    // Was Game._getMusicMode() === 'boss' -- the floor-1 boss now fights as
    // a real duel (GOALS.md DUEL-GAUGE COMBAT ORCHESTRATOR DECISION
    // 2026-08-22), and Game.startDuelFight bypasses the placeholder
    // startBackgroundMusic()/currentMusicMode system entirely in favor of a
    // real Music sequencer -- _getMusicMode() stays whatever it was before
    // (never 'boss') for a duel fight, so it's the wrong check here now.
    // state.monster.duel is the real signal that startCombat's automatic
    // `.piece` detection actually routed this fight into duel mode.
    check('boss fight starts in duel mode (real .piece auto-detection)', await page.evaluate(() => window.Wordbound.Game._state.monster.duel === true));

    const floorBefore = await page.evaluate(() => window.Wordbound.Game._state.floorNumber);
    const word1 = await killBossViaRealWord(page);
    check(`boss #1 killed via a real submitted word (${word1})`, !!word1);
    // Was Game._getMusicMode() === 'normal' -- onMonsterDefeated clears
    // state.duel/duelSequencer on a duel-mode kill (same event this
    // checks for), the duel-mode equivalent of the music mode reverting.
    check('duel state is torn down right after the kill', await page.evaluate(() => !window.Wordbound.Game._state.duel && !window.Wordbound.Game._state.duelSequencer));

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
    await neutralizeDuelPush(page); // see the function's own header comment -- closes a real race, not a defensive habit
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

    // ---- Phase 3: floor-3 boss (the Valkyrie Marshal), a SECOND real duel --
    // GOALS.md DUEL-GAUGE COMBAT ticket's boss-def cutover: boss_sovereign
    // now carries a real `.piece` too (Ride of the Valkyries), same as
    // boss_vowelmaw's Mountain King before it. Phases 1-2 above already
    // proved the duel-win -> reward-panel flow for floor 1/2; this phase is
    // new value, not a repeat -- it's the first real-browser proof that a
    // SECOND, independently-authored piece drives a real duel correctly
    // through Game.startDuelFight/DuelCombat, not just Mountain King. Floor
    // 3 is NO LONGER the LAST floor (the floor/def-plumbing run added a
    // real floor 4, "the Podium") -- this phase now confirms beating it
    // advances the floor, same as every non-final boss; the real VICTORY
    // check moves to Phase 4 below, against the real final boss.
    // floorAfterSkip above already put this run on floor 3, so no floor
    // jump is needed beyond finding its boss node.
    await jumpToBossNode(page);
    await page.click('.node-pill.node-boss.node-current');
    await neutralizeDuelPush(page); // see the function's own header comment -- closes a real race, not a defensive habit
    check(
      'floor-3 boss combat starts via real click',
      await page.evaluate(() => window.Wordbound.Game._state.combatActive === true && window.Wordbound.Game._state.monster.isBoss === true),
    );
    check('floor-3 boss (Valkyrie Marshal) fights as a real duel too', await page.evaluate(() => window.Wordbound.Game._state.monster.duel === true));

    const word3 = await killBossViaRealWord(page);
    check(`floor-3 boss killed via a real submitted word (${word3})`, !!word3);
    check('duel state is torn down right after the floor-3 kill', await page.evaluate(() => !window.Wordbound.Game._state.duel && !window.Wordbound.Game._state.duelSequencer));

    check('tile-reward panel visible after the floor-3 boss kill', await page.isVisible('.treasure-panel:has-text("Add a tile to your deck?")'));
    const floorBeforeFloor3Claim = await page.evaluate(() => window.Wordbound.Game._state.floorNumber);
    await page.click('.treasure-choice-tile'); // real click: take a tile
    check('after floor-3 tile pick: boss-reward panel visible', await page.isVisible('.treasure-panel:has-text("hoard")'));

    await page.click('.treasure-panel:has-text("hoard") .treasure-choice'); // real click: claim the item
    await page.waitForFunction((before) => window.Wordbound.Game._state.floorNumber > before, floorBeforeFloor3Claim, { timeout: 3000 });
    const floorAfterFloor3Claim = await page.evaluate(() => window.Wordbound.Game._state.floorNumber);
    check(`claiming the floor-3 boss item advances to floor 4, not VICTORY (${floorBeforeFloor3Claim} -> ${floorAfterFloor3Claim})`,
      floorAfterFloor3Claim === floorBeforeFloor3Claim + 1 && (await page.evaluate(() => window.Wordbound.Game._state.screen === 'RUN')));

    // ---- Phase 4: floor-4 boss (the Maestro, "the Podium") -- the REAL
    // last floor boss now that DUEL-GAUGE COMBAT's floor/def-plumbing run
    // wired Floor.TOTAL_FLOORS to 4 and boss_maestro carries Beethoven's
    // 5th. This is the first real-browser proof that a THIRD,
    // independently-authored piece drives a real duel correctly, and that
    // beating the run's true LAST floor boss resolves to VICTORY through
    // the exact same tile-reward -> boss-item-reward plumbing every other
    // boss kill uses (advanceFloor's own `floorNumber > TOTAL_FLOORS`
    // check, no special-cased path).
    await jumpToBossNode(page);
    await page.click('.node-pill.node-boss.node-current');
    await neutralizeDuelPush(page); // see the function's own header comment -- closes a real race, not a defensive habit
    check(
      'floor-4 boss combat starts via real click',
      await page.evaluate(() => window.Wordbound.Game._state.combatActive === true && window.Wordbound.Game._state.monster.isBoss === true),
    );
    check('floor-4 boss (the Maestro) fights as a real duel too', await page.evaluate(() => window.Wordbound.Game._state.monster.duel === true));

    const word4 = await killBossViaRealWord(page);
    check(`floor-4 boss killed via a real submitted word (${word4})`, !!word4);
    check('duel state is torn down right after the floor-4 kill', await page.evaluate(() => !window.Wordbound.Game._state.duel && !window.Wordbound.Game._state.duelSequencer));

    check('tile-reward panel visible after the floor-4 boss kill', await page.isVisible('.treasure-panel:has-text("Add a tile to your deck?")'));
    await page.click('.treasure-choice-tile'); // real click: take a tile
    check('after floor-4 tile pick: boss-reward panel visible', await page.isVisible('.treasure-panel:has-text("hoard")'));

    await page.click('.treasure-panel:has-text("hoard") .treasure-choice'); // real click: claim the item
    await page.waitForFunction(() => window.Wordbound.Game._state.screen === 'VICTORY', { timeout: 3000 });
    check('claiming the LAST floor boss item triggers VICTORY, not another floor advance', await page.evaluate(() => window.Wordbound.Game._state.screen === 'VICTORY'));
    check('VICTORY screen actually rendered', await page.isVisible('h1:has-text("Victory!")'));

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
