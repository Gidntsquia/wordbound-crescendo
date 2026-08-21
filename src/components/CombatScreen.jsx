import { useEffect, useMemo, useRef, useState } from 'react';

// React port of wordbound.html's #combat-panel (STRUCTURAL ticket, next
// sub-step after the node map). Deliberately does NOT call game.js's
// renderCombat()/animateDamage()/celebrateHit()/animatePlayerDamage() --
// those are hard-wired to old element ids (`$('monster-hp-fill')` etc.) that
// don't exist in the React tree and would throw (audited in PROGRESS.md
// before this run started). Decision made here, per that audit's two
// options: (b) React owns this screen's rendering and interaction natively,
// reading `state` directly and calling only the small set of Game.* action
// functions that mutate state without touching the DOM (submitWord,
// toggleOvercharge, rewriteRack) -- the same functions the dom-check test
// suite already drives headlessly.
//
// Word input (STRUCTURAL ticket, remaining-scope (c) step 2, rebuilt this
// run): rack-tile clicks now go through the REAL engine staging functions
// (Game.selectTileForWord/unstageTile, wrapping game.js's private
// selectTileForWord/unstageTile) instead of appending to a local plain
// string -- state.selectedTileIds is the actual source of truth, same as
// wordbound.html, and a clicked tile visually moves out of the rack into a
// real staging row (mirrors renderStagingArea()), leaving an empty
// rack-slot behind that unstages it back. `word` is still local React state
// for the free-typing desktop path (Combat.playWord matches a submitted
// word against the rack by LETTER, and desktop submits `word-input`'s raw
// text value regardless of what's staged -- confirmed by reading game.js's
// btn-submit-word handler, this is real existing vanilla behavior, not a
// port shortcut) but it's now kept in sync with the engine's own
// Game.stagedWord() after every stage/unstage/clear, exactly like
// game.js's syncWordInput() keeps its #word-input mirrored.
// The touch-mode blank-letter picker overlay (STRUCTURAL ticket, remaining-
// scope (c) step 2, this run): tapping a blank tile in touch mode calls the
// real Game.selectTileForWord -> game.js's private selectTileForWord ->
// opens the A-Z picker (state.blankPickerOpen/blankPickerTileId), which now
// renders below as a real .blank-picker-overlay (same CSS classes/shape
// wordbound.html's own overlay uses) -- picking a letter calls
// Game.assignBlankLetter, Cancel calls Game.closeBlankPicker. Before this,
// state.blankPickerOpen flipped true with nothing to render it, so a touch
// player tapping a blank saw no feedback at all; a blank was effectively
// unplayable on touch (desktop is unaffected -- selectTileForWord no-ops on
// a blank there, typing the letter is still how a blank gets used).
// Pointer/touch DRAG reordering within the staging row or rack (game.js's
// startStagingDrag/startTouchReorder/reorderRackOnDrop) remains genuinely
// NOT ported -- tap-to-stage/unstage/pick-a-blank-letter is fully
// functional without it, but reordering an already-staged word means
// unstaging and re-tapping in the new order.
// game.js itself needed two small additive null-guards to make this safe:
// syncWordInput()'s and selectTileForWord()'s `$('word-input')` DOM access
// now checks the element exists first (same "no #word-input in the React
// tree" reasoning as every other reactTreeActive()-style guard this ticket
// has added) -- a guaranteed no-op for wordbound.html, which always has
// that element.
//
// Damage/hit animations (floating numbers, hp-flash, screen-shake,
// CRUSHING!/MAGNIFICENT! banners): also not ported. Game.submitWord resolves
// the counterattack inside its own setTimeout and never returns or exposes
// the intermediate result, so there's nothing for React to hook a one-shot
// animation off without reaching back into game.js's internals. The HP bar
// and message log both update for real (state.monster.hp is mutated
// synchronously by Combat.playWord before submitWord's setTimeout even
// fires), so the fight is fully legible without the juice -- just quieter.
const BLANK_PICKER_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function CombatScreen({ state, Game, act }) {
  const Combat = window.Wordbound.Combat;
  const Intents = window.Wordbound.Intents;
  const Traits = window.Wordbound.Traits;
  const Lexicon = window.Wordbound.Lexicon;
  const Tiles = window.Wordbound.Tiles;

  const [word, setWord] = useState('');
  const inputRef = useRef(null);
  const pendingResolveRef = useRef(null);

  useEffect(() => () => clearTimeout(pendingResolveRef.current), []);

  const monster = state.monster;

  // Combat.playWord mutates state.monster.hp synchronously (confirmed by
  // reading combat.js), so `act()`'s single bump already shows the new HP.
  // But Game.submitWord resolves the monster's COUNTERATTACK (ink loss,
  // next intent, its own no-op render()) inside a setTimeout -- 220ms
  // normally, +500ms more on a killing blow (TILE_PLAY_ANIM_MS/
  // MONSTER_DEATH_BEAT_MS in game.js) -- so a second bump is scheduled here,
  // buffered past those constants, to pick up that second wave of state
  // once it actually lands. Only one pending bump is kept (cleared/replaced
  // each submit) since only the latest word's resolution matters.
  function submit(rawWord) {
    if (!state.combatActive || !monster || monster.hp <= 0) return;
    const trimmed = (rawWord || '').trim();
    if (!trimmed) return;
    act(() => Game.submitWord(trimmed));
    setWord('');
    clearTimeout(pendingResolveRef.current);
    const diedThisPlay = state.monster && state.monster.hp <= 0;
    pendingResolveRef.current = setTimeout(() => act(() => {}), diedThisPlay ? 800 : 300);
    if (!state.touchMode) inputRef.current?.focus();
  }

  function clearWord() {
    // Mirrors game.js's #btn-clear-word handler: clears the typed text AND
    // the real staged-tile selection (Game.clearStagedWord), not just this
    // component's local mirror of it.
    act(Game.clearStagedWord);
    setWord('');
    if (!state.touchMode) inputRef.current?.focus();
  }

  function stageOrUnstage(tile) {
    act(() => Game.selectTileForWord(tile.id));
    // A blank tile is a genuine no-op here on desktop (game.js's
    // selectTileForWord returns immediately without touching
    // selectedTileIds -- typing the letter is how a blank gets used) or
    // opens the blank picker in touch mode (also no selectedTileIds
    // change yet, resolved later by Game.assignBlankLetter once that
    // overlay exists) -- either way nothing staged changed, so don't
    // clobber whatever's currently typed. Every other tile really did just
    // get pushed onto state.selectedTileIds, so resync for real, matching
    // game.js's own syncWordInput() call in the same branch.
    if (tile.letter !== '?') setWord(Game.stagedWord());
  }

  function unstage(tileId) {
    act(() => Game.unstageTile(tileId));
    setWord(Game.stagedWord());
  }

  function pickBlankLetter(letter) {
    act(() => Game.assignBlankLetter(letter));
    setWord(Game.stagedWord());
  }

  function cancelBlankPicker() {
    act(() => Game.closeBlankPicker());
  }

  const preview = useMemo(() => {
    if (!state.combatActive || !monster || !word.trim()) return null;
    return Combat.previewWord(state.player, monster, word.trim(), state.comboState, {
      previousWord: state.previousWordThisFight,
      wordsPlayedThisFight: state.wordsPlayedThisFightCount,
      hexedTileId: state.hexedTileId,
      overcharge: state.overchargeArmed,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word, monster && monster.hp, state.overchargeArmed]);

  // Combo-bump (GOALS.md STRUCTURAL remaining-scope (c), "the combo chip's
  // one-shot bump-pop class"): game.js's own renderCombat() reads a shared
  // state.comboBumped flag and clears it as a side effect of rendering --
  // not portable here as-is, since React (especially StrictMode, which
  // main.jsx wraps the app in) may invoke a function component's body more
  // than once per commit, and a consumed-during-render one-shot flag would
  // get eaten by a throwaway invocation. Tracked natively instead: a ref
  // holds the combo value as of the last COMMITTED render, updated in an
  // effect (which StrictMode only double-invokes harmlessly, never mutating
  // shared engine state); comparing the current combo against it during
  // render tells us if this render is the one where the streak grew.
  const combo = (state.comboState && state.comboState.combo) || 0;
  const prevComboRef = useRef(combo);
  const comboBumped = combo > prevComboRef.current;
  useEffect(() => { prevComboRef.current = combo; }, [combo]);

  // new-tile slide-in (GOALS.md STRUCTURAL remaining-scope (c), "the rack's
  // ...new-tile...cosmetic class"): vanilla diffs the rack against
  // state.lastRackTileIds (a tile id absent from last render's rack is
  // freshly drawn). Ported the same way, natively: a ref holds the rack's
  // tile ids as of the last committed render. Note this naturally covers
  // "just entered this fight" too (the ref starts empty on mount, so every
  // starting tile reads as new) -- vanilla needs a separate rackJustRefilled
  // flag for that case only because it reuses one persistent DOM tree across
  // fights; React remounts CombatScreen per fight already. Known minor
  // divergence, harmless: opening/closing a mid-fight side panel (deck
  // viewer etc.) also remounts this component, so the untouched rack
  // briefly re-plays the slide-in too -- cosmetic only, not a functional gap.
  const prevRackIdsRef = useRef([]);
  useEffect(() => { prevRackIdsRef.current = state.player.rack.map((t) => t.id); });

  if (!monster) return null;

  const hpRatio = monster.maxHp > 0 ? monster.hp / monster.maxHp : 0;
  const activeTraitId = Traits.activeTraitForHpRatio(monster.traitPhases, hpRatio);
  const trait = Traits.TRAITS[activeTraitId];
  const tierClass = monster.isBoss ? 'boss-tier' : (monster.tier ? 'tier-' + monster.tier : '');
  const canOvercharge = state.player.ink >= Combat.OVERCHARGE_INK_COST;
  const canRewrite = state.player.ink >= Combat.REWRITE_INK_COST;
  const dead = monster.hp <= 0;

  let previewClass = 'damage-preview preview-empty';
  let previewLabel = '--';
  if (preview && preview.valid) {
    previewClass = 'damage-preview';
    if (preview.multiplier === 0) {
      previewClass += ' preview-noeffect';
      previewLabel = '0 damage -- no effect';
    } else {
      if (preview.multiplier > 1) previewClass += ' preview-weak';
      previewLabel = '⚔ ' + preview.damage + ' damage' +
        (preview.multiplier > 1 ? ' -- weak point!' : preview.isRepeat ? ' -- repeat (x0.4)' : '');
      if (preview.isRepeat) previewClass += ' preview-repeat';
    }
    if (preview.overcharged) {
      previewClass += ' preview-overcharged';
      previewLabel += ' (overcharged)';
    }
  }

  return (
    <div className={'combat-panel' + (monster.isBoss ? ' boss-combat' : '')}>
      <div className="monster-info">
        <div className={'monster-name ' + tierClass}>{tierGlyph(monster.isBoss, monster.tier)} {monster.name}</div>
        <div className="monster-hp-bar">
          <div className="monster-hp-fill" style={{ width: Math.max(0, hpRatio * 100) + '%' }} />
        </div>
        <div className="monster-hp-text">{monster.hp} / {monster.maxHp} HP</div>
        <div className="monster-weakness">Weakness: {trait.hint}</div>
        {monster.intent && (
          <div className={'monster-intent' + (Intents.isSignatureIntent(monster.intent) ? ' intent-signature' : '')}>
            {Intents.describeIntent(monster.intent)}
          </div>
        )}
        {combo > 0 && (
          <div className={'combo-chip' + (comboBumped ? ' combo-chip-bump' : '')}>
            Combo x{combo} &middot; +{Math.min(combo, 5) * 12}%
          </div>
        )}
      </div>

      <div className="rack-display">
        {state.player.rack.map((tile) => {
          const isHexed = tile.id === state.hexedTileId;
          const isStaged = state.selectedTileIds.indexOf(tile.id) !== -1;
          const isNewTile = !prevRackIdsRef.current.includes(tile.id);
          const val = Lexicon.LETTER_VALUES[tile.letter] || 0;
          const displayVal = tile.variant === Tiles.VARIANTS.VOLATILE ? val * 2 : val;
          // A staged tile "lives" in the staging area below -- the rack
          // leaves an empty, same-footprint slot behind so the rack doesn't
          // reflow, exactly like game.js's renderCombat() does.
          if (isStaged) {
            return (
              <button
                key={tile.id}
                type="button"
                className="rack-slot-empty"
                aria-label="Return staged tile to rack"
                onClick={() => unstage(tile.id)}
              />
            );
          }
          let bonusClass = '';
          if (tile.variant) bonusClass = ' has-bonus variant-' + tile.variant;
          else if (tile.bonus) {
            bonusClass = ' has-bonus';
            if (tile.bonus.type === 'flatOnPlay') bonusClass += ' bonus-flat';
            else if (tile.bonus.type === 'multOnPlay') bonusClass += ' bonus-mult-play';
            else if (tile.bonus.type === 'multOnHold') bonusClass += ' bonus-mult-hold';
          }
          const title = isHexed ? 'Hexed -- locked for this turn'
            : tile.letter === '?' ? 'Blank -- tap to stage, then type the letter you want (touch) or type it directly (desktop)'
            : tile.variant ? Tiles.describeVariant(tile.variant)
            : tile.bonus ? Tiles.describeBonus(tile.bonus)
            : undefined;
          return (
            <button
              key={tile.id}
              type="button"
              className={'letter-tile' + bonusClass + (isHexed ? ' tile-hexed' : '') + (isNewTile ? ' new-tile' : '')}
              disabled={isHexed}
              title={title}
              onClick={() => stageOrUnstage(tile)}
            >
              {tile.letter === '?' ? '★' : tile.letter}<sub>{displayVal}</sub>
            </button>
          );
        })}
      </div>

      <div className="staging-area">
        {state.selectedTileIds.map((tileId) => {
          const tile = state.player.rack.find((t) => t.id === tileId);
          if (!tile) return null;
          const val = Lexicon.LETTER_VALUES[tile.letter] || 0;
          const stagedVal = tile.variant === Tiles.VARIANTS.VOLATILE ? val * 2 : val;
          const stagedGlyph = tile.letter === '?' ? (state.blankAssignments[tileId] || '★') : tile.letter;
          let bonusClass = '';
          if (tile.variant) bonusClass = ' has-bonus variant-' + tile.variant;
          else if (tile.bonus) {
            bonusClass = ' has-bonus';
            if (tile.bonus.type === 'flatOnPlay') bonusClass += ' bonus-flat';
            else if (tile.bonus.type === 'multOnPlay') bonusClass += ' bonus-mult-play';
            else if (tile.bonus.type === 'multOnHold') bonusClass += ' bonus-mult-hold';
          }
          const variantTip = tile.variant ? Tiles.describeVariant(tile.variant)
            : (tile.bonus ? Tiles.describeBonus(tile.bonus) : '');
          return (
            <button
              key={tileId}
              type="button"
              className={'staged-tile' + bonusClass}
              title={(variantTip ? variantTip + ' -- ' : '') + 'tap to remove'}
              onClick={() => unstage(tileId)}
            >
              {stagedGlyph}<sub>{stagedVal}</sub>
            </button>
          );
        })}
      </div>

      {state.blankPickerOpen && (
        <div className="blank-picker-overlay">
          <div className="blank-picker-panel panel">
            <h2>Choose a letter</h2>
            <p className="blank-picker-hint">This ★ blank becomes the letter you pick.</p>
            <div className="blank-picker-grid">
              {BLANK_PICKER_LETTERS.map((letter) => (
                <button key={letter} type="button" className="blank-picker-letter" onClick={() => pickBlankLetter(letter)}>
                  {letter}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-secondary" style={{ marginTop: 14 }} onClick={cancelBlankPicker}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className={previewClass} aria-live="polite">{previewLabel}</div>

      <div className="word-input-row">
        <input
          ref={inputRef}
          type="text"
          maxLength={15}
          autoComplete="off"
          spellCheck="false"
          placeholder="Type or click letters..."
          value={word}
          disabled={dead}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(word); }}
        />
        <button type="button" className="btn btn-primary" disabled={dead} onClick={() => submit(word)}>Play Word</button>
        <button type="button" className="btn btn-secondary" onClick={clearWord}>Clear</button>
      </div>

      <div className="ink-spend-row">
        <button
          type="button"
          className={'btn btn-secondary btn-overcharge' + (state.overchargeArmed ? ' armed' : '')}
          disabled={dead || (!state.overchargeArmed && !canOvercharge)}
          title="Spend ink to amplify your next word's damage"
          onClick={() => act(Game.toggleOvercharge)}
        >
          {state.overchargeArmed
            ? `⚡ Overcharged! (x${Combat.OVERCHARGE_DAMAGE_MULTIPLIER})`
            : `⚡ Overcharge (-${Combat.OVERCHARGE_INK_COST} ink)`}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={dead || !canRewrite}
          title="Spend ink to discard your rack and draw a fresh one"
          onClick={() => act(Game.rewriteRack)}
        >
          {`🔄 Rewrite (-${Combat.REWRITE_INK_COST} ink)`}
        </button>
      </div>
    </div>
  );
}

// Mirrors game.js's getTierGlyph exactly -- a tiny pure lookup, not worth
// exposing through the Game namespace just for this one JSX read.
function tierGlyph(isBoss, tier) {
  if (isBoss) return '👑';
  if (tier === 'weak') return '📄';
  if (tier === 'normal') return '📖';
  if (tier === 'strong') return '📚';
  return '📖';
}
