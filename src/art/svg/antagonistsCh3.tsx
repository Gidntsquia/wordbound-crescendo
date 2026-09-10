// READ_SLOWLY_PLAN.md stage E1 -- Chapter 3 antagonists ("The Tower"):
// the Waiting Room, the Chancellor, and the boss-tier Bare Mountain. See
// antagonistsCh1.tsx's header for the split rationale and pose contract.
import { Tile, fadeFor } from './antagonistsShared';

// Ch3 distraction: the Waiting Room -- a blank wall.
export function BlankWall({ pose = 'idle' }: { pose?: string }) {
  return (
    <Tile>
      <rect
        x="10"
        y="10"
        width="44"
        height="44"
        fill="#e8dcc0"
        stroke="#8a7a52"
        strokeWidth="2"
        opacity={fadeFor(pose)}
      />
      {pose === 'gone' && (
        <path
          d="M10 10 L54 54 M54 10 L10 54"
          stroke="#8a7a52"
          strokeWidth="1.5"
          opacity="0.4"
        />
      )}
    </Tile>
  );
}

// Ch3 pressure: the Chancellor -- a podium/lectern.
export function Podium({ pose = 'idle' }: { pose?: string }) {
  return (
    <Tile>
      <path
        d="M22 20 H42 L38 44 H26 Z"
        fill="#4a3320"
        opacity={fadeFor(pose)}
      />
      <rect
        x="30"
        y="44"
        width="4"
        height="10"
        fill="#4a3320"
        opacity={fadeFor(pose)}
      />
      <rect
        x="20"
        y="54"
        width="24"
        height="3"
        fill="#8a7a52"
        opacity={fadeFor(pose)}
      />
      {pose === 'gone' && (
        <rect
          x="22"
          y="20"
          width="20"
          height="24"
          fill="none"
          stroke="#4a3320"
          strokeWidth="1.5"
          opacity="0.4"
        />
      )}
    </Tile>
  );
}

// Ch3 finale: the Bare Mountain -- a dark peak, sun about to rise behind it.
// Boss-tier: crescendo.
export function TheNight({ pose = 'idle' }: { pose?: string }) {
  const sunR = pose === 'crescendo' ? 16 : 10;
  const sunOp = pose === 'gone' ? 0.2 : pose === 'crescendo' ? 0.95 : 0.7;
  return (
    <Tile>
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        fill="#1b1712"
        opacity={fadeFor(pose)}
      />
      <circle cx="32" cy="40" r={sunR} fill="#c9a227" opacity={sunOp} />
      <path
        d="M4 46 L22 22 L34 40 L44 28 L60 46 V60 H4 Z"
        fill="#2a2318"
        opacity={pose === 'gone' ? 0.35 : 1}
      />
      {pose === 'crescendo' && (
        <circle
          cx="32"
          cy="40"
          r={sunR + 6}
          fill="none"
          stroke="#c9a227"
          strokeWidth="1.5"
          opacity="0.5"
        />
      )}
    </Tile>
  );
}
