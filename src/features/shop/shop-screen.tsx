import { useState } from 'react';
import { TileFace } from '@/components/tile-face';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MAX_QUILLS } from '@/game/content/fights';
import { MARKS } from '@/game/content/marks';
import { QUILLS } from '@/game/content/quills';
import { scoreWord } from '@/game/score';
import type { MarkId, QuillId, Run, Tile } from '@/game/types';

interface ShopScreenProps {
  run: Run;
  onBuyQuill: (id: QuillId) => void;
  onBuyMark: (id: MarkId, tileId: number) => void;
  onReroll: () => void;
  onSellQuill: (id: QuillId) => void;
  onReorderQuill: (id: QuillId, toIndex: number) => void;
  onContinue: () => void;
  onOpenDeck: () => void;
}

/** A deck word to preview offers against: the last word played, or a small sample. */
function previewTiles(run: Run): Tile[] {
  const word = run.lastPlay?.word ?? run.bestPlay?.word;
  if (word) {
    const pool = [...run.deck];
    const tiles: Tile[] = [];
    for (const letter of word) {
      const idx = pool.findIndex((t) => t.letter === letter);
      if (idx === -1) return run.deck.slice(0, 4);
      tiles.push(pool.splice(idx, 1)[0] as Tile);
    }
    return tiles;
  }
  return run.deck.slice(0, 4);
}

/** Spend gold on quills and marks, then continue to the next fight. */
export function ShopScreen({
  run,
  onBuyQuill,
  onBuyMark,
  onReroll,
  onSellQuill,
  onReorderQuill,
  onContinue,
  onOpenDeck,
}: ShopScreenProps) {
  const { shop } = run;
  // A mark is bought in two taps: the offer, then the deck tile to stamp it on.
  const [marking, setMarking] = useState<MarkId | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  if (!shop) return null;

  const sample = previewTiles(run);
  const ctx = {
    fightIndex: run.fightIndex,
    wordsPlayedThisFight: 0,
    swapsLeft: run.fight.swapsLeft,
    playsLeftAfter: run.fight.playsLeft,
    gold: run.gold,
    previousPoints: run.lastPlay?.points ?? 0,
    modifier: null,
  };
  const basePoints = scoreWord(sample, run.quills, ctx).points;
  const sampleWord = sample.map((t) => t.letter).join('');
  const eligibleTiles = run.deck.filter((t) => !t.mark);

  if (marking) {
    return (
      <section className="flex flex-col gap-4">
        <p className="font-medium">
          Choose a tile for {MARKS[marking].name} ({MARKS[marking].description})
        </p>
        <p className="text-muted-foreground text-sm">
          {eligibleTiles.length} tiles can take a mark.
        </p>
        <div className="grid grid-cols-5 justify-items-center gap-2">
          {run.deck.map((tile) => (
            <TileFace
              key={tile.id}
              small
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
      <h2 className="text-primary text-2xl font-bold">The Shop</h2>
      <p className="text-base">Quota met. You hold {run.gold} gold.</p>
      <p className="text-muted-foreground text-sm">
        Offers are priced against your word <strong>{sampleWord}</strong> (
        {basePoints} points now).
      </p>

      {run.quills.length > 0 && (
        <div>
          <h3 className="font-medium">
            Your quills{' '}
            <span className="text-muted-foreground text-sm font-normal">
              (they fire in this order)
            </span>
          </h3>
          <div className="mt-1 flex flex-col gap-1">
            {run.quills.map((id, index) => (
              <div key={id} className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  disabled={index === 0}
                  onClick={() => onReorderQuill(id, index - 1)}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  disabled={index === run.quills.length - 1}
                  onClick={() => onReorderQuill(id, index + 1)}
                >
                  ↓
                </Button>
                {QUILLS[id].signature ? (
                  <Badge variant="secondary" title={QUILLS[id].description}>
                    {QUILLS[id].name} · yours to keep
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    title={QUILLS[id].description}
                    className="cursor-pointer"
                    onClick={() => onSellQuill(id)}
                  >
                    {QUILLS[id].name} · sell for{' '}
                    {Math.max(1, Math.floor(QUILLS[id].price / 2))}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 className="font-medium">Quills</h3>
      {shop.quills.map((offer) => {
        const quill = QUILLS[offer.id];
        const blocked =
          offer.sold ||
          run.gold < offer.price ||
          run.quills.length >= MAX_QUILLS;
        const open = previewing === `q:${offer.id}`;
        const after = scoreWord(sample, [...run.quills, offer.id], ctx).points;
        const delta = after - basePoints;
        return (
          <Card key={offer.id} size="sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  {quill.name}{' '}
                  <span className="text-muted-foreground text-sm tracking-wide uppercase">
                    {quill.rarity}
                  </span>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-base">
              <button
                type="button"
                className="text-left"
                onClick={() => setPreviewing(open ? null : `q:${offer.id}`)}
              >
                {quill.description}
              </button>
              {open && (
                <p className="text-muted-foreground text-sm">
                  {sampleWord}: {basePoints} → {after} points (
                  {delta >= 0 ? '+' : ''}
                  {delta})
                </p>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-sm">
                  Price {offer.price}
                </span>
                <Button disabled={blocked} onClick={() => onBuyQuill(offer.id)}>
                  {offer.sold ? 'Sold' : `Buy ${offer.price}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <h3 className="font-medium">Marks</h3>
      {shop.marks.map((offer) => {
        const mark = MARKS[offer.id];
        const open = previewing === `m:${offer.id}`;
        return (
          <Card key={offer.id} size="sm">
            <CardHeader>
              <CardTitle>
                {mark.name}{' '}
                <span className="text-muted-foreground text-sm tracking-wide uppercase">
                  {mark.rarity}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-base">
              <button
                type="button"
                className="text-left"
                onClick={() => setPreviewing(open ? null : `m:${offer.id}`)}
              >
                {mark.description}
              </button>
              {open && (
                <p className="text-muted-foreground text-sm">
                  {eligibleTiles.length} tiles eligible. Marked in deck:{' '}
                  {run.deck.filter((t) => t.mark).length
                    ? run.deck
                        .filter((t) => t.mark)
                        .map((t) => `${t.letter}:${t.mark}`)
                        .join(', ')
                    : 'none yet'}
                </p>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-sm">
                  Price {offer.price}
                </span>
                <Button
                  disabled={offer.sold || run.gold < offer.price}
                  onClick={() => setMarking(offer.id)}
                >
                  {offer.sold ? 'Sold' : `Buy ${offer.price}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {run.notice && <p className="text-base">{run.notice}</p>}
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={run.gold < shop.rerollCost}
          onClick={onReroll}
        >
          Reroll ({shop.rerollCost === 0 ? 'free' : shop.rerollCost})
        </Button>
        <Button variant="ghost" onClick={onOpenDeck}>
          Deck
        </Button>
      </div>
      <Button size="lg" onClick={onContinue}>
        On to the next chore
      </Button>
    </section>
  );
}
