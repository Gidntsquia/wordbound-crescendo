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

// REGULAR ENEMIES ticket (GOALS.md): jsdom has no window.AudioContext, so
// entering a combat node whose real MONSTER_DEFS entry carries a `.piece`
// field crashes hard (Game.startCombat -> Game.startDuelFight ->
// initAudioContext() -> `new AudioContext()` throws) -- the same hazard
// test/dom-check.js's own audit found and fixed for the vanilla suite.
function isDuelModeNode(node) {
  if (!node) return false;
  const def = window.Wordbound.Monsters.MONSTER_DEFS[node.defId];
  return !!(def && def.piece);
}

// Same helper as test/dom-check.js's own firstSafeDefId -- first non-`.piece`
// def, optionally restricted to one tier.
function firstSafeDefId(defs, tier) {
  return Object.keys(defs).find((id) => !defs[id].piece && (!tier || defs[id].tier === tier));
}

// PLAYTEST FINDINGS ticket (GOALS.md, item 1, 2026-08-22): floor.js's
// pickCombatDefId now PREFERS duel-capable defs whenever a floor's eligible
// tier pool has any (so a fresh run's first fight is a real duel per
// Jaxon's own playtest report) -- which means floor 1 can now roll ZERO
// non-duel combat nodes at all (today's 3 weak-tier duel defs already
// crowd out every weak-tier classic def, and floor 1 also allows 'normal',
// but the shared pool mixes both tiers so a normal-tier node can still land
// on a duel-mode weak def). A plain search-for-an-already-safe-node (this
// function's own prior approach, and its own prior comment calling that a
// "true no-op" landmine) can no longer assume one exists. Mirror
// test/dom-check.js's own established fix instead: take ANY available
// combat node and PIN it to a safe same-tier defId if its current one is
// duel-mode, rather than search-and-hope. Tests that specifically need a
// real duel node (duelIntegration.test.js) already do their own direct
// def lookup + FakeAudioContext and don't call this helper.
export function findAvailableCombatNodeId(state) {
  const Game = window.Wordbound.Game;
  const Monsters = window.Wordbound.Monsters;
  const available = Game._availableNodeIds();
  const nodeId = available.find((id) => state.floor.nodes.find((n) => n.id === id && n.type === 'combat'));
  if (!nodeId) {
    throw new Error(`no available combat start node on this seed's floor -- available ids: ${available.join(',')}`);
  }
  const node = state.floor.nodes.find((n) => n.id === nodeId);
  if (isDuelModeNode(node)) {
    const def = Monsters.MONSTER_DEFS[node.defId];
    const safeId = firstSafeDefId(Monsters.MONSTER_DEFS, def.tier);
    if (!safeId) {
      throw new Error(`no non-duel-mode def left in tier "${def.tier}" to pin node ${nodeId} away to`);
    }
    node.defId = safeId;
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
