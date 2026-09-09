// READ_SLOWLY_PLAN.md stage C3: the fight's framing above the rack -- who
// we're helping, the antagonist, and a caption that moves as score climbs
// the ladder. Person/antagonist are text placeholders (no sprite sheets
// yet -- stage E's job); this component only reads props and renders, no
// state of its own, so it's safe to call every render from RoundSandbox's
// forceRender loop.
export default function SituationPanel({ situation, ladderIndex }) {
  if (!situation) return null;
  const step = situation.ladder[Math.max(0, ladderIndex)];
  if (!step) return null;
  return (
    <div className="sb-situation" aria-label={situation.title}>
      <span className="sb-situation-person" title={step.personPose}>
        🧍
      </span>
      <span className="sb-situation-caption">{step.caption}</span>
      <span className="sb-situation-antagonist" title={step.antagonistPose}>
        📖
      </span>
    </div>
  );
}
