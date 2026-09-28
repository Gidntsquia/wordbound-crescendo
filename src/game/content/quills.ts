import type { QuillId, Rarity, Tally, Tile } from '../types';
import { letterValue } from './letters';

export interface QuillContext {
  word: string;
  tiles: readonly Tile[];
  /** 0-based index of the current fight. */
  fightIndex: number;
  /** How many words have already been played this fight (0 for the first). */
  wordsPlayedThisFight: number;
  /** Swaps left before this play was made. */
  swapsLeft: number;
  /** Plays that will remain in this fight after this one resolves. */
  playsLeftAfter: number;
  /** All quills the player owns, in purchase order (includes this one). */
  quillsOwned: readonly QuillId[];
  /** Gold held at the time this word is scored. */
  gold: number;
  /** Points scored by the previous play this run (0 if this is the first). */
  previousPoints: number;
  /** How many played tiles carry a mark. */
  markedTileCount: number;
}

export interface QuillDef {
  id: QuillId;
  name: string;
  description: string;
  price: number;
  rarity: Rarity;
  /** Passive scoring hook; quills fire in the order they were bought. */
  apply(tally: Tally, ctx: QuillContext): Tally;
}

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);
const isVowel = (l: string) => VOWELS.has(l);

function letterCounts(word: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const l of word) counts.set(l, (counts.get(l) ?? 0) + 1);
  return counts;
}

/** Longest run of consecutive consonants, e.g. "STRONG" → 3 (STR). */
function longestConsonantRun(word: string): number {
  let best = 0;
  let cur = 0;
  for (const l of word) {
    if (!isVowel(l)) {
      cur += 1;
      best = Math.max(best, cur);
    } else {
      cur = 0;
    }
  }
  return best;
}

