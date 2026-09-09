// TS port of src/sandbox/items.js (READ_SLOWLY_PLAN.md A2/A5 step 3): THE
// ITEM ROSTER (on screen: QUILLS). Still attaches to window.Wordbound.Sandbox
// for the untyped sandbox modules that read it off the global (RoundSandbox
// reads ITEMS/ITEM_DEFS; round.ts's scoreWordPoints calls applyItems through
// the same kind of loose Sandbox cast, since it cannot import this file
// without a cycle -- round.ts only needs items.ts's types, imported type-only).
// Harmony's chord lookup imports findWords/chordPoints directly now that
// both are ported.
import '../sandboxGlobal';
import type { Tile } from '../tiles';
import { findWords } from './wordFinder';
import { chordPoints } from './round';

export interface ItemCtx {
  word: string;
  tiles: Tile[];
  held: Tile[];
  items?: string[];
  run: {
    itemState: Record<string, number>;
    extendCrescendo?(sec: number): void;
  } | null;
  round: { plays: { word: string }[]; changeoutsLeft: number } | null;
  tune: Record<string, unknown>;
  preview?: boolean;
  crescendo?: boolean;
  crescendoSoon?: boolean;
  crescendoMag?: number;
  isLastPlay?: boolean;
  playIndex?: number;
}

export interface ItemAcc {
  points: number;
  mult: number;
  chord?: { word: string; points: number };
  [key: string]: unknown;
}

export interface ItemNote {
  id: string;
  name: string;
  note: string;
  dPts?: number;
  dMult?: number;
  ratio?: number;
  kind?: 'pts' | 'mult';
}

export interface Item {
  id: string;
  name: string;
  glyph: string;
  rarity: 'common' | 'uncommon' | 'rare';
  price: number;
  hint: string;
  crescendo?: boolean;
  score?(c: ItemCtx, a: ItemAcc): string | null;
  onPlayed?(
    run: {
      itemState: Record<string, number>;
      extendCrescendo?(sec: number): void;
    },
    breakdown?: { crescendo?: boolean },
  ): void;
  plays?: number;
  goldAtWin?(round: { changeoutsLeft: number }): number;
}

const VOWELS: Record<string, 1> = { A: 1, E: 1, I: 1, O: 1, U: 1 };
const HARD: Record<string, 1> = { K: 1, Q: 1, X: 1, Z: 1, J: 1 };
function count(tiles: Tile[], set: Record<string, 1>): number {
  let n = 0;
  tiles.forEach((t) => {
    if (set[t.letter]) n++;
  });
  return n;
}

// The second scoring axis: WHAT KIND of word, not how long. Libretto pays
// for words that are also musical terms. Short common ones are in on purpose
// so it fires a few times a run off a normal rack.
const MUSIC_WORDS = (
  'AIR ALTO ARIA BAR BASS BEAT BELL BOW BRASS CANON CHANT CHOIR CHORD CLEF CODA DRUM DUET ECHO ' +
  'FLAT FLUTE FORTE FRET FUGUE GONG HARP HORN HYMN JAZZ JIG KEY LUTE LYRE MARCH MELODY METER MINOR MAJOR MUSIC NOTE ' +
  'OBOE OCTAVE OPERA OPUS ORGAN PIANO PIPE PITCH REED REEL REST RHYTHM ROCK SCALE SCORE SHARP SING SOLO SONG STAFF ' +
  'STRING SUITE TEMPO TENOR TIE TONE TRIO TUBA TUNE VIOL VIOLA VOICE WALTZ BAND BEAT DRONE HUM LILT MUTE TRILL RIFF ' +
  'CHIME TUNING STRUM PLUCK BOWING SOPRANO SONATA ROUND CAROL BALLAD ANTHEM VERSE CHORUS LYRIC RONDO ETUDE ' +
  'CELLO VIOLIN GUITAR BANJO FIDDLE BUGLE CORNET SNARE CYMBAL TIMBRE TREBLE ALTOS BEATS NOTES SONGS KEYS TUNES TONES CHORDS'
).split(' ');
const MUSIC: Record<string, 1> = {};
MUSIC_WORDS.forEach((w) => {
  MUSIC[w] = 1;
});
export function isMusicWord(word: string): boolean {
  return !!MUSIC[String(word).toUpperCase()];
}

