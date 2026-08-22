// js/wordbound/pieces/czerny-299.js
// REGULAR ENEMIES ticket (GOALS.md, real remaining scope (3)): The
// Metronome, third and final mid-tier regular (THEME.md's own table). PD
// VETTING (re-checked here per the standing rule, matching THEME.md's own
// table): "School of Velocity," Op. 299 No. 1, Carl Czerny, composed 1834,
// Czerny died 1857 (169 years ago as of 2026) -- well past both the
// pre-1930 and 70-years-dead bars. Safely public domain.
//
// Hand-authored approximation (same "not a scholarly critical edition"
// disclaimer every piece file in this directory carries): Czerny's
// velocity studies are built from a single unbroken, unvarying figuration
// pattern practiced at a brisk, unrelenting tempo -- the entire point of
// the exercise is mechanical evenness, not musical development. THEME.md's
// own gimmick -- "Mechanical, relentless, perfectly even -- no surprise
// crescendos, just unceasing pressure that never actually stops to
// breathe" -- is modeled structurally, not just described, in three ways
// at once: (1) the melody is ONE identical 8-note scale-run cell (four
// notes ascending, four descending) repeated verbatim, same pitches, same
// durations, same velocity, every single repetition -- unlike every other
// piece in this directory, nothing about the melodic figure ever varies;
// (2) the bass is a literal metronome click -- one unchanging tonic note
// on every beat, same duration, same velocity, the whole way through,
// direct sonic proof of the regular's own name; (3) the dynamics curve
// stays inside a genuinely narrow band the entire piece (see the keyframes
// below) and carries NO `crescendos` entries at all (the only OTHER piece
// in this directory sharing that property is Air on the G String's own
// "telegraphs nothing" flat curve -- but that one sits near-silent at
// ~0.06-0.08; this one sits deliberately much higher, at ~0.30-0.34, the
// actual difference between "barely attacks" (early tier) and "unceasing
// pressure that never lets up" (mid tier) even though neither piece ever
// spikes).
//
// stageTier judgment call (flagged, not a naming/feel call -- pure balance
// tuning, same convention gnossienne-1.js's and invention-4.js's own notes
// already established): 'mid'. Deliberately NOT given Gnossienne/
// Invention's peak spikes (~0.4-0.46) -- this piece's whole gimmick is that
// there ISN'T a peak, just a sustained plateau -- but that plateau (~0.32)
// sits meaningfully above their own calm baseline (~0.09-0.11), so a
// player who never wins a push against this regular takes real, constant
// pressure the whole fight rather than mostly-calm-with-spikes. Per
// Duel.STAGE_TIER_BASE_PUSH (js/wordbound/duel.js), 'mid' already pushes
// 3x harder than 'early' before this curve is even factored in, same
// reasoning every other mid-tier piece file's own note already makes.
//
// Deliberately NOT wired into any MONSTER_DEFS entry yet, per this
// ticket's own established "proof piece, verified standalone before
// wiring" precedent (every prior regular in this directory was composed
// and unit-tested in isolation first, wired into a real MONSTER_DEFS entry
// only in a later, dedicated run). Composing this piece completes the
// mid-tier trio (Gnossienne, Invention, Metronome all now exist) --
// wiring it into a real `normal`-tier def, and retiring the last of the
// old generic normal-tier defs it isn't already covering, is real
// remaining scope for a future run, not done here.
(function () {
  window.Wordbound = window.Wordbound || {};
  window.Wordbound.Pieces = window.Wordbound.Pieces || {};

  var SEMITONE_FROM_A = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 };
  function f(note, octave) {
    var n = SEMITONE_FROM_A[note] + (octave - 4) * 12;
    return 440 * Math.pow(2, n / 12);
  }

  // The bass: a literal metronome click -- one unvarying tonic note per
  // beat, same duration, same velocity, for the piece's entire length.
  // Nothing about it ever changes.
  var BASS_NOTE = 'C';
  var BASS_OCTAVE = 3;
  var BASS_VELOCITY = 0.14;

  // The melody: a single 8-note scale-run cell (C major, four ascending,
  // four descending back to the start), each note exactly 0.5 beats long
  // with zero gaps -- continuous, unbroken sixteenth-note-style motion,
  // repeated VERBATIM (same notes, same durations, same velocity) every
  // single time. No development, no variation -- the whole point of a
  // velocity study.
  var SCALE_CELL = ['C5', 'D5', 'E5', 'F5', 'G5', 'F5', 'E5', 'D5']; // 4 beats, 0.5 beat/note
  var CELL_BEATS = 4;
  var MELODY_VELOCITY = 0.22;

  function parseNote(token) {
    var m = /^([A-G]#?)(\d)$/.exec(token);
    return { note: m[1], octave: parseInt(m[2], 10) };
  }
  function melodyCell(startBeat) {
    var notes = [];
    SCALE_CELL.forEach(function (token, i) {
      var n = parseNote(token);
      notes.push({ beat: startBeat + i * 0.5, duration: 0.5, freq: f(n.note, n.octave), velocity: MELODY_VELOCITY });
    });
    return notes;
  }

  var CELL_REPEATS = 16; // 16 * 4 beats = 64 beats total
  var LENGTH_BEATS = CELL_REPEATS * CELL_BEATS;

  var melody = [];
  for (var c = 0; c < CELL_REPEATS; c++) {
    melody = melody.concat(melodyCell(c * CELL_BEATS));
  }

  var bass = [];
  for (var b = 0; b < LENGTH_BEATS; b++) {
    bass.push({ beat: b, duration: 1, freq: f(BASS_NOTE, BASS_OCTAVE), velocity: BASS_VELOCITY });
  }

  window.Wordbound.Pieces.czerny299 = {
    id: 'czerny-299',
    title: 'School of Velocity, Op. 299 No. 1',
    composer: 'Carl Czerny',
    vetting: { composed: 1834, composerDied: 1857, publicDomain: true },
    regularName: 'The Metronome',
    gimmick: 'Mechanical, relentless, perfectly even — no surprise crescendos, just unceasing pressure that never actually stops to breathe.',
    stageTier: 'mid',
    lengthBeats: LENGTH_BEATS,
    tempo: 132, // brisk, unrelenting -- a velocity study's own real tempo character, unlike every calmer piece in this directory
    tracks: { melody: melody, bass: bass },
    dynamics: {
      // Deliberately confined to a narrow band (0.30-0.34) for the
      // piece's ENTIRE length -- meaningfully higher than the other
      // mid-tier pieces' own calm baseline (~0.09-0.11) but never
      // spiking anywhere close to their own peaks (~0.4-0.46) or a
      // boss's (1.0). "Unceasing pressure that never actually stops to
      // breathe," not a single moment of real relief.
      keyframes: [
        { beat: 0, intensity: 0.3 },
        { beat: 16, intensity: 0.32 },
        { beat: 32, intensity: 0.34 },
        { beat: 48, intensity: 0.32 },
        { beat: 64, intensity: 0.3 }
      ]
      // No `crescendos` entries at all, on purpose (see header comment) --
      // music.js's own scheduling code guards this with
      // `(piece.dynamics && piece.dynamics.crescendos) || []`, confirmed
      // directly in music.js rather than assumed, same convention
      // air-g-string.js's own "no crescendos" piece already established.
    }
  };
})();
