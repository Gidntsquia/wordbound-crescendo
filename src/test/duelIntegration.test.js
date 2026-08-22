// DUEL-GAUGE COMBAT ticket (GOALS.md, integration run): the actual cutover
// the ticket's "Next" note asked for -- Game.submitWord's duel-mode branch,
// Game.startDuelFight (the real Duel+Music sequencer setup), Game.tickDuel
// (the per-frame gauge-push wrapper CombatScreen.jsx's own rAF loop calls),
// and startCombat's automatic duel-mode detection off a monster def's
// `.piece` field. Drives the REAL engine throughout (Game.submitWord,
// Duel.create, Music.createSequencer, DuelCombat.submitWord) via
// gameHelpers' freshRun/findAvailableCombatNodeId/Game.enterCurrentNode --
// no mocks of engine logic, same "drive the real engine" convention every
// other test file in this repo follows. The one thing genuinely mocked is
// the AudioContext itself (jsdom has none -- confirmed directly), same
// FakeAudioContext/FakeGain/FakeOsc convention music.test.js already
// established for exactly this reason.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { freshRun, findAvailableCombatNodeId, pickPlayableWord } from './gameHelpers.js';

const Game = window.Wordbound.Game;
const Duel = window.Wordbound.Duel;
const Monsters = window.Wordbound.Monsters;

// Same fixed seed + candidate word list CombatScreen.test.jsx/RunScreen.
// test.jsx already rely on for a real, guaranteed-playable rack -- reused
// here rather than picking a fresh ad hoc seed per test, several of which
// turned out to roll unplayable racks against a short generic candidate
// list (confirmed while writing this file).
const SEED = 'vitest-fixed-seed-1';
const CANDIDATE_WORDS = ['RADIO', 'ROAD', 'RAID', 'READ', 'RAIN', 'AIDE', 'DINE', 'RIDE'];

class FakeGain {
  constructor() {
    this.gain = {
      value: 0,
      setValueAtTime: (v) => { this.gain.value = v; },
      exponentialRampToValueAtTime: (v) => { this.gain.value = v; },
      linearRampToValueAtTime: (v) => { this.gain.value = v; },
      cancelScheduledValues: () => {},
    };
  }
  connect() {}
}

class FakeOsc {
  constructor() {
    this.type = 'sine';
    this.frequency = { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} };
  }
  connect() {}
  start() {}
  stop() {}
}

class FakeAudioContext {
  constructor() { this.currentTime = 0; this.state = 'running'; }
  createOscillator() { return new FakeOsc(); }
  createGain() { return new FakeGain(); }
}

function testPiece(overrides) {
  return Object.assign({
    id: 'test-piece',
    stageTier: 'early',
    lengthBeats: 100,
    tempo: 60,
    tracks: {},
    dynamics: {
      keyframes: [{ beat: 0, intensity: 0 }, { beat: 100, intensity: 0 }],
      crescendos: [{ id: 'c1', startBeat: 5, peakBeat: 10, peakIntensity: 1, rampDurationBeats: 5 }],
    },
  }, overrides);
}

// Enters a real combat node and hands back the live state -- the fight
// stays turn-based (nothing sets `.duel` yet) unless the individual test
// flips it, matching how startCombat's real auto-detection only fires for a
// monster def carrying `.piece`.
// REGULAR ENEMIES ticket (real remaining scope (2)): weak tier now has 3
// real duel-mode regulars and NO turn-based ones left, so a given seed's
// row-0 (2-3 lanes) can land ALL-weak by chance, leaving
// findAvailableCombatNodeId with no non-duel option at all -- confirmed real
// (this file's own 'duel-start-4' hit exactly that the moment the wiring
// landed, per that seed's own now-renamed '-safe' comment below). Every
// caller here wants a plain turn-based fight specifically (each test flips
// `.duel` on deliberately, or tests the "no .piece" no-op path) -- not
// "whichever fight this literal seed happens to produce" -- so retry with
// small deterministic seed variants (same bounded-search convention the
// "automatic duel-mode detection" describe block below already established)
// instead of hunting down and renaming one broken literal seed at a time,
// which would just leave the next unlucky seed to be found the hard way.
function freshCombat(seedBase) {
  for (let i = 0; i < 10; i++) {
    const seed = i === 0 ? seedBase : seedBase + '-retry' + i;
    const state = freshRun(seed);
    try {
      const nodeId = findAvailableCombatNodeId(state);
      Game.enterCurrentNode(nodeId);
      return state;
    } catch (e) { /* this seed's row-0 was all duel-mode -- try the next */ }
  }
  throw new Error(`no seed derived from "${seedBase}" (10 tried) rolled an available non-duel combat start node`);
}

