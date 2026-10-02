// Headless run: `bun run play [--seed=N] [--bot=greedy|lazy|noshop]`.
// A bot plays a whole seeded run through the real game rules (fight → shop →
// fight …) with no browser, and prints what happened. "greedy" plays the
// best-scoring word it can find and buys what it can afford; "lazy" plays the
// first 3-letter word it finds and buys nothing, so it loses; "noshop" plays
// greedily but never spends gold in the shop, so it should stall out.
import { readFileSync } from 'node:fs';
import { parseDictionary, type Dictionary } from '../src/game/dictionary';
import { nextFight, newRun, play, swap } from '../src/game/run';
import { scoreWord } from '../src/game/score';
import { buyMark, buyQuill, rerollShop } from '../src/game/shop';
import { FIGHTS } from '../src/game/content/fights';
import type { ComposerId, Run, Tile } from '../src/game/types';

const args = new Map(
  process.argv
    .slice(2)
    .map((a) => a.replace(/^--/, '').split('=') as [string, string]),
);
const seed = Number(args.get('seed') ?? 7);
const bot = args.get('bot') ?? 'greedy';
const composer = (args.get('composer') ?? 'beethoven') as ComposerId;

const words = readFileSync(
  new URL('../src/game/data/words.txt', import.meta.url),
  'utf8',
);
const dictionary: Dictionary = parseDictionary(words);
const bySortedLetters = new Map<string, string[]>();
for (const w of dictionary) {
  const key = [...w].sort().join('');
  bySortedLetters.set(key, [...(bySortedLetters.get(key) ?? []), w]);
}

/** Every dictionary word spellable from the hand, as ordered tile lists. */
function playable(run: Run): Tile[][] {
  const hand = run.fight.hand;
  const found: Tile[][] = [];
  for (let mask = 1; mask < 1 << hand.length; mask++) {
    const subset = hand.filter((_, i) => mask & (1 << i));
    if (subset.length < 3) continue;
    const key = subset
      .map((t) => t.letter)
      .sort()
      .join('');
    for (const word of bySortedLetters.get(key) ?? []) {
      const pool = [...subset];
      found.push(
        [...word].map(
          (l) =>
            pool.splice(
              pool.findIndex((t) => t.letter === l),
              1,
            )[0] as Tile,
        ),
      );
    }
  }
  return found;
}

function choose(run: Run): Tile[] | null {
  const options = playable(run);
  if (bot === 'lazy') {
    return options.find((o) => o.length === 3) ?? null;
  }
  let best: Tile[] | null = null;
  let bestPoints = -1;
  for (const o of options) {
    const p = scoreWord(o, run.quills, {
      fightIndex: run.fightIndex,
      wordsPlayedThisFight: run.fight.playsTotal - run.fight.playsLeft,
      modifier: run.fight.modifier,
    }).points;
    if (p > bestPoints) [best, bestPoints] = [o, p];
  }
  return best;
}

function shop(run: Run): Run {
  if (bot === 'lazy' || bot === 'noshop' || !run.shop) return run;
  let r = run;
  // Occasionally reroll for a better offer before buying.
  if (r.shop && r.gold >= r.shop.rerollCost + 6) r = rerollShop(r);
  // Buy the priciest affordable quill, then a mark on the last word's first tile.
  const quill = r.shop?.quills
    .filter((o) => !o.sold && o.price <= r.gold)
    .sort((a, b) => b.price - a.price)[0];
  if (quill) r = buyQuill(r, quill.id);
  const mark = r.shop?.marks.find((o) => !o.sold && o.price <= r.gold);
  const target = r.deck.find(
    (t) => !t.mark && r.lastPlay?.word.includes(t.letter),
  );
  if (mark && target) r = buyMark(r, mark.id, target.id);
  return r;
}

let run = newRun(seed, composer);
console.log(`seed ${seed}, bot ${bot}, composer ${composer}`);
let firstWord: { tiles: Tile[]; points: number } | null = null;
let comparison = '';
let sawShopReroll = false;
let sawShopSale = false;

while (run.phase === 'fight') {
  const before = run.fightIndex;
  const mod = run.fight.modifier ? ` [${run.fight.modifier}]` : '';
  const work = run.fight.hand
    .filter((t) => t.work)
    .map((t) => `${t.work}:${t.letter}`);
  const label = `Fight ${before + 1} ${FIGHTS[before]?.chore} (quota ${run.fight.target})${mod}`;
  if (work.length) console.log(`  ${label}: work tiles ${work.join(' ')}`);
  while (run.phase === 'fight' && run.fightIndex === before) {
    const pick = choose(run);
    const prev = run;
    if (!pick) {
      run = swap(
        run,
        run.fight.hand.slice(0, 4).map((t) => t.id),
      );
      if (run === prev || run.notice) break;
      console.log(`  ${label}: no word, swapped`);
      continue;
    }
    run = play(
      run,
      pick.map((t) => t.id),
      dictionary,
    );
    if (run.lastPlay && run !== prev) {
      firstWord ??= { tiles: pick, points: run.lastPlay.points };
      console.log(
        `  ${label}: ${run.lastPlay.word} = ${run.lastPlay.chips} × ${run.lastPlay.mult} = ${run.lastPlay.points}  (score ${run.fight.score})`,
      );
    }
  }
  if (run.phase === 'shop') {
    console.log(`  won fight ${before + 1}; gold ${run.gold}`);
    const goldBefore = run.gold;
    const rerollsBefore = run.shop?.rerolls ?? 0;
    const soldBefore =
      (run.shop?.quills.length ?? 0) + (run.shop?.marks.length ?? 0);
    void soldBefore;
    run = shop(run);
    if ((run.shop?.rerolls ?? 0) > rerollsBefore) sawShopReroll = true;
    if (run.quills.length > 0 || run.deck.some((t) => t.mark))
      sawShopSale = true;
    console.log(
      `  shop: spent ${goldBefore - run.gold}, quills [${run.quills.join(', ')}], marked [${run.deck
        .filter((t) => t.mark)
        .map((t) => t.letter + ':' + t.mark)
        .join(', ')}]`,
    );
    if (firstWord && !comparison && run.quills.length > 0) {
      const same = firstWord.tiles.map(
        (t) => run.deck.find((d) => d.id === t.id) as Tile,
      );
      const after = scoreWord(same, run.quills, {
        fightIndex: run.fightIndex,
      }).points;
      comparison = `same word ${same.map((t) => t.letter).join('')}: ${firstWord.points} points before the shop, ${after} after`;
    }
    run = nextFight(run);
  } else if (run.fight.playsLeft === 0 || run.phase !== 'fight') {
    break;
  }
}

if (comparison) console.log(comparison);
console.log(
  `shop reroll seen: ${sawShopReroll}, shop sale seen: ${sawShopSale}`,
);
console.log(
  run.phase === 'won'
    ? `RESULT: won the run (${run.fightIndex + 1} fights, gold ${run.gold})`
    : `RESULT: lost in fight ${run.fightIndex + 1} (score ${run.fight.score} / ${run.fight.target})`,
);
