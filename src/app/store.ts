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

import type { RunFacade, RoundFacade } from '../engine/state/facade';
import {
  KEYS,
  readJSON,
  readRaw,
  writeJSON,
  writeRaw,
  readUnlockedCharacters,
  writeUnlockedCharacters,
  writeWonLetters,
  writeDiscoveredQuills,
} from './persistence';
import { ITEM_DEFS } from '../engine/content/items';
import { MARK_DEFS } from '../engine/content/marginalia';
import { FAVOUR_DEFS, TIER_DEFS } from '../engine/content/round';
import { unlockNext } from '../engine/content/characters';
import { cardName, describeBreakdown } from '../ui/quills/cardCopy';
import type { Enemy } from '../engine/content/enemies';
import type { RecordedPiece, AudioPiece } from '../audio/recordingPlayer';
import type { Sfx } from '../audio/sfx';

// The mutable "current fight" bag RoundSandbox.jsx has always kept in a
// ref (fight.current): the facade's run/round plus the audio graph for the
// enemy on stage. Every field is optional because the object is built up in
// stages (the audio graph opens before a run exists; a run/round exist
// before their def/piece are set at stage-start) -- runFightAction below
// only ever reads a field after the call site that populates it.
export interface Fight {
  run?: RunFacade;
  round?: RoundFacade | null;
  ctx?: AudioContext;
  gain?: GainNode;
  sfx?: Sfx;
  seq?: AudioPiece | null;
  def?: Enemy;
  piece?: RecordedPiece;
}

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

export function readSfxOn(): boolean {
  return readRaw(KEYS.sfx) !== '0';
}

