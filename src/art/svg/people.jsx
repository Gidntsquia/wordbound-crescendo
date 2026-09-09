// READ_SLOWLY_PLAN.md stage E1 -- hand-authored SVG "people" art (the three
// situation people plus the wordsmith player), same allowance/rationale as
// src/art/svg/pieces.jsx: original, repo-owned, first-pass placeholder art,
// not final. Single representative pose per figure (their manifest poses
// like 'scrolling'/'paused'/'looking-up' aren't drawn as separate variants
// yet -- Sprite.jsx keys the SVG lookup by sheet id only, so pose is still
// tracked in the manifest/ladder wiring but doesn't change the art this
// pass). Ink silhouette on a paper disc, on-theme with the paper/ink/gilt
// palette.

function Disc({ children }) {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#f3ead9" stroke="#c9a227" strokeWidth="2" />
      {children}
    </svg>
  );
}

// Chapter 1: a commuter, seated, head bowed toward a phone.
export function Commuter() {
  return (
    <Disc>
      <path
        d="M32 16 a7 7 0 1 0 0.01 0 Z M20 50 Q20 34 32 32 Q44 34 44 50 Z"
        fill="#2a2318"
      />
      <rect x="26" y="36" width="9" height="13" rx="1.5" fill="#1b1712" transform="rotate(18 26 36)" />
    </Disc>
  );
}

// Chapter 2: someone slumped on a bench, arms loose, nothing to do.
export function BenchSitter() {
  return (
    <Disc>
      <path
        d="M18 48 h28 M20 48 v6 M44 48 v6"
        stroke="#8a7a52"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="30" cy="20" r="6" fill="#2a2318" />
      <path d="M20 44 Q20 30 30 28 Q40 30 41 42 Q34 46 20 44 Z" fill="#2a2318" />
    </Disc>
  );
}

// Chapter 3: someone in a waiting room, upright, staring at a blank wall.
export function WaitingRoomSitter() {
  return (
    <Disc>
      <rect x="16" y="14" width="4" height="40" fill="#8a7a52" opacity="0.5" />
      <circle cx="34" cy="20" r="6" fill="#2a2318" />
      <path d="M26 52 Q26 34 34 32 Q42 34 43 52 Z" fill="#2a2318" />
    </Disc>
  );
}

// The player: a wordsmith at a writing desk, pen in hand.
export function Wordsmith() {
  return (
    <Disc>
      <rect x="14" y="42" width="36" height="4" rx="1" fill="#8a7a52" />
      <circle cx="30" cy="20" r="6" fill="#2a2318" />
      <path d="M22 42 Q22 28 30 26 Q38 28 39 40 Z" fill="#2a2318" />
      <path
        d="M38 32 L48 22"
        stroke="#c9a227"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </Disc>
  );
}

export const PEOPLE_SHEETS = {
  commuter: Commuter,
  bench_sitter: BenchSitter,
  waiting_room_sitter: WaitingRoomSitter,
  wordsmith: Wordsmith,
};
