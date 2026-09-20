import { letterValue } from '@/game/content/letters';
import { MARKS } from '@/game/content/marks';
import type { Tile } from '@/game/types';
import { cn } from '@/lib/utils';

interface TileFaceProps {
  tile: Tile;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

/** A letter tile: letter, point value, and its mark if it has one. */
export function TileFace({ tile, selected, disabled, onClick }: TileFaceProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={`${tile.letter}${tile.mark ? `, ${MARKS[tile.mark].name}` : ''}`}
      aria-pressed={selected}
      className={cn(
        'bg-card relative flex size-14 flex-col items-center justify-center rounded-md border text-xl font-semibold',
        selected && 'bg-primary text-primary-foreground',
        disabled && 'opacity-40',
      )}
    >
      {tile.letter}
      <span className="absolute right-1 bottom-0.5 text-[10px] font-normal">
        {letterValue(tile.letter)}
      </span>
      {tile.mark && (
        <span className="absolute top-0.5 left-1 text-[10px] font-normal uppercase">
          {tile.mark}
        </span>
      )}
    </button>
  );
}
