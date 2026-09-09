// Polls the soundtrack's crescendo window for the held-quill card's
// countdown. Extracted verbatim from RoundSandbox.jsx (READ_SLOWLY_PLAN.md
// A2/A4). Only runs while a round is live and a crescendo quill is held;
// 100ms keeps the seconds readout honest without redrawing when nothing
// has changed.
import { useEffect, useState } from 'react';

export interface CrescendoState {
  phase: 'idle' | 'soon' | 'live';
  secs?: number;
  mag?: number;
}

interface ItemDef {
  crescendo?: boolean;
}

interface RunLike {
  items: string[];
}

export function holdsCrescendoItem(
  run: RunLike | null | undefined,
  ITEM_DEFS: Record<string, ItemDef>,
): boolean {
  return (
    !!run && run.items.some((id) => ITEM_DEFS[id] && ITEM_DEFS[id].crescendo)
  );
}

export function useCrescendo(
  phase: string,
  fight: React.MutableRefObject<{
    run?: RunLike;
    seq?: { crescendo?: () => CrescendoState };
  } | null>,
  ITEM_DEFS: Record<string, ItemDef>,
  sfx: (name: string, ...a: unknown[]) => void,
): CrescendoState {
  const [polled, setPolled] = useState<CrescendoState>({ phase: 'idle' });
  const active =
    phase === 'live' && holdsCrescendoItem(fight.current?.run, ITEM_DEFS);

  useEffect(() => {
    if (!active) return undefined;
    let last = '',
      lastPhase = 'idle';
    const id = setInterval(() => {
      const s = fight.current?.seq;
      const c: CrescendoState =
        s && s.crescendo ? s.crescendo() : { phase: 'idle' };
      const key =
        c.phase +
        ':' +
        (c.secs == null
          ? ''
          : c.phase === 'live'
            ? c.secs.toFixed(1)
            : Math.ceil(c.secs));
      if (key === last) return;
      last = key;
      // The window opening gets a sound of its own so the ear is told too.
      if (c.phase === 'live' && lastPhase !== 'live') sfx('shimmer');
      lastPhase = c.phase;
      setPolled(c);
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return active ? polled : { phase: 'idle' };
}
