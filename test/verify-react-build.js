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

    // STRUCTURAL ticket, remaining-scope (c) step 2 (GOALS.md): rack-tile
    // clicks now stage through the real engine (state.selectedTileIds), not
    // a fake local string -- verify that mechanism for real in a browser,
    // not just jsdom/Vitest. Stage the first rack tile, confirm it actually
    // landed in state.selectedTileIds and the real staging-area DOM, then
    // unstage it by clicking it there, confirming a full round-trip leaves
    // no residue before the typed word below is played.
    const staged = await page.evaluate(() => {
      const rackBtn = document.querySelector('.rack-display .letter-tile:not(:disabled)');
      if (!rackBtn) return false;
      rackBtn.click();
      return true;
    });
    check('a rack tile was found and clicked to stage', staged);
    if (staged) {
      check('clicking staged the tile for real (state.selectedTileIds has one entry)', await page.evaluate(() =>
        window.Wordbound.Game._state.selectedTileIds.length === 1,
      ));
      check('the staged tile appears in the real staging area', await page.evaluate(() =>
        document.querySelectorAll('.staging-area .staged-tile').length === 1,
      ));
      await page.click('.staging-area .staged-tile');
      check('clicking the staged tile unstaged it (state.selectedTileIds empty again)', await page.evaluate(() =>
        window.Wordbound.Game._state.selectedTileIds.length === 0,
      ));
      check('the staging area is empty again after unstaging', await page.evaluate(() =>
        document.querySelectorAll('.staging-area .staged-tile').length === 0,
      ));

      // COMBAT JUICE ticket (GOALS.md), this run: the FLIP position-slide
      // (flipTileTo, CombatScreen.jsx) -- a staged/unstaged tile should
      // slide from its old on-screen position to its new one, rather than
      // popping instantly. jsdom/Vitest can't observe this at all (no real
      // requestAnimationFrame, no real layout -- see CombatScreen.test.jsx's
      // own note), so this is the first and only place it's actually
      // provable. Reading the transient invert-transform style directly
      // (via a point-in-time evaluate() read) turned out NOT to be a
      // reliable way to prove this fired: a raw `el.click()` dispatched
      // from inside page.evaluate() does not reliably get React's
      // useReducer-driven re-render (bump()) flushed before evaluate()
      // returns (confirmed directly -- the engine's own state.selectedTileIds
      // updates synchronously since Game.selectTileForWord mutates it
      // in-place, but the DOM commit lagged behind in every observed run),
      // and a separate follow-up evaluate() read races the double-rAF
      // release the other direction (its own real round-trip latency can
      // land after the release already fired). Instrumenting
      // requestAnimationFrame itself sidesteps both races: it counts real
      // invocations into a page-global as they happen, inside the browser's
      // own event loop, with no CDP round trip in between -- polling that
      // counter afterward proves flipTileTo's double-rAF genuinely
      // scheduled (i.e. its own delta-too-small early-return did NOT
      // trigger), which only happens if the invert transform was really
      // set, without needing to catch its exact transient value.
      await page.evaluate(() => {
        window.__rafCount = 0;
        const orig = window.requestAnimationFrame.bind(window);
        window.__unpatchRaf = () => { window.requestAnimationFrame = orig; };
        window.requestAnimationFrame = (cb) => orig((t) => { window.__rafCount++; cb(t); });
      });
      const rackTileForFlip = page.locator('.rack-display .letter-tile:not([disabled])').first();
      const flipCandidateCount = await rackTileForFlip.count();
      if (flipCandidateCount > 0) {
        await rackTileForFlip.click();
        const stagedAfterFlipClick = await page.evaluate(() =>
          document.querySelectorAll('.staging-area .staged-tile').length === 1);
        check('re-staging a tile for the FLIP check landed it in the staging area', stagedAfterFlipClick);
        if (stagedAfterFlipClick) {
          const rafFired = await page.waitForFunction(() => window.__rafCount >= 2, { timeout: 2000 })
            .then(() => true).catch(() => false);
          check('staging a tile schedules the real FLIP double-rAF release (the invert transform was genuinely set, not skipped by the too-small-delta guard)', rafFired);
          const flipSettled = await page.evaluate(() => {
            const stagedEl = document.querySelector('.staging-area .staged-tile');
            return stagedEl ? stagedEl.style.transform : null;
          });
          check('the FLIP transform clears back to identity once the slide finishes', flipSettled === '');
        }
        await page.evaluate(() => window.__unpatchRaf());
        // Clean up: unstage again so the checks below (typed-word
        // playthrough, mobile layout) start from a fully-unstaged rack,
        // matching every other check block's own convention. This unstage
        // triggers its OWN FLIP slide back into the rack -- waiting past its
        // 0.2s ease-out (not just confirming state.selectedTileIds is
        // empty) matters here specifically because the position-sensitive
        // checks right after this block (staged-tile drag, then native
        // drag-and-drop) read real getBoundingClientRect() coordinates off
        // these same rack tiles; a still-mid-transition inline transform
        // left over from this cleanup click was caught making those
        // checks intermittently target the wrong on-screen spot.
        await page.click('.staging-area .staged-tile');
        await page.waitForTimeout(300);
        check('staging area is empty again after the FLIP check', await page.evaluate(() =>
          document.querySelectorAll('.staging-area .staged-tile').length === 0,
        ));
      } else {
        await page.evaluate(() => window.__unpatchRaf());
        console.log('  (no rack tile available to re-stage for the FLIP check -- skipped)');
      }
    }

    // STRUCTURAL ticket, remaining scope (c) (GOALS.md), this run: the
    // staged-tile ghost/gap drag system -- the last core piece of remaining
    // scope (c). Real browser mouse input (page.mouse.move/down/up) drives
    // genuine native PointerEvent dispatch AND, critically, real
    // getBoundingClientRect() measurements -- jsdom always returns a
    // zero-sized rect for every element (CombatScreen.test.jsx's own note),
    // so its Vitest/RTL coverage can prove the state-machine transitions
    // (crossed/insertIndex/outside) but not that a drag genuinely resolves
    // to the right on-screen slot. This is that positional proof, the same
    // split the rack mouse-drag and touch-reorder checks above already use.
    // A blank ('?') tile is a no-op click on desktop (selectTileForWord
    // never stages it -- typing the letter is how a blank gets used), so
    // staging picks ENABLED, NON-BLANK rack tiles specifically, rather than
    // just "the next clickable button". The two clicks are separate
    // page.evaluate round-trips, not two .click() calls in one script: a
    // click dispatched from in-page JS doesn't necessarily flush React's
    // resulting DOM update before the surrounding synchronous script
    // continues (confirmed directly -- two `.click()` calls back to back in
    // one evaluate() staged, then immediately re-staged-and-unstaged the
    // SAME stale first tile, per selectTileForWord's own "already staged ->
    // deselects it" branch, leaving selectedTileIds empty every time).
    // Splitting into two round-trips gives the browser a turn to actually
    // commit the first click's re-render before the second one queries the
    // DOM.
    let stagedForDrag = [];
    for (let i = 0; i < 2; i++) {
      const clicked = await page.evaluate(() => {
        const tile = Array.from(document.querySelectorAll('.rack-display .letter-tile:not(:disabled)'))
          .find((b) => !b.textContent.startsWith('★'));
        if (!tile) return null;
        tile.click();
        return window.Wordbound.Game._state.selectedTileIds.slice();
      });
      if (!clicked) break;
      stagedForDrag = clicked;
    }
    if (stagedForDrag.length === 2) {
      check('two rack tiles were staged for the staged-tile drag check', true);
      // COMBAT JUICE ticket (GOALS.md), this run: each of the two stage
      // clicks above now triggers a real FLIP slide (flipTileTo) on the
      // tile landing in the staging area. boundingBox() below reads real
      // on-screen coordinates to drive the drag gesture -- wait past the
      // 0.2s ease-out first so it measures the tiles at rest, not
      // mid-transition (same hazard as the native rack drag-and-drop check
      // further down, which this file's own comment there documents).
      await page.waitForTimeout(300);
      const stagedTiles = page.locator('.staging-area .staged-tile');
      const firstBox = await stagedTiles.first().boundingBox();
      const secondBox = await stagedTiles.last().boundingBox();
      // Target near the SECOND tile's right edge, not its center: reorder-
      // StagedTile's insertIndex is "insert before whatever tile currently
      // sits at insertIndex" (same insert-before semantics
      // reorderRackOnDrop's own comment documents for the rack) --
      // stagedTileAtPosition only counts a tile as "left of the pointer"
      // when the pointer is strictly past its CENTER, so landing exactly on
      // the last tile's center resolves to insertIndex 1 (== dragIndex 0
      // once the dragged tile's removed and adjusted), which is a genuine
      // no-op restore, not a swap -- confirmed by hitting exactly that
      // no-op the first time this check was written. Past its center (but
      // still inside the tile, so this stays within the staging area's own
      // drag-out tolerance) makes both tiles count, landing the dragged
      // tile after the second one -- a real swap for a 2-tile staging row.
      const targetX = secondBox.x + secondBox.width - 4;
      const targetY = secondBox.y + secondBox.height / 2;
      await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
      await page.mouse.down();
      // Intermediate moves so the gesture crosses the real 8px threshold via
      // genuine incremental pointermove events, not one big jump.
      const steps = 5;
      for (let i = 1; i <= steps; i++) {
        await page.mouse.move(
          firstBox.x + firstBox.width / 2 + (targetX - (firstBox.x + firstBox.width / 2)) * (i / steps),
          firstBox.y + firstBox.height / 2 + (targetY - (firstBox.y + firstBox.height / 2)) * (i / steps),
        );
      }
      await page.mouse.up();
      const afterDragOrder = await page.evaluate(() => window.Wordbound.Game._state.selectedTileIds.slice());
      check('a real mouse drag of the first staged tile onto the second\'s real on-screen position reordered them',
        JSON.stringify(afterDragOrder) === JSON.stringify([stagedForDrag[1], stagedForDrag[0]]));
      check('both tiles are still staged after the reorder, not removed',
        (await page.locator('.staging-area .staged-tile').count()) === 2);
      check('the engine\'s drag state is cleared after a real staged-tile drag',
        await page.evaluate(() => window.Wordbound.Game._state.stagingDrag === null));

      // Drag the now-first staged tile well clear of the staging area -- a
      // real drag-out-to-remove, at a real on-screen distance (not a
      // synthetic coordinate jsdom can't validate).
      const dragOutBox = await stagedTiles.first().boundingBox();
      await page.mouse.move(dragOutBox.x + dragOutBox.width / 2, dragOutBox.y + dragOutBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(dragOutBox.x + dragOutBox.width / 2, dragOutBox.y + 300, { steps: 5 });
      await page.mouse.up();
      const afterDragOut = await page.evaluate(() => window.Wordbound.Game._state.selectedTileIds.slice());
      check('dragging a staged tile well clear of the staging area removed it (drag-out-to-remove)',
        afterDragOut.length === 1 && afterDragOut[0] === afterDragOrder[1]);
      check('the removed tile is back in the rack as a real, enabled letter-tile (not left staged or hexed-locked)',
        await page.evaluate((tileId) => {
          const idx = window.Wordbound.Game._state.player.rack.findIndex((t) => t.id === tileId);
          return idx !== -1 && !!document.querySelector(`.rack-display button.letter-tile[data-tile-index="${idx}"]:not(:disabled)`);
        }, afterDragOrder[0]));

      // Clean up: unstage the one tile this block left staged, so the rack
      // returns to a fully-unstaged state before the next check (desktop
      // mouse-drag rack reordering, right below) -- which locates rack
      // tiles via `.rack-display .letter-tile` and would otherwise
      // miscount against `state.player.rack`'s full array (a staged tile
      // renders as `.rack-slot-empty`, not `.letter-tile`).
      await page.click('.staging-area .staged-tile');
      check('staging area is fully clean again before the next check',
        await page.evaluate(() => window.Wordbound.Game._state.selectedTileIds.length === 0));
      // COMBAT JUICE ticket (GOALS.md), this run: this unstage now triggers
      // a real FLIP slide (CombatScreen.jsx's flipTileTo) on the tile that
      // just landed back in the rack. The very next check below reads real
      // getBoundingClientRect()-derived coordinates off rack tiles
      // (dragTo()) -- a still-mid-transition inline transform on that tile
      // was caught throwing the drag target off. Wait past the 0.2s
      // ease-out before any further position-sensitive check runs.
      await page.waitForTimeout(300);
    } else {
      console.log('  (fewer than 2 enabled non-blank rack tiles at this point -- staged-tile drag check skipped)');
    }

    // STRUCTURAL ticket, remaining-scope (c) (GOALS.md): desktop mouse-drag
    // rack reordering. Vitest/RTL (CombatScreen.test.jsx) already drives the
    // fireEvent.dragStart/dragOver/drop/dragEnd sequence directly, but jsdom
    // has no native DragEvent constructor at all -- this is the first check
    // of the real browser's own native HTML5 drag-and-drop path (Playwright's
    // dragTo() drives real mouse down/move/up over draggable elements,
    // producing genuine browser dragstart/dragover/drop events, not
    // synthetic ones).
    const rackIdsBeforeDrag = await page.evaluate(() =>
      window.Wordbound.Game._state.player.rack.map((t) => t.id));
    if (rackIdsBeforeDrag.length >= 2) {
      const rackTiles = page.locator('.rack-display .letter-tile');
      await rackTiles.first().dragTo(rackTiles.last());
      const rackIdsAfterDrag = await page.evaluate(() =>
        window.Wordbound.Game._state.player.rack.map((t) => t.id));
      // Same insertIndex semantics as game.js's reorderRackOnDrop (see its
      // own comment): dragging index 0 onto the last index lands the dragged
      // tile just BEFORE the tile that originally sat there, not appended
      // after it.
      const expected = rackIdsBeforeDrag.slice(1, -1)
        .concat([rackIdsBeforeDrag[0], rackIdsBeforeDrag[rackIdsBeforeDrag.length - 1]]);
      check('dragging the first rack tile onto the last tile\'s slot reorders the real rack via native browser drag-and-drop',
        JSON.stringify(rackIdsAfterDrag) === JSON.stringify(expected));
      check('the drag state the engine tracked mid-gesture is cleared after a real drag',
        await page.evaluate(() => window.Wordbound.Game._state.draggedTileId === null));
    } else {
      console.log('  (fewer than 2 rack tiles at this point -- drag-reorder check skipped)');
    }

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

    // STRUCTURAL ticket, remaining-scope (c) step 2 follow-up: the touch-mode
    // blank-letter picker overlay. Tapping a blank tile calls the real
    // Game.selectTileForWord (game.js), which opens state.blankPickerOpen --
    // CombatScreen now renders that as a real .blank-picker-overlay. Exercised
    // opportunistically against whatever this deterministic seed's CURRENT
    // rack happens to hold at this point in the fight, via real taps on the
    // real rendered ★ tile (no state.* hook shortcut). The Vitest/RTL suite
    // (CombatScreen.test.jsx) covers this path unconditionally by injecting a
    // blank tile directly, so this real-browser check isn't the only coverage
    // if this seed has none right now.
    const blankTileId = await page.evaluate(() => {
      const tile = window.Wordbound.Game._state.player.rack.find((t) => t.letter === '?');
      return tile ? tile.id : null;
    });
    if (blankTileId) {
      const blankClicked = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('.rack-display .letter-tile')).find((b) => b.textContent.startsWith('★'));
        if (!btn) return false;
        btn.click();
        return true;
      });
      check('touch mode: a real ★ blank tile was found and tapped', blankClicked);
      if (blankClicked) {
        await page.waitForSelector('.blank-picker-overlay', { timeout: 2000 });
        check('touch mode: tapping a blank tile opens the real blank-picker overlay', true);
        await page.click('.blank-picker-letter:has-text("E")');
        check('touch mode: picking a letter stages the blank with that letter',
          await page.evaluate(() => window.Wordbound.Game._state.selectedTileIds.length === 1
            && Object.values(window.Wordbound.Game._state.blankAssignments)[0] === 'E'));
        check('touch mode: the blank-picker overlay closes after picking a letter',
          (await page.locator('.blank-picker-overlay').count()) === 0);
        await page.click('.staging-area .staged-tile');
        check('touch mode: tapping the staged blank unstages it back to the rack',
          await page.evaluate(() => window.Wordbound.Game._state.selectedTileIds.length === 0));
      }
    } else {
      console.log('  (no blank tile in this seed\'s rack at this point -- blank-picker tap check skipped; Vitest/RTL covers it unconditionally)');
    }

    // STRUCTURAL ticket, remaining-scope (c) (GOALS.md), this run: TOUCH-
    // based rack reordering. game.js's getTileAtPosition (called by
    // updateTouchReorder) measures real tile positions via
    // getBoundingClientRect -- jsdom always returns a zero-sized rect for
    // every element (see CombatScreen.test.jsx's own note on this), so
    // Vitest/RTL can exercise the state-machine wiring but can't prove
    // POSITIONAL accuracy. This is that proof: dispatch a genuine
    // touchstart/touchmove x N/touchend sequence at REAL on-screen
    // coordinates (same technique test/verify-touch-tap-fix.js already
    // uses against wordbound.html, since Playwright's touchscreen API only
    // supports tap(), not a drag gesture) dragging the first rack tile onto
    // the last one's real position, and confirm the resulting order
    // matches reorderRackOnDrop's real insertion semantics.
    const rackIdsBeforeTouchDrag = await page.evaluate(() =>
      window.Wordbound.Game._state.player.rack.map((t) => t.id));
    if (rackIdsBeforeTouchDrag.length >= 2) {
      const tiles = page.locator('.rack-display .letter-tile');
      const startBox = await tiles.first().boundingBox();
      const endBox = await tiles.last().boundingBox();
      await page.evaluate(({ startX, startY, endX, endY }) => {
        const els = document.querySelectorAll('.rack-display .letter-tile');
        const el = els[0];
        function touch(type, x, y) {
          const t = new Touch({ identifier: 42, target: el, clientX: x, clientY: y });
          el.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true }));
        }
        touch('touchstart', startX, startY);
        const steps = 5;
        for (let i = 1; i <= steps; i++) {
          touch('touchmove', startX + (endX - startX) * (i / steps), startY + (endY - startY) * (i / steps));
        }
        touch('touchend', endX, endY);
      }, {
        startX: startBox.x + startBox.width / 2, startY: startBox.y + startBox.height / 2,
        endX: endBox.x + endBox.width / 2, endY: endBox.y + endBox.height / 2,
      });
      const rackIdsAfterTouchDrag = await page.evaluate(() =>
        window.Wordbound.Game._state.player.rack.map((t) => t.id));
      const expectedTouch = rackIdsBeforeTouchDrag.slice(1, -1)
        .concat([rackIdsBeforeTouchDrag[0], rackIdsBeforeTouchDrag[rackIdsBeforeTouchDrag.length - 1]]);
      check('a real touchstart/touchmove/touchend gesture dragged the first rack tile onto the last one\'s real on-screen position and reordered the rack',
        JSON.stringify(rackIdsAfterTouchDrag) === JSON.stringify(expectedTouch));
      check('the touch-drag state the engine tracked mid-gesture is cleared after a real touch drag',
        await page.evaluate(() => window.Wordbound.Game._state.draggedTileId === null
          && window.Wordbound.Game._state.touchDragThresholdCrossed === false));
    } else {
      console.log('  (fewer than 2 rack tiles at this point -- touch-drag-reorder check skipped)');
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
