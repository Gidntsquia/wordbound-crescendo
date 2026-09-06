// src/sandbox/deathSting.js
// The sound of an enemy piece DYING. Without it a won round cut straight from
// one recording to the next, which read as a channel change rather than a
// defeat. Two parts, both synthesized (the recordings are the only logged
// exception to the synthesized-only rule and this adds none):
//
//   1. The recording falls silent -- a diminuendo, not a tape-stop. That is
//      audioPiece.js's `die`; this file only asks for it.
//   2. Under its tail, a quiet piano-like cadence in the piece's own key: a
//      slow descending minor line over a held bass, resolving on a soft
//      tonic minor chord. It should sound like the last bars of the piece
//      itself, not a sound effect -- no detune, no pitch droop, plain
//      harmonic tones with a hammer attack and a long natural decay.
(function () {
  window.Wordbound = window.Wordbound || {};
  var Sandbox = (window.Wordbound.Sandbox = window.Wordbound.Sandbox || {});

  // How long the recording takes to fall silent.
  Sandbox.DEATH_STALL_SEC = 1.6;
  // Total time from the win to the cadence's last chord fading, so the UI can
  // hold the "next" step until the death has been heard.
  Sandbox.DEATH_STING_SEC = 3.6;

  var A3 = 220;
  function hz(semis) { return A3 * Math.pow(2, semis / 12); }

  // Relative to the tonic (0 = tonic, minor). A slow i - iv - V - i in the
  // melody over a pedal bass, the classical "and so it ends":
  //   melody: 5th, 4th, 3rd(minor), 2nd, tonic
  //   bass:   tonic an octave down, then the tonic chord.
  var MELODY = [
    { semi: 7,  at: 0.00, len: 0.55, vol: 0.55 },
    { semi: 5,  at: 0.50, len: 0.55, vol: 0.50 },
    { semi: 3,  at: 1.00, len: 0.60, vol: 0.48 },
    { semi: 2,  at: 1.55, len: 0.70, vol: 0.42 },
    { semi: 0,  at: 2.25, len: 2.40, vol: 0.50 }
  ];
  var BASS = [
    { semi: -24, at: 0.00, len: 2.30, vol: 0.40 },
    { semi: -17, at: 1.55, len: 0.75, vol: 0.30 },   // the fifth, leading home
    { semi: -24, at: 2.25, len: 2.60, vol: 0.45 },
    { semi: -12, at: 2.25, len: 2.60, vol: 0.30 },
    { semi: -9,  at: 2.27, len: 2.60, vol: 0.22 }    // minor third of the chord
  ];

  // A struck string: fundamental plus a few decaying partials, a soft
  // hammer transient, and a decay that outlasts `len` slightly so notes
  // overlap like a sustain pedal held down.
  var PARTIALS = [
    { mult: 1, vol: 1.00, decay: 1.00 },
    { mult: 2, vol: 0.40, decay: 0.70 },
    { mult: 3, vol: 0.18, decay: 0.45 },
    { mult: 4, vol: 0.08, decay: 0.30 }
  ];

  function pianoNote(ctx, dest, freq, at, len, vol) {
    var note = ctx.createGain();
    note.gain.value = 1;
    note.connect(dest);
    PARTIALS.forEach(function (p) {
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * p.mult;
      var g = ctx.createGain();
      var peak = vol * p.vol * 0.35;
      var tail = len * p.decay + 0.6;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(peak, at + 0.008);          // hammer
      g.gain.exponentialRampToValueAtTime(peak * 0.45, at + 0.25); // settle
      g.gain.exponentialRampToValueAtTime(0.0001, at + tail);    // ring out
      osc.connect(g); g.connect(note);
      osc.start(at);
      osc.stop(at + tail + 0.05);
    });
  }

  // Play the cadence into `destination` starting `delaySec` from now (so it
  // can wait for the recording's diminuendo), in the key `tonic` semitones
  // above A (minor). Returns when, on the ctx clock, it ends.
  Sandbox.playDeathSting = function (ctx, destination, delaySec, tonic) {
    var t0 = ctx.currentTime + (delaySec || 0);
    var key = tonic || 0;
    var bus = ctx.createGain();
    bus.gain.value = 0.8;
    // A little warmth: roll off the top so the sines read as felt, not glass.
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    bus.connect(lp); lp.connect(destination);
    MELODY.concat(BASS).forEach(function (s) {
      pianoNote(ctx, bus, hz(key + s.semi), t0 + s.at, s.len, s.vol);
    });
    return t0 + 5.0;
  };
})();
