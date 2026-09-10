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

export default function ScoreLine({
  f,
  round,
  SB,
  scoring,
  scoreShown,
  pct,
  seen,
  live,
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
}) {
  if (!f || !f.def || !f.piece) return null;
  return (
    <>
      <div className="sb-scoreline" aria-label="Score against the target">
        <span
          className={
            'sb-dyn-mark' + (scoring && scoring.total != null ? ' is-hit' : '')
          }
        >
          {scoreShown}
        </span>
        <Progress
          value={scoreShown}
          max={round.target}
          className="sb-meter-progress"
          aria-label="Progress to target"
        >
          <ProgressTrack className="sb-meter">
            <ProgressIndicator
              className={
                'sb-meter-fill' + (scoreShown >= round.target ? ' is-met' : '')
              }
              style={{ width: pct + '%' }}
            />
          </ProgressTrack>
        </Progress>
        <span className="sb-target">
          <small>target</small>
          {round.target}
        </span>
        <span className="sb-counters">
          <span>
            <b>{round.playsLeft}</b> word{round.playsLeft === 1 ? '' : 's'}
          </span>
          <span
            className={
              seen.has('swap') || !live || round.changeoutsLeft <= 0
                ? ''
                : 'sb-callout-anchor'
            }
          >
            <b>{round.changeoutsLeft}</b> swap
            {round.changeoutsLeft === 1 ? '' : 's'}
          </span>
        </span>
      </div>
      <div className="sb-enemy-line">
        <span className="sb-enemy">
          {f.def.glyph} {f.def.name}
        </span>
        <span className="sb-piece">
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
      />
      {round.rule && (
        <div
          className={
            'sb-rule' +
            (scoring && scoring.litItem === round.rule.id ? ' is-flash' : '') +
            (!seen.has('boss') ? ' is-pulse' : '')
          }
        >
          {scoring &&
            scoring.floats
              .filter((x) => x.on === round.rule!.id)
              .map((x) => (
                <i
                  key={x.key}
                  className={'sb-float sb-float-card is-' + x.tone}
                >
                  {x.text}
                </i>
              ))}
          <span className="sb-eyebrow text-[10px] font-semibold tracking-[0.22em] whitespace-nowrap text-[var(--leaf-dim)] uppercase">
            Reading condition · {round.rule.name}
          </span>
          <b className="sb-rule-plain">{round.rule.plain}</b>
          <q>{round.rule.text}</q>
        </div>
      )}
    </>
  );
}