export function writeSfxOn(on: boolean): void {
  writeRaw(KEYS.sfx, on ? '1' : '0');
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
export type FightRef = { current: Fight | null };

// Data-only action union (READ_SLOWLY_PLAN.md A3 remainder): every field is
// plain data, no closures. runFightAction below mutates the facade exactly
// as the old fightReducer did, but returns a FightEffect[] describing the
// side effects (say/sfx/setWord/etc) instead of calling them -- the caller
// (RoundSandbox.jsx's dispatchFight) runs those effects in the same order,
// keeping the feel-sensitive cascade/say/sfx sequencing byte-identical.
export type FightAction =
  | { type: 'fight/setTune'; fight: FightRef; key: string; value: unknown }
  | { type: 'fight/playWord'; fight: FightRef; phase: string; raw: string }
  | { type: 'fight/changeout'; fight: FightRef; phase: string; ids: string[] }
  | { type: 'fight/nextStage'; fight: FightRef; phase: string }
  | {
      type: 'fight/pickLetter';
      fight: FightRef;
      phase: string;
      letter: string;
    }
  | { type: 'fight/leaveShop'; fight: FightRef; phase: string }
  | { type: 'fight/skip'; fight: FightRef; phase: string }
  | {
      type: 'fight/moveTile';
      fight: FightRef;
      fromIndex: number;
      to: number;
    }
  | { type: 'fight/buyCard'; fight: FightRef; index: number }
  | { type: 'fight/pickCard'; fight: FightRef; index: number }
  | {
      type: 'fight/commitSelecting';
      fight: FightRef;
      selecting: {
        from: string;
        index: number;
        name: string;
        ids: string[];
        vowel: string | null;
      } | null;
      apply: boolean;
    }
  | { type: 'fight/useInk'; fight: FightRef; index: number }
  | {
      type: 'fight/applyInk';
      fight: FightRef;
      inking: {
        adhocId?: string;
        index?: number;
        ids: string[];
        vowel: string | null;
      } | null;
    };

// Data-shaped side effects runFightAction returns; RoundSandbox.jsx's
// dispatchFight applies each in order against its own closures (say, sfx,
// setWord, ...) after the facade mutation has already happened.
export type FightEffect =
  | { kind: 'say'; message: string }
  | { kind: 'sfx'; name: string }
  | { kind: 'markSeen'; id: string }
  | { kind: 'setWord'; value: string }
  | { kind: 'setSuggestions'; value: unknown[] }
  | { kind: 'setPhase'; phase: string }
  | { kind: 'setSelecting'; value: unknown }
  | { kind: 'setInking'; value: unknown }
  | { kind: 'startStage'; run: RunFacade }
  | { kind: 'warm'; movement: number; stage: number }
  | { kind: 'refreshDiscovered' }
  | { kind: 'recordRun'; run: RunLike; won: boolean }
  | { kind: 'unlockNextKey'; run: RunFacade }
  | {
      kind: 'runCascade';
      round: RoundFacade;
      res: ReturnType<RoundFacade['playWord']>;
      rackBefore: RoundFacade['rack'];
      scoreBefore: number;
    };

// Shared act()-shaped result handling: say/sfx effects for a result, plus
// whether it was ok (callers use that to decide whether to also clear local
// state like setSelecting(null)/setInking(null)), same division as the old
// `act`/actResult helper.
// Pure unlockNext (READ_SLOWLY_PLAN.md A2 remainder) + the one place that
// persists the result -- callers just fire-and-forget like the old
// side-effecting unlockNext(characterId) did.
function unlockNextCharacter(characterId: string | null | undefined): void {
  const stored = readUnlockedCharacters();
  const next = unlockNext(characterId, stored);
  if (next) writeUnlockedCharacters(next);
}

function actResult(
  effects: FightEffect[],
  res: { ok?: boolean; reason?: string } | null | undefined,
  label: string | null,
  sound: string | undefined,
): boolean {
  if (!res || !res.ok) {
    effects.push({
      kind: 'say',
      message: res && res.reason ? res.reason : 'Nothing happened.',
    });
    effects.push({ kind: 'sfx', name: 'thud' });
    return false;
  }
  if (label) effects.push({ kind: 'say', message: label });
  if (sound) effects.push({ kind: 'sfx', name: sound });
  return true;
}

export function runFightAction(action: FightAction): FightEffect[] {
  const effects: FightEffect[] = [];
  switch (action.type) {
    case 'fight/setTune': {
      const f = action.fight.current;
      if (f)
        f.round!.tune[action.key] = action.value as
          number | boolean | undefined;
      return effects;
    }
    case 'fight/playWord': {
      const r = action.fight.current?.round;
      if (!r || action.phase !== 'live') return effects;
      const rackBefore = r.rack.slice();
      const scoreBefore = r.score;
      const res = r.playWord(action.raw);
      if (!res.ok) {
        effects.push({ kind: 'say', message: res.reason ?? '' });
        effects.push({ kind: 'sfx', name: 'thud' });
        return effects;
      }
      effects.push({ kind: 'markSeen', id: 'stick' });
      effects.push({ kind: 'setWord', value: '' });
      effects.push({ kind: 'setSuggestions', value: [] });
      effects.push({
        kind: 'say',
        message:
          res.word +
          ' — ' +
          res.breakdown!.total +
          ' (' +
          describeBreakdown(res.breakdown!) +
          ')' +
          ' → ' +
          r.score +
          ' / ' +
          r.target +
          '.',
      });
      res.messages?.forEach((m: string) =>
        effects.push({ kind: 'say', message: m }),
      );
      effects.push({
        kind: 'runCascade',
        round: r,
        res,
        rackBefore,
        scoreBefore,
      });
      return effects;
    }
    case 'fight/changeout': {
      const r = action.fight.current?.round;
      if (!r || action.phase !== 'live') return effects;
      const res = r.changeout(action.ids);
      if (!res.ok) {
        effects.push({ kind: 'say', message: res.reason ?? '' });
        effects.push({ kind: 'sfx', name: 'thud' });
        return effects;
      }
      effects.push({ kind: 'sfx', name: 'shuffle' });
      effects.push({ kind: 'markSeen', id: 'swap' });
      effects.push({ kind: 'setWord', value: '' });
      effects.push({ kind: 'setSuggestions', value: [] });
      effects.push({
        kind: 'say',
        message:
          'Swapped ' +
          (res.returned ?? [])
            .map((t: { letter: string }) => t.letter)
            .join('') +
          ' for ' +
          (res.drawn ?? []).map((t: { letter: string }) => t.letter).join('') +
          ' — ' +
          r.changeoutsLeft +
          ' swap' +
          (r.changeoutsLeft === 1 ? '' : 's') +
          ' left.',
      });
      return effects;
    }
    case 'fight/nextStage': {
      const f = action.fight.current;
      if (!f || !f.run || action.phase !== 'won') return effects;
      const won = f.run.next();
      if (f.run.quillFound) {
        effects.push({
          kind: 'say',
          message:
            'The boss also yields a new quill: ' +
            ITEM_DEFS[f.run.quillFound]!.name +
            '.',
        });
        f.run.quillFound = null;
        writeDiscoveredQuills(f.run.discoveredQuills);
        effects.push({ kind: 'refreshDiscovered' });
      }
      if (won === 'won') {
        effects.push({ kind: 'setPhase', phase: 'run-won' });
        effects.push({
          kind: 'say',
          message: 'The last boss falls. Run won with ' + f.run.ink + ' ink.',
        });
        effects.push({ kind: 'recordRun', run: f.run as RunLike, won: true });
        effects.push({ kind: 'unlockNextKey', run: f.run });
        unlockNextCharacter(f.run.character);
        return effects;
      }
      if (f.run.letterChoice) {
        effects.push({ kind: 'setPhase', phase: 'letter' });
        effects.push({
          kind: 'say',
          message: 'The boss falls — choose a letter to win back.',
        });
        unlockNextCharacter(f.run.character);
        return effects;
      }
      if (f.run.shop) {
        effects.push({
          kind: 'warm',
          movement: f.run.movement,
          stage: f.run.stage,
        });
        effects.push({ kind: 'setPhase', phase: 'shop' });
        effects.push({
          kind: 'say',
          message: 'The shop opens. ' + f.run.ink + ' ink in the purse.',
        });
        return effects;
      }
      effects.push({ kind: 'startStage', run: f.run });
      return effects;
    }
    case 'fight/pickLetter': {
      const f = action.fight.current;
      if (
        !f ||
        !f.run ||
        action.phase !== 'letter' ||
        !f.run.pickLetter(action.letter)
      )
        return effects;
      writeWonLetters(f.run.wonLetters);
      if (f.run.state === 'won') {
        effects.push({ kind: 'setPhase', phase: 'run-won' });
        effects.push({
          kind: 'say',
          message: 'The last boss falls. Run won with ' + f.run.ink + ' ink.',
        });
        effects.push({ kind: 'recordRun', run: f.run as RunLike, won: true });
        effects.push({ kind: 'unlockNextKey', run: f.run });
        unlockNextCharacter(f.run.character);
        return effects;
      }
      if (f.run.shop) {
        effects.push({
          kind: 'warm',
          movement: f.run.movement,
          stage: f.run.stage,
        });
        effects.push({ kind: 'setPhase', phase: 'shop' });
        effects.push({
          kind: 'say',
          message: 'The shop opens. ' + f.run.ink + ' ink in the purse.',
        });
        return effects;
      }
      effects.push({ kind: 'startStage', run: f.run });
      return effects;
    }
    case 'fight/leaveShop': {
      const f = action.fight.current;
      if (!f || !f.run || action.phase !== 'shop') return effects;
      if (!f.run.leaveShop()) return effects;
      effects.push({ kind: 'markSeen', id: 'shop' });
      effects.push({ kind: 'startStage', run: f.run });
      return effects;
    }
    case 'fight/skip': {
      const f = action.fight.current;
      if (!f || !f.run || action.phase !== 'live') return effects;
      const res = f.run.skip();
      if (!res.ok) {
        effects.push({ kind: 'say', message: res.reason ?? '' });
        return effects;
      }
      const fav = FAVOUR_DEFS[res.favour!]!;
      effects.push({
        kind: 'say',
        message:
          'Skipped ' +
          f.def!.name +
          ' for a bonus — ' +
          fav.name +
          ': ' +
          fav.hint +
          '.',
      });
      effects.push({ kind: 'startStage', run: f.run });
      return effects;
    }
    case 'fight/moveTile': {
      const r = action.fight.current?.round;
      if (!r) return effects;
      r.moveTile(action.fromIndex, action.to);
      return effects;
    }
    case 'fight/buyCard': {
      const run = action.fight.current?.run;
      const shop = run?.shop;
      const c = shop?.cards?.[action.index];
      if (!c || !run) return effects;
      if (c.kind === 'mark') {
        const ink = MARK_DEFS[c.id];
        effects.push({ kind: 'setWord', value: '' });
        effects.push({
          kind: 'setSelecting',
          value: {
            from: 'shop',
            index: action.index,
            price: c.price,
            name: cardName(SB, c),
            ink,
            hand: run.drawMarkHand(),
            ids: [],
            vowel: null,
          },
        });
        return effects;
      }
      const res = shop!.buy(action.index);
      if (!res || !res.ok) {
        actResult(effects, res, null, undefined);
        return effects;
      }
      const label = res.used
        ? 'Bought ' + cardName(SB, c) + ' and used it — ' + res.used
        : 'Bought ' + cardName(SB, c) + ' for ' + c.price + '.';
      actResult(effects, res, label, res.used ? 'shimmer' : 'coin');
      return effects;
    }
    case 'fight/pickCard': {
      const run = action.fight.current?.run;
      const c = run?.pack?.choices[action.index];
      if (!c || !run) return effects;
      if (c.kind === 'mark') {
        const ink = MARK_DEFS[c.id];
        effects.push({ kind: 'setWord', value: '' });
        effects.push({
          kind: 'setSelecting',
          value: {
            from: 'pack',
            index: action.index,
            name: cardName(SB, c),
            ink,
            hand: run.drawMarkHand(),
            ids: [],
            vowel: null,
          },
        });
        return effects;
      }
      const res = run.pick(action.index);
      if (!res || !res.ok) {
        actResult(effects, res, null, undefined);
        return effects;
      }
      const label =
        res.used && c.kind !== 'tile'
          ? 'Kept ' + cardName(SB, c) + ' and used it — ' + res.used
          : 'Kept ' +
            (c.kind === 'tile'
              ? 'the ' + c.tile.letter
              : 'the ' + cardName(SB, c)) +
            '.';
      actResult(effects, res, label, 'tick');
      return effects;
    }
    case 'fight/commitSelecting': {
      const run = action.fight.current?.run;
      const selecting = action.selecting;
      if (!run || !selecting) return effects;
      const purchase =
        selecting.from === 'shop'
          ? run.shop!.buy(selecting.index)
          : run.pick(selecting.index);
      if (!purchase || !purchase.ok) {
        actResult(effects, purchase, null, undefined);
        return effects;
      }
      const verb = selecting.from === 'shop' ? 'Bought' : 'Kept';
      if (!action.apply) {
        const res = run.saveMark(purchase.mark as string);
        if (
          actResult(
            effects,
            res,
            res.ok ? verb + ' ' + selecting.name + ' — saved for later.' : null,
            'tick',
          )
        )
          effects.push({ kind: 'setSelecting', value: null });
        return effects;
      }
      const res = run.useAdhocMark(purchase.mark as string, selecting.ids, {
        vowel: selecting.vowel ?? undefined,
      });
      if (
        actResult(
          effects,
          res,
          res.ok
            ? verb + ' ' + selecting.name + ' and used it — ' + res.note
            : null,
          'shimmer',
        )
      )
        effects.push({ kind: 'setSelecting', value: null });
      return effects;
    }
    case 'fight/useInk': {
      const r = action.fight.current?.run;
      if (!r) return effects;
      const c = r.consumables[action.index];
      if (!c || c.kind !== 'mark') return effects;
      const ink = MARK_DEFS[c.id] as { targets: number };
      if (ink.targets === 0) {
        const res = r.useConsumable(action.index, []);
        actResult(
          effects,
          res,
          res.ok ? ((res.result as { note?: string })?.note ?? null) : null,
          'shimmer',
        );
        return effects;
      }
      effects.push({ kind: 'setWord', value: '' });
      effects.push({
        kind: 'setInking',
        value: { index: action.index, ink, ids: [], vowel: null },
      });
      return effects;
    }
    case 'fight/applyInk': {
      const r = action.fight.current?.run;
      const inking = action.inking;
      if (!r || !inking) return effects;
      const res = inking.adhocId
        ? r.useAdhocMark(inking.adhocId, inking.ids, {
            vowel: inking.vowel ?? undefined,
          })
        : r.useConsumable(inking.index!, inking.ids, {
            vowel: inking.vowel ?? undefined,
          });
      const label = inking.adhocId
        ? res.ok
          ? (res.note ?? null)
          : null
        : res.ok
          ? ((res.result as { note?: string })?.note ?? null)
          : null;
      if (actResult(effects, res, label, 'shimmer'))
        effects.push({ kind: 'setInking', value: null });
      return effects;
    }
    default:
      return effects;
  }
}

// SB is the loose sandbox namespace shape cardName's cardCopy.js signature
// still takes; now built from direct content imports rather than the old
// window.Wordbound.Sandbox global.
const SB = { ITEM_DEFS, MARK_DEFS, TIER_DEFS };

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
  const raw = readRaw(KEYS.seen);
  if (!raw) return new Set();
  if (raw === '1') return new Set(['legacy']);
  return new Set(readJSON<string[]>(KEYS.seen, []));
}