// A third scoring axis, for Bard: theatrical/archaic vocabulary a
// Shakespeare-guided run would reward.
const BARD_WORDS = (
  'THOU THEE THY THINE HATH DOTH ART WHEREFORE PRITHEE ALAS VERILY FORSOOTH ' +
  'BEHOLD YONDER HARK MORROW KNAVE VILLAIN JESTER FOOL KING QUEEN PRINCE DUKE CROWN THRONE ' +
  'SWORD DAGGER GHOST WITCH CURSE FATE DESTINY HONOR VALOR TRAITOR TRAGEDY COMEDY SONNET ' +
  'VERSE STAGE PLAYER ACTOR JEST MERRY FOLLY MADNESS LOVE HATE REVENGE MURDER POISON GRAVE ' +
  'TOMB SPIRIT SOUL HEART STAR MOON NIGHT DREAM SLEEP DEATH LIFE TIME WORLD NATURE STORM ' +
  'TEMPEST ISLAND FOREST CASTLE BALCONY DANCE FEAST WINE BLOOD TEARS SMILE KISS MARRIAGE ' +
  'WEDDING FUNERAL BETRAYAL JEALOUSY AMBITION GREED MERCY JUSTICE TRUTH SECRET DISGUISE ' +
  'MASK MISCHIEF'
).split(' ');
const BARD: Record<string, 1> = {};
BARD_WORDS.forEach((w) => {
  BARD[w] = 1;
});
export function isBardWord(word: string): boolean {
  return !!BARD[String(word).toUpperCase()];
}

