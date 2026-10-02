import { Badge } from '@/components/ui/badge';
import { COMPOSERS } from '@/game/content/composers';
import { FIGHTS } from '@/game/content/fights';
import { QUILLS } from '@/game/content/quills';
import type { Run } from '@/game/types';

/** A brass plate: composer, fight number, gold; then the quills you hold, in firing order. */
export function RunHeader({ run }: { run: Run }) {
  return (
    <header className="flex flex-col gap-2">
      <div className="brass-plate font-display flex items-center justify-between rounded-sm px-3 py-1.5 text-sm font-bold">
        <span>{COMPOSERS[run.composer].name}</span>
        <span>
          Fight {run.fightIndex + 1} of {FIGHTS.length}
        </span>
        <span>{run.gold} gold</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {run.phase !== 'fight' &&
          run.quills.map((id) => (
            <Badge key={id} variant="secondary" title={QUILLS[id].description}>
              {QUILLS[id].name}
            </Badge>
          ))}
      </div>
    </header>
  );
}
