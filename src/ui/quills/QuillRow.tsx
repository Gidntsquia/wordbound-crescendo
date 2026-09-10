import type { ActFn } from '../actFn';
// The row of held quills (items) -- extracted from HeldRow.jsx
// (READ_SLOWLY_PLAN.md A4, mechanical extraction), ported to .tsx.
import QuillCard from './QuillCard';
import type { RunFacade } from '../../engine/state/facade';
import type { CrescendoWindow } from '../../audio/recordingPlayer';

interface Float {
  key: string | number;
  on: string | number | undefined;
  tone: string | undefined;
  text: string | undefined;
}

interface ItemDef {
  name: string;
  hint: string;
  rarity?: string;
  glyph?: string;
  crescendo?: boolean;
}

type RunLike = RunFacade;
type Cres = CrescendoWindow;

export default function QuillRow({
  run,
  SB,
  act,
  live,
  inShop,
  lit,
  floats,
  cres,
  tip,
  setTip,
}: {
  run: RunLike;
  SB: {
    ITEM_DEFS: Record<string, ItemDef>;
    CRESCENDO: { countdown: number };
    priceOf: (d: ItemDef) => number;
  };
  act: ActFn;
  live: boolean;
  inShop: boolean;
  lit: string | null;
  floats: Float[];
  cres: Cres | null;
  tip: string | null;
  setTip: (updater: (t: string | null) => string | null) => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 max-[620px]:gap-1.5"
      aria-label="Quills"
    >
      <span className="sb-eyebrow min-w-24 text-[10px] font-semibold tracking-[0.22em] whitespace-nowrap text-[var(--leaf-dim)] uppercase max-[620px]:w-full max-[620px]:min-w-0">
        Bookmarks · {run.items.length}/{run.tune.ITEM_SLOTS}
      </span>
      {run.items.map((id, i) => {
        const d = SB.ITEM_DEFS[id]!;
        const cresState = d.crescendo
          ? live && cres
            ? cres.phase
            : 'idle'
          : null;
        return (
          <QuillCard
            key={id}
            id={id}
            d={d}
            i={i}
            itemsLength={run.items.length}
            lit={lit}
            cresState={cresState}
            cresArg={live ? cres : null}
            tip={tip}
            setTip={setTip}
            act={act}
            run={run}
            inShop={inShop}
            floats={floats}
            SB={SB}
          />
        );
      })}
      {run.items.length === 0 && (
        <span className="sb-hint m-0 text-[11px] text-[var(--leaf-dim)] italic">
          nothing yet
        </span>
      )}
    </div>
  );
}
