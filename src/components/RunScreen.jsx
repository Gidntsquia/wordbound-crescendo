import { useEffect, useReducer, useRef } from 'react';
import CombatScreen from './CombatScreen.jsx';
import { TreasureOrShopScreen, TileRewardScreen, BossRewardScreen } from './RewardScreens.jsx';

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
// and BOSS_ITEM_REWARD. EVENT (choices carry a live `disabledReason(state)`
// check) and SHREDDER (multi-select-then-confirm) are NOT ported yet --
// both still fall through to the generic "not ported yet" placeholder below,
// reflecting the real resulting Game._state (screen name) with a way back
// to the menu.
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

  const rewardOrShopScreen = state.screen === 'TREASURE' || state.screen === 'SHOP'
    || state.screen === 'TILE_REWARD' || state.screen === 'BOSS_ITEM_REWARD';
  const otherUnportedNode = !state.combatActive && !rewardOrShopScreen
    && state.screen !== 'RUN' && state.screen !== 'MAIN_MENU';

  return (
    <div className="screen">
      <div className="run-header">
        <div className="ink-display">Ink {state.player.ink} / {state.player.maxInk}</div>
        <div className="gold-display">{state.player.gold} 🪙</div>
        <div className="floor-label">Floor {state.floorNumber} / {Floor.TOTAL_FLOORS}</div>
      </div>
      <div className="run-seed-display">Seed: {state.runSeed}</div>
      <MessageLog messages={state.messages} />

      {state.combatActive ? (
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
