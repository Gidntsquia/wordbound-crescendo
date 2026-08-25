// WORD MAKER -- "here are my letters, what can I actually spell?"
//
// Brute-forcing 200k dictionary words against a rack on every keystroke is far
// too slow, so this uses the same trick lexicon.js uses for its softlock check:
// sorting a word's letters is order-independent, so an anagram map keyed by
// sorted letters turns "can I spell something with these tiles" into a handful
// of Set lookups. A 7-tile rack has only 2^7 subsets to test.
//
// The map is built once, lazily, on the first search (~200k string sorts, a
// couple hundred ms) and cached for the rest of the session.
(function () {
  window.Wordbound = window.Wordbound || {};
  var Sandbox = (window.Wordbound.Sandbox = window.Wordbound.Sandbox || {});

  var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var anagramMap = null;

  function buildMap() {
    if (anagramMap) return anagramMap;
    anagramMap = new Map();
    var list = window.Wordbound.WORDLIST || [];
    for (var i = 0; i < list.length; i++) {
      var w = list[i];
      if (w.length < 2) continue;
      var key = w.split('').sort().join('');
      var bucket = anagramMap.get(key);
      if (bucket) bucket.push(w);
      else anagramMap.set(key, [w]);
    }
    return anagramMap;
  }

  Sandbox.isWordMakerReady = function () { return !!anagramMap; };
  Sandbox.warmWordMaker = function () { buildMap(); };

  // letters: a string like "DELISTG" ('?' = blank wildcard).
  // score: optional (word) -> number ranking function; defaults to length.
  // Returns [{ word, score }] best-first, at most `limit` entries.
  Sandbox.findWords = function (letters, score, limit) {
    var map = buildMap();
    var scoreOf = score || function (w) { return w.length; };
    var max = limit || 8;

    var chars = String(letters || '').toUpperCase().replace(/[^A-Z?]/g, '').split('');
    if (chars.length > 10) chars = chars.slice(0, 10); // 2^10 subsets is the ceiling
    var fixed = [];
    var blanks = 0;
    for (var i = 0; i < chars.length; i++) {
      if (chars[i] === '?') blanks++;
      else fixed.push(chars[i]);
    }
    if (blanks > 2) blanks = 2; // 26^3 substitutions is not worth it

    var found = new Map();

    function consider(subset) {
      if (subset.length < 2) return;
      var bucket = map.get(subset.slice().sort().join(''));
      if (!bucket) return;
      for (var b = 0; b < bucket.length; b++) {
        if (!found.has(bucket[b])) found.set(bucket[b], scoreOf(bucket[b]));
      }
    }

    // Every subset of the real letters, each optionally padded out with one
    // substitution per blank tile.
    var n = fixed.length;
    for (var mask = 0; mask < (1 << n); mask++) {
      var subset = [];
      for (var bit = 0; bit < n; bit++) {
        if (mask & (1 << bit)) subset.push(fixed[bit]);
      }
      consider(subset);
      if (blanks >= 1) {
        for (var a = 0; a < 26; a++) {
          var one = subset.concat([ALPHABET[a]]);
          consider(one);
          if (blanks >= 2) {
            for (var c = a; c < 26; c++) consider(one.concat([ALPHABET[c]]));
          }
        }
      }
    }

    var out = [];
    found.forEach(function (value, key) { out.push({ word: key, score: value }); });
    out.sort(function (x, y) { return y.score - x.score || x.word.localeCompare(y.word); });
    return out.slice(0, max);
  };
})();
