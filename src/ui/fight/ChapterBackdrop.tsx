// READ_SLOWLY_PLAN.md stage E2: the chapter backdrop -- far/near parallax
// layers of the current movement's backdrop_chapter_N sheet
// (src/art/svg/backdrops.tsx), each drifting slowly (motion-safe-gated,
// `sb-backdrop-drift-far`/`-near` in src/styles/globals.css) behind the
// fight screen, with a dark-theme scrim.
//
// A flat 32% opacity wash over this art was tried once and reverted
// (commit 077845f, "read as a muddy gray wash ... not atmosphere") because
// the backdrop SVGs are flat pale-parchment/silhouette art with no dark-
// theme treatment of their own. This scrim is a two-axis gradient instead
// of a flat wash: darker at the bottom and side edges (where the score
// line/rack/stick text sits) and lighter toward the centre/top (where the
// art should actually show through), so it reads as scenery behind the
// board rather than a grey rectangle under it.
//
// READ_SLOWLY_PLAN.md E3: `crescendoSoon` (useCrescendo's 'soon' phase)
// pulses the near layer's brightness/opacity so the room itself seems to
// hold its breath ahead of a swell -- `sb-backdrop-pulse` in globals.css,
// motion-safe-gated same as the drift above.
import Sprite from '../../art/Sprite';

const CHAPTER_COUNT = 3;

export default function ChapterBackdrop({
  movement,
  crescendoSoon,
}: {
  movement: number;
  crescendoSoon?: boolean;
}) {
  const chapter = Math.min(CHAPTER_COUNT, Math.max(1, movement + 1));
  const sheet = `backdrop_chapter_${chapter}`;
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
      data-crescendo-soon={crescendoSoon ? 'true' : 'false'}
    >
      <Sprite
        key={'far-' + sheet}
        sheet={sheet}
        pose="far"
        className="absolute inset-[-4%] h-[108%] w-[108%] opacity-55 motion-safe:animate-[sb-backdrop-drift-far_70s_ease-in-out_infinite_alternate]"
      />
      <Sprite
        key={'near-' + sheet}
        sheet={sheet}
        pose="near"
        className={
          'absolute inset-[-2%] h-[104%] w-[104%] opacity-85 ' +
          (crescendoSoon
            ? 'motion-safe:animate-[sb-backdrop-drift-near_45s_ease-in-out_infinite_alternate,sb-backdrop-pulse_1.1s_ease-in-out_infinite_alternate]'
            : 'motion-safe:animate-[sb-backdrop-drift-near_45s_ease-in-out_infinite_alternate]')
        }
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(10,9,7,0.1) 0%, rgba(10,9,7,0.45) 70%, rgba(10,9,7,0.72) 100%), ' +
            'linear-gradient(to right, rgba(10,9,7,0.4) 0%, rgba(10,9,7,0) 18%, rgba(10,9,7,0) 82%, rgba(10,9,7,0.4) 100%)',
        }}
      />
    </div>
  );
}
