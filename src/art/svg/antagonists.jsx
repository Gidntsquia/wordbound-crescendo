// READ_SLOWLY_PLAN.md stage E1 -- hand-authored SVG "antagonist" art (the
// nine tempos, per THEME.md: "not villains so much as tempos"). Same
// allowance/rationale as src/art/svg/pieces.jsx: original, repo-owned,
// first-pass placeholder art. Single representative pose per antagonist
// (their manifest idle/weakening/gone/crescendo poses aren't drawn as
// separate variants yet, same limitation as src/art/svg/people.jsx).

function Tile({ children }) {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <rect x="4" y="4" width="56" height="56" rx="8" fill="#2a2318" opacity="0.06" />
      {children}
    </svg>
  );
}

// Ch1 distraction: the Doomscroll -- a glowing phone screen.
export function PhoneGlow() {
  return (
    <Tile>
      <rect x="22" y="10" width="20" height="44" rx="4" fill="#1b1712" />
      <rect x="25" y="15" width="14" height="30" rx="1" fill="#f1d976" opacity="0.85" />
    </Tile>
  );
}

// Ch1 pressure: the Deadline -- a clock face.
export function Clock() {
  return (
    <Tile>
      <circle cx="32" cy="32" r="22" fill="none" stroke="#1b1712" strokeWidth="3" />
      <path d="M32 32 L32 18 M32 32 L44 36" stroke="#7a2b2b" strokeWidth="3" strokeLinecap="round" />
    </Tile>
  );
}

// Ch1 finale: Fate at the Door -- a door, four knocks.
export function KnockingDoor() {
  return (
    <Tile>
      <rect x="20" y="10" width="24" height="44" rx="2" fill="#4a3320" />
      <circle cx="38" cy="34" r="2" fill="#c9a227" />
      {[16, 24, 32].map((y) => (
        <line key={y} x1="46" y1={y} x2="54" y2={y} stroke="#7a2b2b" strokeWidth="2" strokeLinecap="round" />
      ))}
    </Tile>
  );
}

// Ch2 distraction: the Bored Bench -- an empty park bench.
export function EmptyBench() {
  return (
    <Tile>
      <rect x="10" y="34" width="44" height="4" fill="#8a7a52" />
      <rect x="14" y="38" width="4" height="14" fill="#8a7a52" />
      <rect x="46" y="38" width="4" height="14" fill="#8a7a52" />
      <rect x="10" y="24" width="44" height="4" fill="#8a7a52" opacity="0.6" />
    </Tile>
  );
}

// Ch2 pressure: the Loudspeaker -- a megaphone with sound lines.
export function Loudspeaker() {
  return (
    <Tile>
      <path d="M14 28 L30 22 V42 L14 36 Z" fill="#1b1712" />
      <path d="M30 22 L44 16 V48 L30 42 Z" fill="#1b1712" />
      <path d="M48 24 Q54 32 48 40" stroke="#7a2b2b" strokeWidth="2" fill="none" strokeLinecap="round" />
    </Tile>
  );
}

// Ch2 finale: the Gallop -- a marching parade, chevrons.
export function Parade() {
  return (
    <Tile>
      {[16, 28, 40].map((x) => (
        <path key={x} d={`M${x} 46 L${x + 8} 30 L${x + 16} 46`} stroke="#1b1712" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Tile>
  );
}

// Ch3 distraction: the Waiting Room -- a blank wall.
export function BlankWall() {
  return (
    <Tile>
      <rect x="10" y="10" width="44" height="44" fill="#e8dcc0" stroke="#8a7a52" strokeWidth="2" />
    </Tile>
  );
}

// Ch3 pressure: the Chancellor -- a podium/lectern.
export function Podium() {
  return (
    <Tile>
      <path d="M22 20 H42 L38 44 H26 Z" fill="#4a3320" />
      <rect x="30" y="44" width="4" height="10" fill="#4a3320" />
      <rect x="20" y="54" width="24" height="3" fill="#8a7a52" />
    </Tile>
  );
}

// Ch3 finale: the Bare Mountain -- a dark peak, sun about to rise behind it.
export function TheNight() {
  return (
    <Tile>
      <rect x="4" y="4" width="56" height="56" fill="#1b1712" />
      <circle cx="32" cy="40" r="10" fill="#c9a227" opacity="0.7" />
      <path d="M4 46 L22 22 L34 40 L44 28 L60 46 V60 H4 Z" fill="#2a2318" />
    </Tile>
  );
}

export const ANTAGONIST_SHEETS = {
  phone_glow: PhoneGlow,
  clock: Clock,
  knocking_door: KnockingDoor,
  empty_bench: EmptyBench,
  loudspeaker: Loudspeaker,
  parade: Parade,
  blank_wall: BlankWall,
  podium: Podium,
  the_night: TheNight,
};
