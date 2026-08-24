#!/usr/bin/env node
// test/verify-regular-duel-smoke.js
//
// REGULAR ENEMIES ticket (GOALS.md) -- the ticket's own VERIFY line asks for
// "Playwright duel smoke per tier win + loss paths." Closes that bar for the
// early tier (gymnopediste/gstring/morningmood) and all 3 of the mid tier's
// named regulars (gnossienne/invention/metronome, the last added when
// normal tier's cutover completed) -- js/wordbound/monsters.js. Every prior real-browser check in this suite
// (verify-react-qa-boss-reward.js, verify-react-duel-loss.js) only ever
// exercised a BOSS's `.piece` auto-detection -- this is the first real,
// live-browser proof that a plain REGULAR carrying `.piece` also routes
// through Game.startDuelFight correctly (real AudioContext, no jsdom
// involved, so this is a genuinely different environment than dom-check.js's
// own now-safely-pinned-away-from-duel-mode coverage).
//
// Two real fights against two of the three real early-tier defs, against a
// real `vite build` output statically served (same bar as every other
// test/verify-react-*.js script):
//   1. WIN -- gymnopediste, forced to one push from winning (pushesToDefeat
//      is 1 for a regular, matching game.js's own `monster.isBoss ? 3 : 1`
//      default), then a real submitted word finishes it. Confirms the
//      regular back-to-the-map path (not the boss-only "hoard" reward panel)
//      and glyph/name/tier wiring off the real MONSTER_DEFS entry.
//   2. LOSS -- morningmood, on a fresh node, healthBlocks forced to 1 and
//      the gauge forced to the enemy edge -- the real per-frame tick loop
//      (CombatScreen.jsx's rAF effect) crosses it for real, proving the full
//      player-defeated -> endRun(false) -> GAME_OVER chain fires for a
//      REGULAR duel exactly like it already does for a boss one.
// The specific node's `defId` is forced directly (page.evaluate) rather than
// found via a seed search -- same "force determinism via setup, let the real
// engine resolve the rest" convention every other script in this suite uses
// for the gauge/health fields; picking which regular fights the player is
// not itself under test here, real duel routing off `.piece` is.
//
// Run with `node test/verify-regular-duel-smoke.js`.

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');
const { chromium } = require('@playwright/test');

const ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist', 'app');
const PORT = 9887;
const SEED = 'regular-duel-smoke-seed';
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

// Setup-only: overwrite the first available real 'combat' node's defId with
// a specific early-tier regular, and click into it via the real UI pill.
// Bypasses real floor RNG entirely for WHICH regular gets fought -- same
// category of setup as every gauge/health-block force elsewhere in this
// suite -- while still routing through the real click -> Game.
// enterCurrentNode -> startCombat -> `.piece` auto-detection -> Game.
// startDuelFight chain for real.
async function enterForcedRegularDuel(page, defId) {
  await page.evaluate((forcedDefId) => {
    const state = window.Wordbound.Game._state;
    const available = window.Wordbound.Game._availableNodeIds();
    const node = state.floor.nodes.find((n) => available.indexOf(n.id) !== -1 && n.type === 'combat');
    if (!node) throw new Error('no available combat node to force');
    node.defId = forcedDefId;
  }, defId);
  await page.click('.node-pill.node-combat.node-current');
}

