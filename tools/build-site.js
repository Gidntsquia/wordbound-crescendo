#!/usr/bin/env node
// tools/build-site.js
//
// Stages the gh-pages payload into dist/site/: the Vite build (index.html is
// the round sandbox, which IS the app since 2026-09-07) plus an empty
// .nojekyll. Vite builds with `base: './'`, so the output serves from any path.
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist', 'app');
const SITE = path.join(ROOT, 'dist', 'site');

// The fetched recordings are not in git; pull any that are missing first.
if (
  spawnSync('bun', ['tools/fetch-audio.js', '--check'], {
    cwd: ROOT,
    stdio: 'ignore',
  }).status !== 0
) {
  execFileSync('bun', ['tools/fetch-audio.js'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
}
execFileSync('bunx', ['vite', 'build'], { cwd: ROOT, stdio: 'inherit' });

fs.rmSync(SITE, { recursive: true, force: true });
fs.cpSync(DIST, SITE, { recursive: true });
if (!fs.existsSync(path.join(SITE, 'index.html'))) {
  console.error('dist/app/index.html missing -- did the build run?');
  process.exit(1);
}
fs.writeFileSync(path.join(SITE, '.nojekyll'), '');

console.log('\ndist/site staged:');
console.log('  /            -> the game');
console.log('  .nojekyll    -> written');
