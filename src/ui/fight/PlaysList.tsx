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
    <ol className="m-0 mt-3.5 flex list-none flex-col gap-1 p-0">
      {shown.map((p, i) => (
        <li
          key={i}
          className="grid grid-cols-[140px_minmax(0,1fr)_56px] items-baseline gap-3 border-b border-[rgba(44,46,69,0.6)] py-1.5"
        >
          <span className="text-xl font-[var(--display)] tracking-[0.04em]">
            {i === plays.length - 1 && p.tiles
              ? p.tiles.map((t, j) => (
                  <i key={t.id} data-flip-tile-id={t.id}>
                    {p.word[j]}
                  </i>
                ))
              : p.word}
          </span>
          <span className="text-[11px] font-[var(--figure)] text-[var(--leaf-dim)] max-[620px]:text-[10px]">
            {describe(p.breakdown)}
          </span>
          <b className="text-right text-lg font-[var(--figure)] text-[var(--brass-hot)] tabular-nums">
            {p.breakdown.total}
          </b>
        </li>
      ))}
    </ol>
  );
}
