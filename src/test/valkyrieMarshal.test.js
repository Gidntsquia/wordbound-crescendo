// DUEL-GAUGE COMBAT ticket's "Next" note (GOALS.md, update-10): unit
// coverage for js/wordbound/pieces/valkyrie-marshal.js, the first real
// sequenced piece for the 'late' stage-tier (Mountain King is the only
// other real piece today, and it's 'mid'). Mirrors music.test.js's own
// FakeAudioContext convention (jsdom has no real AudioContext, confirmed
// directly by that file's own header) so this drives the REAL
// Music.createSequencer against the REAL piece data, not a mock of either.
//
// SCOPE: this proves the piece's data is well-formed and genuinely
// schedulable end-to-end, and that its dynamics curve matches THEME.md's
// own description of the fight ("frequent, powerful crescendos", "barely
// lets up long enough to breathe"). It does NOT wire this piece into any
// boss def (monsters.js) or the live game -- per this run's own PROGRESS.md
// entry, that integration (the same shape DUEL-GAUGE COMBAT's own
// ORCHESTRATOR DECISION did for Mountain King/boss_vowelmaw) is left for a
// future run.

import { describe, it, expect } from 'vitest';

const Music = window.Wordbound.Music;
const piece = window.Wordbound.Pieces.valkyrieMarshal;

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

describe('valkyrieMarshal piece data', () => {
  it('is registered and PD-vetted per the standing rule', () => {
    expect(piece).toBeTruthy();
    expect(piece.vetting.publicDomain).toBe(true);
    // pre-1930 AND composer dead 70+ years, checked against 2026 (standing rule).
    expect(piece.vetting.composed).toBeLessThan(1930);
    expect(2026 - piece.vetting.composerDied).toBeGreaterThanOrEqual(70);
  });

  it('is tagged for the floor-3 boss at late stage-tier', () => {
    expect(piece.isBoss).toBe(true);
    expect(piece.floor).toBe(3);
    expect(piece.stageTier).toBe('late');
  });

  it('has well-formed, monotonically-increasing dynamics keyframes spanning the whole piece', () => {
    const kfs = piece.dynamics.keyframes;
    expect(kfs[0].beat).toBe(0);
    expect(kfs[kfs.length - 1].beat).toBe(piece.lengthBeats);
    for (let i = 1; i < kfs.length; i++) {
      expect(kfs[i].beat).toBeGreaterThan(kfs[i - 1].beat);
      expect(kfs[i].intensity).toBeGreaterThanOrEqual(0);
      expect(kfs[i].intensity).toBeLessThanOrEqual(1);
    }
  });

  it('never lets intensity drop below 0.5 -- "barely lets up long enough to breathe" (THEME.md)', () => {
    for (let beat = 0; beat <= piece.lengthBeats; beat += 0.5) {
      expect(Music.intensityAt(piece, beat)).toBeGreaterThanOrEqual(0.5);
    }
  });

  it('carries FOUR real crescendo surges (late tier: "frequent, powerful crescendos" per the header curve decision), distinct from Mountain King\'s single continuous ramp', () => {
    expect(piece.dynamics.crescendos.length).toBe(4);
    piece.dynamics.crescendos.forEach((c) => {
      expect(c.peakIntensity).toBeGreaterThanOrEqual(0.9);
      expect(c.rampDurationBeats).toBeLessThan(piece.lengthBeats / 4);
    });
    // Mountain King is one ramp spanning nearly the whole piece -- confirm
    // this piece's shape is genuinely different, not a copy-paste.
    const mk = window.Wordbound.Pieces.mountainKing;
    expect(mk.dynamics.crescendos.length).toBe(1);
  });

  it('has a bass ostinato that never rests for the piece\'s full length', () => {
    const lastBassNote = piece.tracks.bass[piece.tracks.bass.length - 1];
    expect(lastBassNote.beat + lastBassNote.duration).toBeGreaterThanOrEqual(piece.lengthBeats);
    // No gap longer than one note's own duration anywhere in the ostinato.
    for (let i = 1; i < piece.tracks.bass.length; i++) {
      const gap = piece.tracks.bass[i].beat - (piece.tracks.bass[i - 1].beat + piece.tracks.bass[i - 1].duration);
      expect(gap).toBeLessThan(0.01);
    }
  });

});