describe('Game.submitWord -- duel-mode branch', () => {
  it('pushes the real duel gauge via DuelCombat instead of subtracting monster.hp directly', () => {
    const state = freshCombat(SEED);
    state.monster.duel = true;
    state.duel = Duel.create({ stageTier: 'early', healthBlocks: state.player.healthBlocks, pushesToDefeat: 5 });
    state.duelSequencer = { getIntensity: () => 0, stop: () => {} };
    const hpBefore = state.monster.hp;
    const gaugeBefore = state.duel.gauge;

    const word = pickPlayableWord(state, CANDIDATE_WORDS);
    Game.submitWord(word, 0);

    expect(state.duel.gauge).toBeGreaterThan(gaugeBefore);
    expect(state.monster.hp).toBe(hpBefore); // a single ordinary word doesn't win a 5-push boss's gauge
  });

  it('a won push deals a decisive blow and does not fall through to the turn-based counterattack path', async () => {
    const state = freshCombat(SEED);
    state.monster.duel = true;
    state.duel = Duel.create({ stageTier: 'early', healthBlocks: state.player.healthBlocks, pushesToDefeat: 1 });
    state.duel.gauge = Duel.GAUGE_MAX - 1; // one point from winning
    state.duelSequencer = { getIntensity: () => 0, stop: () => {} };
    const inkBefore = state.player.ink;

    const word = pickPlayableWord(state, CANDIDATE_WORDS);
    Game.submitWord(word, 0);

    expect(state.monster.hp).toBe(0);
    // Wait for the deferred kill resolution (TILE_PLAY_ANIM_MS + MONSTER_DEATH_BEAT_MS)
    // the same way gameHelpers.defeatCurrentMonster does -- polls real state,
    // no fixed sleep.
    const start = Date.now();
    while (state.screen !== 'TILE_REWARD') {
      if (Date.now() - start > 2000) throw new Error('timed out waiting for TILE_REWARD, screen is ' + state.screen);
      await new Promise((r) => setTimeout(r, 20));
    }
    // No monster counterattack ever ran in duel mode -- ink is untouched
    // (only Overcharge/Rewrite spend it there, neither used here).
    expect(state.player.ink).toBe(inkBefore);
  });

  it('surviving a word in duel mode never rolls Intents or a counterattack (ink untouched, no next intent)', async () => {
    const state = freshCombat(SEED);
    state.monster.duel = true;
    state.monster.intent = undefined;
    state.duel = Duel.create({ stageTier: 'early', healthBlocks: state.player.healthBlocks, pushesToDefeat: 10 });
    state.duelSequencer = { getIntensity: () => 0, stop: () => {} };
    const inkBefore = state.player.ink;

    const word = pickPlayableWord(state, CANDIDATE_WORDS);
    Game.submitWord(word, 0);

    await new Promise((r) => setTimeout(r, 260)); // past TILE_PLAY_ANIM_MS (220ms)
    expect(state.player.ink).toBe(inkBefore);
    expect(state.monster.intent).toBeUndefined();
    expect(state.combatActive).toBe(true);
  });

  // COMBAT JUICE ticket (GOALS.md): before this run, a surviving duel-mode
  // word was a true no-op past render() -- Game.onDamageLanded now fires
  // there too (game.js's isDuelFight survive branch), so a duel word "hits"
  // every time even when its push doesn't cross the gauge, same as every
  // other combat mode. Polls instead of a flat sleep so this isn't tied to
  // the exact 220ms TILE_PLAY_ANIM_MS constant (a flat 260ms wait on a
  // razor-thin margin is exactly what made the test above occasionally flake
  // under full-suite parallel load -- see this ticket's PROGRESS.md entry).
  it('a surviving (non-decisive) duel push still fires Game.onDamageLanded, with isDuel true and monsterDied false', async () => {
    const state = freshCombat(SEED);
    state.monster.duel = true;
    state.duel = Duel.create({ stageTier: 'early', healthBlocks: state.player.healthBlocks, pushesToDefeat: 10 });
    state.duelSequencer = { getIntensity: () => 0, stop: () => {} };

    let received = null;
    const unsubscribe = Game.onDamageLanded((payload) => { received = payload; });
    try {
      const word = pickPlayableWord(state, CANDIDATE_WORDS);
      Game.submitWord(word, 0);
      const start = Date.now();
      while (received === null) {
        if (Date.now() - start > 2000) throw new Error('timed out waiting for Game.onDamageLanded');
        await new Promise((r) => setTimeout(r, 20));
      }
    } finally {
      unsubscribe();
    }
    expect(received.isDuel).toBe(true);
    expect(received.monsterDied).toBe(false);
    expect(received.damage).toBeGreaterThan(0);
  });

  it('a duel fight is never ended by ink hitting 0 (healthBlocks is the real health there)', () => {
    const state = freshCombat(SEED);
    state.monster.duel = true;
    state.duel = Duel.create({ stageTier: 'early', healthBlocks: state.player.healthBlocks, pushesToDefeat: 10 });
    state.duelSequencer = { getIntensity: () => 0, stop: () => {} };
    state.player.ink = 0;

    const word = pickPlayableWord(state, CANDIDATE_WORDS);
    Game.submitWord(word, 0);

    expect(state.screen).not.toBe('GAME_OVER');
    expect(state.combatActive).toBe(true);
  });
});

