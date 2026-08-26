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
//             A word the player ASSEMBLED, rather than lifted off the word
//             maker, sets at SELF_SPELL_BONUS times its face strength -- and
//             a push made with letters that spell nothing at all locks the
//             Push button for a moment (BLIND_PUSH_*). Between them those two
//             say the same thing from opposite ends: reading the answer off
//             the helper is allowed, and it is the weaker line of play.
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
//   PREP   -- the first PREP_SEC seconds are free: the rope is frozen, so the
//             player can bank a starting pool before anything can move it.
//             It is a HEAD START, NOT A DEAF SPOT -- a swell whose peak falls
//             after the tacet is still announced and still swung on, so the
//             pit comes in on the music's own first real crescendo instead of
//             skipping every swell whose warning happened to go out early.
//
// The intended curve: song wins the short-to-mid game on burst damage, words
// win the long game once the pool out-scales the capped dB ramp.
(function () {
  window.Wordbound = window.Wordbound || {};
  var Sandbox = (window.Wordbound.Sandbox = window.Wordbound.Sandbox || {});

  var DEFAULTS = {
    PREP_SEC: 2,
    ROPE_START: 50,

    // Word -> pusher strength.
    WORD_VALUE_WEIGHT: 1.0,   // x sum of Scrabble letter values
    WORD_LENGTH_WEIGHT: 1.0,  // x length ^ WORD_LENGTH_EXP
    WORD_LENGTH_EXP: 1.8,
    // SPELLING IT YOURSELF IS WORTH MORE. The word maker under the field will
    // always out-read a human -- it holds the whole dictionary and ranks by
    // this very function -- so if a found word and a spelled word are worth
    // the same, there is no reason to ever spell one. This is the thumb on
    // the scale that keeps the game a word game: a word you assembled and
    // pushed yourself sets at this multiple of its face strength. Applied in
    // addWord, NOT in wordStrength, so the suggestion list keeps quoting
    // honest numbers for what IT is offering.
    SELF_SPELL_BONUS: 1.4,
    PLAYER_FORCE_SCALE: 0.025,// rope units/sec per point of pool strength
    PUSHER_RAMP_SEC: 8,       // a fresh word takes this long to reach full push
    // ...and then it wears off. A word holds full push for LIFE_BASE plus
    // LIFE_PER_LETTER per letter, then bleeds out over FADE_SEC. Long words
    // are the ones worth holding the rack for: they take the same time to
    // ramp in but stay standing far longer.
    PUSHER_LIFE_BASE: 8,      // seconds of full push before any word starts to go
    PUSHER_LIFE_PER_LETTER: 4,// extra seconds of life per letter
    PUSHER_FADE_SEC: 6,       // seconds from start of fade to silent

    // THE BLIND PUSH. Shoving the whole rack at the field and hitting Push to
    // see what sticks is free information: the word maker answers instantly
    // and costs nothing to ask. So asking with letters that spell NOTHING now
    // costs time on the clock -- the press is refused and pushing is locked
    // for BLIND_PUSH_LOCK_SEC per tile past BLIND_PUSH_FREE_TILES. Three
    // tiles is 0.5s, seven is 2.5s: the bigger the blind swing, the longer
    // the song gets the rope to itself.
    //
    // Locked means PUSHING, never assembling: tiles, typing, the rack and the
    // word list all stay live, so the punishment is for guessing, not for
    // thinking. Short words stay free to try (two tiles is a guess anyone is
    // entitled to) -- see BLIND_PUSH_FREE_TILES.
    BLIND_PUSH_FREE_TILES: 2, // this many tiles may be blind-pushed for free
    BLIND_PUSH_LOCK_SEC: 0.5, // ...and every tile past that is this long

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
    // Raised alongside the impulse cut below: with the song now swinging from
    // the opening bar, per-hit shove had to come down, and the late fight
    // would otherwise have lost a quarter of its weight along with it. Power
    // now starts where it did and climbs harder, which is the same statement
    // the model always made -- the big ones get bigger -- pushed further.
    ESCALATION_PER_MIN: 0.75, // extra spans per minute of fighting
    ESCALATION_MAX: 2.9,      // ...and the ceiling on that stretch

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
    //
    // Set LOW on purpose. At 0.62 the gate was not curating the swarm, it was
    // deleting the opening: Fur Elise's first fifteen seconds top out at a
    // mag-0.53 swell, so the recording played for seventeen seconds before the
    // pit took its first swing. The song now answers from its first real swell
    // and the gate only holds back the very smallest phrase peaks.
    ATTACK_GATE_START: 0.15,  // opening bars: only swells this big attack...
    ATTACK_GATE_END: 0,       // ...and eventually every one of them does
    ATTACK_GATE_SEC: 45,      // seconds of fighting to open it all the way
    // ...AND THE GATE MAY NEVER SILENCE THE SONG. If no burst has gone out for
    // this long, the next swell the piece announces swings whatever its size.
    // The hit is still a crescendo the piece really plays -- this only says
    // which one -- so a passage of nothing but small swells reads as a quiet
    // stretch with the odd nudge in it, never as an enemy that stopped
    // existing. Set under the 10-second mark the opening is judged on.
    ATTACK_MAX_QUIET_SEC: 6,

    // Silence fallback. A sparsely-marked SEQUENCED piece can run a long way
    // with no crescendo written into it at all, and a song that never swings
    // is not a fight. If nothing has telegraphed for this long the pit takes
    // a swing on its own, sized off live intensity. Set clear of the recording's
    // longest genuinely quiet stretch (11 s) so the piece being tuned never
    // triggers it -- a stray swing in a passage the music is resting through is
    // exactly the out-of-sync hit this rewrite was meant to remove.
    CADENCE_SILENCE_SEC: 13,
    ATTACK_TRAVEL_SEC: 4,     // flight time for a fallback swing (see LEAD_SEC)
    // HOW EXACTLY A BURST LANDS ON ITS CRESCENDO. The piece announces a swell
    // some seconds before its peak and hands over the peak's own moment on the
    // audio clock; the burst is pinned to THAT, never to a flight time measured
    // from when the announcement happened to arrive. This is the only fudge in
    // it: the hit is put this far EARLY, because a shove that lands a frame
    // after the swell reads as a reaction to it, and one that lands a breath
    // before reads as the swell itself arriving.
    ATTACK_EARLY_SEC: 0.06,
    // ...and the other side of it: how late an ANNOUNCEMENT may arrive and
    // still be worth swinging on. Inside this the peak is near enough that a
    // burst landing at once still reads as landing on the swell. Beyond it the
    // music has moved on, and the swing is dropped rather than thrown at a
    // moment the song is no longer at -- a stray off-music hit is the exact
    // thing this whole model exists to avoid.
    ATTACK_MAX_LATE_SEC: 0.12,
    // Fewer, bigger hits. Dropping the attack clock cut burst pressure to about
    // a third of what a cadence timer was pushing out, so each surviving hit
    // carries more -- which is the point: one readable hit you can see coming
    // beats four you cannot tell apart.
    // Set against the FULL swarm, not the opening: at the end of the gate the
    // song is landing ~40 hits a minute, so per-hit numbers that felt right at
    // 14 a minute would simply delete the player.
    //
    // Trimmed from 0.4/0.5 when the gate was opened up. The opening used to run
    // at ~12 hits a minute and now runs at ~28, so numbers priced against the
    // late-fight swarm were suddenly being paid at the swarm's rate from the
    // first bar -- simulated against every opponent, the Moonlight took the
    // barline out inside fifteen seconds no matter how fast the player spelled.
    // Chip damage is the half that really bit: a pool chipped forty times a
    // minute never compounds at all, which is the one thing the words are
    // supposed to be able to do.
    ATTACK_IMPULSE_SCALE: 0.3,// rope units shoved left per point of power
    ATTACK_CHIP_FACTOR: 0.3,  // pool strength destroyed per point of power

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
    ENDLESS_RECENTRE_SEC: 1.5
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
      // The first hit of the whole fight, kept separately from lastHitAt (which
      // every later hit overwrites). It is the number the opening is judged on
      // -- "how long before the pit swings at all" -- so it is worth being able
      // to read after the fact instead of having to catch it live.
      firstHitAt: -99,
      lastTelegraphAt: 0,
      // The last moment a burst actually went out, as opposed to the last
      // moment the piece merely SAID something. They are different numbers the
      // instant the gate turns a swell away, and it is this one the "the gate
      // may never silence the song" rule watches -- see telegraphCrescendo.
      lastSwingAt: 0,
      // Endless recentring, both in `elapsed` seconds: the clock this counts
      // from, and when the last one actually happened (for the UI's flash).
      recentreAnchor: 0,
      lastRecentreAt: -99,
      // Blind-push lockout, in the model's own `elapsed` seconds -- the same
      // clock the pushers ramp on, so a suspended tab freezes the penalty
      // along with everything else it froze.
      pushLockUntil: -99,
      pushLockFor: 0,
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

    // The moment the tacet is over, on the same clock peak times arrive on.
    //
    // Measured FORWARD from `now`, not as startedAt + PREP_SEC. `elapsed` is
    // integrated from clamped frame deltas, so a stalled tab leaves it behind
    // the audio clock -- and read the other way this would then say the tacet
    // ended seconds ago while the fight is still sitting in it, which is
    // exactly when it would wave through a burst that lands mid-tacet.
    tug.prepEndsAt = function (now) {
      return now + Math.max(0, tug.tune.PREP_SEC - tug.elapsed);
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
      tug.lastSwingAt = now;
      tug.firstHitAt = -99;
      tug.recentreAnchor = 0;
      tug.lastRecentreAt = -99;
      tug.pushLockUntil = -99;
      tug.pushLockFor = 0;
      wasInvincible = tug.invincible;
      return tug;
    };

    // A played word becomes a permanent pusher. hp doubles as its live force
    // contribution, so chip damage from a burst literally quiets the word.
    //
    // opts.self marks a word the PLAYER assembled and pushed, as opposed to
    // one lifted off the word maker. It is worth SELF_SPELL_BONUS times its
    // face strength, and it carries the flag onward so the typecase can set
    // it in a different colour -- see the UI's .sb-slug.is-self.
    tug.addWord = function (word, opts) {
      var self = !!(opts && opts.self);
      var face = tug.wordStrength(word);
      var strength = face * (self ? tug.tune.SELF_SPELL_BONUS : 1);
      var pusher = {
        id: nextId++,
        word: String(word || '').toUpperCase(),
        self: self,
        // What the word is worth before the hand-set bonus, kept so the UI can
        // say what the bonus actually bought without recomputing it against a
        // constant the tuning panel may since have moved.
        face: face,
        strength: strength,
        hp: strength,
        bornAt: tug.elapsed,
        fading: false
      };
      tug.pushers.push(pusher);
      emit('pusher-added', pusher);
      return pusher;
    };

    // How long a blind push with `tileCount` tiles costs. Zero at or under the
    // free allowance; the caller is what decides a push WAS blind (that needs
    // the dictionary, which this file deliberately does not own).
    tug.blindPushLockSec = function (tileCount) {
      var over = (tileCount || 0) - tug.tune.BLIND_PUSH_FREE_TILES;
      if (over <= 0) return 0;
      return over * tug.tune.BLIND_PUSH_LOCK_SEC;
    };

    // Refuse pushes for a while. Never SHORTENS a lock already running -- two
    // blind pushes in a row cannot be used to trade a long penalty for a
    // short one.
    tug.lockPush = function (tileCount) {
      var secs = tug.blindPushLockSec(tileCount);
      if (secs <= 0) return 0;
      var until = tug.elapsed + secs;
      if (until <= tug.pushLockUntil) return tug.pushLockLeft();
      tug.pushLockUntil = until;
      tug.pushLockFor = secs;
      emit('push-locked', { seconds: secs, tiles: tileCount });
      return secs;
    };

    tug.pushLockLeft = function () {
      return Math.max(0, tug.pushLockUntil - tug.elapsed);
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
      tug.lastSwingAt = now;
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
      if (tug.firstHitAt < 0) tug.firstHitAt = now;
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
      if (tug.isTerminal()) return null;
      var landAt = peakTime - tug.tune.ATTACK_EARLY_SEC;
      // THE TACET IS A HEAD START, NOT A DEAF SPOT. The warning for a swell
      // goes out seconds before its peak, so with a 4 s lead every crescendo in
      // the opening SEVEN seconds used to be announced while the phase was
      // still 'prep' and thrown away -- and the piece only announces each swell
      // once, so those crescendos then played to silence. The pit sat out the
      // whole opening of the music it is supposed to BE.
      //
      // What the tacet actually owes the player is a rope that cannot move
      // yet, and it still gets that: tick() freezes the rope through prep. So
      // the only burst that has to be refused here is one that would LAND
      // inside the tacet -- tick() returns early in prep, so such a burst would
      // sit in the queue and then land all at once on the first fight frame.
      if (tug.phase === 'prep') {
        if (landAt <= tug.prepEndsAt(now)) return null;
      } else if (tug.phase !== 'fight') return null;
      var mag = tug.crescendoMagnitude(surge);
      // Counts as the song having spoken even when the swell is too small to
      // swing, so a gated-out stretch never trips the silence fallback -- a
      // stray off-music swing is the exact thing this model exists to avoid.
      tug.lastTelegraphAt = now;
      // The gate only applies to a DENSE list. A recording's analysis finds a
      // hundred-odd swells in three minutes, down to little phrase peaks, and
      // swinging on every one of them from the first bar would be a wall
      // rather than a fight. A sequenced piece's list is derived from its own
      // score (sequencedSurges.js) and is already curated -- a dozen or two
      // over the whole piece -- so gating it again would just delete the
      // quiet opponents, which is the bug this pass exists to fix.
      //
      // Where it does apply it is checked against RANK -- where this swell sits
      // among the others in its own piece -- not against the size the hit will
      // be. For a recording the two are the same number.
      var rank = surge && surge.rank != null ? surge.rank : mag;
      // ...and the gate may never silence the song. If nothing has swung for
      // ATTACK_MAX_QUIET_SEC, this swell goes through whatever its size. Still
      // a crescendo the piece really plays -- the rule only picks which one.
      if (surge && surge.dense && rank < tug.attackGate()
        && now - tug.lastSwingAt < tug.tune.ATTACK_MAX_QUIET_SEC) return null;
      // Announced too late to still be about this swell (a tab that was in the
      // background, a stall). Dropped, not thrown after the music.
      if (now - peakTime > tug.tune.ATTACK_MAX_LATE_SEC) return null;
      // THE BURST IS PINNED TO THE PEAK, never to `now + a flight time`. An
      // announcement can arrive late -- a throttled tab, a stretch where the
      // swells come closer together than the warning window, a tempo the
      // player just pushed up -- and when it does, the hit still belongs on
      // the swell, even if that means landing on this very frame. There is
      // deliberately NO minimum lead here: a floor is exactly what used to
      // shove a late burst out past the crescendo it was announcing.
      var attack = tug.spawnAttack(tug.crescendoPower(mag), landAt, 'crescendo',
        Math.min(now, landAt - 0.001), mag);
      // Which beat of the piece this hit belongs to, kept so it can be
      // re-pinned if the piece's clock moves under it. See resyncAttacks.
      if (surge && surge.peakBeat != null) attack.peakBeat = surge.peakBeat;
      return attack;
    };

    // THE PIECE'S CLOCK CAN MOVE UNDER A BURST THAT IS ALREADY IN FLIGHT. The
    // tempo control re-anchors playback, so the moment a peak announced four
    // seconds ago will actually sound at is no longer the moment it was when
    // the burst was scheduled. Re-pin every attack that knows its own beat,
    // from the piece's own beat->time map, once a frame.
    //
    // There is deliberately no "is this jump too big to be real" window here.
    // A tempo change moves a peak four seconds out by whole seconds, so any
    // window loose enough to allow it is loose enough to be wrong, and any
    // window tight enough to be safe refuses the one case this exists for.
    // The other thing that moves the map -- the piece LOOPING -- is told to us
    // outright instead, by forgetAttackBeats().
    tug.resyncAttacks = function (beatToTime) {
      if (typeof beatToTime !== 'function') return;
      for (var i = 0; i < tug.attacks.length; i++) {
        var a = tug.attacks[i];
        if (a.peakBeat == null) continue;
        var t = beatToTime(a.peakBeat) - tug.tune.ATTACK_EARLY_SEC;
        if (!isFinite(t)) continue;
        a.landAt = t;
        if (a.spawnAt >= a.landAt) a.spawnAt = a.landAt - 0.001;
      }
    };

    // The performance a burst was aimed at has ended (the piece looped). Its
    // beat means something else in the new pass -- the same number now points
    // at a moment minutes away -- so the burst stops tracking the map and
    // lands on the schedule it already has. Called by whoever restarts the
    // piece, because only they know a restart from a tempo change.
    tug.forgetAttackBeats = function () {
      for (var i = 0; i < tug.attacks.length; i++) tug.attacks[i].peakBeat = null;
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
          tug.lastSwingAt = now;
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

      // LAND ON THE NEAREST FRAME, BIASED EARLY. Frames are ~16 ms apart and a
      // crescendo's peak almost never falls on one, so `now >= landAt` put
      // every single hit LATE -- never early, always by however much of a frame
      // was left. Firing when the landing is nearer to THIS frame than to the
      // next one halves that error and splits it either side of the beat, and
      // ATTACK_EARLY_SEC then puts the whole distribution a breath in front.
      // This is also what makes the timing independent of frame rate: at 30fps
      // or 144fps the hit sits on the same moment of the music.
      var due = [];
      var pending = [];
      var frameEdge = now + dt * 0.5;
      for (var i = 0; i < tug.attacks.length; i++) {
        if (frameEdge >= tug.attacks[i].landAt) due.push(tug.attacks[i]);
        else pending.push(tug.attacks[i]);
      }
      tug.attacks = pending;
      // Several swells can come due in one frame. Land them in the order the
      // MUSIC plays them, not the order they were announced in -- a late
      // announcement can spawn after a burst that lands before it, and the
      // pool is chipped weakest-first, so the order changes who survives.
      due.sort(function (a, b) { return a.landAt - b.landAt; });
      for (var d = 0; d < due.length; d++) land(due[d], now);

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
