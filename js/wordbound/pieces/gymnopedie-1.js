// js/wordbound/pieces/gymnopedie-1.js
// REGULAR ENEMIES ticket (GOALS.md): The Gymnopédiste, the first of the
// early-tier regulars (THEME.md's own table, "The regulars (9, three per
// tier)"). PD VETTING (re-checked here per the standing rule, matching
// THEME.md's own table): "Gymnopédie No. 1," Erik Satie, composed 1888,
// Satie died 1925 (101 years ago as of 2026) -- well past both the
// pre-1930 and 70-years-dead bars. Safely public domain.
//
// This is a hand-authored transcription approximating the piece's famous
// construction -- NOT a scholarly critical edition (same disclaimer
// mountain-king.js's own header already establishes for this engine):
// the real piece's signature is a single slow, repeating 3-beat harmonic
// pattern in the accompaniment (alternating two gently dissonant seventh
// chords) under a spare, wandering melody, marked "Lent et douloureux"
// (slow and sorrowful) -- almost startlingly still for its whole length.
// THEME.md's own gimmick line for this regular -- "Barely moves. Barely
// attacks. A warm-up in every sense" -- is modeled directly: a very slow,
// CONSTANT tempo (no accelerando at all, unlike Mountain King), a single
// repeating 8-beat phrase (no escalating stanzas), and a dynamics curve
// that stays nearly flat for the whole piece with exactly one small, late
// swell instead of a real crescendo -- 'early' stageTier's own low base
// push (Duel.STAGE_TIER_BASE_PUSH.early = 1, the lowest of the four) doing
// most of the "barely threatens" work already, per design.
(function () {
  window.Wordbound = window.Wordbound || {};
  window.Wordbound.Pieces = window.Wordbound.Pieces || {};

  var SEMITONE_FROM_A = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 };
  function f(note, octave) {
    var n = SEMITONE_FROM_A[note] + (octave - 4) * 12;
    return 440 * Math.pow(2, n / 12);
  }

  // The accompaniment's real signature: two gently clashing chords
  // (Gmaj7-ish, then a D-rooted answer), each held a full 3-beat bar,
  // repeated. One PHRASE = 2 bars = 6 beats.
  var CHORD_A = ['G', 'B', 'D', 'F#']; // Gmaj7
  var CHORD_B = ['D', 'F#', 'A', 'C']; // D7-ish answer
  function chordNotes(startBeat, chord, velocity, octave) {
    return chord.map(function (note) {
      return { beat: startBeat, duration: 3, freq: f(note, octave), velocity: velocity };
    });
  }

  // The melody: a spare, stepwise wandering line, one phrase long (6
  // beats), repeated unchanged every phrase -- the piece's own hypnotic
  // sameness ("barely moves") rather than a developing theme.
  var MELODY_PHRASE = [
    ['D', 5, 2], ['E', 5, 1], ['F#', 5, 1], ['G', 5, 2]
  ];
  function melodyNotes(startBeat, velocity) {
    var notes = [];
    var beat = startBeat;
    MELODY_PHRASE.forEach(function (n) {
      notes.push({ beat: beat, duration: n[2], freq: f(n[0], n[1]), velocity: velocity });
      beat += n[2];
    });
    return notes;
  }

  var bass = [];
  var melody = [];
  var PHRASE_COUNT = 6; // 6 phrases * 6 beats = 36 beats total
  for (var i = 0; i < PHRASE_COUNT; i++) {
    var start = i * 6;
    // Velocity stays almost flat throughout -- only the very last phrase
    // (the "small, late swell," never a real crescendo) nudges up.
    var vel = (i === PHRASE_COUNT - 1) ? 0.4 : 0.25;
    bass = bass.concat(chordNotes(start, CHORD_A, vel - 0.05, 3));
    bass = bass.concat(chordNotes(start + 3, CHORD_B, vel - 0.05, 3));
    melody = melody.concat(melodyNotes(start, vel));
  }

  window.Wordbound.Pieces.gymnopedie1 = {
    id: 'gymnopedie-1',
    title: 'Gymnopédie No. 1',
    composer: 'Erik Satie',
    vetting: { composed: 1888, composerDied: 1925, publicDomain: true },
    regularName: 'The Gymnopédiste',
    gimmick: "Barely moves. Barely attacks. A warm-up in every sense.",
    stageTier: 'early',
    lengthBeats: 36,
    tempo: 66, // "Lent et douloureux" -- slow and sorrowful, constant throughout
    tracks: { melody: melody, bass: bass },
    dynamics: {
      // Nearly flat the whole way -- no real crescendo, just the smallest
      // possible nudge in the final phrase (beats 30-36).
      keyframes: [
        { beat: 0, intensity: 0.08 },
        { beat: 30, intensity: 0.1 },
        { beat: 33, intensity: 0.18 },
        { beat: 36, intensity: 0.2 }
      ],
      // One tiny, late marker rather than a real spike -- "rare weak
      // crescendos," per THEME.md's own early-tier curve description.
      crescendos: [
        { id: 'the-warm-up', startBeat: 30, peakBeat: 36, peakIntensity: 0.2, rampDurationBeats: 6 }
      ]
    }
  };
})();
