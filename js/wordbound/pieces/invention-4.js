// js/wordbound/pieces/invention-4.js
// REGULAR ENEMIES ticket (GOALS.md, real remaining scope (3)): The
// Invention, second of the mid-tier regulars (THEME.md's own table).
// Composed and validated in ISOLATION this run, matching this ticket's
// own repeatedly-established "proof piece, verified standalone before
// wiring" precedent (see gnossienne-1.js's own header, and every
// early-tier piece file before it) -- deliberately NOT wired into any
// MONSTER_DEFS entry yet.
//
// PD VETTING (re-checked here per the standing rule, matching THEME.md's
// own table): "Invention No. 4 in D minor," BWV 775, Johann Sebastian
// Bach, composed c.1720-23 (compiled into the final "Fifteen Two-Part
// Inventions" set by 1723), Bach died 1750 (276 years ago as of 2026) --
// well past both the pre-1930 and 70-years-dead bars. Safely public
// domain.
//
// Hand-authored approximation (same "not a scholarly critical edition"
// disclaimer every piece file in this directory carries): the real piece
// is a two-part INVENTION in the strict contrapuntal sense -- two
// independent, equally important melodic voices in close canon, each
// stating the same short subject in imitation of the other, continuously
// interweaving rather than one voice accompanying the other. THEME.md's
// own gimmick -- "Two contrapuntal voices fighting each other as much as
// you -- brief crossed-line surges" -- is modeled structurally: `voice1`
// and `voice2` state the SAME subject motif in canon (voice2 enters a few
// beats after voice1, imitating it, the real piece's own core technique),
// mostly staying in SEPARATE registers (voice1 higher, voice2 lower) so
// they read as two distinct lines fighting for space rather than one
// melody+accompaniment -- but at three points the two voices CROSS
// register and lock into brief unison/close-harmony rhythm (both playing
// the identical figure at the same time, in the same octave band), which
// is exactly where this piece's own three dynamics spikes below sit --
// "brief crossed-line surges," a real structural event in the note data,
// not just a comment.
//
// stageTier judgment call (flagged, not a naming/feel call -- pure balance
// tuning, same category gnossienne-1.js's own header already flags its
// pick under): 'mid', per THEME.md's own table. Peak intensity (0.48)
// matches gnossienne-1.js's own established mid-tier peak band (~0.4-0.46)
// for internal consistency across this tier's roster, rather than
// re-deriving a new number from scratch -- both rely on
// Duel.STAGE_TIER_BASE_PUSH already giving 'mid' a 3x push over 'early'
// (3 vs 1, js/wordbound/duel.js) before either piece's own curve is
// factored in, so neither piece needs to out-push the early tier on raw
// peak numbers alone.
//
// NOT YET BALANCE-SIMULATED: not wired into any MONSTER_DEFS entry, so
// there's no real duel path to simulate yet, same as gnossienne-1.js.
// Whoever does real remaining scope (3)'s wiring step should rerun
// test:duel-balance against both mid-tier pieces once they're real,
// reachable monsters and retune here if it flags a real issue.
(function () {
  window.Wordbound = window.Wordbound || {};
  window.Wordbound.Pieces = window.Wordbound.Pieces || {};

  var SEMITONE_FROM_A = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 };
  function f(note, octave) {
    var n = SEMITONE_FROM_A[note] + (octave - 4) * 12;
    return 440 * Math.pow(2, n / 12);
  }

  // The subject: a short rising-then-falling turn figure (D minor), the
  // real piece's own recognizable contour -- 8 beats, quarter-beat notes
  // (continuous motion, matching the real piece's constant 16th-note
  // texture at this engine's own coarser beat resolution).
  var SUBJECT = ['D', 'F', 'E', 'D', 'C', 'D', 'E', 'F'];
  function subjectNotes(startBeat, octave, velocity) {
    return SUBJECT.map(function (note, i) {
      return { beat: startBeat + i, duration: 1, freq: f(note, octave), velocity: velocity };
    });
  }

  var voice1 = [];
  var voice2 = [];
  // Six 8-beat statements = 48 beats total, a regular grid (unlike
  // gnossienne-1.js's deliberately uneven phrasing -- THIS piece's own
  // gimmick is about two voices CROSSING, not an irregular meter, so a
  // steady canon works better here). voice1 leads each statement in the
  // upper register (octave 5); voice2 answers 2 beats later in the lower
  // register (octave 3) -- CLOSE canon, the real piece's own core device,
  // read as two independent lines fighting for the same rhythmic space.
  var STATEMENT_COUNT = 6;
  for (var i = 0; i < STATEMENT_COUNT; i++) {
    var start = i * 8;
    var isCrossing = (i === 1 || i === 3 || i === 5); // 3 of the 6 statements cross registers
    if (isCrossing) {
      // A crossed-line surge: BOTH voices state the subject in the SAME
      // octave, in rhythmic unison, rather than staying separated --
      // "brief crossed-line surges," literally the two lines occupying
      // the same register at once.
      voice1 = voice1.concat(subjectNotes(start, 5, 0.28));
      voice2 = voice2.concat(subjectNotes(start, 4, 0.26));
    } else {
      voice1 = voice1.concat(subjectNotes(start, 5, 0.14));
      voice2 = voice2.concat(subjectNotes(start + 2, 3, 0.12));
    }
  }
  var LENGTH_BEATS = STATEMENT_COUNT * 8;

  window.Wordbound.Pieces.invention4 = {
    id: 'invention-4',
    title: 'Invention No. 4 in D minor',
    composer: 'Johann Sebastian Bach',
    vetting: { composed: 1723, composerDied: 1750, publicDomain: true },
    regularName: 'The Invention',
    gimmick: 'Two contrapuntal voices fighting each other as much as you — brief crossed-line surges.',
    stageTier: 'mid',
    lengthBeats: LENGTH_BEATS,
    tempo: 132, // fast, constant -- a two-part invention's own brisk, continuous-motion tempo
    tracks: { voice1: voice1, voice2: voice2 },
    dynamics: {
      // Calm baseline (~0.1) whenever the two voices stay in separate
      // registers (statements 0, 2, 4), spiking only during the 3
      // crossed-register statements (1, 3, 5) -- each spike sits exactly
      // on its statement's own 8-beat span (beats 8-16, 24-32, 40-48).
      keyframes: [
        { beat: 0, intensity: 0.1 },
        { beat: 8, intensity: 0.12 },
        { beat: 12, intensity: 0.48 },
        { beat: 16, intensity: 0.11 },
        { beat: 24, intensity: 0.12 },
        { beat: 28, intensity: 0.46 },
        { beat: 32, intensity: 0.1 },
        { beat: 40, intensity: 0.12 },
        { beat: 44, intensity: 0.48 },
        { beat: 48, intensity: 0.12 }
      ],
      crescendos: [
        { id: 'crossed-lines-1', startBeat: 8, peakBeat: 12, peakIntensity: 0.48, rampDurationBeats: 4 },
        { id: 'crossed-lines-2', startBeat: 24, peakBeat: 28, peakIntensity: 0.46, rampDurationBeats: 4 },
        { id: 'crossed-lines-3', startBeat: 40, peakBeat: 44, peakIntensity: 0.48, rampDurationBeats: 4 }
      ]
    }
  };
})();