// Same idea, but for a SECOND fight on the same branching floor -- the DAG's
// next-available node after clearing the first one isn't guaranteed to be
// combat-typed (could be a shop/event/treasure lane), so this reaches for
// ANY still-uncleared combat node on the whole floor, rewinds
// mapPositionNodeId to one of its real edge-predecessors (or null, if it's
// itself a row-0 start node) so the map legitimately offers it as available,
// then clicks the real node-pill -- same "jump straight to a specific node"
// convention verify-react-qa-boss-reward.js's own jumpToBossNode already
// established. A raw `Game.enterCurrentNode(id)` call from page.evaluate
// alone is NOT enough here (confirmed directly: the fight starts for real
// underneath, but CombatScreen never mounts and its rAF tick loop -- the
// loss path's own load-bearing mechanism -- never starts) -- RunScreen.jsx's
// own header comment explains why: Game._state is a plain mutated object,
// and React only re-renders after one of its own wrapped `act()` calls
// bumps a counter, which a page.evaluate mutation never does. The
// Deck-panel open/close round trip below is a real click whose sole job is
// forcing that re-render, same as jumpToBossNode's own identical trick.
async function enterForcedRegularDuelAnywhereOnFloor(page, defId) {
  await page.evaluate((forcedDefId) => {
    const s = window.Wordbound.Game._state;
    const floor = s.floor;
    const target = floor.nodes.find((n) => n.type === 'combat' && !n.cleared);
    if (!target) throw new Error('no uncleared combat node left on the floor to force');
    target.defId = forcedDefId;
    const predEdge = floor.edges.find((e) => e[1] === target.id);
    floor.nodes.forEach((n) => { if (n.id !== target.id) n.cleared = true; });
    s.mapPositionNodeId = predEdge ? predEdge[0] : null;
    s.currentNodeId = null;
  }, defId);
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
  await page.click('.node-pill.node-combat.node-current');
}

