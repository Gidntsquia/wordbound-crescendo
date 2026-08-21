// Shared global namespace. window.Wordbound (see js/wordbound/*) is the
// actual game namespace; this slot only carries the seeded RNG (js/core/
// rng.js), which predates the Wordbound/Descent split and stayed engine-
// level rather than moving under Wordbound.
window.Game = window.Game || {
  RNG: {}
};
