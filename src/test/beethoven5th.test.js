// DUEL-GAUGE COMBAT ticket's "Next" note (GOALS.md, update-12): unit
// coverage for js/wordbound/pieces/beethoven-5th.js, the final boss's piece
// ('final' stage-tier, the first real piece for that tier -- 'early' still
// has no real piece). Mirrors valkyrieMarshal.test.js's own
// FakeAudioContext convention (jsdom has no real AudioContext) so this
// drives the REAL Music.createSequencer against the REAL piece data, not a
// mock of either.
//
// SCOPE: same as valkyrieMarshal.test.js's own -- proves the piece's data
// is well-formed and genuinely schedulable end-to-end, and that its
// four-movement shape matches THEME.md's own brief ("each movement changes
// the shape of the pressure, not just its intensity... ending on the
// finale's triumphant major-key turn as the last phase"). Does NOT wire
// this piece into any boss def or the live game -- that's explicitly left
// for a future run (a real floor-4/"Podium" boss def + floor-generation
// support), per this run's own PROGRESS.md entry.

import { describe, it, expect } from 'vitest';

const Music = window.Wordbound.Music;
const piece = window.Wordbound.Pieces.beethoven5th;

class FakeGain {
  constructor() {
    this.gain = {
      value: 0,
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
      cancelScheduledValues: () => {},
    };
  }
  connect() {}
}

class FakeOsc {
  constructor() {
    this.type = 'sine';
    this.startedAt = null;
    this.stoppedAt = null;
    this.frequency = { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} };
  }
  connect() {}
  start(t) { this.startedAt = t; }
  stop(t) { this.stoppedAt = t; }
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.oscillators = [];
  }
  createOscillator() { const o = new FakeOsc(); this.oscillators.push(o); return o; }
  createGain() { return new FakeGain(); }
}

