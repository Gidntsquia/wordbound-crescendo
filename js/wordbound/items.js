// js/wordbound/items.js
// Rack-modifier items. No shop, no currency -- items are found as a free
// pick-one-of-3 at Treasure nodes (see items scoped work in Task #10). This
// mirrors the old game's statMods+hooks split (Data.Items) but trimmed to
// exactly the hook points Wordbound's combat loop actually needs.
//
// PUBLIC API (window.Wordbound.Items):
//   ITEM_DEFS[id] = {
//     id, name, hint, rarity,
//     statMods: { rackCapacityBonus, damageReductionFlat },
//     hooks: {
//       onRunStart(ctx)      ctx = { player, pileState } -- fires at the
//                            start of every fight; pileState is that fight's
//                            { drawPile, discardPile } (see tiles.js), still
//                            empty of a drawn rack at this point.
//       onDraw(ctx)          ctx = { player, drawnTiles, pileState, rng }
//                            drawnTiles is the array of Tile objects just
//                            drawn (tiles.js); hooks may mutate it in place.
//       onWordPlayed(ctx)    ctx = { player, monster, word, tilesUsed, result,
//                            previousWord, wordsPlayedThisFight, messages }.
//                            tilesUsed is the array of Tile objects played.
//                            result is the object Combat.playWord returned;
//                            hooks may add to result.damage (already applied
//                            to monster.hp by the caller's follow-up) or heal
//                            player.ink. See applyBonusDamage below.
//                            previousWord (GOALS.md "FUN OVERHAUL 4/8") is the
//                            upper-cased word played immediately before this
//                            one THIS FIGHT, or null on the fight's first word
//                            (repeats count as their own previous word too --
//                            this just tracks sequence, independent of
//                            combo/novelty). wordsPlayedThisFight is a 1-based
//                            count of words played so far this fight,
//                            INCLUDING this one and any repeats (so ===1 means
//                            "this is the fight's first word"). messages is an
//                            array hooks can push user-facing strings onto
//                            (e.g. "Gilded Bookmark: x2!") -- the caller logs
//                            each one after all hooks run. Silent modifiers
//                            don't create builds; every new proc should push
//                            a message here.
//       onPlayerDamaged(ctx) ctx = { player, monster, damage } -- damage is
//                            mutable; caller applies ctx.damage, not the
//                            original amount. Turn-based fights only (a duel
//                            fight never calls this -- see onDuelBlockLost).
//       onDuelBlockLost(ctx) ctx = { player, duel, monster } -- the duel-mode
//                            analog of onPlayerDamaged, fired by
//                            Game.startDuelFight on the gauge engine's own
//                            'block-lost' event, AFTER duel.js has already
//                            decremented duel.healthBlocks for this loss (0
//                            means this loss would be fatal). A duel fight
//                            has no per-word "damage amount" to cap, only a
//                            discrete Verse (health block) loss -- hooks that
//                            want to save the player mutate
//                            ctx.duel.healthBlocks directly (e.g. reviving 0
//                            back to 1); the caller re-checks the LIVE value
//                            afterward, so a hook here can genuinely cancel a
//                            pending defeat. Per the "don't keep two life
//                            systems" decision (GOALS.md, DUEL-GAUGE COMBAT
//                            ticket), this and onPlayerDamaged never both
//                            fire for the same fight.
//       onFloorAdvance(ctx) ctx = { player, floorNumber, messages } -- fires
//                            once when a floor is cleared and the run
//                            advances to the next one (game.js
//                            advanceFloor), BEFORE the new floor is
//                            generated. floorNumber is the floor just
//                            entered. messages works like onWordPlayed's:
//                            push a user-facing string to have the caller
//                            log it. Added for CONTENT ticket (GOALS.md,
//                            2026-08-21)'s Acquisitions Budget -- the only
//                            item using this hook so far.
//     }
//   }
//   getRackCapacity(player) -> 7 + sum of owned rackCapacityBonus, then
//       the product of any owned rackCapacityMult statMods (ITEMS ticket's
//       FORTISSIMO), rounded and clamped to never go below
//       MIN_RACK_CAPACITY.
//   getTempoScale(player) -> 1, or product of any owned tempoScale statMods
//       (ITEMS ticket's RITARDANDO -- see its def for why this multiplies
//       rather than adds).
//   getScoreMultiplier(player) -> 1, or product of any owned
//       scoreMultiplier statMods (ITEMS ticket's FORTISSIMO) -- read by
//       combat.js's Combat.playWord as a final damage multiplier.
//   getDuelPushResistance(player) -> 0, or the sum of owned
//       duelPushResistance statMods (ITEMS ticket, AMENDED batch), clamped to
//       [0, 0.9] -- read by game.js's Game.startDuelFight as Duel.create's
//       own pushResistance opt (duel.js multiplies every tick's music push
//       by (1 - pushResistance)). Sums rather than multiplies (unlike
//       getTempoScale/getScoreMultiplier) since a fraction reduction
//       composes additively in the intuitive sense players expect from
//       "resistance" -- two 20% items feel like 40% off, not 36% off -- and
//       the clamp keeps that from ever reaching 100%.
//   getDuelIframeBonus(player) -> 0, or the sum of owned duelIframeBonusSec
//       statMods -- read by Game.startDuelFight as Duel.create's own
//       iframeBonusSec opt (added on top of Duel.IFRAME_DURATION_SEC when a
//       block is lost).
//   getDuelParryWindowBonus(player) -> 0, or the sum of owned
//       duelParryWindowBonusSec statMods -- read by Game.startDuelFight as
//       Duel.create's own parryWindowBonusSec opt (added on top of
//       Duel.PARRY_WINDOW_SEC in attemptParry).
//   bypassesWordValidity(word, player) -> true if `word` is exactly 3
//       letters and the player owns Poetic License (ITEMS ticket) -- the
//       second validity gate combat.js's playWord/previewWord check after
//       Lexicon.isValidWord.
//   isWordValid(word, player) -> the ONE validity decision combat.js's
//       playWord/previewWord both call (ITEMS ticket, THE INVERTED SCORE):
//       normally isValidWord(word) || bypassesWordValidity(word, player),
//       but while the player owns The Inverted Score, that whole OR chain
//       is REPLACED by upsideDownValid(word, player) instead of extended --
//       see that function's own comment for why this is exclusive, not
//       additive.
//   flipUpsideDown(word) -> the word with each letter flipped per FLIP_MAP
//       and the whole result reversed (turning a strip of tiles 180
//       degrees does both at once), or null the instant any letter has no
//       clean flipped form (ITEMS ticket's own "letters without a clean
//       flipped form make a word unplayable" rule).
//   hasInvertedScore(player) -> true if the player owns 'inverted_score'.
//   upsideDownValid(word, player) -> true only if hasInvertedScore(player)
//       AND flipUpsideDown(word) is itself a real dictionary word.
//   applyOnAcquire(player, itemId) -> calls ITEM_DEFS[itemId].onAcquire(player)
//       if the def has one (ITEMS ticket, AMENDED batch's health items) --
//       a ONE-SHOT effect fired exactly once, the moment an item is added to
//       player.items (game.js's Game.pickTreasureItem/buyItem/
//       pickBossItemReward each call this right after their own
//       player.items.push), not a per-word/per-fight hook like everything in
//       the `hooks` object above. Needed because "increase max health
//       blocks" (Extra Verse) is a permanent one-time stat change at pickup
//       time, not a recurring proc -- reusing onRunStart (which actually
//       fires every FIGHT, not once per run, despite its name -- see that
//       hook's own doc above) would silently re-grant the bonus every fight.
//       No-op if the def has no onAcquire or itemId is unrecognized.
//   runHook(hookName, ctx, player) -> iterates player.items (array of item
//       ids, pickup order) and invokes any matching hook, mutating ctx.
//   applyBonusDamage(ctx, amount) -> helper hooks call to add extra damage
//       to a monster mid-onWordPlayed (mutates ctx.monster.hp directly since
//       Combat.playWord has already returned by the time hooks run).
//   applyPercentBonus(ctx, pct) -> helper for percentage-of-current-damage
//       items (e.g. 0.4 for +40%, 1.0 for a flat x2 -- "x2" is "+100%" of the
//       current total, not a multiply-in-place, so it stacks additively with
//       any other percent bonus that already fired this same word, same as
//       every other onWordPlayed hook). Returns the rounded bonus applied.

