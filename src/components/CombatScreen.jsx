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
// Word input: uses the desktop "type or click a letter" path (Combat.playWord
// matches a submitted word against the rack by LETTER, not by pre-selected
// tile id -- confirmed by reading combat.js/lexicon.js -- so a plain text
// value is sufficient and needs no tile-staging state machine). The
// touch-mode drag/tap-to-play staging system (game.js's selectTileForWord/
// startTouchReorder/staging-area drag handlers) is NOT ported this run --
// real drag-and-drop reordering is a whole feature in its own right (pointer
// capture, ghost tiles, insertion-index math) and out of this run's bounded
// scope; typing/clicking to append letters is fully functional today and
// this is flagged as a known gap for a later pass, not silently dropped.
//
// Damage/hit animations (floating numbers, hp-flash, screen-shake,
// CRUSHING!/MAGNIFICENT! banners): also not ported. Game.submitWord resolves
// the counterattack inside its own setTimeout and never returns or exposes
// the intermediate result, so there's nothing for React to hook a one-shot
// animation off without reaching back into game.js's internals. The HP bar
// and message log both update for real (state.monster.hp is mutated
// synchronously by Combat.playWord before submitWord's setTimeout even
// fires), so the fight is fully legible without the juice -- just quieter.
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
    setWord('');
    if (!state.touchMode) inputRef.current?.focus();
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

  if (!monster) return null;

  const hpRatio = monster.maxHp > 0 ? monster.hp / monster.maxHp : 0;
  const activeTraitId = Traits.activeTraitForHpRatio(monster.traitPhases, hpRatio);
  const trait = Traits.TRAITS[activeTraitId];
  const tierClass = monster.isBoss ? 'boss-tier' : (monster.tier ? 'tier-' + monster.tier : '');
  const combo = (state.comboState && state.comboState.combo) || 0;
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
        {combo > 0 && <div className="combo-chip">Combo x{combo} &middot; +{Math.min(combo, 5) * 12}%</div>}
      </div>

      <div className="rack-display">
        {state.player.rack.map((tile) => {
          const isHexed = tile.id === state.hexedTileId;
          const val = Lexicon.LETTER_VALUES[tile.letter] || 0;
          const displayVal = tile.variant === Tiles.VARIANTS.VOLATILE ? val * 2 : val;
          let bonusClass = '';
          if (tile.variant) bonusClass = ' has-bonus variant-' + tile.variant;
          else if (tile.bonus) {
            bonusClass = ' has-bonus';
            if (tile.bonus.type === 'flatOnPlay') bonusClass += ' bonus-flat';
            else if (tile.bonus.type === 'multOnPlay') bonusClass += ' bonus-mult-play';
            else if (tile.bonus.type === 'multOnHold') bonusClass += ' bonus-mult-hold';
          }
          const title = isHexed ? 'Hexed -- locked for this turn'
            : tile.letter === '?' ? 'Blank -- type the letter you want, it fills in automatically'
            : tile.variant ? Tiles.describeVariant(tile.variant)
            : tile.bonus ? Tiles.describeBonus(tile.bonus)
            : undefined;
          return (
            <button
              key={tile.id}
              type="button"
              className={'letter-tile' + bonusClass + (isHexed ? ' tile-hexed' : '')}
              disabled={isHexed}
              title={title}
              onClick={() => {
                // Desktop word-entry path (game.js's selectTileForWord, same
                // rule): a blank tile has no letter to append, so a click is
                // a no-op here too -- typing the target letter is how a blank
                // gets used; Lexicon.canFormFromRack fills it in from the
                // typed string. Appending the literal '?' character (as this
                // used to) breaks word validation, since '?' is never a real
                // letter in a played word.
                if (!isHexed && tile.letter !== '?') setWord((w) => w + tile.letter);
              }}
            >
              {tile.letter === '?' ? '★' : tile.letter}<sub>{displayVal}</sub>
            </button>
          );
        })}
      </div>

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