describe('Game.tickDuel', () => {
  it('forwards to the real duel.tick with the sequencer\'s live intensity', () => {
    const state = freshCombat('duel-tick-1');
    state.monster.duel = true;
    state.duel = Duel.create({ stageTier: 'early', healthBlocks: 5 });
    state.duelSequencer = { getIntensity: () => 1, stop: () => {} };
    const gaugeBefore = state.duel.gauge;

    Game.tickDuel(0, 1);
    expect(state.duel.gauge).toBeLessThan(gaugeBefore); // music pushes toward the player end
  });

  it('is a no-op outside an active duel fight', () => {
    const state = freshCombat('duel-tick-2');
    expect(state.duel).toBeFalsy();
    expect(() => Game.tickDuel(0, 1)).not.toThrow();
  });

  it('is a no-op once the duel has already resolved', () => {
    const state = freshCombat('duel-tick-3');
    state.monster.duel = true;
    state.duel = Duel.create({ stageTier: 'early', healthBlocks: 1 });
    state.duelSequencer = { getIntensity: () => 1, stop: () => {} };
    Game.tickDuel(0, 100); // huge dt/intensity: forces the single health block to 0
    expect(state.duel.isTerminal()).toBe(true);
    const gaugeAfterDefeat = state.duel.gauge;
    Game.tickDuel(1, 100);
    expect(state.duel.gauge).toBe(gaugeAfterDefeat); // untouched -- tick() itself no-ops when terminal
  });
});

