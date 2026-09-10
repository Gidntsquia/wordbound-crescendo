// TS port of src/sandbox/enemies.js (READ_SLOWLY_PLAN.md A2/A5 step 3): the
// lineup (MOVEMENTS) and the boss tempo markings (RULES).
//
// Names/flavour rewritten to READ_SLOWLY_PLAN.md stage B ("slow down and
// read"): antagonists are tempos a reader outlasts, not villains. `id`,
// `kind`, `recorded`, and `rule` are unchanged -- only the on-screen name
// and flavour text moved.

export type EnemyKind = 'small' | 'big' | 'boss';

export interface Enemy {
  id: string;
  name: string;
  glyph: string;
  recorded: string;
  kind: EnemyKind;
  flavour: string;
  rule?: string;
}

export interface Movement {
  numeral: string;
  name: string;
  enemies: Enemy[];
}

export interface ScoreCtx {
  word: string;
  tiles: unknown[];
  round: unknown;
}

export interface ScoreAcc {
  points: number;
  mult: number;
  [key: string]: unknown;
}

export interface Rule {
  id: string;
  name: string;
  plain: string;
  text: string;
  plays?: number;
  targetMult?: number;
  score?(ctx: ScoreCtx, acc: ScoreAcc): string | null;
  barsLetter?(
    round: { usedLetters: Record<string, boolean> },
    letter: string,
  ): boolean;
  premiumPos?: number;
  noPremium?: boolean;
}

export const MOVEMENTS: Movement[] = [
  {
    numeral: 'I',
    name: 'Chapter 1: The Commute',
    enemies: [
      {
        id: 'bagatelle',
        name: 'The Doomscroll',
        glyph: '\u{1F4F1}',
        recorded: 'recordedFurElise',
        kind: 'small',
        flavour:
          'A commuter, hypnotised by a phone. Thumb moving, eyes glazed.',
      },
      {
        id: 'moonlight',
        name: 'The Deadline',
        glyph: '\u{1F319}',
        recorded: 'recordedMoonlight',
        kind: 'big',
        flavour:
          'The same commuter, now at a desk. A clock face where the phone was.',
      },
      {
        id: 'fate',
        name: 'Fate at the Door',
        glyph: '\u{1F451}',
        recorded: 'recordedSymphony5',
        kind: 'boss',
        flavour: 'The deadline arrives in person. Four knocks. Not asking.',
        rule: 'four_knocks',
      },
    ],
  },
  {
    numeral: 'II',
    name: 'Chapter 2: The Square',
    enemies: [
      {
        id: 'aria',
        name: 'The Bored Bench',
        glyph: '\u{1FA91}',
        recorded: 'recordedGoldbergAria',
        kind: 'small',
        flavour:
          'Someone with nothing to do, and no idea a book counts as something.',
      },
      {
        id: 'mountain_king',
        name: 'The Loudspeaker',
        glyph: '\u{1F3D4}️',
        recorded: 'recordedMountainKing',
        kind: 'big',
        flavour:
          'A leader who talks so no one has to think. The bench-sitter is in the crowd.',
        rule: 'presto',
      },
      {
        id: 'gallop',
        name: 'The Gallop',
        glyph: '\u{1F40E}',
        recorded: 'recordedWilliamTell',
        kind: 'boss',
        flavour:
          'The parade that never stops for anyone. Every letter you spend, it remembers.',
        rule: 'no_repeats',
      },
    ],
  },
  {
    numeral: 'III',
    name: 'Chapter 3: The Tower',
    enemies: [
      {
        id: 'gymnopedie',
        name: 'The Waiting Room',
        glyph: '\u{1F3E2}',
        recorded: 'recordedGymnopedie',
        kind: 'small',
        flavour:
          'A person staring at a wall, so bored they have forgotten boredom has a cure.',
      },
      {
        id: 'serenade',
        name: 'The Chancellor',
        glyph: '\u{1F3DB}️',
        recorded: 'recordedNachtmusik',
        kind: 'big',
        flavour: 'Hegemony. A hall repeating the same word after a podium.',
      },
      {
        id: 'bald_mountain',
        name: 'The Bare Mountain',
        glyph: '\u{1F311}',
        recorded: 'recordedBaldMountain',
        kind: 'boss',
        flavour:
          'The whole night of noise. Speak softly here; loud words are taken from you.',
        rule: 'sotto_voce',
      },
    ],
  },
];

export const KIND_LABEL: Record<EnemyKind, string> = {
  small: 'Distraction',
  big: 'Pressure',
  boss: 'Finale',
};

export function enemyAt(movement: number, stage: number): Enemy | null {
  const m = MOVEMENTS[movement];
  return m ? (m.enemies[stage] ?? null) : null;
}

// Tempo markings -- boss rules, on screen as READING CONDITIONS.
// round.js reads these at creation (plays, targetMult), at scoring
// (score(ctx, acc) after the items) and at play (barsLetter(round, letter));
// the UI shows `text` under the target in the enemy's voice and greys
// barred tiles.
export const RULES: Record<string, Rule> = {
  four_knocks: {
    id: 'four_knocks',
    name: 'Four knocks',
    plain: '4-letter words score ×2 mult.',
    text: 'Four. Always four. A word of four letters strikes twice as hard here — ×2 mult.',
    score(ctx, acc) {
      if (ctx.word.length !== 4) return null;
      acc.mult *= 2;
      return '×2 mult, four knocks';
    },
  },
  presto: {
    id: 'presto',
    name: 'Presto',
    plain: '3 words this fight instead of 4; the target is ×0.8.',
    text: 'No time to dwell. Three words instead of four, and the target is lighter — ×0.8.',
    plays: -1,
    targetMult: 0.8,
  },
  sotto_voce: {
    id: 'sotto_voce',
    name: 'Sotto voce',
    plain: 'Words of 5+ letters score ×0.5 mult; 3–4 letters ×1.5.',
    text: 'Softly. A word of five letters or more scores ×0.5 mult here; three or four letters, ×1.5.',
    score(ctx, acc) {
      const n = ctx.word.length;
      if (n >= 5) {
        acc.mult *= 0.5;
        return '×0.5 mult, sotto voce';
      }
      if (n >= 3) {
        acc.mult *= 1.5;
        return '×1.5 mult, sotto voce';
      }
      return null;
    },
  },
  no_repeats: {
    id: 'no_repeats',
    name: 'No repeats',
    plain: 'A letter can be played once this fight; used letters are greyed.',
    text: 'Every letter you spend, it remembers. A letter played this round cannot be played again.',
    barsLetter(round, letter) {
      return letter !== '?' && !!round.usedLetters[letter];
    },
  },
};
