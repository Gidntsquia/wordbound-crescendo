// js/wordbound/duelCombat.js
// DUEL-GAUGE COMBAT ticket (GOALS.md): the integration bridge between
// js/wordbound/combat.js (scoring: tiles, length, weaknesses, combo,
// overcharge -- the "full scrabble system" the ticket's WORD PUSH bullet
// calls for) and js/wordbound/duel.js (the tug-of-war gauge engine). Neither
// of those files knows about the other; this is deliberately the ONLY place
// that does, so a future run wiring this into game.js/CombatScreen.jsx has
// one small surface to call instead of re-deriving the bridge logic.
//
// THIS RUN'S SCOPE: the bridge itself, verified with mocked-clock unit tests
// driving the real Combat.playWord + Duel.create (no mocks of either), per
// this ticket's own established "engine-first, isolated, tested slice"
// pattern (same shape as duel.js's and music.js's own closing notes). NOT
// wired into game.js/CombatScreen.jsx/Game.submitWord this run -- see
// PROGRESS.md for why: no monster in js/wordbound/monsters.js carries a
// stageTier/piece yet (that's REGULAR ENEMIES' + the boss-piece-assignment
// work's job, both still open queue items), and Game.submitWord's turn-based
// path (ink spend, Overcharge, item onWordPlayed hooks, Intents, combo/rack
// cycling) is the ONLY complete way to play the game today -- swapping its
// damage resolution for the gauge is a real cutover that needs to happen
// atomically with retiring the ink<=0 death path and the Intents system (see
// the INTENTS DECISION note below), not smuggled in as a side effect of
// building the bridge. Flipping that switch is real remaining scope, still
// open.
//
// PUBLIC API (window.Wordbound.DuelCombat):
//   submitWord(player, monster, duel, word, comboState, now, options)
//     -> null for an unformable/invalid word (identical contract to
//        Combat.playWord -- caller shows the same "not playable" message).
//        On success: Combat.playWord's own result object (word, tilesUsed,
//        score, holdMult, activeTraitId, multiplier, comboMultiplier,
//        comboAtPlay, isRepeat, overcharged, damage) PLUS:
//          parried     -- true if this word landed in the parry window
//                          (duel.attemptParry(now), called before the push
//                          so a parry never blocks its own word's push)
//          duelPush    -- duel.applyPlayerPush(now, result.damage)'s own
//                          return value: { pushed, gauge, pushWon, defeated }
//          monsterDied -- recomputed against monster.hp AFTER any decisive
//                          blow (Combat.playWord's own monsterDied is always
//                          false here since { skipDamage: true } is forced
//                          on internally -- gauge combat decides death on a
//                          WON PUSH, never on a single word's raw damage)
//        `now` is the shared duel/music clock (e.g. the sequencer's
//        ctx.currentTime) -- pass the SAME clock this fight's
//        duel.tick()/registerCrescendoPeak() calls use, or parry timing and
//        the push itself land on different clocks. `options` forwards
//        straight to Combat.playWord (e.g. { overcharge: true }); skipDamage
//        is always forced to true regardless of what's passed in.
//   syncHealthBlocks(player, duel)
//     -> wires duel's 'block-lost' event to keep player.healthBlocks live in
//        sync (not just read once at fight end), per the ink-audit decision
//        (GOALS.md, 2026-08-22 note): healthBlocks is Duel-based fights' real
//        HP, persisted across fights the same way ink is today. Returns duel
//        for chaining. Caller still owns creating the fight's Duel instance
//        with `Duel.create({ healthBlocks: player.healthBlocks, ... })` and
//        deciding what 'player-defeated' does (game-over, same as the
//        current ink<=0 checks) -- this only keeps the field itself honest.
//
// WINNING A PUSH -- decisive-blow structure (the ticket's own "implementing
// run's call on exact structure, document it"): a won push deals
// ceil(monster.maxHp / duel.pushesToDefeat) damage. pushesToDefeat=1 (a
// regular, Duel.create's own default) means that IS monster.maxHp -- "regulars
// die in one won push" (ticket text) exactly, no rounding edge case since
// ceil(maxHp/1)=maxHp. pushesToDefeat=N>1 (a boss) splits maxHp across N
// pushes, ceil-rounded so N pushes are always lethal even against an
// odd/non-divisible maxHp (e.g. maxHp=52, pushesToDefeat=3 -> 18/push,
// 3*18=54 >= 52, clamped to 0 by the max(0, ...) below) while N-1 pushes are
// never quite lethal (2*18=36 < 52) -- "bosses take several" satisfied
// exactly, and phase-shifting (traitPhases keyed on hp ratio, see combat.js's
// activeTraitForHpRatio call) falls out for free: the next word played after
// a won push reads the monster's now-lower hp, same mechanism the turn-based
// game already uses for boss phase transitions today.
(function () {
  window.Wordbound = window.Wordbound || {};
  var DuelCombat = (window.Wordbound.DuelCombat = {});

  function decisiveBlow(monster, duel) {
    var perPush = Math.ceil(monster.maxHp / duel.pushesToDefeat);
    monster.hp = Math.max(0, monster.hp - perPush);
  }

  DuelCombat.submitWord = function (player, monster, duel, word, comboState, now, options) {
    var Combat = window.Wordbound.Combat;
    var playOptions = Object.assign({}, options, { skipDamage: true });
    var result = Combat.playWord(player, monster, word, comboState, playOptions);
    if (!result) return null;

    // Parry is attempted BEFORE the push resolves, per duel.js's own header
    // comment ("attemptParry does NOT itself apply the parrying word's push")
    // -- a successful parry activates its damping window immediately, but
    // duel.applyPlayerPush only ever adds push toward the enemy end, so
    // ordering here can't affect the push amount either way; this order just
    // matches the natural "does this word land the parry, THEN what does it
    // do" read.
    var parried = duel.attemptParry(now);
    var duelPush = duel.applyPlayerPush(now, result.damage);
    if (duelPush.pushWon) decisiveBlow(monster, duel);

    return Object.assign({}, result, {
      parried: parried,
      duelPush: duelPush,
      monsterDied: monster.hp <= 0
    });
  };

  DuelCombat.syncHealthBlocks = function (player, duel) {
    duel.on('block-lost', function (payload) {
      player.healthBlocks = payload.healthBlocks;
    });
    return duel;
  };
})();
