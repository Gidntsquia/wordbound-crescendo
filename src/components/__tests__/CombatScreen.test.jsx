import { useReducer } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CombatScreen from '../CombatScreen.jsx';
import { freshRun, pickPlayableWord, findAvailableCombatNodeId } from '../../test/gameHelpers.js';

// Uses RTL's synchronous fireEvent throughout, NOT @testing-library/user-
// event, on purpose (STRUCTURAL ticket, remaining-scope-(c) step 2
// follow-up run): this file was the exact suite GOALS.md's STRUCTURAL
// 14/N and 15/N entries flagged as flaky (a real, reproducible ~1-in-3
// full-suite failure -- "the simulated type+click sequence itself didn't
// register" -- never root-caused further). It got much worse once this
// file grew past a certain size, failing on nearly every run within THIS
// ONE FILE alone. Root-caused it here: temporarily instrumented the
// component's one real timer (pendingResolveRef's setTimeout, the leading
// suspect both prior entries guessed at) with console logging -- across
// many repeated runs it never once fired late/stale, ruling that theory
// out completely. Swapping every userEvent.click()/type() call in this
// file for fireEvent.click()/change() (skips user-event's async hover/
// pointerdown/pointerup/focus choreography entirely) made the flake
// disappear -- clean full-suite runs afterward, up from failing on nearly
// every run before. Root cause: @testing-library/user-event v14's internal
// async event simulation racing against something in this Vitest/jsdom
// setup, not this component, its timer, or a cross-file leak. NOT claimed:
// that this is the only possible cause of Vitest/jsdom timing flakiness in
// this repo, or that other test files need the same treatment preemptively.
const SEED = 'vitest-fixed-seed-1';

// Small harness mirroring RunScreen.jsx's own `act`/bump pattern exactly --
// Game._state is a real mutable object the vanilla engine writes to
// in-place, so a re-render just needs to be triggered after each action,
// not fed a fresh copy of the state.
function Harness() {
  const [, bump] = useReducer((n) => n + 1, 0);
  const Game = window.Wordbound.Game;
  function act(fn) {
    fn();
    bump();
  }
  return <CombatScreen state={Game._state} Game={Game} act={act} />;
}

function startFight() {
  const state = freshRun(SEED);
  window.Wordbound.Game.enterCurrentNode(findAvailableCombatNodeId(state));
  return state;
}

