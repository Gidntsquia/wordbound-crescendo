import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RunScreen from '../RunScreen.jsx';
import { freshRun, findNodeIdByType, findAvailableCombatNodeId, pickPlayableWord } from '../../test/gameHelpers.js';

// A fixed seed makes the floor's LAYOUT (node types, lanes, edges) fully
// deterministic, but NOT the literal node ids -- floor.js's node id counter
// is a module-level counter that keeps incrementing across every floor any
// test in this run has generated (see gameHelpers.js's findNodeIdByType for
// why). So every test below looks a node up by TYPE, never by a literal id.
const SEED = 'vitest-fixed-seed-1';

// SHAKESPEARE GUIDE + AUTHOR SHOPKEEPERS ticket (GOALS.md): Vitest's jsdom
// has REAL localStorage that persists across every test in this FILE (not
// auto-reset per test -- see MainMenu.test.jsx's own "Fresh jsdom
// localStorage each test file run" comment for the same property). Without
// this, `Game.hasSeenGuideIntro()` would stay false for every test below
// (nothing else in this file ever dismisses the guide overlay), mounting an
// unrelated Shakespeare cutscene on top of every single RunScreen render in
// this file -- harmless to jsdom's own click dispatch (no real
// hit-testing/z-index), but needless noise on every unrelated test's DOM.
// Marked seen here by default; the dedicated describe block below clears it
// back to unseen for its own tests specifically.
beforeEach(() => {
  window.Wordbound.Game.markGuideIntroSeen();
});

