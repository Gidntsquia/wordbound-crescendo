#!/usr/bin/env node
// READ_SLOWLY_PLAN.md E4: audit tools/art-manifest.json's sheets for size
// budget compliance. For `status: "sourced"` sheets with a real `image`
// (PNG) path, reads the actual pixel dimensions straight out of the PNG's
// IHDR chunk (no image library available/needed -- see the manifest's own
// header comment) and flags/fails any sheet over 1024x1024. SVG-backed
// sheets (hand-authored, bundled into the JS) don't have a comparable
// fixed pixel size, so they're reported as format/status only.
//
// Usage: node tools/audit-art.js
// Exit code: 0 if every image-backed sheet is within budget, 1 otherwise.

const fs = require('fs');
const path = require('path');

const MAX_DIM = 1024;
const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'tools', 'art-manifest.json');

function readPngDimensions(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(24);
    fs.readSync(fd, buf, 0, 24, 0);
    const sig = buf.subarray(0, 8).toString('hex');
    if (sig !== '89504e470d0a1a0a') {
      throw new Error('not a PNG (bad signature)');
    }
    // Bytes 8-11: length of first chunk data (should be IHDR, 13 bytes).
    // Bytes 12-15: chunk type, must be "IHDR".
    const chunkType = buf.subarray(12, 16).toString('ascii');
    if (chunkType !== 'IHDR') {
      throw new Error('first chunk is not IHDR');
    }
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  } finally {
    fs.closeSync(fd);
  }
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const rows = [];

  for (const sheet of manifest.sheets) {
    const row = {
      id: sheet.id,
      kind: sheet.kind || '(none)',
      status: sheet.status || '(unknown)',
      format: sheet.format || (sheet.image ? 'png' : '(none)'),
    };

    if (sheet.status === 'sourced' && sheet.image) {
      const abs = path.join(repoRoot, 'public', sheet.image);
      if (!fs.existsSync(abs)) {
        row.note = `MISSING FILE: ${sheet.image}`;
        row.ok = false;
      } else {
        try {
          const { width, height } = readPngDimensions(abs);
          row.dimensions = `${width}x${height}`;
          const overBudget = width > MAX_DIM || height > MAX_DIM;
          row.ok = !overBudget;
          if (overBudget) {
            row.note = `OVER BUDGET (max ${MAX_DIM}x${MAX_DIM})`;
          }
        } catch (err) {
          row.note = `could not read dimensions: ${err.message}`;
          row.ok = false;
        }
      }
    } else if (sheet.format === 'svg') {
      row.note = 'SVG (bundled in JS, no fixed pixel budget)';
      row.ok = true;
    } else {
      row.note = `${row.status}, no image to measure`;
      row.ok = true;
    }

    rows.push(row);
  }

  const idWidth = Math.max(...rows.map((r) => r.id.length), 2);
  console.log(
    `Art sheet audit (${rows.length} sheets, budget ${MAX_DIM}x${MAX_DIM}px for image-backed sheets)\n`,
  );
  for (const r of rows) {
    const flag = r.ok ? '  ' : 'X ';
    const dims = r.dimensions ? r.dimensions.padEnd(10) : ''.padEnd(10);
    console.log(
      `${flag}${r.id.padEnd(idWidth)}  ${r.kind.padEnd(11)} ${r.status.padEnd(10)} ${r.format.padEnd(5)} ${dims}${r.note || ''}`,
    );
  }

  const overBudget = rows.filter((r) => !r.ok);
  console.log('');
  if (overBudget.length > 0) {
    console.log(
      `FAIL: ${overBudget.length} sheet(s) over budget or unreadable:`,
    );
    for (const r of overBudget) {
      console.log(`  - ${r.id}: ${r.note}`);
    }
    process.exitCode = 1;
  } else {
    console.log('OK: all image-backed sheets within budget.');
  }
}

main();
