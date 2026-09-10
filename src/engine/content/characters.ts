// READ_SLOWLY_PLAN.md stage D: playable letter-tile characters. D2's roster
// of six; five start with an ordinary item (see items.ts's `char_*` entries,
// Jaxon 2026-09-10 -- these used to be auto-injected "passives" invisible
// as items, now they're normal held items a player can see/sell like any
// other). Unlock progress is a pure `unlocked: readonly string[]` list,
// mirroring stolenLetters.ts's pattern; the app layer persists it through
// app/persistence.ts's `wbc.characters` key (READ_SLOWLY_PLAN.md A2
// remainder -- no window/localStorage access lives in src/engine).
//
// D1's permanent character tile (its own slot, playable once per turn,
// returns after scoring instead of being drawn/discarded) is wired in
// state/run.ts's RunState.characterTile / state/round.ts's playWord and
// breakdownFor/scoreFor / facade.ts's characterId threading -- this file
// only owns the roster.
export interface Character {
  id: string;
  letter: string;
  name: string;
  hint: string;
  itemId?: string;
}

// Unlock order: zed and ee are free; each of the rest unlocks by finishing
// a chapter with the previous one in this list equipped (round.ts's
// run.next() calls unlockNext() alongside the existing felled/resolved
// bookkeeping once the character mechanic itself is wired).
export const CHARACTER_ORDER = ['zed', 'ess', 'ee', 'queue', 'why', 'ex'];
export const STARTING_UNLOCKED = ['zed', 'ee'];

export const CHARACTERS: Character[] = [
  {
    id: 'zed',
    letter: 'Z',
    name: 'Zed',
    hint: 'High value, rare in words.',
  },
  {
    id: 'ess',
    letter: 'S',
    name: 'Ess',
    hint: 'Pluraliser. Words ending in S score +10 points.',
    itemId: 'char_ess',
  },
  {
    id: 'ee',
    letter: 'E',
    name: 'Ee',
    hint: 'The common one. (A second E tile is a follow-up; for now, a flat bonus.)',
    itemId: 'char_ee',
  },
  {
    id: 'queue',
    letter: 'Q',
    name: 'Queue',
    hint: 'Q and U played together score ×2 mult.',
    itemId: 'char_queue',
  },
  {
    id: 'why',
    letter: 'Y',
    name: 'Why',
    hint: 'Counts as a vowel for vowel-counting effects.',
    itemId: 'char_why',
  },
  {
    id: 'ex',
    letter: 'X',
    name: 'Ex',
    hint: '+15 points when the word is 3-4 letters.',
    itemId: 'char_ex',
  },
];

export const CHARACTER_DEFS: Record<string, Character> = {};
CHARACTERS.forEach((c) => {
  CHARACTER_DEFS[c.id] = c;
});

export function unlockedCharacters(stored: readonly string[] = []): string[] {
  const set = new Set([...STARTING_UNLOCKED, ...stored]);
  return CHARACTER_ORDER.filter((id) => set.has(id));
}

export function isCharacterUnlocked(
  id: string,
  stored: readonly string[] = [],
): boolean {
  return unlockedCharacters(stored).includes(id);
}

// Called once a chapter is finished with `characterId` equipped -- returns
// a new stored-unlocks list with the next id in CHARACTER_ORDER added, or
// null if there is no next id or it is already unlocked. Pure: the app
// layer persists the result through app/persistence.ts.
export function unlockNext(
  characterId: string | null | undefined,
  stored: readonly string[] = [],
): string[] | null {
  if (!characterId) return null;
  const idx = CHARACTER_ORDER.indexOf(characterId);
  if (idx === -1 || idx + 1 >= CHARACTER_ORDER.length) return null;
  const nextId = CHARACTER_ORDER[idx + 1]!;
  const unlocked = unlockedCharacters(stored);
  if (unlocked.includes(nextId)) return null;
  return [...stored, nextId];
}
