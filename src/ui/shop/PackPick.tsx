import type { ActFn } from '../actFn';
// The "keep one of three" pack-open picker -- extracted from Shop.jsx
// (READ_SLOWLY_PLAN.md A4, mechanical extraction), ported to .tsx.
import { cardBlurb, cardName } from '../fight/cardCopy';
import type { PackChoice } from '../../engine/state/run';

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
  SB: {
    LETTER_VALUES?: Record<string, number>;
  };
  run: unknown;
  pickCard: (i: number) => void;
  act: ActFn;
}) {
  return (
    <div className="sb-pack-open">
      <span className="sb-eyebrow">{packDef(pack.kind).name} · keep one</span>
      <div className="sb-shop-row">
        {pack.choices.map((c, i) => {
          if (!c) return null;
          return (
            <button
              key={i}
              type="button"
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
            </button>
          );
        })}
        <button
          type="button"
          className="sb-offer-skip"
          onClick={() =>
            act(
              'Kept nothing.',
              (
                run as {
                  pick: (
                    v: null,
                  ) => { ok?: boolean; reason?: string } | boolean | null;
                }
              ).pick(null),
            )
          }
        >
          Keep nothing
        </button>
      </div>
    </div>
  );
}
