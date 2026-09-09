// Parity check for READ_SLOWLY_PLAN.md A3: play the SAME seed and word
// choices through the pure src/engine/state/round.ts and the mutable
// content/round.ts (createRound), and diff every observable field. Only
// covers round-level state so far (premium roll, rack draws, playWord,
// changeout) -- run-level (createRun) is not ported to pure state yet.
const store: Record<string, string> = {};
const g = globalThis as unknown as Record<string, unknown>;
g.window = globalThis;
g.localStorage = {
  getItem: (k: string) => (k in store ? store[k]! : null),
  setItem: (k: string, v: string) => {
    store[k] = String(v);
  },
  removeItem: (k: string) => {
    delete store[k];
  },
};
g.navigator = {};

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
  await import('../src/engine/content/tileBags');
  const rngMod = await import('../src/engine/rng');
  const roundState = await import('../src/engine/state/round');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const W = (globalThis as any).window.Wordbound;
  const SB = W.Sandbox;

  const seed = process.argv[2] || 'sonata-1234';
  const deckFor = () => SB.createBagDeck('normal');

  // --- old mutable engine ---
  const oldRng = (globalThis as any).window.Game.RNG.create(seed); // eslint-disable-line @typescript-eslint/no-explicit-any
  const oldRound = SB.createRound({ rng: oldRng, deck: deckFor(), items: [] });

  // --- new pure engine, same seed ---
  let s = rngMod.fromSeed(seed);
  const [firstRound, s2] = roundState.createRoundState(
    { deck: deckFor(), items: [] },
    s,
  );
  let newRound = firstRound;
  s = s2;

  const diffs: string[] = [];
  function check(label: string, a: unknown, b: unknown) {
    const sa = JSON.stringify(a);
    const sb = JSON.stringify(b);
    if (sa !== sb) diffs.push(`${label}: old=${sa} new=${sb}`);
  }

  check('premium', oldRound.premium, newRound.premium);
  check(
    'rack letters',
    oldRound.rack.map((t: { letter: string }) => t.letter),
    newRound.rack.map((t) => t.letter),
  );
  check('target', oldRound.target, newRound.target);

  let guard = 0;
  while (
    oldRound.state === 'live' &&
    newRound.state === 'live' &&
    guard++ < 20
  ) {
    const letters = oldRound.rack
      .map((t: { letter: string }) => t.letter)
      .join('');
    const best = SB.bestFromRack(letters, (w: string) => w.length, 1);
    const word = best.length ? best[0].word : oldRound.rack[0].letter;

    const oldRes = oldRound.playWord(word);
    const [outcome, s3] = roundState.playWord(newRound, word, s);
    s = s3;
    newRound = outcome.state;

    check(`play "${word}" ok`, oldRes.ok, outcome.result.ok);
    if (oldRes.ok && outcome.result.ok) {
      check(
        `play "${word}" total`,
        oldRes.breakdown!.total,
        outcome.result.breakdown!.total,
      );
    }
    check(`score after "${word}"`, oldRound.score, newRound.score);
    check(
      `rack after "${word}"`,
      oldRound.rack.map((t: { letter: string }) => t.letter),
      newRound.rack.map((t) => t.letter),
    );
    check(`state after "${word}"`, oldRound.state, newRound.state);

    if (oldRound.state === 'live' && oldRound.changeoutsLeft > 0) {
      const id = oldRound.rack[0].id;
      const oldC = oldRound.changeout([id]);
      const newId = newRound.rack[0]!.id;
      const [cOutcome, s4] = roundState.changeout(newRound, [newId], s);
      s = s4;
      newRound = cOutcome.state;
      check('changeout ok', oldC.ok, cOutcome.result.ok);
      check(
        'rack after changeout',
        oldRound.rack.map((t: { letter: string }) => t.letter),
        newRound.rack.map((t) => t.letter),
      );
    }
  }

  if (diffs.length) {
    console.log('PARITY FAILED:');
    diffs.forEach((d) => console.log(' - ' + d));
    process.exit(1);
  } else {
    console.log('PARITY OK (' + guard + ' plays, seed ' + seed + ')');
  }
}
main();
