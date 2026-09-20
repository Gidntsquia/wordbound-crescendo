// Repeatable opening feasibility audit. This is solver-assisted play, so its
// success rates are ceilings, not predictions of human first-fight success.
(globalThis as { window?: unknown }).window ??= globalThis;

async function main() {
  await import('../js/wordbound/wordlist.js');
  await import('../src/engine/lexicon');

  const { createRunFacadeFromOpts, fromSeed } =
    await import('../src/engine/state/facade');
  const { createBagDeck } = await import('../src/engine/content/tileBags');
  const { CHARACTER_DEFS } = await import('../src/engine/content/characters');
  const { bestFromRack } = await import('../src/engine/content/wordFinder');
  const { FAMILIAR_HINTS } = await import('../src/ui/fight/PlayBoard');

  const results: {
    seed: string;
    character: string;
    rack: string;
    premium: string;
    won: boolean;
    score: number;
    target: number;
    words: number;
    swaps: number;
    familiarWord: string | null;
  }[] = [];

  for (let index = 1; index <= 30; index++) {
    const seed = `opening-audit-20260918-${String(index).padStart(2, '0')}`;
    for (const character of ['ee', 'zed']) {
      const passive = CHARACTER_DEFS[character]?.itemId;
      const run = createRunFacadeFromOpts(
        {
          deck: createBagDeck('normal', []),
          characterId: character,
          items: passive ? [passive] : [],
        },
        fromSeed(seed),
      );
      const round = run.round!;
      const rack = round.rack.map((tile) => tile.letter).join('');
      const openingLetters =
        rack + (run.characterTile ? run.characterTile.letter : '');
      const familiarWord =
        bestFromRack(openingLetters, undefined, 10000)
          .map(({ word }) => word)
          .find((word) => FAMILIAR_HINTS.has(word) && round.isPlayable(word)) ??
        null;
      let swaps = 0;
      while (round.state === 'live' && round.playsLeft > 0) {
        const letters = round.rack
          .map((tile) => tile.letter)
          .concat(run.characterTile ? [run.characterTile.letter] : [])
          .join('');
        const candidate = bestFromRack(
          letters,
          (word) => round.scoreFor(word),
          50,
        ).find(({ word }) => round.isPlayable(word));
        if (!candidate) {
          if (round.changeoutsLeft <= 0) break;
          const swapIds = round.rack.map((tile) => tile.id);
          if (!round.changeout(swapIds).ok) break;
          swaps++;
          continue;
        }
        if (!round.playWord(candidate.word).ok) break;
      }
      results.push({
        seed,
        character,
        rack,
        premium: round.premium?.kind ?? 'none',
        won: round.state === 'won',
        score: round.score,
        target: round.target,
        words: round.plays.length,
        swaps,
        familiarWord,
      });
    }
  }

  const summary = Object.fromEntries(
    ['ee', 'zed'].map((character) => {
      const rows = results.filter((row) => row.character === character);
      return [
        character,
        {
          wins: rows.filter((row) => row.won).length,
          seeds: rows.length,
          meanWords: +(
            rows.reduce((sum, row) => sum + row.words, 0) / rows.length
          ).toFixed(2),
          familiarOpenings: rows.filter((row) => row.familiarWord).length,
          failedSeeds: rows.filter((row) => !row.won).map((row) => row.seed),
          noFamiliarOpening: rows
            .filter((row) => !row.familiarWord)
            .map((row) => row.seed),
        },
      ];
    }),
  );
  console.log(
    JSON.stringify(
      { method: 'greedy solver; feasibility ceiling', summary, results },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
