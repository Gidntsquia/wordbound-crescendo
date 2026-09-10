// READ_SLOWLY_PLAN.md stage C3/E3: the fight's framing above the rack --
// who we're helping, the antagonist, and a caption that moves as score
// climbs the ladder. `Sprite` renders the person/antagonist off
// tools/art-manifest.json's `situation.person`/`situation.antagonist`
// sheet ids and the ladder step's pose fields -- real sheets once sourced,
// a CSS placeholder until then (see src/art/Sprite.jsx). This component
// only reads props and renders, no state of its own, so it's safe to call
// every render from RoundSandbox's forceRender loop; the pose crossfade is
// pure CSS, keyed by the pose prop change.
import Sprite from '../../art/Sprite';
import type { Situation } from '../../engine/content/situations';

// The three boss-tier antagonist sheets that draw an extra `crescendo`
// variant (READ_SLOWLY_PLAN.md E1's art-manifest note; the other six only
// have idle/weakening/gone). Kept local since nothing else needs this list.
const CRESCENDO_ANTAGONISTS = new Set(['knocking_door', 'parade', 'the_night']);

export default function SituationPanel({
  situation,
  ladderIndex,
  hit,
  antagonist,
  crescendoLive,
}: {
  situation: Situation | null | undefined;
  ladderIndex: number;
  hit?: number;
  // The big/boss fight in a chapter shows a different antagonist sprite
  // than the chapter's small enemy (READ_SLOWLY_PLAN.md E2) -- falls back
  // to the situation's own antagonist (the small enemy, or pre-fight
  // before `f.def` is known).
  antagonist?: string;
  // READ_SLOWLY_PLAN.md E3: useCrescendo's 'live' phase, while a held
  // crescendo quill's window is open -- swaps a boss-tier antagonist to its
  // `crescendo` pose in place of the ladder's own pose for that beat.
  crescendoLive?: boolean;
}) {
  if (!situation) return null;
  const step = situation.ladder[Math.max(0, ladderIndex)];
  if (!step) return null;
  const antagonistSheet = antagonist || situation.antagonist;
  const antagonistPose =
    crescendoLive && CRESCENDO_ANTAGONISTS.has(antagonistSheet)
      ? 'crescendo'
      : step.antagonistPose;
  return (
    <div className="my-1 flex items-center gap-2" aria-label={situation.title}>
      <Sprite
        sheet={situation.person}
        pose={step.personPose}
        className="h-11 w-11 rounded-lg"
      />
      <span className="flex-1 text-[13px] font-[var(--display)] text-[var(--leaf-dim)]">
        {step.caption}
      </span>
      <Sprite
        sheet={antagonistSheet}
        pose={antagonistPose}
        className={
          'h-11 w-11 rounded-lg' +
          (hit === 1
            ? ' motion-safe:animate-[sb-sprite-crossfade_200ms_ease-out,board-shake-1_280ms_ease-out]'
            : hit === 2
              ? ' motion-safe:animate-[sb-sprite-crossfade_200ms_ease-out,board-shake-2_320ms_ease-out]'
              : hit === 3
                ? ' motion-safe:animate-[sb-sprite-crossfade_200ms_ease-out,board-shake-3_380ms_ease-out]'
                : '')
        }
      />
    </div>
  );
}
