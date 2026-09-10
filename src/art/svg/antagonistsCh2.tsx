// READ_SLOWLY_PLAN.md stage E1 -- Chapter 2 antagonists ("The Square"):
// the Bored Bench, the Loudspeaker, and the boss-tier Gallop. See
// antagonistsCh1.tsx's header for the split rationale and pose contract.
import { Tile, fadeFor } from './antagonistsShared';

// Ch2 distraction: the Bored Bench -- an empty park bench.
export function EmptyBench({ pose = 'idle' }: { pose?: string }) {
  return (
    <Tile>
      <rect
        x="10"
        y="34"
        width="44"
        height="4"
        fill="#8a7a52"
        opacity={fadeFor(pose)}
      />
      <rect
        x="14"
        y="38"
        width="4"
        height="14"
        fill="#8a7a52"
        opacity={fadeFor(pose)}
      />
      <rect
        x="46"
        y="38"
        width="4"
        height="14"
        fill="#8a7a52"
        opacity={fadeFor(pose)}
      />
      <rect
        x="10"
        y="24"
        width="44"
        height="4"
        fill="#8a7a52"
        opacity={fadeFor(pose) * 0.6}
      />
      {pose === 'gone' && (
        <line
          x1="10"
          y1="52"
          x2="54"
          y2="24"
          stroke="#8a7a52"
          strokeWidth="1"
          opacity="0.4"
        />
      )}
    </Tile>
  );
}

// Ch2 pressure: the Loudspeaker -- a megaphone with sound lines.
export function Loudspeaker({ pose = 'idle' }: { pose?: string }) {
  const lines =
    pose === 'gone' ? null : (
      <path
        d="M48 24 Q54 32 48 40"
        stroke="#7a2b2b"
        strokeWidth={pose === 'weakening' ? 1.5 : 2}
        fill="none"
        strokeLinecap="round"
        opacity={fadeFor(pose)}
      />
    );
  return (
    <Tile>
      <path
        d="M14 28 L30 22 V42 L14 36 Z"
        fill="#1b1712"
        opacity={fadeFor(pose)}
      />
      <path
        d="M30 22 L44 16 V48 L30 42 Z"
        fill="#1b1712"
        opacity={fadeFor(pose)}
      />
      {lines}
    </Tile>
  );
}

// Ch2 finale: the Gallop -- a marching parade, chevrons. Boss-tier: crescendo.
export function Parade({ pose = 'idle' }: { pose?: string }) {
  const xs = pose === 'crescendo' ? [12, 24, 36, 48] : [16, 28, 40];
  return (
    <Tile>
      {pose !== 'gone' &&
        xs.map((x) => (
          <path
            key={x}
            d={`M${x} 46 L${x + 8} 30 L${x + 16} 46`}
            stroke="#1b1712"
            strokeWidth={pose === 'crescendo' ? 4 : 3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={pose === 'weakening' ? 0.6 : 1}
          />
        ))}
      {pose === 'gone' && (
        <path
          d="M16 46 L48 46"
          stroke="#1b1712"
          strokeWidth="2"
          opacity="0.35"
          strokeDasharray="3 3"
        />
      )}
      {pose === 'crescendo' && (
        <rect
          x="4"
          y="4"
          width="56"
          height="56"
          rx="8"
          fill="#c9a227"
          opacity="0.12"
        />
      )}
    </Tile>
  );
}
