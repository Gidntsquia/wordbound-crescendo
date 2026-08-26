#!/usr/bin/env node
// tools/analyze-audio-piece.js
// Regenerates src/sandbox/recordedFurElise.js from public/audio/fur-elise.mp3.
//
// A recording cannot tell the tug what it is ABOUT to do, and the tug has to
// telegraph attacks before they land. So the audio is decoded once, offline,
// and reduced to the two things the mechanic needs: a loudness envelope
// (intensity) and a list of surges (the crescendos it telegraphs against).
//
// Decoding happens in headless Chromium via decodeAudioData because the repo
// has Playwright already and does not have ffmpeg.
//
//   node tools/analyze-audio-piece.js [--in public/audio/fur-elise.mp3]
//                                     [--out src/sandbox/recordedFurElise.js]
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
function arg(name, dflt) {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
}
const IN = path.resolve(ROOT, arg('in', 'public/audio/fur-elise.mp3'));
const OUT = path.resolve(ROOT, arg('out', 'src/sandbox/recordedFurElise.js'));
const PORT = 9893;

// Tuning for the reduction. Changing these changes the fight's feel.
const SMOOTH_SEC = 0.6;   // loudness is smoothed over this before normalising
const MIN_INT = 0.12;     // the intensity band the sequenced pieces occupy,
const MAX_INT = 0.70;     //   matched so tug balance carries over unchanged
const KEYFRAME_TOL = 0.012; // drop a point this close to the line through its neighbours
const SURGE_RISE = 0.10;  // a surge must climb this far above the recent floor
const SURGE_LOOKBACK = 3; // ...measured over this many seconds
const SURGE_GAP = 4;      // and surges nearer than this collapse to the loudest

(async () => {
  if (!fs.existsSync(IN)) {
    console.error('no such audio file: ' + IN);
    process.exit(1);
  }
  const { chromium } = require(path.join(ROOT, 'node_modules/playwright'));
  const dir = path.dirname(IN);
  const server = http.createServer((req, res) => {
    const f = path.join(dir, decodeURIComponent(req.url.split('?')[0]));
    fs.readFile(f, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
      res.end(data);
    });
  });
  await new Promise((r) => server.listen(PORT, r));

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:' + PORT + '/__blank').catch(() => {});
  await page.setContent('<html><body></body></html>');

  const raw = await page.evaluate(async ({ port, name, smoothSec }) => {
    const res = await fetch('http://localhost:' + port + '/' + name);
    const ab = await res.arrayBuffer();
    const ctx = new OfflineAudioContext(1, 48000, 48000);
    const buf = await ctx.decodeAudioData(ab);
    const d = buf.getChannelData(0), SR = buf.sampleRate;
    const HOP = Math.round(SR / 20); // ~20 Hz envelope
    const env = [];
    for (let i = 0; i + HOP <= d.length; i += HOP) {
      let sq = 0;
      for (let j = i; j < i + HOP; j++) sq += d[j] * d[j];
      env.push(Math.sqrt(sq / HOP));
    }
    let peak = 0;
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; }
    return { duration: +buf.duration.toFixed(2), peak: +peak.toFixed(3), hopSec: HOP / SR, env };
  }, { port: PORT, name: path.basename(IN), smoothSec: SMOOTH_SEC });

  await browser.close();
  server.close();

  const { env, hopSec, duration } = raw;
  const W = Math.round(SMOOTH_SEC / hopSec);
  const sm = env.map((_, i) => {
    let s = 0, n = 0;
    for (let j = Math.max(0, i - W); j <= Math.min(env.length - 1, i + W); j++) { s += env[j]; n++; }
    return s / n;
  });
  const sorted = [...sm].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p05 = sorted[Math.floor(sorted.length * 0.05)];
  const norm = sm.map((v) => {
    const t = Math.max(0, Math.min(1, (v - p05) / (p95 - p05)));
    return +(MIN_INT + t * (MAX_INT - MIN_INT)).toFixed(3);
  });

  const step = Math.round(1 / hopSec);
  const pts = [];
  for (let i = 0; i < norm.length; i += step) pts.push([+(i * hopSec).toFixed(2), norm[i]]);
  pts.push([+((norm.length - 1) * hopSec).toFixed(2), norm[norm.length - 1]]);
  const keep = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = keep[keep.length - 1], n = pts[i + 1], c = pts[i];
    const lin = p[1] + (n[1] - p[1]) * ((c[0] - p[0]) / (n[0] - p[0]));
    if (Math.abs(lin - c[1]) > KEYFRAME_TOL) keep.push(c);
  }
  keep.push(pts[pts.length - 1]);

  const back = Math.round(SURGE_LOOKBACK / hopSec);
  const surges = [];
  for (let i = back; i < norm.length - 1; i++) {
    if (!(norm[i] >= norm[i - 1] && norm[i] > norm[i + 1])) continue;
    let lo = Infinity;
    for (let j = i - back; j < i; j++) lo = Math.min(lo, norm[j]);
    if (norm[i] - lo < SURGE_RISE) continue;
    const t = +(i * hopSec).toFixed(2);
    const prev = surges[surges.length - 1];
    if (prev && t - prev.sec < SURGE_GAP) {
      if (norm[i] > prev.intensity) surges[surges.length - 1] = { sec: t, intensity: norm[i], rise: +(norm[i] - lo).toFixed(3) };
      continue;
    }
    surges.push({ sec: t, intensity: norm[i], rise: +(norm[i] - lo).toFixed(3) });
  }

  const existing = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  const header = existing.split('(function () {')[0];
  if (!header) {
    console.error('refusing to overwrite: ' + OUT + ' has no header comment to preserve');
    process.exit(1);
  }
  const body = header + `(function () {
  window.Wordbound = window.Wordbound || {};
  var Sandbox = (window.Wordbound.Sandbox = window.Wordbound.Sandbox || {});

  Sandbox.recordedFurElise = {
    id: 'fur-elise-recording',
    title: 'Für Elise',
    composer: 'Ludwig van Beethoven',
    // Relative so it resolves under GitHub Pages' project subpath and under
    // build-site.js's root-swap, both of which serve public/ verbatim.
    audio: 'audio/fur-elise.mp3',
    durationSec: ${duration},
    licensing: {
      composition: 'public domain (Beethoven, 1810; died 1827)',
      recording: 'Pixabay Content License -- NOT public domain',
      source: 'https://pixabay.com/music/search/fur%20elise/'
    },
    regularName: 'The Bagatelle',
    gimmick: 'Everyone knows the first eight notes. Nobody remembers what comes next.',
    stageTier: 'early',
    dynamics: {
      keyframes: [
${keep.map(([s, i]) => `        { sec: ${s}, intensity: ${i} }`).join(',\n')}
      ],
      surges: [
${surges.map((s) => `        { sec: ${s.sec}, intensity: ${s.intensity}, rise: ${s.rise} }`).join(',\n')}
      ]
    }
  };
})();
`;
  fs.writeFileSync(OUT, body);
  console.log('analysed ' + path.basename(IN));
  console.log('  duration   ' + duration + 's, peak ' + raw.peak);
  console.log('  keyframes  ' + keep.length + ' (from ' + pts.length + ' sampled)');
  console.log('  surges     ' + surges.length);
  console.log('  wrote      ' + path.relative(ROOT, OUT));
})();
