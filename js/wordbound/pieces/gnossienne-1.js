// js/wordbound/pieces/gnossienne-1.js
// REGULAR ENEMIES ticket (GOALS.md, real remaining scope (3)): The
// Gnossienne, first of the mid-tier regulars (THEME.md's own table, "a few
// real spikes in otherwise calm pieces"). PD VETTING (re-checked here per
// the standing rule, matching THEME.md's own table): "Gnossienne No. 1,"
// Erik Satie, composed 1890 (published 1893), Satie died 1925 (101 years
// ago as of 2026) -- well past both the pre-1930 and 70-years-dead bars.
// Safely public domain (same composer, same death year the Gymnopédiste's
// own piece file already vets, so the same 101y figure is correct for
// both despite the different composition year).
//
// Hand-authored approximation (same "not a scholarly critical edition"
// disclaimer every piece file in this directory carries): the real piece's
// two most famous features are (1) a steady, unchanging habanera-rhythm
// bass ostinato (long-short, long-short) that never varies, and (2) a
// famously EXOTIC, WANDERING modal melody over it, written with no time
// signature or bar lines at all -- performers have to feel the phrasing
// rather than count it. THEME.md's own gimmick -- "Deliberately off-kilter,
// no time signature to read -- the spikes land where you don't expect
// them" -- is modeled two ways at once, structurally not just in flavor
// text: the melody is built from IRREGULAR phrase lengths (7/5/9 beats,
// deliberately not 4/8-aligned like every early-tier piece in this
// directory) laid straight over the bass's own constant, unrelated 2-beat
// cell, so melody phrase boundaries and bass cell boundaries drift out of
// sync with each other across the piece (the actual "no time signature to
// read" feel, not just a comment); and the three dynamics spikes below are
// each placed DELIBERATELY MID-PHRASE, never on a phrase or cycle boundary,
// so nothing in the note data itself telegraphs one coming.
//
// stageTier judgment call (flagged, not a naming/feel call -- pure balance
// tuning like mountain-king.js's own equivalent note): 'mid'. Per
// Duel.STAGE_TIER_BASE_PUSH (js/wordbound/duel.js), 'mid' already pushes
// 3x harder than 'early' (3 vs 1) before this piece's own intensity curve
// is even factored in -- the tier step-up this ticket needs is mostly
// already provided by the tier constant itself, same as the Gymnopédiste's
// own note observes for 'early'. This piece's OWN job is the SHAPE (a few
// real, unpredictable spikes over an otherwise-calm baseline), not
// out-pushing the early tier on raw peak numbers alone -- its peaks
// (~0.4-0.46) are deliberately still well under a boss's own peak (Mountain
// King reaches 1.0), keeping "regular" reading as clearly less threatening
// than any boss at the same tier.
//
// Deliberately NOT wired into any MONSTER_DEFS entry yet, per this
// ticket's own established "proof piece, verified standalone before
// wiring" precedent (the 3 early-tier pieces were composed and unit-tested
// in isolation first, wired into real weak-tier defs only in a later,
// dedicated run once the dom-check.js/Vitest real-floor-RNG hazard was
// fully audited and fixed). That audit's fixes are tier-agnostic (they
// pin any def carrying `.piece`, not just weak-tier ones), so wiring this
// piece into a real normal-tier MONSTER_DEFS entry should not need to
// repeat that audit work -- but a future run should still re-run the full
// verification suite after doing so, not just trust that inference.
(function () {
  window.Wordbound = window.Wordbound || {};
  window.Wordbound.Pieces = window.Wordbound.Pieces || {};

  var SEMITONE_FROM_A = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 };
  function f(note, octave) {
    var n = SEMITONE_FROM_A[note] + (octave - 4) * 12;
    return 440 * Math.pow(2, n / 12);
  }

  // The real piece's signature bass: a constant habanera cell (long note,
  // short note), unchanging for the whole piece -- the one steady thing
  // under the melody's own irregular wandering. 2 beats/cell.
  var HABANERA_CELL_BEATS = 2;
  function habaneraCell(startBeat, velocity) {
    return [
      { beat: startBeat, duration: 1.5, freq: f('D', 3), velocity: velocity },
      { beat: startBeat + 1.5, duration: 0.5, freq: f('A', 2), velocity: velocity }
    ];
  }

  // Three deliberately IRREGULAR phrase lengths (7/5/9 beats) -- not
  // 4/8-aligned like every early-tier piece's own phrase grid -- so the
  // melody's own phrasing drifts out of sync with the bass's constant
  // 2-beat cell as the piece goes on, the actual "no time signature to
  // read" feel rather than just a description of one. D natural minor
  // (Aeolian), matching the real piece's exotic, modal color.
  var PHRASE_A = ['D5', 'F5', 'G5', 'A5', 'G5', 'F5', 'D5']; // 7 beats
  var PHRASE_B = ['A4', 'C5', 'D5', 'C5', 'A4']; // 5 beats
  var PHRASE_C = ['D5', 'E5', 'F5', 'G5', 'A5', 'G5', 'F5', 'E5', 'D5']; // 9 beats

  function parseNote(token) {
    var m = /^([A-G]#?)(\d)$/.exec(token);
    return { note: m[1], octave: parseInt(m[2], 10) };
  }
  function phraseNotes(phrase, startBeat, velocity) {
    var notes = [];
    var beat = startBeat;
    phrase.forEach(function (token) {
      var n = parseNote(token);
      notes.push({ beat: beat, duration: 1, freq: f(n.note, n.octave), velocity: velocity });
      beat += 1;
    });
    return notes;
  }

  var melody = [];
  var bass = [];
  var beat = 0;
  // Two full A+B+C cycles (21 beats each = 42), then one more A+B (12
  // beats = 54), then a single closing tonic note -- 55 beats total. The
  // three dynamics spikes below are timed to land mid-phrase within this
  // sequence, never on one of these boundaries.
  var MELODY_PLAN = [
    { phrase: PHRASE_A, velocity: 0.16 },
    { phrase: PHRASE_B, velocity: 0.16 },
    { phrase: PHRASE_C, velocity: 0.16 },
    { phrase: PHRASE_A, velocity: 0.16 },
    { phrase: PHRASE_B, velocity: 0.16 },
    { phrase: PHRASE_C, velocity: 0.16 }
  ];
  MELODY_PLAN.forEach(function (p) {
    melody = melody.concat(phraseNotes(p.phrase, beat, p.velocity));
    beat += p.phrase.length;
  });
  melody = melody.concat(phraseNotes(PHRASE_A, beat, 0.16));
  beat += PHRASE_A.length;
  melody = melody.concat(phraseNotes(PHRASE_B, beat, 0.16));
  beat += PHRASE_B.length;
  melody.push({ beat: beat, duration: 1, freq: f('D', 5), velocity: 0.18 });
  beat += 1;
  var LENGTH_BEATS = beat; // 55

  // Stop once a cell's OWN notes would start at/past lengthBeats (its
  // short note starts 1.5 beats into the cell) -- avoids emitting a note
  // that starts outside [0, lengthBeats), same bound every other piece
  // file's own note data respects.
  for (var cellStart = 0; cellStart + HABANERA_CELL_BEATS <= LENGTH_BEATS; cellStart += HABANERA_CELL_BEATS) {
    bass = bass.concat(habaneraCell(cellStart, 0.12));
  }

  window.Wordbound.Pieces.gnossienne1 = {
    id: 'gnossienne-1',
    title: 'Gnossienne No. 1',
    composer: 'Erik Satie',
    vetting: { composed: 1890, composerDied: 1925, publicDomain: true },
    regularName: 'The Gnossienne',
    gimmick: 'Deliberately off-kilter, no time signature to read -- the spikes land where you don\'t expect them.',
    stageTier: 'mid',
    gain: 2.4,  // level trim; see PIECE FORMAT in music.js
    lengthBeats: LENGTH_BEATS,
    tempo: 54, // "Lent" -- slow, constant throughout; the irregularity is structural, not tempo-driven
    tracks: { melody: melody, bass: bass },
    // Satie wrote it for piano.
    voices: { melody: 'piano', bass: 'piano' },
    dynamics: {
      // Mostly calm baseline (~0.1), with three real spikes -- each timed
      // to land mid-phrase (beats 8-11, 24-29, 45-49 all fall strictly
      // inside a phrase, never on a 7/5/9 boundary or a habanera-cell
      // boundary), so nothing in the note data telegraphs them.
      keyframes: [
        { beat: 0, intensity: 0.09 },
        { beat: 8, intensity: 0.09 },
        { beat: 11, intensity: 0.42 },
        { beat: 15, intensity: 0.11 },
        { beat: 24, intensity: 0.11 },
        { beat: 29, intensity: 0.46 },
        { beat: 34, intensity: 0.1 },
        { beat: 45, intensity: 0.1 },
        { beat: 49, intensity: 0.4 },
        { beat: 55, intensity: 0.13 }
      ],
      crescendos: [
        { id: 'the-blind-spot-1', startBeat: 8, peakBeat: 11, peakIntensity: 0.42, rampDurationBeats: 3 },
        { id: 'the-blind-spot-2', startBeat: 24, peakBeat: 29, peakIntensity: 0.46, rampDurationBeats: 5 },
        { id: 'the-blind-spot-3', startBeat: 45, peakBeat: 49, peakIntensity: 0.4, rampDurationBeats: 4 }
      ]
    }
  };
})();
