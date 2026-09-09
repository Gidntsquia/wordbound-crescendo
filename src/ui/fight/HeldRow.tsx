// Held bookmarks (quills) + consumables row -- extracted from
// RoundSandbox.jsx (READ_SLOWLY_PLAN.md A4), then split further into
// QuillRow/QuillCard/ConsumablesRow (A4, second pass) and ported to .tsx
// (A1 remainder).
import QuillRow from './QuillRow';
import ConsumablesRow from './ConsumablesRow';

interface Float {
  key: string;
  on: string;
  tone: string;
  text: string;
}

interface ItemDef {
  name: string;
  rarity?: string;
  glyph?: string;
  crescendo?: boolean;
}

interface Consumable {
  kind: string;
  id: string;
}

interface Cres {
  phase: string;
  secs: number;
}

export default function HeldRow({
  run,
  SB,
  act,
  live,
  inShop,
  onInk,
  lit,
  floats,
  cres,
  tip,
  setTip,
}: {
  run: {
    items: string[];
    consumables: Consumable[];
    tune: {
      ITEM_SLOTS: number;
      CONSUMABLE_SLOTS: number;
      MARK_PRICE: number;
      ETUDE_PRICE: number;
    };
    tierLevels: Record<string, number>;
    moveItem: (from: number, to: number) => unknown;
    shop: { sell: (i: number) => unknown };
    useConsumable: (i: number) => unknown;
    sellConsumable: (i: number) => unknown;
  };
  SB: {
    ITEM_DEFS: Record<string, ItemDef>;
    TIER_DEFS: Record<string, { name: string }>;
    MARK_DEFS: Record<string, { targets: number }>;
    CRESCENDO: { countdown: number };
    priceOf: (d: ItemDef) => number;
  };
  act: (message: string | null, res: unknown, sfx?: string) => void;
  live: boolean;
  inShop: boolean;
  onInk?: (i: number) => void;
  lit: string | null;
  floats: Float[];
  cres: Cres | null;
  tip: string | null;
  setTip: (updater: (t: string | null) => string | null) => void;
}) {
  return (
    <div className="sb-held">
      <QuillRow
        run={run}
        SB={SB}
        act={act}
        live={live}
        inShop={inShop}
        lit={lit}
        floats={floats}
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
