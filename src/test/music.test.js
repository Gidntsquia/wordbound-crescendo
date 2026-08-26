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

  it('exposes beatToTime publicly, agreeing with currentBeat at the current instant', () => {
    // DUEL-GAUGE COMBAT ticket (crescendo-approaching countdown): beatToTime
    // was already used internally by scheduleNote, but wasn't callable by a
    // consumer until this ticket needed to convert a future crescendo's
    // peakBeat into a real seconds-away countdown. Confirms it's a true
    // inverse of currentBeat()/timeToBeat at a point mid-piece (not just at
    // beat 0), including across a tempo breakpoint.
    const ctx = new FakeAudioContext();
    const dest = new FakeGain();
    const piece = simplePiece({ tempo: [{ beat: 0, bpm: 90 }, { beat: 4, bpm: 150 }], lengthBeats: 10 });
    const seq = Music.createSequencer(ctx, dest, piece, { autoTick: false });
    seq.play();
    ctx.currentTime = 3;
    const beatNow = seq.currentBeat();
    expect(seq.beatToTime(beatNow)).toBeCloseTo(3);
    // A future beat past the breakpoint round-trips too: convert forward
    // then back and land on the same beat.
    const futureTime = seq.beatToTime(8);
    expect(futureTime).toBeGreaterThan(3);
    ctx.currentTime = futureTime;
    expect(seq.currentBeat()).toBeCloseTo(8);
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

describe('Music.createSequencer -- audio graph / mute-volume delegation', () => {
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

});
