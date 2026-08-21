import { useEffect } from 'react';

// React port of the run-header's always-available side surfaces (STRUCTURAL
// ticket, parity gap found 2026-08-21: wordbound.html's #items-owned strip,
// #deck-viewer-panel, #item-inspector-panel and #consumables-panel had NO
// React equivalent at all -- a player who picked up an item in the React
// app had no way to ever see what they owned, view their deck, or spend a
// consumable. Direct ports of game.js's renderItemsOwned()/renderDeckViewer()/
// renderItemInspector()/renderConsumablesPanel(), reusing the same
// `.treasure-panel`/`.treasure-choices` shape RewardScreens.jsx's screens
// already use (game.js's own #deck-viewer-panel/#item-inspector-panel/
// #consumables-panel markup reuses that exact class too).
//
// Game.openDeckViewer/openItemInspector/openConsumablesPanel are synchronous
// state mutators (same shape as Game.toggleOvercharge), so no setTimeout
// bridging is needed here -- same pattern as RewardScreens.jsx.

// Direct port of renderItemsOwned(): a chip per owned item, clickable to open
// the inspector. `state.proccedItemIds` flashes a chip once (FUN OVERHAUL
// 8/8's onWordPlayed hook feedback) then must be consumed so it doesn't
// re-flash on the next render -- vanilla does this by mutating it to []
// inside the very same render() pass; React can't mutate state during
// render, so the read happens during render (safe, no mutation) and the
// clear happens in a post-commit effect instead, achieving the same
// "flashes for exactly one render" result without violating render purity.
export function ItemsOwnedStrip({ state, Game, act }) {
  const Items = window.Wordbound.Items;
  const procced = state.proccedItemIds || [];

  useEffect(() => {
    if (procced.length) state.proccedItemIds = [];
  });

  return (
    <div className="items-owned">
      {state.player.items.map((itemId) => {
        const def = Items.ITEM_DEFS[itemId];
        return (
          <span
            key={itemId}
            className={'item-chip' + (procced.indexOf(itemId) !== -1 ? ' item-chip-proc' : '')}
            title={def.hint}
            style={{ cursor: 'pointer' }}
            onClick={() => act(() => Game.openItemInspector(itemId))}
          >
            {def.name}
          </span>
        );
      })}
    </div>
  );
}

// Direct port of renderDeckViewer(): every tile in the deck (not just the
// current rack), sorted alphabetically, read-only (no click handler --
// matches vanilla's `div.style.cursor = 'default'`, these aren't buttons).
export function DeckViewerPanel({ state, Game, act }) {
  const Tiles = window.Wordbound.Tiles;
  const sorted = (state.deck || []).slice().sort((a, b) => a.letter.localeCompare(b.letter));
  return (
    <div className="treasure-panel">
      <h2>Your Deck</h2>
      <div className="treasure-choices">
        {sorted.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#b8ac8a' }}>Deck is empty</p>
        ) : (
          sorted.map((tile) => {
            const variantClass = tile.variant ? ' variant-' + tile.variant : '';
            const bonusDesc = Tiles.describeVariant(tile.variant) || Tiles.describeBonus(tile.bonus);
            return (
              <div key={tile.id} className={'treasure-choice' + variantClass} style={{ cursor: 'default' }}>
                <strong>{tile.letter === '?' ? '★' : tile.letter}</strong>
                {bonusDesc && (<><br />{bonusDesc}</>)}
              </div>
            );
          })
        )}
      </div>
      <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => act(Game.closeDeckViewer)}>
        Close
      </button>
    </div>
  );
}

// Direct port of renderItemInspector(): the clicked chip's name + hint,
// opened by ItemsOwnedStrip above via Game.openItemInspector.
export function ItemInspectorPanel({ state, Game, act }) {
  const Items = window.Wordbound.Items;
  const def = Items.ITEM_DEFS[state.itemInspectorId];
  if (!def) return null;
  return (
    <div className="treasure-panel">
      <h2>{def.name}</h2>
      <p style={{ textAlign: 'left', color: '#b8ac8a' }}>{def.hint}</p>
      <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => act(Game.closeItemInspector)}>
        Close
      </button>
    </div>
  );
}

// Direct port of renderConsumablesPanel(): each owned consumable is a real
// button, usable (Game.useConsumable) only mid-combat -- matches vanilla's
// own combatActive guard exactly (Game.useConsumable itself also rejects
// outside combat, so this is belt-and-suspenders same as the vanilla UI).
// Keyed on id+index since a player can hold duplicate consumables of the
// same type (DOM has no such uniqueness requirement; React does).
export function ConsumablesPanel({ state, Game, act }) {
  const Consumables = window.Wordbound.Consumables;
  const owned = state.player.consumables || [];
  return (
    <div className="treasure-panel">
      <h2>Consumables</h2>
      <div className="treasure-choices">
        {owned.length === 0 ? (
          <p style={{ textAlign: 'center' }}>You have no consumables</p>
        ) : (
          owned.map((consumableId, index) => {
            const def = Consumables.CONSUMABLE_DEFS[consumableId];
            if (!def) return null;
            const disabled = !state.combatActive;
            return (
              <button
                key={consumableId + '-' + index}
                className="treasure-choice"
                disabled={disabled}
                style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                onClick={disabled ? undefined : () => act(() => Game.useConsumable(consumableId))}
              >
                <strong>{def.name}</strong><br />{def.hint}
              </button>
            );
          })
        )}
      </div>
      <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => act(Game.closeConsumablesPanel)}>
        Close
      </button>
    </div>
  );
}

// Direct port of the run-header's Deck/Consumables buttons + music
// toggle/volume slider (wordbound.html's `.run-header-actions`). Reads
// Game.getAudioSettings() fresh every render -- audioSettings lives in
// game.js's own closure, not `state`, so it isn't part of the object
// RunScreen's `bump` re-reads automatically, but every control here routes
// through `act()`, which bumps after calling the real Game.* mutator, same
// as everywhere else in this run's action-then-bump pattern.
export function RunHeaderActions({ state, Game, act }) {
  const audio = Game.getAudioSettings();
  return (
    <div className="run-header-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button className="btn btn-secondary run-header-btn" onClick={() => act(Game.openDeckViewer)}>
        Deck
      </button>
      <button
        className="btn btn-secondary run-header-btn"
        title="View consumable items"
        onClick={() => act(Game.openConsumablesPanel)}
      >
        Consumables
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          className="btn btn-secondary music-toggle-btn"
          onClick={() => act(Game.toggleMusicMute)}
        >
          {audio.muted ? '🔇' : '🔊'}
        </button>
        <input
          id="music-volume"
          type="range"
          min="0"
          max="100"
          value={Math.round(audio.volume * 100)}
          style={{ width: 80, cursor: 'pointer' }}
          onChange={(e) => act(() => Game.setMusicVolume(Number(e.target.value) / 100))}
        />
      </div>
    </div>
  );
}
