// The live scoreline (score/meter/target/words/swaps), enemy/piece line,
// situation caption, and reading condition card. Extracted from
// RoundSandbox.jsx (READ_SLOWLY_PLAN.md A4). Pure props in; scoring/seen
// are read-only here.
import SituationPanel from './SituationPanel';
import {
  Progress,
  ProgressTrack,
  ProgressIndicator,
} from '../primitives/progress';
import type { Situation, SituationId } from '../../engine/content/situations';
import type { Fight } from '../../app/store';
import type { RoundFacade } from '../../engine/state/facade';
import type { CrescendoState } from '../hooks/useCrescendo';

type RoundLike = RoundFacade;

interface Float {
  key: string | number;
  on: string | number | undefined;
  tone: string | undefined;
  text: string | undefined;
}

interface ScoringState {
  total?: number | null;
  litItem?: string | null;
  floats: Float[];
  hit?: number;
}

// The reading-condition card's floating +N/x2 badges (sandbox.css A6 slice 7
// port of .sb-float.sb-float-card / .is-mult); `float-up` stays a keyframe
// in sandbox.css.
const FLOAT_CARD_BASE =
  'pointer-events-none absolute top-[-10px] left-1/2 z-6 font-[var(--figure)] text-sm font-bold whitespace-nowrap text-[var(--brass-hot)] not-italic [text-shadow:0_1px_6px_rgba(0,0,0,0.8)] motion-safe:animate-[float-up_720ms_ease-out_forwards] ';
const FLOAT_MULT = 'text-[var(--rubric)]';

export default function ScoreLine({
  f,
  round,
  SB,
  scoring,
  scoreShown,
  pct,
  seen,
  live,
  cres,
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
  };
  scoring: ScoringState | null;
  scoreShown: number;
  pct: number;
  seen: ReadonlySet<string>;
  live: boolean;
  cres?: CrescendoState;
}) {
  if (!f || !f.def || !f.piece) return null;
  return (
    <>
      <div
        className="my-2.5 mt-2.5 mb-1 flex flex-wrap items-center gap-x-3 gap-y-1.5"
        aria-label="Score against the target"
      >
        <span
          className={
            'sb-dyn-mark block min-w-[2.2ch] flex-none p-0 pr-[3px] text-[34px] font-[var(--display)] font-extrabold text-[var(--brass-hot)] italic transition-colors duration-300 ease-in-out max-[620px]:text-[28px]' +
            (scoring && scoring.total != null
              ? ' inline-block motion-safe:animate-[total-hit_460ms_cubic-bezier(0.2,0.9,0.3,1)]'
              : '')
          }
        >
          {scoreShown}
        </span>
        <Progress
          value={scoreShown}
          max={round.target}
          className="sb-meter-progress m-0 h-3 flex-[1_1_120px] max-[620px]:flex-[1_1_72px]"
          aria-label="Progress to target"
        >
          <ProgressTrack className="relative h-3.5 overflow-hidden rounded-sm border border-[var(--rule)] bg-[var(--pit-raise)]">
            <ProgressIndicator
              className={
                'h-full bg-[var(--leaf)] transition-[width] duration-300 ease-out' +
                (scoreShown >= round.target ? ' bg-[var(--brass-hot)]' : '')
              }
              style={{ width: pct + '%' }}
            />
          </ProgressTrack>
        </Progress>
        <span className="inline-flex flex-none items-baseline gap-[5px] text-[15px] font-[var(--figure)] text-[var(--leaf-dim)]">
          <small className="text-[9px] tracking-[0.2em] uppercase">
            target
          </small>
          {round.target}
        </span>
        <span className="flex flex-wrap gap-x-[22px] gap-y-2 text-xs tracking-[0.04em] text-[var(--leaf-dim)] max-[620px]:gap-x-3">
          <span>
            <b className="mr-1 text-[15px] font-[var(--figure)] text-[var(--leaf)]">
              {round.playsLeft}
            </b>{' '}
            word{round.playsLeft === 1 ? '' : 's'}
          </span>
          <span
            className={
              seen.has('swap') || !live || round.changeoutsLeft <= 0
                ? ''
                : 'sb-callout-anchor'
            }
          >
            <b className="mr-1 text-[15px] font-[var(--figure)] text-[var(--leaf)]">
              {round.changeoutsLeft}
            </b>{' '}
            swap
            {round.changeoutsLeft === 1 ? '' : 's'}
          </span>
        </span>
      </div>
      <div className="my-0.5 mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
        <span className="text-[11px] font-semibold tracking-[0.08em] text-[var(--brass)] uppercase">
          {f.def.glyph} {f.def.name}
        </span>
        <span className="text-[13px] font-[var(--display)] text-[var(--leaf-dim)] italic">
          {f.piece.title}
          {f.piece.composer ? ' · ' + f.piece.composer : ''}
        </span>
      </div>
      <SituationPanel
        situation={SB.situationFor && SB.situationFor(round.situation)}
        ladderIndex={
          SB.ladderIndex
            ? SB.ladderIndex(
                SB.situationFor!(round.situation),
                scoreShown,
                round.target,
              )
            : 0
        }
        hit={scoring?.hit}
        antagonist={f.def.antagonist}
        crescendoLive={live && cres?.phase === 'live'}
      />
      {round.rule && (
        <div
          className={
            'relative my-2 border-l-[3px] border-[var(--rubric)] bg-[var(--pit-deep)] px-3 py-2' +
            (scoring && scoring.litItem === round.rule.id
              ? ' motion-safe:animate-[rule-flash_420ms_ease-out]'
              : '') +
            (!seen.has('boss')
              ? ' motion-safe:animate-[rule-pulse_1.6s_ease-in-out_3]'
              : '')
          }
        >
          {scoring &&
            scoring.floats
              .filter((x) => x.on === round.rule!.id)
              .map((x) => (
                <i
                  key={x.key}
                  className={
                    FLOAT_CARD_BASE + (x.tone === 'mult' ? FLOAT_MULT : '')
                  }
                >
                  {x.text}
                </i>
              ))}
          <span className="sb-eyebrow mb-0.5 block text-[10px] font-semibold tracking-[0.22em] whitespace-nowrap text-[var(--rubric)] uppercase">
            Reading condition · {round.rule.name}
          </span>
          <b className="mt-0.5 mb-[3px] block text-[13px] font-[var(--ui)] font-semibold text-[var(--leaf)]">
            {round.rule.plain}
          </b>
          <q className="text-[15px] font-[var(--display)] italic [quotes:none]">
            {round.rule.text}
          </q>
        </div>
      )}
    </>
  );
}
