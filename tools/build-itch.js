#!/usr/bin/env node
// tools/build-itch.js
//
// Packages Wordbound: Crescendo into an itch.io-ready HTML5 zip.
//
// itch.io's HTML5 upload requires index.html at the ROOT of the zip. Since
// NEXT_LEVEL_PLAN.md stage 5 (2026-09-07) the sandbox IS the app: `npm run
// build` already emits exactly that shape at dist/app/ (index.html plus
// hashed assets, base: './' so it works from any path, audio fetched into
// public/audio/ carried along). So this script just runs the real build and
// zips dist/app/'s CONTENTS -- no separate staging list to drift out of sync
// with the source tree.
//
// Run with `npm run build:itch` (or `node tools/build-itch.js`). Output:
// dist/wordbound-itch.zip. `dist/` is a build artifact, not source -- see
// .gitignore.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const APP_DIR = path.join(DIST_DIR, 'app');
const OUTPUT_ZIP = path.join(DIST_DIR, 'wordbound-itch.zip');

function checkZipAvailable() {
  try {
    execFileSync('zip', ['-v'], { stdio: 'ignore' });
  } catch (e) {
    console.error(
      'ERROR: the `zip` command is not available on this system. ' +
        'Install it (e.g. `apt-get install zip` / `brew install zip`) and re-run.',
    );
    process.exit(1);
  }
}

function zipDir(srcDir, outputZip) {
  fs.mkdirSync(path.dirname(outputZip), { recursive: true });
  if (fs.existsSync(outputZip)) fs.unlinkSync(outputZip);
  // -X: no extra file attributes (deterministic-ish, avoids platform cruft).
  // -r: recurse into subdirectories (assets/, audio/).
  // Run with cwd = srcDir so the zip's internal paths start at index.html,
  // not at some absolute host path.
  execFileSync('zip', ['-r', '-X', outputZip, '.'], {
    cwd: srcDir,
    stdio: 'inherit',
  });
}

function main() {
  checkZipAvailable();

  console.log('Building (npm run build)...');
  execFileSync('npx', ['vite', 'build'], { cwd: ROOT, stdio: 'inherit' });

  if (!fs.existsSync(path.join(APP_DIR, 'index.html'))) {
    console.error('dist/app/index.html missing -- did the build run?');
    process.exit(1);
  }

  zipDir(APP_DIR, OUTPUT_ZIP);

  const { size } = fs.statSync(OUTPUT_ZIP);
  console.log(
    `\nBuilt ${path.relative(ROOT, OUTPUT_ZIP)} (${(size / 1024 / 1024).toFixed(2)} MB)`,
  );
}

if (require.main === module) {
  main();
}

module.exports = { zipDir, OUTPUT_ZIP, DIST_DIR, APP_DIR };
