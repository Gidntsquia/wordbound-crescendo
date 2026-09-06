// src/sandbox/enemies.js
// THE LINEUP: two MOVEMENTS of three enemies each (Balatro's antes and
// blinds, see BALATRO_NOTES.md). Each enemy is a piece of music -- one of the
// sandbox's three recordings, reused across movements, no new audio -- with a
// kind that sets its target multiplier and gold: small x1, big x1.5, boss x2
// of the movement's base (ROUND_DEFAULTS MOVEMENT_BASE_1 / _2, BIG_MULT,
// BOSS_MULT). A boss may carry a RULE (a "tempo marking", Sandbox.RULES)
// that round.js applies at creation.
//
// PUBLIC API (window.Wordbound.Sandbox):
//   MOVEMENTS  -> [{ numeral, name, enemies: [{ id, name, glyph, recorded,
//                   kind: 'small'|'big'|'boss', flavour, rule? }] }]
//   KIND_MULT  -> { small, big, boss } tune keys for the target multiplier
//   RULES      -> { id: { id, name, text, ... } } boss rules (Phase 6)
//   enemyAt(movement, stage) -> the enemy def
(function () {
  window.Wordbound = window.Wordbound || {};
  var Sandbox = (window.Wordbound.Sandbox = window.Wordbound.Sandbox || {});

  Sandbox.MOVEMENTS = [
    {
      numeral: 'I', name: 'First Movement',
      enemies: [
        { id: 'bagatelle', name: 'The Bagatelle', glyph: '\u{1F339}', recorded: 'recordedFurElise', kind: 'small',
          flavour: 'A trifle. It only wants to be hummed.' },
        { id: 'moonlight', name: 'The Moonlight', glyph: '\u{1F319}', recorded: 'recordedMoonlight', kind: 'big',
          flavour: 'Slow, and it does not blink.' },
        { id: 'fate', name: 'Fate at the Door', glyph: '\u{1F451}', recorded: 'recordedSymphony5', kind: 'boss',
          flavour: 'Four knocks. It is not asking.', rule: 'four_knocks' }
      ]
    },
    {
      numeral: 'II', name: 'Second Movement',
      enemies: [
        { id: 'bagatelle2', name: 'The Bagatelle, Reprise', glyph: '\u{1F339}', recorded: 'recordedFurElise', kind: 'small',
          flavour: 'The same tune, sharper teeth.' },
        { id: 'moonlight2', name: 'The Moonlight, Presto', glyph: '\u{1F319}', recorded: 'recordedMoonlight', kind: 'big',
          flavour: 'It has learned to hurry.', rule: 'presto' },
        { id: 'fate2', name: 'Fate Answered', glyph: '\u{1F451}', recorded: 'recordedSymphony5', kind: 'boss',
          flavour: 'Every letter you spend, it remembers.', rule: 'no_repeats' }
      ]
    }
  ];

  Sandbox.KIND_LABEL = { small: 'Small', big: 'Big', boss: 'Boss' };

  Sandbox.enemyAt = function (movement, stage) {
    var m = Sandbox.MOVEMENTS[movement];
    return m ? m.enemies[stage] : null;
  };

  // Tempo markings -- boss rules. round.js reads these at creation (plays,
  // targetMult), at scoring (score(ctx, acc) after the items) and at play
  // (barsLetter(round, letter)); the UI shows `text` under the target in
  // the enemy's voice and greys barred tiles.
  Sandbox.RULES = {
    four_knocks: {
      id: 'four_knocks', name: 'Four knocks',
      text: 'Four. Always four. A word of four letters strikes twice as hard here — ×2 mult.',
      score: function (ctx, acc) { if (ctx.word.length !== 4) return null; acc.mult *= 2; return '×2 mult, four knocks'; }
    },
    presto: {
      id: 'presto', name: 'Presto',
      text: 'No time to dwell. Three words instead of four, and the target is lighter — ×0.8.',
      plays: -1, targetMult: 0.8
    },
    no_repeats: {
      id: 'no_repeats', name: 'No repeats',
      text: 'Every letter you spend, it remembers. A letter played this round cannot be played again.',
      barsLetter: function (round, letter) { return letter !== '?' && !!round.usedLetters[letter]; }
    }
  };
})();