(function () {
  window.Wordbound = window.Wordbound || {};
  var Items = (window.Wordbound.Items = {});
  var ITEM_DEFS = {};
  Items.ITEM_DEFS = ITEM_DEFS;

  function def(d) {
    d.statMods = d.statMods || {};
    d.hooks = d.hooks || {};
    ITEM_DEFS[d.id] = d;
  }

  def({
    id: 'spare_satchel',
    name: 'Spare Satchel',
    hint: 'Extra pockets for your words—one more tile per hand.',
    rarity: 'common',
    shopPrice: 25,
    statMods: { rackCapacityBonus: 1 }
  });

  def({
    id: 'lucky_vowel',
    name: 'Lucky Vowel',
    hint: "Fortune favors the vocal—never a draw without one.",
    rarity: 'common',
    shopPrice: 20,
    hooks: {
      onDraw: function (ctx) {
        var VOWELS = ['A', 'E', 'I', 'O', 'U'];
        var hasVowel = ctx.drawnTiles.some(function (t) { return VOWELS.indexOf(t.letter) !== -1; });
        if (hasVowel || ctx.drawnTiles.length === 0) return;
        var pool = ctx.pileState.drawPile;
        var vowelIdx = -1;
        for (var i = pool.length - 1; i >= 0; i--) {
          if (VOWELS.indexOf(pool[i].letter) !== -1) { vowelIdx = i; break; }
        }
        if (vowelIdx === -1) return;
        var vowelTile = pool.splice(vowelIdx, 1)[0];
        var swapIdx = ctx.rng ? ctx.rng.randInt(0, ctx.drawnTiles.length - 1) : 0;
        var displaced = ctx.drawnTiles[swapIdx];
        ctx.drawnTiles[swapIdx] = vowelTile;
        pool.push(displaced);
      }
    }
  });

  def({
    id: 'wildcard_pouch',
    name: 'Wildcard Pouch',
    hint: 'Unwritten possibilities—two blanks in every hand, waiting to become anything.',
    rarity: 'uncommon',
    shopPrice: 35,
    hooks: {
      onRunStart: function (ctx) {
        var Tiles = window.Wordbound.Tiles;
        ctx.pileState.drawPile.push(Tiles.createTile('?', null), Tiles.createTile('?', null));
      }
    }
  });

  def({
    id: 'heavy_ink',
    name: 'Heavy Ink',
    hint: "That precious letter? It leaves its mark twice.",
    rarity: 'uncommon',
    shopPrice: 30,
    hooks: {
      onWordPlayed: function (ctx) {
        var Lexicon = window.Wordbound.Lexicon;
        var best = 0;
        ctx.tilesUsed.forEach(function (t) {
          var v = Lexicon.LETTER_VALUES[t.letter] || 0;
          if (v > best) best = v;
        });
        if (best > 0) Items.applyBonusDamage(ctx, best);
      }
    }
  });

  def({
    id: 'rare_hunter',
    name: 'Rare Hunter',
    hint: 'Spot a prize letter and strike while it gleams.',
    rarity: 'uncommon',
    shopPrice: 40,
    hooks: {
      onWordPlayed: function (ctx) {
        var Lexicon = window.Wordbound.Lexicon;
        var hasRare = ctx.word.split('').some(function (l) { return (Lexicon.LETTER_VALUES[l] || 0) >= 4; });
        if (hasRare) Items.applyBonusDamage(ctx, 3);
      }
    }
  });

  def({
    id: 'vowel_leech',
    name: 'Vowel Leech',
    hint: 'Each A, E, I, O, U feeds your wounds. The more you speak, the more you mend.',
    rarity: 'rare',
    shopPrice: 35,
    hooks: {
      onWordPlayed: function (ctx) {
        var VOWELS = ['A', 'E', 'I', 'O', 'U'];
        var healed = ctx.word.split('').filter(function (l) { return VOWELS.indexOf(l) !== -1; }).length;
        if (healed > 0) ctx.player.ink = Math.min(ctx.player.maxInk, ctx.player.ink + healed);
      }
    }
  });

  def({
    id: 'thick_skin',
    name: 'Thick Skin',
    hint: 'Hardened. Weathered. Words bounce off you like rain.',
    rarity: 'common',
    shopPrice: 45,
    statMods: { damageReductionFlat: 2 },
    hooks: {
      onPlayerDamaged: function (ctx) {
        ctx.damage = Math.max(1, ctx.damage - 2);
      }
    }
  });

  def({
    id: 'second_wind',
    name: 'Second Wind',
    hint: 'Not over yet. One last breath, when it matters most.',
    rarity: 'legendary',
    shopPrice: 60,
    hooks: {
      onPlayerDamaged: function (ctx) {
        if (ctx.player.usedSecondWind) return;
        if (ctx.damage < ctx.player.ink) return;
        ctx.damage = ctx.player.ink - 1;
        ctx.player.usedSecondWind = true;
      },
      // Duel-mode retarget (GOALS.md, DUEL-GAUGE COMBAT ticket's own flagged
      // gap -- see onDuelBlockLost's header doc above for the mechanism).
      // ctx.duel.healthBlocks is already the post-loss value here; 0 means
      // this loss would otherwise end the run. Reviving it to 1 is the
      // discrete-block equivalent of the turn-based hook's "cap damage to
      // ink - 1": the player survives this hit on their very last sliver,
      // not undamaged.
      onDuelBlockLost: function (ctx) {
        if (ctx.player.usedSecondWind) return;
        if (ctx.duel.healthBlocks > 0) return;
        ctx.duel.healthBlocks = 1;
        ctx.player.usedSecondWind = true;
      }
    }
  });

  def({
    id: 'folio_mark',
    name: 'Folio Mark',
    hint: 'Those marked tiles sing louder when you play them.',
    rarity: 'uncommon',
    shopPrice: 40,
    hooks: {
      onWordPlayed: function (ctx) {
        var bonusCount = 0;
        ctx.tilesUsed.forEach(function (t) {
          if (t.bonus) bonusCount++;
        });
        if (bonusCount > 0) Items.applyBonusDamage(ctx, bonusCount * 2);
      }
    }
  });

  def({
    id: 'marginalia',
    name: 'Marginalia',
    hint: 'Notes in the margins have a way of healing old wounds.',
    rarity: 'uncommon',
    shopPrice: 35,
    hooks: {
      onWordPlayed: function (ctx) {
        if (ctx.word.length >= 5) {
          ctx.player.ink = Math.min(ctx.player.maxInk, ctx.player.ink + 2);
        }
      }
    }
  });

  def({
    id: 'catalog_tab',
    name: 'Catalog Tab',
    hint: 'A perfect sequence—organized, precise, and devastating.',
    rarity: 'uncommon',
    shopPrice: 35,
    hooks: {
      onWordPlayed: function (ctx) {
        var isAlphabetical = true;
        for (var i = 1; i < ctx.word.length; i++) {
          if (ctx.word[i] < ctx.word[i - 1]) { isAlphabetical = false; break; }
        }
        if (isAlphabetical) Items.applyBonusDamage(ctx, 2);
      }
    }
  });

  def({
    id: 'blank_slate',
    name: 'Blank Slate',
    hint: 'An unwritten tile becomes whatever the moment needs.',
    rarity: 'uncommon',
    shopPrice: 40,
    hooks: {
      onWordPlayed: function (ctx) {
        var blankCount = 0;
        ctx.tilesUsed.forEach(function (t) {
          if (t.letter === '?') blankCount++;
        });
        if (blankCount > 0) Items.applyBonusDamage(ctx, blankCount * 2);
      }
    }
  });

  def({
    id: 'dust_jacket',
    name: 'Dust Jacket',
    hint: 'Every marked tile shelters you like a page held close.',
    rarity: 'uncommon',
    shopPrice: 35,
    hooks: {
      onPlayerDamaged: function (ctx) {
        var bonusCount = 0;
        (ctx.player.rack || []).forEach(function (t) {
          if (t.bonus) bonusCount++;
        });
        var reduction = Math.min(ctx.damage - 1, bonusCount);
        ctx.damage = Math.max(1, ctx.damage - reduction);
      }
    }
  });

  def({
    id: 'rare_tome',
    name: 'Rare Tome',
    hint: 'X, Q, Z—the alphabet\'s rarest treasures, and this book knows them all.',
    rarity: 'uncommon',
    shopPrice: 40,
    hooks: {
      onWordPlayed: function (ctx) {
        var hasRare = ctx.word.split('').some(function (l) { return l === 'X' || l === 'Q' || l === 'Z'; });
        if (hasRare) Items.applyBonusDamage(ctx, 2);
      }
    }
  });

  def({
    id: 'foreword',
    name: 'Foreword',
    hint: 'The words you don\'t say echo loudest. Unused tiles sharpen the blow.',
    rarity: 'rare',
    shopPrice: 45,
    hooks: {
      onWordPlayed: function (ctx) {
        var unusedCount = (ctx.player.rack || []).length;
        if (unusedCount > 0) Items.applyBonusDamage(ctx, unusedCount);
      }
    }
  });

  // ---- FUN OVERHAUL 4/8 (GOALS.md, 2026-08-20): build-defining rule-changer
  // items. All 8 hook onWordPlayed and read the new ctx fields
  // (previousWord, wordsPlayedThisFight) game.js's Game.submitWord now
  // provides. Every proc pushes a message onto ctx.messages -- silent
  // modifiers don't create builds, per the ticket's own instruction.

  def({
    id: 'illuminated_initial',
    name: 'Illuminated Initial',
    hint: 'The first letter, gilded -- echo it and the page catches fire.',
    rarity: 'rare',
    shopPrice: 45,
    hooks: {
      onWordPlayed: function (ctx) {
        if (!ctx.previousWord || !ctx.word) return;
        if (ctx.word[0] !== ctx.previousWord[0]) return;
        Items.applyPercentBonus(ctx, 0.4);
        ctx.messages.push('Illuminated Initial: +40%!');
      }
    }
  });

  def({
    id: 'errant_footnote',
    name: 'Errant Footnote',
    hint: 'Every third mark in the margin lands twice as hard.',
    rarity: 'rare',
    shopPrice: 45,
    hooks: {
      onWordPlayed: function (ctx) {
        if (!ctx.wordsPlayedThisFight || ctx.wordsPlayedThisFight % 3 !== 0) return;
        Items.applyPercentBonus(ctx, 1.0);
        ctx.messages.push('Errant Footnote: x2!');
      }
    }
  });

  def({
    id: 'vowel_reliquary',
    name: 'Vowel Reliquary',
    hint: 'Sacred vowels, kept behind glass -- speak them and they blaze.',
    rarity: 'rare',
    shopPrice: 45,
    hooks: {
      onWordPlayed: function (ctx) {
        var VOWELS = ['A', 'E', 'I', 'O', 'U'];
        var Lexicon = window.Wordbound.Lexicon;
        var bonus = 0;
        ctx.word.split('').forEach(function (l) {
          if (VOWELS.indexOf(l) !== -1) bonus += 2 * (Lexicon.LETTER_VALUES[l] || 0);
        });
        if (bonus > 0) {
          Items.applyBonusDamage(ctx, bonus);
          ctx.messages.push('Vowel Reliquary: +' + bonus + '!');
        }
      }
    }
  });

  def({
    id: 'consonant_cluster',
    name: 'Consonant Cluster',
    hint: 'Hard sounds, harder blows -- every consonant adds its weight.',
    rarity: 'uncommon',
    shopPrice: 35,
    hooks: {
      onWordPlayed: function (ctx) {
        var VOWELS = ['A', 'E', 'I', 'O', 'U'];
        var consonantCount = ctx.word.split('').filter(function (l) { return VOWELS.indexOf(l) === -1; }).length;
        if (consonantCount > 0) {
          var bonus = consonantCount * 2;
          Items.applyBonusDamage(ctx, bonus);
          ctx.messages.push('Consonant Cluster: +' + bonus + '!');
        }
      }
    }
  });

  def({
    id: 'long_s_ligature',
    name: 'Long-S Ligature',
    hint: 'An old, elegant stroke -- the longer the word, the deeper it cuts, and mends.',
    rarity: 'rare',
    shopPrice: 45,
    hooks: {
      onWordPlayed: function (ctx) {
        if (ctx.word.length < 6) return;
        Items.applyPercentBonus(ctx, 0.25);
        ctx.player.ink = Math.min(ctx.player.maxInk, ctx.player.ink + 1);
        ctx.messages.push('Long-S Ligature: +25% and mended!');
      }
    }
  });

  def({
    id: 'cursed_quill',
    name: 'Cursed Quill',
    hint: 'It writes on its own terms -- power for a price paid in your own blood.',
    rarity: 'rare',
    shopPrice: 40,
    hooks: {
      onWordPlayed: function (ctx) {
        Items.applyBonusDamage(ctx, 10);
        // Deliberately no floor here (unlike Thick Skin/Second Wind's
        // damage-reduction hooks) -- the ticket's own wording is "can kill
        // you, that's the deal." Game.submitWord checks player.ink right
        // after onWordPlayed hooks run specifically so this self-damage
        // (which lands on the player's OWN turn, before any monster
        // counterattack) can end the run even on a word that also kills
        // the monster in the same blow.
        ctx.player.ink = Math.max(0, ctx.player.ink - 2);
        ctx.messages.push('Cursed Quill: +10, and it costs you 2.');
      }
    }
  });

  def({
    id: 'gilded_bookmark',
    name: 'Gilded Bookmark',
    hint: 'Marks where you started -- the first word of a fight always rings loudest.',
    rarity: 'uncommon',
    shopPrice: 35,
    hooks: {
      onWordPlayed: function (ctx) {
        if (ctx.wordsPlayedThisFight !== 1) return;
        Items.applyPercentBonus(ctx, 1.0);
        ctx.messages.push('Gilded Bookmark: x2!');
      }
    }
  });

  def({
    id: 'palimpsest',
    name: 'Palimpsest',
    hint: 'Old text bleeds through the new -- echo enough of it and the page erupts.',
    rarity: 'rare',
    shopPrice: 45,
    hooks: {
      onWordPlayed: function (ctx) {
        if (!ctx.previousWord) return;
        var prevLetters = {};
        ctx.previousWord.split('').forEach(function (l) { prevLetters[l] = true; });
        var shared = 0;
        var seen = {};
        ctx.word.split('').forEach(function (l) {
          if (prevLetters[l] && !seen[l]) { shared++; seen[l] = true; }
        });
        if (shared >= 3) {
          Items.applyPercentBonus(ctx, 0.3);
          ctx.messages.push('Palimpsest: +30%!');
        }
      }
    }
  });

  // The 8 build-defining rule-changer items from GOALS.md "FUN OVERHAUL 4/8".
  // Kept as one named list so the elite guaranteed-drop (FUN OVERHAUL 6/8)
  // draws from exactly this pool rather than duplicating the id list or
  // re-deriving it from rarity (rarity alone would also pull in unrelated
  // rares like Foreword/Vowel Leech). Order is the ticket's own numbering.
  Items.RULE_CHANGER_IDS = [
    'illuminated_initial',
    'errant_footnote',
    'vowel_reliquary',
    'consonant_cluster',
    'long_s_ligature',
    'cursed_quill',
    'gilded_bookmark',
    'palimpsest'
  ];

  // ---- CONTENT ticket (GOALS.md, 2026-08-20/21): 9 new items filling gaps
  // the FUN OVERHAUL 4/8 batch left -- onDraw and onRunStart each had exactly
  // 1 item, onPlayerDamaged had 3, and gold-economy / consumable-synergy /
  // floor-transition were entirely unaddressed. THEME.md library/archive
  // naming throughout. At least 4 of these (Interlibrary Loan, Withdrawal
  // Slip, Bound Volume, Acquisitions Budget) are genuinely build-defining --
  // they change which words/consumables/gold habits are correct play, not
  // just add a stat.

  def({
    id: 'card_catalog_key',
    name: 'Card Catalog Key',
    hint: 'Unlocks the good drawer -- a valuable letter turns up more often than chance.',
    rarity: 'common',
    shopPrice: 25,
    hooks: {
      onDraw: function (ctx) {
        var Lexicon = window.Wordbound.Lexicon;
        var hasRareLetter = ctx.drawnTiles.some(function (t) { return (Lexicon.LETTER_VALUES[t.letter] || 0) >= 3; });
        if (hasRareLetter || ctx.drawnTiles.length === 0) return;
        var pool = ctx.pileState.drawPile;
        var idx = -1;
        for (var i = pool.length - 1; i >= 0; i--) {
          if ((Lexicon.LETTER_VALUES[pool[i].letter] || 0) >= 3) { idx = i; break; }
        }
        if (idx === -1) return;
        var rareTile = pool.splice(idx, 1)[0];
        var swapIdx = ctx.rng ? ctx.rng.randInt(0, ctx.drawnTiles.length - 1) : 0;
        var displaced = ctx.drawnTiles[swapIdx];
        ctx.drawnTiles[swapIdx] = rareTile;
        pool.push(displaced);
      }
    }
  });

  def({
    id: 'bookplate',
    name: 'Bookplate',
    hint: 'A small mark stamped inside the cover, charged with the collector\'s intent.',
    rarity: 'common',
    shopPrice: 25,
    hooks: {
      onRunStart: function (ctx) {
        var Tiles = window.Wordbound.Tiles;
        ctx.pileState.drawPile.push(Tiles.createTile('E', null, Tiles.VARIANTS.CHARGED));
      }
    }
  });

  def({
    id: 'ex_libris',
    name: 'Ex Libris',
    hint: 'This copy belongs to you now -- and it pays dividends.',
    rarity: 'uncommon',
    shopPrice: 30,
    hooks: {
      onRunStart: function (ctx) {
        ctx.player.gold = (ctx.player.gold || 0) + 4;
      }
    }
  });

  def({
    id: 'late_fee',
    name: 'Late Fee',
    hint: 'Every overdue blow gets billed -- to them.',
    rarity: 'uncommon',
    shopPrice: 30,
    hooks: {
      onPlayerDamaged: function (ctx) {
        var gained = Math.floor(ctx.damage / 2);
        if (gained > 0) ctx.player.gold = (ctx.player.gold || 0) + gained;
      }
    }
  });

  def({
    id: 'interlibrary_loan',
    name: 'Interlibrary Loan',
    hint: 'A well-stocked shelf lends its weight to every word -- hold onto what you\'ve borrowed.',
    rarity: 'uncommon',
    shopPrice: 35,
    hooks: {
      onWordPlayed: function (ctx) {
        if ((ctx.player.consumables || []).length < 2) return;
        Items.applyBonusDamage(ctx, 3);
        ctx.messages.push('Interlibrary Loan: +3!');
      }
    }
  });

  def({
    id: 'withdrawal_slip',
    name: 'Withdrawal Slip',
    hint: 'Nothing left to check out -- travel light and strike harder.',
    rarity: 'rare',
    shopPrice: 45,
    hooks: {
      onWordPlayed: function (ctx) {
        if ((ctx.player.consumables || []).length > 0) return;
        Items.applyBonusDamage(ctx, 6);
        ctx.messages.push('Withdrawal Slip: +6!');
      }
    }
  });

  def({
    id: 'colophon',
    name: 'Colophon',
    hint: 'The printer\'s mark rewards a page with nothing repeated on it.',
    rarity: 'uncommon',
    shopPrice: 35,
    hooks: {
      onWordPlayed: function (ctx) {
        var seen = {};
        var distinctCount = 0;
        ctx.word.split('').forEach(function (l) { if (!seen[l]) { seen[l] = true; distinctCount++; } });
        if (distinctCount > 0) {
          var bonus = distinctCount * 2;
          Items.applyBonusDamage(ctx, bonus);
          ctx.messages.push('Colophon: +' + bonus + '!');
        }
      }
    }
  });

  def({
    id: 'bound_volume',
    name: 'Bound Volume',
    hint: 'Matched signatures bind tighter -- echo your last word\'s length and the seam holds true.',
    rarity: 'rare',
    shopPrice: 45,
    hooks: {
      onWordPlayed: function (ctx) {
        if (!ctx.previousWord) return;
        if (ctx.word.length !== ctx.previousWord.length) return;
        Items.applyPercentBonus(ctx, 0.25);
        ctx.messages.push('Bound Volume: +25%!');
      }
    }
  });

  def({
    id: 'acquisitions_budget',
    name: 'Acquisitions Budget',
    hint: 'Spend where it counts -- gold set aside becomes strength before you descend.',
    rarity: 'legendary',
    shopPrice: 65,
    hooks: {
      // FLAGSHIP, floor-transition. The only item in the pool using this
      // hook -- earns the new engine machinery (Game.advanceFloor calling
      // Items.runHook('onFloorAdvance', ...), see game.js) by turning
      // gold-hoarding into a genuine strategic choice against shop-spending.
      onFloorAdvance: function (ctx) {
        var chunks = Math.floor((ctx.player.gold || 0) / 10);
        if (chunks <= 0) return;
        var spent = chunks * 10;
        var inkGain = chunks * 2;
        ctx.player.gold -= spent;
        ctx.player.maxInk += inkGain;
        ctx.player.ink += inkGain;
        ctx.messages.push('Acquisitions Budget: spent ' + spent + ' gold for +' + inkGain + ' max ink!');
      }
    }
  });

  // ---- ITEMS ticket (GOALS.md, 2026-08-22): Jaxon's four signature items.
  // RITARDANDO and POETIC LICENSE landed first (both passive statMods/
  // hooks). FORTISSIMO (rack-capacity/tile-size change) landed next --
  // see its own def below. THE INVERTED SCORE (flip-mapping dictionary
  // check) is the one remaining signature item, real separate still-open
  // scope -- see PROGRESS.md.

  def({
    id: 'ritardando',
    name: 'Ritardando',
    hint: 'Every measure downshifts -- the enemy\'s music arrives late, buying you time to build the word.',
    rarity: 'rare',
    shopPrice: 45,
    // A global tempo-scale multiplier applied to a duel's music sequencer at
    // fight start (js/wordbound/game.js's computeDuelTempoScale, via the
    // engine's own setTempoScale hook -- music.js's header comment literally
    // calls this out as "the tempo-scale hook the ticket asks to be built
    // now for a future slow-the-music item"). 0.75 (25% slower) is a
    // deliberately smaller effect than the Largo accessibility assist's own
    // 0.6 -- Largo is meant to make a duel meaningfully easier for players
    // who need it; a purchasable build item shouldn't just be "buy Largo",
    // so this stacks MULTIPLICATIVELY with Largo (0.6 * 0.75 = 0.45 combined)
    // rather than matching or exceeding it alone. Retunable starting value,
    // not sim-locked -- flagged like every other numeric judgment call in
    // this file.
    statMods: { tempoScale: 0.75 }
  });

  def({
    id: 'poetic_license',
    name: 'Poetic License',
    hint: 'Three letters, any three letters -- who\'s to say what counts as a word?',
    rarity: 'rare',
    shopPrice: 40,
    hooks: {
      // The actual validity bypass lives in Items.bypassesWordValidity
      // (below), called from combat.js's playWord/previewWord validity gate
      // BEFORE this hook ever runs -- by the time onWordPlayed fires, the
      // word has already been accepted and scored exactly like any other
      // play. This hook is pure user feedback (per this file's own "silent
      // modifiers don't create builds" convention): announce the bypass only
      // when it was actually exercised (a real dictionary word of length 3
      // doesn't need announcing -- it needed no license).
      onWordPlayed: function (ctx) {
        var Lexicon = window.Wordbound.Lexicon;
        if (ctx.word.length !== 3 || Lexicon.isValidWord(ctx.word)) return;
        ctx.messages.push('Poetic License: "' + ctx.word + '" counts!');
      }
    }
  });

  def({
    id: 'fortissimo',
    name: 'Fortissimo',
    hint: 'Every note struck at full force -- the whole score doubles, but the hand that holds it shrinks.',
    rarity: 'rare',
    shopPrice: 50,
    // ALL scores doubled (statMods.scoreMultiplier, read by
    // combat.js's Combat.playWord alongside every other final damage
    // modifier -- see Items.getScoreMultiplier below), rack capacity
    // HALVED (statMods.rackCapacityMult, read by Items.getRackCapacity,
    // rounded and floored at MIN_RACK_CAPACITY so a real word is always
    // still formable -- see that function's own comment for why 3 is the
    // floor). Tiles render at double size (css/wordbound.css's
    // .rack-display-fortissimo, toggled by both apps' rack containers)
    // -- the ticket's own visual half of the trade. A genuine build-
    // warping rare: doubled damage per word against roughly half as many
    // plays per rack refill before Rewrite/a full cycle, not a pure
    // upgrade -- exact numbers are a judgment call, not sim-tuned (see
    // PROGRESS.md).
    statMods: { scoreMultiplier: 2, rackCapacityMult: 0.5 }
  });

  def({
    id: 'inverted_score',
    name: 'The Inverted Score',
    hint: 'Turn the whole sheet on its head -- only a phrase that still reads true upside-down will sound.',
    rarity: 'rare',
    // Priced above the other three signature items (45/40/50) -- the
    // ticket's own "build-warping rare, cost/rarity accordingly" -- since
    // this one is a strictly harder trade than any of them: it carries no
    // built-in stat bonus at all (unlike Fortissimo's doubled score or
    // Ritardando's slowed music), only a severe validity restriction (see
    // Items.upsideDownValid), so a compensating score multiplier is added
    // below to keep it a build worth taking rather than a pure downside.
    // The multiplier VALUE (2.5x) is this run's own judgment call, not
    // sim-locked -- flagged like every other numeric call in this file.
    shopPrice: 60,
    statMods: { scoreMultiplier: 2.5 },
    hooks: {
      // Every word played while this item is owned necessarily passed
      // Items.upsideDownValid to get this far (Items.isWordValid replaces
      // the normal gate entirely -- see its own comment), so
      // flipUpsideDown(ctx.word) can never be null here; the guard below is
      // defensive, not a real branch, matching this file's own convention
      // of never assuming an invariant it can check instead.
      onWordPlayed: function (ctx) {
        var flipped = Items.flipUpsideDown(ctx.word);
        if (flipped) ctx.messages.push('The Inverted Score: turned round, it reads "' + flipped + '"!');
      }
    }
  });

  // ---- ITEMS ticket (GOALS.md, 2026-08-22): AMENDED batch. All 4 of
  // Jaxon's signature items exist above; this rounds out the pool per the
  // ticket's own "also add HEALTH ITEMS... plus 4-8 more leaning into the
  // duel-gauge space" amendment. 2 health items (rare, since ~5 health
  // blocks/Verses makes each one precious, per the ticket) + 4 duel-gauge
  // items (the ticket's stated floor of the 4-8 range), all Italian musical
  // terms matching the signature items' own naming voice
  // (Ritardando/Fortissimo/etc).

  def({
    id: 'extra_verse',
    name: 'Extra Verse',
    hint: 'One more line to the song before it ends -- a whole new verse of endurance.',
    rarity: 'rare',
    shopPrice: 50,
    // A permanent, ONE-TIME +1 to both max and current health blocks at the
    // moment this is picked up (Items.applyOnAcquire -- see its own header
    // doc for why this can't be a `hooks` entry: onRunStart fires every
    // fight, not once, and every other hook is per-word/per-damage-event,
    // none of which fit "gain a permanent block right now"). Deliberately
    // grants the block on top of whatever healthBlocks currently is (not
    // just raising the ceiling) -- consistent with "increase max health
    // blocks" reading as a genuine gain, not a ceiling the player has to
    // walk back up to via healing.
    onAcquire: function (player) {
      var Duel = window.Wordbound.Duel;
      var base = (Duel && Duel.DEFAULT_HEALTH_BLOCKS) || 5;
      var currentMax = player.maxHealthBlocks != null ? player.maxHealthBlocks : base;
      player.maxHealthBlocks = currentMax + 1;
      var currentBlocks = player.healthBlocks != null ? player.healthBlocks : base;
      player.healthBlocks = Math.min(player.maxHealthBlocks, currentBlocks + 1);
    }
  });

  def({
    id: 'mended_verse',
    name: 'Mended Verse',
    hint: 'A torn page, carefully rebound -- what was lost returns, one stanza at a time.',
    rarity: 'rare',
    shopPrice: 45,
    hooks: {
      // Floor-transition healing (mirrors Acquisitions Budget's own
      // onFloorAdvance use, the only other item on this hook) rather than
      // per-fight (onRunStart) -- healing a lost Verse every single fight
      // would trivialize the health-block system the ticket's own
      // "sim-check that health items don't trivialize late tiers" line
      // warns against; once per floor (several fights) is a meaningfully
      // slower drip. No-op once already at full health (never overheals).
      onFloorAdvance: function (ctx) {
        var Duel = window.Wordbound.Duel;
        var base = (Duel && Duel.DEFAULT_HEALTH_BLOCKS) || 5;
        var max = ctx.player.maxHealthBlocks != null ? ctx.player.maxHealthBlocks : base;
        var current = ctx.player.healthBlocks != null ? ctx.player.healthBlocks : base;
        if (current >= max) return;
        ctx.player.healthBlocks = Math.min(max, current + 1);
        ctx.messages.push('Mended Verse: +1 health block!');
      }
    }
  });

  def({
    id: 'sordino',
    name: 'Sordino',
    hint: "A mute clipped to every string -- the enemy's music presses less hard on you.",
    rarity: 'rare',
    shopPrice: 45,
    // Gauge push-resistance: read by Items.getDuelPushResistance (summed
    // across owned items, clamped) and passed into Duel.create's own
    // pushResistance opt -- see duel.js's header doc for the exact math.
    // 20% is a meaningful but not run-defining slice of a single item.
    statMods: { duelPushResistance: 0.2 }
  });

  def({
    id: 'fermata',
    name: 'Fermata',
    hint: 'Hold the pause a beat longer -- the measure waits for you to catch your breath.',
    rarity: 'uncommon',
    shopPrice: 35,
    // Longer i-frames after a block loss: read by Items.getDuelIframeBonus
    // and passed into Duel.create's own iframeBonusSec opt. +1.5s on top of
    // duel.js's default 3s i-frame window (a 50% extension) -- a real but
    // not overwhelming survivability boost, priced below the two rare duel
    // items since it only ever matters after a loss has already happened
    // (Sordino/Rubato both act pre-emptively).
    statMods: { duelIframeBonusSec: 1.5 }
  });

  def({
    id: 'rubato',
    name: 'Rubato',
    hint: 'Borrowed time, given back -- play a hair off the beat and the music forgives you.',
    rarity: 'rare',
    shopPrice: 45,
    // Wider parry window: read by Items.getDuelParryWindowBonus and passed
    // into Duel.create's own parryWindowBonusSec opt. +0.1s on top of
    // duel.js's default 0.2s window (PARRY_WINDOW_SEC) -- a 50% widening,
    // deliberately modest since the parry window is this game's core
    // precision-timing mechanic and the ticket's own DUEL-GAUGE COMBAT
    // header flags parry pacing as a Jaxon-only playtest-feel call; a
    // bigger widening risks trivializing the skill entirely rather than
    // just making it more forgiving.
    statMods: { duelParryWindowBonusSec: 0.1 }
  });

  def({
    id: 'encore',
    name: 'Encore',
    hint: "A parried crescendo doesn't just survive -- it answers back.",
    rarity: 'rare',
    shopPrice: 45,
    hooks: {
      // Crescendo-payback: DuelCombat.submitWord attaches `parried: true` to
      // the result object exactly when duel.attemptParry succeeded for this
      // word (js/wordbound/duelCombat.js) -- game.js's Game.submitWord then
      // passes that same result through as ctx.result to every onWordPlayed
      // hook, so this is readable here without any new plumbing. A
      // turn-based (non-duel) fight's result never has this field
      // (Combat.playWord doesn't set it), so ctx.result.parried is
      // undefined/falsy there and this hook is naturally a no-op outside a
      // duel fight -- no isDuelFight check needed. Bonus damage lands via
      // the same Items.applyBonusDamage every other proc item uses (mutates
      // monster.hp directly); it does NOT retroactively add to the gauge
      // push that already resolved for this word (duel.applyPlayerPush ran
      // inside DuelCombat.submitWord, before this hook fires) -- a direct,
      // immediate strike on top of the parry, not a bigger push.
      onWordPlayed: function (ctx) {
        if (!ctx.result || !ctx.result.parried) return;
        Items.applyBonusDamage(ctx, 8);
        ctx.messages.push('Encore: the parry strikes back for +8!');
      }
    }
  });

  // ---- SHAKESPEARE GUIDE + AUTHOR SHOPKEEPERS ticket (GOALS.md), step 2's
  // exclusive-items half: one exclusive item per author (the ticket's own
  // "1-2" per author, floor of the range -- see this ticket's own
  // ORCHESTRATOR NOTE for why), gated to appear ONLY in that author's shop
  // via the new `exclusiveTo` field, read by game.js's rollShopOptions
  // (filters both the item pool and the consumable pool before any random
  // slot is picked -- a deterministic gate, not a probability weight, so an
  // exclusive can NEVER surface from the wrong keeper's shop). Homer's own
  // exclusive (The Wine-Dark Litany, a consumable) lives in consumables.js
  // instead -- see that file for why. Each of these five draws directly on
  // THEME.md's own "Exclusive item concept(s)" cell for its author, picking
  // whichever of that author's 1-2 concepts maps onto an EXISTING engine
  // mechanic most directly (same "small, well-verified chunk over a bigger
  // speculative one" judgment call this ticket's own quirk-half update
  // already made) rather than inventing new engine surface for every one.

  def({
    id: 'ingenious_gentlemans_ledger',
    name: "The Ingenious Gentleman's Ledger",
    hint: 'A ledger for tallying ambition -- the longer the word, the larger the sum.',
    rarity: 'rare',
    shopPrice: 45,
    exclusiveTo: 'cervantes',
    // THEME.md's own concept: "rewards playing an unusually ambitious word
    // over a short safe one -- a bonus that scales with word length past
    // the usual length-bonus curve." Lexicon.scoreWord's own lengthBonus
    // already adds a flat 2pts/letter past length 4 (base score, before any
    // multiplier) -- this layers a SEPARATE, steeper percent bonus on top,
    // starting two letters later (past 6) and growing per extra letter, so
    // it only rewards genuinely long plays, not merely-above-average ones.
    hooks: {
      onWordPlayed: function (ctx) {
        var extraLetters = ctx.word.length - 6;
        if (extraLetters <= 0) return;
        var bonus = Items.applyPercentBonus(ctx, extraLetters * 0.1);
        if (bonus > 0) ctx.messages.push("The Ledger: +" + Math.round(extraLetters * 10) + "% for ambition!");
      }
    }
  });

  def({
    id: 'an_ideal_word',
    name: 'An Ideal Word',
    hint: 'Not every triumph needs a long sentence -- some are perfect exactly as short as they are.',
    rarity: 'uncommon',
    shopPrice: 30,
    exclusiveTo: 'wilde',
    // THEME.md's own concept: "rewards playing an unusually SHORT word
    // well -- a small bonus tuned to the opposite end of the curve from
    // Cervantes' long-word item." Lexicon.scoreWord's lengthBonus never
    // applies at or below length 4 (its own threshold), so those plays get
    // nothing extra today -- this hands them a flat, decreasing-with-length
    // bonus instead, applied as damage (not a percent, since a short word's
    // base score is already small enough that a percent bonus would be
    // negligible -- the same reasoning FORTISSIMO's flat 2x, not a percent,
    // already established for a restriction/payoff pair to feel real).
    hooks: {
      onWordPlayed: function (ctx) {
        if (ctx.word.length > 4) return;
        var bonus = (5 - ctx.word.length) * 3;
        if (bonus <= 0) return;
        Items.applyBonusDamage(ctx, bonus);
        ctx.messages.push('An Ideal Word: +' + bonus + '!');
      }
    }
  });

  def({
    id: 'truth_universally_acknowledged',
    name: 'A Truth Universally Acknowledged',
    hint: 'It is a truth universally acknowledged that the SAME word twice is no triumph at all.',
    rarity: 'uncommon',
    shopPrice: 35,
    exclusiveTo: 'austen',
    // THEME.md's own concept: "a passive that rewards NOT playing the same
    // word twice -- codifying the existing repeat-word penalty into a bonus
    // rather than just an absence of penalty." combat.js's REPEAT_WORD_PENALTY
    // already docks a repeat to x0.4; this instead grants a flat bonus on
    // every NON-repeat play (ctx.result.isRepeat is the exact field combat.js
    // sets, same one Encore already reads for its own condition) -- a
    // genuine reward for novelty, not merely the absence of a cut.
    hooks: {
      onWordPlayed: function (ctx) {
        if (!ctx.result || ctx.result.isRepeat) return;
        var bonus = Items.applyPercentBonus(ctx, 0.1);
        if (bonus > 0) ctx.messages.push('A Truth Universally Acknowledged: +10%!');
      }
    }
  });

  def({
    id: 'tell_tale_meter',
    name: 'The Tell-Tale Meter',
    hint: "A heartbeat that won't stop -- every blow you land feeds it back to you.",
    rarity: 'rare',
    shopPrice: 45,
    exclusiveTo: 'poe',
    // THEME.md's own concept: "a Vampiric-style heal-on-play effect, themed
    // as a heartbeat that won't stop." The existing Vampiric TILE VARIANT
    // (game.js's VAMPIRIC_HEAL_PER_TILE) heals a flat amount per tile
    // played, independent of the word's damage -- this is genuinely
    // Vampiric in the other sense (heal proportional to damage dealt,
    // "life drain"), a new pattern in this pool, gated to Poe's shop only.
    hooks: {
      onWordPlayed: function (ctx) {
        if (!ctx.result || ctx.result.damage <= 0) return;
        var healed = Math.round(ctx.result.damage * 0.1);
        if (healed <= 0) return;
        var before = ctx.player.ink;
        ctx.player.ink = Math.min(ctx.player.maxInk, ctx.player.ink + healed);
        if (ctx.player.ink > before) ctx.messages.push('The Tell-Tale Meter: healed ' + (ctx.player.ink - before) + ' ink!');
      }
    }
  });

  def({
    id: 'certain_slant_of_ink',
    name: 'A Certain Slant of Ink',
    hint: 'There\'s a certain Slant of ink -- it makes the Overcharge, and the Rewrite, come cheaper.',
    rarity: 'uncommon',
    shopPrice: 35,
    exclusiveTo: 'dickinson',
    // THEME.md's own concept: "an ink-economy effect, since ink is her
    // natural pun -- reduced Overcharge/Rewrite cost." Read via the new
    // Items.getOverchargeInkCost/getRewriteInkCost getters (above) -- every
    // call site that used to read Combat.OVERCHARGE_INK_COST/
    // REWRITE_INK_COST directly (game.js's submitWord/toggleOvercharge/
    // rewriteRack/renderInkSpendButtons, React's CombatScreen.jsx) now reads
    // through those instead, so this item's -1/-1 reduction is honored
    // everywhere the cost is charged, checked, or displayed, not just one
    // of those.
    statMods: { overchargeCostReduction: 1, rewriteCostReduction: 1 }
  });

  // FLIP_MAP is the "conservative" mapping the ticket itself specifies --
  // only letters with a genuinely clean upside-down glyph get an entry
  // (u<->n, m<->w, b<->q, d<->p; o/s/x/z/i are each already symmetric
  // under a 180-degree turn, so they self-flip). Every other letter
  // (a c e f g h j k l r t v y) has NO entry -- a word containing any of
  // them is unplayable while The Inverted Score is owned, per the
  // ticket's own instruction.
  var FLIP_MAP = {
    U: 'N', N: 'U',
    M: 'W', W: 'M',
    B: 'Q', Q: 'B',
    D: 'P', P: 'D',
    O: 'O', S: 'S', X: 'X', Z: 'Z', I: 'I'
  };
  Items.FLIP_MAP = FLIP_MAP;

  // Flips `word` upside-down: maps each letter through FLIP_MAP, then
  // reverses the whole result -- physically turning a strip of tiles 180
  // degrees does BOTH at once (per the ticket's own reminder), not just
  // the per-letter mirror alone. Returns null (never a string) the instant
  // any letter has no FLIP_MAP entry, the "unplayable" case, rather than
  // silently dropping it. Self-check against the classic real-world
  // examples confirms the order matters: SWIMS -> flip each letter
  // (S,M,I,W,S) -> reverse -> SWIMS again (a genuine upside-down
  // palindrome); MOM -> flip (W,O,W) -> reverse (still W,O,W, itself a
  // palindrome) -> WOW.
  Items.flipUpsideDown = function (word) {
    var upper = String(word || '').toUpperCase();
    var flipped = [];
    for (var i = 0; i < upper.length; i++) {
      var f = FLIP_MAP[upper[i]];
      if (!f) return null;
      flipped.push(f);
    }
    flipped.reverse();
    return flipped.join('');
  };

  Items.hasInvertedScore = function (player) {
    return !!(player && (player.items || []).indexOf('inverted_score') !== -1);
  };

  // THE INVERTED SCORE's validity gate: playable ONLY when the flipped
  // reading is itself a real dictionary word. See Items.isWordValid below
  // for why this REPLACES (rather than extends) the normal validity OR
  // chain while owned.
  Items.upsideDownValid = function (word, player) {
    if (!Items.hasInvertedScore(player)) return false;
    var flipped = Items.flipUpsideDown(word);
    if (!flipped) return false;
    var Lexicon = window.Wordbound.Lexicon;
    return Lexicon.isValidWord(flipped);
  };

  // The single validity decision combat.js's playWord/previewWord both
  // call -- centralized here so the two call sites can't silently drift
  // out of sync on which validity-altering item wins when more than one is
  // owned. Normally: a real dictionary word, or Poetic License's 3-letter
  // bypass. While The Inverted Score is owned, that whole OR chain is
  // REPLACED by the flip-and-reverse check instead, per the ticket's own
  // "playable ONLY if it reads as a real word upside down" wording -- a
  // genuinely build-warping rare that overrides the game's whole validity
  // model, not an additional bypass layered on top the way Poetic
  // License's carve-out is. Documented judgment call: if a player somehow
  // owns both this and Poetic License at once, the flip check alone
  // decides playability -- a 3-letter non-word combo still needs a clean
  // flipped dictionary word; Poetic License's own bypass does not
  // additionally apply. Untested by design since nothing in the shop pool
  // hands out both at meaningfully overlapping odds today, but documented
  // here for whoever next revisits item synergies.
  Items.isWordValid = function (word, player) {
    var Lexicon = window.Wordbound.Lexicon;
    var upper = String(word || '').toUpperCase();
    if (Items.hasInvertedScore(player)) return Items.upsideDownValid(upper, player);
    return Lexicon.isValidWord(upper) || Items.bypassesWordValidity(upper, player);
  };

  // Combat.playWord/previewWord's second validity gate (js/wordbound/
  // combat.js): with Poetic License owned, any EXACTLY-3-LETTER combination
  // formable from the rack is playable even if Lexicon.isValidWord rejects
  // it as not a real word. Scoring is completely untouched -- scoreWord has
  // no idea (and doesn't need to know) whether the letters it's summing
  // happened to spell a real word, so a bypassed play scores exactly what a
  // real 3-letter word using the same tiles would. This is what makes the
  // ticket's "keep base scoring low so it's a floor-raiser" requirement fall
  // out of the EXISTING formula for free rather than needing a special case:
  // lengthBonus only starts past length 4 and bingoBonus needs the whole
  // rack, so a 3-letter play (real or bypassed) is already the lowest-value
  // shape this engine can score. Worst case checked (sim-check, per the
  // ticket): the two highest-value letters in the pool (Q, Z = 10 each) plus
  // a third at 8 (J or X) scores 28 raw points with zero length/bingo bonus
  // -- around what a single mediocre 5-letter real word already deals
  // (e.g. a 5-letter word of common 1-2pt letters already clears ~10 base +
  // 2 length bonus, and any real word using a genuine rare letter matches or
  // beats 28 outright) -- and drawing Q+Z+J/X together in one 7-tile rack is
  // already a rare draw under LETTER_POOL's weights (1 copy of each in the
  // whole pool). Not a degenerate optimum; a guaranteed-but-modest floor
  // action for an otherwise dead rack, exactly the ticket's intent.
  Items.bypassesWordValidity = function (word, player) {
    if (!player || !word || word.length !== 3) return false;
    return (player.items || []).indexOf('poetic_license') !== -1;
  };

  // RITARDANDO's tempo-scale statMod, multiplied together across every owned
  // item that sets one (only one exists today, but this mirrors
  // getRackCapacity's additive-across-items shape rather than assuming
  // exactly one item will ever grant this). Returns 1 (no change) when
  // nothing owned sets it. The caller (game.js) further combines this with
  // the Largo accessibility assist's own scale -- see computeDuelTempoScale.
  Items.getTempoScale = function (player) {
    var scale = 1;
    (player.items || []).forEach(function (itemId) {
      var d = ITEM_DEFS[itemId];
      if (d && d.statMods.tempoScale != null) scale *= d.statMods.tempoScale;
    });
    return scale;
  };

  // FORTISSIMO's damage statMod, multiplied together across every owned
  // item that sets one (mirrors getTempoScale's shape). Applied by
  // combat.js's Combat.playWord as one more final multiplier alongside the
  // repeat-word penalty/Poetic License's own -- multiplication is
  // commutative, so it doesn't matter whether "ALL scores doubled" is read
  // as doubling the raw base score or the final damage number; both give
  // the identical result. Returns 1 (no change) when nothing owned sets it.
  Items.getScoreMultiplier = function (player) {
    var mult = 1;
    (player.items || []).forEach(function (itemId) {
      var d = ITEM_DEFS[itemId];
      if (d && d.statMods.scoreMultiplier != null) mult *= d.statMods.scoreMultiplier;
    });
    return mult;
  };

  // ITEMS ticket, AMENDED batch's 3 duel-gauge items (Sordino/Fermata/
  // Rubato): each reads its own statMod, summed across every owned item
  // that sets it (mirrors getTempoScale/getScoreMultiplier's shape, except
  // additive rather than multiplicative -- see the header doc above for
  // why). All 3 return 0 (no change) when nothing owned sets them, so
  // Duel.create's own opts default cleanly with no item-awareness needed on
  // duel.js's side.
  Items.getDuelPushResistance = function (player) {
    var resistance = 0;
    (player.items || []).forEach(function (itemId) {
      var d = ITEM_DEFS[itemId];
      if (d && d.statMods.duelPushResistance != null) resistance += d.statMods.duelPushResistance;
    });
    return Math.max(0, Math.min(0.9, resistance));
  };

  Items.getDuelIframeBonus = function (player) {
    var bonus = 0;
    (player.items || []).forEach(function (itemId) {
      var d = ITEM_DEFS[itemId];
      if (d && d.statMods.duelIframeBonusSec != null) bonus += d.statMods.duelIframeBonusSec;
    });
    return bonus;
  };

  Items.getDuelParryWindowBonus = function (player) {
    var bonus = 0;
    (player.items || []).forEach(function (itemId) {
      var d = ITEM_DEFS[itemId];
      if (d && d.statMods.duelParryWindowBonusSec != null) bonus += d.statMods.duelParryWindowBonusSec;
    });
    return bonus;
  };

  // SHAKESPEARE GUIDE + AUTHOR SHOPKEEPERS ticket (GOALS.md), step 2's
  // exclusive-items half: Dickinson's "A Certain Slant of Ink" reduces
  // Combat's two ink-spend costs (Overcharge/Rewrite), summed across every
  // owned item that sets a reduction (mirrors getDuelIframeBonus's additive
  // shape) and clamped to a floor of 1 ink each -- a 0-cost spend would be
  // free forever, a degenerate no-cost loop the ticket's own item concept
  // never asked for. Reads Combat.* lazily (call-time, not module-load
  // time) since combat.js's own constants are the single source of truth
  // this file must never duplicate -- safe because every caller of these
  // getters runs long after both files have finished loading.
  Items.getOverchargeInkCost = function (player) {
    var Combat = window.Wordbound.Combat;
    var base = Combat ? Combat.OVERCHARGE_INK_COST : 3;
    var reduction = 0;
    (player.items || []).forEach(function (itemId) {
      var d = ITEM_DEFS[itemId];
      if (d && d.statMods.overchargeCostReduction != null) reduction += d.statMods.overchargeCostReduction;
    });
    return Math.max(1, base - reduction);
  };

  Items.getRewriteInkCost = function (player) {
    var Combat = window.Wordbound.Combat;
    var base = Combat ? Combat.REWRITE_INK_COST : 4;
    var reduction = 0;
    (player.items || []).forEach(function (itemId) {
      var d = ITEM_DEFS[itemId];
      if (d && d.statMods.rewriteCostReduction != null) reduction += d.statMods.rewriteCostReduction;
    });
    return Math.max(1, base - reduction);
  };

  // A rack this small can never form a real word at all (Lexicon.
  // isValidWord's own floor is 2 letters, and a 2-tile rack is so
  // restrictive it would softlock most fights in practice) -- FORTISSIMO's
  // rack-capacity HALVING (below) is clamped to never go under this, a
  // documented judgment call rather than a value from the ticket itself.
  Items.MIN_RACK_CAPACITY = 3;

  Items.getRackCapacity = function (player) {
    var capacity = 7;
    var mult = 1;
    (player.items || []).forEach(function (itemId) {
      var d = ITEM_DEFS[itemId];
      if (!d) return;
      if (d.statMods.rackCapacityBonus) capacity += d.statMods.rackCapacityBonus;
      if (d.statMods.rackCapacityMult != null) mult *= d.statMods.rackCapacityMult;
    });
    return Math.max(Items.MIN_RACK_CAPACITY, Math.round(capacity * mult));
  };

  // See this function's own header doc above for why onAcquire is a
  // separate, one-shot mechanism rather than another `hooks` entry. Callers:
  // game.js's Game.pickTreasureItem/buyItem/pickBossItemReward, each right
  // after their own player.items.push(itemId).
  Items.applyOnAcquire = function (player, itemId) {
    var d = ITEM_DEFS[itemId];
    if (d && typeof d.onAcquire === 'function') d.onAcquire(player);
  };

  // An item "procced" if its hook announced itself on ctx.messages -- the same
  // signal the rule-changer items already use ("silent modifiers don't create
  // builds", above), so nothing here needs a per-item opt-in. Collected into
  // ctx.proccedItemIds so the caller can flash those chips (FUN OVERHAUL 8/8).
  // Hooks called with a message-less ctx (onPlayerDamaged, onRunStart) are
  // untracked.
  Items.runHook = function (hookName, ctx, player) {
    var tracks = !!(ctx && Array.isArray(ctx.messages));
    if (tracks && !ctx.proccedItemIds) ctx.proccedItemIds = [];
    (player.items || []).forEach(function (itemId) {
      var d = ITEM_DEFS[itemId];
      if (!d || !d.hooks[hookName]) return;
      var messagesBefore = tracks ? ctx.messages.length : 0;
      d.hooks[hookName](ctx);
      if (tracks && ctx.messages.length > messagesBefore) ctx.proccedItemIds.push(itemId);
    });
  };

  // Hooks running inside onWordPlayed fire after Combat.playWord already
  // mutated monster.hp, so bonus damage is applied directly here rather than
  // returned -- keeps combat.js ignorant of items entirely.
  Items.applyBonusDamage = function (ctx, amount) {
    ctx.monster.hp = Math.max(0, ctx.monster.hp - amount);
    ctx.result.damage += amount;
    ctx.result.monsterDied = ctx.monster.hp <= 0;
  };

  Items.applyPercentBonus = function (ctx, pct) {
    var bonus = Math.round(ctx.result.damage * pct);
    if (bonus > 0) Items.applyBonusDamage(ctx, bonus);
    return bonus;
  };

  // Load unlockable items from achievements module
  Items.loadUnlockableItems = function () {
    var Achievements = window.Wordbound.Achievements;
    if (!Achievements) return;
    var unlockedItems = Achievements.UNLOCKABLE_ITEMS;
    if (!unlockedItems) return;
    Object.keys(unlockedItems).forEach(function (itemId) {
      if (!ITEM_DEFS[itemId]) {
        var itemDef = unlockedItems[itemId];
        itemDef.statMods = itemDef.statMods || {};
        itemDef.hooks = itemDef.hooks || {};
        ITEM_DEFS[itemId] = itemDef;
      }
    });
  };

  // Call this once at startup
  Items.loadUnlockableItems();
})();