export const ITEMS: Item[] = [
  // Common
  {
    id: 'brass_nib',
    name: 'Brass Nib',
    glyph: '🖋️',
    rarity: 'common',
    price: 3,
    hint: '+10 points on every word',
    score(c, a) {
      a.points += 10;
      return '+10';
    },
  },
  {
    id: 'second_ink',
    name: 'Second Ink',
    glyph: '🖊️',
    rarity: 'common',
    price: 4,
    hint: '+1 mult on every word',
    score(c, a) {
      a.mult += 1;
      return '+1 mult';
    },
  },
  {
    id: 'vowel_song',
    name: 'Vowel Song',
    glyph: '🎵',
    rarity: 'common',
    price: 5,
    hint: '+3 mult for every vowel played',
    score(c, a) {
      const n = count(c.tiles, VOWELS);
      if (!n) return null;
      a.mult += 3 * n;
      return '+' + 3 * n + ' mult';
    },
  },
  {
    id: 'hard_consonant',
    name: 'Hard Consonant',
    glyph: '⚙️',
    rarity: 'common',
    price: 4,
    hint: '+15 points for every K, Q, X, Z or J played',
    score(c, a) {
      const n = count(c.tiles, HARD);
      if (!n) return null;
      a.points += 15 * n;
      return '+' + 15 * n;
    },
  },
  {
    id: 'short_form',
    name: 'Short Form',
    glyph: '✂️',
    rarity: 'common',
    price: 4,
    hint: '+4 mult if the word is 4 letters or fewer',
    score(c, a) {
      if (c.word.length > 4) return null;
      a.mult += 4;
      return '+4 mult';
    },
  },
  {
    id: 'long_form',
    name: 'Long Form',
    glyph: '📜',
    rarity: 'common',
    price: 4,
    hint: '+30 points if the word is 6 letters or more',
    score(c, a) {
      if (c.word.length < 6) return null;
      a.points += 30;
      return '+30';
    },
  },
  // Uncommon
  {
    id: 'lead_weight',
    name: 'Lead Weight',
    glyph: '⚖️',
    rarity: 'uncommon',
    price: 6,
    hint: '+25 points on every word',
    score(c, a) {
      a.points += 25;
      return '+25';
    },
  },
  {
    id: 'gilded_edge',
    name: 'Gilded Edge',
    glyph: '🖼️',
    rarity: 'uncommon',
    price: 5,
    hint: '+10 points and +1 mult',
    score(c, a) {
      a.points += 10;
      a.mult += 1;
      return '+10, +1 mult';
    },
  },
  {
    id: 'half_note',
    name: 'Half Note',
    glyph: '♩',
    rarity: 'uncommon',
    price: 6,
    hint: '×1.5 mult',
    score(c, a) {
      a.mult *= 1.5;
      return '×1.5 mult';
    },
  },
  {
    id: 'refrain',
    name: 'Refrain',
    glyph: '🔁',
    rarity: 'uncommon',
    price: 6,
    hint: '+1 mult for every word played this run so far',
    score(c, a) {
      const n = c.run ? c.run.itemState.refrain || 0 : 0;
      if (!n) return null;
      a.mult += n;
      return '+' + n + ' mult';
    },
    onPlayed(run) {
      run.itemState.refrain = (run.itemState.refrain || 0) + 1;
    },
  },
  {
    id: 'coda',
    name: 'Coda',
    glyph: '𝄌',
    rarity: 'uncommon',
    price: 7,
    hint: 'The last word of a round scores ×2 mult',
    score(c, a) {
      if (!c.isLastPlay) return null;
      a.mult *= 2;
      return '×2 mult, last word';
    },
  },
  {
    id: 'anagram',
    name: 'Anagram',
    glyph: '🔀',
    rarity: 'uncommon',
    price: 5,
    hint: '+20 points if the word uses an inked tile',
    score(c, a) {
      if (!c.tiles.some((t) => t.ink)) return null;
      a.points += 20;
      return '+20';
    },
  },
  {
    id: 'miser',
    name: 'Miser',
    glyph: '💰',
    rarity: 'uncommon',
    price: 5,
    hint: '+1 gold per unused changeout at a win',
    goldAtWin(round) {
      return round.changeoutsLeft;
    },
  },
  {
    id: 'libretto',
    name: 'Libretto',
    glyph: '📖',
    rarity: 'uncommon',
    price: 6,
    hint: '×2 mult if the word is a musical term (NOTE, HARP, TEMPO…)',
    score(c, a) {
      if (!isMusicWord(c.word)) return null;
      a.mult *= 2;
      return '×2 mult, a musical term';
    },
  },
  // More second-axis quills (DIVERGENCE_PLAN.md).
  {
    id: 'dissonance',
    name: 'Dissonance',
    glyph: '💥',
    rarity: 'uncommon',
    price: 6,
    hint: '×2 mult if the word has no vowels (RHYTHM, MYTH, LYNX…)',
    score(c, a) {
      if (/[AEIOU]/.test(c.word)) return null;
      a.mult *= 2;
      return '×2 mult, no vowels';
    },
  },
  {
    id: 'notation',
    name: 'Notation',
    glyph: '🎼',
    rarity: 'uncommon',
    price: 6,
    hint: '+4 mult per letter A–G played (the note names)',
    score(c, a) {
      let n = 0;
      c.tiles.forEach((t) => {
        if ('ABCDEFG'.indexOf(t.letter) >= 0) n++;
      });
      if (!n) return null;
      a.mult += 4 * n;
      return '+' + 4 * n + ' mult';
    },
  },
  {
    id: 'bard',
    name: 'Bard',
    glyph: '🎭',
    rarity: 'uncommon',
    price: 6,
    hint: '×2 mult for a word in Shakespeare’s vocabulary (THOU, CROWN, GHOST…)',
    score(c, a) {
      if (!isBardWord(c.word)) return null;
      a.mult *= 2;
      return '×2 mult, a bard’s word';
    },
  },
  {
    id: 'rhyme',
    name: 'Rhyme',
    glyph: '🪶',
    rarity: 'uncommon',
    price: 5,
    hint: '+20 points if the word ends the same two letters as the last one played this round',
    score(c, a) {
      const plays = c.round ? c.round.plays : null;
      const prev = plays && plays.length ? plays[plays.length - 1]!.word : null;
      if (!prev || prev.length < 2 || c.word.length < 2) return null;
      if (prev.slice(-2) !== c.word.slice(-2)) return null;
      a.points += 20;
      return '+20, rhymes with ' + prev;
    },
  },
  // The crescendo item: lit only while the recording's window is open
  // (audioPiece.js `crescendo()`); the card counts down to it.
  {
    id: 'climax',
    name: 'Climax',
    glyph: '🌋',
    rarity: 'uncommon',
    price: 7,
    crescendo: true,
    hint: '×3 mult if the word lands on a crescendo — the card counts down to each one',
    score(c, a) {
      if (!c.crescendo) return null;
      a.mult *= 3;
      return '×3 mult, on the crescendo';
    },
  },
  // A second crescendo effect: the swell's own size pays, so a bigger
  // crescendo is worth more.
  {
    id: 'fortissimo',
    name: 'Fortissimo',
    glyph: '🔊',
    rarity: 'uncommon',
    price: 7,
    crescendo: true,
    hint: '+50 points × the crescendo’s own size, on a crescendo',
    score(c, a) {
      if (!c.crescendo) return null;
      const pts = Math.round(50 * (c.crescendoMag || 1));
      a.points += pts;
      return '+' + pts;
    },
  },
  // The opposite reflex to Climax: paid for playing INTO the swell rather
  // than on it, off the same countdown card.
  {
    id: 'anticipation',
    name: 'Anticipation',
    glyph: '⏳',
    rarity: 'uncommon',
    price: 6,
    crescendo: true,
    hint: '+2 mult if the word is played during a crescendo’s countdown',
    score(c, a) {
      if (!c.crescendoSoon) return null;
      a.mult += 2;
      return '+2 mult, anticipating';
    },
  },
  // A third crescendo effect: no score of its own, just holds the window
  // open 2s longer after a crescendo hit so the next word can land in it too.
  {
    id: 'sustain',
    name: 'Sustain',
    glyph: '🎐',
    rarity: 'uncommon',
    price: 6,
    crescendo: true,
    hint: 'A crescendo hit holds the window open 2s longer for your next word',
    onPlayed(run, breakdown) {
      if (breakdown?.crescendo && run.extendCrescendo) run.extendCrescendo(2);
    },
  },
  // The second scoring axis again: a word that reads the same forwards and
  // back is rare enough to be a build-around.
  {
    id: 'palindrome',
    name: 'Palindrome',
    glyph: '♻️',
    rarity: 'uncommon',
    price: 6,
    hint: '×3 mult if the word is a palindrome (LEVEL, ROTOR, REFER…)',
    score(c, a) {
      const w = c.word;
      if (w.length < 3 || w !== w.split('').reverse().join('')) return null;
      a.mult *= 3;
      return '×3 mult, a palindrome';
    },
  },
  // Rare
  {
    id: 'double_stop',
    name: 'Double Stop',
    glyph: '🎻',
    rarity: 'rare',
    price: 8,
    hint: '×2 mult',
    score(c, a) {
      a.mult *= 2;
      return '×2 mult';
    },
  },
  {
    id: 'fermata',
    name: 'Fermata',
    glyph: '𝄐',
    rarity: 'rare',
    price: 8,
    hint: '+1 word every round',
    plays: 1,
  },
  // Harmony: if the case is left holding exactly two or three tiles that
  // themselves spell a word, that word's own base points land as a separate
  // `chord` step in the cascade (points only, no mult).
  {
    id: 'harmony',
    name: 'Harmony',
    glyph: '🎶',
    rarity: 'rare',
    price: 9,
    hint: 'If two or three tiles left in the case spell a word, add that word’s base points',
    score(c, a) {
      const held = (c.held || []).filter((t) => t && t.letter);
      if (held.length !== 2 && held.length !== 3) return null;
      const letters = held.map((t) => t.letter).join('');
      const found = findWords(letters, undefined, 1);
      if (!found.length) return null;
      a.chord = {
        word: found[0]!.word,
        points: chordPoints(
          found[0]!.word,
          c.tune as Record<string, number | boolean | undefined>,
        ),
      };
      return null;
    },
  },
];

