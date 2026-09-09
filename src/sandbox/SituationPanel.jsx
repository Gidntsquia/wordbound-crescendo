// READ_SLOWLY_PLAN.md stage C3/E3: the fight's framing above the rack --
// who we're helping, the antagonist, and a caption that moves as score
// climbs the ladder. `Sprite` renders the person/antagonist off
// tools/art-manifest.json's `situation.person`/`situation.antagonist`
// sheet ids and the ladder step's pose fields -- real sheets once sourced,
// a CSS placeholder until then (see src/art/Sprite.jsx). This component
// only reads props and renders, no state of its own, so it's safe to call
// every render from RoundSandbox's forceRender loop; the pose crossfade is
// pure CSS, keyed by the pose prop change.
import Sprite from '../art/Sprite.jsx';

export default function SituationPanel({ situation, ladderIndex }) {
  if (!situation) return null;
  const step = situation.ladder[Math.max(0, ladderIndex)];
  if (!step) return null;
  return (
    <div className="sb-situation" aria-label={situation.title}>
      <Sprite
        sheet={situation.person}
        pose={step.personPose}
        className="sb-situation-person"
      />
      <span className="sb-situation-caption">{step.caption}</span>
      <Sprite
        sheet={situation.antagonist}
        pose={step.antagonistPose}
        className="sb-situation-antagonist"
      />
    </div>
  );
}
