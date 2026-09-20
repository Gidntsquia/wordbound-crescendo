import { FIGHT_GOLD, GOLD_PER_SPARE_PLAY, TARGETS } from './content/fights';
import { STARTER_BAG } from './content/letters';
import type { Dictionary } from './dictionary';
import { playWord, startFight, swapTiles } from './fight';
import { rollShop } from './shop';
import type { Run, Tile } from './types';

function starterDeck(): Tile[] {
  let id = 1;
  return Object.entries(STARTER_BAG).flatMap(([letter, count]) =>
    Array.from({ length: count }, () => ({ id: id++, letter, mark: null })),
  );
}

/** A fresh run: starter deck, no gold, no quills, fight 1 dealt. */
export function newRun(seed: number): Run {
  const deck = starterDeck();
  const { fight, rng } = startFight(deck, 0, seed);
  return {
    seed,
    rng,
    phase: 'fight',
    fightIndex: 0,
    gold: 0,
    deck,
    quills: [],
    fight,
    shop: null,
    lastPlay: null,
    notice: null,
  };
}

/** Plays tiles as a word; may win the fight (→ shop or run won) or lose the run. */
export function play(
  run: Run,
  tileIds: readonly number[],
  dictionary: Dictionary,
): Run {
  if (run.phase !== 'fight') return run;
  const out = playWord(run.fight, tileIds, run.quills, dictionary, run.rng);
  if (!out.ok) return { ...run, notice: out.reason };
  const next: Run = {
    ...run,
    rng: out.rng,
    fight: out.fight,
    lastPlay: out.play,
    notice: null,
  };
  if (out.fight.score >= out.fight.target) {
    if (run.fightIndex >= TARGETS.length - 1) return { ...next, phase: 'won' };
    const gold =
      run.gold + FIGHT_GOLD + out.fight.playsLeft * GOLD_PER_SPARE_PLAY;
    const rolled = rollShop(run.quills, next.rng);
    return { ...next, phase: 'shop', gold, shop: rolled.shop, rng: rolled.rng };
  }
  if (out.fight.playsLeft === 0) return { ...next, phase: 'lost' };
  return next;
}

export function swap(run: Run, tileIds: readonly number[]): Run {
  if (run.phase !== 'fight') return run;
  const out = swapTiles(run.fight, tileIds, run.rng);
  if (!out) return { ...run, notice: 'No swap.' };
  return { ...run, rng: out.rng, fight: out.fight, notice: null };
}

/** Leaves the shop and deals the next fight. */
export function nextFight(run: Run): Run {
  if (run.phase !== 'shop') return run;
  const fightIndex = run.fightIndex + 1;
  const { fight, rng } = startFight(run.deck, fightIndex, run.rng);
  return {
    ...run,
    phase: 'fight',
    fightIndex,
    fight,
    rng,
    shop: null,
    lastPlay: null,
    notice: null,
  };
}
