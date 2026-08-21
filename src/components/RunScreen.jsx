import { useReducer } from 'react';

// Real port of #screen-run's node map (STRUCTURAL ticket, next sub-step after
// character select). What's genuinely ported this run: Game.startRun is
// called for real (real seeded RNG, real branching floor), and the map is a
// real, clickable view of that floor (js/wordbound/floor.js's actual output
// -- rows, lanes, edges, node types -- via the same Floor.directNextNodeIds
// traversal renderNodeMap() in game.js uses).
//
// What's NOT ported: everything a node resolves INTO. Row 0 of every floor
// is always 'combat' (floor.js), so the combat panel is the only thing this
// screen can ever actually reach right now -- there is no way to clear a
// floor-0 fight without it, so treasure/shop/event/rest nodes are simply
// unreachable through this screen today regardless of what's built for them.
// Rather than build untestable UI for screens nothing can currently reach,
// entering ANY node (of any type) shows one honest, generic "not ported yet"
// panel reflecting the real resulting Game._state (monster name/HP for a
// fight, screen name otherwise) with a way back to the menu. Dedicated
// per-screen UI (starting with the combat panel) is the next STRUCTURAL step.
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

  const inNode = state.combatActive || (state.screen !== 'RUN' && state.screen !== 'MAIN_MENU');

  return (
    <div className="screen">
      <div className="run-header">
        <div className="ink-display">Ink {state.player.ink} / {state.player.maxInk}</div>
        <div className="gold-display">{state.player.gold} 🪙</div>
        <div className="floor-label">Floor {state.floorNumber} / {Floor.TOTAL_FLOORS}</div>
      </div>
      <div className="run-seed-display">Seed: {state.runSeed}</div>

      {inNode ? (
        <NodePlaceholder state={state} Monsters={Monsters} onBack={backToMenu} />
      ) : (
        <NodeMap state={state} Floor={Floor} Traits={Traits} Monsters={Monsters}
          available={Game._availableNodeIds()}
          onEnterNode={(nodeId) => act(() => Game.enterCurrentNode(nodeId))} />
      )}
    </div>
  );
}

function NodePlaceholder({ state, Monsters, onBack }) {
  let detail;
  if (state.combatActive && state.monster) {
    detail = `Fighting: ${state.monster.name} (${state.monster.hp} / ${state.monster.maxHp} HP). Combat panel isn't ported to React yet.`;
  } else {
    detail = `Screen "${state.screen}" isn't ported to React yet.`;
  }
  return (
    <div className="panel character-select-panel">
      <p style={{ textAlign: 'center', color: '#b8ac8a', margin: '20px 0' }}>
        {detail} Play a full run at <code>wordbound.html</code> for now.
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
