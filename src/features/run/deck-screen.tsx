import { TileFace } from '@/components/tile-face';
import { Button } from '@/components/ui/button';
import type { Run } from '@/game/types';

interface DeckScreenProps {
  run: Run;
  onBack: () => void;
}

/** Every tile in the deck, with its mark if any. */
export function DeckScreen({ run, onBack }: DeckScreenProps) {
  const marked = run.deck.filter((t) => t.mark).length;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Deck</h2>
      <p className="text-muted-foreground text-sm">
        {run.deck.length} tiles · {marked} marked
      </p>
      <div className="grid grid-cols-6 justify-items-center gap-2">
        {run.deck.map((tile) => (
          <TileFace key={tile.id} tile={tile} disabled />
        ))}
      </div>
      <Button onClick={onBack}>Back</Button>
    </section>
  );
}
