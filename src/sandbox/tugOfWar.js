// TUG OF WAR -- the sandbox's own combat model.
//
// This deliberately does NOT use js/wordbound/duel.js. The duel-gauge fight in
// the shipped game is a different mechanic; this file is the reimagined one and
// lives entirely inside src/sandbox/ so tuning it never touches engine code the
// real app depends on.
//
// THE SHAPE OF THE FIGHT
//   A rope marker sits at ROPE_START on a 0..100 track. Reaching 100 is a
//   player win, reaching 0 is a loss.
//   WORDS  -- every word the player spells becomes a PUSHER: a permanent
//             little engine that shoves the rope right forever. Pushers stack,
//             so the player's force grows monotonically as the fight goes on.
//   SONG   -- the enemy gets a constant drone proportional to the piece's live
//             intensity, plus telegraphed BURST ATTACKS that land as an
//             instant shove left AND chip strength off the pusher pool
//             (weakest first). Bursts are how a song "overwhelms the words
//             team's offenses" before the pool has time to compound.
//   dB     -- a hidden loudness ramp. Enemy force is multiplied by
//             10^(db/20); db climbs at DB_RATE per second up to DB_MAX. That
//             is the timer: the song gets louder whether or not the player is
//             keeping up.
//   PREP   -- the first PREP_SEC seconds are free. The rope is frozen and no
//             attacks are scheduled, so the player can bank a starting pool.
//
// The intended curve: song wins the short-to-mid game on burst damage, words
// win the long game once the pool out-scales the capped dB ramp.
(function () {
  window.Wordbound = window.Wordbound || {};
  var Sandbox = (window.Wordbound.Sandbox = window.Wordbound.Sandbox || {});

  var DEFAULTS = {
    PREP_SEC: 5,
    ROPE_START: 50,

    // Word -> pusher strength.
    WORD_VALUE_WEIGHT: 1.0,   // x sum of Scrabble letter values
    WORD_LENGTH_WEIGHT: 1.0,  // x length ^ WORD_LENGTH_EXP
    WORD_LENGTH_EXP: 1.8,
    PLAYER_FORCE_SCALE: 0.025,// rope units/sec per point of pool strength
    PUSHER_RAMP_SEC: 8,       // a fresh word takes this long to reach full push

    // Song -> enemy force.
    ENEMY_DRONE: 1.6,         // rope units/sec at intensity 1.0, 0 dB
    ATTACK_INTERVAL_BASE: 5.0,// seconds, divided by (0.5 + intensity)
    ATTACK_POWER_BASE: 7,
    ATTACK_TRAVEL_SEC: 1.6,   // telegraph lead for cadence attacks
    ATTACK_IMPULSE_SCALE: 0.5,// rope units shoved left per point of power
    ATTACK_CHIP_FACTOR: 0.35, // pool strength destroyed per point of power
    CRESCENDO_POWER_MULT: 2.5,

    DB_RATE: 0.08,            // dB per second
    DB_MAX: 12                // ~4x power, then it stops climbing
  };

  Sandbox.TUG_DEFAULTS = DEFAULTS;

  Sandbox.createTug = function (options) {
    options = options || {};
    var tune = {};
    Object.keys(DEFAULTS).forEach(function (k) { tune[k] = DEFAULTS[k]; });
    if (options.tune) {
      Object.keys(options.tune).forEach(function (k) { tune[k] = options.tune[k]; });
    }

    var listeners = {};
    var nextId = 1;

    var tug = {
      tune: tune,
      phase: 'prep',          // prep | fight | won | lost
      rope: tune.ROPE_START,
      pushers: [],
      attacks: [],
      elapsed: 0,
      fightElapsed: 0,
      db: 0,
      intensity: 0,
      smoothIntensity: 0,
      lastHitAt: -99,
      nextAttackAt: 0,
      startedAt: 0
    };

    function emit(event, payload) {
      var cbs = listeners[event];
      if (!cbs) return;
      for (var i = 0; i < cbs.length; i++) cbs[i](payload);
    }

    tug.on = function (event, cb) {
      (listeners[event] = listeners[event] || []).push(cb);
      return tug;
    };

    tug.dbMultiplier = function () {
      return Math.pow(10, tug.db / 20);
    };

    tug.poolStrength = function () {
      var total = 0;
      for (var i = 0; i < tug.pushers.length; i++) total += tug.pushers[i].hp;
      return total;
    };

    // A word does not push at full weight the instant it is spelled -- it
    // ramps in over PUSHER_RAMP_SEC. This is the mechanical statement of
    // "words build up over time": a burst of panic-spelling cannot save a
    // rope that is already at the edge, but a pool laid down early compounds.
    tug.pusherRamp = function (pusher) {
      if (tug.tune.PUSHER_RAMP_SEC <= 0) return 1;
      return Math.min(1, (tug.elapsed - pusher.bornAt) / tug.tune.PUSHER_RAMP_SEC);
    };

    tug.playerForce = function () {
      var total = 0;
      for (var i = 0; i < tug.pushers.length; i++) {
        total += tug.pushers[i].hp * tug.pusherRamp(tug.pushers[i]);
      }
      return total * tug.tune.PLAYER_FORCE_SCALE;
    };

    tug.enemyForce = function () {
      if (tug.phase !== 'fight') return 0;
      return tug.smoothIntensity * tug.tune.ENEMY_DRONE * tug.dbMultiplier();
    };

    tug.wordStrength = function (word) {
      var values = window.Wordbound.Lexicon.LETTER_VALUES;
      var sum = 0;
      var upper = String(word || '').toUpperCase();
      for (var i = 0; i < upper.length; i++) sum += values[upper[i]] || 0;
      return tug.tune.WORD_VALUE_WEIGHT * sum
        + tug.tune.WORD_LENGTH_WEIGHT * Math.pow(upper.length, tug.tune.WORD_LENGTH_EXP);
    };

    tug.start = function (now) {
      tug.startedAt = now;
      tug.phase = 'prep';
      tug.rope = tug.tune.ROPE_START;
      tug.elapsed = 0;
      tug.fightElapsed = 0;
      tug.db = 0;
      return tug;
    };

    // A played word becomes a permanent pusher. hp doubles as its live force
    // contribution, so chip damage from a burst literally quiets the word.
    tug.addWord = function (word) {
      var strength = tug.wordStrength(word);
      var pusher = {
        id: nextId++,
        word: String(word || '').toUpperCase(),
        strength: strength,
        hp: strength,
        bornAt: tug.elapsed
      };
      tug.pushers.push(pusher);
      emit('pusher-added', pusher);
      return pusher;
    };

    tug.spawnAttack = function (power, landAt, kind, now) {
      var attack = {
        id: nextId++,
        power: power,
        kind: kind || 'beat',
        spawnAt: now,
        landAt: landAt
      };
      tug.attacks.push(attack);
      emit('attack-telegraphed', attack);
      return attack;
    };

    function chipPool(amount) {
      // Weakest first: a burst silences the small words and leaves the big
      // ones standing (wounded), which is what makes long words worth holding
      // the rack for.
      var remaining = amount;
      var order = tug.pushers.slice().sort(function (a, b) { return a.hp - b.hp; });
      for (var i = 0; i < order.length && remaining > 0; i++) {
        var p = order[i];
        var take = Math.min(p.hp, remaining);
        p.hp -= take;
        remaining -= take;
      }
      var survivors = [];
      for (var j = 0; j < tug.pushers.length; j++) {
        if (tug.pushers[j].hp > 0.01) survivors.push(tug.pushers[j]);
        else emit('pusher-lost', tug.pushers[j]);
      }
      tug.pushers = survivors;
    }

    function land(attack, now) {
      tug.rope -= attack.power * tug.tune.ATTACK_IMPULSE_SCALE;
      chipPool(attack.power * tug.tune.ATTACK_CHIP_FACTOR);
      tug.lastHitAt = now;
      emit('attack-landed', attack);
    }

    function scheduleNext(now) {
      var interval = tug.tune.ATTACK_INTERVAL_BASE / (0.5 + tug.smoothIntensity);
      tug.nextAttackAt = now + Math.max(0.6, interval);
    }

    // A crescendo is the one thing the song telegraphs honestly: the sequencer
    // fires 'crescendo-approaching' well before the peak, so the burst can be
    // spawned to land exactly on the beat the music hits hardest.
    tug.telegraphCrescendo = function (peakTime, now) {
      if (tug.phase !== 'fight') return null;
      var lead = Math.max(0.4, peakTime - now);
      var power = tug.tune.ATTACK_POWER_BASE
        * (0.4 + tug.smoothIntensity)
        * tug.tune.CRESCENDO_POWER_MULT
        * tug.dbMultiplier();
      return tug.spawnAttack(power, now + lead, 'crescendo', now);
    };

    tug.isTerminal = function () {
      return tug.phase === 'won' || tug.phase === 'lost';
    };

    tug.tick = function (now, dt, intensity) {
      if (tug.isTerminal()) return;
      dt = Math.max(0, Math.min(dt, 0.25)); // a tab-switch must not teleport the rope
      tug.elapsed += dt;
      tug.intensity = intensity;
      // Smoothed so a single quiet rest between chords doesn't zero the song.
      var k = Math.min(1, dt * 2.5);
      tug.smoothIntensity += (intensity - tug.smoothIntensity) * k;

      if (tug.phase === 'prep') {
        if (tug.elapsed >= tug.tune.PREP_SEC) {
          tug.phase = 'fight';
          scheduleNext(now);
          emit('fight-start', null);
        }
        return;
      }

      tug.fightElapsed += dt;
      tug.db = Math.min(tug.tune.DB_MAX, tug.tune.DB_RATE * tug.fightElapsed);

      if (now >= tug.nextAttackAt) {
        var power = tug.tune.ATTACK_POWER_BASE
          * (0.4 + tug.smoothIntensity)
          * tug.dbMultiplier();
        tug.spawnAttack(power, now + tug.tune.ATTACK_TRAVEL_SEC, 'beat', now);
        scheduleNext(now);
      }

      var pending = [];
      for (var i = 0; i < tug.attacks.length; i++) {
        if (now >= tug.attacks[i].landAt) land(tug.attacks[i], now);
        else pending.push(tug.attacks[i]);
      }
      tug.attacks = pending;

      tug.rope += (tug.playerForce() - tug.enemyForce()) * dt;

      if (tug.rope >= 100) {
        tug.rope = 100;
        tug.phase = 'won';
        emit('won', null);
      } else if (tug.rope <= 0) {
        tug.rope = 0;
        tug.phase = 'lost';
        emit('lost', null);
      }
    };

    return tug;
  };
})();
