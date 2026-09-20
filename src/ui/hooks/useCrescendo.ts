// Poll the soundtrack for the public phrase cue and any held timing cards.
import { useEffect, useState } from 'react';
import type { Fight } from '../../app/store';
import type { CrescendoWindow } from '../../audio/recordingPlayer';
import { ITEM_DEFS } from '../../engine/content/items';

export type CrescendoState = CrescendoWindow;

export function useCrescendo(
  phase: string,
  fight: React.RefObject<Fight | null>,
  sfx: (name: string, ...a: unknown[]) => void,
): CrescendoState {
  const [polled, setPolled] = useState<CrescendoState>({ phase: 'idle' });
  const run = fight.current?.run;
  const publicCue = Number(run?.tune.PHRASE_POINTS ?? 2) > 0;
  const timingCard = run?.items.some((id) => ITEM_DEFS[id]?.crescendo);
  const active = phase === 'live' && (publicCue || !!timingCard);

  useEffect(() => {
    if (!active) {
      setPolled({ phase: 'idle' });
      return undefined;
    }
    let last = '',
      lastPhase = 'idle';
    const id = setInterval(() => {
      const s = fight.current?.seq;
      const c: CrescendoState =
        s && s.crescendo ? s.crescendo() : { phase: 'idle' };
      const key =
        c.phase +
        ':' +
        (c.phase === 'idle' || c.secs == null
          ? ''
          : c.phase === 'live'
            ? c.secs.toFixed(1)
            : Math.ceil(c.secs));
      if (key === last) return;
      last = key;
      // The window opening gets a sound of its own so the ear is told too.
      if (c.phase === 'live' && lastPhase !== 'live') sfx('shimmer');
      lastPhase = c.phase;
      setPolled(c.phase === 'idle' ? { phase: 'idle' } : c);
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return active ? polled : { phase: 'idle' };
}
