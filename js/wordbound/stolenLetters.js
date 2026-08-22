// js/wordbound/stolenLetters.js
// STOLEN LETTERS META-PROGRESSION ticket (GOALS.md): the permanent,
// cross-run progression. The Fermata stole part of the alphabet from the
// world's tile supply (THEME.md's premise) -- represented here as a fixed
// STARTING_STOLEN set, permanently recovered letter by letter. Persists via
// localStorage, same pattern as achievements.js, distinct key per the
// ticket's own instruction.
//
// PUBLIC API (window.Wordbound.StolenLetters):
//   STARTING_STOLEN                    - the fixed starting-stolen letter set
//   isStolen(letter)                   - true if still stolen (not recovered)
//   getStolenLetters()/getRecoveredLetters() - arrays, for the Alphabet display
//   recoverByBossDefId(bossDefId)      - recovers that boss's hostage letter
//                                         if any; returns the letter or null
//   syncFromAchievements()             - recovers any letter whose paired
//                                         achievement is unlocked; returns
//                                         an array of newly-recovered letters
//   reset()                            - clears persisted progress (testing)
//
// WORD VALIDATION IS UNCHANGED (per the ticket): Lexicon's own dictionary
// never shrinks. Only NEW tile generation (Tiles.rollRewardOptions/
// rollVariantTile, both funneled through tiles.js's own letter-frequency
// pool) excludes a currently-stolen letter -- see that file's own
// getAvailableLetterFrequencyPool.
//
// A CHARACTER'S FIXED STARTING DECK IS DELIBERATELY NOT FILTERED.
// THEME.md's own premise -- "All you have left is your Rack (a case of
// loose type, still yours)" -- reads those specific tiles as the player's
// own kept property, predating the theft, not part of the world supply the
// Fermata raided; the ticket's own "stolen letters never appear in racks"
// is satisfied because nothing NEW ever adds one, not by stripping tiles
// that were already there. This also sidesteps a real, otherwise-ugly
// conflict: the Scribe's starting deck (characters.js) already carries K/
// X/Z as its whole designed identity ("every rare/powerful letter that
// defines the character") -- filtering starting decks would gut ONE
// character's design on its own, wildly disproportionate to the other two
// (checked directly: archivist/keeper's decks carry none of this file's
// STARTING_STOLEN letters), and rebalancing a character is not this
// ticket's job.
//
// STARTING STOLEN SET -- a judgment call, flagged for Jaxon's taste like
// every naming/tuning choice in this repo, not a mechanical requirement:
// - K, V, Z: three of THEME.md's own four boss-hostage proposals, for the
//   three real, reachable, reskinned bosses (Mountain King/K, Valkyrie
//   Marshal/V, the Maestro/Z) -- recovered by defeating that specific boss,
//   per the ticket's own "beat a boss -> recover a specific letter."
//   THEME.md's 4th hostage proposal, X (Death, the Fiddler), is
//   DELIBERATELY EXCLUDED here: that boss is floor 2's still-unreskinned
//   placeholder (boss_unabridged -- see monsters.js and BOSS ENTRANCE
//   CUTSCENES's own scope note for the same gap). Stealing X now with no
//   boss able to recover it would make one letter permanently
//   unrecoverable until a future run reskins floor 2 -- worse than simply
//   not stealing it yet. Whichever run gives floor 2 its real bible
//   identity should add X to STARTING_STOLEN and BOSS_HOSTAGE_LETTERS
//   together.
// - C, H, J, Q, W: five letters with no boss tied to them, each recovered
//   by one of achievements.js's five EXISTING achievements instead of a
//   new mechanic -- the ticket's own "optional extra recoveries via
//   achievements" bullet, using every achievement this game already has
//   rather than inventing new ones. The specific pairing is arbitrary
//   flavor, not mechanically meaningful -- open to a better one.
// Never includes E, per the ticket's own explicit warning ("stealing E
// would be miserable, don't").
(function () {
  window.Wordbound = window.Wordbound || {};
  var StolenLetters = (window.Wordbound.StolenLetters = {});

  var STORAGE_KEY = 'wordbound_stolen_letters_v1';

  StolenLetters.STARTING_STOLEN = ['C', 'H', 'J', 'K', 'Q', 'V', 'W', 'Z'];

  var BOSS_HOSTAGE_LETTERS = {
    boss_vowelmaw: 'K',
    boss_sovereign: 'V',
    boss_maestro: 'Z',
  };

  var ACHIEVEMENT_RECOVERY_LETTERS = {
    clear_a_run: 'J',
    boss_without_damage: 'Q',
    high_damage_word: 'W',
    collect_many_items: 'H',
    massive_overkill: 'C',
  };

  var recoveredLetters = {}; // letter -> true, persisted

  function loadProgress() {
    try {
      if (typeof localStorage === 'undefined') return;
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored) recoveredLetters = JSON.parse(stored);
    } catch (e) {
      // localStorage unavailable (jsdom, private browsing, etc.) or corrupt JSON
    }
  }

  function saveProgress() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recoveredLetters));
    } catch (e) {
      // localStorage unavailable
    }
  }

  // Internal: marks `letter` recovered if it's a real, still-stolen letter.
  // Returns whether this call actually changed anything (idempotent --
  // callers don't need to track "already recovered" themselves).
  function recover(letter) {
    if (!letter) return false;
    letter = String(letter).toUpperCase();
    if (StolenLetters.STARTING_STOLEN.indexOf(letter) === -1) return false;
    if (recoveredLetters[letter]) return false;
    recoveredLetters[letter] = true;
    saveProgress();
    return true;
  }

  StolenLetters.recoverByBossDefId = function (bossDefId) {
    var letter = BOSS_HOSTAGE_LETTERS[bossDefId];
    if (!letter) return null;
    return recover(letter) ? letter : null;
  };

  // Idempotent and cheap to call liberally: checks every achievement-paired
  // letter against the achievement's CURRENT unlocked state and recovers
  // any that are due, rather than requiring the caller to diff before/after
  // unlock state itself. Safe to call after ANY achievement-tracking pass,
  // and once at module load (below) to retroactively grant recoveries for
  // achievements a returning player already unlocked before this ticket
  // existed.
  StolenLetters.syncFromAchievements = function () {
    var Achievements = window.Wordbound.Achievements;
    if (!Achievements) return [];
    var justRecovered = [];
    Object.keys(ACHIEVEMENT_RECOVERY_LETTERS).forEach(function (achId) {
      var letter = ACHIEVEMENT_RECOVERY_LETTERS[achId];
      if (Achievements.isUnlocked(achId) && recover(letter)) justRecovered.push(letter);
    });
    return justRecovered;
  };

  StolenLetters.isStolen = function (letter) {
    letter = String(letter || '').toUpperCase();
    return StolenLetters.STARTING_STOLEN.indexOf(letter) !== -1 && !recoveredLetters[letter];
  };

  StolenLetters.getStolenLetters = function () {
    return StolenLetters.STARTING_STOLEN.filter(function (l) { return !recoveredLetters[l]; });
  };

  StolenLetters.getRecoveredLetters = function () {
    return StolenLetters.STARTING_STOLEN.filter(function (l) { return !!recoveredLetters[l]; });
  };

  // Exposed for the same reason achievements.js exposes its own
  // loadProgress/saveProgress: lets a real reload be simulated in a test
  // (seed localStorage, call loadProgress(), confirm state reflects it)
  // without needing to re-run this module's IIFE, which no test harness in
  // this repo can cleanly do.
  StolenLetters.loadProgress = loadProgress;
  StolenLetters.saveProgress = saveProgress;

  StolenLetters.reset = function () {
    recoveredLetters = {};
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // localStorage unavailable
    }
  };

  loadProgress();
  StolenLetters.syncFromAchievements();
})();
