// Parity check for READ_SLOWLY_PLAN.md A3, run level: play a FULL run (every
// fight, shop, pack, letter choice) through the old mutable createRun and
// the new pure createRunState/next/skip/pickLetter/leaveShop/buyCard/
// reroll/openPack/pick_, using the SAME seed and the SAME decisions, and
// diff every observable field after every step.
//
// Old and new engines must NOT share localStorage -- both write wbc.letters/
// wbc.quills (stolenLetters.ts/quillDiscovery.ts) -- if they shared one store
// each engine's writes would perturb the other's later reads. Each engine
// gets its own store object; `current` switches between them around every
// call into either engine (asOld/asNew below).
const oldStore: Record<string, string> = {};
const newStore: Record<string, string> = {};
let current = oldStore;
const g = globalThis as unknown as Record<string, unknown>;
g.window = globalThis;
g.localStorage = {
  getItem: (k: string) => (k in current ? current[k]! : null),
  setItem: (k: string, v: string) => {
    current[k] = String(v);
  },
  removeItem: (k: string) => {
    delete current[k];
  },
};
g.navigator = {};
function asOld<T>(fn: () => T): T {
  current = oldStore;
  return fn();
}
function asNew<T>(fn: () => T): T {
  current = newStore;
  return fn();
}

async function main() {
  await import('../src/engine/rng');
  await import('../js/wordbound/wordlist.js');
  await import('../src/engine/lexicon');
  await import('../src/engine/tiles');
  await import('../src/engine/content/enemies');
  await import('../src/engine/content/situations');
  await import('../src/engine/content/items');
  await import('../src/engine/content/characters');
  await import('../src/engine/content/round');
  await import('../src/engine/content/shop');
  await import('../src/engine/content/marginalia');
  await import('../src/engine/content/wordFinder');
  await import('../src/engine/content/tileBags');
  await import('../src/engine/content/stolenLetters');
  await import('../src/engine/content/quillDiscovery');
  const rngMod = await import('../src/engine/rng');
  const runState = await import('../src/engine/state/run');
  const roundState = await import('../src/engine/state/round');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const W = (globalThis as any).window.Wordbound;
  const SB = W.Sandbox;

  const seed = process.argv[2] || 'sonata-1234';
  const items = ['char_zed'];

  const oldRng = asOld(() => (globalThis as any).window.Game.RNG.create(seed)); // eslint-disable-line @typescript-eslint/no-explicit-any
  const orig = {
    next: oldRng.next.bind(oldRng),
    randInt: oldRng.randInt.bind(oldRng),
    randFloat: oldRng.randFloat.bind(oldRng),
    choice: oldRng.choice.bind(oldRng),
    weightedChoice: oldRng.weightedChoice.bind(oldRng),
    shuffle: oldRng.shuffle.bind(oldRng),
    chance: oldRng.chance.bind(oldRng),
  };
  oldRng.next = (...a: unknown[]) =>
    (orig.next as (...a: unknown[]) => number)(...a);
  oldRng.randInt = (...a: unknown[]) =>
    (orig.randInt as (...a: unknown[]) => number)(...a);
  oldRng.randFloat = (...a: unknown[]) =>
    (orig.randFloat as (...a: unknown[]) => number)(...a);
  oldRng.choice = (...a: unknown[]) =>
    (orig.choice as (...a: unknown[]) => unknown)(...a);
  oldRng.weightedChoice = (...a: unknown[]) =>
    (orig.weightedChoice as (...a: unknown[]) => unknown)(...a);
  oldRng.chance = (...a: unknown[]) =>
    (orig.chance as (...a: unknown[]) => boolean)(...a);
  oldRng.shuffle = (arr: unknown[]) =>
    (orig.shuffle as (a: unknown[]) => unknown[])(arr);
  const oldRun = asOld(() =>
    SB.createRun({
      rng: oldRng,
      deck: SB.createBagDeck('normal'),
      items: items.slice(),
      key: 'c_major',
      crescendo: () => null,
    }),
  );

  let s = rngMod.fromSeed(seed);
  let newRun: runState.RunState;
  asNew(() => {
    const [firstRun, s2] = runState.createRunState(
      {
        deck: SB.createBagDeck('normal'),
        items: items.slice(),
        key: 'c_major',
      },
      s,
    );
    newRun = firstRun;
    s = s2;
  });

  const diffs: string[] = [];
  function check(label: string, a: unknown, b: unknown) {
    const sa = JSON.stringify(a);
    const sb = JSON.stringify(b);
    if (sa !== sb) diffs.push(`${label}: old=${sa} new=${sb}`);
  }
  function snapshotRound(
    r: {
      rack: { letter: string }[];
      target: number;
      premium: unknown;
      favour?: string | null;
    } | null,
  ) {
    if (!r) return null;
    return {
      rack: r.rack.map((t) => t.letter),
      target: r.target,
      premium: r.premium,
      favour: r.favour,
    };
  }
  function compareStep(label: string) {
    check(label + ' enemy', oldRun.enemy?.id, newRun.enemy?.id);
    check(
      label + ' round',
      snapshotRound(oldRun.round),
      snapshotRound(newRun.round),
    );
    check(label + ' ink', oldRun.ink, newRun.ink);
    check(label + ' items', oldRun.items, newRun.items);
    check(label + ' consumables', oldRun.consumables, newRun.consumables);
    check(label + ' tierLevels', oldRun.tierLevels, newRun.tierLevels);
    check(label + ' state', oldRun.state, newRun.state);
    check(
      label + ' movement/stage',
      [oldRun.movement, oldRun.stage],
      [newRun.movement, newRun.stage],
    );
  }

  compareStep('start');

  let guard = 0;
  while (oldRun.state === 'live' && guard++ < 40) {
    const r = oldRun.round;
    while (r.state === 'live') {
      const letters = r.rack.map((t: { letter: string }) => t.letter).join('');
      const best = SB.bestFromRack(letters, (w: string) => w.length, 1);
      let word = best.length ? best[0].word : r.rack[0].letter;
      let oldRes = asOld(() => r.playWord(word));
      let outcome = asNew(() => {
        const [o, s3] = roundState.playWord(newRun.round!, word, s);
        s = s3;
        return o;
      });
      if (!oldRes.ok) {
        const free = r.rack.find((t: { letter: string }) => !r.isBarred(t));
        if (!free) break;
        word = free.letter === '?' ? 'A' : free.letter;
        oldRes = asOld(() => r.playWord(word));
        outcome = asNew(() => {
          const [o, s4] = roundState.playWord(newRun.round!, word, s);
          s = s4;
          return o;
        });
      }
      newRun = { ...newRun, round: outcome.state };
      check(`play "${word}" ok`, oldRes.ok, outcome.result.ok);
      check(
        `play "${word}" total`,
        oldRes.breakdown?.total,
        outcome.result.breakdown?.total,
      );
      compareStep(`after play "${word}"`);
    }
    compareStep('round settled');

    if (r.state === 'lost') {
      asOld(() => oldRun.next());
      asNew(() => {
        const [nr, s5] = runState.next(newRun, s);
        newRun = nr;
        s = s5;
      });
      break;
    }
    asOld(() => oldRun.next());
    asNew(() => {
      const [nr, s5] = runState.next(newRun, s);
      newRun = nr;
      s = s5;
    });
    compareStep('after next()');

    if (oldRun.letterChoice) {
      check(
        'letterChoice options',
        oldRun.letterChoice.options,
        newRun.letterChoice?.options,
      );
      const oldPickRes = asOld(() =>
        oldRun.pickLetter(oldRun.letterChoice.options[0]),
      );
      let ok = false;
      asNew(() => {
        const [nr2, o, s6] = runState.pickLetter(
          newRun,
          newRun.letterChoice!.options[0]!,
          s,
        );
        newRun = nr2;
        ok = o;
        s = s6;
      });
      check('pickLetter ok', oldPickRes, ok);
      compareStep('after pickLetter');
    }

    if (oldRun.shop) {
      check('shop cards', oldRun.shop.cards, newRun.shop?.cards);
      check('shop packs', oldRun.shop.packs, newRun.shop?.packs);
      check('shop ink', oldRun.ink, newRun.ink);

      if (
        oldRun.ink >= oldRun.shop.cards[0].price &&
        oldRun.shop.cards[0].kind === 'item'
      ) {
        const oldRes = asOld(() => oldRun.shop.buy(0));
        let ok = false;
        let newRes: { ok: boolean; card?: unknown } = { ok: false };
        asNew(() => {
          const [nr3, res] = runState.buyCard(newRun, 0);
          newRun = nr3;
          ok = res.ok;
          newRes = res;
        });
        check('buy(0) ok', oldRes.ok, ok);
        check('buy(0) card', oldRes.card, newRes.card);
      }
      compareStep('after buy');

      const p = asOld(() => oldRun.shop.openPack(0));
      let pres = { ok: false };
      asNew(() => {
        const [nr4, r4, s7] = runState.openPack(newRun, 0, s);
        newRun = nr4;
        pres = r4;
        s = s7;
      });
      check('openPack ok', p.ok, pres.ok);
      if (p.ok && pres.ok) {
        check(
          'pack choices',
          oldRun.pack.choices.map(
            (c: { kind: string; tile?: { letter: string }; id?: string }) =>
              c.kind === 'tile'
                ? 'tile:' + c.tile!.letter
                : c.kind + ':' + c.id,
          ),
          newRun.pack?.choices.map((c) =>
            c!.kind === 'tile'
              ? 'tile:' + (c as { tile: { letter: string } }).tile.letter
              : c!.kind + ':' + (c as { id: string }).id,
          ),
        );
        asOld(() => oldRun.pick(0));
        asNew(() => {
          const [nr5] = runState.pick_(newRun, 0);
          newRun = nr5;
        });
      }
      compareStep('after pack pick');

      const oldLeaveRes = asOld(() => oldRun.leaveShop());
      let ok2 = false;
      asNew(() => {
        const [nr6, o, s8] = runState.leaveShop(newRun, s);
        newRun = nr6;
        ok2 = o;
        s = s8;
      });
      check('leaveShop ok', oldLeaveRes, ok2);
      compareStep('after leaveShop');
    }
  }

  compareStep('final');

  if (diffs.length) {
    console.log('PARITY FAILED (' + diffs.length + ' diffs):');
    diffs.slice(0, 40).forEach((d) => console.log(' - ' + d));
    process.exit(1);
  } else {
    console.log('PARITY OK (' + guard + ' rounds, seed ' + seed + ')');
  }
}
main();
