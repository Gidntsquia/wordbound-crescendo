import { useReducer } from 'react';
import type { Dictionary } from '@/game/dictionary';
import { newRun, nextFight, play, swap } from '@/game/run';
import { buyMark, buyQuill } from '@/game/shop';
import type { MarkId, QuillId, Run } from '@/game/types';

type Action =
  | { type: 'play'; tileIds: number[]; dictionary: Dictionary }
  | { type: 'swap'; tileIds: number[] }
  | { type: 'nextFight' }
  | { type: 'buyQuill'; id: QuillId }
  | { type: 'buyMark'; id: MarkId; tileId: number }
  | { type: 'newRun'; seed: number };

function reducer(run: Run, action: Action): Run {
  switch (action.type) {
    case 'play':
      return play(run, action.tileIds, action.dictionary);
    case 'swap':
      return swap(run, action.tileIds);
    case 'nextFight':
      return nextFight(run);
    case 'buyQuill':
      return buyQuill(run, action.id);
    case 'buyMark':
      return buyMark(run, action.id, action.tileId);
    case 'newRun':
      return newRun(action.seed);
  }
}

export const randomSeed = () => Math.floor(Math.random() * 2 ** 32);

/** The current run plus a dispatcher; all rules live in `src/game`. */
export function useRun() {
  return useReducer(reducer, undefined, () => newRun(randomSeed()));
}
