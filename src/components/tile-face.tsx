import { letterValue } from '@/game/content/letters';
import { MARKS } from '@/game/content/marks';
import type { Tile } from '@/game/types';
import { cn } from '@/lib/utils';

interface TileFaceProps {
  tile: Pick<Tile, 'letter' | 'mark' | 'work'>;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  /** Leave the chip number off the face (Beethoven's rule, until Play). */
  hideChips?: boolean;
  /** Show this number instead of the letter's value (used during a reveal). */
  chips?: number | null;
  /** Make the tile jump after this many ms. */
  jumpDelay?: number | null;
  small?: boolean;
}

/** A letter tile: letter, chip value, and its mark or work stamp. */
export function TileFace({
  tile,
  selected,
  disabled,
  onClick,
  hideChips,
  chips,
  jumpDelay,
  small,
}: TileFaceProps) {
  const value = tile.work ? 0 : letterValue(tile.letter);
  const shown = chips !== undefined ? chips : hideChips ? null : value;
  const label = tile.work
    ? `${tile.letter}, ${tile.work} work tile`
    : `${tile.letter}${tile.mark ? `, ${MARKS[tile.mark].name}` : ''}`;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      aria-pressed={selected}
      style={
        jumpDelay != null ? { animationDelay: `${jumpDelay}ms` } : undefined
      }
      className={cn(
        'tile font-display relative flex flex-col items-center justify-center rounded-sm',
        small ? 'size-11 text-xl' : 'size-14 text-2xl',
        'font-bold',
        tile.work && 'tile-work',
        tile.mark && 'outline-candle outline-2 outline-offset-1',
        selected && 'tile-picked',
        jumpDelay != null && 'tile-jump',
        disabled && 'opacity-50',
      )}
    >
      {tile.letter}
      {shown !== null && (
        <span
          className={cn(
            'absolute right-1 bottom-0 font-sans text-xs font-semibold',
            shown === 0 && 'text-destructive',
          )}
        >
          {shown}
        </span>
      )}
      {tile.work && (
        <span className="stamp">
          {tile.work === 'foreman' ? 'Foreman' : 'Clerk'}
        </span>
      )}
      {tile.mark && (
        <span className="bg-candle text-accent-foreground absolute -top-2 -left-2 rounded-sm px-1 font-sans text-[10px] leading-tight font-bold uppercase">
          {tile.mark.slice(0, 3)}
        </span>
      )}
    </button>
  );
}
