// READ_SLOWLY_PLAN.md stage B3: the wordsmith-voice on-screen copy, gathered
// so the theme can be edited in one file. Partial by design (B3's task, not
// a wall-to-wall extraction of RoundSandbox.jsx) -- covers the strings the
// plan names explicitly plus the vocabulary swap (B1) call sites touched in
// this pass. Code-level ids (movement, quill, ink, favour, key) are
// unaffected; this module only holds display text.

export const TITLE_EYEBROW = 'Words against the rush';

export const TARGET_LABEL = 'Attention needed';
export const QUILLS_LABEL = 'Bookmarks';
export const KEYS_LABEL = 'Editions';
export const REREADS_LABEL = 'Rereads';
export const READING_CONDITION_LABEL = 'Reading condition';
export const LOST_LETTERS_LABEL = 'Lost letters';
export const LOST_LETTERS_HINT = 'the alphabet is being forgotten';

export function chapterLabel(numeral: string | number): string {
  const n = { I: 1, II: 2, III: 3 }[numeral] ?? numeral;
  return 'Chapter ' + n;
}

export function targetHint(target: number): string {
  return TARGET_LABEL + ' ' + target;
}

export function lostTheRoom(name: string): string {
  return 'Lost the room to ' + name + '.';
}

export const LAST_PAGE_TURNS = 'The last page turns.';
