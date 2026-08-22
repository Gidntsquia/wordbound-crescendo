import { useReducer } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CombatScreen from '../CombatScreen.jsx';
import { freshRun, pickPlayableWord, findAvailableCombatNodeId } from '../../test/gameHelpers.js';

// Uses RTL's synchronous fireEvent throughout, NOT @testing-library/user-
// event, on purpose (STRUCTURAL ticket, remaining-scope-(c) step 2
// follow-up run): this file was the exact suite GOALS.md's STRUCTURAL
// 14/N and 15/N entries flagged as flaky (a real, reproducible ~1-in-3
// full-suite failure -- "the simulated type+click sequence itself didn't
// register" -- never root-caused further). It got much worse once this
// file grew past a certain size, failing on nearly every run within THIS
// ONE FILE alone. Root-caused it here: temporarily instrumented the
// component's one real timer (pendingResolveRef's setTimeout, the leading
// suspect both prior entries guessed at) with console logging -- across
// many repeated runs it never once fired late/stale, ruling that theory
// out completely. Swapping every userEvent.click()/type() call in this
// file for fireEvent.click()/change() (skips user-event's async hover/
// pointerdown/pointerup/focus choreography entirely) made the flake
// disappear -- clean full-suite runs afterward, up from failing on nearly
// every run before. Root cause: @testing-library/user-event v14's internal
// async event simulation racing against something in this Vitest/jsdom
// setup, not this component, its timer, or a cross-file leak. NOT claimed:
// that this is the only possible cause of Vitest/jsdom timing flakiness in
// this repo, or that other test files need the same treatment preemptively.
const SEED = 'vitest-fixed-seed-1';

// Small harness mirroring RunScreen.jsx's own `act`/bump pattern exactly --
// Game._state is a real mutable object the vanilla engine writes to
// in-place, so a re-render just needs to be triggered after each action,
// not fed a fresh copy of the state.
function Harness() {
  const [, bump] = useReducer((n) => n + 1, 0);
  const Game = window.Wordbound.Game;
  function act(fn) {
    fn();
    bump();
  }
  return <CombatScreen state={Game._state} Game={Game} act={act} />;
}

function startFight() {
  const state = freshRun(SEED);
  window.Wordbound.Game.enterCurrentNode(findAvailableCombatNodeId(state));
  return state;
}

