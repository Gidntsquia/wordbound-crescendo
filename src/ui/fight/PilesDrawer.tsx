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
    <details className="sb-piles" aria-label="The bag and the discard pile">
      <summary title="Played and swapped tiles wait here until the bag is empty; the bag reshuffles each fight.">
        <span>
          <b>{drawPile.length}</b> in the bag
        </span>
        <span>
          <b>{discardPile.length}</b> discarded
        </span>
      </summary>
      {characterTile && (
        <p
          className="sb-hint"
          title="Your character's letter is never drawn or discarded -- it stays in its own slot."
        >
          <span className="sb-pile-tile is-character">
            {characterTile.letter}
          </span>{' '}
          is your own — never in the bag or the discard pile.
        </p>
      )}
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
