// TS port of src/sandbox/audioPiece.js (READ_SLOWLY_PLAN.md A2/A5 step 3):
// plays a RECORDED piece behind the same surface Music.createSequencer
// exposes (play, stop, on, setTempoScale, getIntensity, beatToTime), so the
// fight loop does not care which kind of piece it is fighting. Sandbox-only
// on purpose -- js/wordbound/music.js stays synthesized-only. Still attaches
// to window.Wordbound.Sandbox for the untyped sandbox modules
// (round.js/RoundSandbox.jsx) that read it off the global.

export interface Keyframe {
  sec: number;
  intensity: number;
}

export interface Surge {
  sec: number;
  mag: number;
  intensity?: number;
  rise?: number;
}

export interface RecordedPiece {
  audio: string;
  title?: string;
  composer?: string;
  performer?: string;
  durationSec?: number;
  loudness?: number;
  peak?: number;
  dynamics?: { keyframes?: Keyframe[]; surges?: Surge[] };
  [key: string]: unknown;
}

export interface CrescendoWindow {
  phase: 'idle' | 'soon' | 'live';
  secs?: number;
  peakSec?: number;
  mag?: number;
  sustained?: boolean;
}

export interface AudioPiece {
  isPlaying: boolean;
  play(): void;
  stop(): void;
  fadeIn(sec?: number): void;
  setTempoScale(scale?: number): void;
  getTempoScale(): number;
  getIntensity(): number;
  currentBeat(): number;
  crescendo(): CrescendoWindow;
  extendCrescendo(extraSec: number): void;
  beatToTime(beat: number): number;
  on(name: string, cb: (payload?: unknown) => void): AudioPiece;
  _tick(): void;
  whenReady: Promise<AudioPiece> | null;
  dispose?: () => void;
}

// What a recording should SOUND like next to the synthesized pieces, which
// sit near 0.28. Expressed as a target RMS rather than a fixed trim because
// recordings arrive at wildly different levels: the Fur Elise track is
// normalised to full scale, the Moonlight one peaks at about a tenth of
// that, and a single trim would leave one of them nearly inaudible.
const TARGET_RMS = 0.055;
// Fallback for a piece whose analysis predates `loudness`.
const LEVEL = 0.32;
// Ceiling on the resulting gain, so a near-silent file cannot be amplified
// into a wall of noise floor.
const MAX_GAIN = 12;

// Level-match on loudness, then pull back if that would clip the peak.
function trimFor(piece: RecordedPiece): number {
  if (!piece.loudness) return LEVEL;
  let g = Math.min(MAX_GAIN, TARGET_RMS / piece.loudness);
  if (piece.peak) g = Math.min(g, 0.98 / piece.peak);
  return +g.toFixed(4);
}

// How far ahead of a surge to announce it. This IS the attack's flight time:
// the tug lands the burst exactly on the peak, so the warning has to go out
// this long before it. Four seconds puts the note on screen while the music
// is still quiet, so the approach and the swell build together and arrive
// on the same beat.
const LEAD_SEC = 4.0;

// How far BEHIND the playhead a swell may be and still be worth swinging on.
const CATCHUP_SEC = 0.5;

// Shared with the SEQUENCED opponents, which take the same warning through
// music.js's crescendoLeadSec.
export const TELEGRAPH_LEAD_SEC = LEAD_SEC;

// THE CRESCENDO WINDOW, for items that fire "on a crescendo" (items.ts,
// Climax). The dense surge list is curated down to the BIG swells.
const CRES_MIN_MAG = 0.6;
const CRES_MIN_GAP = 12;
const CRES_BEFORE = 0.4;
const CRES_AFTER = 1.0;
const CRES_COUNTDOWN = 5;
export const CRESCENDO = {
  before: CRES_BEFORE,
  after: CRES_AFTER,
  countdown: CRES_COUNTDOWN,
};

function curateSurges(surges: Surge[]): Surge[] {
  const out: Surge[] = [];
  let last = -Infinity;
  surges.forEach((s) => {
    if (s.mag < CRES_MIN_MAG || s.sec - last < CRES_MIN_GAP) return;
    out.push(s);
    last = s.sec;
  });
  return out;
}

const bufferCache: Record<string, Promise<AudioBuffer>> = {};
const bytesCache: Record<string, Promise<ArrayBuffer>> = {};

