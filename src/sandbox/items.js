// src/sandbox/items.js
// THE ITEM ROSTER -- Balatro's jokers, sandbox-owned (js/wordbound/items.js
// is NOT loaded here). A run holds up to ITEM_SLOTS of them, bought in the
// shop (shop.js) and sold for half. Each fires on every word, LEFT TO RIGHT
// in the order held, on an accumulator { points, mult }: additive points and
// mult first in the row score less than the same item after a x-mult, so
// the order is the player's to arrange (run.moveItem).
//
// An item is { id, name, rarity, price, hint, score?(ctx, acc), plays?,
// goldAtWin?(round) }. `score` mutates acc and may return a note for the
// breakdown line. ctx = { word, tiles (played), held, run, round, tune,
// isLastPlay, playIndex, preview } -- `preview` is true when the UI is only
// asking what a word WOULD score; scaling state (Refrain) is advanced by
// round.js's playWord afterwards via `onPlayed`, never inside score.
//
// PUBLIC API (window.Wordbound.Sandbox): ITEMS, ITEM_DEFS, applyItems(ctx, acc)
(function () {
  window.Wordbound = window.Wordbound || {};
  var Sandbox = (window.Wordbound.Sandbox = window.Wordbound.Sandbox || {});

  var VOWELS = { A: 1, E: 1, I: 1, O: 1, U: 1 };
  var HARD = { K: 1, Q: 1, X: 1, Z: 1, J: 1 };
  function count(tiles, set) {
    var n = 0;
    tiles.forEach(function (t) { if (set[t.letter]) n++; });
    return n;
  }

  Sandbox.ITEMS = [
    // Common
    { id: 'brass_nib', name: 'Brass Nib', rarity: 'common', price: 3, hint: '+10 points on every word',
      score: function (c, a) { a.points += 10; return '+10'; } },
    { id: 'second_ink', name: 'Second Ink', rarity: 'common', price: 4, hint: '+1 mult on every word',
      score: function (c, a) { a.mult += 1; return '+1 mult'; } },
    { id: 'vowel_song', name: 'Vowel Song', rarity: 'common', price: 5, hint: '+3 mult for every vowel played',
      score: function (c, a) { var n = count(c.tiles, VOWELS); if (!n) return null; a.mult += 3 * n; return '+' + 3 * n + ' mult'; } },
    { id: 'hard_consonant', name: 'Hard Consonant', rarity: 'common', price: 4, hint: '+15 points for every K, Q, X, Z or J played',
      score: function (c, a) { var n = count(c.tiles, HARD); if (!n) return null; a.points += 15 * n; return '+' + 15 * n; } },
    { id: 'short_form', name: 'Short Form', rarity: 'common', price: 4, hint: '+4 mult if the word is 4 letters or fewer',
      score: function (c, a) { if (c.word.length > 4) return null; a.mult += 4; return '+4 mult'; } },
    { id: 'long_form', name: 'Long Form', rarity: 'common', price: 4, hint: '+30 points if the word is 6 letters or more',
      score: function (c, a) { if (c.word.length < 6) return null; a.points += 30; return '+30'; } },
    // Uncommon
    { id: 'lead_weight', name: 'Lead Weight', rarity: 'uncommon', price: 6, hint: '+25 points on every word',
      score: function (c, a) { a.points += 25; return '+25'; } },
    { id: 'gilded_edge', name: 'Gilded Edge', rarity: 'uncommon', price: 5, hint: '+10 points and +1 mult',
      score: function (c, a) { a.points += 10; a.mult += 1; return '+10, +1 mult'; } },
    { id: 'half_note', name: 'Half Note', rarity: 'uncommon', price: 6, hint: '×1.5 mult',
      score: function (c, a) { a.mult *= 1.5; return '×1.5 mult'; } },
    { id: 'refrain', name: 'Refrain', rarity: 'uncommon', price: 6, hint: '+1 mult for every word played this run so far',
      score: function (c, a) { var n = c.run ? (c.run.itemState.refrain || 0) : 0; if (!n) return null; a.mult += n; return '+' + n + ' mult'; },
      onPlayed: function (run) { run.itemState.refrain = (run.itemState.refrain || 0) + 1; } },
    { id: 'coda', name: 'Coda', rarity: 'uncommon', price: 7, hint: 'The last word of a round scores ×2 mult',
      score: function (c, a) { if (!c.isLastPlay) return null; a.mult *= 2; return '×2 mult, last word'; } },
    { id: 'anagram', name: 'Anagram', rarity: 'uncommon', price: 5, hint: '+20 points if the word uses an inked tile',
      score: function (c, a) { if (!c.tiles.some(function (t) { return t.ink; })) return null; a.points += 20; return '+20'; } },
    { id: 'miser', name: 'Miser', rarity: 'uncommon', price: 5, hint: '+1 gold per unused changeout at a win',
      goldAtWin: function (round) { return round.changeoutsLeft; } },
    // Rare
    { id: 'double_stop', name: 'Double Stop', rarity: 'rare', price: 8, hint: '×2 mult',
      score: function (c, a) { a.mult *= 2; return '×2 mult'; } },
    { id: 'fermata', name: 'Fermata', rarity: 'rare', price: 8, hint: '+1 word every round', plays: 1 }
  ];
  Sandbox.ITEM_DEFS = {};
  Sandbox.ITEMS.forEach(function (it) { Sandbox.ITEM_DEFS[it.id] = it; });

  // Fire the run's items in held order. Returns [{ id, name, note }] for the
  // ones that did something.
  Sandbox.applyItems = function (ctx, acc) {
    var notes = [];
    (ctx.items || []).forEach(function (id) {
      var it = Sandbox.ITEM_DEFS[id];
      if (!it || !it.score) return;
      var note = it.score(ctx, acc);
      if (note) notes.push({ id: id, name: it.name, note: note });
    });
    return notes;
  };
})();