export const ITEM_DEFS: Record<string, Item> = {};
ITEMS.forEach((it) => {
  ITEM_DEFS[it.id] = it;
});

// Fire the run's items in held order. Returns the notes for the ones that
// did something, each carrying what the item did to the accumulator (dPts,
// dMult, ratio) so the scoring cascade can narrate it without re-deriving
// the maths.
export function applyItems(ctx: ItemCtx, acc: ItemAcc): ItemNote[] {
  const notes: ItemNote[] = [];
  (ctx.items || []).forEach((id) => {
    const it = ITEM_DEFS[id];
    if (!it || !it.score) return;
    const p0 = acc.points,
      m0 = acc.mult;
    const note = it.score(ctx, acc);
    if (note)
      notes.push(describeDelta({ id, name: it.name, note }, p0, m0, acc));
  });
  return notes;
}

// Fill in dPts / dMult / ratio on a note from before-and-after accumulators.
export function describeDelta(
  note: ItemNote,
  p0: number,
  m0: number,
  acc: ItemAcc,
): ItemNote {
  note.dPts = acc.points - p0;
  const ratio = m0 ? acc.mult / m0 : 1;
  const additive = Math.abs(ratio - 1) < 1e-9 || note.note.indexOf('×') < 0;
  note.dMult = additive ? acc.mult - m0 : 0;
  note.ratio = additive ? 1 : Math.round(ratio * 1000) / 1000;
  note.kind = note.ratio !== 1 || note.dMult ? 'mult' : 'pts';
  return note;
}

const Sandbox = window.Wordbound.Sandbox;
Sandbox.isMusicWord = isMusicWord;
Sandbox.isBardWord = isBardWord;
Sandbox.ITEMS = ITEMS;
Sandbox.ITEM_DEFS = ITEM_DEFS;
Sandbox.applyItems = applyItems;
Sandbox.describeDelta = describeDelta;