describe('CombatScreen', () => {
  it('shows the real monster name/HP and one rack tile button per rack tile', () => {
    const state = startFight();
    render(<Harness />);
    expect(screen.getByText(new RegExp(state.monster.name))).toBeInTheDocument();
    expect(screen.getByText(`${state.monster.hp} / ${state.monster.maxHp} HP`)).toBeInTheDocument();
    const tileButtons = state.player.rack.map((tile) =>
      screen.getAllByRole('button').find((b) => b.textContent.startsWith(tile.letter === '?' ? '★' : tile.letter)),
    );
    tileButtons.forEach((btn) => expect(btn).toBeInTheDocument());
  });

  // REGULAR ENEMIES ticket (GOALS.md): monster.glyph portrait-placeholder
  // groundwork -- currently inert (no real def sets it yet, see this
  // ticket's own note in dom-check.js), but the real React render path is
  // asserted directly rather than left unverified, same as the vanilla
  // side's own dom-check.js test.
  it('shows a monster glyph when the def carries one, and nothing extra when it does not', () => {
    const state = startFight();
    state.monster.glyph = '🌅';
    const { rerender } = render(<Harness />);
    expect(screen.getByText(new RegExp('🌅.*' + state.monster.name))).toBeInTheDocument();
    delete state.monster.glyph;
    rerender(<Harness />);
    expect(screen.queryByText(/🌅/)).not.toBeInTheDocument();
  });

  // ITEMS ticket (GOALS.md, 2026-08-22): FORTISSIMO's "tiles render at
  // double size" half -- dom-check.js already covers wordbound.html's own
  // #rack-display class toggle + real rack size, this is the React-side
  // equivalent per GOALS.md's own mandatory test:react gate for any
  // src/components/*.jsx change. Item granted BEFORE enterCurrentNode so
  // the real refillRack() -> Items.getRackCapacity() path draws the
  // halved rack, exactly like a real pickup before a fight would.
  it('FORTISSIMO halves the real rack and the rack container gets .rack-display-fortissimo', () => {
    const state = freshRun(SEED);
    state.player.items = ['fortissimo'];
    window.Wordbound.Game.enterCurrentNode(findAvailableCombatNodeId(state));
    render(<Harness />);
    const expectedCapacity = window.Wordbound.Items.getRackCapacity(state.player);
    expect(expectedCapacity).toBeLessThan(7);
    expect(state.player.rack).toHaveLength(expectedCapacity);
    expect(document.getElementById('rack-display')).toHaveClass('rack-display-fortissimo');
    expect(document.querySelectorAll('#rack-display .letter-tile')).toHaveLength(expectedCapacity);
  });

  it('without FORTISSIMO, the rack container does NOT get .rack-display-fortissimo', () => {
    startFight();
    render(<Harness />);
    expect(document.getElementById('rack-display')).not.toHaveClass('rack-display-fortissimo');
  });

  it('clicking rack tiles appends their letters to the word input', async () => {
    const state = startFight();
    render(<Harness />);
    const word = pickPlayableWord(state, ['RADIO', 'ROAD', 'RAID', 'READ', 'RAIN', 'AIDE', 'DINE', 'RIDE']);
    for (const letter of word) {
      const tileBtn = screen.getAllByRole('button').find((b) => b.textContent.startsWith(letter) && !b.disabled);
      fireEvent.click(tileBtn);
    }
    expect(screen.getByPlaceholderText('Type or click letters...')).toHaveValue(word);
  });

  it('clicking a blank rack tile is a no-op, matching desktop vanilla behavior', async () => {
    // Regression test: CombatScreen used to append the literal '?' letter on
    // a blank-tile click (setWord((w) => w + tile.letter) with no guard),
    // which broke word validation -- '?' is never a real letter in a played
    // word. game.js's own selectTileForWord makes a blank click a no-op on
    // desktop (typing the target letter is how a blank gets used instead).
    // The fixed seed's starting rack has no blank, so one is injected
    // directly -- same Tiles.createTile('?', null) pattern items.js itself
    // uses to add blanks to a pile.
    const state = startFight();
    const Tiles = window.Wordbound.Tiles;
    const blank = Tiles.createTile('?', null);
    state.player.rack.push(blank);
    render(<Harness />);
    const blankBtn = screen.getAllByRole('button').find((b) => b.textContent.startsWith('★'));
    expect(blankBtn).toBeInTheDocument();
    fireEvent.click(blankBtn);
    expect(screen.getByPlaceholderText('Type or click letters...')).toHaveValue('');
  });

  // STRUCTURAL ticket, remaining-scope (c) step 2: the previous three tests
  // only ever observed the word-input's TEXT, which would have kept passing
  // even under the old fake local-string model this run replaced. These
  // assert directly on the real engine state (state.selectedTileIds) and the
  // real staging-area DOM (mirrors game.js's renderStagingArea()), which is
  // the actual thing that changed.
  it('clicking a rack tile stages it for real: state.selectedTileIds updates, the rack shows an empty slot, and the tile appears in the staging area', async () => {
    const state = startFight();
    render(<Harness />);
    const tile = state.player.rack[0];
    const tileBtn = screen.getAllByRole('button').find((b) => b.textContent.startsWith(tile.letter === '?' ? '★' : tile.letter));
    fireEvent.click(tileBtn);
    expect(state.selectedTileIds).toEqual([tile.id]);
    // The clicked tile's old rack button is gone (replaced by an empty slot).
    expect(screen.queryByRole('button', { name: 'Return staged tile to rack' })).toBeInTheDocument();
    // ...and a real .staged-tile now exists in the staging area showing the same letter/value.
    const staged = document.querySelector('.staging-area .staged-tile');
    expect(staged).not.toBeNull();
    expect(staged.textContent.startsWith(tile.letter === '?' ? '★' : tile.letter)).toBe(true);
  });

  it('clicking the staged tile (or its rack slot) unstages it back to a normal rack tile', async () => {
    const state = startFight();
    render(<Harness />);
    const tile = state.player.rack[0];
    const tileBtn = screen.getAllByRole('button').find((b) => b.textContent.startsWith(tile.letter === '?' ? '★' : tile.letter));
    fireEvent.click(tileBtn); // stage
    fireEvent.click(document.querySelector('.staging-area .staged-tile')); // unstage via the staged tile itself
    expect(state.selectedTileIds).toEqual([]);
    expect(document.querySelector('.staging-area .staged-tile')).toBeNull();
    // The tile is back in the rack as a real, clickable letter-tile.
    const backInRack = screen.getAllByRole('button').find((b) => b.textContent.startsWith(tile.letter === '?' ? '★' : tile.letter));
    expect(backInRack).toBeInTheDocument();
  });

  it('Clear resets both the typed word AND the real staged-tile selection', async () => {
    const state = startFight();
    render(<Harness />);
    const tile = state.player.rack[0];
    const tileBtn = screen.getAllByRole('button').find((b) => b.textContent.startsWith(tile.letter === '?' ? '★' : tile.letter));
    fireEvent.click(tileBtn);
    expect(state.selectedTileIds).toEqual([tile.id]);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(state.selectedTileIds).toEqual([]);
    expect(screen.getByPlaceholderText('Type or click letters...')).toHaveValue('');
    expect(document.querySelector('.staging-area .staged-tile')).toBeNull();
  });

  it('shows a live damage preview for a valid typed word', async () => {
    const state = startFight();
    render(<Harness />);
    const word = pickPlayableWord(state, ['RADIO', 'ROAD', 'RAID', 'READ', 'RAIN', 'AIDE', 'DINE', 'RIDE']);
    fireEvent.change(screen.getByPlaceholderText('Type or click letters...'), { target: { value: word } });
    expect(screen.getByText(/damage/)).toBeInTheDocument();
  });

  it('Play Word calls the real Game.submitWord and drops the monster HP synchronously', async () => {
    const state = startFight();
    render(<Harness />);
    const word = pickPlayableWord(state, ['RADIO', 'ROAD', 'RAID', 'READ', 'RAIN', 'AIDE', 'DINE', 'RIDE']);
    const startingHp = state.monster.hp;
    fireEvent.change(screen.getByPlaceholderText('Type or click letters...'), { target: { value: word } });
    fireEvent.click(screen.getByRole('button', { name: 'Play Word' }));
    // Combat.playWord mutates monster.hp synchronously, before submitWord's
    // own setTimeout-deferred counterattack -- so this should already be
    // true without advancing any fake timers.
    expect(state.monster.hp).toBeLessThan(startingHp);
    expect(screen.getByText(`${state.monster.hp} / ${state.monster.maxHp} HP`)).toBeInTheDocument();
    // The word input clears after a successful play.
    expect(screen.getByPlaceholderText('Type or click letters...')).toHaveValue('');
  });

  // BOSS ENTRANCE CUTSCENES ticket (GOALS.md): React's own equivalent of
  // dom-check.js's boss-entrance block. `startFight()`'s fixed seed enters
  // an ordinary (non-boss) combat node, so these mutate the live monster
  // directly to a real entrance-having defId ('boss_vowelmaw', per
  // js/wordbound/bossEntrances.js) AFTER combat has already started --
  // safe because duel-mode detection only ever runs once, inside
  // startCombat itself; retroactively flipping isBoss/defId here can't
  // accidentally trigger Game.startDuelFight (which would need jsdom to
  // have a real AudioContext, per this ticket's own dom-check.js comment).
  describe('boss entrance overlay', () => {
    function startBossFight() {
      const state = startFight();
      state.monster.isBoss = true;
      state.monster.defId = 'boss_vowelmaw';
      // startFight() enters an ordinary combat node, so the live monster's
      // .name is whatever regular monster this fixed seed happened to roll
      // (e.g. "Quoth") -- overwritten here to the REAL Mountain King boss
      // name so the entrance's rendered title card is actually meaningful,
      // not just coincidentally non-empty.
      state.monster.name = 'The Mountain King';
      state.monster._entranceSeen = false;
      return state;
    }

    it('shows the title card for a boss with real entrance content, and blocks a real word play until skipped', async () => {
      const state = startBossFight();
      render(<Harness />);
      expect(screen.getByText(/MOUNTAIN KING/)).toBeInTheDocument();
      expect(screen.getByText(/impish, mocking/)).toBeInTheDocument();

      // Fight state is genuinely unaffected while showing: typing still
      // works locally (it's just React state), but Play Word must not
      // actually submit through the real engine.
      const word = pickPlayableWord(state, ['RADIO', 'ROAD', 'RAID', 'READ', 'RAIN', 'AIDE', 'DINE', 'RIDE']);
      const hpBefore = state.monster.hp;
      fireEvent.change(screen.getByPlaceholderText('Type or click letters...'), { target: { value: word } });
      fireEvent.click(screen.getByRole('button', { name: 'Play Word' }));
      expect(state.monster.hp).toBe(hpBefore);

      fireEvent.click(screen.getByRole('button', { name: /Skip/ }));
      expect(screen.queryByText(/impish, mocking/)).not.toBeInTheDocument();
      expect(state.monster._entranceSeen).toBe(true);

      // The fight is fully playable once dismissed.
      fireEvent.change(screen.getByPlaceholderText('Type or click letters...'), { target: { value: word } });
      fireEvent.click(screen.getByRole('button', { name: 'Play Word' }));
      expect(state.monster.hp).toBeLessThan(hpBefore);
    });

    it('Escape/Enter/Space also skip the entrance', () => {
      startBossFight();
      render(<Harness />);
      expect(screen.getByText(/MOUNTAIN KING/)).toBeInTheDocument();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByText(/impish, mocking/)).not.toBeInTheDocument();
    });

    it('does not show for a regular (non-boss) fight, or a boss whose defId has no entrance content', () => {
      const state = startFight();
      render(<Harness />);
      expect(document.querySelector('.boss-entrance-overlay')).toBeNull();

      // boss_unabridged carries no entrance content (bossEntrances.js's own
      // header comment on why) -- confirms the null-safe path, not just the
      // non-boss one.
      state.monster.isBoss = true;
      state.monster.defId = 'boss_unabridged';
      state.monster._entranceSeen = false;
      fireEvent.change(screen.getByPlaceholderText('Type or click letters...'), { target: { value: 'Z' } }); // force a re-render
      expect(document.querySelector('.boss-entrance-overlay')).toBeNull();
    });

    it('does not replay once already seen this fight (e.g. after a remount)', () => {
      const state = startBossFight();
      state.monster._entranceSeen = true; // as if already dismissed earlier this same fight
      render(<Harness />);
      expect(document.querySelector('.boss-entrance-overlay')).toBeNull();
    });
  });

  it('Overcharge arms and shows the real multiplier from combat.js', async () => {
    const state = startFight();
    const Combat = window.Wordbound.Combat;
    render(<Harness />);
    expect(state.player.ink).toBeGreaterThanOrEqual(Combat.OVERCHARGE_INK_COST);
    fireEvent.click(screen.getByRole('button', { name: /Overcharge/ }));
    expect(state.overchargeArmed).toBe(true);
    expect(
      screen.getByRole('button', { name: `⚡ Overcharged! (x${Combat.OVERCHARGE_DAMAGE_MULTIPLIER})` }),
    ).toBeInTheDocument();
  });

  it('Rewrite spends ink and deals a fresh rack', async () => {
    const state = startFight();
    const Combat = window.Wordbound.Combat;
    render(<Harness />);
    const inkBefore = state.player.ink;
    const rackBefore = state.player.rack.map((t) => t.id);
    fireEvent.click(screen.getByRole('button', { name: /Rewrite/ }));
    expect(state.player.ink).toBe(inkBefore - Combat.REWRITE_INK_COST);
    expect(state.player.rack.map((t) => t.id)).not.toEqual(rackBefore);
  });

  // SHAKESPEARE GUIDE + AUTHOR SHOPKEEPERS ticket (GOALS.md), exclusive
  // items: Dickinson's "A Certain Slant of Ink" reduces both ink-spend costs
  // by 1 (js/wordbound/items.js's Items.getOverchargeInkCost/
  // getRewriteInkCost) -- this drives it through the REAL component, not
  // just the getter in isolation, confirming CombatScreen.jsx actually reads
  // through those getters rather than the raw Combat.* constants it used to.
  it('shows and charges the reduced Overcharge/Rewrite costs from A Certain Slant of Ink', () => {
    const Combat = window.Wordbound.Combat;
    const state = startFight();
    state.player.items.push('certain_slant_of_ink');
    render(<Harness />);
    expect(
      screen.getByRole('button', { name: `⚡ Overcharge (-${Combat.OVERCHARGE_INK_COST - 1} ink)` }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: `🔄 Rewrite (-${Combat.REWRITE_INK_COST - 1} ink)` }),
    ).toBeInTheDocument();
    const inkBefore = state.player.ink;
    fireEvent.click(screen.getByRole('button', { name: /Rewrite/ }));
    expect(state.player.ink).toBe(inkBefore - (Combat.REWRITE_INK_COST - 1));
  });

  // COMBAT JUICE ticket (GOALS.md), damage-landed hook: a real word play
  // fires Game.onDamageLanded (game.js) ~220ms later (TILE_PLAY_ANIM_MS,
  // inside Game.submitWord's own setTimeout -- the same deferral vanilla's
  // animateDamage/celebrateHit already wait on), which this component
  // subscribes to and renders as a real .damage-number + a hp-fill
  // flash-damage class. Polls instead of a flat sleep (same reasoning as
  // gameHelpers.js's waitForScreen) so this isn't tied to the exact 220ms
  // constant.
  async function waitFor(check, timeoutMs = 2000) {
    const start = Date.now();
    while (!check()) {
      if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
      await new Promise((r) => setTimeout(r, 20));
    }
  }

  it('a real hit shows a floating damage number and flashes the monster HP bar', async () => {
    const state = startFight();
    render(<Harness />);
    const word = pickPlayableWord(state, ['RADIO', 'ROAD', 'RAID', 'READ', 'RAIN', 'AIDE', 'DINE', 'RIDE']);
    fireEvent.change(screen.getByPlaceholderText('Type or click letters...'), { target: { value: word } });
    fireEvent.click(screen.getByRole('button', { name: 'Play Word' }));
    await waitFor(() => document.querySelector('.damage-number') != null);
    const dmgEl = document.querySelector('.damage-number');
    expect(Number(dmgEl.textContent)).toBeGreaterThan(0);
    expect(document.querySelector('.monster-hp-fill').classList.contains('flash-damage')).toBe(true);
  });

  it('a big hit (Game.onDamageLanded, crushing=true) shows the CRUSHING floater and shakes the combat panel', async () => {
    startFight();
    render(<Harness />);
    const Game = window.Wordbound.Game;
    // Same "doesn't depend on landing an exact big hit" reasoning as
    // Game._celebrateHit (test/dom-check.js) -- this seed's fixed 8-tile
    // rack tops out well under the 25-damage CRUSHING threshold even with
    // Overcharge, so the payload is emitted directly through the same
    // test-only hook celebrateHit itself uses.
    act(() => { Game._emitDamageLanded({ damage: 30, magnificent: false, crushing: true, monsterDied: false, isDuel: false, pushWon: false }); });
    expect(document.querySelector('.crushing-floater')).not.toBeNull();
    expect(document.querySelector('.crushing-floater').textContent).toBe('CRUSHING!');
    expect(document.querySelector('.combat-panel').classList.contains('combat-shake')).toBe(true);
  });

  it('a magnificent play (Game.onDamageLanded, magnificent=true) shows the MAGNIFICENT banner', async () => {
    startFight();
    render(<Harness />);
    const Game = window.Wordbound.Game;
    act(() => { Game._emitDamageLanded({ damage: 10, magnificent: true, crushing: false, monsterDied: false, isDuel: false, pushWon: false }); });
    const banner = document.querySelector('.magnificent-banner');
    expect(banner).not.toBeNull();
    expect(banner.textContent).toBe('MAGNIFICENT!');
  });

  it('zero/negative damage payloads are ignored (no damage number, no flash)', () => {
    startFight();
    render(<Harness />);
    const Game = window.Wordbound.Game;
    act(() => { Game._emitDamageLanded({ damage: 0, magnificent: false, crushing: false, monsterDied: false, isDuel: false, pushWon: false }); });
    expect(document.querySelector('.damage-number')).toBeNull();
    expect(document.querySelector('.monster-hp-fill').classList.contains('flash-damage')).toBe(false);
  });

  // STRUCTURAL remaining-scope (c): rack tiles that weren't in the previous
  // committed render get game.js's own 'new-tile' slide-in class, ported
  // natively via a ref-tracked previous-ids diff (CombatScreen.jsx's own
  // header comment on the combo-bump hooks explains why the shared
  // state.rackJustRefilled/lastRackTileIds flags aren't reused directly).
  it('rack tiles are all "new-tile" on the fight\'s first render, and no longer once the rack is unchanged', async () => {
    const state = startFight();
    render(<Harness />);
    const rackIds = state.player.rack.map((t) => t.id);
    let buttons = screen.getAllByRole('button').filter((b) => b.className.includes('letter-tile'));
    expect(buttons.length).toBe(rackIds.length);
    buttons.forEach((btn) => expect(btn.className).toContain('new-tile'));

    // An unrelated local re-render (typing, which only touches CombatScreen's
    // own `word` state -- no rack mutation) must NOT keep replaying the
    // slide-in: this is the one-shot behavior new-tile is meant to have.
    fireEvent.change(screen.getByPlaceholderText('Type or click letters...'), { target: { value: 'A' } });
    buttons = screen.getAllByRole('button').filter((b) => b.className.includes('letter-tile'));
    expect(buttons.length).toBe(rackIds.length);
    buttons.forEach((btn) => expect(btn.className).not.toContain('new-tile'));
  });

  // STRUCTURAL remaining-scope (c): "the combo chip's one-shot bump-pop
  // class" -- ported natively (see CombatScreen.jsx's header comment on the
  // combo-bump hooks for why the shared state.comboBumped flag isn't reused
  // directly: React/StrictMode can invoke a component body more than once
  // per commit, and that flag is consumed as a render side effect in
  // vanilla, which isn't safe to replicate here).
  it('the combo chip gets combo-chip-bump the render the streak grows, and loses it on the next unrelated render', async () => {
    const state = startFight();
    render(<Harness />);
    const word = pickPlayableWord(state, ['RADIO', 'ROAD', 'RAID', 'READ', 'RAIN', 'AIDE', 'DINE', 'RIDE']);
    fireEvent.change(screen.getByPlaceholderText('Type or click letters...'), { target: { value: word } });
    fireEvent.click(screen.getByRole('button', { name: 'Play Word' }));
    expect(state.comboState.combo).toBeGreaterThan(0);
    const chip = screen.getByText(/Combo x/);
    expect(chip.className).toContain('combo-chip-bump');

    // An unrelated local re-render (typing) must clear the one-shot bump
    // class without the combo streak itself changing.
    fireEvent.change(screen.getByPlaceholderText('Type or click letters...'), { target: { value: 'Z' } });
    const chipAfter = screen.getByText(/Combo x/);
    expect(chipAfter.className).not.toContain('combo-chip-bump');
    expect(state.comboState.combo).toBeGreaterThan(0);
  });

  // COMBAT JUICE ticket (GOALS.md): the `.tile-settle` one-shot land flash,
  // ported the same native way as new-tile/combo-chip-bump above (a ref
  // tracking selectedTileIds as of the last committed render, compared
  // during render -- see CombatScreen.jsx's own header comment). Vanilla's
  // markSettle only fires from stage/unstage (not drag-reorder), so that's
  // exactly what these two tests cover.
  it('a tile gets tile-settle the render it lands in the staging area, and loses it on the next unrelated render', async () => {
    const state = startFight();
    render(<Harness />);
    const tile = state.player.rack[0];
    const tileBtn = screen.getAllByRole('button').find((b) => b.textContent.startsWith(tile.letter === '?' ? '★' : tile.letter));
    fireEvent.click(tileBtn); // stage
    const staged = document.querySelector('.staging-area .staged-tile');
    expect(staged.className).toContain('tile-settle');

    // An unrelated local re-render (typing) must clear the one-shot class
    // without unstaging the tile.
    fireEvent.change(screen.getByPlaceholderText('Type or click letters...'), { target: { value: 'Z' } });
    const stagedAfter = document.querySelector('.staging-area .staged-tile');
    expect(stagedAfter).not.toBeNull();
    expect(stagedAfter.className).not.toContain('tile-settle');
  });

  it('a tile gets tile-settle the render it lands back in the rack, and loses it on the next unrelated render', async () => {
    const state = startFight();
    render(<Harness />);
    const tile = state.player.rack[0];
    const tileBtn = screen.getAllByRole('button').find((b) => b.textContent.startsWith(tile.letter === '?' ? '★' : tile.letter));
    fireEvent.click(tileBtn); // stage
    fireEvent.click(document.querySelector('.staging-area .staged-tile')); // unstage
    const backInRack = screen.getAllByRole('button').find((b) => b.textContent.startsWith(tile.letter === '?' ? '★' : tile.letter));
    expect(backInRack.className).toContain('tile-settle');

    fireEvent.change(screen.getByPlaceholderText('Type or click letters...'), { target: { value: 'Z' } });
    const backInRackAfter = screen.getAllByRole('button').find((b) => b.textContent.startsWith(tile.letter === '?' ? '★' : tile.letter));
    expect(backInRackAfter.className).not.toContain('tile-settle');
  });

  // COMBAT JUICE ticket (GOALS.md): the FLIP position-slide (flipTileTo,
  // module-level in CombatScreen.jsx) is guarded on requestAnimationFrame,
  // which jsdom has none of (confirmed directly, same convention as this
  // file's own duel-tick loop and the touch-mode matchMedia guard) -- so it
  // is a TRUE no-op under Vitest/RTL by design, not something these tests
  // can observe actually animating. What they CAN and DO verify: the
  // capture/lookup wiring (a stable data-flip-tile-id present on a rack
  // tile AND its staging-area counterpart, which is what captureFlipFrom/
  // the useLayoutEffect look tiles up by) survives a real stage/unstage
  // without throwing or leaving a stray inline transform behind. Uses
  // data-flip-tile-id specifically, NOT the pre-existing data-tile-id
  // staged tiles already carry -- see CombatScreen.jsx's own header comment
  // on why those two must stay separate (giving the rack tile a
  // data-tile-id too was tried first and accidentally reactivated game.js's
  // own private, normally-inert flipTile() calls, a real bug caught by
  // test:react-build, not by this file -- jsdom's fake getBoundingClientRect
  // can't reproduce it, which is exactly why this test asserts the
  // attribute wiring rather than trying to). The real visual slide itself
  // is verified for real in a real browser by test:react-build.
  it('rack tiles carry a stable data-flip-tile-id the FLIP mechanism can look up by, on both sides of a stage/unstage', async () => {
    const state = startFight();
    render(<Harness />);
    const tile = state.player.rack[0];
    const tileBtn = screen.getAllByRole('button').find((b) => b.textContent.startsWith(tile.letter === '?' ? '★' : tile.letter));
    expect(tileBtn.getAttribute('data-flip-tile-id')).toBe(tile.id);
    fireEvent.click(tileBtn); // stage
    const staged = document.querySelector('.staging-area .staged-tile');
    expect(staged.getAttribute('data-flip-tile-id')).toBe(tile.id);
    expect(staged.style.transform).toBe('');
    fireEvent.click(staged); // unstage
    const backInRack = screen.getAllByRole('button').find((b) => b.textContent.startsWith(tile.letter === '?' ? '★' : tile.letter));
    expect(backInRack.getAttribute('data-flip-tile-id')).toBe(tile.id);
    expect(backInRack.style.transform).toBe('');
  });

  // STRUCTURAL remaining-scope (c) step 1 (GOALS.md): now that
  // main.jsx/src/test/setup.js actually call Game.applyTouchModeFromMedia()
  // (previously nothing did, so state.touchMode was always false in the
  // React app regardless of device), CombatScreen's pre-existing
  // `if (!state.touchMode) inputRef.current?.focus()` guards are reachable
  // for real. jsdom has no window.matchMedia (dom-check.js's own comment on
  // the same gap), so the detection call itself can't run here -- this
  // drives the state.touchMode branch directly, the same way a real coarse-
  // pointer device would leave it after setup.js's call actually fired.
  it('does not steal focus back to the word input after a play or clear in touch mode', async () => {
    const state = startFight();
    state.touchMode = true;
    render(<Harness />);
    const input = screen.getByPlaceholderText('Type or click letters...');
    const word = pickPlayableWord(state, ['RADIO', 'ROAD', 'RAID', 'READ', 'RAIN', 'AIDE', 'DINE', 'RIDE']);
    fireEvent.change(input, { target: { value: word } });
    input.blur();
    fireEvent.click(screen.getByRole('button', { name: 'Play Word' }));
    expect(document.activeElement).not.toBe(input);
  });

  // STRUCTURAL ticket, remaining-scope (c) step 2 follow-up: the touch-mode
  // blank-letter picker overlay. Tapping a blank tile in touch mode already
  // called the real Game.selectTileForWord -> game.js's private
  // selectTileForWord -> opened state.blankPickerOpen (landed in this
  // ticket's prior commit), but nothing rendered it -- a touch player got no
  // feedback at all, and a blank tile was effectively unplayable on touch.
  // These tests are the first to assert the real overlay renders and drives
  // Game.assignBlankLetter/closeBlankPicker.
  it('touch mode: tapping a blank tile opens the real blank-picker overlay; picking a letter stages the blank with it', async () => {
    const state = startFight();
    state.touchMode = true;
    const Tiles = window.Wordbound.Tiles;
    const blank = Tiles.createTile('?', null);
    state.player.rack.push(blank);
    render(<Harness />);

    const blankBtn = screen.getAllByRole('button').find((b) => b.textContent.startsWith('★'));
    fireEvent.click(blankBtn);
    expect(state.blankPickerOpen).toBe(true);
    expect(state.blankPickerTileId).toBe(blank.id);
    expect(screen.getByText('Choose a letter')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'E' }));
    expect(state.blankPickerOpen).toBe(false);
    expect(state.blankAssignments[blank.id]).toBe('E');
    expect(state.selectedTileIds).toContain(blank.id);
    expect(window.Wordbound.Game.stagedWord()).toBe('E');
    expect(screen.queryByText('Choose a letter')).not.toBeInTheDocument();
    // The staged tile shows the chosen letter, not the bare ★ glyph.
    const staged = document.querySelector('.staging-area .staged-tile');
    expect(staged.textContent).toContain('E');
  });

  // STRUCTURAL ticket, remaining scope (c): desktop mouse-drag rack
  // reordering. Fires the real HTML5 drag event sequence (dragStart -> drop
  // -> dragEnd) on the actual rendered rack buttons -- jsdom has no native
  // DragEvent constructor, but RTL's fireEvent falls back to a generic Event
  // it can still attach a fake `dataTransfer` to, which is all
  // CombatScreen.jsx's handlers read.
  it('dragging a rack tile onto another tile\'s slot reorders the real rack for real (Game.reorderRackOnDrop)', async () => {
    const state = startFight();
    render(<Harness />);
    const rackIds = state.player.rack.map((t) => t.id);
    // Drag the tile at index 0 onto the slot at the LAST index.
    const buttons = screen.getAllByRole('button').filter((b) => b.className.includes('letter-tile'));
    expect(buttons.length).toBe(rackIds.length);
    const dragged = buttons[0];
    const target = buttons[buttons.length - 1];
    const dataTransfer = {};
    fireEvent.dragStart(dragged, { dataTransfer });
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });
    fireEvent.dragEnd(dragged, { dataTransfer });

    // game.js's reorderRackOnDrop inserts the dragged tile BEFORE whatever
    // tile originally sat at dropIndex (here, the last tile) -- so it lands
    // second-to-last, not appended at the very end. See the function's own
    // insertIndex comment in js/wordbound/game.js.
    const expected = rackIds.slice(1, -1).concat([rackIds[0], rackIds[rackIds.length - 1]]);
    expect(state.player.rack.map((t) => t.id)).toEqual(expected);
    // The drag state the engine tracked mid-gesture is cleared afterward.
    expect(state.draggedTileId).toBeNull();
  });

  it('dropping a dragged tile back on its own slot is a no-op', async () => {
    const state = startFight();
    render(<Harness />);
    const rackIds = state.player.rack.map((t) => t.id);
    const buttons = screen.getAllByRole('button').filter((b) => b.className.includes('letter-tile'));
    const dataTransfer = {};
    fireEvent.dragStart(buttons[0], { dataTransfer });
    fireEvent.dragOver(buttons[0], { dataTransfer });
    fireEvent.drop(buttons[0], { dataTransfer });
    fireEvent.dragEnd(buttons[0], { dataTransfer });
    expect(state.player.rack.map((t) => t.id)).toEqual(rackIds);
  });

  it('touch mode: Cancel closes the blank picker without staging anything', async () => {
    const state = startFight();
    state.touchMode = true;
    const Tiles = window.Wordbound.Tiles;
    const blank = Tiles.createTile('?', null);
    state.player.rack.push(blank);
    render(<Harness />);

    const blankBtn = screen.getAllByRole('button').find((b) => b.textContent.startsWith('★'));
    fireEvent.click(blankBtn);
    expect(screen.getByText('Choose a letter')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(state.blankPickerOpen).toBe(false);
    expect(state.selectedTileIds).not.toContain(blank.id);
    expect(screen.queryByText('Choose a letter')).not.toBeInTheDocument();
    expect(document.querySelector('.staging-area .staged-tile')).toBeNull();
  });

  // touch-reorder tests: jsdom's getBoundingClientRect always returns a
  // zero-sized rect, so game.js's getTileAtPosition (which picks the
  // closest button by measured center) always resolves to the first
  // .letter-tile in DOM order regardless of the touchX passed in -- a real
  // browser is what actually proves POSITIONAL accuracy (see
  // test/verify-react-build.js's real Playwright touch checks). What these
  // tests verify instead is the real state-machine wiring end to end
  // (touchstart -> touchmove crossing the threshold -> touchend resolving
  // either a tap or a reorder), the same real Game.* functions
  // wordbound.html's own touch listeners call, not a reimplementation.
  it('touch mode: a plain tap (no movement past the threshold) on a rack tile stages it, same as a click', () => {
    const state = startFight();
    render(<Harness />);
    const buttons = screen.getAllByRole('button').filter((b) => b.className.includes('letter-tile'));
    const tileId = state.player.rack[0].id;
    fireEvent.touchStart(buttons[0], { touches: [{ clientX: 5, identifier: 1 }] });
    expect(state.draggedTileId).toBe(tileId);
    fireEvent.touchEnd(buttons[0], { changedTouches: [{ clientX: 5, identifier: 1 }] });
    expect(state.draggedTileId).toBeNull(); // cleared by cancelTouchReorder at the end of endTouchReorder
    expect(state.touchDragThresholdCrossed).toBe(false); // never crossed -> resolved as a tap
    expect(state.selectedTileIds).toContain(tileId); // the tap fallback staged it, like a click would
  });

  it('touch mode: a touchmove past the 10px threshold crosses it, and touchend reorders the rack for real', () => {
    const state = startFight();
    render(<Harness />);
    expect(state.player.rack.length).toBeGreaterThanOrEqual(3);
    const before = state.player.rack.map((t) => t.id);
    const buttons = screen.getAllByRole('button').filter((b) => b.className.includes('letter-tile'));
    // Start the drag on index 2, not 0 -- jsdom's zero-rect quirk always
    // resolves touchmove's position to index 0, so starting elsewhere
    // guarantees touchCurrentIndex genuinely differs from touchStartIndex,
    // exercising the real reorder branch of endTouchReorder rather than its
    // "no movement" no-op.
    fireEvent.touchStart(buttons[2], { touches: [{ clientX: 5, identifier: 7 }] });
    expect(state.touchStartIndex).toBe(2);
    fireEvent.touchMove(buttons[2], { touches: [{ clientX: 500, identifier: 7 }] });
    expect(state.touchDragThresholdCrossed).toBe(true);
    fireEvent.touchEnd(buttons[2], { changedTouches: [{ clientX: 500, identifier: 7 }] });
    expect(state.draggedTileId).toBeNull();
    const after = state.player.rack.map((t) => t.id);
    expect(after).not.toEqual(before); // a real reorder happened, through the real engine splice
    expect(after.includes(before[2])).toBe(true); // no tile lost
    expect(after.length).toBe(before.length);
  });

  it('touch mode: touchcancel aborts the drag without touching the rack', () => {
    const state = startFight();
    render(<Harness />);
    const before = state.player.rack.map((t) => t.id);
    const buttons = screen.getAllByRole('button').filter((b) => b.className.includes('letter-tile'));
    fireEvent.touchStart(buttons[0], { touches: [{ clientX: 5, identifier: 3 }] });
    fireEvent.touchMove(buttons[0], { touches: [{ clientX: 500, identifier: 3 }] });
    expect(state.draggedTileId).not.toBeNull();
    fireEvent.touchCancel(buttons[0]);
    expect(state.draggedTileId).toBeNull();
    expect(state.touchDragThresholdCrossed).toBe(false);
    expect(state.player.rack.map((t) => t.id)).toEqual(before); // untouched -- cancel never reorders
  });

  // STRUCTURAL ticket, remaining scope (c), the staged-tile ghost/gap drag
  // system (the last core piece): pointerdown is bound per-tile in
  // CombatScreen.jsx, but pointermove/pointerup/pointercancel are wired at
  // the document level (mirroring vanilla's own Game.init wiring) -- so
  // these tests fire pointerdown on the real staged-tile button and
  // pointermove/pointerup/pointercancel directly on `document`, exactly the
  // path a real gesture takes. Same jsdom zero-rect limitation as the
  // touch-reorder tests above: `$('staging-area')`'s and every staged
  // tile's `getBoundingClientRect()` all read as {left:0, width:0, ...},
  // which happens to make the "is the pointer within tolerance of the
  // staging area" and "which staged tile is the pointer over" checks
  // BOTH resolve deterministically off pointer sign/magnitude alone
  // (documented per-test below), not by real screen position -- real
  // positional accuracy is left for a Playwright check against the built
  // output, same split as the touch-reorder work.
  // jsdom has no native PointerEvent constructor (confirmed directly), so
  // RTL's fireEvent.pointerDown/Move/Up/Cancel silently fall back to a bare
  // `Event`, whose constructor -- unlike MouseEvent's or TouchEvent's --
  // does NOT accept clientX/clientY/pointerId via its init dict, and
  // nothing copies them on afterward (confirmed by a throwaway debug test:
  // clientX/pointerId came through as `undefined` on the handler side no
  // matter what was passed to fireEvent.pointerDown). Building the event by
  // hand and assigning the properties directly is what game.js's handlers
  // actually need -- a bare Event allows arbitrary own-property assignment,
  // unlike a real PointerEvent's read-only getters.
  function firePointer(target, type, props) {
    const event = new Event(type, { bubbles: true, cancelable: true, composed: true });
    Object.assign(event, props);
    fireEvent(target, event);
  }

  function letterTileButtons() {
    return screen.getAllByRole('button').filter((b) => b.className.includes('letter-tile'));
  }

  // Stages the first two rack tiles in order. Each click re-queries the
  // rendered letter-tile buttons -- staging the first tile replaces its
  // button with a rack-slot-empty placeholder, so the "new first letter-tile"
  // after that click is a genuinely different tile, not a stale reference.
  function stageTwo(state) {
    fireEvent.click(letterTileButtons()[0]);
    fireEvent.click(letterTileButtons()[0]);
    return state.selectedTileIds.slice();
  }

  it('pointer-dragging a staged tile a small distance within the staging area reorders it through the real engine splice', () => {
    const state = startFight();
    render(<Harness />);
    const staged = stageTwo(state);
    expect(staged.length).toBe(2);
    const firstStagedBtn = document.querySelector(`.staging-area [data-tile-id="${staged[0]}"]`);
    firePointer(firstStagedBtn, 'pointerdown', { clientX: 0, clientY: 0, pointerId: 1 });
    expect(state.stagingDrag).not.toBeNull();
    // dx=10 crosses the 8px threshold; jsdom's zero-rect staging-area reads
    // any positive clientX as "within" (tolerance is +/-30 of a rect at 0),
    // and every staged tile's zero-rect center reads as left of it, so this
    // resolves to insertIndex === staged.length (append past the end) --
    // which, per reorderStagedTile's own insertIndex comment, moves the
    // dragged (first) tile to become the LAST staged tile: a real, engine-
    // verified swap, not a snap-back to the same order.
    firePointer(document, 'pointermove', { clientX: 10, clientY: 10, pointerId: 1 });
    firePointer(document, 'pointerup', { clientX: 10, clientY: 10, pointerId: 1 });
    expect(state.stagingDrag).toBeNull();
    expect(state.selectedTileIds).toEqual([staged[1], staged[0]]);
    // Both tiles are still staged (a reorder, not a removal).
    expect(document.querySelectorAll('.staging-area .staged-tile').length).toBe(2);

    // The browser's own synthesized click always follows a real pointerup --
    // confirm it's suppressed (state.suppressNextStagingClick, set by
    // endStagingDrag because this gesture crossed the threshold) rather than
    // undoing the reorder it just performed.
    fireEvent.click(firstStagedBtn);
    expect(state.selectedTileIds).toEqual([staged[1], staged[0]]);
    expect(document.querySelectorAll('.staging-area .staged-tile').length).toBe(2);
  });

  it('pointer-dragging a staged tile far outside the staging area removes it (drag-out-to-remove)', () => {
    const state = startFight();
    render(<Harness />);
    const tile = state.player.rack[0];
    fireEvent.click(screen.getAllByRole('button').find((b) => b.textContent.startsWith(tile.letter === '?' ? '★' : tile.letter)));
    expect(state.selectedTileIds).toEqual([tile.id]);
    const stagedBtn = document.querySelector(`.staging-area [data-tile-id="${tile.id}"]`);
    firePointer(stagedBtn, 'pointerdown', { clientX: 0, clientY: 0, pointerId: 2 });
    // 500px clears both the 8px move threshold and pointerOutsideStaging's
    // 30px tolerance around the (zero-rect) staging area -- a real drag-out.
    firePointer(document, 'pointermove', { clientX: 500, clientY: 500, pointerId: 2 });
    firePointer(document, 'pointerup', { clientX: 500, clientY: 500, pointerId: 2 });
    expect(state.selectedTileIds).toEqual([]);
    expect(document.querySelector('.staging-area .staged-tile')).toBeNull();
    // The tile is back in the rack as a normal, clickable letter-tile.
    const backInRack = screen.getAllByRole('button').find((b) => b.textContent.startsWith(tile.letter === '?' ? '★' : tile.letter));
    expect(backInRack).toBeInTheDocument();
  });

  it('pointercancel aborts a staged-tile drag cleanly, leaving the staged order untouched', () => {
    const state = startFight();
    render(<Harness />);
    const staged = stageTwo(state);
    const firstStagedBtn = document.querySelector(`.staging-area [data-tile-id="${staged[0]}"]`);
    firePointer(firstStagedBtn, 'pointerdown', { clientX: 0, clientY: 0, pointerId: 3 });
    firePointer(document, 'pointermove', { clientX: 50, clientY: 50, pointerId: 3 });
    expect(state.stagingDrag).not.toBeNull();
    firePointer(document, 'pointercancel', { pointerId: 3 });
    expect(state.stagingDrag).toBeNull();
    expect(state.selectedTileIds).toEqual(staged); // untouched -- cancel never applies a drop
    expect(document.querySelectorAll('.staging-area .staged-tile').length).toBe(2);
  });
});
