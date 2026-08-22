import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { VolumeGauge } from './VolumeGauge.jsx';

// FLIP position-slide (COMBAT JUICE ticket, GOALS.md) -- the counterpart to
// CombatScreen's own tile-settle CSS flash below: a tile that just staged or
// unstaged slides from its OLD screen position to its new one instead of
// popping instantly. Mirrors js/wordbound/game.js's private flipTile(fromRect,
// toEl) exactly (transform-only invert + double-rAF release into a real
// transition) -- reimplemented here rather than called through Game.* because
// it isn't exposed there at all (private, and reactTreeActive() would no-op
// it even if it were -- it's hard-wired to wordbound.html's own DOM ids).
// Guarded the same way vanilla's own flipTile is: reduced-motion, a missing
// requestAnimationFrame (jsdom has none -- confirmed directly, same
// convention as this file's duel-tick rAF loop and the touch-mode matchMedia
// guard elsewhere in this codebase), or a sub-pixel move all bail out before
// touching any style, so this is a true no-op under Vitest/RTL and only
// verifiable for real in test:react-build (a real browser).
function flipTileTo(fromRect, toEl) {
  if (!fromRect || !toEl || typeof toEl.getBoundingClientRect !== 'function') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof window.requestAnimationFrame !== 'function') return;
  const toRect = toEl.getBoundingClientRect();
  const dx = fromRect.left - toRect.left;
  const dy = fromRect.top - toRect.top;
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
  toEl.style.transition = 'none';
  toEl.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      toEl.style.transition = 'transform 0.2s ease-out';
      toEl.style.transform = '';
    });
  });
}

