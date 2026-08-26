// js/wordbound/pieces/fur-elise.js
// PD VETTING (re-checked here per the standing rule): "Für Elise" (Bagatelle
// No. 25 in A minor, WoO 59), Ludwig van Beethoven, composed 1810, first
// published 1867, Beethoven died 1827 (199 years ago as of 2026) -- past both
// the pre-1930 and 70-years-dead bars. Safely public domain. Synthesized from
// sequenced note data only, never a recording.
//
// Hand-authored BY EAR, approximating the piece's famous construction -- NOT a
// scholarly critical edition (the same disclaimer gymnopedie-1.js and
// mountain-king.js already establish for this engine). The harmony follows the
// standard reading: bar 2 is an A minor triad, bar 3 an E major triad.
//
// Für Elise is a rondo: A B A. The A theme is the one everybody knows -- the
// rocking E/D# semitone over a broken A-minor arpeggio in the left hand, in
// 3/8, marked "Poco moto."
//
// TIME BASE: one beat here is a SIXTEENTH note, the piece's own smallest unit,
// which keeps every beat and duration in the data an integer. A 3/8 bar is
// therefore exactly BAR (6) beats.
//
// WHY THIS FILE IS WRITTEN BAR-BY-BAR: an earlier draft laid the melody out as
// one flat run of notes and quietly got a bar wrong (7 sixteenths instead of
// 6). That shifted every later note by a sixteenth, so the right hand played
// permanently against the left for the rest of the piece -- the piece was in
// tune and in the right order and still sounded wrong. Writing it as bars with
// an assertion below makes that mistake impossible to repeat.
//
// PEDAL: a pianist holds the damper pedal through each harmony and lifts it at
// the bar line, so a "broken" chord accumulates into a ringing one rather than
// three separate plucks. Modelled here by extending note durations to the bar
// line (see pedalToBarline). The unaccompanied sixteenth-note runs are left
// dry, exactly as they are played -- pedalling the opening E/D# semitone would
// smear the two notes into each other.
//
// TIMBRE: both hands are 'piano', music.js's struck-string voice.
(function () {
  window.Wordbound = window.Wordbound || {};
  window.Wordbound.Pieces = window.Wordbound.Pieces || {};

  var BAR = 6; // sixteenths in one 3/8 bar

  var SEMITONE_FROM_A = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 };
  function f(note, octave) {
    return 440 * Math.pow(2, (SEMITONE_FROM_A[note] + (octave - 4) * 12) / 12);
  }

  // Each bar is a list of [note, octave, durationIn16ths] summing to BAR; a
  // null note is a rest. `null` for a whole bar means that hand is tacet.
  // A 4-bar question, then the same 4-bar answer resolving down to A.
  var A_BARS = [
    [['E', 5, 1], ['D#', 5, 1], ['E', 5, 1], ['B', 4, 1], ['D', 5, 1], ['C', 5, 1]],
    [['A', 4, 2], [null, 0, 2], ['C', 4, 1], ['E', 4, 1]],
    [['A', 4, 2], [null, 0, 2], ['E', 4, 1], ['G#', 4, 1]],
    [['B', 4, 2], [null, 0, 2], ['E', 4, 1], ['E', 5, 1]],
    [['E', 5, 1], ['D#', 5, 1], ['E', 5, 1], ['B', 4, 1], ['D', 5, 1], ['C', 5, 1]],
    [['A', 4, 2], [null, 0, 2], ['C', 4, 1], ['E', 4, 1]],
    [['A', 4, 2], [null, 0, 2], ['E', 4, 1], ['G#', 4, 1]],
    [['B', 4, 2], [null, 0, 2], ['E', 4, 1], ['C', 5, 1]],
    [['A', 4, 6]]
  ];
  // The left hand rests under the unaccompanied runs (bars 1 and 5).
  var A_CHORDS = [null, 'Am', 'E', 'Am', null, 'Am', 'E', 'Am', 'Am'];

  // The B strain: out of A minor into F major, climbing, then falling back to
  // the dominant so the A theme can return.
  var B_BARS = [
    [['C', 5, 2], ['F', 5, 2], ['E', 5, 1], ['F', 5, 1]],
    [['G', 5, 2], ['A', 5, 4]],
    [['A', 5, 1], ['G', 5, 1], ['F', 5, 1], ['E', 5, 1], ['D', 5, 2]],
    [['D', 5, 2], ['G', 5, 2], ['F', 5, 1], ['G', 5, 1]],
    [['F', 5, 2], ['A', 5, 4]],
    [['C', 5, 2], ['E', 5, 2], ['D#', 5, 1], ['E', 5, 1]],
    [['B', 4, 6]]
  ];
  var B_CHORDS = ['F', 'C', 'G', 'C', 'F', 'E', 'E'];

  // Root, then the two upper voices -- the accompaniment figure the A section
  // never leaves.
  var CHORDS = {
    Am: [['A', 2], ['E', 3], ['A', 3]],
    E: [['E', 2], ['E', 3], ['G#', 3]],
    F: [['F', 2], ['A', 2], ['C', 3]],
    C: [['C', 3], ['E', 3], ['G', 3]],
    G: [['G', 2], ['B', 2], ['D', 3]]
  };

  // A real player leans on the first note of a bar and tapers a run as it
  // falls, instead of hitting every note at one fixed force. Without this the
  // notes are all correct and the playing still sounds like a machine.
  function shape(indexInBar, beatInBar, dur) {
    var v = 1;
    if (beatInBar === 0) v *= 1.14;          // the downbeat carries the bar
    else if (beatInBar % 2 !== 0) v *= 0.88; // offbeat sixteenths sit under it
    if (dur >= BAR) v *= 1.06;               // a whole-bar note has to ring
    v *= 1 - indexInBar * 0.03;              // and a run tapers as it goes
    return v;
  }

  function layBars(bars, startBeat, baseVel, out) {
    bars.forEach(function (bar, barIndex) {
      var beat = startBeat + barIndex * BAR;
      var span = 0;
      bar.forEach(function (n, i) {
        if (n[0]) {
          // Under pedal a held note rings to the bar line; the fast run notes
          // (a single sixteenth) stay as written so they don't smear.
          var ring = n[2] >= 2 ? BAR - span : n[2];
          out.push({
            beat: beat + span,
            duration: ring,
            freq: f(n[0], n[1]),
            velocity: baseVel * shape(i, span, n[2])
          });
        }
        span += n[2];
      });
      if (span !== BAR) throw new Error('Für Elise: bar ' + (barIndex + 1) + ' is ' + span + ' sixteenths, not ' + BAR);
    });
    return startBeat + bars.length * BAR;
  }

  function layChords(plan, startBeat, baseVel, out) {
    plan.forEach(function (name, bar) {
      if (!name) return; // tacet bar
      CHORDS[name].forEach(function (pitch, i) {
        var at = i * 2;
        out.push({
          beat: startBeat + bar * BAR + at,
          duration: BAR - at, // pedal down: rings to the bar line
          freq: f(pitch[0], pitch[1]),
          velocity: baseVel * (i === 0 ? 1.12 : 0.94) // the root grounds it
        });
      });
    });
  }

  var melody = [];
  var bass = [];

  // A -- B -- A. The left hand is kept well under the right: voicing the
  // melody above the accompaniment is most of what "played musically" means.
  var cursor = 0;
  var aStart = cursor;
  cursor = layBars(A_BARS, aStart, 0.52, melody);
  layChords(A_CHORDS, aStart, 0.3, bass);

  var bStart = cursor;
  cursor = layBars(B_BARS, bStart, 0.6, melody);
  layChords(B_CHORDS, bStart, 0.36, bass);

  var reprise = cursor;
  cursor = layBars(A_BARS, reprise, 0.46, melody);
  layChords(A_CHORDS, reprise, 0.27, bass);

  var LENGTH = cursor;

  window.Wordbound.Pieces.furElise = {
    id: 'fur-elise',
    title: 'Für Elise',
    composer: 'Ludwig van Beethoven',
    vetting: { composed: 1810, composerDied: 1827, publicDomain: true },
    regularName: 'The Bagatelle',
    gimmick: 'Everyone knows the first eight notes. Nobody remembers what comes next.',
    stageTier: 'early',
    // Level trim (see PIECE FORMAT in music.js). Pedalling raised the piece's
    // density, so it lands mid-band against the rest of the set at 0.8.
    gain: 0.8,
    lengthBeats: LENGTH,
    // Sixteenths per minute. "Poco moto" -- a little motion. At 280 the
    // opening eight notes take ~1.7s, which is where the piece is usually
    // taken; an earlier draft ran 380 and sounded hurried and mechanical.
    // The breakpoints are rubato: the B strain presses forward a touch and
    // the piece leans back into each return of the theme, because a player
    // does not hold one metronomic tempo through a rondo.
    tempo: [
      { beat: 0, bpm: 280 },
      { beat: 48, bpm: 268 },   // easing into the close of the A theme
      { beat: 54, bpm: 292 },   // the B strain picks up
      { beat: 84, bpm: 300 },
      { beat: 90, bpm: 262 },   // and pulls back to let the theme return
      { beat: 96, bpm: 280 },
      { beat: 144, bpm: 244 }   // closing ritardando
    ],
    tracks: { melody: melody, bass: bass },
    voices: { melody: 'piano', bass: 'piano' },
    dynamics: {
      // Quiet and rocking through A, opening up through the B strain's climb,
      // then settling back as the theme returns.
      keyframes: [
        { beat: 0, intensity: 0.14 },
        { beat: 36, intensity: 0.22 },
        { beat: 54, intensity: 0.3 },
        { beat: 72, intensity: 0.52 },
        { beat: 84, intensity: 0.68 },
        { beat: 96, intensity: 0.42 },
        { beat: 120, intensity: 0.3 },
        { beat: 140, intensity: 0.24 },
        { beat: LENGTH, intensity: 0.2 }
      ],
      crescendos: [
        { id: 'the-climb', startBeat: 60, peakBeat: 84, peakIntensity: 0.68, rampDurationBeats: 24 },
        { id: 'the-return', startBeat: 102, peakBeat: 110, peakIntensity: 0.44, rampDurationBeats: 8 }
      ]
    }
  };
})();
