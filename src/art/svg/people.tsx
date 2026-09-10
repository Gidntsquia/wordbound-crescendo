// READ_SLOWLY_PLAN.md stage E1 -- hand-authored SVG "people" art (the three
// situation people plus the wordsmith player), same allowance/rationale as
// src/art/svg/pieces.jsx: original, repo-owned, first-pass placeholder art,
// not final. Each figure now draws a distinct variant per ladder pose (plus
// a `win-idle` variant) -- Sprite.tsx passes the pose prop through so the
// art actually changes as the ladder advances. Ink silhouette on a paper
// disc, on-theme with the paper/ink/gilt palette.
import type { ReactNode } from 'react';

function Disc({ children }: { children?: ReactNode }) {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <circle
        cx="32"
        cy="32"
        r="30"
        fill="#f3ead9"
        stroke="#c9a227"
        strokeWidth="2"
      />
      {children}
    </svg>
  );
}

// A small gilt sparkle used to mark the shared `win-idle` beat.
function WinMark() {
  return (
    <path
      d="M50 14 L52 19 L57 21 L52 23 L50 28 L48 23 L43 21 L48 19 Z"
      fill="#c9a227"
    />
  );
}

// Chapter 1: a commuter, seated, head bowed toward a phone.
export function Commuter({ pose = 'scrolling' }: { pose?: string }) {
  const headTilt =
    pose === 'looking-up'
      ? -14
      : pose === 'reaching'
        ? -4
        : pose === 'win-idle'
          ? -10
          : 8;
  const phone = pose !== 'looking-up' && pose !== 'win-idle';
  return (
    <Disc>
      <g transform={`rotate(${headTilt} 32 22)`}>
        <path d="M32 16 a7 7 0 1 0 0.01 0 Z" fill="#2a2318" />
      </g>
      <path d="M20 50 Q20 34 32 32 Q44 34 44 50 Z" fill="#2a2318" />
      {phone && (
        <rect
          x="26"
          y="36"
          width="9"
          height="13"
          rx="1.5"
          fill="#1b1712"
          transform="rotate(18 26 36)"
        />
      )}
      {pose === 'scrolling' && (
        <path
          d="M28 40 h5 M28 43 h5"
          stroke="#f1d976"
          strokeWidth="1"
          opacity="0.8"
        />
      )}
      {pose === 'reaching' && (
        <path
          d="M40 40 L52 30"
          stroke="#2a2318"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
      {pose === 'reading' && (
        <rect x="24" y="34" width="16" height="12" rx="1" fill="#1b1712" />
      )}
      {pose === 'win-idle' && <WinMark />}
    </Disc>
  );
}

// Chapter 2: someone slumped on a bench, arms loose, nothing to do.
export function BenchSitter({ pose = 'slumped' }: { pose?: string }) {
  const slump =
    pose === 'slumped'
      ? 10
      : pose === 'leaning'
        ? 6
        : pose === 'win-idle'
          ? -6
          : 0;
  return (
    <Disc>
      <path
        d="M18 48 h28 M20 48 v6 M44 48 v6"
        stroke="#8a7a52"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <g transform={`translate(0 ${slump})`}>
        <circle cx="30" cy="20" r="6" fill="#2a2318" />
        <path
          d="M20 44 Q20 30 30 28 Q40 30 41 42 Q34 46 20 44 Z"
          fill="#2a2318"
        />
      </g>
      {pose === 'attentive' && (
        <circle cx="30" cy="26" r="1.6" fill="#f1d976" />
      )}
      {pose === 'searching' && (
        <path
          d="M42 30 Q50 26 54 32"
          stroke="#2a2318"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
      )}
      {pose === 'reading' && (
        <rect x="24" y="34" width="14" height="10" rx="1" fill="#4a3320" />
      )}
      {pose === 'win-idle' && <WinMark />}
    </Disc>
  );
}

// Chapter 3: someone in a waiting room, upright, staring at a blank wall.
export function WaitingRoomSitter({ pose = 'blank' }: { pose?: string }) {
  const eyeOpen = pose !== 'blank';
  const turn =
    pose === 'turning'
      ? 10
      : pose === 'reaching'
        ? 6
        : pose === 'win-idle'
          ? -8
          : 0;
  return (
    <Disc>
      <rect x="16" y="14" width="4" height="40" fill="#8a7a52" opacity="0.5" />
      <g transform={`rotate(${turn} 34 32)`}>
        <circle cx="34" cy="20" r="6" fill="#2a2318" />
        <path d="M26 52 Q26 34 34 32 Q42 34 43 52 Z" fill="#2a2318" />
        {eyeOpen && <circle cx="36" cy="19" r="1.2" fill="#f3ead9" />}
      </g>
      {pose === 'reaching' && (
        <path
          d="M42 34 L52 26"
          stroke="#2a2318"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
      {pose === 'reading' && (
        <rect x="24" y="40" width="14" height="10" rx="1" fill="#4a3320" />
      )}
      {pose === 'win-idle' && <WinMark />}
    </Disc>
  );
}

// The player: a wordsmith at a writing desk, pen in hand.
export function Wordsmith({ pose = 'idle' }: { pose?: string }) {
  const penUp = pose === 'flourish';
  return (
    <Disc>
      <rect x="14" y="42" width="36" height="4" rx="1" fill="#8a7a52" />
      <circle cx="30" cy="20" r="6" fill="#2a2318" />
      <path d="M22 42 Q22 28 30 26 Q38 28 39 40 Z" fill="#2a2318" />
      <path
        d={penUp ? 'M38 32 L50 16' : 'M38 32 L48 22'}
        stroke="#c9a227"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {pose === 'write' && (
        <path
          d="M20 50 h20"
          stroke="#8a7a52"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
      {pose === 'flourish' && <WinMark />}
    </Disc>
  );
}

export const PEOPLE_SHEETS = {
  commuter: Commuter,
  bench_sitter: BenchSitter,
  waiting_room_sitter: WaitingRoomSitter,
  wordsmith: Wordsmith,
};
