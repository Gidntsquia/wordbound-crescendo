// The bag/discard-pile details disclosure. Extracted from PlayBoard.jsx
// (READ_SLOWLY_PLAN.md A4).
import type { Tile } from '../../engine/tiles';

export default function PilesDrawer({
  drawPile,
  discardPile,
  characterTile,
}: {
  drawPile: readonly unknown[];
  discardPile: readonly Tile[];
  characterTile?: Tile | null;
}) {
  return (
    <details
      className="sb-piles group -my-1 mb-3 text-xs text-[var(--leaf-dim)] max-[620px]:mb-1"
      aria-label="The bag and the discard pile"
    >
      <summary
        className="flex min-h-10 list-none flex-wrap items-baseline gap-3 py-1.5 [&::-webkit-details-marker]:hidden"
        title="Played and swapped tiles wait here until the bag is empty; the bag reshuffles each fight."
      >
        <span>
          <b className="font-bold text-[var(--ink)]">{drawPile.length}</b> in
          the bag
        </span>
        <span>
          <b className="font-bold text-[var(--ink)]">{discardPile.length}</b>{' '}
          discarded
        </span>
      </summary>
      {characterTile && (
        <p
          className="sb-hint text-[11px] text-[var(--leaf-dim)] italic"
          title="Your character's letter is never drawn or discarded -- it stays in its own slot."
        >
          <span className="sb-pile-tile is-character inline-flex h-[26px] w-[22px] items-center justify-center rounded border border-[var(--gilt,var(--brass-hot))] bg-[var(--gilt,var(--brass-hot))] text-xs font-bold text-[var(--ink)]">
            {characterTile.letter}
          </span>{' '}
          is your own — never in the bag or the discard pile.
        </p>
      )}
      <div className="sb-pile-tiles flex flex-wrap gap-1 pt-1 pb-2">
        {discardPile.length === 0 && (
          <span className="sb-hint text-[11px] text-[var(--leaf-dim)] italic">
            Nothing discarded yet.
          </span>
        )}
        {discardPile.map((t) => (
          <span
            key={t.id}
            className={
              'sb-pile-tile inline-flex h-[26px] w-[22px] items-center justify-center rounded border border-[var(--leaf-dim)] text-xs font-bold text-[var(--ink)] opacity-75' +
              (t.mark ? ' is-' + t.mark : '')
            }
          >
            {t.letter}
          </span>
        ))}
      </div>
    </details>
  );
}
