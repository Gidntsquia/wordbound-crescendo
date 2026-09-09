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
