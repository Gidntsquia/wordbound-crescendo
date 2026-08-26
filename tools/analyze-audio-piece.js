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
// The surge test is FLAT and DELIBERATELY GREEDY. It is not trying to pick the
// piece's best moments -- it is trying to find every swell the recording has,
// from the main crescendos down to little phrase peaks and beat drops, and to
// say honestly how big each one is. WHICH of them actually swing is decided at
// runtime, by fight time, in tugOfWar's ATTACK_GATE_*: early on only the big
// ones do, and the bar falls until the whole list is live and the song swarms.
//
// Deciding that here instead -- as an earlier version did, by loosening the
// test as the recording played -- got it wrong twice over: it tied escalation
// to song position, so looping reset it, and it had no way to keep the big
// moments distinct from the noise it was letting through.
//
// The gap is what sets density; the rise test barely binds under it, because
// merging near-neighbours already keeps only the larger of any close pair.
const SURGE_MIN_RISE = 0.02;    // climb over SURGE_LOOKBACK to count at all
const SURGE_MIN_GAP = 0.7;      // seconds two surges must be apart

// `mag` is what the fight reads: 0 for the smallest swell in the recording,
// 1 for the biggest. Mostly how far it CLIMBS -- that is what a crescendo is
// -- with the level it reaches as a lesser term, so a hard climb into a loud
// peak outranks the same climb into a middling one.
const MAG_RISE_WEIGHT = 0.7;
const MAG_PEAK_WEIGHT = 0.3;

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
  const surges = [];
  for (let i = back; i < peakNorm.length - 1; i++) {
    if (!(peakNorm[i] >= peakNorm[i - 1] && peakNorm[i] > peakNorm[i + 1])) continue;
    let lo = Infinity;
    for (let j = i - back; j < i; j++) lo = Math.min(lo, peakNorm[j]);
    const rise = peakNorm[i] - lo;
    if (rise < SURGE_MIN_RISE) continue;
    // Detection used the sharp copy; the numbers the fight reads come from the
    // same smoothed curve as the keyframes, so a surge's intensity always
    // agrees with the envelope around it.
    const t = +(i * hopSec).toFixed(2);
    const hit = {
      sec: t,
      intensity: norm[i],
      rise: +rise.toFixed(3),
      raw: MAG_RISE_WEIGHT * rise + MAG_PEAK_WEIGHT * (peakNorm[i] - MIN_INT)
    };
    const prev = surges[surges.length - 1];
    // Two swells inside SURGE_MIN_GAP are one swell as far as the fight is
    // concerned, and the bigger reading is the honest one to keep.
    if (prev && t - prev.sec < SURGE_MIN_GAP) {
      if (hit.raw > prev.raw) surges[surges.length - 1] = hit;
      continue;
    }
    surges.push(hit);
  }

  // Rank the swells against EACH OTHER, not against an absolute scale, so a
  // quietly-played recording still has small and large hits rather than all
  // small ones. Percentiles rather than min/max so one outlier peak cannot
  // squash everything else into the bottom of the range.
  const rawSorted = surges.map((s2) => s2.raw).sort((a, b) => a - b);
  const magLo = rawSorted[Math.floor(rawSorted.length * 0.05)] || 0;
  const magHi = rawSorted[Math.floor(rawSorted.length * 0.95)] || 1;
  surges.forEach((s2) => {
    const t = magHi > magLo ? (s2.raw - magLo) / (magHi - magLo) : 0.5;
    s2.mag = +Math.max(0, Math.min(1, t)).toFixed(3);
    delete s2.raw;
  });

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
${surges.map((s) => `        { sec: ${s.sec}, intensity: ${s.intensity}, rise: ${s.rise}, mag: ${s.mag} }`).join(',\n')}
      ]
    }
  };
})();
`;
  fs.writeFileSync(OUT, body);
  console.log('analysed ' + path.basename(IN));
  console.log('  duration   ' + duration + 's, peak ' + raw.peak);
  console.log('  keyframes  ' + keep.length + ' (from ' + pts.length + ' sampled)');
  // Two things worth reporting. SIZE SPREAD, because a run where every swell
  // lands in one bucket leaves the fight nothing to show the player. And the
  // ATTACK RATE AT EACH GATE, because that is the swarm curve: the top row is
  // the opening bars, the bottom row is the song at full tilt.
  const hist = [0, 0, 0, 0, 0];
  surges.forEach((s2) => { hist[Math.min(4, Math.floor(s2.mag * 5))]++; });
  console.log('  surges     ' + surges.length + ' total, '
    + (surges.length / duration * 60).toFixed(1) + '/min if every one swings');
  console.log('  magnitude  ' + hist.join(' / ') + '  (count per 0.2 of mag, small -> large)');
  const rate = (g) => (surges.filter((s2) => s2.mag >= g).length / duration * 60).toFixed(1);
  console.log('  gate rate  ' + [0.6, 0.45, 0.3, 0.15, 0]
    .map((g) => 'gate ' + g.toFixed(2) + ' -> ' + rate(g) + '/min').join(', '));
  console.log('  wrote      ' + path.relative(ROOT, OUT));
})();
