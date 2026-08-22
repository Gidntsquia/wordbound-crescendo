// js/wordbound/bossEntrances.js
// BOSS ENTRANCE CUTSCENES ticket (GOALS.md): content for the short, skippable
// entrance each boss gets before their fight -- a title card (name + epithet,
// same "NAME -- epithet" shape the ticket's own example uses) and 2-3 taunt
// lines in the boss's distinct voice, both sourced directly from THEME.md's
// "The three floor bosses" / "The Maestro" sections (each boss's own
// `personality (for the entrance-cutscene ticket)` paragraph is this file's
// source of truth -- read that first before editing a line here).
//
// Keyed by monsters.js's own boss defId, NOT by display name (defIds are the
// stable, already-referenced-everywhere key; names have been reskinned before
// and could be again). Only the three bosses THEME.md actually gives a
// personality to are covered here -- `boss_unabridged` (floor 2) is still the
// original engine-fork's generic "Unabridged Terror" placeholder, not yet
// reskinned to THEME.md's proposed "Death, the Fiddler" (Danse Macabre) or
// given a `.piece` (confirmed by grepping monsters.js directly: no `piece:`
// field on that def, unlike the other three) -- inventing cutscene content
// for a boss the bible doesn't actually describe would be writing lore, not
// implementing it. Game.getBossEntrance returns null for it (and for any
// other unlisted defId), and callers must treat null as "skip the cutscene
// entirely, go straight to the fight" -- never fall back to placeholder text.
// COPY NOTE: these lines are a first pass in each boss's established voice
// (mocking-then-menacing / terse-and-martial / calm-and-absolute, per THEME.md's
// own descriptions) -- worth Jaxon's read for tone, same as THEME.md itself
// was flagged when written, but not a blocking naming/feel call on their own.
(function () {
  window.Wordbound = window.Wordbound || {};
  var BossEntrances = (window.Wordbound.BossEntrances = {});

  var ENTRANCES = {
    boss_vowelmaw: {
      epithet: 'impish, mocking, and not afraid of you -- yet',
      taunts: [
        'A Junior Lyricist, come to bother the King in his hall?',
        'Laugh if you like. The tune only gets faster from here.',
      ],
    },
    boss_sovereign: {
      epithet: 'relentless forward pressure, first note to last',
      taunts: [
        'No theatrics. No pause for taunting.',
        'Just the charge.',
      ],
    },
    boss_maestro: {
      epithet: 'Fate incarnate -- He Who Knocks',
      taunts: [
        'Four notes. That is all Fate requires.',
        'You will hear them, whether or not you are ready.',
      ],
    },
  };

  // Returns { name, epithet, taunts } for a real, entrance-having boss, or
  // null if this defId has no entrance content (see this file's own header
  // comment on `boss_unabridged`) -- callers must treat null as "no cutscene",
  // never substitute placeholder text. `name` comes from the live def/monster
  // object (whichever the caller has on hand), not duplicated in ENTRANCES,
  // so a future rename never desyncs the two.
  BossEntrances.getEntrance = function (defId, name) {
    var entry = ENTRANCES[defId];
    if (!entry) return null;
    return { name: name, epithet: entry.epithet, taunts: entry.taunts };
  };
})();