export function writeSeen(ids: ReadonlySet<string>): void {
  writeJSON(KEYS.seen, [...ids]);
}

// Highest-unlocked key (stage 3): a win on the highest-unlocked key offers
// the next one. Read-only input (wonIndex) comes from a finished run, but
// the state and its clamp/increment logic are UI-only -- run/round
// themselves are never touched.
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
  return Math.max(0, parseInt(readRaw(KEYS.keyUnlocked) || '', 10) || 0);
}

export function writeKeyUnlocked(i: number): void {
  writeRaw(KEYS.keyUnlocked, String(i));
}

// The best-ever tracker (best word, deepest enemy, wins). recordRun already
// computes the next value and writes it to localStorage as a pure function
// of a finished run -- the reducer just adopts that precomputed value, same
// division of labor as before (RoundSandbox.jsx keeps recordRun/readBest as
// the read-only-input side; this only replaces the useState + setBest).
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
  return readJSON<BestState>(KEYS.best, {});
}

function writeBest(next: BestState): void {
  writeJSON(KEYS.best, next);
}

interface RunLike {
  movement: number;
  stage: number;
  movements: { enemies: unknown[] }[];
  bestPlay?: {
    word: string;
    breakdown: { total: number };
    enemy: string;
  } | null;
  enemy: { name: string } | null;
  key?: string | null;
}

