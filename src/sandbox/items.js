// src/sandbox/items.js
// THE ITEM ROSTER -- on screen these are QUILLS (the player is on the words
// side; the code keeps "item"). Sandbox-owned: js/wordbound/items.js is NOT
// loaded here. A run holds up to ITEM_SLOTS of them, bought in the
// shop (shop.js) and sold for half. Each fires on every word, LEFT TO RIGHT
// in the order held, on an accumulator { points, mult }: additive points and
// mult first in the row score less than the same item after a x-mult, so
// the order is the player's to arrange (run.moveItem).
//
// An item is { id, name, rarity, price, hint, score?(ctx, acc), plays?,
// goldAtWin?(round) }. `score` mutates acc and may return a note for the
// breakdown line. ctx = { word, tiles (played), held, run, round, tune,
// isLastPlay, playIndex, crescendo, crescendoSoon, crescendoMag, preview } --
// `crescendo` is true when the word lands inside the recording's crescendo
// window (audioPiece.js `crescendo()`); `crescendoSoon` is true during the
// countdown just before one opens (Anticipation); `crescendoMag` is the
// live swell's own 0..1 size (1 when there is no live window -- Fortissimo
// only reads it when `crescendo` is true); `preview` is true when the UI is only
// asking what a word WOULD score; scaling state (Refrain) is advanced by
// round.js's playWord afterwards via `onPlayed`, never inside score.
//
// PUBLIC API (window.Wordbound.Sandbox): ITEMS, ITEM_DEFS, applyItems(ctx, acc)
(function () {
  window.Wordbound = window.Wordbound || {};
  var Sandbox = (window.Wordbound.Sandbox = window.Wordbound.Sandbox || {});

  var VOWELS = { A: 1, E: 1, I: 1, O: 1, U: 1 };
  var HARD = { K: 1, Q: 1, X: 1, Z: 1, J: 1 };
  function count(tiles, set) {
    var n = 0;
    tiles.forEach(function (t) { if (set[t.letter]) n++; });
    return n;
  }

  // The second scoring axis: WHAT KIND of word, not how long. Libretto pays
  // for words that are also musical terms. Short common ones are in on
  // purpose so it fires a few times a run off a normal rack.
  var MUSIC_WORDS = ('AIR ALTO ARIA BAR BASS BEAT BELL BOW BRASS CANON CHANT CHOIR CHORD CLEF CODA DRUM DUET ECHO ' +
    'FLAT FLUTE FORTE FRET FUGUE GONG HARP HORN HYMN JAZZ JIG KEY LUTE LYRE MARCH MELODY METER MINOR MAJOR MUSIC NOTE ' +
    'OBOE OCTAVE OPERA OPUS ORGAN PIANO PIPE PITCH REED REEL REST RHYTHM ROCK SCALE SCORE SHARP SING SOLO SONG STAFF ' +
    'STRING SUITE TEMPO TENOR TIE TONE TRIO TUBA TUNE VIOL VIOLA VOICE WALTZ BAND BEAT DRONE HUM LILT MUTE TRILL RIFF ' +
    'CHIME TUNING STRUM PLUCK BOWING SOPRANO SONATA ROUND CAROL BALLAD ANTHEM VERSE CHORUS LYRIC RONDO ETUDE ' +
    'CELLO VIOLIN GUITAR BANJO FIDDLE BUGLE CORNET SNARE CYMBAL TIMBRE TREBLE ALTOS BEATS NOTES SONGS KEYS TUNES TONES CHORDS').split(' ');
  var MUSIC = {};
  MUSIC_WORDS.forEach(function (w) { MUSIC[w] = 1; });
  Sandbox.isMusicWord = function (word) { return !!MUSIC[String(word).toUpperCase()]; };

  // A third scoring axis, for Bard: theatrical/archaic vocabulary a
  // Shakespeare-guided run would reward, curated here rather than pulled
  // from shakespeareGuide.js (which holds only the one-time intro text, not
  // a vocabulary list).
  var BARD_WORDS = ('THOU THEE THY THINE HATH DOTH ART WHEREFORE PRITHEE ALAS VERILY FORSOOTH ' +
    'BEHOLD YONDER HARK MORROW KNAVE VILLAIN JESTER FOOL KING QUEEN PRINCE DUKE CROWN THRONE ' +
    'SWORD DAGGER GHOST WITCH CURSE FATE DESTINY HONOR VALOR TRAITOR TRAGEDY COMEDY SONNET ' +
    'VERSE STAGE PLAYER ACTOR JEST MERRY FOLLY MADNESS LOVE HATE REVENGE MURDER POISON GRAVE ' +
    'TOMB SPIRIT SOUL HEART STAR MOON NIGHT DREAM SLEEP DEATH LIFE TIME WORLD NATURE STORM ' +
    'TEMPEST ISLAND FOREST CASTLE BALCONY DANCE FEAST WINE BLOOD TEARS SMILE KISS MARRIAGE ' +
    'WEDDING FUNERAL BETRAYAL JEALOUSY AMBITION GREED MERCY JUSTICE TRUTH SECRET DISGUISE ' +
    'MASK MISCHIEF').split(' ');
  var BARD = {};
  BARD_WORDS.forEach(function (w) { BARD[w] = 1; });
  Sandbox.isBardWord = function (word) { return !!BARD[String(word).toUpperCase()]; };

  Sandbox.ITEMS = [
    // Common
    { id: 'brass_nib', name: 'Brass Nib', rarity: 'common', price: 3, hint: '+10 points on every word',
      score: function (c, a) { a.points += 10; return '+10'; } },
    { id: 'second_ink', name: 'Second Ink', rarity: 'common', price: 4, hint: '+1 mult on every word',
      score: function (c, a) { a.mult += 1; return '+1 mult'; } },
    { id: 'vowel_song', name: 'Vowel Song', rarity: 'common', price: 5, hint: '+3 mult for every vowel played',
      score: function (c, a) { var n = count(c.tiles, VOWELS); if (!n) return null; a.mult += 3 * n; return '+' + 3 * n + ' mult'; } },
    { id: 'hard_consonant', name: 'Hard Consonant', rarity: 'common', price: 4, hint: '+15 points for every K, Q, X, Z or J played',
      score: function (c, a) { var n = count(c.tiles, HARD); if (!n) return null; a.points += 15 * n; return '+' + 15 * n; } },
    { id: 'short_form', name: 'Short Form', rarity: 'common', price: 4, hint: '+4 mult if the word is 4 letters or fewer',
      score: function (c, a) { if (c.word.length > 4) return null; a.mult += 4; return '+4 mult'; } },
    { id: 'long_form', name: 'Long Form', rarity: 'common', price: 4, hint: '+30 points if the word is 6 letters or more',
      score: function (c, a) { if (c.word.length < 6) return null; a.points += 30; return '+30'; } },
    // Uncommon
    { id: 'lead_weight', name: 'Lead Weight', rarity: 'uncommon', price: 6, hint: '+25 points on every word',
      score: function (c, a) { a.points += 25; return '+25'; } },
    { id: 'gilded_edge', name: 'Gilded Edge', rarity: 'uncommon', price: 5, hint: '+10 points and +1 mult',
      score: function (c, a) { a.points += 10; a.mult += 1; return '+10, +1 mult'; } },
    { id: 'half_note', name: 'Half Note', rarity: 'uncommon', price: 6, hint: '×1.5 mult',
      score: function (c, a) { a.mult *= 1.5; return '×1.5 mult'; } },
    { id: 'refrain', name: 'Refrain', rarity: 'uncommon', price: 6, hint: '+1 mult for every word played this run so far',
      score: function (c, a) { var n = c.run ? (c.run.itemState.refrain || 0) : 0; if (!n) return null; a.mult += n; return '+' + n + ' mult'; },
      onPlayed: function (run) { run.itemState.refrain = (run.itemState.refrain || 0) + 1; } },
    { id: 'coda', name: 'Coda', rarity: 'uncommon', price: 7, hint: 'The last word of a round scores ×2 mult',
      score: function (c, a) { if (!c.isLastPlay) return null; a.mult *= 2; return '×2 mult, last word'; } },
    { id: 'anagram', name: 'Anagram', rarity: 'uncommon', price: 5, hint: '+20 points if the word uses an inked tile',
      score: function (c, a) { if (!c.tiles.some(function (t) { return t.ink; })) return null; a.points += 20; return '+20'; } },
    { id: 'miser', name: 'Miser', rarity: 'uncommon', price: 5, hint: '+1 gold per unused changeout at a win',
      goldAtWin: function (round) { return round.changeoutsLeft; } },
    { id: 'libretto', name: 'Libretto', rarity: 'uncommon', price: 6, hint: '×2 mult if the word is a musical term (NOTE, HARP, TEMPO…)',
      score: function (c, a) { if (!Sandbox.isMusicWord(c.word)) return null; a.mult *= 2; return '×2 mult, a musical term'; } },
    // More second-axis quills (DIVERGENCE_PLAN.md).
    { id: 'dissonance', name: 'Dissonance', rarity: 'uncommon', price: 6, hint: '×2 mult if the word has no vowels (RHYTHM, MYTH, LYNX…)',
      score: function (c, a) { if (/[AEIOU]/.test(c.word)) return null; a.mult *= 2; return '×2 mult, no vowels'; } },
    { id: 'notation', name: 'Notation', rarity: 'uncommon', price: 6, hint: '+4 mult per letter A–G played (the note names)',
      score: function (c, a) {
        var n = 0;
        c.tiles.forEach(function (t) { if ('ABCDEFG'.indexOf(t.letter) >= 0) n++; });
        if (!n) return null;
        a.mult += 4 * n;
        return '+' + (4 * n) + ' mult';
      } },
    { id: 'bard', name: 'Bard', rarity: 'uncommon', price: 6, hint: '×2 mult for a word in Shakespeare’s vocabulary (THOU, CROWN, GHOST…)',
      score: function (c, a) { if (!Sandbox.isBardWord(c.word)) return null; a.mult *= 2; return '×2 mult, a bard’s word'; } },
    { id: 'rhyme', name: 'Rhyme', rarity: 'uncommon', price: 5,
      hint: '+20 points if the word ends the same two letters as the last one played this round',
      score: function (c, a) {
        var plays = c.round ? c.round.plays : null;
        var prev = plays && plays.length ? plays[plays.length - 1].word : null;
        if (!prev || prev.length < 2 || c.word.length < 2) return null;
        if (prev.slice(-2) !== c.word.slice(-2)) return null;
        a.points += 20;
        return '+20, rhymes with ' + prev;
      } },
    // The crescendo item: lit only while the recording's window is open
    // (audioPiece.js `crescendo()`); the card counts down to it.
    { id: 'climax', name: 'Climax', rarity: 'uncommon', price: 7, crescendo: true,
      hint: '×3 mult if the word lands on a crescendo — the card counts down to each one',
      score: function (c, a) { if (!c.crescendo) return null; a.mult *= 3; return '×3 mult, on the crescendo'; } },
    // A second crescendo effect (DIVERGENCE_PLAN.md "ideas for later"): the
    // swell's own size pays, so a bigger crescendo is worth more.
    { id: 'fortissimo', name: 'Fortissimo', rarity: 'uncommon', price: 7, crescendo: true,
      hint: '+50 points × the crescendo’s own size, on a crescendo',
      score: function (c, a) {
        if (!c.crescendo) return null;
        var pts = Math.round(50 * (c.crescendoMag || 1));
        a.points += pts;
        return '+' + pts;
      } },
    // The opposite reflex to Climax: paid for playing INTO the swell rather
    // than on it, off the same countdown card (crescendoSoon, RoundSandbox).
    { id: 'anticipation', name: 'Anticipation', rarity: 'uncommon', price: 6, crescendo: true,
      hint: '+2 mult if the word is played during a crescendo’s countdown',
      score: function (c, a) { if (!c.crescendoSoon) return null; a.mult += 2; return '+2 mult, anticipating'; } },
    // A third crescendo effect: no score of its own, just holds the window
    // open 2s longer after a crescendo hit so the NEXT word can land in it
    // too (Sandbox.CRESCENDO's window in audioPiece.js, run.extendCrescendo).
    { id: 'sustain', name: 'Sustain', rarity: 'uncommon', price: 6, crescendo: true,
      hint: 'A crescendo hit holds the window open 2s longer for your next word',
      onPlayed: function (run, breakdown) { if (breakdown.crescendo && run.extendCrescendo) run.extendCrescendo(2); } },
    // The second scoring axis again: a word that reads the same forwards and
    // back is rare enough to be a build-around.
    { id: 'palindrome', name: 'Palindrome', rarity: 'uncommon', price: 6,
      hint: '×3 mult if the word is a palindrome (LEVEL, ROTOR, REFER…)',
      score: function (c, a) {
        var w = c.word;
        if (w.length < 3 || w !== w.split('').reverse().join('')) return null;
        a.mult *= 3;
        return '×3 mult, a palindrome';
      } },
    // Rare
    { id: 'double_stop', name: 'Double Stop', rarity: 'rare', price: 8, hint: '×2 mult',
      score: function (c, a) { a.mult *= 2; return '×2 mult'; } },
    { id: 'fermata', name: 'Fermata', rarity: 'rare', price: 8, hint: '+1 word every round', plays: 1 }
  ];
  Sandbox.ITEM_DEFS = {};
  Sandbox.ITEMS.forEach(function (it) { Sandbox.ITEM_DEFS[it.id] = it; });

  // Fire the run's items in held order. Returns [{ id, name, note }] for the
  // ones that did something.
  // Each note also carries what the item DID to the accumulator -- dPts and
  // dMult (additive) and ratio (a x-mult, 1 when none) -- so the scoring
  // cascade (RoundSandbox) can narrate it without re-deriving the maths.
  Sandbox.applyItems = function (ctx, acc) {
    var notes = [];
    (ctx.items || []).forEach(function (id) {
      var it = Sandbox.ITEM_DEFS[id];
      if (!it || !it.score) return;
      var p0 = acc.points, m0 = acc.mult;
      var note = it.score(ctx, acc);
      if (note) notes.push(Sandbox.describeDelta({ id: id, name: it.name, note: note }, p0, m0, acc));
    });
    return notes;
  };
  // Fill in dPts / dMult / ratio on a note from before-and-after accumulators.
  Sandbox.describeDelta = function (note, p0, m0, acc) {
    note.dPts = acc.points - p0;
    var ratio = m0 ? acc.mult / m0 : 1;
    var additive = Math.abs(ratio - 1) < 1e-9 || note.note.indexOf('\u00d7') < 0;
    note.dMult = additive ? acc.mult - m0 : 0;
    note.ratio = additive ? 1 : Math.round(ratio * 1000) / 1000;
    note.kind = note.ratio !== 1 || note.dMult ? 'mult' : 'pts';
    return note;
  };
})();
