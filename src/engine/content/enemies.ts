// TS port of src/sandbox/enemies.js (READ_SLOWLY_PLAN.md A2/A5 step 3): the
// lineup (MOVEMENTS) and the boss tempo markings (RULES).
//
// Names are the recorded piece's own name/nickname -- no narrative scene or
// character attached. `id`, `kind`, `recorded`, and `rule` are unchanged.

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
    name: 'Movement I',
    enemies: [
      {
        id: 'bagatelle',
        name: 'Bagatelle No. 25',
        glyph: '\u{1F3B9}',
        recorded: 'recordedFurElise',
        kind: 'small',
        flavour: 'A light bagatelle, better known as "Für Elise."',
      },
      {
        id: 'moonlight',
        name: 'Moonlight Sonata',
        glyph: '\u{1F3B9}',
        recorded: 'recordedMoonlight',
        kind: 'big',
        flavour: 'Piano Sonata No. 14, first movement -- Adagio sostenuto.',
      },
      {
        id: 'fate',
        name: 'Symphony No. 5',
        glyph: '\u{1F3BB}',
        recorded: 'recordedSymphony5',
        kind: 'boss',
        flavour: 'Four notes, then the rest of it. Not asking.',
        rule: 'four_knocks',
      },
    ],
  },
  {
    numeral: 'II',
    name: 'Movement II',
    enemies: [
      {
        id: 'aria',
        name: 'Goldberg Variations: Aria',
        glyph: '\u{1F3B9}',
        recorded: 'recordedGoldbergAria',
        kind: 'small',
        flavour: 'The Aria that opens and closes the Goldberg Variations.',
      },
      {
        id: 'mountain_king',
        name: 'In the Hall of the Mountain King',
        glyph: '\u{1F3BB}',
        recorded: 'recordedMountainKing',
        kind: 'big',
        flavour: 'From Peer Gynt. Starts slow. Does not stay slow.',
        rule: 'presto',
      },
      {
        id: 'gallop',
        name: 'William Tell Overture: Finale',
        glyph: '\u{1F3BA}',
        recorded: 'recordedWilliamTell',
        kind: 'boss',
        flavour: 'The gallop. Every letter you spend, it remembers.',
        rule: 'no_repeats',
      },
    ],
  },
  {
    numeral: 'III',
    name: 'Movement III',
    enemies: [
      {
        id: 'gymnopedie',
        name: 'Gymnopédie No. 1',
        glyph: '\u{1F3B9}',
        recorded: 'recordedGymnopedie',
        kind: 'small',
        flavour: 'Satie, slow and unhurried.',
      },
      {
        id: 'serenade',
        name: 'Eine kleine Nachtmusik',
        glyph: '\u{1F3BB}',
        recorded: 'recordedNachtmusik',
        kind: 'big',
        flavour: "Mozart's serenade, repeating its own theme.",
      },
      {
        id: 'bald_mountain',
        name: 'Night on Bald Mountain',
        glyph: '\u{1F3BB}',
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
