import { useState } from 'react';
import { TileFace } from '@/components/tile-face';
import { Button } from '@/components/ui/button';
import { FightMusic } from '@/features/audio/fight-music';
import type { Dictionary } from '@/game/dictionary';
import type { Run } from '@/game/types';

interface FightScreenProps {
  run: Run;
  dictionary: Dictionary;
  onPlay: (tileIds: number[], dictionary: Dictionary) => void;
  onSwap: (tileIds: number[]) => void;
  /** Browsers only allow audio after a tap; the app remembers that one happened. */
  musicUnlocked: boolean;
  onUnlockMusic: () => void;
}

/** Tap tiles to spell a word (in tap order), then play it or swap the tiles out. */
export function FightScreen({
  run,
  dictionary,
  onPlay,
  onSwap,
  musicUnlocked,
  onUnlockMusic,
}: FightScreenProps) {
  const { fight } = run;
  const [picked, setPicked] = useState<number[]>([]);

  const byId = new Map(fight.hand.map((t) => [t.id, t]));
  const word = picked.map((id) => byId.get(id)?.letter ?? '').join('');

  const toggle = (id: number) => {
    onUnlockMusic();
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };
  const act = (fn: (ids: number[]) => void) => {
    onUnlockMusic();
    fn(picked);
    setPicked([]);
  };

  return (
    <section className="flex flex-col gap-4">
      <div>
        <p className="text-3xl font-bold">
          {fight.score}{' '}
          <span className="text-muted-foreground text-lg">
            / {fight.target}
          </span>
        </p>
        <p className="text-muted-foreground text-sm">
          {fight.playsLeft} plays · {fight.swapsLeft} swaps
        </p>
      </div>

      <div className="flex min-h-12 items-center rounded-md border border-dashed px-3 text-2xl font-semibold tracking-widest">
        {word || (
          <span className="text-muted-foreground text-sm font-normal">
            Tap tiles to spell a word
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 justify-items-center gap-2">
        {fight.hand.map((tile) => (
          <TileFace
            key={tile.id}
            tile={tile}
            selected={picked.includes(tile.id)}
            onClick={() => toggle(tile.id)}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={picked.length === 0}
          onClick={() => act((ids) => onPlay(ids, dictionary))}
        >
          Play
        </Button>
        <Button
          className="flex-1"
          variant="outline"
          disabled={picked.length === 0 || fight.swapsLeft === 0}
          onClick={() => act(onSwap)}
        >
          Swap
        </Button>
        <Button
          variant="ghost"
          disabled={picked.length === 0}
          onClick={() => setPicked([])}
        >
          Clear
        </Button>
      </div>

      <div className="min-h-10 text-sm" aria-live="polite">
        {run.notice && <p className="text-destructive">{run.notice}</p>}
        {!run.notice && run.lastPlay && (
          <p>
            <strong>{run.lastPlay.word}</strong> {run.lastPlay.chips} ×{' '}
            {run.lastPlay.mult} = {run.lastPlay.points}
            {run.lastPlay.notes.length > 0 && (
              <span className="text-muted-foreground">
                {' '}
                ({run.lastPlay.notes.join(', ')})
              </span>
            )}
          </p>
        )}
      </div>

      <FightMusic fightIndex={run.fightIndex} unlocked={musicUnlocked} />
    </section>
  );
}