export function runLength(run: RunLike): number {
  return run.movements.reduce((n, m) => n + m.enemies.length, 0);
}

function depthOf(run: RunLike): number {
  return run.movement * 3 + run.stage;
}

// Read-modify-write against the previous wbc.best value -- run/won are the
// only inputs (RoundSandbox.jsx used to keep this local since it also read
// action.SB; now that ITEM_DEFS etc. are plain imports there's no reason
// it can't live fully in the reducer's own module).
export function recordRun(run: RunLike, won: boolean): BestState {
  const best = readBest();
  const out: Record<string, unknown> = { ...best };
  const bestWord = best.word as { total: number } | undefined;
  if (
    run.bestPlay &&
    (!bestWord || run.bestPlay.breakdown.total > bestWord.total)
  ) {
    out.word = {
      word: run.bestPlay.word,
      total: run.bestPlay.breakdown.total,
      enemy: run.bestPlay.enemy,
    };
  }
  const depth = won ? runLength(run) : depthOf(run);
  const deepest = best.deepest as { depth: number } | undefined;
  if (!deepest || depth > deepest.depth) {
    out.deepest = {
      depth,
      name: won ? 'the whole run' : (run.enemy?.name ?? 'unknown'),
    };
  }
  out.wins = ((best.wins as number) || 0) + (won ? 1 : 0);
  out.runs = ((best.runs as number) || 0) + 1;
  if (won && run.key) {
    const winsByKey = { ...((best.winsByKey as Record<string, number>) || {}) };
    winsByKey[run.key] = (winsByKey[run.key] || 0) + 1;
    out.winsByKey = winsByKey;
  }
  writeBest(out);
  return out;
}
