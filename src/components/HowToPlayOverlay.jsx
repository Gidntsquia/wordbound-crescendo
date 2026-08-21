// React port of wordbound.html's #howto-overlay (desktop copy only). The
// vanilla version swaps in touch-mode-specific wording via a pointer-coarse
// media query and shows an iOS ringer-switch tip; that input-mode detection
// isn't ported to React yet (it lives with the combat screen's touch input,
// a later STRUCTURAL sub-step), so this is intentionally the desktop variant
// for now — noted honestly rather than faked.
export default function HowToPlayOverlay({ open, onClose }) {
  return (
    <div id="howto-overlay" className={`howto-overlay${open ? '' : ' hidden'}`}>
      <div className="howto-panel panel">
        <h2>How to Play</h2>
        <ul className="howto-list">
          <li>Spell real words from your Rack, then hit <strong>Play Word</strong>.</li>
          <li>Longer words and rarer letters (like Q, X, Z) hit harder — go big when you can.</li>
          <li>Every Loose Word shows a <strong>Weakness</strong> — match it for bonus damage.</li>
          <li>Your whole Rack refreshes after every word, played tiles and leftovers alike. Spend freely.</li>
          <li>Tile rewards and items pile up as you descend — a stacked Rack is the whole point by floor 3.</li>
          <li><strong>Overcharge</strong> spends ink for a bigger hit on your next word; <strong>Rewrite</strong> spends ink to trade in your whole Rack for a fresh one. Both show their cost before you commit — plain word play is always free.</li>
          <li>★ blanks: just type any word — they fill in automatically.</li>
        </ul>
        <button className="btn btn-primary" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}
