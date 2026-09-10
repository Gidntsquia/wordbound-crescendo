// The pre-fight card: enemy/piece line, situation opening frame, flavour
// quote, the reading condition (or plain target), Fight/Walk-past buttons.
// Extracted from RoundSandbox.jsx (READ_SLOWLY_PLAN.md A4). Pure props in;
// enterFight/skipFight stay owned by the parent.
import SituationPanel from './SituationPanel';
import { Button } from '@/ui/primitives/button';
import { Popover, PopoverTrigger, PopoverContent } from '../primitives/popover';
import type { Situation, SituationId } from '../../engine/content/situations';
import type { Fight } from '../../app/store';
import type { RoundFacade } from '../../engine/state/facade';

type RoundLike = RoundFacade | null | undefined;

interface FavourDef {
  name: string;
  hint: string;
}

export default function EnemyIntroCard({
  f,
  round,
  SB,
  enterFight,
  skipFight,
}: {
  f: Fight | null;
  round: RoundLike;
  SB: {
    situationFor?: (
      situation: SituationId | null | undefined,
    ) => Situation | null;
    ladderIndex?: (
      situation: Situation | null,
      score: number,
      target: number,
    ) => number;
    FAVOUR_DEFS: Record<string, FavourDef>;
  };
  enterFight: () => void;
  skipFight: () => void;
}) {
  if (!round) return null;
  const situation = SB.situationFor && SB.situationFor(round.situation);
  if (!f || !f.def || !f.piece) return null;
  const opening =
    f.def.kind === 'boss' && situation?.bossOpening?.length
      ? situation.bossOpening
      : situation?.opening;
  return (
    <div className="sb-intro">
      <div className="sb-enemy-line">
        <span className="sb-enemy">
          {f.def.glyph} {f.def.name}
        </span>
        <span className="sb-piece">
          {f.piece.title}
          {f.piece.composer ? ' · ' + f.piece.composer : ''}
        </span>
      </div>
      {opening?.length ? (
        <p className="sb-intro-opening">{opening.join(' ')}</p>
      ) : null}
      <SituationPanel
        situation={situation}
        ladderIndex={
          SB.ladderIndex
            ? SB.ladderIndex(situation ?? null, 0, round.target)
            : 0
        }
        antagonist={f.def.antagonist}
      />
      {f.def.flavour && <q className="sb-intro-flavour">{f.def.flavour}</q>}
      {round.rule ? (
        <div className="is-pulse my-2 border-l-[3px] border-[var(--rubric)] bg-[var(--pit-deep)] px-3 py-2">
          <span className="sb-eyebrow mb-0.5 block text-[10px] font-semibold tracking-[0.22em] whitespace-nowrap text-[var(--rubric)] uppercase">
            Reading condition · {round.rule.name}
          </span>
          <b className="sb-rule-plain">{round.rule.plain}</b>
          <q className="text-[15px] font-[var(--display)] italic [quotes:none]">
            {round.rule.text}
          </q>
        </div>
      ) : (
        <span className="sb-hint">Target {round.target}</span>
      )}
      <div className="sb-intro-row">
        <Button
          type="button"
          className="sb-go border-[var(--leaf)] bg-[var(--leaf)] text-[var(--ink)] hover:border-[var(--brass-hot)] hover:bg-[var(--brass-hot)] hover:text-[var(--ink)]"
          variant="paperPrimary"
          onClick={enterFight}
        >
          Fight {f.def.name}
        </Button>
        {round.favour && (
          <span className="sb-skip-row">
            <Button
              type="button"
              className="sb-skip-btn"
              variant="paperGhost"
              onClick={skipFight}
            >
              Walk past for <b>{SB.FAVOUR_DEFS[round.favour]!.name}</b>
            </Button>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    className="sb-skip-info"
                    variant="paperGhost"
                  />
                }
                aria-label={
                  'What ' + SB.FAVOUR_DEFS[round.favour]!.name + ' does'
                }
              >
                ?
              </PopoverTrigger>
              <PopoverContent>
                <b>{SB.FAVOUR_DEFS[round.favour]!.name}</b>:{' '}
                {SB.FAVOUR_DEFS[round.favour]!.hint}. No shop after a skip.
              </PopoverContent>
            </Popover>
          </span>
        )}
      </div>
    </div>
  );
}
