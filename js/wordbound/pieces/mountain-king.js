// js/wordbound/pieces/mountain-king.js
// MUSIC ENGINE ticket's proof piece: "In the Hall of the Mountain King"
// (Peer Gynt), Edvard Grieg. PD VETTING (THEME.md's own table, standing
// rule re-checked here): composed 1875, Grieg died 1907 (119 years ago as
// of 2026) -- well past both the pre-1930 and 70-years-dead bars. Safely
// public domain.
//
// This is a hand-authored transcription approximating the piece's famous
// construction -- NOT a scholarly critical edition: four escalating
// statements of the same short rising-then-falling B-minor motif (the
// iconic bassoon/pizzicato-strings ostinato), each faster and louder than
// the last, thickening in texture (bass doubling joins from the third
// statement on, mirroring the real orchestration building up), capped by a
// driving prestissimo coda. THEME.md's own description of the piece --
// "a single unbroken accelerando: it gets faster and louder in one long
// ramp with no cool-down" -- is modeled directly: dynamics.keyframes below
// is one continuous convex ramp from beat 0 to the final peak, and
// dynamics.crescendos carries exactly ONE marker spanning nearly the whole
// piece, not several discrete spikes. Audible musicality (does this actually
// feel like Mountain King) is Jaxon's call, per standing practice -- this
// file's job is proving the engine's format end-to-end, not shipping a
// note-perfect arrangement.
//
// stageTier judgment call (flagged, not a naming/feel call -- pure balance
// tuning, revisit freely): 'mid', not 'early' or 'late'. This is
// GOALS.md/THEME.md's first boss (floor 1, "The Open Rehearsal" tier, home
// to chill early regulars) -- clearly meant to hit harder than that floor's
// own regulars, but it's still the FIRST of three floor bosses, well below
// the Valkyrie Marshal (floor 3, 'late') or the Maestro (final boss,
// 'final'). 'mid' places its base duel-push multiplier a clear step above
// early-tier regulars without pre-empting the late-tier bosses' headroom.
(function () {
  window.Wordbound = window.Wordbound || {};
  window.Wordbound.Pieces = window.Wordbound.Pieces || {};

  // Equal-temperament note name -> frequency, A4 = 440Hz reference. Local
  // and self-contained on purpose: piece files are plain data modules per
  // the ticket, so this doesn't reach into music.js or any other module.
  var SEMITONE_FROM_A = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 };
  function f(note, octave) {
    var n = SEMITONE_FROM_A[note] + (octave - 4) * 12;
    return 440 * Math.pow(2, n / 12);
  }

  // The 8-note motif: B C# D E F# G F# D (rises stepwise through a 5th,
  // falls back). One statement = 8 beats.
  var MOTIF = [
    ['B', 3], ['C#', 4], ['D', 4], ['E', 4], ['F#', 4], ['G', 4], ['F#', 4], ['D', 4],
  ];

  function motifNotes(startBeat, velocity, octaveShift) {
    return MOTIF.map(function (n, i) {
      return { beat: startBeat + i, duration: 1, freq: f(n[0], n[1] + (octaveShift || 0)), velocity: velocity };
    });
  }

  var melody = [];
  var bass = [];
  // Four statements, two motif repeats each, 8 beats/statement * 2 = 16
  // beats/stanza, velocity climbing each stanza (0.3 -> 0.95). Bass doubles
  // an octave down starting the third stanza (beat 32), mirroring the
  // piece's real gradually-thickening orchestration.
  var STANZAS = [
    { start: 0, velocity: 0.3, withBass: false },
    { start: 16, velocity: 0.5, withBass: false },
    { start: 32, velocity: 0.75, withBass: true },
    { start: 48, velocity: 0.95, withBass: true },
  ];
  STANZAS.forEach(function (stanza) {
    melody = melody.concat(motifNotes(stanza.start, stanza.velocity));
    melody = melody.concat(motifNotes(stanza.start + 8, stanza.velocity));
    if (stanza.withBass) {
      bass = bass.concat(motifNotes(stanza.start, stanza.velocity - 0.1, -1));
      bass = bass.concat(motifNotes(stanza.start + 8, stanza.velocity - 0.1, -1));
    }
  });

  // Coda (beats 64-71): driving tonic/dominant hits at the now much-faster
  // tempo, capped by one sustained fortissimo hit an octave up -- the
  // piece's famous unison climax, and this piece's single crescendo-peak.
  var CODA_PATTERN = ['B', 'F#', 'B', 'F#', 'B', 'F#', 'B'];
  CODA_PATTERN.forEach(function (note, i) {
    melody.push({ beat: 64 + i, duration: 1, freq: f(note, 4), velocity: 0.9 + i * 0.01 });
    bass.push({ beat: 64 + i, duration: 1, freq: f(note, 3), velocity: 0.8 + i * 0.01 });
  });
  melody.push({ beat: 71, duration: 2, freq: f('B', 5), velocity: 1.0 });
  bass.push({ beat: 71, duration: 2, freq: f('B', 3), velocity: 1.0 });

  window.Wordbound.Pieces.mountainKing = {
    id: 'mountain-king',
    title: 'In the Hall of the Mountain King',
    composer: 'Edvard Grieg',
    vetting: { composed: 1875, composerDied: 1907, publicDomain: true },
    isBoss: true,
    bossName: 'The Mountain King',
    floor: 1,
    hostageLetterProposal: 'K',
    stageTier: 'mid',
    lengthBeats: 72,
    tempo: [
      { beat: 0, bpm: 100 },
      { beat: 16, bpm: 112 },
      { beat: 32, bpm: 128 },
      { beat: 48, bpm: 152 },
      { beat: 64, bpm: 210 },
    ],
    tracks: { melody: melody, bass: bass },
    dynamics: {
      keyframes: [
        { beat: 0, intensity: 0.05 },
        { beat: 16, intensity: 0.12 },
        { beat: 32, intensity: 0.25 },
        { beat: 48, intensity: 0.45 },
        { beat: 60, intensity: 0.7 },
        { beat: 68, intensity: 0.9 },
        { beat: 71, intensity: 1.0 },
        { beat: 72, intensity: 1.0 },
      ],
      crescendos: [
        { id: 'the-ramp', startBeat: 0, peakBeat: 71, peakIntensity: 1.0, rampDurationBeats: 71 },
      ],
    },
  };
})();
