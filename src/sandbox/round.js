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
//                           Sandbox.MOVEMENTS (enemies.js): three movements of
//                           small / big / boss, targets MOVEMENT_BASE_n x
//                           1 / BIG_MULT / BOSS_MULT, gold pooled with
//                           INTEREST (1 per INTEREST_PER held, cap
//                           INTEREST_CAP) paid at each win.
//     run.movement, run.stage (both 0-based), run.enemy, run.round,
//       run.gold, run.state ('live' | 'won' | 'lost'), run.next()
//     run.targetFor(movement, stage), run.interestPreview()
//     run.pile -- { drawPile, discardPile }: this fight's bag, reshuffled from
//                 the deck at the start of every fight
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
//       .state ('live' | 'won' | 'lost'), .plays [{ word, breakdown, tiles }],
//       .gold; breakdown.steps is the ordered step list (Sandbox.scoreSteps)
//       the UI's scoring cascade narrates
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
    MOVEMENT_BASE_3: 1200, // third movement, x1.6 -- untuned, see NIGHT_REPORT
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
    BOUNTY_GOLD: 8,
    // Premium slots (DIVERGENCE_PLAN.md): one stick position may carry a
    // bonus for the round, rolled at creation. DL/TL multiply that tile's
    // own letter points; DW multiplies the whole word's mult.
    PREMIUM_CHANCE: 0.55, // odds a round has a premium slot at all
    PREMIUM_DL: 2,        // x letter points on the tile in the slot
    PREMIUM_TL: 3,
    PREMIUM_DW: 2         // x mult, whole word
  };

  // The three premium kinds a stick slot can roll (weighted; DW is scarcer
  // since it multiplies the whole word rather than one tile).
  Sandbox.PREMIUM_KINDS = [
    { id: 'dl', name: 'Double Letter', weight: 3 },
    { id: 'tl', name: 'Triple Letter', weight: 2 },
    { id: 'dw', name: 'Double Word', weight: 1 }
  ];

  // KEYS (NEXT_LEVEL_PLAN.md stage 3): Balatro's stakes, named for musical
  // keys. Each is the one before it plus one rule, so applyKey below just
  // layers effects up to the chosen key's index. C major is the base game.
  Sandbox.KEYS = [
    { id: 'c_major', name: 'C major', hint: 'the base game' },
    { id: 'g_major', name: 'G major', hint: 'targets ×1.15' },
    { id: 'd_major', name: 'D major', hint: 'one fewer swap per round' },
    { id: 'a_minor', name: 'A minor', hint: 'the premium slot never appears on boss rounds' },
    { id: 'e_minor', name: 'E minor', hint: 'shop reroll starts at 7' },
    { id: 'b_minor', name: 'B minor', hint: 'no skip favours' }
  ];
  Sandbox.KEY_DEFS = {};
  Sandbox.KEYS.forEach(function (k, i) { k.index = i; Sandbox.KEY_DEFS[k.id] = k; });
  // Layers every key's rule up to and including `keyId` onto a copy of tune.
  // KEY_TARGET_MULT/KEY_NO_BOSS_PREMIUM/KEY_NO_SKIP are read by targetFor,
  // rollPremium (via createRun's opts.noPremium) and run.skip respectively.
  Sandbox.applyKey = function (tune, keyId) {
    var key = Sandbox.KEY_DEFS[keyId] || Sandbox.KEYS[0];
    var out = Object.assign({}, tune);
    if (key.index >= 1) out.KEY_TARGET_MULT = 1.15; // G major
    if (key.index >= 2) out.CHANGEOUTS = Math.max(0, out.CHANGEOUTS - 1); // D major
    if (key.index >= 3) out.KEY_NO_BOSS_PREMIUM = true; // A minor
    if (key.index >= 4) out.REROLL_PRICE = 7; // E minor
    if (key.index >= 5) out.KEY_NO_SKIP = true; // B minor
    return out;
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

  // A word's plain base points at tier level 1 -- no ink, no items, no run
  // scaling. Used only by Harmony (items.js) to price the chord it finds in
  // the leftover case tiles; deliberately simpler than scoreWordPoints.
  Sandbox.chordPoints = function (word, tune) {
    var Lexicon = window.Wordbound.Lexicon;
    var tier = Sandbox.tierFor(word);
    var base = tune['PTS_' + tier.id.slice(1)] || 0;
    var letters = 0;
    word.split('').forEach(function (ch) { letters += Lexicon.LETTER_VALUES[ch] || 0; });
    return base + letters;
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
    // The round's premium slot (Sandbox.PREMIUM_KINDS): a fixed stick
    // position that bonuses whichever tile lands there. Only fires if the
    // played word actually reaches that position.
    b.slotPoints = 0;
    b.slotMultRatio = 1;
    b.slotKind = null;
    b.slotTile = null;
    var round0 = ctx.round;
    if (round0 && round0.premium && tilesUsed[round0.premium.pos]) {
      var slotTile = tilesUsed[round0.premium.pos];
      var slotLetterVal = Lexicon.LETTER_VALUES[slotTile.letter] || 0;
      var kind = round0.premium.kind;
      if (kind === 'dl') b.slotPoints = slotLetterVal * (tune.PREMIUM_DL - 1);
      else if (kind === 'tl') b.slotPoints = slotLetterVal * (tune.PREMIUM_TL - 1);
      else if (kind === 'dw') b.slotMultRatio = tune.PREMIUM_DW;
      b.slotKind = kind;
      b.slotTile = slotTile;
    }
    // Items fire left to right on the running points and mult.
    var acc = {
      points: b.tierPts + b.base + b.bonusFlat + b.variantFlat + b.inkPoints + b.slotPoints,
      mult: (b.tierMult + b.inkMult) * b.slotMultRatio
    };
    var before = { points: acc.points, mult: acc.mult };
    var round = ctx.round;
    b.itemNotes = Sandbox.applyItems ? Sandbox.applyItems({
      word: word, tiles: tilesUsed, held: ctx.heldTiles || [], items: ctx.items || [],
      run: ctx.run, round: round, tune: tune, preview: !!ctx.preview,
      crescendo: !!(ctx.crescendo && ctx.crescendo.phase === 'live'),
      crescendoSoon: !!(ctx.crescendo && ctx.crescendo.phase === 'soon'),
      crescendoMag: ctx.crescendo && ctx.crescendo.mag != null ? ctx.crescendo.mag : 1,
      isLastPlay: !!round && round.playsLeft === 1,
      playIndex: round ? round.plays.length : 0
    }, acc) : [];
    // Harmony's chord (items.js sets acc.chord instead of touching acc.points
    // directly, so it lands as its own cascade step after the items).
    b.chordWord = null;
    if (acc.chord) {
      acc.points += acc.chord.points;
      b.chordWord = acc.chord.word;
      b.itemNotes.push({ id: 'harmony', name: 'Chord', note: '+' + acc.chord.points + ', ' + acc.chord.word,
        chord: true, dPts: acc.chord.points, dMult: 0, ratio: 1, kind: 'pts' });
    }
    var ruleNote = null;
    if (round && round.rule && round.rule.score) {
      var p0 = acc.points, m0 = acc.mult;
      var rn = round.rule.score({ word: word, tiles: tilesUsed, round: round }, acc);
      if (rn) {
        ruleNote = { id: round.rule.id, name: round.rule.name, note: rn, rule: true };
        if (Sandbox.describeDelta) Sandbox.describeDelta(ruleNote, p0, m0, acc);
        b.itemNotes.push(ruleNote);
      }
    }
    // Whether this play landed on a live crescendo window -- read by
    // onPlayed hooks after the play resolves (Sustain, items.js), not just
    // by score() during it.
    b.crescendo = !!(ctx.crescendo && ctx.crescendo.phase === 'live');
    b.itemPoints = acc.points - before.points;
    b.itemMult = acc.mult - before.mult; // net, for the one-line summary
    b.points = acc.points;
    b.mult = Math.round(acc.mult * b.bonusMult * b.holdMult * 100) / 100;
    b.lengthMult = b.tierMult; // kept for older readers of the breakdown
    b.total = Math.round(b.points * b.mult);
    b.steps = Sandbox.scoreSteps(b, tilesUsed, ctx.heldTiles || [], tune);
    return b;
  };

  // The ORDERED STEP LIST the scoring cascade narrates: the same maths as
  // the breakdown, one entry per thing that changed points or mult, in the
  // order they fired. Each step is { kind, pts?, mult?, ratio?, label } plus
  // kind-specific fields; running pts/mult after every step are `runPts`
  // and `runMult` so the UI can count without re-adding.
  //   tier   { name, level }
  //   letter { tile, letter, ink } (pts = letter value; gilt adds pts,
  //            bold adds mult; a tile bonus folds in as bonusPts)
  //   hold   { tile } a steel tile left in the case (ratio)
  //   slot   { slotKind, tile } the round's premium stick slot, if the word
  //            reached it (dl/tl: pts on that tile; dw: ratio on the mult)
  //   item   { id, name, note }; rule { id, name, note } the tempo marking
  //   tilex  the tile's own x-mult (Lexicon bonusMult), if any
  Sandbox.scoreSteps = function (b, tilesUsed, heldTiles, tune) {
    var Lexicon = window.Wordbound.Lexicon;
    var steps = [];
    var pts = 0, mult = 0;
    function push(step) {
      pts += step.pts || 0;
      mult += step.mult || 0;
      if (step.ratio && step.ratio !== 1) mult *= step.ratio;
      step.runPts = pts;
      step.runMult = Math.round(mult * 1000) / 1000;
      steps.push(step);
    }
    push({ kind: 'tier', name: b.tierName, level: b.tierLevel, pts: b.tierPts, mult: b.tierMult, label: b.tierName });
    // Letter values, tile bonuses and the played tiles' inks. Lexicon.scoreWord
    // already summed these; here they are attributed tile by tile so the sum
    // of the letter steps equals base + bonusFlat + variantFlat + inkPoints.
    var perTile = tilesUsed.map(function (t) {
      return { tile: t, pts: Lexicon.LETTER_VALUES[t.letter] || 0, mult: 0, ink: t.ink || null };
    });
    var letterSum = perTile.reduce(function (n, x) { return n + x.pts; }, 0);
    // Anything scoreWord added beyond plain letter values (bonus squares,
    // charged variants) lands on the first tile, so the running total stays
    // honest even when a bonus cannot be attributed.
    var extra = (b.base - letterSum) + (b.bonusFlat || 0) + (b.variantFlat || 0);
    if (perTile.length && extra) perTile[0].bonusPts = extra;
    perTile.forEach(function (x) {
      var step = { kind: 'letter', tile: x.tile, letter: x.tile.letter, ink: x.ink, pts: x.pts + (x.bonusPts || 0), mult: 0, label: x.tile.letter };
      if (x.ink === 'gilt') step.pts += tune.INK_GILT;
      if (x.ink === 'bold') step.mult += tune.INK_BOLD;
      push(step);
    });
    if (b.slotKind) {
      var slotLabel = b.slotKind === 'dw' ? 'DOUBLE WORD' : (b.slotKind === 'tl' ? 'TRIPLE LETTER' : 'DOUBLE LETTER');
      push({ kind: 'slot', slotKind: b.slotKind, tile: b.slotTile, letter: b.slotTile.letter,
        pts: b.slotPoints, mult: 0, ratio: b.slotMultRatio, label: slotLabel,
        tone: b.slotKind === 'dw' ? 'mult' : 'pts' });
    }
    (b.itemNotes || []).forEach(function (n) {
      push({ kind: n.rule ? 'rule' : (n.chord ? 'chord' : 'item'), id: n.id, name: n.name, note: n.note, label: n.name,
        pts: n.dPts || 0, mult: n.dMult || 0, ratio: n.ratio || 1, tone: n.kind || 'pts' });
    });
    if (b.bonusMult && b.bonusMult !== 1) push({ kind: 'tilex', ratio: b.bonusMult, label: 'tile ×' + b.bonusMult, tone: 'mult' });
    heldTiles.forEach(function (t) {
      if (t.ink === 'steel') push({ kind: 'hold', tile: t, letter: t.letter, ratio: tune.INK_STEEL, label: 'steel ' + t.letter + ' held', tone: 'mult' });
    });
    return steps;
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
    // The soundtrack's crescendo state right now ({ phase, mag?, ... }) or
    // null. Supplied by the UI (it owns the audio); absent in a headless
    // round, so always null there -- crescendo/soon items never fire.
    function onCrescendo() { return (opts.crescendo && opts.crescendo()) || null; }

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
      // The bag: the run's pile when there is a run (played and swapped tiles
      // go to the discard, which only comes back once the bag runs dry), a
      // fresh shuffle for a lone round.
      pile: opts.pile || { drawPile: Tiles.shuffleIntoDrawPile(opts.deck, rng), discardPile: [] },
      rack: [],
      // The premium slot (DIVERGENCE_PLAN.md): one stick position, rolled
      // now so it can be drawn empty before any tile lands there. A boss's
      // tempo marking may fix the position (rule.premiumPos).
      premium: null
    };
    (function rollPremium() {
      if (rule && rule.noPremium) return;
      if (opts.noPremium) return; // A minor: never on a boss round
      if (!rng.chance(tune.PREMIUM_CHANCE)) return;
      var kind = rng.weightedChoice(Sandbox.PREMIUM_KINDS, function (k) { return k.weight; });
      if (!kind) return;
      var pos = rule && rule.premiumPos != null ? rule.premiumPos
        : rng.weightedChoice([0, 1, 2, 3, 4], function (p) { return [1, 2, 3, 2, 1][p]; });
      round.premium = { pos: pos, kind: kind.id };
    })();

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
        tune: tune, items: items, tierLevels: tierLevels, heldTiles: held(tiles), run: opts.run, round: round, preview: true,
        crescendo: onCrescendo()
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
        tune: tune, items: items, tierLevels: tierLevels, heldTiles: held(form.tilesUsed), run: opts.run, round: round,
        crescendo: onCrescendo()
      });
      if (opts.run) {
        items.forEach(function (id) {
          var it = Sandbox.ITEM_DEFS[id];
          if (it && it.onPlayed) it.onPlayed(opts.run, breakdown);
        });
      }
      var messages = [];
      Lexicon.removeTiles(round.rack, form.tilesUsed);
      // The whole rack turns over on a play: the tiles just used AND whatever
      // was left waiting both go to the discard, so the next turn is a fresh draw.
      round.pile.discardPile.push.apply(round.pile.discardPile, form.tilesUsed);
      round.pile.discardPile.push.apply(round.pile.discardPile, round.rack);
      round.rack = [];
      refill();
      form.tilesUsed.forEach(function (t) { round.usedLetters[t.letter] = true; });
      round.score += breakdown.total;
      round.playsLeft -= 1;
      round.plays.push({ word: upper, breakdown: breakdown, messages: messages, tiles: form.tilesUsed });
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
    var tune = Sandbox.applyKey(Object.assign({}, Sandbox.ROUND_DEFAULTS, opts.tune || {}), opts.key);
    var MOVEMENTS = Sandbox.MOVEMENTS || [];
    var run = {
      key: opts.key || Sandbox.KEYS[0].id,
      tune: tune,
      movements: MOVEMENTS,
      movement: 0,
      stage: 0,
      enemy: null,
      round: null,
      deck: opts.deck || (opts.makeDeck ? opts.makeDeck() : []),
      pile: null,    // { drawPile, discardPile } shared by every round; set below
      items: (opts.items || []).slice(), // carried into every round from here on
      startItems: (opts.items || []).slice(), // what the run set out with
      consumables: [], // inks and études held, CONSUMABLE_SLOTS deep
      itemState: {},   // scaling items' counters (items.js), e.g. refrain
      shop: null,    // open between fights (shop.js)
      letterChoice: null, // { options, last } offered after a boss (stolenLetters.js)
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
      return Math.round(base * (e ? KIND_MULT[e.kind] || 1 : 1) * (tune.KEY_TARGET_MULT || 1));
    };
    run.interestPreview = function () {
      return Math.min(tune.INTEREST_CAP, Math.floor(run.gold / tune.INTEREST_PER));
    };
    // The bag is the whole deck reshuffled at the start of every fight.
    // Within a fight, played and swapped tiles wait in the discard pile and
    // only come back once the bag runs dry.
    function discardRack() {
      var r = run.round;
      if (!r) return;
      r.pile.discardPile.push.apply(r.pile.discardPile, r.rack);
      r.rack = [];
    }
    run.addTile = function (tile) { run.deck.push(tile); };
    // Sustain (items.js): hold the soundtrack's crescendo window open extraSec
    // longer. Supplied by the UI (it owns the audio); a no-op headless.
    run.extendCrescendo = opts.extendCrescendo || function () {};
    function begin() {
      run.enemy = Sandbox.enemyAt(run.movement, run.stage);
      run.pile = { drawPile: window.Wordbound.Tiles.shuffleIntoDrawPile(run.deck, opts.rng), discardPile: [] };
      run.round = Sandbox.createRound({
        rng: opts.rng, deck: run.deck, pile: run.pile, tune: tune, items: run.items, run: run,
        crescendo: opts.crescendo,
        noPremium: !!(tune.KEY_NO_BOSS_PREMIUM && run.enemy.kind === 'boss'),
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
      if (tune.KEY_NO_SKIP) return { ok: false, reason: 'No skipping in B minor.' };
      if (!r.favour) return { ok: false, reason: 'The boss cannot be skipped.' };
      if (r.plays.length) return { ok: false, reason: 'Too late — a word has been played.' };
      var favour = r.favour;
      if (favour === 'bounty') run.gold += tune.BOUNTY_GOLD;
      else run.favours.push(favour);
      run.skipped.push(run.enemy.id);
      discardRack();
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
    // Finish settling a win once any letter choice is resolved (or there was
    // none to offer): open the shop or, for the last boss, end the run.
    function finishWin(last) {
      if (last) { run.state = 'won'; return run.state; }
      discardRack();
      run.stage += 1;
      if (run.stage >= MOVEMENTS[run.movement].enemies.length) { run.stage = 0; run.movement += 1; }
      run.enemy = Sandbox.enemyAt(run.movement, run.stage); // the one ahead, for the shop's door
      run.shop = Sandbox.createShop ? Sandbox.createShop(run, opts.rng) : null;
      if (!run.shop) begin();
      return run.state;
    }
    // Settle the current round into the run: bank the reward, then the
    // interest on what is held. Felling a boss may pause here with
    // run.letterChoice open (stolenLetters.js) -- run.pickLetter resumes. A
    // win on the way to the last boss opens the shop (run.shop; leave it with
    // run.leaveShop). Returns the run state.
    run.next = function () {
      var r = run.round;
      if (run.state !== 'live' || !r || r.state === 'live' || run.shop || run.letterChoice) return run.state;
      if (r.state === 'lost') { run.state = 'lost'; return run.state; }
      run.gold += r.gold;
      var interest = run.interestPreview();
      run.gold += interest;
      run.lastWin = { reward: r.gold, interest: interest };
      run.felled.push(run.enemy.id);
      var wasBoss = run.enemy.kind === 'boss';
      var last = run.movement >= MOVEMENTS.length - 1 && run.stage >= MOVEMENTS[run.movement].enemies.length - 1;
      if (wasBoss && Sandbox.rollLetterChoice) {
        var choices = Sandbox.rollLetterChoice(opts.rng, 3);
        if (choices && choices.length) { run.letterChoice = { options: choices, last: last }; return run.state; }
      }
      return finishWin(last);
    };
    // Take one of the letters offered by run.letterChoice, persist it
    // (stolenLetters.js), and resume the win it interrupted.
    run.pickLetter = function (letter) {
      if (!run.letterChoice) return false;
      if (run.letterChoice.options.indexOf(letter) < 0) return false;
      if (Sandbox.winLetter) Sandbox.winLetter(letter);
      var last = run.letterChoice.last;
      run.letterChoice = null;
      finishWin(last);
      return true;
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
    // Play an ink bought straight out of the shop while every consumable
    // slot was full (shop.js takeConsumable) -- it was never stored, so
    // there is nothing to splice out of run.consumables afterward.
    run.useAdhocInk = function (id, tileIds, extra) {
      if (!Sandbox.applyInk) return { ok: false, reason: 'That cannot be used yet.' };
      return Sandbox.applyInk(run, id, tileIds || [], extra);
    };
    // A fresh hand drawn to use an ink on the spot, right after buying or
    // keeping it -- before either of run.useAdhocInk or run.saveInk decides
    // what happens to it.
    run.drawInkHand = function () {
      var Tiles = window.Wordbound.Tiles;
      return Tiles.shuffleIntoDrawPile(run.deck, opts.rng).slice(0, Math.min(tune.RACK_SIZE, run.deck.length));
    };
    // Hold an ink just bought or kept in run.consumables instead of using it
    // now -- the other half of the choice offered alongside run.useAdhocInk.
    run.saveInk = function (id) {
      if (run.consumables.length >= tune.CONSUMABLE_SLOTS) return { ok: false, reason: 'No room for another ink — use or sell one first.' };
      run.consumables.push({ kind: 'ink', id: id });
      return { ok: true };
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