// React port of wordbound.html's #combat-panel (STRUCTURAL ticket, next
// sub-step after the node map). Deliberately does NOT call game.js's
// renderCombat()/animateDamage()/celebrateHit()/animatePlayerDamage() --
// those are hard-wired to old element ids (`$('monster-hp-fill')` etc.) that
// don't exist in the React tree and would throw (audited in PROGRESS.md
// before this run started). Decision made here, per that audit's two
// options: (b) React owns this screen's rendering and interaction natively,
// reading `state` directly and calling only the small set of Game.* action
// functions that mutate state without touching the DOM (submitWord,
// toggleOvercharge, rewriteRack) -- the same functions the dom-check test
// suite already drives headlessly.
//
// Word input (STRUCTURAL ticket, remaining-scope (c) step 2, rebuilt this
// run): rack-tile clicks now go through the REAL engine staging functions
// (Game.selectTileForWord/unstageTile, wrapping game.js's private
// selectTileForWord/unstageTile) instead of appending to a local plain
// string -- state.selectedTileIds is the actual source of truth, same as
// wordbound.html, and a clicked tile visually moves out of the rack into a
// real staging row (mirrors renderStagingArea()), leaving an empty
// rack-slot behind that unstages it back. `word` is still local React state
// for the free-typing desktop path (Combat.playWord matches a submitted
// word against the rack by LETTER, and desktop submits `word-input`'s raw
// text value regardless of what's staged -- confirmed by reading game.js's
// btn-submit-word handler, this is real existing vanilla behavior, not a
// port shortcut) but it's now kept in sync with the engine's own
// Game.stagedWord() after every stage/unstage/clear, exactly like
// game.js's syncWordInput() keeps its #word-input mirrored.
// The touch-mode blank-letter picker overlay (STRUCTURAL ticket, remaining-
// scope (c) step 2, this run): tapping a blank tile in touch mode calls the
// real Game.selectTileForWord -> game.js's private selectTileForWord ->
// opens the A-Z picker (state.blankPickerOpen/blankPickerTileId), which now
// renders below as a real .blank-picker-overlay (same CSS classes/shape
// wordbound.html's own overlay uses) -- picking a letter calls
// Game.assignBlankLetter, Cancel calls Game.closeBlankPicker. Before this,
// state.blankPickerOpen flipped true with nothing to render it, so a touch
// player tapping a blank saw no feedback at all; a blank was effectively
// unplayable on touch (desktop is unaffected -- selectTileForWord no-ops on
// a blank there, typing the letter is still how a blank gets used).
// Desktop MOUSE drag reordering within the rack (STRUCTURAL ticket,
// remaining scope (c)): wired via Game.startTileDrag/reorderRackOnDrop/
// endTileDrag wrappers, calling game.js's own private dragstart/drop/
// dragend handlers -- same HTML5 draggable/dragstart/dragover/drop/dragend
// event set wordbound.html's rack tiles use, same semantics (drop reorders
// the dragged tile to land at the target tile's index). state.dragOverIndex
// is deliberately not mirrored here: it has no CSS rule or DOM read
// anywhere in either tree (confirmed by grep), so vanilla itself never uses
// it for visual feedback -- onDragOver only needs preventDefault() to make
// the drop legal.
// TOUCH reordering within the rack (STRUCTURAL ticket, remaining scope (c),
// this run): wired via Game.startTouchReorder/updateTouchReorder/
// endTouchReorder/cancelTouchReorder, same wrapper pattern, calling
// game.js's own private touch-reorder state machine. The rack container
// below carries id="rack-display" (new this run) because
// updateTouchReorder's private getTileAtPosition looks tiles up via
// document.getElementById -- React's other containers stay id-less on
// purpose, this is the one exception, scoped narrowly to what that one
// function needs. Each letter-tile also now carries data-tile-index,
// which getTileAtPosition reads to resolve a touch position back to a rack
// slot -- not previously rendered since nothing needed it before this.
// A plain tap (no drag) resolves through endTouchReorder -> the same
// selectTileForWord tap path onClick already uses; e.preventDefault() on
// touchend (called inside endTouchReorder itself, unaffected by React's
// passive-listener treatment of touchstart/touchmove) suppresses the
// browser's synthesized post-touchend click, so a real tap does not
// double-fire through onClick, matching vanilla exactly. Known minor gap
// vs. vanilla: touchmove does NOT call preventDefault() here (React
// registers onTouchMove passively at the root, so it would be a silent
// no-op there), so a real touch rack-drag may let the page scroll slightly
// instead of suppressing it the way wordbound.html's explicit
// { passive: false } listener does -- the reorder itself is unaffected.
// Staged-tile ghost/gap drag system (STRUCTURAL ticket, remaining scope (c),
// the last core piece, this run): wired via Game.startStagingDrag/
// moveStagingDrag/endStagingDrag/cancelStagingDrag, the same thin-wrapper
// pattern as the rack drag work above, around game.js's own unified
// pointer-based (mouse + touch, via PointerEvent) drag machinery. Unlike
// the rack's HTML5-dnd/touch-event handlers, this system live-mutates
// `style.transform` on real DOM nodes mid-gesture BY DESIGN (a ghost tile
// tracking the pointer, siblings sliding to open a gap) and deliberately
// renders exactly once, on release -- see game.js's own header comment on
// startStagingDrag et al. for the render-destroys-the-dragged-element
// hazard this avoids. That means, unlike every other Game.* call in this
// file, `Game.startStagingDrag`/`moveStagingDrag` are called DIRECTLY,
// never through `act()` -- wrapping them would force a React re-render
// mid-gesture and destroy the very ghost/gap transforms the gesture is
// animating. Only the terminal calls (`endStagingDrag` on drop,
// `cancelStagingDrag` on an aborted gesture) go through `act()`, since
// those are the two points where `state.selectedTileIds` may actually have
// changed (a reorder or a drag-out-to-remove) and the word needs
// resyncing -- matching vanilla's own "one render on release" design.
// pointerdown is bound per-tile (mirrors vanilla's own stageTile.addEvent-
// Listener('pointerdown', ...)); pointermove/pointerup/pointercancel are
// registered at the document level in a mount-once effect below, mirroring
// vanilla's Game.init() wiring them once globally -- pointer capture
// (`el.setPointerCapture`, called inside Game.startStagingDrag) routes
// those events to the dragged tile regardless of where the pointer
// physically is, and a document listener still receives them via bubbling.
// `#staging-area` (id, new this run) and each staged tile's
// `data-tile-id` (new this run) are what the private machinery's
// `$('staging-area')`/`getAttribute('data-tile-id')` DOM reads need --
// same "add the one id/attribute the vanilla function already expects"
// pattern as `#rack-display`/`data-tile-index` before it.
// Click suppression: a real drag's pointerup is followed by the browser's
// own synthesized click (pointerup -> click, always, per spec) -- vanilla's
// own stageTile click listener checks `state.suppressNextStagingClick`
// (set true by endStagingDrag only when the gesture actually crossed the
// move threshold) before unstaging, so a real drag's synthesized click
// doesn't immediately undo the reorder/removal it just performed; a plain
// tap (never crossed) leaves the flag false and the click still unstages
// normally -- ported as the same read-then-clear check inline below,
// since `state` is the same mutable object read/written directly, same as
// vanilla, and this check itself was never behind a Game.* wrapper there
// either (it lives inline in renderStagingArea's own click listener).
// One accepted, documented gap vs. vanilla, genuinely React-specific:
// vanilla's DOM is one persistent tree, so a stuck ghost from an
// interrupted gesture is always reachable by the next render's
// sweepStagingDragArtifacts() sweep. If CombatScreen itself unmounts mid-
// gesture (e.g. the ~800ms killing-blow window transitioning the screen
// away while a drag is live -- a genuinely obscure input timing), this
// component's document listeners are torn down with it and
// state.stagingDrag can outlive the component that started it. The
// mount-once effect's cleanup does NOT explicitly abort a live drag for
// this reason (not confirmed reachable in practice, and forcibly aborting
// on every unmount -- including ordinary screen transitions after combat
// ends -- would be a bigger, unverified behavior change for a hazard this
// narrow); flagged here rather than silently assumed away.
// Haptic ticks (hapticTick(), navigator.vibrate): already real, not a gap --
// selectTileForWord/unstageTile/assignBlankLetter call it unconditionally,
// and React already calls those same private functions via the Game.*
// wrappers, so a stage/unstage already vibrates on a real device today (no
// separate port needed; confirmed by reading the call sites, not assumed).
// The `.tile-settle` one-shot land flash (COMBAT JUICE ticket, GOALS.md) IS
// now ported -- see the prevSelectedTileIdsRef block below, which computes
// it natively (same StrictMode-safe pattern as combo-chip-bump/new-tile)
// rather than reading the shared state.settleTileIds array, since nothing
// in the React tree ever consumed/cleared that array. The FLIP-style
// position-SLIDE (flipTile, a distinct mechanism from the .tile-settle CSS
// class -- see css/wordbound.css's own comment) is ALSO now ported -- see
// the module-level flipTileTo() helper above and the
// pendingFlipFromRef/captureFlipFrom block below, which reimplement it
// natively for the same reason as tile-settle: game.js's own flipTile is a
// private function, not exposed on Game.*, and is hard-wired to
// wordbound.html's own DOM ids anyway. Captured at the exact same two call
// sites vanilla's own selectTileForWord/unstageTile call flipTile from (the
// real stage branch of a non-blank rack-tile click, and any unstage
// regardless of trigger) -- NOT from the blank-picker's assignBlankLetter,
// which game.js itself never flips either (confirmed by grep: only 2
// flipTile call sites exist in game.js, and assignBlankLetter isn't one of
// them).
// game.js itself needed two small additive null-guards to make this safe:
// syncWordInput()'s and selectTileForWord()'s `$('word-input')` DOM access
// now checks the element exists first (same "no #word-input in the React
// tree" reasoning as every other reactTreeActive()-style guard this ticket
// has added) -- a guaranteed no-op for wordbound.html, which always has
// that element.
//
// Damage/hit animations (floating numbers, hp-flash, screen-shake,
// CRUSHING!/MAGNIFICENT! banners): also not ported. Game.submitWord resolves
// the counterattack inside its own setTimeout and never returns or exposes
// the intermediate result, so there's nothing for React to hook a one-shot
// animation off without reaching back into game.js's internals. The HP bar
// and message log both update for real (state.monster.hp is mutated
// synchronously by Combat.playWord before submitWord's setTimeout even
// fires), so the fight is fully legible without the juice -- just quieter.
const BLANK_PICKER_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function CombatScreen({ state, Game, act }) {
  const Combat = window.Wordbound.Combat;
  const Intents = window.Wordbound.Intents;
  const Traits = window.Wordbound.Traits;
  const Lexicon = window.Wordbound.Lexicon;
  const Tiles = window.Wordbound.Tiles;

  const [word, setWord] = useState('');
  const inputRef = useRef(null);
  const pendingResolveRef = useRef(null);

  useEffect(() => () => clearTimeout(pendingResolveRef.current), []);

  const monster = state.monster;

  // DUEL-GAUGE COMBAT ticket (GOALS.md, integration run): the real-time
  // loop a duel-mode fight runs on. Deliberately bypasses act()/bump on
  // every frame -- same "mutate state directly, let the caller decide when
  // to force a real re-render" pattern the staged-tile drag system already
  // established (see this file's own header comment on
  // startStagingDrag/moveStagingDrag) -- ticking the gauge 60x/sec through
  // the full app-wide act() cycle would be wasteful and would fight this
  // component's own per-frame render. A local `duelTick` counter forces
  // just THIS component to re-render each frame (so the mounted
  // VolumeGauge picks up the latest gauge/health/i-frame state via its own
  // props); a real act() bump only fires once the duel actually resolves
  // (healthBlocks hits 0 -> game over), the one moment something OUTSIDE
  // this component's own props needs to know. Guarded on
  // `typeof requestAnimationFrame` -- jsdom has no rAF (confirmed directly
  // against a fresh JSDOM instance), so this is a true no-op under
  // Vitest/RTL, same as the touch-mode matchMedia guard elsewhere in this
  // repo; real per-frame behavior is verified by
  // test/verify-react-build.js against a real browser instead.
  const [, setDuelTick] = useState(0);
  const duelLastNowRef = useRef(null);
  useEffect(() => {
    if (!monster.duel || !state.duel || typeof requestAnimationFrame !== 'function') return undefined;
    let rafId = null;
    duelLastNowRef.current = Game.getDuelClockNow();
    function frame() {
      const now = Game.getDuelClockNow();
      const prev = duelLastNowRef.current != null ? duelLastNowRef.current : now;
      duelLastNowRef.current = now;
      Game.tickDuel(now, Math.max(0, now - prev));
      if (state.duel && state.duel.isTerminal()) {
        // The duel just resolved (e.g. a lost push emptied healthBlocks,
        // synchronously calling endRun(false) inside Game.startDuelFight's
        // own 'player-defeated' handler) -- flush a REAL re-render so React
        // notices state.screen changed underneath it, then stop the loop.
        act(() => {});
        return;
      }
      setDuelTick((n) => n + 1);
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
    return () => { if (rafId != null) cancelAnimationFrame(rafId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monster.duel, state.duel]);

  // Combat.playWord mutates state.monster.hp synchronously (confirmed by
  // reading combat.js), so `act()`'s single bump already shows the new HP.
  // But Game.submitWord resolves the monster's COUNTERATTACK (ink loss,
  // next intent, its own no-op render()) inside a setTimeout -- 220ms
  // normally, +500ms more on a killing blow (TILE_PLAY_ANIM_MS/
  // MONSTER_DEATH_BEAT_MS in game.js) -- so a second bump is scheduled here,
  // buffered past those constants, to pick up that second wave of state
  // once it actually lands. Only one pending bump is kept (cleared/replaced
  // each submit) since only the latest word's resolution matters.
  function submit(rawWord) {
    if (!state.combatActive || !monster || monster.hp <= 0) return;
    const trimmed = (rawWord || '').trim();
    if (!trimmed) return;
    // Duel-mode fights need the SAME clock reading the tick loop above and
    // duel.registerCrescendoPeak() use, or a parry that landed by wall-clock
    // feel would be checked against a different time axis than the one that
    // registered the peak. Every other (turn-based) fight omits it.
    act(() => Game.submitWord(trimmed, monster.duel ? Game.getDuelClockNow() : undefined));
    setWord('');
    clearTimeout(pendingResolveRef.current);
    const diedThisPlay = state.monster && state.monster.hp <= 0;
    pendingResolveRef.current = setTimeout(() => act(() => {}), diedThisPlay ? 800 : 300);
    if (!state.touchMode) inputRef.current?.focus();
  }

  function clearWord() {
    // Mirrors game.js's #btn-clear-word handler: clears the typed text AND
    // the real staged-tile selection (Game.clearStagedWord), not just this
    // component's local mirror of it.
    act(Game.clearStagedWord);
    setWord('');
    if (!state.touchMode) inputRef.current?.focus();
  }

  function stageOrUnstage(tile) {
    // FLIP capture BEFORE act() mutates state, same "only the real stage
    // branch flips" condition as the setWord resync just below (a blank
    // tile never actually moves here -- see this file's header comment).
    if (tile.letter !== '?') captureFlipFrom(tile.id);
    act(() => Game.selectTileForWord(tile.id));
    // A blank tile is a genuine no-op here on desktop (game.js's
    // selectTileForWord returns immediately without touching
    // selectedTileIds -- typing the letter is how a blank gets used) or
    // opens the blank picker in touch mode (also no selectedTileIds
    // change yet, resolved later by Game.assignBlankLetter once that
    // overlay exists) -- either way nothing staged changed, so don't
    // clobber whatever's currently typed. Every other tile really did just
    // get pushed onto state.selectedTileIds, so resync for real, matching
    // game.js's own syncWordInput() call in the same branch.
    if (tile.letter !== '?') setWord(Game.stagedWord());
  }

  function unstage(tileId) {
    // FLIP capture BEFORE act() mutates state -- unconditional, matching
    // game.js's own unstageTile, which always captures fromRect regardless
    // of which UI affordance (rack empty-slot vs. staged-tile click)
    // triggered the unstage.
    captureFlipFrom(tileId);
    act(() => Game.unstageTile(tileId));
    setWord(Game.stagedWord());
  }

  // The staged-tile row's own click handler -- see the header comment's
  // "Click suppression" section. Only the staging-area buttons need this;
  // the rack's empty-slot "return to rack" button (below) has no drag
  // gesture of its own and unstages unconditionally, same as vanilla.
  function unstageFromStagingArea(tileId) {
    if (state.suppressNextStagingClick) {
      state.suppressNextStagingClick = false;
      return;
    }
    unstage(tileId);
  }

  // Document-level pointermove/pointerup/pointercancel for the staged-tile
  // ghost/gap drag system -- see the header comment for why these are wired
  // once here rather than per-tile, and why move/cancel bypass act() while
  // drop doesn't. Registered once per mount (a fresh CombatScreen per
  // fight), torn down on unmount.
  // Every pointerup anywhere in the document reaches this listener -- not
  // just ones ending a staging drag (e.g. userEvent's own click-to-focus
  // choreography on the word input, or a plain Play Word click, both fire a
  // real pointerdown/pointerup pair that bubbles here). Guarding on
  // `state.stagingDrag` truthiness BEFORE calling through is required, not
  // an optimization: Game.endStagingDrag's own early return already no-ops
  // safely when there's nothing to end, but this component's act()/
  // setWord() wrapper around it does not -- an unconditional call was
  // caught forcing a bump() and resyncing `word` to Game.stagedWord() (''
  // outside a drag) on every unrelated pointerup, clobbering text the
  // player had just started typing. Caught by RunScreen.test.jsx's own
  // GAME_OVER test going from consistently green to consistently red the
  // moment this effect was added, root-caused rather than left as a
  // mystery regression.
  useEffect(() => {
    function onMove(e) { Game.moveStagingDrag(e); }
    function onUp(e) {
      if (!state.stagingDrag) return;
      act(() => Game.endStagingDrag(e));
      setWord(Game.stagedWord());
    }
    function onCancel(e) { Game.cancelStagingDrag(e); }
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Runs after every commit (no dependency array, deliberately) -- mirrors
  // vanilla's renderRun() calling sweepStagingDragArtifacts() on every
  // render. Cheap (a few DOM reads); see the header comment's "accepted gap"
  // note for the one hazard this can't fully close (a component unmount
  // mid-gesture).
  useEffect(() => { Game.sweepStagingDragArtifacts(); });

  function pickBlankLetter(letter) {
    act(() => Game.assignBlankLetter(letter));
    setWord(Game.stagedWord());
  }

  function cancelBlankPicker() {
    act(() => Game.closeBlankPicker());
  }

  const preview = useMemo(() => {
    if (!state.combatActive || !monster || !word.trim()) return null;
    return Combat.previewWord(state.player, monster, word.trim(), state.comboState, {
      previousWord: state.previousWordThisFight,
      wordsPlayedThisFight: state.wordsPlayedThisFightCount,
      hexedTileId: state.hexedTileId,
      overcharge: state.overchargeArmed,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word, monster && monster.hp, state.overchargeArmed]);

  // Combo-bump (GOALS.md STRUCTURAL remaining-scope (c), "the combo chip's
  // one-shot bump-pop class"): game.js's own renderCombat() reads a shared
  // state.comboBumped flag and clears it as a side effect of rendering --
  // not portable here as-is, since React (especially StrictMode, which
  // main.jsx wraps the app in) may invoke a function component's body more
  // than once per commit, and a consumed-during-render one-shot flag would
  // get eaten by a throwaway invocation. Tracked natively instead: a ref
  // holds the combo value as of the last COMMITTED render, updated in an
  // effect (which StrictMode only double-invokes harmlessly, never mutating
  // shared engine state); comparing the current combo against it during
  // render tells us if this render is the one where the streak grew.
  const combo = (state.comboState && state.comboState.combo) || 0;
  const prevComboRef = useRef(combo);
  const comboBumped = combo > prevComboRef.current;
  useEffect(() => { prevComboRef.current = combo; }, [combo]);

  // new-tile slide-in (GOALS.md STRUCTURAL remaining-scope (c), "the rack's
  // ...new-tile...cosmetic class"): vanilla diffs the rack against
  // state.lastRackTileIds (a tile id absent from last render's rack is
  // freshly drawn). Ported the same way, natively: a ref holds the rack's
  // tile ids as of the last committed render. Note this naturally covers
  // "just entered this fight" too (the ref starts empty on mount, so every
  // starting tile reads as new) -- vanilla needs a separate rackJustRefilled
  // flag for that case only because it reuses one persistent DOM tree across
  // fights; React remounts CombatScreen per fight already. Known minor
  // divergence, harmless: opening/closing a mid-fight side panel (deck
  // viewer etc.) also remounts this component, so the untouched rack
  // briefly re-plays the slide-in too -- cosmetic only, not a functional gap.
  const prevRackIdsRef = useRef([]);
  useEffect(() => { prevRackIdsRef.current = state.player.rack.map((t) => t.id); });

  // tile-settle land flash (COMBAT JUICE ticket, GOALS.md): a tile that just
  // staged (left the rack) or unstaged (returned to the rack) gets a short
  // one-shot brightness/glow flash for exactly one render -- the role
  // game.js's own state.settleTileIds/markSettle plays for wordbound.html.
  // Ported natively, same reasoning as combo-chip-bump/new-tile above,
  // rather than reading state.settleTileIds directly: StrictMode can invoke
  // this component's body more than once per commit, so a shared one-shot
  // flag consumed during render risks being eaten by a throwaway
  // invocation. A ref holds selectedTileIds as of the last COMMITTED
  // render; comparing membership against it during render tells us which
  // tile just crossed the rack<->staging boundary. Deliberately CSS-only,
  // matching vanilla's own .tile-settle keyframe exactly (brightness/
  // box-shadow only, no transform -- see css/wordbound.css's own comment on
  // why: a transform-based keyframe would fight the separate FLIP
  // position-slide). That FLIP slide itself (flipTile, a distinct
  // mechanism from this CSS class) is NOT ported -- still open, per
  // CombatScreen's header comment and GOALS.md's COMBAT JUICE ticket.
  // Also deliberately does NOT flash on a plain drag/touch REORDER within
  // the rack or staging row: read markSettle's only 3 call sites in
  // game.js (unstageTile, selectTileForWord, assignBlankLetter) directly --
  // none of the reorder functions (startStagingDrag/reorderRackOnDrop/etc.)
  // call it either, so this matches actual vanilla behavior, not the
  // ticket bullet's looser "staged, unstaged, or reordered" phrasing.
  // Same known minor divergence as new-tile above: a mid-fight side-panel
  // remount re-flashes any already-staged tiles once, since the ref starts
  // empty on mount.
  const prevSelectedTileIdsRef = useRef([]);
  useEffect(() => { prevSelectedTileIdsRef.current = state.selectedTileIds.slice(); });

  // FLIP position-slide (COMBAT JUICE ticket, GOALS.md) -- see flipTileTo()'s
  // own header comment above for the full reasoning. captureFlipFrom(tileId)
  // is called synchronously, BEFORE act() mutates state, from the same two
  // places game.js's own selectTileForWord/unstageTile capture fromRect: it
  // reads the tile's CURRENT on-screen element and stashes its rect in a ref
  // keyed by tile id. Because act()'s bump() schedules the re-render rather
  // than forcing it synchronously, the DOM is still showing the OLD position
  // at the moment this runs. useLayoutEffect (not useEffect -- must run and
  // write styles BEFORE the browser paints the just-committed DOM, exactly
  // like flipTile's own "set the inverted transform synchronously, then
  // double-rAF into the real transition" technique) runs after every commit,
  // consumes any pending capture, re-finds the SAME tile id's element (now on
  // the other side, post-move) and flips it.
  // Looked up by `data-flip-tile-id` -- a name deliberately DISTINCT from the
  // pre-existing `data-tile-id` staged tiles already carry (for the staging-
  // drag machinery's own `getAttribute('data-tile-id')` reads) -- caught the
  // hard way, not assumed: giving the rack tile button a `data-tile-id` too
  // (the obvious-looking choice) made game.js's OWN private, never-exposed
  // flipTile() calls inside selectTileForWord/unstageTile ALSO start
  // resolving real elements via their own tileElIn('rack-display', ...)
  // lookups -- those calls run unconditionally regardless of caller and were
  // only ever a no-op in the React tree because rack tiles had nothing
  // matching `[data-tile-id="..."]` for them to find. That produced a real,
  // reproducible bug: TWO independent flip mechanisms (game.js's own direct-
  // DOM one, and this file's React-native one) fighting over the same
  // element's transform/transition on every stage/unstage, confirmed to
  // break test:react-build's native drag-and-drop check (dragTo() sampling a
  // rack tile's real screen position mid-fight, while a second, uninvited
  // animation from game.js's own call was also live on it). Using a private
  // attribute name keeps game.js's own internal calls exactly as inert as
  // they already were before this run -- this file's mechanism is the only
  // one now doing anything.
  const pendingFlipFromRef = useRef({});
  function captureFlipFrom(tileId) {
    if (typeof document === 'undefined') return;
    const el = document.querySelector('[data-flip-tile-id="' + tileId + '"]');
    if (el && el.getBoundingClientRect) pendingFlipFromRef.current[tileId] = el.getBoundingClientRect();
  }
  useLayoutEffect(() => {
    const pending = pendingFlipFromRef.current;
    const ids = Object.keys(pending);
    if (!ids.length) return;
    ids.forEach((tileId) => {
      const fromRect = pending[tileId];
      delete pending[tileId];
      flipTileTo(fromRect, document.querySelector('[data-flip-tile-id="' + tileId + '"]'));
    });
  });

  if (!monster) return null;

  const hpRatio = monster.maxHp > 0 ? monster.hp / monster.maxHp : 0;
  const activeTraitId = Traits.activeTraitForHpRatio(monster.traitPhases, hpRatio);
  const trait = Traits.TRAITS[activeTraitId];
  const tierClass = monster.isBoss ? 'boss-tier' : (monster.tier ? 'tier-' + monster.tier : '');
  const canOvercharge = state.player.ink >= Combat.OVERCHARGE_INK_COST;
  const canRewrite = state.player.ink >= Combat.REWRITE_INK_COST;
  const dead = monster.hp <= 0;

  let previewClass = 'damage-preview preview-empty';
  let previewLabel = '--';
  if (preview && preview.valid) {
    previewClass = 'damage-preview';
    if (preview.multiplier === 0) {
      previewClass += ' preview-noeffect';
      previewLabel = '0 damage -- no effect';
    } else {
      if (preview.multiplier > 1) previewClass += ' preview-weak';
      previewLabel = '⚔ ' + preview.damage + ' damage' +
        (preview.multiplier > 1 ? ' -- weak point!' : preview.isRepeat ? ' -- repeat (x0.4)' : '');
      if (preview.isRepeat) previewClass += ' preview-repeat';
    }
    if (preview.overcharged) {
      previewClass += ' preview-overcharged';
      previewLabel += ' (overcharged)';
    }
  }

  return (
    <div className={'combat-panel' + (monster.isBoss ? ' boss-combat' : '')}>
      <div className="monster-info">
        <div className={'monster-name ' + tierClass}>{tierGlyph(monster.isBoss, monster.tier)} {monster.name}</div>
        <div className="monster-hp-bar">
          <div className="monster-hp-fill" style={{ width: Math.max(0, hpRatio * 100) + '%' }} />
        </div>
        <div className="monster-hp-text">{monster.hp} / {monster.maxHp} HP</div>
        <div className="monster-weakness">Weakness: {trait.hint}</div>
        {monster.intent && (
          <div className={'monster-intent' + (Intents.isSignatureIntent(monster.intent) ? ' intent-signature' : '')}>
            {Intents.describeIntent(monster.intent)}
          </div>
        )}
        {combo > 0 && (
          <div className={'combo-chip' + (comboBumped ? ' combo-chip-bump' : '')}>
            Combo x{combo} &middot; +{Math.min(combo, 5) * 12}%
          </div>
        )}
      </div>

      {monster.duel && state.duel && (
        // approachingCrescendoSecondsAway is now live: game.js's
        // startDuelFight wires the sequencer's 'crescendo-approaching' event
        // into state.duelApproachingCrescendo (a fixed peakTime on the
        // duel clock's own axis), and Game.getApproachingCrescendoSecondsAway
        // just subtracts the current reading from it -- recomputed every
        // render, which the duel rAF loop above already forces once per
        // frame while a duel is active, so this stays a live countdown with
        // no extra state of its own here.
        <VolumeGauge
          duel={state.duel}
          now={Game.getDuelClockNow()}
          approachingCrescendoSecondsAway={Game.getApproachingCrescendoSecondsAway(Game.getDuelClockNow())}
        />
      )}

      <div className="rack-display" id="rack-display">
        {state.player.rack.map((tile, index) => {
          const isHexed = tile.id === state.hexedTileId;
          const isStaged = state.selectedTileIds.indexOf(tile.id) !== -1;
          const isNewTile = !prevRackIdsRef.current.includes(tile.id);
          const justUnstaged = !isStaged && prevSelectedTileIdsRef.current.includes(tile.id);
          const val = Lexicon.LETTER_VALUES[tile.letter] || 0;
          const displayVal = tile.variant === Tiles.VARIANTS.VOLATILE ? val * 2 : val;
          // A staged tile "lives" in the staging area below -- the rack
          // leaves an empty, same-footprint slot behind so the rack doesn't
          // reflow, exactly like game.js's renderCombat() does.
          if (isStaged) {
            return (
              <button
                key={tile.id}
                type="button"
                className="rack-slot-empty"
                aria-label="Return staged tile to rack"
                onClick={() => unstage(tile.id)}
              />
            );
          }
          let bonusClass = '';
          if (tile.variant) bonusClass = ' has-bonus variant-' + tile.variant;
          else if (tile.bonus) {
            bonusClass = ' has-bonus';
            if (tile.bonus.type === 'flatOnPlay') bonusClass += ' bonus-flat';
            else if (tile.bonus.type === 'multOnPlay') bonusClass += ' bonus-mult-play';
            else if (tile.bonus.type === 'multOnHold') bonusClass += ' bonus-mult-hold';
          }
          const title = isHexed ? 'Hexed -- locked for this turn'
            : tile.letter === '?' ? 'Blank -- tap to stage, then type the letter you want (touch) or type it directly (desktop)'
            : tile.variant ? Tiles.describeVariant(tile.variant)
            : tile.bonus ? Tiles.describeBonus(tile.bonus)
            : undefined;
          return (
            <button
              key={tile.id}
              type="button"
              draggable
              data-tile-index={index}
              data-flip-tile-id={tile.id}
              className={'letter-tile' + bonusClass + (isHexed ? ' tile-hexed' : '') + (isNewTile ? ' new-tile' : '') + (justUnstaged ? ' tile-settle' : '')}
              disabled={isHexed}
              title={title}
              onClick={() => stageOrUnstage(tile)}
              onDragStart={(e) => {
                act(() => Game.startTileDrag(tile.id));
                if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                act(() => Game.reorderRackOnDrop(index));
              }}
              onDragEnd={() => act(() => Game.endTileDrag())}
              onTouchStart={(e) => {
                // Mirrors wordbound.html's own touchstart handler exactly:
                // a drag already live (another finger) is ignored.
                if (state.draggedTileId !== null) return;
                if (e.touches.length > 0) {
                  Game.startTouchReorder(tile.id, index, e.touches[0].clientX, e.touches[0].identifier);
                }
              }}
              onTouchMove={(e) => {
                if (state.draggedTileId === null) return;
                // Inline equivalent of game.js's private ownTouch(list) --
                // finds the touch that owns this drag (falls back to the
                // first touch for synthetic/no-identifier events, same as
                // the private helper). Pure state read, so done directly
                // here rather than via a Game.* wrapper.
                const touches = e.touches;
                let ownX = null;
                if (touches && touches.length) {
                  if (state.touchIdentifier === null || state.touchIdentifier === undefined) {
                    ownX = touches[0].clientX;
                  } else {
                    for (let i = 0; i < touches.length; i++) {
                      if (touches[i].identifier === state.touchIdentifier) { ownX = touches[i].clientX; break; }
                    }
                  }
                }
                if (ownX === null) return;
                Game.updateTouchReorder(ownX);
                // NOT calling e.preventDefault() here (unlike wordbound.html's
                // { passive: false } touchmove listener): React registers
                // onTouchMove passively at the root, so preventDefault() would
                // be a silent no-op there. Known minor gap vs. vanilla: the
                // page can scroll slightly during a real touch rack-drag
                // instead of being suppressed. The reorder itself (state
                // tracking, final drop on touchend) is unaffected.
              }}
              onTouchEnd={(e) => {
                act(() => Game.endTouchReorder(tile.id, e));
                setWord(Game.stagedWord());
              }}
              onTouchCancel={() => { Game.cancelTouchReorder(); }}
            >
              {tile.letter === '?' ? '★' : tile.letter}<sub>{displayVal}</sub>
            </button>
          );
        })}
      </div>

      <div className="staging-area" id="staging-area">
        {state.selectedTileIds.map((tileId) => {
          const tile = state.player.rack.find((t) => t.id === tileId);
          if (!tile) return null;
          const val = Lexicon.LETTER_VALUES[tile.letter] || 0;
          const stagedVal = tile.variant === Tiles.VARIANTS.VOLATILE ? val * 2 : val;
          const stagedGlyph = tile.letter === '?' ? (state.blankAssignments[tileId] || '★') : tile.letter;
          let bonusClass = '';
          if (tile.variant) bonusClass = ' has-bonus variant-' + tile.variant;
          else if (tile.bonus) {
            bonusClass = ' has-bonus';
            if (tile.bonus.type === 'flatOnPlay') bonusClass += ' bonus-flat';
            else if (tile.bonus.type === 'multOnPlay') bonusClass += ' bonus-mult-play';
            else if (tile.bonus.type === 'multOnHold') bonusClass += ' bonus-mult-hold';
          }
          const variantTip = tile.variant ? Tiles.describeVariant(tile.variant)
            : (tile.bonus ? Tiles.describeBonus(tile.bonus) : '');
          const justStaged = !prevSelectedTileIdsRef.current.includes(tileId);
          return (
            <button
              key={tileId}
              type="button"
              data-tile-id={tileId}
              data-flip-tile-id={tileId}
              className={'staged-tile' + bonusClass + (justStaged ? ' tile-settle' : '')}
              title={(variantTip ? variantTip + ' -- ' : '') + 'tap to remove'}
              onClick={() => unstageFromStagingArea(tileId)}
              onPointerDown={(e) => Game.startStagingDrag(tileId, e.currentTarget, e)}
            >
              {stagedGlyph}<sub>{stagedVal}</sub>
            </button>
          );
        })}
      </div>

      {state.blankPickerOpen && (
        <div className="blank-picker-overlay">
          <div className="blank-picker-panel panel">
            <h2>Choose a letter</h2>
            <p className="blank-picker-hint">This ★ blank becomes the letter you pick.</p>
            <div className="blank-picker-grid">
              {BLANK_PICKER_LETTERS.map((letter) => (
                <button key={letter} type="button" className="blank-picker-letter" onClick={() => pickBlankLetter(letter)}>
                  {letter}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-secondary" style={{ marginTop: 14 }} onClick={cancelBlankPicker}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className={previewClass} aria-live="polite">{previewLabel}</div>

      <div className="word-input-row">
        <input
          ref={inputRef}
          type="text"
          maxLength={15}
          autoComplete="off"
          spellCheck="false"
          placeholder="Type or click letters..."
          value={word}
          disabled={dead}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(word); }}
        />
        <button type="button" className="btn btn-primary" disabled={dead} onClick={() => submit(word)}>Play Word</button>
        <button type="button" className="btn btn-secondary" onClick={clearWord}>Clear</button>
      </div>

      <div className="ink-spend-row">
        <button
          type="button"
          className={'btn btn-secondary btn-overcharge' + (state.overchargeArmed ? ' armed' : '')}
          disabled={dead || (!state.overchargeArmed && !canOvercharge)}
          title="Spend ink to amplify your next word's damage"
          onClick={() => act(Game.toggleOvercharge)}
        >
          {state.overchargeArmed
            ? `⚡ Overcharged! (x${Combat.OVERCHARGE_DAMAGE_MULTIPLIER})`
            : `⚡ Overcharge (-${Combat.OVERCHARGE_INK_COST} ink)`}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={dead || !canRewrite}
          title="Spend ink to discard your rack and draw a fresh one"
          onClick={() => act(Game.rewriteRack)}
        >
          {`🔄 Rewrite (-${Combat.REWRITE_INK_COST} ink)`}
        </button>
      </div>
    </div>
  );
}

// Mirrors game.js's getTierGlyph exactly -- a tiny pure lookup, not worth
// exposing through the Game namespace just for this one JSX read.
function tierGlyph(isBoss, tier) {
  if (isBoss) return '👑';
  if (tier === 'weak') return '📄';
  if (tier === 'normal') return '📖';
  if (tier === 'strong') return '📚';
  return '📖';
}
