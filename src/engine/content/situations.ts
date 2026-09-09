// READ_SLOWLY_PLAN.md stage C: the framing layered on a fight -- an opening
// beat, a person to help, a resolution beat on the win. Mechanically the
// fight is unchanged (reach the target in N words); the situation adds a
// state ladder driven by score progress so every word visibly moves the
// person toward the book. `person`/`antagonist`/pose ids are placeholders
// until stage E's sprite sheets exist -- they are plain strings used only
// as lookup keys, not rendered as art yet.

export type SituationId = string;
export type SpriteId = string;
export type PoseId = string;

export interface LadderStep {
  at: number; // fraction of target score, ascending, first is 0
  caption: string;
  personPose: PoseId;
  antagonistPose: PoseId;
}

export interface Situation {
  id: SituationId;
  title: string;
  opening: string[];
  person: SpriteId;
  antagonist: SpriteId;
  ladder: LadderStep[];
  resolution: string[];
  failure: string;
}

// One situation per chapter's person; the pressure/finale fights in a
// chapter reuse it (only the antagonist enemy changes) -- see enemies.ts's
// per-enemy `situation` field.
export const SITUATIONS: Record<SituationId, Situation> = {
  the_commute: {
    id: 'the_commute',
    title: 'A commuter, lit by a screen',
    opening: [
      'Thumb moving. Eyes glazed. The platform announcement goes unheard.',
    ],
    person: 'commuter',
    antagonist: 'phone_glow',
    ladder: [
      {
        at: 0,
        caption: 'Thumb moving. Eyes glazed.',
        personPose: 'scrolling',
        antagonistPose: 'glow',
      },
      {
        at: 0.3,
        caption: 'A word catches. The thumb stops.',
        personPose: 'paused',
        antagonistPose: 'glow-dim',
      },
      {
        at: 0.6,
        caption: 'They look up.',
        personPose: 'looking-up',
        antagonistPose: 'flicker',
      },
      {
        at: 0.85,
        caption: 'The phone goes face-down.',
        personPose: 'reaching',
        antagonistPose: 'dark',
      },
      {
        at: 1,
        caption: 'A book. A page. A smile.',
        personPose: 'reading',
        antagonistPose: 'gone',
      },
    ],
    resolution: [
      'A book. A page. A smile.',
      'The train pulls in. They stay seated for one more line.',
    ],
    failure: 'You ran out of words before they looked up.',
  },
  the_square: {
    id: 'the_square',
    title: 'A bench, and no idea what to do with it',
    opening: [
      'Someone sits with nothing to do, and has forgotten boredom has a cure.',
    ],
    person: 'bench_sitter',
    antagonist: 'empty_bench',
    ladder: [
      {
        at: 0,
        caption: 'Staring at nothing in particular.',
        personPose: 'slumped',
        antagonistPose: 'idle',
      },
      {
        at: 0.3,
        caption: 'A word lands. They sit up a little.',
        personPose: 'attentive',
        antagonistPose: 'idle',
      },
      {
        at: 0.6,
        caption: 'They lean forward, listening now.',
        personPose: 'leaning',
        antagonistPose: 'weakening',
      },
      {
        at: 0.85,
        caption: 'They pat their pockets for something to write on.',
        personPose: 'searching',
        antagonistPose: 'weakening',
      },
      {
        at: 1,
        caption: 'A page, dog-eared and read twice.',
        personPose: 'reading',
        antagonistPose: 'gone',
      },
    ],
    resolution: [
      'A page, dog-eared and read twice.',
      'The square empties out around them; they do not notice.',
    ],
    failure:
      'You ran out of words before they found something worth staying for.',
  },
  the_tower: {
    id: 'the_tower',
    title: 'A waiting room with no clock',
    opening: [
      'A person stares at a wall, so bored they have forgotten boredom has a cure.',
    ],
    person: 'waiting_room_sitter',
    antagonist: 'blank_wall',
    ladder: [
      {
        at: 0,
        caption: 'Eyes fixed on nothing. Waiting for nothing in particular.',
        personPose: 'blank',
        antagonistPose: 'idle',
      },
      {
        at: 0.3,
        caption: 'A word breaks the wall’s hold.',
        personPose: 'blinking',
        antagonistPose: 'idle',
      },
      {
        at: 0.6,
        caption: 'They turn away from it, toward the words.',
        personPose: 'turning',
        antagonistPose: 'weakening',
      },
      {
        at: 0.85,
        caption: 'The wall has nothing left to offer them.',
        personPose: 'reaching',
        antagonistPose: 'weakening',
      },
      {
        at: 1,
        caption: 'A book, and the wall behind them, forgotten.',
        personPose: 'reading',
        antagonistPose: 'gone',
      },
    ],
    resolution: [
      'A book, and the wall behind them, forgotten.',
      'The tower goes quiet. Someone is finally reading.',
    ],
    failure: 'You ran out of words before they turned away from the wall.',
  },
};

export function situationFor(
  id: SituationId | null | undefined,
): Situation | null {
  return (id && SITUATIONS[id]) || null;
}

// `at <= score/target`, highest match; `at: 0` always matches so this never
// returns null once `steps` is non-empty. Pure -- no state, safe to call on
// every render.
export function ladderIndex(
  situation: Situation | null,
  score: number,
  target: number,
): number {
  if (!situation || !situation.ladder.length) return -1;
  const frac = target > 0 ? score / target : 0;
  let idx = 0;
  for (let i = 0; i < situation.ladder.length; i++) {
    if (situation.ladder[i]!.at <= frac) idx = i;
  }
  return idx;
}