// Fetching several MB and decoding it takes long enough that a fight started
// the instant the page loads would open in SILENCE. Warm the bytes as soon
// as the sandbox mounts so only the (fast) decode is left by the time
// anybody presses start. Safe to call repeatedly.
export function prefetchAudio(url: string): Promise<ArrayBuffer> {
  if (!bytesCache[url]) {
    bytesCache[url] = fetch(url)
      .then((r) => {
        if (!r.ok)
          throw new Error('audio fetch failed: ' + r.status + ' ' + url);
        return r.arrayBuffer();
      })
      .catch((err) => {
        // A cached REJECTION would poison every later fight with this piece --
        // the recording would never load again and only a refresh would clear
        // it. Drop the entry so the next attempt actually retries.
        delete bytesCache[url];
        throw err;
      });
  }
  return bytesCache[url]!;
}

function loadBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer> {
  if (bufferCache[url]) return bufferCache[url]!;
  // decodeAudioData detaches the ArrayBuffer it is given, so hand it a copy
  // and keep the original for any later re-decode (a new AudioContext).
  bufferCache[url] = prefetchAudio(url)
    .then((bytes) => bytes.slice(0))
    .then(
      (ab) =>
        new Promise<AudioBuffer>((resolve, reject) => {
          // Callback form: Safari still does not return a promise here.
          const p = ctx.decodeAudioData(ab, resolve, reject);
          if (p && typeof (p as PromiseLike<AudioBuffer>).then === 'function')
            (p as PromiseLike<AudioBuffer>).then(resolve, reject);
        }),
    )
    .catch((err) => {
      delete bufferCache[url]; // same reason as the fetch cache above
      throw err;
    });
  return bufferCache[url]!;
}

