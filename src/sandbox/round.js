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
//   SAMPLE_ITEMS         -- the item ids the sandbox offers as checkboxes
//   createRound(opts)    -- { rng, deck, tune?, items? } -> round
//     items: array of js/wordbound/items.js ids. Their onRunStart / onDraw /
//       onWordPlayed hooks and rackCapacityBonus run here against a stand-in
//       ctx: the shipped hooks add "damage" to result.damage, and here that
//       IS the score, so every scoring item works unchanged. Ink/heal and
//       monster-hp effects are inert (there is no ink and no monster).
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

  // Offered as checkboxes in the setup bar. The first three are the pick of the
  // shipped set for a SCORING round: Gilded Bookmark doubles the opening word
  // (a quarter of the round), Wildcard Pouch's two blanks turn near-misses into
  // full-rack bingos, Spare Satchel's eighth tile lengthens every word. The
  // rest are there to feel out a build.
  Sandbox.SAMPLE_ITEMS = [
    'gilded_bookmark', 'wildcard_pouch', 'spare_satchel',
    'errant_footnote', 'heavy_ink', 'consonant_cluster', 'long_s_ligature', 'vowel_reliquary'
  ];

  Sandbox.createRound = function (opts) {
    var W = window.Wordbound;
    var Tiles = W.Tiles;
    var Lexicon = W.Lexicon;
    var Items = W.Items;
    var rng = opts.rng;
    var tune = Object.assign({}, Sandbox.ROUND_DEFAULTS, opts.tune || {});
    // The stand-in player the item hooks read. `ink`/`maxInk`/`gold` exist so
    // hooks that touch them do not throw; nothing here reads them back.
    var player = { items: (opts.items || []).slice(), ink: 99, maxInk: 99, gold: 0 };
    var hasItems = !!(Items && player.items.length);
    var rackSize = tune.RACK_SIZE;
    if (hasItems) rackSize += Items.getRackCapacity(player) - 7;

    var round = {
      tune: tune,
      target: tune.TARGET,
      playsLeft: tune.PLAYS,
      changeoutsLeft: tune.CHANGEOUTS,
      rackSize: rackSize,
      items: player.items,
      score: 0,
      gold: 0,
      state: 'live',
      plays: [],
      pile: { drawPile: Tiles.shuffleIntoDrawPile(opts.deck, rng), discardPile: [] },
      rack: []
    };
    // onRunStart hooks add tiles to the pile (blanks, a charged E) BEFORE the
    // opening rack is drawn, the way game.js orders it.
    if (hasItems) Items.runHook('onRunStart', { player: player, pileState: round.pile }, player);

    function draw(count) {
      var drawn = Tiles.draw(round.pile, count, rng);
      if (hasItems) Items.runHook('onDraw', { player: player, drawnTiles: drawn, pileState: round.pile, rng: rng }, player);
      return drawn;
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
      // Items: the shipped hooks add to result.damage, and here that is the
      // score. monster.hp is a dummy applyBonusDamage can decrement.
      var messages = [];
      if (hasItems) {
        var result = { damage: breakdown.total };
        var prev = round.plays.length ? round.plays[round.plays.length - 1].word : null;
        Items.runHook('onWordPlayed', {
          player: player, monster: { hp: 1e9 }, word: upper, tilesUsed: form.tilesUsed,
          result: result, previousWord: prev, wordsPlayedThisFight: round.plays.length + 1,
          messages: messages
        }, player);
        breakdown.itemBonus = result.damage - breakdown.total;
        breakdown.total = result.damage;
      }
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
})();
