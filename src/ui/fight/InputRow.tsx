// Play / Swap / Clear / Best-play buttons, plus the swap callout above them.
// Extracted from PlayBoard.jsx (READ_SLOWLY_PLAN.md A4).
export default function InputRow({
  live,
  letters,
  play,
  changeout,
  pickedIds,
  changeoutsLeft,
  changeoutsPerFight,
  setWord,
  helper,
  seen,
  onBestPlay,
}: {
  live: boolean;
  letters: string;
  play: () => void;
  changeout: () => void;
  pickedIds: Set<string>;
  changeoutsLeft: number;
  changeoutsPerFight: number;
  setWord: (w: string) => void;
  helper: boolean;
  seen: ReadonlySet<string>;
  onBestPlay: () => void;
}) {
  return (
    <>
      {live &&
        !seen.has('swap') &&
        pickedIds.size > 0 &&
        changeoutsLeft > 0 &&
        seen.has('stick') && (
          <div className="sb-callout">
            Swap tiles you don’t want — {changeoutsPerFight} per fight
          </div>
        )}
      <div className="sb-input">
        <button
          type="button"
          className="sb-go"
          onClick={play}
          disabled={!live || !letters}
        >
          Play
        </button>
        <button
          type="button"
          onClick={changeout}
          disabled={!live || !pickedIds.size || changeoutsLeft <= 0}
          title="Put the chosen tiles back in the bag and draw as many"
        >
          Swap{pickedIds.size ? ' ' + pickedIds.size : ''}
        </button>
        <button type="button" onClick={() => setWord('')} disabled={!live}>
          Clear
        </button>
        {helper && (
          <button type="button" onClick={onBestPlay} disabled={!live}>
            Best play
          </button>
        )}
      </div>
    </>
  );
}
