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
});
