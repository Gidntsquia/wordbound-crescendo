// DUEL-GAUGE COMBAT ticket (GOALS.md): unit tests for js/wordbound/duel.js,
// the mocked-clock verification the ticket's VERIFY line asks for (gauge
// integration math, block loss at the end-state only, i-frame suppression,
// parry window, tier multipliers). No real timers/AudioContext involved --
// duel.js takes `now`/`dt` as plain numbers from the caller, so tests just
// pick them directly, same spirit as music.test.js's `{ autoTick: false }`
// approach but simpler since duel.js has no internal scheduler at all.

import { describe, it, expect } from 'vitest';

const Duel = window.Wordbound.Duel;

describe('Duel gauge integration math', () => {
  it('starts centered and pushes down over time at a constant intensity', () => {
    const duel = Duel.create({ stageTier: 'mid', healthBlocks: 5 });
    expect(duel.gauge).toBe(Duel.GAUGE_CENTER);

    const expectedPushPerSec = Duel.STAGE_TIER_BASE_PUSH.mid + 0.5 * Duel.INTENSITY_PUSH_SCALE;
    duel.tick(0, 1, 0.5);
    expect(duel.gauge).toBeCloseTo(Duel.GAUGE_CENTER - expectedPushPerSec, 6);
  });

  it('a no-op tick (dt=0) does not change the gauge', () => {
    const duel = Duel.create({ stageTier: 'final' });
    duel.tick(0, 0, 1);
    expect(duel.gauge).toBe(Duel.GAUGE_CENTER);
  });

  it('higher intensity pushes harder than lower intensity, same tier', () => {
    const quiet = Duel.create({ stageTier: 'early' });
    const loud = Duel.create({ stageTier: 'early' });
    quiet.tick(0, 1, 0.1);
    loud.tick(0, 1, 0.9);
    expect(loud.gauge).toBeLessThan(quiet.gauge);
  });

  it('clamps intensity to [0,1] so an out-of-range value cannot over/under-push', () => {
    const duel = Duel.create({ stageTier: 'early' });
    const expectedAtOne = Duel.STAGE_TIER_BASE_PUSH.early + Duel.INTENSITY_PUSH_SCALE;
    duel.tick(0, 1, 5); // way over 1
    expect(duel.gauge).toBeCloseTo(Duel.GAUGE_CENTER - expectedAtOne, 6);
  });
});

describe('Stage tier multipliers', () => {
  it('a later stage tier pushes strictly harder than an earlier one at equal intensity', () => {
    const tiers = ['early', 'mid', 'late', 'final'];
    const gauges = tiers.map((t) => {
      const duel = Duel.create({ stageTier: t });
      duel.tick(0, 1, 0.5);
      return duel.gauge;
    });
    for (let i = 1; i < gauges.length; i++) {
      expect(gauges[i]).toBeLessThan(gauges[i - 1]);
    }
  });

  it('an unrecognized stage tier defaults to zero base push, not a crash', () => {
    const duel = Duel.create({ stageTier: 'nonsense' });
    duel.tick(0, 1, 0);
    expect(duel.gauge).toBe(Duel.GAUGE_CENTER);
  });
});

describe('Losing a push / health blocks / i-frames', () => {
  it('loses exactly one health block when the gauge reaches the player end, not more', () => {
    const duel = Duel.create({ stageTier: 'final', healthBlocks: 5 });
    // A single giant tick would blow straight through GAUGE_MIN by a large
    // margin if this were a naive per-tick subtract with no floor -- confirm
    // it costs exactly one block, not "however many the overshoot implies".
    duel.tick(0, 100, 1);
    expect(duel.healthBlocks).toBe(4);
    // (gauge recentering on loss is covered by the next test)
  });

  it('recenters the gauge on a block loss instead of leaving it pinned at the edge', () => {
    const duel = Duel.create({ stageTier: 'final' });
    duel.tick(0, 100, 1);
    expect(duel.gauge).toBe(Duel.GAUGE_CENTER);
  });

  it('emits block-lost with the remaining count', () => {
    const duel = Duel.create({ stageTier: 'final', healthBlocks: 3 });
    const events = [];
    duel.on('block-lost', (p) => events.push(p));
    duel.tick(0, 100, 1);
    expect(events).toEqual([{ healthBlocks: 2 }]);
  });

  it('suspends music push entirely during i-frames -- a brutal passage cannot chain a second block loss', () => {
    const duel = Duel.create({ stageTier: 'final', healthBlocks: 5 });
    duel.tick(0, 100, 1); // forces a block loss at t=0, iframeUntil = 3
    expect(duel.healthBlocks).toBe(4);
    const gaugeAfterLoss = duel.gauge;
    // Another huge push arrives immediately, well inside the i-frame window.
    duel.tick(1, 100, 1);
    expect(duel.gauge).toBe(gaugeAfterLoss); // untouched
    expect(duel.healthBlocks).toBe(4); // no second loss
  });

  it('music push resumes once i-frames expire', () => {
    const duel = Duel.create({ stageTier: 'final', healthBlocks: 5 });
    duel.tick(0, 100, 1); // block loss at t=0, iframeUntil = 3
    duel.tick(Duel.IFRAME_DURATION_SEC, 1, 1); // now === iframeUntil, no longer active
    expect(duel.gauge).toBeLessThan(Duel.GAUGE_CENTER);
  });

  it('reaching zero health blocks emits player-defeated and goes terminal', () => {
    const duel = Duel.create({ stageTier: 'final', healthBlocks: 1 });
    const defeats = [];
    duel.on('player-defeated', () => defeats.push(true));
    duel.tick(0, 100, 1);
    expect(duel.healthBlocks).toBe(0);
    expect(duel.playerDefeated).toBe(true);
    expect(defeats.length).toBe(1);
    expect(duel.isTerminal()).toBe(true);

    // Further ticks/pushes are no-ops on a terminal duel.
    const gaugeBefore = duel.gauge;
    duel.tick(999, 1, 1);
    duel.applyPlayerPush(999, 50);
    expect(duel.gauge).toBe(gaugeBefore);
  });
});

