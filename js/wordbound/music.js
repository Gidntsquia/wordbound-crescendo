// js/wordbound/music.js
// MUSIC ENGINE ticket (GOALS.md, 2026-08-21): a WebAudio sequencer for
// playing back sequenced "piece" data (see PIECE FORMAT below) with sample-
// accurate scheduling, a continuous intensity(t) curve, and a small event
// API the future DUEL-GAUGE COMBAT ticket subscribes to. Framework-agnostic
// plain JS, per the header FRAMEWORK decision -- no DOM, no React, no
// dependency on game.js. Reuses the CALLER's AudioContext and destination
// GainNode (deliberately dependency-injected rather than duplicated) so
// mute/volume plumbing and the AudioContext resume-on-gesture fix already
// living in game.js's audio section keep working unmodified: this module
// never creates its own AudioContext and never connects straight to
// ctx.destination.
//
// PIECE FORMAT (plain data, see js/wordbound/pieces/*.js for real examples):
//   {
//     id, title, composer, vetting: { composed, composerDied, publicDomain },
//     stageTier: 'early' | 'mid' | 'late' | 'final',   // base duel-push tier
//     gain: number (default 1),  // per-piece loudness trim, so a quiet piece
//         and a loud one sit at the same level without re-authoring either
//         one's velocities. Amplitude only -- never changes voicing.
//     lengthBeats: number,                              // piece ends here
//     tempo: number | [{ beat, bpm }, ...],              // constant bpm, or
//         ascending breakpoints (first MUST be { beat: 0, bpm }) for a piece
//         whose tempo genuinely changes (e.g. an accelerando) -- tempo is
//         piecewise-CONSTANT between breakpoints (a small step at each
//         breakpoint, not a continuous ramp): simpler to compute and
//         reason about than integrating a continuously-varying bpm, and
//         close enough for gameplay purposes (this is a step beyond the
//         base ticket's plain "tempo" field -- documented here since
//         Mountain King's accelerando genuinely needs it).
//     tracks: { <name>: [{ beat, duration, freq, velocity, voice }, ...] },
//         beat/duration are in BEATS (tempo-relative, not seconds); freq is
//         Hz; velocity is 0..1 (defaults to 0.8); voice names an instrument
//         from Music.VOICES -- 'piano' (default), 'bright', 'strings',
//         'reed' -- see THE VOICE below for what each one actually is. A note
//         may still carry the original `type` field naming an OscillatorNode
//         type; those map onto the nearest instrument (sine->piano,
//         triangle->bright, square->reed, sawtooth->strings) so every piece
//         written against the old API keeps working and simply sounds better.
//     dynamics: {
//       keyframes: [{ beat, intensity }, ...],  // sorted ascending by beat,
//           piecewise-LINEAR 0..1 curve -- this is intensityAt()/
//           getIntensity(), the continuous push the duel-gauge decision
//           (GOALS.md header) needs.
//       crescendos: [{ id, startBeat, peakBeat, peakIntensity, rampDurationBeats }, ...]
//           -- discrete markers layered on top of the same curve; a piece
//           can have exactly one covering nearly its whole length (a single
//           unbroken accelerando, e.g. Mountain King) or several short ones.
//     },
//   }
//
// PUBLIC API (window.Wordbound.Music):
//   intensityAt(piece, beat) -> number 0..1, pure function over the
//       dynamics.keyframes curve (no sequencer needed).
//   createSequencer(ctx, destination, piece, opts) -> sequencer, see below.
//       opts: { tickMs=25, lookaheadSec=0.15, crescendoLeadBeats=4,
//               autoTick=true, voices={}, voiceTypes={}, reverb=0.2 } --
//       voices maps a track name to a Music.VOICES instrument name;
//       voiceTypes is the original OscillatorNode-typed form of the same
//       thing, still honoured; reverb (0..1) sets the shared room's wet
//       level, 0 for a dry signal.
//
// SEQUENCER INSTANCE:
//   .play() / .pause() / .stop()   -- stop() also halts any still-sounding
//       scheduled notes (quick fade, same click-avoidance technique
//       game.js's stopBackgroundMusic already uses) and does NOT fire
//       'piece-ended' (that's reserved for natural completion).
//   .setTempoScale(scale)  -- the tempo-scale hook the ticket asks to be
//       built now for a future slow-the-music item; rebases scheduling so a
//       change takes effect immediately without discontinuity.
//   .getTempoScale() -> number
//   .currentBeat() -> number, clamped to [0, piece.lengthBeats]
//   .getIntensity() -> number 0..1, intensityAt(piece, currentBeat())
//   .beatToTime(beat) -> ctx.currentTime-axis seconds this beat will play at,
//       given the CURRENT anchor/tempoScale (i.e. assuming no further
//       setTempoScale call before then) -- lets a caller turn a future beat
//       (e.g. a 'crescendo-approaching' payload's peakBeat) into a live
//       seconds-away countdown without duplicating the anchor/tempo math.
//       Already used internally by scheduleNote; exposed read-only.
//   .isPlaying -> boolean (read directly, not a method)
//   .on(event, cb) / .off(event, cb) -- events: 'crescendo-approaching'
//       (fired crescendoLeadBeats before a crescendo's peakBeat, clamped to
//       not precede its startBeat), 'crescendo-peak' (fired when playback
//       crosses peakBeat), 'piece-ended' (fired once, when playback reaches
//       lengthBeats). Every callback receives the crescendo/piece descriptor
//       (piece-ended receives the piece itself).
//   ._tick() -- the internal scheduling step, intentionally exposed (same
//       "internal but testable" convention as Game._advanceFloor) so a unit
//       test can drive it directly against a fake AudioContext with a
//       manually-advanced currentTime, instead of waiting on real timers.
//       Pass { autoTick: false } to skip the real setInterval entirely and
//       call this yourself -- this is the "mocked clock" the ticket's
//       VERIFY section asks for.
(function () {
  window.Wordbound = window.Wordbound || {};
  var Music = (window.Wordbound.Music = {});

  var tempoCache = typeof WeakMap === 'function' ? new WeakMap() : null;

  function normalizedTempo(piece) {
    if (typeof piece.tempo === 'number') return [{ beat: 0, bpm: piece.tempo }];
    return piece.tempo;
  }

  // Cumulative "unscaled" (tempoScale=1) time at each tempo breakpoint,
  // computed once per piece and cached -- cheap for the handful of
  // breakpoints a real piece has, but this runs inside the scheduler's hot
  // loop so avoiding recomputation on every tick still matters.
  function segmentTimes(piece) {
    if (tempoCache && tempoCache.has(piece)) return tempoCache.get(piece);
    var segs = normalizedTempo(piece);
    var times = [0];
    for (var i = 1; i < segs.length; i++) {
      var beats = segs[i].beat - segs[i - 1].beat;
      times.push(times[i - 1] + (beats * 60) / segs[i - 1].bpm);
    }
    var result = { segs: segs, times: times };
    if (tempoCache) tempoCache.set(piece, result);
    return result;
  }

  function unscaledTimeAtBeat(piece, beat) {
    var st = segmentTimes(piece);
    var i = 0;
    while (i + 1 < st.segs.length && st.segs[i + 1].beat <= beat) i++;
    return st.times[i] + (beat - st.segs[i].beat) * (60 / st.segs[i].bpm);
  }

  function beatAtUnscaledTime(piece, time) {
    var st = segmentTimes(piece);
    var i = 0;
    while (i + 1 < st.times.length && st.times[i + 1] <= time) i++;
    return st.segs[i].beat + (time - st.times[i]) * (st.segs[i].bpm / 60);
  }

  function intensityAt(piece, beat) {
    var kfs = piece.dynamics.keyframes;
    if (beat <= kfs[0].beat) return kfs[0].intensity;
    for (var i = 1; i < kfs.length; i++) {
      if (beat <= kfs[i].beat) {
        var a = kfs[i - 1], b = kfs[i];
        var span = b.beat - a.beat;
        var t = span > 0 ? (beat - a.beat) / span : 0;
        return a.intensity + (b.intensity - a.intensity) * t;
      }
    }
    return kfs[kfs.length - 1].intensity;
  }
  Music.intensityAt = intensityAt;

  // ---------------------------------------------------------------------
  // THE VOICE
  //
  // Every note used to be one bare oscillator with a single exponential fade,
  // which is why the engine read as beeps rather than instruments. A struck
  // string is three things at once, and this builds all three:
  //
  //   1. A PARTIAL STACK. Harmonics above the fundamental, each quieter than
  //      the last AND each dying faster than the last. The differential decay
  //      is the cue: an organ's partials decay together, a piano's don't.
  //   2. INHARMONICITY. Real piano strings are stiff, so partial n sits a
  //      little sharp of n x f0 -- f_n = n*f0*sqrt(1 + B*n^2). Tiny number,
  //      enormous perceptual difference: it is most of what says "piano"
  //      rather than "additive synth."
  //   3. A HAMMER TRANSIENT. A few milliseconds of filtered noise at onset.
  //      Without it a note fades in; with it, something strikes.
  //
  // Plus unison detuning (a piano has two or three strings per note, never
  // perfectly in tune, and the slow beating between them is the shimmer), a
  // velocity-dependent tone filter (hit harder, get brighter), and a real
  // damper release instead of an abrupt ramp to silence.
  //
  // Levels are held where they were: peak amplitude per note still works out
  // near the old 0.28 x velocity, and the shared bus (see getBus) ends in a
  // gentle compressor so stacked notes cannot clip the caller's destination.
  // ---------------------------------------------------------------------

  // amp: relative amplitude. decay: multiplier on the note's decay time --
  // below 1 means this partial dies before the fundamental does.
  var VOICES = {
    piano: {
      partials: [
        { mult: 1, amp: 1.00, decay: 1.00 },
        { mult: 2, amp: 0.38, decay: 0.60 },
        { mult: 3, amp: 0.20, decay: 0.44 },
        { mult: 4, amp: 0.11, decay: 0.32 },
        { mult: 5, amp: 0.06, decay: 0.24 }
      ],
      inharmonicity: 0.0004,
      detuneCents: 3.2,     // the second string of the unison pair
      attack: 0.004,
      decaySec: 2.6,        // at A3; scaled by pitch below
      knee: { level: 0.46, tau: 0.055, after: 0.2 }, // the fast first drop
      sustain: false,       // free decay: the note dies whether or not it is held
      release: 0.055,       // damper felt coming down
      hammer: 0.9,          // strength of the onset transient
      hammerHz: 2600,
      brightness: 5.5       // tone-filter cutoff, in multiples of the fundamental
    },
    bright: {
      partials: [
        { mult: 1, amp: 1.00, decay: 1.00 },
        { mult: 2, amp: 0.52, decay: 0.66 },
        { mult: 3, amp: 0.30, decay: 0.50 },
        { mult: 4, amp: 0.19, decay: 0.38 },
        { mult: 5, amp: 0.12, decay: 0.30 },
        { mult: 6, amp: 0.07, decay: 0.24 }
      ],
      inharmonicity: 0.0005,
      detuneCents: 2.4,
      attack: 0.003,
      decaySec: 2.0,
      knee: { level: 0.4, tau: 0.045, after: 0.17 },
      sustain: false,
      release: 0.05,
      hammer: 1.0,
      hammerHz: 3800,
      brightness: 8
    },
    strings: {
      partials: [
        { mult: 1, amp: 1.00, decay: 1 },
        { mult: 2, amp: 0.58, decay: 1 },
        { mult: 3, amp: 0.36, decay: 1 },
        { mult: 4, amp: 0.22, decay: 1 },
        { mult: 5, amp: 0.13, decay: 1 },
        { mult: 6, amp: 0.08, decay: 1 }
      ],
      inharmonicity: 0,
      detuneCents: 6,       // an ensemble is never in unison
      attack: 0.085,        // the bow takes hold
      decaySec: 30,
      sustain: true,        // holds for as long as the note is held
      release: 0.14,
      hammer: 0.12,
      hammerHz: 1400,
      brightness: 6
    },
    reed: {
      partials: [
        { mult: 1, amp: 1.00, decay: 1 },
        { mult: 3, amp: 0.46, decay: 1 },
        { mult: 5, amp: 0.23, decay: 1 },
        { mult: 7, amp: 0.12, decay: 1 }
      ],
      inharmonicity: 0,
      detuneCents: 1.5,
      attack: 0.014,
      decaySec: 30,
      sustain: true,
      release: 0.06,
      hammer: 0.25,
      hammerHz: 2200,
      brightness: 7
    }
  };
  Music.VOICES = VOICES;

  // Pieces written against the old API name an OscillatorNode type. Those keep
  // working and now pick the nearest instrument instead of a raw waveform.
  var TYPE_ALIASES = {
    sine: 'piano', triangle: 'bright', square: 'reed', sawtooth: 'strings'
  };
  function resolveVoice(name) {
    if (!name) return VOICES.piano;
    return VOICES[name] || VOICES[TYPE_ALIASES[name]] || VOICES.piano;
  }

  // One shared bus per destination node: compressor, then a synthesized
  // convolution reverb. Cached, because a piece schedules hundreds of notes and
  // every one of them routes through the same room. Never touches
  // ctx.destination -- it ends at the CALLER's node, so the existing
  // mute/volume plumbing still owns the final level.
  var busCache = typeof WeakMap === 'function' ? new WeakMap() : null;

  function buildImpulseResponse(ctx, seconds, decay) {
    var rate = ctx.sampleRate;
    var len = Math.max(1, Math.floor(rate * seconds));
    var buf = ctx.createBuffer(2, len, rate);
    for (var ch = 0; ch < 2; ch++) {
      var data = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) {
        var t = i / len;
        // Noise under an exponential tail, with a short fade-in so the reverb
        // blooms behind the note instead of doubling its attack.
        var bloom = Math.min(1, t * 90);
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * bloom;
      }
    }
    return buf;
  }

  var softClipShared = null;
  function softClipCurve() {
    if (softClipShared) return softClipShared;
    var n = 8192;
    var curve = new Float32Array(n);
    var knee = 0.66;
    for (var i = 0; i < n; i++) {
      var x = (i / (n - 1)) * 2 - 1;
      var a = Math.abs(x);
      // Dead linear below the knee, so normal playing is bit-for-bit
      // untouched; above it, a smooth approach to 1.0 instead of a hard wall.
      var y = a < knee ? a : knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee));
      curve[i] = x < 0 ? -y : y;
    }
    softClipShared = curve;
    return curve;
  }

  function buildNoiseBuffer(ctx) {
    var len = Math.floor(ctx.sampleRate * 0.12);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function getBus(ctx, destination, reverbAmount) {
    var cached = busCache && busCache.get(destination);
    if (cached) return cached;

    var input = ctx.createGain();
    input.gain.value = 1;

    // Safety against stacked notes clipping the caller's node. NOT a
    // compressor: a DynamicsCompressorNode carries several milliseconds of
    // lookahead latency and pulls down exactly the hammer transients this
    // voice exists to produce -- measurably, it pushed a note's peak from 5ms
    // out to 115ms. A waveshaper is sample-exact, passes anything under 0.66
    // through untouched, and only rounds off true peaks.
    var comp = ctx.createWaveShaper();
    comp.curve = softClipCurve();
    comp.oversample = '4x';

    var wet = reverbAmount == null ? 0.2 : reverbAmount;
    var dry = ctx.createGain();
    dry.gain.value = 1 - wet * 0.4;

    var send = ctx.createGain();
    send.gain.value = wet;

    // Roll the tail off before the reverb so it sits behind the notes rather
    // than hissing on top of them.
    var tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 3600;

    var verb = ctx.createConvolver();
    verb.buffer = buildImpulseResponse(ctx, 1.8, 2.6);

    input.connect(comp);
    comp.connect(dry);
    dry.connect(destination);
    comp.connect(send);
    send.connect(tone);
    tone.connect(verb);
    verb.connect(destination);

    var bus = { input: input, noise: buildNoiseBuffer(ctx) };
    if (busCache) busCache.set(destination, bus);
    return bus;
  }

  function playVoice(ctx, destination, type, freq, start, duration, velocity, reverbAmount, level) {
    var voice = resolveVoice(type);
    var bus = getBus(ctx, destination, reverbAmount);
    var vel = velocity == null ? 0.8 : velocity;
    var sources = [];

    // Held for `duration`, then the damper comes down.
    var attack = Math.min(voice.attack, duration * 0.5);
    var releaseAt = start + Math.max(attack + 0.005, duration);
    var release = voice.release;

    // Low strings ring far longer than high ones.
    var decaySec = voice.sustain
      ? voice.decaySec
      : Math.max(0.35, Math.min(6, voice.decaySec * Math.pow(220 / Math.max(40, freq), 0.45)));

    // Per-note gain, then a tone filter that opens with velocity: the same
    // note played harder is brighter, not just louder.
    var noteGain = ctx.createGain();
    noteGain.gain.value = 1;

    var tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.setValueAtTime(
      Math.max(700, Math.min(13000, freq * voice.brightness * (0.55 + 0.9 * vel))), start);
    tone.Q.setValueAtTime(0.6, start);

    noteGain.connect(tone);
    tone.connect(bus.input);

    // Normalize against the summed partial amplitudes so adding harmonics
    // makes the note richer, never louder.
    var unisons = [0, -voice.detuneCents];
    var total = 0;
    voice.partials.forEach(function (p) { total += p.amp * unisons.length; });
    // `level` is the piece's own trim (see PIECE FORMAT's gain field). It
    // scales amplitude only -- velocity still owns brightness, so trimming a
    // piece's level never changes how it is voiced.
    var peak = 0.34 * vel * (level == null ? 1 : level) / Math.max(0.001, total);

    voice.partials.forEach(function (p) {
      var stretch = Math.sqrt(1 + voice.inharmonicity * p.mult * p.mult);
      var partialHz = freq * p.mult * stretch;
      if (partialHz > ctx.sampleRate * 0.45) return; // never alias

      unisons.forEach(function (cents) {
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(partialHz, start);
        if (cents) osc.detune.setValueAtTime(cents, start);
        osc.connect(g);
        g.connect(noteGain);

        var target = Math.max(0.00002, peak * p.amp);
        g.gain.setValueAtTime(0.00002, start);
        g.gain.exponentialRampToValueAtTime(target, start + attack);
        // setTargetAtTime, not a ramp to a fixed time: each stage continues
        // from wherever the curve has got to, so a later stage (or the damper)
        // can interrupt at any moment with no discontinuity.
        var tail = Math.max(0.03, decaySec * p.decay);
        if (voice.knee) {
          // A struck string does not decay at one rate. It drops fast for the
          // first fraction of a second, then rings on far more slowly -- the
          // double decay is why a piano has a "ping" and a synth pad doesn't.
          var kneeAt = start + attack + voice.knee.after;
          g.gain.setTargetAtTime(target * voice.knee.level, start + attack, voice.knee.tau * p.decay);
          g.gain.setTargetAtTime(0, kneeAt, tail);
        } else {
          g.gain.setTargetAtTime(0, start + attack, tail);
        }
        g.gain.setTargetAtTime(0, releaseAt, release);

        osc.start(start);
        osc.stop(releaseAt + release * 8 + 0.03);
        sources.push(osc);
      });
    });

    // The strike itself.
    if (voice.hammer > 0) {
      var noise = ctx.createBufferSource();
      noise.buffer = bus.noise;
      var nf = ctx.createBiquadFilter();
      nf.type = 'bandpass';
      nf.frequency.setValueAtTime(voice.hammerHz * (0.7 + 0.6 * vel), start);
      nf.Q.setValueAtTime(0.8, start);
      var ng = ctx.createGain();
      var hammerPeak = Math.max(0.00002, 0.05 * vel * voice.hammer);
      ng.gain.setValueAtTime(0.00002, start);
      ng.gain.exponentialRampToValueAtTime(hammerPeak, start + 0.0015);
      ng.gain.setTargetAtTime(0, start + 0.0015, 0.012);
      noise.connect(nf);
      nf.connect(ng);
      ng.connect(noteGain);
      noise.start(start);
      noise.stop(start + 0.14);
      sources.push(noise);
    }

    return {
      sources: sources,
      osc: sources[0],   // kept for callers that only ever knew about one
      gain: noteGain,
      stopAt: releaseAt + release * 8 + 0.03
    };
  }

  Music.createSequencer = function (ctx, destination, piece, opts) {
    opts = opts || {};
    var tickMs = opts.tickMs || 25;
    var lookaheadSec = opts.lookaheadSec != null ? opts.lookaheadSec : 0.15;
    var crescendoLeadBeats = opts.crescendoLeadBeats != null ? opts.crescendoLeadBeats : 4;
    // ...or the same warning stated in SECONDS, which is what a warning
    // actually is: how long the player has to see the thing coming. Beats make
    // it depend on tempo -- four beats is two seconds in one piece and under
    // one in another, and it changes again the moment the tempo control moves,
    // so the same crescendo gives different warning in different performances
    // of it. When this is set it wins, and the beats figure is ignored.
    // Opt-in: unset, the beat-counted path below is untouched.
    var crescendoLeadSec = opts.crescendoLeadSec != null ? opts.crescendoLeadSec : null;
    var autoTick = opts.autoTick !== false;
    var voiceTypes = opts.voiceTypes || {};
    var voices = opts.voices || {};
    var reverb = opts.reverb != null ? opts.reverb : 0.2;
    // Pieces were authored at whatever velocities suited them, which left a
    // ~20 dB spread across the set -- Satie nearly inaudible next to Wagner.
    // `gain` is each piece's trim back to a common loudness.
    var pieceGain = opts.gain != null ? opts.gain : (piece.gain != null ? piece.gain : 1);

    var listeners = {};
    var scheduledNodes = [];
    var intervalId = null;
    var endedFired = false;
    // Which crescendos have already had their warning go out, for the
    // seconds-lead path (see crescendoLeadSec). Cleared on stop and on a
    // restart from the top.
    var announcedCrescendos = {};

    var seq = {
      isPlaying: false,
      pausedBeat: 0,
      anchorTime: 0,
      anchorBeat: 0,
      tempoScale: 1,
      lastScheduledBeat: 0,
    };

    function timeToBeat(t) {
      var unscaledAnchor = unscaledTimeAtBeat(piece, seq.anchorBeat);
      var deltaUnscaled = (t - seq.anchorTime) * seq.tempoScale;
      return beatAtUnscaledTime(piece, unscaledAnchor + deltaUnscaled);
    }

    function beatToTime(beat) {
      var unscaledAnchor = unscaledTimeAtBeat(piece, seq.anchorBeat);
      var unscaledTarget = unscaledTimeAtBeat(piece, beat);
      return seq.anchorTime + (unscaledTarget - unscaledAnchor) / seq.tempoScale;
    }

    function emit(event, payload) {
      var cbs = listeners[event];
      if (!cbs) return;
      for (var i = 0; i < cbs.length; i++) cbs[i](payload);
    }

    seq.on = function (event, cb) {
      (listeners[event] = listeners[event] || []).push(cb);
      return seq;
    };
    seq.off = function (event, cb) {
      if (!listeners[event]) return seq;
      listeners[event] = listeners[event].filter(function (c) { return c !== cb; });
      return seq;
    };

    seq.currentBeat = function () {
      if (!seq.isPlaying) return Math.min(seq.pausedBeat, piece.lengthBeats);
      return Math.min(Math.max(timeToBeat(ctx.currentTime), 0), piece.lengthBeats);
    };

    seq.getIntensity = function () {
      return intensityAt(piece, seq.currentBeat());
    };

    seq.getTempoScale = function () { return seq.tempoScale; };

    seq.beatToTime = beatToTime;

    seq.setTempoScale = function (scale) {
      if (seq.isPlaying) seq.anchorBeat = seq.currentBeat();
      seq.anchorTime = ctx.currentTime;
      seq.tempoScale = scale;
      return seq;
    };

    function clearScheduledNodes(fade) {
      scheduledNodes.forEach(function (n) {
        var sources = n.sources || (n.osc ? [n.osc] : []);
        try {
          if (fade) {
            var now = ctx.currentTime;
            // Fade the note's own gain rather than cutting the oscillators, so
            // stopping mid-chord never clicks.
            n.gain.gain.cancelScheduledValues(now);
            n.gain.gain.setValueAtTime(n.gain.gain.value, now);
            n.gain.gain.linearRampToValueAtTime(0.0001, now + 0.04);
            sources.forEach(function (src) { try { src.stop(now + 0.05); } catch (e) { /* already done */ } });
          } else {
            sources.forEach(function (src) { try { src.stop(); } catch (e) { /* already done */ } });
          }
        } catch (e) { /* node may already be stopped/finished */ }
      });
      scheduledNodes = [];
    }

    seq.play = function () {
      if (seq.isPlaying) return seq;
      seq.isPlaying = true;
      endedFired = false;
      // A fresh pass over the piece announces its crescendos again.
      if (seq.pausedBeat === 0) announcedCrescendos = {};
      seq.anchorBeat = Math.min(seq.pausedBeat, piece.lengthBeats);
      seq.anchorTime = ctx.currentTime;
      seq.lastScheduledBeat = seq.anchorBeat;
      if (autoTick && typeof setInterval === 'function') {
        intervalId = setInterval(function () { seq._tick(); }, tickMs);
      }
      return seq;
    };

    seq.pause = function () {
      if (!seq.isPlaying) return seq;
      seq.pausedBeat = seq.currentBeat();
      seq.isPlaying = false;
      if (intervalId != null) { clearInterval(intervalId); intervalId = null; }
      return seq;
    };

    seq.stop = function () {
      seq.isPlaying = false;
      seq.pausedBeat = 0;
      seq.lastScheduledBeat = 0;
      announcedCrescendos = {};
      if (intervalId != null) { clearInterval(intervalId); intervalId = null; }
      clearScheduledNodes(true);
      return seq;
    };

    function scheduleNote(trackName, note) {
      var startT = beatToTime(note.beat);
      var endT = beatToTime(note.beat + note.duration);
      var duration = Math.max(0.02, endT - startT);
      // `voice` is the current name for this; `type` is the original
      // OscillatorNode-typed field, still honoured and mapped to an instrument.
      var voice = note.voice || voices[trackName] || note.type || voiceTypes[trackName] || 'piano';
      var node = playVoice(ctx, destination, voice, note.freq, startT, duration, note.velocity, reverb, pieceGain);
      scheduledNodes.push(node);
    }

    seq._tick = function () {
      if (!seq.isPlaying) return;
      var nowT = ctx.currentTime;
      var scheduleUntilBeat = Math.min(timeToBeat(nowT + lookaheadSec), piece.lengthBeats);
      var from = seq.lastScheduledBeat;

      if (scheduleUntilBeat > from) {
        var tracks = piece.tracks || {};
        Object.keys(tracks).forEach(function (name) {
          tracks[name].forEach(function (note) {
            if (note.beat >= from && note.beat < scheduleUntilBeat) scheduleNote(name, note);
          });
        });

        var crescendos = (piece.dynamics && piece.dynamics.crescendos) || [];
        crescendos.forEach(function (c, ci) {
          if (crescendoLeadSec != null) {
            // A seconds-lead can reach back past the crescendo's own start, and
            // past the start of the PIECE -- which is the point: the note wants
            // to be on screen while the music is still quiet. That also means
            // the announcement beat can fall outside the scheduling window
            // entirely (before it at the first tick, or skipped over by a tempo
            // the player just pushed up), so this path cannot lean on the
            // windows tiling the way the beat-counted one below does. Each
            // crescendo is announced once, tracked, and never dropped.
            var approachT = beatToTime(c.peakBeat) - crescendoLeadSec;
            if (!announcedCrescendos[ci] && c.peakBeat >= from
                && nowT + lookaheadSec >= approachT) {
              announcedCrescendos[ci] = true;
              emit('crescendo-approaching', c);
            }
          } else {
            var approachBeat = Math.max(c.startBeat != null ? c.startBeat : 0, c.peakBeat - crescendoLeadBeats);
            if (approachBeat >= from && approachBeat < scheduleUntilBeat) emit('crescendo-approaching', c);
          }
          if (c.peakBeat >= from && c.peakBeat < scheduleUntilBeat) emit('crescendo-peak', c);
        });
      }

      // Prune finished nodes so this array doesn't grow unbounded over a
      // long/looped piece.
      var pruneBefore = nowT - 1;
      scheduledNodes = scheduledNodes.filter(function (n) { return n.stopAt >= pruneBefore; });

      if (!endedFired && piece.lengthBeats >= from && piece.lengthBeats <= scheduleUntilBeat) {
        endedFired = true;
        seq.isPlaying = false;
        seq.pausedBeat = piece.lengthBeats;
        if (intervalId != null) { clearInterval(intervalId); intervalId = null; }
        emit('piece-ended', piece);
        return;
      }

      seq.lastScheduledBeat = scheduleUntilBeat;
    };

    return seq;
  };
})();
