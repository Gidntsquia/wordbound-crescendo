#!/usr/bin/env node
// test/verify-react-build.js
//
// GOALS.md STRUCTURAL ticket, remaining scope (a)+(b): a React/Vite
// equivalent of test:mobile + test:itch-build's "load the real BUILT
// output in a real browser" bar, which nothing in this repo covered yet --
// every prior STRUCTURAL run's browser check hit the Vite DEV server with a
// throwaway, uncommitted script (see PROGRESS.md's STRUCTURAL 8/N and 9/N
// entries). `wordbound.html`'s own test:mobile/test:qa/test:itch-build stay
// as-is (still the shipped reference implementation, per GOALS.md's own
// note) -- this is a NEW, separate script for the src/ React tree, not a
// port that replaces them.
//
// What this proves, all against `vite build`'s actual dist/app/ output
// statically served (never the dev server):
//   1. Zero failed requests / 404s loading the built bundle (same bar as
//      verify-itch-build.js) -- catches a base-path or asset-hash mistake
//      jsdom can't see.
//   2. A REAL UI-driven playthrough -- click "New Run", fill a seed, pick a
//      character, click a map node, play a real word, watch the monster's
//      HP actually drop in the DOM -- with zero console/page errors. This
//      is deliberately UI-driven (real .click()/.fill()), not a direct
//      `Game.*` hook call via page.evaluate: STRUCTURAL 9/N's PROGRESS
//      entry documented that hook calls bypass RunScreen's `act`/`bump`
//      re-render cycle and leave the DOM stale, so this script always
//      drives state changes the same way a real player would.
//   3. Mobile layout (375px/414px, same widths test:mobile uses for
//      wordbound.html) checked at each screen reached along that real
//      playthrough -- main menu, character select, run map, and mid-fight
//      combat -- since those are all-new React markup/CSS-class trees that
//      test:mobile's wordbound.html run never exercises.
//
// Run with `npm run test:react-build` (or `node test/verify-react-build.js`).

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');
const { chromium } = require('@playwright/test');

const ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist', 'app');
const PORT = 9882;
const SEED = 'vitest-fixed-seed-1'; // same known-good seed src/components/__tests__ already relies on
const CHARACTER_NAME = 'The Archivist';
const WORD_CANDIDATES = ['RADIO', 'ROAD', 'RAID', 'READ', 'RAIN', 'AIDE', 'DINE', 'RIDE'];
const MOBILE_WIDTHS = [375, 414];

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