export const QUILLS: Record<QuillId, QuillDef> = {
  inkpot: {
    id: 'inkpot',
    name: 'Ink Pot',
    description: '+8 chips on every word',
    price: 4,
    rarity: 'common',
    apply: (t) => ({ ...t, chips: t.chips + 8 }),
  },
  metronome: {
    id: 'metronome',
    name: 'Metronome',
    description: '+1 mult on every word',
    price: 5,
    rarity: 'common',
    apply: (t) => ({ ...t, mult: t.mult + 1 }),
  },
  chorus: {
    id: 'chorus',
    name: 'Vowel Chorus',
    description: '+3 chips for each vowel',
    price: 5,
    rarity: 'common',
    apply: (t, c) => ({
      ...t,
      chips: t.chips + 3 * [...c.word].filter(isVowel).length,
    }),
  },
  longhand: {
    id: 'longhand',
    name: 'Longhand',
    description: '+2 mult on words of 5+ letters',
    price: 5,
    rarity: 'common',
    apply: (t, c) => (c.word.length >= 5 ? { ...t, mult: t.mult + 2 } : t),
  },
  rarekey: {
    id: 'rarekey',
    name: 'Rare Key',
    description: '+10 chips if a letter is worth 4+',
    price: 4,
    rarity: 'common',
    apply: (t, c) =>
      [...c.word].some((l) => letterValue(l) >= 4)
        ? { ...t, chips: t.chips + 10 }
        : t,
  },
  shortnotes: {
    id: 'shortnotes',
    name: 'Short Notes',
    description: '+20 chips on 3-letter words',
    price: 4,
    rarity: 'common',
    apply: (t, c) => (c.word.length === 3 ? { ...t, chips: t.chips + 20 } : t),
  },
  quartz: {
    id: 'quartz',
    name: 'Quartz',
    description: '+5 chips for each letter repeated in the word',
    price: 5,
    rarity: 'common',
    apply: (t, c) => {
      const repeats = [...letterCounts(c.word).values()].filter(
        (n) => n >= 2,
      ).length;
      return { ...t, chips: t.chips + 5 * repeats };
    },
  },
  firstletter: {
    id: 'firstletter',
    name: 'Bright Opening',
    description: '+12 chips when the word starts with a vowel',
    price: 4,
    rarity: 'common',
    apply: (t, c) =>
      isVowel(c.word[0] ?? '') ? { ...t, chips: t.chips + 12 } : t,
  },
  lastletter: {
    id: 'lastletter',
    name: 'Firm Close',
    description: '+12 chips when the word ends in S or D',
    price: 4,
    rarity: 'common',
    apply: (t, c) =>
      'SD'.includes(c.word[c.word.length - 1] ?? '')
        ? { ...t, chips: t.chips + 12 }
        : t,
  },
  fullhand: {
    id: 'fullhand',
    name: 'No Repeats',
    description: '+15 chips when every letter in the word is distinct',
    price: 5,
    rarity: 'common',
    apply: (t, c) =>
      new Set(c.word).size === c.word.length
        ? { ...t, chips: t.chips + 15 }
        : t,
  },
  lastwordfirst: {
    id: 'lastwordfirst',
    name: 'Opening Note',
    description: '+25 chips on the first word played in a fight',
    price: 4,
    rarity: 'common',
    apply: (t, c) =>
      c.wordsPlayedThisFight === 0 ? { ...t, chips: t.chips + 25 } : t,
  },
  palindrome: {
    id: 'palindrome',
    name: 'Mirror Glass',
    description: '+35 chips when the word is a palindrome',
    price: 7,
    rarity: 'uncommon',
    apply: (t, c) =>
      c.word === [...c.word].reverse().join('') && c.word.length > 1
        ? { ...t, chips: t.chips + 35 }
        : t,
  },
  doubleletter: {
    id: 'doubleletter',
    name: 'Twin Set',
    description: '+2 mult when a letter appears back-to-back',
    price: 6,
    rarity: 'uncommon',
    apply: (t, c) => {
      const doubled = [...c.word].some((l, i) => c.word[i + 1] === l);
      return doubled ? { ...t, mult: t.mult + 2 } : t;
    },
  },
  alphabetist: {
    id: 'alphabetist',
    name: 'Alphabetist',
    description: '+1 mult for each distinct vowel in the word',
    price: 6,
    rarity: 'uncommon',
    apply: (t, c) => ({
      ...t,
      mult: t.mult + new Set([...c.word].filter(isVowel)).size,
    }),
  },
  consonantchain: {
    id: 'consonantchain',
    name: 'Consonant Chain',
    description: '+4 chips per consonant in the longest unbroken run',
    price: 6,
    rarity: 'uncommon',
    apply: (t, c) => ({
      ...t,
      chips: t.chips + 4 * longestConsonantRun(c.word),
    }),
  },
  markedup: {
    id: 'markedup',
    name: 'Marked Up',
    description: '+3 chips for each marked tile played',
    price: 6,
    rarity: 'uncommon',
    apply: (t, c) => ({ ...t, chips: t.chips + 3 * c.markedTileCount }),
  },
  sparerow: {
    id: 'sparerow',
    name: 'Spare Row',
    description: '+1 mult for each play left after this one',
    price: 6,
    rarity: 'uncommon',
    apply: (t, c) => ({ ...t, mult: t.mult + c.playsLeftAfter }),
  },
  undertow: {
    id: 'undertow',
    name: 'Undertow',
    description: '+1 mult for each swap you still have',
    price: 6,
    rarity: 'uncommon',
    apply: (t, c) => ({ ...t, mult: t.mult + c.swapsLeft }),
  },
  oldfaithful: {
    id: 'oldfaithful',
    name: 'Old Faithful',
    description: '+2 chips for every other quill you own',
    price: 7,
    rarity: 'uncommon',
    apply: (t, c) => ({
      ...t,
      chips: t.chips + 2 * Math.max(0, c.quillsOwned.length - 1),
    }),
  },
  risingtide: {
    id: 'risingtide',
    name: 'Rising Tide',
    description: '+4 chips for each word already played this fight',
    price: 6,
    rarity: 'uncommon',
    apply: (t, c) => ({ ...t, chips: t.chips + 4 * c.wordsPlayedThisFight }),
  },
  crescendo: {
    id: 'crescendo',
    name: 'Crescendo',
    description: '+chips equal to 3× the fight number, every word',
    price: 9,
    rarity: 'rare',
    apply: (t, c) => ({ ...t, chips: t.chips + 3 * (c.fightIndex + 1) }),
  },
  encore: {
    id: 'encore',
    name: 'Encore',
    description: '+25% of your last play’s points, as chips',
    price: 9,
    rarity: 'rare',
    apply: (t, c) => ({
      ...t,
      chips: t.chips + Math.floor(c.previousPoints * 0.25),
    }),
  },
  thrift: {
    id: 'thrift',
    name: 'Thrift',
    description: '+1 mult for every 4 gold you hold',
    price: 8,
    rarity: 'rare',
    apply: (t, c) => ({ ...t, mult: t.mult + Math.floor(c.gold / 4) }),
  },
  goldleaf: {
    id: 'goldleaf',
    name: 'Gold Leaf',
    description: '+1 chip per gold you hold, up to +20',
    price: 9,
    rarity: 'rare',
    apply: (t, c) => ({ ...t, chips: t.chips + Math.min(20, c.gold) }),
  },
};

export const QUILL_IDS = Object.keys(QUILLS) as QuillId[];