// Generalized from verify-react-qa-boss-reward.js's own killBossViaRealWord
// -- identical technique, works for ANY duel-mode monster (boss or regular)
// since it only reads state.monster.duel, never state.monster.isBoss.
async function winDuelViaRealWord(page) {
  await page.evaluate(() => {
    const state = window.Wordbound.Game._state;
    state.duel.pushesToDefeat = 1;
    state.duel.gauge = window.Wordbound.Duel.GAUGE_MAX - 1;
    // Freeze the enemy's own continuous music push for this forced setup
    // (per-instance `pushResistance`, header's own documented tuning knob)
    // -- at low/'early' push rates (1-2 gauge/sec) the real-browser
    // round-trip between forcing the gauge and the word actually landing
    // (fill+click, ~150-300ms observed) barely moves the needle, but at
    // higher tiers (mid+, 3-19 gauge/sec) that same real-time gap can drain
    // enough of the forced near-win gauge to make the word's own push fall
    // short, or even cost a real Verse before the word lands -- confirmed
    // directly (REGULAR ENEMIES ticket, this run): without this, the
    // gnossienne win attempt below reproducibly lost 2 health blocks and
    // never won at all. This only neutralizes the racing background push
    // for the deliberately-forced "one word from winning" setup already in
    // place -- it doesn't change what's under test (a real submitted word
    // crossing the gauge and triggering the real win flow end-to-end).
    state.duel.pushResistance = 1;
  });
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
  // Was a wait on the "Add a tile to your deck?" heading -- PLAYTEST
  // FINDINGS 3 item 2 removed that screen, so a regular kill now resolves
  // straight back to the map. Wait on the fight actually ending instead.
  await page.waitForFunction(() => window.Wordbound.Game._state.combatActive === false, { timeout: 5000 });
  // The engine flips combatActive a beat before CombatScreen.jsx's own
  // killing-blow bump repaints the React tree -- wait for the settled
  // post-kill DOM (a regular kill goes straight back to the map).
  await page.waitForSelector('.node-map', { timeout: 5000 });
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

    await page.click('button:has-text("New Run")');
    await page.waitForSelector('#screen-character-select');
    await page.fill('#run-seed-input', SEED);
    await page.click(`.character-option:has-text("${CHARACTER_NAME}")`);
    await page.waitForSelector('.node-map');

    // ---- WIN: gymnopediste ----
    await enterForcedRegularDuel(page, 'gymnopediste');
    check('regular combat starts via real click', await page.evaluate(() => window.Wordbound.Game._state.combatActive === true && window.Wordbound.Game._state.monster.isBoss === false));
    check('regular fight starts in duel mode (real .piece auto-detection off a plain regular def)', await page.evaluate(() => window.Wordbound.Game._state.monster.duel === true));
    check('the real MONSTER_DEFS name/glyph/tier reach the live monster instance', await page.evaluate(() => {
      const m = window.Wordbound.Game._state.monster;
      const Monsters = window.Wordbound.Monsters;
      const def = Monsters.MONSTER_DEFS.gymnopediste;
      return m.name === def.name && m.glyph === def.glyph && m.tier === 'weak';
    }));
    check('the duel piece is the real vetted early-tier piece (stageTier + PD vetting)', await page.evaluate(() => {
      const piece = window.Wordbound.Game._state.duelPiece;
      return piece && piece.stageTier === 'early' && piece.vetting && piece.vetting.publicDomain === true;
    }));
    check('.monster-name shows the framed portrait glyph', (await page.textContent('.monster-name')).includes(await page.evaluate(() => window.Wordbound.Monsters.MONSTER_DEFS.gymnopediste.glyph)));

    const word = await winDuelViaRealWord(page);
    check(`regular #1 killed via a real submitted word (${word})`, !!word);
    check('duel state is torn down right after a REGULAR kill (not boss-only)', await page.evaluate(() => !window.Wordbound.Game._state.duel && !window.Wordbound.Game._state.duelSequencer));
    // PLAYTEST FINDINGS 3 item 2 (GOALS.md, 2026-08-22): a regular kill used
    // to stop at the per-kill "Add a tile to your deck?" panel. That step is
    // gone -- the kill lands straight back on the node map with gold as its
    // whole reward. Inverted assertions, not dropped coverage.
    check('no tile-reward panel after the regular kill', !(await page.isVisible('.treasure-panel:has-text("Add a tile to your deck?")')));
    check('boss-reward panel never appears for a REGULAR kill (no "hoard" panel)', !(await page.isVisible('.treasure-panel:has-text("hoard")')));

    await page.waitForSelector('.node-map');
    check('after a regular kill: straight back to the node map (no reward detour at all)', await page.isVisible('.node-map'));

    // ---- LOSS: morningmood, a fresh node on the same floor ----
    await enterForcedRegularDuelAnywhereOnFloor(page, 'morningmood');
    check('second regular fight also starts in duel mode', await page.evaluate(() => window.Wordbound.Game._state.monster.duel === true));
    check('second regular is the real Morning Mood def', await page.evaluate(() => window.Wordbound.Game._state.monster.name === window.Wordbound.Monsters.MONSTER_DEFS.morningmood.name));

    await page.evaluate(() => {
      const state = window.Wordbound.Game._state;
      state.duel.healthBlocks = 1;
      state.duel.gauge = window.Wordbound.Duel.GAUGE_MIN + 2;
    });
    await page.waitForFunction(() => window.Wordbound.Game._state.screen === 'GAME_OVER', { timeout: 5000 });
    check('a real tick-loop Verse loss against a REGULAR ends the run for real (not just bosses)', await page.evaluate(() => window.Wordbound.Game._state.screen === 'GAME_OVER'));
    check('the real GAME_OVER screen renders ("The Well Ran Dry")', await page.isVisible('h1:has-text("The Well Ran Dry")'));
    check('combatActive is cleared on defeat', await page.evaluate(() => window.Wordbound.Game._state.combatActive === false));

    // ---- PART 2 (this run, REGULAR ENEMIES mid-tier wiring): a fresh run
    // to smoke-test the two real 'normal'-tier duel regulars the same way
    // -- WIN via gnossienne, LOSS via invention. A fresh run (not more
    // forced fights piled onto the same floor) because the floor-1 loss
    // above already ended the first run at GAME_OVER. `enterForcedRegularDuel`
    // writes `node.defId` directly, bypassing floor.js's real tier pool
    // (PLAYTEST FINDINGS 2 item 2, GOALS.md: floor 1 is 'weak'-tier only
    // now, so no NATURAL floor-1 draw would ever land on a 'normal' def --
    // that's exactly why the force is needed here) -- no floor advance is
    // needed either way, since forcing works on any uncleared combat node.
    await page.click('button:has-text("Main Menu")');
    await page.waitForSelector('#screen-main-menu');
    await page.click('button:has-text("New Run")');
    await page.waitForSelector('#screen-character-select');
    await page.fill('#run-seed-input', SEED + '-mid');
    await page.click(`.character-option:has-text("${CHARACTER_NAME}")`);
    await page.waitForSelector('.node-map');

    // ---- WIN: gnossienne (mid tier) ----
    await enterForcedRegularDuel(page, 'gnossienne');
    check('mid-tier regular fight starts in duel mode', await page.evaluate(() => window.Wordbound.Game._state.monster.duel === true));
    check('the real gnossienne def (name/glyph/tier) reaches the live monster instance', await page.evaluate(() => {
      const m = window.Wordbound.Game._state.monster;
      const def = window.Wordbound.Monsters.MONSTER_DEFS.gnossienne;
      return m.name === def.name && m.glyph === def.glyph && m.tier === 'normal';
    }));
    check('the duel piece is the real vetted mid-tier piece (stageTier + PD vetting)', await page.evaluate(() => {
      const piece = window.Wordbound.Game._state.duelPiece;
      return piece && piece.stageTier === 'mid' && piece.vetting && piece.vetting.publicDomain === true;
    }));
    const midWord = await winDuelViaRealWord(page);
    check(`mid-tier regular #1 (The Gnossienne) killed via a real submitted word (${midWord})`, !!midWord);
    check('no tile-reward panel after the mid-tier regular kill', !(await page.isVisible('.treasure-panel:has-text("Add a tile to your deck?")')));
    await page.waitForSelector('.node-map');

    // ---- LOSS: invention (mid tier), a fresh node on the same floor ----
    await enterForcedRegularDuelAnywhereOnFloor(page, 'invention');
    check('second mid-tier regular fight also starts in duel mode', await page.evaluate(() => window.Wordbound.Game._state.monster.duel === true));
    check('second mid-tier regular is the real Invention def', await page.evaluate(() => window.Wordbound.Game._state.monster.name === window.Wordbound.Monsters.MONSTER_DEFS.invention.name));
    await page.evaluate(() => {
      const state = window.Wordbound.Game._state;
      state.duel.healthBlocks = 1;
      state.duel.gauge = window.Wordbound.Duel.GAUGE_MIN + 2;
    });
    await page.waitForFunction(() => window.Wordbound.Game._state.screen === 'GAME_OVER', { timeout: 5000 });
    check('a real tick-loop Verse loss against a mid-tier regular ends the run for real', await page.evaluate(() => window.Wordbound.Game._state.screen === 'GAME_OVER'));

    // ---- PART 3 (this run, REGULAR ENEMIES normal-tier 100% cutover): a
    // third fresh run for The Metronome -- the mid tier's 3rd and final
    // regular, wired alongside retiring the last 3 old generic normal-tier
    // defs. A third fresh run rather than piling onto the second run's own
    // floor because the invention loss above already ended that run at
    // GAME_OVER (same reasoning PART 2's own comment gives for starting
    // fresh after PART 1's loss); uses the simple row-0
    // enterForcedRegularDuel (not the "anywhere on floor" variant) since
    // it's this run's first fight, matching PART 1/2's own first-fight
    // convention.
    await page.click('button:has-text("Main Menu")');
    await page.waitForSelector('#screen-main-menu');
    await page.click('button:has-text("New Run")');
    await page.waitForSelector('#screen-character-select');
    await page.fill('#run-seed-input', SEED + '-mid2');
    await page.click(`.character-option:has-text("${CHARACTER_NAME}")`);
    await page.waitForSelector('.node-map');

    // ---- WIN: metronome (mid tier, 3rd and final mid-tier regular) ----
    await enterForcedRegularDuel(page, 'metronome');
    check('third mid-tier regular fight also starts in duel mode', await page.evaluate(() => window.Wordbound.Game._state.monster.duel === true));
    check('the real metronome def (name/glyph/tier) reaches the live monster instance', await page.evaluate(() => {
      const m = window.Wordbound.Game._state.monster;
      const def = window.Wordbound.Monsters.MONSTER_DEFS.metronome;
      return m.name === def.name && m.glyph === def.glyph && m.tier === 'normal';
    }));
    check('the duel piece is the real vetted mid-tier piece (stageTier + PD vetting)', await page.evaluate(() => {
      const piece = window.Wordbound.Game._state.duelPiece;
      return piece && piece.stageTier === 'mid' && piece.vetting && piece.vetting.publicDomain === true;
    }));
    const metronomeWord = await winDuelViaRealWord(page);
    check(`mid-tier regular #3 (The Metronome) killed via a real submitted word (${metronomeWord})`, !!metronomeWord);
    check('no tile-reward panel after The Metronome kill; straight back to the map', !(await page.isVisible('.treasure-panel:has-text("Add a tile to your deck?")')) && (await page.isVisible('.node-map')));

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
