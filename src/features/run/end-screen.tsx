import { Button } from '@/components/ui/button';
import { TARGETS } from '@/game/content/fights';
import type { Run } from '@/game/types';

interface EndScreenProps {
  run: Run;
  onNewRun: () => void;
}

export function EndScreen({ run, onNewRun }: EndScreenProps) {
  const won = run.phase === 'won';
  return (
    <section className="flex flex-col items-center gap-4 py-12 text-center">
      <h1 className="text-3xl font-bold">
        {won ? 'You won the run' : 'You lost'}
      </h1>
      <p className="text-muted-foreground">
        {won
          ? `All ${TARGETS.length} fights cleared.`
          : `Fight ${run.fightIndex + 1} of ${TARGETS.length}: ${run.fight.score} of ${run.fight.target}.`}
      </p>
      <Button size="lg" onClick={onNewRun}>
        New run
      </Button>
    </section>
  );
}
