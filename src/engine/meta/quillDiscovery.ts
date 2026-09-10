// TS port of src/sandbox/quillDiscovery.js (READ_SLOWLY_PLAN.md A2/A5 step 3):
// the second meta after stolen letters (NEXT_LEVEL_PLAN.md stage 4). Every
// crescendo and second-axis quill (and Harmony) starts hidden and is not
// offered in the shop or a pack until discovered. Pure functions over a
// `known: readonly string[]` list of discovered quill ids; the app layer
// owns reading/writing that list through app/persistence.ts's `wbc.quills`
// key (READ_SLOWLY_PLAN.md A2 remainder -- no window/localStorage access
// lives in src/engine). A lost run never loses a discovered quill -- this
// module only ever adds.
import type { RngStream } from '../rng';
import { ITEMS, ITEM_DEFS } from '../content/items';

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

// The default `known` list for a fresh install (no persisted quills yet).
export const DEFAULT_KNOWN_QUILLS: readonly string[] = STARTING_QUILLS;

export function isQuillDiscovered(
  id: string,
  known: readonly string[],
): boolean {
  return known.indexOf(id) >= 0;
}

export function hiddenQuillIds(known: readonly string[]): string[] {
  const knownSet: Record<string, boolean> = {};
  known.forEach((id) => {
    knownSet[id] = true;
  });
  return ITEMS.map((it) => it.id).filter((id) => !knownSet[id]);
}

// Pure: returns a new known list with `id` added, or null if `id` is not a
// real quill or was already known. The app layer persists the result
// through app/persistence.ts.
export function discoverQuill(
  known: readonly string[],
  id: string,
): string[] | null {
  if (!ITEM_DEFS[id]) return null;
  if (known.indexOf(id) >= 0) return null;
  return [...known, id];
}

export function rollQuillDiscovery(
  rng: RngStream,
  known: readonly string[],
): string | null {
  const hidden = hiddenQuillIds(known);
  if (!hidden.length) return null;
  return hidden[rng.randInt(0, hidden.length - 1)]!;
}
