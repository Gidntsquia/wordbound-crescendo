// READ_SLOWLY_PLAN.md stage E1: the sprite-sheet renderer. `sheet` is a
// tools/art-manifest.json id, `pose` one of that sheet's manifest poses.
// Real sheets (once sourced -- see the manifest's header comment) are PNGs
// played via `steps()` on `background-position`, no JS frame timers; until
// then every sheet is `status: "placeholder"` and this renders a plain CSS
// box so the pose-driven wiring (ladder step -> pose prop -> crossfade) is
// real end-to-end even though the art isn't. Swapping in real PNGs later
// is a manifest + CSS background-image change here, not a caller change.
import type { CSSProperties, ComponentType } from 'react';
import ART_MANIFEST from '../../tools/art-manifest.json';
import { SVG_SHEETS as PIECES_SHEETS } from './svg/pieces';
import { PEOPLE_SHEETS } from './svg/people';
import { ANTAGONIST_SHEETS } from './svg/antagonists';
import { BACKDROP_SHEETS } from './svg/backdrops';

const SVG_SHEETS: Record<string, ComponentType<{ pose?: string }>> = {
  ...PIECES_SHEETS,
  ...PEOPLE_SHEETS,
  ...ANTAGONIST_SHEETS,
  ...BACKDROP_SHEETS,
};

interface SheetDef {
  id: string;
  format?: string;
  status?: string;
  image?: string;
}

const SHEETS: Record<string, SheetDef> = Object.fromEntries(
  ART_MANIFEST.sheets.map((s) => [s.id, s]),
);

// A stable placeholder hue per sheet id so different sprites read as
// visually distinct boxes without any art.
function hueFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

export default function Sprite({
  sheet,
  pose,
  className,
}: {
  sheet: string;
  pose: string;
  className?: string;
}) {
  const def = SHEETS[sheet];
  if (!def) return null;
  const hue = hueFor(sheet);
  const SvgArt = def.format === 'svg' ? SVG_SHEETS[sheet] : null;
  const sourced = !SvgArt && def.status !== 'placeholder' && def.image;
  return (
    <span
      key={pose}
      className={
        'inline-flex flex-none items-center justify-center bg-[length:contain] bg-center bg-no-repeat text-[13px] font-[var(--display)] font-semibold text-white motion-safe:animate-[sb-sprite-crossfade_200ms_ease-out] ' +
        (SvgArt
          ? 'bg-transparent [&>svg]:block [&>svg]:h-full [&>svg]:w-full '
          : 'bg-[hsl(var(--sb-sprite-hue)_45%_42%)] ') +
        (className || '')
      }
      data-sheet={sheet}
      data-pose={pose}
      title={sheet + ' · ' + pose}
      style={
        {
          '--sb-sprite-hue': hue,
          backgroundImage: sourced ? `url(${def.image})` : undefined,
        } as CSSProperties
      }
    >
      {SvgArt ? (
        <SvgArt pose={pose} />
      ) : sourced ? null : (
        sheet.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}
