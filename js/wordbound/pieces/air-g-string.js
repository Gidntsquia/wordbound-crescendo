// js/wordbound/pieces/air-g-string.js
// REGULAR ENEMIES ticket (GOALS.md): The G String, second of the early-tier
// regulars (THEME.md's own table). PD VETTING (re-checked here, matching
// THEME.md): "Air" (the "Air on the G String" arrangement), from
// Orchestral Suite No. 3 in D, J.S. Bach, composed c.1730, Bach died 1750
// -- well past both the pre-1930 and 70-years-dead bars. Safely public
// domain.
//
// Hand-authored approximation (same "not a scholarly critical edition"
// disclaimer as every other piece file in this directory): the real Air's
// signature is a slow, steady, stepwise-descending bass line underneath
// one long, unbroken legato melodic line -- almost no rhythmic incident at
// all. THEME.md's own gimmick -- "One long, gentle, unbroken legato line.
// Telegraphs nothing because there's nothing to telegraph" -- is modeled
// as literally as this engine's format allows: a SINGLE crescendo-free
// dynamics curve (no `crescendos` entries at all, the only piece in this
// directory without one) that barely moves for the whole length, and a
// melody built from long-duration notes (4-8 beats each) rather than
// short, punchy ones -- nothing here is meant to telegraph an incoming
// spike, because THEME.md's own text says there isn't one.
(function () {
  window.Wordbound = window.Wordbound || {};
  window.Wordbound.Pieces = window.Wordbound.Pieces || {};

  var SEMITONE_FROM_A = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 };
  function f(note, octave) {
    var n = SEMITONE_FROM_A[note] + (octave - 4) * 12;
    return 440 * Math.pow(2, n / 12);
  }

  // The bass's real signature: a steady quarter-note walk, mostly
  // stepwise-descending, repeated across the piece with the same shape
  // each time (D down to G, back up) -- the piece's own "unbroken" feel.
  var BASS_WALK = ['D', 'C#', 'B', 'A', 'G', 'F#', 'G', 'A'];
  function bassPhrase(startBeat, velocity) {
    return BASS_WALK.map(function (note, i) {
      return { beat: startBeat + i, duration: 1, freq: f(note, 2), velocity: velocity };
    });
  }

  // The melody: long, sustained legato notes (4 beats each, no gaps) over
  // each 8-beat bass phrase -- a single unbroken line, not a developing
  // theme.
  var MELODY_LINE = ['D', 'A', 'G', 'F#'];
  function melodyPhrase(startBeat, velocity, octave) {
    return MELODY_LINE.map(function (note, i) {
      return { beat: startBeat + i * 2, duration: 2, freq: f(note, octave), velocity: velocity };
    });
  }

  var bass = [];
  var melody = [];
  var PHRASE_COUNT = 5; // 5 phrases * 8 beats = 40 beats total
  for (var i = 0; i < PHRASE_COUNT; i++) {
    var start = i * 8;
    bass = bass.concat(bassPhrase(start, 0.3));
    melody = melody.concat(melodyPhrase(start, 0.35, 5));
  }

  window.Wordbound.Pieces.airGString = {
    id: 'air-g-string',
    title: 'Air ("Air on the G String")',
    composer: 'Johann Sebastian Bach',
    vetting: { composed: 1730, composerDied: 1750, publicDomain: true },
    regularName: 'The G String',
    gimmick: "One long, gentle, unbroken legato line. Telegraphs nothing because there's nothing to telegraph.",
    stageTier: 'early',
    gain: 0.8,  // level trim; see PIECE FORMAT in music.js
    lengthBeats: 40,
    tempo: 54, // slower even than the Gymnopédiste -- a true legato adagio
    tracks: { melody: melody, bass: bass },
    // Bach's air is a violin line over a walking bass -- bowed, both hands.
    voices: { melody: 'strings', bass: 'strings' },
    dynamics: {
      // Deliberately near-flat the ENTIRE length, no swell at all (unlike
      // the Gymnopédiste's small late one) -- "nothing to telegraph."
      keyframes: [
        { beat: 0, intensity: 0.06 },
        { beat: 20, intensity: 0.08 },
        { beat: 40, intensity: 0.08 }
      ]
      // No `crescendos` entries at all, on purpose (see header comment) --
      // music.js's own scheduling code already guards this with
      // `(piece.dynamics && piece.dynamics.crescendos) || []`, so an
      // absent list is simply "no crescendo events ever fire," confirmed
      // directly in music.js rather than assumed.
    }
  };
})();
