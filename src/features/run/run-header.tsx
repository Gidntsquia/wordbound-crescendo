import { Badge } from '@/components/ui/badge';
import { TARGETS } from '@/game/content/fights';
import { QUILLS } from '@/game/content/quills';
import type { Run } from '@/game/types';

/** Fight number, gold, and the quills you hold. */
export function RunHeader({ run }: { run: Run }) {
  return (
    <header className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm font-medium">
        <span>
          Fight {run.fightIndex + 1} / {TARGETS.length}
        </span>
        <span>Gold {run.gold}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {run.quills.length === 0 && (
          <span className="text-muted-foreground text-xs">No quills yet</span>
        )}
        {run.quills.map((id) => (
          <Badge key={id} variant="secondary" title={QUILLS[id].description}>
            {QUILLS[id].name}
          </Badge>
        ))}
      </div>
    </header>
  );
}
