// The list of words already played this round. Extracted from
// RoundSandbox.jsx (READ_SLOWLY_PLAN.md A4). Pure props in; describe is
// cardCopy.js's describeBreakdown.
import type { Breakdown } from '../../engine/content/round';

interface Tile {
  id: string;
}

interface Play {
  word: string;
  tiles?: Tile[];
  breakdown: Breakdown;
}

export default function PlaysList({
  plays,
  scoring,
  describe,
}: {
  plays: readonly Play[];
  scoring: { cleared?: boolean } | null;
  describe: (breakdown: Breakdown) => string;
}) {
  const shown = scoring && !scoring.cleared ? plays.slice(0, -1) : plays;
  return (
    <ol className="sb-plays">
      {shown.map((p, i) => (
        <li key={i}>
          <span className="sb-plays-word">
            {i === plays.length - 1 && p.tiles
              ? p.tiles.map((t, j) => (
                  <i key={t.id} data-flip-tile-id={t.id}>
                    {p.word[j]}
                  </i>
                ))
              : p.word}
          </span>
          <span className="sb-plays-how">{describe(p.breakdown)}</span>
          <b className="sb-figure">{p.breakdown.total}</b>
        </li>
      ))}
    </ol>
  );
}
