// src/sandbox/shop.js
// THE SHOP AFTER EVERY FIGHT (Balatro's shop, see BALATRO_NOTES.md). Opens on
// every won round short of the last boss; the run is built here.
//
//   Two CARD SLOTS, each rolled CARD_ITEM / CARD_INK / CARD_ETUDE (70 / 15 /
//   15 by weight): an ITEM (a joker: bought into run.items, ITEM_SLOTS of
//   them, priced by rarity), an INK (a tarot: a consumable, Sandbox.INKS,
//   present from Phase 4) or an ETUDE (a planet: a consumable that levels one
//   length tier). Consumables go into run.consumables, CONSUMABLE_SLOTS deep.
//   Two PACKS at PACK_PRICE: Tile (3 tiles from the strong bag, keep 1 into
//   run.deck), Ink (3 inks, keep 1), Etude (3 etudes, keep 1). Opening one
//   puts up run.pack = { kind, choices }, settled by run.pick(i | null).
//   REROLL rerolls the two card slots for REROLL_PRICE, + REROLL_STEP each
//   time, reset per shop. Selling an item pays floor(price / 2).
//
// Plain JS, no React. Money and slots are checked here; the UI only asks.
//
// PUBLIC API (window.Wordbound.Sandbox):
//   createShop(run, rng) -> shop
//     shop.cards [{ kind, id, price, sold }], shop.packs [{ kind, price,
//       opened }], shop.rerolls, shop.rerollPrice()
//     shop.buy(i) / shop.openPack(i) / shop.reroll() / shop.sell(itemIndex)
//       -> { ok } | { ok: false, reason }
//   PACK_KINDS, priceOf(def)
(function () {
  window.Wordbound = window.Wordbound || {};
  var Sandbox = (window.Wordbound.Sandbox = window.Wordbound.Sandbox || {});

  Sandbox.PACK_KINDS = [
    { kind: 'tile', name: 'Tile pack', hint: 'Three sorts from the foundry — keep one in your case for the run' },
    { kind: 'ink', name: 'Ink pack', hint: 'Three inks — keep one' },
    { kind: 'etude', name: 'Étude pack', hint: 'Three études — keep one, and level a length' }
  ];
  Sandbox.RARITY_PRICE = { common: [3, 5], uncommon: [5, 7], rare: [8, 8] };

  Sandbox.priceOf = function (def, rng) {
    if (def.price != null) return def.price;
    var band = Sandbox.RARITY_PRICE[def.rarity || 'common'];
    return rng ? rng.randInt(band[0], band[1]) : band[0];
  };

  function pick(rng, arr) { return arr[rng.randInt(0, arr.length - 1)]; }

  Sandbox.createShop = function (run, rng) {
    var tune = run.tune;
    var shop = { cards: [], packs: [], rerolls: 0 };

    function itemPool(taken) {
      return Sandbox.ITEMS.map(function (it) { return it.id; }).filter(function (id) {
        return run.items.indexOf(id) < 0 && taken.indexOf(id) < 0;
      });
    }
    function rollEtude() {
      return { kind: 'etude', id: pick(rng, Sandbox.TIERS).id };
    }
    function rollInk() {
      var inks = Sandbox.INKS || [];
      return inks.length ? { kind: 'ink', id: pick(rng, inks).id } : null;
    }
    // Weighted by rarity: common 70, uncommon 25, rare 5 (Balatro's roll).
    function rollItem(taken) {
      var pool = itemPool(taken);
      if (!pool.length) return null;
      var weights = { common: 70, uncommon: 25, rare: 5 };
      var total = 0;
      pool.forEach(function (id) { total += weights[Sandbox.ITEM_DEFS[id].rarity || 'common']; });
      var roll = rng.next() * total;
      for (var i = 0; i < pool.length; i++) {
        roll -= weights[Sandbox.ITEM_DEFS[pool[i]].rarity || 'common'];
        if (roll <= 0) return { kind: 'item', id: pool[i] };
      }
      return { kind: 'item', id: pool[pool.length - 1] };
    }
    function rollCard(taken) {
      var r = rng.next() * (tune.CARD_ITEM + tune.CARD_INK + tune.CARD_ETUDE);
      var card = null;
      if (r < tune.CARD_ITEM) card = rollItem(taken);
      else if (r < tune.CARD_ITEM + tune.CARD_INK) card = rollInk();
      if (!card) card = rollItem(taken) || rollEtude();
      card.price = card.kind === 'item' ? Sandbox.priceOf(Sandbox.ITEM_DEFS[card.id], rng)
        : card.kind === 'ink' ? tune.INK_PRICE : tune.ETUDE_PRICE;
      card.sold = false;
      return card;
    }
    function rollCards() {
      shop.cards = [];
      var taken = [];
      for (var i = 0; i < tune.CARD_SLOTS; i++) {
        var c = rollCard(taken);
        if (c.kind === 'item') taken.push(c.id);
        shop.cards.push(c);
      }
    }
    function rollPacks() {
      shop.packs = [];
      var kinds = Sandbox.PACK_KINDS.filter(function (k) { return k.kind !== 'ink' || (Sandbox.INKS || []).length; });
      // Distinct kinds while there are enough to go round.
      var left = kinds.slice();
      for (var i = 0; i < tune.PACK_SLOTS; i++) {
        if (!left.length) left = kinds.slice();
        var k = left.splice(rng.randInt(0, left.length - 1), 1)[0];
        shop.packs.push({ kind: k.kind, price: tune.PACK_PRICE, opened: false });
      }
    }

    shop.rerollPrice = function () { return tune.REROLL_PRICE + tune.REROLL_STEP * shop.rerolls; };

    function takeConsumable(c) {
      if (run.consumables.length >= tune.CONSUMABLE_SLOTS) {
        // An étude with nowhere to go is played on the spot; an ink cannot be.
        if (c.kind === 'etude') { run.levelTier(c.id); return { ok: true, used: true }; }
        return { ok: false, reason: 'No room for another consumable — use or sell one first.' };
      }
      run.consumables.push({ kind: c.kind, id: c.id });
      return { ok: true };
    }

    shop.buy = function (i) {
      var c = shop.cards[i];
      if (!c || c.sold) return { ok: false, reason: 'Nothing there.' };
      if (run.gold < c.price) return { ok: false, reason: 'Not enough gold.' };
      if (c.kind === 'item') {
        if (run.items.length >= tune.ITEM_SLOTS) return { ok: false, reason: 'All ' + tune.ITEM_SLOTS + ' item slots are full — sell one first.' };
        run.items.push(c.id);
      } else {
        var t = takeConsumable(c);
        if (!t.ok) return t;
      }
      run.gold -= c.price;
      c.sold = true;
      return { ok: true, card: c };
    };

    shop.sell = function (itemIndex) {
      var id = run.items[itemIndex];
      if (!id) return { ok: false, reason: 'No item there.' };
      run.items.splice(itemIndex, 1);
      var paid = Math.floor(Sandbox.priceOf(Sandbox.ITEM_DEFS[id]) / 2);
      run.gold += paid;
      return { ok: true, id: id, paid: paid };
    };

    shop.reroll = function () {
      var price = shop.rerollPrice();
      if (run.gold < price) return { ok: false, reason: 'Not enough gold to reroll (' + price + ').' };
      run.gold -= price;
      shop.rerolls += 1;
      rollCards();
      if (shop.coupon) shop.cards.forEach(function (c) { c.price = 0; });
      return { ok: true };
    };

    shop.openPack = function (i) {
      var p = shop.packs[i];
      if (!p || p.opened) return { ok: false, reason: 'Nothing there.' };
      if (run.pack) return { ok: false, reason: 'Settle the open pack first.' };
      var price = p.free ? 0 : p.price;
      if (run.gold < price) return { ok: false, reason: 'Not enough gold.' };
      var choices = [];
      var n = tune.PACK_CHOICES;
      if (p.kind === 'tile') {
        var Tiles = window.Wordbound.Tiles;
        var counts = Sandbox.getTileBag('strong').counts;
        var letters = [];
        Object.keys(counts).forEach(function (l) { for (var k = 0; k < counts[l]; k++) letters.push(l); });
        for (var a = 0; a < n; a++) choices.push({ kind: 'tile', tile: Tiles.createTile(pick(rng, letters), null) });
      } else if (p.kind === 'etude') {
        for (var b = 0; b < n; b++) choices.push(rollEtude());
      } else {
        for (var c = 0; c < n; c++) choices.push(rollInk());
      }
      run.gold -= price;
      p.opened = true;
      run.pack = { kind: p.kind, choices: choices };
      return { ok: true, pack: run.pack };
    };

    // Settle the open pack: keep choice i, or nothing.
    run.pick = function (i) {
      var pack = run.pack;
      if (!pack) return { ok: false, reason: 'No pack is open.' };
      if (i == null) { run.pack = null; return { ok: true }; }
      var c = pack.choices[i];
      if (!c) return { ok: false, reason: 'Nothing there.' };
      if (c.kind === 'tile') run.deck.push(c.tile);
      else {
        var t = takeConsumable(c);
        if (!t.ok) return t;
      }
      run.pack = null;
      return { ok: true, choice: c };
    };

    rollCards();
    rollPacks();
    // Favours owed from a skipped enemy (round.js run.skip), spent here.
    shop.favours = run.favours.splice(0);
    shop.favours.forEach(function (f) {
      if (f === 'free_pack' && shop.packs[0]) shop.packs[0].free = true;
      if (f === 'coupon') shop.coupon = true;
    });
    if (shop.coupon) shop.cards.forEach(function (c) { c.price = 0; });
    return shop;
  };
})();