export function createAudioPiece(
  ctx: AudioContext,
  destination: AudioNode,
  piece: RecordedPiece,
  opts?: { level?: number | null; autoTick?: boolean },
): AudioPiece {
  const o = opts || {};
  const listeners: Record<string, ((payload?: unknown) => void)[]> = {};
  let rate = 1;
  let buffer: AudioBuffer | null = null;
  let source: AudioBufferSourceNode | null = null;
  const trim = ctx.createGain();
  trim.gain.value = o.level != null ? o.level : trimFor(piece);
  trim.connect(destination);

  let playing = false;
  let wantPlay = false;
  let anchorCtx = 0; // ctx.currentTime when the current run started
  let anchorPos = 0; // position within the recording at that moment
  let firedSurges: Record<number, boolean> = {};
  let endedFired = false;
  let tickId: ReturnType<typeof setInterval> | null = null;

  const keyframes = piece.dynamics?.keyframes || [];
  const surges = piece.dynamics?.surges || [];
  const bigSurges = curateSurges(surges);
  let duration = piece.durationSec || 0;
  // Sustain (items.ts): a crescendo hit can hold the window open past its
  // own peak's CRES_AFTER, for exactly one more play.
  let sustainUntil: number | null = null;
  let sustainPeak: number | null = null;
  let sustainMag: number | null = null;

  function emit(name: string, payload?: unknown) {
    (listeners[name] || []).forEach((cb) => {
      cb(payload);
    });
  }

  function position(): number {
    if (!playing) return anchorPos;
    return anchorPos + (ctx.currentTime - anchorCtx) * rate;
  }

  function intensityAt(sec: number): number {
    if (!keyframes.length) return 0;
    if (sec <= keyframes[0]!.sec) return keyframes[0]!.intensity;
    for (let i = 1; i < keyframes.length; i++) {
      if (sec <= keyframes[i]!.sec) {
        const a = keyframes[i - 1]!,
          b = keyframes[i]!;
        const span = b.sec - a.sec;
        const t = span > 0 ? (sec - a.sec) / span : 0;
        return a.intensity + (b.intensity - a.intensity) * t;
      }
    }
    return keyframes[keyframes.length - 1]!.intensity;
  }

  const api: AudioPiece = {
    isPlaying: false,

    play() {
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

    stop() {
      wantPlay = false;
      if (source) {
        try {
          source.stop();
        } catch {
          /* already stopped */
        }
        source.disconnect();
        source = null;
      }
      anchorPos = 0;
      playing = false;
      api.isPlaying = false;
      firedSurges = {};
    },

    // Fade the piece in from silence over `sec` -- the next enemy taking
    // the stage rather than cutting in on the previous one's last breath.
    fadeIn(sec?: number) {
      const target = trim.gain.value;
      const now = ctx.currentTime;
      trim.gain.cancelScheduledValues(now);
      trim.gain.setValueAtTime(0, now);
      trim.gain.linearRampToValueAtTime(target, now + (sec || 0.4));
    },

    // Same contract as the sequencer's: scale playback speed live.
    setTempoScale(scale?: number) {
      const pos = position();
      rate = scale || 1;
      anchorPos = pos;
      anchorCtx = ctx.currentTime;
      if (source) source.playbackRate.value = rate;
    },
    getTempoScale() {
      return rate;
    },

    getIntensity() {
      return intensityAt(position());
    },
    currentBeat() {
      return position();
    },

    // Where the playhead stands against the next big swell. Read on the
    // play itself (round.js) and polled by the UI for the card.
    crescendo(): CrescendoWindow {
      if (!playing) return { phase: 'idle' };
      const pos = position();
      if (sustainUntil != null) {
        if (pos <= sustainUntil)
          return {
            phase: 'live',
            secs: sustainUntil - pos,
            peakSec: sustainPeak!,
            mag: sustainMag!,
            sustained: true,
          };
        sustainUntil = null;
      }
      if (!bigSurges.length) return { phase: 'idle' };
      for (let i = 0; i < bigSurges.length; i++) {
        const peak = bigSurges[i]!.sec;
        const mag = bigSurges[i]!.mag;
        if (pos > peak + CRES_AFTER) continue;
        if (pos >= peak - CRES_BEFORE)
          return {
            phase: 'live',
            secs: peak + CRES_AFTER - pos,
            peakSec: peak,
            mag,
          };
        if (pos >= peak - CRES_COUNTDOWN)
          return { phase: 'soon', secs: peak - pos, peakSec: peak };
        return { phase: 'idle', secs: peak - pos, peakSec: peak };
      }
      return { phase: 'idle' };
    },

    // Sustain (items.ts): hold the window open extraSec longer than now,
    // reusing whichever peak was (or still is) live. A no-op with no live
    // window.
    extendCrescendo(extraSec: number) {
      const c = api.crescendo();
      if (c.phase !== 'live') return;
      sustainPeak = c.peakSec!;
      sustainMag = c.mag!;
      sustainUntil = position() + extraSec;
    },

    // Beat IS seconds for a recording, so this is the playback-rate map
    // from a position in the piece to a moment on the AudioContext clock.
    beatToTime(beat: number) {
      return anchorCtx + (beat - anchorPos) / (rate || 1);
    },

    on(name, cb) {
      (listeners[name] = listeners[name] || []).push(cb);
      return api;
    },

    // Exposed for the same "internal but testable" reason music.js exposes
    // _tick: a test can drive it without waiting on real timers.
    _tick() {
      if (!playing) return;
      const pos = position();
      surges.forEach((s, i) => {
        if (firedSurges[i]) return;
        // NEVER DROP A SWELL -- a peak the playhead stepped clean over is
        // announced anyway (the fight lands it immediately) as long as it
        // is still fresh.
        if (pos < s.sec - LEAD_SEC) return;
        firedSurges[i] = true;
        if (pos > s.sec + CATCHUP_SEC) return; // long gone: spent, unswung
        emit('crescendo-approaching', {
          id: 'surge-' + i,
          peakBeat: s.sec,
          peakIntensity: s.intensity,
          rise: s.rise,
          mag: s.mag,
          rank: s.mag,
          dense: true,
        });
      });
      if (duration && pos >= duration && !endedFired) {
        endedFired = true;
        emit('piece-ended', piece);
      }
    },

    whenReady: null,
  };

  api.whenReady = loadBuffer(ctx, piece.audio).then(
    (buf) => {
      buffer = buf;
      if (!duration) duration = buf.duration;
      if (wantPlay && !playing) api.play();
      return api;
    },
    (err: unknown) => {
      // Told, not thrown. An unhandled rejection here left the fight running
      // in silence with nothing on screen to say why.
      emit('load-failed', err);
      return api;
    },
  );

  if (o.autoTick !== false && typeof setInterval === 'function') {
    tickId = setInterval(api._tick, 25);
    api.dispose = () => {
      clearInterval(tickId!);
      api.stop();
    };
  } else {
    api.dispose = () => {
      api.stop();
    };
  }

  return api;
}
