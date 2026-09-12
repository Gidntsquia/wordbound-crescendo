// READ_SLOWLY_PLAN.md stage E1 -- hand-authored SVG "pieces" art, the
// alternative the plan itself names ("recommend sheets for people, SVG for
// pieces") for sheets no CC0 pack could supply. Original artwork, owned by
// this repo (licence: "original" in art-manifest.json, not CC0/third-party).
// Single static pose each (no multi-pose crossfade yet) -- simple,
// geometric, on-theme with the paper/ink/gilt/marginalia palette.

export function MarkOverlayGilt() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="6"
        fill="none"
        stroke="#c9a227"
        strokeWidth="3"
      />
      <path
        d="M42 22 L54 10"
        stroke="#f1d976"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.8"
      />
      <circle cx="54" cy="10" r="4" fill="#c9a227" />
    </svg>
  );
}

export function MarkOverlayBold() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <rect
        x="6"
        y="6"
        width="52"
        height="52"
        rx="4"
        fill="none"
        stroke="#1b1712"
        strokeWidth="7"
      />
    </svg>
  );
}

export function MarkOverlaySteel() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      {[
        [4, 4, 16, 4, 4, 16],
        [60, 4, 48, 4, 60, 16],
        [4, 60, 16, 60, 4, 48],
        [60, 60, 48, 60, 60, 48],
      ].map((p, i) => (
        <polyline
          key={i}
          points={`${p[0]},${p[1]} ${p[2]},${p[3]} ${p[4]},${p[5]}`}
          fill="none"
          stroke="#9aa4ad"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

export function BookmarkCardFrame() {
  return (
    <svg viewBox="0 0 48 64" width="100%" height="100%" aria-hidden="true">
      <path
        d="M8 4 H40 V60 L24 48 L8 60 Z"
        fill="#7a2b2b"
        stroke="#4a1717"
        strokeWidth="2"
      />
      <line x1="14" y1="16" x2="34" y2="16" stroke="#e8d9b0" strokeWidth="2" />
      <line x1="14" y1="24" x2="34" y2="24" stroke="#e8d9b0" strokeWidth="2" />
    </svg>
  );
}

export function PackWrapper() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <rect
        x="6"
        y="10"
        width="52"
        height="44"
        rx="3"
        fill="#e8dcc0"
        stroke="#8a7a52"
        strokeWidth="2"
      />
      <line x1="32" y1="10" x2="32" y2="54" stroke="#8a7a52" strokeWidth="2" />
      <line x1="6" y1="32" x2="58" y2="32" stroke="#8a7a52" strokeWidth="2" />
      <circle cx="32" cy="32" r="6" fill="#7a2b2b" />
    </svg>
  );
}

export const SVG_SHEETS = {
  mark_overlay_gilt: MarkOverlayGilt,
  mark_overlay_bold: MarkOverlayBold,
  mark_overlay_steel: MarkOverlaySteel,
  bookmark_card_frame: BookmarkCardFrame,
  pack_wrapper: PackWrapper,
};
