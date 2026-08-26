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

  // The recording is normalised to peak 1.0; the synthesized pieces sit near
  // 0.28. Without this trim the recording would be roughly 10 dB louder than
  // everything else in the set.
  var LEVEL = 0.32;
  // How far ahead of a surge to announce it. The tug needs the warning early
  // enough to slide a note in from the edge before the hit lands.
  var LEAD_SEC = 1.8;

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
    trim.gain.value = opts.level != null ? opts.level : LEVEL;
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
          if (pos >= s.sec - LEAD_SEC && pos < s.sec) {
            firedSurges[i] = true;
            emit('crescendo-approaching', {
              id: 'surge-' + i,
              peakBeat: s.sec,
              peakIntensity: s.intensity,
              rise: s.rise
            });
          }
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
