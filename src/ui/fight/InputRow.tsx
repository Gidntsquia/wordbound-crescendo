// Play / Swap / Clear / Best-play buttons, plus the swap callout.
// Extracted from PlayBoard.jsx (READ_SLOWLY_PLAN.md A4).
import { useCallout } from '../chrome/Callout';
import { Button } from '@/ui/primitives/button';

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
  useCallout(
    live &&
      !seen.has('swap') &&
      pickedIds.size > 0 &&
      changeoutsLeft > 0 &&
      seen.has('stick'),
    'Swap tiles you don’t want — ' + changeoutsPerFight + ' per fight',
  );
  return (
    <>
      <div className="sb-input">
        <Button
          type="button"
          className="sb-go"
          variant="paperPrimary"
          onClick={play}
          disabled={!live || !letters}
        >
          Play
        </Button>
        <Button
          type="button"
          variant="paper"
          onClick={changeout}
          disabled={!live || !pickedIds.size || changeoutsLeft <= 0}
          title="Put the chosen tiles back in the bag and draw as many"
        >
          Swap{pickedIds.size ? ' ' + pickedIds.size : ''}
        </Button>
        <Button
          type="button"
          variant="paperGhost"
          onClick={() => setWord('')}
          disabled={!live}
        >
          Clear
        </Button>
        {helper && (
          <Button
            type="button"
            variant="paper"
            onClick={onBestPlay}
            disabled={!live}
          >
            Best play
          </Button>
        )}
      </div>
    </>
  );
}
