// js/wordbound/duel.js
// DUEL-GAUGE COMBAT ticket (GOALS.md, 2026-08-21 COMBAT MODEL / HEALTH MODEL
// header decisions): the tug-of-war gauge engine every fight runs on. Pure,
// framework-agnostic state machine -- no DOM, no WebAudio, no game.js
// dependency, per the header FRAMEWORK decision (same convention as
// music.js). Deliberately does NOT know about monster.hp, player.ink, or
// word text: it only knows push FORCES (numbers) and emits events: the
// caller (game.js/combat.js integration, not built by this run -- see
// GOALS.md's "Not done" note) is the one that turns "push-won" into monster
// damage and "block-lost" into whatever UI/game-over flow it needs.
//
// THIS RUN'S SCOPE: the gauge engine itself, verified with mocked-clock unit
// tests, per the ticket's VERIFY line ("mocked-clock unit tests: gauge
// integration math, block loss at the end-state only, i-frame suppression,
// parry window, tier multipliers"). Wiring this into game.js/CombatScreen.jsx
// (replacing the turn-based Combat.playWord/monsterAttack flow), the
// telegraph UI, the Largo tempo-scale control surface, and the balance sim
// are explicitly NOT done this run -- see PROGRESS.md and GOALS.md's ticket
// note for what's left.
//
// NAMING (THEME.md, already vetted/picked by the THEME BIBLE ticket -- not
// re-litigated here): the gauge is "the Volume", health blocks are "Verses"
// (~5). This module uses generic field names (gauge/healthBlocks) rather than
// the flavor names -- UI-facing code is where the bible's words belong, this
// is just the math underneath.
//
// THE GAUGE: a single number in [GAUGE_MIN, GAUGE_MAX], starting at
// GAUGE_CENTER. GAUGE_MIN is the player-damaging end (gauge hitting it costs
// a Verse); GAUGE_MAX is the enemy-damaging end (gauge hitting it wins a
// push). This is an implementation choice, not specified by the ticket --
// documented here so it's easy to re-orient if UI wants the opposite sign.
//
// MUSIC PUSH (continuous, per header COMBAT MODEL): every tick, the enemy's
// piece pushes the gauge toward GAUGE_MIN by
//   (STAGE_TIER_BASE_PUSH[stageTier] + intensity * INTENSITY_PUSH_SCALE) * dt
// -- intensity is music.js's intensityAt()/getIntensity(), 0..1; stageTier
// is the piece's own field, read once at duel creation. "Later-stage enemies
// push a base amount more than earlier-stage ones" (header) is the additive
// STAGE_TIER_BASE_PUSH term; "crescendos push much harder" is intensity's
// own shape (a crescendo IS a spike in intensity, per music.js's dynamics
// curve) times INTENSITY_PUSH_SCALE.
//
// PLAYER PUSH: caller converts a played word's score into a push via
// applyPlayerPush(wordScore) -- multiplies by WORD_PUSH_SCALE (a single
// tuning knob so "does a decent word visibly move the gauge" is one number
// to retune, not scattered). Reaching GAUGE_MAX resolves a "push won":
// pushesWon increments, gauge recenters, and if pushesWon reaches
// pushesToDefeat (1 for a regular, N for a boss with phases -- caller's
// choice at creation) the duel emits 'defeated'.
//
// LOSING A PUSH / I-FRAMES: gauge reaching GAUGE_MIN costs exactly one
// health block (Verse), per the header HEALTH MODEL. Music push is then
// FULLY SUSPENDED (not "heavily damped" -- the strongest reading of "a
// brutal passage can never instantly chain away all health", and simplest
// to reason about/test) until `now >= iframeUntil` (IFRAME_DURATION_SEC
// after the loss, default 3s, within the ticket's stated 2-4s tuning range).
// The gauge is recentered on the loss (not left at GAUGE_MIN), so the player
// re-enters at a neutral position once i-frames end rather than being
// re-threatened instantly. healthBlocks reaching 0 emits 'player-defeated'
// and the duel goes terminal (tick/applyPlayerPush become no-ops).
//
// PARRY: registerCrescendoPeak(now) is the hook the caller wires to music.js's
// 'crescendo-peak' event (passing the sequencer's own clock, e.g.
// ctx.currentTime, so the two systems share one time axis). attemptParry(now)
// -- called when the player submits a word -- succeeds if `now` is within
// PARRY_WINDOW_SEC of the most recently registered, not-yet-consumed peak
// (ticket: "~±200ms, tune"). A successful parry consumes that peak (no
// double-parrying the same crescendo) and activates a damping window
// (PARRY_DAMPING_DURATION_SEC) during which music push is multiplied by
// (1 - PARRY_MITIGATION) -- "blunts that crescendo's push by a meaningful
// percent" via damping the push right as/after the peak lands, since this
// model has no single instantaneous "hit" to reduce. attemptParry does NOT
// itself apply the parrying word's push -- caller still calls
// applyPlayerPush for the word as normal; parry and push are independent
// effects of the same submitted word.
//
// EVENTS (on/off, same shape as music.js): 'push-won' (payload
// {pushesWon, pushesToDefeat}), 'defeated' (payload undefined), 'block-lost'
// (payload {healthBlocks}), 'player-defeated' (payload undefined), 'parried'
// (payload the crescendo peak time that was parried).
(function () {
  window.Wordbound = window.Wordbound || {};
  var Duel = (window.Wordbound.Duel = {});

  Duel.GAUGE_MIN = 0;
  Duel.GAUGE_MAX = 100;
  Duel.GAUGE_CENTER = 50;

  // Gauge points/sec contributed by stage tier alone, at intensity=0 (a
  // perfectly quiet passage still applies some base pressure from a
  // later-stage enemy, per the header "later-stage enemies push a base
  // amount more" -- an early-tier duel at intensity 0 pushes barely at all,
  // matching THEME.md's "chill, nearly-safe" early tier).
  Duel.STAGE_TIER_BASE_PUSH = { early: 1, mid: 3, late: 6, final: 9 };
  // Gauge points/sec contributed by intensity=1 (on top of the base term).
  Duel.INTENSITY_PUSH_SCALE = 16;
  // Word score -> gauge push. 1:1 by default: a ~15-25 point word (typical
  // mid-length play in this engine's existing scoring) visibly moves a
  // 100-point gauge; a 40+ word (bingo/combo-boosted) swings it. Single knob
  // to retune if playtesting says otherwise.
  Duel.WORD_PUSH_SCALE = 1;

  Duel.IFRAME_DURATION_SEC = 3;
  Duel.PARRY_WINDOW_SEC = 0.2;
  Duel.PARRY_DAMPING_DURATION_SEC = 1.5;
  Duel.PARRY_MITIGATION = 0.5;

  Duel.DEFAULT_HEALTH_BLOCKS = 5;

  Duel.create = function (opts) {
    opts = opts || {};
    var stageTier = opts.stageTier || 'early';
    var healthBlocks = opts.healthBlocks != null ? opts.healthBlocks : Duel.DEFAULT_HEALTH_BLOCKS;

    var listeners = {};
    function emit(event, payload) {
      var cbs = listeners[event];
      if (!cbs) return;
      for (var i = 0; i < cbs.length; i++) cbs[i](payload);
    }

    var duel = {
      stageTier: stageTier,
      maxHealthBlocks: healthBlocks,
      healthBlocks: healthBlocks,
      pushesToDefeat: opts.pushesToDefeat != null ? opts.pushesToDefeat : 1,
      pushesWon: 0,
      gauge: Duel.GAUGE_CENTER,
      iframeUntil: -Infinity,
      pendingPeakAt: null,
      parryDampingUntil: -Infinity,
      defeated: false,
      playerDefeated: false,
    };

    duel.on = function (event, cb) {
      (listeners[event] = listeners[event] || []).push(cb);
      return duel;
    };
    duel.off = function (event, cb) {
      if (!listeners[event]) return duel;
      listeners[event] = listeners[event].filter(function (c) { return c !== cb; });
      return duel;
    };

    duel.isTerminal = function () {
      return duel.defeated || duel.playerDefeated;
    };

    duel.isIframeActive = function (now) {
      return now < duel.iframeUntil;
    };

    function loseBlock(now) {
      duel.healthBlocks -= 1;
      duel.gauge = Duel.GAUGE_CENTER;
      duel.iframeUntil = now + Duel.IFRAME_DURATION_SEC;
      emit('block-lost', { healthBlocks: duel.healthBlocks });
      if (duel.healthBlocks <= 0) {
        duel.playerDefeated = true;
        emit('player-defeated');
      }
    }

    function winPush() {
      duel.pushesWon += 1;
      duel.gauge = Duel.GAUGE_CENTER;
      emit('push-won', { pushesWon: duel.pushesWon, pushesToDefeat: duel.pushesToDefeat });
      if (duel.pushesWon >= duel.pushesToDefeat) {
        duel.defeated = true;
        emit('defeated');
      }
    }

    // Advance the gauge by one tick's worth of music push. `intensity` is
    // the caller's music.js getIntensity()/intensityAt() reading (0..1).
    // No-op once the duel is terminal (caller should stop ticking, but a
    // stray call must never push a gauge that no longer matters).
    duel.tick = function (now, dt, intensity) {
      if (duel.isTerminal()) return;
      if (dt <= 0) return;
      if (duel.isIframeActive(now)) return;

      var push = Duel.STAGE_TIER_BASE_PUSH[duel.stageTier] || 0;
      push += Math.max(0, Math.min(1, intensity || 0)) * Duel.INTENSITY_PUSH_SCALE;
      if (now < duel.parryDampingUntil) push *= (1 - Duel.PARRY_MITIGATION);

      duel.gauge -= push * dt;
      if (duel.gauge <= Duel.GAUGE_MIN) {
        duel.gauge = Duel.GAUGE_MIN;
        loseBlock(now);
      }
    };

    // Wire to music.js's 'crescendo-peak' event: seq.on('crescendo-peak',
    // function () { duel.registerCrescendoPeak(ctx.currentTime); }).
    duel.registerCrescendoPeak = function (now) {
      duel.pendingPeakAt = now;
    };

    // Call when the player submits a word, BEFORE or independent of
    // applyPlayerPush -- returns true if this word landed inside the parry
    // window around the most recent not-yet-consumed crescendo peak.
    duel.attemptParry = function (now) {
      if (duel.pendingPeakAt == null) return false;
      var withinWindow = Math.abs(now - duel.pendingPeakAt) <= Duel.PARRY_WINDOW_SEC;
      if (!withinWindow) return false;
      var parriedAt = duel.pendingPeakAt;
      duel.pendingPeakAt = null;
      duel.parryDampingUntil = now + Duel.PARRY_DAMPING_DURATION_SEC;
      emit('parried', parriedAt);
      return true;
    };

    // Apply a played word's push toward the enemy end. `now` is only used
    // for the win-push event payload's symmetry with the rest of this API;
    // pass the same clock as tick()/registerCrescendoPeak(). Returns
    // { pushed, gauge, pushWon, defeated } so the caller can react (e.g.
    // damage the monster on pushWon) without re-deriving state.
    duel.applyPlayerPush = function (now, score) {
      if (duel.isTerminal()) return { pushed: 0, gauge: duel.gauge, pushWon: false, defeated: duel.defeated };
      var pushed = Math.max(0, score || 0) * Duel.WORD_PUSH_SCALE;
      duel.gauge += pushed;
      var pushWon = false;
      if (duel.gauge >= Duel.GAUGE_MAX) {
        duel.gauge = Duel.GAUGE_MAX;
        pushWon = true;
        winPush();
      }
      return { pushed: pushed, gauge: duel.gauge, pushWon: pushWon, defeated: duel.defeated };
    };

    return duel;
  };
})();
