import { scoreWordPoints } from '../../engine/content/round';
import { RULES } from '../../engine/content/enemies';
import type { LastPlayExample } from '../../engine/state/run';
import type { Tune } from '../../engine/content/round';

interface Offer {
  kind: 'item' | 'mark' | 'etude';
  id: string;
}

interface Build {
  items: readonly string[];
  tierLevels: Readonly<Record<string, number>>;
  tune: Tune;
}

// Re-score the actual tiles and premium slot from the latest play. This is a
// historical example, not a forecast of the next rack or encounter rule.
export function upgradeImpact(
  example: LastPlayExample | null,
  offer: Offer,
  build: Build,
): { before: number; after: number; word: string } | null {
  if (!example || offer.kind === 'mark') return null;
  const round = {
    premium: example.premium,
    playsLeft: example.playsLeft,
    plays: example.playsBefore,
    changeoutsLeft: example.changeoutsLeft,
    rule: example.ruleId ? RULES[example.ruleId] || null : null,
  };
  const score = (withOffer: boolean) =>
    scoreWordPoints(example.word, example.tiles, example.rackSize, {
      tune: build.tune,
      items:
        withOffer && offer.kind === 'item'
          ? [...build.items, offer.id]
          : [...build.items],
      tierLevels: {
        ...build.tierLevels,
        ...(withOffer && offer.kind === 'etude'
          ? { [offer.id]: (build.tierLevels[offer.id] || 1) + 1 }
          : {}),
      },
      heldTiles: example.heldTiles,
      run: { itemState: example.itemState },
      round,
      preview: true,
      crescendo: example.crescendo,
      characterTile: example.tiles.find((tile) => tile.origin === 'character'),
    }).total;
  return { before: score(false), after: score(true), word: example.word };
}
