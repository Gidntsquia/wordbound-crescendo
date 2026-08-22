// js/wordbound/shopkeepers.js
// SHAKESPEARE GUIDE + AUTHOR SHOPKEEPERS ticket (GOALS.md), step 2
// (SHOPKEEPERS): the six-author roster from THEME.md's "The shopkeeper
// roster" table, picked per-shop-visit (per that section's own "per-shop,
// seeded off (runSeed, shop node id)" recommendation -- implemented here as
// "rolled fresh from state.rng at shop entry," the same mechanism
// rollShopOptions/rollShopTileOffer already use for their own per-visit
// rolls, which is what makes it reproducible per seed without a separate
// node-id hash).
//
// THEME.md's table gives each author a personality/voice paragraph and a
// named quirk concept, but -- unlike Shakespeare's guide section, which
// wrote out full sample lines -- does not write out finished shop dialogue
// for the six. The `lines` arrays below are this ticket's own first-pass
// copy, written to match each author's "Voice" column; same "worth Jaxon's
// read for tone" flag every cutscene-copy module in this repo carries
// (bossEntrances.js, shakespeareGuide.js).
//
// Quirk mechanics, matched against THEME.md's table cell-by-cell:
//   Homer      -- Bard's Largesse: shop guarantees 2 consumable slots, not 1.
//   Cervantes  -- Tilt at Windmills: a reroll discount. THEME.md's own cell
//                 already hedges this on "if/when a shop reroll mechanic
//                 exists" -- no reroll mechanic exists anywhere in this repo
//                 (confirmed by grep before writing this file). Left
//                 deliberately INERT (quirkInert: true, no numeric hook) --
//                 building a discount against a purchase path that doesn't
//                 exist would be dead code with nothing to attach to, the
//                 same reasoning STRUCTURAL's blank-picker note (GOALS.md,
//                 update-6) already established for this repo. Revisit once
//                 a reroll mechanic lands (ITEMS ticket or later).
//   Austen     -- Sense and Sensibility: "one item CATEGORY" per THEME.md's
//                 own words. Items in this repo carry no category axis
//                 other than rarity (grep confirms items.js has no
//                 `category` field) -- read "category" as rarity TIER here,
//                 which is also the one axis THEME.md's own per-shop
//                 "which category discounts is picked per-shop" line
//                 implies varies visit to visit. One of the four rarity
//                 tiers is picked fresh each shop visit and discounted.
//   Dickinson  -- Circumference: the shop's premium variant-tile offer
//                 (normally a SHOP_VARIANT_TILE_CHANCE coin-flip) always
//                 appears in her shop.
//   Poe        -- Nevermore: rare-and-legendary items discounted.
//   Wilde      -- The Importance of Being Earnest: every consumable in his
//                 shop discounted.
//
// Exclusive items (THEME.md's 1-2-per-author concepts) are explicitly OUT
// of this file's scope -- the ticket's own step 2 instruction says to
// coordinate those with the ITEMS ticket (still queued, unstarted as of
// this file's creation), and several of THEME.md's own concept cells
// literally say "see the ITEMS ticket for the real numbers." Landing them
// here first would mean inventing item-tier numbers twice.
(function () {
  window.Wordbound = window.Wordbound || {};
  var Shopkeepers = (window.Wordbound.Shopkeepers = {});

  var RARITY_TIERS = ['common', 'uncommon', 'rare', 'legendary'];
  Shopkeepers.RARITY_TIERS = RARITY_TIERS;

  var AUTHOR_DEFS = {
    homer: {
      id: 'homer',
      name: 'Homer',
      epithet: 'the blind rhapsode',
      lines: [
        'Come near, O sacker of sour chords, and behold what the ships of commerce have borne to this stall.',
        'Three coins only, for a trinket wrought by no god -- a bargain such as heroes sing of for generations.',
        'Hear now the catalogue of my wares, swift-fingered speller, as once I sang the ships.'
      ],
      quirkName: "Bard's Largesse",
      quirkDescription: 'His shop always stocks two consumables, not the usual one.',
      guaranteesSecondConsumable: true
    },
    cervantes: {
      id: 'cervantes',
      name: 'Miguel de Cervantes',
      epithet: 'knight of the woeful countenance',
      lines: [
        "Behold, sir Lyricist -- a relic worthy of any errant knight, or possibly a very ordinary trinket. I leave the judging to you, as any honest narrator must.",
        "Buy it, and you ride forth ingenious and undaunted. Do not, and you ride forth prudent and unencumbered. I have written both endings and liked them equally.",
        "The windmill spins for less, if you insist it's a giant."
      ],
      quirkName: 'Tilt at Windmills',
      quirkDescription: 'Discounts shop rerolls -- inert until a reroll mechanic exists in this game (see this file\'s header note).',
      quirkInert: true
    },
    austen: {
      id: 'austen',
      name: 'Jane Austen',
      epithet: 'a most attentive observer',
      lines: [
        "A very reasonable price, all things considered -- though I concede 'considered' is doing rather a lot of work in that sentence.",
        "I shan't tell you which of my wares I'd choose. A lady never reveals her preferences before the purchase is made.",
        "You have the look of someone about to make a decision they'll narrate charmingly for years. Do go on."
      ],
      quirkName: 'Sense and Sensibility',
      quirkDescription: 'One rarity tier, chosen fresh each visit, is discounted 20%.',
      rarityDiscountPct: 0.2
    },
    dickinson: {
      id: 'dickinson',
      name: 'Emily Dickinson',
      epithet: 'the recluse of Amherst',
      lines: [
        'A word -- for a word -- is a fair exchange --',
        'I do not haggle -- I do not need to --',
        'The Tile -- does not -- hide -- from me --'
      ],
      quirkName: 'Circumference',
      quirkDescription: 'Her premium tile offer never fails to appear.',
      guaranteesVariantTile: true
    },
    poe: {
      id: 'poe',
      name: 'Edgar Allan Poe',
      epithet: 'teller of tales macabre',
      lines: [
        'This one was not cheap to acquire -- the previous owner insisted otherwise, right up until he stopped insisting anything at all.',
        'Buy it. I promise nothing follows you home. I promise this the way a raven promises silence.',
        "The finer things come cheap, here, to those who don't ask why."
      ],
      quirkName: 'Nevermore',
      quirkDescription: 'Rare and legendary items are discounted 25%.',
      rareDiscountPct: 0.25
    },
    wilde: {
      id: 'wilde',
      name: 'Oscar Wilde',
      epithet: 'a wit beyond his means',
      lines: [
        'I can resist anything except a good discount.',
        'To sell is human; to sell well, divine; to sell at a markup, merely American.',
        "I am, as ever, above the transaction -- until it's completed, at which point I find I was quite looking forward to it."
      ],
      quirkName: 'The Importance of Being Earnest',
      quirkDescription: 'Every consumable in his shop is discounted 20%.',
      consumableDiscountPct: 0.2
    }
  };
  Shopkeepers.AUTHOR_DEFS = AUTHOR_DEFS;

  var AUTHOR_IDS = Object.keys(AUTHOR_DEFS);
  Shopkeepers.AUTHOR_IDS = AUTHOR_IDS;

  // Rolled from the run's own live RNG stream at shop entry -- same
  // mechanism (not a separate node-id hash) as rollShopOptions/
  // rollShopTileOffer's own per-visit rolls, so a given seed + path through
  // the map always meets the same keeper at the same shop, per THEME.md's
  // own reproducibility requirement.
  Shopkeepers.pickShopkeeper = function (rng) {
    return rng.choice(AUTHOR_IDS);
  };

  Shopkeepers.pickRarityFocus = function (rng) {
    return rng.choice(RARITY_TIERS);
  };

  Shopkeepers.pickLine = function (rng, authorId) {
    var def = AUTHOR_DEFS[authorId];
    if (!def) return '';
    return rng.choice(def.lines);
  };

  // def: an Items.ITEM_DEFS[x] or Consumables.CONSUMABLE_DEFS[x] entry.
  // isConsumable: whether def came from the consumable pool.
  // shopkeeperId: state.shopkeeperId (may be null -- no discount).
  // rarityFocus: state.shopkeeperRarityFocus, only meaningful for Austen.
  // Centralized here so game.js's real gold charge and both UIs' displayed
  // price can never drift apart -- both call this, never def.shopPrice raw.
  Shopkeepers.effectivePrice = function (def, isConsumable, shopkeeperId, rarityFocus) {
    var price = (def && def.shopPrice) || 0;
    var authorDef = shopkeeperId ? AUTHOR_DEFS[shopkeeperId] : null;
    if (!authorDef || !price) return price;

    var pct = 0;
    if (!isConsumable && authorDef.rareDiscountPct && (def.rarity === 'rare' || def.rarity === 'legendary')) {
      pct = authorDef.rareDiscountPct;
    } else if (!isConsumable && authorDef.rarityDiscountPct && def.rarity === rarityFocus) {
      pct = authorDef.rarityDiscountPct;
    } else if (isConsumable && authorDef.consumableDiscountPct) {
      pct = authorDef.consumableDiscountPct;
    }
    if (!pct) return price;
    return Math.max(1, Math.round(price * (1 - pct)));
  };
})();
