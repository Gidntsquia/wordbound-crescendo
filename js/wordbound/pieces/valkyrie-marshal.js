// js/wordbound/pieces/valkyrie-marshal.js
// DUEL-GAUGE COMBAT ticket's "Next" note (GOALS.md, update-10): sequence a
// real piece for the Valkyrie Marshal (THEME.md's floor-3 boss, 'late'
// stage-tier) -- until now only Mountain King ('mid') had a real sequenced
// piece, so 'early'/'late'/'final' all ran on synthetic proxy curves in
// test/duel-balance-simulation.js. This is 'late' tier's first real data.
//
// PIECE: "Ride of the Valkyries" (Wagner's "Walkürenritt", from Act III of
// Die Walküre). PD VETTING (THEME.md's own table, standing rule re-checked
// here): composed 1851-56, premiered as part of the full Ring cycle in the
// 1870s, Wagner died 1883 (143 years ago as of 2026) -- well past both the
// pre-1930 and 70-years-dead bars. Safely public domain.
//
// This is a hand-authored transcription approximating the piece's famous
// construction -- NOT a scholarly critical edition, same disclosure as
// mountain-king.js's own header. The real piece's signature is a rising,
// dotted "gallop" fanfare figure (long-short-long-short) outlining a
// triadic arpeggio, doubled and layered over a driving, unbroken bass
// ostinato -- THEME.md's own description ("no theatrics, no taunting
// pause, just relentless forward pressure from the first note... the piece
// barely lets up long enough to breathe") is modeled directly two ways:
// (1) the bass ostinato never rests for the piece's full length, and (2)
// dynamics.keyframes never drops below 0.5 even at its lowest point --
// unlike Mountain King's near-silent 0.05 opening, this piece starts loud
// and stays loud. Where Mountain King is ONE continuous accelerando (a
// single crescendo marker), this piece is 'late' tier's "frequent, powerful
// crescendos" (header COMBAT MODEL curve decision) -- FOUR real, repeating
// crescendo surges across the piece's length rather than one long ramp, so
// a duel against it has to weather a genuinely different rhythm of threat
// than the Mountain King fight teaches.
//
// stageTier judgment call (flagged, not a naming/feel call -- pure balance
// tuning, revisit freely): 'late', per THEME.md's own text ("the most
// continuously aggressive of the three floor bosses by design... the last
// thing standing between the player and the Podium") and the header curve
// decision's own tier assignment for this boss.
(function () {
  window.Wordbound = window.Wordbound || {};
  window.Wordbound.Pieces = window.Wordbound.Pieces || {};

  // Equal-temperament note name -> frequency, A4 = 440Hz. Local and
  // self-contained on purpose, same convention as mountain-king.js -- piece
  // files are plain data modules per the MUSIC ENGINE ticket, so this
  // doesn't reach into music.js or any other piece file.
  var SEMITONE_FROM_A = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 };
  function f(note, octave) {
    var n = SEMITONE_FROM_A[note] + (octave - 4) * 12;
    return 440 * Math.pow(2, n / 12);
  }

  // The 4-beat "gallop" fanfare figure: a rising B-D-F#-B triad (B minor
  // flavor) in a dotted long-short-long-short rhythm (0.75/0.25 beat pairs),
  // the piece's most recognizable rhythmic signature.
  var GALLOP = [
    ['B', 3, 0.75], ['D', 4, 0.25], ['F#', 4, 0.75], ['B', 4, 0.25],
  ];
  function gallopNotes(startBeat, velocity, octaveShift) {
    var notes = [];
    var t = startBeat;
    GALLOP.forEach(function (n) {
      notes.push({ beat: t, duration: n[2], freq: f(n[0], n[1] + (octaveShift || 0)), velocity: velocity });
      t += n[2];
    });
    return notes;
  }

  // A falling echo of the same triad (B4-F#4-D4-B3), answering each gallop
  // statement -- call-and-response, same "rise then fall" shape
  // mountain-king.js's motif uses, transposed to this piece's faster gallop
  // rhythm instead of even quarter notes.
  var ECHO = [
    ['B', 4, 0.75], ['F#', 4, 0.25], ['D', 4, 0.75], ['B', 3, 0.25],
  ];
  function echoNotes(startBeat, velocity, octaveShift) {
    var notes = [];
    var t = startBeat;
    ECHO.forEach(function (n) {
      notes.push({ beat: t, duration: n[2], freq: f(n[0], n[1] + (octaveShift || 0)), velocity: velocity });
      t += n[2];
    });
    return notes;
  }

  var melody = [];
  var bass = [];

  // Four 16-beat statements (64 beats total), each: gallop, echo, gallop,
  // echo -- i.e. the same call-and-response cell repeated twice per
  // statement, velocity climbing into each statement's own crescendo surge
  // (see dynamics.crescendos below) then never fully releasing, per the
  // "barely lets up" brief.
  var STATEMENTS = [
    { start: 0, baseVel: 0.55, peakVel: 0.85 },
    { start: 16, baseVel: 0.6, peakVel: 0.95 },
    { start: 32, baseVel: 0.6, peakVel: 0.95 },
    { start: 48, baseVel: 0.65, peakVel: 1.0 },
  ];
  STATEMENTS.forEach(function (st) {
    melody = melody.concat(gallopNotes(st.start, st.baseVel));
    melody = melody.concat(echoNotes(st.start + 4, st.baseVel + 0.05));
    melody = melody.concat(gallopNotes(st.start + 8, st.peakVel));
    melody = melody.concat(echoNotes(st.start + 12, st.peakVel));
  });

  // Bass ostinato: a driving, unbroken pulse (one note every half-beat, an
  // octave-plus-fifth below the melody's tonic) for the piece's ENTIRE
  // length, never resting -- the "relentless forward pressure... barely
  // lets up long enough to breathe" line made literal in the track data
  // itself, not just the dynamics curve.
  for (var beat = 0; beat < 64; beat += 0.5) {
    bass.push({ beat: beat, duration: 0.5, freq: f('B', 2), velocity: 0.5 + 0.1 * Math.sin((beat / 64) * Math.PI * 4) * 0.5 + 0.35 });
  }

  window.Wordbound.Pieces.valkyrieMarshal = {
    id: 'valkyrie-marshal',
    title: 'Ride of the Valkyries',
    composer: 'Richard Wagner',
    vetting: { composed: 1856, composerDied: 1883, publicDomain: true },
    isBoss: true,
    bossName: 'The Valkyrie Marshal',
    floor: 3,
    hostageLetterProposal: 'V',
    stageTier: 'late',
    lengthBeats: 64,
    tempo: 152, // fast and constant throughout -- no accelerando to build into, unlike Mountain King; this piece starts at full gallop.
    tracks: { melody: melody, bass: bass },
    dynamics: {
      keyframes: [
        { beat: 0, intensity: 0.55 },
        { beat: 4, intensity: 0.6 },
        { beat: 8, intensity: 0.78 },
        { beat: 12, intensity: 0.95 },
        { beat: 16, intensity: 0.6 },
        { beat: 20, intensity: 0.65 },
        { beat: 24, intensity: 0.82 },
        { beat: 28, intensity: 1.0 },
        { beat: 32, intensity: 0.6 },
        { beat: 36, intensity: 0.68 },
        { beat: 40, intensity: 0.85 },
        { beat: 44, intensity: 1.0 },
        { beat: 48, intensity: 0.65 },
        { beat: 52, intensity: 0.75 },
        { beat: 56, intensity: 0.9 },
        { beat: 60, intensity: 1.0 },
        { beat: 64, intensity: 1.0 },
      ],
      crescendos: [
        { id: 'surge-1', startBeat: 8, peakBeat: 12, peakIntensity: 0.95, rampDurationBeats: 4 },
        { id: 'surge-2', startBeat: 24, peakBeat: 28, peakIntensity: 1.0, rampDurationBeats: 4 },
        { id: 'surge-3', startBeat: 40, peakBeat: 44, peakIntensity: 1.0, rampDurationBeats: 4 },
        { id: 'surge-4-finale', startBeat: 56, peakBeat: 60, peakIntensity: 1.0, rampDurationBeats: 4 },
      ],
    },
  };
})();
