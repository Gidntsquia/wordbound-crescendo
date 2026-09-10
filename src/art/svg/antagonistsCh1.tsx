// READ_SLOWLY_PLAN.md stage E1 -- Chapter 1 antagonists ("The Commute"):
// the Doomscroll, the Deadline, and the boss-tier Fate at the Door. Split
// out of a single antagonists.tsx to keep files under ~300 lines; see
// antagonistsShared.tsx for the common Tile/fadeFor helpers and
// antagonists.tsx's header for the pose contract (idle/weakening/gone,
// plus crescendo for boss-tier tempos).
import { Tile, fadeFor } from './antagonistsShared';

// Ch1 distraction: the Doomscroll -- a glowing phone screen.
export function PhoneGlow({ pose = 'idle' }: { pose?: string }) {
  const glow = pose === 'gone' ? 0.15 : pose === 'weakening' ? 0.45 : 0.85;
  return (
    <Tile>
      <rect
        x="22"
        y="10"
        width="20"
        height="44"
        rx="4"
        fill="#1b1712"
        opacity={fadeFor(pose)}
      />
      <rect
        x="25"
        y="15"
        width="14"
        height="30"
        rx="1"
        fill="#f1d976"
        opacity={glow}
      />
      {pose === 'idle' && (
        <path
          d="M28 40 h5 M28 43 h5"
          stroke="#1b1712"
          strokeWidth="1"
          opacity="0.5"
        />
      )}
    </Tile>
  );
}

// Ch1 pressure: the Deadline -- a clock face.
export function Clock({ pose = 'idle' }: { pose?: string }) {
  const handAngle = pose === 'weakening' ? 60 : pose === 'gone' ? 90 : 0;
  return (
    <Tile>
      <circle
        cx="32"
        cy="32"
        r="22"
        fill="none"
        stroke="#1b1712"
        strokeWidth="3"
        opacity={fadeFor(pose)}
      />
      <g transform={`rotate(${handAngle} 32 32)`}>
        <path
          d="M32 32 L32 18 M32 32 L44 36"
          stroke="#7a2b2b"
          strokeWidth="3"
          strokeLinecap="round"
          opacity={fadeFor(pose)}
        />
      </g>
      {pose === 'gone' && (
        <path
          d="M20 20 L44 44 M44 20 L20 44"
          stroke="#7a2b2b"
          strokeWidth="2"
          opacity="0.5"
        />
      )}
    </Tile>
  );
}

// Ch1 finale: Fate at the Door -- a door, four knocks. Boss-tier: crescendo.
export function KnockingDoor({ pose = 'idle' }: { pose?: string }) {
  const knocks = pose === 'crescendo' ? [12, 18, 24, 30] : [16, 24, 32];
  return (
    <Tile>
      <rect
        x="20"
        y="10"
        width="24"
        height="44"
        rx="2"
        fill="#4a3320"
        opacity={pose === 'gone' ? 0.3 : 1}
      />
      <circle cx="38" cy="34" r="2" fill="#c9a227" opacity={fadeFor(pose)} />
      {pose !== 'gone' &&
        knocks.map((y) => (
          <line
            key={y}
            x1="46"
            y1={y}
            x2="54"
            y2={y}
            stroke="#7a2b2b"
            strokeWidth={pose === 'crescendo' ? 3 : 2}
            strokeLinecap="round"
            opacity={pose === 'weakening' ? 0.6 : 1}
          />
        ))}
      {pose === 'crescendo' && (
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke="#c9a227"
          strokeWidth="1.5"
          opacity="0.5"
        />
      )}
      {pose === 'gone' && (
        <rect
          x="20"
          y="10"
          width="24"
          height="44"
          rx="2"
          fill="none"
          stroke="#4a3320"
          strokeWidth="2"
        />
      )}
    </Tile>
  );
}
