// src/sandbox/inks.js
// INKS -- Balatro's tarot cards. A consumable that marks one or two tiles of
// the current case (they are the same objects as run.deck's, so the mark
// lasts the run), turns a letter, destroys a tile, or pays gold. The marks
// are scored by round.js's scoreWordPoints (tile.ink):
//   gilt   +INK_GILT points when the tile is played
//   bold   +INK_BOLD mult when the tile is played
//   steel  x INK_STEEL mult for each steel tile left in the case after a play
//   blank  the tile is a wildcard ('?', worth 0, spells anything)
// and the rest act at once:
//   vowel  the tile becomes the vowel of choice
//   erase  the tile is destroyed (out of the deck and the case; the case refills)
//   coin   gold doubles, up to +INK_COIN_CAP
//
// PUBLIC API (window.Wordbound.Sandbox):
//   INKS [{ id, name, targets (0-2), needsVowel?, hint }], INK_DEFS
//   applyInk(run, inkId, tileIds, extra?) -> { ok, note } | { ok:false, reason }
//     extra.vowel for 'vowel'. Tiles must stand in run.round.rack.
(function () {
  window.Wordbound = window.Wordbound || {};
  var Sandbox = (window.Wordbound.Sandbox = window.Wordbound.Sandbox || {});

  Sandbox.INKS = [
    { id: 'gilt', name: 'Gilt', targets: 2, hint: 'Up to 2 tiles: +20 points whenever played' },
    { id: 'bold', name: 'Bold', targets: 2, hint: 'Up to 2 tiles: +2 mult whenever played' },
    { id: 'steel', name: 'Steel', targets: 1, hint: '1 tile: ×1.2 mult on every word while it waits in the case' },
    { id: 'blank', name: 'Blank', targets: 1, hint: '1 tile becomes a wildcard — any letter, worth 0' },
    { id: 'vowel', name: 'Vowel Shift', targets: 1, needsVowel: true, hint: '1 tile becomes the vowel you choose' },
    { id: 'erase', name: 'Erase', targets: 2, hint: 'Destroy up to 2 tiles for the rest of the run' },
    { id: 'coin', name: 'Coin', targets: 0, hint: 'Double your gold, up to +10' }
  ];
  Sandbox.INK_DEFS = {};
  Sandbox.INKS.forEach(function (ink) { Sandbox.INK_DEFS[ink.id] = ink; });
  Sandbox.VOWELS = ['A', 'E', 'I', 'O', 'U'];

  Sandbox.inkMark = function (tile) {
    return tile && tile.ink ? Sandbox.INK_DEFS[tile.ink] : null;
  };

  Sandbox.applyInk = function (run, inkId, tileIds, extra) {
    var ink = Sandbox.INK_DEFS[inkId];
    if (!ink) return { ok: false, reason: 'No such ink.' };
    var tune = run.tune;
    if (ink.id === 'coin') {
      var gain = Math.min(tune.INK_COIN_CAP, run.gold);
      run.gold += gain;
      return { ok: true, note: 'Coin: +' + gain + ' gold.' };
    }
    var round = run.round;
    if (!round || round.state !== 'live') return { ok: false, reason: 'Inks are applied to the case mid-fight.' };
    var ids = (tileIds || []).slice(0, ink.targets);
    if (!ids.length) return { ok: false, reason: 'Pick a tile in the case first.' };
    var tiles = ids.map(function (id) {
      return round.rack.find(function (t) { return t.id === id; });
    }).filter(Boolean);
    if (tiles.length !== ids.length) return { ok: false, reason: 'Those tiles aren’t in the case.' };
    var letters = tiles.map(function (t) { return t.letter; }).join(', ');
    if (ink.id === 'erase') {
      tiles.forEach(function (t) {
        var d = run.deck.indexOf(t);
        if (d >= 0) run.deck.splice(d, 1);
        round.destroyTile(t.id);
      });
      return { ok: true, note: 'Erased ' + letters + '.' };
    }
    if (ink.id === 'vowel') {
      var v = String(extra && extra.vowel || '').toUpperCase();
      if (Sandbox.VOWELS.indexOf(v) < 0) return { ok: false, reason: 'Choose a vowel.' };
      tiles.forEach(function (t) { t.letter = v; if (t.ink === 'blank') t.ink = null; });
      return { ok: true, note: letters + ' → ' + v + '.' };
    }
    if (ink.id === 'blank') {
      tiles.forEach(function (t) { t.letter = '?'; t.ink = 'blank'; });
      return { ok: true, note: letters + ' is now a blank.' };
    }
    tiles.forEach(function (t) { t.ink = ink.id; });
    return { ok: true, note: ink.name + ' on ' + letters + '.' };
  };
})();
