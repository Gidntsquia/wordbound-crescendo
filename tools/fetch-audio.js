#!/usr/bin/env node
// tools/fetch-audio.js -- reproduce public/audio/ from tools/audio-manifest.json.
//
// For every manifest entry with a `url`:
//   1. download the source into .cache/audio/<id>.<ext> (kept; re-trims do not
//      re-download), record or check its sha256;
//   2. ffmpeg trims it to `trim` and writes `file` as 128 kbps mono-safe MP3;
//   3. if src/recordings/<module>.json does not exist, write its initial
//      fields (id, title, composer, performer, audio) from the manifest ONCE;
//   4. tools/analyze-audio-piece.js fills in/refreshes the generated fields
//      (durationSec, peak, loudness, dynamics) in that JSON file.
// Then src/engine/content/recordings.ts (the import index main.tsx uses) is
// rewritten from the manifest. The hand-owned prose (why the recording
// exception exists, etc.) lives in src/engine/content/recordings.ts's own
// header comment, not per-piece -- licensing detail per piece is the
// manifest's job (title/composer/performer/license/sourcePage).
//
// Entries with `committed: true` and no `url` (the two Pixabay tracks) are
// left alone; the script only checks that the file is there.
//
//   node tools/fetch-audio.js            all entries, skip ones already built
//   node tools/fetch-audio.js --force    rebuild every mp3 and every GENERATED block
//   node tools/fetch-audio.js --only id  one entry
//   node tools/fetch-audio.js --check    exit 1 if any file is missing, fetch nothing
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(__dirname, 'audio-manifest.json');
const CACHE_DIR = path.join(ROOT, '.cache', 'audio');
const UA =
  'wordbound-crescendo-fetch/1.0 (https://github.com/gidntsquia/wordbound-crescendo)';
const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const CHECK = args.includes('--check');
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const entries = manifest.recordings.filter((e) => !ONLY || e.id === ONLY);

function sha256(file) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex');
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return buf.length;
}

// The initial JSON, before analyze-audio-piece.js has filled in durationSec/
// peak/loudness/dynamics. Licensing (title/composer/performer/license/
// sourcePage) is the manifest's job, not repeated here -- see
// tools/audio-manifest.json.
function initialJson(e) {
  return (
    JSON.stringify(
      {
        id: e.id + '-recording',
        title: e.title,
        composer: e.composer,
        performer: e.performer,
        audio: 'audio/' + path.basename(e.file),
        excerpt: true,
      },
      null,
      2,
    ) + '\n'
  );
}

function writeIndex() {
  const imports = manifest.recordings
    .map((e) => `import ${e.module} from '../../recordings/${e.module}.json';`)
    .join('\n');
  const assigns = manifest.recordings
    .map((e) => `Sandbox.${e.module} = ${e.module} as RecordedPiece;`)
    .join('\n');
  const out = `// src/engine/content/recordings.ts -- GENERATED (import list only) by
// tools/fetch-audio.js from tools/audio-manifest.json. The per-piece JSON
// under src/recordings/ holds the licensing metadata (title/composer/
// performer/audio) and the analyzed envelope (durationSec/peak/loudness/
// dynamics, from tools/analyze-audio-piece.js). One import per recording, in
// manifest order. Edit the manifest, not this file. Still attaches each
// piece to window.Wordbound.Sandbox for RoundSandbox.jsx/audioPiece.ts,
// which read pieces off the global by name (e.g. Sandbox.recordedFurElise).
import '../sandboxGlobal';
import type { RecordedPiece } from './audioPiece';

${imports}

const Sandbox = window.Wordbound.Sandbox;
${assigns}
`;
  fs.writeFileSync(path.join(ROOT, 'src/engine/content/recordings.ts'), out);
}

(async () => {
  let missing = 0;
  let changedManifest = false;
  for (const e of entries) {
    const file = path.join(ROOT, e.file);
    const mod = path.join(ROOT, 'src/recordings', e.module + '.json');
    if (!e.url) {
      if (!fs.existsSync(file)) {
        console.error('MISSING (hand-placed): ' + e.file);
        missing++;
      } else console.log('ok   ' + e.id + ' (committed)');
      continue;
    }
    if (CHECK) {
      if (!fs.existsSync(file) || !fs.existsSync(mod)) {
        console.error('MISSING: ' + e.id);
        missing++;
      }
      continue;
    }
    if (
      !FORCE &&
      fs.existsSync(file) &&
      fs.existsSync(mod) &&
      JSON.parse(fs.readFileSync(mod, 'utf8')).durationSec !== undefined
    ) {
      console.log('ok   ' + e.id);
      continue;
    }
    const ext = (new URL(e.url).pathname.match(/\.([a-z0-9]+)$/i) || [
      ,
      'bin',
    ])[1].toLowerCase();
    const cached = path.join(CACHE_DIR, e.id + '.' + ext);
    if (!fs.existsSync(cached)) {
      process.stdout.write('get  ' + e.id + ' ... ');
      const n = await download(e.url, cached);
      console.log((n / 1e6).toFixed(1) + ' MB');
    }
    const sum = sha256(cached);
    if (e.sha256 && e.sha256 !== sum) {
      console.error(
        'sha256 mismatch for ' +
          e.id +
          ': manifest ' +
          e.sha256 +
          ', got ' +
          sum +
          '\n  The source changed upstream. Listen to it, then clear sha256 in the manifest to accept it.',
      );
      process.exit(1);
    }
    if (!e.sha256) {
      e.sha256 = sum;
      changedManifest = true;
    }

    fs.mkdirSync(path.dirname(file), { recursive: true });
    const t = e.trim || { start: 0 };
    const ff = ['-v', 'error', '-y', '-ss', String(t.start || 0), '-i', cached];
    if (t.seconds) ff.push('-t', String(t.seconds));
    // A short fade at both ends so the loop point and the excerpt's cut do not click.
    const fades = ['afade=t=in:st=0:d=0.8'];
    if (t.seconds)
      fades.push('afade=t=out:st=' + Math.max(0, t.seconds - 1.5) + ':d=1.5');
    ff.push(
      '-af',
      fades.join(','),
      '-codec:a',
      'libmp3lame',
      '-b:a',
      '128k',
      '-ar',
      '44100',
      file,
    );
    process.stdout.write('trim ' + e.id + ' ... ');
    execFileSync('ffmpeg', ff, { stdio: ['ignore', 'ignore', 'inherit'] });
    console.log((fs.statSync(file).size / 1e6).toFixed(1) + ' MB');

    if (!fs.existsSync(mod)) {
      fs.mkdirSync(path.dirname(mod), { recursive: true });
      fs.writeFileSync(mod, initialJson(e));
      console.log('new  src/recordings/' + e.module + '.json');
    }
    const r = spawnSync(
      'node',
      [
        path.join(__dirname, 'analyze-audio-piece.js'),
        '--in',
        file,
        '--out',
        mod,
        '--fresh',
      ],
      { stdio: ['ignore', 'pipe', 'inherit'] },
    );
    if (r.status !== 0) {
      console.error('analyze failed for ' + e.id);
      process.exit(1);
    }
    console.log('     ' + String(r.stdout).split('\n')[1].trim());
  }
  if (changedManifest) {
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
    console.log('manifest: sha256 recorded');
  }
  if (!CHECK) writeIndex();
  if (missing) {
    console.error(
      missing + ' recording(s) missing -- run `npm run fetch:audio`',
    );
    process.exit(1);
  }
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
