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
//             EVERY BURST IS A CRESCENDO THE PIECE ACTUALLY PLAYS. There is
//             no attack timer running alongside the music -- the song swings
//             when it swells and at no other time -- and a burst's power is
//             the SIZE of that crescendo, so a small swell is a small hit.
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
    PREP_SEC: 3,
    ROPE_START: 50,

    // Word -> pusher strength.
    WORD_VALUE_WEIGHT: 1.0,   // x sum of Scrabble letter values
    WORD_LENGTH_WEIGHT: 1.0,  // x length ^ WORD_LENGTH_EXP
    WORD_LENGTH_EXP: 1.8,
    PLAYER_FORCE_SCALE: 0.025,// rope units/sec per point of pool strength
    PUSHER_RAMP_SEC: 8,       // a fresh word takes this long to reach full push
    // ...and then it wears off. A word holds full push for LIFE_BASE plus
    // LIFE_PER_LETTER per letter, then bleeds out over FADE_SEC. Long words
    // are the ones worth holding the rack for: they take the same time to
    // ramp in but stay standing far longer.
    PUSHER_LIFE_BASE: 8,      // seconds of full push before any word starts to go
    PUSHER_LIFE_PER_LETTER: 4,// extra seconds of life per letter
    PUSHER_FADE_SEC: 6,       // seconds from start of fade to silent

    // Song -> enemy force.
    ENEMY_DRONE: 1.6,         // rope units/sec at intensity 1.0, 0 dB

    // BURST POWER IS CRESCENDO SIZE. The analyser hands every surge a `mag`
    // of 0..1 -- how big a swell it is within its own piece -- and power is
    // read straight off it. Live intensity deliberately does NOT enter here:
    // the player has to be able to look at an incoming note and know what it
    // will do, and that only works if its size is settled when it spawns.
    ATTACK_POWER_BASE: 7,
    CRESCENDO_MIN_MULT: 0.5,  // multiplier for the smallest swell in a piece...
    CRESCENDO_MAX_MULT: 2.6,  // ...and for the biggest, in the opening bars.
    // Difficulty escalates by making the BIG swells bigger, not by adding more
    // small ones. Time stretches the MIN..MAX span upward from its floor, so a
    // mag-0 swell hits the same at three minutes as it did at ten seconds
    // while a mag-1 swell grows the whole amount. One size ladder, learned
    // once, that stays honest -- the top of it just keeps climbing.
    //
    // This is keyed on FIGHT time, not song position, so looping the recording
    // no longer drops the fight back to its opening difficulty.
    ESCALATION_PER_MIN: 0.55, // extra spans per minute of fighting
    ESCALATION_MAX: 2.2,      // ...and the ceiling on that stretch

    // THE SWARM. The analyser bakes EVERY swell it can find, down to little
    // phrase peaks and beat drops. This gate decides how much of that list is
    // allowed to swing right now: in the opening bars only the main crescendos
    // do, and as the fight runs the bar drops until the whole list is live and
    // the song is swarming.
    //
    // Density escalates here, power escalates in crescendoPower, and the floor
    // stays pinned -- so the swarm arrives without ever costing the main
    // crescendos their status. A late small hit is still a 1.4-rope nudge; a
    // late big one is still a 14-rope slam and still four times the size on
    // screen. More things to watch, same thing to be afraid of.
    ATTACK_GATE_START: 0.62,  // opening bars: only swells this big attack...
    ATTACK_GATE_END: 0,       // ...and eventually every one of them does
    ATTACK_GATE_SEC: 70,      // seconds of fighting to open it all the way

    // Silence fallback. A sparsely-marked SEQUENCED piece can run a long way
    // with no crescendo written into it at all, and a song that never swings
    // is not a fight. If nothing has telegraphed for this long the pit takes
    // a swing on its own, sized off live intensity. Set clear of the recording's
    // longest genuinely quiet stretch (11 s) so the piece being tuned never
    // triggers it -- a stray swing in a passage the music is resting through is
    // exactly the out-of-sync hit this rewrite was meant to remove.
    CADENCE_SILENCE_SEC: 13,
    ATTACK_TRAVEL_SEC: 4,     // flight time for a fallback swing (see LEAD_SEC)
    // Fewer, bigger hits. Dropping the attack clock cut burst pressure to about
    // a third of what a cadence timer was pushing out, so each surviving hit
    // carries more -- which is the point: one readable hit you can see coming
    // beats four you cannot tell apart.
    // Set against the FULL swarm, not the opening: at the end of the gate the
    // song is landing ~40 hits a minute, so per-hit numbers that felt right at
    // 14 a minute would simply delete the player.
    ATTACK_IMPULSE_SCALE: 0.4,// rope units shoved left per point of power
    ATTACK_CHIP_FACTOR: 0.5,  // pool strength destroyed per point of power

    DB_RATE: 0.08,            // dB per second
    DB_MAX: 12,               // ~4x power, then it stops climbing

    // ENDLESS RECENTRE. Observation mode declares no win and no loss, so the
    // rope has nothing to bounce off: a fight that gets away from either side
    // ends up parked against an end and sits there, which is the one state
    // you cannot watch anything from. While Endless is on the barline is put
    // back to ROPE_START every ENDLESS_RECENTRE_SEC, and immediately if it
    // does reach an end. ONLY the rope moves -- pushers, dB and the
    // escalation clock keep running -- so what resumes is this fight as it
    // stands now, replayed from even ground.
    ENDLESS_RECENTRE_SEC: 6
  };

  Sandbox.TUG_DEFAULTS = DEFAULTS;

  // The intensity band every piece in the sandbox is normalised into -- the
  // sequenced pieces occupy it by hand and the analyser maps the recording
  // onto it, which is what lets one difficulty model read both.
  var INT_FLOOR = 0.12;
  var INT_CEIL = 0.70;

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

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
      // OBSERVATION MODE. Neither side can be finished off: no 'won'/'lost'
      // is ever declared, and instead of pinning at the ends the rope is put
      // back to the centre -- on a clock, and at once if it reaches an end
      // (see ENDLESS_RECENTRE_SEC). It exists to watch a fight for as long as
      // you like -- the song's whole attack pattern, a word's ramp-in and
      // wear-off -- without the round ending underneath you, and without it
      // parking in a corner where nothing is left to see. Live-togglable
      // mid-fight.
      invincible: false,
      rope: tune.ROPE_START,
      pushers: [],
      attacks: [],
      elapsed: 0,
      fightElapsed: 0,
      db: 0,
      intensity: 0,
      smoothIntensity: 0,
      lastHitAt: -99,
      lastTelegraphAt: 0,
      // Endless recentring, both in `elapsed` seconds: the clock this counts
      // from, and when the last one actually happened (for the UI's flash).
      recentreAnchor: 0,
      lastRecentreAt: -99,
      startedAt: 0
    };

    // Whether the previous tick was in observation mode, so the recentre clock
    // can start when Endless does rather than when the fight did.
    var wasInvincible = tug.invincible;

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

    // How long this word holds before it starts to fade. Length is the whole
    // story -- a 3-letter word gets 20s, a 7-letter word 36s.
    tug.pusherLife = function (pusher) {
      return tug.tune.PUSHER_LIFE_BASE
        + tug.tune.PUSHER_LIFE_PER_LETTER * pusher.word.length;
    };

    // 1 while the word still holds, sliding to 0 across PUSHER_FADE_SEC once
    // its life is spent. Reported separately from hp so the UI can show a word
    // going quiet without pretending it was chipped by an attack.
    tug.pusherFade = function (pusher) {
      var over = (tug.elapsed - pusher.bornAt) - tug.pusherLife(pusher);
      if (over <= 0) return 1;
      var fade = tug.tune.PUSHER_FADE_SEC;
      if (fade <= 0) return 0;
      return Math.max(0, 1 - over / fade);
    };

    // Wearing off is applied to hp itself, not layered on top as another
    // multiplier, so pool strength, chip-damage ordering and push force all
    // stay consistent with one another without each needing to remember it.
    function wearOff(dt) {
      if (!tug.pushers.length) return;
      var survivors = [];
      for (var i = 0; i < tug.pushers.length; i++) {
        var p = tug.pushers[i];
        var over = (tug.elapsed - p.bornAt) - tug.pusherLife(p);
        if (over > 0) {
          var fade = Math.max(0.1, tug.tune.PUSHER_FADE_SEC);
          // Rate is scaled by the word's ORIGINAL strength so fading always
          // takes PUSHER_FADE_SEC, whether the word is big or small.
          p.hp -= (p.strength / fade) * dt;
          p.fading = true;
        }
        if (p.hp > 0.01) survivors.push(p);
        else emit('pusher-spent', p);
      }
      tug.pushers = survivors;
    }

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
      tug.lastTelegraphAt = now;
      tug.recentreAnchor = 0;
      tug.lastRecentreAt = -99;
      wasInvincible = tug.invincible;
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
        bornAt: tug.elapsed,
        fading: false
      };
      tug.pushers.push(pusher);
      emit('pusher-added', pusher);
      return pusher;
    };

    tug.spawnAttack = function (power, landAt, kind, now, mag) {
      var attack = {
        id: nextId++,
        power: power,
        // 0..1, the size of the swell behind this hit. The UI draws the
        // notehead from `power`, so what is sliding across the staff is
        // literally how hard it is about to land.
        mag: mag != null ? mag : 0.5,
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

    // Put the barline back on the centre line and restart the recentre clock.
    // ROPE_START is read live, so the tuning panel's "Barline starts at" is
    // what centre means here too. `reason` is 'cycle' when the clock came
    // round, 'top'/'bottom' when the rope reached an end.
    function recentre(reason) {
      var from = tug.rope;
      tug.rope = tug.tune.ROPE_START;
      tug.recentreAnchor = tug.elapsed;
      tug.lastRecentreAt = tug.elapsed;
      emit('rope-recentred', { reason: reason, from: from });
    }

    // How big a swell is, on 0..1, from whatever the piece told us about it.
    // A RECORDING's surge carries `mag` outright (tools/analyze-audio-piece.js
    // percentile-ranks every swell it found against the others in that same
    // recording). A SEQUENCED piece only declares peakIntensity, so its swells
    // are ranked against the intensity band instead.
    tug.crescendoMagnitude = function (surge) {
      if (!surge) return 0.5;
      if (surge.mag != null) return clamp01(surge.mag);
      if (surge.peakIntensity == null) return 0.5;
      return clamp01((surge.peakIntensity - INT_FLOOR) / (INT_CEIL - INT_FLOOR));
    };

    // How small a swell is allowed to swing right now. Falls over the fight.
    tug.attackGate = function () {
      var t = clamp01(tug.fightElapsed / Math.max(0.1, tug.tune.ATTACK_GATE_SEC));
      return tug.tune.ATTACK_GATE_START
        + (tug.tune.ATTACK_GATE_END - tug.tune.ATTACK_GATE_START) * t;
    };

    // How far the MIN..MAX span has stretched by now. 1 in the opening bars.
    tug.escalation = function () {
      return Math.min(tug.tune.ESCALATION_MAX,
        1 + tug.tune.ESCALATION_PER_MIN * (tug.fightElapsed / 60));
    };

    // The whole difficulty curve in one line: the floor never moves, the
    // ceiling climbs, and a swell's own size says where between them it lands.
    tug.crescendoPower = function (mag) {
      var span = (tug.tune.CRESCENDO_MAX_MULT - tug.tune.CRESCENDO_MIN_MULT)
        * tug.escalation();
      return tug.tune.ATTACK_POWER_BASE
        * (tug.tune.CRESCENDO_MIN_MULT + span * clamp01(mag));
    };

    // A crescendo is the one thing the song telegraphs honestly: the piece
    // fires 'crescendo-approaching' well before the peak, so the burst can be
    // spawned to land exactly on the beat the music hits hardest. `surge` is
    // that payload, and it is what decides how big the hit is.
    tug.telegraphCrescendo = function (peakTime, now, surge) {
      if (tug.phase !== 'fight') return null;
      var lead = Math.max(0.4, peakTime - now);
      var mag = tug.crescendoMagnitude(surge);
      // Counts as the song having spoken even when the swell is too small to
      // swing, so a gated-out stretch never trips the silence fallback -- a
      // stray off-music swing is the exact thing this model exists to avoid.
      tug.lastTelegraphAt = now;
      // The gate only applies to an ANALYSED list, which is dense and needs
      // curating. A sequenced piece hand-writes a handful of crescendos and
      // every one of them is meant to land.
      if (surge && surge.mag != null && mag < tug.attackGate()) return null;
      return tug.spawnAttack(tug.crescendoPower(mag), now + lead, 'crescendo', now, mag);
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

      // Flipping Endless on at three minutes must not snap the rope on the
      // very next frame, so the clock starts from the toggle.
      if (tug.invincible !== wasInvincible) {
        wasInvincible = tug.invincible;
        tug.recentreAnchor = tug.elapsed;
      }

      if (tug.phase === 'prep') {
        if (tug.elapsed >= tug.tune.PREP_SEC) {
          tug.phase = 'fight';
          tug.lastTelegraphAt = now;
          // The rope is frozen through the tacet; the clock starts with the pit.
          tug.recentreAnchor = tug.elapsed;
          emit('fight-start', null);
        }
        return;
      }

      tug.fightElapsed += dt;
      tug.db = Math.min(tug.tune.DB_MAX, tug.tune.DB_RATE * tug.fightElapsed);
      wearOff(dt);

      // Not a cadence -- there is no attack clock any more. This only fires
      // when the piece itself has gone quiet for CADENCE_SILENCE_SEC.
      if (now - tug.lastTelegraphAt >= tug.tune.CADENCE_SILENCE_SEC) {
        var mag = clamp01((tug.smoothIntensity - INT_FLOOR) / (INT_CEIL - INT_FLOOR));
        tug.lastTelegraphAt = now;
        tug.spawnAttack(tug.crescendoPower(mag),
          now + tug.tune.ATTACK_TRAVEL_SEC, 'beat', now, mag);
      }

      var pending = [];
      for (var i = 0; i < tug.attacks.length; i++) {
        if (now >= tug.attacks[i].landAt) land(tug.attacks[i], now);
        else pending.push(tug.attacks[i]);
      }
      tug.attacks = pending;

      tug.rope += (tug.playerForce() - tug.enemyForce()) * dt;

      if (tug.invincible) {
        // Reaching an end is not an outcome here -- it is where the rope stops
        // being worth watching -- so put it straight back rather than pinning
        // it there. The clock does the same for a fight that is merely
        // lopsided, so observation mode always has a rope in play.
        if (tug.rope >= 100) recentre('top');
        else if (tug.rope <= 0) recentre('bottom');
        else if (tug.tune.ENDLESS_RECENTRE_SEC > 0
          && tug.elapsed - tug.recentreAnchor >= tug.tune.ENDLESS_RECENTRE_SEC) {
          recentre('cycle');
        }
      } else if (tug.rope >= 100) {
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
