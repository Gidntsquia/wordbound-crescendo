// WORD MAKER -- "rearrange EXACTLY these letters into a word."
//
// Sorting a word's letters is order-independent, so an anagram map keyed by
// sorted letters turns "what do these letters spell" into a single lookup.
//
// findWords is an ANAGRAM SOLVER, not a best-play finder: it uses every letter
// given or returns nothing. DISTGE -> DIGEST; DISGETZ -> nothing, because no
// word uses that Z. Leftover letters are a miss, not a smaller answer. (An
// earlier version enumerated all 2^n subsets and returned the best word it
// could build from part of the input, which quietly ignored letters the player
// had actually selected.)
//
// bestFromRack is the separate "what could I play at all?" helper, and IS a
// subset search -- see its own note.
//
// The map is built once, lazily, on the first search (~200k string sorts, a
// couple hundred ms) and cached for the rest of the session.
(function () {
  window.Wordbound = window.Wordbound || {};
  var Sandbox = (window.Wordbound.Sandbox = window.Wordbound.Sandbox || {});

  var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var anagramMap = null;

  // Built in slices so the page keeps painting while the helper warms up
  // (warmWordMaker); a search that lands before the slices are done finishes
  // the job synchronously (buildMap), so nothing ever has to wait on it.
  var builtUpTo = 0;
  var SLICE = 40000;

  function buildSlice(map, list, upTo) {
    for (var i = builtUpTo; i < upTo; i++) {
      var w = list[i];
      if (w.length < 2) continue;
      var key = w.split('').sort().join('');
      var bucket = map.get(key);
      if (bucket) bucket.push(w);
      else map.set(key, [w]);
    }
    builtUpTo = upTo;
  }

  function buildMap() {
    var list = window.Wordbound.WORDLIST || [];
    if (!anagramMap) anagramMap = new Map();
    if (builtUpTo < list.length) buildSlice(anagramMap, list, list.length);
    return anagramMap;
  }

  Sandbox.isWordMakerReady = function () {
    return !!anagramMap && builtUpTo >= (window.Wordbound.WORDLIST || []).length;
  };
  Sandbox.warmWordMaker = function (onDone) {
    var list = window.Wordbound.WORDLIST || [];
    if (!anagramMap) anagramMap = new Map();
    (function step() {
      if (builtUpTo >= list.length) { if (onDone) onDone(); return; }
      buildSlice(anagramMap, list, Math.min(list.length, builtUpTo + SLICE));
      setTimeout(step, 0);
    })();
  };

  function splitLetters(letters) {
    var chars = String(letters || '').toUpperCase().replace(/[^A-Z?]/g, '').split('');
    if (chars.length > 12) chars = chars.slice(0, 12);
    var fixed = [];
    var blanks = 0;
    for (var i = 0; i < chars.length; i++) {
      if (chars[i] === '?') blanks++;
      else fixed.push(chars[i]);
    }
    if (blanks > 2) blanks = 2; // 26^3 substitutions is not worth it
    return { fixed: fixed, blanks: blanks };
  }

  // letters: a string like "DISTGE" ('?' = blank wildcard).
  // score: optional (word) -> number ranking function; defaults to length.
  // Returns [{ word, score }] best-first, at most `limit` entries.
  //
  // EVERY letter must be used. A blank stands in for one letter of the answer,
  // so it is still consumed -- "?IGEST" spells DIGEST, but "DIGESTZ" spells
  // nothing at all.
  Sandbox.findWords = function (letters, score, limit) {
    var map = buildMap();
    var scoreOf = score || function (w) { return w.length; };
    var max = limit || 8;
    var split = splitLetters(letters);
    var fixed = split.fixed;
    if (fixed.length + split.blanks < 2) return [];

    var found = new Map();
    function consider(set) {
      var bucket = map.get(set.slice().sort().join(''));
      if (!bucket) return;
      for (var b = 0; b < bucket.length; b++) {
        if (!found.has(bucket[b])) found.set(bucket[b], scoreOf(bucket[b]));
      }
    }

    if (split.blanks === 0) {
      consider(fixed);
    } else if (split.blanks === 1) {
      for (var a = 0; a < 26; a++) consider(fixed.concat([ALPHABET[a]]));
    } else {
      for (var b1 = 0; b1 < 26; b1++) {
        for (var b2 = b1; b2 < 26; b2++) consider(fixed.concat([ALPHABET[b1], ALPHABET[b2]]));
      }
    }

    var out = [];
    found.forEach(function (value, key) { out.push({ word: key, score: value }); });
    out.sort(function (x, y) { return y.score - x.score || x.word.localeCompare(y.word); });
    return out.slice(0, max);
  };

  // The other question: "given this whole rack, what is the best thing I can
  // play?" That one IS a subset search -- a rack is a hand to choose from, not
  // a set of letters to consume. The UI uses it to FILL the field with the
  // winning word's own letters, so what the player then sees selected still
  // spells that word exactly and findWords above still agrees.
  Sandbox.bestFromRack = function (letters, score, limit) {
    var map = buildMap();
    var scoreOf = score || function (w) { return w.length; };
    var max = limit || 8;
    var split = splitLetters(letters);
    var fixed = split.fixed;
    if (fixed.length > 10) fixed = fixed.slice(0, 10); // 2^10 subsets is the ceiling

    var found = new Map();
    function consider(set) {
      if (set.length < 2) return;
      var bucket = map.get(set.slice().sort().join(''));
      if (!bucket) return;
      for (var b = 0; b < bucket.length; b++) {
        if (!found.has(bucket[b])) found.set(bucket[b], scoreOf(bucket[b]));
      }
    }

    var n = fixed.length;
    for (var mask = 0; mask < (1 << n); mask++) {
      var subset = [];
      for (var bit = 0; bit < n; bit++) if (mask & (1 << bit)) subset.push(fixed[bit]);
      consider(subset);
      if (split.blanks >= 1) {
        for (var a = 0; a < 26; a++) {
          var one = subset.concat([ALPHABET[a]]);
          consider(one);
          if (split.blanks >= 2) {
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
