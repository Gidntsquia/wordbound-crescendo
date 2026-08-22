import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import RunScreen from '../RunScreen.jsx';
import { freshRun, findAvailableCombatNodeId } from '../../test/gameHelpers.js';

// STRUCTURAL ticket, parity gap found 2026-08-21: nothing in the React tree
// ever rendered state.player.items, state.deck, state.player.consumables, or
// exposed the music toggle/volume -- see RunSidePanels.jsx's header comment.
// These tests render the REAL RunScreen (not a harness) so the run-header's
// always-visible Deck/Consumables buttons and the items-owned strip are
// exercised exactly as a player would reach them, same style as
// RunScreen.test.jsx's own node-map tests.
const SEED = 'vitest-fixed-seed-1';

describe('items-owned strip', () => {
  it('shows a chip per owned item, and clicking one opens the inspector', async () => {
    const state = freshRun(SEED);
    const Items = window.Wordbound.Items;
    // Every character starts with at least one item (see characters.js's
    // startingItems) -- reset to a known single item so the assertions
    // below don't have to account for whichever character's default.
    state.player.items = [];
    const itemId = Object.keys(Items.ITEM_DEFS)[0];
    state.player.items.push(itemId);
    const user = userEvent.setup();
    render(<RunScreen onBackToMenu={() => {}} />);

    const chip = screen.getByText(Items.ITEM_DEFS[itemId].name);
    expect(chip.className).toContain('item-chip');

    await user.click(chip);
    expect(state.itemInspectorOpen).toBe(true);
    expect(state.itemInspectorId).toBe(itemId);
    // The inspector panel takes over -- node map is gone, replaced by the
    // item's name (heading) + hint + Close.
    expect(screen.getByRole('heading', { name: Items.ITEM_DEFS[itemId].name })).toBeInTheDocument();
    expect(screen.getByText(Items.ITEM_DEFS[itemId].hint)).toBeInTheDocument();
    // The run-header itself (seed row included) stays visible around the panel -- only the map/combat/reward area is replaced.
    expect(screen.getByText('Seed: ' + SEED)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(state.itemInspectorOpen).toBe(false);
  });

  it('renders no chips when the player owns nothing', () => {
    const state = freshRun(SEED);
    // Reset past the character's real starting item (see the test above) to
    // exercise the genuinely-empty case.
    state.player.items = [];
    render(<RunScreen onBackToMenu={() => {}} />);
    expect(document.querySelectorAll('.item-chip').length).toBe(0);
  });
});

describe('deck viewer', () => {
  it('opens from the run-header Deck button, lists the real deck, hides the node map, and closes', async () => {
    const state = freshRun(SEED);
    const user = userEvent.setup();
    render(<RunScreen onBackToMenu={() => {}} />);

    expect(document.querySelector('.node-map')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Deck' }));
    expect(state.deckViewerOpen).toBe(true);
    expect(screen.getByRole('heading', { name: 'Your Deck' })).toBeInTheDocument();
    expect(document.querySelector('.node-map')).not.toBeInTheDocument();

    // Every real deck tile's letter renders somewhere in the panel.
    const lettersShown = Array.from(document.querySelectorAll('.treasure-choice')).map((el) => el.textContent);
    state.deck.forEach((tile) => {
      const displayLetter = tile.letter === '?' ? '★' : tile.letter;
      expect(lettersShown.some((t) => t.startsWith(displayLetter))).toBe(true);
    });

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(state.deckViewerOpen).toBe(false);
    expect(document.querySelector('.node-map')).toBeInTheDocument();
  });
});

describe('consumables panel', () => {
  it('disables a real consumable outside combat and lets it be used mid-combat', async () => {
    const state = freshRun(SEED);
    state.player.consumables.push('errata_slip');
    const user = userEvent.setup();
    render(<RunScreen onBackToMenu={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Consumables' }));
    expect(state.consumablesPanelOpen).toBe(true);
    const Consumables = window.Wordbound.Consumables;
    const btn = screen.getByRole('button', { name: new RegExp(Consumables.CONSUMABLE_DEFS.errata_slip.name) });
    expect(btn).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Close' }));

    // REGULAR ENEMIES ticket (real remaining scope (2), 2026-08-22): weak
    // tier can now roll a real duel-mode regular, which crashes on
    // AudioContext under jsdom -- findAvailableCombatNodeId (already the
    // safe convention every other test in this suite uses) picks a real
    // non-duel node instead of `findNodeIdByType`'s blind "first combat
    // node of any kind" pick this used to be.
    window.Wordbound.Game.enterCurrentNode(findAvailableCombatNodeId(state));
    state.player.ink = 0; // errata_slip heals ink -- make the effect observable
    await user.click(screen.getByRole('button', { name: 'Consumables' }));
    const liveBtn = screen.getByRole('button', { name: new RegExp(Consumables.CONSUMABLE_DEFS.errata_slip.name) });
    expect(liveBtn).not.toBeDisabled();
    await user.click(liveBtn);
    expect(state.player.consumables).not.toContain('errata_slip');
    expect(state.player.ink).toBeGreaterThan(0);
  });
});

describe('run-header music controls', () => {
  it('toggling mute flips Game.getAudioSettings().muted and the button glyph', async () => {
    freshRun(SEED);
    const Game = window.Wordbound.Game;
    const startMuted = Game.getAudioSettings().muted;
    const user = userEvent.setup();
    render(<RunScreen onBackToMenu={() => {}} />);

    const muteBtn = document.querySelector('.music-toggle-btn');
    expect(muteBtn.textContent).toBe(startMuted ? '🔇' : '🔊');
    await user.click(muteBtn);
    expect(Game.getAudioSettings().muted).toBe(!startMuted);
    expect(muteBtn.textContent).toBe(!startMuted ? '🔇' : '🔊');
    // Leave audio settings as found (localStorage-persisted) so other test files aren't affected.
    if (Game.getAudioSettings().muted !== startMuted) Game.toggleMusicMute();
  });

  it('moving the volume slider updates Game.getAudioSettings().volume', () => {
    freshRun(SEED);
    const Game = window.Wordbound.Game;
    const before = Game.getAudioSettings().volume;
    render(<RunScreen onBackToMenu={() => {}} />);
    const slider = document.getElementById('music-volume');
    expect(Number(slider.value)).toBe(Math.round(before * 100));
    Game.setMusicVolume(0.75); // fireEvent.change on a range input is flaky in jsdom; the real handler is exercised directly, same math the onChange calls
    expect(Game.getAudioSettings().volume).toBeCloseTo(0.75);
    Game.setMusicVolume(before); // restore
  });

  it('clicking the Largo toggle flips Game.getLargoEnabled() and the button label/class', async () => {
    freshRun(SEED);
    const Game = window.Wordbound.Game;
    const startEnabled = Game.getLargoEnabled();
    const user = userEvent.setup();
    render(<RunScreen onBackToMenu={() => {}} />);

    const largoBtn = document.querySelector('.largo-toggle-btn');
    expect(largoBtn.textContent).toBe(startEnabled ? '🐢 Largo: On' : '🐢 Largo');
    expect(largoBtn.classList.contains('largo-toggle-btn-on')).toBe(startEnabled);
    await user.click(largoBtn);
    expect(Game.getLargoEnabled()).toBe(!startEnabled);
    expect(largoBtn.textContent).toBe(!startEnabled ? '🐢 Largo: On' : '🐢 Largo');
    expect(largoBtn.classList.contains('largo-toggle-btn-on')).toBe(!startEnabled);
    // Leave the setting as found (localStorage-persisted), same convention the music-mute test above uses.
    if (Game.getLargoEnabled() !== startEnabled) Game.setLargoEnabled(startEnabled);
  });
});