describe('Game.startDuelFight', () => {
  it('creates a real Duel + Music sequencer, persists healthBlocks, and marks the monster duel-mode', () => {
    const state = freshCombat('duel-start-1');
    const ctx = new FakeAudioContext();
    const dest = new FakeGain();
    state.player.healthBlocks = 3;

    const duel = Game.startDuelFight(testPiece(), { audioContext: ctx, destination: dest, pushesToDefeat: 2 });

    expect(state.monster.duel).toBe(true);
    expect(duel.healthBlocks).toBe(3);
    expect(duel.pushesToDefeat).toBe(2);
    expect(state.duel).toBe(duel);
    expect(state.duelSequencer.isPlaying).toBe(true);
  });

  it('keeps player.healthBlocks live-synced on a real block loss (DuelCombat.syncHealthBlocks wiring)', () => {
    const state = freshCombat('duel-start-2');
    const ctx = new FakeAudioContext();
    const dest = new FakeGain();
    state.player.healthBlocks = 5;

    Game.startDuelFight(testPiece(), { audioContext: ctx, destination: dest });
    state.duel.tick(0, 100, 1); // huge dt/intensity forces at least one block loss

    expect(state.player.healthBlocks).toBe(state.duel.healthBlocks);
    expect(state.player.healthBlocks).toBeLessThan(5);
  });

  it('wires the sequencer\'s crescendo-peak event into the duel\'s parry window', () => {
    const state = freshCombat('duel-start-3');
    const ctx = new FakeAudioContext();
    const dest = new FakeGain();

    Game.startDuelFight(testPiece(), { audioContext: ctx, destination: dest });
    expect(state.duel.pendingPeakAt).toBeNull();

    ctx.currentTime = 10; // past the test piece's peakBeat=10 at 60bpm (1 beat/sec)
    state.duelSequencer._tick();
    expect(state.duel.pendingPeakAt).not.toBeNull();
  });

  it('wires crescendo-approaching into a live Game.getApproachingCrescendoSecondsAway countdown', () => {
    // COMBAT JUICE / DUEL-GAUGE COMBAT ticket's own "Next" note (the
    // crescendo-approaching countdown, previously hardcoded null in
    // CombatScreen.jsx): the test piece's crescendo peaks at beat 10,
    // 60bpm (1 beat/sec) -> peakTime is real-clock second 10. Default
    // crescendoLeadBeats=4 means the approaching event fires once
    // scheduling reaches beat 6 (startBeat=5 stays the floor, so
    // max(5, 10-4)=6).
    const state = freshCombat('duel-start-5');
    const ctx = new FakeAudioContext();
    const dest = new FakeGain();

    Game.startDuelFight(testPiece(), { audioContext: ctx, destination: dest });
    expect(Game.getApproachingCrescendoSecondsAway(ctx.currentTime)).toBeNull();

    ctx.currentTime = 6.1; // just past the approach beat
    state.duelSequencer._tick();
    expect(Game.getApproachingCrescendoSecondsAway(ctx.currentTime)).toBeCloseTo(3.9, 1); // 10 - 6.1

    ctx.currentTime = 8;
    expect(Game.getApproachingCrescendoSecondsAway(ctx.currentTime)).toBeCloseTo(2, 1); // stays live without re-ticking

    // Past the peak, the stored value goes stale until the peak event
    // clears it -- the getter's own defensive `<= 0` guard must still
    // return null even before that tick runs.
    expect(Game.getApproachingCrescendoSecondsAway(11)).toBeNull();

    ctx.currentTime = 10.1; // crosses peakBeat -> crescendo-peak fires and clears it
    state.duelSequencer._tick();
    expect(Game.getApproachingCrescendoSecondsAway(ctx.currentTime)).toBeNull();
  });

  it('Game.getApproachingCrescendoSecondsAway is null outside/before any duel fight', () => {
    freshCombat('duel-start-6');
    expect(Game.getApproachingCrescendoSecondsAway(0)).toBeNull();
  });

  it('ends the run on player-defeated and stops the sequencer, without touching ink', () => {
    // Seed renamed from 'duel-start-4' (REGULAR ENEMIES ticket, real
    // remaining scope (2)): that seed's floor now rolls duel-mode weak
    // regulars on BOTH of its row-0 start lanes, so findAvailableCombatNodeId
    // correctly throws "no available non-duel-mode combat start node" --
    // exactly the safety net a prior run built for this exact scenario,
    // now genuinely tripped for the first time. This test wants a plain
    // manually-.duel-flipped fight, not a real one, so it just needs any
    // seed whose row-0 has a non-duel start node -- confirmed this one does.
    const state = freshCombat('duel-start-4-safe');
    const ctx = new FakeAudioContext();
    const dest = new FakeGain();
    state.player.healthBlocks = 1;
    const inkBefore = state.player.ink;

    Game.startDuelFight(testPiece(), { audioContext: ctx, destination: dest });
    state.duel.tick(0, 100, 1); // forces the last health block to 0

    expect(state.duel.playerDefeated).toBe(true);
    expect(state.combatActive).toBe(false);
    expect(state.screen).toBe('GAME_OVER');
    expect(state.duelSequencer.isPlaying).toBe(false);
    expect(state.player.ink).toBe(inkBefore);
  });
});

