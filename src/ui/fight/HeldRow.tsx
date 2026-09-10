import type { ActFn } from '../actFn';
// Held bookmarks (quills) + consumables row -- extracted from
// RoundSandbox.jsx (READ_SLOWLY_PLAN.md A4), then split further into
// QuillRow/QuillCard/ConsumablesRow (A4, second pass) and ported to .tsx
// (A1 remainder).
import QuillRow from '../quills/QuillRow';
import ConsumablesRow from './ConsumablesRow';
import type { RunFacade } from '../../engine/state/facade';
import type { CrescendoWindow } from '../../audio/recordingPlayer';

interface Float {
  key: string | number;
  on: string | number | undefined;
  tone: string | undefined;
  text: string | undefined;
}

type RunLike = RunFacade | null | undefined;
type Cres = CrescendoWindow;

interface ItemDef {
  name: string;
  hint: string;
  rarity?: string;
  glyph?: string;
  crescendo?: boolean;
}

export default function HeldRow({
  run,
  SB,
  act,
  live,
  inShop = false,
  onInk,
  lit,
  floats,
  cres,
  tip,
  setTip,
}: {
  run: RunLike;
  SB: {
    ITEM_DEFS: Record<string, ItemDef>;
    TIER_DEFS: Record<string, { name: string }>;
    MARK_DEFS: Record<string, { targets: number }>;
    CRESCENDO: { countdown: number };
    priceOf: (d: ItemDef) => number;
  };
  act: ActFn;
  live: boolean;
  inShop?: boolean;
  onInk?: (i: number) => void;
  lit: string | null;
  floats: Float[] | null;
  cres: Cres | null;
  tip: string | null;
  setTip: (updater: (t: string | null) => string | null) => void;
}) {
  if (!run) return null;
  return (
    <div className="mt-3 mb-0.5 flex flex-col gap-2 max-[620px]:mt-2 max-[620px]:gap-1.5">
      <QuillRow
        run={run}
        SB={SB}
        act={act}
        live={live}
        inShop={inShop}
        lit={lit}
        floats={floats ?? []}
        cres={cres}
        tip={tip}
        setTip={setTip}
      />
      {(run.consumables.length > 0 || inShop) && (
        <ConsumablesRow
          run={run}
          SB={SB}
          act={act}
          live={live}
          inShop={inShop}
          onInk={onInk}
          tip={tip}
          setTip={setTip}
        />
      )}
    </div>
  );
}
