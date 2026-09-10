// Shared helpers for src/art/svg/antagonists-ch{1,2,3}.tsx -- split out of a
// single antagonists.tsx (READ_SLOWLY_PLAN.md E1) to keep each chapter file
// under the repo's ~300-line art-file guidance.
import type { ReactNode } from 'react';

export function Tile({ children }: { children?: ReactNode }) {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="8"
        fill="#2a2318"
        opacity="0.06"
      />
      {children}
    </svg>
  );
}

// Shared fade/outline treatment for the common idle/weakening/gone arc.
export function fadeFor(pose: string): number {
  return pose === 'gone' ? 0.25 : pose === 'weakening' ? 0.6 : 1;
}
