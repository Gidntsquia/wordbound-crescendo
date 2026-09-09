// Owns the sfx-on toggle (persisted, wbc.sfx) and the sfx(name, ...args)
// dispatcher used everywhere an input/cascade event wants a sound. Extracted
// verbatim from RoundSandbox.jsx (READ_SLOWLY_PLAN.md A2/A4). Does NOT own
// the audio-context/recording lifecycle (ctx/gain/seq creation, visibility
// resume, warm-ahead) -- that stays in RoundSandbox for now: it's tightly
// coupled to the mutable `fight` ref and has mobile background/resume
// failure modes nothing automated can exercise, so extracting it needs a
// real phone check first.
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { sfxReducer, readSfxOn, writeSfxOn } from '../../app/store';
import type { Fight } from '../../app/store';

export function useSfx(fight: React.RefObject<Fight | null>) {
  const [sfxState, dispatchSfx] = useReducer(sfxReducer, undefined, () => ({
    on: readSfxOn(),
  }));
  const sfxOn = sfxState.on;
  const setSfxOn = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      dispatchSfx({
        type: 'sfx/set',
        on: typeof next === 'function' ? next(sfxOn) : next,
      });
    },
    [sfxOn],
  );
  const sfxOnRef = useRef(sfxOn);
  useEffect(() => {
    sfxOnRef.current = sfxOn;
    writeSfxOn(sfxOn);
    if (fight.current?.sfx) fight.current.sfx.setEnabled(sfxOn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sfxOn]);
  // The sound for an input event, if a run has opened the audio device.
  const sfx = useCallback(
    (name: string, ...a: unknown[]) => {
      const s = fight.current?.sfx as Record<string, unknown> | undefined;
      if (s && typeof s[name] === 'function')
        (s[name] as (...args: unknown[]) => void)(...a);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  return { sfxOn, setSfxOn, sfxOnRef, sfx };
}
