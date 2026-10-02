import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { COMPOSERS, COMPOSER_IDS } from '@/game/content/composers';
import type { ComposerId } from '@/game/types';
import { cn } from '@/lib/utils';
import bach from '@/features/art/img/bach.jpg';
import beethoven from '@/features/art/img/beethoven.jpg';
import mozart from '@/features/art/img/mozart.jpg';

const PORTRAITS: Record<ComposerId, string> = { beethoven, bach, mozart };

interface TitleScreenProps {
  onStart: (composer: ComposerId, seed?: number) => void;
}

/** Pick a composer, optionally a seed, and begin. */
export function TitleScreen({ onStart }: TitleScreenProps) {
  const [picked, setPicked] = useState<ComposerId>('beethoven');
  const [seedInput, setSeedInput] = useState('');
  const seed = seedInput.trim() === '' ? undefined : Number(seedInput);
  const badSeed = seed !== undefined && !Number.isInteger(seed);

  return (
    <section className="flex flex-col gap-4 pt-2">
      <div className="text-center">
        <h1 className="font-display text-primary text-4xl leading-tight font-bold">
          Wordbound
        </h1>
        <p className="font-display text-candle text-xl italic">Crescendo</p>
        <div className="gilt-rule mx-auto mt-2 w-2/3" />
        <p className="text-muted-foreground mt-2 text-base">
          Spell words against the day’s work. Choose who plays.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {COMPOSER_IDS.map((id) => {
          const c = COMPOSERS[id];
          const on = picked === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => setPicked(id)}
              className={cn(
                'bg-card flex gap-3 rounded-md border p-2 text-left transition-colors',
                on
                  ? 'border-gilt shadow-[0_0_14px_oklch(0.78_0.14_70/0.35)]'
                  : 'border-border/50 opacity-80',
              )}
            >
              <img
                src={PORTRAITS[id]}
                alt={`Engraved portrait of ${c.name}`}
                width={84}
                height={101}
                className="border-gilt-shadow h-[101px] w-[84px] shrink-0 border-2 object-cover sepia-[0.25]"
              />
              <span className="flex flex-col">
                <span className="font-display text-primary text-lg font-bold">
                  {c.name}
                </span>
                <span className="text-muted-foreground text-sm">{c.dates}</span>
                <span className="mt-1 text-base leading-snug">{c.twist}</span>
              </span>
            </button>
          );
        })}
      </div>

      <label className="flex items-center gap-2 text-base">
        <span className="text-muted-foreground">Seed (optional)</span>
        <input
          value={seedInput}
          onChange={(e) => setSeedInput(e.target.value)}
          inputMode="numeric"
          aria-invalid={badSeed}
          className="border-input bg-card h-10 min-w-0 flex-1 rounded-md border px-3"
        />
      </label>

      <Button
        size="lg"
        disabled={badSeed}
        onClick={() => onStart(picked, seed)}
      >
        Start as {COMPOSERS[picked].name}
      </Button>
    </section>
  );
}
