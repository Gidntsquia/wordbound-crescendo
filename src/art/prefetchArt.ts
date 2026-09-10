// READ_SLOWLY_PLAN.md E4: warm the browser's image cache for the upcoming
// chapter's art while the player is in the shop between fights, same idea
// as useFight.ts's `warmAhead` for the next recording's audio bytes. Only
// `status: "sourced"` sheets with a real `image` (PNG) path have anything
// to prefetch this way -- an `Image()` fetch primes the HTTP cache so the
// next fight's paint doesn't pay for the download. SVG-backed sheets are
// hand-authored components already bundled into the JS by Vite, so there
// is nothing to prefetch for them; this is a no-op for every backdrop/
// antagonist sheet today (all still `format: "svg"`), and only starts
// doing real work once a chapter's art is sourced as a PNG.
import ART_MANIFEST from '../../tools/art-manifest.json';

interface SheetDef {
  id: string;
  format?: string;
  status?: string;
  image?: string;
}

const SHEETS: Record<string, SheetDef> = Object.fromEntries(
  ART_MANIFEST.sheets.map((s) => [s.id, s]),
);

const warmed = new Set<string>();

function prefetchSheet(sheetId: string | undefined | null): void {
  if (!sheetId || warmed.has(sheetId)) return;
  const def = SHEETS[sheetId];
  if (!def || def.format === 'svg' || def.status !== 'sourced' || !def.image)
    return;
  warmed.add(sheetId);
  const img = new Image();
  img.src = def.image.startsWith('/') ? def.image : `/${def.image}`;
}

// Called from the shop with the next chapter's backdrop id and antagonist
// sheet id(s) it's about to need -- see useFight.ts's shop-phase effect.
export function prefetchChapterArt(
  sheetIds: (string | undefined | null)[],
): void {
  for (const id of sheetIds) prefetchSheet(id);
}
