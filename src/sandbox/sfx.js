// src/sandbox/sfx.js
// INPUT SOUNDS and the scoring cascade's hits -- a tiny SYNTHESIZED layer
// (DEMO_PLAN_2 Phases 3 and 4). Everything here is WebAudio oscillators and
// filtered noise: no samples, no files, so the synthesized-only rule covers
// it (the recordings are music only). Routed through its own gain so the
// volume slider and the SFX toggle apply, mixed a touch under the music.
//
// Design rules (the plan's): every input sound <= 150 ms except the shimmer;
// attack under 5 ms so it lands on the tap; one sound per event; every
// number lives in SFX_DEFAULTS so it can be tuned without reading the code.
//
// PUBLIC API (window.Wordbound.Sandbox):
//   SFX_DEFAULTS                     -- the table
//   createSfx(ctx, destination) ->
//     Input (Phase 3):
//       tick(pos, dir)   tile case->stick (dir +1, pitch climbs with pos) or
//                        stick->case (dir -1, falls, softer); dir 0 = drop
//       shuffle()        a changeout: 3-4 filtered-noise taps
//       thud()           a barred / illegal tap
//       coin()           buy, sell, reroll: two sines a fifth apart
//       shimmer()        an ink applied: detuned pair, 200 ms
//     Scoring (Phase 4), all scaled by `intensity` in [0,1]:
//       lock(intensity)          low thump at the start of a play
//       letter(i, n, inked)      one rising tick per letter, i of n
//       item(kind)               marimba-ish note; kind 'pts' | 'mult'
//       rule()                   a short bright pair for a tempo marking
//       hit(intensity)           the total lands: sub + noise + a chord
//       resolve()                target crossed: a resolved chord
//       riffle()                 the rack refills
//     setEnabled(bool), setLevel(0..1), enabled, out (the GainNode)
(function () {
  window.Wordbound = window.Wordbound || {};
  var Sandbox = (window.Wordbound.Sandbox = window.Wordbound.Sandbox || {});

  Sandbox.SFX_DEFAULTS = {
    LEVEL: 0.55,          // x the music volume; SFX sit a touch under the music
    // tick: a wooden click, pitch rising with stick position
    TICK_HZ: 640,         // first stick position
    TICK_STEP: 1.06,      // x per position (about a semitone); 7th tile ~ 1.4x
    TICK_MS: 55,
    TICK_GAIN: 0.55,
    TICK_DOWN_GAIN: 0.38, // stick -> case, a little softer
    TICK_DROP_GAIN: 0.25, // a drag drop, muted
    // shuffle: filtered-noise taps
    SHUFFLE_TAPS: 4,
    SHUFFLE_MS: 120,
    SHUFFLE_GAIN: 0.9,
    // thud
    THUD_HZ: 110,
    THUD_MS: 90,
    THUD_GAIN: 0.5,
    // coin
    COIN_HZ: 1046,        // C6; the second sine a fifth up
    COIN_MS: 70,
    COIN_GAP_MS: 55,
    COIN_GAIN: 0.3,
    // shimmer
    SHIMMER_HZ: 1320,
    SHIMMER_DETUNE: 9,    // Hz between the pair
    SHIMMER_MS: 220,
    SHIMMER_GAIN: 0.22,
    // Phase 4 -- the scoring cascade
    LOCK_HZ: 90,
    LOCK_MS: 120,
    LOCK_GAIN: 0.6,
    LETTER_HZ: 520,
    LETTER_SPAN: 1.9,     // pitch ratio from the first letter to the last
    LETTER_MS: 60,
    LETTER_GAIN: 0.45,
    LETTER_INK_RATIO: 1.5, // an inked tile ticks a fifth higher
    ITEM_HZ_PTS: 660,
    ITEM_HZ_MULT: 990,
    ITEM_MS: 180,
    ITEM_GAIN: 0.4,
    RULE_HZ: 1175,
    RULE_MS: 160,
    RULE_GAIN: 0.35,
    HIT_SUB_HZ: 55,
    HIT_MS: 320,
    HIT_GAIN: 0.9,
    HIT_NOISE_GAIN: 0.5,
    HIT_CHORD_HZ: 220,    // the chord's root; size follows intensity
    RESOLVE_HZ: 262,
    RESOLVE_MS: 700,
    RESOLVE_GAIN: 0.35,
    RIFFLE_TAPS: 5,
    RIFFLE_MS: 160,
    RIFFLE_GAIN: 0.5
  };

  Sandbox.createSfx = function (ctx, destination, opts) {
    var T = Object.assign({}, Sandbox.SFX_DEFAULTS, opts || {});
    var out = ctx.createGain();
    out.gain.value = T.LEVEL;
    out.connect(destination);
    var level = 1;
    var api = { out: out, enabled: true };

    var noiseBuf = null;
    function noise() {
      if (!noiseBuf) {
        var n = Math.floor(ctx.sampleRate * 0.5);
        noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
        var d = noiseBuf.getChannelData(0);
        for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      }
      var src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      return src;
    }
    function now() { return ctx.currentTime; }
    // An envelope gain: instant attack (<5 ms), exponential decay to silence.
    function env(gain, at, ms, attackMs) {
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), at + (attackMs || 3) / 1000);
      g.gain.exponentialRampToValueAtTime(0.0001, at + ms / 1000);
      g.connect(out);
      return g;
    }
    function tone(type, hz, gain, at, ms, attackMs) {
      var o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(hz, at);
      o.connect(env(gain, at, ms, attackMs));
      o.start(at);
      o.stop(at + ms / 1000 + 0.02);
      return o;
    }
    function burst(hz, q, gain, at, ms) {
      var src = noise();
      var f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = hz;
      f.Q.value = q;
      src.connect(f);
      f.connect(env(gain, at, ms));
      src.start(at);
      src.stop(at + ms / 1000 + 0.02);
    }
    function on() {
      if (!api.enabled) return false;
      if (ctx.state === 'suspended') ctx.resume().catch(function () {});
      return true;
    }

    // A wooden click: a short triangle with a pitch drop plus a noise tap.
    function click(hz, gain, at, ms) {
      var o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(hz, at);
      o.frequency.exponentialRampToValueAtTime(hz * 0.6, at + ms / 1000);
      o.connect(env(gain, at, ms));
      o.start(at);
      o.stop(at + ms / 1000 + 0.02);
      burst(hz * 3, 2, gain * 0.5, at, Math.min(ms, 30));
    }

    api.tick = function (pos, dir) {
      if (!on()) return;
      var hz = T.TICK_HZ * Math.pow(T.TICK_STEP, Math.max(0, pos || 0));
      var g = dir < 0 ? T.TICK_DOWN_GAIN : dir === 0 ? T.TICK_DROP_GAIN : T.TICK_GAIN;
      if (dir < 0) hz *= 0.84;
      click(hz, g * level, now(), T.TICK_MS);
    };
    api.shuffle = function () {
      if (!on()) return;
      var t = now();
      for (var i = 0; i < T.SHUFFLE_TAPS; i++) {
        burst(1800 + i * 300, 1.2, T.SHUFFLE_GAIN * level, t + (i * T.SHUFFLE_MS / T.SHUFFLE_TAPS) / 1000, 40);
      }
    };
    api.thud = function () {
      if (!on()) return;
      var t = now();
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(T.THUD_HZ, t);
      o.frequency.exponentialRampToValueAtTime(T.THUD_HZ * 0.5, t + T.THUD_MS / 1000);
      o.connect(env(T.THUD_GAIN * level, t, T.THUD_MS));
      o.start(t);
      o.stop(t + T.THUD_MS / 1000 + 0.02);
    };
    api.coin = function () {
      if (!on()) return;
      var t = now();
      tone('sine', T.COIN_HZ, T.COIN_GAIN * level, t, T.COIN_MS);
      tone('sine', T.COIN_HZ * 1.5, T.COIN_GAIN * level, t + T.COIN_GAP_MS / 1000, T.COIN_MS);
    };
    api.shimmer = function () {
      if (!on()) return;
      var t = now();
      tone('triangle', T.SHIMMER_HZ, T.SHIMMER_GAIN * level, t, T.SHIMMER_MS, 8);
      tone('triangle', T.SHIMMER_HZ + T.SHIMMER_DETUNE, T.SHIMMER_GAIN * level, t, T.SHIMMER_MS, 8);
    };

    // ---- Phase 4: the scoring cascade ----
    api.lock = function (intensity) {
      if (!on()) return;
      var k = 0.4 + 0.6 * (intensity || 0);
      var t = now();
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(T.LOCK_HZ, t);
      o.frequency.exponentialRampToValueAtTime(T.LOCK_HZ * 0.55, t + T.LOCK_MS / 1000);
      o.connect(env(T.LOCK_GAIN * k * level, t, T.LOCK_MS));
      o.start(t);
      o.stop(t + T.LOCK_MS / 1000 + 0.02);
    };
    api.letter = function (i, n, inked) {
      if (!on()) return;
      var f = n > 1 ? i / (n - 1) : 0;
      var hz = T.LETTER_HZ * Math.pow(T.LETTER_SPAN, f) * (inked ? T.LETTER_INK_RATIO : 1);
      click(hz, T.LETTER_GAIN * level, now(), T.LETTER_MS);
    };
    api.item = function (kind) {
      if (!on()) return;
      var hz = kind === 'mult' ? T.ITEM_HZ_MULT : T.ITEM_HZ_PTS;
      var t = now();
      // Marimba-ish: a sine with a quick, quieter octave partial.
      tone('sine', hz, T.ITEM_GAIN * level, t, T.ITEM_MS);
      tone('sine', hz * 2, T.ITEM_GAIN * 0.3 * level, t, T.ITEM_MS * 0.4);
    };
    api.rule = function () {
      if (!on()) return;
      var t = now();
      tone('triangle', T.RULE_HZ, T.RULE_GAIN * level, t, T.RULE_MS);
      tone('triangle', T.RULE_HZ * 1.25, T.RULE_GAIN * level, t + 0.06, T.RULE_MS);
    };
    api.hit = function (intensity) {
      if (!on()) return;
      var k = intensity || 0;
      var t = now();
      var ms = T.HIT_MS * (0.6 + 0.4 * k);
      var g = T.HIT_GAIN * (0.35 + 0.65 * k) * level;
      var sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(T.HIT_SUB_HZ * 2, t);
      sub.frequency.exponentialRampToValueAtTime(T.HIT_SUB_HZ, t + 0.08);
      sub.connect(env(g, t, ms));
      sub.start(t);
      sub.stop(t + ms / 1000 + 0.02);
      burst(900, 0.7, T.HIT_NOISE_GAIN * (0.3 + 0.7 * k) * level, t, 90 + 90 * k);
      // The chord grows with the play: root, then fifth, octave, third, ninth.
      var ratios = [1, 1.5, 2, 2.5, 4.5];
      var voices = 1 + Math.round(k * (ratios.length - 1));
      for (var i = 0; i < voices; i++) {
        tone('triangle', T.HIT_CHORD_HZ * ratios[i], g * 0.25, t + i * 0.012, ms * 0.9, 6);
      }
    };
    api.resolve = function () {
      if (!on()) return;
      var t = now();
      [1, 1.25, 1.5, 2].forEach(function (r, i) {
        tone('triangle', T.RESOLVE_HZ * r, T.RESOLVE_GAIN * level, t + i * 0.05, T.RESOLVE_MS, 15);
      });
    };
    api.riffle = function () {
      if (!on()) return;
      var t = now();
      for (var i = 0; i < T.RIFFLE_TAPS; i++) {
        burst(2400, 1.5, T.RIFFLE_GAIN * level, t + (i * T.RIFFLE_MS / T.RIFFLE_TAPS) / 1000, 30);
      }
    };

    api.setEnabled = function (v) { api.enabled = !!v; };
    api.setLevel = function (v) { level = Math.max(0, Math.min(1, v == null ? 1 : v)); };
    return api;
  };
})();
