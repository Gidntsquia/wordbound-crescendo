// MUSIC ENGINE ticket (GOALS.md, 2026-08-21): unit tests for
// js/wordbound/music.js against a hand-built fake AudioContext with a
// manually-advanced `currentTime` -- this is the "mocked clock" the
// ticket's VERIFY section asks for. Real timing precision (does a real
// AudioContext actually produce sound on schedule) is NOT testable in
// jsdom; that's covered separately by test/verify-music-engine.js against a
// real browser. This file proves the scheduling MATH (beat<->time
// conversion, tempo breakpoints, tempo-scale rebase, intensity curve, event
// firing) is correct, driven tick-by-tick with { autoTick: false } so no
// real timer is ever started.

import { describe, it, expect } from 'vitest';

const Music = window.Wordbound.Music;

class FakeGain {
  constructor() {
    this.connections = [];
    this.calls = [];
    this.gain = {
      value: 0,
      setValueAtTime: (v, t) => { this.gain.value = v; this.calls.push(['set', v, t]); },
      exponentialRampToValueAtTime: (v, t) => { this.gain.value = v; this.calls.push(['expRamp', v, t]); },
      linearRampToValueAtTime: (v, t) => { this.gain.value = v; this.calls.push(['linRamp', v, t]); },
      cancelScheduledValues: (t) => { this.calls.push(['cancel', t]); },
    };
  }
  connect(dest) { this.connections.push(dest); }
}

class FakeOsc {
  constructor() {
    this.type = 'sine';
    this.connections = [];
    this.startedAt = null;
    this.stoppedAt = null;
    this.frequency = {
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
    };
  }
  connect(dest) { this.connections.push(dest); }
  start(t) { this.startedAt = t; }
  stop(t) { this.stoppedAt = t; }
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.oscillators = [];
    this.gains = [];
  }
  createOscillator() { const o = new FakeOsc(); this.oscillators.push(o); return o; }
  createGain() { const g = new FakeGain(); this.gains.push(g); return g; }
}

function simplePiece(overrides) {
  return Object.assign({
    id: 'test-piece',
    lengthBeats: 8,
    tempo: 60, // 1 beat/sec, easy mental math
    tracks: {
      melody: [
        { beat: 0, duration: 1, freq: 440, velocity: 0.5 },
        { beat: 4, duration: 1, freq: 880, velocity: 0.9 },
      ],
    },
    dynamics: {
      keyframes: [
        { beat: 0, intensity: 0 },
        { beat: 4, intensity: 0.5 },
        { beat: 8, intensity: 1 },
      ],
      crescendos: [
        { id: 'c1', startBeat: 0, peakBeat: 6, peakIntensity: 1, rampDurationBeats: 6 },
      ],
    },
  }, overrides);
}

describe('Music.intensityAt', () => {
  it('interpolates linearly between keyframes', () => {
    const piece = simplePiece();
    expect(Music.intensityAt(piece, 0)).toBe(0);
    expect(Music.intensityAt(piece, 2)).toBeCloseTo(0.25);
    expect(Music.intensityAt(piece, 4)).toBeCloseTo(0.5);
    expect(Music.intensityAt(piece, 6)).toBeCloseTo(0.75);
    expect(Music.intensityAt(piece, 8)).toBe(1);
  });

  it('clamps before the first and after the last keyframe', () => {
    const piece = simplePiece();
    expect(Music.intensityAt(piece, -5)).toBe(0);
    expect(Music.intensityAt(piece, 50)).toBe(1);
  });
});

describe('Music.createSequencer -- beat/time conversion', () => {
  it('advances one beat per second at 60bpm constant tempo', () => {
    const ctx = new FakeAudioContext();
    const dest = new FakeGain();
    const piece = simplePiece();
    const seq = Music.createSequencer(ctx, dest, piece, { autoTick: false });
    seq.play();
    expect(seq.currentBeat()).toBeCloseTo(0);
    ctx.currentTime = 2.5;
    expect(seq.currentBeat()).toBeCloseTo(2.5);
  });

  it('honors tempo breakpoints (piecewise-constant bpm)', () => {
    const ctx = new FakeAudioContext();
    const dest = new FakeGain();
    // 0-4 beats at 60bpm (1s/beat) = 4s, then 120bpm (0.5s/beat) from beat 4.
    const piece = simplePiece({ tempo: [{ beat: 0, bpm: 60 }, { beat: 4, bpm: 120 }], lengthBeats: 10 });
    const seq = Music.createSequencer(ctx, dest, piece, { autoTick: false });
    seq.play();
    ctx.currentTime = 4; // exactly at the breakpoint
    expect(seq.currentBeat()).toBeCloseTo(4);
    ctx.currentTime = 4 + 1; // 1 more second at 120bpm = 2 more beats
    expect(seq.currentBeat()).toBeCloseTo(6);
  });

  it('round-trips beatToTime/timeToBeat through scheduling (no drift across a tick)', () => {
    const ctx = new FakeAudioContext();
    const dest = new FakeGain();
    const piece = simplePiece({ tempo: [{ beat: 0, bpm: 90 }, { beat: 4, bpm: 150 }], lengthBeats: 10 });
    const seq = Music.createSequencer(ctx, dest, piece, { autoTick: false });
    seq.play();
    for (let i = 0; i < 20; i++) {
      ctx.currentTime += 0.2;
      seq._tick();
    }
    // 4s elapsed: first 4 beats at 90bpm take 4*60/90 = 2.667s, remaining
    // 1.333s at 150bpm covers 1.333 * 150/60 = 3.333 beats -> beat ~7.333.
    expect(seq.currentBeat()).toBeCloseTo(7.333, 1);
  });
});

