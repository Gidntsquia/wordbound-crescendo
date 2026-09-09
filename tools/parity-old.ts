// Parity baseline for READ_SLOWLY_PLAN.md A3: play one seed through the OLD
// mutable engine and dump a trace (enemies, targets, racks, shop contents,
// scores). tools/parity-new.ts replays the same seed through the immutable
// engine; the two traces must match byte for byte.
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
  await import('../src/engine/content/shop');
  await import('../src/engine/content/marginalia');
  await import('../src/engine/content/wordFinder');
  await import('../src/engine/content/tileBags');
  await import('../src/engine/content/stolenLetters');
  await import('../src/engine/content/quillDiscovery');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const W = (globalThis as any).window.Wordbound;
  const SB = W.Sandbox;
  const seed = process.argv[2] || 'sonata-1234';
  const rng = W.Sandbox && (globalThis as any).window.Game.RNG.create(seed); // eslint-disable-line @typescript-eslint/no-explicit-any
  const run = SB.createRun({
    rng,
    deck: SB.createBagDeck('normal'),
    tune: {},
    items: ['char_zed'],
    key: 'c_major',
    crescendo: () => null,
  });
  const out: unknown[] = [];
  let guard = 0;
  while (run.state === 'live' && guard++ < 60) {
    const r = run.round;
    out.push({
      enemy: run.enemy.id,
      target: r.target,
      premium: r.premium,
      rack: r.rack.map((t: { id: string; letter: string }) => t.id + t.letter),
      favour: r.favour,
      ink: run.ink,
    });
    while (r.state === 'live') {
      const letters = r.rack.map((t: { letter: string }) => t.letter).join('');
      const best = SB.bestFromRack(letters, (w: string) => w.length, 1);
      let word = best.length ? best[0].word : r.rack[0].letter;
      let res = r.playWord(word);
      if (!res.ok) {
        const free = r.rack.find((t: { letter: string }) => !r.isBarred(t));
        if (!free) break;
        word = free.letter === '?' ? 'A' : free.letter;
        res = r.playWord(word);
        if (!res.ok) break;
      }
      out.push({
        play: word,
        ok: res.ok,
        total: res.ok ? res.breakdown.total : res.reason,
        score: r.score,
        rack: r.rack.map(
          (t: { id: string; letter: string }) => t.id + t.letter,
        ),
      });
      if (r.plays.length === 1 && r.changeoutsLeft > 0 && r.state === 'live') {
        const c = r.changeout([r.rack[0].id]);
        out.push({
          swap: c.ok,
          drawn: c.ok ? c.drawn.map((t: { letter: string }) => t.letter) : null,
        });
      }
    }
    out.push({ roundState: r.state, roundInk: r.ink });
    if (r.state === 'lost') {
      run.next();
      break;
    }
    run.next();
    if (run.letterChoice) {
      out.push({ letterChoice: run.letterChoice.options });
      run.pickLetter(run.letterChoice.options[0]);
    }
    if (run.shop) {
      out.push({
        shop: run.shop.cards,
        packs: run.shop.packs,
        ink: run.ink,
      });
      if (
        run.ink >= run.shop.cards[0].price &&
        run.shop.cards[0].kind === 'item'
      )
        run.shop.buy(0);
      const p = run.shop.openPack(0);
      if (p.ok) {
        out.push({
          pack: run.pack.choices.map(
            (c: { kind: string; tile?: { letter: string }; id?: string }) =>
              c.kind === 'tile'
                ? 'tile:' + c.tile!.letter
                : c.kind + ':' + c.id,
          ),
        });
        run.pick(0);
      }
      run.leaveShop();
    }
  }
  out.push({ runState: run.state, ink: run.ink, items: run.items });
  console.log(JSON.stringify(out, null, 1));
}
main();