describe('RunScreen -- node map', () => {
  it('renders the run header and a real generated map for a fresh run', () => {
    const state = freshRun(SEED);
    render(<RunScreen onBackToMenu={() => {}} />);
    expect(screen.getByText(`Ink ${state.player.ink} / ${state.player.maxInk}`)).toBeInTheDocument();
    expect(screen.getByText(`Floor ${state.floorNumber} / 4`)).toBeInTheDocument();
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

    // REGULAR ENEMIES ticket (real remaining scope (2), 2026-08-22): weak
    // tier now has real `.piece` regulars, so this seed's row-0 draws can
    // legitimately be a duel-mode fight -- fine in a real browser (real
    // AudioContext), but jsdom has none, and clicking index 0 blindly would
    // crash if this seed happened to roll one first. Click the specific
    // pill that maps to a real non-duel node instead (same "restricted to a
    // safe start node" convention gameHelpers.js's findAvailableCombatNodeId
    // already established), rather than trusting index 0 to stay safe --
    // this test's own point is proving "clicking an available pill starts a
    // real fight," not which combat tier answers.
    const safeNodeId = findAvailableCombatNodeId(state);
    const combatStartNodeIds = state.floor.nodes
      .filter((n) => n.type === 'combat' && available.indexOf(n.id) !== -1)
      .map((n) => n.id);
    const safeIndex = combatStartNodeIds.indexOf(safeNodeId);
    expect(safeIndex).toBeGreaterThanOrEqual(0);

    await user.click(clickableFoePills[safeIndex]);
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

  // COMBAT JUICE ticket (GOALS.md): the ink-display take-damage flash lives
  // here (not CombatScreen.jsx) since .ink-display is part of the
  // always-visible run header. Game._emitPlayerDamaged is the same
  // test-only "doesn't depend on landing an exact hit" hook
  // Game._emitDamageLanded/Game._celebrateHit already establish --
  // triggering a real turn-based counterattack deterministically would
  // require depending on this seed's monster rolling a specific intent,
  // which isn't guaranteed stable.
  it('a real player-damaged event flashes the ink display', () => {
    const state = freshRun(SEED);
    window.Wordbound.Game.enterCurrentNode(findAvailableCombatNodeId(state));
    render(<RunScreen onBackToMenu={() => {}} />);
    const inkDisplay = screen.getByText(`Ink ${state.player.ink} / ${state.player.maxInk}`);
    expect(inkDisplay.classList.contains('take-damage')).toBe(false);
    act(() => { window.Wordbound.Game._emitPlayerDamaged({ damage: 5 }); });
    expect(inkDisplay.classList.contains('take-damage')).toBe(true);
  });

  // PLAYTEST FINDINGS 3 (GOALS.md) item 5: "REMOVE the log screen in the
  // middle of combat" -- the message log is real clutter mid-fight, still
  // useful between fights (map/reward/shop). Gated on state.combatActive.
  // Enters combat via a real UI click (not a direct Game.enterCurrentNode
  // call) so the component's own act/bump re-render is what's under test --
  // a direct engine-hook mutation after render doesn't trigger React's
  // re-render at all (see RunScreen.jsx's own `bump` header comment).
  it('the message log is visible on the map but gone once a real fight starts', async () => {
    const state = freshRun(SEED);
    const user = userEvent.setup();
    render(<RunScreen onBackToMenu={() => {}} />);
    expect(document.querySelector('.message-log')).toBeInTheDocument();

    const available = window.Wordbound.Game._availableNodeIds();
    const foePills = screen.getAllByText('Foe');
    const clickableFoePills = foePills.filter((el) => el.className.includes('node-current'));
    const safeNodeId = findAvailableCombatNodeId(state);
    const combatStartNodeIds = state.floor.nodes
      .filter((n) => n.type === 'combat' && available.indexOf(n.id) !== -1)
      .map((n) => n.id);
    const safeIndex = combatStartNodeIds.indexOf(safeNodeId);

    await user.click(clickableFoePills[safeIndex]);
    expect(state.combatActive).toBe(true);
    expect(document.querySelector('.message-log')).not.toBeInTheDocument();
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

  it('falls back to the honest "not ported yet" placeholder for an unrecognized screen', () => {
    const state = freshRun(SEED);
    // Every real renderRun()-family screen is ported as of this run (GAME_OVER
    // and VICTORY included -- see the dedicated tests below), so there's no
    // genuine unported screen left to set here. This synthetic value only
    // exercises the defensive fallback branch itself.
    state.screen = 'NOT_A_REAL_SCREEN';
    render(<RunScreen onBackToMenu={() => {}} />);
    expect(screen.getByText(/isn't ported to React yet/)).toBeInTheDocument();
  });

  it('routes state.screen === EVENT to the event panel, greys out an unaffordable choice, and applies a real effect', async () => {
    const state = freshRun(SEED);
    const user = userEvent.setup();
    // SEED's floor-1 event node deterministically resolves to 'forbidden_tome'
    // (events.js), whose first choice carries a real disabledReason(state).
    window.Wordbound.Game.enterCurrentNode(findNodeIdByType(state, 'event'));
    expect(state.screen).toBe('EVENT');
    expect(state.currentEvent.id).toBe('forbidden_tome');
    render(<RunScreen onBackToMenu={() => {}} />);

    expect(screen.getByText('The Forbidden Tome')).toBeInTheDocument();
    const readButton = screen.getByRole('button', { name: /Read it anyway/ });
    expect(readButton).toBeEnabled(); // fresh run owns none of the rule-changers yet

    const startingInk = state.player.ink;
    await user.click(readButton);
    // A real effect ran: an item was granted and ink was spent, then the
    // event resolved and the node cleared -- same finishEvent() path a
    // choice with no `hold` always takes.
    expect(state.player.items.length).toBeGreaterThan(0);
    expect(state.player.ink).toBeLessThan(startingInk);
    expect(state.screen).toBe('RUN');
  });

  it('a SHREDDER-holding event choice routes to the Shredder sub-screen, and picking + confirming destroys real deck tiles', async () => {
    // A seed whose floor-1 FIRST event node resolves to 'the_shredder'
    // specifically (events.js) -- SEED above lands on 'forbidden_tome'
    // instead, and floors can carry more than one event node.
    const state = freshRun('vitest-shredder-seed-5');
    const user = userEvent.setup();
    window.Wordbound.Game.enterCurrentNode(findNodeIdByType(state, 'event'));
    expect(state.currentEvent.id).toBe('the_shredder');
    render(<RunScreen onBackToMenu={() => {}} />);

    await user.click(screen.getByRole('button', { name: /Feed it/ }));
    expect(state.screen).toBe('SHREDDER');
    expect(screen.getByText(/Pick up to 2 tiles to destroy/)).toBeInTheDocument();

    const startingDeckSize = state.deck.length;
    const firstTileButton = document.querySelector('.treasure-choices .treasure-choice');
    await user.click(firstTileButton);
    expect(state.shredderSelection.length).toBe(1);
    expect(screen.getByText(/Feeding 1 tile to the Shredder/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    // Real Game.confirmShredder ran: the deck actually lost the picked tile,
    // and the node resolved back to RUN via finishEvent().
    expect(state.deck.length).toBe(startingDeckSize - 1);
    expect(state.screen).toBe('RUN');
  });
});

describe('RunScreen -- GAME_OVER / VICTORY', () => {
  it('running out of ink resolves to a real GAME_OVER screen (no run header), and Main Menu returns to the menu', async () => {
    const state = freshRun(SEED);
    const user = userEvent.setup();
    window.Wordbound.Game.enterCurrentNode(findAvailableCombatNodeId(state));
    expect(state.combatActive).toBe(true);
    let backToMenuCalled = false;
    render(<RunScreen onBackToMenu={() => { backToMenuCalled = true; }} />);

    // game.js's own player-death check (`state.player.ink <= 0`) fires
    // synchronously right after a word is scored -- BEFORE the monster's
    // counterattack even rolls (see the "Cursed Quill" comment above that
    // check in game.js) -- so zeroing ink first makes death deterministic
    // regardless of which word or monster intent RNG lands, and needs no
    // fake timers: submitWord -> endRun(false) all resolve inline.
    state.player.ink = 0;
    const word = pickPlayableWord(state, ['RADIO', 'ROAD', 'RAID', 'READ', 'RAIN', 'AIDE', 'DINE', 'RIDE']);
    await user.type(screen.getByPlaceholderText('Type or click letters...'), word);
    await user.click(screen.getByRole('button', { name: 'Play Word' }));

    expect(state.screen).toBe('GAME_OVER');
    expect(state.combatActive).toBe(false);
    expect(screen.getByText('The Well Ran Dry')).toBeInTheDocument();
    expect(screen.getByText(`You reached floor ${state.floorNumber}.`)).toBeInTheDocument();
    expect(screen.getByText(`Seed: ${SEED}`)).toBeInTheDocument();
    // A real run-stats row from RunStatsSummary (ported from renderRunStats).
    expect(screen.getByText('Words Spelled')).toBeInTheDocument();
    // GAME_OVER is a genuinely separate top-level screen in vanilla, not a
    // sub-panel of #screen-run -- the run header/message-log must be gone,
    // matching render()'s early-return dispatch in game.js.
    expect(screen.queryByText(/^Ink \d+ \/ \d+$/)).not.toBeInTheDocument();
    expect(screen.queryByText('The Stacks are quiet.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Main Menu' }));
    // Same escape hatch backToMenu() gives the "abandon run" button: a real
    // Game.returnToMainMenu() call plus the onBackToMenu callback so App's
    // own screen state moves off "run" too.
    expect(state.screen).toBe('MAIN_MENU');
    expect(backToMenuCalled).toBe(true);
  });

  it('clearing every floor resolves to a real VICTORY screen with the run stats', async () => {
    const state = freshRun(SEED);
    const user = userEvent.setup();
    // Floor.TOTAL_FLOORS is 4 (DUEL-GAUGE COMBAT's floor/def-plumbing run
    // added the real floor-4 "Podium"); Game._advanceFloor() is exposed
    // specifically so tests can drive floor transitions without a full
    // floor clear (see game.js's own comment on the hook) -- the 5th
    // advance takes floorNumber past TOTAL_FLOORS, which is exactly
    // endRun(true)'s real victory condition.
    window.Wordbound.Game._advanceFloor();
    window.Wordbound.Game._advanceFloor();
    window.Wordbound.Game._advanceFloor();
    window.Wordbound.Game._advanceFloor();
    expect(state.screen).toBe('VICTORY');

    render(<RunScreen onBackToMenu={() => {}} />);
    expect(screen.getByText('Victory!')).toBeInTheDocument();
    expect(screen.getByText('You cleared all 4 floors. Wordbound complete.')).toBeInTheDocument();
    expect(screen.getByText(`Seed: ${SEED}`)).toBeInTheDocument();
    expect(screen.getByText('Floors Cleared')).toBeInTheDocument();
    expect(screen.queryByText(/^Ink \d+ \/ \d+$/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Main Menu' }));
    expect(state.screen).toBe('MAIN_MENU');
  });
});

describe('RunScreen -- Shakespeare guide intro', () => {
  // Clears the outer beforeEach's markGuideIntroSeen() back to unseen for
  // every test in THIS block specifically -- runs after the outer
  // beforeEach (Vitest nests them in declaration order), so this always
  // wins.
  beforeEach(() => {
    window.localStorage.removeItem('wordbound_seen_guide_intro');
  });

  it('shows the guide overlay on a fresh run when unseen', () => {
    freshRun(SEED);
    render(<RunScreen onBackToMenu={() => {}} />);
    const ShakespeareGuide = window.Wordbound.ShakespeareGuide;
    expect(screen.getByText(
      `${ShakespeareGuide.INTRO.name.toUpperCase()} -- ${ShakespeareGuide.INTRO.epithet}`,
    )).toBeInTheDocument();
  });

  it('does not show the guide overlay once already seen', () => {
    window.Wordbound.Game.markGuideIntroSeen();
    freshRun(SEED);
    render(<RunScreen onBackToMenu={() => {}} />);
    const ShakespeareGuide = window.Wordbound.ShakespeareGuide;
    expect(screen.queryByText(
      `${ShakespeareGuide.INTRO.name.toUpperCase()} -- ${ShakespeareGuide.INTRO.epithet}`,
    )).not.toBeInTheDocument();
  });

  it('skipping the guide overlay dismisses it and marks it permanently seen', async () => {
    freshRun(SEED);
    const user = userEvent.setup();
    render(<RunScreen onBackToMenu={() => {}} />);
    expect(window.Wordbound.Game.hasSeenGuideIntro()).toBe(false);

    await user.click(screen.getByRole('button', { name: /Skip/ }));
    expect(screen.queryByText(/^WILLIAM SHAKESPEARE/)).not.toBeInTheDocument();
    expect(window.Wordbound.Game.hasSeenGuideIntro()).toBe(true);
  });

  it('the underlying run map is real and present underneath the overlay', () => {
    const state = freshRun(SEED);
    render(<RunScreen onBackToMenu={() => {}} />);
    // The overlay covers the screen visually (position:fixed, per CSS) but
    // the real run header underneath is still in the DOM the whole time --
    // matching showBossEntrance's own "the map is real underneath" note.
    expect(screen.getByText(`Seed: ${state.runSeed}`)).toBeInTheDocument();
  });
});
