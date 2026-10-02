import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { COMPOSERS } from '@/game/content/composers';
import { FIGHTS } from '@/game/content/fights';
import { QUILLS } from '@/game/content/quills';
import type { Run } from '@/game/types';

interface EndScreenProps {
  run: Run;
  onNewRun: () => void;
}

export function EndScreen({ run, onNewRun }: EndScreenProps) {
  const won = run.phase === 'won';
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
      <h1 className="text-primary text-3xl font-bold">
        {won ? 'The work is done' : 'Work won this time'}
      </h1>
      <p className="text-muted-foreground">
        {COMPOSERS[run.composer].name}.{' '}
        {won
          ? `All ${FIGHTS.length} chores cleared.`
          : `${FIGHTS[run.fightIndex]?.chore}: ${run.fight.score} of ${run.fight.target}.`}
      </p>

      <div className="w-full text-left text-base">
        <p className="font-medium">Build</p>
        <div className="mt-1 flex flex-wrap justify-start gap-1">
          {run.quills.length === 0 && (
            <span className="text-muted-foreground text-sm">No quills</span>
          )}
          {run.quills.map((id) => (
            <Badge key={id} variant="secondary" title={QUILLS[id].description}>
              {QUILLS[id].name}
            </Badge>
          ))}
        </div>

        <p className="mt-3 font-medium">Marked tiles</p>
        <p className="text-muted-foreground text-sm">
          {marked.length === 0
            ? 'None'
            : marked.map((t) => `${t.letter}:${t.mark}`).join(', ')}
        </p>

        {run.bestPlay && (
          <>
            <p className="mt-3 font-medium">Best word</p>
            <p className="text-muted-foreground text-sm">
              {run.bestPlay.word}, {run.bestPlay.chips} × {run.bestPlay.mult} ={' '}
              {run.bestPlay.points}
            </p>
          </>
        )}

        <p className="mt-3 font-medium">Seed</p>
        <div className="flex items-center gap-2">
          <code className="bg-muted rounded px-2 py-1 text-sm">{run.seed}</code>
          <Button
            variant="outline"
            className="h-7 px-2 text-sm"
            onClick={copySeed}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>

      <Button size="lg" onClick={() => onNewRun()}>
        New run
      </Button>
    </section>
  );
}
