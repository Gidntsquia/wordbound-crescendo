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
//     tracks: { <name>: [{ beat, duration, freq, velocity, type }, ...] },
//         beat/duration are in BEATS (tempo-relative, not seconds); freq is
//         Hz; velocity is 0..1 (defaults to 0.8); type is an OscillatorNode
//         type (defaults to the track's own default, see createSequencer's
//         voiceTypes option, itself defaulting to 'sine').
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
//               autoTick=true, voiceTypes={} } -- voiceTypes maps a track
//       name to a default OscillatorNode type override.
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

  function playVoice(ctx, destination, type, freq, start, duration, velocity) {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.connect(gain);
    gain.connect(destination);
    osc.frequency.setValueAtTime(freq, start);
    var peak = Math.max(0.0001, 0.28 * (velocity == null ? 0.8 : velocity));
    var attack = Math.min(0.02, duration * 0.2);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.start(start);
    osc.stop(start + duration + 0.02);
    return { osc: osc, gain: gain, stopAt: start + duration };
  }

  Music.createSequencer = function (ctx, destination, piece, opts) {
    opts = opts || {};
    var tickMs = opts.tickMs || 25;
    var lookaheadSec = opts.lookaheadSec != null ? opts.lookaheadSec : 0.15;
    var crescendoLeadBeats = opts.crescendoLeadBeats != null ? opts.crescendoLeadBeats : 4;
    var autoTick = opts.autoTick !== false;
    var voiceTypes = opts.voiceTypes || {};

    var listeners = {};
    var scheduledNodes = [];
    var intervalId = null;
    var endedFired = false;

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
        try {
          if (fade) {
            var now = ctx.currentTime;
            n.gain.gain.cancelScheduledValues(now);
            n.gain.gain.setValueAtTime(n.gain.gain.value, now);
            n.gain.gain.linearRampToValueAtTime(0.0001, now + 0.03);
            n.osc.stop(now + 0.03);
          } else {
            n.osc.stop();
          }
        } catch (e) { /* node may already be stopped/finished */ }
      });
      scheduledNodes = [];
    }

    seq.play = function () {
      if (seq.isPlaying) return seq;
      seq.isPlaying = true;
      endedFired = false;
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
      if (intervalId != null) { clearInterval(intervalId); intervalId = null; }
      clearScheduledNodes(true);
      return seq;
    };

    function scheduleNote(trackName, note) {
      var startT = beatToTime(note.beat);
      var endT = beatToTime(note.beat + note.duration);
      var duration = Math.max(0.02, endT - startT);
      var type = note.type || voiceTypes[trackName] || 'sine';
      var node = playVoice(ctx, destination, type, note.freq, startT, duration, note.velocity);
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
        crescendos.forEach(function (c) {
          var approachBeat = Math.max(c.startBeat != null ? c.startBeat : 0, c.peakBeat - crescendoLeadBeats);
          if (approachBeat >= from && approachBeat < scheduleUntilBeat) emit('crescendo-approaching', c);
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