describe('Second Wind\'s duel-mode retarget (onDuelBlockLost)', () => {
  // GOALS.md's own flagged gap (DUEL-GAUGE COMBAT ticket, update-4/8 notes):
  // Second Wind's turn-based onPlayerDamaged hook has no duel-mode
  // equivalent to attach to (a duel fight's health loss is a discrete Verse,
  // not a per-word damage amount) -- items.js now exposes onDuelBlockLost,
  // fired by Game.startDuelFight's own 'block-lost' listener, registered
  // BEFORE DuelCombat.syncHealthBlocks so a revival lands before
  // player.healthBlocks is read (see both files' own header comments on the
  // ordering). Drives the real Items.runHook/duel.js/game.js wiring
  // end to end -- no mocks of any of the three.
  it('revives a would-be-fatal block loss back to 1 health block and keeps the fight alive', () => {
    const state = freshCombat('duel-secondwind-1');
    const ctx = new FakeAudioContext();
    const dest = new FakeGain();
    state.player.healthBlocks = 1;
    state.player.items = ['second_wind'];

    Game.startDuelFight(testPiece(), { audioContext: ctx, destination: dest });
    state.duel.tick(0, 100, 1); // forces what would be the last health block to 0

    expect(state.duel.healthBlocks).toBe(1); // revived, not 0
    expect(state.duel.isTerminal()).toBe(false);
    expect(state.duel.playerDefeated).toBe(false);
    expect(state.player.healthBlocks).toBe(1); // synced to the LIVE (revived) value, not the stale pre-revival payload
    expect(state.player.usedSecondWind).toBe(true);
    expect(state.combatActive).toBe(true);
    expect(state.screen).not.toBe('GAME_OVER');
  });

  it('still applies i-frames after a Second Wind save (the grace window is set before block-lost fires, unaffected by the revival)', () => {
    const state = freshCombat('duel-secondwind-2');
    const ctx = new FakeAudioContext();
    const dest = new FakeGain();
    state.player.healthBlocks = 1;
    state.player.items = ['second_wind'];

    Game.startDuelFight(testPiece(), { audioContext: ctx, destination: dest });
    state.duel.tick(0, 100, 1);

    expect(state.duel.isIframeActive(0)).toBe(true);
    expect(state.duel.isIframeActive(Duel.IFRAME_DURATION_SEC + 1)).toBe(false);
  });

  it('only saves once per run -- a second fatal loss after Second Wind is spent ends the run for real', () => {
    const state = freshCombat('duel-secondwind-3');
    const ctx = new FakeAudioContext();
    const dest = new FakeGain();
    state.player.healthBlocks = 1;
    state.player.items = ['second_wind'];

    Game.startDuelFight(testPiece(), { audioContext: ctx, destination: dest });
    state.duel.tick(0, 100, 1); // first fatal loss -- Second Wind saves it
    expect(state.duel.isTerminal()).toBe(false);
    expect(state.player.usedSecondWind).toBe(true);

    state.duel.tick(state.duel.iframeUntil + 1, 100, 1); // past i-frames, forces the real second loss

    expect(state.duel.healthBlocks).toBe(0);
    expect(state.duel.isTerminal()).toBe(true);
    expect(state.duel.playerDefeated).toBe(true);
    expect(state.combatActive).toBe(false);
    expect(state.screen).toBe('GAME_OVER');
  });

  it('without the item, a fatal loss ends the run exactly as before (no regression)', () => {
    const state = freshCombat('duel-secondwind-4');
    const ctx = new FakeAudioContext();
    const dest = new FakeGain();
    state.player.healthBlocks = 1;
    state.player.items = [];

    Game.startDuelFight(testPiece(), { audioContext: ctx, destination: dest });
    state.duel.tick(0, 100, 1);

    expect(state.duel.playerDefeated).toBe(true);
    expect(state.combatActive).toBe(false);
    expect(state.screen).toBe('GAME_OVER');
  });
});

