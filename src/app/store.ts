// READ_SLOWLY_PLAN.md A3 -- the first reducer-backed state slice, converted
// from RoundSandbox.jsx's useState + manual localStorage read/write.
//
// Scope note: this is deliberately NOT the run/round core the plan's A3
// section describes (fight.current, forceRender, round.playWord, run.next
// and friends). That state is a mutable ref mutated in place across ~2,300
// lines of scoring/drag/audio-timing code with no test suite and a standing
// no-browser-verification constraint -- converting it wholesale risks a
// silent regression only playing the game would catch. Until either that
// constraint lifts or the conversion is done as a much longer piece-by-piece
// effort, only self-contained UI-only state (like this one) moves here.
// Each future slice gets its own reducer + action union in this file, kept
// independent so a mistake in one can't touch another.

export interface SfxState {
  on: boolean;
}

export type SfxAction =
  { type: 'sfx/set'; on: boolean } | { type: 'sfx/toggle' };

export function sfxReducer(state: SfxState, action: SfxAction): SfxState {
  switch (action.type) {
    case 'sfx/set':
      return action.on === state.on ? state : { on: action.on };
    case 'sfx/toggle':
      return { on: !state.on };
    default:
      return state;
  }
}

const SFX_KEY = 'wbc.sfx';

export function readSfxOn(): boolean {
  try {
    return window.localStorage.getItem(SFX_KEY) !== '0';
  } catch {
    return true;
  }
}

