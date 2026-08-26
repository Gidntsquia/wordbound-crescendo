// js/wordbound/pieces/beethoven-5th.js
// DUEL-GAUGE COMBAT ticket's "Next" note (GOALS.md, update-12): sequence
// the final boss's piece -- Symphony No. 5 in C minor, Beethoven (THEME.md's
// "The Maestro," the Podium's final tier). Scoped, per update-12's own
// split, to PIECE COMPOSITION ONLY -- same shape as update-10/11's own
// Mountain King/Valkyrie Marshal precedent (sequence the piece, verify it
// end-to-end, leave wiring it into a real reachable boss def + a real
// floor-4/"Podium" for a later run). PD VETTING (THEME.md's own table,
// standing rule re-checked here): composed 1808, premiered 1808, Beethoven
// died 1827 (199 years ago as of 2026) -- the most safely public-domain
// piece in the whole roster by a wide margin.
//
// This is a hand-authored transcription approximating the symphony's
// famous construction -- NOT a scholarly critical edition, same disclosure
// every prior piece file carries. THEME.md's own brief: "The symphony's
// four movements are the natural fight-phase structure... each movement
// changes the shape of the pressure, not just its intensity, ending on the
// finale's triumphant major-key turn as the last phase" and "the famous
// opening four-note motif (short-short-short-LONG)... played completely
// straight, as a threat, not a metaphor." Modeled directly, movement by
// movement (see each section's own comment below for the reasoning):
//   I.   Allegro con brio    (beats 0-32,   tempo 116) -- the literal Fate
//        motif (G-G-G-Eb, then F-F-F-D, the real symphony's own restatement
//        a step down), developing and thickening into one crescendo.
//   II.  Andante con moto    (beats 32-56,  tempo 76)  -- a genuine LOW-
//        INTENSITY LULL with real rests in the melody line, not just a
//        quieter version of movement I's shape -- the "changes the shape of
//        the pressure, not just its intensity" brief taken literally: this
//        is the one movement in the whole roster with deliberate silence in
//        its own track data, the structural opposite of Valkyrie Marshal's
//        never-rests ostinato.
//   III. Scherzo (Allegro)   (beats 56-80,  tempo 112) -- an ominous,
//        near-silent buildup (mirrors Mountain King's single-ramp
//        technique, compressed into one movement of a larger piece) that
//        never releases, crescendoing straight into movement IV's downbeat
//        -- the real symphony's famous attacca transition, played straight.
//   IV.  Allegro (Finale)    (beats 80-112, tempo 132) -- the triumphant C
//        major fanfare, sustained high intensity with the piece's most
//        frequent, most powerful crescendos (three, more than any other
//        movement, matching 'final' tier's "frequent, powerful crescendos"
//        being a step beyond even 'late' tier's Valkyrie Marshal) plus one
//        quiet return of the scherzo's material (the real symphony's own
//        structure) before the coda's last surge -- ending at max intensity
//        on the final beat, "the finale's triumphant major-key turn as the
//        last phase."
// Five real crescendo markers total (one each in movements I and III, three
// in movement IV) -- more than Valkyrie Marshal's four, appropriate for
// 'final' tier being one step scarier still per the header curve decision.
// Audible musicality (does this actually feel like the Fifth) is Jaxon's
// call, per standing practice -- this file's job is proving the engine's
// format handles a real four-movement, phase-shaped piece end-to-end.
//
// stageTier: 'final' -- THEME.md names this boss "the Podium," beyond the
// third floor, the last tier in the header curve decision's own list.
(function () {
  window.Wordbound = window.Wordbound || {};
  window.Wordbound.Pieces = window.Wordbound.Pieces || {};

  // Equal-temperament note name -> frequency, A4 = 440Hz. Local and
  // self-contained on purpose, same convention as every other piece file --
  // piece files are plain data modules per the MUSIC ENGINE ticket, so this
  // doesn't reach into music.js or any other piece file.
  var SEMITONE_FROM_A = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 };
  function f(note, octave) {
    var n = SEMITONE_FROM_A[note] + (octave - 4) * 12;
    return 440 * Math.pow(2, n / 12);
  }

  function patternNotes(pattern, startBeat, velocity, octaveShift) {
    var notes = [];
    var t = startBeat;
    pattern.forEach(function (n) {
      notes.push({ beat: t, duration: n[2], freq: f(n[0], n[1] + (octaveShift || 0)), velocity: velocity });
      t += n[2];
    });
    return notes;
  }

  var melody = [];
  var bass = [];

  // ---- Movement I: Allegro con brio (beats 0-32) --------------------------
  // The Fate motif itself: three short repeated notes then one long one
  // (short-short-short-LONG), 4 beats per statement -- G-G-G-Eb (D# here,
  // enharmonic) then, per the real symphony's own restatement, answered a
  // step down on F-F-F-D. 8 statements alternating up/down = 32 beats.
  // Bass doubles an octave down starting the fifth statement, the same
  // "gradually thickening" texture mountain-king.js's own stanzas use, and
  // velocity climbs into movement I's single closing crescendo.
  var FATE_UP = [['G', 4, 0.5], ['G', 4, 0.5], ['G', 4, 0.5], ['D#', 4, 2.5]];
  var FATE_DOWN = [['F', 4, 0.5], ['F', 4, 0.5], ['F', 4, 0.5], ['D', 4, 2.5]];
  for (var s = 0; s < 8; s++) {
    var pattern = (s % 2 === 0) ? FATE_UP : FATE_DOWN;
    var startBeat = s * 4;
    var vel = 0.4 + s * 0.07;
    melody = melody.concat(patternNotes(pattern, startBeat, vel));
    if (s >= 4) bass = bass.concat(patternNotes(pattern, startBeat, vel - 0.15, -1));
  }

  // ---- Movement II: Andante con moto (beats 32-56) -------------------------
  // A genuine lull, structurally not just dynamically: a simple 4-note
  // descending phrase (A-G-F-E) at LOW velocity, spaced with real 0.5-beat
  // rests between notes and a full silent bar between each phrase repeat --
  // the "changes the shape of the pressure" brief made literal in the track
  // data, the deliberate opposite of every other piece's unbroken texture.
  // A sparse, calm bass pedal (one long low tone per phrase, not an
  // ostinato) is the only bass voice here.
  var MOV2_PHRASE = [['A', 4], ['G', 4], ['F', 4], ['E', 4]];
  var mov2PhraseStarts = [32, 40, 48];
  mov2PhraseStarts.forEach(function (phraseStart, pi) {
    MOV2_PHRASE.forEach(function (n, i) {
      melody.push({ beat: phraseStart + i * 1.5, duration: 1, freq: f(n[0], n[1]), velocity: 0.26 + pi * 0.02 });
    });
    bass.push({ beat: phraseStart, duration: 5, freq: f('A', 2), velocity: 0.2 });
  });

  // ---- Movement III: Scherzo, Allegro (beats 56-80) ------------------------
  // An ominous, near-silent buildup: a rising 3-note minor-triad cell
  // (C-Eb-G) repeated every 2 beats, climbing in both velocity (0.12 -> 0.9)
  // and register (one octave up every 8 beats) across the whole movement,
  // never releasing -- the real symphony's famous attacca transition
  // (strings murmuring under a held timpani roll, building straight into
  // the finale's downbeat) played straight, same "one continuous ramp"
  // technique mountain-king.js's whole piece uses, compressed into a single
  // movement here.
  var MOV3_CELL = [['C', 3, 0.5], ['D#', 3, 0.5], ['G', 3, 0.5]];
  for (var b3 = 56; b3 < 80; b3 += 2) {
    var mov3Vel = 0.12 + ((b3 - 56) / 24) * 0.78;
    var mov3OctShift = Math.floor((b3 - 56) / 8);
    bass = bass.concat(patternNotes(MOV3_CELL, b3, mov3Vel, mov3OctShift));
  }
  // The sustained held tone right at the transition into movement IV.
  melody.push({ beat: 79, duration: 1, freq: f('G', 4), velocity: 0.95 });

  // ---- Movement IV: Allegro, Finale (beats 80-112) -------------------------
  // The triumphant C-major fanfare (C-E-G-C, a bright rising major arpeggio
  // -- deliberately major, unlike every other pattern in this piece, per
  // THEME.md's own "triumphant major-key turn" note), repeated at full
  // velocity to open the movement, briefly recalling the scherzo's own
  // minor-key material quietly around beat 96 (the real symphony's actual
  // structure), then two more fanfare surges building into the coda's final
  // sustained chord at max intensity on the very last beat.
  var FANFARE = [['C', 5, 0.5], ['E', 5, 0.5], ['G', 5, 0.5], ['C', 6, 1.5]];
  var FANFARE_BASS = [['C', 3, 0.5], ['E', 3, 0.5], ['G', 3, 0.5], ['C', 4, 1.5]];
  [80, 83, 86].forEach(function (startBeat, i) {
    melody = melody.concat(patternNotes(FANFARE, startBeat, 1.0 - i * 0.05));
    bass = bass.concat(patternNotes(FANFARE_BASS, startBeat, 0.85 - i * 0.05));
  });
  // Quiet scherzo-material callback (beats 92-96): the minor-key cell
  // returns briefly, hushed, before the fanfare swells back for the coda.
  for (var b4 = 92; b4 < 96; b4 += 2) {
    bass = bass.concat(patternNotes(MOV3_CELL, b4, 0.3, 1));
  }
  [96, 100].forEach(function (startBeat, i) {
    melody = melody.concat(patternNotes(FANFARE, startBeat, 0.75 + i * 0.15));
    bass = bass.concat(patternNotes(FANFARE_BASS, startBeat, 0.6 + i * 0.15));
  });
  // Coda (beats 104-112): the Fate motif's own rhythm, now triumphant and
  // major, driving to one final sustained fortissimo chord.
  var CODA_PATTERN = ['C', 'C', 'C', 'G', 'C', 'C', 'C'];
  CODA_PATTERN.forEach(function (note, i) {
    melody.push({ beat: 104 + i, duration: 1, freq: f(note, 5), velocity: 0.85 + i * 0.02 });
    bass.push({ beat: 104 + i, duration: 1, freq: f(note, 3), velocity: 0.75 + i * 0.02 });
  });
  melody.push({ beat: 111, duration: 1, freq: f('C', 6), velocity: 1.0 });
  bass.push({ beat: 111, duration: 1, freq: f('C', 3), velocity: 1.0 });

  window.Wordbound.Pieces.beethoven5th = {
    id: 'beethoven-5th',
    title: 'Symphony No. 5 in C minor',
    composer: 'Ludwig van Beethoven',
    vetting: { composed: 1808, composerDied: 1827, publicDomain: true },
    isBoss: true,
    bossName: 'The Maestro',
    floor: 4, // the Podium -- not a real generated floor yet; see this ticket's own "Next" note
    hostageLetterProposal: 'Z',
    stageTier: 'final',
    gain: 0.65,  // level trim; see PIECE FORMAT in music.js
    lengthBeats: 112,
    tempo: [
      { beat: 0, bpm: 116 },  // I. Allegro con brio
      { beat: 32, bpm: 76 },  // II. Andante con moto
      { beat: 56, bpm: 112 }, // III. Scherzo, Allegro
      { beat: 80, bpm: 132 }, // IV. Allegro (finale)
    ],
    tracks: { melody: melody, bass: bass },
    // Orchestral strings carry the four-note motif.
    voices: { melody: 'strings', bass: 'strings' },
    dynamics: {
      keyframes: [
        // I. Allegro con brio -- climbing into its own crescendo, which
        // peaks just BEFORE the movement boundary (beat 31, not 32) so the
        // cut into movement II's lull is a real hard cut in the curve, not
        // a lingering tail across the boundary.
        { beat: 0, intensity: 0.35 },
        { beat: 8, intensity: 0.45 },
        { beat: 16, intensity: 0.55 },
        { beat: 24, intensity: 0.75 },
        { beat: 31, intensity: 0.95 },
        // II. Andante con moto -- the deliberate lull, staying low.
        { beat: 32, intensity: 0.3 },
        { beat: 36, intensity: 0.3 },
        { beat: 44, intensity: 0.32 },
        { beat: 52, intensity: 0.28 },
        { beat: 56, intensity: 0.15 },
        // III. Scherzo -- one long, near-silent-to-maximum ramp.
        { beat: 64, intensity: 0.3 },
        { beat: 72, intensity: 0.55 },
        { beat: 78, intensity: 0.85 },
        { beat: 80, intensity: 1.0 },
        // IV. Allegro (finale) -- sustained high, three surges, a quiet
        // scherzo-callback dip, ending at max on the very last beat.
        { beat: 86, intensity: 0.7 },
        { beat: 92, intensity: 0.95 },
        { beat: 96, intensity: 0.6 },
        { beat: 104, intensity: 1.0 },
        { beat: 108, intensity: 0.85 },
        { beat: 112, intensity: 1.0 },
      ],
      crescendos: [
        { id: 'mov1-fate-crescendo', startBeat: 23, peakBeat: 31, peakIntensity: 0.95, rampDurationBeats: 8 },
        { id: 'mov3-attacca-buildup', startBeat: 56, peakBeat: 80, peakIntensity: 1.0, rampDurationBeats: 24 },
        { id: 'mov4-surge-1', startBeat: 86, peakBeat: 92, peakIntensity: 0.95, rampDurationBeats: 6 },
        { id: 'mov4-surge-2', startBeat: 96, peakBeat: 104, peakIntensity: 1.0, rampDurationBeats: 8 },
        { id: 'mov4-coda-finale', startBeat: 108, peakBeat: 112, peakIntensity: 1.0, rampDurationBeats: 4 },
      ],
    },
  };
})();
