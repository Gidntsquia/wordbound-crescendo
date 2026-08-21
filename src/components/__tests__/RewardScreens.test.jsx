import { useReducer } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TreasureOrShopScreen, TileRewardScreen, BossRewardScreen } from '../RewardScreens.jsx';
import { freshRun, defeatCurrentMonster, findNodeIdByType, findAvailableCombatNodeId } from '../../test/gameHelpers.js';

// See RunScreen.test.jsx's header comment: node ids are looked up by type,
// never hardcoded, since floor.js's node-id counter isn't reset per test.
const SEED = 'vitest-fixed-seed-1';
const WORD_CANDIDATES = ['RADIO', 'ROAD', 'RAID', 'READ', 'RAIN', 'AIDE', 'DINE', 'RIDE'];

// Same act/bump harness pattern as CombatScreen.test.jsx -- these screens'
// Game.* actions are all synchronous state mutators (unlike submitWord), so
// a plain bump-after-call is enough here. Unlike CombatScreen (which stays
// mounted for the whole fight), picking/skipping any of these panels routes
// state.screen AWAY from the screen that rendered them -- real RunScreen.jsx
// swaps to a different component at that point, so this harness mirrors
// that same guard (render null once state.screen no longer matches) instead
// of forcing the real component to render its now-stale options as null.
const SCREEN_FOR = new Map([
  [TreasureOrShopScreen, (s) => s.screen === 'TREASURE' || s.screen === 'SHOP'],
  [TileRewardScreen, (s) => s.screen === 'TILE_REWARD'],
  [BossRewardScreen, (s) => s.screen === 'BOSS_ITEM_REWARD'],
]);

function Harness({ Screen }) {
  const [, bump] = useReducer((n) => n + 1, 0);
  const Game = window.Wordbound.Game;
  const state = Game._state;
  function act(fn) {
    fn();
    bump();
  }
  if (!SCREEN_FOR.get(Screen)(state)) return null;
  return <Screen state={state} Game={Game} act={act} />;
}

describe('TreasureOrShopScreen -- TREASURE', () => {
  it('picking an item adds it to player.items and returns to the map', async () => {
    const state = freshRun(SEED);
    window.Wordbound.Game.enterCurrentNode(findNodeIdByType(state, 'treasure'));
    const Items = window.Wordbound.Items;
    const user = userEvent.setup();
    render(<Harness Screen={TreasureOrShopScreen} />);

    const chosenId = state.treasureOptions[0];
    await user.click(screen.getByText(Items.ITEM_DEFS[chosenId].name));
    expect(state.player.items).toContain(chosenId);
    expect(state.screen).toBe('RUN');
  });
});

describe('TreasureOrShopScreen -- SHOP', () => {
  it('disables items the player cannot afford and enables ones they can', () => {
    const state = freshRun(SEED);
    window.Wordbound.Game.enterCurrentNode(findNodeIdByType(state, 'shop'));
    state.player.gold = 0;
    render(<Harness Screen={TreasureOrShopScreen} />);
    const buttons = screen.getAllByRole('button').filter((b) => b.className.includes('treasure-choice'));
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((b) => expect(b).toBeDisabled());
  });

  it('buying an affordable item deducts gold and adds it to the player', async () => {
    const state = freshRun(SEED);
    window.Wordbound.Game.enterCurrentNode(findNodeIdByType(state, 'shop'));
    state.player.gold = 9999;
    const Items = window.Wordbound.Items;
    const Consumables = window.Wordbound.Consumables;
    const user = userEvent.setup();
    render(<Harness Screen={TreasureOrShopScreen} />);

    const itemId = state.shopOptions[0];
    const isConsumable = itemId.indexOf('c:') === 0;
    const actualId = isConsumable ? itemId.substring(2) : itemId;
    const def = isConsumable ? Consumables.CONSUMABLE_DEFS[actualId] : Items.ITEM_DEFS[actualId];
    const goldBefore = state.player.gold;

    await user.click(screen.getByText(def.name));
    expect(state.player.gold).toBe(goldBefore - def.shopPrice);
    if (isConsumable) {
      expect(state.player.consumables).toContain(actualId);
    } else {
      expect(state.player.items).toContain(actualId);
    }
  });

  it('Leave Shop returns the player to the map', async () => {
    const state = freshRun(SEED);
    window.Wordbound.Game.enterCurrentNode(findNodeIdByType(state, 'shop'));
    const user = userEvent.setup();
    render(<Harness Screen={TreasureOrShopScreen} />);
    await user.click(screen.getByRole('button', { name: 'Leave Shop' }));
    expect(state.screen).toBe('RUN');
  });
});

describe('TileRewardScreen', () => {
  it('appears after a real kill; picking a tile adds it to the deck and returns to the map', async () => {
    const state = freshRun(SEED);
    window.Wordbound.Game.enterCurrentNode(findAvailableCombatNodeId(state)); // regular combat, not a boss
    await defeatCurrentMonster(state, WORD_CANDIDATES);
    expect(state.screen).toBe('TILE_REWARD');
    const deckSizeBefore = state.deck.length;
    const chosenTileId = state.tileRewardOptions[0].id;

    const user = userEvent.setup();
    render(<Harness Screen={TileRewardScreen} />);
    const tileButtons = screen.getAllByRole('button');
    await user.click(tileButtons[0]);

    expect(state.deck.length).toBe(deckSizeBefore + 1);
    expect(state.deck.some((t) => t.id === chosenTileId)).toBe(true);
    // Regular (non-boss) kill resolves straight back to the map, not a boss reward.
    expect(state.screen).toBe('RUN');
  });

  it('Skip does not add a tile and still returns to the map', async () => {
    const state = freshRun(SEED);
    window.Wordbound.Game.enterCurrentNode(findAvailableCombatNodeId(state));
    await defeatCurrentMonster(state, WORD_CANDIDATES);
    const deckSizeBefore = state.deck.length;

    const user = userEvent.setup();
    render(<Harness Screen={TileRewardScreen} />);
    await user.click(screen.getByRole('button', { name: 'Skip' }));

    expect(state.deck.length).toBe(deckSizeBefore);
    expect(state.screen).toBe('RUN');
  });
});

describe('BossRewardScreen', () => {
  it('appears after skipping the tile reward from a real boss kill, and picking an item advances the floor', async () => {
    const state = freshRun(SEED);
    window.Wordbound.Game.enterCurrentNode(findNodeIdByType(state, 'boss'));
    expect(state.monster.isBoss).toBe(true);
    await defeatCurrentMonster(state, WORD_CANDIDATES);
    expect(state.pendingAfterTileReward).toBe('bossItemReward');

    // Resolve the tile reward first (Skip) -- boss kills always show it before BOSS_ITEM_REWARD.
    window.Wordbound.Game.skipTileReward();
    expect(state.screen).toBe('BOSS_ITEM_REWARD');
    expect(state.bossRewardOptions.length).toBeGreaterThan(0);

    const Items = window.Wordbound.Items;
    const floorBefore = state.floorNumber;
    const chosenId = state.bossRewardOptions[0];

    const user = userEvent.setup();
    render(<Harness Screen={BossRewardScreen} />);
    await user.click(screen.getByText(Items.ITEM_DEFS[chosenId].name));

    expect(state.player.items).toContain(chosenId);
    expect(state.floorNumber).toBe(floorBefore + 1);
    expect(state.screen).toBe('RUN');
  });
});
