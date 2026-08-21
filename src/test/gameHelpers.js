// Shared helpers for component tests that need real, live Game state (not a
// mock) -- see src/test/setup.js for how window.Wordbound.* gets wired up.

// Starts a fresh run and returns the live Game._state object (the same
// mutable object every component reads directly, per RunScreen.jsx's own
// header comment on why: "a single mutable object the vanilla engine
// mutates in place"). Call this at the top of any test that needs a real
// run in progress -- it fully resets state (see game.js's Game.startRun),
// so tests don't leak state into each other even without re-importing.
export function freshRun(seed, characterId = 'archivist') {
  const Game = window.Wordbound.Game;
  Game.startRun(characterId, seed);
  return Game._state;
}

// floor.js's node ids come from a module-level counter (`node1`, `node2`,
// ...) that is NEVER reset between runs -- so the id a "floor-1 treasure
// node" gets is different in every test depending on how many floors were
// generated earlier in the same test run. Find nodes by TYPE instead of
// hardcoding a literal id, so these helpers stay correct regardless of
// test execution order.
export function findNodeIdByType(state, type) {
  const node = state.floor.nodes.find((n) => n.type === type);
  if (!node) {
    throw new Error(`no "${type}" node on this seed's floor -- ${state.floor.nodes.map((n) => n.type).join(',')}`);
  }
  return node.id;
}

// A real combat node the player can enter right now (one of the floor's
// start lanes) -- same idea as findNodeIdByType, but restricted to
// availableNodeIds() so the returned id is legitimately reachable, not just
// present somewhere on the floor.
export function findAvailableCombatNodeId(state) {
  const Game = window.Wordbound.Game;
  const available = Game._availableNodeIds();
  const nodeId = available.find((id) => {
    const node = state.floor.nodes.find((n) => n.id === id);
    return node && node.type === 'combat';
  });
  if (!nodeId) {
    throw new Error(`no available combat start node on this seed's floor -- available ids: ${available.join(',')}`);
  }
  return nodeId;
}

// Combat.previewWord tells us whether a candidate word is actually playable
// against the CURRENT rack/monster -- used instead of hardcoding one "the"
// word so tests keep working if wordlist.js or the seeded rack ever drifts.
// Throws (loudly, not silently) if none of the candidates work, since a
// silently-skipped word would defeat the point of testing the real submit
// path with a real word.
export function pickPlayableWord(state, candidates) {
  const Combat = window.Wordbound.Combat;
  for (const word of candidates) {
    const preview = Combat.previewWord(state.player, state.monster, word, state.comboState, {
      previousWord: state.previousWordThisFight,
      wordsPlayedThisFight: state.wordsPlayedThisFightCount,
      hexedTileId: state.hexedTileId,
      overcharge: state.overchargeArmed,
    });
    if (preview && preview.valid) return word;
  }
  throw new Error(
    `none of the candidate words [${candidates.join(', ')}] are playable against the current rack (${state.player.rack.map((t) => t.letter).join('')}) -- update the candidate list`,
  );
}

// Game.submitWord resolves a kill's screen transition (TILE_REWARD) inside
// its own setTimeout (see CombatScreen.jsx's header comment: ~220ms, +500ms
// more on a killing blow) -- this polls the real state instead of a fixed
// sleep, so it's exact regardless of which of those constants apply.
async function waitForScreen(state, screen, timeoutMs = 2000) {
  const start = Date.now();
  while (state.screen !== screen) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`timed out waiting for screen "${screen}" -- state.screen is still "${state.screen}"`);
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

// Forces the current fight's monster to 1 HP and plays a real, valid word
// to land the kill (same shortcut the orchestrator's own Playwright smoke
// tests used -- see PROGRESS.md's STRUCTURAL 6/N entry), then waits for the
// real async resolution to land on TILE_REWARD. Requires combat to already
// be active (call Game.enterCurrentNode on a combat/elite/boss node first).
export async function defeatCurrentMonster(state, candidates) {
  const Game = window.Wordbound.Game;
  state.monster.hp = 1;
  const word = pickPlayableWord(state, candidates);
  Game.submitWord(word);
  await waitForScreen(state, 'TILE_REWARD');
}
