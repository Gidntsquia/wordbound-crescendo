// js/wordbound/game.js
// Orchestrator + state machine for Wordbound. Wires lexicon/traits/monsters/
// combat/items/floor together into a playable loop. This is the only
// Wordbound file allowed to touch the DOM.
//
// Screens: MAIN_MENU -> RUN (node-map <-> combat <-> treasure <-> rest) ->
//          GAME_OVER | VICTORY -> MAIN_MENU
//
// Character select: 3 distinct starting loadouts with different deck compositions
// and items. Run structure (3 floors, node map) identical across characters --
// only starting state differs. Shop and currency implemented (see tasks).

(function () {
  window.Wordbound = window.Wordbound || {};
  var Game = (window.Wordbound.Game = {});

  var Lexicon, Traits, Monsters, Combat, Items, Floor, Tiles, RNG, Characters, Achievements, Intents, Duel, DuelCombat, Music, StolenLetters;

  // COMBAT JUICE ticket (GOALS.md): the damage-landed hook. Game.submitWord
  // resolves a word's damage (and, in a duel fight, the monster's
  // counterattack) inside its own setTimeout and never returns or exposes
  // that intermediate result -- animateDamage/celebrateHit/animatePlayerDamage
  // below are the vanilla-only DOM answer to that, all guarded no-ops in the
  // React tree (reactTreeActive()). This is the React-side equivalent: a
  // plain pub/sub list a component can subscribe to (CombatScreen.jsx does)
  // to drive its own one-shot animations at the exact moment a hit lands,
  // without reaching into game.js's private setTimeout at all. Deliberately
  // NOT wired through Items.runHook -- that system is for item rule-changer
  // logic with gameplay effects; this is a pure UI notification with no
  // state mutation of its own, closer to an event emitter than a hook.
  var damageLandedListeners = [];
  Game.onDamageLanded = function (callback) {
    damageLandedListeners.push(callback);
    return function unsubscribe() {
      var idx = damageLandedListeners.indexOf(callback);
      if (idx !== -1) damageLandedListeners.splice(idx, 1);
    };
  };
  function emitDamageLanded(payload) {
    // A listener's own bug must not break combat resolution for every other
    // listener or (worse) leave submitWord's own setTimeout mid-execution --
    // same defensive isolation Items.runHook already uses for item hooks.
    damageLandedListeners.slice().forEach(function (listener) {
      try { listener(payload); } catch (e) { /* isolate a bad listener */ }
    });
  }

  // The player-damaged counterpart -- fired when the monster's counterattack
  // actually lands (turn-based fights only; a duel fight's player-damage
  // analogue is losing a health block, a different event entirely --
  // duel.on('block-lost') already exists for that at the engine level, but
  // wiring it to a UI flash is separate, still-open scope, not this hook).
  var playerDamagedListeners = [];
  Game.onPlayerDamaged = function (callback) {
    playerDamagedListeners.push(callback);
    return function unsubscribe() {
      var idx = playerDamagedListeners.indexOf(callback);
      if (idx !== -1) playerDamagedListeners.splice(idx, 1);
    };
  };
  function emitPlayerDamaged(payload) {
    playerDamagedListeners.slice().forEach(function (listener) {
      try { listener(payload); } catch (e) { /* isolate a bad listener */ }
    });
  }

  var audioContext = null;
  var musicOscillators = [];
  var musicGainNode = null;
  var sfxGainNode = null; // AUDIO ticket (GOALS.md, 2026-08-21): shared master gain for the new interaction SFX below, mirroring musicGainNode's pattern -- lets every new sound respect mute/volume via one gain node instead of a per-sound guard
  var isPlayingMusic = false;
  var currentMusicMode = null; // 'normal' or 'boss'

  // Audio settings (volume + mute) persisted separately from achievements.js's
  // save -- otherwise every fresh page load silently reset the player's chosen
  // volume/mute back to the 10% default, even if they'd explicitly changed it.
  var AUDIO_SETTINGS_KEY = 'wordbound_audio_settings';
  var audioSettings = { volume: 0.1, muted: false };
  (function loadAudioSettings() {
    try {
      if (typeof localStorage === 'undefined') return;
      var stored = localStorage.getItem(AUDIO_SETTINGS_KEY);
      if (!stored) return;
      var parsed = JSON.parse(stored);
      if (typeof parsed.volume === 'number') audioSettings.volume = Math.max(0, Math.min(1, parsed.volume));
      if (typeof parsed.muted === 'boolean') audioSettings.muted = parsed.muted;
    } catch (e) {
      // localStorage unavailable or corrupt saved value -- fall back to defaults
    }
  })();
  function saveAudioSettings() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(audioSettings));
    } catch (e) {
      // localStorage unavailable (private browsing, storage full, etc.) -- not fatal
    }
  }

  // DUEL-GAUGE COMBAT ticket (GOALS.md, header Accessibility bullet): "Largo"
  // assist -- a global tempo-scale slowdown for a duel's music, applied via
  // the engine hook music.js's setTempoScale already provides. "Clearly
  // labeled, no shame" per the ticket text: a plain persistent on/off toggle
  // (not a slider -- a duel's difficulty already scales through the MUSIC
  // itself per the header curve decision, so one flat assist level is
  // simpler to reason about and label honestly than a dial). Persisted the
  // same way/for the same reason as audioSettings above -- otherwise it'd
  // silently reset to off every page load even for a player who explicitly
  // turned it on.
  var LARGO_SETTINGS_KEY = 'wordbound_largo_enabled';
  // Judgment call, not a naming/feel call -- a starting tuning value, same
  // "explicitly flagged retunable" spirit as duel.js's own push constants.
  // 0.6 halves-ish the music's pace (and therefore its continuous push, per
  // duel.tick's own intensity*dt math) without stopping it outright.
  var LARGO_TEMPO_SCALE = 0.6;
  var largoEnabled = false;
  (function loadLargoSetting() {
    try {
      if (typeof localStorage === 'undefined') return;
      largoEnabled = localStorage.getItem(LARGO_SETTINGS_KEY) === '1';
    } catch (e) {
      // localStorage unavailable or corrupt saved value -- default to off
    }
  })();
  function saveLargoSetting() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(LARGO_SETTINGS_KEY, largoEnabled ? '1' : '0');
    } catch (e) {
      // localStorage unavailable (private browsing, storage full, etc.) -- not fatal
    }
  }

  // How to Play panel: shown on demand from the main menu, and automatically
  // (once ever) the first time a player starts combat.
  var HOWTO_SEEN_KEY = 'wordbound_seen_howto';
  function hasSeenHowToPlay() {
    try {
      if (typeof localStorage === 'undefined') return false;
      return localStorage.getItem(HOWTO_SEEN_KEY) === '1';
    } catch (e) {
      return false;
    }
  }
  function markHowToPlaySeen() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(HOWTO_SEEN_KEY, '1');
    } catch (e) {
      // localStorage unavailable -- not fatal, just means it may auto-show again
    }
  }

  var state = {
    screen: 'MAIN_MENU',
    selectedCharacter: null,
    player: null,
    rng: null,
    deck: [],
    pile: null, // { drawPile, discardPile } -- reset at the start of every fight
    floorNumber: 1,
    floor: null,
    // BRANCHING MAP (GOALS.md, run 2/N): replaces the old flat currentNodeIndex.
    // currentNodeId is the node currently being resolved (set on entry, cleared
    // once resolved). mapPositionNodeId is the last-cleared node the player is
    // standing at on the map (null at floor start, before any node is cleared).
    // pathNodeIds is the ordered sequence of cleared node ids, used to tell
    // which map edges were actually walked (vs. just both endpoints cleared,
    // which can happen at a merge without that exact edge being taken).
    currentNodeId: null,
    mapPositionNodeId: null,
    pathNodeIds: [],
    monster: null,
    combatActive: false,
    messages: [],
    treasureOptions: null,
    shopOptions: null, // array of string ids ('itemId' or 'c:consumableId') -- deliberately kept a flat string array, see shopTileOffer
    shopTileOffer: null, // FUN OVERHAUL 5/8: the shop's premium variant tile, a Tile OBJECT. Held separately rather than mixed into shopOptions so every consumer of that array (renderShop, test/balance-simulation.js's shopping bot, anything future) can keep assuming it's all string ids
    tileRewardOptions: null,
    bossRewardOptions: null, // rare/legendary item choices offered after a boss kill, see rollBossRewardOptions
    pendingAfterTileReward: null, // 'bossItemReward' | 'nextNode'
    currentEvent: null, // { id, def: EventDef, name, text, choices }
    pendingEventSkipNextCombat: false, // if true, skip next combat node
    shredderSelection: [], // GOALS.md "FUN OVERHAUL 7/8": tile ids picked for destruction on the Shredder sub-screen, cleared when it resolves
    activeWager: null, // GOALS.md "FUN OVERHAUL 7/8": { stake, payout } while a Wager with the Stacks is live, resolved on the next monster kill
    repeatedWordThisFight: false, // true once any word is replayed this fight -- what loses the wager, reset in startCombat
    deckViewerOpen: false,
    itemInspectorOpen: false,
    itemInspectorId: null,
    consumablesPanelOpen: false,
    howToPlayOpen: false,
    lastRackTileIds: [], // track tile IDs from previous render to detect new tiles
    rackJustRefilled: false, // true right after a full discard+redraw -- animate the whole rack,
                              // not just tiles that happen to be a different instance than before
                              // (with a small deck, refills often reuse the same tile object, which
                              // would otherwise skip the slide-in animation despite being a fresh deal)
    draggedTileId: null, // track which tile is being dragged for reordering
    dragOverIndex: null, // track which position we're hovering over
    touchStartIndex: null, // for touch-based reordering
    touchCurrentIndex: null, // track position during touch drag
    touchStartX: null, // track initial touch X position for drag threshold detection
    touchDragThresholdCrossed: false, // true once drag distance exceeds 10px threshold
    touchIdentifier: null, // identifier of the finger that owns the active rack drag, so a second touch can't hijack or end it (stuck-drag fix)
    stagingDrag: null, // MOBILE INPUT 2/3 Phase 2: active pointer drag of a STAGED tile (reorder-in-play-area / drag-out-to-remove / drag-onto-rack-to-unstage). { tileId, el, startX, startY, crossed, outside, overRack, rects, tileW, insertIndex }. null when no drag in progress
    suppressNextStagingClick: false, // MOBILE INPUT 2/3 Phase 2: set true after a real staging drag so the synthesized post-pointerup click doesn't immediately unstage the just-reordered tile; reset on the next pointerdown
    settleTileIds: [], // MOBILE INPUT 3/3: tile ids to give a one-shot land-settle animation on the NEXT render only (a tile just staged into the play area or unstaged back to the rack); consumed + cleared during renderStagingArea
    selectedTileIds: [], // tiles selected for staging (in click order)
    blankAssignments: {}, // MOBILE INPUT 1/3: tileId -> chosen letter, for blanks staged via the touch-mode letter picker (desktop stages blanks by typing, never populates this)
    touchMode: false, // MOBILE INPUT 1/3: true on coarse-pointer devices -- no typing, tap-to-play only. Set from matchMedia('(pointer: coarse)') at init; desktop behavior is unchanged when false
    blankPickerOpen: false, // MOBILE INPUT 1/3: true while the touch-mode A-Z blank-letter picker overlay is showing
    blankPickerTileId: null, // MOBILE INPUT 1/3: which blank tile the open picker is choosing a letter for
    comboState: { combo: 0, usedWords: new Set() }, // word novelty + combo streaks, reset in startCombat
    previousWordThisFight: null, // GOALS.md "FUN OVERHAUL 4/8": word played immediately before the current one this fight, reset in startCombat, fed to item hooks via ctx.previousWord
    wordsPlayedThisFightCount: 0, // 1-based once incremented; ===1 on the fight's first word, includes repeats -- reset in startCombat, fed to item hooks via ctx.wordsPlayedThisFight
    hexedTileId: null, // set by a Hex monster intent, cleared when the rack that held it cycles away (see monster-intents ticket)
    proccedItemIds: [], // FUN OVERHAUL 8/8: item ids whose onWordPlayed hook fired on the just-played word; consumed + cleared in renderItemsOwned to flash those chips for one render only
    comboBumped: false, // FUN OVERHAUL 8/8: true for one render when the just-played word advanced the combo streak; consumed in renderCombat to re-pop the (already visible) combo chip
    runStats: null // { wordsPlayed, bestWord, bestWordDamage, totalDamage, monstersDefeated, floorsCleared, goldEarned } -- reset in startRun, shown on the game-over/victory screens (review N6)
  };
  Game._state = state; // exposed for headless/browser test inspection only
  Game._getMusicMode = function () { return currentMusicMode; }; // exposed for headless/browser test inspection only (review F2)
  // STRUCTURAL ticket (GOALS.md, React port, items/deck/consumables/music
  // parity pass): wordbound.html's #btn-toggle-music/#music-volume listeners
  // call the private setMusicVolume()/toggleMusicMute() functions below
  // directly (same closure) -- the React app has no such access, so these
  // are real public API, not test-only, mirroring how Game.toggleOvercharge
  // etc. are exposed for React to call.
  Game.getAudioSettings = function () { return { volume: audioSettings.volume, muted: audioSettings.muted }; };
  Game.setMusicVolume = function (volume) { setMusicVolume(volume); render(); };
  Game.toggleMusicMute = function () { toggleMusicMute(); render(); };
  // DUEL-GAUGE COMBAT ticket, Largo accessibility assist (see the setting's
  // own definition above for why this is a flat on/off toggle, not a
  // slider). Applies live to an ALREADY-RUNNING duel's sequencer (not just
  // future fights) via the same public setTempoScale hook
  // Game.startDuelFight itself uses at fight-start -- a player who turns
  // Largo on mid-duel doesn't have to lose the fight and restart to feel it.
  Game.getLargoEnabled = function () { return largoEnabled; };
  Game.setLargoEnabled = function (enabled) {
    largoEnabled = !!enabled;
    saveLargoSetting();
    if (state.duelSequencer) state.duelSequencer.setTempoScale(largoEnabled ? LARGO_TEMPO_SCALE : 1);
    render();
  };
  // STRUCTURAL ticket (GOALS.md, remaining scope (c) step 2, tile-staging
  // rebuild): same "real public API, not test-only" reasoning as the audio
  // wrappers above -- wordbound.html's rack/staging-area click listeners call
  // the private selectTileForWord/unstageTile/stagedWord functions directly
  // (same closure); React's CombatScreen has no such access. Takes a tile id
  // (not a tile object) since that's what a React click handler naturally has
  // on hand (the tile object itself is a plain data record already in scope,
  // but an id-based wrapper matches unstageTile's own existing id-based shape
  // and stays valid even if the rack array is rebuilt between renders).
  // openBlankPicker/closeBlankPicker/assignBlankLetter are exposed too even
  // though nothing in React opens the picker yet (that overlay is still
  // unbuilt, GOALS.md's own note on why) -- selectTileForWord's touch-mode
  // blank branch calls openBlankPicker internally, so leaving it private
  // would make a blank-tile tap throw for a touch-mode React player instead
  // of harmlessly no-op-ing (blankPickerOpen flips true with no overlay to
  // read it, same inert result as today's plain-string model already gives a
  // blank click in every mode).
  Game.selectTileForWord = function (tileId) {
    var tile = state.player.rack.find(function (t) { return t.id === tileId; });
    if (!tile) return;
    selectTileForWord(tile);
  };
  Game.unstageTile = function (tileId) { unstageTile(tileId); };
  Game.openBlankPicker = function (tileId) { openBlankPicker(tileId); };
  Game.closeBlankPicker = function () { closeBlankPicker(); };
  Game.assignBlankLetter = function (letter) { assignBlankLetter(letter); };
  Game.stagedWord = function () { return stagedWord(); };
  // Mirrors #btn-clear-word's own handler (game.js's Game.init, below) minus
  // the DOM value reset, which React's CombatScreen does itself.
  Game.clearStagedWord = function () {
    state.selectedTileIds = [];
    state.blankAssignments = {};
  };
  // STRUCTURAL ticket (GOALS.md, remaining scope (c), desktop mouse-drag
  // rack reordering): mirrors wordbound.html's own dragstart/drop/dragend
  // listeners, which call these three private functions directly (same
  // closure) -- React's rack tile buttons have no such access, same
  // reasoning as the staging wrappers above. Deliberately NOT exposing
  // state.dragOverIndex or a dragover wrapper: grepped css/wordbound.css and
  // wordbound.html and confirmed dragOverIndex has no CSS rule or DOM read
  // anywhere -- vanilla's own dragover handler sets it directly on `state`
  // without calling render(), so it has never driven any visible feedback in
  // either tree. React's onDragOver only needs preventDefault() to make the
  // drop legal; nothing here for it to call.
  Game.startTileDrag = function (tileId) { startTileDrag(tileId); };
  Game.endTileDrag = function () { endTileDrag(); };
  Game.reorderRackOnDrop = function (dropIndex) { reorderRackOnDrop(dropIndex); };
  // STRUCTURAL ticket (GOALS.md, remaining scope (c), touch-based rack
  // reordering): same wrapper reasoning as the mouse-drag trio above, for
  // wordbound.html's touchstart/touchmove/touchend/touchcancel rack
  // listeners. startTouchReorder/updateTouchReorder/cancelTouchReorder are
  // pure state mutations (no DOM access) so these three wrap them as-is.
  // endTouchReorder(tappedTile, e) takes a TILE OBJECT (it calls
  // selectTileForWord(tappedTile) on a plain tap, not a drag) -- the
  // wrapper takes a tileId instead, same "React has no closure access"
  // pattern as Game.selectTileForWord, and looks the live tile up by id
  // right before calling through (safer than vanilla's stale closure
  // reference would be if the rack were rewritten mid-touch, though that
  // edge case is equally unhandled in both trees).
  // getTileAtPosition (called by updateTouchReorder) reads
  // $('rack-display') via getElementById -- the React rack container
  // below now carries id="rack-display" for exactly this reason.
  Game.startTouchReorder = function (tileId, index, touchX, touchId) { startTouchReorder(tileId, index, touchX, touchId); };
  Game.updateTouchReorder = function (touchX) { updateTouchReorder(touchX); };
  Game.endTouchReorder = function (tileId, e) {
    var tile = tileId ? state.player.rack.find(function (t) { return t.id === tileId; }) : null;
    endTouchReorder(tile, e);
  };
  Game.cancelTouchReorder = function () { cancelTouchReorder(); };
  // STRUCTURAL ticket (GOALS.md, remaining scope (c), staged-tile ghost/gap
  // drag system -- the last core piece of remaining scope (c)): thin
  // wrappers around the private pointer-drag state machine wordbound.html's
  // own renderStagingArea() wires directly (pointerdown on each staged
  // tile; pointermove/pointerup/pointercancel at the document level, once,
  // in Game.init). Same shape/signature as the private functions -- no
  // tileId-lookup indirection needed here since startStagingDrag/
  // moveStagingDrag/endStagingDrag/cancelStagingDrag already take a real
  // DOM element + the real pointer event, which React's handlers have
  // direct access to (e.currentTarget / the native event), unlike the
  // rack's drag wrappers above which had to bridge a closure gap. These
  // deliberately do NOT call render() themselves beyond what the private
  // functions already do internally (a no-op in the React tree either way,
  // per render()'s own guard) -- CombatScreen.jsx decides when to wrap a
  // call in its own act() (only on drop/cancel, never on move, matching
  // this system's own "DOM re-rendered exactly once, on release" design
  // documented just above these functions -- re-rendering mid-gesture would
  // destroy the ghost element the exact same way in React as in vanilla).
  Game.startStagingDrag = function (tileId, el, e) { startStagingDrag(tileId, el, e); };
  Game.moveStagingDrag = function (e) { moveStagingDrag(e); };
  Game.endStagingDrag = function (e) { endStagingDrag(e); };
  Game.cancelStagingDrag = function (e) { cancelStagingDrag(e); };
  // Exposed so React can run the same defensive sweep renderRun() runs on
  // every vanilla render ("a stuck drag ghost must never survive a
  // re-render") -- guards the one React-specific hazard vanilla doesn't
  // have (CombatScreen remounting, e.g. via a mid-fight side panel toggle,
  // which detaches the live d.el out from under an in-progress gesture).
  Game.sweepStagingDragArtifacts = function () { sweepStagingDragArtifacts(); };
  Game._stagedWord = function () { return stagedWord(); }; // MOBILE INPUT 1/3: exposed for test inspection of the staged-tiles word
  Game._reorderStagedTile = function (tileId, dropIndex) { return reorderStagedTile(tileId, dropIndex); }; // MOBILE INPUT 2/3 Phase 2: exposed so tests can exercise reorder state logic without simulating pointer events (jsdom can't)
  Game._hapticTick = function () { return hapticTick(); }; // MOBILE INPUT 3/3: exposed so tests can assert the vibrate feature-check + reduced-motion gate
  Game._celebrateHit = function (damage, magnificent) { return celebrateHit(damage, magnificent); }; // FUN OVERHAUL 8/8: exposed so tests can assert the CRUSHING/MAGNIFICENT DOM appends (jsdom can't verify the animation timing)
  Game._emitDamageLanded = function (payload) { return emitDamageLanded(payload); }; // COMBAT JUICE ticket: same "test doesn't depend on landing an exact big hit" reasoning as Game._celebrateHit above -- lets a React test assert CRUSHING/MAGNIFICENT wiring with an arbitrary payload instead of needing a real word that happens to score >=25 or run 7+ letters against whatever rack a fixed seed produces
  // BOSS ENTRANCE CUTSCENES ticket: exposed so a test can drive the real
  // overlay/skip/Game.submitWord-guard mechanism WITHOUT going through
  // startCombat -- every def with real entrance content also carries a
  // `.piece`, which routes through Game.startDuelFight -> initAudioContext(),
  // a hard crash in jsdom (no window.AudioContext there, confirmed directly)
  // -- same reasoning dom-check.js's own enterAndKillBoss helper already
  // documents for why it only ever fights boss_unabridged (no piece, no
  // entrance content either). This lets the CUTSCENE mechanism itself still
  // get real jsdom coverage despite that constraint.
  Game._showBossEntrance = function (entrance) { return showBossEntrance(entrance); };
  Game._hideBossEntrance = function () { return hideBossEntrance(); };
  Game._showGuideIntro = function () { return showGuideIntro(); }; // SHAKESPEARE GUIDE ticket: same test-isolation reasoning as _showBossEntrance above, though this one has no AudioContext hazard to dodge -- exposed anyway for a deterministic, dependency-free test of the overlay mechanism itself
  Game._hideGuideIntro = function () { return hideGuideIntro(); };
  Game._emitPlayerDamaged = function (payload) { return emitPlayerDamaged(payload); }; // COMBAT JUICE ticket: same reasoning, for the ink-flash counterpart
  Game._rollShopOptions = function () { return rollShopOptions(); }; // exposed so tests can assert the guaranteed-consumable-slot odds without needing a real shop node
  Game._advanceFloor = function () { return advanceFloor(); }; // CONTENT ticket (GOALS.md, 2026-08-21): exposed so tests can assert the onFloorAdvance item hook fires without driving a full floor clear
  Game._availableNodeIds = function () { return availableNodeIds(); }; // STRUCTURAL ticket (GOALS.md, React port): exposed so the React map view can compute which node pills are clickable using the exact same logic renderNodeMap() uses, instead of duplicating the traversal in JSX
  Game._sfxCallLog = function () { return sfxCallLog.slice(); }; // AUDIO ticket (GOALS.md, 2026-08-21): exposed so tests can assert which SFX fired, whether mute suppressed them, and whether the tile-tap debounce ate a burst -- jsdom has no real Web Audio to listen to, this is the substitute
  Game._clearSfxCallLog = function () { sfxCallLog.length = 0; lastSfxAt = {}; }; // AUDIO ticket: reset between test cases so each assertion starts from a clean log/debounce state

  function $(id) { return document.getElementById(id); }

  // Starting HP 20 -> 24 -> 22 (2026-08-20 Jaxon-authorized difficulty
  // rebalance, GOALS.md "BALANCE, high priority"): the initial +20% (to 24)
  // fixed the floor-2/elite wall that had collapsed win rate to ~16%, but
  // by ROUND 5 (see PROGRESS.md's full multi-round trail) seven independent
  // balance-simulation samples at n=30-50 -- spanning several rounds of
  // monster-side tuning -- consistently read a "best"-strategy win rate of
  // 50-63% (mean ~55%), above the 35-50% target band. Floor-2's strong-tier
  // defs were flagged as the single hardest content in EVERY one of those
  // samples regardless of three separate HP/attack cuts already applied to
  // them (monsters.js), meaning they're functioning as intended difficulty
  // spikes, not an undertuned wall -- cutting them a fourth time would only
  // re-open the floor-2 wall this ticket started by fixing. A smaller,
  // floor-agnostic pullback on the player-HP buffer (24 -> 22, i.e. +10%
  // over the original 20 instead of +20%) targets the actual remaining
  // problem (overall win rate too high) without concentrating more
  // difficulty onto any single floor.
  function newPlayer(characterDef) {
    var player = {
      ink: 22, maxInk: 22, gold: 0, rack: [], items: [], consumables: [], usedSecondWind: false,
      bonusDamageUntilEndOfTurn: 0, skipDiscardNextTurn: false, bonusTilesToDraw: 0,
      // DUEL-GAUGE COMBAT prep (GOALS.md, ink-audit run): persisted across fights within
      // a run, same as ink -- the caller creating a Duel instance per fight is meant to
      // pass this in as Duel.create({healthBlocks: player.healthBlocks}) and read the
      // instance's own healthBlocks back out when the fight ends, so a Verse lost in one
      // fight stays lost in the next. Nothing reads/writes this yet (true no-op until the
      // gauge-combat integration lands); defaults from Duel's own constant rather than a
      // second hardcoded "5" so the two never drift.
      healthBlocks: (Duel && Duel.DEFAULT_HEALTH_BLOCKS) || 5,
      maxHealthBlocks: (Duel && Duel.DEFAULT_HEALTH_BLOCKS) || 5
    };
    if (characterDef && characterDef.startingItems) {
      player.items = characterDef.startingItems.slice();
    }
    return player;
  }

  function log(msg) {
    state.messages.push(msg);
    if (state.messages.length > 6) state.messages.shift();
  }

  // ---- run lifecycle ----------------------------------------------------

  function createCharacterDeck(characterDef) {
    if (!characterDef || !characterDef.deckLetters) {
      return Tiles.createStarterDeck();
    }
    return characterDef.deckLetters.map(function (letter) {
      return Tiles.createTile(letter, null);
    });
  }

  Game.startRun = function (characterId, seedInput) {
    var characterDef = characterId ? Characters.getCharacter(characterId) : Characters.getCharacter('archivist');
    state.selectedCharacter = characterId || 'archivist';
    state.player = newPlayer(characterDef);
    // Seeds are always hashed as strings (RNG.hashStringToSeed), even an
    // auto-generated random one -- so typing a displayed seed back into the
    // seed input later reproduces the same run. Feeding RNG.create a raw JS
    // number instead would hash differently than typing those same digits
    // into a text input (RNG.create treats a number as already-a-seed, but
    // hashes a string), which would silently break "type this seed back in"
    // for the common case of a random run someone wants to share afterward.
    var trimmedSeed = seedInput ? String(seedInput).trim() : '';
    state.runSeed = trimmedSeed || String(RNG.randomSeed());
    // Same seed + character reproduces the same floors/monsters/rewards --
    // but treasure/shop pools are filtered by which items are unlocked
    // (Achievements.getUnlockedAchievements/UNLOCKABLE_ITEMS), which differs
    // per player and can change over time on the same browser. So identical
    // runs are only guaranteed at identical unlock state; that's an accepted
    // v1 caveat, not something this feature tries to fix.
    state.rng = RNG.create(state.runSeed);
    state.deck = createCharacterDeck(characterDef);
    state.floorNumber = 1;
    state.floor = Floor.generateBranchingFloor(state.floorNumber, state.rng);
    state.currentNodeId = null;
    state.mapPositionNodeId = null;
    state.pathNodeIds = [];
    state.messages = [];
    state.screen = 'RUN';
    // Defensive reset (STRUCTURAL ticket, React port): vanilla wordbound.html
    // only ever reaches startRun via the main menu, where a prior run's fight
    // can never have been left mid-combat -- so combatActive/monster were
    // never stale here before. React's run screen adds a "Back to Menu" that
    // CAN abandon a run mid-fight (no such escape exists in the vanilla UI),
    // which would otherwise leave combatActive stuck true and make the next
    // run's very first render think a fight is already in progress.
    state.combatActive = false;
    state.monster = null;
    state.activeWager = null;
    state.repeatedWordThisFight = false;
    state.shredderSelection = [];
    state.pendingEventSkipNextCombat = false;
    state.runStats = {
      wordsPlayed: 0, bestWord: null, bestWordDamage: 0, totalDamage: 0,
      monstersDefeated: 0, floorsCleared: 0, goldEarned: 0
    };
    if (Achievements) Achievements.resetRunState();
    startBackgroundMusic(false);
    render();
    // SHAKESPEARE GUIDE + AUTHOR SHOPKEEPERS ticket (GOALS.md): the map is
    // real underneath by the time this shows, same "cutscene draws on top of
    // an already-live screen" convention showBossEntrance established. A
    // true no-op once hasSeenGuideIntro() is true (every run after the
    // player's first). React's equivalent lives in RunScreen.jsx, gated the
    // same way via the Game.hasSeenGuideIntro/markGuideIntroSeen exposures
    // below (showGuideIntro itself is a no-op in the React tree, same as
    // showBossEntrance -- see reactTreeActive()).
    if (!hasSeenGuideIntro()) showGuideIntro();
  };

  function advanceFloor() {
    if (state.runStats) state.runStats.floorsCleared += 1;
    state.floorNumber += 1;
    if (state.floorNumber > Floor.TOTAL_FLOORS) {
      endRun(true);
      return;
    }
    // CONTENT ticket (GOALS.md, 2026-08-21): the only item hook fired on a
    // floor transition rather than in-combat -- see items.js's Acquisitions
    // Budget, the sole current onFloorAdvance user.
    playSfx('floorTransition', null, playFloorTransitionSound);
    var floorCtx = { player: state.player, floorNumber: state.floorNumber, messages: [] };
    Items.runHook('onFloorAdvance', floorCtx, state.player);
    floorCtx.messages.forEach(function (msg) { log(msg); });
    state.floor = Floor.generateBranchingFloor(state.floorNumber, state.rng);
    state.currentNodeId = null;
    state.mapPositionNodeId = null;
    state.pathNodeIds = [];
    render();
  }

  function endRun(victory) {
    stopBackgroundMusic();
    playSfx(victory ? 'victory' : 'defeat', null, victory ? playVictorySound : playDefeatSound);
    if (victory && Achievements) Achievements.trackRunCompletion();
    // STOLEN LETTERS META-PROGRESSION ticket: clear_a_run only ever unlocks
    // here (onMonsterDefeated's own sync call can't catch it -- a run's
    // final boss kill resolves to TILE_REWARD first, VICTORY only fires
    // later once its item is claimed/skipped), so this is the one call
    // site that actually needs its own sync rather than relying on the
    // combat-side one above.
    if (victory && StolenLetters) StolenLetters.syncFromAchievements();
    state.screen = victory ? 'VICTORY' : 'GAME_OVER';
    render();
  }

  Game.returnToMainMenu = function () {
    state.screen = 'MAIN_MENU';
    render();
  };

  Game.showCharacterSelect = function () {
    state.screen = 'CHARACTER_SELECT';
    render();
  };

  // ---- node entry ---------------------------------------------------------

  function findNodeById(nodeId) {
    if (!state.floor || !nodeId) return null;
    var nodes = state.floor.nodes;
    // Search from the end: real generated ids are always unique (a module-
    // level counter in floor.js), so direction never matters there, but a
    // few test scenarios splice a synthetic node onto state.floor.nodes with
    // a fixed literal id and re-run the same scenario more than once -- the
    // most recently pushed one is always the one meant to be "current".
    for (var i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].id === nodeId) return nodes[i];
    }
    return null;
  }

  // The node ids the player can choose from right now: the floor's start
  // lanes if nothing's been cleared yet, otherwise the direct (one-hop)
  // successors of wherever they're standing. Shared by renderNodeMap (what's
  // clickable) and nothing else -- there's deliberately no "skip ahead"
  // affordance beyond one hop.
  function availableNodeIds() {
    if (!state.floor) return [];
    if (state.mapPositionNodeId === null) return state.floor.startNodeIds.slice();
    return Floor.directNextNodeIds(state.floor, state.mapPositionNodeId);
  }

  function currentNode() {
    return findNodeById(state.currentNodeId);
  }

  // Records the just-resolved node as cleared/walked and drops the player
  // back at the map (state.currentNodeId null, so the next render offers
  // its direct successors via availableNodeIds()). Replaces the old flat
  // `state.currentNodeIndex += 1`. Callers are expected to have already set
  // `currentNode().cleared = true` before calling this.
  function advanceMapPosition() {
    if (state.pathNodeIds.indexOf(state.currentNodeId) === -1) {
      state.pathNodeIds.push(state.currentNodeId);
    }
    state.mapPositionNodeId = state.currentNodeId;
    state.currentNodeId = null;
  }

  // Enters a map node and resolves it (combat/treasure/shop/event/rest).
  // `nodeId` is the real map UI's contract -- every node.js pill it renders
  // as clickable is a member of availableNodeIds(), and the click handler
  // always passes that node's id explicitly (branching means there's no
  // longer a single "the" current node to default to). The zero-arg form is
  // kept for internal re-entry (the boss-skip branch below re-dispatches to
  // itself) and for tests, which set state.currentNodeId directly for
  // scenario setup -- the same pattern the old flat-index tests used with
  // state.currentNodeIndex, just addressed by id instead of by position.
  Game.enterCurrentNode = function (nodeId) {
    if (nodeId) state.currentNodeId = nodeId;
    var node = currentNode();
    if (!node || node.cleared) return;

    if (node.type === 'combat' || node.type === 'elite' || node.type === 'boss') {
      // Check if an event (like Empty Shelf) skipped this combat
      if (state.pendingEventSkipNextCombat) {
        if (node.type === 'boss') {
          // Bosses are the identity fights and cannot be skipped (Jaxon's
          // ruling, GOALS.md 2026-08-20). Start the boss fight normally and
          // KEEP the skip flag pending so it applies to the next regular
          // combat instead -- the player paid an event choice for it, so
          // don't silently void it.
          startCombat(node);
          log('The ' + state.monster.name + ' will not be avoided.');
          render();
          return;
        }
        state.pendingEventSkipNextCombat = false;
        log('You skip the next encounter.');
        node.cleared = true;
        advanceMapPosition();
        render();
        return;
      }
      startCombat(node);
    } else if (node.type === 'treasure') {
      state.screen = 'TREASURE';
      state.treasureOptions = rollTreasureOptions();
      render();
    } else if (node.type === 'shop') {
      state.screen = 'SHOP';
      state.shopOptions = rollShopOptions();
      state.shopTileOffer = rollShopTileOffer();
      render();
    } else if (node.type === 'event') {
      startEvent(node);
    } else if (node.type === 'rest') {
      var healed = Math.round(state.player.maxInk * 0.5);
      state.player.ink = Math.min(state.player.maxInk, state.player.ink + healed);
      log('You rest and recover ' + healed + ' ink.');
      playSfx('heal', null, playHealSound);
      node.cleared = true;
      advanceMapPosition();
      render();
    }
  };

  function rollTreasureOptions() {
    var owned = state.player.items;
    var pool = Object.keys(Items.ITEM_DEFS).filter(function (id) { return owned.indexOf(id) === -1; });
    var shuffled = state.rng.shuffle(pool);
    return shuffled.slice(0, 3);
  }

  // Boss-kill bonus reward: a second, higher-value item choice on top of the
  // normal tile reward, so beating a boss feels distinctly more rewarding
  // than a regular kill. Pool is restricted to items already marked
  // rarity 'rare'/'legendary' (see items.js) rather than the whole item
  // pool, so this is a genuine step up from a treasure-node pick, not just
  // a second roll of the same odds.
  function rollBossRewardOptions() {
    var owned = state.player.items;
    var pool = Object.keys(Items.ITEM_DEFS).filter(function (id) {
      var def = Items.ITEM_DEFS[id];
      return owned.indexOf(id) === -1 && (def.rarity === 'rare' || def.rarity === 'legendary');
    });
    var shuffled = state.rng.shuffle(pool);
    return shuffled.slice(0, 3);
  }

  Game.pickTreasureItem = function (itemId) {
    state.player.items.push(itemId);
    log('You take ' + Items.ITEM_DEFS[itemId].name + '.');
    currentNode().cleared = true;
    advanceMapPosition();
    state.screen = 'RUN';
    render();
  };

  var SHOP_VARIANT_TILE_CHANCE = 0.4; // FUN OVERHAUL 5/8: "occasionally sells one at a premium"
  var VARIANT_TILE_SHOP_PRICE = 45; // in line with a rare item's shopPrice (items.js)

  function rollShopOptions() {
    var owned = state.player.items;
    var itemPool = Object.keys(Items.ITEM_DEFS).filter(function (id) {
      return owned.indexOf(id) === -1;
    });
    var consumablePool = Wordbound.Consumables ? Object.keys(Wordbound.Consumables.CONSUMABLE_DEFS).map(function (id) { return 'c:' + id; }) : [];
    var combined = itemPool.concat(consumablePool);

    // Pin one slot to the consumable pool: FUN OVERHAUL 4/8's eight new items
    // diluted the item:consumable ratio from 15:3 to 23:3, which without this
    // left ~59% of shop rolls with zero consumables (see GOALS.md balance
    // ticket). Guaranteeing one restores the pre-4/8 "shops usually have a
    // consumable" feel without touching the pool size.
    var options = [];
    if (consumablePool.length > 0) {
      options.push(state.rng.shuffle(consumablePool)[0]);
    }
    var remainingPool = combined.filter(function (id) {
      return options.indexOf(id) === -1;
    });
    var shuffledRemaining = state.rng.shuffle(remainingPool);
    options = options.concat(shuffledRemaining.slice(0, 4 - options.length));
    return state.rng.shuffle(options);
  }

  // Rolled ONCE when the shop is entered and stored on state, not derived at
  // render time: a tile carries per-instance data (letter + variant) that no
  // static def lookup can reconstruct, so re-rolling it on every render would
  // make the offer change under the player's cursor and break seeded runs.
  function rollShopTileOffer() {
    return state.rng.chance(SHOP_VARIANT_TILE_CHANCE) ? Tiles.rollVariantTile(state.rng) : null;
  }

  Game.buyItem = function (itemId) {
    var isConsumable = itemId.indexOf('c:') === 0;
    var actualId = isConsumable ? itemId.substring(2) : itemId;
    var def = isConsumable ? (Wordbound.Consumables ? Wordbound.Consumables.CONSUMABLE_DEFS[actualId] : null) : Items.ITEM_DEFS[actualId];

    if (!def || !def.shopPrice) {
      log('ERROR: Item not purchasable');
      return;
    }
    if (state.player.gold < def.shopPrice) {
      log('Not enough gold! Need ' + def.shopPrice + ', have ' + state.player.gold + '.');
      return;
    }
    if (!isConsumable && state.player.items.indexOf(actualId) !== -1) {
      log('You already own ' + def.name + '!');
      return;
    }
    state.player.gold -= def.shopPrice;
    if (isConsumable) {
      state.player.consumables.push(actualId);
    } else {
      state.player.items.push(actualId);
      // Re-roll shop options so the bought item is replaced with a new option
      state.shopOptions = rollShopOptions();
    }
    log('You bought ' + def.name + ' for ' + def.shopPrice + ' gold.');
    playSfx('purchase', null, playPurchaseSound);
    render();
  };

  // FUN OVERHAUL 5/8: buys the shop's premium variant tile. Kept separate
  // from Game.buyItem since a tile isn't looked up from a static *_DEFS table
  // like every other purchasable thing -- it's an instance held on state.
  Game.buyShopTile = function () {
    var offer = state.shopTileOffer;
    if (!offer) return;
    if (state.player.gold < VARIANT_TILE_SHOP_PRICE) {
      log('Not enough gold! Need ' + VARIANT_TILE_SHOP_PRICE + ', have ' + state.player.gold + '.');
      return;
    }
    state.player.gold -= VARIANT_TILE_SHOP_PRICE;
    state.deck.push(offer);
    log('You bought a ' + Tiles.describeVariant(offer.variant) + ' tile for ' + VARIANT_TILE_SHOP_PRICE + ' gold.');
    playSfx('purchase', null, playPurchaseSound);
    // Re-roll so the sold tile isn't left on the shelf as a dead, already-
    // owned option (same reason Game.buyItem re-rolls its own list).
    state.shopTileOffer = rollShopTileOffer();
    render();
  };

  Game.leaveShop = function () {
    currentNode().cleared = true;
    advanceMapPosition();
    state.screen = 'RUN';
    state.shopOptions = null;
    state.shopTileOffer = null;
    render();
  };

  // ---- events ---------------------------------------------------------

  function startEvent(node) {
    var Events = window.Wordbound && window.Wordbound.Events;
    if (!Events || !Events.EVENT_DEFS[node.defId]) return;
    var eventDef = Events.EVENT_DEFS[node.defId];
    state.currentEvent = {
      id: node.defId,
      def: eventDef,
      name: eventDef.name,
      text: eventDef.text,
      choices: eventDef.choices
    };
    state.screen = 'EVENT';
    render();
  }

  Game.chooseEventOption = function (choiceIndex) {
    if (!state.currentEvent || !state.currentEvent.choices || choiceIndex < 0 || choiceIndex >= state.currentEvent.choices.length) return;
    var choice = state.currentEvent.choices[choiceIndex];
    // A choice the player can't afford (or that has nothing left to give) is
    // rendered disabled -- re-check here too so a stale click or a scripted
    // call can't bypass the cost.
    if (choice.disabledReason && choice.disabledReason(state)) return;
    var result = choice.effect(state);
    // A choice returns either a plain log message or { message, hold } --
    // 'hold' means a sub-screen takes over and the node resolves later.
    var message = typeof result === 'string' ? result : (result && result.message);
    if (message) log(message);

    if (result && result.hold === 'SHREDDER') {
      state.shredderSelection = [];
      state.screen = 'SHREDDER';
      render();
      return;
    }

    finishEvent();
  };

  // Clears the event node and walks on. Split out of chooseEventOption so a
  // held sub-screen (the Shredder) can resolve the same node once it's done.
  function finishEvent() {
    currentNode().cleared = true;
    advanceMapPosition();
    state.currentEvent = null;
    state.screen = 'RUN';
    render();
  }

  // ---- the Shredder (GOALS.md "FUN OVERHAUL 7/8") -------------------------

  // How many more tiles the player may still feed in: the event's own cap,
  // further limited so the deck never drops below SHREDDER_MIN_DECK_SIZE.
  function shredderRemainingPicks() {
    var Events = window.Wordbound.Events;
    var byCap = Events.SHREDDER_MAX_TILES - state.shredderSelection.length;
    var byDeckFloor = state.deck.length - Events.SHREDDER_MIN_DECK_SIZE - state.shredderSelection.length;
    return Math.max(0, Math.min(byCap, byDeckFloor));
  }
  Game._shredderRemainingPicks = shredderRemainingPicks; // exposed for headless test inspection only

  Game.toggleShredderTile = function (tileId) {
    if (state.screen !== 'SHREDDER') return;
    var at = state.shredderSelection.indexOf(tileId);
    if (at !== -1) {
      state.shredderSelection.splice(at, 1);
    } else {
      if (shredderRemainingPicks() <= 0) return;
      if (!state.deck.some(function (t) { return t.id === tileId; })) return;
      state.shredderSelection.push(tileId);
    }
    render();
  };

  Game.confirmShredder = function () {
    if (state.screen !== 'SHREDDER') return;
    var doomed = state.shredderSelection.slice();
    if (doomed.length === 0) {
      log('You feed it nothing. The Shredder idles, visibly let down.');
    } else {
      var letters = state.deck
        .filter(function (t) { return doomed.indexOf(t.id) !== -1; })
        .map(function (t) { return t.letter === '?' ? '★' : t.letter; });
      state.deck = state.deck.filter(function (t) { return doomed.indexOf(t.id) === -1; });
      log('The Shredder devours ' + letters.join(' and ') + '. Gone for good, and it seems happy about it.');
    }
    state.shredderSelection = [];
    finishEvent();
  };

  // ---- combat ---------------------------------------------------------

  function startCombat(node) {
    state.monster = node.type === 'boss' ? Monsters.createBoss(node.defId) : Monsters.createMonster(node.defId);
    // Elites reuse regular MONSTER_DEFS (floor.js pickEliteDefId pulls from
    // the same 'strong'-tier pool a plain floor-3 fight can also draw), so
    // "is this fight an elite" lives on the node, not the def -- tag the
    // instance here so Intents.rollIntent knows whether the def's signature
    // pool (hex/devour/mend/enrage) is actually live for this fight.
    state.monster.isElite = node.type === 'elite';
    // FUN OVERHAUL 6/8 (GOALS.md, 2026-08-20): an elite fights with the
    // resistance trait rolled onto its node at floor-generation time (the
    // same trait the node pill already warned the player about), REPLACING
    // the def's normal single-phase trait. Only for elites -- the same
    // strong-tier def fought as a plain floor combat keeps its ordinary
    // trait. Guarded on eliteTraitId so a save/floor generated before this
    // change (no eliteTraitId) simply keeps the def's own trait.
    if (state.monster.isElite && node.eliteTraitId) {
      state.monster.traitPhases = [{ hpThreshold: 1.0, traitId: node.eliteTraitId }];
    }
    // FUN OVERHAUL 5/8: a Volatile tile that cracked last fight is only
    // "unusable for the rest of the fight" -- clear the flag on every deck
    // tile (the persistent tile objects, not just this fight's pile) so it's
    // back in the draw pool for this new fight, same "fight-scoped, not
    // permanent" pattern Devour's tile removal already uses.
    state.deck.forEach(function (t) { t.crackedThisFight = false; });
    state.pile = { drawPile: Tiles.shuffleIntoDrawPile(state.deck, state.rng), discardPile: [] };
    state.player.rack = [];
    state.comboState = { combo: 0, usedWords: new Set() };
    state.previousWordThisFight = null;
    state.wordsPlayedThisFightCount = 0;
    state.overchargeArmed = false; // INK SPEND: Overcharge toggle, per-fight reset
    state.repeatedWordThisFight = false;
    state.hexedTileId = null;
    state.proccedItemIds = [];
    state.comboBumped = false;
    state.selectedTileIds = [];
    state.blankAssignments = {};
    state.settleTileIds = [];
    state.blankPickerOpen = false;
    state.blankPickerTileId = null;
    Items.runHook('onRunStart', { player: state.player, pileState: state.pile }, state.player);
    refillRack();
    ensureRackIsPlayable();
    state.combatActive = true;
    var isBoss = node.type === 'boss';
    // DUEL-GAUGE COMBAT ticket (GOALS.md, integration run): a monster whose
    // def carries a `.piece` (music.js piece data) fights a real-time gauge
    // duel instead of the turn-based loop -- see Game.startDuelFight's own
    // header for why this is a TRUE NO-OP today (no monsters.js entry sets
    // `.piece` yet). state.duel/duelSequencer/duelPiece are reset here
    // regardless, defensively, so a stray leftover from an aborted previous
    // fight can never bleed into this one.
    state.duel = null;
    state.duelSequencer = null;
    state.duelPiece = null;
    state.duelApproachingCrescendo = null;
    if (state.monster.piece) {
      Game.startDuelFight(state.monster.piece);
    } else {
      startBackgroundMusic(isBoss);
    }
    if (isBoss) playSfx('bossEntrance', null, playBossEntranceSound);
    log(state.monster.name + ' appears!');
    // BOSS ENTRANCE CUTSCENES ticket (GOALS.md): shown AFTER combat/duel
    // state is already fully live (state.combatActive/state.duel/the
    // sequencer above), never before -- the cutscene is a skippable overlay
    // ON TOP of an already-real fight, not a gate the fight waits behind.
    // A true no-op for a non-boss node, a boss whose defId has no entrance
    // content yet (bossEntrances.js), or the React tree (its own
    // BossEntranceOverlay.jsx component handles this independently).
    state.monster._entranceSeen = false;
    if (isBoss) {
      var entrance = window.Wordbound.BossEntrances.getEntrance(state.monster.defId, state.monster.name);
      if (entrance) showBossEntrance(entrance);
      else state.monster._entranceSeen = true;
    } else {
      state.monster._entranceSeen = true;
    }
    // Telegraphed monster actions (GOALS.md "FUN OVERHAUL 2/8"): pre-roll
    // what the monster does on ITS first turn before the player acts --
    // skipped for a duel fight, which has no discrete "monster's turn"
    // (Intents is retired for gauge fights, per this ticket's own decision).
    if (!state.monster.duel) {
      state.monster.intent = Intents.rollIntent(state.monster, state.rng);
    }
    render();
    if (!hasSeenHowToPlay()) {
      Game.openHowToPlay();
    }
  }

  function refillRack() {
    var capacity = Items.getRackCapacity(state.player);
    var needed = capacity - state.player.rack.length;
    if (needed <= 0) return;
    var drawn = Tiles.draw(state.pile, needed, state.rng);
    var ctx = { player: state.player, drawnTiles: drawn, pileState: state.pile, rng: state.rng };
    Items.runHook('onDraw', ctx, state.player);
    state.player.rack = state.player.rack.concat(ctx.drawnTiles);
    state.rackJustRefilled = true;
  }

  // A rack that can spell nothing is a permanent dead end: combat only offers
  // "play a word," and the rack only ever cycles after a word is actually
  // played, so an unplayable rack leaves the player with no possible action,
  // forever. balance-simulation.js (2026-08-19, 30 runs) found this hit ~25%
  // of runs with the Scribe character specifically (its deck is vowel-poor).
  // Rather than add a new discard/redraw mechanic, silently reshuffle and
  // redraw when this happens -- bounded attempts as a safety net against a
  // pathological near-empty pool; in practice one retry is always enough.
  var UNPLAYABLE_RACK_RETRY_LIMIT = 5;
  function ensureRackIsPlayable() {
    var attempts = 0;
    while (!Lexicon.hasPlayableWord(state.player.rack) && attempts < UNPLAYABLE_RACK_RETRY_LIMIT) {
      state.pile.discardPile = state.pile.discardPile.concat(state.player.rack);
      state.player.rack = [];
      refillRack();
      attempts++;
    }
    if (attempts > 0) {
      log('Your hand had no playable words -- the shelves rearranged themselves.');
    }
  }

  // Slay the Spire-style rack: whatever's left in the rack after a word is
  // played (used AND unused tiles) goes to the discard pile, then the rack
  // is fully redrawn. Tiles.draw reshuffles the discard pile back in when
  // the draw pile runs dry, so this never stalls mid-fight.
  // Page Turn consumable can change this: if active, unused tiles stay in hand
  // instead of being discarded.
  function cycleRackAfterWord(tilesUsed) {
    var unusedTiles = state.player.rack;

    // If Page Turn is active, keep unused tiles; otherwise discard them
    if (!state.player.skipDiscardNextTurn) {
      state.pile.discardPile = state.pile.discardPile.concat(unusedTiles);
    }

    // Always discard the used tiles -- EXCEPT a Volatile tile that just
    // cracked (FUN OVERHAUL 5/8, flagged by submitWord right after playWord
    // resolves): a cracked tile is "unusable for the rest of the fight," so
    // it must not re-enter a pile that could reshuffle it back into the draw
    // pile. Leaving it out of both piles is enough -- startCombat clears the
    // flag on the underlying deck tile at the start of the next fight, so
    // nothing here touches the persistent deck.
    var stillActive = tilesUsed.filter(function (t) { return !t.crackedThisFight; });
    state.pile.discardPile = state.pile.discardPile.concat(stillActive);

    // Clear the rack
    if (state.player.skipDiscardNextTurn) {
      // Page Turn: keep unused tiles, refill to full capacity, then draw bonus
      var bonusCount = state.player.bonusTilesToDraw || 0;
      var targetRackSize = Items.getRackCapacity(state.player) + bonusCount;
      var tilesToDraw = targetRackSize - unusedTiles.length;

      if (tilesToDraw > 0) {
        var drawn = Tiles.draw(state.pile, tilesToDraw, state.rng);
        var ctx = { player: state.player, drawnTiles: drawn, pileState: state.pile, rng: state.rng };
        Items.runHook('onDraw', ctx, state.player);
        state.player.rack = unusedTiles.concat(ctx.drawnTiles);
      }
      // Note: deliberately NOT setting rackJustRefilled here -- Page Turn keeps some
      // tiles in place (they shouldn't re-animate), only the newly drawn bonus tiles
      // should slide in, which the normal per-tile-id diff below already handles correctly.

      // Reset Page Turn flags
      state.player.skipDiscardNextTurn = false;
      state.player.bonusTilesToDraw = 0;
    } else {
      // Normal path: clear and refill
      state.player.rack = [];
      refillRack();
    }

    ensureRackIsPlayable();
  }

  var TILE_PLAY_ANIM_MS = 220; // matches .tile-played's animation-duration in wordbound.css
  var MONSTER_DEATH_BEAT_MS = 500; // matches .monster-defeated's animation-duration in wordbound.css
  var VOLATILE_CRACK_CHANCE = 0.25; // FUN OVERHAUL 5/8: rolled once per Volatile tile actually played
  var GILDED_GOLD_PER_TILE = 2;
  var VAMPIRIC_HEAL_PER_TILE = 1;
  // FUN OVERHAUL 8/8 (celebration juice): thresholds for the big-hit / long-word
  // call-outs. CRUSHING fires on a single word landing >= this much damage;
  // MAGNIFICENT fires on a word this many letters or longer and pays a small
  // bonus gold on top. Both cosmetic + a small reward, no new mechanics.
  var CRUSHING_DAMAGE_THRESHOLD = 25;
  var MAGNIFICENT_WORD_LENGTH = 7;
  var MAGNIFICENT_BONUS_GOLD = 5;

  function markTilesPlayed(tilesUsed) {
    var rack = $('rack-display');
    if (!rack) return;
    tilesUsed.forEach(function (tile) {
      var btn = rack.querySelector('[data-tile-id="' + tile.id + '"]');
      if (btn) btn.classList.add('tile-played');
    });
  }

  // DUEL-GAUGE COMBAT ticket (GOALS.md, integration run): the actual
  // cutover the ticket's "Next" note called for. Starts a real-time gauge
  // duel for the CURRENT state.monster against `piece` (a music.js piece
  // data module) -- creates the live Duel + Music sequencer, wires the
  // sequencer's 'crescendo-peak' event into the duel's parry window, keeps
  // state.player.healthBlocks synced (DuelCombat.syncHealthBlocks), and
  // ends the run on 'player-defeated' the same way the turn-based ink<=0
  // path already does. Called automatically from startCombat below when
  // the fought monster carries a `.piece` field -- a TRUE NO-OP today,
  // since no entry in monsters.js sets one yet (that's REGULAR ENEMIES' /
  // the boss-piece-assignment work's job, both still open queue items);
  // this is the forward-compatible wiring so a future run only needs to add
  // piece data, not touch this integration again.
  // opts.audioContext/opts.destination are dependency-injection points for
  // tests (a hand-built fake AudioContext, same convention music.test.js/
  // duelCombat.test.js already use) -- production calls (from startCombat)
  // omit both and get the real, lazily-initialized shared audio graph.
  // Per the ticket's own "don't keep two life systems" call: ink survives
  // ONLY as a spend resource (Overcharge/Rewrite) in a duel fight -- it is
  // NOT read as health anywhere on this path.
  Game.startDuelFight = function (piece, opts) {
    opts = opts || {};
    var monster = state.monster;
    if (!monster || !Duel || !Music || !DuelCombat) return null;
    monster.duel = true;

    var ctx = opts.audioContext || initAudioContext();
    var destination = opts.destination || ensureMusicGainNode(ctx);
    stopBackgroundMusic(); // the sequencer below owns this fight's audio, not the placeholder loop

    var sequencer = Music.createSequencer(ctx, destination, piece);
    sequencer.play();
    if (largoEnabled) sequencer.setTempoScale(LARGO_TEMPO_SCALE); // Largo assist: a fight that starts with it already on begins slow, not just toggled-slow mid-fight

    var pushesToDefeat = opts.pushesToDefeat != null ? opts.pushesToDefeat
      : (monster.pushesToDefeat != null ? monster.pushesToDefeat : (monster.isBoss ? 3 : 1));
    var duel = Duel.create({
      stageTier: piece.stageTier,
      healthBlocks: state.player.healthBlocks,
      pushesToDefeat: pushesToDefeat
    });
    // Second Wind's retarget (GOALS.md, DUEL-GAUGE COMBAT ticket's own
    // flagged gap): turn-based combat gives onPlayerDamaged a chance to cap
    // ctx.damage before it lands; a duel fight has no per-word damage amount
    // to cap, only a discrete Verse (health block) loss, decided entirely
    // inside duel.js's own loseBlock -- so the equivalent save point is
    // 'block-lost' itself. Registered BEFORE syncHealthBlocks below so a
    // revival lands before player.healthBlocks is read: 'block-lost'
    // listeners run in registration order, and loseBlock's own
    // player-defeated check (which fires AFTER every 'block-lost' listener
    // has run, per duel.js's own emit-then-check order) reads the live
    // duel.healthBlocks this hook may have just revived from 0 back to 1 --
    // no duel.js change needed, since a listener mutating the engine's own
    // state mid-emit is enough to cancel the pending defeat check.
    duel.on('block-lost', function () {
      Items.runHook('onDuelBlockLost', { player: state.player, duel: duel, monster: monster }, state.player);
    });
    DuelCombat.syncHealthBlocks(state.player, duel);
    duel.on('player-defeated', function () {
      sequencer.stop();
      state.combatActive = false;
      endRun(false);
    });
    sequencer.on('crescendo-peak', function (c) {
      duel.registerCrescendoPeak(ctx.currentTime);
      // The peak just landed -- if it's the one the warning banner was
      // counting down to, clear it rather than let it sit on a stale
      // (now-negative) countdown until the next 'crescendo-approaching'
      // overwrites it. Guarded by id so an unrelated, still-pending
      // crescendo (a piece with several close together) isn't clobbered.
      if (state.duelApproachingCrescendo && state.duelApproachingCrescendo.id === c.id) {
        state.duelApproachingCrescendo = null;
      }
    });
    // Telegraph the crescendo before it hits (the ticket's own TELEGRAPH
    // bullet: "the player must SEE the music coming"). beatToTime() converts
    // the crescendo's peakBeat into a real ctx.currentTime-axis timestamp
    // ONCE, at the moment the sequencer decides to warn -- Game.
    // getApproachingCrescendoSecondsAway (below) just subtracts the live
    // clock reading from that fixed point every frame, so the countdown
    // stays accurate even under a tempo-scale change made after this fires
    // (a later setTempoScale rebases the sequencer's own anchor, but this
    // stored peakTime was already computed against the CURRENT tempo at
    // warning time -- acceptable since Largo isn't wired to fire mid-duel
    // yet, and re-deriving on every read would need re-calling beatToTime
    // with the crescendo's beat, which this event payload already gives us
    // cheaply here instead).
    sequencer.on('crescendo-approaching', function (c) {
      state.duelApproachingCrescendo = { id: c.id, peakTime: sequencer.beatToTime(c.peakBeat) };
    });

    state.duel = duel;
    state.duelSequencer = sequencer;
    state.duelPiece = piece;
    state.duelApproachingCrescendo = null;
    return duel;
  };

  // The shared clock a duel-mode fight's tick loop / word submissions run
  // on -- always the sequencer's own AudioContext time, so the gauge push,
  // the parry window, and the music's own scheduling never drift apart.
  // Falls back to 0 outside a duel fight (never actually read there).
  Game.getDuelClockNow = function () {
    return audioContext ? audioContext.currentTime : 0;
  };

  // The live countdown VolumeGauge's crescendo-warning banner reads, per
  // the DUEL-GAUGE COMBAT ticket's own TELEGRAPH bullet. `now` should be
  // the same Game.getDuelClockNow() reading the caller's tick loop already
  // has (kept as a parameter, not read internally, so this stays pure and
  // matches Game.tickDuel's own signature convention). Returns null when no
  // crescendo is pending -- either none has been warned about yet, or its
  // peak already landed (crescendo-peak's own handler above should have
  // cleared it by then, but the `<= 0` guard here is a defensive backstop
  // against a stale value on a dropped frame, same "never show a negative
  // countdown" reasoning VolumeGauge's own showCrescendoWarning check applies).
  Game.getApproachingCrescendoSecondsAway = function (now) {
    var c = state.duelApproachingCrescendo;
    if (!c) return null;
    var secondsAway = c.peakTime - now;
    return secondsAway > 0 ? secondsAway : null;
  };

  // Called every animation frame by CombatScreen.jsx's own requestAnimation-
  // Frame loop (per-frame, deliberately NOT run through act()/render() --
  // same "mutate state directly, let the caller decide when to force a real
  // re-render" pattern the staged-tile drag system already established) --
  // advances the gauge by the music's continuous push. No-op outside an
  // active duel fight, or once the duel has already resolved.
  Game.tickDuel = function (now, dt) {
    if (!state.duel || !state.duelSequencer) return;
    if (state.duel.isTerminal()) return;
    state.duel.tick(now, dt, state.duelSequencer.getIntensity());
  };

  // `duelNow` is only meaningful for a duel-mode fight (state.monster.duel):
  // the shared clock reading (Game.getDuelClockNow()) CombatScreen.jsx
  // passes so this word's parry check lands on the same time axis as the
  // duel's own tick()/registerCrescendoPeak() calls. Every existing
  // (turn-based) call site omits it and is completely unaffected.
  Game.submitWord = function (rawWord, duelNow) {
    if (!state.combatActive) return;
    // BOSS ENTRANCE CUTSCENES ticket (GOALS.md): see bossEntranceActive's
    // own declaration comment for why this is needed even though the
    // overlay already visually covers the fight.
    if (bossEntranceActive) return;
    // The killing blow holds combatActive true through its death beat (so
    // the combat panel stays visible while monster-info fades) -- block
    // further submissions in that window instead, or a fast second word
    // would double-process a monster that's already dead.
    if (state.monster.hp <= 0) return;
    var word = (rawWord || '').trim().toUpperCase();
    if (!word) return;

    var monsterHpBefore = state.monster.hp;

    // A Hex'd tile (monster intent, "FUN OVERHAUL 2/8") is locked for this
    // turn -- pull it out of the rack before word-formation runs so neither
    // a click-staged word (blocked separately in selectTileForWord) nor a
    // typed one can use it, then put it straight back: it isn't consumed,
    // just temporarily invisible to Combat.playWord's rack-matching.
    var hexedTile = null, hexedTileIndex = -1;
    if (state.hexedTileId) {
      hexedTileIndex = state.player.rack.findIndex(function (t) { return t.id === state.hexedTileId; });
      if (hexedTileIndex !== -1) hexedTile = state.player.rack.splice(hexedTileIndex, 1)[0];
    }

    // INK SPEND (GOALS.md INK ticket, run 2/2-4): Overcharge only ever fires
    // if it's actually armed AND still affordable right now -- re-checked
    // here rather than trusted from arm-time, since Game.toggleOvercharge
    // only lets it arm when affordable, but nothing prevents the player's
    // ink from having dropped in between (there's no such path today, but
    // this is the one point where an invalid word can't accidentally get
    // charged for, so the check belongs here regardless).
    var overcharging = !!state.overchargeArmed && state.player.ink >= Combat.OVERCHARGE_INK_COST;
    var isDuelFight = !!(state.monster.duel && state.duel);
    // DUEL-GAUGE COMBAT ticket: a duel-mode fight resolves the word's damage
    // through the gauge (DuelCombat.submitWord -- parry + push + decisive-
    // blow on a won push) instead of Combat.playWord's own direct HP
    // subtraction. Both return the same result shape (word/tilesUsed/score/
    // damage/...), so every line below that only reads `result` is shared,
    // unaffected code -- see the two duel-only branches further down for
    // the two places that genuinely differ (health-loss handling, and the
    // post-word counterattack/Intents step, which duel fights don't have).
    var result = isDuelFight
      ? DuelCombat.submitWord(state.player, state.monster, state.duel, word, state.comboState,
          duelNow != null ? duelNow : Game.getDuelClockNow(), { overcharge: overcharging })
      : Combat.playWord(state.player, state.monster, word, state.comboState, { overcharge: overcharging });

    if (hexedTile) {
      state.player.rack.splice(Math.min(hexedTileIndex, state.player.rack.length), 0, hexedTile);
    }

    if (!result) {
      log('"' + word + '" is not playable -- not a word you know, or you don\'t have those tiles.');
      playSfx('invalidWord', null, playInvalidWordSound);
      render();
      return;
    }

    // The word actually went through -- spend the ink now (never before a
    // valid word is confirmed) and disarm the toggle. Overcharge is
    // single-use per successful play, matching "spend N ink -> amplify
    // damage" on THIS word, not a standing buff.
    if (overcharging) {
      state.player.ink = Math.max(0, state.player.ink - Combat.OVERCHARGE_INK_COST);
      log('Overcharged! -' + Combat.OVERCHARGE_INK_COST + ' ink for ' + Math.round((Combat.OVERCHARGE_DAMAGE_MULTIPLIER - 1) * 100) + '% bonus damage.');
    }
    state.overchargeArmed = false;

    // Clear staging area since word was submitted
    state.selectedTileIds = [];
    state.blankAssignments = {};

    // Flag the played tiles' existing DOM elements right away, before anything
    // else touches the rack -- render() rebuilds rack-display's innerHTML
    // wholesale, which would otherwise destroy these elements before the
    // browser ever paints a frame with the animation running.
    markTilesPlayed(result.tilesUsed);

    // FUN OVERHAUL 4/8 (GOALS.md, 2026-08-20): rule-changer items need to
    // know word sequence within the fight -- previousWord (for
    // Illuminated Initial/Palimpsest) and a 1-based play count (for Errant
    // Footnote/Gilded Bookmark). Both track this call's word for the NEXT
    // one, same "before this word" convention combo.js already uses.
    state.wordsPlayedThisFightCount += 1;
    var ctx = {
      player: state.player, monster: state.monster, word: result.word, tilesUsed: result.tilesUsed, result: result,
      previousWord: state.previousWordThisFight, wordsPlayedThisFight: state.wordsPlayedThisFightCount, messages: []
    };
    Items.runHook('onWordPlayed', ctx, state.player);
    state.previousWordThisFight = result.word;
    ctx.messages.forEach(function (msg) { log(msg); });
    // FUN OVERHAUL 8/8: rule-changer procs (items whose hook logged a line this
    // word) flash their chip on the next render. Items.runHook collected them.
    state.proccedItemIds = ctx.proccedItemIds || [];

    // FUN OVERHAUL 5/8 (GOALS.md, 2026-08-20): special tile variants.
    // Charged (+4 damage) and Volatile (letters score x2) are already folded
    // into result.damage via Lexicon.scoreWord -- only Gilded's gold and
    // Vampiric's heal need resolving here (side effects on player state, not
    // part of the word's score), plus Volatile's own crack roll, which only
    // applies to tiles that were actually played this turn. Summed across
    // all matching tiles in the word (consistent with how Charged/Foreword
    // already stack per tile) and logged once per effect type so playing two
    // Gilded tiles doesn't spam two near-identical lines.
    var variantGold = 0, variantHeal = 0, crackedCount = 0;
    result.tilesUsed.forEach(function (tile) {
      if (tile.variant === Tiles.VARIANTS.GILDED) variantGold += GILDED_GOLD_PER_TILE;
      else if (tile.variant === Tiles.VARIANTS.VAMPIRIC) variantHeal += VAMPIRIC_HEAL_PER_TILE;
      else if (tile.variant === Tiles.VARIANTS.VOLATILE && state.rng.chance(VOLATILE_CRACK_CHANCE)) {
        tile.crackedThisFight = true;
        crackedCount += 1;
      }
    });
    if (variantGold > 0) {
      state.player.gold += variantGold;
      log('Gilded tile' + (variantGold > GILDED_GOLD_PER_TILE ? 's' : '') + ': +' + variantGold + ' gold!');
    }
    if (variantHeal > 0) {
      state.player.ink = Math.min(state.player.maxInk, state.player.ink + variantHeal);
      log('Vampiric tile' + (variantHeal > VAMPIRIC_HEAL_PER_TILE ? 's' : '') + ': healed ' + variantHeal + ' ink.');
    }
    if (crackedCount > 0) {
      log('A Volatile tile cracks' + (crackedCount > 1 ? ' (x' + crackedCount + ')' : '') + ' -- gone for the rest of the fight.');
    }

    var tag = result.multiplier === 0 ? ' -- no effect!' : result.multiplier > 1 ? ' -- weak point!' : '';
    log('You play "' + result.word + '" for ' + result.damage + ' damage' + tag);

    // FUN OVERHAUL 8/8 (celebration juice): a 7+ letter word is a "MAGNIFICENT!"
    // play worth a small bonus gold on top of its damage. State mutation +
    // logging here (synchronous); the banner/floater/shake visuals are applied
    // after render() in the deferred block below. Gold counts toward the
    // end-of-run stats (review N6), same as any other gold this fight.
    var magnificent = result.word.length >= MAGNIFICENT_WORD_LENGTH;
    if (magnificent) {
      state.player.gold += MAGNIFICENT_BONUS_GOLD;
      if (state.runStats) state.runStats.goldEarned += MAGNIFICENT_BONUS_GOLD;
      log('MAGNIFICENT! A ' + result.word.length + '-letter word -- +' + MAGNIFICENT_BONUS_GOLD + ' gold.');
    }
    // The combo streak advanced this word (a distinct, non-repeat play) -- flag
    // it so renderCombat gives the combo chip an extra bump, not just its
    // baseline per-render pop.
    state.comboBumped = !result.isRepeat && (state.comboState && state.comboState.combo || 0) > 0;

    if (result.isRepeat) {
      // Word novelty (GOALS.md "FUN OVERHAUL 1/8"): repeating a word already
      // played this fight is weak (x0.4, already folded into result.damage
      // above) and resets the combo -- flag it in the log so the damage dip
      // reads as a choice's consequence, not a bug.
      log('The Archive has heard that one before.');
      // A repeat also loses a live Wager with the Stacks (FUN OVERHAUL 7/8).
      // Recorded here rather than resolved: the wager only pays out (or
      // doesn't) once the fight is actually won.
      state.repeatedWordThisFight = true;
      if (state.activeWager) log('The Stacks heard that. The wager is lost.');
    } else if (result.comboAtPlay > 0) {
      log('Combo x' + result.comboAtPlay + '! +' + Math.round(result.comboAtPlay * 12) + '% damage.');
    }

    // A rule-changer item's own self-damage (Cursed Quill) lands on the
    // player's OWN turn, inside the onWordPlayed hook above -- before the
    // monster ever gets a counterattack. The normal player-death check
    // further down only covers the counterattack path, and the killing-blow
    // branch below never checks player ink at all (it didn't need to before
    // an item could hurt the player on their own turn) -- so a word that
    // kills the monster AND, via Cursed Quill, drops the player to 0 in the
    // same blow would otherwise fall through to the reward screen with a
    // "dead" player still in play. Catch it here, after the log lines above
    // so the player sees what happened, but before either branch runs.
    // DUEL-GAUGE COMBAT ticket ("don't keep two life systems"): a duel
    // fight's real health is healthBlocks, not ink -- ink dropping to 0 from
    // a same-turn item hook (e.g. Cursed Quill) is just a spend-resource
    // side effect there, not a death condition. Genuine duel-mode death
    // (healthBlocks reaching 0) is instead caught by the 'player-defeated'
    // handler Game.startDuelFight wires directly to the duel engine.
    if (!isDuelFight && state.player.ink <= 0) {
      state.combatActive = false;
      endRun(false);
      return;
    }

    if (Achievements) Achievements.trackDamage(result.damage);

    // Apply Index Card Shard bonus damage if active
    if (state.player.bonusDamageUntilEndOfTurn > 0) {
      var bonusDmg = state.player.bonusDamageUntilEndOfTurn;
      state.monster.hp = Math.max(0, state.monster.hp - bonusDmg);
      result.damage += bonusDmg;
      log('Index Card Shard bonus: +' + bonusDmg + ' damage!');
      state.player.bonusDamageUntilEndOfTurn = 0;
    }

    // End-of-run stats (review N6): every successful word play counts,
    // repeats included -- this tracks what the player actually did, same as
    // the log line above, not just their best-strategy plays. result.damage
    // is final by this point (trait/combo/repeat multipliers and any bonus
    // damage above already folded in).
    if (state.runStats) {
      state.runStats.wordsPlayed += 1;
      state.runStats.totalDamage += result.damage;
      if (result.damage > state.runStats.bestWordDamage) {
        state.runStats.bestWordDamage = result.damage;
        state.runStats.bestWord = result.word;
      }
    }

    // Everything from here on rebuilds the rack (directly or via render()),
    // which would cut the tile-play animation short -- deferred by
    // TILE_PLAY_ANIM_MS so it's actually visible before that happens.
    setTimeout(function () {
      if (state.monster.hp <= 0) {
        // Killing blow still gets the same feedback as any other hit
        // (render() first so the HP bar reflects 0 before it flashes, same
        // ordering the survive path below uses and for the same reason --
        // render() rebuilds monster-info wholesale and would otherwise wipe
        // out the damage-number/flash-damage elements before they paint).
        // Then hold a short, non-blocking death beat (dim the monster-info
        // panel via CSS) before switching to the reward screen, so a killing
        // blow doesn't hard-cut straight past the moment of the kill.
        render();
        animateDamage(result.damage);
        celebrateHit(result.damage, magnificent);
        emitDamageLanded({
          damage: result.damage,
          magnificent: magnificent,
          crushing: result.damage >= CRUSHING_DAMAGE_THRESHOLD,
          monsterDied: true,
          isDuel: isDuelFight,
          pushWon: isDuelFight ? !!(result.duelPush && result.duelPush.pushWon) : false
        });
        if (result.damage > 0) playCombatSound(result.damage, result.comboAtPlay);
        var monsterInfo = $('monster-info');
        if (monsterInfo) monsterInfo.classList.add('monster-defeated');
        setTimeout(function () {
          onMonsterDefeated(result.damage, monsterHpBefore);
        }, MONSTER_DEATH_BEAT_MS);
        return;
      }

      cycleRackAfterWord(result.tilesUsed);
      // Any Hex from a PREVIOUS monster turn applied to the rack that just
      // got discarded -- clear it before the monster's action below maybe
      // sets a fresh one on the new rack.
      state.hexedTileId = null;

      // DUEL-GAUGE COMBAT ticket: a duel fight has no discrete "monster's
      // turn" to resolve here -- the enemy's offense is the music's
      // CONTINUOUS push, already being applied every animation frame by
      // CombatScreen.jsx's own loop (Game.tickDuel), independent of word
      // submission. Intents is retired for gauge fights entirely (GOALS.md,
      // 2026-08-22 decision note on this ticket) -- surviving this word just
      // means the rack cycled and the duel carries on.
      if (isDuelFight) {
        render();
        animateDamage(result.damage);
        celebrateHit(result.damage, magnificent);
        emitDamageLanded({
          damage: result.damage,
          magnificent: magnificent,
          crushing: result.damage >= CRUSHING_DAMAGE_THRESHOLD,
          monsterDied: false,
          isDuel: true,
          pushWon: !!(result.duelPush && result.duelPush.pushWon)
        });
        if (result.damage > 0) playCombatSound(result.damage, result.comboAtPlay);
        return;
      }

      // Execute the monster's pre-telegraphed intent (GOALS.md
      // "FUN OVERHAUL 2/8") rather than a flat counterattack. Falls back to
      // a plain attack if somehow nothing was rolled (shouldn't happen --
      // startCombat/this same block always rolls the next one below --
      // defensive only).
      var intent = state.monster.intent || { type: 'attack', value: state.monster.attack || 0 };
      var actionResult = Intents.executeIntent(intent, {
        player: state.player, monster: state.monster, turnDamage: result.damage, rng: state.rng
      });
      if (actionResult.tileLockedId) state.hexedTileId = actionResult.tileLockedId;
      if (actionResult.tileDevouredLetter) ensureRackIsPlayable(); // devour can empty an unlucky rack

      var dmgCtx = { player: state.player, monster: state.monster, damage: actionResult.damage };
      if (dmgCtx.damage > 0) {
        Items.runHook('onPlayerDamaged', dmgCtx, state.player);
        state.player.ink = Math.max(0, state.player.ink - dmgCtx.damage);
      }
      log(actionResult.message);

      if (state.player.ink <= 0) {
        state.combatActive = false;
        endRun(false);
        return;
      }

      // Roll what the monster does NEXT, before rendering, so the intent
      // line shown for the player's upcoming turn is already up to date.
      state.monster.intent = Intents.rollIntent(state.monster, state.rng);

      render();

      // Animations run AFTER render(), not before: render() rebuilds
      // monster-info's innerHTML wholesale, which would instantly destroy any
      // damage-number element or flash-damage class applied beforehand -- the
      // browser never gets a paint frame to show it. Running these after
      // render() means they act on the freshly-rendered elements and persist
      // until their own timeouts clean them up.
      animateDamage(result.damage);
      celebrateHit(result.damage, magnificent);
      emitDamageLanded({
        damage: result.damage,
        magnificent: magnificent,
        crushing: result.damage >= CRUSHING_DAMAGE_THRESHOLD,
        monsterDied: false,
        isDuel: false,
        pushWon: false
      });
      if (result.damage > 0) playCombatSound(result.damage, result.comboAtPlay);
      if (dmgCtx.damage > 0) {
        animatePlayerDamage();
        emitPlayerDamaged({ damage: dmgCtx.damage });
        playCounterattackSound(dmgCtx.damage, state.monster.isBoss);
      }
    }, TILE_PLAY_ANIM_MS);
  };

  // INK SPEND 1/2 (GOALS.md INK ticket, run 2/2-4): arms/disarms Overcharge
  // for the NEXT word submitted. Only arms when affordable right now -- the
  // button itself is also disabled below that threshold (render()), this is
  // the belt-and-suspenders check for any other caller (tests included).
  // Ink is not spent here; Game.submitWord spends it only once a word
  // actually goes through, and disarms the flag itself.
  Game.toggleOvercharge = function () {
    if (!state.combatActive || state.monster.hp <= 0) return;
    if (!state.overchargeArmed) {
      if (state.player.ink < Combat.OVERCHARGE_INK_COST) {
        log('Not enough ink to overcharge (need ' + Combat.OVERCHARGE_INK_COST + ').');
        render();
        return;
      }
      state.overchargeArmed = true;
    } else {
      state.overchargeArmed = false;
    }
    render();
  };

  // INK SPEND 2/2: the other candidate from the ticket ("consumable-style
  // activated abilities costing ink") -- discard the whole rack and draw a
  // fresh one, for ink, WITHOUT ending the turn (no monster counterattack).
  // A tactical option, not a softlock fix -- ensureRackIsPlayable() already
  // guarantees the rack always has at least one playable word (see its own
  // comment above), so this exists purely for "I don't like this hand."
  Game.rewriteRack = function () {
    if (!state.combatActive || state.monster.hp <= 0) return;
    if (state.player.ink < Combat.REWRITE_INK_COST) {
      log('Not enough ink to rewrite your rack (need ' + Combat.REWRITE_INK_COST + ').');
      render();
      return;
    }
    state.player.ink -= Combat.REWRITE_INK_COST;
    state.pile.discardPile = state.pile.discardPile.concat(state.player.rack);
    state.player.rack = [];
    state.selectedTileIds = [];
    state.blankAssignments = {};
    state.hexedTileId = null; // the hexed tile itself just got discarded along with the rest of the rack
    refillRack();
    ensureRackIsPlayable();
    log('You spend ' + Combat.REWRITE_INK_COST + ' ink to rewrite your rack.');
    render();
  };

  function onMonsterDefeated(damageDealt, monsterHpBefore) {
    // DUEL-GAUGE COMBAT ticket: a duel fight's sequencer owns this fight's
    // audio (Game.startDuelFight stopped the placeholder loop to start it);
    // it must be stopped and the duel-scoped state cleared here so the NEXT
    // fight starts clean regardless of whether it's turn-based or another
    // duel. True no-op today (state.duel is only ever set by
    // startDuelFight, itself only reachable via a monster.piece that
    // doesn't exist yet).
    if (state.duel) {
      if (state.duelSequencer) state.duelSequencer.stop();
      state.duel = null;
      state.duelSequencer = null;
      state.duelPiece = null;
      state.duelApproachingCrescendo = null;
    }
    var goldDrop = [0, 0];
    if (state.monster.isBoss) {
      var bossDef = Monsters.BOSS_DEFS[state.monster.defId];
      goldDrop = (bossDef && bossDef.goldDrop) || [0, 0];
    } else {
      var def = Monsters.MONSTER_DEFS[state.monster.defId];
      goldDrop = (def && def.goldDrop) || [0, 0];
    }

    var baseGold = state.rng.randInt(goldDrop[0], goldDrop[1]);
    var overkill = Math.max(0, damageDealt - monsterHpBefore);
    // Capped at the monster's own max drop (review N1/N2/N3, 2026-08-20):
    // uncapped, a one-shot kill's overkill bonus could exceed the monster's
    // entire base drop, rewarding the very play pattern (one-shotting) the
    // rest of this balance pass exists to discourage.
    var bonusGold = Math.min(goldDrop[1], Math.floor(overkill * 0.5));
    var totalGold = baseGold + bonusGold;
    // FUN OVERHAUL 6/8 (GOALS.md, 2026-08-20): elites pay 1.5x gold, the
    // reward half of their opt-in risk/reward.
    var isElite = !!state.monster.isElite;
    if (isElite) totalGold = Math.round(totalGold * 1.5);
    state.player.gold += totalGold;
    if (state.runStats) {
      state.runStats.monstersDefeated += 1;
      state.runStats.goldEarned += totalGold;
    }

    var goldMsg = 'Defeated ' + state.monster.name + '! Gained ' + totalGold + ' gold';
    if (bonusGold > 0) goldMsg += ' (including ' + bonusGold + ' overkill bonus)';
    if (isElite) goldMsg += ' (elite 1.5x)';
    goldMsg += '.';
    log(goldMsg);
    if (totalGold > 0) playSfx('goldGain', null, playGoldGainSound);

    // A Wager with the Stacks (GOALS.md "FUN OVERHAUL 7/8") rides on the
    // NEXT fight after the event: winning it without ever repeating a word
    // pays out, a repeat forfeits the already-deducted stake. Resolved on the
    // kill (win condition met) and cleared either way, so it can't ride on to
    // a later fight. Losing the fight instead ends the run, which forfeits it
    // by simply never reaching here.
    if (state.activeWager) {
      if (state.repeatedWordThisFight) {
        log('The wager is settled: you repeated yourself. Your ' + state.activeWager.stake + ' gold stays with the Stacks.');
      } else {
        state.player.gold += state.activeWager.payout;
        if (state.runStats) state.runStats.goldEarned += state.activeWager.payout;
        log('Not one word twice -- the Stacks pay out ' + state.activeWager.payout + ' gold!');
      }
      state.activeWager = null;
    }

    // FUN OVERHAUL 6/8: an elite guarantees a rule-changer item (the 4/8
    // pool). Granted directly rather than as a choice screen -- "a guaranteed
    // drop" -- from the items the player doesn't already own. If somehow all
    // 8 are owned, nothing drops (rare, and there's nothing left to give).
    if (isElite && Items.RULE_CHANGER_IDS) {
      var unownedRuleChangers = Items.RULE_CHANGER_IDS.filter(function (id) {
        return state.player.items.indexOf(id) === -1;
      });
      if (unownedRuleChangers.length > 0) {
        var granted = state.rng.choice(unownedRuleChangers);
        state.player.items.push(granted);
        log('The elite drops ' + Items.ITEM_DEFS[granted].name + '!');
      }
    }

    // Small chance to drop a consumable item
    if (Wordbound.Consumables && state.rng.next() < Wordbound.Consumables.getConsumableDropChance()) {
      var droppedConsumable = Wordbound.Consumables.rollConsumableDrop(state.rng);
      if (droppedConsumable) {
        state.player.consumables.push(droppedConsumable);
        var consumableName = Wordbound.Consumables.CONSUMABLE_DEFS[droppedConsumable].name;
        log('You found an ' + consumableName + '!');
      }
    }

    state.combatActive = false;
    currentNode().cleared = true;
    var wasBoss = currentNode().type === 'boss';
    // Review F2 (2026-08-20): boss music never stopped after the boss died
    // -- switch back to the normal loop (the map's own music) right away
    // rather than letting the tense boss theme bleed through the tile
    // reward, the hoard screen, and the whole next floor's map.
    if (wasBoss) startBackgroundMusic(false);

    // Track achievements
    if (Achievements) {
      if (wasBoss) {
        // DUEL-GAUGE COMBAT ticket (GOALS.md "Next" note, item 5): a duel
        // fight's real health is healthBlocks, not ink -- "took damage"
        // means lost a Verse, not spent ink (which a duel fight still does
        // freely via Overcharge/Rewrite without that being damage at all).
        var tookDamage = state.monster.duel
          ? state.player.healthBlocks < state.player.maxHealthBlocks
          : state.player.ink < state.player.maxInk;
        Achievements.trackBossDefeatedWithoutDamage(state.monster.defId, tookDamage);
      }
      Achievements.trackOverkill(overkill);
      Achievements.trackItemsCollected(state.player.items.length);
    }

    // STOLEN LETTERS META-PROGRESSION ticket (GOALS.md): defeating a boss
    // that holds a hostage letter (see stolenLetters.js's own
    // BOSS_HOSTAGE_LETTERS) recovers it permanently, right after the
    // achievement tracking above -- syncFromAchievements() is called
    // unconditionally (not just on a boss kill) since any of the 5 tracked
    // achievements above could have just unlocked for the first time on a
    // REGULAR kill too (e.g. collect_many_items/massive_overkill).
    if (StolenLetters) {
      if (wasBoss) {
        var recoveredHostageLetter = StolenLetters.recoverByBossDefId(state.monster.defId);
        if (recoveredHostageLetter) log('You recover the stolen letter ' + recoveredHostageLetter + '!');
      }
      var recoveredFromAchievements = StolenLetters.syncFromAchievements();
      recoveredFromAchievements.forEach(function (letter) {
        log('An achievement recovers the stolen letter ' + letter + '!');
      });
    }

    state.player.rack = [];
    state.pendingAfterTileReward = wasBoss ? 'bossItemReward' : 'nextNode';
    state.tileRewardOptions = Tiles.rollRewardOptions(state.rng, 3);
    state.screen = 'TILE_REWARD';
    render();
  }

  Game.pickTileReward = function (tileId) {
    var chosen = null;
    state.tileRewardOptions.forEach(function (t) { if (t.id === tileId) chosen = t; });
    if (chosen) {
      state.deck.push(chosen);
      var modDesc = Tiles.describeVariant(chosen.variant) || Tiles.describeBonus(chosen.bonus);
      log('Added ' + chosen.letter + (modDesc ? ' (' + modDesc + ')' : '') + ' to your deck.');
    }
    resolveTileReward();
  };

  Game.skipTileReward = function () {
    resolveTileReward();
  };

  function resolveTileReward() {
    state.tileRewardOptions = null;
    var pending = state.pendingAfterTileReward;
    state.pendingAfterTileReward = null;
    if (pending === 'bossItemReward') {
      var options = rollBossRewardOptions();
      if (options.length === 0) {
        // Every rare/legendary item is already owned -- nothing left to offer,
        // skip straight to the floor advance rather than show an empty panel.
        state.screen = 'RUN';
        advanceFloor();
        return;
      }
      state.bossRewardOptions = options;
      state.screen = 'BOSS_ITEM_REWARD';
      render();
      return;
    }
    state.screen = 'RUN';
    advanceMapPosition();
    render();
  }

  Game.pickBossItemReward = function (itemId) {
    state.player.items.push(itemId);
    log('You claim ' + Items.ITEM_DEFS[itemId].name + ' from the boss\'s hoard.');
    resolveBossItemReward();
  };

  Game.skipBossItemReward = function () {
    resolveBossItemReward();
  };

  function resolveBossItemReward() {
    state.bossRewardOptions = null;
    state.screen = 'RUN';
    advanceFloor();
  }

  // ---- deck viewer --------------------------------------------------------

  function closeAllSidePanels() {
    state.deckViewerOpen = false;
    state.itemInspectorOpen = false;
    state.itemInspectorId = null;
    state.consumablesPanelOpen = false;
  }

  Game.openDeckViewer = function () {
    closeAllSidePanels();
    state.deckViewerOpen = true;
    render();
  };

  Game.closeDeckViewer = function () {
    state.deckViewerOpen = false;
    render();
  };

  Game.openItemInspector = function (itemId) {
    closeAllSidePanels();
    state.itemInspectorOpen = true;
    state.itemInspectorId = itemId;
    render();
  };

  Game.closeItemInspector = function () {
    state.itemInspectorOpen = false;
    state.itemInspectorId = null;
    render();
  };

  Game.openConsumablesPanel = function () {
    closeAllSidePanels();
    state.consumablesPanelOpen = true;
    render();
  };

  Game.closeConsumablesPanel = function () {
    state.consumablesPanelOpen = false;
    render();
  };

  // ---- how to play ---------------------------------------------------------

  // SHAKESPEARE GUIDE + AUTHOR SHOPKEEPERS ticket (GOALS.md): public so
  // React's RunScreen.jsx (which never touches the vanilla-only
  // showGuideIntro/hideGuideIntro DOM functions -- see reactTreeActive())
  // can read/write the same persistent "seen once ever" flag directly.
  Game.hasSeenGuideIntro = function () { return hasSeenGuideIntro(); };
  Game.markGuideIntroSeen = function () { return markGuideIntroSeen(); };

  Game.openHowToPlay = function () {
    state.howToPlayOpen = true;
    render();
  };

  Game.closeHowToPlay = function () {
    state.howToPlayOpen = false;
    markHowToPlaySeen();
    render();
  };

  Game.useConsumable = function (consumableId) {
    if (!state.combatActive || !state.monster) {
      log('ERROR: Can only use consumables during combat');
      return;
    }
    var def = Wordbound.Consumables.CONSUMABLE_DEFS[consumableId];
    if (!def) {
      log('ERROR: Consumable not found');
      return;
    }
    var idx = state.player.consumables.indexOf(consumableId);
    if (idx === -1) {
      log('ERROR: You don\'t have this consumable');
      return;
    }
    state.player.consumables.splice(idx, 1);
    var monsterHpBefore = state.monster.hp;
    var result = Wordbound.Consumables.useConsumable(consumableId, { player: state.player, monster: state.monster });
    if (result.message) log(result.message);
    playSfx('consumable', null, playConsumableSound);
    // No shipped consumable deals direct damage today, but a future one
    // might (via ctx.monster.hp) -- route through the same defeat path
    // submitWord uses instead of re-rendering onto an already-dead monster.
    if (state.monster.hp <= 0) {
      onMonsterDefeated(monsterHpBefore - state.monster.hp, monsterHpBefore);
      return;
    }
    render();
  };

  // ---- combat animations --------------------------------------------------------

  // STRUCTURAL ticket (GOALS.md, React port): these three functions are
  // called unconditionally from inside Game.submitWord, not just from
  // render() -- so, unlike render() itself, they need their OWN DOM-tree
  // guard. Confirmed by a real-browser run that skipping this guard throws
  // ("Cannot read properties of null (reading 'classList')") the moment
  // CombatScreen.jsx (React) calls the real Game.submitWord: there is no
  // #combat-panel in the React tree for $('monster-hp-fill') etc. to find.
  // wordbound.html always has these elements, so this is a no-op there.
  function reactTreeActive() {
    return !document.getElementById('screen-main-menu');
  }

  function animateDamage(damage) {
    if (damage <= 0 || reactTreeActive()) return;
    var hpFill = $('monster-hp-fill');
    hpFill.classList.remove('flash-damage');
    void hpFill.offsetWidth; // trigger reflow to restart animation
    hpFill.classList.add('flash-damage');
    setTimeout(function () { hpFill.classList.remove('flash-damage'); }, 300);

    var monsterInfo = $('monster-info');
    var dmgNum = document.createElement('div');
    dmgNum.className = 'damage-number';
    if (damage > 30) dmgNum.classList.add('critical');
    else if (damage < 5) dmgNum.classList.add('weak');
    else dmgNum.classList.add('normal');
    dmgNum.textContent = damage;
    // Cosmetic-only jitter and scale -- plain Math.random is fine here, this
    // must NOT consume state.rng (would break seeded-run determinism).
    var offsetX = Math.round((Math.random() - 0.5) * 2 * 25);
    var offsetY = Math.round((Math.random() - 0.5) * 2 * 25);
    var scale = Math.min(1.6, 1 + damage / 60);
    dmgNum.style.left = 'calc(50% + ' + offsetX + 'px)';
    dmgNum.style.top = 'calc(50% + ' + offsetY + 'px)';
    dmgNum.style.fontSize = (1.5 * scale) + 'rem';
    dmgNum.style.transform = 'translate(-50%, -50%)';
    monsterInfo.appendChild(dmgNum);
    setTimeout(function () { dmgNum.remove(); }, 1000);
  }

  // FUN OVERHAUL 8/8 (celebration juice): transient call-outs for a big single
  // word. Appended AFTER render() (like animateDamage) so render's innerHTML
  // rebuild of monster-info/combat-panel doesn't wipe them before they paint.
  // Cosmetic only -- reads flags/values already computed by submitWord. The CSS
  // gates the animations on prefers-reduced-motion (the floater/banner still
  // show statically under reduced motion since they carry info; the shake is
  // dropped entirely there, being pure motion).
  function celebrateHit(damage, magnificent) {
    if (reactTreeActive()) return;
    var panel = $('combat-panel');
    if (damage >= CRUSHING_DAMAGE_THRESHOLD) {
      var monsterInfo = $('monster-info');
      if (monsterInfo) {
        var crush = document.createElement('div');
        crush.className = 'crushing-floater';
        crush.textContent = 'CRUSHING!';
        monsterInfo.appendChild(crush);
        setTimeout(function () { crush.remove(); }, 1000);
      }
      if (panel && !prefersReducedMotion()) {
        panel.classList.remove('combat-shake');
        void panel.offsetWidth; // reflow so the shake restarts on a repeat big hit
        panel.classList.add('combat-shake');
        setTimeout(function () { panel.classList.remove('combat-shake'); }, 320);
      }
    }
    if (magnificent && panel) {
      var banner = document.createElement('div');
      banner.className = 'magnificent-banner';
      banner.textContent = 'MAGNIFICENT!';
      panel.appendChild(banner);
      setTimeout(function () { banner.remove(); }, 1700);
    }
  }

  function animatePlayerDamage() {
    if (reactTreeActive()) return;
    var inkDisplay = $('player-ink-display');
    inkDisplay.classList.remove('take-damage');
    void inkDisplay.offsetWidth; // trigger reflow to restart animation
    inkDisplay.classList.add('take-damage');
    setTimeout(function () { inkDisplay.classList.remove('take-damage'); }, 400);
  }

  // BOSS ENTRANCE CUTSCENES ticket (GOALS.md): a short, skippable sequence
  // (title card -> each taunt line -> the fight) shown once per boss fight,
  // vanilla-only DOM manipulation the same shape as this file's other
  // reactTreeActive()-guarded animation helpers above -- React's
  // BossEntranceOverlay.jsx component reads window.Wordbound.BossEntrances
  // directly and renders its own equivalent, it does not call these.
  // TAUNT_STEP_MS/TITLE_STEP_MS are how long each step shows before
  // auto-advancing if the player never skips -- "skippable with one tap/
  // keypress" (the ticket's own words) means skip jumps straight to the end
  // of the WHOLE sequence, not a step-by-step advance.
  var TITLE_STEP_MS = 1800;
  var TAUNT_STEP_MS = 1600;
  var bossEntranceTimer = null;
  var bossEntranceSkipHandler = null;
  // Read by Game.submitWord (defined earlier in this file, but var hoisting
  // means it's already assigned by the time submitWord actually runs, same
  // as every other module-level constant it reads) -- belt-and-suspenders
  // against a real keyboard edge case: the overlay's position:fixed already
  // blocks mouse clicks on the fight underneath, but a focused #word-input
  // still receives real keydown events regardless of what's drawn on top of
  // it, so an Enter press mid-cutscene could otherwise submit a word the
  // player can't even see land. React's own equivalent guard lives in
  // CombatScreen.jsx's local submit() wrapper (its entrance state never
  // touches this vanilla-only flag).
  var bossEntranceActive = false;

  function renderBossEntranceStep(entrance, stepIndex) {
    var titleEl = $('boss-entrance-title');
    var tauntEl = $('boss-entrance-taunt');
    if (stepIndex === 0) {
      // Title card: "NAME -- epithet", matching the ticket's own example
      // format ("THE QUEEN OF NIGHT -- she of the burning coloratura").
      titleEl.textContent = entrance.name.toUpperCase() + ' -- ' + entrance.epithet;
      tauntEl.textContent = '';
    } else {
      titleEl.textContent = entrance.name.toUpperCase();
      tauntEl.textContent = '"' + entrance.taunts[stepIndex - 1] + '"';
    }
  }

  // Called once per boss fight, right after startCombat's own "X appears!"
  // log line -- a true no-op if this defId has no entrance content (see
  // bossEntrances.js's own header comment on why some bosses genuinely have
  // none yet) or if the React tree is active. Never blocks combat state
  // itself: state.combatActive is already true and the fight (including a
  // duel's music) has already started underneath by the time this shows --
  // only the visible overlay + a document-level Escape/Enter/Space listener
  // stand between the player and the fight, so "block input" here really
  // means "cover the screen," not "pause the engine."
  function showBossEntrance(entrance) {
    if (reactTreeActive()) return;
    var overlay = $('boss-entrance-overlay');
    if (!overlay) return;
    var steps = 1 + entrance.taunts.length; // title card + each taunt line
    var stepIndex = 0;
    bossEntranceActive = true;
    renderBossEntranceStep(entrance, stepIndex);
    overlay.classList.remove('hidden');

    function advance() {
      stepIndex += 1;
      if (stepIndex >= steps) {
        hideBossEntrance();
        return;
      }
      renderBossEntranceStep(entrance, stepIndex);
      bossEntranceTimer = setTimeout(advance, TAUNT_STEP_MS);
    }
    bossEntranceTimer = setTimeout(advance, TITLE_STEP_MS);

    bossEntranceSkipHandler = function (e) {
      if (e.key !== 'Escape' && e.key !== 'Enter' && e.key !== ' ') return;
      hideBossEntrance();
    };
    document.addEventListener('keydown', bossEntranceSkipHandler);
  }

  function hideBossEntrance() {
    var overlay = $('boss-entrance-overlay');
    if (overlay) overlay.classList.add('hidden');
    if (bossEntranceTimer) {
      clearTimeout(bossEntranceTimer);
      bossEntranceTimer = null;
    }
    if (bossEntranceSkipHandler) {
      document.removeEventListener('keydown', bossEntranceSkipHandler);
      bossEntranceSkipHandler = null;
    }
    bossEntranceActive = false;
    if (state.monster) state.monster._entranceSeen = true;
  }

  // SHAKESPEARE GUIDE + AUTHOR SHOPKEEPERS ticket (GOALS.md), GUIDE INTRO
  // step: William Shakespeare's quest-setting intro, shown once ever on the
  // player's first-ever run (persisted via localStorage, same "once ever"
  // pattern as HOWTO_SEEN_KEY above). A near-copy of showBossEntrance/
  // hideBossEntrance rather than a direct call into them -- this needs its
  // own persistent "seen" flag (hideBossEntrance instead marks a per-FIGHT
  // `monster._entranceSeen`, which doesn't apply here: there's no monster
  // yet, the guide fires at run start) and its own overlay element ids, but
  // reuses the exact same CSS classes/step timing, per the ticket's own
  // "reuse the cutscene presentation layer where it fits" instruction.
  var GUIDE_SEEN_KEY = 'wordbound_seen_guide_intro';
  function hasSeenGuideIntro() {
    try {
      if (typeof localStorage === 'undefined') return false;
      return localStorage.getItem(GUIDE_SEEN_KEY) === '1';
    } catch (e) {
      return false;
    }
  }
  function markGuideIntroSeen() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(GUIDE_SEEN_KEY, '1');
    } catch (e) {
      // localStorage unavailable -- not fatal, just means it may show again
    }
  }

  var guideIntroTimer = null;
  var guideIntroSkipHandler = null;

  function renderGuideIntroStep(entrance, stepIndex) {
    var titleEl = $('guide-intro-title');
    var tauntEl = $('guide-intro-taunt');
    if (stepIndex === 0) {
      titleEl.textContent = entrance.name.toUpperCase() + ' -- ' + entrance.epithet;
      tauntEl.textContent = '';
    } else {
      titleEl.textContent = entrance.name.toUpperCase();
      tauntEl.textContent = '"' + entrance.taunts[stepIndex - 1] + '"';
    }
  }

  // Idempotent by design (clears any still-running timer/listener from a
  // previous call before starting fresh) -- unlike a boss entrance, which is
  // only ever shown once per fight with an explicit dismiss in between,
  // hasSeenGuideIntro() can legitimately be false across MULTIPLE
  // Game.startRun() calls in an environment with no real localStorage
  // (confirmed: jsdom instances built with a file:// url have none at all --
  // see the STOLEN LETTERS ticket's own PROGRESS.md note on the identical
  // gap), so this must tolerate being called again before a prior call was
  // ever dismissed, without leaking timers or stacking duplicate keydown
  // listeners. Unlike bossEntranceActive, there's no equivalent "must also
  // block Game.submitWord" concern here -- this fires at run start, before
  // any node (let alone a fight) has been entered, so #word-input can't even
  // be focused yet; the overlay's own position:fixed covering the screen is
  // the whole story.
  function showGuideIntro() {
    if (reactTreeActive()) return;
    var entrance = window.Wordbound.ShakespeareGuide && window.Wordbound.ShakespeareGuide.INTRO;
    if (!entrance) return;
    var overlay = $('guide-intro-overlay');
    if (!overlay) return;
    if (guideIntroTimer) { clearTimeout(guideIntroTimer); guideIntroTimer = null; }
    if (guideIntroSkipHandler) { document.removeEventListener('keydown', guideIntroSkipHandler); guideIntroSkipHandler = null; }

    var steps = 1 + entrance.taunts.length;
    var stepIndex = 0;
    renderGuideIntroStep(entrance, stepIndex);
    overlay.classList.remove('hidden');

    function advance() {
      stepIndex += 1;
      if (stepIndex >= steps) {
        hideGuideIntro();
        return;
      }
      renderGuideIntroStep(entrance, stepIndex);
      guideIntroTimer = setTimeout(advance, TAUNT_STEP_MS);
    }
    guideIntroTimer = setTimeout(advance, TITLE_STEP_MS);

    guideIntroSkipHandler = function (e) {
      if (e.key !== 'Escape' && e.key !== 'Enter' && e.key !== ' ') return;
      hideGuideIntro();
    };
    document.addEventListener('keydown', guideIntroSkipHandler);
  }

  function hideGuideIntro() {
    var overlay = $('guide-intro-overlay');
    if (overlay) overlay.classList.add('hidden');
    if (guideIntroTimer) {
      clearTimeout(guideIntroTimer);
      guideIntroTimer = null;
    }
    if (guideIntroSkipHandler) {
      document.removeEventListener('keydown', guideIntroSkipHandler);
      guideIntroSkipHandler = null;
    }
    markGuideIntroSeen();
  }

  // ---- sound effects --------------------------------------------------------

  // AUDIO ticket (GOALS.md, "NO SOUND AT ALL", 2026-08-21): a fresh
  // AudioContext starts 'suspended' per spec unless the browser's autoplay
  // heuristic auto-resumes it for this exact gesture -- Chromium usually
  // does, Safari/Firefox are stricter and can leave it suspended even when
  // constructed synchronously inside a click handler. Nothing in this file
  // ever called .resume() before this fix, so on any browser that doesn't
  // auto-resume, every play call below was scheduling into a context that
  // was never actually producing sound. resume() on an already-running
  // context is a harmless no-op, so this is safe to call from every path
  // that touches the context, not just the first one.
  function initAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended' && typeof audioContext.resume === 'function') {
      audioContext.resume().catch(function () {}); // best-effort; nothing more to do if it's refused
    }
    return audioContext;
  }

  function playCombatSound(damage, comboLevel) {
    // AUDIO ticket (GOALS.md, 2026-08-21): this function predates the shared
    // mute/volume plumbing below and connects straight to ctx.destination at a
    // fixed gain (unlike the new sounds, which route through sfxGainNode) --
    // retuning its absolute loudness is a separate balance call outside this
    // ticket's scope, but it should still go SILENT on mute like every other
    // sound in the game, which this one previously didn't.
    logSfxCall('combatHit', !audioSettings.muted);
    if (audioSettings.muted) return;
    try {
      var ctx = initAudioContext();
      var now = ctx.currentTime;
      var intensity = Math.min(damage / 40, 1); // normalize damage to 0-1
      var duration = 0.15 + (intensity * 0.1);
      // Word novelty + combo streaks (GOALS.md "FUN OVERHAUL 1/8"): pitch
      // rises with the combo stack that boosted this hit (0-5 stacks -> up to
      // +40% pitch), reusing this same synth rather than a separate sound.
      var pitchMult = 1 + 0.08 * Math.max(0, Math.min(comboLevel || 0, 5));

      if (damage > 30) {
        // critical hit: high-pitched punchy tone
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(600 * pitchMult, now);
        osc.frequency.exponentialRampToValueAtTime(200 * pitchMult, now + duration);
        gain.gain.setValueAtTime(0.3 * intensity, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        osc.start(now);
        osc.stop(now + duration);
      } else if (damage < 5) {
        // weak hit: soft, low tone
        var osc2 = ctx.createOscillator();
        var gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.setValueAtTime(150 * pitchMult, now);
        osc2.frequency.linearRampToValueAtTime(100 * pitchMult, now + duration);
        gain2.gain.setValueAtTime(0.1, now);
        gain2.gain.linearRampToValueAtTime(0, now + duration);
        osc2.start(now);
        osc2.stop(now + duration);
      } else {
        // normal hit: mid-range punchy tone
        var osc3 = ctx.createOscillator();
        var gain3 = ctx.createGain();
        osc3.connect(gain3);
        gain3.connect(ctx.destination);
        osc3.frequency.setValueAtTime(400 * pitchMult, now);
        osc3.frequency.exponentialRampToValueAtTime(250 * pitchMult, now + duration);
        gain3.gain.setValueAtTime(0.2 * intensity, now);
        gain3.gain.exponentialRampToValueAtTime(0.01, now + duration);
        osc3.start(now);
        osc3.stop(now + duration);
      }
    } catch (e) {
      // audio context not supported, silently fail
    }
  }

  function playCounterattackSound(damage, isBoss) {
    // AUDIO ticket (GOALS.md, 2026-08-21): same mute fix as playCombatSound above.
    logSfxCall('counterattack', !audioSettings.muted);
    if (audioSettings.muted) return;
    try {
      var ctx = initAudioContext();
      var now = ctx.currentTime;
      var intensity = Math.min(damage / 10, 1);
      var duration = isBoss ? 0.35 : 0.2;
      var baseFreq = isBoss ? 65 : 100;
      var endFreq = isBoss ? 50 : 80;
      var gain = isBoss ? 0.2 : 0.15;

      // monster counterattack: ominous low tone (more ominous for bosses)
      var osc = ctx.createOscillator();
      var gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.linearRampToValueAtTime(endFreq, now + duration);
      gainNode.gain.setValueAtTime(gain * intensity, now);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);
      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      // audio context not supported, silently fail
    }
  }

  // ---- interaction SFX (AUDIO ticket, GOALS.md, 2026-08-21) -----------------
  // Short, quiet synthesized blips for interactions that were previously
  // silent (tile stage/unstage, invalid word, gold, purchase, consumable use,
  // heal, floor transition, boss entrance, victory/defeat). All route through
  // sfxGainNode (created lazily, same lazy pattern as musicGainNode) so mute
  // and the volume slider affect them automatically -- no per-sound guard
  // needed. Deliberately quieter than playCombatSound/playCounterattackSound
  // above so combat hits stay the loudest thing per the ticket's own ask.
  //
  // sfxCallLog + logSfxCall exist purely for test inspection (jsdom has no
  // real Web Audio API, so a test can't hear these -- it CAN assert that the
  // right trigger fired, with what muted state, and whether a debounce
  // window ate it). Exposed read-only via Game._sfxCallLog /
  // Game._clearSfxCallLog. Real audibility still needs a human with speakers.
  var sfxCallLog = [];
  function logSfxCall(name, played) {
    sfxCallLog.push({ name: name, played: played, muted: audioSettings.muted });
    if (sfxCallLog.length > 200) sfxCallLog.shift(); // unbounded growth guard, not a real limit on a normal play session
  }

  // Rapid-fire guard (ticket: "fast tile taps shouldn't machine-gun") -- tile
  // stage/unstage share one debounce key so quickly building a word by
  // clicking several tiles in a burst doesn't stack overlapping oscillators
  // into a buzz. Every other new SFX is a discrete, player-paced action
  // (one purchase click, one floor transition, ...) with no realistic
  // rapid-fire path, so only this one needs a window.
  var lastSfxAt = {};
  var SFX_DEBOUNCE_MS = { tileTap: 35 };

  function getSfxGainNode(ctx) {
    if (!sfxGainNode) {
      sfxGainNode = ctx.createGain();
      sfxGainNode.connect(ctx.destination);
      sfxGainNode.gain.setValueAtTime(audioSettings.muted ? 0 : audioSettings.volume, ctx.currentTime);
    }
    return sfxGainNode;
  }

  // name: log/debounce key. debounceKey: optional shared SFX_DEBOUNCE_MS
  // bucket (falls back to name). synth(ctx, now, master): builds and starts
  // the actual oscillator(s), connecting into `master` (not ctx.destination).
  function playSfx(name, debounceKey, synth) {
    var played = !audioSettings.muted;
    if (played) {
      var key = debounceKey || name;
      var minGap = SFX_DEBOUNCE_MS[key];
      if (minGap) {
        var now = Date.now();
        if (lastSfxAt[key] && now - lastSfxAt[key] < minGap) played = false;
        else lastSfxAt[key] = now;
      }
    }
    logSfxCall(name, played);
    if (!played) return;
    try {
      var ctx = initAudioContext();
      var master = getSfxGainNode(ctx);
      synth(ctx, ctx.currentTime, master);
    } catch (e) {
      // audio context not supported, silently fail
    }
  }

  function playTone(ctx, master, opts) {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = opts.type || 'sine';
    osc.connect(gain);
    gain.connect(master);
    osc.frequency.setValueAtTime(opts.freq, opts.start);
    if (opts.endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.endFreq), opts.start + opts.duration);
    gain.gain.setValueAtTime(opts.gain, opts.start);
    gain.gain.exponentialRampToValueAtTime(0.001, opts.start + opts.duration);
    osc.start(opts.start);
    osc.stop(opts.start + opts.duration);
  }

  function playTileStageSound(ctx, now, master) {
    playTone(ctx, master, { type: 'triangle', freq: 720, endFreq: 640, duration: 0.05, gain: 0.09, start: now });
  }

  function playTileUnstageSound(ctx, now, master) {
    playTone(ctx, master, { type: 'triangle', freq: 460, endFreq: 400, duration: 0.05, gain: 0.08, start: now });
  }

  function playInvalidWordSound(ctx, now, master) {
    playTone(ctx, master, { type: 'sawtooth', freq: 180, endFreq: 120, duration: 0.14, gain: 0.1, start: now });
  }

  function playGoldGainSound(ctx, now, master) {
    playTone(ctx, master, { type: 'triangle', freq: 660, duration: 0.09, gain: 0.09, start: now });
    playTone(ctx, master, { type: 'triangle', freq: 880, duration: 0.11, gain: 0.09, start: now + 0.06 });
  }

  function playPurchaseSound(ctx, now, master) {
    playTone(ctx, master, { type: 'square', freq: 500, duration: 0.07, gain: 0.07, start: now });
    playTone(ctx, master, { type: 'square', freq: 750, duration: 0.1, gain: 0.08, start: now + 0.05 });
  }

  function playConsumableSound(ctx, now, master) {
    playTone(ctx, master, { type: 'sine', freq: 900, endFreq: 1400, duration: 0.15, gain: 0.08, start: now });
  }

  function playHealSound(ctx, now, master) {
    playTone(ctx, master, { type: 'sine', freq: 440, endFreq: 660, duration: 0.25, gain: 0.1, start: now });
  }

  function playFloorTransitionSound(ctx, now, master) {
    playTone(ctx, master, { type: 'sine', freq: 220, endFreq: 520, duration: 0.5, gain: 0.09, start: now });
  }

  function playBossEntranceSound(ctx, now, master) {
    playTone(ctx, master, { type: 'sawtooth', freq: 70, duration: 0.45, gain: 0.16, start: now });
    playTone(ctx, master, { type: 'square', freq: 105, duration: 0.4, gain: 0.1, start: now + 0.08 });
  }

  function playVictorySound(ctx, now, master) {
    playTone(ctx, master, { type: 'triangle', freq: 523.25, duration: 0.16, gain: 0.11, start: now });
    playTone(ctx, master, { type: 'triangle', freq: 659.25, duration: 0.16, gain: 0.11, start: now + 0.13 });
    playTone(ctx, master, { type: 'triangle', freq: 784.0, duration: 0.3, gain: 0.12, start: now + 0.26 });
  }

  function playDefeatSound(ctx, now, master) {
    playTone(ctx, master, { type: 'sawtooth', freq: 300, endFreq: 260, duration: 0.22, gain: 0.11, start: now });
    playTone(ctx, master, { type: 'sawtooth', freq: 220, endFreq: 180, duration: 0.35, gain: 0.11, start: now + 0.2 });
  }

  // DUEL-GAUGE COMBAT ticket (GOALS.md, integration run): factored out of
  // startBackgroundMusic's own lazy-init (identical behavior, just callable
  // from Game.startDuelFight below too, so a duel-mode fight's real
  // sequencer plumbs into the SAME shared mute/volume gain node the
  // placeholder background music already uses, per music.js's own "reuse
  // the caller's destination GainNode" contract).
  function ensureMusicGainNode(ctx) {
    if (!musicGainNode) {
      musicGainNode = ctx.createGain();
      musicGainNode.connect(ctx.destination);
      musicGainNode.gain.setValueAtTime(audioSettings.muted ? 0 : audioSettings.volume, ctx.currentTime);
    }
    return musicGainNode;
  }

  function startBackgroundMusic(isBoss) {
    var requestedMode = isBoss ? 'boss' : 'normal';
    // Review F2 (2026-08-20): startCombat used to unconditionally
    // stop+restart music on every fight, even normal->normal, which
    // restarted the loop from the top for no audible reason. Skip the
    // work entirely when the requested mode is already playing.
    if (isPlayingMusic && currentMusicMode === requestedMode) return;
    try {
      stopBackgroundMusic();
      var ctx = initAudioContext();
      ensureMusicGainNode(ctx);

      currentMusicMode = isBoss ? 'boss' : 'normal';
      isPlayingMusic = true;

      if (isBoss) {
        playBossMusic(ctx);
      } else {
        playNormalMusic(ctx);
      }
    } catch (e) {
      // audio context not supported
    }
  }

  function playNormalMusic(ctx) {
    var baseFreq = 130.81; // C3
    var notes = [130.81, 146.83, 164.81, 146.83]; // C, D, E, D
    var beatDuration = 1;
    var now = ctx.currentTime;

    function playLoop(startTime) {
      if (!isPlayingMusic || currentMusicMode !== 'normal') return;

      for (var i = 0; i < notes.length; i++) {
        var noteStart = startTime + (i * beatDuration);
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(musicGainNode);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(notes[i], noteStart);
        gain.gain.setValueAtTime(0.25, noteStart);
        gain.gain.linearRampToValueAtTime(0.08, noteStart + beatDuration * 0.7);
        // Fade fully to silence before stop() -- stopping an oscillator while its
        // gain is still non-zero creates an audible click (a hard discontinuity in
        // the waveform). Ramping to ~0 first makes the cutoff inaudible.
        gain.gain.linearRampToValueAtTime(0.0001, noteStart + beatDuration * 0.95);

        osc.start(noteStart);
        osc.stop(noteStart + beatDuration * 0.95);
        musicOscillators.push({ osc: osc, gain: gain });
      }

      setTimeout(function () { playLoop(startTime + (notes.length * beatDuration)); }, notes.length * beatDuration * 1000);
    }

    playLoop(now);
  }

  function playBossMusic(ctx) {
    var notes = [82.41, 98.00, 82.41, 98.00, 110.00, 98.00]; // E2, G2, E2, G2, A2, G2 (one octave lower than original)
    var beatDuration = 0.5;
    var now = ctx.currentTime;

    function playLoop(startTime) {
      if (!isPlayingMusic || currentMusicMode !== 'boss') return;

      for (var i = 0; i < notes.length; i++) {
        var noteStart = startTime + (i * beatDuration);
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(musicGainNode);

        osc.type = 'square';
        osc.frequency.setValueAtTime(notes[i], noteStart);
        gain.gain.setValueAtTime(0.30, noteStart);
        gain.gain.linearRampToValueAtTime(0.10, noteStart + beatDuration * 0.6);
        // Same click-avoidance as playNormalMusic: reach silence before stop().
        // Square waves make an un-faded stop click even more noticeable than sine.
        gain.gain.linearRampToValueAtTime(0.0001, noteStart + beatDuration * 0.9);

        osc.start(noteStart);
        osc.stop(noteStart + beatDuration * 0.9);
        musicOscillators.push({ osc: osc, gain: gain });
      }

      setTimeout(function () { playLoop(startTime + (notes.length * beatDuration)); }, notes.length * beatDuration * 1000);
    }

    playLoop(now);
  }

  function stopBackgroundMusic() {
    isPlayingMusic = false;
    // Fade each still-playing note to silence before stopping it, rather than
    // cutting it off mid-note -- this runs on every combat transition (including
    // normal<->boss music switches), so a hard stop() here clicked audibly on
    // nearly every fight start/end.
    musicOscillators.forEach(function (pair) {
      try {
        var now = audioContext ? audioContext.currentTime : 0;
        pair.gain.gain.cancelScheduledValues(now);
        pair.gain.gain.setValueAtTime(pair.gain.gain.value, now);
        pair.gain.gain.linearRampToValueAtTime(0.0001, now + 0.03);
        pair.osc.stop(now + 0.03);
      } catch (e) {}
    });
    musicOscillators = [];
  }

  function setMusicVolume(volume) {
    audioSettings.volume = Math.max(0, Math.min(1, volume));
    audioSettings.muted = false; // moving the slider implies "I want sound"
    saveAudioSettings();
    if (musicGainNode) {
      musicGainNode.gain.setValueAtTime(audioSettings.volume, audioContext.currentTime);
    }
    if (sfxGainNode) {
      sfxGainNode.gain.setValueAtTime(audioSettings.volume, audioContext.currentTime);
    }
  }

  function toggleMusicMute() {
    audioSettings.muted = !audioSettings.muted;
    saveAudioSettings();
    if (musicGainNode) {
      // Restore the actual chosen volume on unmute, not a hardcoded default --
      // previously this reset to 0.1 regardless of what the slider was set to.
      musicGainNode.gain.setValueAtTime(audioSettings.muted ? 0 : audioSettings.volume, audioContext.currentTime);
    }
    if (sfxGainNode) {
      sfxGainNode.gain.setValueAtTime(audioSettings.muted ? 0 : audioSettings.volume, audioContext.currentTime);
    }
    return !audioSettings.muted;
  }

  // ---- rack reordering --------------------------------------------------------

  function startTileDrag(tileId) {
    state.draggedTileId = tileId;
  }

  function endTileDrag() {
    state.draggedTileId = null;
    state.dragOverIndex = null;
  }

  function reorderRackOnDrop(dropIndex) {
    if (state.draggedTileId === null || dropIndex === null) return;
    var dragIndex = -1;
    for (var i = 0; i < state.player.rack.length; i++) {
      if (state.player.rack[i].id === state.draggedTileId) {
        dragIndex = i;
        break;
      }
    }
    if (dragIndex === -1) return;
    if (dragIndex === dropIndex) return; // no change
    var tile = state.player.rack[dragIndex];
    state.player.rack.splice(dragIndex, 1);
    var insertIndex = dropIndex > dragIndex ? dropIndex - 1 : dropIndex;
    state.player.rack.splice(insertIndex, 0, tile);
    render();
  }

  // MOBILE INPUT 2/3: honor the OS "reduce motion" setting for the tile
  // slide animations, matching the house convention (the screen/floater
  // animations gate on prefers-reduced-motion in CSS; a JS-measured FLIP
  // can't live in CSS, so it checks the same media query here).
  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  // MOBILE INPUT 3/3: a light haptic tick on stage/unstage/submit. Feature-
  // checked (navigator.vibrate is Android-Chrome only -- silently absent on
  // iOS and desktop) and, per the ticket, disabled under reduced motion along
  // with the visual juice. Wrapped in try/catch because some browsers throw if
  // vibrate is called outside a user-gesture context.
  function hapticTick() {
    if (prefersReducedMotion()) return;
    var nav = window.navigator;
    if (nav && typeof nav.vibrate === 'function') {
      try { nav.vibrate(8); } catch (e) {}
    }
  }

  // MOBILE INPUT 3/3: flag a tile for a one-shot land-settle on the next render
  // (consumed + cleared in renderStagingArea). A no-op collector -- the CSS
  // does the actual animation, gated on reduced motion in the stylesheet.
  function markSettle(tileId) {
    if (state.settleTileIds.indexOf(tileId) === -1) state.settleTileIds.push(tileId);
  }

  // MOBILE INPUT 2/3: FLIP-animate a tile from a rect captured BEFORE render
  // to its new post-render position (transform-only, ~200ms ease-out). Instant
  // (no-op) under reduced motion or where rAF/getBoundingClientRect are absent
  // (jsdom), so callers can always invoke it unconditionally.
  function flipTile(fromRect, toEl) {
    if (!fromRect || !toEl) return;
    if (prefersReducedMotion() ||
        typeof window.requestAnimationFrame !== 'function' ||
        typeof toEl.getBoundingClientRect !== 'function') return;
    var toRect = toEl.getBoundingClientRect();
    var dx = fromRect.left - toRect.left;
    var dy = fromRect.top - toRect.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    toEl.style.transition = 'none';
    toEl.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        toEl.style.transition = 'transform 0.2s ease-out';
        toEl.style.transform = '';
      });
    });
  }

  function tileElIn(containerId, tileId) {
    var container = $(containerId);
    if (!container || !container.querySelector) return null;
    return container.querySelector('[data-tile-id="' + tileId + '"]');
  }

  // MOBILE INPUT 2/3: remove a staged tile back to its rack slot from any
  // entry point (tap the empty rack slot, tap the staged tile, tap a staged
  // blank). Slides the tile home unless reduced-motion. Single source of
  // truth so every unstage path behaves identically.
  function unstageTile(tileId) {
    var idx = state.selectedTileIds.indexOf(tileId);
    if (idx === -1) return;
    var fromRect = null;
    var stagedEl = tileElIn('staging-area', tileId);
    if (stagedEl && stagedEl.getBoundingClientRect) fromRect = stagedEl.getBoundingClientRect();
    state.selectedTileIds.splice(idx, 1);
    delete state.blankAssignments[tileId];
    markSettle(tileId); // MOBILE INPUT 3/3: settle where it lands back in the rack
    hapticTick();
    playSfx('tileUnstage', 'tileTap', playTileUnstageSound);
    syncWordInput();
    render();
    flipTile(fromRect, tileElIn('rack-display', tileId));
  }

  // MOBILE INPUT 1/3: the word being built from the staged tiles, in click
  // order. selectedTileIds is the source of truth; a staged blank contributes
  // whatever letter the touch-mode picker assigned it (blankAssignments),
  // every other tile contributes its own letter. This is what the touch-mode
  // submit path plays, and what the (hidden-in-touch) word-input mirrors on
  // desktop.
  function stagedWord() {
    return state.selectedTileIds.map(function (id) {
      var t = state.player.rack.find(function (rt) { return rt.id === id; });
      if (!t) return '';
      if (t.letter === '?') return state.blankAssignments[id] || '';
      return t.letter;
    }).join('');
  }

  // Keep the desktop typing box in sync with the staged tiles WITHOUT focusing
  // it -- focusing is what pops the soft keyboard on mobile (MOBILE INPUT 1/3),
  // so the focus() call is gated on desktop mode at every call site instead.
  // Null-guarded (STRUCTURAL ticket, React port): React's CombatScreen has no
  // #word-input element (its input is a plain, unid'd React node) -- this and
  // every other $('word-input') access below is a no-op there, same pattern
  // as render()'s own DOM-tree guard elsewhere in this file. React syncs its
  // own input state from Game.stagedWord() itself after calling the tile-
  // selection wrappers (see Game.selectTileForWord/unstageTile below).
  function syncWordInput() {
    var input = $('word-input');
    if (input) input.value = stagedWord();
  }

  function selectTileForWord(tile) {
    // A Hex'd tile (monster intent, "FUN OVERHAUL 2/8") is locked for this
    // turn -- greyed out in the rack (see renderCombat) and a no-op here so
    // neither a click nor a touch tap can stage it.
    if (tile.id === state.hexedTileId) return;
    if (tile.letter === '?') {
      // Desktop: a blank has no letter to append on click, so tapping one is a
      // no-op -- the player types the word and blanks fill in automatically.
      if (!state.touchMode) return;
      // Touch-mode: typing is gone, so a blank needs a letter chosen for it.
      // If it's already staged, tapping it again unstages it (and forgets its
      // chosen letter); otherwise open the A-Z picker to assign one.
      if (state.selectedTileIds.indexOf(tile.id) !== -1) {
        // Already staged -- tapping again unstages it (and forgets the letter).
        unstageTile(tile.id);
      } else {
        openBlankPicker(tile.id);
      }
      return;
    }
    if (state.selectedTileIds.indexOf(tile.id) !== -1) {
      // Already staged -- clicking again deselects it instead of appending
      // a second copy of the same letter. unstageTile slides it home.
      unstageTile(tile.id);
      return;
    }
    // Stage it. MOBILE INPUT 2/3: capture the rack tile's position BEFORE the
    // render (which replaces it with an empty slot and moves the tile into the
    // staging area) so we can FLIP-slide it down into the play area.
    var fromRect = null;
    var rackEl = tileElIn('rack-display', tile.id);
    if (rackEl && rackEl.getBoundingClientRect) fromRect = rackEl.getBoundingClientRect();
    state.selectedTileIds.push(tile.id);
    markSettle(tile.id); // MOBILE INPUT 3/3: settle where it lands in the play area
    hapticTick();
    playSfx('tileStage', 'tileTap', playTileStageSound);
    // The selection array is the source of truth; rebuild the input from it
    // rather than surgically edit the string, so removals from the middle
    // work correctly too.
    syncWordInput();
    if (!state.touchMode) { var wordInputEl = $('word-input'); if (wordInputEl) wordInputEl.focus(); }
    render();
    flipTile(fromRect, tileElIn('staging-area', tile.id));
  }

  // MOBILE INPUT 1/3: the touch-mode blank-letter picker. Opening it just
  // flags state and re-renders (render() toggles/populates the overlay, same
  // pattern as the how-to-play overlay); picking a letter assigns it to the
  // blank and stages the tile, routing the chosen letter through the exact
  // same word-string path a real tile uses -- Combat.playWord re-resolves the
  // whole word against the rack via Lexicon.canFormFromRack, which already
  // prefers an exact-letter tile over a blank, so if the player also holds the
  // real letter that tile gets used instead (player-favorable; noted in
  // PROGRESS.md).
  function openBlankPicker(tileId) {
    state.blankPickerOpen = true;
    state.blankPickerTileId = tileId;
    render();
  }

  function closeBlankPicker() {
    state.blankPickerOpen = false;
    state.blankPickerTileId = null;
    render();
  }

  function assignBlankLetter(letter) {
    var tileId = state.blankPickerTileId;
    if (!tileId) { closeBlankPicker(); return; }
    var tile = state.player.rack.find(function (t) { return t.id === tileId; });
    // Guard against a stale picker (tile cycled away): just close it.
    if (!tile || tile.letter !== '?') { closeBlankPicker(); return; }
    state.blankAssignments[tileId] = letter;
    if (state.selectedTileIds.indexOf(tileId) === -1) {
      state.selectedTileIds.push(tileId);
      markSettle(tileId); // MOBILE INPUT 3/3: settle the blank as it lands staged
      hapticTick();
      playSfx('tileStage', 'tileTap', playTileStageSound);
    }
    state.blankPickerOpen = false;
    state.blankPickerTileId = null;
    syncWordInput();
    render();
  }

  function getTileAtPosition(x) {
    var buttons = $('rack-display').querySelectorAll('.letter-tile');
    var closestButton = null;
    var closestDistance = Infinity;
    for (var i = 0; i < buttons.length; i++) {
      var rect = buttons[i].getBoundingClientRect();
      var center = rect.left + rect.width / 2;
      var distance = Math.abs(x - center);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestButton = buttons[i];
      }
    }
    if (closestButton && closestButton.getAttribute('data-tile-index')) {
      return parseInt(closestButton.getAttribute('data-tile-index'));
    }
    return null;
  }

  function startTouchReorder(tileId, index, touchX, touchId) {
    state.draggedTileId = tileId;
    state.touchStartIndex = index;
    state.touchCurrentIndex = index;
    state.touchStartX = touchX;
    state.touchDragThresholdCrossed = false;
    state.touchIdentifier = touchId === undefined ? null : touchId;
  }

  // Shared reset for the rack's touch reorder -- run by touchend AND by every
  // interruption path (touchcancel, window blur). The rack drag is state-only
  // (no inline transforms), so there is nothing visual to strip, but a state
  // machine left live would make the NEXT tap resolve as a phantom reorder.
  function cancelTouchReorder() {
    state.draggedTileId = null;
    state.touchStartIndex = null;
    state.touchCurrentIndex = null;
    state.touchStartX = null;
    state.touchDragThresholdCrossed = false;
    state.touchIdentifier = null;
  }

  // The touch that owns the active rack drag, or null if this event is a
  // different finger's. A touch list with no identifiers (synthetic events)
  // falls back to the first touch, so tests still drive the normal path.
  function ownTouch(list) {
    if (!list || !list.length) return null;
    if (state.touchIdentifier === null || state.touchIdentifier === undefined) return list[0];
    for (var i = 0; i < list.length; i++) {
      if (list[i].identifier === state.touchIdentifier) return list[i];
    }
    return null;
  }

  function updateTouchReorder(touchX) {
    if (state.draggedTileId === null) return;

    // Check if drag threshold has been crossed
    if (!state.touchDragThresholdCrossed) {
      var distance = Math.abs(touchX - state.touchStartX);
      if (distance > 10) {
        state.touchDragThresholdCrossed = true;
      }
    }

    if (state.touchDragThresholdCrossed) {
      var newIndex = getTileAtPosition(touchX);
      if (newIndex !== null) {
        state.touchCurrentIndex = newIndex;
      }
    }
  }

  function endTouchReorder(tappedTile, e) {
    if (state.draggedTileId === null) {
      cancelTouchReorder();
      return;
    }
    // A different finger lifting must not resolve (or cancel) this drag.
    if (e && e.changedTouches && !ownTouch(e.changedTouches)) return;

    // If drag threshold was crossed, do the reorder
    if (state.touchDragThresholdCrossed &&
        state.touchStartIndex !== null && state.touchCurrentIndex !== null &&
        state.touchCurrentIndex !== state.touchStartIndex) {
      reorderRackOnDrop(state.touchCurrentIndex);
    } else if (!state.touchDragThresholdCrossed && tappedTile) {
      // No drag happened: treat as a tap and play the letter. Suppress the
      // browser's synthesized post-touchend click, or it lands on the
      // freshly-rendered replacement tile and plays the same letter twice.
      if (e && e.cancelable) e.preventDefault();
      selectTileForWord(tappedTile);
    }

    cancelTouchReorder();
  }

  // ---- staged-tile dragging (MOBILE INPUT 2/3 Phase 2) -----------------------
  // Reorder staged tiles within the play area, and drag a staged tile out of the
  // play area to remove it. Works with BOTH touch and mouse via Pointer Events
  // (a single unified path -- no separate touch/mouse handlers like the rack has).
  // The live gesture is transform-only (a "ghost" that follows the pointer plus
  // sibling tiles sliding to open a gap); the DOM is re-rendered exactly ONCE, on
  // release, never mid-gesture -- render() rebuilds #staging-area via innerHTML and
  // would destroy the element being dragged (the hazard the ticket flags).

  // Pure state mutation: move a staged tile to a new position and rebuild the word.
  // insertIndex is the target slot in 0..selectedTileIds.length, measured against
  // the array that STILL contains the dragged tile (i.e. "insert before the tile
  // currently at insertIndex"; length == append to the end). This lets a tile be
  // dragged all the way to the end, which the rack's drop-ONTO convention can't
  // express. Exposed for tests via Game._reorderStagedTile.
  function reorderStagedTile(tileId, insertIndex) {
    var ids = state.selectedTileIds;
    var dragIndex = ids.indexOf(tileId);
    if (dragIndex === -1 || insertIndex === null || insertIndex === undefined) return;
    ids.splice(dragIndex, 1);
    var adj = insertIndex > dragIndex ? insertIndex - 1 : insertIndex;
    if (adj === dragIndex) { ids.splice(dragIndex, 0, tileId); return; } // no move -> restore, no re-render
    ids.splice(adj, 0, tileId);
    syncWordInput();
    render();
  }

  // Insertion index (0..len) for pointer X, from the rects snapshotted when the
  // drag threshold was crossed (stable hit-testing -- the live tiles move via
  // transform during the drag, so their live rects would lie). Counts how many
  // staged-tile centers sit left of the pointer.
  function stagedTileAtPosition(x) {
    var d = state.stagingDrag;
    if (!d || !d.rects) return null;
    var idx = 0;
    for (var i = 0; i < d.rects.length; i++) {
      var r = d.rects[i].rect;
      if (r && x > r.left + r.width / 2) idx++;
    }
    return idx;
  }

  function pointerOutsideStaging(px, py) {
    var area = $('staging-area');
    if (!area || typeof area.getBoundingClientRect !== 'function') return false;
    var r = area.getBoundingClientRect();
    var tol = 30; // spec 5: released >~30px outside the container -> remove
    return px < r.left - tol || px > r.right + tol || py < r.top - tol || py > r.bottom + tol;
  }

  // Jaxon real-device playtest: dragging a staged tile onto the RACK unstages
  // it (the natural inverse of staging). The rack is an EXPLICIT drop zone, so
  // a release over it unstages even when it sits inside pointerOutsideStaging's
  // 30px tolerance (a rack close under the staging area otherwise reads as
  // "snap back"). Any point over the rack container counts -- the tile always
  // returns to its own home slot regardless of which slot it's dropped on.
  function pointerOverRack(px, py) {
    var rack = $('rack-display');
    if (!rack || typeof rack.getBoundingClientRect !== 'function') return false;
    var r = rack.getBoundingClientRect();
    if (!r || (!r.width && !r.height)) return false;
    return px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
  }

  // Snapshot sibling positions and switch the dragged tile into "ghost" mode once
  // the threshold is crossed (deferred until then so a plain tap never lifts).
  function beginStagingGhost(d) {
    var area = $('staging-area');
    if (d.el && d.el.classList) d.el.classList.add('staging-drag-ghost');
    if (area && area.classList) area.classList.add('staging-dragging');
    d.rects = [];
    var tiles = area && area.querySelectorAll ? area.querySelectorAll('.staged-tile') : [];
    for (var i = 0; i < tiles.length; i++) {
      var rect = tiles[i].getBoundingClientRect ? tiles[i].getBoundingClientRect() : null;
      d.rects.push({ el: tiles[i], id: tiles[i].getAttribute('data-tile-id'), rect: rect });
      if (rect && rect.width && !d.tileW) d.tileW = rect.width + 6; // + flex gap (css gap:6px)
    }
  }

  // Slide non-dragged staged tiles aside to open a visible gap at the insertion
  // point (transform-only; instant under reduced motion).
  function applyStagingGap(d) {
    if (!d.rects) return;
    var dragPos = -1;
    for (var i = 0; i < d.rects.length; i++) {
      if (d.rects[i].id === d.tileId) { dragPos = i; break; }
    }
    var drop = d.insertIndex;
    var tween = prefersReducedMotion() ? 'none' : 'transform 0.12s ease';
    for (var j = 0; j < d.rects.length; j++) {
      var el = d.rects[j].el;
      if (!el || !el.style || j === dragPos) continue; // the ghost moves with the pointer, not here
      var shift = 0;
      // insertion-index semantics (drop in 0..len): forward move vacates dragPos,
      // so tiles between it and the insertion point slide left; a backward move
      // slides the tiles at/after the insertion point right to open the gap.
      if (drop !== null && drop > dragPos && j > dragPos && j < drop) shift = -d.tileW;
      else if (drop !== null && drop <= dragPos && j >= drop && j < dragPos) shift = d.tileW;
      el.style.transition = tween;
      el.style.transform = shift ? 'translateX(' + shift + 'px)' : '';
    }
  }

  function clearStagingGap(d) {
    if (!d || !d.rects) return;
    for (var i = 0; i < d.rects.length; i++) {
      var el = d.rects[i].el;
      if (el && el.style && d.rects[i].id !== d.tileId) el.style.transform = '';
    }
  }

  // ---- gesture teardown (stuck-drag bug, Jaxon's iPhone playtest of v0.28) ---
  // A drag can be terminated by far more than a clean pointerup: iOS Safari
  // steals gestures (page scroll, notification banner, edge swipe, app switch)
  // and fires pointercancel/touchcancel instead; the finger can lift outside the
  // viewport; a second finger can land mid-drag; the dragged element can be
  // destroyed by a render fired from a timer. Every one of those paths must run
  // the SAME cleanup, or the ghost's inline transform survives and the tile sits
  // frozen on top of its neighbor (exactly what Jaxon screenshotted).

  function releaseStagingCapture(d, pointerId) {
    if (!d || !d.el || !d.el.releasePointerCapture) return;
    var id = pointerId !== undefined ? pointerId : d.pointerId;
    if (id === undefined || id === null) return;
    try { d.el.releasePointerCapture(id); } catch (err) {}
  }

  // Strip every visual artifact a live drag can leave behind: the ghost/out
  // classes and inline transform on the dragged tile (which may already be
  // detached from the DOM), the gap transforms on its siblings, and the
  // grabbing-cursor class on the container.
  function clearStagingDragStyling(d) {
    var els = [];
    if (d && d.el) els.push(d.el);
    if (d && d.rects) {
      for (var i = 0; i < d.rects.length; i++) if (d.rects[i].el) els.push(d.rects[i].el);
    }
    var area = $('staging-area');
    var live = area && area.querySelectorAll ? area.querySelectorAll('.staged-tile') : [];
    for (var j = 0; j < live.length; j++) els.push(live[j]);
    for (var k = 0; k < els.length; k++) {
      var el = els[k];
      if (el.classList) {
        el.classList.remove('staging-drag-ghost');
        el.classList.remove('staging-drag-out');
      }
      if (el.style) { el.style.transform = ''; el.style.transition = ''; }
    }
    if (area && area.classList) area.classList.remove('staging-dragging');
    var rack = $('rack-display');
    if (rack && rack.classList) rack.classList.remove('rack-drop-target');
  }

  // The one shared teardown. Ends the drag WITHOUT applying a drop -- used by
  // every interruption path (pointercancel, touchcancel, window blur, a new
  // gesture starting while this one is somehow still live).
  function abortStagingDrag() {
    var d = state.stagingDrag;
    state.stagingDrag = null;
    if (!d) return;
    releaseStagingCapture(d);
    clearStagingDragStyling(d);
    // A drag that never crossed the threshold left no artifacts and no state to
    // undo, so it needs no re-render (and re-rendering there would destroy the
    // element a plain tap's click handler is about to fire on).
    if (d.crossed) render();
  }

  // Defensive sweep, run on every render of the play area: a stuck tile must
  // never survive a re-render. renderStagingArea rebuilds its innerHTML, so the
  // dragged element is destroyed by any render that happens mid-gesture -- when
  // that happens the drag is orphaned (no pointerup will ever reach a detached
  // node) and has to be dropped, or the next pointermove would keep transforming
  // a ghost nobody can see.
  function sweepStagingDragArtifacts() {
    var area = $('staging-area');
    var d = state.stagingDrag;
    if (d && d.el && area && area.contains && !area.contains(d.el)) {
      releaseStagingCapture(d);
      clearStagingDragStyling(d);
      state.stagingDrag = null;
      d = null;
    }
    if (d) return; // a live drag owns its own ghost/gap transforms -- leave them alone
    if (area && area.classList) area.classList.remove('staging-dragging');
    var rack = $('rack-display');
    if (rack && rack.classList) rack.classList.remove('rack-drop-target');
    var tiles = area && area.querySelectorAll ? area.querySelectorAll('.staged-tile') : [];
    for (var i = 0; i < tiles.length; i++) {
      var el = tiles[i];
      if (el.classList) {
        el.classList.remove('staging-drag-ghost');
        el.classList.remove('staging-drag-out');
      }
      if (el.style && el.style.transform) { el.style.transform = ''; el.style.transition = ''; }
    }
  }

  function startStagingDrag(tileId, el, e) {
    // Belt-and-braces: a drag still live at the start of a NEW gesture means a
    // previous one was never terminated (a stolen gesture, a second finger).
    // Tear it down and swallow this press rather than stacking a second drag on
    // top of it -- the next press starts clean.
    if (state.stagingDrag) { abortStagingDrag(); return; }
    // Fresh gesture -- a lingering suppress flag from a prior drag must never eat
    // a genuine tap, so clear it here at the start of every new pointerdown.
    state.suppressNextStagingClick = false;
    // No-op safely if the tile is no longer staged (e.g. the rack cycled during
    // the killing-blow death beat -- gestures in that window must not act).
    if (state.selectedTileIds.indexOf(tileId) === -1) return;
    state.stagingDrag = {
      tileId: tileId, el: el, pointerId: e ? e.pointerId : undefined,
      startX: (e && e.clientX) || 0, startY: (e && e.clientY) || 0,
      crossed: false, outside: false, rects: null, tileW: 0, insertIndex: null
    };
    if (el && el.setPointerCapture && e && e.pointerId !== undefined) {
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
    }
  }

  // True when this event belongs to a pointer OTHER than the one that started
  // the drag (a second finger). Events with no pointerId at all (synthetic /
  // jsdom) always match, so tests and non-pointer-event browsers still work.
  function isForeignPointer(d, e) {
    return !!(d && e && e.pointerId !== undefined && d.pointerId !== undefined &&
      e.pointerId !== d.pointerId);
  }

  function moveStagingDrag(e) {
    var d = state.stagingDrag;
    if (!d) return;
    if (isForeignPointer(d, e)) return;
    var px = e.clientX || 0, py = e.clientY || 0;
    var dx = px - d.startX, dy = py - d.startY;
    if (!d.crossed) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; // below threshold: still a potential tap
      d.crossed = true;
      beginStagingGhost(d);
    }
    if (e.cancelable) e.preventDefault(); // stop the page scrolling under a touch drag
    if (d.el && d.el.style) d.el.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
    // Over the rack is an explicit unstage target; folding it into `outside`
    // means a release there routes to unstageTile (return-to-rack) exactly like
    // the existing drag-out-of-staging path, and the ghost gets the same
    // "out" styling. Tracked separately in d.overRack only to drive the rack's
    // own drop-target highlight.
    var overRack = pointerOverRack(px, py);
    var outside = pointerOutsideStaging(px, py) || overRack;
    if (outside !== d.outside) {
      d.outside = outside;
      if (d.el && d.el.classList) d.el.classList.toggle('staging-drag-out', outside);
    }
    if (overRack !== d.overRack) {
      d.overRack = overRack;
      var rack = $('rack-display');
      if (rack && rack.classList) rack.classList.toggle('rack-drop-target', overRack);
    }
    if (outside) {
      d.insertIndex = null;
      clearStagingGap(d);
    } else {
      d.insertIndex = stagedTileAtPosition(px);
      applyStagingGap(d);
    }
  }

  function endStagingDrag(e) {
    var d = state.stagingDrag;
    if (!d) return;
    if (isForeignPointer(d, e)) return; // a second finger lifting must not end this drag
    releaseStagingCapture(d, e ? e.pointerId : undefined);
    state.stagingDrag = null;
    if (!d.crossed) return; // never moved -> a tap; let the click handler unstage
    // Wipe the ghost/gap styling up front, so every branch below (including the
    // early return when the tile is gone) leaves a clean DOM even if its own
    // render is a no-op.
    clearStagingDragStyling(d);
    // A real drag happened. Suppress the synthesized click that pointerup emits so
    // it doesn't unstage the tile we just reordered.
    state.suppressNextStagingClick = true;
    var tileId = d.tileId;
    // The rack may have cycled out from under the gesture (death-beat window):
    // if the tile is no longer staged, just rebuild a clean DOM and stop.
    if (state.selectedTileIds.indexOf(tileId) === -1) { render(); return; }
    if (d.outside) {
      unstageTile(tileId); // spec 5: drag-out-to-remove (renders + slides home)
    } else if (d.insertIndex !== null) {
      reorderStagedTile(tileId, d.insertIndex); // spec 4 (renders)
    } else {
      render(); // no target -> snap back, wiping the ghost/gap transforms
    }
  }

  function cancelStagingDrag(e) {
    var d = state.stagingDrag;
    if (!d) return;
    if (isForeignPointer(d, e)) return;
    abortStagingDrag();
  }

  // ---- rendering ---------------------------------------------------------

  function show(id) {
    ['screen-main-menu', 'screen-character-select', 'screen-run', 'screen-game-over', 'screen-victory'].forEach(function (s) {
      $(s).classList.toggle('hidden', s !== id);
    });
  }

  function render() {
    // STRUCTURAL ticket (GOALS.md, React port): every Game.* action function
    // ends by calling this. When one is called from the React app there is
    // no legacy #screen-* DOM tree to render into at all (React owns its own
    // tree under #root) -- bail out before the first $(id) lookup instead of
    // throwing. React reads Game._state directly after calling an action and
    // re-renders itself; this function's entire job (imperative DOM writes)
    // is simply moot when that tree doesn't exist. wordbound.html always has
    // #screen-main-menu, so this is a no-op there.
    if (!document.getElementById('screen-main-menu')) return;
    // VISUAL (per-floor ambient tint, GOALS.md): cleared here and re-added
    // by renderRun() below -- only the run screen ever wants a floor class,
    // so every other screen (menu/character-select/game-over/victory) just
    // clears it back to the neutral backdrop.
    if (document.body) document.body.classList.remove('floor-1', 'floor-2', 'floor-3', 'floor-4');
    $('howto-overlay').classList.toggle('hidden', !state.howToPlayOpen);
    renderBlankPicker();
    if (state.screen === 'MAIN_MENU') { show('screen-main-menu'); renderMainMenu(); return; }
    if (state.screen === 'CHARACTER_SELECT') { show('screen-character-select'); renderCharacterSelect(); return; }
    if (state.screen === 'GAME_OVER') { show('screen-game-over'); renderGameOver(); return; }
    if (state.screen === 'VICTORY') { show('screen-victory'); renderVictory(); return; }
    show('screen-run');
    renderRun();
  }

  function renderMainMenu() {
    var achvDisplay = $('achievements-display');
    if (Achievements) {
      var unlockedIds = Achievements.getUnlockedAchievements();
      var totalCount = Object.keys(Achievements.ACHIEVEMENTS).length;
      var progressText = 'Achievements unlocked: ' + unlockedIds.length + ' / ' + totalCount;
      if (unlockedIds.length > 0) {
        var achvNames = unlockedIds.map(function (id) {
          var ach = Achievements.ACHIEVEMENTS[id];
          return ach ? ach.name : id;
        }).join(', ');
        progressText += '<br><span style="font-size: 0.85rem;">✓ ' + achvNames + '</span>';
      }
      achvDisplay.innerHTML = progressText;
    }
    renderAlphabetDisplay();
  }

  // STOLEN LETTERS META-PROGRESSION ticket (GOALS.md): the main menu's
  // "Alphabet" display -- every letter A-Z, visibly locked (chained) if
  // still stolen, distinctly highlighted if recovered, plain otherwise.
  function renderAlphabetDisplay() {
    var el = $('alphabet-display');
    if (!el || !StolenLetters) return;
    var html = '<div class="alphabet-caption">The Alphabet</div><div class="alphabet-grid">';
    for (var i = 0; i < 26; i++) {
      var letter = String.fromCharCode(65 + i);
      var cls = 'alphabet-letter';
      var title = letter;
      if (StolenLetters.isStolen(letter)) {
        cls += ' alphabet-letter-stolen';
        title = letter + ' -- stolen by the Fermata';
      } else if (StolenLetters.STARTING_STOLEN.indexOf(letter) !== -1) {
        cls += ' alphabet-letter-recovered';
        title = letter + ' -- recovered!';
      }
      html += '<span class="' + cls + '" title="' + title + '">' + letter + '</span>';
    }
    html += '</div>';
    el.innerHTML = html;
  }

  // End-of-run stats block (review N6): a compact record of the run, shown
  // on both the game-over and victory screens so there's finally something
  // to screenshot/share besides the seed. THEME.md-voiced labels.
  function renderRunStats(containerId) {
    var stats = state.runStats || {
      wordsPlayed: 0, bestWord: null, bestWordDamage: 0, totalDamage: 0,
      monstersDefeated: 0, floorsCleared: 0, goldEarned: 0
    };
    var rows = [
      ['Words Spelled', String(stats.wordsPlayed)],
      ['Best Word', stats.bestWord ? stats.bestWord + ' (' + stats.bestWordDamage + ' dmg)' : '—'],
      ['Damage Dealt', String(stats.totalDamage)],
      ['Loose Words Defeated', String(stats.monstersDefeated)],
      ['Floors Cleared', stats.floorsCleared + ' / ' + Floor.TOTAL_FLOORS],
      ['Gold Earned', stats.goldEarned + ' 🪙']
    ];
    $(containerId).innerHTML = rows.map(function (r) {
      return '<div class="run-stat-row"><span class="run-stat-label">' + r[0] + '</span><span class="run-stat-value">' + r[1] + '</span></div>';
    }).join('');
  }

  function renderGameOver() {
    $('game-over-stats').textContent = 'You reached floor ' + state.floorNumber + '.';
    renderRunStats('game-over-run-stats');
    $('game-over-seed').textContent = 'Seed: ' + state.runSeed;
  }

  function renderVictory() {
    $('victory-stats').textContent = 'You cleared all ' + Floor.TOTAL_FLOORS + ' floors. Wordbound complete.';
    renderRunStats('victory-run-stats');
    $('victory-seed').textContent = 'Seed: ' + state.runSeed;
  }

  function renderCharacterSelect() {
    var choices = $('character-choices');
    choices.innerHTML = '';
    var characterIds = Characters.getCharacterIds();
    characterIds.forEach(function (id) {
      var characterDef = Characters.getCharacter(id);
      var button = document.createElement('div');
      button.className = 'character-option';
      button.innerHTML = '<p class="character-name">' + characterDef.name + '</p>' +
                         '<p class="character-description">' + characterDef.description + '</p>';
      button.addEventListener('click', function () {
        Game.startRun(id, $('run-seed-input').value);
      });
      choices.appendChild(button);
    });
  }

  function getFloorName(floorNumber) {
    var names = { 1: 'The Overdue Aisles', 2: 'The Reference Wing', 3: 'The Binding', 4: 'The Podium' };
    return names[floorNumber] || '';
  }

  function renderRun() {
    if (document.body) document.body.classList.add('floor-' + state.floorNumber);
    $('player-ink-display').textContent = 'Ink ' + state.player.ink + ' / ' + state.player.maxInk;
    $('gold-display').textContent = state.player.gold + ' 🪙';
    var floorName = getFloorName(state.floorNumber);
    $('floor-label').textContent = 'Floor ' + state.floorNumber + ' / ' + Floor.TOTAL_FLOORS + (floorName ? ' — ' + floorName : '');
    $('run-seed-display').textContent = 'Seed: ' + state.runSeed;
    renderItemsOwned();
    var log_ = $('message-log');
    log_.innerHTML = state.messages.length
      ? state.messages.map(function (m) { return '<div>' + escapeHtml(m) + '</div>'; }).join('')
      : '<div class="message-log-placeholder">The Stacks are quiet.</div>';
    log_.scrollTop = log_.scrollHeight;

    // BUG (QA polish pass, 2026-08-21): deck-viewer-panel/item-inspector-panel/
    // consumables-panel used to be toggled and early-returned on BEFORE the
    // node-map/combat-panel/overlay-panel toggles below ever ran -- so
    // whichever screen was visible on the PREVIOUS render (node map, a
    // fight, even a treasure/shop screen) stayed visible and stacked behind
    // the newly-opened side panel instead of being replaced by it. Folding
    // sidePanelOpen into every other panel's hidden toggle (computed first,
    // used everywhere below) closes that regardless of which panel opened
    // first, without touching any of the existing per-screen logic.
    var sidePanelOpen = state.deckViewerOpen || state.itemInspectorOpen || state.consumablesPanelOpen;
    var overlayScreen = state.screen === 'TREASURE' || state.screen === 'SHOP' || state.screen === 'TILE_REWARD' || state.screen === 'BOSS_ITEM_REWARD' || state.screen === 'EVENT' || state.screen === 'SHREDDER';
    $('node-map').classList.toggle('hidden', sidePanelOpen || state.combatActive || overlayScreen);
    $('combat-panel').classList.toggle('hidden', sidePanelOpen || !state.combatActive);
    $('combat-panel').classList.toggle('boss-combat', state.combatActive && state.monster && state.monster.isBoss);
    $('treasure-panel').classList.toggle('hidden', sidePanelOpen || (state.screen !== 'TREASURE' && state.screen !== 'SHOP'));
    $('tile-reward-panel').classList.toggle('hidden', sidePanelOpen || state.screen !== 'TILE_REWARD');
    $('boss-reward-panel').classList.toggle('hidden', sidePanelOpen || state.screen !== 'BOSS_ITEM_REWARD');
    $('event-panel').classList.toggle('hidden', sidePanelOpen || state.screen !== 'EVENT');
    $('shredder-panel').classList.toggle('hidden', sidePanelOpen || state.screen !== 'SHREDDER');

    $('deck-viewer-panel').classList.toggle('hidden', !state.deckViewerOpen);
    $('item-inspector-panel').classList.toggle('hidden', !state.itemInspectorOpen);
    $('consumables-panel').classList.toggle('hidden', !state.consumablesPanelOpen);
    if (state.deckViewerOpen) {
      renderDeckViewer();
      return;
    }
    if (state.itemInspectorOpen) {
      renderItemInspector();
      return;
    }
    if (state.consumablesPanelOpen) {
      renderConsumablesPanel();
      return;
    }

    if (state.screen === 'TREASURE') {
      renderTreasure();
      return;
    }
    if (state.screen === 'SHOP') {
      renderShop();
      return;
    }
    if (state.screen === 'TILE_REWARD') {
      renderTileReward();
      return;
    }
    if (state.screen === 'BOSS_ITEM_REWARD') {
      renderBossReward();
      return;
    }
    if (state.screen === 'EVENT') {
      renderEvent();
      return;
    }
    if (state.screen === 'SHREDDER') {
      renderShredder();
      return;
    }
    if (state.combatActive) {
      renderCombat();
      return;
    }
    renderNodeMap();
  }

  function renderItemsOwned() {
    var el = $('items-owned');
    el.innerHTML = '';
    // FUN OVERHAUL 8/8: chips for items whose hook fired on the just-played
    // word flash once. Consumed here (a one-shot, like settleTileIds) so the
    // flash plays on exactly the render after the proc, not every render after.
    var procced = state.proccedItemIds || [];
    state.player.items.forEach(function (itemId) {
      var def = Items.ITEM_DEFS[itemId];
      var span = document.createElement('span');
      span.className = 'item-chip' + (procced.indexOf(itemId) !== -1 ? ' item-chip-proc' : '');
      span.textContent = def.name;
      span.title = def.hint;
      span.style.cursor = 'pointer';
      span.addEventListener('click', function () { Game.openItemInspector(itemId); });
      el.appendChild(span);
    });
    if (procced.length) state.proccedItemIds = [];
  }

  function renderItemInspector() {
    if (!state.itemInspectorId) return;
    var def = Items.ITEM_DEFS[state.itemInspectorId];
    if (!def) return;
    $('inspector-item-name').textContent = def.name;
    $('inspector-item-hint').textContent = def.hint;
  }

  // BRANCHING MAP (GOALS.md, run 2/N): a small DAG laid out on a CSS grid
  // (rows = encounter depth, columns = lane), with an absolutely-positioned
  // SVG layer underneath drawing ink lines along the floor's actual edges.
  // Node centers are computed as simple (lane+0.5)/lanes, (row+0.5)/rows
  // fractions and used both for the SVG viewBox (0-100 percent space) and,
  // implicitly, for the grid (equal 1fr columns/rows land on the same
  // fractions), so the lines always meet the pills they connect regardless
  // of viewport width -- no getBoundingClientRect measurement needed, which
  // matters because jsdom (this project's fast test harness, see
  // test/dom-check.js) never runs real layout.
  function renderNodeMap() {
    var el = $('node-map');
    el.innerHTML = '';
    var floor = state.floor;
    if (!floor) return;
    var labels = { combat: 'Foe', elite: 'Elite', treasure: 'Treasure', rest: 'Rest', shop: 'Shop', event: 'Event', boss: 'BOSS' };
    var totalRows = floor.rows + 1; // encounter rows (0..rows-1) + one boss row
    var avail = availableNodeIds();
    // The boss node's stored lane is always 0 (see Floor.generateBranchingFloor)
    // but it should read visually as the single convergence point every lane
    // feeds into -- center it across the lane count for both the grid
    // placement and the edge math below.
    var bossVisualLane = (floor.lanes - 1) / 2;
    function laneOf(node) { return node.type === 'boss' ? bossVisualLane : node.lane; }

    var wrap = document.createElement('div');
    wrap.className = 'branch-map';

    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'branch-map-edges');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');

    floor.edges.forEach(function (edge) {
      var fromNode = findNodeById(edge[0]);
      var toNode = findNodeById(edge[1]);
      if (!fromNode || !toNode) return;
      var line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', ((laneOf(fromNode) + 0.5) / floor.lanes) * 100);
      line.setAttribute('y1', ((fromNode.row + 0.5) / totalRows) * 100);
      line.setAttribute('x2', ((laneOf(toNode) + 0.5) / floor.lanes) * 100);
      line.setAttribute('y2', ((toNode.row + 0.5) / totalRows) * 100);
      // "Walked" means this exact edge was the step taken, not just that
      // both ends happen to be cleared (two cleared nodes can share a row
      // gap without that edge ever being crossed, e.g. after a lane merge).
      var fromIdx = state.pathNodeIds.indexOf(fromNode.id);
      var toIdx = state.pathNodeIds.indexOf(toNode.id);
      var walked = fromIdx !== -1 && toIdx !== -1 && toIdx === fromIdx + 1;
      line.setAttribute('class', 'branch-edge' + (walked ? ' branch-edge-walked' : ''));
      svg.appendChild(line);
    });
    wrap.appendChild(svg);

    var grid = document.createElement('div');
    grid.className = 'branch-map-grid';
    grid.style.gridTemplateColumns = 'repeat(' + floor.lanes + ', 1fr)';
    grid.style.gridTemplateRows = 'repeat(' + totalRows + ', auto)';

    floor.nodes.forEach(function (node) {
      var pill = document.createElement('div');
      pill.className = 'node-pill node-' + node.type;
      var isAvailable = !node.cleared && avail.indexOf(node.id) !== -1;
      if (node.cleared) pill.classList.add('node-cleared');
      if (isAvailable) pill.classList.add('node-current');
      else if (!node.cleared) pill.classList.add('node-locked');
      if (node.id === state.mapPositionNodeId) pill.classList.add('node-position');

      var label = (node.cleared ? '✓ ' : '') + labels[node.type];

      // For boss nodes, append the trait hint
      if (node.type === 'boss') {
        var bossDef = Monsters.BOSS_DEFS[node.defId];
        if (bossDef && bossDef.traitPhases && bossDef.traitPhases.length > 0) {
          var traitId = bossDef.traitPhases[0].traitId;
          var traitDef = Traits.TRAITS[traitId];
          if (traitDef && traitDef.hint) {
            label += ' — ' + traitDef.hint;
          }
        }
      }

      // FUN OVERHAUL 6/8 (GOALS.md, 2026-08-20): warn BEFORE entry on an
      // elite -- these carry a punishing resistance trait, so surfacing its
      // exact weakness on the pill is what makes the resistance fair (the
      // player walks in knowing how to hurt it). Same trait-hint mechanism
      // the boss pills already use, reading the node's rolled eliteTraitId.
      if (node.type === 'elite' && node.eliteTraitId) {
        var eliteTraitDef = Traits.TRAITS[node.eliteTraitId];
        if (eliteTraitDef && eliteTraitDef.hint) {
          label += ' — ' + eliteTraitDef.hint;
        }
      }

      pill.textContent = label;
      pill.style.gridRow = node.row + 1;
      if (node.type === 'boss') {
        pill.style.gridColumn = '1 / -1';
        pill.style.justifySelf = 'center';
      } else {
        pill.style.gridColumn = node.lane + 1;
      }
      if (isAvailable) {
        pill.addEventListener('click', function () { Game.enterCurrentNode(node.id); });
      }
      grid.appendChild(pill);
    });

    wrap.appendChild(grid);
    el.appendChild(wrap);
  }

  function renderTreasure() {
    $('treasure-panel-heading').textContent = 'Choose an item';
    var el = $('treasure-choices');
    el.innerHTML = '';
    state.treasureOptions.forEach(function (itemId) {
      var def = Items.ITEM_DEFS[itemId];
      var btn = document.createElement('button');
      btn.className = 'treasure-choice';
      btn.innerHTML = '<strong>' + escapeHtml(def.name) + '</strong><br>' + escapeHtml(def.hint);
      btn.addEventListener('click', function () { Game.pickTreasureItem(itemId); });
      el.appendChild(btn);
    });
  }

  function renderShop() {
    $('treasure-panel-heading').textContent = 'Shop — Gold: ' + state.player.gold + ' 🪙';
    var el = $('treasure-choices');
    el.innerHTML = '';
    if (!state.shopOptions || state.shopOptions.length === 0) {
      el.innerHTML = '<p style="text-align: center;">No items available in shop</p>';
      return;
    }
    state.shopOptions.forEach(function (itemId) {
      var isConsumable = itemId.indexOf('c:') === 0;
      var actualId = isConsumable ? itemId.substring(2) : itemId;
      var def = isConsumable ? (Wordbound.Consumables ? Wordbound.Consumables.CONSUMABLE_DEFS[actualId] : null) : Items.ITEM_DEFS[actualId];
      if (!def) return;
      var canAfford = state.player.gold >= (def.shopPrice || 0);
      var btn = document.createElement('button');
      btn.className = 'treasure-choice' + (canAfford ? '' : ' shop-unavailable');
      btn.style.opacity = canAfford ? '1' : '0.6';
      btn.disabled = !canAfford;
      var priceColor = canAfford ? '#f0d789' : '#8b7355';
      var typeLabel = isConsumable ? ' [Consumable]' : '';
      btn.innerHTML = '<strong>' + escapeHtml(def.name) + '</strong><span style="font-size: 0.8rem; color: #9a8b6f;">' + typeLabel + '</span><br>' + escapeHtml(def.hint) + '<br><span style="color: ' + priceColor + ';">Cost: ' + (def.shopPrice || 0) + ' 🪙</span>';
      if (canAfford) {
        btn.addEventListener('click', function () { Game.buyItem(itemId); });
      }
      el.appendChild(btn);
    });

    // FUN OVERHAUL 5/8: the premium variant-tile offer (a Tile object on
    // state, not a string id in shopOptions) renders as its own row below the
    // item/consumable list.
    if (state.shopTileOffer) {
      var tile = state.shopTileOffer;
      var tileCanAfford = state.player.gold >= VARIANT_TILE_SHOP_PRICE;
      var tileBtn = document.createElement('button');
      tileBtn.className = 'treasure-choice variant-' + tile.variant + (tileCanAfford ? '' : ' shop-unavailable');
      tileBtn.style.opacity = tileCanAfford ? '1' : '0.6';
      tileBtn.disabled = !tileCanAfford;
      var tilePriceColor = tileCanAfford ? '#f0d789' : '#8b7355';
      var shopDisplayLetter = tile.letter === '?' ? '★' : tile.letter;
      tileBtn.innerHTML = '<strong>Premium Tile: ' + escapeHtml(shopDisplayLetter) + '</strong><span style="font-size: 0.8rem; color: #9a8b6f;"> [Tile]</span><br>' +
        escapeHtml(Tiles.describeVariant(tile.variant)) + '<br><span style="color: ' + tilePriceColor + ';">Cost: ' + VARIANT_TILE_SHOP_PRICE + ' 🪙</span>';
      if (tileCanAfford) {
        tileBtn.addEventListener('click', function () { Game.buyShopTile(); });
      }
      el.appendChild(tileBtn);
    }

    var leaveBtn = document.createElement('button');
    leaveBtn.className = 'btn btn-secondary';
    leaveBtn.textContent = 'Leave Shop';
    leaveBtn.style.marginTop = '10px';
    leaveBtn.addEventListener('click', function () { Game.leaveShop(); });
    el.appendChild(leaveBtn);
  }

  function renderTileReward() {
    var el = $('tile-reward-choices');
    el.innerHTML = '';
    state.tileRewardOptions.forEach(function (tile) {
      var btn = document.createElement('button');
      var bonusClass = '';
      if (tile.variant) {
        bonusClass = ' has-bonus variant-' + tile.variant;
      } else if (tile.bonus) {
        bonusClass = ' has-bonus';
        if (tile.bonus.type === 'flatOnPlay') bonusClass += ' bonus-flat';
        else if (tile.bonus.type === 'multOnPlay') bonusClass += ' bonus-mult-play';
        else if (tile.bonus.type === 'multOnHold') bonusClass += ' bonus-mult-hold';
      }
      btn.className = 'treasure-choice treasure-choice-tile' + bonusClass;
      var bonusDesc = Tiles.describeVariant(tile.variant) || Tiles.describeBonus(tile.bonus);
      var val = Lexicon.LETTER_VALUES[tile.letter] || 0;
      // Same doubled value the rack will show once this tile is in play --
      // otherwise the reward screen understates what the player is picking.
      if (tile.variant === Tiles.VARIANTS.VOLATILE) val *= 2;
      var displayLetter = tile.letter === '?' ? '★' : tile.letter;
      btn.innerHTML = '<span class="tile-reward-letter">' + escapeHtml(displayLetter) + '<sub>' + val + '</sub></span>' +
        (bonusDesc ? '<span class="tile-reward-bonus">' + escapeHtml(bonusDesc) + '</span>' : '');
      btn.addEventListener('click', function () { Game.pickTileReward(tile.id); });
      el.appendChild(btn);
    });
  }

  function renderBossReward() {
    var el = $('boss-reward-choices');
    el.innerHTML = '';
    state.bossRewardOptions.forEach(function (itemId) {
      var def = Items.ITEM_DEFS[itemId];
      var btn = document.createElement('button');
      btn.className = 'treasure-choice';
      btn.innerHTML = '<strong>' + escapeHtml(def.name) + '</strong><br>' + escapeHtml(def.hint);
      btn.addEventListener('click', function () { Game.pickBossItemReward(itemId); });
      el.appendChild(btn);
    });
  }

  function renderDeckViewer() {
    var el = $('deck-tiles-list');
    el.innerHTML = '';
    if (!state.deck || state.deck.length === 0) {
      el.innerHTML = '<p style="text-align: center; color: #b8ac8a;">Deck is empty</p>';
      return;
    }
    var sorted = state.deck.slice().sort(function (a, b) {
      return a.letter.localeCompare(b.letter);
    });
    sorted.forEach(function (tile) {
      var div = document.createElement('div');
      var deckVariantClass = tile.variant ? ' variant-' + tile.variant : '';
      div.className = 'treasure-choice' + deckVariantClass;
      var bonusDesc = Tiles.describeVariant(tile.variant) || Tiles.describeBonus(tile.bonus);
      div.innerHTML = '<strong>' + escapeHtml(tile.letter) + '</strong>' + (bonusDesc ? '<br>' + escapeHtml(bonusDesc) : '');
      div.style.cursor = 'default';
      el.appendChild(div);
    });
  }

  function renderConsumablesPanel() {
    var el = $('consumables-list');
    el.innerHTML = '';
    if (!state.player.consumables || state.player.consumables.length === 0) {
      el.innerHTML = '<p style="text-align: center;">You have no consumables</p>';
    } else {
      state.player.consumables.forEach(function (consumableId) {
        var def = Wordbound.Consumables.CONSUMABLE_DEFS[consumableId];
        if (!def) return;
        var btn = document.createElement('button');
        btn.className = 'treasure-choice';
        btn.innerHTML = '<strong>' + escapeHtml(def.name) + '</strong><br>' + escapeHtml(def.hint);
        if (state.combatActive) {
          btn.addEventListener('click', function () { Game.useConsumable(consumableId); });
        } else {
          btn.disabled = true;
          btn.style.opacity = '0.5';
          btn.style.cursor = 'not-allowed';
        }
        el.appendChild(btn);
      });
    }
  }

  function renderEvent() {
    if (!state.currentEvent) return;
    $('event-panel-heading').textContent = state.currentEvent.name;
    $('event-panel-text').textContent = state.currentEvent.text;
    var el = $('event-choices');
    el.innerHTML = '';
    state.currentEvent.choices.forEach(function (choice, index) {
      var btn = document.createElement('button');
      btn.className = 'treasure-choice';
      var reason = choice.disabledReason ? choice.disabledReason(state) : null;
      if (reason) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
        btn.innerHTML = escapeHtml(choice.text) + '<br><em style="color:#b8ac8a;">(' + escapeHtml(reason) + ')</em>';
      } else {
        btn.textContent = choice.text;
        btn.addEventListener('click', function () { Game.chooseEventOption(index); });
      }
      el.appendChild(btn);
    });
  }

  // The Shredder sub-screen (GOALS.md "FUN OVERHAUL 7/8"): the deck-viewer
  // list made pickable so the player chooses which tiles to destroy.
  function renderShredder() {
    var Events = window.Wordbound.Events;
    var remaining = shredderRemainingPicks();
    var picked = state.shredderSelection.length;
    $('shredder-status').textContent = picked > 0
      ? 'Feeding ' + picked + ' tile' + (picked > 1 ? 's' : '') + ' to the Shredder. ' +
        (remaining > 0 ? 'You may pick ' + remaining + ' more, or confirm.' : 'Confirm to destroy them.')
      : 'Pick up to ' + Events.SHREDDER_MAX_TILES + ' tiles to destroy (or confirm to feed it nothing).';

    var el = $('shredder-tiles-list');
    el.innerHTML = '';
    var sorted = state.deck.slice().sort(function (a, b) { return a.letter.localeCompare(b.letter); });
    sorted.forEach(function (tile) {
      var btn = document.createElement('button');
      var isPicked = state.shredderSelection.indexOf(tile.id) !== -1;
      var variantClass = tile.variant ? ' variant-' + tile.variant : '';
      btn.className = 'treasure-choice' + variantClass + (isPicked ? ' shredder-picked' : '');
      var bonusDesc = Tiles.describeVariant(tile.variant) || Tiles.describeBonus(tile.bonus);
      btn.innerHTML = '<strong>' + escapeHtml(tile.letter === '?' ? '★' : tile.letter) + '</strong>' +
        (bonusDesc ? '<br>' + escapeHtml(bonusDesc) : '') + (isPicked ? '<br><em>— for the teeth</em>' : '');
      // A tile not yet picked while the pick budget is spent is unpickable --
      // grey it so the cap reads visually, but keep already-picked tiles
      // clickable so a pick is always reversible.
      if (!isPicked && remaining <= 0) {
        btn.disabled = true;
        btn.style.opacity = '0.4';
        btn.style.cursor = 'not-allowed';
      } else {
        btn.addEventListener('click', function () { Game.toggleShredderTile(tile.id); });
      }
      el.appendChild(btn);
    });
  }

  function renderCombat() {
    var m = state.monster;
    var hpRatio = m.maxHp > 0 ? m.hp / m.maxHp : 0;
    var activeTraitId = Traits.activeTraitForHpRatio(m.traitPhases, hpRatio);
    var trait = Traits.TRAITS[activeTraitId];

    var info = $('monster-info');
    // innerHTML below rebuilds info's children, not info's own class list --
    // clear a leftover death-beat fade from a previous kill so it doesn't
    // dim this (alive) monster's panel too.
    info.classList.remove('monster-defeated');
    var tierClass = m.isBoss ? 'boss-tier' : (m.tier ? 'tier-' + m.tier : '');
    var tierGlyph = getTierGlyph(m.isBoss, m.tier);
    // Combo chip (GOALS.md "FUN OVERHAUL 1/8"): shows the streak of
    // consecutive distinct words played this fight and the damage bonus it
    // grants the NEXT word. Hidden at combo 0 so a reset (repeat word) is
    // visually obvious -- the chip just disappears.
    var combo = (state.comboState && state.comboState.combo) || 0;
    // FUN OVERHAUL 8/8: one-shot extra pop on the render where the streak grew.
    var comboBumpClass = state.comboBumped ? ' combo-chip-bump' : '';
    state.comboBumped = false;
    var comboChip = combo > 0
      ? '<div class="combo-chip' + comboBumpClass + '">Combo x' + combo + ' &middot; +' + Math.min(combo, 5) * 12 + '%</div>'
      : '';
    // Monster intent (GOALS.md "FUN OVERHAUL 2/8"): what the monster does on
    // ITS next turn, telegraphed before the player picks a word so they can
    // answer it. Signature moves (hex/devour/mend/enrage) get a distinct
    // color so a "special" incoming reads at a glance vs. a plain hit.
    var intentLine = '';
    if (m.intent) {
      var intentClass = Intents.isSignatureIntent(m.intent) ? ' intent-signature' : '';
      intentLine = '<div id="monster-intent" class="monster-intent' + intentClass + '">' + escapeHtml(Intents.describeIntent(m.intent)) + '</div>';
    }
    info.innerHTML =
      '<div class="monster-name ' + tierClass + '">' + tierGlyph + ' ' + escapeHtml(m.name) + '</div>' +
      '<div class="monster-hp-bar"><div id="monster-hp-fill" class="monster-hp-fill" style="width:' + Math.max(0, hpRatio * 100) + '%"></div></div>' +
      '<div class="monster-hp-text">' + m.hp + ' / ' + m.maxHp + ' HP</div>' +
      '<div class="monster-weakness">Weakness: ' + escapeHtml(trait.hint) + '</div>' +
      intentLine +
      comboChip;

    var rack = $('rack-display');
    rack.innerHTML = '';
    var currentRackIds = [];
    state.player.rack.forEach(function (tile, index) {
      var isSelected = state.selectedTileIds.indexOf(tile.id) !== -1;
      // MOBILE INPUT 2/3: a staged tile leaves an empty outlined slot in the
      // rack (same footprint -- the rack must not reflow). The tile itself
      // "lives" in the staging area below while staged; tapping the empty slot
      // unstages it back home.
      if (isSelected) {
        var slot = document.createElement('button');
        slot.type = 'button';
        slot.className = 'rack-slot-empty';
        slot.setAttribute('data-tile-id', tile.id);
        slot.setAttribute('data-tile-index', index);
        slot.setAttribute('aria-label', 'Return staged tile to rack');
        slot.addEventListener('click', function () { unstageTile(tile.id); });
        rack.appendChild(slot);
        currentRackIds.push(tile.id);
        return;
      }
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.draggable = true;
      btn.setAttribute('data-tile-id', tile.id);
      btn.setAttribute('data-tile-index', index);
      var isNewTile = state.rackJustRefilled || state.lastRackTileIds.indexOf(tile.id) === -1;
      var isHexed = tile.id === state.hexedTileId;
      var bonusClass = '';
      if (tile.variant) {
        bonusClass = ' has-bonus variant-' + tile.variant;
      } else if (tile.bonus) {
        bonusClass = ' has-bonus';
        if (tile.bonus.type === 'flatOnPlay') bonusClass += ' bonus-flat';
        else if (tile.bonus.type === 'multOnPlay') bonusClass += ' bonus-mult-play';
        else if (tile.bonus.type === 'multOnHold') bonusClass += ' bonus-mult-hold';
      }
      var rackSettle = state.settleTileIds.indexOf(tile.id) !== -1; // MOBILE INPUT 3/3: a tile that just landed back in the rack
      btn.className = 'letter-tile' + bonusClass + (isNewTile ? ' new-tile' : '') + (isHexed ? ' tile-hexed' : '') + (rackSettle ? ' tile-settle' : '');
      if (isHexed) btn.disabled = true;
      var val = Lexicon.LETTER_VALUES[tile.letter] || 0;
      var displayVal = tile.variant === Tiles.VARIANTS.VOLATILE ? val * 2 : val;
      btn.innerHTML = (tile.letter === '?' ? '★' : tile.letter) + '<sub>' + displayVal + '</sub>';
      if (isHexed) btn.title = 'Hexed -- locked for this turn';
      else if (tile.variant) btn.title = Tiles.describeVariant(tile.variant);
      else if (tile.bonus) btn.title = Tiles.describeBonus(tile.bonus);
      btn.addEventListener('click', function () {
        selectTileForWord(tile);
      });
      btn.addEventListener('dragstart', function (e) {
        startTileDrag(tile.id);
        e.dataTransfer.effectAllowed = 'move';
      });
      btn.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        state.dragOverIndex = index;
      });
      btn.addEventListener('dragleave', function () {
        state.dragOverIndex = null;
      });
      btn.addEventListener('drop', function (e) {
        e.preventDefault();
        reorderRackOnDrop(index);
      });
      btn.addEventListener('dragend', endTileDrag);

      // Touch reordering for mobile/tablet devices. Every terminating event is
      // handled (touchend AND touchcancel -- iOS fires the latter whenever it
      // steals the gesture), and the drag tracks the identifier of the finger
      // that started it so a second touch can't hijack or end it.
      btn.addEventListener('touchstart', function (e) {
        if (state.draggedTileId !== null) return; // a drag is already live -- ignore extra fingers
        if (e.touches.length > 0) {
          startTouchReorder(tile.id, index, e.touches[0].clientX, e.touches[0].identifier);
        }
      });
      btn.addEventListener('touchmove', function (e) {
        if (state.draggedTileId === null) return;
        var t = ownTouch(e.touches);
        if (!t) return;
        updateTouchReorder(t.clientX);
        if (state.touchDragThresholdCrossed && e.cancelable) {
          e.preventDefault(); // prevent scrolling while dragging
        }
      }, { passive: false });
      btn.addEventListener('touchend', function (e) {
        endTouchReorder(tile, e);
      });
      btn.addEventListener('touchcancel', function () { cancelTouchReorder(); });

      rack.appendChild(btn);
      currentRackIds.push(tile.id);
    });
    state.lastRackTileIds = currentRackIds;
    state.rackJustRefilled = false;

    renderStagingArea();
    sweepStagingDragArtifacts(); // a stuck drag ghost must never survive a re-render
    // MOBILE INPUT 3/3: the land-settle is one-shot -- both the rack loop above
    // and renderStagingArea have now consumed this render's settle ids, so clear
    // them (here, not inside renderStagingArea, which early-returns when the play
    // area is empty and would leave a rack-side settle to re-fire next render).
    if (state.settleTileIds.length) state.settleTileIds = [];
    renderInkSpendButtons();
    updateDamagePreview();
  }

  // INK SPEND: cost is always shown on the button itself (GOALS.md's
  // "every spend must show clear cost UI before committing"), and each
  // button disables itself once its cost is unaffordable -- the player
  // never finds out by clicking and getting a log message instead.
  function renderInkSpendButtons() {
    var overchargeBtn = $('btn-overcharge');
    var rewriteBtn = $('btn-rewrite-rack');
    if (!overchargeBtn || !rewriteBtn) return;
    var canOvercharge = state.player.ink >= Combat.OVERCHARGE_INK_COST;
    overchargeBtn.disabled = !state.overchargeArmed && !canOvercharge;
    overchargeBtn.classList.toggle('armed', !!state.overchargeArmed);
    overchargeBtn.textContent = state.overchargeArmed
      ? '⚡ Overcharged! (x' + Combat.OVERCHARGE_DAMAGE_MULTIPLIER + ')'
      : '⚡ Overcharge (-' + Combat.OVERCHARGE_INK_COST + ' ink)';

    var canRewrite = state.player.ink >= Combat.REWRITE_INK_COST;
    rewriteBtn.disabled = !canRewrite;
    rewriteBtn.textContent = '🔄 Rewrite (-' + Combat.REWRITE_INK_COST + ' ink)';
  }

  // GOALS.md FEATURE (staged-word damage preview): show what the currently
  // staged (or typed) word WOULD deal before it's played, using the exact
  // combat math the submit path uses -- Combat.previewWord runs the real
  // playWord + item hooks on clones, so this number can never drift from
  // reality. Neutral "--" whenever the tiles don't yet form a valid, formable
  // word (not a fake number, not an error). Called at the end of every combat
  // render (covers stage/unstage/reorder/clear -- all of which render()) and on
  // desktop typing input (wired in Game.init).
  function updateDamagePreview() {
    var el = $('damage-preview');
    if (!el) return;
    function neutral() {
      el.textContent = '--';
      el.className = 'damage-preview preview-empty';
    }
    if (!state.combatActive || !state.monster) { neutral(); return; }
    // Same word source the submit path uses: staged tiles in touch mode (input
    // is hidden), the typed/mirrored input on desktop.
    var word = state.touchMode ? stagedWord() : (($('word-input') && $('word-input').value) || '');
    word = (word || '').trim();
    if (!word) { neutral(); return; }
    var preview = Combat.previewWord(state.player, state.monster, word, state.comboState, {
      previousWord: state.previousWordThisFight,
      wordsPlayedThisFight: state.wordsPlayedThisFightCount,
      hexedTileId: state.hexedTileId,
      overcharge: state.overchargeArmed
    });
    if (!preview || !preview.valid) { neutral(); return; }
    var cls = 'damage-preview';
    var label;
    if (preview.multiplier === 0) {
      cls += ' preview-noeffect';
      label = '0 damage -- no effect';
    } else {
      if (preview.multiplier > 1) cls += ' preview-weak';
      label = '⚔ ' + preview.damage + ' damage'
        + (preview.multiplier > 1 ? ' -- weak point!' : preview.isRepeat ? ' -- repeat (x0.4)' : '');
      if (preview.isRepeat) cls += ' preview-repeat';
    }
    // INK SPEND: the toggle's own armed-ness already implies overcharge is
    // affordable (toggleOvercharge won't arm it otherwise) -- the preview
    // just needs to say so, not re-check.
    if (preview.overcharged) {
      cls += ' preview-overcharged';
      label += ' (overcharged)';
    }
    el.className = cls;
    el.textContent = label;
  }

  // MOBILE INPUT 1/3: the touch-mode blank-letter picker overlay. Toggled and
  // rebuilt every render (same pattern as the how-to-play overlay). Only ever
  // opens in touch-mode, but the render is mode-agnostic -- it just reflects
  // state.blankPickerOpen.
  var BLANK_PICKER_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  function renderBlankPicker() {
    var overlay = $('blank-picker-overlay');
    if (!overlay) return;
    overlay.classList.toggle('hidden', !state.blankPickerOpen);
    if (!state.blankPickerOpen) return;
    var grid = $('blank-picker-grid');
    if (!grid) return;
    grid.innerHTML = '';
    BLANK_PICKER_LETTERS.forEach(function (letter) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'blank-picker-letter';
      btn.textContent = letter;
      btn.setAttribute('data-blank-letter', letter);
      btn.addEventListener('click', function () { assignBlankLetter(letter); });
      grid.appendChild(btn);
    });
  }

  function renderStagingArea() {
    var stagingArea = $('staging-area');
    if (!stagingArea) return;
    stagingArea.innerHTML = '';
    if (state.selectedTileIds.length === 0) return;

    state.selectedTileIds.forEach(function (tileId) {
      var tile = state.player.rack.find(function (t) { return t.id === tileId; });
      if (!tile) return;
      var stageTile = document.createElement('div');
      var bonusClass = '';
      if (tile.variant) {
        bonusClass = ' has-bonus variant-' + tile.variant;
      } else if (tile.bonus) {
        bonusClass = ' has-bonus';
        if (tile.bonus.type === 'flatOnPlay') bonusClass += ' bonus-flat';
        else if (tile.bonus.type === 'multOnPlay') bonusClass += ' bonus-mult-play';
        else if (tile.bonus.type === 'multOnHold') bonusClass += ' bonus-mult-hold';
      }
      var stageSettle = state.settleTileIds.indexOf(tile.id) !== -1; // MOBILE INPUT 3/3: a tile that just landed in the play area
      stageTile.className = 'staged-tile' + bonusClass + (stageSettle ? ' tile-settle' : '');
      stageTile.setAttribute('data-tile-id', tile.id);
      var val = Lexicon.LETTER_VALUES[tile.letter] || 0;
      var stagedVal = tile.variant === Tiles.VARIANTS.VOLATILE ? val * 2 : val;
      // MOBILE INPUT 1/3: a blank staged via the touch picker shows the letter
      // the player chose for it (so the built word is legible), not a bare ★.
      // A blank's letter value is 0 either way.
      var stagedGlyph = tile.letter === '?' ? (state.blankAssignments[tile.id] || '★') : tile.letter;
      stageTile.innerHTML = stagedGlyph + '<sub>' + stagedVal + '</sub>';
      var variantTip = tile.variant ? Tiles.describeVariant(tile.variant)
        : (tile.bonus ? Tiles.describeBonus(tile.bonus) : '');
      stageTile.title = variantTip ? variantTip + ' -- tap to remove' : 'Tap to remove';
      // MOBILE INPUT 2/3: tapping a staged tile unstages it (slides home) --
      // UNLESS a drag just finished on it, whose synthesized click we suppress
      // so it doesn't undo the reorder/removal we just performed.
      stageTile.addEventListener('click', function () {
        if (state.suppressNextStagingClick) { state.suppressNextStagingClick = false; return; }
        unstageTile(tile.id);
      });
      // MOBILE INPUT 2/3 Phase 2: pointer drag (touch + mouse, unified) to
      // reorder within the play area or drag out of it to remove. A plain
      // press-release with no movement falls through to the click handler above.
      // Only the START of the gesture is bound to the tile. Move/end/cancel live
      // at the document level (wired once in Game.init) so a finger lifted
      // outside the tile -- or outside the viewport, or over a tile this element
      // no longer is because a render replaced it -- still ends the drag.
      stageTile.addEventListener('pointerdown', function (e) { startStagingDrag(tile.id, stageTile, e); });
      stagingArea.appendChild(stageTile);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function getTierGlyph(isBoss, tier) {
    if (isBoss) return '👑';
    if (tier === 'weak') return '📄';
    if (tier === 'normal') return '📖';
    if (tier === 'strong') return '📚';
    return '📖';
  }

  // ---- boot ---------------------------------------------------------

  // STRUCTURAL ticket (GOALS.md, React port): split out from Game.init so the
  // React app can wire up the module-dependency references (Lexicon, Floor,
  // RNG, etc. -- everything the business-logic functions below need) WITHOUT
  // the rest of Game.init, which unconditionally does `$('btn-new-run')
  // .addEventListener(...)` and 20+ other legacy-DOM lookups that throw the
  // moment any of those ids don't exist. React's tree never has them (it
  // renders its own `#root`, not wordbound.html's `#screen-*` markup), so
  // calling the full Game.init() from React would crash on the first line.
  // wordbound.html's own boot (`Game.init()` below) still runs both halves,
  // unchanged.
  Game._initDependencies = function () {
    Lexicon = window.Wordbound.Lexicon;
    Traits = window.Wordbound.Traits;
    Monsters = window.Wordbound.Monsters;
    Intents = window.Wordbound.Intents;
    Combat = window.Wordbound.Combat;
    Items = window.Wordbound.Items;
    Floor = window.Wordbound.Floor;
    Tiles = window.Wordbound.Tiles;
    RNG = window.Game.RNG;
    Characters = window.Wordbound.Characters;
    Achievements = window.Wordbound.Achievements;
    Duel = window.Wordbound.Duel;
    DuelCombat = window.Wordbound.DuelCombat;
    Music = window.Wordbound.Music;
    StolenLetters = window.Wordbound.StolenLetters;
  };

  Game.init = function () {
    Game._initDependencies();

    $('btn-new-run').addEventListener('click', Game.showCharacterSelect);
    $('btn-gameover-continue').addEventListener('click', Game.returnToMainMenu);
    $('btn-victory-continue').addEventListener('click', Game.returnToMainMenu);
    $('btn-skip-tile-reward').addEventListener('click', Game.skipTileReward);
    $('btn-skip-boss-reward').addEventListener('click', Game.skipBossItemReward);
    $('btn-view-deck').addEventListener('click', Game.openDeckViewer);
    $('btn-close-deck-viewer').addEventListener('click', Game.closeDeckViewer);
    $('btn-close-item-inspector').addEventListener('click', Game.closeItemInspector);
    $('btn-view-consumables').addEventListener('click', Game.openConsumablesPanel);
    $('btn-close-consumables').addEventListener('click', Game.closeConsumablesPanel);
    $('btn-confirm-shredder').addEventListener('click', Game.confirmShredder);
    $('btn-back-to-menu').addEventListener('click', Game.returnToMainMenu);
    $('btn-how-to-play').addEventListener('click', Game.openHowToPlay);
    $('btn-close-howto').addEventListener('click', Game.closeHowToPlay);

    $('btn-submit-word').addEventListener('click', function () {
      var input = $('word-input');
      // MOBILE INPUT 1/3: in touch-mode the input is hidden and typing is
      // disabled, so the staged tiles are the only word source.
      var word = state.touchMode ? stagedWord() : input.value;
      hapticTick(); // MOBILE INPUT 3/3: a tick on submit (feature-checked, reduced-motion-gated)
      Game.submitWord(word);
      input.value = '';
    });
    $('word-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        Game.submitWord(this.value);
        this.value = '';
      }
    });
    // GOALS.md FEATURE (staged-word damage preview): desktop typing has no
    // per-keystroke render, so update the live preview directly as the player
    // types (touch/click staging is covered by render()'s call instead).
    $('word-input').addEventListener('input', function () { updateDamagePreview(); });
    $('btn-clear-word').addEventListener('click', function () {
      $('word-input').value = '';
      state.selectedTileIds = [];
      state.blankAssignments = {};
      if (!state.touchMode) $('word-input').focus();
      render();
    });
    $('btn-overcharge').addEventListener('click', Game.toggleOvercharge);
    $('btn-rewrite-rack').addEventListener('click', Game.rewriteRack);

    $('btn-toggle-music').addEventListener('click', function () {
      var isMuted = toggleMusicMute();
      $('btn-toggle-music').textContent = isMuted ? '🔊' : '🔇';
    });

    $('music-volume').addEventListener('input', function () {
      var volume = this.value / 100;
      setMusicVolume(volume);
    });

    // Reflect the loaded (persisted) audio settings in the UI immediately,
    // rather than always showing the 10%/unmuted defaults on a fresh page load.
    $('music-volume').value = Math.round(audioSettings.volume * 100);
    $('btn-toggle-music').textContent = audioSettings.muted ? '🔇' : '🔊';

    // Hide the dictionary loading indicator now that all scripts are loaded
    var loadingIndicator = $('dictionary-loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.classList.add('hidden');
    }

    // AUDIO ticket (GOALS.md, "NO SOUND AT ALL", 2026-08-21): create+resume
    // the AudioContext on the very FIRST user gesture anywhere on the page,
    // not just whenever a sound first happens to want to play. This gives
    // stricter browsers (Safari/Firefox) the best possible chance to grant
    // the autoplay exemption, since it's tied to the earliest, most
    // unambiguous "the user just interacted" moment instead of whatever
    // event later triggers the first actual sound (which could be further
    // from the gesture, e.g. after other synchronous work). Runs once, then
    // removes itself; initAudioContext() itself still resumes defensively
    // on every call as a second line of defense.
    var primeAudioOnce = function () {
      try { initAudioContext(); } catch (e) { /* AudioContext unsupported -- nothing to do */ }
      document.removeEventListener('pointerdown', primeAudioOnce);
      document.removeEventListener('keydown', primeAudioOnce);
      document.removeEventListener('touchend', primeAudioOnce);
    };
    document.addEventListener('pointerdown', primeAudioOnce);
    document.addEventListener('keydown', primeAudioOnce);
    document.addEventListener('touchend', primeAudioOnce);

    // AUDIO ticket: the hardware ringer/silent switch mutes WebAudio in iOS
    // Safari, and there's no reliable JS-visible signal for that switch's
    // position -- so this can only ever be a hint, shown once, only on
    // devices where it's plausibly relevant (iPhone/iPad; iPadOS reports
    // itself as 'MacIntel' but with touch support, unlike a real Mac).
    var iosLike = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var audioTip = $('howto-audio-tip');
    if (audioTip && iosLike) audioTip.classList.remove('hidden');

    // Staged-tile drag: move/end/cancel are bound ONCE here, at the document
    // level, not per-tile. Per-tile end handlers die with the element (every
    // render rebuilds #staging-area), and a gesture the browser steals or a
    // finger lifted off the tile never reaches them -- which is how a dragged
    // tile ended up frozen mid-drag on Jaxon's iPhone. Document handlers cover
    // the pointer released anywhere, and touchcancel/blur cover iOS taking the
    // gesture away entirely. All of them are no-ops when no drag is live.
    document.addEventListener('pointermove', moveStagingDrag, { passive: false });
    document.addEventListener('pointerup', endStagingDrag);
    document.addEventListener('pointercancel', cancelStagingDrag);
    document.addEventListener('touchcancel', function () {
      abortStagingDrag();
      cancelTouchReorder();
    });
    window.addEventListener('blur', function () {
      abortStagingDrag();
      cancelTouchReorder();
    });

    // MOBILE INPUT 1/3: cancel button for the touch-mode blank-letter picker
    // (its A-Z grid buttons are wired per-render in renderBlankPicker).
    var blankCancelBtn = $('btn-cancel-blank-picker');
    if (blankCancelBtn) blankCancelBtn.addEventListener('click', closeBlankPicker);

    // BOSS ENTRANCE CUTSCENES ticket: the one-tap skip button. The
    // Escape/Enter/Space keydown listener is added/removed per-entrance
    // inside showBossEntrance/hideBossEntrance itself (it must not fire
    // outside an active entrance), but this button always exists in the DOM,
    // so it's bound once here, same as every other static button.
    var skipEntranceBtn = $('btn-skip-boss-entrance');
    if (skipEntranceBtn) skipEntranceBtn.addEventListener('click', hideBossEntrance);

    // SHAKESPEARE GUIDE + AUTHOR SHOPKEEPERS ticket: same "always exists,
    // bind once" reasoning as the boss-entrance skip button above.
    var skipGuideIntroBtn = $('btn-skip-guide-intro');
    if (skipGuideIntroBtn) skipGuideIntroBtn.addEventListener('click', hideGuideIntro);

    // MOBILE INPUT 1/3: detect coarse-pointer (touch) devices and switch to
    // tap-only input. Feature-checked so environments without matchMedia
    // (e.g. jsdom) simply stay in desktop mode. The media query is live --
    // re-evaluate on change so plugging in / unplugging a mouse, or a device
    // that reports both, flips modes without a reload.
    Game.applyTouchModeFromMedia();
    if (window.matchMedia) {
      var coarseMql = window.matchMedia('(pointer: coarse)');
      var onPointerChange = function () { Game.applyTouchModeFromMedia(); };
      if (coarseMql.addEventListener) coarseMql.addEventListener('change', onPointerChange);
      else if (coarseMql.addListener) coarseMql.addListener(onPointerChange); // older Safari
    }

    render();
  };

  // MOBILE INPUT 1/3: apply (or clear) touch-mode from the current
  // pointer-coarse media state. Exposed so tests can mock window.matchMedia
  // and re-derive the mode after the page has already booted. Toggling the
  // <body> class is what CSS keys off (hidden #word-input, tap-first copy);
  // all JS behavior keys off state.touchMode.
  Game.applyTouchModeFromMedia = function () {
    var coarse = false;
    if (window.matchMedia) {
      var mql = window.matchMedia('(pointer: coarse)');
      coarse = !!(mql && mql.matches);
    }
    state.touchMode = coarse;
    if (document.body) document.body.classList.toggle('touch-mode', coarse);
    applyTouchModeCopy(coarse);
  };

  // MOBILE INPUT 1/3, spec item 5: swap player-facing "type" copy for
  // tap-first wording in touch-mode (the input placeholder is hidden anyway;
  // the How-to-Play blank tip is the copy that actually matters).
  function applyTouchModeCopy(coarse) {
    var tip = $('howto-blank-tip');
    if (tip) {
      tip.innerHTML = coarse
        ? '★ blanks: tap the blank tile, then pick any letter from the grid.'
        : '★ blanks: just type any word — they fill in automatically.';
    }
  }
})();
