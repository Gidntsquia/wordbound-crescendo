import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RunScreen from '../RunScreen.jsx';
import { freshRun, findNodeIdByType, findAvailableCombatNodeId } from '../../test/gameHelpers.js';

// A fixed seed makes the floor's LAYOUT (node types, lanes, edges) fully
// deterministic, but NOT the literal node ids -- floor.js's node id counter
// is a module-level counter that keeps incrementing across every floor any
// test in this run has generated (see gameHelpers.js's findNodeIdByType for
// why). So every test below looks a node up by TYPE, never by a literal id.
const SEED = 'vitest-fixed-seed-1';

describe('RunScreen -- node map', () => {
  it('renders the run header and a real generated map for a fresh run', () => {
    const state = freshRun(SEED);
    render(<RunScreen onBackToMenu={() => {}} />);
    expect(screen.getByText(`Ink ${state.player.ink} / ${state.player.maxInk}`)).toBeInTheDocument();
    expect(screen.getByText(`Floor ${state.floorNumber} / 3`)).toBeInTheDocument();
    expect(screen.getByText(`Seed: ${SEED}`)).toBeInTheDocument();
    // Every real combat-type node on the floor renders a "Foe" pill.
    expect(screen.getAllByText('Foe')).toHaveLength(state.floor.nodes.filter((n) => n.type === 'combat').length);
  });

  it('marks only the available start nodes as clickable, and entering one starts a real fight', async () => {
    const state = freshRun(SEED);
    const user = userEvent.setup();
    render(<RunScreen onBackToMenu={() => {}} />);

    const available = window.Wordbound.Game._availableNodeIds();
    expect(available).toEqual(state.floor.startNodeIds);

    const foePills = screen.getAllByText('Foe');
    expect(foePills.length).toBeGreaterThanOrEqual(1);
    // node-current is the "clickable now" class; only available start nodes carry it.
    const clickableFoePills = foePills.filter((el) => el.className.includes('node-current'));
    expect(clickableFoePills.length).toBe(
      state.floor.startNodeIds.filter((id) => state.floor.nodes.find((n) => n.id === id).type === 'combat').length,
    );
    expect(clickableFoePills.length).toBeGreaterThan(0);

    await user.click(clickableFoePills[0]);
    expect(state.combatActive).toBe(true);
    expect(state.monster).toBeTruthy();
    // Combat screen takes over -- the monster's real name is on its info
    // header (also shows up in the message log's "X appears!" line, so this
    // is scoped to .monster-name specifically rather than a page-wide query).
    expect(document.querySelector('.monster-name').textContent).toContain(state.monster.name);
  });

  it('abandoning a run mid-fight calls Game.returnToMainMenu and the onBackToMenu callback', async () => {
    const state = freshRun(SEED);
    window.Wordbound.Game.enterCurrentNode(findAvailableCombatNodeId(state));
    expect(state.combatActive).toBe(true);
    const onBackToMenu = vi.fn();
    const user = userEvent.setup();
    render(<RunScreen onBackToMenu={onBackToMenu} />);

    await user.click(screen.getByRole('button', { name: 'Back to Menu (abandon run)' }));
    expect(state.screen).toBe('MAIN_MENU');
    expect(onBackToMenu).toHaveBeenCalledTimes(1);
  });
});

describe('RunScreen -- screen routing', () => {
  it('routes state.screen === TREASURE to the treasure panel with real rolled options', () => {
    const state = freshRun(SEED);
    window.Wordbound.Game.enterCurrentNode(findNodeIdByType(state, 'treasure'));
    expect(state.screen).toBe('TREASURE');
    render(<RunScreen onBackToMenu={() => {}} />);
    expect(screen.getByText('Choose an item')).toBeInTheDocument();
    const Items = window.Wordbound.Items;
    state.treasureOptions.forEach((itemId) => {
      expect(screen.getByText(Items.ITEM_DEFS[itemId].name)).toBeInTheDocument();
    });
  });

  it('routes state.screen === SHOP to the shop panel', () => {
    const state = freshRun(SEED);
    window.Wordbound.Game.enterCurrentNode(findNodeIdByType(state, 'shop'));
    expect(state.screen).toBe('SHOP');
    render(<RunScreen onBackToMenu={() => {}} />);
    expect(screen.getByText(`Shop — Gold: ${state.player.gold} 🪙`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leave Shop' })).toBeInTheDocument();
  });

  it('falls back to the honest "not ported yet" placeholder for an unported screen', () => {
    const state = freshRun(SEED);
    state.screen = 'EVENT'; // EVENT is explicitly not ported yet (RewardScreens.jsx header)
    render(<RunScreen onBackToMenu={() => {}} />);
    expect(screen.getByText(/isn't ported to React yet/)).toBeInTheDocument();
  });
});
