#!/usr/bin/env node
// tools/run-gates.js -- run this repo's node-driven gates CONCURRENTLY.
//
// The gates in test/ are independent processes that each build the app, start a
// static server and drive a browser. Run one at a time they add up to about
// five minutes; nothing about them needs to be sequential. This runner does the
// two things that were stopping them from overlapping:
//
//   1. ONE BUILD. Six of them ran their own `npx vite build` against the same
//      tree. The runner builds once up front and sets WB_SKIP_BUILD=1, which
//      those files honour (running any of them on its own still builds).
//   2. ONE PORT EACH. Several were written with the same hard-coded port, so
//      two in parallel would collide. Every gate now reads WB_PORT, and the
//      runner hands out a distinct one.
//
// Usage:
//   node tools/run-gates.js [fast|slow|all] [--jobs N] [--no-build] [--list]
//
// Tiers are about WALL TIME, not about what is checked -- `all` is the union
// and is what must pass before anything ships. `fast` is the sub-20s set for
// an inner loop; `slow` is the long browser playthroughs.
const os = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

// tier: 'fast' | 'slow'. build: true if the file runs `vite build` itself.
const GATES = [
  { name: 'dom-check',           file: 'test/dom-check.js',                     tier: 'fast' },
  { name: 'branching-map',       file: 'test/verify-branching-map.js',          tier: 'fast' },
  { name: 'duel-balance',        file: 'test/duel-balance-simulation.js',       tier: 'fast' },
  { name: 'music-engine',        file: 'test/verify-music-engine.js',           tier: 'fast', build: true },
  { name: 'run-header',          file: 'test/verify-run-header-overflow.js',    tier: 'fast' },
  { name: 'drag-interrupt',      file: 'test/verify-drag-interrupt.js',         tier: 'fast' },
  { name: 'audio-context',       file: 'test/verify-audio-context.js',          tier: 'fast' },
  { name: 'mobile-layout',       file: 'test/verify-mobile-layout.js',          tier: 'fast' },
  { name: 'react-build',         file: 'test/verify-react-build.js',            tier: 'slow', build: true },
  { name: 'sandbox',             file: 'test/verify-sandbox.js',                tier: 'slow', build: true },
  { name: 'itch-build',          file: 'test/verify-itch-build.js',             tier: 'slow' },
  { name: 'react-qa',            file: 'test/verify-react-qa-boss-reward.js',   tier: 'slow', build: true },
  { name: 'regular-duel-smoke',  file: 'test/verify-regular-duel-smoke.js',     tier: 'slow', build: true },
  { name: 'qa-boss-reward',      file: 'test/orchestrator-qa-boss-reward.js',   tier: 'slow' },
  { name: 'react-duel-loss',     file: 'test/verify-react-duel-loss.js',        tier: 'slow', build: true },
];

const args = process.argv.slice(2);
const tier = args.find((a) => ['fast', 'slow', 'all'].includes(a)) || 'all';
const jobsArg = args.indexOf('--jobs');
// Each gate drives a real browser, so the useful ceiling is well under the core
// count -- past four they queue on CPU and the wall time stops improving.
const JOBS = jobsArg >= 0 ? Number(args[jobsArg + 1]) : Math.min(4, Math.max(2, os.cpus().length - 4));
const NO_BUILD = args.includes('--no-build');

const selected = GATES.filter((g) => tier === 'all' || g.tier === tier);

if (args.includes('--list')) {
  selected.forEach((g) => console.log(g.tier.padEnd(5), g.name));
  process.exit(0);
}

function build() {
  if (NO_BUILD) return false;
  if (!selected.some((g) => g.build)) return false;
  const t = Date.now();
  execFileSync('npx', ['vite', 'build'], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
  console.log('built once in ' + ((Date.now() - t) / 1000).toFixed(1) + 's, shared by '
    + selected.filter((g) => g.build).length + ' gates');
  return true;
}

function runGate(gate, port, sharedBuild) {
  return new Promise((resolve) => {
    const started = Date.now();
    const env = Object.assign({}, process.env, { WB_PORT: String(port) });
    if (sharedBuild && gate.build) env.WB_SKIP_BUILD = '1';
    const child = spawn('node', [gate.file], { cwd: ROOT, env });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (code) => {
      const secs = (Date.now() - started) / 1000;
      const ok = code === 0;
      console.log((ok ? '  PASS ' : '  FAIL ') + gate.name.padEnd(20)
        + secs.toFixed(0).padStart(4) + 's');
      resolve({ gate, ok, secs, out });
    });
  });
}

async function main() {
  // One install check for the whole run instead of a pretest hook per gate.
  execFileSync('node', [path.join(ROOT, 'tools', 'ensure-deps.js'), '@playwright/test', 'jsdom'],
    { cwd: ROOT, stdio: 'inherit' });

  const sharedBuild = build();
  console.log('running ' + selected.length + ' gates (' + tier + ') ' + JOBS + ' at a time\n');

  const started = Date.now();
  const queue = selected.slice();
  const results = [];
  let nextPort = 9900;
  const workers = Array.from({ length: Math.min(JOBS, queue.length) }, async () => {
    while (queue.length) {
      const gate = queue.shift();
      results.push(await runGate(gate, nextPort++, sharedBuild));
    }
  });
  await Promise.all(workers);

  // These gates drive real browsers and several of them assert on frame
  // timing, so running four at once can starve one into a false failure. A
  // single SERIAL retry tells the two apart: a gate that passes alone was a
  // contention flake, one that fails twice is a real failure. Nothing is
  // hidden -- every retry is printed and listed in the summary.
  const flaky = [];
  const stillFailing = [];
  for (const r of results.filter((x) => !x.ok)) {
    console.log('\n  retrying ' + r.gate.name + ' on its own...');
    const again = await runGate(r.gate, nextPort++, sharedBuild);
    r.ok = again.ok;
    r.out = again.out;
    (again.ok ? flaky : stillFailing).push(r.gate.name);
  }

  const wall = (Date.now() - started) / 1000;
  const failed = results.filter((r) => !r.ok);
  const serial = results.reduce((a, r) => a + r.secs, 0);
  console.log('\n' + results.length + ' gates in ' + wall.toFixed(0) + 's wall ('
    + serial.toFixed(0) + 's of work, ' + (serial / wall).toFixed(1) + 'x)');

  failed.forEach((r) => {
    console.log('\n===== ' + r.gate.name + ' output (last 40 lines) =====');
    console.log(r.out.split('\n').slice(-40).join('\n'));
  });
  if (flaky.length) {
    console.log('FLAKY under load, passed alone: ' + flaky.join(', '));
  }
  if (failed.length) {
    console.log('\nFAILED twice: ' + stillFailing.join(', '));
    process.exit(1);
  }
  console.log('\nAll ' + results.length + ' gates passed.');
}

main().catch((err) => { console.error(err); process.exit(1); });
