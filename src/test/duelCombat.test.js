// DUEL-GAUGE COMBAT ticket (GOALS.md): unit tests for
// js/wordbound/duelCombat.js, the bridge between Combat.playWord (scoring)
// and Duel (the gauge). Drives the REAL Combat.playWord + Duel.create + real
// Tiles/Lexicon word formation -- no mocks of either engine module, same
// "drive the real engine" convention every other test in this repo follows.
// Only the duel/music clock (`now`) is a mocked plain number, per duel.js's
// own test file's approach -- neither engine has an internal scheduler here,
// so there's no real timer to fake.

import { describe, it, expect } from 'vitest';

const Combat = window.Wordbound.Combat;
const Duel = window.Wordbound.Duel;
const DuelCombat = window.Wordbound.DuelCombat;
const Tiles = window.Wordbound.Tiles;

function rackFor(letters) {
  return letters.split('').map((l) => Tiles.createTile(l, null));
}

function freshPlayer(rack) {
  return { rack, ink: 20, healthBlocks: 5, maxHealthBlocks: 5 };
}

function freshMonster(overrides) {
  return Object.assign(
    { name: 'Test Monster', maxHp: 40, hp: 40, attack: 2, traitPhases: [{ hpThreshold: 1.0, traitId: 'plain' }] },
    overrides
  );
}

describe('DuelCombat.submitWord', () => {
  it('returns null for an unplayable word without mutating the duel or monster', () => {
    const player = freshPlayer(rackFor('QQQZZ'));
    const monster = freshMonster();
    const duel = Duel.create({ stageTier: 'early' });

    const result = DuelCombat.submitWord(player, monster, duel, 'ZZZZZ', null, 0, {});
    expect(result).toBeNull();
    expect(duel.gauge).toBe(Duel.GAUGE_CENTER);
    expect(monster.hp).toBe(40);
  });

  it('a valid word pushes the gauge by its real score and never touches monster.hp directly', () => {
    const player = freshPlayer(rackFor('CATSX'));
    const monster = freshMonster();
    const duel = Duel.create({ stageTier: 'early' });

    const result = DuelCombat.submitWord(player, monster, duel, 'CATS', null, 0, {});
    expect(result).not.toBeNull();
    expect(result.damage).toBeGreaterThan(0);
    // Word score = full scrabble system (combat.js), NOT a copy computed here.
    expect(duel.gauge).toBeCloseTo(Duel.GAUGE_CENTER + result.damage * Duel.WORD_PUSH_SCALE, 6);
    expect(monster.hp).toBe(40); // a single mid-value word doesn't win the push
    expect(result.monsterDied).toBe(false);
    // Tiles actually spent -- skipDamage doesn't also skip rack mutation.
    expect(player.rack.map((t) => t.letter)).toEqual(['X']);
  });

  it('a won push deals a decisive blow of ceil(maxHp / pushesToDefeat), killing a 1-push regular outright', () => {
    const player = freshPlayer(rackFor('QUARTZ')); // deliberately huge score to guarantee a push win
    const monster = freshMonster({ maxHp: 30, hp: 30 });
    const duel = Duel.create({ stageTier: 'early', pushesToDefeat: 1 });
    duel.gauge = Duel.GAUGE_MAX - 1; // one point from winning, isolates this test from scoring magnitude

    const result = DuelCombat.submitWord(player, monster, duel, 'QUARTZ', null, 0, {});
    expect(result.duelPush.pushWon).toBe(true);
    expect(monster.hp).toBe(0); // ceil(30/1) = 30, the monster's full maxHp
    expect(result.monsterDied).toBe(true);
  });

  it('a boss with pushesToDefeat=3 survives two won pushes and dies on the third', () => {
    const player = freshPlayer(rackFor('CAT'));
    const monster = freshMonster({ maxHp: 52, hp: 52 });
    const duel = Duel.create({ stageTier: 'early', pushesToDefeat: 3 });
    const perPush = Math.ceil(52 / 3); // 18

    duel.gauge = Duel.GAUGE_MAX - 1;
    let result = DuelCombat.submitWord(player, monster, duel, 'CAT', null, 0, {});
    expect(result.duelPush.pushWon).toBe(true);
    expect(monster.hp).toBe(52 - perPush);
    expect(result.monsterDied).toBe(false);

    player.rack = rackFor('CAT');
    duel.gauge = Duel.GAUGE_MAX - 1;
    result = DuelCombat.submitWord(player, monster, duel, 'CAT', null, 1, {});
    expect(monster.hp).toBe(52 - perPush * 2);
    expect(result.monsterDied).toBe(false);

    player.rack = rackFor('CAT');
    duel.gauge = Duel.GAUGE_MAX - 1;
    result = DuelCombat.submitWord(player, monster, duel, 'CAT', null, 2, {});
    expect(monster.hp).toBe(0); // clamped: 52 - 18*3 = -2
    expect(result.monsterDied).toBe(true);
  });

  it('a word landed inside the parry window reports parried:true and still pushes normally', () => {
    const player = freshPlayer(rackFor('CATS'));
    const monster = freshMonster();
    const duel = Duel.create({ stageTier: 'early' });
    duel.registerCrescendoPeak(10);

    const result = DuelCombat.submitWord(player, monster, duel, 'CATS', null, 10.1, {});
    expect(result.parried).toBe(true);
    expect(duel.gauge).toBeGreaterThan(Duel.GAUGE_CENTER); // the push itself still applied
  });

  it('a word landed outside the parry window reports parried:false', () => {
    const player = freshPlayer(rackFor('CATS'));
    const monster = freshMonster();
    const duel = Duel.create({ stageTier: 'early' });
    duel.registerCrescendoPeak(10);

    const result = DuelCombat.submitWord(player, monster, duel, 'CATS', null, 11, {});
    expect(result.parried).toBe(false);
  });

  it('honors comboState the same way Combat.playWord always has (repeat tracking live, combo streak disabled per PLAYTEST FINDINGS 3 item 6)', () => {
    const player = freshPlayer(rackFor('CATSCAT'));
    const monster = freshMonster();
    const duel = Duel.create({ stageTier: 'early' });
    const comboState = { combo: 0, usedWords: new Set() };

    DuelCombat.submitWord(player, monster, duel, 'CAT', comboState, 0, {});
    expect(comboState.combo).toBe(0);
    expect(comboState.usedWords.has('CAT')).toBe(true);
  });
});

describe('DuelCombat.syncHealthBlocks', () => {
  it('keeps player.healthBlocks live in sync on every block loss, not just at fight end', () => {
    const player = freshPlayer(rackFor('CAT'));
    const duel = Duel.create({ stageTier: 'final', healthBlocks: 5 });
    DuelCombat.syncHealthBlocks(player, duel);

    duel.tick(0, 100, 1); // a huge dt at max intensity forces at least one block loss
    expect(player.healthBlocks).toBe(duel.healthBlocks);
    expect(player.healthBlocks).toBeLessThan(5);
  });

  it('does not touch player.healthBlocks before any block is lost', () => {
    const player = freshPlayer(rackFor('CAT'));
    const duel = Duel.create({ stageTier: 'early', healthBlocks: 5 });
    DuelCombat.syncHealthBlocks(player, duel);

    duel.tick(0, 0.01, 0);
    expect(player.healthBlocks).toBe(5);
  });
});