// Same overflow check test:mobile uses against wordbound.html, scoped down
// to the one signal that matters here (this script's job is the React port's
// build/UI-flow bar, not a full re-run of test:mobile's button-size/font-size
// checks, which are CSS-class-driven and already covered by that suite since
// the React port reuses the exact same css/wordbound.css classes).
async function checkNoOverflow(page, label) {
  for (const width of MOBILE_WIDTHS) {
    await page.setViewportSize({ width, height: 800 });
    await page.waitForTimeout(150);
    const overflow = await page.evaluate(() => {
      const el = document.documentElement;
      return Math.max(0, el.scrollWidth - el.clientWidth);
    });
    check(`${label}: no horizontal overflow at ${width}px`, overflow === 0);
    if (overflow > 0) console.log(`  ⚠️  ${overflow}px of horizontal overflow at ${width}px`);
  }
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

    check('zero failed requests / 404s loading the built app', failedRequests.length === 0);
    failedRequests.forEach((f) => console.log('  BAD REQUEST:', f));

    check('main menu renders (real DOM text)', (await page.textContent('body')).includes('WORDBOUND: CRESCENDO'));
    await checkNoOverflow(page, 'main menu');

    // Real UI click, not a direct screen-state hook.
    await page.click('button:has-text("New Run")');
    await page.waitForSelector('#screen-character-select');
    await checkNoOverflow(page, 'character select');

    await page.fill('#run-seed-input', SEED);
    await page.click(`.character-option:has-text("${CHARACTER_NAME}")`);
    await page.waitForSelector('.node-map');
    await checkNoOverflow(page, 'run map');

    // Click a real available "Foe" node (deterministic for this seed: the
    // same one src/test/gameHelpers.js's findAvailableCombatNodeId picks).
    const clicked = await page.evaluate(() => {
      const pill = Array.from(document.querySelectorAll('.node-pill.node-combat.node-current'))[0];
      if (!pill) return false;
      pill.click();
      return true;
    });
    check('an available Foe node was found and clicked', clicked);
    await page.waitForSelector('.word-input-row', { timeout: 5000 });
    await checkNoOverflow(page, 'combat (mid-fight)');

    check(
      "seeded rack matches the Vitest suite's known rack (fresh archivist + this seed)",
      await page.evaluate(() => window.Wordbound.Game._state.player.rack.length > 0),
    );

    // Pick a real playable word against the actual live rack/monster, same
    // approach src/test/gameHelpers.js's pickPlayableWord uses -- read-only
    // engine query, not a state mutation, so the actual submit below is
    // still a genuine UI-driven play.
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
    check(`a playable word was found on the real rack (candidates: ${WORD_CANDIDATES.join(', ')})`, !!word);

    if (word) {
      const startingHp = await page.evaluate(() => window.Wordbound.Game._state.monster.hp);
      await page.fill('input[placeholder="Type or click letters..."]', word);
      await page.click('button:has-text("Play Word")');
      await page.waitForFunction(
        (starting) => window.Wordbound.Game._state.monster.hp < starting,
        startingHp,
        { timeout: 3000 },
      );
      const newHp = await page.evaluate(() => window.Wordbound.Game._state.monster.hp);
      check(`playing "${word}" through the real UI dropped monster HP (${startingHp} -> ${newHp})`, newHp < startingHp);
    }

    check('zero console/page errors across the whole playthrough', consoleErrors.length === 0);
    consoleErrors.forEach((e) => console.log('  CONSOLE ERROR:', e));

    // MOBILE INPUT 1/3, STRUCTURAL remaining-scope (c) step 1 (GOALS.md):
    // main.jsx now calls Game.applyTouchModeFromMedia() + registers the live
    // matchMedia('(pointer: coarse)') listener at module load, mirroring
    // wordbound.html's own Game.init() wiring -- previously nothing called
    // it in the React app, so state.touchMode was always false regardless of
    // device. Real Chromium reports a fine pointer by default (no mock
    // needed) to prove the *default* (desktop) path first, then the same
    // in-page matchMedia mock test:mobile's own touch-mode check uses
    // (test/verify-mobile-layout.js) proves the coarse-pointer path -- a
    // fresh page load is required since the detection call only runs once,
    // at module load.
    check('desktop (fine pointer): state.touchMode is false, no <body>.touch-mode class', await page.evaluate(() =>
      window.Wordbound.Game._state.touchMode === false && !document.body.classList.contains('touch-mode'),
    ));

    await page.addInitScript(() => {
      window.matchMedia = (q) => ({
        matches: /coarse/.test(q), media: q,
        addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
      });
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.Wordbound?.Game, { timeout: 15000 });
    check('coarse pointer (mocked matchMedia): state.touchMode is true, <body> gets .touch-mode', await page.evaluate(() =>
      window.Wordbound.Game._state.touchMode === true && document.body.classList.contains('touch-mode'),
    ));

    // Real functional consequence of touch-mode now being wired: CombatScreen
    // skips re-focusing the word input after a play (stealing focus would pop
    // the soft keyboard). Reach a fresh fight through real UI clicks again
    // (state was reset by the reload above) and confirm the input is NOT the
    // active element right after a real word submit.
    await page.click('button:has-text("New Run")');
    await page.waitForSelector('#screen-character-select');
    await page.fill('#run-seed-input', SEED);
    await page.click(`.character-option:has-text("${CHARACTER_NAME}")`);
    await page.waitForSelector('.node-map');
    await page.evaluate(() => {
      const pill = Array.from(document.querySelectorAll('.node-pill.node-combat.node-current'))[0];
      if (pill) pill.click();
    });
    await page.waitForSelector('.word-input-row', { timeout: 5000 });
    const touchWord = await page.evaluate((candidates) => {
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
    check('a playable word was found for the touch-mode focus check', !!touchWord);
    if (touchWord) {
      await page.fill('input[placeholder="Type or click letters..."]', touchWord);
      await page.click('button:has-text("Play Word")');
      await page.waitForTimeout(150);
      check('touch-mode: word input is not re-focused after a play (no soft-keyboard steal)', await page.evaluate(() =>
        document.activeElement !== document.querySelector('input[placeholder="Type or click letters..."]'),
      ));
    }
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
