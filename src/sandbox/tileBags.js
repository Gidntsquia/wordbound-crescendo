// src/sandbox/tileBags.js
// THREE BAGS TO DRAW THE RACK FROM.
//
// The sandbox used to build every fight out of js/wordbound/tiles.js's
// createStarterDeck() -- the shipped game's fixed twelve-tile opening deck,
// which is a DECK-BUILDING artefact: it exists to be added to between fights,
// and the sandbox has no between-fights. What tuning the tug actually needs is
// the other knob: how good the letters are, held steady for a whole fight, so
// "the words are losing" can be told apart from "this rack was junk".
//
// So: three bags, and the only thing that differs between them is what is in
// them.
//
//   WEAK    -- almost no bingo sorts. One E, no S at all, no T, no R, and the
//              awkward end of the case over-represented. Sets short.
//   NORMAL  -- one of nearly everything, good sorts and bad in the same drawer.
//   STRONG  -- the bingo stem, weighted, plus a C and a G so the racks are not
//              the same eleven letters over and over. Almost every rack holds a
//              long word.
//
// The C and G are worth their line. The pure eleven-letter stem measured a
// hair higher on 6+ availability (87.7% against 87.6%) and paid for it with
// monotony: 2,739 distinct best-words against 4,470, and 4,164 distinct racks
// against 6,197. Ranked by the fight's own wordStrength it also pushed slightly
// LESS (34.7 against 35.3), because a C or a G on a long word is worth more
// than another S. Nothing was given up.
//
// ALL THREE ARE THE SAME SIZE, and that is load-bearing. Bag size is itself a
// strength lever -- a small bag has low draw variance, so its cycle GUARANTEES
// you see its letters, and the same composition measures ~11 points stronger at
// 22 tiles than at 56. Holding all three at 26 leaves composition as the only
// difference between them, so the labels mean what they say.
//
// MEASURED, not guessed. Simulated the way the sandbox actually plays -- draw
// 7, take Sandbox.bestFromRack's answer, discard it, refill, repeat, through
// the real Tiles.draw recycling -- over 15,000 racks per bag across 30 seeds:
//
//   bag     mean best   5+ word   6+ word   7-letter   dead rack
//   weak      4.35       40.8%      5.4%      0.2%       0.09%
//   normal    5.44       89.0%     49.0%      9.1%       0.49%
//   strong    6.31       97.5%     87.6%     47.2%       0.08%
//
// (A real 98-tile Scrabble bag measures 5.19 / 77.5% / 41.0% / 8.1% in the same
// loop, so NORMAL sits a little above a Scrabble bag -- which is right for a
// 26-tile bag whose cycle you see all of.)
//
// PUBLIC API (window.Wordbound.Sandbox):
//   TILE_BAGS -> [{ id, label, blurb, counts }] in weak..strong order
//   getTileBag(id) -> one of the above, falling back to the normal bag
//   createBagDeck(bagId) -> a fresh array of Tiles.createTile() tiles
(function () {
  window.Wordbound = window.Wordbound || {};
  var Sandbox = (window.Wordbound.Sandbox = window.Wordbound.Sandbox || {});

  var BAGS = [
    {
      id: 'weak',
      label: 'Pied case',
      // "Pied" is the printer's word for type that has been spilled and
      // jumbled -- the case you do not want to be setting from.
      blurb: 'Somebody kicked the case over — three U’s, one lonely E, no S at '
        + 'all, and every awkward sort in the drawer. Sets short, sets often.',
      counts: {
        A: 2, B: 1, C: 1, D: 1, E: 1, F: 1, G: 1, H: 1, I: 3, J: 1,
        K: 1, M: 1, O: 3, P: 1, U: 3, V: 1, W: 1, Y: 1, Z: 1
      }
    },
    {
      id: 'normal',
      label: 'House case',
      blurb: 'The case as the shop keeps it — one of nearly everything, the '
        + 'good sorts and the bad in the same drawer.',
      counts: {
        A: 3, B: 1, C: 1, D: 1, E: 2, F: 1, G: 1, H: 1, I: 2, K: 1,
        L: 1, M: 1, N: 1, O: 2, P: 1, R: 1, S: 1, T: 1, U: 1, V: 1, Y: 1
      }
    },
    {
      id: 'strong',
      label: 'Foundry font',
      // A "font" in the foundry sense: one complete casting of a sort, sold by
      // weight. This one was cast for speed.
      blurb: 'Cast fresh and weighted for speed — four E’s and the whole bingo '
        + 'stem. Almost every rack sets a long line.',
      counts: {
        A: 3, C: 1, D: 1, E: 4, G: 1, I: 2, L: 1, N: 2, O: 2,
        R: 3, S: 3, T: 2, U: 1
      }
    }
  ];

  Sandbox.TILE_BAGS = BAGS;

  Sandbox.getTileBag = function (id) {
    for (var i = 0; i < BAGS.length; i++) if (BAGS[i].id === id) return BAGS[i];
    return BAGS[1];
  };

  // A fresh set of tiles for one fight. Built in sorted-letter order so a bag
  // written with its letters in a different order cannot shuffle differently
  // under the same seed -- the bags are meant to be compared against each
  // other on one seed, and that only works if the seed means the same thing.
  Sandbox.createBagDeck = function (bagId) {
    var counts = Sandbox.getTileBag(bagId).counts;
    var Tiles = window.Wordbound.Tiles;
    var deck = [];
    Object.keys(counts).sort().forEach(function (letter) {
      for (var i = 0; i < counts[letter]; i++) deck.push(Tiles.createTile(letter, null));
    });
    return deck;
  };
})();