export function writeSfxOn(on: boolean): void {
  try {
    window.localStorage.setItem(SFX_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
}

// The refresh counter that stands in for React re-reading fight.current
// after it's mutated in place. This replaces RoundSandbox.jsx's old
// `const [, forceRender] = useState(0)` with a reducer, satisfying A3's
// "delete forceRender" instruction at the seam that's actually safe to
// touch: the counter itself is trivial UI-only state. It does NOT make
// fight.current/run/round immutable -- that's still the gated, unconverted
// core described above. dispatch({type: 'refresh'}) replaces forceRender().
export type RefreshAction = { type: 'refresh' };

export function refreshReducer(state: number, action: RefreshAction): number {
  switch (action.type) {
    case 'refresh':
      return state + 1;
    default:
      return state;
  }
}

// The core run/round mutation call sites in RoundSandbox.jsx, routed
// through a typed dispatch instead of a direct call (READ_SLOWLY_PLAN.md
// A3, browser-verification pass 2026-09-08): playWord, changeout, next,
// pickLetter, skip, leaveShop, moveTile, and (pass 3) the shop/pack/mark-
// selecting flow: buyCard, pickCard, commitSelecting (covers saveMark/
// useAdhocMark), useInk, applyInk (covers drawMarkHand/useAdhocMark/
// useConsumable). Those five are converted wholesale per function rather
// than call-by-call -- each function's branches (mark-card detour vs. plain
// buy/pick) share one `act`-shaped result path, and splitting a function
// half-dispatched/half-direct-call would be worse than moving the whole
// thing. `act` itself (say/sfx/refresh given a result) stays inlined in
// each case rather than becoming its own action, since it never touches
// fight.current.
// Each converted case's body is a verbatim relocation
// of the original useCallback's logic -- the component-local closures it
// depended on (say, sfx, startStage, markSeen, warm, unlockNextKey,
// refreshDiscovered, refresh, setPhase/setWord/etc, SB) are threaded through
// as fields on the action payload rather than re-derived, so the reducer
// case can call them in the exact same order the original code did. This is
// a relocation, not a redesign: round.ts/items.ts's mutable object shape and
// every mutation's actual behavior are untouched -- only how the UI reaches
// the mutation changes. `fight` itself stays a ref; the reducer dereferences
// action.fight.current same as the direct calls did.
type FightRef = {
  current: {
    run: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    round: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    def?: { name: string };
    seq?: { stop?: () => void };
  } | null;
};

export type FightAction =
  | {
      type: 'fight/setTune';
      fight: { current: { round: { tune: Record<string, unknown> } } | null };
      key: string;
      value: unknown;
    }
  | {
      type: 'fight/playWord';
      fight: FightRef;
      phase: string;
      raw: string;
      say: (m: string) => void;
      sfx: (...a: unknown[]) => void;
      markSeen: (id: string) => void;
      setWord: (w: string) => void;
      setSuggestions: (s: unknown[]) => void;
      describeBreakdown: (b: unknown) => string;
      runCascade: (
        r: unknown,
        res: unknown,
        rackBefore: unknown,
        scoreBefore: unknown,
      ) => void;
    }
  | {
      type: 'fight/changeout';
      fight: FightRef;
      phase: string;
      ids: string[];
      say: (m: string) => void;
      sfx: (...a: unknown[]) => void;
      markSeen: (id: string) => void;
      setWord: (w: string) => void;
      setSuggestions: (s: unknown[]) => void;
      refresh: () => void;
    }
  | {
      type: 'fight/nextStage';
      fight: FightRef;
      phase: string;
      say: (m: string) => void;
      refresh: () => void;
      startStage: (run: unknown) => void;
      SB: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      warm: (movement: unknown, stage: unknown) => void;
      unlockNextKey: (run: unknown) => void;
      refreshDiscovered: () => void;
      setPhase: (p: string) => void;
      setBest: (v: unknown) => void;
      recordRun: (run: unknown, won: boolean) => unknown;
    }
  | {
      type: 'fight/pickLetter';
      fight: FightRef;
      phase: string;
      letter: string;
      say: (m: string) => void;
      refresh: () => void;
      startStage: (run: unknown) => void;
      SB: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      warm: (movement: unknown, stage: unknown) => void;
      unlockNextKey: (run: unknown) => void;
      setPhase: (p: string) => void;
      setBest: (v: unknown) => void;
      recordRun: (run: unknown, won: boolean) => unknown;
    }
  | {
      type: 'fight/leaveShop';
      fight: FightRef;
      phase: string;
      markSeen: (id: string) => void;
      startStage: (run: unknown) => void;
    }
  | {
      type: 'fight/skip';
      fight: FightRef;
      phase: string;
      say: (m: string) => void;
      startStage: (run: unknown) => void;
      SB: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    }
  | {
      type: 'fight/moveTile';
      fight: FightRef;
      fromIndex: number;
      to: number;
      refresh: () => void;
    }
  | {
      type: 'fight/buyCard';
      fight: FightRef;
      index: number;
      SB: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      cardName: (SB: unknown, c: unknown) => string;
      setWord: (w: string) => void;
      setSelecting: (s: unknown) => void;
      say: (m: string) => void;
      sfx: (...a: unknown[]) => void;
      refresh: () => void;
    }
  | {
      type: 'fight/pickCard';
      fight: FightRef;
      index: number;
      SB: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      cardName: (SB: unknown, c: unknown) => string;
      setWord: (w: string) => void;
      setSelecting: (s: unknown) => void;
      say: (m: string) => void;
      sfx: (...a: unknown[]) => void;
      refresh: () => void;
    }
  | {
      type: 'fight/commitSelecting';
      fight: FightRef;
      selecting: {
        from: string;
        index: number;
        name: string;
        ids: string[];
        vowel: unknown;
      } | null;
      apply: boolean;
      setSelecting: (s: unknown) => void;
      say: (m: string) => void;
      sfx: (...a: unknown[]) => void;
      refresh: () => void;
    }
  | {
      type: 'fight/useInk';
      fight: FightRef;
      index: number;
      SB: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      setWord: (w: string) => void;
      setInking: (s: unknown) => void;
      say: (m: string) => void;
      sfx: (...a: unknown[]) => void;
      refresh: () => void;
    }
  | {
      type: 'fight/applyInk';
      fight: FightRef;
      inking: {
        adhocId?: string;
        index?: number;
        ids: string[];
        vowel: unknown;
      } | null;
      setInking: (s: unknown) => void;
      say: (m: string) => void;
      sfx: (...a: unknown[]) => void;
      refresh: () => void;
    };

// Shared act()-shaped result handling: say/sfx a result, refresh on success.
// Returns whether the result was ok, same as the original `act` helper's
// return value (callers use it to decide whether to also clear local state
// like setSelecting(null)/setInking(null)).
function actResult(
  res: { ok?: boolean; reason?: string } | null | undefined,
  label: string | null,
  sound: string | undefined,
  say: (m: string) => void,
  sfx: (...a: unknown[]) => void,
  refresh: () => void,
): boolean {
  if (!res || !res.ok) {
    say(res && res.reason ? res.reason : 'Nothing happened.');
    sfx('thud');
    return false;
  }
  if (label) say(label);
  if (sound) sfx(sound);
  refresh();
  return true;
}

export function fightReducer(state: number, action: FightAction): number {
  switch (action.type) {
    case 'fight/setTune': {
      const f = action.fight.current;
      if (f) f.round.tune[action.key] = action.value;
      return state + 1;
    }
    case 'fight/playWord': {
      const r = action.fight.current?.round;
      if (!r || action.phase !== 'live') return state + 1;
      const rackBefore = r.rack.slice();
      const scoreBefore = r.score;
      const res = r.playWord(action.raw);
      if (!res.ok) {
        action.say(res.reason);
        action.sfx('thud');
        return state + 1;
      }
      action.markSeen('stick');
      action.setWord('');
      action.setSuggestions([]);
      action.say(
        res.word +
          ' — ' +
          res.breakdown.total +
          ' (' +
          action.describeBreakdown(res.breakdown) +
          ')' +
          ' → ' +
          r.score +
          ' / ' +
          r.target +
          '.',
      );
      res.messages.forEach((m: string) => action.say(m));
      action.runCascade(r, res, rackBefore, scoreBefore);
      return state + 1;
    }
    case 'fight/changeout': {
      const r = action.fight.current?.round;
      if (!r || action.phase !== 'live') return state + 1;
      const res = r.changeout(action.ids);
      if (!res.ok) {
        action.say(res.reason);
        action.sfx('thud');
        return state + 1;
      }
      action.sfx('shuffle');
      action.markSeen('swap');
      action.setWord('');
      action.setSuggestions([]);
      action.say(
        'Swapped ' +
          res.returned.map((t: { letter: string }) => t.letter).join('') +
          ' for ' +
          res.drawn.map((t: { letter: string }) => t.letter).join('') +
          ' — ' +
          r.changeoutsLeft +
          ' swap' +
          (r.changeoutsLeft === 1 ? '' : 's') +
          ' left.',
      );
      action.refresh();
      return state + 1;
    }
    case 'fight/nextStage': {
      const f = action.fight.current;
      if (!f || !f.run || action.phase !== 'won') return state + 1;
      const won = f.run.next();
      if (f.run.quillFound) {
        action.say(
          'The boss also yields a new quill: ' +
            action.SB.ITEM_DEFS[f.run.quillFound].name +
            '.',
        );
        f.run.quillFound = null;
        action.refreshDiscovered();
      }
      if (won === 'won') {
        action.setPhase('run-won');
        action.say('The last boss falls. Run won with ' + f.run.ink + ' ink.');
        action.setBest(action.recordRun(f.run, true));
        action.unlockNextKey(f.run);
        action.SB.unlockNext(f.run.character);
        action.refresh();
        return state + 1;
      }
      if (f.run.letterChoice) {
        action.setPhase('letter');
        action.say('The boss falls — choose a letter to win back.');
        action.SB.unlockNext(f.run.character);
        action.refresh();
        return state + 1;
      }
      if (f.run.shop) {
        action.warm(f.run.movement, f.run.stage);
        action.setPhase('shop');
        action.say('The shop opens. ' + f.run.ink + ' ink in the purse.');
        action.refresh();
        return state + 1;
      }
      action.startStage(f.run);
      return state + 1;
    }
    case 'fight/pickLetter': {
      const f = action.fight.current;
      if (
        !f ||
        !f.run ||
        action.phase !== 'letter' ||
        !f.run.pickLetter(action.letter)
      )
        return state + 1;
      if (f.run.state === 'won') {
        action.setPhase('run-won');
        action.say('The last boss falls. Run won with ' + f.run.ink + ' ink.');
        action.setBest(action.recordRun(f.run, true));
        action.unlockNextKey(f.run);
        action.SB.unlockNext(f.run.character);
        action.refresh();
        return state + 1;
      }
      if (f.run.shop) {
        action.warm(f.run.movement, f.run.stage);
        action.setPhase('shop');
        action.say('The shop opens. ' + f.run.ink + ' ink in the purse.');
        action.refresh();
        return state + 1;
      }
      action.startStage(f.run);
      return state + 1;
    }
    case 'fight/leaveShop': {
      const f = action.fight.current;
      if (!f || !f.run || action.phase !== 'shop') return state + 1;
      if (!f.run.leaveShop()) return state + 1;
      action.markSeen('shop');
      action.startStage(f.run);
      return state + 1;
    }
    case 'fight/skip': {
      const f = action.fight.current;
      if (!f || !f.run || action.phase !== 'live') return state + 1;
      const res = f.run.skip();
      if (!res.ok) {
        action.say(res.reason);
        return state + 1;
      }
      action.say(
        'Skipped ' +
          f.def!.name +
          ' for a bonus — ' +
          action.SB.FAVOUR_DEFS[res.favour].name +
          ': ' +
          action.SB.FAVOUR_DEFS[res.favour].hint +
          '.',
      );
      action.startStage(f.run);
      return state + 1;
    }
    case 'fight/moveTile': {
      const r = action.fight.current?.round;
      if (!r) return state + 1;
      r.moveTile(action.fromIndex, action.to);
      action.refresh();
      return state + 1;
    }
    case 'fight/buyCard': {
      const run = action.fight.current?.run;
      const shop = run?.shop;
      const c = shop?.cards[action.index];
      if (!c) return state + 1;
      if (c.kind === 'mark') {
        const ink = action.SB.MARK_DEFS[c.id];
        action.setWord('');
        action.setSelecting({
          from: 'shop',
          index: action.index,
          price: c.price,
          name: action.cardName(action.SB, c),
          ink,
          hand: run.drawMarkHand(),
          ids: [],
          vowel: null,
        });
        return state + 1;
      }
      const res = shop.buy(action.index);
      if (!res || !res.ok) {
        actResult(res, null, undefined, action.say, action.sfx, action.refresh);
        return state + 1;
      }
      const label = res.used
        ? 'Bought ' +
          action.cardName(action.SB, c) +
          ' and used it — ' +
          res.used
        : 'Bought ' + action.cardName(action.SB, c) + ' for ' + c.price + '.';
      actResult(
        res,
        label,
        res.used ? 'shimmer' : 'coin',
        action.say,
        action.sfx,
        action.refresh,
      );
      return state + 1;
    }
    case 'fight/pickCard': {
      const run = action.fight.current?.run;
      const c = run?.pack?.choices[action.index];
      if (!c) return state + 1;
      if (c.kind === 'mark') {
        const ink = action.SB.MARK_DEFS[c.id];
        action.setWord('');
        action.setSelecting({
          from: 'pack',
          index: action.index,
          name: action.cardName(action.SB, c),
          ink,
          hand: run.drawMarkHand(),
          ids: [],
          vowel: null,
        });
        return state + 1;
      }
      const res = run.pick(action.index);
      if (!res || !res.ok) {
        actResult(res, null, undefined, action.say, action.sfx, action.refresh);
        return state + 1;
      }
      const label = res.used
        ? 'Kept ' + action.cardName(action.SB, c) + ' and used it — ' + res.used
        : 'Kept ' +
          (c.kind === 'tile'
            ? 'the ' + c.tile.letter
            : 'the ' + action.cardName(action.SB, c)) +
          '.';
      actResult(res, label, 'tick', action.say, action.sfx, action.refresh);
      return state + 1;
    }
    case 'fight/commitSelecting': {
      const run = action.fight.current?.run;
      const selecting = action.selecting;
      if (!run || !selecting) return state + 1;
      const purchase =
        selecting.from === 'shop'
          ? run.shop.buy(selecting.index)
          : run.pick(selecting.index);
      if (!purchase || !purchase.ok) {
        actResult(
          purchase,
          null,
          undefined,
          action.say,
          action.sfx,
          action.refresh,
        );
        return state + 1;
      }
      const verb = selecting.from === 'shop' ? 'Bought' : 'Kept';
      if (!action.apply) {
        const res = run.saveMark(purchase.mark);
        if (
          actResult(
            res,
            res.ok ? verb + ' ' + selecting.name + ' — saved for later.' : null,
            'tick',
            action.say,
            action.sfx,
            action.refresh,
          )
        )
          action.setSelecting(null);
        return state + 1;
      }
      const res = run.useAdhocMark(purchase.mark, selecting.ids, {
        vowel: selecting.vowel,
      });
      if (
        actResult(
          res,
          res.ok
            ? verb + ' ' + selecting.name + ' and used it — ' + res.note
            : null,
          'shimmer',
          action.say,
          action.sfx,
          action.refresh,
        )
      )
        action.setSelecting(null);
      return state + 1;
    }
    case 'fight/useInk': {
      const r = action.fight.current?.run;
      if (!r) return state + 1;
      const c = r.consumables[action.index];
      if (!c || c.kind !== 'mark') return state + 1;
      const ink = action.SB.MARK_DEFS[c.id];
      if (ink.targets === 0) {
        const res = r.useConsumable(action.index, []);
        actResult(
          res,
          res.ok ? res.result.note : null,
          'shimmer',
          action.say,
          action.sfx,
          action.refresh,
        );
        return state + 1;
      }
      action.setWord('');
      action.setInking({ index: action.index, ink, ids: [], vowel: null });
      return state + 1;
    }
    case 'fight/applyInk': {
      const r = action.fight.current?.run;
      const inking = action.inking;
      if (!r || !inking) return state + 1;
      const res = inking.adhocId
        ? r.useAdhocMark(inking.adhocId, inking.ids, { vowel: inking.vowel })
        : r.useConsumable(inking.index, inking.ids, { vowel: inking.vowel });
      const label = inking.adhocId
        ? res.ok
          ? res.note
          : null
        : res.ok
          ? res.result.note
          : null;
      if (
        actResult(res, label, 'shimmer', action.say, action.sfx, action.refresh)
      )
        action.setInking(null);
      return state + 1;
    }
    default:
      return state;
  }
}

// Gear panel open/closed -- pure UI state, no persistence, 3 call sites.
export interface GearState {
  open: boolean;
}

export type GearAction =
  { type: 'gear/toggle' } | { type: 'gear/set'; open: boolean };

export function gearReducer(state: GearState, action: GearAction): GearState {
  switch (action.type) {
    case 'gear/toggle':
      return { open: !state.open };
    case 'gear/set':
      return action.open === state.open ? state : { open: action.open };
    default:
      return state;
  }
}

// Which one-time callouts (Phase 2) have already been shown. wbc.seen holds
// the ids as a JSON array; the legacy '1' value from the old three-line
// overlay maps to a single 'legacy' id, preserved from the original
// RoundSandbox.jsx readSeen().
const SEEN_KEY = 'wbc.seen';

export interface SeenState {
  ids: ReadonlySet<string>;
}

export type SeenAction = { type: 'seen/mark'; id: string };

export function seenReducer(state: SeenState, action: SeenAction): SeenState {
  switch (action.type) {
    case 'seen/mark': {
      if (state.ids.has(action.id)) return state;
      const next = new Set(state.ids);
      next.add(action.id);
      writeSeen(next);
      return { ids: next };
    }
    default:
      return state;
  }
}

export function readSeen(): ReadonlySet<string> {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    if (raw === '1') return new Set(['legacy']);
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export function writeSeen(ids: ReadonlySet<string>): void {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

// Highest-unlocked key (stage 3): a win on the highest-unlocked key offers
// the next one. Read-only input (wonIndex) comes from a finished run, but
// the state and its clamp/increment logic are UI-only -- run/round
// themselves are never touched.
const KEY_UNLOCKED_KEY = 'wbc.keyUnlocked';

export interface KeyUnlockedState {
  index: number;
}

export type KeyUnlockedAction = {
  type: 'keyUnlocked/wonAtIndex';
  wonIndex: number;
  keyCount: number;
};

export function keyUnlockedReducer(
  state: KeyUnlockedState,
  action: KeyUnlockedAction,
): KeyUnlockedState {
  switch (action.type) {
    case 'keyUnlocked/wonAtIndex': {
      const prev = state.index;
      if (action.wonIndex < prev || prev >= action.keyCount - 1) return state;
      const next = Math.min(action.keyCount - 1, prev + 1);
      writeKeyUnlocked(next);
      return { index: next };
    }
    default:
      return state;
  }
}

export function readKeyUnlocked(): number {
  try {
    return Math.max(
      0,
      parseInt(window.localStorage.getItem(KEY_UNLOCKED_KEY) || '', 10) || 0,
    );
  } catch {
    return 0;
  }
}

export function writeKeyUnlocked(i: number): void {
  try {
    window.localStorage.setItem(KEY_UNLOCKED_KEY, String(i));
  } catch {
    /* ignore */
  }
}

// The best-ever tracker (best word, deepest enemy, wins). recordRun already
// computes the next value and writes it to localStorage as a pure function
// of a finished run -- the reducer just adopts that precomputed value, same
// division of labor as before (RoundSandbox.jsx keeps recordRun/readBest as
// the read-only-input side; this only replaces the useState + setBest).
const BEST_KEY = 'wbc.best';

// Loosely typed: the shape is whatever recordRun/readBest in RoundSandbox.jsx
// produce (best word, deepest enemy, wins, winsByKey) -- not yet a shared
// type across the JS/TS boundary.
export type BestState = Record<string, unknown>;

export type BestAction = { type: 'best/set'; value: BestState };

export function bestReducer(state: BestState, action: BestAction): BestState {
  switch (action.type) {
    case 'best/set':
      return action.value;
    default:
      return state;
  }
}

export function readBest(): BestState {
  try {
    return JSON.parse(window.localStorage.getItem(BEST_KEY) || '') || {};
  } catch {
    return {};
  }
}
