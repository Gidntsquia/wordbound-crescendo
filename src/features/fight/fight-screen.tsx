import { useEffect, useState } from 'react';
import { TileFace } from '@/components/tile-face';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FightMusic } from '@/features/audio/fight-music';
import { FIGHT_MODIFIERS } from '@/game/content/modifiers';
import { QUILLS } from '@/game/content/quills';
import type { Dictionary } from '@/game/dictionary';
import type { Run } from '@/game/types';

interface FightScreenProps {
  run: Run;
  dictionary: Dictionary;
  onPlay: (tileIds: number[], dictionary: Dictionary) => void;
  onSwap: (tileIds: number[]) => void;
  onOpenDeck: () => void;
  /** Browsers only allow audio after a tap; the app remembers that one happened. */
  musicUnlocked: boolean;
  onUnlockMusic: () => void;
}

const STEP_MS = 260;

/** Tap tiles to spell a word (in tap order), then play it or swap the tiles out. */
export function FightScreen({
  run,
  dictionary,
  onPlay,
  onSwap,
  onOpenDeck,
  musicUnlocked,
  onUnlockMusic,
}: FightScreenProps) {
  const { fight } = run;
  const [picked, setPicked] = useState<number[]>([]);
  const [openQuill, setOpenQuill] = useState<string | null>(null);

  // Reveal the play's tally steps one at a time so a play feels like it
  // happened; tapping the reveal jumps straight to the total.
  const totalSteps = run.lastPlay?.steps.length ?? 0;
  const [revealedPlay, setRevealedPlay] = useState(run.lastPlay);
  const [revealIndex, setRevealIndex] = useState(totalSteps);
  if (run.lastPlay !== revealedPlay) {
    setRevealedPlay(run.lastPlay);
    setRevealIndex(
      run.lastPlay && run.lastPlay.steps.length > 1 ? 0 : totalSteps,
    );
  }
  useEffect(() => {
    if (!run.lastPlay || run.lastPlay.steps.length <= 1) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setRevealIndex(i);
      if (i >= run.lastPlay!.steps.length) clearInterval(id);
    }, STEP_MS);
    return () => clearInterval(id);
  }, [run.lastPlay]);

  const byId = new Map(fight.hand.map((t) => [t.id, t]));
  const word = picked.map((id) => byId.get(id)?.letter ?? '').join('');
  const progress = Math.min(
    100,
    Math.round((fight.score / fight.target) * 100),
  );

  const toggle = (id: number) => {
    onUnlockMusic();
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };
  const act = (fn: (ids: number[]) => void) => {
    onUnlockMusic();
    fn(picked);
    setPicked([]);
  };

  const reveal = run.lastPlay?.steps.slice(0, Math.max(1, revealIndex));
  const revealing = totalSteps > 0 && revealIndex < totalSteps;
  const lastStep = reveal?.[reveal.length - 1];

  return (
    <section className="flex flex-col gap-4">
      <div>
        <p className="text-3xl font-bold">
          {fight.score}{' '}
          <span className="text-muted-foreground text-lg">
            / {fight.target}
          </span>
        </p>
        <div className="bg-muted mt-1 h-2 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          {fight.playsLeft} plays · {fight.swapsLeft} swaps
        </p>
        {fight.modifier && (
          <p className="text-sm font-medium">
            {FIGHT_MODIFIERS[fight.modifier].name} —{' '}
            <span className="text-muted-foreground">
              {FIGHT_MODIFIERS[fight.modifier].description}
            </span>
          </p>
        )}
      </div>

      {run.quills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {run.quills.map((id) => (
            <Badge
              key={id}
              variant={openQuill === id ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => setOpenQuill((o) => (o === id ? null : id))}
            >
              {QUILLS[id].name}
            </Badge>
          ))}
        </div>
      )}
      {openQuill && (
        <p className="text-muted-foreground -mt-2 text-xs">
          {QUILLS[openQuill as keyof typeof QUILLS].description}
        </p>
      )}

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
        <Button variant="ghost" onClick={onOpenDeck}>
          Deck
        </Button>
      </div>

      <button
        type="button"
        className="min-h-14 w-full text-left text-sm"
        aria-live="polite"
        onClick={() => revealing && setRevealIndex(totalSteps)}
      >
        {run.notice && <p className="text-destructive">{run.notice}</p>}
        {!run.notice && run.lastPlay && lastStep && (
          <p>
            <strong>{run.lastPlay.word}</strong>{' '}
            {revealing ? (
              <span>
                {lastStep.label}: {lastStep.tally.chips} × {lastStep.tally.mult}
                <span className="text-muted-foreground"> (tap to skip)</span>
              </span>
            ) : (
              <span>
                {run.lastPlay.chips} × {run.lastPlay.mult} ={' '}
                {run.lastPlay.points}
                {run.lastPlay.notes.length > 0 && (
                  <span className="text-muted-foreground">
                    {' '}
                    ({run.lastPlay.notes.join(', ')})
                  </span>
                )}
              </span>
            )}
          </p>
        )}
      </button>

      <FightMusic fightIndex={run.fightIndex} unlocked={musicUnlocked} />
    </section>
  );
}
