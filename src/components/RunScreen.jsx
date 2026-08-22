import { useEffect, useReducer, useRef, useState } from 'react';
import CombatScreen from './CombatScreen.jsx';
import { TreasureOrShopScreen, TileRewardScreen, BossRewardScreen, EventScreen, ShredderScreen } from './RewardScreens.jsx';
import { ItemsOwnedStrip, DeckViewerPanel, ItemInspectorPanel, ConsumablesPanel, RunHeaderActions } from './RunSidePanels.jsx';
import { BossEntranceOverlay } from './BossEntranceOverlay.jsx';

// Real port of #screen-run's node map (STRUCTURAL ticket, next sub-step after
// character select). What's genuinely ported this run: Game.startRun is
// called for real (real seeded RNG, real branching floor), and the map is a
// real, clickable view of that floor (js/wordbound/floor.js's actual output
// -- rows, lanes, edges, node types -- via the same Floor.directNextNodeIds
// traversal renderNodeMap() in game.js uses).
//
// The combat panel is real too (CombatScreen.jsx) -- see its own header
// comment for what that does and doesn't cover. And so is the "choose from
// a list" reward/shop family (RewardScreens.jsx): TREASURE, SHOP,
// TILE_REWARD (reachable after literally every fight, not just bosses'),
// BOSS_ITEM_REWARD, EVENT (choices carry a live `disabledReason(state)`
// check), and SHREDDER (multi-select-then-confirm, held by an EVENT choice's
// `{ hold: 'SHREDDER' }` effect -- see RewardScreens.jsx's ShredderScreen).
// GAME_OVER and VICTORY (below, GameOverScreen/VictoryScreen) are direct
// ports of game.js's renderGameOver()/renderVictory() + shared
// renderRunStats() -- every `renderRun()`-family screen is now ported, so
// the generic "not ported yet" placeholder is purely a defensive fallback
// for an unrecognized state.screen value at this point (STRUCTURAL ticket's
// sub-step 1, screen porting, is done; sub-steps 3-5 -- Playwright ports,
// built-output verification, drag/animation follow-ups -- remain open).
//
// Game._state is a single mutable object the vanilla engine mutates in place
// (not React state) -- see js/wordbound/game.js. `bump` is a force-update
// escape hatch: every action below calls a real Game.* function (mutating
// that object) and then bumps a counter so this component re-renders and
// reads the fresh state, without maintaining a parallel React copy of it.
export default function RunScreen({ onBackToMenu }) {
  const [, bump] = useReducer((n) => n + 1, 0);
  const Game = window.Wordbound.Game;
  const Floor = window.Wordbound.Floor;
  const Monsters = window.Wordbound.Monsters;
  const Traits = window.Wordbound.Traits;
  const state = Game._state;

  // SHAKESPEARE GUIDE + AUTHOR SHOPKEEPERS ticket (GOALS.md), GUIDE INTRO
  // step: React's equivalent of game.js's showGuideIntro/hideGuideIntro --
  // reuses BossEntranceOverlay.jsx unmodified (same `{name, epithet,
  // taunts}` shape, see shakespeareGuide.js's own header) rather than
  // building a second overlay component. Lazy useState initializer reads
  // the real persisted "seen once ever" flag ONCE, at this RunScreen
  // instance's first mount for this run (App.jsx fully unmounts/remounts
  // RunScreen between runs, so this naturally re-evaluates per run without
  // needing an effect).
  const [guideIntroOpen, setGuideIntroOpen] = useState(() => !Game.hasSeenGuideIntro());

  // COMBAT JUICE ticket (GOALS.md): the ink-display take-damage flash
  // (game.js's animatePlayerDamage) counterpart for the React tree, fired
  // via Game.onPlayerDamaged whenever a turn-based fight's counterattack
  // actually lands. Lives here rather than CombatScreen.jsx because
  // .ink-display is part of the always-visible run header, not the combat
  // panel -- subscribed once for the whole run screen's lifetime, same
  // remove/reflow/add technique as vanilla's own animatePlayerDamage (a
  // plain class toggle wouldn't restart the CSS animation on a second hit
  // before the first one's timeout clears it).
  const inkDisplayRef = useRef(null);
  useEffect(() => {
    return Game.onPlayerDamaged(() => {
      const el = inkDisplayRef.current;
      if (!el) return;
      el.classList.remove('take-damage');
      void el.offsetWidth; // reflow so the flash restarts on a repeat hit
      el.classList.add('take-damage');
      setTimeout(() => el.classList.remove('take-damage'), 400);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function act(fn) {
    fn();
    bump();
  }

  function backToMenu() {
    // Abandons the run (see Game.startRun's defensive combatActive/monster
    // reset -- this is a new escape hatch the vanilla UI never had, since it
    // has no way to leave a fight without finishing it).
    act(Game.returnToMainMenu);
    onBackToMenu();
  }

  // GAME_OVER/VICTORY are genuinely separate top-level screens in vanilla
  // (#screen-game-over/#screen-victory, swapped in for #screen-run wholesale
  // by render()'s early-return dispatch -- see game.js) -- unlike the
  // reward/shop/event family below, which are sub-panels WITHIN #screen-run
  // and so keep the run header/message-log visible around them. Ending a run
  // hides all of that, matching vanilla, so these get their own return
  // before the run-header wrapper rather than a branch inside it.
  if (state.screen === 'GAME_OVER') {
    return <GameOverScreen state={state} Floor={Floor} onBackToMenu={backToMenu} />;
  }
  if (state.screen === 'VICTORY') {
    return <VictoryScreen state={state} Floor={Floor} onBackToMenu={backToMenu} />;
  }

  const rewardOrShopScreen = state.screen === 'TREASURE' || state.screen === 'SHOP'
    || state.screen === 'TILE_REWARD' || state.screen === 'BOSS_ITEM_REWARD'
    || state.screen === 'EVENT' || state.screen === 'SHREDDER';
  const otherUnportedNode = !state.combatActive && !rewardOrShopScreen
    && state.screen !== 'RUN' && state.screen !== 'MAIN_MENU';
  // Direct port of renderRun()'s `sidePanelOpen`: the deck viewer/item
  // inspector/consumables panel are opened from the always-visible
  // run-header (RunHeaderActions/ItemsOwnedStrip below), independent of
  // state.screen and even mid-combat, and replace whatever would otherwise
  // be showing -- same "one side panel wins over everything else" rule
  // game.js enforces via that shared boolean.
  const sidePanelOpen = state.deckViewerOpen || state.itemInspectorOpen || state.consumablesPanelOpen;

  return (
    <div className="screen">
      {guideIntroOpen && (
        <BossEntranceOverlay
          entrance={window.Wordbound.ShakespeareGuide.INTRO}
          onDismiss={() => { Game.markGuideIntroSeen(); setGuideIntroOpen(false); }}
          portraitGlyph="🪶"
        />
      )}
      <div className="run-header">
        <div className="ink-display" ref={inkDisplayRef}>Ink {state.player.ink} / {state.player.maxInk}</div>
        <div className="gold-display">{state.player.gold} 🪙</div>
        <div className="floor-label">Floor {state.floorNumber} / {Floor.TOTAL_FLOORS}</div>
        <RunHeaderActions state={state} Game={Game} act={act} />
      </div>
      <ItemsOwnedStrip state={state} Game={Game} act={act} />
      <div className="run-seed-display">Seed: {state.runSeed}</div>
      <MessageLog messages={state.messages} />

      {sidePanelOpen ? (
        state.deckViewerOpen ? (
          <DeckViewerPanel state={state} Game={Game} act={act} />
        ) : state.itemInspectorOpen ? (
          <ItemInspectorPanel state={state} Game={Game} act={act} />
        ) : (
          <ConsumablesPanel state={state} Game={Game} act={act} />
        )
      ) : state.combatActive ? (
        <>
          <CombatScreen state={state} Game={Game} act={act} />
          <button className="btn btn-secondary" style={{ width: '100%', marginTop: 10 }} onClick={backToMenu}>
            Back to Menu (abandon run)
          </button>
        </>
      ) : state.screen === 'TREASURE' || state.screen === 'SHOP' ? (
        <TreasureOrShopScreen state={state} Game={Game} act={act} />
      ) : state.screen === 'TILE_REWARD' ? (
        <TileRewardScreen state={state} Game={Game} act={act} />
      ) : state.screen === 'BOSS_ITEM_REWARD' ? (
        <BossRewardScreen state={state} Game={Game} act={act} />
      ) : state.screen === 'EVENT' ? (
        <EventScreen state={state} Game={Game} act={act} />
      ) : state.screen === 'SHREDDER' ? (
        <ShredderScreen state={state} Game={Game} act={act} />
      ) : otherUnportedNode ? (
        <NodePlaceholder state={state} onBack={backToMenu} />
      ) : (
        <NodeMap state={state} Floor={Floor} Traits={Traits} Monsters={Monsters}
          available={Game._availableNodeIds()}
          onEnterNode={(nodeId) => act(() => Game.enterCurrentNode(nodeId))} />
      )}
    </div>
  );
}

// Direct port of renderRun()'s message-log block: same placeholder text,
// same auto-scroll-to-bottom behavior (a plain effect keyed on the message
// array instead of the imperative `log_.scrollTop = log_.scrollHeight`
// render() did).
function MessageLog({ messages }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages]);
  return (
    <div className="message-log" ref={ref}>
      {messages.length
        ? messages.map((m, i) => <div key={i}>{m}</div>)
        : <div className="message-log-placeholder">The Stacks are quiet.</div>}
    </div>
  );
}

// Same fallback game.js's renderRunStats() uses when a run somehow ends
// with no runStats object yet (shouldn't happen post-startRun, but the
// vanilla function guards it, so this does too).
const DEFAULT_RUN_STATS = {
  wordsPlayed: 0, bestWord: null, bestWordDamage: 0, totalDamage: 0,
  monstersDefeated: 0, floorsCleared: 0, goldEarned: 0,
};

// Direct port of renderRunStats(): the same end-of-run stat rows, shared by
// GameOverScreen and VictoryScreen below exactly as game.js's single
// function serves both #game-over-run-stats and #victory-run-stats.
function RunStatsSummary({ state, Floor }) {
  const stats = state.runStats || DEFAULT_RUN_STATS;
  const rows = [
    ['Words Spelled', String(stats.wordsPlayed)],
    ['Best Word', stats.bestWord ? `${stats.bestWord} (${stats.bestWordDamage} dmg)` : '—'],
    ['Damage Dealt', String(stats.totalDamage)],
    ['Loose Words Defeated', String(stats.monstersDefeated)],
    ['Floors Cleared', `${stats.floorsCleared} / ${Floor.TOTAL_FLOORS}`],
    ['Gold Earned', `${stats.goldEarned} 🪙`],
  ];
  return (
    <div className="run-stats-summary">
      {rows.map(([label, value]) => (
        <div className="run-stat-row" key={label}>
          <span className="run-stat-label">{label}</span>
          <span className="run-stat-value">{value}</span>
        </div>
      ))}
    </div>
  );
}

// Direct port of renderGameOver(): same heading/copy/seed as
// #screen-game-over, same "Main Menu" continue button (game.js wires
// #btn-gameover-continue straight to Game.returnToMainMenu; here that's
// `onBackToMenu`, RunScreen's own backToMenu, which also flips App's local
// screen state since GAME_OVER is reached mid-run, still under RunScreen).
function GameOverScreen({ state, Floor, onBackToMenu }) {
  return (
    <div className="screen">
      <div className="panel">
        <h1>The Well Ran Dry</h1>
        <p>You reached floor {state.floorNumber}.</p>
        <RunStatsSummary state={state} Floor={Floor} />
        <p className="run-seed-display">Seed: {state.runSeed}</p>
        <button className="btn btn-primary" onClick={onBackToMenu}>Main Menu</button>
      </div>
    </div>
  );
}

// Direct port of renderVictory(): same heading/copy/seed as #screen-victory.
function VictoryScreen({ state, Floor, onBackToMenu }) {
  return (
    <div className="screen">
      <div className="panel">
        <h1>Victory!</h1>
        <p>You cleared all {Floor.TOTAL_FLOORS} floors. Wordbound complete.</p>
        <RunStatsSummary state={state} Floor={Floor} />
        <p className="run-seed-display">Seed: {state.runSeed}</p>
        <button className="btn btn-primary" onClick={onBackToMenu}>Main Menu</button>
      </div>
    </div>
  );
}

function NodePlaceholder({ state, onBack }) {
  return (
    <div className="panel character-select-panel">
      <p style={{ textAlign: 'center', color: '#b8ac8a', margin: '20px 0' }}>
        Screen "{state.screen}" isn't ported to React yet. Play a full run at <code>wordbound.html</code> for now.
      </p>
      <button className="btn btn-secondary" style={{ width: '100%', marginTop: 20 }} onClick={onBack}>
        Back to Menu
      </button>
    </div>
  );
}

const NODE_LABELS = { combat: 'Foe', elite: 'Elite', treasure: 'Treasure', rest: 'Rest', shop: 'Shop', event: 'Event', boss: 'BOSS' };

// Direct port of game.js's renderNodeMap() to JSX/SVG. Same edge math, same
// node-pill classes, same trait-hint labels -- ported rather than redesigned
// so the React map is pixel-equivalent to wordbound.html's.
function NodeMap({ state, Floor, Traits, Monsters, available, onEnterNode }) {
  const floor = state.floor;
  if (!floor) return null;
  const totalRows = floor.rows + 1;
  const bossVisualLane = (floor.lanes - 1) / 2;
  const laneOf = (node) => (node.type === 'boss' ? bossVisualLane : node.lane);
  const findNode = (id) => floor.nodes.find((n) => n.id === id);

  return (
    <div className="node-map">
      <div className="branch-map">
        <svg className="branch-map-edges" viewBox="0 0 100 100" preserveAspectRatio="none">
          {floor.edges.map((edge, i) => {
            const fromNode = findNode(edge[0]);
            const toNode = findNode(edge[1]);
            if (!fromNode || !toNode) return null;
            const fromIdx = state.pathNodeIds.indexOf(fromNode.id);
            const toIdx = state.pathNodeIds.indexOf(toNode.id);
            const walked = fromIdx !== -1 && toIdx !== -1 && toIdx === fromIdx + 1;
            return (
              <line key={i}
                x1={((laneOf(fromNode) + 0.5) / floor.lanes) * 100}
                y1={((fromNode.row + 0.5) / totalRows) * 100}
                x2={((laneOf(toNode) + 0.5) / floor.lanes) * 100}
                y2={((toNode.row + 0.5) / totalRows) * 100}
                className={'branch-edge' + (walked ? ' branch-edge-walked' : '')} />
            );
          })}
        </svg>
        <div className="branch-map-grid" style={{
          gridTemplateColumns: `repeat(${floor.lanes}, 1fr)`,
          gridTemplateRows: `repeat(${totalRows}, auto)`,
        }}>
          {floor.nodes.map((node) => {
            const isAvailable = !node.cleared && available.indexOf(node.id) !== -1;
            const classes = ['node-pill', 'node-' + node.type];
            if (node.cleared) classes.push('node-cleared');
            if (isAvailable) classes.push('node-current');
            else if (!node.cleared) classes.push('node-locked');
            if (node.id === state.mapPositionNodeId) classes.push('node-position');

            let label = (node.cleared ? '✓ ' : '') + NODE_LABELS[node.type];
            if (node.type === 'boss') {
              const bossDef = Monsters.BOSS_DEFS[node.defId];
              const traitId = bossDef?.traitPhases?.[0]?.traitId;
              const hint = traitId && Traits.TRAITS[traitId]?.hint;
              if (hint) label += ' — ' + hint;
            }
            if (node.type === 'elite' && node.eliteTraitId) {
              const hint = Traits.TRAITS[node.eliteTraitId]?.hint;
              if (hint) label += ' — ' + hint;
            }

            const style = node.type === 'boss'
              ? { gridRow: node.row + 1, gridColumn: '1 / -1', justifySelf: 'center' }
              : { gridRow: node.row + 1, gridColumn: node.lane + 1 };

            return (
              <div key={node.id} className={classes.join(' ')} style={style}
                onClick={isAvailable ? () => onEnterNode(node.id) : undefined}>
                {label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
