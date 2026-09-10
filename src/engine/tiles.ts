// TS port of js/wordbound/tiles.js (READ_SLOWLY_PLAN.md A2). Deck-building
// layer: createTile/createStarterDeck/rollRewardOptions/rollVariantTile/
// describeBonus/describeVariant/shuffleIntoDrawPile/draw. Still attaches to
// window.Wordbound.Tiles for the untyped js/wordbound/* and sandbox modules
// that read it off the global (removed once every reader imports directly).
import type { RngStream } from './rng';
import { isAvailable as isLetterAvailable } from './meta/stolenLetters';

export const BONUS_TYPES = {
  FLAT_ON_PLAY: 'flatOnPlay',
  MULT_ON_PLAY: 'multOnPlay',
  MULT_ON_HOLD: 'multOnHold',
} as const;
export type BonusType = (typeof BONUS_TYPES)[keyof typeof BONUS_TYPES];

export const VARIANTS = {
  GILDED: 'gilded',
  CHARGED: 'charged',
  VAMPIRIC: 'vampiric',
  VOLATILE: 'volatile',
} as const;
export type Variant = (typeof VARIANTS)[keyof typeof VARIANTS];

export interface TileBonus {
  type: BonusType;
  amount: number;
}

export interface Tile {
  id: string;
  letter: string;
  bonus: TileBonus | null;
  variant: Variant | null;
  crackedThisFight: boolean;
  // Set by marginalia.ts's applyMark (gilt/bold/steel/blank); persists on
  // the tile for the rest of the run, whether it's in the live case or not.
  mark?: string | null;
  // READ_SLOWLY_PLAN.md D1: where this tile came from. Undefined means
  // 'bag' (the overwhelming majority of tiles, created before this field
  // existed) -- only the one permanent character tile (state/run.ts's
  // RunState.characterTile) is tagged 'character'; nothing currently tags
  // 'pack' since pack-rolled tiles behave identically to bag tiles.
  origin?: 'bag' | 'pack' | 'character';
}

export interface PileState {
  drawPile: Tile[];
  discardPile: Tile[];
}

const STARTER_DECK_LETTERS = [
  'A',
  'E',
  'I',
  'O',
  'U',
  'N',
  'R',
  'S',
  'T',
  'L',
  'D',
  'G',
];

let nextTileId = 1;

export function createTile(
  letter: string,
  bonus?: TileBonus | null,
  variant?: Variant | null,
): Tile {
  return {
    id: 'tile' + nextTileId++,
    letter,
    bonus: bonus || null,
    variant: variant || null,
    crackedThisFight: false,
  };
}

export function createStarterDeck(): Tile[] {
  return STARTER_DECK_LETTERS.map((letter) => createTile(letter, null));
}

// Weighted by standard Scrabble letter frequency (Lexicon.LETTER_POOL),
// blanks excluded. Memoized -- the raw pool never changes at runtime.
let baseLetterFrequencyPool: string[] | null = null;
function getBaseLetterFrequencyPool(): string[] {
  if (baseLetterFrequencyPool) return baseLetterFrequencyPool;
  const Lexicon = window.Wordbound.Lexicon;
  const pool: string[] = [];
  Object.keys(Lexicon.LETTER_POOL).forEach((letter) => {
    const count = Lexicon.LETTER_POOL[letter] || 0;
    for (let i = 0; i < count; i++) pool.push(letter);
  });
  baseLetterFrequencyPool = pool;
  return pool;
}

// A currently-stolen letter (DIVERGENCE_PLAN.md meta) never appears in a
// freshly-generated reward/shop tile. Filtered fresh every call, unlike the
// base pool, so a letter recovered mid-run is reflected immediately. `won`
// is the caller's stolenLetters.ts-shaped won-letters list (READ_SLOWLY_PLAN.md
// A2 remainder: a plain import/parameter, not a window global).
function getAvailableLetterFrequencyPool(won: readonly string[]): string[] {
  const base = getBaseLetterFrequencyPool();
  return base.filter((letter) => isLetterAvailable(letter, won));
}

const BONUS_CHANCE = 0.18;

function rollBonus(rng: RngStream): TileBonus | null {
  if (!rng.chance(BONUS_CHANCE)) return null;
  const type = rng.choice([
    BONUS_TYPES.FLAT_ON_PLAY,
    BONUS_TYPES.MULT_ON_PLAY,
    BONUS_TYPES.MULT_ON_HOLD,
  ])!;
  if (type === BONUS_TYPES.FLAT_ON_PLAY)
    return { type, amount: rng.randInt(3, 6) };
  return { type, amount: rng.choice([1.5, 2])! };
}

// FUN OVERHAUL 5/8 (GOALS.md, 2026-08-20): rolled before the legacy bonus
// roll and mutually exclusive with it, so the variant rate is exactly
// VARIANT_CHANCE rather than conditioned on the legacy roll missing first.
const VARIANT_CHANCE = 0.25;
const VARIANT_LIST: Variant[] = [
  VARIANTS.GILDED,
  VARIANTS.CHARGED,
  VARIANTS.VAMPIRIC,
  VARIANTS.VOLATILE,
];

