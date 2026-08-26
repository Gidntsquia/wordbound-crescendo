#!/usr/bin/env node
// test/verify-sandbox.js
//
// The bar for the bare-bones tug sandbox (sandbox.html -> src/sandbox/): a real
// browser loads the BUILT sandbox entry, starts one fight, and the tug-of-war
// actually runs -- the prep window holds the rope still, the word maker finds a
// word the rack can spell, playing it creates a pusher that generates force,
// the song telegraphs and lands a burst once prep ends, the dB ramp climbs, and
// nothing throws.
//
// Deliberately small: this is the sandbox's smoke gate, not a balance test.
//
// Run with `npm run test:sandbox`.

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');
const { chromium } = require('@playwright/test');

const ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist', 'app');
const PORT = 9887;
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
  execFileSync('npx', ['vite', 'build'], { cwd: ROOT, stdio: 'inherit' });
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
    // The recorded piece carries the envelope the tug needs, because an mp3
    // cannot tell the fight what it is about to do. See recordedFurElise.js.
    const rec = await page.evaluate(() => {
      const p = window.Wordbound.Sandbox.recordedFurElise;
      if (!p) return null;
      const d = p.dynamics || {};
      const ints = (d.keyframes || []).map((k) => k.intensity);
      return {
        audio: p.audio, duration: p.durationSec,
        keyframes: (d.keyframes || []).length, surges: (d.surges || []).length,
        minInt: Math.min.apply(null, ints), maxInt: Math.max.apply(null, ints),
        monotonic: (d.keyframes || []).every((k, i, a) => i === 0 || k.sec > a[i - 1].sec),
        licensedHonestly: !!(p.licensing && /public domain/i.test(p.licensing.composition)
          && /NOT public domain/i.test(p.licensing.recording)),
      };
    });
    check('the recorded Für Elise carries an intensity envelope and surge list',
      !!rec && rec.keyframes > 40 && rec.surges > 5 && rec.monotonic
      && rec.minInt >= 0.1 && rec.maxInt <= 0.75);
    check('the recording is labelled PD composition / non-PD recording (not PD-vetted)',
      !!rec && rec.licensedHonestly);
    badRequests.forEach((b) => console.log('  BAD REQUEST:', b));

    // The sandbox must NOT drag the run structure or the shipped duel engine in
    // with it -- that is the whole reason it exists.
    const loaded = await page.evaluate(() => Object.keys(window.Wordbound));
    const forbidden = ['Game', 'Floor', 'Items', 'Monsters', 'Duel', 'DuelCombat', 'Combat', 'Intents'];
    const leaked = forbidden.filter((k) => loaded.includes(k));
    check('no run-structure or duel-engine modules loaded (' + (leaked.join(', ') || 'clean') + ')', leaked.length === 0);

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

    const opening = await tugState();
    check('fight opens in the prep window', opening.phase === 'prep');
    check('rope starts at ROPE_START (50)', Math.abs(opening.rope - 50) < 0.01);

    check('the opening fight names Für Elise',
      (await page.textContent('.sb-pit-piece')).includes('Für Elise'));
    // Title alone proves nothing -- the sequenced piece is also called
    // "Für Elise". Assert the piece actually sounding is the RECORDING.
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

    // The envelope must actually drive the fight: the position advances in
    // real time and intensity moves with it, inside the documented band.
    await page.waitForTimeout(2500);
    const later = await page.evaluate(() => {
      const s = window.__seq;
      return { pos: s.currentBeat(), i: s.getIntensity() };
    });
    check('the recording advances in real time (' + playing.pos.toFixed(2)
      + 's -> ' + later.pos.toFixed(2) + 's)', later.pos > playing.pos + 1);
    check('intensity is read from the envelope, in band (' + later.i.toFixed(3) + ')',
      later.i >= 0.1 && later.i <= 0.75);

    // Word maker: feed it the real rack and take its top suggestion.
    await page.click('button:has-text("Best play")');
    await page.waitForSelector('.sb-suggest', { timeout: 20000 });
    const suggested = (await page.textContent('.sb-suggest')).replace(/[^A-Z]/g, '');
    check('best-play helper finds a word spellable from the rack', suggested.length >= 2);

    // The point of the rework: scrambled letters rearrange themselves. Type the
    // suggestion's own letters out of order and it must come back as the top
    // result, with the tiles it consumes marked as picked up.
    const scrambled = suggested.split('').reverse().join('');
    await page.fill('.sb-input input', scrambled);
    await page.waitForTimeout(250);
    const topFor = (await page.textContent('.sb-suggest')).replace(/[^A-Z]/g, '');
    check('scrambled letters (' + scrambled + ') rearrange to a word', topFor.length >= 2);
    check('every letter typed is shown picked up from the rack',
      (await page.$$('.sb-tile.is-picked')).length === scrambled.length);


    // Enter sends the best rearrangement -- you never have to spell it yourself.
    await page.press('.sb-input input', 'Enter');
    await page.waitForTimeout(200);
    const played = await page.evaluate(() => window.__tug.pushers.map((p) => p.word));
    check('Enter sends the best rearrangement without retyping it',
      played.length === 1 && played[0] === topFor);
    check('the field clears after the word is sent',
      (await page.inputValue('.sb-input input')) === '');
    await page.waitForTimeout(120);
    const banked = await tugState();
    check('the sent word is banked as a pusher', banked.pushers === 1);
    check('the rope stays frozen during prep', Math.abs(banked.rope - 50) < 0.01);

    // A fresh word ramps in over PUSHER_RAMP_SEC, so its force starts at zero
    // by design -- poll until it has taken hold rather than sampling once.
    let ramped = banked.force;
    for (let i = 0; i < 20 && !(ramped > 0); i++) {
      await page.waitForTimeout(200);
      ramped = (await tugState()).force;
    }
    check('the pusher ramps in and generates rightward force', ramped > 0);

    // Prep ends, the song starts telegraphing bursts.
    await page.waitForFunction(() => window.__tug.phase === 'fight', { timeout: 15000 });
    check('prep ends and the fight starts', true);

    let sawTelegraph = false;
    for (let i = 0; i < 60 && !sawTelegraph; i++) {
      await page.waitForTimeout(250);
      sawTelegraph = (await page.$$('.sb-flynote')).length > 0;
    }
    check('an attack telegraphs as a note sliding in', sawTelegraph);

    await page.waitForFunction(() => /hit /.test(document.querySelector('.sb-log').textContent), { timeout: 20000 })
      .then(() => check('a telegraphed attack lands', true))
      .catch(() => check('a telegraphed attack lands', false));

    const mid = await tugState();
    check('the dB ramp is climbing', mid.db > 0);
    check('words are still pushing (pool intact or rebuilt)', mid.pool >= 0);

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
