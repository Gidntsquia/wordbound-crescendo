export type MarkId =
  'gilt' | 'bold' | 'double' | 'keen' | 'edge' | 'echo' | 'anchor' | 'prism';

export type QuillId =
  | 'inkpot'
  | 'metronome'
  | 'chorus'
  | 'longhand'
  | 'rarekey'
  | 'shortnotes'
  | 'quartz'
  | 'undertow'
  | 'firstletter'
  | 'lastletter'
  | 'palindrome'
  | 'doubleletter'
  | 'alphabetist'
  | 'crescendo'
  | 'encore'
  | 'thrift'
  | 'goldleaf'
  | 'consonantchain'
  | 'markedup'
  | 'fullhand'
  | 'sparerow'
  | 'oldfaithful'
  | 'risingtide'
  | 'lastwordfirst';

export type Rarity = 'common' | 'uncommon' | 'rare';

export type FightModifierId = 'vowelless' | 'shortfuse' | 'stonelipped';

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
  /** Human-readable lines for each bonus that fired, in firing order. */
  notes: string[];
  /** Tally snapshots after each step (base, then each mark, then each quill). */
  steps: { label: string; tally: Tally }[];
}

export interface Fight {
  target: number;
  score: number;
  playsLeft: number;
  swapsLeft: number;
  hand: Tile[];
  drawPile: Tile[];
  discardPile: Tile[];
  modifier: FightModifierId | null;
}

export interface ShopOffer<Id extends string> {
  id: Id;
  price: number;
  sold: boolean;
}

export interface Shop {
  quills: ShopOffer<QuillId>[];
  marks: ShopOffer<MarkId>[];
  rerollCost: number;
  rerolls: number;
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
  /** Best play (by points) across the whole run so far. */
  bestPlay: WordPlay | null;
  /** One-line feedback for the last action (e.g. a rejected word). */
  notice: string | null;
}
