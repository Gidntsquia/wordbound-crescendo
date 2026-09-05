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
// bonus multiplies the mult. total = round(points * mult) + the LENGTH BONUS:
// a flat Scrabble-style bingo, BONUS_7 for seven or more letters, BONUS_6 for
// six, added after the mult. scoreWord's own +15 full-rack bonus is dropped
// so it is not counted twice. Items add on top.
//
// A SINGLE LETTER is always playable: one tile, no dictionary check, points
// x MULT_BASE. It is the "play a bad hand" of the round -- a way to spend a
// word on a dead rack rather than a changeout.
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
    TARGET: 100,         // points to reach
    PLAYS: 4,            // words the player may play
    CHANGEOUTS: 3,       // tile swaps
    RACK_SIZE: 7,
    MULT_BASE: 1,        // mult of a one-letter play
    MULT_PER_LETTER: 1,  // mult added per letter beyond the first
    BONUS_7: 50,         // flat score bonus for a 7+ letter word (after the mult)
    BONUS_6: 25,         // flat score bonus for a 6 letter word
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

  // POINTS x MULT for a word made of these tiles. `breakdown` keeps
  // Lexicon.scoreWord's fields (base, bingoBonus, bonusFlat, variantFlat,
  // bonusMult) so the UI can itemise, plus points / lengthMult / mult / total.
  Sandbox.scoreWordPoints = function (word, tilesUsed, rackCapacity, tune) {
    var Lexicon = window.Wordbound.Lexicon;
    var b = Lexicon.scoreWord(word, tilesUsed, rackCapacity);
    b.bingoBonus = 0; // replaced by the flat lengthBonus below
    b.points = b.base + b.bonusFlat + b.variantFlat;
    b.lengthMult = tune.MULT_BASE + tune.MULT_PER_LETTER * Math.max(0, word.length - 1);
    b.mult = b.lengthMult * b.bonusMult;
    b.lengthBonus = word.length >= 7 ? tune.BONUS_7 : word.length === 6 ? tune.BONUS_6 : 0;
    b.total = Math.round(b.points * b.mult) + b.lengthBonus;
    return b;
  };

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
    round.breakdownFor = function (word) {
      var upper = String(word).toUpperCase();
      var form = Lexicon.canFormFromRack(upper, round.rack);
      var tiles = form.possible ? form.tilesUsed
        : upper.split('').map(function (l) { return { letter: l, bonus: null, variant: null }; });
      return Sandbox.scoreWordPoints(upper, tiles, round.rackSize, tune);
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

      var breakdown = Sandbox.scoreWordPoints(upper, form.tilesUsed, round.rackSize, tune);
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
