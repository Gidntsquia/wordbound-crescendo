import { readFileSync } from 'node:fs';

const css = readFileSync(
  new URL('../src/styles/game.css', import.meta.url),
  'utf8',
);

function token(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'));
  if (!match) throw new Error(`Missing color token --${name}`);
  return match[1]!;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((index) =>
    Number.parseInt(hex.slice(index, index + 2), 16),
  );
  const linear = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

function contrast(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const checks = [
  ['ordinary text on the main pit', 'leaf', 'pit'],
  ['secondary text on the main pit', 'leaf-dim', 'pit'],
  ['brass text on the main pit', 'brass', 'pit'],
  ['warning text on the main pit', 'rubric', 'pit'],
  ['ordinary text on raised panels', 'leaf', 'pit-raise'],
  ['secondary text on raised panels', 'leaf-dim', 'pit-raise'],
  ['brass text on raised panels', 'brass', 'pit-raise'],
  ['warning text on raised panels', 'rubric', 'pit-raise'],
  ['dark text on paper buttons', 'ink', 'leaf'],
  ['dark text on highlighted buttons', 'ink', 'brass-hot'],
  ['dark text on brass controls', 'ink', 'brass'],
] as const;

const results = checks.map(([label, foreground, background]) => ({
  label,
  foreground: `--${foreground}`,
  background: `--${background}`,
  ratio: +contrast(token(foreground), token(background)).toFixed(2),
  required: 4.5,
}));
const failures = results.filter((result) => result.ratio < result.required);

console.log(
  JSON.stringify({ standard: 'WCAG AA normal text', results }, null, 2),
);
if (failures.length) {
  throw new Error(
    `Contrast check failed: ${failures.map((failure) => failure.label).join(', ')}`,
  );
}
