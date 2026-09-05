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
// and never touches this object. Scoring is Lexicon.scoreWord so the tile
// bonuses the engine already has (flat/mult on play, Volatile, Charged) count
// here for free -- that is the "enhanced card" layer.
//
// PUBLIC API (window.Wordbound.Sandbox):
//   ROUND_DEFAULTS       -- every tunable, mirrored by the UI's tuning panel
//   createRound(opts)    -- { rng, deck, tune? } -> round
//     round.rack, .pile, .score, .target, .playsLeft, .changeoutsLeft,
//       .state ('live' | 'won' | 'lost'), .plays [{ word, breakdown }], .gold
//     round.scoreFor(word)          -> number, for ranking helper suggestions
//     round.playWord(word)          -> { ok, breakdown } | { ok:false, reason }
//     round.changeout(tileIds)      -> { ok, drawn } | { ok:false, reason }
//     round.tune                    -- live; TARGET/PLAYS/CHANGEOUTS read at
//                                      creation, GOLD_* read at the win
(function () {
  window.Wordbound = window.Wordbound || {};
  var Sandbox = (window.Wordbound.Sandbox = window.Wordbound.Sandbox || {});

  Sandbox.ROUND_DEFAULTS = {
    TARGET: 60,          // points to reach
    PLAYS: 4,            // words the player may play
    CHANGEOUTS: 3,       // tile swaps
    RACK_SIZE: 7,
    GOLD_WIN: 3,         // flat purse for a win
    GOLD_PER_WORD_LEFT: 2 // bonus per unplayed word at the win
  };

  Sandbox.createRound = function (opts) {
    var W = window.Wordbound;
    var Tiles = W.Tiles;
    var Lexicon = W.Lexicon;
    var rng = opts.rng;
    var tune = Object.assign({}, Sandbox.ROUND_DEFAULTS, opts.tune || {});

    var round = {
      tune: tune,
      target: tune.TARGET,
      playsLeft: tune.PLAYS,
      changeoutsLeft: tune.CHANGEOUTS,
      rackSize: tune.RACK_SIZE,
      score: 0,
      gold: 0,
      state: 'live',
      plays: [],
      pile: { drawPile: Tiles.shuffleIntoDrawPile(opts.deck, rng), discardPile: [] },
      rack: []
    };
    round.rack = Tiles.draw(round.pile, round.rackSize, rng);

    function refill() {
      var need = round.rackSize - round.rack.length;
      if (need > 0) round.rack.push.apply(round.rack, Tiles.draw(round.pile, need, rng));
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
    round.scoreFor = function (word) {
      var upper = String(word).toUpperCase();
      var form = Lexicon.canFormFromRack(upper, round.rack);
      if (form.possible) return Lexicon.scoreWord(upper, form.tilesUsed, round.rackSize).total;
      var tiles = upper.split('').map(function (l) { return { letter: l, bonus: null, variant: null }; });
      return Lexicon.scoreWord(upper, tiles, round.rackSize).total;
    };

    round.playWord = function (raw) {
      if (round.state !== 'live') return { ok: false, reason: 'The round is over.' };
      var upper = String(raw || '').trim().toUpperCase();
      if (!upper) return { ok: false, reason: 'Nothing to play.' };
      if (!Lexicon.isValidWord(upper)) return { ok: false, reason: upper + ' isn’t in the dictionary.' };
      var form = Lexicon.canFormFromRack(upper, round.rack);
      if (!form.possible) return { ok: false, reason: upper + ' needs letters you don’t have.' };

      var breakdown = Lexicon.scoreWord(upper, form.tilesUsed, round.rackSize);
      Lexicon.removeTiles(round.rack, form.tilesUsed);
      round.pile.discardPile.push.apply(round.pile.discardPile, form.tilesUsed);
      refill();
      round.score += breakdown.total;
      round.playsLeft -= 1;
      round.plays.push({ word: upper, breakdown: breakdown });
      settle();
      return { ok: true, word: upper, breakdown: breakdown };
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
      var drawn = Tiles.draw(round.pile, back.length, rng);
      round.rack.push.apply(round.rack, drawn);
      round.pile.discardPile.push.apply(round.pile.discardPile, back);
      round.changeoutsLeft -= 1;
      return { ok: true, drawn: drawn, returned: back };
    };

    return round;
  };
})();
