// src/sandbox/audioPiece.js
// Plays a RECORDED piece (see recordedFurElise.js) behind exactly the surface
// TugSandbox already consumes from Music.createSequencer -- play, stop, on,
// setTempoScale, getIntensity, beatToTime -- so the fight loop does not care
// which kind of piece it is fighting.
//
// Sandbox-only on purpose. js/wordbound/music.js stays synthesized-only, so
// the main app is untouched by the recording exception.
//
// "Beat" here is simply SECONDS of the recording. The sequencer's beat/time
// split exists because sequenced pieces have a tempo map; a recording does
// not, so the two units collapse and beatToTime becomes plain arithmetic on
// the playback rate.
(function () {
  window.Wordbound = window.Wordbound || {};
  var Sandbox = (window.Wordbound.Sandbox = window.Wordbound.Sandbox || {});

  // What a recording should SOUND like next to the synthesized pieces, which
  // sit near 0.28. Expressed as a target RMS rather than a fixed trim because
  // recordings arrive at wildly different levels: the Fur Elise track is
  // normalised to full scale, the Moonlight one peaks at about a tenth of
  // that, and a single trim would leave one of them nearly inaudible.
  var TARGET_RMS = 0.055;
  // Fallback for a piece whose analysis predates `loudness`.
  var LEVEL = 0.32;
  // Ceiling on the resulting gain, so a near-silent file cannot be amplified
  // into a wall of noise floor.
  var MAX_GAIN = 12;

  // Level-match on loudness, then pull back if that would clip the peak.
  function trimFor(piece) {
    if (!piece.loudness) return LEVEL;
    var g = Math.min(MAX_GAIN, TARGET_RMS / piece.loudness);
    if (piece.peak) g = Math.min(g, 0.98 / piece.peak);
    return +g.toFixed(4);
  }
  // How far ahead of a surge to announce it. This IS the attack's flight time:
  // the tug lands the burst exactly on the peak, so the warning has to go out
  // this long before it. Kept deliberately long. At 1.8 s the note appeared at
  // the same moment the swell became audible, which read as the crescendo
  // spitting out an attack rather than an attack bearing down on a crescendo.
  // Four seconds puts the note on screen while the music is still quiet, so
  // the approach and the swell build together and arrive on the same beat.
  var LEAD_SEC = 4.0;

  // How far BEHIND the playhead a swell may be and still be worth swinging on.
  // Inside this the peak is essentially now, and the fight lands the burst on
  // it at once -- the closest it can still get to the music. Past it the piece
  // has moved on, so the surge is marked spent and never announced: a tab that
  // sat in the background for a minute must not come back and dump every swell
  // it slept through onto the barline in one frame.
  var CATCHUP_SEC = 0.5;

  var bufferCache = {};  // url -> Promise<AudioBuffer>, decoded once
  var bytesCache = {};   // url -> Promise<ArrayBuffer>, fetched once

  // Fetching several MB and decoding it takes long enough that a fight started
  // the instant the page loads would open in SILENCE. Warm the bytes as soon
  // as the sandbox mounts so only the (fast) decode is left by the time
  // anybody presses start. Safe to call repeatedly.
  Sandbox.prefetchAudio = function (url) {
    if (!bytesCache[url]) {
      bytesCache[url] = fetch(url).then(function (r) {
        if (!r.ok) throw new Error('audio fetch failed: ' + r.status + ' ' + url);
        return r.arrayBuffer();
      }).catch(function (err) {
        // A cached REJECTION would poison every later fight with this piece --
        // the recording would never load again and only a refresh would clear
        // it. Drop the entry so the next attempt actually retries.
        delete bytesCache[url];
        throw err;
      });
    }
    return bytesCache[url];
  };

  function loadBuffer(ctx, url) {
    if (bufferCache[url]) return bufferCache[url];
    // decodeAudioData detaches the ArrayBuffer it is given, so hand it a copy
    // and keep the original for any later re-decode (a new AudioContext).
    bufferCache[url] = Sandbox.prefetchAudio(url)
      .then(function (bytes) { return bytes.slice(0); })
      .then(function (ab) {
        return new Promise(function (resolve, reject) {
          // Callback form: Safari still does not return a promise here.
          var p = ctx.decodeAudioData(ab, resolve, reject);
          if (p && p.then) p.then(resolve, reject);
        });
      })
      .catch(function (err) {
        delete bufferCache[url];   // same reason as the fetch cache above
        throw err;
      });
    return bufferCache[url];
  }

  Sandbox.createAudioPiece = function (ctx, destination, piece, opts) {
    opts = opts || {};
    var listeners = {};
    var rate = 1;
    var buffer = null;
    var source = null;
    var trim = ctx.createGain();
    trim.gain.value = opts.level != null ? opts.level : trimFor(piece);
    trim.connect(destination);

    var playing = false;
    var wantPlay = false;
    var anchorCtx = 0;   // ctx.currentTime when the current run started
    var anchorPos = 0;   // position within the recording at that moment
    var firedSurges = {};
    var endedFired = false;
    var tickId = null;

    var keyframes = (piece.dynamics && piece.dynamics.keyframes) || [];
    var surges = (piece.dynamics && piece.dynamics.surges) || [];
    var duration = piece.durationSec || 0;

    function emit(name, payload) {
      (listeners[name] || []).forEach(function (cb) { cb(payload); });
    }

    function position() {
      if (!playing) return anchorPos;
      return anchorPos + (ctx.currentTime - anchorCtx) * rate;
    }

    function intensityAt(sec) {
      if (!keyframes.length) return 0;
      if (sec <= keyframes[0].sec) return keyframes[0].intensity;
      for (var i = 1; i < keyframes.length; i++) {
        if (sec <= keyframes[i].sec) {
          var a = keyframes[i - 1], b = keyframes[i];
          var span = b.sec - a.sec;
          var t = span > 0 ? (sec - a.sec) / span : 0;
          return a.intensity + (b.intensity - a.intensity) * t;
        }
      }
      return keyframes[keyframes.length - 1].intensity;
    }

    var api = {
      isPlaying: false,

      play: function () {
        wantPlay = true;
        if (!buffer) return; // starts as soon as the decode lands
        if (playing) return;
        source = ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = rate;
        source.connect(trim);
        anchorCtx = ctx.currentTime;
        source.start(0, Math.max(0, Math.min(anchorPos, buffer.duration - 0.01)));
        playing = true;
        api.isPlaying = true;
        endedFired = false;
      },

      stop: function () {
        wantPlay = false;
        if (source) {
          try { source.stop(); } catch (e) { /* already stopped */ }
          source.disconnect();
          source = null;
        }
        anchorPos = 0;
        playing = false;
        api.isPlaying = false;
        firedSurges = {};
      },

      // Same contract as the sequencer's: scale playback speed live.
      setTempoScale: function (scale) {
        var pos = position();
        rate = scale || 1;
        anchorPos = pos;
        anchorCtx = ctx.currentTime;
        if (source) source.playbackRate.value = rate;
      },
      getTempoScale: function () { return rate; },

      getIntensity: function () { return intensityAt(position()); },
      currentBeat: function () { return position(); },

      // Beat IS seconds for a recording, so this is the playback-rate map
      // from a position in the piece to a moment on the AudioContext clock.
      beatToTime: function (beat) {
        return anchorCtx + (beat - anchorPos) / (rate || 1);
      },

      on: function (name, cb) {
        (listeners[name] = listeners[name] || []).push(cb);
        return api;
      },

      // Exposed for the same "internal but testable" reason music.js exposes
      // _tick: a test can drive it without waiting on real timers.
      _tick: function () {
        if (!playing) return;
        var pos = position();
        surges.forEach(function (s, i) {
          if (firedSurges[i]) return;
          // NEVER DROP A SWELL. The old window was `pos >= s.sec - LEAD_SEC &&
          // pos < s.sec`, which silently lost every surge the playhead stepped
          // clean over -- and it steps over them routinely: this interval is
          // throttled to a second in a background tab, the tempo control speeds
          // the position up under it, and a dense passage can put several peaks
          // inside one tick. Each one lost was a crescendo that played with no
          // attack on it. A peak that is already behind us is announced anyway
          // (the fight lands it immediately) as long as it is still fresh.
          if (pos < s.sec - LEAD_SEC) return;
          firedSurges[i] = true;
          if (pos > s.sec + CATCHUP_SEC) return;   // long gone: spent, unswung
          emit('crescendo-approaching', {
            id: 'surge-' + i,
            peakBeat: s.sec,
            peakIntensity: s.intensity,
            rise: s.rise,
            // How big this swell is against the others in this recording,
            // 0..1. The fight sizes the hit off it and gates the small ones
            // out early, so leaving it behind here silently downgrades both
            // to a guess from peak level.
            mag: s.mag
          });
        });
        if (duration && pos >= duration && !endedFired) {
          endedFired = true;
          emit('piece-ended', piece);
        }
      },

      whenReady: null
    };

    api.whenReady = loadBuffer(ctx, piece.audio).then(function (buf) {
      buffer = buf;
      if (!duration) duration = buf.duration;
      if (wantPlay && !playing) api.play();
      return api;
    }, function (err) {
      // Told, not thrown. An unhandled rejection here left the fight running
      // in silence with nothing on screen to say why; as an event the sandbox
      // can print it, and the caches above have already cleared themselves so
      // the next fight tries again.
      emit('load-failed', err);
      return api;
    });

    if (opts.autoTick !== false && typeof setInterval === 'function') {
      tickId = setInterval(api._tick, 25);
      api.dispose = function () { clearInterval(tickId); api.stop(); };
    } else {
      api.dispose = function () { api.stop(); };
    }

    return api;
  };
})();