describe('Game.getLargoEnabled / setLargoEnabled -- the Largo accessibility assist', () => {
  // Largo is a persistent (localStorage-backed), module-level setting --
  // same shape as Game.getAudioSettings -- so tests restore it to whatever
  // they found, same "leave settings as found" convention
  // RunSidePanels.test.jsx's own music-mute test already established, to
  // avoid leaking state across test files that share the same jsdom module
  // instance.
  it('defaults off, persists across the setter, and can be toggled back off', () => {
    const original = Game.getLargoEnabled();
    try {
      Game.setLargoEnabled(true);
      expect(Game.getLargoEnabled()).toBe(true);
      Game.setLargoEnabled(false);
      expect(Game.getLargoEnabled()).toBe(false);
    } finally {
      Game.setLargoEnabled(original);
    }
  });

  it('applies live to an in-progress duel\'s sequencer via the real setTempoScale hook', () => {
    const state = freshCombat('duel-largo-1');
    const ctx = new FakeAudioContext();
    const dest = new FakeGain();
    const original = Game.getLargoEnabled();
    try {
      Game.setLargoEnabled(false);
      Game.startDuelFight(testPiece(), { audioContext: ctx, destination: dest });
      expect(state.duelSequencer.getTempoScale()).toBe(1);

      Game.setLargoEnabled(true);
      expect(state.duelSequencer.getTempoScale()).toBeLessThan(1); // slowed, not stopped

      Game.setLargoEnabled(false);
      expect(state.duelSequencer.getTempoScale()).toBe(1); // toggling back off restores normal pace mid-fight
    } finally {
      Game.setLargoEnabled(original);
    }
  });

  it('a fight that STARTS with Largo already on begins slow, not just toggled-slow mid-fight', () => {
    const state = freshCombat('duel-largo-2');
    const ctx = new FakeAudioContext();
    const dest = new FakeGain();
    const original = Game.getLargoEnabled();
    try {
      Game.setLargoEnabled(true);
      Game.startDuelFight(testPiece(), { audioContext: ctx, destination: dest });
      expect(state.duelSequencer.getTempoScale()).toBeLessThan(1);
    } finally {
      Game.setLargoEnabled(original);
    }
  });
});

