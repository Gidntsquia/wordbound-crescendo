import { useEffect, useState } from 'react';

// BOSS ENTRANCE CUTSCENES ticket (GOALS.md): React's equivalent of
// game.js's showBossEntrance/hideBossEntrance (see that pair's own header
// comment) -- same content source (window.Wordbound.BossEntrances), same
// step timing, same "skip jumps straight to the end of the whole sequence"
// meaning of "skippable with one tap/keypress" (the ticket's own words), but
// built React-native (local step state + its own setTimeout chain) rather
// than calling into game.js's DOM-manipulating version, which is guarded
// inert in the React tree by its own reactTreeActive() check.
//
// `entrance` is the `{ name, epithet, taunts }` shape
// `window.Wordbound.BossEntrances.getEntrance` returns -- CombatScreen.jsx
// only mounts this component at all once it already has a non-null one, so
// this file never needs to handle "no entrance content for this boss" itself.
const TITLE_STEP_MS = 1800;
const TAUNT_STEP_MS = 1600;

export function BossEntranceOverlay({ entrance, onDismiss }) {
  const [step, setStep] = useState(0);

  // The step-advance timer chain. Re-keyed on `entrance` itself (a fresh
  // object per boss fight, from CombatScreen's own per-fight computation) so
  // mounting this for a NEW boss always restarts cleanly at step 0, never
  // resuming a previous boss's half-finished timer.
  useEffect(() => {
    setStep(0);
    const steps = 1 + entrance.taunts.length; // title card + each taunt line
    let timer = null;
    function advance(next) {
      if (next >= steps) { onDismiss(); return; }
      setStep(next);
      timer = setTimeout(() => advance(next + 1), TAUNT_STEP_MS);
    }
    timer = setTimeout(() => advance(1), TITLE_STEP_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrance]);

  // "Skippable with one tap/keypress" -- Escape/Enter/Space, matching
  // game.js's own showBossEntrance keydown gate exactly.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') onDismiss();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onDismiss]);

  const isTitleStep = step === 0;

  return (
    <div className="boss-entrance-overlay">
      <div className="boss-entrance-plate panel">
        {/* Portrait placeholder (a large crown glyph, the same one
            getTierGlyph gives every boss elsewhere) -- see game.js's
            showBossEntrance / css/wordbound.css's .boss-entrance-portrait
            comment for why this isn't bespoke per-boss illustration yet. */}
        <div className="boss-entrance-portrait">👑</div>
        <h2 className="boss-entrance-title">
          {entrance.name.toUpperCase()}{isTitleStep ? ' -- ' + entrance.epithet : ''}
        </h2>
        <p className="boss-entrance-taunt">
          {isTitleStep ? '' : '"' + entrance.taunts[step - 1] + '"'}
        </p>
        <button type="button" className="btn btn-secondary boss-entrance-skip" onClick={onDismiss}>
          Skip &#9656;
        </button>
      </div>
    </div>
  );
}
