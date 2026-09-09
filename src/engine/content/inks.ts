// TS port of src/sandbox/inks.js (READ_SLOWLY_PLAN.md A2/A5 step 3): Balatro's
// tarot cards -- a consumable that marks one or two tiles of the player's
// whole deck (a mark lasts the run whether the tile is in the live case or
// not), turns a letter, destroys a tile, or pays gold. Still attaches to
// window.Wordbound.Sandbox for the untyped sandbox modules that read it off
// the global (round.js reads tile.ink at scoring time; shop.js/RoundSandbox
// call applyInk).
import '../sandboxGlobal';
import type { Tile } from '../tiles';

export interface Ink {
  id: string;
  name: string;
  targets: number;
  needsVowel?: boolean;
  hint: string;
}

interface RunLike {
  tune: Record<string, number>;
  gold: number;
  deck: Tile[];
  round: { state: string; destroyTile(id: string): boolean } | null;
}

export const INKS: Ink[] = [
  {
    id: 'gilt',
    name: 'Gilt',
    targets: 2,
    hint: 'Up to 2 tiles: +20 points whenever played',
  },
  {
    id: 'bold',
    name: 'Bold',
    targets: 2,
    hint: 'Up to 2 tiles: +2 mult whenever played',
  },
  {
    id: 'steel',
    name: 'Steel',
    targets: 1,
    hint: '1 tile: ×1.2 mult on every word while it stays on your rack',
  },
  {
    id: 'blank',
    name: 'Blank',
    targets: 1,
    hint: '1 tile becomes a wildcard — any letter, worth 0',
  },
  {
    id: 'vowel',
    name: 'Vowel Shift',
    targets: 1,
    needsVowel: true,
    hint: '1 tile becomes the vowel you choose',
  },
  {
    id: 'erase',
    name: 'Erase',
    targets: 2,
    hint: 'Destroy up to 2 tiles for the rest of the run',
  },
  { id: 'coin', name: 'Coin', targets: 0, hint: 'Double your gold, up to +10' },
];

export const INK_DEFS: Record<string, Ink> = {};
INKS.forEach((ink) => {
  INK_DEFS[ink.id] = ink;
});

export const VOWELS = ['A', 'E', 'I', 'O', 'U'];

export function inkMark(tile: Tile | null | undefined): Ink | null {
  return tile && tile.ink ? (INK_DEFS[tile.ink] ?? null) : null;
}

export function applyInk(
  run: RunLike,
  inkId: string,
  tileIds: string[],
  extra?: { vowel?: string },
): { ok: true; note: string } | { ok: false; reason: string } {
  const ink = INK_DEFS[inkId];
  if (!ink) return { ok: false, reason: 'No such ink.' };
  const tune = run.tune;
  if (ink.id === 'coin') {
    const gain = Math.min(tune.INK_COIN_CAP ?? 0, run.gold);
    run.gold += gain;
    return { ok: true, note: 'Coin: +' + gain + ' gold.' };
  }
  const ids = (tileIds || []).slice(0, ink.targets);
  if (!ids.length) return { ok: false, reason: 'Pick a tile first.' };
  const tiles = ids
    .map((id) => run.deck.find((t) => t.id === id))
    .filter((t): t is Tile => Boolean(t));
  if (tiles.length !== ids.length)
    return { ok: false, reason: 'Those tiles aren’t in your deck.' };
  const letters = tiles.map((t) => t.letter).join(', ');

  if (ink.id === 'erase') {
    const round = run.round && run.round.state === 'live' ? run.round : null;
    tiles.forEach((t) => {
      const d = run.deck.indexOf(t);
      if (d >= 0) run.deck.splice(d, 1);
      if (round) round.destroyTile(t.id);
    });
    return { ok: true, note: 'Erased ' + letters + '.' };
  }
  if (ink.id === 'vowel') {
    const v = String(extra?.vowel || '').toUpperCase();
    if (VOWELS.indexOf(v) < 0) return { ok: false, reason: 'Choose a vowel.' };
    tiles.forEach((t) => {
      t.letter = v;
      if (t.ink === 'blank') t.ink = null;
    });
    return { ok: true, note: letters + ' → ' + v + '.' };
  }
  if (ink.id === 'blank') {
    tiles.forEach((t) => {
      t.letter = '?';
      t.ink = 'blank';
    });
    return { ok: true, note: letters + ' is now a blank.' };
  }
  tiles.forEach((t) => {
    t.ink = ink.id;
  });
  return { ok: true, note: ink.name + ' on ' + letters + '.' };
}

const Sandbox = window.Wordbound.Sandbox;
Sandbox.INKS = INKS;
Sandbox.INK_DEFS = INK_DEFS;
Sandbox.VOWELS = VOWELS;
Sandbox.inkMark = inkMark;
Sandbox.applyInk = applyInk;