describe('beethoven5th piece data', () => {
  it('is registered and PD-vetted per the standing rule', () => {
    expect(piece).toBeTruthy();
    expect(piece.vetting.publicDomain).toBe(true);
    // pre-1930 AND composer dead 70+ years, checked against 2026 (standing rule).
    expect(piece.vetting.composed).toBeLessThan(1930);
    expect(2026 - piece.vetting.composerDied).toBeGreaterThanOrEqual(70);
  });

  it('is tagged for the final boss at final stage-tier', () => {
    expect(piece.isBoss).toBe(true);
    expect(piece.stageTier).toBe('final');
    expect(piece.bossName).toBe('The Maestro');
  });

  it('has well-formed, monotonically-increasing-in-beat dynamics keyframes spanning the whole piece', () => {
    const kfs = piece.dynamics.keyframes;
    expect(kfs[0].beat).toBe(0);
    expect(kfs[kfs.length - 1].beat).toBe(piece.lengthBeats);
    for (let i = 1; i < kfs.length; i++) {
      expect(kfs[i].beat).toBeGreaterThan(kfs[i - 1].beat);
      expect(kfs[i].intensity).toBeGreaterThanOrEqual(0);
      expect(kfs[i].intensity).toBeLessThanOrEqual(1);
    }
  });

  it('carries FIVE real crescendo markers -- more than Valkyrie Marshal\'s four, "frequent, powerful crescendos" a step beyond even late tier', () => {
    expect(piece.dynamics.crescendos.length).toBe(5);
    piece.dynamics.crescendos.forEach((c) => {
      expect(c.peakIntensity).toBeGreaterThanOrEqual(0.9);
    });
    const vm = window.Wordbound.Pieces.valkyrieMarshal;
    expect(piece.dynamics.crescendos.length).toBeGreaterThan(vm.dynamics.crescendos.length);
  });

  it('has FOUR distinct tempo movements, each a real breakpoint (not a flat tempo like Valkyrie Marshal\'s)', () => {
    expect(Array.isArray(piece.tempo)).toBe(true);
    expect(piece.tempo.length).toBe(4);
    expect(piece.tempo[0].beat).toBe(0);
    // Movement II (Andante) is genuinely the slowest -- the deliberate lull,
    // not just a quieter version of the surrounding movements' pace.
    const bpms = piece.tempo.map((t) => t.bpm);
    expect(Math.min(...bpms)).toBe(piece.tempo[1].bpm);
    // Movement IV (the triumphant finale) is genuinely the fastest.
    expect(Math.max(...bpms)).toBe(piece.tempo[3].bpm);
  });

  it('movement II (Andante, beats 32-56) is a genuine low-intensity lull, distinctly quieter than movements I, III, and IV around it', () => {
    // "changes the shape of the pressure, not just its intensity" (THEME.md)
    // -- confirm this movement's own peak intensity is well below its
    // neighbors', not just a slightly-quieter continuation of movement I.
    let mov2Peak = 0;
    for (let beat = 32; beat <= 56; beat += 0.5) {
      mov2Peak = Math.max(mov2Peak, Music.intensityAt(piece, beat));
    }
    expect(mov2Peak).toBeLessThan(0.5);
    expect(Music.intensityAt(piece, 24)).toBeGreaterThan(mov2Peak); // late movement I
    expect(Music.intensityAt(piece, 78)).toBeGreaterThan(mov2Peak); // late movement III
  });

  it('movement II has real rests in its own melody line (silence in the track data itself, not just a quiet dynamics curve)', () => {
    const mov2Notes = piece.tracks.melody
      .filter((n) => n.beat >= 32 && n.beat < 56)
      .sort((a, b) => a.beat - b.beat);
    expect(mov2Notes.length).toBeGreaterThan(0);
    let foundRealGap = false;
    for (let i = 1; i < mov2Notes.length; i++) {
      const gap = mov2Notes[i].beat - (mov2Notes[i - 1].beat + mov2Notes[i - 1].duration);
      if (gap > 0.1) foundRealGap = true;
    }
    expect(foundRealGap).toBe(true);
  });

  it('ends at maximum intensity on the very last beat -- "the finale\'s triumphant major-key turn as the last phase" (THEME.md)', () => {
    const kfs = piece.dynamics.keyframes;
    expect(kfs[kfs.length - 1].beat).toBe(piece.lengthBeats);
    expect(kfs[kfs.length - 1].intensity).toBe(1.0);
    expect(Music.intensityAt(piece, piece.lengthBeats)).toBe(1.0);
  });

  it('has a real final chord in both melody and bass landing exactly on the piece\'s last beat', () => {
    const lastMelody = piece.tracks.melody[piece.tracks.melody.length - 1];
    const lastBass = piece.tracks.bass[piece.tracks.bass.length - 1];
    expect(lastMelody.beat + lastMelody.duration).toBe(piece.lengthBeats);
    expect(lastBass.beat + lastBass.duration).toBe(piece.lengthBeats);
  });

  it('schedules real notes through Music.createSequencer without error, start-to-finish across all four movements\' tempo breakpoints', () => {
    const ctx = new FakeAudioContext();
    const dest = new FakeGain();
    const seq = Music.createSequencer(ctx, dest, piece, { autoTick: false });
    seq.play();
    // beatToTime is a true inverse of the sequencer's own tempo-breakpoint
    // math (music.test.js's own convention) -- the correct way to get this
    // piece's real total duration given it has FOUR tempo segments, not the
    // flat totalSec = lengthBeats*60/tempo shortcut a single-bpm piece like
    // Valkyrie Marshal can use.
    const totalSec = seq.beatToTime(piece.lengthBeats);
    expect(totalSec).toBeGreaterThan(0);
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      ctx.currentTime = (totalSec * i) / steps;
      seq._tick();
    }
    expect(ctx.oscillators.length).toBeGreaterThan(0);
    // Every scheduled note actually got started (real freq/velocity data
    // reached the oscillator, not skipped due to malformed beat/duration).
    ctx.oscillators.forEach((o) => expect(o.startedAt).not.toBeNull());
  });
});
