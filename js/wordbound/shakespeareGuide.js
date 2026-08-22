// js/wordbound/shakespeareGuide.js
// SHAKESPEARE GUIDE + AUTHOR SHOPKEEPERS ticket (GOALS.md), step 1 (GUIDE
// INTRO): William Shakespeare's quest-setting intro, shown once ever on a
// player's first-ever run. Content sourced directly from THEME.md's own
// "William Shakespeare -- the guide" section (that section's "quest-setting
// beats" 1/2/3 -- the theft, why the player, the send-off -- are this file's
// `taunts` array, near-verbatim) -- read that section first before editing a
// line here, per this repo's own "THEME.md is the reference" convention
// (see bossEntrances.js's identical header note for the same rule applied to
// boss cutscenes).
//
// Shape matches window.Wordbound.BossEntrances.getEntrance's own return
// value ({ name, epithet, taunts }) on purpose: both game.js's vanilla
// showBossEntrance/hideBossEntrance and React's BossEntranceOverlay.jsx
// consume that exact shape, and this ticket's own instruction is to "reuse
// the cutscene presentation layer where it fits" -- this is a single fixed
// entrance object, not a per-defId map (there's only ever one guide), so
// there's no getEntrance-style lookup function needed, just the object
// itself.
(function () {
  window.Wordbound = window.Wordbound || {};
  var ShakespeareGuide = (window.Wordbound.ShakespeareGuide = {});

  ShakespeareGuide.INTRO = {
    name: 'William Shakespeare',
    epithet: 'a poet, inconveniently drafted',
    taunts: [
      'Out, out -- no, wrong play, wrong mood, disregard that: they took the letters, every last one, mid-sentence, and left me reciting in mime.',
      'You still have your Rack, which by my count makes you the last armed soul in the building. Fortune, it seems, has volunteered you.',
      'A tune can fill a room. A word, well-placed, can end the argument. Go and place a few.'
    ]
  };
})();