describe('CombatScreen', () => {
  it('shows the real monster name/HP and one rack tile button per rack tile', () => {
    const state = startFight();
    render(<Harness />);
    expect(screen.getByText(new RegExp(state.monster.name))).toBeInTheDocument();
    expect(screen.getByText(`${state.monster.hp} / ${state.monster.maxHp} HP`)).toBeInTheDocument();
    const tileButtons = state.player.rack.map((tile) =>
      screen.getAllByRole('button').find((b) => b.textContent.startsWith(tile.letter === '?' ? '★' : tile.letter)),
    );
    tileButtons.forEach((btn) => expect(btn).toBeInTheDocument());
  });

  it('clicking rack tiles appends their letters to the word input', async () => {
    const state = startFight();
    render(<Harness />);
    const word = pickPlayableWord(state, ['RADIO', 'ROAD', 'RAID', 'READ', 'RAIN', 'AIDE', 'DINE', 'RIDE']);
    for (const letter of word) {
      const tileBtn = screen.getAllByRole('button').find((b) => b.textContent.startsWith(letter) && !b.disabled);
      fireEvent.click(tileBtn);
    }
    expect(screen.getByPlaceholderText('Type or click letters...')).toHaveValue(word);
  });

  it('clicking a blank rack tile is a no-op, matching desktop vanilla behavior', async () => {
    // Regression test: CombatScreen used to append the literal '?' letter on
    // a blank-tile click (setWord((w) => w + tile.letter) with no guard),
    // which broke word validation -- '?' is never a real letter in a played
    // word. game.js's own selectTileForWord makes a blank click a no-op on
    // desktop (typing the target letter is how a blank gets used instead).
    // The fixed seed's starting rack has no blank, so one is injected
    // directly -- same Tiles.createTile('?', null) pattern items.js itself
    // uses to add blanks to a pile.
    const state = startFight();
    const Tiles = window.Wordbound.Tiles;
    const blank = Tiles.createTile('?', null);
    state.player.rack.push(blank);
    render(<Harness />);
    const blankBtn = screen.getAllByRole('button').find((b) => b.textContent.startsWith('★'));
    expect(blankBtn).toBeInTheDocument();
    fireEvent.click(blankBtn);
    expect(screen.getByPlaceholderText('Type or click letters...')).toHaveValue('');
  });

  // STRUCTURAL ticket, remaining-scope (c) step 2: the previous three tests
  // only ever observed the word-input's TEXT, which would have kept passing
  // even under the old fake local-string model this run replaced. These
  // assert directly on the real engine state (state.selectedTileIds) and the
  // real staging-area DOM (mirrors game.js's renderStagingArea()), which is
  // the actual thing that changed.
  it('clicking a rack tile stages it for real: state.selectedTileIds updates, the rack shows an empty slot, and the tile appears in the staging area', async () => {
    const state = startFight();
    render(<Harness />);
    const tile = state.player.rack[0];
    const tileBtn = screen.getAllByRole('button').find((b) => b.textContent.startsWith(tile.letter === '?' ? '★' : tile.letter));
    fireEvent.click(tileBtn);
    expect(state.selectedTileIds).toEqual([tile.id]);
    // The clicked tile's old rack button is gone (replaced by an empty slot).
    expect(screen.queryByRole('button', { name: 'Return staged tile to rack' })).toBeInTheDocument();
    // ...and a real .staged-tile now exists in the staging area showing the same letter/value.
    const staged = document.querySelector('.staging-area .staged-tile');
    expect(staged).not.toBeNull();
    expect(staged.textContent.startsWith(tile.letter === '?' ? '★' : tile.letter)).toBe(true);
  });

  it('clicking the staged tile (or its rack slot) unstages it back to a normal rack tile', async () => {
    const state = startFight();
    render(<Harness />);
    const tile = state.player.rack[0];
    const tileBtn = screen.getAllByRole('button').find((b) => b.textContent.startsWith(tile.letter === '?' ? '★' : tile.letter));
    fireEvent.click(tileBtn); // stage
    fireEvent.click(document.querySelector('.staging-area .staged-tile')); // unstage via the staged tile itself
    expect(state.selectedTileIds).toEqual([]);
    expect(document.querySelector('.staging-area .staged-tile')).toBeNull();
    // The tile is back in the rack as a real, clickable letter-tile.
    const backInRack = screen.getAllByRole('button').find((b) => b.textContent.startsWith(tile.letter === '?' ? '★' : tile.letter));
    expect(backInRack).toBeInTheDocument();
  });

  it('Clear resets both the typed word AND the real staged-tile selection', async () => {
    const state = startFight();
    render(<Harness />);
    const tile = state.player.rack[0];
    const tileBtn = screen.getAllByRole('button').find((b) => b.textContent.startsWith(tile.letter === '?' ? '★' : tile.letter));
    fireEvent.click(tileBtn);
    expect(state.selectedTileIds).toEqual([tile.id]);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(state.selectedTileIds).toEqual([]);
    expect(screen.getByPlaceholderText('Type or click letters...')).toHaveValue('');
    expect(document.querySelector('.staging-area .staged-tile')).toBeNull();
  });

  it('shows a live damage preview for a valid typed word', async () => {
    const state = startFight();
    render(<Harness />);
    const word = pickPlayableWord(state, ['RADIO', 'ROAD', 'RAID', 'READ', 'RAIN', 'AIDE', 'DINE', 'RIDE']);
    fireEvent.change(screen.getByPlaceholderText('Type or click letters...'), { target: { value: word } });
    expect(screen.getByText(/damage/)).toBeInTheDocument();
  });

  it('Play Word calls the real Game.submitWord and drops the monster HP synchronously', async () => {
    const state = startFight();
    render(<Harness />);
    const word = pickPlayableWord(state, ['RADIO', 'ROAD', 'RAID', 'READ', 'RAIN', 'AIDE', 'DINE', 'RIDE']);
    const startingHp = state.monster.hp;
    fireEvent.change(screen.getByPlaceholderText('Type or click letters...'), { target: { value: word } });
    fireEvent.click(screen.getByRole('button', { name: 'Play Word' }));
    // Combat.playWord mutates monster.hp synchronously, before submitWord's
    // own setTimeout-deferred counterattack -- so this should already be
    // true without advancing any fake timers.
    expect(state.monster.hp).toBeLessThan(startingHp);
    expect(screen.getByText(`${state.monster.hp} / ${state.monster.maxHp} HP`)).toBeInTheDocument();
    // The word input clears after a successful play.
    expect(screen.getByPlaceholderText('Type or click letters...')).toHaveValue('');
  });

  it('Overcharge arms and shows the real multiplier from combat.js', async () => {
    const state = startFight();
    const Combat = window.Wordbound.Combat;
    render(<Harness />);
    expect(state.player.ink).toBeGreaterThanOrEqual(Combat.OVERCHARGE_INK_COST);
    fireEvent.click(screen.getByRole('button', { name: /Overcharge/ }));
    expect(state.overchargeArmed).toBe(true);
    expect(
      screen.getByRole('button', { name: `⚡ Overcharged! (x${Combat.OVERCHARGE_DAMAGE_MULTIPLIER})` }),
    ).toBeInTheDocument();
  });

  it('Rewrite spends ink and deals a fresh rack', async () => {
    const state = startFight();
    const Combat = window.Wordbound.Combat;
    render(<Harness />);
    const inkBefore = state.player.ink;
    const rackBefore = state.player.rack.map((t) => t.id);
    fireEvent.click(screen.getByRole('button', { name: /Rewrite/ }));
    expect(state.player.ink).toBe(inkBefore - Combat.REWRITE_INK_COST);
    expect(state.player.rack.map((t) => t.id)).not.toEqual(rackBefore);
  });

  // STRUCTURAL remaining-scope (c): rack tiles that weren't in the previous
  // committed render get game.js's own 'new-tile' slide-in class, ported
  // natively via a ref-tracked previous-ids diff (CombatScreen.jsx's own
  // header comment on the combo-bump hooks explains why the shared
  // state.rackJustRefilled/lastRackTileIds flags aren't reused directly).
  it('rack tiles are all "new-tile" on the fight\'s first render, and no longer once the rack is unchanged', async () => {
    const state = startFight();
    render(<Harness />);
    const rackIds = state.player.rack.map((t) => t.id);
    let buttons = screen.getAllByRole('button').filter((b) => b.className.includes('letter-tile'));
    expect(buttons.length).toBe(rackIds.length);
    buttons.forEach((btn) => expect(btn.className).toContain('new-tile'));

    // An unrelated local re-render (typing, which only touches CombatScreen's
    // own `word` state -- no rack mutation) must NOT keep replaying the
    // slide-in: this is the one-shot behavior new-tile is meant to have.
    fireEvent.change(screen.getByPlaceholderText('Type or click letters...'), { target: { value: 'A' } });
    buttons = screen.getAllByRole('button').filter((b) => b.className.includes('letter-tile'));
    expect(buttons.length).toBe(rackIds.length);
    buttons.forEach((btn) => expect(btn.className).not.toContain('new-tile'));
  });

  // STRUCTURAL remaining-scope (c): "the combo chip's one-shot bump-pop
  // class" -- ported natively (see CombatScreen.jsx's header comment on the
  // combo-bump hooks for why the shared state.comboBumped flag isn't reused
  // directly: React/StrictMode can invoke a component body more than once
  // per commit, and that flag is consumed as a render side effect in
  // vanilla, which isn't safe to replicate here).
  it('the combo chip gets combo-chip-bump the render the streak grows, and loses it on the next unrelated render', async () => {
    const state = startFight();
    render(<Harness />);
    const word = pickPlayableWord(state, ['RADIO', 'ROAD', 'RAID', 'READ', 'RAIN', 'AIDE', 'DINE', 'RIDE']);
    fireEvent.change(screen.getByPlaceholderText('Type or click letters...'), { target: { value: word } });
    fireEvent.click(screen.getByRole('button', { name: 'Play Word' }));
    expect(state.comboState.combo).toBeGreaterThan(0);
    const chip = screen.getByText(/Combo x/);
    expect(chip.className).toContain('combo-chip-bump');

    // An unrelated local re-render (typing) must clear the one-shot bump
    // class without the combo streak itself changing.
    fireEvent.change(screen.getByPlaceholderText('Type or click letters...'), { target: { value: 'Z' } });
    const chipAfter = screen.getByText(/Combo x/);
    expect(chipAfter.className).not.toContain('combo-chip-bump');
    expect(state.comboState.combo).toBeGreaterThan(0);
  });

  // STRUCTURAL remaining-scope (c) step 1 (GOALS.md): now that
  // main.jsx/src/test/setup.js actually call Game.applyTouchModeFromMedia()
  // (previously nothing did, so state.touchMode was always false in the
  // React app regardless of device), CombatScreen's pre-existing
  // `if (!state.touchMode) inputRef.current?.focus()` guards are reachable
  // for real. jsdom has no window.matchMedia (dom-check.js's own comment on
  // the same gap), so the detection call itself can't run here -- this
  // drives the state.touchMode branch directly, the same way a real coarse-
  // pointer device would leave it after setup.js's call actually fired.
  it('does not steal focus back to the word input after a play or clear in touch mode', async () => {
    const state = startFight();
    state.touchMode = true;
    render(<Harness />);
    const input = screen.getByPlaceholderText('Type or click letters...');
    const word = pickPlayableWord(state, ['RADIO', 'ROAD', 'RAID', 'READ', 'RAIN', 'AIDE', 'DINE', 'RIDE']);
    fireEvent.change(input, { target: { value: word } });
    input.blur();
    fireEvent.click(screen.getByRole('button', { name: 'Play Word' }));
    expect(document.activeElement).not.toBe(input);
  });

  // STRUCTURAL ticket, remaining-scope (c) step 2 follow-up: the touch-mode
  // blank-letter picker overlay. Tapping a blank tile in touch mode already
  // called the real Game.selectTileForWord -> game.js's private
  // selectTileForWord -> opened state.blankPickerOpen (landed in this
  // ticket's prior commit), but nothing rendered it -- a touch player got no
  // feedback at all, and a blank tile was effectively unplayable on touch.
  // These tests are the first to assert the real overlay renders and drives
  // Game.assignBlankLetter/closeBlankPicker.
  it('touch mode: tapping a blank tile opens the real blank-picker overlay; picking a letter stages the blank with it', async () => {
    const state = startFight();
    state.touchMode = true;
    const Tiles = window.Wordbound.Tiles;
    const blank = Tiles.createTile('?', null);
    state.player.rack.push(blank);
    render(<Harness />);

    const blankBtn = screen.getAllByRole('button').find((b) => b.textContent.startsWith('★'));
    fireEvent.click(blankBtn);
    expect(state.blankPickerOpen).toBe(true);
    expect(state.blankPickerTileId).toBe(blank.id);
    expect(screen.getByText('Choose a letter')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'E' }));
    expect(state.blankPickerOpen).toBe(false);
    expect(state.blankAssignments[blank.id]).toBe('E');
    expect(state.selectedTileIds).toContain(blank.id);
    expect(window.Wordbound.Game.stagedWord()).toBe('E');
    expect(screen.queryByText('Choose a letter')).not.toBeInTheDocument();
    // The staged tile shows the chosen letter, not the bare ★ glyph.
    const staged = document.querySelector('.staging-area .staged-tile');
    expect(staged.textContent).toContain('E');
  });

  // STRUCTURAL ticket, remaining scope (c): desktop mouse-drag rack
  // reordering. Fires the real HTML5 drag event sequence (dragStart -> drop
  // -> dragEnd) on the actual rendered rack buttons -- jsdom has no native
  // DragEvent constructor, but RTL's fireEvent falls back to a generic Event
  // it can still attach a fake `dataTransfer` to, which is all
  // CombatScreen.jsx's handlers read.
  it('dragging a rack tile onto another tile\'s slot reorders the real rack for real (Game.reorderRackOnDrop)', async () => {
    const state = startFight();
    render(<Harness />);
    const rackIds = state.player.rack.map((t) => t.id);
    // Drag the tile at index 0 onto the slot at the LAST index.
    const buttons = screen.getAllByRole('button').filter((b) => b.className.includes('letter-tile'));
    expect(buttons.length).toBe(rackIds.length);
    const dragged = buttons[0];
    const target = buttons[buttons.length - 1];
    const dataTransfer = {};
    fireEvent.dragStart(dragged, { dataTransfer });
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });
    fireEvent.dragEnd(dragged, { dataTransfer });

    // game.js's reorderRackOnDrop inserts the dragged tile BEFORE whatever
    // tile originally sat at dropIndex (here, the last tile) -- so it lands
    // second-to-last, not appended at the very end. See the function's own
    // insertIndex comment in js/wordbound/game.js.
    const expected = rackIds.slice(1, -1).concat([rackIds[0], rackIds[rackIds.length - 1]]);
    expect(state.player.rack.map((t) => t.id)).toEqual(expected);
    // The drag state the engine tracked mid-gesture is cleared afterward.
    expect(state.draggedTileId).toBeNull();
  });

  it('dropping a dragged tile back on its own slot is a no-op', async () => {
    const state = startFight();
    render(<Harness />);
    const rackIds = state.player.rack.map((t) => t.id);
    const buttons = screen.getAllByRole('button').filter((b) => b.className.includes('letter-tile'));
    const dataTransfer = {};
    fireEvent.dragStart(buttons[0], { dataTransfer });
    fireEvent.dragOver(buttons[0], { dataTransfer });
    fireEvent.drop(buttons[0], { dataTransfer });
    fireEvent.dragEnd(buttons[0], { dataTransfer });
    expect(state.player.rack.map((t) => t.id)).toEqual(rackIds);
  });

  it('touch mode: Cancel closes the blank picker without staging anything', async () => {
    const state = startFight();
    state.touchMode = true;
    const Tiles = window.Wordbound.Tiles;
    const blank = Tiles.createTile('?', null);
    state.player.rack.push(blank);
    render(<Harness />);

    const blankBtn = screen.getAllByRole('button').find((b) => b.textContent.startsWith('★'));
    fireEvent.click(blankBtn);
    expect(screen.getByText('Choose a letter')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(state.blankPickerOpen).toBe(false);
    expect(state.selectedTileIds).not.toContain(blank.id);
    expect(screen.queryByText('Choose a letter')).not.toBeInTheDocument();
    expect(document.querySelector('.staging-area .staged-tile')).toBeNull();
  });

  // touch-reorder tests: jsdom's getBoundingClientRect always returns a
  // zero-sized rect, so game.js's getTileAtPosition (which picks the
  // closest button by measured center) always resolves to the first
  // .letter-tile in DOM order regardless of the touchX passed in -- a real
  // browser is what actually proves POSITIONAL accuracy (see
  // test/verify-react-build.js's real Playwright touch checks). What these
  // tests verify instead is the real state-machine wiring end to end
  // (touchstart -> touchmove crossing the threshold -> touchend resolving
  // either a tap or a reorder), the same real Game.* functions
  // wordbound.html's own touch listeners call, not a reimplementation.
  it('touch mode: a plain tap (no movement past the threshold) on a rack tile stages it, same as a click', () => {
    const state = startFight();
    render(<Harness />);
    const buttons = screen.getAllByRole('button').filter((b) => b.className.includes('letter-tile'));
    const tileId = state.player.rack[0].id;
    fireEvent.touchStart(buttons[0], { touches: [{ clientX: 5, identifier: 1 }] });
    expect(state.draggedTileId).toBe(tileId);
    fireEvent.touchEnd(buttons[0], { changedTouches: [{ clientX: 5, identifier: 1 }] });
    expect(state.draggedTileId).toBeNull(); // cleared by cancelTouchReorder at the end of endTouchReorder
    expect(state.touchDragThresholdCrossed).toBe(false); // never crossed -> resolved as a tap
    expect(state.selectedTileIds).toContain(tileId); // the tap fallback staged it, like a click would
  });

  it('touch mode: a touchmove past the 10px threshold crosses it, and touchend reorders the rack for real', () => {
    const state = startFight();
    render(<Harness />);
    expect(state.player.rack.length).toBeGreaterThanOrEqual(3);
    const before = state.player.rack.map((t) => t.id);
    const buttons = screen.getAllByRole('button').filter((b) => b.className.includes('letter-tile'));
    // Start the drag on index 2, not 0 -- jsdom's zero-rect quirk always
    // resolves touchmove's position to index 0, so starting elsewhere
    // guarantees touchCurrentIndex genuinely differs from touchStartIndex,
    // exercising the real reorder branch of endTouchReorder rather than its
    // "no movement" no-op.
    fireEvent.touchStart(buttons[2], { touches: [{ clientX: 5, identifier: 7 }] });
    expect(state.touchStartIndex).toBe(2);
    fireEvent.touchMove(buttons[2], { touches: [{ clientX: 500, identifier: 7 }] });
    expect(state.touchDragThresholdCrossed).toBe(true);
    fireEvent.touchEnd(buttons[2], { changedTouches: [{ clientX: 500, identifier: 7 }] });
    expect(state.draggedTileId).toBeNull();
    const after = state.player.rack.map((t) => t.id);
    expect(after).not.toEqual(before); // a real reorder happened, through the real engine splice
    expect(after.includes(before[2])).toBe(true); // no tile lost
    expect(after.length).toBe(before.length);
  });

  it('touch mode: touchcancel aborts the drag without touching the rack', () => {
    const state = startFight();
    render(<Harness />);
    const before = state.player.rack.map((t) => t.id);
    const buttons = screen.getAllByRole('button').filter((b) => b.className.includes('letter-tile'));
    fireEvent.touchStart(buttons[0], { touches: [{ clientX: 5, identifier: 3 }] });
    fireEvent.touchMove(buttons[0], { touches: [{ clientX: 500, identifier: 3 }] });
    expect(state.draggedTileId).not.toBeNull();
    fireEvent.touchCancel(buttons[0]);
    expect(state.draggedTileId).toBeNull();
    expect(state.touchDragThresholdCrossed).toBe(false);
    expect(state.player.rack.map((t) => t.id)).toEqual(before); // untouched -- cancel never reorders
  });
});
