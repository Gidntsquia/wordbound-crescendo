// src/sandbox/quillDiscovery.js
// QUILL DISCOVERY -- the second meta after stolen letters (NEXT_LEVEL_PLAN.md
// stage 4). A new install already knows the plain length/mult quills; every
// crescendo and second-axis quill (and Harmony) starts hidden and is not
// offered in the shop or a pack until discovered. Persisted in localStorage
// as wbc.quills (a JSON array of discovered ids), next to wbc.best and
// wbc.letters. A lost run never loses a discovered quill -- this module only
// ever adds.
//
// PUBLIC API (window.Wordbound.Sandbox):
//   STARTING_QUILLS      -- ids known from a fresh install
//   discoveredQuills()   -> string[] ids discovered so far
//   isQuillDiscovered(id) -> bool
//   hiddenQuillIds()      -> string[] ITEMS ids not yet discovered
//   discoverQuill(id)     -> persists it if new; returns true if it was new
//   rollQuillDiscovery(rng) -> one random hidden id, or null if none left
(function () {
  window.Wordbound = window.Wordbound || {};
  var Sandbox = (window.Wordbound.Sandbox = window.Wordbound.Sandbox || {});

  var STORE_KEY = 'wbc.quills';

  // The plain length and mult quills -- flat points/mult with no word-kind,
  // crescendo, or scaling condition attached (~10, per the plan).
  Sandbox.STARTING_QUILLS = [
    'brass_nib',
    'second_ink',
    'short_form',
    'long_form',
    'lead_weight',
    'gilded_edge',
    'half_note',
    'double_stop',
    'fermata',
    'miser',
  ];

  Sandbox.discoveredQuills = function () {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      var arr = raw ? JSON.parse(raw) : null;
      if (Array.isArray(arr) && arr.length)
        return arr.filter(function (id) {
          return typeof id === 'string';
        });
    } catch (e) {
      /* private mode etc */
    }
    return Sandbox.STARTING_QUILLS.slice();
  };

  Sandbox.isQuillDiscovered = function (id) {
    return Sandbox.discoveredQuills().indexOf(id) >= 0;
  };

  Sandbox.hiddenQuillIds = function () {
    var known = {};
    Sandbox.discoveredQuills().forEach(function (id) {
      known[id] = true;
    });
    return (Sandbox.ITEMS || [])
      .map(function (it) {
        return it.id;
      })
      .filter(function (id) {
        return !known[id];
      });
  };

  Sandbox.discoverQuill = function (id) {
    if (!Sandbox.ITEM_DEFS || !Sandbox.ITEM_DEFS[id]) return false;
    var known = Sandbox.discoveredQuills();
    if (known.indexOf(id) >= 0) return false;
    known.push(id);
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(known));
    } catch (e) {
      /* ignore */
    }
    return true;
  };

  Sandbox.rollQuillDiscovery = function (rng) {
    var hidden = Sandbox.hiddenQuillIds();
    if (!hidden.length) return null;
    return hidden[rng.randInt(0, hidden.length - 1)];
  };
})();
