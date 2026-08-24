import { useEffect, useState } from 'react';

// React port of the run-header's always-available side surfaces (STRUCTURAL
// ticket, parity gap found 2026-08-21: wordbound.html's #items-owned strip
// and #item-inspector-panel had NO React equivalent at all -- a player who
// picked up an item in the React app had no way to ever see what they
// owned. Direct ports of game.js's renderItemsOwned()/renderItemInspector(),
// reusing the same `.treasure-panel`/`.treasure-choices` shape
// RewardScreens.jsx's screens already use (game.js's own
// #item-inspector-panel markup reuses that exact class too). Two siblings
// used to live in this family and are both gone: a #consumables-panel/
// ConsumablesPanel (removed with the consumable mechanic, PLAYTEST FINDINGS
// 3 item 1) and a #deck-viewer-panel/DeckViewerPanel (removed with the whole
// deck-building loop, PLAYTEST FINDINGS 3 item 2), both 2026-08-22.
//
// Game.openItemInspector is a synchronous state mutator (same shape as
// Game.toggleOvercharge), so no setTimeout bridging is needed here -- same
// pattern as RewardScreens.jsx.

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

// wordbound.html's `.run-header-actions` slot. PLAYTEST FINDINGS 3 emptied
// it out entirely over three runs: the music mute/volume + Largo assist moved
// into SettingsCorner below (items 3/4), the Consumables button went with the
// consumable mechanic (item 1), and the Deck button went with the deck view
// (item 2). Kept as an empty, still-mounted slot rather than deleted so the
// header's flex layout and every caller stay unchanged -- the next control
// that belongs in the header goes here.
export function RunHeaderActions() {
  return <div className="run-header-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }} />;
}

// PLAYTEST FINDINGS 3 (GOALS.md), items 3 + 4: Jaxon didn't know what "Largo"
// meant (the label failed as UI copy) and wanted mute/volume tucked away
// instead of sitting in the main run header. Both controls -- plus the
// renamed Largo assist -- now live behind a single gear button fixed in a
// bottom screen corner, out of the main combat-loop sightline (the duel-loop
// chrome itself -- Volume gauge, enemy segments, Verses pips, rack -- is
// untouched by this).
// Reads Game.getAudioSettings()/Game.getLargoEnabled() fresh every render for
// the same reason RunHeaderActions used to: both live in game.js's own
// closure, not `state`, so every control here routes through `act()` to bump
// after calling the real Game.* mutator.
export function SettingsCorner({ state, Game, act }) {
  const [open, setOpen] = useState(false);
  const audio = Game.getAudioSettings();
  const largoEnabled = Game.getLargoEnabled();
  return (
    <div className="settings-corner">
      {open && (
        <div className="settings-panel">
          <div className="settings-panel-row">
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
          <button
            className={'btn btn-secondary settings-panel-row largo-toggle-btn' + (largoEnabled ? ' largo-toggle-btn-on' : '')}
            title="Slows a duel's music for an easier pace. An accessibility assist -- no shame in using it."
            onClick={() => act(() => Game.setLargoEnabled(!largoEnabled))}
          >
            🐢 Slower music (easier){largoEnabled ? ': On' : ''}
          </button>
        </div>
      )}
      <button
        className="settings-corner-btn"
        title="Settings"
        aria-label="Settings"
        onClick={() => setOpen((o) => !o)}
      >
        ⚙️
      </button>
    </div>
  );
}
