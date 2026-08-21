import { useReducer } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import CombatScreen from '../CombatScreen.jsx';
import { freshRun, pickPlayableWord, findAvailableCombatNodeId } from '../../test/gameHelpers.js';

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
    const user = userEvent.setup();
    render(<Harness />);
    const word = pickPlayableWord(state, ['RADIO', 'ROAD', 'RAID', 'READ', 'RAIN', 'AIDE', 'DINE', 'RIDE']);
    for (const letter of word) {
      const tileBtn = screen.getAllByRole('button').find((b) => b.textContent.startsWith(letter) && !b.disabled);
      await user.click(tileBtn);
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
    const user = userEvent.setup();
    render(<Harness />);
    const blankBtn = screen.getAllByRole('button').find((b) => b.textContent.startsWith('★'));
    expect(blankBtn).toBeInTheDocument();
    await user.click(blankBtn);
    expect(screen.getByPlaceholderText('Type or click letters...')).toHaveValue('');
  });

  it('shows a live damage preview for a valid typed word', async () => {
    const state = startFight();
    const user = userEvent.setup();
    render(<Harness />);
    const word = pickPlayableWord(state, ['RADIO', 'ROAD', 'RAID', 'READ', 'RAIN', 'AIDE', 'DINE', 'RIDE']);
    await user.type(screen.getByPlaceholderText('Type or click letters...'), word);
    expect(screen.getByText(/damage/)).toBeInTheDocument();
  });

  it('Play Word calls the real Game.submitWord and drops the monster HP synchronously', async () => {
    const state = startFight();
    const user = userEvent.setup();
    render(<Harness />);
    const word = pickPlayableWord(state, ['RADIO', 'ROAD', 'RAID', 'READ', 'RAIN', 'AIDE', 'DINE', 'RIDE']);
    const startingHp = state.monster.hp;
    await user.type(screen.getByPlaceholderText('Type or click letters...'), word);
    await user.click(screen.getByRole('button', { name: 'Play Word' }));
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
    const user = userEvent.setup();
    render(<Harness />);
    expect(state.player.ink).toBeGreaterThanOrEqual(Combat.OVERCHARGE_INK_COST);
    await user.click(screen.getByRole('button', { name: /Overcharge/ }));
    expect(state.overchargeArmed).toBe(true);
    expect(
      screen.getByRole('button', { name: `⚡ Overcharged! (x${Combat.OVERCHARGE_DAMAGE_MULTIPLIER})` }),
    ).toBeInTheDocument();
  });

  it('Rewrite spends ink and deals a fresh rack', async () => {
    const state = startFight();
    const Combat = window.Wordbound.Combat;
    const user = userEvent.setup();
    render(<Harness />);
    const inkBefore = state.player.ink;
    const rackBefore = state.player.rack.map((t) => t.id);
    await user.click(screen.getByRole('button', { name: /Rewrite/ }));
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
    const user = userEvent.setup();
    render(<Harness />);
    const rackIds = state.player.rack.map((t) => t.id);
    let buttons = screen.getAllByRole('button').filter((b) => b.className.includes('letter-tile'));
    expect(buttons.length).toBe(rackIds.length);
    buttons.forEach((btn) => expect(btn.className).toContain('new-tile'));

    // An unrelated local re-render (typing, which only touches CombatScreen's
    // own `word` state -- no rack mutation) must NOT keep replaying the
    // slide-in: this is the one-shot behavior new-tile is meant to have.
    await user.type(screen.getByPlaceholderText('Type or click letters...'), 'A');
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
    const user = userEvent.setup();
    render(<Harness />);
    const word = pickPlayableWord(state, ['RADIO', 'ROAD', 'RAID', 'READ', 'RAIN', 'AIDE', 'DINE', 'RIDE']);
    await user.type(screen.getByPlaceholderText('Type or click letters...'), word);
    await user.click(screen.getByRole('button', { name: 'Play Word' }));
    expect(state.comboState.combo).toBeGreaterThan(0);
    const chip = screen.getByText(/Combo x/);
    expect(chip.className).toContain('combo-chip-bump');

    // An unrelated local re-render (typing) must clear the one-shot bump
    // class without the combo streak itself changing.
    await user.type(screen.getByPlaceholderText('Type or click letters...'), 'Z');
    const chipAfter = screen.getByText(/Combo x/);
    expect(chipAfter.className).not.toContain('combo-chip-bump');
    expect(state.comboState.combo).toBeGreaterThan(0);
  });
});
