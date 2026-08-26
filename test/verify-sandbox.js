#!/usr/bin/env node
// test/verify-sandbox.js
//
// The bar for the bare-bones tug sandbox (sandbox.html -> src/sandbox/): a real
// browser loads the BUILT sandbox entry, starts one fight, and the tug-of-war
// actually runs -- the recording plays, the word maker finds a word, playing it
// banks a pusher that generates force, the song telegraphs and lands a burst,
// and nothing throws.
//
// SMOKE ONLY, ON PURPOSE. The sandbox is where the mechanic is being played
// with, so this file must not pin down anything that is still being tuned:
// no constants (ROPE_START, the intensity band, surge counts), no phase names,
// no wording, no which-opponent-is-first, no button-level UI behaviour.
// If a check would fail merely because a number was tuned, it does not belong
// here. What is fair game: it builds, it loads, it does not drag the run
// structure in, it makes sound, a word does something, an attack happens,
// nothing errors.
//
// Run with `npm run test:sandbox`.

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
const PORT = Number(process.env.WB_PORT) || 9887;
const SEED = 'sandbox';

const MIME_TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

let failures = 0;
function check(label, cond) {
  console.log((cond ? 'OK   ' : 'FAIL ') + label);
  if (!cond) failures++;
}

function startServer(rootDir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      const filePath = path.join(rootDir, urlPath === '/' ? 'index.html' : urlPath);
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function main() {
  // tools/run-gates.js builds ONCE and hands every gate the same dist/, so
  // six gates no longer run six identical `vite build`s. Running this file
  // on its own still builds -- WB_SKIP_BUILD is only set by the runner.
  if (!process.env.WB_SKIP_BUILD) {
    execFileSync('npx', ['vite', 'build'], { cwd: ROOT, stdio: 'inherit' });
  }
  check('dist/app/sandbox.html exists after build', fs.existsSync(path.join(DIST_DIR, 'sandbox.html')));

  const server = await startServer(DIST_DIR);
  let browser;
  try {
    const sandboxChromiumPath = '/opt/pw-browsers/chromium';
    const launchOpts = { headless: true, args: ['--autoplay-policy=no-user-gesture-required'] };
    if (fs.existsSync(sandboxChromiumPath)) launchOpts.executablePath = sandboxChromiumPath;
    browser = await chromium.launch(launchOpts);
    const page = await browser.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    // The webfonts are a third-party host; whether they resolve depends on the
    // machine's network, not on the build, so they don't gate the smoke test.
    const badRequests = [];
    const isFontHost = (url) => /fonts\.(googleapis|gstatic)\.com/.test(url);
    page.on('requestfailed', (r) => { if (!isFontHost(r.url())) badRequests.push(r.url()); });
    page.on('response', (r) => {
      if (r.status() >= 400 && !isFontHost(r.url())) badRequests.push(r.url() + ' -> ' + r.status());
    });
    // The opening opponent is a RECORDING, so the mp3 actually reaching the
    // page is part of the fight working at all.
    const audioResponses = [];
    page.on('response', (r) => {
      if (/\.mp3(\?|$)/.test(r.url())) audioResponses.push(r.status());
    });

    await page.goto(`http://localhost:${PORT}/sandbox.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.Wordbound && window.Wordbound.Sandbox, { timeout: 15000 });

    check('zero failed requests loading the built sandbox', badRequests.length === 0);
    badRequests.forEach((b) => console.log('  BAD REQUEST:', b));

    // Not a tuning check -- a standing-rule check. The recording is the one
    // logged exception to synthesized-audio-only (GOALS.md header), and it is
    // only defensible while it keeps saying what it actually is. How many
    // keyframes or surges the analysis produced is tuning, and is not asserted.
    // Every recorded piece, not just the first one -- a second recording that
    // quietly skipped the honest label would be the exact thing this guards.
    const recs = await page.evaluate(() => {
      const S = window.Wordbound.Sandbox;
      return Object.keys(S).filter((k) => /^recorded/.test(k)).map((k) => {
        const p = S[k];
        const d = p.dynamics || {};
        return {
          key: k,
          keyframes: (d.keyframes || []).length,
          surges: (d.surges || []).length,
          licensedHonestly: !!(p.licensing && /public domain/i.test(p.licensing.composition)
            && /NOT public domain/i.test(p.licensing.recording)),
        };
      });
    });
    check('at least one recorded piece is present (' + recs.length + ')', recs.length > 0);
    check('every recording is labelled PD composition / non-PD recording (not PD-vetted)',
      recs.length > 0 && recs.every((r) => r.licensedHonestly));
    check('every recorded piece carries an envelope and surges ('
      + recs.map((r) => r.key + ': ' + r.keyframes + 'kf/' + r.surges + 's').join(', ') + ')',
      recs.length > 0 && recs.every((r) => r.keyframes > 0 && r.surges > 0));

    // The sandbox must NOT drag the run structure or the shipped duel engine in
    // with it -- that is the whole reason it exists.
    const loaded = await page.evaluate(() => Object.keys(window.Wordbound));
    const forbidden = ['Game', 'Floor', 'Items', 'Monsters', 'Duel', 'DuelCombat', 'Combat', 'Intents'];
    const leaked = forbidden.filter((k) => loaded.includes(k));
    check('no run-structure or duel-engine modules loaded (' + (leaked.join(', ') || 'clean') + ')', leaked.length === 0);

    // Three tile bags, and every one of them bigger than a rack -- a bag the
    // size of the rack would deal the same seven tiles every cycle. Not a
    // tuning check: the COUNTS are being tuned freely, the shape is not.
    const bags = await page.evaluate(() => {
      const S = window.Wordbound.Sandbox;
      return (S.TILE_BAGS || []).map((b) => ({ id: b.id, size: S.createBagDeck(b.id).length }));
    });
    check('three tile bags, each bigger than a rack ('
      + bags.map((b) => b.id + ':' + b.size).join(', ') + ')',
      bags.length === 3 && bags.every((b) => b.size > 7));

    await page.fill('.sb-setup input', SEED);
    await page.click('button:has-text("Start fight")');
    await page.waitForSelector('.sb-rope');

    const tugState = () => page.evaluate(() => {
      const t = window.__tug;
      return {
        phase: t.phase, rope: t.rope, db: t.db,
        pushers: t.pushers.length, pool: t.poolStrength(),
        force: t.playerForce(), attacks: t.attacks.length,
      };
    });

    // The opening opponent is a RECORDING, and the title alone proves nothing
    // (the sequenced piece has the same title). Assert the KIND of player.
    const playing = await page.evaluate(() => {
      const s = window.__seq, p = window.__piece;
      return { isRecording: !!(p && p.audio), playing: !!(s && s.isPlaying), pos: s ? s.currentBeat() : -1 };
    });
    check('the piece actually sounding is the recording, not the sequencer',
      playing.isRecording === true);
    check('the mp3 was fetched and served (' + (audioResponses.join(',') || 'none') + ')',
      audioResponses.length > 0 && audioResponses.every((s) => s === 200 || s === 206));
    // Not "is it playing this instant" -- several MB have to arrive and decode.
    // The requirement is that the fight does not sit in silence, so give it a
    // bounded window and report how long it actually took.
    const startedAt = Date.now();
    let started = true;
    await page.waitForFunction(() => window.__seq && window.__seq.isPlaying, { timeout: 10000 })
      .catch(() => { started = false; });
    check('the recording starts sounding promptly (' + (Date.now() - startedAt) + 'ms after start)',
      started);

    // The envelope must actually drive the fight: the position advances and
    // intensity is read off it. Deliberately NOT a rate assertion -- headless
    // Chromium renders audio in bursts, so wall-clock and AudioContext time do
    // not track each other. The requirement is that playback moves at all.
    const from = playing.pos;
    await page.waitForFunction((p0) => window.__seq.currentBeat() > p0 + 0.5,
      from, { timeout: 15000 }).catch(() => {});
    const later = await page.evaluate(() => {
      const s = window.__seq;
      return { pos: s.currentBeat(), i: s.getIntensity() };
    });
    check('the recording advances (' + from.toFixed(2)
      + 's -> ' + later.pos.toFixed(2) + 's)', later.pos > from + 0.5);
    check('intensity is read from the envelope (' + later.i.toFixed(3) + ')',
      Number.isFinite(later.i) && later.i > 0);

    // Word maker: feed it the real rack and take its top suggestion.
    //
    // The list lives in a <details> that starts CLOSED, and Chromium reports a
    // closed details' contents as not-visible -- so waitForSelector's default
    // state:'visible' would sit there until it timed out. Open the drawer,
    // which is what a player does, and everything below reads as it always did.
    await page.click('button:has-text("Best play")');
    await page.click('.sb-suggests-drop > summary');
    await page.waitForSelector('.sb-suggest', { timeout: 20000 });
    const suggested = (await page.textContent('.sb-suggest')).replace(/[^A-Z]/g, '');
    check('best-play helper finds a word spellable from the rack', suggested.length >= 2);

    // The point of the word maker: scrambled letters rearrange themselves.
    const scrambled = suggested.split('').reverse().join('');
    await page.fill('.sb-input input', scrambled);
    await page.waitForTimeout(250);
    const topFor = (await page.textContent('.sb-suggest')).replace(/[^A-Z]/g, '');
    check('scrambled letters (' + scrambled + ') rearrange to a word', topFor.length >= 2);

    await page.press('.sb-input input', 'Enter');
    await page.waitForTimeout(320);
    const banked = await tugState();
    check('sending a word banks it as a pusher', banked.pushers >= 1);

    // A fresh word ramps in over PUSHER_RAMP_SEC, so its force starts at zero
    // by design -- poll until it has taken hold rather than sampling once.
    let ramped = banked.force;
    for (let i = 0; i < 20 && !(ramped > 0); i++) {
      await page.waitForTimeout(200);
      ramped = (await tugState()).force;
    }
    check('the pusher ramps in and generates rightward force', ramped > 0);

    let sawTelegraph = false;
    for (let i = 0; i < 60 && !sawTelegraph; i++) {
      await page.waitForTimeout(250);
      sawTelegraph = (await page.$$('.sb-flynote')).length > 0;
    }
    check('an attack telegraphs as a note sliding in', sawTelegraph);

    // Landing is read off the model, not off log wording, which is prose and
    // changes freely. `rope` moving off its start under attack is enough.
    let landed = false;
    for (let i = 0; i < 80 && !landed; i++) {
      await page.waitForTimeout(250);
      landed = await page.evaluate(() => window.__tug.lastHitAt > 0);
    }
    check('a telegraphed attack lands', landed);

    // AND IT LANDS EARLY. The complaint this guards is "the enemy doesn't
    // attack for the first 10 seconds or so" -- which it did not, for every
    // opponent: the tacet swallowed each swell announced during it, the size
    // gate turned away everything the opening had, and a sequenced piece had
    // barely any marked crescendos to announce in the first place. Read off the
    // model's own clock rather than wall time, and bounded generously: this is
    // a regression guard against a silent opening, not a pin on any constant.
    const opening = await page.evaluate(() => {
      const t = window.__tug;
      return t.firstHitAt > 0 ? t.firstHitAt - t.startedAt : -1;
    });
    check('the pit comes in inside the first 10 seconds ('
      + (opening < 0 ? 'never' : opening.toFixed(1) + 's') + ')',
      opening > 0 && opening < 10);

    check('no console/page errors during the fight', errors.length === 0);
    errors.forEach((e) => console.log('  ERROR:', e));
  } finally {
    if (browser) await browser.close();
    server.close();
  }

  console.log(failures === 0 ? '\nAll sandbox checks passed.' : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
