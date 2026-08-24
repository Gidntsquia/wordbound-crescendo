import { useReducer } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TreasureOrShopScreen, BossRewardScreen } from '../RewardScreens.jsx';
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
    const user = userEvent.setup();
    render(<Harness Screen={TreasureOrShopScreen} />);

    const itemId = state.shopOptions[0];
    const def = Items.ITEM_DEFS[itemId];
    const goldBefore = state.player.gold;
    // Uses the real effective price, not def.shopPrice raw -- SHOPKEEPERS
    // ticket (GOALS.md): whichever author this seeded visit rolled may be
    // discounting this exact item (Austen/Poe both apply a price cut under
    // some condition), and Game.buyItem charges that real price.
    const expectedPrice = window.Wordbound.Game.getShopItemPrice(itemId);

    await user.click(screen.getByText(def.name));
    expect(state.player.gold).toBe(goldBefore - expectedPrice);
    expect(state.player.items).toContain(itemId);
  });

  // SHOPKEEPERS ticket (GOALS.md, step 2): the shop banner names the
  // current author, shows a sampled line, and names their quirk. Real
  // Game.enterCurrentNode rolls whichever author this seed happens to
  // land on; _setShopkeeperForTesting overrides it afterward so this test
  // covers a fixed, known author rather than depending on the seed.
  it('shows the shopkeeper banner with the current author, a line, and their quirk', () => {
    const state = freshRun(SEED);
    window.Wordbound.Game.enterCurrentNode(findNodeIdByType(state, 'shop'));
    window.Wordbound.Game._setShopkeeperForTesting('poe');
    render(<Harness Screen={TreasureOrShopScreen} />);

    expect(screen.getByText('Edgar Allan Poe', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Nevermore', { exact: false })).toBeInTheDocument();
    expect(screen.getByText(state.shopkeeperLine, { exact: false })).toBeInTheDocument();
  });

  // PORTRAITS (step 3): the banner also shows the keeper's portrait glyph
  // (the framed-glyph placeholder convention BossEntranceOverlay's
  // portraitGlyph prop already established for bosses/Shakespeare, per
  // THEME.md's own Portraits note -- not a blocked ticket).
  it('shows the shopkeeper portrait glyph in the banner', () => {
    const state = freshRun(SEED);
    window.Wordbound.Game.enterCurrentNode(findNodeIdByType(state, 'shop'));
    window.Wordbound.Game._setShopkeeperForTesting('poe');
    render(<Harness Screen={TreasureOrShopScreen} />);

    const glyph = window.Wordbound.Shopkeepers.AUTHOR_DEFS.poe.glyph;
    expect(screen.getByText(glyph)).toBeInTheDocument();
  });

  // Poe's Nevermore discounts rare/legendary items 25% -- the button shows
  // both the struck-through original price and the real discounted one.
  it('shows a struck-through original price alongside the discounted one', () => {
    const state = freshRun(SEED);
    window.Wordbound.Game.enterCurrentNode(findNodeIdByType(state, 'shop'));
    window.Wordbound.Game._setShopkeeperForTesting('poe');
    const Items = window.Wordbound.Items;
    const rareDef = Items.ITEM_DEFS.vowel_leech;
    // Force a known rare item into this visit's shop options so the test
    // doesn't depend on the seed happening to roll one.
    state.shopOptions = ['vowel_leech'].concat(state.shopOptions.slice(1));
    render(<Harness Screen={TreasureOrShopScreen} />);

    const discounted = window.Wordbound.Game.getShopItemPrice('vowel_leech');
    expect(discounted).toBeLessThan(rareDef.shopPrice);
    const button = screen.getByText(rareDef.name).closest('button');
    expect(button.textContent).toContain(String(rareDef.shopPrice));
    expect(button.textContent).toContain(String(discounted));
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

// PLAYTEST FINDINGS 3 item 2 (GOALS.md, 2026-08-22): a `TileRewardScreen`
// describe block used to sit here, covering the per-kill "add a tile to your
// deck?" step (that it appeared after a real kill, that picking grew the
// deck, that Skip didn't). Jaxon removed the whole deck-building loop --
// "we aren't adding tiles to our deck anymore" -- so the component and its
// screen no longer exist. The coverage is deliberately inverted rather than
// dropped: this block now proves, through the SAME real kill the old tests
// drove, that a regular kill grants gold and goes straight back to the map
// with the deck untouched and no reward step in between.
describe('a regular kill resolves with no tile-reward step', () => {
  it('goes straight back to the map, grants gold, and never grows the deck', async () => {
    const state = freshRun(SEED);
    window.Wordbound.Game.enterCurrentNode(findAvailableCombatNodeId(state)); // regular combat, not a boss
    const deckSizeBefore = state.deck.length;
    const goldBefore = state.player.gold;
    await defeatCurrentMonster(state, WORD_CANDIDATES);

    expect(state.screen).toBe('RUN');
    expect(state.combatActive).toBe(false);
    expect(state.deck.length).toBe(deckSizeBefore);
    // Gold is the kill's whole reward now, so it must actually be granted.
    expect(state.player.gold).toBeGreaterThan(goldBefore);
    // The pick-a-tile state the removed screen read is gone from state too,
    // not merely unrendered.
    expect(state.tileRewardOptions).toBeUndefined();
    expect(state.pendingAfterTileReward).toBeUndefined();
  });

  it('does not expose the removed tile-reward actions on Game at all', () => {
    expect(window.Wordbound.Game.pickTileReward).toBeUndefined();
    expect(window.Wordbound.Game.skipTileReward).toBeUndefined();
  });
});

describe('BossRewardScreen', () => {
  it('appears directly on a real boss kill, and picking an item advances the floor', async () => {
    const state = freshRun(SEED);
    // Was findNodeIdByType(state, 'boss') (the floor's real floor-1 boss) --
    // pinned to a synthetic boss_unabridged node instead (GOALS.md
    // DUEL-GAUGE COMBAT ORCHESTRATOR DECISION 2026-08-22, "duel fights are
    // React-only"): floor 1's real boss (boss_vowelmaw) now carries a real
    // `.piece` and routes through Game.startDuelFight, which calls
    // initAudioContext() uncaught -- a hard jsdom crash here too (Vitest's
    // jsdom environment has no window.AudioContext either, same gap
    // test/dom-check.js hit) -- and even past that, defeatCurrentMonster's
    // "force hp=1, submit one word" kill isn't deterministic for a duel-mode
    // boss (a kill needs a WON PUSH crossing the gauge, not an hp
    // subtraction). This test's actual subject is BossRewardScreen's UI flow
    // after ANY boss kill, boss-identity-agnostic, so pointing it at a
    // synthetic boss_unabridged node (still turn-based, same technique
    // test/dom-check.js's enterAndKillBoss helper already uses) preserves
    // the exact same coverage with zero loss.
    state.floor.nodes.push({ id: 'reward-test-boss', type: 'boss', defId: 'boss_unabridged', cleared: false });
    window.Wordbound.Game.enterCurrentNode('reward-test-boss');
    expect(state.monster.isBoss).toBe(true);
    await defeatCurrentMonster(state, WORD_CANDIDATES);
    // PLAYTEST FINDINGS 3 item 2: a boss kill used to stop at the per-kill
    // tile reward and only reach its item hoard once that was resolved --
    // it now lands on BOSS_ITEM_REWARD directly.
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
