// src/sandbox/round.js
// ONE SCORING ROUND -- the Balatro-with-Scrabble model (see COMBAT_REDESIGN.md).
//
// A round is: a point target, a fixed number of WORDS the player may play, a
// fixed number of CHANGEOUTS (throw back chosen tiles, draw replacements), a
// rack drawn from a bag, and a running score. Reach the target and the round
// is won; play the last word still short of it and the round is lost. Winning
// with words unspent pays gold per word left, on top of a flat win purse.
//
// Plain JS, no React, NO CLOCK: nothing here ticks. The music is a soundtrack
// and never touches this object.
//
// SCORING is Balatro's POINTS x MULT. POINTS come from Lexicon.scoreWord --
// letter values plus the tile bonuses the engine already has (flat on play,
// Volatile, Charged, the full-rack bingo) -- so the "enhanced card" layer
// counts here for free; its old length bonus is dropped, because length is
// now the MULT: MULT_BASE + MULT_PER_LETTER per letter beyond the first, so
// with the defaults a word's mult is simply its length. A tile's mult-on-play
// bonus multiplies the mult. The BINGO -- BONUS_7 points for seven or more
// letters, BONUS_6 for six -- goes into POINTS, before the mult, so a long
// word's bingo is itself multiplied. scoreWord's own +15 full-rack bonus is
// dropped so it is not counted twice. total = round(points * mult); items
// add on top.
//
// A SINGLE LETTER is always playable: one tile, no dictionary check, points
// x MULT_BASE. It is the "play a bad hand" of the round -- a way to spend a
// word on a dead rack rather than a changeout.
//
// PUBLIC API (window.Wordbound.Sandbox):
//   ROUND_DEFAULTS       -- every tunable, mirrored by the UI's tuning panel
//   ITEMS                -- the sandbox's own items: each simply adds flat
//                           POINTS and/or MULT to every word (see below)
//   createRun(opts)      -- { rng, makeDeck, tune?, items? } -> run of three
//                           rounds: two normal enemies then a boss, targets
//                           TARGET_1 / TARGET_2 / TARGET_BOSS, gold pooled.
//     run.stage (0-based), run.stages [{ target, boss }], run.round,
//       run.gold, run.state ('live' | 'won' | 'lost'), run.next()
//   createRound(opts)    -- { rng, deck, tune?, items?, target? } -> round
//     items: array of Sandbox.ITEMS ids. Every one is folded straight into
//       scoreWordPoints: points += item.points, mult += item.mult.
//     round.rack, .pile, .score, .target, .playsLeft, .changeoutsLeft,
//       .state ('live' | 'won' | 'lost'), .plays [{ word, breakdown }], .gold
//     round.scoreFor(word)          -> number, for ranking helper suggestions
//     round.breakdownFor(word)      -> { points, mult, total, ... } for the
//                                      current rack (see scoreWordPoints)
//     round.playWord(word)          -> { ok, breakdown } | { ok:false, reason }
//     round.changeout(tileIds)      -> { ok, drawn } | { ok:false, reason }
//     round.tune                    -- live; TARGET/PLAYS/CHANGEOUTS read at
//                                      creation, GOLD_* read at the win
(function () {
  window.Wordbound = window.Wordbound || {};
  var Sandbox = (window.Wordbound.Sandbox = window.Wordbound.Sandbox || {});

  Sandbox.ROUND_DEFAULTS = {
    TARGET_1: 100,       // points to reach, first battle
    TARGET_2: 175,       // second battle
    TARGET_BOSS: 300,    // the boss
    PLAYS: 4,            // words the player may play
    CHANGEOUTS: 3,       // tile swaps
    RACK_SIZE: 7,
    MULT_BASE: 1,        // mult of a one-letter play
    MULT_PER_LETTER: 1,  // mult added per letter beyond the first
    BONUS_7: 50,         // bingo points for a 7+ letter word (before the mult)
    BONUS_6: 25,         // bingo points for a 6 letter word
    GOLD_WIN: 3,         // flat purse for a win
    GOLD_PER_WORD_LEFT: 2 // bonus per unplayed word at the win
  };

  // The sandbox's own items, offered as checkboxes in the setup bar. Each is
  // nothing but a flat addition to every word's POINTS (before the mult) or
  // MULT. The shipped js/wordbound/items.js set is NOT used here.
  Sandbox.ITEMS = [
    { id: 'brass_nib', name: 'Brass Nib', points: 10, hint: '+10 points on every word' },
    { id: 'lead_weight', name: 'Lead Weight', points: 25, hint: '+25 points on every word' },
    { id: 'second_ink', name: 'Second Ink', mult: 1, hint: '+1 mult on every word' },
    { id: 'double_stop', name: 'Double Stop', mult: 2, hint: '+2 mult on every word' },
    { id: 'gilded_edge', name: 'Gilded Edge', points: 10, mult: 1, hint: '+10 points and +1 mult' },
  ];
  Sandbox.ITEM_DEFS = {};
  Sandbox.ITEMS.forEach(function (it) { Sandbox.ITEM_DEFS[it.id] = it; });

  // POINTS x MULT for a word made of these tiles. `breakdown` keeps
  // Lexicon.scoreWord's fields (base, bingoBonus, bonusFlat, variantFlat,
  // bonusMult) so the UI can itemise, plus points / lengthMult / mult / total.
  Sandbox.scoreWordPoints = function (word, tilesUsed, rackCapacity, tune, items) {
    var Lexicon = window.Wordbound.Lexicon;
    var b = Lexicon.scoreWord(word, tilesUsed, rackCapacity);
    b.lengthBonus = 0; // length is the mult now, not a flat bonus
    b.bingoBonus = word.length >= 7 ? tune.BONUS_7 : word.length === 6 ? tune.BONUS_6 : 0;
    b.itemPoints = 0;
    b.itemMult = 0;
    (items || []).forEach(function (id) {
      var it = Sandbox.ITEM_DEFS[id];
      if (!it) return;
      b.itemPoints += it.points || 0;
      b.itemMult += it.mult || 0;
    });
    b.points = b.base + b.bingoBonus + b.bonusFlat + b.variantFlat + b.itemPoints;
    b.lengthMult = tune.MULT_BASE + tune.MULT_PER_LETTER * Math.max(0, word.length - 1);
    b.mult = (b.lengthMult + b.itemMult) * b.bonusMult;
    b.total = Math.round(b.points * b.mult);
    return b;
  };

  Sandbox.createRound = function (opts) {
    var W = window.Wordbound;
    var Tiles = W.Tiles;
    var Lexicon = W.Lexicon;
    var rng = opts.rng;
    var tune = Object.assign({}, Sandbox.ROUND_DEFAULTS, opts.tune || {});
    var items = (opts.items || []).slice();

    var round = {
      tune: tune,
      target: opts.target != null ? opts.target : tune.TARGET_1,
      playsLeft: tune.PLAYS,
      changeoutsLeft: tune.CHANGEOUTS,
      rackSize: tune.RACK_SIZE,
      items: items,
      score: 0,
      gold: 0,
      state: 'live',
      plays: [],
      pile: { drawPile: Tiles.shuffleIntoDrawPile(opts.deck, rng), discardPile: [] },
      rack: []
    };

    function draw(count) {
      return Tiles.draw(round.pile, count, rng);
    }
    round.rack = draw(round.rackSize);

    function refill() {
      var need = round.rackSize - round.rack.length;
      if (need > 0) round.rack.push.apply(round.rack, draw(need));
    }

    function settle() {
      if (round.score >= round.target) {
        round.state = 'won';
        round.gold = tune.GOLD_WIN + tune.GOLD_PER_WORD_LEFT * round.playsLeft;
      } else if (round.playsLeft <= 0) {
        round.state = 'lost';
      }
    }

    // Rank helper: what would this word score off the CURRENT rack's tiles?
    // Falls back to plain letter values when the rack cannot form it, so the
    // word list can still order words it has no tiles for.
    round.breakdownFor = function (word) {
      var upper = String(word).toUpperCase();
      var form = Lexicon.canFormFromRack(upper, round.rack);
      var tiles = form.possible ? form.tilesUsed
        : upper.split('').map(function (l) { return { letter: l, bonus: null, variant: null }; });
      return Sandbox.scoreWordPoints(upper, tiles, round.rackSize, tune, items);
    };
    round.scoreFor = function (word) { return round.breakdownFor(word).total; };

    // One tile is always a legal play; anything longer must be in the dictionary.
    round.isPlayable = function (word) {
      var upper = String(word || '').toUpperCase();
      return upper.length === 1 ? /^[A-Z]$/.test(upper) : Lexicon.isValidWord(upper);
    };

    round.playWord = function (raw) {
      if (round.state !== 'live') return { ok: false, reason: 'The round is over.' };
      var upper = String(raw || '').trim().toUpperCase();
      if (!upper) return { ok: false, reason: 'Nothing to play.' };
      if (!round.isPlayable(upper)) return { ok: false, reason: upper + ' isn’t in the dictionary.' };
      var form = Lexicon.canFormFromRack(upper, round.rack);
      if (!form.possible) return { ok: false, reason: upper + ' needs letters you don’t have.' };

      var breakdown = Sandbox.scoreWordPoints(upper, form.tilesUsed, round.rackSize, tune, items);
      var messages = [];
      Lexicon.removeTiles(round.rack, form.tilesUsed);
      round.pile.discardPile.push.apply(round.pile.discardPile, form.tilesUsed);
      refill();
      round.score += breakdown.total;
      round.playsLeft -= 1;
      round.plays.push({ word: upper, breakdown: breakdown, messages: messages });
      settle();
      return { ok: true, word: upper, breakdown: breakdown, messages: messages };
    };

    // Throw back any number of CHOSEN tiles and draw that many. Costs one
    // changeout regardless of how many tiles go back; zero tiles costs nothing.
    round.changeout = function (tileIds) {
      if (round.state !== 'live') return { ok: false, reason: 'The round is over.' };
      if (round.changeoutsLeft <= 0) return { ok: false, reason: 'No changeouts left.' };
      var ids = new Set(tileIds || []);
      if (!ids.size) return { ok: false, reason: 'Pick the tiles to change out first.' };
      var back = round.rack.filter(function (t) { return ids.has(t.id); });
      if (!back.length) return { ok: false, reason: 'Those tiles aren’t in the rack.' };
      round.rack = round.rack.filter(function (t) { return !ids.has(t.id); });
      // Discard AFTER drawing, so a small bag cannot hand the same tiles back.
      var drawn = draw(back.length);
      round.rack.push.apply(round.rack, drawn);
      round.pile.discardPile.push.apply(round.pile.discardPile, back);
      round.changeoutsLeft -= 1;
      return { ok: true, drawn: drawn, returned: back };
    };

    return round;
  };

  // A RUN: three rounds back to back, harder each time -- two normal enemies
  // and then a boss. Each round draws a fresh rack from a fresh deck
  // (opts.makeDeck() is called per round). Gold pools across the run. Lose a
  // round and the run is lost; win the boss and the run is won.
  Sandbox.createRun = function (opts) {
    var tune = Object.assign({}, Sandbox.ROUND_DEFAULTS, opts.tune || {});
    var run = {
      tune: tune,
      stages: [
        { target: tune.TARGET_1, boss: false },
        { target: tune.TARGET_2, boss: false },
        { target: tune.TARGET_BOSS, boss: true }
      ],
      stage: 0,
      round: null,
      gold: 0,
      state: 'live'
    };
    function begin() {
      run.round = Sandbox.createRound({
        rng: opts.rng, deck: opts.makeDeck(), tune: tune, items: opts.items,
        target: run.stages[run.stage].target
      });
    }
    // Settle the current round into the run; then, if it was won and there is
    // a next stage, start it. Returns the run state.
    run.next = function () {
      var r = run.round;
      if (run.state !== 'live' || !r || r.state === 'live') return run.state;
      if (r.state === 'lost') { run.state = 'lost'; return run.state; }
      run.gold += r.gold;
      if (run.stage >= run.stages.length - 1) { run.state = 'won'; return run.state; }
      run.stage += 1;
      begin();
      return run.state;
    };
    begin();
    return run;
  };
})();
