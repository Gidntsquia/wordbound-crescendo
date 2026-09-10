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
                <span className="sb-tile is-set sb-tile-static">
                  {c.tile.letter}
                  <sub>
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
