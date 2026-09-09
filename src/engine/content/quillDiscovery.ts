// TS port of src/sandbox/quillDiscovery.js (READ_SLOWLY_PLAN.md A2/A5 step 3):
// the second meta after stolen letters (NEXT_LEVEL_PLAN.md stage 4). Every
// crescendo and second-axis quill (and Harmony) starts hidden and is not
// offered in the shop or a pack until discovered. Persisted in localStorage
// as wbc.quills. A lost run never loses a discovered quill -- this module
// only ever adds. Still attaches to window.Wordbound.Sandbox for the untyped
// sandbox modules (shop.js/round.js/RoundSandbox) that read it off the
// global.
import '../sandboxGlobal';
import type { RngStream } from '../rng';
import type { Item } from './items';

const STORE_KEY = 'wbc.quills';

// The plain length and mult quills -- flat points/mult with no word-kind,
// crescendo, or scaling condition attached (~10, per the plan).
export const STARTING_QUILLS = [
  'brass_nib',
  'second_ink',
  'short_form',
  'long_form',
  'lead_weight',
  'gilded_edge',
  'half_note',
  'double_stop',
  'fermata',
  'miser',
];

export function discoveredQuills(): string[] {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    const arr: unknown = raw ? JSON.parse(raw) : null;
    if (Array.isArray(arr) && arr.length)
      return arr.filter((id): id is string => typeof id === 'string');
  } catch {
    /* private mode etc */
  }
  return STARTING_QUILLS.slice();
}

export function isQuillDiscovered(id: string): boolean {
  return discoveredQuills().indexOf(id) >= 0;
}

export function hiddenQuillIds(): string[] {
  const known: Record<string, boolean> = {};
  discoveredQuills().forEach((id) => {
    known[id] = true;
  });
  const Sandbox = window.Wordbound.Sandbox;
  const items = (Sandbox.ITEMS as Item[] | undefined) || [];
  return items.map((it) => it.id).filter((id) => !known[id]);
}

export function discoverQuill(id: string): boolean {
  const Sandbox = window.Wordbound.Sandbox;
  const itemDefs = Sandbox.ITEM_DEFS as Record<string, Item> | undefined;
  if (!itemDefs || !itemDefs[id]) return false;
  const known = discoveredQuills();
  if (known.indexOf(id) >= 0) return false;
  known.push(id);
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(known));
  } catch {
    /* ignore */
  }
  return true;
}

export function rollQuillDiscovery(rng: RngStream): string | null {
  const hidden = hiddenQuillIds();
  if (!hidden.length) return null;
  return hidden[rng.randInt(0, hidden.length - 1)]!;
}

const Sandbox = window.Wordbound.Sandbox;
Sandbox.STARTING_QUILLS = STARTING_QUILLS;
Sandbox.discoveredQuills = discoveredQuills;
Sandbox.isQuillDiscovered = isQuillDiscovered;
Sandbox.hiddenQuillIds = hiddenQuillIds;
Sandbox.discoverQuill = discoverQuill;
Sandbox.rollQuillDiscovery = rollQuillDiscovery;
