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
    <div className="border border-dashed border-[var(--brass)] bg-[var(--pit-deep)] p-[10px_12px]">
      <span className="sb-eyebrow mb-2 block text-[10px] font-semibold tracking-[0.22em] whitespace-nowrap text-[var(--leaf-dim)] uppercase">
        {packDef(pack.kind).name} · keep one
      </span>
      <div className="flex flex-wrap items-stretch gap-2.5">
        {pack.choices.map((c, i) => {
          if (!c) return null;
          return (
            <Button
              key={i}
              type="button"
              variant="paper"
              className="relative inline-flex max-w-[200px] min-w-32 flex-col items-center justify-center gap-[3px] rounded-sm border border-[var(--rule)] bg-[var(--pit-raise)] px-3 py-[9px] text-left text-[11px] font-[var(--ui)] tracking-[0.04em] whitespace-normal text-[var(--leaf)] normal-case max-[620px]:max-w-full max-[620px]:min-w-[120px]"
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
                    // hover classes: this tile is static, and pointer-events
                    // are off (former .sb-tile-static, A6 slice 6 -- unused
                    // elsewhere, so it isn't reproduced as a named class).
                    'sb-tile is-set pointer-events-none relative h-[52px] min-w-[46px] touch-none rounded-[2px] border border-[var(--brass-hot)] bg-[var(--brass-hot)] p-0 text-[22px] font-[var(--display)] font-semibold tracking-normal text-[var(--ink)] normal-case shadow-[0_3px_0_rgba(0,0,0,0.5)] select-none max-[620px]:h-[46px] max-[620px]:min-w-[40px] max-[620px]:text-[19px]'
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
                  <b className="pr-[26px] text-base leading-[1.15] font-[var(--display)] font-semibold tracking-normal">
                    {cardName(SB, c)}
                  </b>
                  <em className="font-normal text-[var(--leaf-dim)] not-italic">
                    {cardBlurb(SB, c, run)}
                  </em>
                </>
              )}
            </Button>
          );
        })}
        <Button
          type="button"
          variant="paperGhost"
          className="self-center px-1 py-1.5 text-[11px] tracking-[0.06em] text-[var(--leaf-dim)] underline decoration-solid underline-offset-[3px] hover:text-[var(--brass-hot)]"
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
