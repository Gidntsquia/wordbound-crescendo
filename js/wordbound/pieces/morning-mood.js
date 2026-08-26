// js/wordbound/pieces/morning-mood.js
// REGULAR ENEMIES ticket (GOALS.md): Morning Mood, third of the early-tier
// regulars (THEME.md's own table). PD VETTING (re-checked here, matching
// THEME.md): "Morning Mood," Peer Gynt Suite No. 1, Edvard Grieg, composed
// 1875, Grieg died 1907 (119 years ago as of 2026) -- well past both the
// pre-1930 and 70-years-dead bars. Safely public domain (same composer,
// same vetting bar Mountain King's own piece file already establishes for
// this engine).
//
// Hand-authored approximation (same disclaimer as every piece file in this
// directory): the real piece opens with a spare flute melody, gradually
// joined by more of the orchestra across two full statements of the same
// pastoral rising-then-falling theme, ending fuller but still gentle --
// nothing like a real climax. THEME.md's own gimmick -- "Wakes up slowly
// over the whole fight. Starts nearly harmless, ends only mildly less so"
// -- is modeled as a single, genuine (if shallow) crescendo spanning the
// WHOLE piece, unlike the other two early regulars (the Gymnopédiste's
// tiny late swell, the G String's total flatness): intensity climbs
// steadily from start to end, but the END value still sits well below
// 'mid'/'late' tier pieces' own peaks (Mountain King's own ramp reaches
// 1.0) -- genuinely building, genuinely still "early" throughout.
//
// RETUNED (REGULAR ENEMIES ticket, follow-up run, after
// test/duel-balance-simulation.js caught it): the original 0.05->0.4 ramp
// looked appropriately gentle next to Mountain King's 1.0 peak, but wasn't
// numerically safe -- wiring this piece into the sim as early tier's real
// representative (replacing its old synthetic placeholder) showed a
// deliberately weak/disengaged bot losing 100% of the time (want ~0% per
// the header's own "nearly safe" early-tier design intent), because the
// curve's TIME-weighted average intensity (~0.22) pushed harder on average
// than that bot's own average word output, even though its PEAK looked
// low. Fixed by lowering the whole curve roughly 4x (0.03->0.10, same
// steady whole-piece ramp shape, same "ends only mildly less harmless"
// story) rather than changing its shape -- now averages ~0.06, comfortably
// under the weak-bot threshold. Reran the sim after this change: 0% loss,
// no SAFETY flag. See PROGRESS.md for the full before/after sim numbers.
(function () {
  window.Wordbound = window.Wordbound || {};
  window.Wordbound.Pieces = window.Wordbound.Pieces || {};

  var SEMITONE_FROM_A = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 };
  function f(note, octave) {
    var n = SEMITONE_FROM_A[note] + (octave - 4) * 12;
    return 440 * Math.pow(2, n / 12);
  }

  // The theme's real signature: a gently rising-then-falling pastoral
  // phrase in E major, stated twice per statement (question/answer), one
  // statement = 16 beats.
  var THEME = [
    ['E', 5, 2], ['F#', 5, 1], ['G#', 5, 1], ['B', 5, 2],
    ['A', 5, 2], ['G#', 5, 1], ['F#', 5, 1], ['E', 5, 2]
  ];
  function themeNotes(startBeat, velocity, octaveShift) {
    var notes = [];
    var beat = startBeat;
    THEME.forEach(function (n) {
      notes.push({ beat: beat, duration: n[2], freq: f(n[0], n[1] + (octaveShift || 0)), velocity: velocity });
      beat += n[2];
    });
    return notes;
  }

  var melody = [];
  var harmony = [];
  // 3 statements, each fuller/louder than the last -- "wakes up slowly."
  // Harmony (a second, lower voice doubling the theme) only joins from the
  // 2nd statement on, mirroring the real gradually-thickening orchestration
  // mountain-king.js's own bass-doubling technique already established.
  var STATEMENTS = [
    { start: 0, velocity: 0.1, withHarmony: false },
    { start: 16, velocity: 0.16, withHarmony: true },
    { start: 32, velocity: 0.22, withHarmony: true }
  ];
  STATEMENTS.forEach(function (s) {
    melody = melody.concat(themeNotes(s.start, s.velocity));
    if (s.withHarmony) {
      harmony = harmony.concat(themeNotes(s.start, s.velocity - 0.08, -1));
    }
  });

  window.Wordbound.Pieces.morningMood = {
    id: 'morning-mood',
    title: 'Morning Mood',
    composer: 'Edvard Grieg',
    vetting: { composed: 1875, composerDied: 1907, publicDomain: true },
    regularName: 'Morning Mood',
    gimmick: 'Wakes up slowly over the whole fight. Starts nearly harmless, ends only mildly less so.',
    stageTier: 'early',
    gain: 2.6,  // level trim; see PIECE FORMAT in music.js
    lengthBeats: 48,
    tempo: 76,
    tracks: { melody: melody, harmony: harmony },
    // Grieg gives the tune to a flute over held strings.
    voices: { melody: 'reed', harmony: 'strings' },
    dynamics: {
      // A single, genuine (if shallow) crescendo spanning the whole piece
      // -- roughly triples from start to end, same shape as the original
      // draft, just lowered ~4x across the board (see RETUNED note above
      // for why: the sim caught the original numbers running too hot for
      // a "nearly safe" early-tier fight).
      keyframes: [
        { beat: 0, intensity: 0.03 },
        { beat: 16, intensity: 0.05 },
        { beat: 32, intensity: 0.07 },
        { beat: 48, intensity: 0.1 }
      ],
      crescendos: [
        { id: 'the-slow-wake', startBeat: 0, peakBeat: 48, peakIntensity: 0.1, rampDurationBeats: 48 }
      ]
    }
  };
})();
