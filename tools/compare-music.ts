// Mechanical comparison of the item-only rule and the public phrase reward.
// Fixed-seed solver words are examples, not human enjoyment or balance data.
(globalThis as { window?: unknown }).window ??= globalThis;

async function main() {
  await import('../js/wordbound/wordlist.js');
  await import('../src/engine/lexicon');

  const { createRunFacadeFromOpts, fromSeed } =
    await import('../src/engine/state/facade');
  const { createBagDeck } = await import('../src/engine/content/tileBags');
  const { CHARACTER_DEFS } = await import('../src/engine/content/characters');
  const { bestFromRack } = await import('../src/engine/content/wordFinder');
  const { RECORDINGS } = await import('../src/engine/content/recordings');
  const { CRESCENDO, curateSurges } =
    await import('../src/audio/recordingPlayer');

  const comparisons: {
    build: string;
    phase: 'soon' | 'live' | 'banked';
    oldScore: number;
    prototypeScore: number;
  }[] = [];
  let missingWords = 0;
  for (let index = 1; index <= 30; index++) {
    const seed = `opening-audit-20260918-${String(index).padStart(2, '0')}`;
    for (const character of ['ee', 'zed']) {
      const passive = CHARACTER_DEFS[character]?.itemId;
      const items = passive ? [passive] : [];
      const example = createRunFacadeFromOpts(
        {
          deck: createBagDeck('normal', []),
          characterId: character,
          items,
          tune: { PHRASE_POINTS: 0 },
        },
        fromSeed(seed),
      );
      const round = example.round!;
      const letters = round.rack
        .map((tile) => tile.letter)
        .concat(example.characterTile ? [example.characterTile.letter] : [])
        .join('');
      const word = bestFromRack(
        letters,
        (candidate) => round.scoreFor(candidate),
        50,
      ).find(({ word: candidate }) => round.isPlayable(candidate))?.word;
      if (!word) {
        missingWords++;
        continue;
      }
      for (const [build, addedItem] of [
        ['none', null],
        ['Anticipation', 'anticipation'],
        ['Climax', 'climax'],
      ] as const) {
        for (const phase of ['soon', 'live', 'banked'] as const) {
          const score = (phrasePoints: number) => {
            const run = createRunFacadeFromOpts(
              {
                deck: createBagDeck('normal', []),
                characterId: character,
                items: addedItem ? [...items, addedItem] : items,
                tune: { PHRASE_POINTS: phrasePoints },
                crescendo: () =>
                  phase === 'banked'
                    ? {
                        phase: 'idle',
                        phraseBanked: true,
                        phraseEligible: true,
                      }
                    : { phase, mag: 1 },
              },
              fromSeed(seed),
            );
            return run.round!.breakdownFor(word).total;
          };
          comparisons.push({
            build,
            phase,
            oldScore: score(0),
            prototypeScore: score(2),
          });
        }
      }
    }
  }

  const scoreSummary = Object.fromEntries(
    ['none', 'Anticipation', 'Climax'].map((build) => [
      build,
      Object.fromEntries(
        (['soon', 'live', 'banked'] as const).map((phase) => {
          const rows = comparisons.filter(
            (row) => row.build === build && row.phase === phase,
          );
          const deltas = rows.map((row) => row.prototypeScore - row.oldScore);
          const ratios = rows.map(
            (row) => (100 * (row.prototypeScore - row.oldScore)) / row.oldScore,
          );
          return [
            phase,
            {
              examples: rows.length,
              meanExtraPoints: +(
                deltas.reduce((sum, delta) => sum + delta, 0) / rows.length
              ).toFixed(1),
              maxExtraPoints: Math.max(...deltas),
              meanRelativeIncreasePercent: +(
                ratios.reduce((sum, ratio) => sum + ratio, 0) / rows.length
              ).toFixed(1),
              maxRelativeIncreasePercent: +Math.max(...ratios).toFixed(1),
            },
          ];
        }),
      ),
    ]),
  );

  const cueSpacing = Object.entries(RECORDINGS).map(([id, piece]) => {
    const duration = piece.durationSec || 0;
    const intervals = curateSurges(piece.dynamics?.surges || []).map(
      (surge) => ({
        start: Math.max(0, surge.sec - CRESCENDO.countdown),
        end: Math.min(duration, surge.sec + CRESCENDO.after),
      }),
    );
    let cueSeconds = 0;
    let longestWait = intervals[0]?.start ?? duration;
    let previousEnd = 0;
    for (const interval of intervals) {
      cueSeconds += Math.max(0, interval.end - interval.start);
      longestWait = Math.max(longestWait, interval.start - previousEnd);
      previousEnd = interval.end;
    }
    longestWait = Math.max(longestWait, duration - previousEnd);
    return {
      recording: id,
      cues: intervals.length,
      firstCueAfterSeconds: +(intervals[0]?.start ?? 0).toFixed(1),
      longestWaitSeconds: +longestWait.toFixed(1),
      cueCoveragePercent: +((100 * cueSeconds) / duration).toFixed(1),
    };
  });

  console.log(
    JSON.stringify(
      {
        method:
          '30 fixed seeds × 2 characters; one solver-selected opening word per seed; same word scored with and without +2 phrase points during countdown, live swell, and a saved phrase',
        missingWords,
        scoreSummary,
        cueSpacing,
        limits:
          'Mechanical score and recording timing only; no human waiting or enjoyment measured.',
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
