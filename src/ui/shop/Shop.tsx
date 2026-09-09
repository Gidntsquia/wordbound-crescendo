// The shop between fights: two cards, two packs, reroll, and the door --
// extracted from RoundSandbox.jsx (READ_SLOWLY_PLAN.md A4), then split
// further into CardSlot/PackPick/ShopInkPicker (A4, second pass) and
// ported to .tsx (A1 remainder).
import HeldRow from '../fight/HeldRow';
import CardSlot from './CardSlot';
import PackPick from './PackPick';
import ShopInkPicker from './ShopInkPicker';
import { useCallout } from '../chrome/Callout';

interface Tile {
  id: string;
  letter: string;
  mark?: string;
}

interface ShopCard {
  kind: string;
  id: string;
  price: number;
  sold?: boolean;
}

interface Pack {
  kind: string;
  free?: boolean;
  opened?: boolean;
  price: number;
  choices: { kind: string; tile?: Tile; id?: string }[];
}

interface Ink {
  targets: number;
  needsVowel?: boolean;
  hint: string;
}

interface Selecting {
  name: string;
  from: string;
  price: number;
  ink: Ink;
  hand: Tile[];
  ids: string[];
  vowel: string | null;
}

interface ItemDef {
  rarity?: string;
  glyph?: string;
  crescendo?: boolean;
  name: string;
}

interface Consumable {
  kind: string;
  id: string;
}

interface Cres {
  phase: string;
  secs: number;
}

interface RunLike {
  shop: {
    coupon?: boolean;
    cards: ShopCard[];
    packs: Pack[];
    rerollPrice: () => number;
    reroll: () => unknown;
    openPack: (i: number) => unknown;
    sell: (i: number) => unknown;
  };
  pack: Pack | null;
  pick: (v: null) => unknown;
  ink: number;
  items: string[];
  consumables: Consumable[];
  movement: number;
  stage: number;
  targetFor: (movement: number, stage: number) => number;
  tune: {
    ITEM_SLOTS: number;
    CONSUMABLE_SLOTS: number;
    MARK_PRICE: number;
    ETUDE_PRICE: number;
  };
  tierLevels: Record<string, number>;
  moveItem: (from: number, to: number) => unknown;
  useConsumable: (i: number) => unknown;
  sellConsumable: (i: number) => unknown;
}

export default function Shop({
  run,
  SB,
  act,
  leave,
  onInk,
  firstVisit,
  buyCard,
  pickCard,
  selecting,
  commitSelecting,
  cancelSelecting,
  toggleSelectTile,
  tip,
  setTip,
}: {
  run: RunLike;
  SB: {
    enemyAt: (
      movement: number,
      stage: number,
    ) => { glyph: string; name: string };
    PACK_KINDS: { kind: string; name: string; hint: string }[];
    ITEM_DEFS: Record<string, ItemDef>;
    TIER_DEFS: Record<string, { name: string }>;
    MARK_DEFS: Record<string, { name: string; hint: string; targets: number }>;
    VOWELS: string[];
    LETTER_VALUES?: Record<string, number>;
    CRESCENDO: { countdown: number };
    priceOf: (d: ItemDef) => number;
  };
  act: (message: string | null, res: unknown, sfx?: string) => void;
  leave: () => void;
  onInk?: (i: number) => void;
  firstVisit: boolean;
  buyCard: (i: number) => void;
  pickCard: (i: number) => void;
  selecting: Selecting | null;
  commitSelecting: (apply: boolean) => void;
  cancelSelecting: () => void;
  toggleSelectTile: (id: string | null, vowel?: string) => void;
  tip: string | null;
  setTip: (updater: (t: string | null) => string | null) => void;
}) {
  const shop = run.shop;
  const next = SB.enemyAt(run.movement, run.stage);
  const packDef = (kind: string) => SB.PACK_KINDS.find((k) => k.kind === kind)!;
  useCallout(
    firstVisit && !selecting,
    'Quills score every word. Gold carries over.',
  );
  return (
    <div className="sb-shop">
      <div className="sb-shop-head">
        <span className="sb-eyebrow">
          The shop · between fights
          {shop.coupon ? ' · coupon: cards are free' : ''}
          {shop.packs.some((p) => p.free && !p.opened) ? ' · a free pack' : ''}
        </span>
        <span className="sb-purse">
          <b>{run.ink}</b> ink
        </span>
      </div>
      {selecting && (
        <ShopInkPicker
          selecting={selecting}
          SB={SB}
          run={run}
          toggleSelectTile={toggleSelectTile}
          commitSelecting={commitSelecting}
          cancelSelecting={cancelSelecting}
        />
      )}
      {!selecting && run.pack && (
        <PackPick
          pack={run.pack}
          packDef={packDef}
          SB={SB}
          run={run}
          pickCard={pickCard}
          act={act}
        />
      )}
      {!selecting && !run.pack && (
        <>
          <div className="sb-shop-row" aria-label="Cards">
            {shop.cards.map((c, i) => (
              <CardSlot
                key={i}
                c={c}
                i={i}
                run={run}
                SB={SB}
                tip={tip}
                setTip={setTip}
                buyCard={buyCard}
              />
            ))}
            <button
              type="button"
              className="sb-reroll"
              disabled={run.ink < shop.rerollPrice()}
              onClick={() => act('Rerolled.', shop.reroll(), 'coin')}
            >
              Reroll <span className="sb-price">{shop.rerollPrice()}</span>
            </button>
          </div>
          <div className="sb-shop-row" aria-label="Packs">
            {shop.packs.map((p, i) => (
              <button
                key={i}
                type="button"
                disabled={p.opened || run.ink < (p.free ? 0 : p.price)}
                className={
                  'sb-card sb-card-pack sb-pack-' +
                  p.kind +
                  (p.opened ? ' is-sold' : '')
                }
                title={packDef(p.kind).hint}
                onClick={() =>
                  act(
                    'Opened a ' + packDef(p.kind).name.toLowerCase() + '.',
                    shop.openPack(i),
                    'coin',
                  )
                }
              >
                <span className="sb-card-kind">pack</span>
                <b>{p.opened ? 'opened' : packDef(p.kind).name}</b>
                <em>{p.opened ? '' : packDef(p.kind).hint}</em>
                {!p.opened && (
                  <span className="sb-price">{p.free ? 'free' : p.price}</span>
                )}
              </button>
            ))}
          </div>
          <HeldRow
            run={run}
            SB={SB}
            act={act}
            live={false}
            inShop
            onInk={onInk}
            lit={null}
            floats={[]}
            cres={null as Cres | null}
            tip={tip}
            setTip={setTip}
          />
          <button type="button" className="sb-go sb-shop-leave" onClick={leave}>
            Continue
            <small>
              next: {next.glyph} {next.name} · target{' '}
              {run.targetFor(run.movement, run.stage)}
            </small>
          </button>
        </>
      )}
    </div>
  );
}