function rollVariant(rng: RngStream): Variant {
  return rng.choice(VARIANT_LIST)!;
}

export function rollRewardOptions(
  rng: RngStream,
  won: readonly string[] = [],
  count = 3,
): Tile[] {
  const pool = getAvailableLetterFrequencyPool(won);
  const options: Tile[] = [];
  for (let i = 0; i < count; i++) {
    const letter = rng.choice(pool)!;
    const variant = rng.chance(VARIANT_CHANCE) ? rollVariant(rng) : null;
    const bonus = variant ? null : rollBonus(rng);
    options.push(createTile(letter, bonus, variant));
  }
  return options;
}

// Guaranteed-variant roll for the shop's premium tile offer -- a "premium"
// offer that sometimes has no variant at all would undercut the point of
// paying extra for one.
export function rollVariantTile(
  rng: RngStream,
  won: readonly string[] = [],
): Tile {
  const pool = getAvailableLetterFrequencyPool(won);
  const letter = rng.choice(pool)!;
  return createTile(letter, null, rollVariant(rng));
}

export function describeBonus(bonus: TileBonus | null): string | null {
  if (!bonus) return null;
  if (bonus.type === BONUS_TYPES.FLAT_ON_PLAY)
    return '+' + bonus.amount + ' score when played';
  if (bonus.type === BONUS_TYPES.MULT_ON_PLAY)
    return '×' + bonus.amount + ' score when played';
  if (bonus.type === BONUS_TYPES.MULT_ON_HOLD)
    return '×' + bonus.amount + ' score when held (not played)';
  return null;
}

export function describeVariant(variant: Variant | null): string | null {
  if (!variant) return null;
  if (variant === VARIANTS.GILDED) return 'Gilded: +2 gold when played';
  if (variant === VARIANTS.CHARGED) return 'Charged: +4 damage when played';
  if (variant === VARIANTS.VAMPIRIC) return 'Vampiric: heal 1 ink when played';
  if (variant === VARIANTS.VOLATILE)
    return 'Volatile: letter scores ×2; 25% chance to crack when played (gone until next fight)';
  return null;
}

export function shuffleIntoDrawPile(deck: Tile[], rng: RngStream): Tile[] {
  return rng.shuffle(deck);
}

export function draw(
  pileState: PileState,
  count: number,
  rng: RngStream,
): Tile[] {
  const drawn: Tile[] = [];
  while (drawn.length < count) {
    if (pileState.drawPile.length === 0) {
      if (pileState.discardPile.length === 0) break;
      pileState.drawPile = rng.shuffle(pileState.discardPile);
      pileState.discardPile = [];
    }
    drawn.push(pileState.drawPile.pop()!);
  }
  return drawn;
}

// The window.Wordbound namespace is assembled across many ported and
// still-untyped modules; WordboundNamespace is augmented (not redeclared)
// wherever another piece of it is ported, so member declarations merge
// instead of colliding (see sandboxGlobal.ts for the same pattern on
// window.Wordbound.Sandbox specifically).
declare global {
  interface WordboundNamespace {
    Tiles: {
      BONUS_TYPES: typeof BONUS_TYPES;
      VARIANTS: typeof VARIANTS;
      createTile: typeof createTile;
      createStarterDeck: typeof createStarterDeck;
      rollRewardOptions: typeof rollRewardOptions;
      rollVariantTile: typeof rollVariantTile;
      describeBonus: typeof describeBonus;
      describeVariant: typeof describeVariant;
      shuffleIntoDrawPile: typeof shuffleIntoDrawPile;
      draw: typeof draw;
    };
    Lexicon: {
      LETTER_VALUES: Record<string, number>;
      LETTER_POOL: Record<string, number>;
      isValidWord(word: string): boolean;
      canFormFromRack(
        word: string,
        rack: Tile[],
      ): { possible: boolean; tilesUsed: Tile[] | null };
      removeTiles(rack: Tile[], tilesUsed: Tile[]): void;
      scoreWord(
        word: string,
        tilesUsed: Tile[],
        rackCapacity?: number,
      ): {
        base: number;
        lengthBonus: number;
        bingoBonus: number;
        bonusFlat: number;
        bonusMult: number;
        variantFlat: number;
        total: number;
      };
      hasPlayableWord(rack: Tile[]): boolean;
      hasPlayableInvertedWord(rack: Tile[]): boolean;
    };
    WORD_SET: Set<string>;
    WORDLIST: string[];
    Items?: { FLIP_MAP: Record<string, string> };
    [key: string]: unknown;
  }

  interface Window {
    Wordbound: WordboundNamespace;
  }
}

window.Wordbound = window.Wordbound || ({} as Window['Wordbound']);
window.Wordbound.Tiles = {
  BONUS_TYPES,
  VARIANTS,
  createTile,
  createStarterDeck,
  rollRewardOptions,
  rollVariantTile,
  describeBonus,
  describeVariant,
  shuffleIntoDrawPile,
  draw,
};
