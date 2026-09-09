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
