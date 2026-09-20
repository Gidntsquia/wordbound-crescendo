import { useState } from 'react';
import { TileFace } from '@/components/tile-face';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MAX_QUILLS } from '@/game/content/fights';
import { MARKS } from '@/game/content/marks';
import { QUILLS } from '@/game/content/quills';
import type { MarkId, QuillId, Run } from '@/game/types';

interface ShopScreenProps {
  run: Run;
  onBuyQuill: (id: QuillId) => void;
  onBuyMark: (id: MarkId, tileId: number) => void;
  onContinue: () => void;
}

/** Spend gold on quills and marks, then continue to the next fight. */
export function ShopScreen({
  run,
  onBuyQuill,
  onBuyMark,
  onContinue,
}: ShopScreenProps) {
  const { shop } = run;
  // A mark is bought in two taps: the offer, then the deck tile to stamp it on.
  const [marking, setMarking] = useState<MarkId | null>(null);
  if (!shop) return null;

  if (marking) {
    return (
      <section className="flex flex-col gap-4">
        <p className="font-medium">
          Pick a tile for {MARKS[marking].name} ({MARKS[marking].description})
        </p>
        <div className="grid grid-cols-5 justify-items-center gap-2">
          {run.deck.map((tile) => (
            <TileFace
              key={tile.id}
              tile={tile}
              disabled={tile.mark !== null}
              onClick={() => {
                onBuyMark(marking, tile.id);
                setMarking(null);
              }}
            />
          ))}
        </div>
        <Button variant="outline" onClick={() => setMarking(null)}>
          Cancel
        </Button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Shop</h2>
      <p className="text-sm">Fight won. Gold: {run.gold}</p>

      <h3 className="font-medium">Quills</h3>
      {shop.quills.map((offer) => {
        const quill = QUILLS[offer.id];
        const blocked =
          offer.sold ||
          run.gold < quill.price ||
          run.quills.length >= MAX_QUILLS;
        return (
          <Card key={offer.id} size="sm">
            <CardHeader>
              <CardTitle>{quill.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-2 text-sm">
              <span>{quill.description}</span>
              <Button disabled={blocked} onClick={() => onBuyQuill(offer.id)}>
                {offer.sold ? 'Sold' : `Buy ${quill.price}`}
              </Button>
            </CardContent>
          </Card>
        );
      })}

      <h3 className="font-medium">Marks</h3>
      {shop.marks.map((offer) => {
        const mark = MARKS[offer.id];
        return (
          <Card key={offer.id} size="sm">
            <CardHeader>
              <CardTitle>{mark.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-2 text-sm">
              <span>{mark.description}</span>
              <Button
                disabled={offer.sold || run.gold < mark.price}
                onClick={() => setMarking(offer.id)}
              >
                {offer.sold ? 'Sold' : `Buy ${mark.price}`}
              </Button>
            </CardContent>
          </Card>
        );
      })}

      {run.notice && <p className="text-sm">{run.notice}</p>}
      <Button size="lg" onClick={onContinue}>
        Next fight
      </Button>
    </section>
  );
}