describe('Winning a push', () => {
  it('a word push moves the gauge toward the enemy end', () => {
    const duel = Duel.create({ stageTier: 'early' });
    const result = duel.applyPlayerPush(0, 20);
    expect(result.pushed).toBe(20 * Duel.WORD_PUSH_SCALE);
    expect(duel.gauge).toBe(Duel.GAUGE_CENTER + 20 * Duel.WORD_PUSH_SCALE);
    expect(result.pushWon).toBe(false);
  });

  it('a negative/zero score never pushes backward', () => {
    const duel = Duel.create({ stageTier: 'early' });
    duel.applyPlayerPush(0, -50);
    expect(duel.gauge).toBe(Duel.GAUGE_CENTER);
  });

  it('reaching the enemy end wins a push, recenters, and emits push-won', () => {
    const duel = Duel.create({ stageTier: 'early', pushesToDefeat: 1 });
    const wins = [];
    duel.on('push-won', (p) => wins.push(p));
    const result = duel.applyPlayerPush(0, 1000);
    expect(result.pushWon).toBe(true);
    expect(duel.gauge).toBe(Duel.GAUGE_CENTER);
    expect(wins).toEqual([{ pushesWon: 1, pushesToDefeat: 1 }]);
  });

  it('a regular (pushesToDefeat=1) dies in exactly one won push', () => {
    const duel = Duel.create({ stageTier: 'early', pushesToDefeat: 1 });
    const result = duel.applyPlayerPush(0, 1000);
    expect(result.defeated).toBe(true);
    expect(duel.defeated).toBe(true);
    expect(duel.isTerminal()).toBe(true);
  });

  it('a boss (pushesToDefeat>1) survives early won pushes and only dies on the final one', () => {
    const duel = Duel.create({ stageTier: 'final', pushesToDefeat: 4 });
    const defeats = [];
    duel.on('defeated', () => defeats.push(true));
    for (let i = 1; i <= 3; i++) {
      const r = duel.applyPlayerPush(0, 1000);
      expect(r.defeated).toBe(false);
      expect(duel.pushesWon).toBe(i);
    }
    expect(duel.isTerminal()).toBe(false);
    const finalResult = duel.applyPlayerPush(0, 1000);
    expect(finalResult.defeated).toBe(true);
    expect(defeats.length).toBe(1);
  });
});

describe('Parry window', () => {
  it('a word played within the parry window around a registered peak succeeds', () => {
    const duel = Duel.create({ stageTier: 'early' });
    duel.registerCrescendoPeak(10);
    expect(duel.attemptParry(10 + Duel.PARRY_WINDOW_SEC)).toBe(true);
    expect(duel.attemptParry(10 - Duel.PARRY_WINDOW_SEC)).toBe(false); // consumed already
  });

  it('a word played outside the parry window fails', () => {
    const duel = Duel.create({ stageTier: 'early' });
    duel.registerCrescendoPeak(10);
    expect(duel.attemptParry(10 + Duel.PARRY_WINDOW_SEC + 0.5)).toBe(false);
  });

  it('with no registered peak, attemptParry always fails', () => {
    const duel = Duel.create({ stageTier: 'early' });
    expect(duel.attemptParry(0)).toBe(false);
  });

  it('a successful parry cannot be consumed twice for the same peak', () => {
    const duel = Duel.create({ stageTier: 'early' });
    duel.registerCrescendoPeak(10);
    expect(duel.attemptParry(10)).toBe(true);
    expect(duel.attemptParry(10)).toBe(false);
  });

  it('emits parried with the peak time that was parried', () => {
    const duel = Duel.create({ stageTier: 'early' });
    const parries = [];
    duel.on('parried', (t) => parries.push(t));
    duel.registerCrescendoPeak(42);
    duel.attemptParry(42.1);
    expect(parries).toEqual([42]);
  });

  it('dampens music push for PARRY_DAMPING_DURATION_SEC after a successful parry', () => {
    const duel = Duel.create({ stageTier: 'final' });
    duel.registerCrescendoPeak(0);
    duel.attemptParry(0);
    const undamped = Duel.STAGE_TIER_BASE_PUSH.final + Duel.INTENSITY_PUSH_SCALE;
    duel.tick(0.1, 1, 1); // inside the damping window
    expect(duel.gauge).toBeCloseTo(Duel.GAUGE_CENTER - undamped * (1 - Duel.PARRY_MITIGATION), 6);
  });

  it('push returns to full strength once the damping window elapses', () => {
    const duel = Duel.create({ stageTier: 'final' });
    duel.registerCrescendoPeak(0);
    duel.attemptParry(0);
    const undamped = Duel.STAGE_TIER_BASE_PUSH.final + Duel.INTENSITY_PUSH_SCALE;
    duel.tick(Duel.PARRY_DAMPING_DURATION_SEC, 1, 1); // damping window has elapsed
    expect(duel.gauge).toBeCloseTo(Duel.GAUGE_CENTER - undamped, 6);
  });

  it('a parry attempted during i-frames does not crash and still registers (parry itself is not gated by i-frames)', () => {
    const duel = Duel.create({ stageTier: 'final', healthBlocks: 5 });
    duel.tick(0, 100, 1); // block loss, iframeUntil = 3
    duel.registerCrescendoPeak(1);
    expect(duel.attemptParry(1)).toBe(true);
  });
});
