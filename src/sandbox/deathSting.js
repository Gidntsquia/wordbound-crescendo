// src/sandbox/deathSting.js
// The sound of an enemy piece DYING. Without it a won round cut straight from
// one recording to the next, which read as a channel change rather than a
// defeat. Two parts, both synthesized (the recordings are the only logged
// exception to the synthesized-only rule and this adds none):
//
//   1. The recording itself sags to a halt -- a tape-stop: pitch and volume
//      slide down together until the piece is gone. That is audioPiece.js's
//      `die`; this file only asks for it.
//   2. Once the piece has stalled, a short descending minor cadence -- the
//      piece's own last breath -- played on soft detuned tones. Ends on a low
//      root held long enough that the next piece can fade in under its tail.
(function () {
  window.Wordbound = window.Wordbound || {};
  var Sandbox = (window.Wordbound.Sandbox = window.Wordbound.Sandbox || {});

  // How long the recording takes to grind to a halt.
  Sandbox.DEATH_STALL_SEC = 1.4;
  // Total time from the win to the sting's last note fading, so the UI can
  // hold the "next" step until the death has been heard.
  Sandbox.DEATH_STING_SEC = 2.6;

  var A = 220;
  function hz(semis) { return A * Math.pow(2, semis / 12); }

  // Falling A minor line: E5 -> C5 -> A4 -> E4, then the root A3 held. Each
  // step is a little longer and quieter than the last -- a collapse, not a run.
  var STEPS = [
    { semi: 7,   at: 0.00, len: 0.30, vol: 0.70 },
    { semi: 3,   at: 0.28, len: 0.34, vol: 0.62 },
    { semi: 0,   at: 0.60, len: 0.42, vol: 0.55 },
    { semi: -5,  at: 1.00, len: 0.60, vol: 0.50 },
    { semi: -12, at: 1.55, len: 1.60, vol: 0.60 },
    { semi: -9,  at: 1.55, len: 1.60, vol: 0.25 }   // minor third under the root
  ];

  function tone(ctx, dest, freq, at, len, vol) {
    // Two slightly detuned triangles through a lowpass: soft and a little
    // wobbly, like a reed losing its breath.
    [-6, 6].forEach(function (cents) {
      var osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = cents;
      // Every note droops a quarter-tone as it fades: dying, not resting.
      osc.frequency.setValueAtTime(freq, at);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.97, at + len);
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1800;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(vol * 0.5, at + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, at + len);
      osc.connect(lp); lp.connect(g); g.connect(dest);
      osc.start(at);
      osc.stop(at + len + 0.05);
    });
  }

  // Play the sting into `destination` starting `delaySec` from now (so it
  // can wait for the tape-stop). Returns when, on the ctx clock, it ends.
  Sandbox.playDeathSting = function (ctx, destination, delaySec) {
    var t0 = ctx.currentTime + (delaySec || 0);
    var bus = ctx.createGain();
    bus.gain.value = 0.9;
    bus.connect(destination);
    STEPS.forEach(function (s) {
      tone(ctx, bus, hz(s.semi), t0 + s.at, s.len, s.vol);
    });
    return t0 + 3.2;
  };
})();
