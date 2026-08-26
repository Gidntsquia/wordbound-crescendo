#!/usr/bin/env node
// test/verify-music-engine.js
//
// MUSIC ENGINE ticket (GOALS.md, 2026-08-21): real-browser proof that the
// sequencer (js/wordbound/music.js) schedules REAL Web Audio nodes without
// error against a REAL AudioContext, in a real Chromium tab -- something
// src/test/music.test.js's fake-AudioContext unit tests cannot prove (jsdom
// has no Web Audio API at all). Runs against the actual `vite build` output
// statically served, never the dev server, same bar as
// verify-react-build.js / verify-react-qa-boss-reward.js.
//
// What this proves:
//   1. window.Wordbound.Music and window.Wordbound.Pieces.mountainKing are
//      both present on the built app (the two new modules loaded and
//      attached correctly).
//   2. A real AudioContext accepts a sequencer for the full Mountain King
//      piece: play() schedules real OscillatorNode/GainNode graphs (proven
//      by instrumenting AudioContext.prototype.createOscillator before the
//      game scripts load, same technique verify-audio-context.js already
//      uses), oscillators actually reach started (o.start() called), and
//      every note's gain connects through the sequencer's own destination
//      node -- never straight to ctx.destination -- so mute/volume routing
//      works for real, not just against the unit test's fake graph.
//   3. getIntensity() returns a real, non-decreasing-until-reset number in
//      [0, 1] as real wall-clock time passes (spot-checked, not exhaustive
//      -- exact scheduling math is the unit suite's job).
//   4. stop() halts scheduling and produces zero console/page errors
//      throughout, including during a real AudioContext's own internal
//      lifecycle (suspended -> running on the page's first gesture, per the
//      resume-on-gesture fix this module was told to reuse, not reimplement).
// Does NOT and cannot verify: audible musicality (Jaxon's call, as always)
// or precise crescendo-event timing (the unit suite's mocked-clock tests
// own that; a real AudioContext's wall-clock can't be paused/scrubbed for a
// deterministic assertion here).
//
// Run with `npm run test:music-engine` (or `node test/verify-music-engine.js`).

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

    // Instrument real oscillator/gain construction before any game script
    // runs, same technique verify-audio-context.js already uses -- lets us
    // count real nodes and inspect real .connect() targets from outside.
    await page.addInitScript(() => {
      window.__musicProbe = { oscillatorsCreated: 0, oscillatorsStarted: 0, gainsCreated: 0, destinationConnections: 0 };
      const OrigOsc = window.OscillatorNode;
      const origCreateOscillator = window.AudioContext.prototype.createOscillator;
      window.AudioContext.prototype.createOscillator = function (...args) {
        const node = origCreateOscillator.apply(this, args);
        window.__musicProbe.oscillatorsCreated++;
        const origStart = node.start.bind(node);
        node.start = function (...startArgs) { window.__musicProbe.oscillatorsStarted++; return origStart(...startArgs); };
        return node;
      };
      const origCreateGain = window.AudioContext.prototype.createGain;
      window.AudioContext.prototype.createGain = function (...args) {
        const node = origCreateGain.apply(this, args);
        window.__musicProbe.gainsCreated++;
        const origConnect = node.connect.bind(node);
        node.connect = function (dest, ...connectArgs) {
          // Exclude the test's OWN destination gain node (window.__seqDest,
          // set up below) forwarding to real speakers -- that connection is
          // expected and correct. What must NEVER happen is a NOTE's gain
          // (one music.js creates per scheduled note) connecting straight to
          // ctx.destination, bypassing the sequencer's destination node
          // entirely -- that would break mute/volume routing for real.
          if (dest === this.context.destination && node !== window.__seqDest) window.__musicProbe.destinationConnections++;
          return origConnect(dest, ...connectArgs);
        };
        return node;
      };
      void OrigOsc;
    });

    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.Wordbound?.Game, { timeout: 15000 });

    check('window.Wordbound.Music is present', await page.evaluate(() => typeof window.Wordbound.Music === 'object'));
    check('window.Wordbound.Pieces.mountainKing is present', await page.evaluate(() => typeof window.Wordbound.Pieces?.mountainKing === 'object'));

    // A real user gesture, same as every other audio check in this repo --
    // AudioContext starts 'suspended' without one.
    await page.click('body');

    const setup = await page.evaluate(() => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const destination = ctx.createGain();
      window.__seqCtx = ctx;
      window.__seqDest = destination; // must be set BEFORE connect() below, or the probe's exclusion check misses it
      destination.connect(ctx.destination);
      const piece = window.Wordbound.Pieces.mountainKing;
      const seq = window.Wordbound.Music.createSequencer(ctx, destination, piece, { tickMs: 25, lookaheadSec: 0.2 });
      window.__seq = seq;
      return { contextState: ctx.state, lengthBeats: piece.lengthBeats, tempoIsArray: Array.isArray(piece.tempo) };
    });
    check('a real AudioContext was constructed', setup.contextState === 'running' || setup.contextState === 'suspended');
    check('Mountain King has a positive lengthBeats', setup.lengthBeats > 0);
    check('Mountain King carries tempo breakpoints (the accelerando)', setup.tempoIsArray === true);

    await page.evaluate(() => window.__seq.play());
    await page.waitForTimeout(400); // real wall-clock: let a few scheduler ticks + a couple of notes actually run

    const midPlay = await page.evaluate(() => ({
      isPlaying: window.__seq.isPlaying,
      intensity: window.__seq.getIntensity(),
      currentBeat: window.__seq.currentBeat(),
      contextState: window.__seqCtx.state,
      probe: window.__musicProbe,
    }));
    check('sequencer is playing after play() + real elapsed time', midPlay.isPlaying === true);
    check('AudioContext reached "running" after the gesture + play()', midPlay.contextState === 'running');
    check('getIntensity() returns a real number in [0, 1]', typeof midPlay.intensity === 'number' && midPlay.intensity >= 0 && midPlay.intensity <= 1);
    check('currentBeat() advanced past 0 as real time passed', midPlay.currentBeat > 0);
    check('at least one real OscillatorNode was created', midPlay.probe.oscillatorsCreated > 0);
    check('every created oscillator was actually started', midPlay.probe.oscillatorsStarted === midPlay.probe.oscillatorsCreated);
    check('at least one real GainNode was created for a scheduled note', midPlay.probe.gainsCreated > 0);
    check('no note connected straight to ctx.destination (mute/volume must route through the sequencer\'s own destination node)', midPlay.probe.destinationConnections === 0);

    await page.evaluate(() => window.__seq.stop());
    const afterStop = await page.evaluate(() => ({ isPlaying: window.__seq.isPlaying }));
    check('stop() halts the sequencer', afterStop.isPlaying === false);

    check('zero console/page errors throughout', consoleErrors.length === 0);
    if (consoleErrors.length) console.log('  errors: ' + consoleErrors.join(' | '));
    check('zero failed requests loading the built bundle', failedRequests.length === 0);
    if (failedRequests.length) console.log('  failed: ' + failedRequests.join(' | '));
  } finally {
    if (browser) await browser.close();
    server.close();
  }

  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
