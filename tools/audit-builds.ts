// Opening-rack opportunities for five item strategies. A solver can show
// whether a payoff exists, but cannot establish that players will find it,
// buy the item, enjoy waiting for a cue, or win a whole run with it.
(globalThis as { window?: unknown }).window ??= globalThis;

async function main() {
  await import('../js/wordbound/wordlist.js');
  await import('../src/engine/lexicon');

  const { createRunFacadeFromOpts, fromSeed } =
    await import('../src/engine/state/facade');
  const { createBagDeck } = await import('../src/engine/content/tileBags');
  const { CHARACTER_DEFS } = await import('../src/engine/content/characters');
  const { bestFromRack } = await import('../src/engine/content/wordFinder');

  const builds = [
    {
      name: 'short',
      item: 'short_form',
      accepts: (word: string) => word.length <= 4,
    },
    {
      name: 'long',
      item: 'long_form',
      accepts: (word: string) => word.length >= 6,
    },
    {
      name: 'rare',
      item: 'hard_consonant',
      accepts: (word: string) => /[KQXZJ]/.test(word),
    },
    { name: 'held', item: 'harmony', accepts: () => true },
    { name: 'musical', item: 'climax', accepts: () => true },
  ] as const;
  const rows: {
    build: string;
    character: string;
    available: boolean;
    score: number;
    lift: number;
    target: number;
  }[] = [];

  for (let index = 1; index <= 30; index++) {
    const seed = `opening-audit-20260918-${String(index).padStart(2, '0')}`;
    for (const character of ['ee', 'zed']) {
      const passive = CHARACTER_DEFS[character]?.itemId;
      const startingItems = passive ? [passive] : [];
      const options = {
        deck: createBagDeck('normal', []),
        characterId: character,
        seed,
      };
      const base = createRunFacadeFromOpts(
        { ...options, items: startingItems },
        fromSeed(seed),
      );
      const baseRound = base.round!;
      const liveBaseRound = createRunFacadeFromOpts(
        {
          ...options,
          items: startingItems,
          crescendo: () => ({ phase: 'live', mag: 1 }),
        },
        fromSeed(seed),
      ).round!;
      const letters = baseRound.rack
        .map((tile) => tile.letter)
        .concat(base.characterTile ? [base.characterTile.letter] : [])
        .join('');
      const candidates = bestFromRack(letters, undefined, 10000)
        .map(({ word }) => word)
        .filter((word) => baseRound.isPlayable(word));

      for (const build of builds) {
        const run = createRunFacadeFromOpts(
          {
            ...options,
            items: [...startingItems, build.item],
            crescendo:
              build.name === 'musical'
                ? () => ({ phase: 'live', mag: 1 })
                : undefined,
          },
          fromSeed(seed),
        );
        const round = run.round!;
        if (
          round.rack.map((tile) => tile.letter).join('') !==
          baseRound.rack.map((tile) => tile.letter).join('')
        ) {
          throw new Error(
            `Item changed the opening rack: ${seed}, ${build.name}`,
          );
        }
        let best: { score: number; lift: number } | null = null;
        for (const word of candidates) {
          if (!build.accepts(word)) continue;
          const breakdown = round.breakdownFor(word);
          if (build.name === 'held' && !breakdown.chordWord) continue;
          const baseScore =
            build.name === 'musical'
              ? liveBaseRound.breakdownFor(word).total
              : baseRound.breakdownFor(word).total;
          const lift = breakdown.total - baseScore;
          if (lift <= 0) continue;
          if (!best || breakdown.total > best.score) {
            best = { score: breakdown.total, lift };
          }
        }
        rows.push({
          build: build.name,
          character,
          available: !!best,
          score: best?.score ?? 0,
          lift: best?.lift ?? 0,
          target: round.target,
        });
      }
    }
  }

  const summary = Object.fromEntries(
    builds.map(({ name }) => {
      const group = rows.filter((row) => row.build === name);
      const available = group.filter((row) => row.available);
      const mean = (values: number[]) =>
        +(
          values.reduce((sum, value) => sum + value, 0) / values.length
        ).toFixed(1);
      return [
        name,
        {
          availableOpeningRacks: available.length,
          examined: group.length,
          meanBestScoreWhenAvailable: available.length
            ? mean(available.map((row) => row.score))
            : null,
          meanItemLiftWhenAvailable: available.length
            ? mean(available.map((row) => row.lift))
            : null,
          oneWordTargetHits: available.filter((row) => row.score >= row.target)
            .length,
          byCharacter: Object.fromEntries(
            ['ee', 'zed'].map((character) => [
              character,
              group.filter(
                (row) => row.character === character && row.available,
              ).length,
            ]),
          ),
        },
      ];
    }),
  );
  console.log(
    JSON.stringify(
      {
        method:
          '30 fixed opening seeds × 2 characters; same opening rack with one representative item; solver-selected best qualifying word',
        summary,
        limits:
          'Only an opening-rack opportunity ceiling. Musical assumes a live swell. No shop access, multi-fight path, player vocabulary, waiting, or enjoyment is measured.',
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
