// TS port of src/sandbox/enemies.js (READ_SLOWLY_PLAN.md A2/A5 step 3): the
// lineup (MOVEMENTS) and the boss tempo markings (RULES). Still attaches to
// window.Wordbound.Sandbox for the untyped sandbox modules that read it off
// the global (round.js, RoundSandbox.jsx, ...).
import '../sandboxGlobal';

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
    name: 'First Movement',
    enemies: [
      {
        id: 'bagatelle',
        name: 'The Bagatelle',
        glyph: '\u{1F339}',
        recorded: 'recordedFurElise',
        kind: 'small',
        flavour: 'A trifle. It only wants to be hummed.',
      },
      {
        id: 'moonlight',
        name: 'The Moonlight',
        glyph: '\u{1F319}',
        recorded: 'recordedMoonlight',
        kind: 'big',
        flavour: 'Slow, and it does not blink.',
      },
      {
        id: 'fate',
        name: 'Fate at the Door',
        glyph: '\u{1F451}',
        recorded: 'recordedSymphony5',
        kind: 'boss',
        flavour: 'Four knocks. It is not asking.',
        rule: 'four_knocks',
      },
    ],
  },
  {
    numeral: 'II',
    name: 'Second Movement',
    enemies: [
      {
        id: 'aria',
        name: 'The Aria',
        glyph: '\u{1F54A}\uFE0F',
        recorded: 'recordedGoldbergAria',
        kind: 'small',
        flavour: 'A single line, unhurried. It will wait for you.',
      },
      {
        id: 'mountain_king',
        name: 'The Mountain King',
        glyph: '\u{1F3D4}\uFE0F',
        recorded: 'recordedMountainKing',
        kind: 'big',
        flavour: 'It starts on tiptoe. It does not stay there.',
        rule: 'presto',
      },
      {
        id: 'gallop',
        name: 'The Gallop',
        glyph: '\u{1F40E}',
        recorded: 'recordedWilliamTell',
        kind: 'boss',
        flavour: 'Every letter you spend, it remembers.',
        rule: 'no_repeats',
      },
    ],
  },
  {
    numeral: 'III',
    name: 'Third Movement',
    enemies: [
      {
        id: 'gymnopedie',
        name: 'The Gymnopédie',
        glyph: '\u{1F32B}\uFE0F',
        recorded: 'recordedGymnopedie',
        kind: 'small',
        flavour: 'Slow and sorrowful. It has nowhere to be.',
      },
      {
        id: 'serenade',
        name: 'The Serenade',
        glyph: '\u{1F3BB}',
        recorded: 'recordedNachtmusik',
        kind: 'big',
        flavour: 'A little night music. It knows every step.',
      },
      {
        id: 'bald_mountain',
        name: 'The Bare Mountain',
        glyph: '\u{1F311}',
        recorded: 'recordedBaldMountain',
        kind: 'boss',
        flavour: 'Speak softly here. The loud words are taken from you.',
        rule: 'sotto_voce',
      },
    ],
  },
];

export const KIND_LABEL: Record<EnemyKind, string> = {
  small: 'Small',
  big: 'Big',
  boss: 'Boss',
};

export function enemyAt(movement: number, stage: number): Enemy | null {
  const m = MOVEMENTS[movement];
  return m ? (m.enemies[stage] ?? null) : null;
}

// Tempo markings -- boss rules. round.js reads these at creation (plays,
// targetMult), at scoring (score(ctx, acc) after the items) and at play
// (barsLetter(round, letter)); the UI shows `text` under the target in the
// enemy's voice and greys barred tiles.
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

const Sandbox = window.Wordbound.Sandbox;
Sandbox.MOVEMENTS = MOVEMENTS;
Sandbox.KIND_LABEL = KIND_LABEL;
Sandbox.enemyAt = enemyAt;
Sandbox.RULES = RULES;
