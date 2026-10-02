import type { ComposerId, QuillId } from '../types';

export interface ComposerDef {
  id: ComposerId;
  name: string;
  dates: string;
  /** The rule twist, stated plainly. */
  twist: string;
  signatureQuill: QuillId;
  playsPerFight: number;
  swapsPerFight: number;
  /** Chip values on hand tiles stay hidden until Play. */
  hidesChips: boolean;
  /** First shop reroll each shop costs nothing. */
  freeFirstReroll: boolean;
}

export const COMPOSERS: Record<ComposerId, ComposerDef> = {
  beethoven: {
    id: 'beethoven',
    name: 'Beethoven',
    dates: '1770–1827',
    twist:
      'Chips hidden until you play. Starts with Deaf Ear: +1 mult per play already made this fight.',
    signatureQuill: 'deafear',
    playsPerFight: 4,
    swapsPerFight: 3,
    hidesChips: true,
    freeFirstReroll: false,
  },
  bach: {
    id: 'bach',
    name: 'Bach',
    dates: '1685–1750',
    twist:
      '5 plays per fight instead of 4. Starts with Fugue: mult ×2 when the letters alternate vowel and consonant.',
    signatureQuill: 'fugue',
    playsPerFight: 5,
    swapsPerFight: 3,
    hidesChips: false,
    freeFirstReroll: false,
  },
  mozart: {
    id: 'mozart',
    name: 'Mozart',
    dates: '1756–1791',
    twist:
      '5 swaps per fight. First shop reroll is free. Starts with Prodigy: +10 chips on 4-letter words.',
    signatureQuill: 'prodigy',
    playsPerFight: 4,
    swapsPerFight: 5,
    hidesChips: false,
    freeFirstReroll: true,
  },
};

export const COMPOSER_IDS: readonly ComposerId[] = [
  'beethoven',
  'bach',
  'mozart',
];
