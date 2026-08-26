// src/sandbox/sequencedSurges.js
// GIVE A SEQUENCED PIECE THE SAME SWELL LIST A RECORDING GETS.
//
// tools/analyze-audio-piece.js listens to an mp3 offline and writes out every
// swell it can find -- a hundred-odd of them per recording, each with a `mag`
// saying how big it is against the others in that same performance. The tug
// fight is built on that list: a burst is a crescendo the piece actually plays,
// and its power is that crescendo's size.
//
// A SEQUENCED piece had nothing of the kind. All it carries is
// `dynamics.crescendos` -- a handful of hand-written markers, two or three per
// piece, and two of the eight sandbox pieces have none at all. Fought against
// the same model that is fed a hundred surges, that is not a quiet opponent, it
// is an absent one: Gymnopedie's first and only marked crescendo is at 32.7 s,
// Air on the G String's list is empty, so the pit simply never swung.
//
// So derive the list, from the one thing a sequenced piece has that a recording
// does not: its own notes. Note onsets are bucketed into short windows, each
// window weighted by how much is being struck in it and by the hand-written
// intensity curve over it, and the local maxima of that are the piece's swells.
// It is the same analysis tools/analyze-audio-piece.js runs on samples, run
// instead on the score -- which is the more honest source, because it IS what
// the sequencer is about to play.
//
// Sandbox-only, like everything else in this directory. js/wordbound/music.js
// is untouched: createSequencedPiece below wraps a stock sequencer and
// announces the derived list through the same 'crescendo-approaching' event the
// fight already listens for, so tugOfWar.js cannot tell the two kinds of
// opponent apart.
//
// PUBLIC API (window.Wordbound.Sandbox):
//   derivePieceSurges(piece) -> [{ beat, sec, mag, rank, peakIntensity }],
//       ascending by beat, memoized per piece object.
//   createSequencedPiece(ctx, destination, piece, opts) -> the same surface
//       Music.createSequencer returns, with the derived swells announced
//       TELEGRAPH_LEAD_SEC ahead of their peak.
(function () {
  window.Wordbound = window.Wordbound || {};
  var Sandbox = (window.Wordbound.Sandbox = window.Wordbound.Sandbox || {});

  // Seconds per energy bucket. Short enough to separate two swells a bar apart
  // at a moderate tempo, long enough that a single rolled chord is one event
  // rather than four.
  var WINDOW_SEC = 0.5;

  // The band every piece in the sandbox is normalised into -- the same one
  // tugOfWar.js reads a sequenced crescendo's peakIntensity against.
  var INT_FLOOR = 0.12;
  var INT_CEIL = 0.70;

  // How much of a swell's SIZE is its rank among this piece's own swells, and
  // how much is the absolute loudness the composer wrote there.
  //
  // Rank alone would hand every piece a mag-1.0 swell, however quiet it is --
  // Gymnopedie ("barely moves, barely attacks") would land the same slam as the
  // Mountain King's final bars, because both have a biggest moment. Absolute
  // alone would flatten a piece that lives entirely in its lower half into one
  // long undifferentiated murmur. Half of each keeps both true: within a piece
  // the big moments read as big, and across pieces a quiet one stays quiet.
  var RANK_SHARE = 0.5;

  // A note with no velocity of its own still strikes something.
  var DEFAULT_VELOCITY = 0.6;

  // The longest a piece may go between swells before the analysis is judged to
  // have under-read it. A Bach invention is a uniform stream of sixteenths: its
  // energy curve is nearly flat, so a local-maxima pass finds four swells in
  // twenty-two seconds and the pit spends most of the piece with nothing to
  // say. Where that happens the loudest windows it has NOT already picked are
  // taken as swells too -- still the loudest moments of the actual score,
  // just chosen by level rather than by shape.
  var MAX_GAP_SEC = 3;

  var cache = typeof WeakMap === 'function' ? new WeakMap() : null;

  function tempoSegments(piece) {
    if (typeof piece.tempo === 'number') return [{ beat: 0, bpm: piece.tempo }];
    return piece.tempo || [{ beat: 0, bpm: 120 }];
  }

  // Beat -> unscaled seconds, integrating the piece's tempo breakpoints. Same
  // arithmetic music.js does; repeated here rather than reached for because
  // music.js only exposes it on a live sequencer instance and this runs before
  // one exists.
  function secAtBeat(piece, beat) {
    var segs = tempoSegments(piece);
    var t = 0;
    for (var i = 0; i < segs.length; i++) {
      var start = segs[i].beat;
      var end = i + 1 < segs.length ? segs[i + 1].beat : Infinity;
      if (beat <= start) break;
      t += (Math.min(beat, end) - start) * 60 / segs[i].bpm;
      if (beat <= end) break;
    }
    return t;
  }

  function beatAtSec(piece, sec) {
    var segs = tempoSegments(piece);
    var t = 0;
    for (var i = 0; i < segs.length; i++) {
      var start = segs[i].beat;
      var end = i + 1 < segs.length ? segs[i + 1].beat : Infinity;
      var span = (end - start) * 60 / segs[i].bpm;
      if (sec <= t + span || end === Infinity) return start + (sec - t) * segs[i].bpm / 60;
      t += span;
    }
    return piece.lengthBeats || 0;
  }

  function intensityAtBeat(piece, beat) {
    var kfs = (piece.dynamics && piece.dynamics.keyframes) || [];
    if (!kfs.length) return 0.3;
    if (beat <= kfs[0].beat) return kfs[0].intensity;
    for (var i = 1; i < kfs.length; i++) {
      if (beat <= kfs[i].beat) {
        var a = kfs[i - 1], b = kfs[i];
        var span = b.beat - a.beat;
        return a.intensity + (b.intensity - a.intensity) * (span > 0 ? (beat - a.beat) / span : 0);
      }
    }
    return kfs[kfs.length - 1].intensity;
  }

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  Sandbox.derivePieceSurges = function (piece) {
    if (!piece) return [];
    if (cache && cache.has(piece)) return cache.get(piece);
    var out = analyse(piece);
    if (cache) cache.set(piece, out);
    return out;
  };

  function analyse(piece) {
    var totalSec = secAtBeat(piece, piece.lengthBeats || 0);
    if (!(totalSec > 0)) return [];
    var n = Math.max(4, Math.ceil(totalSec / WINDOW_SEC));
    var energy = [];
    for (var z = 0; z < n; z++) energy.push(0);

    var tracks = piece.tracks || {};
    Object.keys(tracks).forEach(function (name) {
      var notes = tracks[name] || [];
      for (var i = 0; i < notes.length; i++) {
        var at = secAtBeat(piece, notes[i].beat);
        var slot = Math.min(n - 1, Math.max(0, Math.floor(at / WINDOW_SEC)));
        energy[slot] += notes[i].velocity != null ? notes[i].velocity : DEFAULT_VELOCITY;
      }
    });

    // Weight each window by what the composer marked over it, so a dense
    // passage written pianissimo does not read as a swell.
    for (var w = 0; w < n; w++) {
      var mid = (w + 0.5) * WINDOW_SEC;
      energy[w] *= 0.4 + 1.6 * intensityAtBeat(piece, beatAtSec(piece, mid));
    }

    // A three-tap smooth, so one busy bar inside a still passage is a bump
    // rather than a spike and two adjacent busy bars are ONE swell.
    var smooth = [];
    for (var s = 0; s < n; s++) {
      smooth.push((energy[s - 1] || 0) * 0.25 + energy[s] * 0.5 + (energy[s + 1] || 0) * 0.25);
    }

    var peaks = [];
    for (var k = 1; k < n - 1; k++) {
      if (smooth[k] >= smooth[k - 1] && smooth[k] > smooth[k + 1] && smooth[k] > 0) peaks.push(k);
    }
    if (!peaks.length) return [];

    // Backfill an under-read piece (see MAX_GAP_SEC): take the loudest windows
    // that are not already next to a chosen one until the gaps close up.
    var want = Math.floor(totalSec / MAX_GAP_SEC);
    if (peaks.length < want) {
      var taken = {};
      peaks.forEach(function (k) { taken[k] = true; });
      var byLoudness = [];
      for (var c = 1; c < n - 1; c++) if (!taken[c] && smooth[c] > 0) byLoudness.push(c);
      byLoudness.sort(function (a, b) { return smooth[b] - smooth[a]; });
      for (var f = 0; f < byLoudness.length && peaks.length < want; f++) {
        var cand = byLoudness[f];
        var clear = true;
        for (var g = 0; g < peaks.length; g++) {
          if (Math.abs(peaks[g] - cand) < 2) { clear = false; break; }
        }
        if (clear) peaks.push(cand);
      }
      peaks.sort(function (a, b) { return a - b; });
    }

    var ordered = peaks.map(function (k) { return smooth[k]; }).sort(function (a, b) { return a - b; });
    var surges = peaks.map(function (k) {
      var sec = (k + 0.5) * WINDOW_SEC;
      var beat = beatAtSec(piece, sec);
      var inten = intensityAtBeat(piece, beat);
      var absolute = clamp01((inten - INT_FLOOR) / (INT_CEIL - INT_FLOOR));
      var below = 0;
      for (var q = 0; q < ordered.length; q++) if (ordered[q] < smooth[k]) below++;
      var rank = ordered.length > 1 ? below / (ordered.length - 1) : 0.5;
      return {
        beat: beat,
        sec: sec,
        // Where this swell sits among this piece's own swells. The fight gates
        // on THIS, so a quiet piece is not gated into silence for being quiet.
        rank: rank,
        // ...and how hard it should actually hit, which is a different
        // question -- see RANK_SHARE.
        mag: clamp01(RANK_SHARE * rank + (1 - RANK_SHARE) * absolute),
        peakIntensity: inten
      };
    });

    // THE COMPOSER'S OWN MARKERS OUTRANK THE ANALYSIS. A hand-written crescendo
    // in dynamics.crescendos is the piece saying outright "this is the moment";
    // the derived list should fill in around those, never overrule them. Each
    // marked peak is pulled up to full rank, and the nearest derived swell
    // within half a window is absorbed rather than left to double-hit it.
    var marked = (piece.dynamics && piece.dynamics.crescendos) || [];
    marked.forEach(function (c) {
      if (c.peakBeat == null) return;
      var sec = secAtBeat(piece, c.peakBeat);
      var inten = c.peakIntensity != null ? c.peakIntensity : intensityAtBeat(piece, c.peakBeat);
      var absolute = clamp01((inten - INT_FLOOR) / (INT_CEIL - INT_FLOOR));
      var entry = {
        beat: c.peakBeat,
        sec: sec,
        rank: 1,
        mag: clamp01(RANK_SHARE + (1 - RANK_SHARE) * absolute),
        peakIntensity: inten
      };
      var near = -1;
      for (var i = 0; i < surges.length; i++) {
        if (Math.abs(surges[i].sec - sec) <= WINDOW_SEC) { near = i; break; }
      }
      if (near >= 0) surges[near] = entry;
      else surges.push(entry);
    });

    surges.sort(function (a, b) { return a.beat - b.beat; });
    return surges;
  }

  // A stock sequencer, plus the derived swell list announced on the same event
  // the fight already listens for. The sequencer's OWN 'crescendo-approaching'
  // is deliberately not forwarded: every marked crescendo is already in the
  // derived list (see above), so forwarding both would swing twice at one
  // moment of music.
  Sandbox.createSequencedPiece = function (ctx, destination, piece, opts) {
    opts = opts || {};
    var lead = opts.leadSec != null ? opts.leadSec : (Sandbox.TELEGRAPH_LEAD_SEC || 4);
    var seq = window.Wordbound.Music.createSequencer(ctx, destination, piece, {
      voices: piece.voices || {}
    });

    var surges = Sandbox.derivePieceSurges(piece);
    var listeners = {};
    var fired = {};
    var tickId = null;

    // How far behind the playhead a swell may be and still be worth swinging
    // on. Same reasoning, and same value, as audioPiece.js's CATCHUP_SEC: a tab
    // that sat in the background must not come back and dump a minute of
    // missed swells onto the barline in one frame.
    var CATCHUP_SEC = 0.5;

    function emit(name, payload) {
      (listeners[name] || []).forEach(function (cb) { cb(payload); });
    }

    // A fresh pass over the piece announces its swells again -- the sequencer
    // reports 'piece-ended' and the sandbox restarts it, and the same beat then
    // means a moment in the NEW performance.
    seq.on('piece-ended', function (p) {
      fired = {};
      emit('piece-ended', p);
    });

    function tick() {
      if (!seq.isPlaying) return;
      var beat = seq.currentBeat();
      for (var i = 0; i < surges.length; i++) {
        if (fired[i]) continue;
        var s = surges[i];
        var peakTime = seq.beatToTime(s.beat);
        if (ctx.currentTime < peakTime - lead) continue;
        fired[i] = true;
        if (ctx.currentTime > peakTime + CATCHUP_SEC) continue;
        emit('crescendo-approaching', {
          id: 'seq-surge-' + i,
          peakBeat: s.beat,
          peakIntensity: s.peakIntensity,
          mag: s.mag,
          rank: s.rank
        });
      }
      return beat;
    }

    var api = {
      get isPlaying() { return seq.isPlaying; },
      play: function () { fired = {}; return seq.play(); },
      stop: function () { fired = {}; return seq.stop(); },
      setTempoScale: function (v) { return seq.setTempoScale(v); },
      getTempoScale: function () { return seq.getTempoScale(); },
      getIntensity: function () { return seq.getIntensity(); },
      currentBeat: function () { return seq.currentBeat(); },
      beatToTime: function (b) { return seq.beatToTime(b); },
      on: function (name, cb) {
        // 'crescendo-approaching' and 'piece-ended' are served from here;
        // anything else the fight or a test wants is the sequencer's own.
        if (name === 'crescendo-approaching' || name === 'piece-ended') {
          (listeners[name] = listeners[name] || []).push(cb);
        } else {
          seq.on(name, cb);
        }
        return api;
      },
      // Exposed for the same "internal but testable" reason music.js exposes
      // _tick and audioPiece.js exposes its own.
      _tick: tick,
      surges: surges
    };

    if (opts.autoTick !== false && typeof setInterval === 'function') {
      tickId = setInterval(tick, 25);
      api.dispose = function () {
        clearInterval(tickId);
        seq.stop();
        if (seq.dispose) seq.dispose();
      };
    } else {
      api.dispose = function () {
        seq.stop();
        if (seq.dispose) seq.dispose();
      };
    }

    return api;
  };
})();
