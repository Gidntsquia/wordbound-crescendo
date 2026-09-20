export type MarkId = 'gilt' | 'bold' | 'double' | 'keen';
export type QuillId =
  'inkpot' | 'metronome' | 'chorus' | 'longhand' | 'rarekey' | 'shortnotes';

export interface Tile {
  id: number;
  letter: string;
  mark: MarkId | null;
}

/** Running score of one word: chips × mult = points. */
export interface Tally {
  chips: number;
  mult: number;
}

export interface WordPlay {
  word: string;
  chips: number;
  mult: number;
  points: number;
  /** Human-readable lines for each bonus that fired. */
  notes: string[];
}

export interface Fight {
  target: number;
  score: number;
  playsLeft: number;
  swapsLeft: number;
  hand: Tile[];
  drawPile: Tile[];
  discardPile: Tile[];
}

export interface ShopOffer<Id extends string> {
  id: Id;
  sold: boolean;
}

export interface Shop {
  quills: ShopOffer<QuillId>[];
  marks: ShopOffer<MarkId>[];
}

export type Phase = 'fight' | 'shop' | 'won' | 'lost';

export interface Run {
  seed: number;
  rng: number;
  phase: Phase;
  /** Zero-based index of the current (or last) fight. */
  fightIndex: number;
  gold: number;
  deck: Tile[];
  quills: QuillId[];
  fight: Fight;
  shop: Shop | null;
  lastPlay: WordPlay | null;
  /** One-line feedback for the last action (e.g. a rejected word). */
  notice: string | null;
}
