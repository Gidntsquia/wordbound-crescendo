import type { ActFn } from '../actFn';
import { Button } from '@/ui/primitives/button';
import Sprite from '../../art/Sprite';
// The shop between fights: two cards, two packs, reroll, and the door --
// extracted from RoundSandbox.jsx (READ_SLOWLY_PLAN.md A4), then split
// further into CardSlot/PackPick/ShopInkPicker (A4, second pass) and
// ported to .tsx (A1 remainder).
import HeldRow from '../fight/HeldRow';
import CardSlot from './CardSlot';
import PackPick from './PackPick';
import ShopInkPicker from './ShopInkPicker';
import { useCallout } from '../chrome/Callout';
import type { RunFacade } from '../../engine/state/facade';
import type { CrescendoWindow } from '../../audio/recordingPlayer';
import type { Selecting } from '../fight/FightScreen';

type RunLike = RunFacade;
type Cres = CrescendoWindow;

interface ItemDef {
  rarity?: string;
  glyph?: string;
  crescendo?: boolean;
  name: string;
  hint: string;
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
    ) => { glyph: string; name: string } | null;
    PACK_KINDS: { kind: string; name: string; hint: string }[];
    ITEM_DEFS: Record<string, ItemDef>;
    TIER_DEFS: Record<string, { name: string }>;
    MARK_DEFS: Record<string, { name: string; hint: string; targets: number }>;
    VOWELS: string[];
    LETTER_VALUES?: Record<string, number>;
    CRESCENDO: { countdown: number };
    priceOf: (d: ItemDef) => number;
  };
  act: ActFn;
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
  useCallout(
    firstVisit && !selecting,
    'Quills score every word. Gold carries over.',
  );
  if (!shop) return null;
  const next = SB.enemyAt(run.movement, run.stage);
  const packDef = (kind: string) => SB.PACK_KINDS.find((k) => k.kind === kind)!;
  return (
    <div className="mt-3.5 flex flex-col gap-3 border border-[var(--brass)] bg-[var(--pit-deep)] p-[14px_16px_16px] max-[620px]:p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="sb-eyebrow text-[10px] font-semibold tracking-[0.22em] whitespace-nowrap text-[var(--leaf-dim)] uppercase">
          The shop · between fights
          {shop.coupon ? ' · coupon: cards are free' : ''}
          {(shop.packs ?? []).some((p) => p.free && !p.opened)
            ? ' · a free pack'
            : ''}
        </span>
        <span className="inline-flex items-baseline gap-1.5">
          <b className="text-lg font-[var(--figure)] text-[var(--brass-hot)]">
            {run.ink}
          </b>{' '}
          ink
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
          <div
            className="flex flex-wrap items-stretch gap-2.5"
            aria-label="Cards"
          >
            {(shop.cards ?? []).map((c, i) => (
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
            <Button
              type="button"
              variant="paper"
              className="h-auto self-center px-3.5 py-2.5"
              disabled={run.ink < shop.rerollPrice()}
              onClick={() => act('Rerolled.', shop.reroll(), 'coin')}
            >
              Reroll{' '}
              <span className="ml-1.5 text-[13px] font-[var(--figure)] text-[var(--brass-hot)] before:mr-1 before:text-[8px] before:content-['\25C6']">
                {shop.rerollPrice()}
              </span>
            </Button>
          </div>
          <div
            className="flex flex-wrap items-stretch gap-2.5"
            aria-label="Packs"
          >
            {(shop.packs ?? []).map((p, i) => (
              <Button
                key={i}
                type="button"
                variant="paper"
                disabled={p.opened || run.ink < (p.free ? 0 : p.price)}
                className={
                  'relative isolate inline-flex max-w-[200px] min-w-32 flex-col items-start gap-[3px] rounded-sm border border-[var(--rule)] bg-[var(--pit-raise)] px-3 py-[9px] text-left text-[11px] font-[var(--ui)] tracking-[0.04em] whitespace-normal text-[var(--leaf)] normal-case max-[620px]:max-w-full max-[620px]:min-w-[120px]' +
                  (p.opened ? ' opacity-40' : '')
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
                {!p.opened && (
                  <Sprite
                    sheet="pack_wrapper"
                    pose="idle"
                    className="pointer-events-none absolute inset-0 -z-10 opacity-65"
                  />
                )}
                <span className="text-[9px] tracking-[0.2em] text-[var(--leaf-dim)] uppercase">
                  pack
                </span>
                <b className="pr-[26px] text-base leading-[1.15] font-[var(--display)] font-semibold tracking-normal">
                  {p.opened ? 'opened' : packDef(p.kind).name}
                </b>
                <em className="[line-height:1.35] font-normal text-[var(--leaf-dim)] not-italic">
                  {p.opened ? '' : packDef(p.kind).hint}
                </em>
                {!p.opened && (
                  <span className="absolute top-1.5 right-2 text-[13px] font-[var(--figure)] text-[var(--brass-hot)] before:mr-1 before:text-[8px] before:content-['\25C6']">
                    {p.free ? 'free' : p.price}
                  </span>
                )}
              </Button>
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
          <Button
            type="button"
            variant="paperPrimary"
            className="sb-go h-auto self-start border-[var(--leaf)] bg-[var(--leaf)] px-[18px] py-3 text-[var(--ink)] hover:border-[var(--brass-hot)] hover:bg-[var(--brass-hot)] hover:text-[var(--ink)]"
            onClick={leave}
          >
            Continue
            <small>
              next: {next?.glyph} {next?.name} · target{' '}
              {run.targetFor(run.movement, run.stage)}
            </small>
          </Button>
        </>
      )}
    </div>
  );
}
