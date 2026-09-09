// The pre-fight card: enemy/piece line, situation opening frame, flavour
// quote, the reading condition (or plain target), Fight/Walk-past buttons.
// Extracted from RoundSandbox.jsx (READ_SLOWLY_PLAN.md A4). Pure props in;
// enterFight/skipFight stay owned by the parent.
import SituationPanel from '../../sandbox/SituationPanel';
import type { Situation } from '../../engine/content/situations';

interface Fight {
  def: { glyph: string; name: string; flavour?: string };
  piece: { title: string; composer?: string };
}

interface Rule {
  name: string;
  plain: string;
  text: string;
}

interface RoundLike {
  situation: unknown;
  target: number;
  rule?: Rule | null;
  favour?: string | null;
}

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
  f: Fight;
  round: RoundLike;
  SB: {
    situationFor?: (situation: unknown) => Situation | null | undefined;
    ladderIndex?: (
      situation: Situation | null | undefined,
      score: number,
      target: number,
    ) => number;
    FAVOUR_DEFS: Record<string, FavourDef>;
  };
  enterFight: () => void;
  skipFight: () => void;
}) {
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
      <SituationPanel
        situation={SB.situationFor && SB.situationFor(round.situation)}
        ladderIndex={
          SB.ladderIndex
            ? SB.ladderIndex(SB.situationFor!(round.situation), 0, round.target)
            : 0
        }
      />
      {f.def.flavour && <q className="sb-intro-flavour">{f.def.flavour}</q>}
      {round.rule ? (
        <div className="sb-rule is-pulse">
          <span className="sb-eyebrow">
            Reading condition · {round.rule.name}
          </span>
          <b className="sb-rule-plain">{round.rule.plain}</b>
          <q>{round.rule.text}</q>
        </div>
      ) : (
        <span className="sb-hint">Target {round.target}</span>
      )}
      <div className="sb-intro-row">
        <button type="button" className="sb-go" onClick={enterFight}>
          Fight {f.def.name}
        </button>
        {round.favour && (
          <button
            type="button"
            className="sb-skip-btn"
            title={
              SB.FAVOUR_DEFS[round.favour]!.name +
              ': ' +
              SB.FAVOUR_DEFS[round.favour]!.hint +
              '. No shop after a skip.'
            }
            onClick={skipFight}
          >
            Walk past for <b>{SB.FAVOUR_DEFS[round.favour]!.name}</b>
          </button>
        )}
      </div>
    </div>
  );
}
