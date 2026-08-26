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
// Peak-picking gets its OWN, much lighter smoothing. 0.6 s is right for the
// intensity curve the tug reads continuously, but it flattens the piece to one
// local maximum every ~2 s, which caps how often the song can possibly attack
// no matter how lenient the test gets. Detection looks at a sharper copy.
const PEAK_SMOOTH_SEC = 0.18;
const MIN_INT = 0.12;     // the intensity band the sequenced pieces occupy,
const MAX_INT = 0.70;     //   matched so tug balance carries over unchanged
const KEYFRAME_TOL = 0.012; // drop a point this close to the line through its neighbours
const SURGE_LOOKBACK = 3; // a surge's climb is measured over this many seconds
// The surge test gets LENIENT fast, so the song goes from picking its moments
// to hammering within the first half-minute. The ramp is measured in SECONDS
// of the recording, not in fraction of it: the escalation the player feels
// should be the same whether the piece runs three minutes or thirty.
//
// RAMP_FROM is the prep window (tugOfWar's PREP_SEC), because attacks are
// dropped until the fight actually starts -- so the strict end of the ramp
// lines up with the fight's first second rather than being spent on silence.
const SURGE_RAMP_FROM = 5;      // seconds: strictest here...
const SURGE_RAMP_TO = 18;       // ...fully lenient here, and stays there
const SURGE_RISE_START = 0.14;  // climb required at the strict end
const SURGE_RISE_END = 0.015;   // ...and once the ramp has topped out
const SURGE_GAP_START = 5.5;    // seconds two surges must be apart, strict end
const SURGE_GAP_END = 0.55;     // ...and once the ramp has topped out

// Decoding is the slow part (headless Chromium, several seconds) and it never
// changes while the mp3 does not, so the raw envelope is cached. NOT beside the
// audio: public/ is copied verbatim into the build, and a few thousand floats
// of scratch data have no business being deployed. Pass --fresh to re-decode.
const CACHE = path.join(ROOT, '.cache', path.basename(IN) + '.env.json');

async function decodeEnvelope() {
  if (!args.includes('--fresh') && fs.existsSync(CACHE)
      && fs.statSync(CACHE).mtimeMs >= fs.statSync(IN).mtimeMs) {
    return JSON.parse(fs.readFileSync(CACHE, 'utf8'));
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
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  fs.writeFileSync(CACHE, JSON.stringify(raw));
  return raw;
}

(async () => {
  if (!fs.existsSync(IN)) {
    console.error('no such audio file: ' + IN);
    process.exit(1);
  }
  const raw = await decodeEnvelope();
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

  // Peaks are picked off a sharper copy than the one the keyframes come from.
  const peakNorm = (() => {
    const Wp = Math.round(PEAK_SMOOTH_SEC / hopSec);
    const s2 = env.map((_, i) => {
      let a = 0, n = 0;
      for (let j = Math.max(0, i - Wp); j <= Math.min(env.length - 1, i + Wp); j++) { a += env[j]; n++; }
      return a / n;
    });
    const so = [...s2].sort((a, b) => a - b);
    const hi = so[Math.floor(so.length * 0.95)], lo = so[Math.floor(so.length * 0.05)];
    return s2.map((v) => {
      const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
      return +(MIN_INT + t * (MAX_INT - MIN_INT)).toFixed(3);
    });
  })();

  const back = Math.round(SURGE_LOOKBACK / hopSec);
  // Eased slightly OUTWARD, not inward: the loosening has to be audible while
  // it is happening, so most of it lands in the first half of the ramp and the
  // tail just tops it off.
  const lerp = (a, b, t) => {
    const e = Math.pow(Math.max(0, Math.min(1, t)), 0.85);
    return a + (b - a) * e;
  };
  const surges = [];
  for (let i = back; i < peakNorm.length - 1; i++) {
    if (!(peakNorm[i] >= peakNorm[i - 1] && peakNorm[i] > peakNorm[i + 1])) continue;
    const progress = (i * hopSec - SURGE_RAMP_FROM) / (SURGE_RAMP_TO - SURGE_RAMP_FROM);
    const needRise = lerp(SURGE_RISE_START, SURGE_RISE_END, progress);
    const needGap = lerp(SURGE_GAP_START, SURGE_GAP_END, progress);
    let lo = Infinity;
    for (let j = i - back; j < i; j++) lo = Math.min(lo, peakNorm[j]);
    if (peakNorm[i] - lo < needRise) continue;
    // Detection used the sharp copy; the numbers the fight reads come from the
    // same smoothed curve as the keyframes, so a surge's intensity always
    // agrees with the envelope around it.
    const t = +(i * hopSec).toFixed(2);
    const hit = { sec: t, intensity: norm[i], rise: +(peakNorm[i] - lo).toFixed(3) };
    const prev = surges[surges.length - 1];
    if (prev && t - prev.sec < needGap) {
      if (hit.intensity > prev.intensity) surges[surges.length - 1] = hit;
      continue;
    }
    surges.push(hit);
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
  // Reported in 10-second buckets over the first minute, because the ramp is
  // measured in seconds and that is the stretch it is actually shaping.
  const buckets = [0, 0, 0, 0, 0, 0];
  let early = 0;
  surges.forEach((s2) => {
    if (s2.sec < 60) { buckets[Math.floor(s2.sec / 10)]++; early++; }
  });
  console.log('  surges     ' + surges.length + ' total, '
    + (surges.length / duration * 60).toFixed(1) + '/min overall');
  console.log('  first 60s  ' + buckets.join(' / ')
    + '  (per 10s bucket, ' + early + ' in the first minute)');
  console.log('  wrote      ' + path.relative(ROOT, OUT));
})();
