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
// SCORING is Balatro's POINTS x MULT, with WORD LENGTH as the hand type.
// Sandbox.TIERS is the table (BALATRO_NOTES.md section 2): each length band
// has a base POINTS and a base MULT, and an ETUDE (Balatro's planet card)
// levels a tier permanently for the run -- run.tierLevels -- adding the
// tier's per-level bonus each time.
//   points = tier base (+ level bonus) + letter sum + inked tile points
//            + item flats
//   mult   = tier mult (+ level bonus) + inked tile mult + item mult, then
//            x steel tiles held (inks.js) and x item multipliers
//   total  = round(points x mult)
// Items fire LEFT TO RIGHT in the order they are held (Sandbox.applyItems);
// order matters once a x-mult item is in the row.
//
// PHASE 0 CALIBRATION (2026-09-06, scratch script, 2,000 rounds per bag, a
// greedy player taking wordFinder's best word by score, changeout when the
// best word is under 30, 4 plays, uncapped):
//   bag      mean   p10   p50   p90   mean best length
//   weak      402   280   391   532   4.4
//   normal    779   528   723  1080   5.4
//   strong   1276   840  1269  1640   6.3
// (Today's linear mult measured 611 / 349 / 556 / 917 on the normal bag.)
// The tiers are kept at the notes' Balatro-sized numbers rather than scaled
// down to a 120 mean: a greedy solver with the whole dictionary is a
// ceiling, not a player. A human playing 4- and 5-letter words scores about
// 250-300 a round on this table, so Movement I's base target is 300.
//
// A SINGLE LETTER is always playable: one tile, no dictionary check, points
// x MULT_BASE. It is the "play a bad hand" of the round -- a way to spend a
// word on a dead rack rather than a changeout.
//
// PUBLIC API (window.Wordbound.Sandbox):
//   ROUND_DEFAULTS       -- every tunable, mirrored by the UI's tuning panel
//   TIERS                -- length tiers [{ id, name, minLen, pts, mult,
//                           lvlPts, lvlMult }] (pts/mult read from tune)
//   tierFor(word, tune)  -- the tier a word of that length scores as
//   (ITEMS live in items.js, inks in inks.js, the shop in shop.js)
//   createRun(opts)      -- { rng, deck, tune?, items? } -> a run down
//                           Sandbox.MOVEMENTS (enemies.js): two movements of
//                           small / big / boss, targets MOVEMENT_BASE_n x
//                           1 / BIG_MULT / BOSS_MULT, gold pooled with
//                           INTEREST (1 per INTEREST_PER held, cap
//                           INTEREST_CAP) paid at each win.
//     run.movement, run.stage (both 0-based), run.enemy, run.round,
//       run.gold, run.state ('live' | 'won' | 'lost'), run.next()
//     run.targetFor(movement, stage), run.interestPreview()
//     run.deck -- the tiles every round's rack is drawn from, persisted and
//       grown by the shop's tile packs
//     run.tierLevels {tierId: level}, run.levelTier(tierId) -- études
//     run.shop (shop.js) after every won fight short of the last; run.next()
//       opens it, run.leaveShop() begins the next round
//     run.consumables [{ kind: 'etude'|'ink', id }], run.useConsumable(i, ...)
//     run.pack / run.pick(i) -- an opened pack (shop.js)
//     run.skip() -- skip a small or big enemy before playing a word, for
//       run.round.favour (a Sandbox.FAVOURS id); run.favours holds the
//       ones the next shop will honour
//     run.bestPlay { word, breakdown, enemy }, run.wordsPlayed, run.skipped
//   createRound(opts)    -- { rng, deck, tune?, items?, target?, tierLevels?,
//                              rule? } (rule: a Sandbox.RULES id, enemies.js)
//     items: array of Sandbox.ITEMS ids (items.js), fired in order by
//       scoreWordPoints
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
    MOVEMENT_BASE_1: 300, // small-enemy target, first movement (Phase 0)
    MOVEMENT_BASE_2: 750, // second movement, ~2.5x like Balatro's antes
    BIG_MULT: 1.5,        // big enemy target = base x this
    BOSS_MULT: 2,         // boss target = base x this
    PLAYS: 4,            // words the player may play
    CHANGEOUTS: 3,       // tile swaps
    RACK_SIZE: 7,
    // Length tiers: base points and base mult per band (Sandbox.TIERS).
    PTS_2: 0, MULT_2: 1,     // one or two letters
    PTS_3: 5, MULT_3: 2,
    PTS_4: 10, MULT_4: 3,
    PTS_5: 20, MULT_5: 4,
    PTS_6: 35, MULT_6: 5,
    PTS_7: 60, MULT_7: 7,    // seven or more
    GOLD_SMALL: 3,        // purse for felling a small enemy
    GOLD_BIG: 4,          // a big one
    GOLD_BOSS: 5,         // the boss
    GOLD_PER_WORD_LEFT: 1, // bonus per unplayed word at the win
    START_GOLD: 4,
    INTEREST_PER: 5,      // +1 gold per this much held at a round's end
    INTEREST_CAP: 5,
    // The shop (shop.js).
    ITEM_SLOTS: 5,
    CONSUMABLE_SLOTS: 2,
    CARD_SLOTS: 2,
    CARD_ITEM: 70, CARD_INK: 15, CARD_ETUDE: 15, // card slot roll, by weight
    PACK_SLOTS: 2,
    PACK_PRICE: 4,
    PACK_CHOICES: 3,      // keep one of this many
    INK_PRICE: 3,
    ETUDE_PRICE: 3,
    REROLL_PRICE: 5,
    REROLL_STEP: 1,
    // Inks (inks.js).
    INK_GILT: 20,         // points per gilt tile played
    INK_BOLD: 2,          // mult per bold tile played
    INK_STEEL: 1.2,       // x mult per steel tile left in the case
    INK_COIN_CAP: 10,
    // Skipping a small or big enemy (run.skip) pays a favour (Sandbox.FAVOURS).
    BOUNTY_GOLD: 8
  };

  // The favours a skipped enemy pays. One is drawn per skippable round and
  // shown on the round screen as the price of not fighting.
  Sandbox.FAVOURS = [
    { id: 'free_pack', name: 'Free Pack', hint: 'The next shop’s first pack is free' },
    { id: 'coupon', name: 'Coupon', hint: 'The next shop’s cards are free (packs still cost)' },
    { id: 'bounty', name: 'Bounty', hint: '+8 gold, now' }
  ];
  Sandbox.FAVOUR_DEFS = {};
  Sandbox.FAVOURS.forEach(function (f) { Sandbox.FAVOUR_DEFS[f.id] = f; });

  // Balatro's hand types: a word scores as the tier of its length. An étude
  // raises a tier's level; each level adds lvlPts to its points and lvlMult
  // to its mult for the rest of the run.
  Sandbox.TIERS = [
    { id: 't2', name: 'SHORT', minLen: 1, lvlPts: 5, lvlMult: 1 },
    { id: 't3', name: 'THREE', minLen: 3, lvlPts: 10, lvlMult: 1 },
    { id: 't4', name: 'FOUR', minLen: 4, lvlPts: 10, lvlMult: 1 },
    { id: 't5', name: 'FIVE', minLen: 5, lvlPts: 15, lvlMult: 2 },
    { id: 't6', name: 'SIX', minLen: 6, lvlPts: 20, lvlMult: 2 },
    { id: 't7', name: 'SEVEN', minLen: 7, lvlPts: 30, lvlMult: 3 }
  ];
  Sandbox.TIER_DEFS = {};
  Sandbox.TIERS.forEach(function (t) { Sandbox.TIER_DEFS[t.id] = t; });
  Sandbox.tierFor = function (word) {
    var len = String(word || '').length;
    var out = Sandbox.TIERS[0];
    Sandbox.TIERS.forEach(function (t) { if (len >= t.minLen) out = t; });
    return out;
  };
  // The tier's base points / mult at a level, read live from the tune so the
  // tuning panel can move them.
  Sandbox.tierStats = function (tier, tune, level) {
    var n = tier.id.slice(1);
    var lvl = Math.max(1, level || 1);
    return {
      pts: (tune['PTS_' + n] || 0) + tier.lvlPts * (lvl - 1),
      mult: (tune['MULT_' + n] || 0) + tier.lvlMult * (lvl - 1),
      level: lvl
    };
  };

  // POINTS x MULT for a word made of these tiles. `breakdown` keeps
  // Lexicon.scoreWord's fields (base, bonusFlat, variantFlat, bonusMult) so
  // the UI can itemise, plus the tier, ink and item parts, points / mult /
  // total. ctx: { tune, items, tierLevels, heldTiles, run, round, preview }.
  Sandbox.scoreWordPoints = function (word, tilesUsed, rackCapacity, ctx) {
    var Lexicon = window.Wordbound.Lexicon;
    var tune = ctx.tune;
    var b = Lexicon.scoreWord(word, tilesUsed, rackCapacity);
    b.lengthBonus = 0;
    b.bingoBonus = 0; // length is the tier now; no separate bingo
    var tier = Sandbox.tierFor(word);
    var ts = Sandbox.tierStats(tier, tune, ctx.tierLevels ? ctx.tierLevels[tier.id] : 1);
    b.tier = tier;
    b.tierName = tier.name;
    b.tierLevel = ts.level;
    b.tierPts = ts.pts;
    b.tierMult = ts.mult;
    // Inked tiles (inks.js): gilt and bold on the tiles played, steel on the
    // tiles left waiting in the case.
    b.inkPoints = 0;
    b.inkMult = 0;
    b.holdMult = 1;
    b.inkNotes = [];
    tilesUsed.forEach(function (t) {
      if (t.ink === 'gilt') { b.inkPoints += tune.INK_GILT; b.inkNotes.push('gilt ' + t.letter + ' +' + tune.INK_GILT); }
      else if (t.ink === 'bold') { b.inkMult += tune.INK_BOLD; b.inkNotes.push('bold ' + t.letter + ' +' + tune.INK_BOLD + ' mult'); }
    });
    (ctx.heldTiles || []).forEach(function (t) {
      if (t.ink === 'steel') { b.holdMult *= tune.INK_STEEL; b.inkNotes.push('steel ' + t.letter + ' held ×' + tune.INK_STEEL); }
    });
    b.holdMult = Math.round(b.holdMult * 1000) / 1000;
    // Items fire left to right on the running points and mult.
    var acc = {
      points: b.tierPts + b.base + b.bonusFlat + b.variantFlat + b.inkPoints,
      mult: b.tierMult + b.inkMult
    };
    var before = { points: acc.points, mult: acc.mult };
    var round = ctx.round;
    b.itemNotes = Sandbox.applyItems ? Sandbox.applyItems({
      word: word, tiles: tilesUsed, held: ctx.heldTiles || [], items: ctx.items || [],
      run: ctx.run, round: round, tune: tune, preview: !!ctx.preview,
      isLastPlay: !!round && round.playsLeft === 1,
      playIndex: round ? round.plays.length : 0
    }, acc) : [];
    if (round && round.rule && round.rule.score) {
      var rn = round.rule.score({ word: word, tiles: tilesUsed, round: round }, acc);
      if (rn) b.itemNotes.push({ id: round.rule.id, name: round.rule.name, note: rn });
    }
    b.itemPoints = acc.points - before.points;
    b.itemMult = acc.mult - before.mult; // net, for the one-line summary
    b.points = acc.points;
    b.mult = Math.round(acc.mult * b.bonusMult * b.holdMult * 100) / 100;
    b.lengthMult = b.tierMult; // kept for older readers of the breakdown
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
    var tierLevels = opts.tierLevels || {};
    var rule = (opts.rule && Sandbox.RULES && Sandbox.RULES[opts.rule]) || null;

    var round = {
      tune: tune,
      target: Math.round((opts.target != null ? opts.target : tune.MOVEMENT_BASE_1) * (rule && rule.targetMult ? rule.targetMult : 1)),
      rule: rule,
      usedLetters: {}, // letters played this round (the no_repeats rule)
      reward: opts.reward != null ? opts.reward : tune.GOLD_SMALL, // flat gold at the win
      playsLeft: Math.max(1, tune.PLAYS + (rule && rule.plays ? rule.plays : 0) + items.reduce(function (n, id) {
        var it = Sandbox.ITEM_DEFS[id]; return n + (it && it.plays ? it.plays : 0);
      }, 0)),
      changeoutsLeft: tune.CHANGEOUTS,
      rackSize: tune.RACK_SIZE,
      items: items,
      tierLevels: tierLevels,
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
        round.gold = round.reward + tune.GOLD_PER_WORD_LEFT * round.playsLeft;
        items.forEach(function (id) {
          var it = Sandbox.ITEM_DEFS[id];
          if (it && it.goldAtWin) round.gold += it.goldAtWin(round);
        });
      } else if (round.playsLeft <= 0) {
        round.state = 'lost';
      }
    }

    // The tiles that would stay in the case if these were played.
    function held(tilesUsed) {
      return round.rack.filter(function (t) { return tilesUsed.indexOf(t) < 0; });
    }

    // Rank helper: what would this word score off the CURRENT rack's tiles?
    // Falls back to plain letter values when the rack cannot form it, so the
    // word list can still order words it has no tiles for.
    round.breakdownFor = function (word) {
      var upper = String(word).toUpperCase();
      var form = Lexicon.canFormFromRack(upper, round.rack);
      var tiles = form.possible ? form.tilesUsed
        : upper.split('').map(function (l) { return { letter: l, bonus: null, variant: null }; });
      return Sandbox.scoreWordPoints(upper, tiles, round.rackSize, {
        tune: tune, items: items, tierLevels: tierLevels, heldTiles: held(tiles), run: opts.run, round: round, preview: true
      });
    };
    round.scoreFor = function (word) { return round.breakdownFor(word).total; };

    // The rule's word on a tile: may it be played now?
    round.isBarred = function (tile) {
      return !!(round.rule && round.rule.barsLetter && round.rule.barsLetter(round, tile.letter));
    };
    round.barredIn = function (tiles) {
      return tiles.filter(round.isBarred).map(function (t) { return t.letter; });
    };

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
      var barred = round.barredIn(form.tilesUsed);
      if (barred.length) return { ok: false, reason: barred.join(', ') + ' has been played this round — ' + round.rule.name + '.' };

      var breakdown = Sandbox.scoreWordPoints(upper, form.tilesUsed, round.rackSize, {
        tune: tune, items: items, tierLevels: tierLevels, heldTiles: held(form.tilesUsed), run: opts.run, round: round
      });
      if (opts.run) {
        items.forEach(function (id) {
          var it = Sandbox.ITEM_DEFS[id];
          if (it && it.onPlayed) it.onPlayed(opts.run, breakdown);
        });
      }
      var messages = [];
      Lexicon.removeTiles(round.rack, form.tilesUsed);
      round.pile.discardPile.push.apply(round.pile.discardPile, form.tilesUsed);
      refill();
      form.tilesUsed.forEach(function (t) { round.usedLetters[t.letter] = true; });
      round.score += breakdown.total;
      round.playsLeft -= 1;
      round.plays.push({ word: upper, breakdown: breakdown, messages: messages });
      settle();
      var res = { ok: true, word: upper, breakdown: breakdown, messages: messages };
      if (opts.onPlay) opts.onPlay(res);
      return res;
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

    // An Erase ink: the tile leaves the case for good and the case refills.
    round.destroyTile = function (tileId) {
      var i = round.rack.findIndex(function (t) { return t.id === tileId; });
      if (i < 0) return false;
      round.rack.splice(i, 1);
      refill();
      return true;
    };

    // Rearrange the rack by hand: the player's own ordering, nothing scored.
    round.moveTile = function (from, to) {
      if (from === to || from < 0 || to < 0 || from >= round.rack.length || to >= round.rack.length) return false;
      var t = round.rack.splice(from, 1)[0];
      round.rack.splice(to, 0, t);
      return true;
    };

    return round;
  };

  // A RUN down the lineup in enemies.js: movements of small / big / boss,
  // each a round with a higher target. Every round draws a fresh rack from
  // run.deck -- one bag for the whole run, which the shop's tile packs and
  // inks grow and mark. Gold pools across the run and earns INTEREST at every
  // win, and every win short of the last opens the SHOP. Lose a round and the
  // run is lost; fell the last boss and the run is won.
  Sandbox.createRun = function (opts) {
    var tune = Object.assign({}, Sandbox.ROUND_DEFAULTS, opts.tune || {});
    var MOVEMENTS = Sandbox.MOVEMENTS || [];
    var run = {
      tune: tune,
      movements: MOVEMENTS,
      movement: 0,
      stage: 0,
      enemy: null,
      round: null,
      deck: opts.deck || (opts.makeDeck ? opts.makeDeck() : []),
      items: (opts.items || []).slice(), // carried into every round from here on
      startItems: (opts.items || []).slice(), // what the run set out with
      consumables: [], // inks and études held, CONSUMABLE_SLOTS deep
      itemState: {},   // scaling items' counters (items.js), e.g. refrain
      shop: null,    // open between fights (shop.js)
      pack: null,    // an opened pack awaiting run.pick
      tierLevels: {}, // études: { tierId: level }, level 1 when absent
      gold: tune.START_GOLD,
      felled: [],    // enemy ids beaten so far
      skipped: [],   // enemy ids skipped for a favour
      favours: [],   // favour ids owed to the next shop (free_pack, coupon)
      bestPlay: null, // { word, breakdown, enemy } the run's best word
      wordsPlayed: 0,
      lastWin: null, // { reward, interest } of the latest win, for the UI
      state: 'live'
    };
    var KIND_MULT = { small: 1, big: tune.BIG_MULT, boss: tune.BOSS_MULT };
    var KIND_GOLD = { small: tune.GOLD_SMALL, big: tune.GOLD_BIG, boss: tune.GOLD_BOSS };
    run.targetFor = function (movement, stage) {
      var e = Sandbox.enemyAt(movement, stage);
      var base = tune['MOVEMENT_BASE_' + (movement + 1)] || tune.MOVEMENT_BASE_1 * Math.pow(2.5, movement);
      return Math.round(base * (e ? KIND_MULT[e.kind] || 1 : 1));
    };
    run.interestPreview = function () {
      return Math.min(tune.INTEREST_CAP, Math.floor(run.gold / tune.INTEREST_PER));
    };
    function begin() {
      run.enemy = Sandbox.enemyAt(run.movement, run.stage);
      run.round = Sandbox.createRound({
        rng: opts.rng, deck: run.deck, tune: tune, items: run.items, run: run,
        target: run.targetFor(run.movement, run.stage),
        reward: KIND_GOLD[run.enemy.kind],
        rule: run.enemy.rule,
        tierLevels: run.tierLevels,
        onPlay: function (res) {
          run.wordsPlayed += 1;
          if (!run.bestPlay || res.breakdown.total > run.bestPlay.breakdown.total) {
            run.bestPlay = { word: res.word, breakdown: res.breakdown, enemy: run.enemy.name };
          }
        }
      });
      // The favour on offer for walking past this one; bosses cannot be skipped.
      run.round.favour = run.enemy.kind === 'boss' ? null
        : Sandbox.FAVOURS[opts.rng.randInt(0, Sandbox.FAVOURS.length - 1)].id;
    }
    // Skip the current enemy for its favour: only before a word is played,
    // never a boss. Bounty pays now; the others are owed to the next shop.
    // No shop opens after a skip. Returns { ok, favour } | { ok:false, reason }.
    run.skip = function () {
      var r = run.round;
      if (run.state !== 'live' || !r || r.state !== 'live' || run.shop) return { ok: false, reason: 'Nothing to skip.' };
      if (!r.favour) return { ok: false, reason: 'The boss cannot be skipped.' };
      if (r.plays.length) return { ok: false, reason: 'Too late — a word has been played.' };
      var favour = r.favour;
      if (favour === 'bounty') run.gold += tune.BOUNTY_GOLD;
      else run.favours.push(favour);
      run.skipped.push(run.enemy.id);
      run.stage += 1;
      if (run.stage >= MOVEMENTS[run.movement].enemies.length) { run.stage = 0; run.movement += 1; }
      begin();
      return { ok: true, favour: favour };
    };
    // Reorder the held items: they fire left to right.
    run.moveItem = function (from, to) {
      if (from === to || from < 0 || to < 0 || from >= run.items.length || to >= run.items.length) return false;
      var id = run.items.splice(from, 1)[0];
      run.items.splice(to, 0, id);
      return true;
    };
    // An étude: raise one length tier a level for the rest of the run.
    run.levelTier = function (tierId) {
      if (!Sandbox.TIER_DEFS[tierId]) return false;
      run.tierLevels[tierId] = (run.tierLevels[tierId] || 1) + 1;
      return true;
    };
    // Settle the current round into the run: bank the reward, then the
    // interest on what is held. A win on the way to the last boss opens the
    // shop (run.shop; leave it with run.leaveShop). Returns the run state.
    run.next = function () {
      var r = run.round;
      if (run.state !== 'live' || !r || r.state === 'live' || run.shop) return run.state;
      if (r.state === 'lost') { run.state = 'lost'; return run.state; }
      run.gold += r.gold;
      var interest = run.interestPreview();
      run.gold += interest;
      run.lastWin = { reward: r.gold, interest: interest };
      run.felled.push(run.enemy.id);
      var last = run.movement >= MOVEMENTS.length - 1 && run.stage >= MOVEMENTS[run.movement].enemies.length - 1;
      if (last) { run.state = 'won'; return run.state; }
      run.stage += 1;
      if (run.stage >= MOVEMENTS[run.movement].enemies.length) { run.stage = 0; run.movement += 1; }
      run.enemy = Sandbox.enemyAt(run.movement, run.stage); // the one ahead, for the shop's door
      run.shop = Sandbox.createShop ? Sandbox.createShop(run, opts.rng) : null;
      if (!run.shop) begin();
      return run.state;
    };
    // Close the shop and begin the next round. Returns false if no shop is
    // open or a pack is still unsettled.
    run.leaveShop = function () {
      if (!run.shop || run.pack) return false;
      run.shop = null;
      begin();
      return true;
    };
    // Use a held consumable. An étude needs nothing else; an ink takes the
    // ids of the tiles it is applied to (inks.js, Phase 4).
    run.useConsumable = function (i, tileIds, extra) {
      var c = run.consumables[i];
      if (!c) return { ok: false, reason: 'Nothing there.' };
      if (c.kind === 'etude') {
        run.levelTier(c.id);
        run.consumables.splice(i, 1);
        return { ok: true, used: c };
      }
      if (c.kind === 'ink' && Sandbox.applyInk) {
        var res = Sandbox.applyInk(run, c.id, tileIds || [], extra);
        if (!res.ok) return res;
        run.consumables.splice(i, 1);
        return { ok: true, used: c, result: res };
      }
      return { ok: false, reason: 'That cannot be used yet.' };
    };
    run.sellConsumable = function (i) {
      var c = run.consumables[i];
      if (!c) return { ok: false, reason: 'Nothing there.' };
      run.consumables.splice(i, 1);
      var paid = Math.floor((c.kind === 'ink' ? tune.INK_PRICE : tune.ETUDE_PRICE) / 2);
      run.gold += paid;
      return { ok: true, paid: paid };
    };
    begin();
    return run;
  };
})();
