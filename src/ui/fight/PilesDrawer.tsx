// The bag/discard-pile details disclosure. Extracted from PlayBoard.jsx
// (READ_SLOWLY_PLAN.md A4).
interface Tile {
  id: string;
  letter: string;
  mark?: string;
}

export default function PilesDrawer({
  drawPile,
  discardPile,
}: {
  drawPile: unknown[];
  discardPile: Tile[];
}) {
  return (
    <details className="sb-piles" aria-label="The bag and the discard pile">
      <summary title="Played and swapped tiles wait here until the bag is empty; the bag reshuffles each fight.">
        <span>
          <b>{drawPile.length}</b> in the bag
        </span>
        <span>
          <b>{discardPile.length}</b> discarded
        </span>
      </summary>
      <div className="sb-pile-tiles">
        {discardPile.length === 0 && (
          <span className="sb-hint">Nothing discarded yet.</span>
        )}
        {discardPile.map((t) => (
          <span
            key={t.id}
            className={'sb-pile-tile' + (t.mark ? ' is-' + t.mark : '')}
          >
            {t.letter}
          </span>
        ))}
      </div>
    </details>
  );
}