describe('Music.createSequencer -- tempo scale', () => {
  it('setTempoScale rebases without a discontinuity and changes future rate', () => {
    const ctx = new FakeAudioContext();
    const dest = new FakeGain();
    const piece = simplePiece({ lengthBeats: 20 });
    const seq = Music.createSequencer(ctx, dest, piece, { autoTick: false });
    seq.play();
    ctx.currentTime = 3;
    expect(seq.currentBeat()).toBeCloseTo(3);
    seq.setTempoScale(0.5); // half speed from here on
    expect(seq.currentBeat()).toBeCloseTo(3); // no jump at the moment of the call
    ctx.currentTime = 5; // 2 more real seconds at half speed = 1 beat
    expect(seq.currentBeat()).toBeCloseTo(4);
  });
});

describe('Music.createSequencer -- events', () => {
  it('fires crescendo-approaching and crescendo-peak at the right beats, each exactly once', () => {
    const ctx = new FakeAudioContext();
    const dest = new FakeGain();
    const piece = simplePiece(); // crescendo peakBeat=6, default leadBeats=4 -> approach at beat 2
    const seq = Music.createSequencer(ctx, dest, piece, { autoTick: false, lookaheadSec: 0.5 });
    const approaching = [];
    const peaks = [];
    seq.on('crescendo-approaching', (c) => approaching.push(c.id));
    seq.on('crescendo-peak', (c) => peaks.push(c.id));
    seq.play();
    for (let i = 0; i < 20; i++) {
      ctx.currentTime += 0.3;
      seq._tick();
    }
    expect(approaching).toEqual(['c1']);
    expect(peaks).toEqual(['c1']);
  });

  it('fires piece-ended exactly once when lengthBeats is reached, and stops playing', () => {
    const ctx = new FakeAudioContext();
    const dest = new FakeGain();
    const piece = simplePiece({ lengthBeats: 3 });
    const seq = Music.createSequencer(ctx, dest, piece, { autoTick: false });
    let endedCount = 0;
    seq.on('piece-ended', () => { endedCount++; });
    seq.play();
    for (let i = 0; i < 10; i++) {
      ctx.currentTime += 0.5;
      seq._tick();
    }
    expect(endedCount).toBe(1);
    expect(seq.isPlaying).toBe(false);
  });

  it('off() removes a listener', () => {
    const ctx = new FakeAudioContext();
    const dest = new FakeGain();
    const piece = simplePiece();
    const seq = Music.createSequencer(ctx, dest, piece, { autoTick: false });
    let calls = 0;
    const cb = () => { calls++; };
    seq.on('crescendo-peak', cb);
    seq.off('crescendo-peak', cb);
    seq.play();
    for (let i = 0; i < 20; i++) { ctx.currentTime += 0.3; seq._tick(); }
    expect(calls).toBe(0);
  });
});

describe('Music.createSequencer -- audio graph / mute-volume delegation', () => {
  it('connects every scheduled note through the caller-supplied destination node, never ctx.destination', () => {
    const ctx = new FakeAudioContext();
    const dest = new FakeGain();
    const piece = simplePiece();
    const seq = Music.createSequencer(ctx, dest, piece, { autoTick: false });
    seq.play();
    ctx.currentTime = 0.5;
    seq._tick(); // beat-0 note should be scheduled
    expect(ctx.gains.length).toBeGreaterThan(0);
    const noteGain = ctx.gains[ctx.gains.length - 1];
    expect(noteGain.connections).toContain(dest);
    // This is the whole mute/volume story: music.js never touches
    // ctx.destination directly, so muting/adjusting `dest` (the caller's
    // real musicGainNode) silences/scales every note this module schedules.
  });

  it('pause() preserves beat position and play() resumes from it', () => {
    const ctx = new FakeAudioContext();
    const dest = new FakeGain();
    const piece = simplePiece({ lengthBeats: 20 });
    const seq = Music.createSequencer(ctx, dest, piece, { autoTick: false });
    seq.play();
    ctx.currentTime = 3;
    seq.pause();
    expect(seq.isPlaying).toBe(false);
    expect(seq.currentBeat()).toBeCloseTo(3);
    ctx.currentTime = 100; // time passing while paused must not move the beat
    expect(seq.currentBeat()).toBeCloseTo(3);
    seq.play();
    ctx.currentTime = 101; // 1 more second after resuming
    expect(seq.currentBeat()).toBeCloseTo(4);
  });

  it('stop() halts scheduling and fades out already-scheduled nodes', () => {
    const ctx = new FakeAudioContext();
    const dest = new FakeGain();
    const piece = simplePiece({ lengthBeats: 20 });
    const seq = Music.createSequencer(ctx, dest, piece, { autoTick: false });
    seq.play();
    ctx.currentTime = 0.1;
    seq._tick();
    expect(ctx.oscillators.length).toBeGreaterThan(0);
    seq.stop();
    expect(seq.isPlaying).toBe(false);
    const stoppedOsc = ctx.oscillators[0];
    expect(stoppedOsc.stoppedAt).not.toBeNull();
  });
});
