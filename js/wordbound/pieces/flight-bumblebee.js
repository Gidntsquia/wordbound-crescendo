// js/wordbound/pieces/flight-bumblebee.js
// REGULAR ENEMIES ticket (GOALS.md, real remaining scope (3)): The Swarm,
// first of the late-tier regulars (THEME.md's own table, "frequent,
// powerful crescendos, boss-adjacent pressure"). PD VETTING (re-checked
// here per the standing rule, matching THEME.md's own table): "Flight of
// the Bumblebee," an orchestral interlude from Rimsky-Korsakov's opera
// "The Tale of Tsar Saltan," composed 1899-1900 (using the opera's 1900
// completion/premiere year as the composed date, same convention every
// other piece file in this directory uses when THEME.md gives a range),
// Rimsky-Korsakov died 1908 (118 years ago as of 2026) -- well past both
// the pre-1930 and 70-years-dead bars. Safely public domain.
//
// Hand-authored approximation (same "not a scholarly critical edition"
// disclaimer every piece file in this directory carries): the real piece
// is famous for ONE thing -- a continuous, unbroken CHROMATIC (all 12
// semitones, not a diatonic scale) sixteenth-note run that never stops
// moving for the piece's entire length, with no big dynamic swell to
// speak of. THEME.md's own gimmick -- "Frantic, chromatic, constant -- no
// single big crescendo, just relentless high-frequency pressure" -- is
// modeled structurally, not just described, in three ways at once: (1)
// the melody cell is a full 24-semitone round trip (up one full octave
// chromatically, then back down) built from literal integer semitone
// steps rather than a fixed set of named scale degrees -- unlike The
// Metronome's own 5-distinct-pitch diatonic scale-run cell, this one
// visits all 12 chromatic pitch classes every single repetition, real
// chromaticism as a structural property, not a name; (2) each note is a
// sixteenth note (0.25 beat) with zero gaps, the fastest, most
// "frantic"/continuous melodic motion of any piece in this directory; (3)
// the dynamics curve is a gentle undulation confined to a genuinely
// narrow band for the piece's entire length and carries NO `crescendos`
// entries at all -- same "no crescendos" structural choice Air on the G
// String and The Metronome already established for a piece whose gimmick
// says there isn't one, but at a meaningfully HIGHER band (~0.50-0.56)
// than either of those -- the actual difference between "barely attacks"
// (early tier), "unceasing pressure" (mid tier), and "boss-adjacent
// pressure" (late tier) even though none of the three ever spikes.
//
// stageTier judgment call (flagged, not a naming/feel call -- pure
// balance tuning, same convention every prior tier's own proof-piece note
// already established): 'late'. Per Duel.STAGE_TIER_BASE_PUSH
// (js/wordbound/duel.js), 'late' already pushes 6x harder than 'early'
// (and 2x harder than 'mid') before this curve is even factored in -- so
// this piece's own job, like The Metronome's before it, is the SHAPE (a
// sustained, only mildly-varying high baseline, no discrete spike) rather
// than out-pushing a boss on raw peak numbers. Its peak (~0.56) is
// deliberately still well under a boss's own peak (Mountain King and
// Valkyrie Marshal both reach 1.0) -- establishing a new, one-step-higher
// convention for this tier (< 0.7, vs mid's already-established < 0.6 and
// early's < 0.5) so "late" reads as "approaching boss-level" without
// actually reaching it, per THEME.md's own "boss-adjacent" phrasing.
//
// Deliberately NOT wired into any MONSTER_DEFS entry yet, per this
// ticket's own established "proof piece, verified standalone before
// wiring" precedent (every prior regular in this directory was composed
// and unit-tested in isolation first, wired into a real MONSTER_DEFS
// entry only in a later, dedicated run once the tier's content existed).
// Composing this piece starts the late tier (0 of 3 -> 1 of 3 composed);
// wiring it into a real strong-tier def, retiring one of the old generic
// strong-tier defs (sentinel/warden/spinesplinter), and composing The
// Sabbath + The Organist to complete the tier, are real remaining scope
// for future runs, not done here.
(function () {
  window.Wordbound = window.Wordbound || {};
  window.Wordbound.Pieces = window.Wordbound.Pieces || {};

  // Frequency from a semitone offset relative to A4 (440Hz) -- used
  // directly (rather than the note-letter helper every other piece file
  // in this directory uses) because the melody's whole point is a literal
  // chromatic run through EVERY semitone, not a fixed set of named scale
  // degrees; this is the simplest way to express that faithfully.
  function freqFromSemitone(n) {
    return 440 * Math.pow(2, n / 12);
  }

  // The melody: one continuous chromatic round trip, one full octave up
  // (13 semitone steps, 0..12 inclusive) then back down (11 more steps,
  // 11..1, stopping short of re-hitting the shared endpoint), 24 notes
  // total, each exactly a sixteenth note (0.25 beat) with zero gaps --
  // "frantic, chromatic, constant," structurally, every repetition.
  var CELL_SEMITONES = [];
  for (var up = 0; up <= 12; up++) CELL_SEMITONES.push(up);
  for (var down = 11; down >= 1; down--) CELL_SEMITONES.push(down);
  var NOTE_DURATION = 0.25;
  var CELL_BEATS = CELL_SEMITONES.length * NOTE_DURATION; // 24 * 0.25 = 6 beats
  var MELODY_VELOCITY = 0.2;

  function melodyCell(startBeat) {
    return CELL_SEMITONES.map(function (semitone, i) {
      return {
        beat: startBeat + i * NOTE_DURATION,
        duration: NOTE_DURATION,
        freq: freqFromSemitone(semitone),
        velocity: MELODY_VELOCITY
      };
    });
  }

  var CELL_REPEATS = 12; // 12 * 6 = 72 beats total
  var LENGTH_BEATS = CELL_REPEATS * CELL_BEATS;

  var melody = [];
  for (var c = 0; c < CELL_REPEATS; c++) {
    melody = melody.concat(melodyCell(c * CELL_BEATS));
  }

  // The bass: a low, unvarying wing-beat pulse -- one identical note every
  // half beat (eighth notes), same pitch/duration/velocity for the whole
  // piece, the "relentless" buzz underneath the melody's own chromatic
  // motion. A2 (2 octaves, 24 semitones, below A4).
  var BASS_FREQ = freqFromSemitone(-24);
  var BASS_STEP = 0.5;
  var BASS_VELOCITY = 0.13;
  var bass = [];
  for (var beat = 0; beat < LENGTH_BEATS; beat += BASS_STEP) {
    bass.push({ beat: beat, duration: BASS_STEP, freq: BASS_FREQ, velocity: BASS_VELOCITY });
  }

  window.Wordbound.Pieces.flightBumblebee = {
    id: 'flight-bumblebee',
    title: 'Flight of the Bumblebee',
    composer: 'Nikolai Rimsky-Korsakov',
    vetting: { composed: 1900, composerDied: 1908, publicDomain: true },
    regularName: 'The Swarm',
    gimmick: 'Frantic, chromatic, constant — no single big crescendo, just relentless high-frequency pressure.',
    stageTier: 'late',
    lengthBeats: LENGTH_BEATS,
    tempo: 168, // Presto -- the fastest tempo of any piece in this directory, matching "frantic"
    tracks: { melody: melody, bass: bass },
    dynamics: {
      // A gentle undulation confined to a narrow, high band (0.50-0.56)
      // for the piece's ENTIRE length -- meaningfully above The
      // Metronome's own mid-tier plateau (~0.30-0.34) but never spiking
      // anywhere close to a boss's 1.0. "No single big crescendo, just
      // relentless... pressure," not a moment of real relief.
      keyframes: [
        { beat: 0, intensity: 0.5 },
        { beat: 18, intensity: 0.54 },
        { beat: 36, intensity: 0.56 },
        { beat: 54, intensity: 0.54 },
        { beat: 72, intensity: 0.5 }
      ]
      // No `crescendos` entries at all, on purpose (see header comment) --
      // music.js's own scheduling code guards this with
      // `(piece.dynamics && piece.dynamics.crescendos) || []`, confirmed
      // directly in music.js rather than assumed, same convention
      // air-g-string.js's and czerny-299.js's own "no crescendos" pieces
      // already established.
    }
  };
})();
