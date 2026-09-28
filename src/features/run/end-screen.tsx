import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FIGHTS } from '@/game/content/fights';
import { QUILLS } from '@/game/content/quills';
import type { Run } from '@/game/types';

interface EndScreenProps {
  run: Run;
  onNewRun: (seed?: number) => void;
}

export function EndScreen({ run, onNewRun }: EndScreenProps) {
  const won = run.phase === 'won';
  const [seedInput, setSeedInput] = useState('');
  const [copied, setCopied] = useState(false);
  const marked = run.deck.filter((t) => t.mark);

  const copySeed = () => {
    void navigator.clipboard?.writeText(String(run.seed)).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };

  return (
    <section className="flex flex-col items-center gap-4 py-8 text-center">
      <h1 className="text-3xl font-bold">
        {won ? 'You won the run' : 'You lost'}
      </h1>
      <p className="text-muted-foreground">
        {won
          ? `All ${FIGHTS.length} fights cleared.`
          : `Fight ${run.fightIndex + 1} of ${FIGHTS.length}: ${run.fight.score} of ${run.fight.target}.`}
      </p>

      <div className="w-full text-left text-sm">
        <p className="font-medium">Build</p>
        <div className="mt-1 flex flex-wrap justify-start gap-1">
          {run.quills.length === 0 && (
            <span className="text-muted-foreground text-xs">No quills</span>
          )}
          {run.quills.map((id) => (
            <Badge key={id} variant="secondary" title={QUILLS[id].description}>
              {QUILLS[id].name}
            </Badge>
          ))}
        </div>

        <p className="mt-3 font-medium">Marked tiles</p>
        <p className="text-muted-foreground text-xs">
          {marked.length === 0
            ? 'None'
            : marked.map((t) => `${t.letter}:${t.mark}`).join(', ')}
        </p>

        {run.bestPlay && (
          <>
            <p className="mt-3 font-medium">Best word</p>
            <p className="text-muted-foreground text-xs">
              {run.bestPlay.word} — {run.bestPlay.chips} × {run.bestPlay.mult} ={' '}
              {run.bestPlay.points} pts
            </p>
          </>
        )}

        <p className="mt-3 font-medium">Seed</p>
        <div className="flex items-center gap-2">
          <code className="bg-muted rounded px-2 py-1 text-xs">{run.seed}</code>
          <Button
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={copySeed}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>

      <Button size="lg" onClick={() => onNewRun()}>
        New run
      </Button>

      <div className="flex w-full items-center gap-2">
        <input
          value={seedInput}
          onChange={(e) => setSeedInput(e.target.value)}
          placeholder="Play a seed…"
          inputMode="numeric"
          className="border-input bg-background h-9 flex-1 rounded-md border px-3 text-sm"
        />
        <Button
          variant="outline"
          disabled={!seedInput.trim() || Number.isNaN(Number(seedInput))}
          onClick={() => onNewRun(Number(seedInput))}
        >
          Play seed
        </Button>
      </div>
    </section>
  );
}
