// DUEL-GAUGE COMBAT ticket (GOALS.md, 2026-08-21 header COMBAT MODEL
// decision): the TELEGRAPH UI bullet -- "the player must SEE the music
// coming... a swelling meter, scrolling dynamics ribbon (design call)."
// This is a standalone, presentational visualization of a `Duel` engine
// instance (js/wordbound/duel.js): the Volume gauge, Verses (health
// blocks), the i-frame grace state, an in-progress parry-damping indicator,
// and an upcoming-crescendo warning. Names ("the Volume", "Verses") are
// THEME.md's, already vetted by the THEME BIBLE ticket -- duel.js itself
// deliberately uses generic field names (gauge/healthBlocks), this is where
// the bible's words belong.
//
// Built and unit-tested standalone against a REAL `Duel.create()` instance
// (see __tests__/VolumeGauge.test.jsx), same "engine-first, isolated,
// always-verified-before-wiring-in" pattern music.js and duel.js themselves
// followed -- NOT YET WIRED into CombatScreen.jsx. That integration (a
// per-frame tick loop feeding a live Duel instance + music.js's
// getIntensity()/'crescendo-approaching' event into a mounted instance of
// this component) is still open, real remaining scope for the DUEL-GAUGE
// COMBAT ticket -- see GOALS.md's "Next" note. Deliberately a pure function
// of props, never reading window.Wordbound.Duel/Music itself, so it doesn't
// care whether `duel` is a live engine instance or a duel-shaped plain
// object -- useful for that future integration run, which will want to pass
// a live instance every animation frame without this component caring.
//
// PROPS:
//   duel   -- a Duel.create()-shaped object: { gauge, healthBlocks,
//             maxHealthBlocks, pushesWon, pushesToDefeat, iframeUntil,
//             parryDampingUntil, isIframeActive(now)? }. isIframeActive is
//             called if present (matches the real engine's own method);
//             falls back to `now < duel.iframeUntil` for a plain object
//             that doesn't carry the method (e.g. a hand-built test fixture
//             or a future serialized-state snapshot).
//   now    -- the same clock reading (seconds) the caller is passing to
//             duel.tick()/attemptParry() -- used only to derive i-frame/
//             parry-damping display state, never mutated.
//   approachingCrescendoSecondsAway -- optional number, seconds until the
//             next crescendo peak (derive from music.js's
//             'crescendo-approaching' payload + the sequencer's own clock);
//             omit/null/undefined to show no warning.
//
// GAUGE_MIN/MAX/CENTER below are NOT re-read from window.Wordbound.Duel
// (this component takes no engine dependency) -- they're copied constants,
// documented as matching js/wordbound/duel.js's own Duel.GAUGE_MIN/MAX/
// CENTER (0/100/50), which are fixed, non-configurable constants on that
// module, not per-instance fields duel.create() could vary.
const GAUGE_MIN = 0;
const GAUGE_MAX = 100;
const GAUGE_CENTER = 50;

export function VolumeGauge({ duel, now, approachingCrescendoSecondsAway }) {
  const clamped = Math.max(GAUGE_MIN, Math.min(GAUGE_MAX, duel.gauge));
  const percent = ((clamped - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * 100;
  const leaningPlayer = clamped < GAUGE_CENTER;
  const fillLeft = leaningPlayer ? percent : 50;
  const fillWidth = Math.abs(percent - 50);

  const iframeActive = typeof duel.isIframeActive === 'function'
    ? duel.isIframeActive(now)
    : now < duel.iframeUntil;
  const parryActive = duel.parryDampingUntil != null && now < duel.parryDampingUntil;

  const showCrescendoWarning = approachingCrescendoSecondsAway != null && approachingCrescendoSecondsAway >= 0;
  const showPushes = duel.pushesToDefeat > 1;

  return (
    <div className="volume-gauge">
      <div className="volume-gauge-label">
        <span>The Volume</span>
        {showCrescendoWarning && (
          <span className="volume-crescendo-warning" role="status">
            Crescendo in {approachingCrescendoSecondsAway.toFixed(1)}s
          </span>
        )}
      </div>
      <div
        className={'volume-gauge-track' + (iframeActive ? ' volume-gauge-iframe' : '')}
        role="meter"
        aria-label="The Volume"
        aria-valuemin={GAUGE_MIN}
        aria-valuemax={GAUGE_MAX}
        aria-valuenow={Math.round(clamped)}
      >
        <div className="volume-gauge-center-mark" />
        <div
          className={
            'volume-gauge-fill' +
            (leaningPlayer ? ' volume-gauge-fill-danger' : ' volume-gauge-fill-safe') +
            (parryActive ? ' volume-gauge-parried' : '')
          }
          style={{ left: fillLeft + '%', width: fillWidth + '%' }}
        />
      </div>
      <div
        className="verses-display"
        aria-label={duel.healthBlocks + ' of ' + duel.maxHealthBlocks + ' Verses remaining'}
      >
        {Array.from({ length: duel.maxHealthBlocks }).map((_, i) => (
          <span
            key={i}
            className={'verse-pip' + (i < duel.healthBlocks ? ' verse-pip-filled' : ' verse-pip-lost')}
          />
        ))}
      </div>
      {showPushes && (
        <div className="pushes-display">Pushes {duel.pushesWon} / {duel.pushesToDefeat}</div>
      )}
      {iframeActive && (
        <div className="volume-gauge-grace">Grace period -- the music can't touch you</div>
      )}
    </div>
  );
}
