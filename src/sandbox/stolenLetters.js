// src/sandbox/stolenLetters.js
// STOLEN LETTERS -- the meta-progression (DIVERGENCE_PLAN.md "Stolen letters
// as the meta"). The enemy stole the alphabet (THEME.md, ROADMAP.md); a new
// player's bag holds a reduced one, and felling a boss offers a letter back.
// Persisted in localStorage as wbc.letters (a JSON array of won letters),
// next to wbc.best and wbc.seen. Vowels are never stolen. A lost run keeps
// letters already won -- this module never removes one once granted.
//
// PUBLIC API (window.Wordbound.Sandbox):
//   STOLEN_ORDER      -- consonants in the order they are missing, highest
//                         value first; everything after this list (plus all
//                         vowels) is available from the start
//   wonLetters()       -> string[] letters won so far (from localStorage)
//   missingLetters()    -> string[] STOLEN_ORDER entries not yet won
//   isAvailable(letter) -> bool
//   availableLetters()  -> string[] the 26 minus the still-missing ones
//   winLetter(letter)   -> persists it if new; returns true if it was new
//   filterLetters(str)  -> str with any still-missing letters removed, for
//                          building a pool of candidate letters to draw from
(function () {
  window.Wordbound = window.Wordbound || {};
  var Sandbox = (window.Wordbound.Sandbox = window.Wordbound.Sandbox || {});

  var VOWELS = 'AEIOU';
  var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var STORE_KEY = 'wbc.letters';

  // High-value, rare letters first (the ones a player will miss most), then
  // the next tier, then the mid-value consonants -- about six locked at the
  // start, leaving roughly twenty available (DIVERGENCE_PLAN.md).
  Sandbox.STOLEN_ORDER = ['J', 'Q', 'X', 'Z', 'K', 'W', 'V', 'Y', 'F', 'H', 'B', 'G', 'M', 'P'];
  var STARTING_LOCKED = 6; // how many of STOLEN_ORDER are missing on a fresh install

  Sandbox.wonLetters = function () {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      var arr = raw ? JSON.parse(raw) : null;
      return Array.isArray(arr) ? arr.filter(function (l) { return typeof l === 'string'; }) : [];
    } catch (e) { return []; }
  };

  Sandbox.missingLetters = function () {
    var won = {};
    Sandbox.wonLetters().forEach(function (l) { won[l] = true; });
    var locked = Sandbox.STOLEN_ORDER.slice(0, STARTING_LOCKED);
    return locked.filter(function (l) { return !won[l]; });
  };

  Sandbox.isAvailable = function (letter) {
    if (VOWELS.indexOf(letter) >= 0) return true;
    return Sandbox.missingLetters().indexOf(letter) < 0;
  };

  Sandbox.availableLetters = function () {
    var missing = Sandbox.missingLetters();
    return ALPHABET.split('').filter(function (l) { return missing.indexOf(l) < 0; });
  };

  Sandbox.winLetter = function (letter) {
    var won = Sandbox.wonLetters();
    if (won.indexOf(letter) >= 0) return false;
    won.push(letter);
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(won)); } catch (e) { /* private mode etc */ }
    return true;
  };

  // Letters still locked beyond STARTING_LOCKED (never offered, never
  // stolen further) are not touched here -- STARTING_LOCKED is the whole
  // pool a run can ever win back, by design (see DIVERGENCE_PLAN.md).
  Sandbox.rollLetterChoice = function (rng, count) {
    var missing = Sandbox.missingLetters();
    if (!missing.length) return null;
    var shuffled = rng.shuffle(missing);
    return shuffled.slice(0, Math.min(count || 3, shuffled.length));
  };

  Sandbox.filterLetters = function (letters) {
    var avail = {};
    Sandbox.availableLetters().forEach(function (l) { avail[l] = true; });
    return letters.filter(function (l) { return avail[l]; });
  };
})();
