// js/wordbound/pieces/fur-elise.js
// PD VETTING (re-checked here per the standing rule): "Für Elise" (Bagatelle
// No. 25 in A minor, WoO 59), Ludwig van Beethoven, composed 1810, first
// published 1867, Beethoven died 1827 (199 years ago as of 2026) -- past both
// the pre-1930 and 70-years-dead bars. Safely public domain. Synthesized from
// sequenced note data only, never a recording.
//
// Hand-authored transcription approximating the piece's famous construction --
// NOT a scholarly critical edition (the same disclaimer gymnopedie-1.js and
// mountain-king.js already establish for this engine).
//
// Für Elise is a rondo: A B A. The A theme is the one everybody knows -- the
// rocking E/D# semitone over a broken A-minor arpeggio in the left hand, in
// 3/8, marked "Poco moto." The B strain moves to F major and climbs, then the
// A theme returns.
//
// TIME BASE: one beat here is a SIXTEENTH note, which is the piece's own
// smallest unit and keeps every beat/duration in the data an integer. A 3/8
// bar is therefore 6 beats, and tempo is set so a bar lands near a second --
// "Poco moto" (a little motion), not a showpiece.
//
// TIMBRE: both hands are marked 'piano', which is music.js's own struck-string
// voice (partial stack, inharmonicity, hammer transient -- see THE VOICE in
// music.js). An earlier draft doubled the melody an octave up on a third track
// to fake overtones; the engine synthesizes real ones now, so that track is
// gone and the texture is just the two hands.
(function () {
  window.Wordbound = window.Wordbound || {};
  window.Wordbound.Pieces = window.Wordbound.Pieces || {};

  var SEMITONE_FROM_A = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 };
  function f(note, octave) {
    var n = SEMITONE_FROM_A[note] + (octave - 4) * 12;
    return 440 * Math.pow(2, n / 12);
  }

  // [note, octave, durationIn16ths]; a null note is a rest.
  var A_THEME = [
    // Pickup: the rocking semitone the whole piece is built on.
    ['E', 5, 1], ['D#', 5, 1],
    ['E', 5, 1], ['D#', 5, 1], ['E', 5, 1], ['B', 4, 1], ['D', 5, 1], ['C', 5, 1],
    ['A', 4, 3], [null, 0, 1], ['C', 4, 1], ['E', 4, 1],
    ['A', 4, 3], [null, 0, 1], ['E', 4, 1], ['G#', 4, 1],
    ['B', 4, 3], [null, 0, 1], ['E', 4, 1], ['E', 5, 1],
    // The theme comes round again and this time resolves down to A.
    ['D#', 5, 1], ['E', 5, 1], ['D#', 5, 1], ['E', 5, 1], ['B', 4, 1], ['D', 5, 1], ['C', 5, 1],
    ['A', 4, 3], [null, 0, 1], ['C', 4, 1], ['E', 4, 1],
    ['A', 4, 3], [null, 0, 1], ['E', 4, 1], ['C', 5, 1],
    ['B', 4, 3], [null, 0, 3],
    ['A', 4, 11]
  ];

  // The B strain: out of A minor into F major, climbing, then falling back to
  // the dominant so the A theme can return.
  var B_STRAIN = [
    ['C', 5, 2], ['F', 5, 2], ['E', 5, 1], ['F', 5, 1],
    ['G', 5, 2], ['A', 5, 4],
    ['A', 5, 1], ['G', 5, 1], ['F', 5, 1], ['E', 5, 1], ['D', 5, 2],
    ['D', 5, 2], ['G', 5, 2], ['F', 5, 1], ['G', 5, 1],
    ['A', 5, 2], ['B', 5, 4],
    ['C', 5, 2], ['E', 5, 2], ['D#', 5, 1], ['E', 5, 1],
    ['B', 4, 6]
  ];

  // Left hand: a broken chord per 3/8 bar, root then two upper notes, which is
  // the accompaniment figure the A section never leaves.
  var CHORDS = {
    Am: [['A', 2], ['E', 3], ['A', 3]],
    E: [['E', 2], ['E', 3], ['G#', 3]],
    F: [['F', 2], ['A', 2], ['C', 3]],
    C: [['C', 3], ['E', 3], ['G', 3]],
    G: [['G', 2], ['B', 2], ['D', 3]]
  };

  function melodyFrom(phrase, startBeat, velocity) {
    var notes = [];
    var beat = startBeat;
    phrase.forEach(function (n) {
      if (n[0]) notes.push({ beat: beat, duration: n[2], freq: f(n[0], n[1]), velocity: velocity });
      beat += n[2];
    });
    return { notes: notes, endBeat: beat };
  }

  function bassFrom(plan, startBeat, velocity) {
    var notes = [];
    plan.forEach(function (name, bar) {
      CHORDS[name].forEach(function (pitch, i) {
        notes.push({
          beat: startBeat + bar * 6 + i * 2,
          duration: 2,
          freq: f(pitch[0], pitch[1]),
          velocity: velocity
        });
      });
    });
    return notes;
  }

  var melody = [];
  var bass = [];

  function layMelody(phrase, startBeat, velocity) {
    var laid = melodyFrom(phrase, startBeat, velocity);
    melody = melody.concat(laid.notes);
    return laid.endBeat;
  }

  // A (62 beats) -- B (36) -- A (62). The left hand sits out the two-beat
  // pickup and enters underneath the first held A.
  var A_PLAN = ['Am', 'E', 'Am', 'Am', 'E', 'Am', 'E', 'Am', 'Am'];
  var B_PLAN = ['F', 'C', 'G', 'C', 'F', 'E'];

  var cursor = 0;
  cursor = layMelody(A_THEME, cursor, 0.5);
  bass = bass.concat(bassFrom(A_PLAN, 8, 0.34));

  var bStart = cursor;
  cursor = layMelody(B_STRAIN, bStart, 0.62);
  bass = bass.concat(bassFrom(B_PLAN, bStart, 0.4));

  var reprise = cursor;
  cursor = layMelody(A_THEME, reprise, 0.46);
  bass = bass.concat(bassFrom(A_PLAN, reprise + 8, 0.32));

  var LENGTH = cursor;

  window.Wordbound.Pieces.furElise = {
    id: 'fur-elise',
    title: 'Für Elise',
    composer: 'Ludwig van Beethoven',
    vetting: { composed: 1810, composerDied: 1827, publicDomain: true },
    regularName: 'The Bagatelle',
    gimmick: 'Everyone knows the first eight notes. Nobody remembers what comes next.',
    stageTier: 'early',
    gain: 1.0,  // level trim; see PIECE FORMAT in music.js
    lengthBeats: LENGTH,
    // Sixteenths per minute: a 6-beat 3/8 bar lands just under a second,
    // which is "Poco moto" at the tempo the piece is usually taken.
    tempo: 380,
    tracks: { melody: melody, bass: bass },
    voices: { melody: 'piano', bass: 'piano' },
    dynamics: {
      // Quiet and rocking through A, opening up through the B strain's climb,
      // then settling back as the theme returns.
      keyframes: [
        { beat: 0, intensity: 0.14 },
        { beat: 40, intensity: 0.22 },
        { beat: 62, intensity: 0.3 },
        { beat: 78, intensity: 0.52 },
        { beat: 86, intensity: 0.68 },
        { beat: 98, intensity: 0.42 },
        { beat: 120, intensity: 0.3 },
        { beat: 150, intensity: 0.24 },
        { beat: LENGTH, intensity: 0.2 }
      ],
      crescendos: [
        { id: 'the-climb', startBeat: 68, peakBeat: 86, peakIntensity: 0.68, rampDurationBeats: 18 },
        { id: 'the-return', startBeat: 104, peakBeat: 112, peakIntensity: 0.44, rampDurationBeats: 8 }
      ]
    }
  };
})();
