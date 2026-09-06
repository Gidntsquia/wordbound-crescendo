#!/usr/bin/env node
// tools/build-site.js
//
// Stages the gh-pages payload into dist/site/.
//
// The public link points at the TUG SANDBOX, not the full app: the sandbox is
// what is actively being iterated on, and shipping it as the root means the
// live URL is the thing worth looking at. The full React app is still built and
// still published -- it just lives at /app.html instead of /.
//
// Vite builds both entries with `base: './'`, so renaming the html files does
// not break their asset paths.
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist', 'app');
const SITE = path.join(ROOT, 'dist', 'site');

// The fetched recordings are not in git; pull any that are missing first.
if (spawnSync('node', ['tools/fetch-audio.js', '--check'], { cwd: ROOT, stdio: 'ignore' }).status !== 0) {
  execFileSync('node', ['tools/fetch-audio.js'], { cwd: ROOT, stdio: 'inherit' });
}
execFileSync('npx', ['vite', 'build'], { cwd: ROOT, stdio: 'inherit' });

fs.rmSync(SITE, { recursive: true, force: true });
fs.cpSync(DIST, SITE, { recursive: true });

const appHtml = path.join(SITE, 'index.html');
const sandboxHtml = path.join(SITE, 'sandbox.html');
if (!fs.existsSync(sandboxHtml)) {
  console.error('dist/app/sandbox.html missing -- did the sandbox entry build?');
  process.exit(1);
}
fs.renameSync(appHtml, path.join(SITE, 'app.html'));
fs.renameSync(sandboxHtml, appHtml);
fs.writeFileSync(path.join(SITE, '.nojekyll'), '');

console.log('\ndist/site staged:');
console.log('  /            -> tug sandbox');
console.log('  /app.html    -> full React app');
console.log('  .nojekyll    -> written');
