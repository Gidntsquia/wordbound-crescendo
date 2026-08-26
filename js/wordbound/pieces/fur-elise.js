// js/wordbound/pieces/fur-elise.js
// PD VETTING (re-checked here per the standing rule): "Für Elise" (Bagatelle
// No. 25 in A minor, WoO 59), Ludwig van Beethoven, composed 1810, first
// published 1867, Beethoven died 1827 (199 years ago as of 2026) -- past both
// the pre-1930 and 70-years-dead bars. Safely public domain. Synthesized from
// sequenced note data only, never a recording.
//
// Transcribed against a printed edition of the score rather than by ear. The
// A section (the part everyone knows) follows the notated rhythm; the middle
// strain is still an approximation of its shape -- see THE MIDDLE STRAIN.
//
// FORM, as the score lays it out: the eight-bar A theme is written with a
// repeat and first/second endings, so it is HEARD TWICE before the middle
// strain, which is marked mf against the theme's pp. The theme then returns
// pp. So: A A B A, in 3/8, marked "Poco moto."
//
// TIME BASE: one beat here is a SIXTEENTH note, the piece's own smallest unit,
// which keeps every beat and duration in the data an integer. A 3/8 bar is
// therefore exactly BAR (6) beats.
//
// WHY THIS FILE IS WRITTEN BAR-BY-BAR: an earlier draft laid the melody out as
// one flat run of notes and quietly got a bar wrong (7 sixteenths instead of
// 6). That shifted every later note by a sixteenth, so the right hand played
// permanently against the left for the rest of the piece -- every note correct
// and in the right order, and it still sounded wrong. The assertion in layBars
// makes that mistake impossible to repeat silently.
//
// THE LEFT HAND is the correction that matters most. It is NOT three even
// eighths spread across the bar, which is what an earlier draft did and which
// plods. The score writes a quick arpeggio -- three sixteenths at the top of
// the bar -- and then REST for the rest of the bar. What makes those notes
// seem to last is the damper pedal, not their written length.
//
// PEDAL: a pianist holds the pedal through each harmony and lifts it at the
// bar line, so a broken chord accumulates into a ringing one instead of three
// separate plucks. Modelled by extending durations to the bar line (see
// layBars/layChords), which is why the left hand can be written short and
// still ring. The unaccompanied sixteenth-note runs are left dry, as played --
// pedalling the opening E/D# semitone just smears the two notes together.
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

  // The two-sixteenth upbeat before bar 1. Heard once, at the very top.
  var PICKUP = [['E', 5, 1], ['D#', 5, 1]];

  // Each bar is [note, octave, durationIn16ths] summing to BAR; null = rest.
  // The eight bars the score wraps in a repeat. Bars 1 and 5 are the
  // unaccompanied rocking figure; the rest are the melody note (an eighth),
  // a rest, then two sixteenths lifting into the next bar.
  var A_BARS = [
    [['E', 5, 1], ['D#', 5, 1], ['E', 5, 1], ['B', 4, 1], ['D', 5, 1], ['C', 5, 1]],
    [['A', 4, 2], [null, 0, 2], ['C', 4, 1], ['E', 4, 1]],
    [['A', 4, 2], [null, 0, 2], ['E', 4, 1], ['G#', 4, 1]],
    [['B', 4, 2], [null, 0, 2], ['E', 4, 1], ['E', 5, 1]],
    [['E', 5, 1], ['D#', 5, 1], ['E', 5, 1], ['B', 4, 1], ['D', 5, 1], ['C', 5, 1]],
    [['A', 4, 2], [null, 0, 2], ['C', 4, 1], ['E', 4, 1]],
    [['A', 4, 2], [null, 0, 2], ['E', 4, 1], ['G#', 4, 1]],
    [['B', 4, 2], [null, 0, 2], ['E', 4, 1], ['C', 5, 1]]
  ];
  // The left hand rests under the unaccompanied runs (bars 1 and 5).
  var A_CHORDS = [null, 'Am', 'E', 'Am', null, 'Am', 'E', 'Am'];

  // The bar that lands the theme when it is not looping back.
  var A_CLOSE = [[['A', 4, 6]]];
  var A_CLOSE_CHORDS = ['Am'];

  // THE MIDDLE STRAIN (mf in the score). Unlike the A section this is NOT a
  // faithful transcription -- it follows the strain's harmony (F, C, G, C, F,
  // then E to hand the theme back) and its rising-then-falling shape, but the
  // inner notes are invented. Flagged rather than passed off as the real
  // thing; replacing it needs the score's middle system read properly.
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

  // Root, then the two upper voices.
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
        // Three SIXTEENTHS at the top of the bar (not three eighths across
        // it), each ringing to the bar line because the pedal is down.
        out.push({
          beat: startBeat + bar * BAR + i,
          duration: BAR - i,
          freq: f(pitch[0], pitch[1]),
          velocity: baseVel * (i === 0 ? 1.12 : 0.94) // the root grounds it
        });
      });
    });
  }

  var melody = [];
  var bass = [];

  // The left hand is kept well under the right throughout: voicing the melody
  // above the accompaniment is most of what "played musically" means.
  var marks = {};

  // Upbeat, then the theme as written -- twice, per the repeat.
  PICKUP.forEach(function (n, i) {
    melody.push({ beat: i, duration: n[2], freq: f(n[0], n[1]), velocity: 0.46 });
  });
  var cursor = PICKUP.length;

  marks.a1 = cursor;
  cursor = layBars(A_BARS, cursor, 0.52, melody);
  layChords(A_CHORDS, marks.a1, 0.3, bass);

  marks.a2 = cursor; // the repeat: a shade warmer the second time through
  cursor = layBars(A_BARS, cursor, 0.56, melody);
  layChords(A_CHORDS, marks.a2, 0.32, bass);

  marks.b = cursor;
  cursor = layBars(B_BARS, cursor, 0.62, melody);
  layChords(B_CHORDS, marks.b, 0.37, bass);

  marks.a3 = cursor; // pp again on the return
  cursor = layBars(A_BARS, cursor, 0.46, melody);
  layChords(A_CHORDS, marks.a3, 0.27, bass);
  marks.close = cursor;
  cursor = layBars(A_CLOSE, cursor, 0.44, melody);
  layChords(A_CLOSE_CHORDS, marks.close, 0.26, bass);

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
    // The breakpoints are rubato: the middle strain presses forward and the
    // piece leans back into each return of the theme, because a player does
    // not hold one metronomic tempo through a rondo.
    tempo: [
      { beat: 0, bpm: 280 },
      { beat: marks.a2 - BAR, bpm: 268 },  // easing round into the repeat
      { beat: marks.a2, bpm: 280 },
      { beat: marks.b - BAR, bpm: 270 },
      { beat: marks.b, bpm: 292 },         // the middle strain picks up
      { beat: marks.b + 30, bpm: 300 },
      { beat: marks.a3 - BAR, bpm: 262 },  // dim., pulling back for the return
      { beat: marks.a3, bpm: 280 },
      { beat: marks.close - BAR, bpm: 244 } // closing ritardando
    ],
    tracks: { melody: melody, bass: bass },
    voices: { melody: 'piano', bass: 'piano' },
    dynamics: {
      // The score's own marks: pp for the theme, mf for the middle strain,
      // dim. into the return, pp again.
      keyframes: [
        { beat: 0, intensity: 0.13 },
        { beat: marks.a2, intensity: 0.2 },
        { beat: marks.b, intensity: 0.5 },
        { beat: marks.b + 24, intensity: 0.68 },
        { beat: marks.a3 - BAR, intensity: 0.34 }, // dim.
        { beat: marks.a3, intensity: 0.16 },       // pp
        { beat: marks.close, intensity: 0.14 },
        { beat: LENGTH, intensity: 0.12 }
      ],
      crescendos: [
        { id: 'the-climb', startBeat: marks.b, peakBeat: marks.b + 24, peakIntensity: 0.68, rampDurationBeats: 24 },
        { id: 'the-return', startBeat: marks.a3, peakBeat: marks.a3 + 8, peakIntensity: 0.4, rampDurationBeats: 8 }
      ]
    }
  };
})();
