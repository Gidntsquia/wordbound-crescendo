// Fast-forwards the pure engine (src/engine/state/{run,round}.ts via the
// facade) to a chosen point -- e.g. "enter the shop" -- without a browser.
// For state/economy/logic questions this replaces an end-to-end Playwright
// run entirely: no dev server, no DOM, seconds instead of a minute-plus of
// flaky word-tile clicking. It cannot help with CSS/layout/visual bugs
// (there is no DOM here) -- those still need the `run` skill's browser
// path. See RUNBOOK.md.
// tiles.ts's letter-frequency pool bridges through window.Wordbound.
// StolenLetters (the one legacy global the engine still touches, per
// CLAUDE.md's Map section) -- shim it before any engine module loads, since
// this script runs in Node with no DOM.
(globalThis as { window?: unknown }).window ??= globalThis;

type FacadeModule = typeof import('../src/engine/state/facade');
type RunFacade = ReturnType<FacadeModule['createRunFacadeFromOpts']>;

interface Args {
  seed: string;
  ink?: number;
  fights: number;
  items: string[];
  bag: string;
  json: boolean;
}

function parseArgs(argv: string[]): Args {
  const out: Args = {
    seed: 'debug',
    fights: 1,
    items: [],
    bag: 'normal',
    json: false,
  };
  for (const a of argv) {
    const [k, v] = a.replace(/^--/, '').split('=');
    if (k === 'seed' && v) out.seed = v;
    else if (k === 'ink' && v) out.ink = Number(v);
    else if (k === 'fights' && v) out.fights = Number(v);
    else if (k === 'items' && v) out.items = v.split(',').filter(Boolean);
    else if (k === 'bag' && v) out.bag = v;
    else if (k === 'json') out.json = true;
  }
  return out;
}

// Plays the round out with whatever's the highest-scoring word a SUBSET of
// the current rack can form -- bestFromRack (content/wordFinder.ts), the
// same subset search the shop's off-by-default word helper uses (findWords
// is an anagram-of-everything search and needs the whole rack used at
// once, which the rack essentially never spells outright).
function autoPlayRound(
  run: RunFacade,
  bestFromRack: typeof import('../src/engine/content/wordFinder').bestFromRack,
): void {
  const round = run.round;
  if (!round) return;
  while (round.state === 'live' && round.playsLeft > 0) {
    const letters = round.rack.map((t) => t.letter).join('');
    const words = bestFromRack(letters, (w) => round.scoreFor(w));
    const playable = words.find((w) => round.isPlayable(w.word));
    if (!playable) break;
    const res = round.playWord(playable.word);
    if (!res.ok) break;
  }
}

async function main() {
  // Side-effect only: populates window.Wordbound.WORDLIST/WORD_SET, which
  // wordFinder.ts and Round.isPlayable read off the global (the one legacy
  // global the engine still touches -- CLAUDE.md's Map section).
  await import('../js/wordbound/wordlist.js');
  await import('../src/engine/lexicon');

  const { createRunFacadeFromOpts, fromSeed } =
    await import('../src/engine/state/facade');
  const { bestFromRack } = await import('../src/engine/content/wordFinder');
  const { createBagDeck } = await import('../src/engine/content/tileBags');

  const args = parseArgs(process.argv.slice(2));
  const run = createRunFacadeFromOpts(
    {
      deck: createBagDeck(args.bag, []),
      tune: args.ink !== undefined ? { START_INK: args.ink } : undefined,
      items: args.items.length ? args.items : undefined,
    },
    fromSeed(args.seed),
  );

  let fightsWon = 0;
  for (let guard = 0; guard < 200 && fightsWon < args.fights; guard++) {
    if (run.state !== 'live') break;

    if (run.shop) {
      fightsWon++;
      if (fightsWon >= args.fights) break;
      run.leaveShop();
      continue;
    }
    if (run.letterChoice) {
      run.pickLetter(run.letterChoice.options[0]!);
      continue;
    }
    if (run.pack) {
      run.pick(null); // keep nothing, fastest path through
      continue;
    }
    if (run.round && run.round.state === 'live') {
      autoPlayRound(run, bestFromRack);
      continue;
    }
    run.next();
  }

  const report = {
    reachedShop: !!run.shop,
    fightsWon,
    state: run.state,
    movement: run.movement,
    stage: run.stage,
    ink: run.ink,
    items: run.items,
    shopCards: run.shop?.cards,
    shopPacks: run.shop?.packs,
  };

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `${report.reachedShop ? 'Reached shop' : 'Did not reach shop'} after ${fightsWon} fight(s), movement ${report.movement}.${report.stage}, ink=${report.ink}, state=${report.state}`,
    );
    console.log('items:', report.items);
    if (report.shopCards) console.log('shop cards:', report.shopCards);
    if (report.shopPacks) console.log('shop packs:', report.shopPacks);
  }
}

main();