describe('startCombat -- automatic duel-mode detection off a monster def\'s .piece', () => {
  let realAudioContext;
  let targetDef;
  let targetDefId;
  let originalPiece;

  // REGULAR ENEMIES ticket (real remaining scope (2)): this hardcoded
  // 'serpent' briefly (after 'slime' stopped being real-floor-drawable), but
  // a specific literal id is exactly the class of hazard this ticket's own
  // dom-check.js audit already fixed once (firstSafeDefId) -- nothing stops
  // a FUTURE run from wiring a real `.piece` onto 'serpent' itself (it's
  // normal-tier, the next tier this ticket's own "Next" note says to
  // duel-ify), which would silently make this test's own monkeypatch
  // overwrite a real piece instead of adding one, or throw if a duel-mode
  // 'serpent' can no longer be found un-`.piece`d. Pick the first def that's
  // BOTH still poolable (not retired) AND not already a real duel-mode
  // regular instead, so this test stays correct regardless of which specific
  // defs get duel-ified next.
  function firstPoolableNonDuelDefId() {
    var ids = Object.keys(Monsters.MONSTER_DEFS);
    for (var i = 0; i < ids.length; i++) {
      var def = Monsters.MONSTER_DEFS[ids[i]];
      if (!def.piece && !def.retiredFromPool) return ids[i];
    }
    return null;
  }

  beforeEach(() => {
    realAudioContext = window.AudioContext;
    window.AudioContext = FakeAudioContext;
    targetDefId = firstPoolableNonDuelDefId();
    targetDef = Monsters.MONSTER_DEFS[targetDefId];
    originalPiece = targetDef.piece;
  });

  afterEach(() => {
    window.AudioContext = realAudioContext;
    targetDef.piece = originalPiece;
  });

  it('a monster def with .piece starts a real duel fight instead of the turn-based loop', () => {
    targetDef.piece = testPiece();

    // Find a seed whose first available combat node is actually the target
    // def -- floor.js's monster-picking RNG isn't something this test
    // controls directly, so search a bounded range of seeds rather than
    // assert against whichever def a fixed seed happens to roll (which
    // could silently pass a broken wiring vacuously if it never rolled it).
    //
    // REGULAR ENEMIES ticket (normal tier's 100% cutover, this run): with
    // BOTH weak and normal tier now fully real/duel-mode (no poolable
    // non-`.piece` def left in either), firstPoolableNonDuelDefId() above
    // can only ever return a 'strong'-tier def (sentinel/warden/
    // spinesplinter) -- and floor.js's getAllowedTiers(1) is ['weak',
    // 'normal'] only, so a 'strong' def can NEVER appear on floor 1's own
    // start nodes, confirmed directly (a floor-1-only version of this same
    // search, run against this exact tree, found it in 0 of 40 seeds).
    // Floor 2 (getAllowedTiers -> +'strong') is the first floor that can
    // actually draw it, so search floor 1 first (covers the case where a
    // future run duel-ifies more of normal/weak's siblings and this picks
    // one of those instead) and fall back to a real Game._advanceFloor()
    // call to floor 2 for the same seed before giving up on it -- same
    // exposed, test-only `_advanceFloor` RunScreen.test.jsx already drives
    // directly for an identical "jump past floor 1" need.
    let state = null;
    for (let seed = 0; seed < 40; seed++) {
      const candidate = freshRun('duel-startcombat-seed-' + seed);
      const findTargetNode = () => {
        const available = Game._availableNodeIds();
        const id = available.find((nodeId) => {
          const node = candidate.floor.nodes.find((n) => n.id === nodeId);
          return node && node.type === 'combat' && node.defId === targetDefId;
        });
        return id || null;
      };
      let targetNodeId = findTargetNode();
      if (!targetNodeId) {
        Game._advanceFloor();
        targetNodeId = findTargetNode();
      }
      if (targetNodeId) {
        Game.enterCurrentNode(targetNodeId);
        state = candidate;
        break;
      }
    }
    if (!state) throw new Error('no seed in the first 40 rolled an available ' + targetDefId + ' combat node on floor 1 or 2 -- widen the search range');

    expect(state.monster.defId).toBe(targetDefId);
    expect(state.monster.duel).toBe(true);
    expect(state.duel).toBeTruthy();
    expect(state.duelSequencer.isPlaying).toBe(true);
  });

  it('a monster def without .piece still starts the ordinary turn-based fight (true no-op, the real production state today)', () => {
    const state = freshCombat('duel-startcombat-2');
    expect(state.monster.duel).toBeFalsy();
    expect(state.duel).toBeFalsy();
  });
});
