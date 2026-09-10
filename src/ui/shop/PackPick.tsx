import type { ActFn } from '../actFn';
// The "keep one of three" pack-open picker -- extracted from Shop.jsx
// (READ_SLOWLY_PLAN.md A4, mechanical extraction), ported to .tsx.
import { cardBlurb, cardName } from '../quills/cardCopy';
import type { CardCopyTables, CardCopyRun } from '../quills/cardCopy';
import type { PackChoice } from '../../engine/state/run';
import { Button } from '@/ui/primitives/button';

interface Pack {
  kind: string;
  choices: readonly (PackChoice | null)[];
}

interface PackDef {
  name: string;
}

export default function PackPick({
  pack,
  packDef,
  SB,
  run,
  pickCard,
  act,
}: {
  pack: Pack;
  packDef: (kind: string) => PackDef;
  SB: CardCopyTables & {
    LETTER_VALUES?: Record<string, number>;
  };
  run: CardCopyRun;
  pickCard: (i: number) => void;
  act: ActFn;
}) {
  return (
    <div className="sb-pack-open">
      <span className="sb-eyebrow text-[10px] font-semibold tracking-[0.22em] whitespace-nowrap text-[var(--leaf-dim)] uppercase">
        {packDef(pack.kind).name} · keep one
      </span>
      <div className="sb-shop-row">
        {pack.choices.map((c, i) => {
          if (!c) return null;
          return (
            <Button
              key={i}
              type="button"
              variant="paper"
              className={'sb-card sb-card-pick sb-card-' + c.kind}
              title={
                c.kind === 'tile'
                  ? 'A ' + c.tile.letter + ' for your rack'
                  : cardBlurb(SB, c, run)
              }
              onClick={() => pickCard(i)}
            >
              {c.kind === 'tile' ? (
                <span
                  className={
                    // Tailwind port of .sb-tile + .sb-tile.is-set (sandbox.css
                    // A6 slice 5) -- see Rack.tsx for the full comment. No
                    // hover classes: this tile is pointer-events-none
                    // (.sb-tile-static, out of scope) and static.
                    'sb-tile is-set sb-tile-static relative h-[52px] min-w-[46px] touch-none rounded-[2px] border border-[var(--brass-hot)] bg-[var(--brass-hot)] p-0 text-[22px] font-[var(--display)] font-semibold tracking-normal text-[var(--ink)] normal-case shadow-[0_3px_0_rgba(0,0,0,0.5)] select-none max-[620px]:h-[46px] max-[620px]:min-w-[40px] max-[620px]:text-[19px]'
                  }
                >
                  {c.tile.letter}
                  <sub className="absolute right-1 bottom-[3px] text-[9px] font-[var(--figure)] text-[rgba(26,23,16,0.6)]">
                    {SB.LETTER_VALUES
                      ? SB.LETTER_VALUES[c.tile.letter]
                      : window.Wordbound.Lexicon.LETTER_VALUES[c.tile.letter]}
                  </sub>
                </span>
              ) : (
                <>
                  <b>{cardName(SB, c)}</b>
                  <em>{cardBlurb(SB, c, run)}</em>
                </>
              )}
            </Button>
          );
        })}
        <Button
          type="button"
          variant="paperGhost"
          className="sb-offer-skip"
          onClick={() =>
            act(
              'Kept nothing.',
              (
                run as unknown as {
                  pick: (
                    v: null,
                  ) => { ok?: boolean; reason?: string } | boolean | null;
                }
              ).pick(null),
            )
          }
        >
          Keep nothing
        </Button>
      </div>
    </div>
  );
}
